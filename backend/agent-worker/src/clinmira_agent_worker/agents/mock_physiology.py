from __future__ import annotations

from ..contracts import AgentRunRequest, AgentRunResponse
from .base import MockAgent


class MockPhysiologyAgent(MockAgent):
    agent_name = "mock_physiology"
    agent_role = "physiology_placeholder"

    def run(self, _request: AgentRunRequest) -> AgentRunResponse:
        return AgentRunResponse(
            agent_name=self.agent_name,
            agent_role=self.agent_role,
            mode="mock",
            status="ok",
            structured_output={
                "status": "stable",
                "note": "mock physiology runtime only",
            },
            used_fact_ids=[],
            safety_flags=["no_disease_progression_engine"],
        )
