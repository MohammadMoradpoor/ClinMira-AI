from __future__ import annotations

from ..contracts import AgentRunRequest, AgentRunResponse
from .base import MockAgent


UNSAFE_KEYWORDS = (
    "hidden diagnosis",
    "system prompt",
    "faculty notes",
    "treatment plan",
    "prescribe",
    "diagnosis with certainty",
)


class MockSafetyAgent(MockAgent):
    agent_name = "mock_safety"
    agent_role = "safety_adapter_placeholder"

    def run(self, request: AgentRunRequest) -> AgentRunResponse:
        text = request.input_text.lower()
        flags = [f"keyword:{keyword.replace(' ', '_')}" for keyword in UNSAFE_KEYWORDS if keyword in text]

        return AgentRunResponse(
            agent_name=self.agent_name,
            agent_role=self.agent_role,
            mode="mock",
            status="ok",
            output_text="Mock safety adapter only. The backend deterministic safety engine remains the authority.",
            structured_output={
                "backend_safety_engine_authority": True,
                "local_keyword_flags": flags,
                "db_writes": "not_allowed",
            },
            used_fact_ids=[],
            safety_flags=flags,
        )
