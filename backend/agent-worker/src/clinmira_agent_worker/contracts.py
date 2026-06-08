from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

try:
    from clinmira_contracts.versions import (
        AGENT_RUN_REQUEST_CONTRACT_VERSION,
        AGENT_RUN_RESPONSE_CONTRACT_VERSION,
        AGENT_TRACE_CONTRACT_VERSION,
    )
except ImportError:  # pragma: no cover - safe fallback is guarded by tests.
    AGENT_RUN_REQUEST_CONTRACT_VERSION = "agent-run-request.v1"
    AGENT_RUN_RESPONSE_CONTRACT_VERSION = "agent-run-response.v1"
    AGENT_TRACE_CONTRACT_VERSION = "agent-trace.v1"


AgentMode = Literal["mock", "live"]
AgentStatus = Literal["ok", "blocked", "disabled", "error"]


@dataclass(frozen=True)
class AgentRunRequest:
    agent_name: str
    mode: AgentMode = "mock"
    context: dict[str, Any] = field(default_factory=dict)
    input_text: str = ""
    requested_capabilities: list[str] = field(default_factory=list)
    contract_version: str = AGENT_RUN_REQUEST_CONTRACT_VERSION

    @classmethod
    def from_mapping(cls, value: dict[str, Any]) -> "AgentRunRequest":
        return cls(
            contract_version=str(value.get("contract_version", AGENT_RUN_REQUEST_CONTRACT_VERSION)),
            agent_name=str(value.get("agent_name", "")),
            mode=str(value.get("mode", "mock")),  # type: ignore[arg-type]
            context=_as_dict(value.get("context")),
            input_text=str(value.get("input_text", "")),
            requested_capabilities=_as_string_list(value.get("requested_capabilities")),
        )


@dataclass(frozen=True)
class AgentRunResponse:
    agent_name: str
    agent_role: str
    mode: Literal["mock"]
    status: AgentStatus
    output_text: str | None = None
    structured_output: dict[str, Any] = field(default_factory=dict)
    used_fact_ids: list[str] = field(default_factory=list)
    safety_flags: list[str] = field(default_factory=list)
    trace: dict[str, Any] = field(default_factory=dict)
    errors: list[dict[str, str]] = field(default_factory=list)
    contract_version: str = AGENT_RUN_RESPONSE_CONTRACT_VERSION

    def to_dict(self) -> dict[str, Any]:
        return {
            "contract_version": self.contract_version,
            "agent_name": self.agent_name,
            "agent_role": self.agent_role,
            "mode": self.mode,
            "status": self.status,
            "output_text": self.output_text,
            "structured_output": self.structured_output,
            "used_fact_ids": self.used_fact_ids,
            "safety_flags": self.safety_flags,
            "trace": self.trace,
            "errors": self.errors,
        }


def _as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _as_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str)]
