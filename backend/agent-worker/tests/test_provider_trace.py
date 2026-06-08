from __future__ import annotations

import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.provider_boundary import ProviderRequest
from clinmira_agent_worker.provider_trace import DEFAULT_PROVIDER_CONTEXT_VERSION, build_provider_trace


class ProviderTraceTests(unittest.TestCase):
    def test_provider_trace_shape_is_redacted(self) -> None:
        request = ProviderRequest.from_mapping({
            "request_id": "provider-request-trace",
            "agent_name": "mock_persona",
            "mode": "fake",
            "model_name": "fake-model",
            "prompt_version": "provider-prompt.v1",
            "schema_version": "provider-boundary.v1",
            "input_text": "raw student input must not appear in trace",
            "allowed_context": {
                "hidden_facts": [{"raw_fact_content": "secret hidden fact"}],
                "faculty_only_notes": "faculty-only text",
                "system_prompt": "internal prompt text",
                "provider_secret": "secret provider value",
            },
            "trace_id": "trace-safe-001",
            "safety_precheck_passed": True,
            "context_firewall_passed": True,
            "metadata": {"context_version": "provider-context.v1"},
        })

        trace = build_provider_trace(
            request=request,
            status="blocked",
            input_token_estimate=3,
            output_token_estimate=0,
            estimated_cost_usd=0.0,
            blocked_reasons=("blocked safely",),
            safety_postcheck_required=True,
        )
        serialized = repr(trace)

        self.assertEqual(trace["trace_id"], "trace-safe-001")
        self.assertTrue(trace["redaction_applied"])
        self.assertEqual(trace["context_version"], "provider-context.v1")
        self.assertEqual(trace["safety_postcheck_required"], True)
        self.assertNotIn("raw student input", serialized)
        self.assertNotIn("secret hidden fact", serialized)
        self.assertNotIn("faculty-only text", serialized)
        self.assertNotIn("internal prompt text", serialized)
        self.assertNotIn("secret provider value", serialized)
        self.assertNotIn("allowed_models", serialized)

    def test_unsafe_trace_id_and_context_version_are_not_echoed(self) -> None:
        request = ProviderRequest.from_mapping({
            "request_id": "provider-request-trace-unsafe",
            "agent_name": "mock_persona",
            "mode": "fake",
            "trace_id": "trace contains secret text",
            "metadata": {"context_version": "context contains secret text"},
        })

        trace = build_provider_trace(
            request=request,
            status="blocked",
            input_token_estimate=0,
            output_token_estimate=0,
            estimated_cost_usd=0.0,
            safety_postcheck_required=True,
        )

        self.assertRegex(trace["trace_id"], r"^provider-trace-[a-f0-9]{16}$")
        self.assertEqual(trace["context_version"], DEFAULT_PROVIDER_CONTEXT_VERSION)
        self.assertNotIn("secret text", repr(trace))


if __name__ == "__main__":
    unittest.main()
