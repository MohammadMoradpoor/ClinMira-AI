from __future__ import annotations

from ..contracts import AgentRunRequest, AgentRunResponse
from .base import MockAgent


class MockEvaluatorAgent(MockAgent):
    agent_name = "mock_evaluator"
    agent_role = "evaluator_placeholder"

    def run(self, _request: AgentRunRequest) -> AgentRunResponse:
        return AgentRunResponse(
            agent_name=self.agent_name,
            agent_role=self.agent_role,
            mode="mock",
            status="disabled",
            structured_output={
                "status": "disabled",
                "reason": "evaluator/debrief engine not implemented until later step",
            },
            used_fact_ids=[],
            safety_flags=["evaluation_and_debrief_disabled"],
        )
