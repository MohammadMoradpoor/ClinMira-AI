from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .settings import WorkerSettings, assert_skeleton_safe, load_settings


try:
    from clinmira_contracts.versions import HEALTH_CHECK_RESPONSE_CONTRACT_VERSION

    CONTRACT_IMPORT_STATUS = "shared_python_constants"
except ImportError:  # pragma: no cover - explicitly tested through version value.
    HEALTH_CHECK_RESPONSE_CONTRACT_VERSION = "health-check-response.v1"
    CONTRACT_IMPORT_STATUS = "local_fallback"


def build_health_response(settings: WorkerSettings | None = None) -> dict[str, Any]:
    active_settings = settings if settings is not None else load_settings()
    assert_skeleton_safe(active_settings)
    live_provider_flags = active_settings.live_provider_flags
    live_provider_gate_status = active_settings.live_provider_gate_status

    return {
        "contract_version": HEALTH_CHECK_RESPONSE_CONTRACT_VERSION,
        "service": active_settings.service_name,
        "status": "ok",
        "version": active_settings.version,
        "runtime": "python-agent-worker",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "contract_import_status": CONTRACT_IMPORT_STATUS,
        "live_agents_enabled": active_settings.live_agents_enabled,
        "openai_enabled": active_settings.openai_enabled,
        "network_calls_enabled": active_settings.network_calls_enabled,
        "direct_db_mutation_enabled": active_settings.direct_db_mutation_enabled,
        "mock_runtime_enabled": active_settings.mock_runtime_enabled,
        "temporal_enabled": active_settings.temporal_enabled,
        "live_provider_allowed": live_provider_gate_status.live_provider_allowed,
        "kill_switch_enabled": live_provider_flags.kill_switch_enabled,
        "allowed_models_count": len(live_provider_flags.allowed_models),
        "blocked_reasons_count": len(live_provider_gate_status.blocked_reasons),
        "live_provider_status": {
            "live_agents_enabled": live_provider_flags.live_agents_enabled,
            "openai_provider_enabled": live_provider_flags.openai_provider_enabled,
            "agent_network_enabled": live_provider_flags.agent_network_enabled,
            "tool_calls_enabled": live_provider_flags.tool_calls_enabled,
            "trace_export_enabled": live_provider_flags.trace_export_enabled,
            "max_cost_usd_per_run": live_provider_flags.max_cost_usd_per_run,
            "max_tokens_per_run": live_provider_flags.max_tokens_per_run,
            "timeout_ms": live_provider_flags.timeout_ms,
            "allowed_models_count": len(live_provider_flags.allowed_models),
            "kill_switch_enabled": live_provider_flags.kill_switch_enabled,
            "live_provider_allowed": live_provider_gate_status.live_provider_allowed,
            "blocked_reasons": list(live_provider_gate_status.blocked_reasons),
            "evidence_gates": dict(live_provider_gate_status.evidence_gates),
        },
        "feature_flags": active_settings.feature_flags,
        "checks": {
            "clinical_business_logic": "not_implemented",
            "database": "not_configured",
            "live_openai_calls": "disabled",
            "live_provider_gate": "blocked",
            "agent_runtime": "mock_skeleton_only",
            "direct_db_mutation": "disabled",
            "network_calls": "disabled",
            "temporal": "disabled",
        },
    }
