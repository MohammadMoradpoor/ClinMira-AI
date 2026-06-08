from __future__ import annotations

from hashlib import sha256
from re import fullmatch
from typing import Any, Sequence

from .provider_boundary import FAKE_PROVIDER_NAME, ProviderRequest


DEFAULT_PROVIDER_CONTEXT_VERSION = "provider-context.v1"


def build_provider_trace(
    *,
    request: ProviderRequest,
    status: str,
    input_token_estimate: int,
    output_token_estimate: int,
    estimated_cost_usd: float,
    blocked_reasons: Sequence[str] = (),
    safety_postcheck_required: bool = True,
    provider_name: str = FAKE_PROVIDER_NAME,
) -> dict[str, Any]:
    return {
        "trace_id": _safe_trace_id(request),
        "provider_name": provider_name,
        "mode": request.mode,
        "request_id": request.request_id,
        "agent_name": request.agent_name,
        "prompt_version": request.prompt_version,
        "schema_version": request.schema_version,
        "context_version": _safe_context_version(request),
        "redaction_applied": True,
        "input_token_estimate": input_token_estimate,
        "output_token_estimate": output_token_estimate,
        "estimated_cost_usd": estimated_cost_usd,
        "status": status,
        "blocked_reasons": list(blocked_reasons),
        "safety_precheck_passed": request.safety_precheck_passed,
        "context_firewall_passed": request.context_firewall_passed,
        "safety_postcheck_required": safety_postcheck_required,
    }


def _safe_trace_id(request: ProviderRequest) -> str:
    if _safe_identifier(request.trace_id):
        return request.trace_id

    seed = f"{request.request_id}:{request.agent_name}:{request.prompt_version}:{request.schema_version}"
    return f"provider-trace-{sha256(seed.encode('utf-8')).hexdigest()[:16]}"


def _safe_context_version(request: ProviderRequest) -> str:
    candidate = request.metadata.get("context_version", DEFAULT_PROVIDER_CONTEXT_VERSION)
    if isinstance(candidate, str) and _safe_identifier(candidate):
        return candidate
    return DEFAULT_PROVIDER_CONTEXT_VERSION


def _safe_identifier(value: str) -> bool:
    return bool(value) and bool(fullmatch(r"[A-Za-z0-9_.:-]{1,80}", value))
