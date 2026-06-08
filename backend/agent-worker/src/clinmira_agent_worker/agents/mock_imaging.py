from __future__ import annotations

from ..contracts import AgentRunRequest, AgentRunResponse
from .base import MockAgent


class MockImagingAgent(MockAgent):
    agent_name = "mock_imaging"
    agent_role = "imaging_placeholder"

    def run(self, _request: AgentRunRequest) -> AgentRunResponse:
        return AgentRunResponse(
            agent_name=self.agent_name,
            agent_role=self.agent_role,
            mode="mock",
            status="disabled",
            structured_output={
                "status": "disabled",
                "reason": "imaging workflow not implemented until later step",
            },
            used_fact_ids=[],
            safety_flags=["imaging_interpretation_disabled"],
        )
