from __future__ import annotations

import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.health import build_health_response
from clinmira_agent_worker.settings import assert_skeleton_safe, load_settings
from clinmira_contracts.versions import HEALTH_CHECK_RESPONSE_CONTRACT_VERSION


class AgentWorkerHealthTests(unittest.TestCase):
    def test_health_response_has_disabled_live_agent_path(self) -> None:
        response = build_health_response(load_settings({}))

        self.assertEqual(response["contract_version"], HEALTH_CHECK_RESPONSE_CONTRACT_VERSION)
        self.assertEqual(response["service"], "agent-worker")
        self.assertEqual(response["status"], "ok")
        self.assertEqual(response["contract_import_status"], "shared_python_constants")
        self.assertFalse(response["live_agents_enabled"])
        self.assertFalse(response["openai_enabled"])
        self.assertFalse(response["network_calls_enabled"])
        self.assertFalse(response["direct_db_mutation_enabled"])
        self.assertTrue(response["mock_runtime_enabled"])
        self.assertFalse(response["temporal_enabled"])
        self.assertFalse(response["live_provider_allowed"])
        self.assertTrue(response["kill_switch_enabled"])
        self.assertEqual(response["allowed_models_count"], 0)
        self.assertGreater(response["blocked_reasons_count"], 0)
        self.assertFalse(response["live_provider_status"]["live_provider_allowed"])
        self.assertEqual(response["live_provider_status"]["allowed_models_count"], 0)
        self.assertNotIn("allowed_models", response["live_provider_status"])
        self.assertFalse(response["feature_flags"]["live_agents"])
        self.assertFalse(response["feature_flags"]["openai"])
        self.assertFalse(response["feature_flags"]["network_calls"])
        self.assertFalse(response["feature_flags"]["direct_db_mutation"])
        self.assertTrue(response["feature_flags"]["mock_runtime"])
        self.assertEqual(response["checks"]["live_openai_calls"], "disabled")
        self.assertEqual(response["checks"]["live_provider_gate"], "blocked")

    def test_worker_reports_live_flags_as_blocked_not_enabled(self) -> None:
        settings = load_settings({
            "CLINMIRA_LIVE_AGENTS_ENABLED": "true",
            "CLINMIRA_OPENAI_PROVIDER_ENABLED": "true",
            "CLINMIRA_AGENT_NETWORK_ENABLED": "true",
            "CLINMIRA_AGENT_MAX_COST_USD_PER_RUN": "1.00",
            "CLINMIRA_AGENT_MAX_TOKENS_PER_RUN": "1000",
            "CLINMIRA_AGENT_TIMEOUT_MS": "3000",
            "CLINMIRA_AGENT_ALLOWED_MODELS": "approved-model",
            "CLINMIRA_AGENT_KILL_SWITCH": "false",
        })

        assert_skeleton_safe(settings)
        self.assertFalse(settings.live_agents_enabled)
        self.assertFalse(settings.openai_enabled)
        self.assertFalse(settings.network_calls_enabled)
        self.assertFalse(settings.live_provider_gate_status.live_provider_allowed)
        self.assertTrue(any("Evidence gate not passed" in reason for reason in settings.live_provider_gate_status.blocked_reasons))

    def test_worker_refuses_unsupported_runtime_flags(self) -> None:
        settings = load_settings({
            "CLINMIRA_AGENT_DIRECT_DB_MUTATION_ENABLED": "true",
            "CLINMIRA_TEMPORAL_ENABLED": "true",
        })

        with self.assertRaises(RuntimeError):
            assert_skeleton_safe(settings)


if __name__ == "__main__":
    unittest.main()
