from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from .context_firewall import FORBIDDEN_FIELDS, FORBIDDEN_VISIBILITIES
from .feature_flags import (
    LiveProviderFlags,
    LiveProviderGateStatus,
    evaluate_live_provider_gate,
    load_live_provider_flags,
)
from .provider_boundary import ALLOWED_PROVIDER_MODES, ProviderError, ProviderRequest


FORBIDDEN_PROVIDER_CAPABILITIES = {
    "tool_call",
    "tool_calls",
    "function_call",
    "external_network",
    "network",
    "backend_api_call",
    "direct_db_mutation",
    "postgres_mutation",
    "durable_event_write",
    "outbox_publish",
    "temporal",
}

FORBIDDEN_CONTEXT_COLLECTION_KEYS = {
    "hidden_facts",
    "faculty_facts",
    "faculty_notes",
    "safety_facts",
    "evaluator_facts",
}


@dataclass(frozen=True)
class ProviderGuardResult:
    allowed: bool
    errors: tuple[ProviderError, ...]
    gate_status: LiveProviderGateStatus

    @property
    def blocked_reasons(self) -> tuple[str, ...]:
        return tuple(error.blocked_reason or error.message for error in self.errors)


def validate_provider_request(
    request_like: ProviderRequest | Mapping[str, Any],
    *,
    flags: LiveProviderFlags | None = None,
    evidence: Mapping[str, bool] | None = None,
) -> ProviderGuardResult:
    request = request_like if isinstance(request_like, ProviderRequest) else ProviderRequest.from_mapping(request_like)
    guard_flags = flags if flags is not None else load_live_provider_flags({})
    gate_status = evaluate_live_provider_gate(guard_flags, evidence)
    errors: list[ProviderError] = []

    if request.mode not in ALLOWED_PROVIDER_MODES:
        errors.append(_blocked("live_mode_blocked", f"Provider mode is not allowed: {request.mode}"))

    for reason in gate_status.blocked_reasons:
        errors.append(_blocked("provider_gate_blocked", reason))

    if not request.context_firewall_passed:
        errors.append(_blocked("context_firewall_required", "Provider request is missing context firewall evidence"))
    if not request.safety_precheck_passed:
        errors.append(_blocked("safety_precheck_required", "Provider request is missing deterministic safety precheck evidence"))
    if request.max_tokens <= 0:
        errors.append(_blocked("max_tokens_required", "Provider request max_tokens must be greater than 0"))
    if request.max_cost_usd <= 0:
        errors.append(_blocked("max_cost_required", "Provider request max_cost_usd must be greater than 0"))
    if request.timeout_ms <= 0:
        errors.append(_blocked("timeout_required", "Provider request timeout_ms must be greater than 0"))

    if not guard_flags.allowed_models:
        errors.append(_blocked("model_allowlist_required", "Provider model allowlist is empty"))
    elif request.model_name not in guard_flags.allowed_models:
        errors.append(_blocked("model_not_allowed", f"Provider model is not allowlisted: {request.model_name}"))

    for capability in _requested_capabilities(request):
        if capability in FORBIDDEN_PROVIDER_CAPABILITIES:
            errors.append(_blocked("provider_capability_blocked", f"Provider capability is forbidden: {capability}"))

    errors.extend(_context_errors(request.allowed_context))

    return ProviderGuardResult(
        allowed=not errors,
        errors=tuple(_dedupe_errors(errors)),
        gate_status=gate_status,
    )


def _requested_capabilities(request: ProviderRequest) -> tuple[str, ...]:
    values: list[str] = []

    for source in (request.metadata, request.allowed_context):
        for key in ("requested_capabilities", "capabilities"):
            candidate = source.get(key)
            if isinstance(candidate, list):
                values.extend(str(item).strip().lower() for item in candidate)
            elif isinstance(candidate, str):
                values.append(candidate.strip().lower())

        boolean_flags = {
            "tool_calls_requested": "tool_call",
            "requires_tool_call": "tool_call",
            "external_network_requested": "external_network",
            "requires_network_access": "external_network",
            "requires_backend_api_call": "backend_api_call",
            "requires_db_mutation": "direct_db_mutation",
            "requires_temporal": "temporal",
        }
        for flag_name, capability in boolean_flags.items():
            if source.get(flag_name) is True:
                values.append(capability)

    return tuple(value for value in values if value)


def _context_errors(value: Any, path: tuple[str, ...] = ()) -> tuple[ProviderError, ...]:
    errors: list[ProviderError] = []

    if isinstance(value, dict):
        visibility = value.get("visibility")
        if isinstance(visibility, str) and visibility in FORBIDDEN_VISIBILITIES:
            errors.append(_blocked("hidden_context_blocked", f"Forbidden fact visibility: {visibility}"))

        for key, nested in value.items():
            normalized_key = str(key)
            joined = ".".join((*path, normalized_key))
            if normalized_key in FORBIDDEN_FIELDS:
                errors.append(_blocked("forbidden_context_field", f"Forbidden context field: {joined}"))
            if normalized_key in FORBIDDEN_CONTEXT_COLLECTION_KEYS:
                errors.append(_blocked("hidden_context_blocked", f"Forbidden context collection: {joined}"))
            errors.extend(_context_errors(nested, (*path, normalized_key)))
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            errors.extend(_context_errors(nested, (*path, str(index))))

    return tuple(errors)


def _blocked(code: str, message: str) -> ProviderError:
    return ProviderError(code=code, message=message, blocked_reason=message)


def _dedupe_errors(errors: list[ProviderError]) -> list[ProviderError]:
    deduped: list[ProviderError] = []
    seen: set[tuple[str, str]] = set()
    for error in errors:
        identity = (error.code, error.blocked_reason)
        if identity not in seen:
            deduped.append(error)
            seen.add(identity)
    return deduped
