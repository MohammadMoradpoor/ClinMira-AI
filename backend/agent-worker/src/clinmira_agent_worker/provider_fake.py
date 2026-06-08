from __future__ import annotations

from re import fullmatch
from typing import Any, Mapping

from .feature_flags import LiveProviderFlags, load_live_provider_flags
from .provider_boundary import (
    FAKE_PROVIDER_NAME,
    FAKE_PROVIDER_REFUSAL_TEXT,
    FAKE_PROVIDER_SUCCESS_TEXT,
    ProviderError,
    ProviderRequest,
    ProviderResponse,
)
from .provider_guards import validate_provider_request
from .provider_schema import validate_provider_structured_output
from .provider_trace import build_provider_trace


FAKE_PROVIDER_COST_PER_TOKEN_USD = 0.000001


class FakeProvider:
    provider_name = FAKE_PROVIDER_NAME

    def __init__(
        self,
        *,
        flags: LiveProviderFlags | None = None,
        evidence: Mapping[str, bool] | None = None,
    ) -> None:
        self.flags = flags if flags is not None else load_live_provider_flags({})
        self.evidence = dict(evidence) if evidence is not None else {}

    def run(self, request_like: ProviderRequest | Mapping[str, Any]) -> ProviderResponse:
        request = request_like if isinstance(request_like, ProviderRequest) else ProviderRequest.from_mapping(request_like)
        guard_result = validate_provider_request(request, flags=self.flags, evidence=self.evidence)
        input_tokens = _estimate_tokens(request.input_text)

        if not guard_result.allowed:
            return _blocked_response(request, guard_result.errors, input_tokens)

        simulated_error = _simulated_error(request)
        if simulated_error is not None:
            return _blocked_response(request, (simulated_error,), input_tokens)

        used_fact_ids = _safe_used_fact_ids(request.allowed_context)
        output_text = FAKE_PROVIDER_REFUSAL_TEXT if _simulate_refusal(request) else FAKE_PROVIDER_SUCCESS_TEXT
        output_tokens = _estimate_tokens(output_text)
        estimated_cost = _estimate_cost_usd(input_tokens + output_tokens)

        if output_tokens > request.max_tokens:
            return _blocked_response(
                request,
                (
                    ProviderError(
                        code="token_budget_exceeded",
                        message="Fake provider output token estimate exceeds max_tokens",
                        blocked_reason="Fake provider output token estimate exceeds max_tokens",
                    ),
                ),
                input_tokens,
            )

        if estimated_cost > request.max_cost_usd:
            return _blocked_response(
                request,
                (
                    ProviderError(
                        code="budget_exceeded",
                        message="Fake provider estimated cost exceeds max_cost_usd",
                        blocked_reason="Fake provider estimated cost exceeds max_cost_usd",
                    ),
                ),
                input_tokens,
            )

        if request.metadata.get("simulate_schema_violation") is True:
            invalid_output = {
                "response_kind": "success",
                "message": output_text,
                "used_fact_ids": used_fact_ids,
                "safety_postcheck_required": False,
                "raw_fact_content": "redacted before response",
            }
            schema_errors = validate_provider_structured_output(invalid_output)
            return _schema_error_response(request, schema_errors, input_tokens)

        response_kind = "refusal" if _simulate_refusal(request) else "success"
        structured_output = {
            "response_kind": response_kind,
            "message": output_text,
            "used_fact_ids": used_fact_ids,
            "safety_postcheck_required": True,
        }
        schema_errors = validate_provider_structured_output(structured_output)
        if schema_errors:
            return _schema_error_response(request, schema_errors, input_tokens)

        status = "refused" if response_kind == "refusal" else "ok"
        refusal_reason = "local_test_rule" if response_kind == "refusal" else ""
        trace = build_provider_trace(
            request=request,
            status=status,
            input_token_estimate=input_tokens,
            output_token_estimate=output_tokens,
            estimated_cost_usd=estimated_cost,
            blocked_reasons=(),
            safety_postcheck_required=True,
            provider_name=FAKE_PROVIDER_NAME,
        )

        return ProviderResponse(
            request_id=request.request_id,
            provider_name=FAKE_PROVIDER_NAME,
            mode=request.mode,
            status=status,
            output_text=output_text,
            structured_output=structured_output,
            refusal_reason=refusal_reason,
            used_fact_ids=used_fact_ids,
            estimated_tokens=output_tokens,
            estimated_cost_usd=estimated_cost,
            trace=trace,
            safety_postcheck_required=True,
            errors=(),
        )


