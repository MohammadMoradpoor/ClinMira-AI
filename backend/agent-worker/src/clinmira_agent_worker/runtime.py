from __future__ import annotations

from typing import Any

from .context_firewall import validate_agent_context
from .contracts import AgentRunRequest, AgentRunResponse
from .live_model_provider import DisabledLiveModelProvider, LiveModelDisabledError
from .registry import APPROVED_MOCK_AGENT_NAMES, build_agent_registry
from .settings import WorkerSettings, assert_skeleton_safe, load_settings
from .tracing import build_redacted_trace


class AgentRuntimeError(RuntimeError):
    """Fail-closed runtime error for unsupported mock-agent behavior."""


FORBIDDEN_REQUEST_CAPABILITIES = {
    "live_model",
    "openai",
    "network",
    "external_network",
    "direct_db_mutation",
    "postgres_mutation",
    "backend_api_call",
    "durable_event_write",
    "outbox_publish",
    "temporal",
    "tool_call",
}


class AgentRuntime:
    def __init__(
        self,
        settings: WorkerSettings | None = None,
        live_model_provider: DisabledLiveModelProvider | None = None,
    ) -> None:
        self.settings = settings if settings is not None else load_settings()
        self.live_model_provider = live_model_provider if live_model_provider is not None else DisabledLiveModelProvider()
        self.registry = build_agent_registry()

    def run_agent(self, request_like: AgentRunRequest | dict[str, Any]) -> dict[str, Any]:
        request = request_like if isinstance(request_like, AgentRunRequest) else AgentRunRequest.from_mapping(request_like)
        assert_skeleton_safe(self.settings)
        self._reject_unsupported_request(request)

        agent = self.registry.get(request.agent_name)
        if agent is None:
            raise AgentRuntimeError(f"Unknown mock agent: {request.agent_name}")

        validate_agent_context(request.agent_name, request.context)
        response = agent.run(request)
        response = self._attach_trace(response, request)
        return response.to_dict()

    def run_all_mock_agents(self, request_like: AgentRunRequest | dict[str, Any]) -> dict[str, dict[str, Any]]:
        request = request_like if isinstance(request_like, AgentRunRequest) else AgentRunRequest.from_mapping(request_like)
        return {
            agent_name: self.run_agent(
                AgentRunRequest(
                    agent_name=agent_name,
                    mode=request.mode,
                    context=request.context,
                    input_text=request.input_text,
                    requested_capabilities=request.requested_capabilities,
                )
            )
            for agent_name in APPROVED_MOCK_AGENT_NAMES
        }

    def _reject_unsupported_request(self, request: AgentRunRequest) -> None:
        if request.mode != "mock":
            try:
                self.live_model_provider.run()
            except LiveModelDisabledError as exc:
                raise AgentRuntimeError(str(exc)) from exc
            raise AgentRuntimeError("Live mode is disabled until Step 13 gates pass.")

        requested = {capability.strip().lower() for capability in request.requested_capabilities}
        forbidden = sorted(requested.intersection(FORBIDDEN_REQUEST_CAPABILITIES))
        if forbidden:
            raise AgentRuntimeError(f"Unsupported mock-agent capability requested: {', '.join(forbidden)}")

        context_flags = {
            "requires_db_mutation": "direct_db_mutation",
            "requires_network_access": "external_network",
            "requires_backend_api_call": "backend_api_call",
            "requires_live_provider": "live_model",
        }
        for flag_name, capability in context_flags.items():
            if request.context.get(flag_name) is True:
                raise AgentRuntimeError(f"Unsupported mock-agent capability requested: {capability}")

    def _attach_trace(self, response: AgentRunResponse, request: AgentRunRequest) -> AgentRunResponse:
        trace = build_redacted_trace(
            agent_name=response.agent_name,
            mode=response.mode,
            status=response.status,
            used_fact_ids=response.used_fact_ids,
            safety_flags=response.safety_flags,
            request_fingerprint=f"{request.agent_name}:{request.input_text[:64]}",
        )
        return AgentRunResponse(
            contract_version=response.contract_version,
            agent_name=response.agent_name,
            agent_role=response.agent_role,
            mode=response.mode,
            status=response.status,
            output_text=response.output_text,
            structured_output=response.structured_output,
            used_fact_ids=response.used_fact_ids,
            safety_flags=response.safety_flags,
            trace=trace,
            errors=response.errors,
        )
