from __future__ import annotations

from dataclasses import replace
import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.feature_flags import EVIDENCE_GATE_NAMES, LiveProviderFlags
from clinmira_agent_worker.provider_boundary import (
    FAKE_PROVIDER_NAME,
    FAKE_PROVIDER_REFUSAL_TEXT,
    FAKE_PROVIDER_SUCCESS_TEXT,
)
from clinmira_agent_worker.provider_fake import FakeProvider


PASSING_FLAGS = LiveProviderFlags(
    live_agents_enabled=True,
    openai_provider_enabled=True,
    agent_network_enabled=True,
    max_cost_usd_per_run=1.0,
    max_tokens_per_run=1000,
    timeout_ms=3000,
    allowed_models=("fake-model",),
    kill_switch_enabled=False,
)

PASSING_EVIDENCE = {gate_name: True for gate_name in EVIDENCE_GATE_NAMES}


def valid_request(**overrides: object) -> dict[str, object]:
    values: dict[str, object] = {
        "request_id": "provider-request-fake",
        "agent_name": "mock_persona",
        "mode": "fake",
        "model_name": "fake-model",
        "prompt_version": "provider-prompt.v1",
        "schema_version": "provider-boundary.v1",
        "input_text": "Tell me how you feel.",
        "allowed_context": {
            "allowed_fact_summaries": [
                {
                    "fact_id": "fact-allowed-001",
                    "visibility": "baseline_visible",
                    "student_safe_summary": "I feel anxious but stable.",
                }
            ]
        },
        "max_tokens": 100,
        "max_cost_usd": 0.01,
        "timeout_ms": 1000,
        "safety_precheck_passed": True,
        "context_firewall_passed": True,
        "metadata": {"context_version": "provider-context.v1"},
    }
    values.update(overrides)
    return values


class FakeProviderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.provider = FakeProvider(flags=PASSING_FLAGS, evidence=PASSING_EVIDENCE)

    def test_fake_provider_success_path_is_local_deterministic_and_safe(self) -> None:
        first = self.provider.run(valid_request())
        second = self.provider.run(valid_request())

        self.assertEqual(first.to_dict(), second.to_dict())
        self.assertEqual(first.provider_name, FAKE_PROVIDER_NAME)
        self.assertEqual(first.status, "ok")
        self.assertEqual(first.output_text, FAKE_PROVIDER_SUCCESS_TEXT)
        self.assertEqual(first.structured_output["response_kind"], "success")
        self.assertEqual(first.used_fact_ids, ["fact-allowed-001"])
        self.assertTrue(first.safety_postcheck_required)
        self.assertLessEqual(first.estimated_tokens, 100)
        self.assertLessEqual(first.estimated_cost_usd, 0.01)
        self.assertNotRegex(_combined_response_text(first.to_dict()), r"diagnosis|treatment|medication|imaging|faculty")

    def test_fake_provider_refusal_path_is_deterministic(self) -> None:
        response = self.provider.run(valid_request(metadata={"simulate_refusal": True}))

        self.assertEqual(response.status, "refused")
        self.assertEqual(response.output_text, FAKE_PROVIDER_REFUSAL_TEXT)
        self.assertEqual(response.refusal_reason, "local_test_rule")
        self.assertEqual(response.structured_output["response_kind"], "refusal")
        self.assertTrue(response.safety_postcheck_required)

    def test_fake_provider_schema_violation_is_caught_without_returning_unsafe_output(self) -> None:
        response = self.provider.run(valid_request(metadata={"simulate_schema_violation": True}))
        serialized = repr(response.to_dict())

        self.assertEqual(response.status, "schema_error")
        self.assertIn("provider_schema_validation_failed", response.refusal_reason)
        self.assertTrue(response.errors)
        self.assertNotIn("raw_fact_content", serialized)
        self.assertTrue(response.safety_postcheck_required)

    def test_budget_token_timeout_kill_switch_and_model_blocks_are_local(self) -> None:
        cases = (
            ("budget", self.provider, valid_request(max_cost_usd=0.000001), "budget_exceeded"),
            ("token", self.provider, valid_request(max_tokens=1), "token_budget_exceeded"),
            ("timeout", self.provider, valid_request(timeout_ms=0), "timeout_required"),
            (
                "kill_switch",
                FakeProvider(flags=replace(PASSING_FLAGS, kill_switch_enabled=True), evidence=PASSING_EVIDENCE),
                valid_request(),
                "provider_gate_blocked",
            ),
            ("model", self.provider, valid_request(model_name="not-allowed-model"), "model_not_allowed"),
        )

        for name, provider, request, expected_code in cases:
            with self.subTest(name=name):
                response = provider.run(request)
                self.assertEqual(response.status, "blocked")
                self.assertIn(expected_code, {error.code for error in response.errors})
                self.assertEqual(response.estimated_cost_usd, 0.0)
                self.assertTrue(response.safety_postcheck_required)

    def test_missing_safety_precheck_context_firewall_and_hidden_context_block(self) -> None:
        cases = (
            (valid_request(safety_precheck_passed=False), "safety_precheck_required"),
            (valid_request(context_firewall_passed=False), "context_firewall_required"),
            (
                valid_request(
                    allowed_context={
                        "allowed_fact_summaries": [
                            {
                                "fact_id": "fact-hidden-001",
                                "visibility": "hidden_until_revealed",
                                "student_safe_summary": "blocked",
                            }
                        ]
                    }
                ),
                "hidden_context_blocked",
            ),
            (valid_request(allowed_context={"system_prompt": "blocked"}), "forbidden_context_field"),
            (valid_request(metadata={"requested_capabilities": ["tool_call"]}), "provider_capability_blocked"),
            (valid_request(metadata={"requested_capabilities": ["external_network"]}), "provider_capability_blocked"),
        )

        for request, expected_code in cases:
            with self.subTest(expected_code=expected_code):
                response = self.provider.run(request)
                self.assertEqual(response.status, "blocked")
                self.assertIn(expected_code, {error.code for error in response.errors})

    def test_default_fake_provider_fails_closed(self) -> None:
        response = FakeProvider().run(valid_request())

        self.assertEqual(response.status, "blocked")
        self.assertTrue(any("KILL_SWITCH" in reason for reason in response.trace["blocked_reasons"]))
        self.assertTrue(response.safety_postcheck_required)


def _combined_response_text(value: object) -> str:
    return repr(value).lower()


if __name__ == "__main__":
    unittest.main()
