from __future__ import annotations

from abc import ABC, abstractmethod

from ..contracts import AgentRunRequest, AgentRunResponse


class MockAgent(ABC):
    agent_name: str
    agent_role: str

    @abstractmethod
    def run(self, request: AgentRunRequest) -> AgentRunResponse:
        raise NotImplementedError
