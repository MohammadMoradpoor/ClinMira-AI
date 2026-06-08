from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
from os import environ
from typing import Mapping, Sequence


LIVE_AGENTS_ENABLED_ENV = "CLINMIRA_LIVE_AGENTS_ENABLED"
OPENAI_PROVIDER_ENABLED_ENV = "CLINMIRA_OPENAI_PROVIDER_ENABLED"
AGENT_NETWORK_ENABLED_ENV = "CLINMIRA_AGENT_NETWORK_ENABLED"
AGENT_TOOL_CALLS_ENABLED_ENV = "CLINMIRA_AGENT_TOOL_CALLS_ENABLED"
AGENT_TRACE_EXPORT_ENABLED_ENV = "CLINMIRA_AGENT_TRACE_EXPORT_ENABLED"
AGENT_MAX_COST_USD_PER_RUN_ENV = "CLINMIRA_AGENT_MAX_COST_USD_PER_RUN"
AGENT_MAX_TOKENS_PER_RUN_ENV = "CLINMIRA_AGENT_MAX_TOKENS_PER_RUN"
AGENT_TIMEOUT_MS_ENV = "CLINMIRA_AGENT_TIMEOUT_MS"
AGENT_ALLOWED_MODELS_ENV = "CLINMIRA_AGENT_ALLOWED_MODELS"
AGENT_KILL_SWITCH_ENV = "CLINMIRA_AGENT_KILL_SWITCH"

EVIDENCE_GATE_NAMES = (
    "step_9_eval_gate",
    "step_10_safety_gate",
    "step_11_context_firewall_gate",
    "db_backed_eval_gate",
    "trace_redaction_gate",
    "cost_control_gate",
)


@dataclass(frozen=True)
class LiveProviderFlags:
    live_agents_enabled: bool = False
    openai_provider_enabled: bool = False
    agent_network_enabled: bool = False
    tool_calls_enabled: bool = False
    trace_export_enabled: bool = False
    max_cost_usd_per_run: float = 0.0
    max_tokens_per_run: int = 0
    timeout_ms: int = 0
    allowed_models: tuple[str, ...] = ()
    kill_switch_enabled: bool = True
    invalid_flag_names: tuple[str, ...] = ()


@dataclass(frozen=True)
class LiveProviderGateStatus:
    live_provider_allowed: bool
    blocked_reasons: tuple[str, ...]
    evidence_gates: dict[str, bool]

    def to_dict(self) -> dict[str, object]:
        return {
            "live_provider_allowed": self.live_provider_allowed,
            "blocked_reasons": list(self.blocked_reasons),
            "evidence_gates": dict(self.evidence_gates),
        }


def parse_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default

    normalized = value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def parse_float(value: str | None, default: float) -> float:
    if value is None:
        return default

    try:
        parsed = float(value)
    except ValueError:
        return default
    return parsed if isfinite(parsed) else default


def parse_int(value: str | None, default: int) -> int:
    if value is None:
        return default

    try:
        return int(value, 10)
    except ValueError:
        return default


def parse_model_allowlist(value: str | None) -> tuple[str, ...]:
    if value is None:
        return ()

    models: list[str] = []
    seen: set[str] = set()
    for candidate in value.split(","):
        model = candidate.strip()
        if model and model not in seen:
            models.append(model)
            seen.add(model)
    return tuple(models)


def load_live_provider_flags(env: Mapping[str, str] | None = None) -> LiveProviderFlags:
    source = env if env is not None else environ
    invalid_flag_names = _invalid_flag_names(source)

    return LiveProviderFlags(
        live_agents_enabled=parse_bool(source.get(LIVE_AGENTS_ENABLED_ENV), False),
        openai_provider_enabled=parse_bool(source.get(OPENAI_PROVIDER_ENABLED_ENV), False),
        agent_network_enabled=parse_bool(source.get(AGENT_NETWORK_ENABLED_ENV), False),
        tool_calls_enabled=parse_bool(source.get(AGENT_TOOL_CALLS_ENABLED_ENV), False),
        trace_export_enabled=parse_bool(source.get(AGENT_TRACE_EXPORT_ENABLED_ENV), False),
        max_cost_usd_per_run=parse_float(source.get(AGENT_MAX_COST_USD_PER_RUN_ENV), 0.0),
        max_tokens_per_run=parse_int(source.get(AGENT_MAX_TOKENS_PER_RUN_ENV), 0),
        timeout_ms=parse_int(source.get(AGENT_TIMEOUT_MS_ENV), 0),
        allowed_models=parse_model_allowlist(source.get(AGENT_ALLOWED_MODELS_ENV)),
        kill_switch_enabled=parse_bool(source.get(AGENT_KILL_SWITCH_ENV), True),
        invalid_flag_names=invalid_flag_names,
    )


