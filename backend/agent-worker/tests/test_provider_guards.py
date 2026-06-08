from __future__ import annotations

from dataclasses import replace
import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.feature_flags import EVIDENCE_GATE_NAMES, LiveProviderFlags
from clinmira_agent_worker.provider_boundary import ProviderRequest
from clinmira_agent_worker.provider_guards import validate_provider_request


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


def valid_request(**overrides: object) -> ProviderRequest:
    values: dict[str, object] = {
        "request_id": "provider-request-guard",
        "agent_name": "mock_persona",
        "mode": "fake",
        "model_name": "fake-model",
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
    }
    values.update(overrides)
    return ProviderRequest.from_mapping(values)


class ProviderGuardTests(unittest.TestCase):
    def test_passing_fake_provider_request_is_allowed(self) -> None:
        result = validate_provider_request(valid_request(), flags=PASSING_FLAGS, evidence=PASSING_EVIDENCE)

        self.assertTrue(result.allowed)
        self.assertEqual(result.errors, ())

    def test_live_mode_is_rejected(self) -> None:
        result = validate_provider_request(valid_request(mode="live"), flags=PASSING_FLAGS, evidence=PASSING_EVIDENCE)

        self.assertFalse(result.allowed)
        self.assertIn("live_mode_blocked", _error_codes(result))

    def test_kill_switch_blocks(self) -> None:
        result = validate_provider_request(
            valid_request(),
            flags=replace(PASSING_FLAGS, kill_switch_enabled=True),
            evidence=PASSING_EVIDENCE,
        )

        self.assertFalse(result.allowed)
        self.assertIn("provider_gate_blocked", _error_codes(result))
        self.assertTrue(any("KILL_SWITCH" in reason for reason in result.blocked_reasons))

    def test_live_flags_not_fully_enabled_block(self) -> None:
        result = validate_provider_request(
            valid_request(),
            flags=replace(PASSING_FLAGS, live_agents_enabled=False),
            evidence=PASSING_EVIDENCE,
        )

        self.assertFalse(result.allowed)
        self.assertTrue(any("LIVE_AGENTS_ENABLED" in reason for reason in result.blocked_reasons))

    def test_missing_evidence_gates_block(self) -> None:
        evidence = dict(PASSING_EVIDENCE)
        evidence["step_10_safety_gate"] = False
        result = validate_provider_request(valid_request(), flags=PASSING_FLAGS, evidence=evidence)

        self.assertFalse(result.allowed)
        self.assertTrue(any("step_10_safety_gate" in reason for reason in result.blocked_reasons))

    def test_missing_context_firewall_or_safety_precheck_blocks(self) -> None:
        for field_name, expected_code in (
            ("context_firewall_passed", "context_firewall_required"),
            ("safety_precheck_passed", "safety_precheck_required"),
        ):
            with self.subTest(field_name=field_name):
                result = validate_provider_request(
                    valid_request(**{field_name: False}),
                    flags=PASSING_FLAGS,
                    evidence=PASSING_EVIDENCE,
                )
                self.assertFalse(result.allowed)
                self.assertIn(expected_code, _error_codes(result))

    def test_budget_token_and_timeout_values_must_be_positive(self) -> None:
        for field_name, expected_code in (
            ("max_tokens", "max_tokens_required"),
            ("max_cost_usd", "max_cost_required"),
            ("timeout_ms", "timeout_required"),
        ):
            with self.subTest(field_name=field_name):
                result = validate_provider_request(
                    valid_request(**{field_name: 0}),
                    flags=PASSING_FLAGS,
                    evidence=PASSING_EVIDENCE,
                )
                self.assertFalse(result.allowed)
                self.assertIn(expected_code, _error_codes(result))

    def test_empty_allowlist_and_model_not_allowed_block(self) -> None:
        empty_allowlist = validate_provider_request(
            valid_request(),
            flags=replace(PASSING_FLAGS, allowed_models=()),
            evidence=PASSING_EVIDENCE,
        )
        model_not_allowed = validate_provider_request(
            valid_request(model_name="not-allowed-model"),
            flags=PASSING_FLAGS,
            evidence=PASSING_EVIDENCE,
        )

        self.assertFalse(empty_allowlist.allowed)
        self.assertIn("model_allowlist_required", _error_codes(empty_allowlist))
        self.assertFalse(model_not_allowed.allowed)
        self.assertIn("model_not_allowed", _error_codes(model_not_allowed))

    def test_tool_network_backend_db_and_temporal_capabilities_block(self) -> None:
        for capability in (
            "tool_call",
            "external_network",
            "backend_api_call",
            "direct_db_mutation",
            "temporal",
        ):
            with self.subTest(capability=capability):
                result = validate_provider_request(
                    valid_request(metadata={"requested_capabilities": [capability]}),
                    flags=PASSING_FLAGS,
                    evidence=PASSING_EVIDENCE,
                )
                self.assertFalse(result.allowed)
                self.assertIn("provider_capability_blocked", _error_codes(result))

    def test_hidden_context_and_forbidden_fields_block(self) -> None:
        hidden_result = validate_provider_request(
            valid_request(
                allowed_context={
                    "allowed_fact_summaries": [
                        {
                            "fact_id": "fact-hidden-001",
                            "visibility": "hidden_until_revealed",
                            "student_safe_summary": "This should be blocked.",
                        }
                    ]
                }
            ),
            flags=PASSING_FLAGS,
            evidence=PASSING_EVIDENCE,
        )
        forbidden_field_result = validate_provider_request(
            valid_request(allowed_context={"faculty_only_notes": "blocked before provider"}),
            flags=PASSING_FLAGS,
            evidence=PASSING_EVIDENCE,
        )

        self.assertFalse(hidden_result.allowed)
        self.assertIn("hidden_context_blocked", _error_codes(hidden_result))
        self.assertFalse(forbidden_field_result.allowed)
        self.assertIn("forbidden_context_field", _error_codes(forbidden_field_result))


def _error_codes(result) -> set[str]:
    return {error.code for error in result.errors}


if __name__ == "__main__":
    unittest.main()
