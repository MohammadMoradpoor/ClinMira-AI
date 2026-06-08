from __future__ import annotations

from typing import Any


class ContextFirewallError(ValueError):
    """Raised when an agent context includes unauthorized state."""


FORBIDDEN_VISIBILITIES = {
    "hidden_until_revealed",
    "faculty_only",
    "safety_only",
    "evaluator_only",
}

PERSONA_ALLOWED_VISIBILITIES = {
    "baseline_visible",
    "revealed",
    "student_safe",
    "student_safe_summary",
}

FORBIDDEN_FIELDS = {
    "raw_fact_content",
    "faculty_only_notes",
    "hidden_diagnosis",
    "system_prompt",
    "internal_prompt",
    "tool_secret",
    "api_key",
    "provider_secret",
}


def validate_agent_context(agent_name: str, context: dict[str, Any]) -> None:
    _reject_forbidden_fields(context)
    _reject_forbidden_visibility(context)

    if agent_name == "mock_persona":
        _validate_persona_context(context)
    elif agent_name in {"mock_evaluator", "mock_imaging"}:
        _reject_any_fact_payload(agent_name, context)
    elif agent_name == "mock_safety":
        _validate_mock_safety_context(context)


def _validate_persona_context(context: dict[str, Any]) -> None:
    for fact in _fact_items(context):
        visibility = str(fact.get("visibility", "student_safe"))
        if visibility not in PERSONA_ALLOWED_VISIBILITIES:
            raise ContextFirewallError(f"Persona Agent cannot receive fact visibility: {visibility}")
        if not _safe_summary(fact):
            raise ContextFirewallError("Persona Agent facts must contain only student-safe summaries")


def _validate_mock_safety_context(context: dict[str, Any]) -> None:
    for fact in _fact_items(context):
        if "content" in fact or "raw_content" in fact:
            raise ContextFirewallError("Mock Safety Agent cannot receive raw hidden fact content in Step 11")


def _reject_any_fact_payload(agent_name: str, context: dict[str, Any]) -> None:
    if list(_fact_items(context)):
        raise ContextFirewallError(f"{agent_name} is disabled and cannot receive fact payloads in Step 11")


def _reject_forbidden_fields(value: Any, path: tuple[str, ...] = ()) -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            normalized_key = str(key)
            if normalized_key in FORBIDDEN_FIELDS:
                joined = ".".join((*path, normalized_key))
                raise ContextFirewallError(f"Forbidden context field: {joined}")
            _reject_forbidden_fields(nested, (*path, normalized_key))
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            _reject_forbidden_fields(nested, (*path, str(index)))


def _reject_forbidden_visibility(value: Any) -> None:
    if isinstance(value, dict):
        visibility = value.get("visibility")
        if isinstance(visibility, str) and visibility in FORBIDDEN_VISIBILITIES:
            raise ContextFirewallError(f"Forbidden fact visibility: {visibility}")
        for nested in value.values():
            _reject_forbidden_visibility(nested)
    elif isinstance(value, list):
        for nested in value:
            _reject_forbidden_visibility(nested)


def _fact_items(context: dict[str, Any]):
    for key in ("allowed_fact_summaries", "facts", "revealed_facts"):
        value = context.get(key)
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    yield item


def _safe_summary(fact: dict[str, Any]) -> str | None:
    for key in ("student_safe_summary", "summary", "text"):
        value = fact.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None