def _blocked_response(
    request: ProviderRequest,
    errors: tuple[ProviderError, ...],
    input_tokens: int,
) -> ProviderResponse:
    blocked_reasons = tuple(error.blocked_reason or error.message for error in errors)
    trace = build_provider_trace(
        request=request,
        status="blocked",
        input_token_estimate=input_tokens,
        output_token_estimate=0,
        estimated_cost_usd=0.0,
        blocked_reasons=blocked_reasons,
        safety_postcheck_required=True,
        provider_name=FAKE_PROVIDER_NAME,
    )

    return ProviderResponse(
        request_id=request.request_id,
        provider_name=FAKE_PROVIDER_NAME,
        mode=request.mode,
        status="blocked",
        output_text="",
        structured_output={
            "response_kind": "blocked",
            "message": "Fake provider request was blocked by local provider-boundary guards.",
            "used_fact_ids": [],
            "safety_postcheck_required": True,
        },
        refusal_reason=blocked_reasons[0] if blocked_reasons else "provider_boundary_blocked",
        used_fact_ids=[],
        estimated_tokens=0,
        estimated_cost_usd=0.0,
        trace=trace,
        safety_postcheck_required=True,
        errors=errors,
    )


def _schema_error_response(
    request: ProviderRequest,
    errors: tuple[ProviderError, ...],
    input_tokens: int,
) -> ProviderResponse:
    safe_errors = tuple(
        ProviderError(
            code=error.code,
            message="Provider structured output failed safe schema validation",
            blocked_reason="Provider structured output failed safe schema validation",
        )
        for error in errors
    )
    blocked_reasons = tuple(error.blocked_reason or error.message for error in safe_errors)
    trace = build_provider_trace(
        request=request,
        status="schema_error",
        input_token_estimate=input_tokens,
        output_token_estimate=0,
        estimated_cost_usd=0.0,
        blocked_reasons=blocked_reasons,
        safety_postcheck_required=True,
        provider_name=FAKE_PROVIDER_NAME,
    )

    return ProviderResponse(
        request_id=request.request_id,
        provider_name=FAKE_PROVIDER_NAME,
        mode=request.mode,
        status="schema_error",
        output_text="",
        structured_output={
            "response_kind": "schema_error",
            "message": "Fake provider output schema validation failed.",
            "used_fact_ids": [],
            "safety_postcheck_required": True,
        },
        refusal_reason="provider_schema_validation_failed",
        used_fact_ids=[],
        estimated_tokens=0,
        estimated_cost_usd=0.0,
        trace=trace,
        safety_postcheck_required=True,
        errors=safe_errors,
    )


def _simulated_error(request: ProviderRequest) -> ProviderError | None:
    simulations = {
        "simulate_budget_exceeded": ("budget_exceeded", "Fake provider simulated budget exceeded"),
        "simulate_token_exceeded": ("token_budget_exceeded", "Fake provider simulated token budget exceeded"),
        "simulate_timeout_blocked": ("timeout_blocked", "Fake provider simulated timeout block"),
        "simulate_kill_switch_blocked": ("kill_switch_blocked", "Fake provider simulated kill switch block"),
        "simulate_model_not_allowed": ("model_not_allowed", "Fake provider simulated model allowlist block"),
    }

    for flag_name, (code, message) in simulations.items():
        if request.metadata.get(flag_name) is True:
            return ProviderError(code=code, message=message, blocked_reason=message)

    return None


def _simulate_refusal(request: ProviderRequest) -> bool:
    return request.metadata.get("simulate_refusal") is True


def _safe_used_fact_ids(context: dict[str, Any]) -> list[str]:
    fact_ids: list[str] = []
    seen: set[str] = set()

    for key in ("allowed_fact_summaries", "revealed_facts", "facts"):
        value = context.get(key)
        if not isinstance(value, list):
            continue
        for item in value:
            if not isinstance(item, dict):
                continue
            fact_id = item.get("fact_id")
            if isinstance(fact_id, str) and _safe_identifier(fact_id) and fact_id not in seen:
                fact_ids.append(fact_id)
                seen.add(fact_id)

    return fact_ids


def _estimate_tokens(text: str) -> int:
    normalized = text.strip()
    if not normalized:
        return 0
    return max(1, len(normalized.split()))


def _estimate_cost_usd(tokens: int) -> float:
    return round(tokens * FAKE_PROVIDER_COST_PER_TOKEN_USD, 6)


def _safe_identifier(value: str) -> bool:
    return bool(fullmatch(r"[A-Za-z0-9_.:-]{1,80}", value))
