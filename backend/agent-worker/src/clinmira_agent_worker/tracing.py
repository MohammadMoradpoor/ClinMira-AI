from __future__ import annotations

from hashlib import sha256
from typing import Any

from .contracts import AGENT_TRACE_CONTRACT_VERSION


STATIC_TRACE_TIMESTAMP = "1970-01-01T00:00:00Z"


def build_redacted_trace(
    *,
    agent_name: str,
    mode: str,
    status: str,
    used_fact_ids: list[str],
    safety_flags: list[str],
    request_fingerprint: str = "",
) -> dict[str, Any]:
    seed = f"{agent_name}:{mode}:{status}:{','.join(used_fact_ids)}:{request_fingerprint}"
    return {
        "contract_version": AGENT_TRACE_CONTRACT_VERSION,
        "trace_id": f"mock-trace-{sha256(seed.encode('utf-8')).hexdigest()[:16]}",
        "agent_name": agent_name,
        "mode": mode,
        "started_at": STATIC_TRACE_TIMESTAMP,
        "completed_at": STATIC_TRACE_TIMESTAMP,
        "status": status,
        "used_fact_ids": used_fact_ids,
        "safety_flags": safety_flags,
        "redaction_applied": True,
    }
