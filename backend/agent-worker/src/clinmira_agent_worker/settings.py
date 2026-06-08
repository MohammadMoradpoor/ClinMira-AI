from __future__ import annotations

from dataclasses import dataclass
from os import environ
from typing import Mapping

from .feature_flags import (
    LiveProviderFlags,
    LiveProviderGateStatus,
    evaluate_live_provider_gate,
    load_live_provider_flags,
)

UNSUPPORTED_RUNTIME_FEATURE_FLAGS = (
    "direct_db_mutation",
    "temporal",
    "realtime_transport",
    "voice_mode",
    "evaluator_debrief",
    "faculty_review",
    "scenario_publish",
    "agent_control",
    "advanced_imaging",
)


@dataclass(frozen=True)
class WorkerSettings:
    service_name: str
    version: str
    live_agents_enabled: bool
    openai_enabled: bool
    network_calls_enabled: bool
    direct_db_mutation_enabled: bool
    mock_runtime_enabled: bool
    temporal_enabled: bool
    feature_flags: dict[str, bool]
    requested_feature_flags: dict[str, bool]
    live_provider_flags: LiveProviderFlags
    live_provider_gate_status: LiveProviderGateStatus


def _as_bool(value: str | None) -> bool:
    return value is not None and value.strip().lower() in {"1", "true", "yes", "on"}


def load_settings(env: Mapping[str, str] | None = None) -> WorkerSettings:
    source = env if env is not None else environ
    live_provider_flags = load_live_provider_flags(source)
    live_provider_gate_status = evaluate_live_provider_gate(live_provider_flags)
    legacy_openai_requested = _as_bool(source.get("CLINMIRA_OPENAI_ENABLED"))
    requested_feature_flags = {
        "live_agents": live_provider_flags.live_agents_enabled,
        "openai": live_provider_flags.openai_provider_enabled or legacy_openai_requested,
        "network_calls": live_provider_flags.agent_network_enabled,
        "tool_calls": live_provider_flags.tool_calls_enabled,
        "trace_export": live_provider_flags.trace_export_enabled,
        "direct_db_mutation": _as_bool(source.get("CLINMIRA_AGENT_DIRECT_DB_MUTATION_ENABLED")),
        "temporal": _as_bool(source.get("CLINMIRA_TEMPORAL_ENABLED")),
        "mock_runtime": True,
        "realtime_transport": False,
        "voice_mode": False,
        "evaluator_debrief": False,
        "faculty_review": False,
        "scenario_publish": False,
        "agent_control": False,
        "advanced_imaging": False,
    }
    feature_flags = {
        "live_agents": False,
        "openai": False,
        "network_calls": False,
        "tool_calls": False,
        "trace_export": False,
        "direct_db_mutation": False,
        "temporal": False,
        "mock_runtime": True,
        "realtime_transport": False,
        "voice_mode": False,
        "evaluator_debrief": False,
        "faculty_review": False,
        "scenario_publish": False,
        "agent_control": False,
        "advanced_imaging": False,
    }

    return WorkerSettings(
        service_name="agent-worker",
        version="0.1.0",
        live_agents_enabled=False,
        openai_enabled=False,
        network_calls_enabled=False,
        direct_db_mutation_enabled=False,
        mock_runtime_enabled=True,
        temporal_enabled=False,
        feature_flags=feature_flags,
        requested_feature_flags=requested_feature_flags,
        live_provider_flags=live_provider_flags,
        live_provider_gate_status=live_provider_gate_status,
    )


def assert_skeleton_safe(settings: WorkerSettings) -> None:
    if settings.live_provider_gate_status.live_provider_allowed:
        raise RuntimeError("Skeleton worker cannot start with live provider gate allowed in Step 13")

    enabled = [
        name
        for name in UNSUPPORTED_RUNTIME_FEATURE_FLAGS
        if settings.requested_feature_flags.get(name)
    ]
    if enabled:
        joined = ", ".join(enabled)
        raise RuntimeError(f"Skeleton worker cannot start with unsupported runtime feature flags enabled: {joined}")
