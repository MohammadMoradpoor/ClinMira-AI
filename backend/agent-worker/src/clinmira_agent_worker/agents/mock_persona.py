from __future__ import annotations

from typing import Any

from ..contracts import AgentRunRequest, AgentRunResponse
from .base import MockAgent


class MockPersonaAgent(MockAgent):
    agent_name = "mock_persona"
    agent_role = "patient_persona"

    def run(self, request: AgentRunRequest) -> AgentRunResponse:
        fact = _first_safe_fact(request.context)
        if fact:
            summary = fact["summary"]
            fact_id = fact["fact_id"]
            return AgentRunResponse(
                agent_name=self.agent_name,
                agent_role=self.agent_role,
                mode="mock",
                status="ok",
                output_text=f"I can tell you this: {summary}",
                used_fact_ids=[fact_id] if fact_id else [],
                safety_flags=[],
            )

        return AgentRunResponse(
            agent_name=self.agent_name,
            agent_role=self.agent_role,
            mode="mock",
            status="ok",
            output_text="I am ready to answer student-safe intake questions in this mock simulation.",
            used_fact_ids=[],
            safety_flags=[],
        )


def _first_safe_fact(context: dict[str, Any]) -> dict[str, str] | None:
    facts = context.get("allowed_fact_summaries")
    if not isinstance(facts, list):
        return None

    for fact in facts:
        if not isinstance(fact, dict):
            continue
        summary = _summary(fact)
        if summary:
            return {
                "fact_id": str(fact.get("fact_id", "")),
                "summary": summary,
            }
    return None


def _summary(fact: dict[str, Any]) -> str | None:
    for key in ("student_safe_summary", "summary", "text"):
        value = fact.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None
