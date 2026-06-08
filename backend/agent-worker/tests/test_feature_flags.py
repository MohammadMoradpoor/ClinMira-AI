from __future__ import annotations

from contextlib import redirect_stdout
from io import StringIO
import json
from unittest.mock import patch
import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.feature_flags import (
    EVIDENCE_GATE_NAMES,
    build_live_provider_status,
    evaluate_live_provider_gate,
    load_live_provider_flags,
    parse_bool,
    parse_float,
    parse_int,
    parse_model_allowlist,
)
from clinmira_agent_worker.main import main


class GuardedEnv(dict[str, str]):
    forbidden_names = {
        "OPENAI_API_KEY",
        "OPENAI_ORG_ID",
        "OPENAI_PROJECT_ID",
        "CLINMIRA_OPENAI_API_KEY",
        "PROVIDER_SECRET",
        "TOOL_SECRET",
    }

    def get(self, key: str, default: str | None = None) -> str | None:  # type: ignore[override]
        if key in self.forbidden_names:
            raise AssertionError(f"secret environment value was read: {key}")
        return super().get(key, default)

    def __getitem__(self, key: str) -> str:
        if key in self.forbidden_names:
            raise AssertionError(f"secret environment value was read: {key}")
        return super().__getitem__(key)


class LiveProviderFeatureFlagTests(unittest.TestCase):
    def test_parse_helpers_fail_closed_to_defaults(self) -> None:
        self.assertTrue(parse_bool("true", False))
        self.assertFalse(parse_bool("not-a-bool", False))
        self.assertTrue(parse_bool("not-a-bool", True))
        self.assertEqual(parse_float("1.25", 0.0), 1.25)
        self.assertEqual(parse_float("NaN", 0.0), 0.0)
        self.assertEqual(parse_float("bad", 0.0), 0.0)
        self.assertEqual(parse_int("25", 0), 25)
        self.assertEqual(parse_int("bad", 0), 0)

    def test_model_allowlist_is_trimmed_and_deduplicated(self) -> None:
        self.assertEqual(
            parse_model_allowlist(" model-a,model-b, model-a ,,model-c "),
            ("model-a", "model-b", "model-c"),
        )

    def test_default_flags_disable_live_provider(self) -> None:
        flags = load_live_provider_flags({})
        status = evaluate_live_provider_gate(flags)

        self.assertFalse(flags.live_agents_enabled)
        self.assertFalse(flags.openai_provider_enabled)
        self.assertFalse(flags.agent_network_enabled)
        self.assertFalse(flags.tool_calls_enabled)
        self.assertFalse(flags.trace_export_enabled)
        self.assertEqual(flags.max_cost_usd_per_run, 0.0)
        self.assertEqual(flags.max_tokens_per_run, 0)
        self.assertEqual(flags.timeout_ms, 0)
        self.assertEqual(flags.allowed_models, ())
        self.assertTrue(flags.kill_switch_enabled)
        self.assertFalse(status.live_provider_allowed)
        self.assertIn("CLINMIRA_AGENT_KILL_SWITCH is enabled", status.blocked_reasons)

    def test_invalid_values_fail_closed_and_are_reported(self) -> None:
        status = build_live_provider_status({
            "CLINMIRA_LIVE_AGENTS_ENABLED": "maybe",
            "CLINMIRA_OPENAI_PROVIDER_ENABLED": "sometimes",
            "CLINMIRA_AGENT_NETWORK_ENABLED": "sure",
            "CLINMIRA_AGENT_MAX_COST_USD_PER_RUN": "not-money",
            "CLINMIRA_AGENT_MAX_TOKENS_PER_RUN": "not-tokens",
            "CLINMIRA_AGENT_TIMEOUT_MS": "not-time",
            "CLINMIRA_AGENT_KILL_SWITCH": "not-bool",
        })

        self.assertFalse(status["live_provider_allowed"])
        blocked_reasons = "\n".join(status["blocked_reasons"])  # type: ignore[arg-type]
        self.assertIn("Invalid live-provider flag values", blocked_reasons)
        self.assertIn("CLINMIRA_LIVE_AGENTS_ENABLED", blocked_reasons)
        self.assertIn("CLINMIRA_AGENT_KILL_SWITCH", blocked_reasons)
        self.assertTrue(status["kill_switch_enabled"])

    def test_all_environment_flags_true_still_block_without_evidence(self) -> None:
        status = build_live_provider_status({
            "CLINMIRA_LIVE_AGENTS_ENABLED": "true",
            "CLINMIRA_OPENAI_PROVIDER_ENABLED": "true",
            "CLINMIRA_AGENT_NETWORK_ENABLED": "true",
            "CLINMIRA_AGENT_TOOL_CALLS_ENABLED": "true",
            "CLINMIRA_AGENT_TRACE_EXPORT_ENABLED": "true",
            "CLINMIRA_AGENT_MAX_COST_USD_PER_RUN": "1.00",
            "CLINMIRA_AGENT_MAX_TOKENS_PER_RUN": "1000",
            "CLINMIRA_AGENT_TIMEOUT_MS": "3000",
            "CLINMIRA_AGENT_ALLOWED_MODELS": "approved-model",
            "CLINMIRA_AGENT_KILL_SWITCH": "false",
        })

        self.assertFalse(status["live_provider_allowed"])
        self.assertEqual(status["allowed_models_count"], 1)
        self.assertFalse(status["kill_switch_enabled"])
        self.assertEqual(set(status["evidence_gates"].keys()), set(EVIDENCE_GATE_NAMES))  # type: ignore[union-attr]
        self.assertTrue(
            any("Evidence gate not passed" in reason for reason in status["blocked_reasons"])  # type: ignore[union-attr]
        )

    def test_gate_requires_all_evidence(self) -> None:
        flags = load_live_provider_flags({
            "CLINMIRA_LIVE_AGENTS_ENABLED": "true",
            "CLINMIRA_OPENAI_PROVIDER_ENABLED": "true",
            "CLINMIRA_AGENT_NETWORK_ENABLED": "true",
            "CLINMIRA_AGENT_MAX_COST_USD_PER_RUN": "0.01",
            "CLINMIRA_AGENT_MAX_TOKENS_PER_RUN": "1",
            "CLINMIRA_AGENT_TIMEOUT_MS": "1",
            "CLINMIRA_AGENT_ALLOWED_MODELS": "approved-model",
            "CLINMIRA_AGENT_KILL_SWITCH": "false",
        })

        status = evaluate_live_provider_gate(flags, {gate_name: True for gate_name in EVIDENCE_GATE_NAMES})

        self.assertTrue(status.live_provider_allowed)

    def test_status_does_not_read_or_expose_provider_secrets(self) -> None:
        status = build_live_provider_status(
            GuardedEnv({
                "OPENAI_API_KEY": "must-not-read",
                "OPENAI_ORG_ID": "must-not-read",
                "CLINMIRA_AGENT_ALLOWED_MODELS": "safe-model-name",
            })
        )

        serialized = repr(status)
        self.assertNotIn("must-not-read", serialized)
        self.assertNotIn("OPENAI_API_KEY", serialized)
        self.assertNotIn("safe-model-name", serialized)
        self.assertEqual(status["allowed_models_count"], 1)

    def test_live_provider_status_cli_prints_safe_blocked_status(self) -> None:
        stdout = StringIO()

        with patch("sys.argv", ["clinmira-agent-worker", "live-provider-status"]), redirect_stdout(stdout):
            exit_code = main()

        self.assertEqual(exit_code, 0)
        status = json.loads(stdout.getvalue())
        self.assertFalse(status["live_provider_allowed"])
        self.assertIn("allowed_models_count", status)
        self.assertNotIn("allowed_models", status)
        self.assertNotIn("OPENAI_API_KEY", stdout.getvalue())


if __name__ == "__main__":
    unittest.main()