def evaluate_live_provider_gate(
    flags: LiveProviderFlags,
    evidence: Mapping[str, bool] | None = None,
) -> LiveProviderGateStatus:
    evidence_gates = _normalize_evidence_gates(evidence)
    blocked_reasons: list[str] = []

    if flags.invalid_flag_names:
        blocked_reasons.append(f"Invalid live-provider flag values: {', '.join(flags.invalid_flag_names)}")
    if flags.kill_switch_enabled:
        blocked_reasons.append("CLINMIRA_AGENT_KILL_SWITCH is enabled")
    if not flags.live_agents_enabled:
        blocked_reasons.append("CLINMIRA_LIVE_AGENTS_ENABLED is not enabled")
    if not flags.openai_provider_enabled:
        blocked_reasons.append("CLINMIRA_OPENAI_PROVIDER_ENABLED is not enabled")
    if not flags.agent_network_enabled:
        blocked_reasons.append("CLINMIRA_AGENT_NETWORK_ENABLED is not enabled")
    if flags.max_cost_usd_per_run <= 0:
        blocked_reasons.append("CLINMIRA_AGENT_MAX_COST_USD_PER_RUN must be greater than 0")
    if flags.max_tokens_per_run <= 0:
        blocked_reasons.append("CLINMIRA_AGENT_MAX_TOKENS_PER_RUN must be greater than 0")
    if flags.timeout_ms <= 0:
        blocked_reasons.append("CLINMIRA_AGENT_TIMEOUT_MS must be greater than 0")
    if not flags.allowed_models:
        blocked_reasons.append("CLINMIRA_AGENT_ALLOWED_MODELS must contain at least one allowed model")

    for gate_name, passed in evidence_gates.items():
        if not passed:
            blocked_reasons.append(f"Evidence gate not passed: {gate_name}")

    return LiveProviderGateStatus(
        live_provider_allowed=not blocked_reasons,
        blocked_reasons=tuple(blocked_reasons),
        evidence_gates=evidence_gates,
    )


def build_live_provider_status(env: Mapping[str, str] | None = None) -> dict[str, object]:
    flags = load_live_provider_flags(env)
    gate_status = evaluate_live_provider_gate(flags)

    return {
        "live_agents_enabled": flags.live_agents_enabled,
        "openai_provider_enabled": flags.openai_provider_enabled,
        "agent_network_enabled": flags.agent_network_enabled,
        "tool_calls_enabled": flags.tool_calls_enabled,
        "trace_export_enabled": flags.trace_export_enabled,
        "max_cost_usd_per_run": flags.max_cost_usd_per_run,
        "max_tokens_per_run": flags.max_tokens_per_run,
        "timeout_ms": flags.timeout_ms,
        "allowed_models_count": len(flags.allowed_models),
        "kill_switch_enabled": flags.kill_switch_enabled,
        "live_provider_allowed": gate_status.live_provider_allowed,
        "blocked_reasons": list(gate_status.blocked_reasons),
        "evidence_gates": dict(gate_status.evidence_gates),
    }


def _normalize_evidence_gates(evidence: Mapping[str, bool] | None) -> dict[str, bool]:
    source = evidence if evidence is not None else {}
    return {gate_name: bool(source.get(gate_name, False)) for gate_name in EVIDENCE_GATE_NAMES}


def _invalid_flag_names(source: Mapping[str, str]) -> tuple[str, ...]:
    invalid: list[str] = []
    for name in (
        LIVE_AGENTS_ENABLED_ENV,
        OPENAI_PROVIDER_ENABLED_ENV,
        AGENT_NETWORK_ENABLED_ENV,
        AGENT_TOOL_CALLS_ENABLED_ENV,
        AGENT_TRACE_EXPORT_ENABLED_ENV,
        AGENT_KILL_SWITCH_ENV,
    ):
        if not _is_valid_bool_value(source.get(name)):
            invalid.append(name)

    if not _is_valid_float_value(source.get(AGENT_MAX_COST_USD_PER_RUN_ENV)):
        invalid.append(AGENT_MAX_COST_USD_PER_RUN_ENV)
    if not _is_valid_int_value(source.get(AGENT_MAX_TOKENS_PER_RUN_ENV)):
        invalid.append(AGENT_MAX_TOKENS_PER_RUN_ENV)
    if not _is_valid_int_value(source.get(AGENT_TIMEOUT_MS_ENV)):
        invalid.append(AGENT_TIMEOUT_MS_ENV)

    return tuple(invalid)


def _is_valid_bool_value(value: str | None) -> bool:
    if value is None:
        return True
    return value.strip().lower() in {"1", "true", "yes", "on", "0", "false", "no", "off"}


def _is_valid_float_value(value: str | None) -> bool:
    if value is None:
        return True
    try:
        return isfinite(float(value))
    except ValueError:
        return False


def _is_valid_int_value(value: str | None) -> bool:
    if value is None:
        return True
    try:
        int(value, 10)
    except ValueError:
        return False
    return True


def blocked_reason_contains(reasons: Sequence[str], needle: str) -> bool:
    return any(needle in reason for reason in reasons)
