from __future__ import annotations

from .agents import (
    MockEvaluatorAgent,
    MockImagingAgent,
    MockPersonaAgent,
    MockPhysiologyAgent,
    MockSafetyAgent,
)
from .agents.base import MockAgent


APPROVED_MOCK_AGENT_NAMES = (
    "mock_persona",
    "mock_physiology",
    "mock_safety",
    "mock_imaging",
    "mock_evaluator",
)


def build_agent_registry() -> dict[str, MockAgent]:
    return {
        "mock_persona": MockPersonaAgent(),
        "mock_physiology": MockPhysiologyAgent(),
        "mock_safety": MockSafetyAgent(),
        "mock_imaging": MockImagingAgent(),
        "mock_evaluator": MockEvaluatorAgent(),
    }
