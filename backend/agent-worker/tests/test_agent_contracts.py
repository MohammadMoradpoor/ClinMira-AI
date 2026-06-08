from __future__ import annotations

import unittest

import _test_paths  # noqa: F401

from clinmira_agent_worker.contracts import (
    AGENT_RUN_REQUEST_CONTRACT_VERSION,
    AGENT_RUN_RESPONSE_CONTRACT_VERSION,
    AGENT_TRACE_CONTRACT_VERSION,
    AgentRunRequest,
)
from clinmira_agent_worker.runtime import AgentRuntime


class AgentContractsTests(unittest.TestCase):
    def test_agent_contract_versions_are_shared_constants(self) -> None:
        self.assertEqual(AGENT_RUN_REQUEST_CONTRACT_VERSION, "agent-run-request.v1")
        self.assertEqual(AGENT_RUN_RESPONSE_CONTRACT_VERSION, "agent-run-response.v1")
        self.assertEqual(AGENT_TRACE_CONTRACT_VERSION, "agent-trace.v1")

    def test_request_from_mapping_defaults_to_mock(self) -> None:
        request = AgentRunRequest.from_mapping({"agent_name": "mock_persona"})

        self.assertEqual(request.agent_name, "mock_persona")
        self.assertEqual(request.mode, "mock")
        self.assertEqual(request.context, {})
        self.assertEqual(request.requested_capabilities, [])

    def test_response_contains_required_contract_fields(self) -> None:
        response = AgentRuntime().run_agent({"agent_name": "mock_persona", "mode": "mock"})

        for field in (
            "contract_version",
            "agent_name",
            "agent_role",
            "mode",
            "status",
            "output_text",
            "structured_output",
            "used_fact_ids",
            "safety_flags",
            "trace",
            "errors",
        ):
            self.assertIn(field, response)

        self.assertEqual(response["contract_version"], AGENT_RUN_RESPONSE_CONTRACT_VERSION)
        self.assertEqual(response["mode"], "mock")
        self.assertEqual(response["trace"]["contract_version"], AGENT_TRACE_CONTRACT_VERSION)


if __name__ == "__main__":
    unittest.main()
