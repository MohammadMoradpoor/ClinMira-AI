from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol


PROVIDER_MODE_FAKE = "fake"
PROVIDER_MODE_TEST_DOUBLE = "test_double"
ALLOWED_PROVIDER_MODES = (PROVIDER_MODE_FAKE, PROVIDER_MODE_TEST_DOUBLE)

FAKE_PROVIDER_NAME = "fake_provider"
DISABLED_LIVE_PROVIDER_NAME = "disabled_live_provider"
ALLOWED_PROVIDER_NAMES = (FAKE_PROVIDER_NAME, DISABLED_LIVE_PROVIDER_NAME)

FAKE_PROVIDER_SUCCESS_TEXT = "This is a deterministic fake provider response for testing only."
FAKE_PROVIDER_REFUSAL_TEXT = "The fake provider refused this request according to local test rules."


@dataclass(frozen=True)
class ProviderError:
    code: str
    message: str
    safe_to_show: bool = True
    retryable: bool = False
    blocked_reason: str = ""

    def to_dict(self) -> dict[str, object]:
        return {
            "code": self.code,
            "message": self.message,
            "safe_to_show": self.safe_to_show,
            "retryable": self.retryable,
            "blocked_reason": self.blocked_reason,
        }


@dataclass(frozen=True)
class ProviderRequest:
    request_id: str
    agent_name: str
    mode: str = PROVIDER_MODE_FAKE
    model_name: str = ""
    prompt_version: str = "provider-prompt.v1"
    schema_version: str = "provider-boundary.v1"
    input_text: str = ""
    allowed_context: dict[str, Any] = field(default_factory=dict)
    expected_output_schema: dict[str, Any] = field(default_factory=dict)
    max_tokens: int = 0
    max_cost_usd: float = 0.0
    timeout_ms: int = 0
    trace_id: str = ""
    safety_precheck_passed: bool = False
    context_firewall_passed: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_mapping(cls, source: Mapping[str, Any]) -> "ProviderRequest":
        return cls(
            request_id=_string_value(source, "request_id"),
            agent_name=_string_value(source, "agent_name"),
            mode=_string_value(source, "mode", PROVIDER_MODE_FAKE),
            model_name=_string_value(source, "model_name"),
            prompt_version=_string_value(source, "prompt_version", "provider-prompt.v1"),
            schema_version=_string_value(source, "schema_version", "provider-boundary.v1"),
            input_text=_string_value(source, "input_text"),
            allowed_context=_dict_value(source, "allowed_context"),
            expected_output_schema=_dict_value(source, "expected_output_schema"),
            max_tokens=_int_value(source, "max_tokens"),
            max_cost_usd=_float_value(source, "max_cost_usd"),
            timeout_ms=_int_value(source, "timeout_ms"),
            trace_id=_string_value(source, "trace_id"),
            safety_precheck_passed=bool(source.get("safety_precheck_passed", False)),
            context_firewall_passed=bool(source.get("context_firewall_passed", False)),
            metadata=_dict_value(source, "metadata"),
        )


@dataclass(frozen=True)
class ProviderResponse:
    request_id: str
    provider_name: str
    mode: str
    status: str
    output_text: str
    structured_output: dict[str, Any] = field(default_factory=dict)
    refusal_reason: str = ""
    used_fact_ids: list[str] = field(default_factory=list)
    estimated_tokens: int = 0
    estimated_cost_usd: float = 0.0
    trace: dict[str, Any] = field(default_factory=dict)
    safety_postcheck_required: bool = True
    errors: tuple[ProviderError, ...] = ()

    def to_dict(self) -> dict[str, object]:
        return {
            "request_id": self.request_id,
            "provider_name": self.provider_name,
            "mode": self.mode,
            "status": self.status,
            "output_text": self.output_text,
            "structured_output": dict(self.structured_output),
            "refusal_reason": self.refusal_reason,
            "used_fact_ids": list(self.used_fact_ids),
            "estimated_tokens": self.estimated_tokens,
            "estimated_cost_usd": self.estimated_cost_usd,
            "trace": dict(self.trace),
            "safety_postcheck_required": self.safety_postcheck_required,
            "errors": [error.to_dict() for error in self.errors],
        }


class ProviderBoundary(Protocol):
    provider_name: str

    def run(self, request: ProviderRequest | Mapping[str, Any]) -> ProviderResponse:
        """Run the local provider-boundary implementation."""


def _string_value(source: Mapping[str, Any], key: str, default: str = "") -> str:
    value = source.get(key, default)
    return value if isinstance(value, str) else default


def _dict_value(source: Mapping[str, Any], key: str) -> dict[str, Any]:
    value = source.get(key, {})
    return dict(value) if isinstance(value, Mapping) else {}


def _int_value(source: Mapping[str, Any], key: str) -> int:
    value = source.get(key, 0)
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value
    return 0


def _float_value(source: Mapping[str, Any], key: str) -> float:
    value = source.get(key, 0.0)
    if isinstance(value, bool):
        return 0.0
    if isinstance(value, (float, int)):
        return float(value)
    return 0.0
