from __future__ import annotations

from pathlib import Path
import re
import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.live_model_provider import DisabledLiveModelProvider, LiveModelDisabledError
from clinmira_agent_worker.runtime import AgentRuntime, AgentRuntimeError
from clinmira_agent_worker.settings import load_settings


WORKER_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = WORKER_ROOT / "src"
REPO_ROOT = WORKER_ROOT.parents[1]
PACKAGE_FILES = (
    WORKER_ROOT / "pyproject.toml",
    REPO_ROOT / "backend" / "api" / "package.json",
    REPO_ROOT / "backend" / "api" / "package-lock.json",
    REPO_ROOT / "shared" / "contracts" / "package.json",
    REPO_ROOT / "frontend" / "package.json",
)


class NoLiveOpenAITests(unittest.TestCase):
    def test_disabled_live_model_provider_fails_closed(self) -> None:
        provider = DisabledLiveModelProvider(status={
            "blocked_reasons": ["CLINMIRA_AGENT_KILL_SWITCH is enabled"],
        })

        with self.assertRaises(LiveModelDisabledError) as run_context:
            provider.run()
        self.assertIn("Step 13 feature-flag gate", str(run_context.exception))
        self.assertIn("CLINMIRA_AGENT_KILL_SWITCH", str(run_context.exception))

        with self.assertRaises(LiveModelDisabledError) as generate_context:
            provider.generate()
        self.assertIn("Step 13 feature-flag gate", str(generate_context.exception))

    def test_setting_live_flag_does_not_enable_live_model(self) -> None:
        runtime = AgentRuntime(settings=load_settings({
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
        }))

        with self.assertRaises(AgentRuntimeError) as context:
            runtime.run_agent({"agent_name": "mock_persona", "mode": "live"})

        self.assertIn("Evidence gate not passed", str(context.exception))
        self.assertFalse(runtime.settings.live_provider_gate_status.live_provider_allowed)

    def test_no_openai_or_provider_sdk_import_exists(self) -> None:
        combined = _combined_source()

        self.assertIsNone(re.search(r"^\s*(?:from|import)\s+openai\b", combined, re.MULTILINE))
        self.assertIsNone(re.search(r"OpenAI\s*\(", combined))
        self.assertIsNone(re.search(r"agents_sdk|openai_agents|responses\.create|chat\.completions", combined, re.I))
        self.assertIsNone(re.search(r"OPENAI_API_KEY|OPENAI_ORG_ID", combined))

    def test_no_openai_or_provider_sdk_dependency_exists(self) -> None:
        combined = "\n".join(path.read_text(encoding="utf-8") for path in PACKAGE_FILES if path.exists())

        self.assertIsNone(re.search(r"[@\"'/\s](?:openai|@openai|openai-agents|agents-sdk)[@\"'\s:/<>=-]", combined, re.I))
        self.assertIsNone(re.search(r"responses-api|provider-sdk", combined, re.I))

    def test_no_network_client_import_exists(self) -> None:
        combined = _combined_source()

        self.assertIsNone(
            re.search(r"^\s*(?:from|import)\s+(requests|httpx|aiohttp|urllib|socket)\b", combined, re.MULTILINE)
        )
        self.assertIsNone(re.search(r"\b(fetch|urlopen|HTTPConnection|HTTPSConnection)\b", combined))

    def test_no_direct_database_mutation_code_exists(self) -> None:
        combined = _combined_source()

        db_clients = "|".join(("psyco" + "pg", "async" + "pg", "pg" + "8000", "sqlite" + "3"))
        self.assertIsNone(re.search(rf"^\s*(?:from|import)\s+({db_clients})\b", combined, re.MULTILINE))
        table_names = "|".join(("event" + "_log", "outbox" + "_events"))
        mutations = "|".join(("INSERT" + " INTO", "UPDATE" + r"\s+[a-z_]+", "DELETE" + " FROM", table_names))
        self.assertIsNone(re.search(rf"\b({mutations})\b", combined, re.I))


def _combined_source() -> str:
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in SOURCE_ROOT.rglob("*.py")
        if "__pycache__" not in path.parts
    )


if __name__ == "__main__":
    unittest.main()
