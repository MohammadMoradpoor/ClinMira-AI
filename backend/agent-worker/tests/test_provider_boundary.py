from __future__ import annotations

import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.provider_boundary import (
    ALLOWED_PROVIDER_MODES,
    ALLOWED_PROVIDER_NAMES,
    DISABLED_LIVE_PROVIDER_NAME,
    FAKE_PROVIDER_NAME,
    ProviderError,
    ProviderRequest,
    ProviderResponse,
)


class ProviderBoundaryTests(unittest.TestCase):
    def test_provider_boundary_dataclasses_exist(self) -> None:
        request = ProviderRequest.from_mapping({
            "request_id": "provider-request-001",
            "agent_name": "mock_persona",
            "mode": "fake",
            "model_name": "fake-model",
            "max_tokens": 100,
            "max_cost_usd": 0.01,
            "timeout_ms": 1000,
            "safety_precheck_passed": True,
            "context_firewall_passed": True,
        })
        error = ProviderError(code="test_error", message="safe test error", blocked_reason="safe test block")
        response = ProviderResponse(
            request_id=request.request_id,
            provider_name=FAKE_PROVIDER_NAME,
            mode=request.mode,
            status="blocked",
            output_text="",
            errors=(error,),
        )

        self.assertEqual(request.mode, "fake")
        self.assertEqual(request.model_name, "fake-model")
        self.assertTrue(response.safety_postcheck_required)
        self.assertEqual(response.to_dict()["errors"], [error.to_dict()])

    def test_boundary_allows_only_fake_or_test_double_provider_modes(self) -> None:
        self.assertEqual(ALLOWED_PROVIDER_MODES, ("fake", "test_double"))
        self.assertIn(FAKE_PROVIDER_NAME, ALLOWED_PROVIDER_NAMES)
        self.assertIn(DISABLED_LIVE_PROVIDER_NAME, ALLOWED_PROVIDER_NAMES)

    def test_mapping_constructor_ignores_unsafe_non_mapping_shapes(self) -> None:
        request = ProviderRequest.from_mapping({
            "request_id": "provider-request-002",
            "agent_name": "mock_persona",
            "allowed_context": ["not", "a", "dict"],
            "metadata": ["not", "a", "dict"],
            "max_tokens": True,
            "max_cost_usd": True,
        })

        self.assertEqual(request.allowed_context, {})
        self.assertEqual(request.metadata, {})
        self.assertEqual(request.max_tokens, 0)
        self.assertEqual(request.max_cost_usd, 0.0)


if __name__ == "__main__":
    unittest.main()
