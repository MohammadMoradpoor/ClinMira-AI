# ClinMira Contract Inventory

## Status

Current inventory status: `health-plus-event-replay-plus-step-8b-simulation-runtime-plus-step-11-mock-agent-contracts-plus-step-15-replay-gateway`.

This inventory is the source of truth for contracts allowed before live-agent, frontend integration, production publisher, and production realtime gates.

## Active Contracts

| Contract | Type | Version | OpenAPI | TypeScript | JSON Schema | Python |
| --- | --- | --- | --- | --- | --- | --- |
| `HealthCheckResponseDto` | API response | `health-check-response.v1` | `components.schemas.HealthCheckResponseDto` in `openapi/clinmira-api.v1.json` | `src/health-response.ts` | `schemas/health-response.schema.json` | Version constants only; Pydantic model not implemented. |
| `FeatureFlagSnapshotDto` | Snapshot | `feature-flag-snapshot.v1` | `components.schemas.FeatureFlagSnapshotDto` in `openapi/clinmira-api.v1.json` | `src/feature-flags.ts` | `schemas/feature-flags.schema.json` | Version constants only; Pydantic model not implemented. |
| `EventEnvelope` | Event envelope | `event-envelope.v1` | Not an API route. | Not implemented. | `events/event-envelope.schema.json` | Not implemented. |
| `ReplayRequest` | Replay route query contract | `replay-request.v1` | Not implemented in OpenAPI in Step 15; backend route is active. | Runtime DTO interfaces in `backend/api/src/replay/replay.dto.ts`. | `events/replay-request.schema.json` | Not implemented. |
| `ReplayEvent` | Backend-filtered replay event | `replay-event.v1` | Not implemented in OpenAPI in Step 15; backend route is active. | Runtime DTO interfaces in `backend/api/src/replay/replay.dto.ts`. | `events/replay-event.schema.json` | Not implemented. |
| `ReplayCursor` | Replay cursor | `replay-cursor.v1` | Not implemented in OpenAPI in Step 15; backend route is active. | Runtime DTO interfaces in `backend/api/src/replay/replay.dto.ts`. | `events/replay-cursor.schema.json` | Not implemented. |
| `ReplayResponse` | Replay route response | `replay-response.v1` | Not implemented in OpenAPI in Step 15; backend route is active. | Runtime DTO interfaces in `backend/api/src/replay/replay.dto.ts`. | `events/replay-response.schema.json` | Not implemented. |
| `RealtimeStreamFrame` | Delivery-only SSE frame | `realtime-stream.v1` | Not implemented in OpenAPI in Step 15; backend SSE route is active. | Runtime DTO interfaces in `backend/api/src/realtime/realtime.dto.ts`. | `events/realtime-stream.schema.json` | Not implemented. |
| `CreateSimulationSessionRequestDto` | Simulation runtime request | `create-simulation-session-request.v1` | `components.schemas.CreateSimulationSessionRequestDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/create-simulation-session-request.schema.json` | Not implemented. |
| `SimulationSessionDto` | Simulation runtime state | `simulation-session.v1` | `components.schemas.SimulationSessionDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/simulation-session.schema.json` | Not implemented. |
| `SubmitSimulationActionRequestDto` | Simulation runtime request | `submit-simulation-action-request.v1` | `components.schemas.SubmitSimulationActionRequestDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/submit-simulation-action-request.schema.json` | Not implemented. |
| `SimulationTurnResultDto` | Simulation runtime response | `simulation-turn-result.v1` | `components.schemas.SimulationTurnResultDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/simulation-turn-result.schema.json` | Not implemented. |
| `ClinicalActionDto` | Simulation runtime entity | `clinical-action.v1` | `components.schemas.ClinicalActionDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/clinical-action.schema.json` | Not implemented. |
| `ConversationMessageDto` | Simulation runtime entity | `conversation-message.v1` | `components.schemas.ConversationMessageDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/conversation-message.schema.json` | Not implemented. |
| `TimelineEventDto` | Simulation runtime entity | `timeline-event.v1` | `components.schemas.TimelineEventDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/timeline-event.schema.json` | Not implemented. |
| `SessionStateSnapshotDto` | Simulation runtime projection | `session-state-snapshot.v1` | `components.schemas.SessionStateSnapshotDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/session-state-snapshot.schema.json` | Not implemented. |
| `RevealedFactReferenceDto` | Simulation runtime reference | `revealed-fact-reference.v1` | `components.schemas.RevealedFactReferenceDto` in `openapi/clinmira-api.v1.json` | Runtime DTO interface in `backend/api/src/simulation/simulation.dto.ts`. | `simulation/revealed-fact-reference.schema.json` | Not implemented. |
| `AgentRunRequest` | Mock agent runtime request | `agent-run-request.v1` | Not an API route. | Not implemented. | `agents/agent-run-request.schema.json` | Version constants only; stdlib worker dataclass exists. |
| `AgentRunResponse` | Mock agent runtime response | `agent-run-response.v1` | Not an API route. | Not implemented. | `agents/agent-run-response.schema.json` | Version constants only; stdlib worker dataclass exists. |
| `AgentContext` | Mock agent context | `agent-context.v1` | Not an API route. | Not implemented. | `agents/agent-context.schema.json` | Version constants only; context firewall validates worker inputs. |
| `AgentTrace` | Redacted mock agent trace | `agent-trace.v1` | Not an API route. | Not implemented. | `agents/agent-trace.schema.json` | Version constants only; worker emits local redacted trace object. |
| `AgentError` | Mock agent error | `agent-error.v1` | Not an API route. | Not implemented. | `agents/agent-error.schema.json` | Version constants only. |

## Active Routes

| Route | Method | Response DTO | Scope |
| --- | --- | --- | --- |
| `/health` | `GET` | `HealthCheckResponseDto` | Health-only skeleton. |
| `/api/v1/health` | `GET` | `HealthCheckResponseDto` | Versioned health-only skeleton. |

Step 8B mock simulation API routes remain active.

| Route | Method | Response DTO | Scope |
| --- | --- | --- | --- |
| `/api/v1/simulation-sessions` | `POST` | `SimulationSessionDto` | Create backend-owned mock session. |
| `/api/v1/simulation-sessions/{id}` | `GET` | `SimulationSessionDto` | Read student-safe session projection. |
| `/api/v1/simulation-sessions/{id}/actions` | `POST` | `SimulationTurnResultDto` | Submit deterministic mock action. |
| `/api/v1/simulation-sessions/{sessionId}/replay` | `GET` | `ReplayResponse` | Backend-filtered replay from PostgreSQL `event_log` after a sequence cursor. |
| `/api/v1/simulation-sessions/{sessionId}/events/stream` | `GET` SSE | `RealtimeStreamFrame` | Delivery-only stream that emits filtered replay frames first and a safe completion frame; not source of truth. |

## Active Event/Replay Foundations

| Contract | Scope | Important Limits |
| --- | --- | --- |
| `EventEnvelope` | Generic event wrapper with stream, sequence, schema version, payload classification, replayability, payload, trace, and correlation metadata. | Payload is a generic object only; no clinical/session/action/debrief payload DTOs are implemented. |
| `ReplayRequest` | Backend-filtered replay request using session id, sequence cursor, audience, limit, and replayable-event preference. | Temporary actor headers are context only, not production auth/RBAC. |
| `ReplayEvent` | Backend-filtered replay event with sequence, event type, occurred time, classification, sanitized payload, and redaction indicator. | Generic payload only; no clinical event payload DTO catalog is active. |
| `ReplayCursor` | Next sequence cursor for reconnect replay. | Cursor advances by durable source sequence, including when events are filtered out. |
| `ReplayResponse` | Backend-filtered replay response with event list, redaction, gap, duplicate, next-cursor, snapshot fallback, and pagination indicators. | Frontend integration remains blocked; consumers must not infer hidden facts or use frontend state as truth. |
| `RealtimeStreamFrame` | Delivery-only frame for replay events and replay completion metadata. | SSE is not domain truth, has no Redis publisher, emits no unpersisted domain events, and does not unblock frontend integration. |

## Active Simulation Foundations

| Contract | Scope | Important Limits |
| --- | --- | --- |
| `CreateSimulationSessionRequestDto` | Request shape for backend-owned mock session creation. | Temporary actor headers are context only, not production auth. |
| `SimulationSessionDto` | Persisted session projection locked to tenant, case, case version, and student. | `patient_state` is a projection only; it is not clinical fact truth. |
| `SubmitSimulationActionRequestDto` | Request shape for deterministic mock actions with optional idempotency. | Risky actions remain unsupported in mock runtime and must not mutate treatment state. |
| `SimulationTurnResultDto` | Response grouping session, action, messages, timeline, reveal references, and state snapshot. | Student-facing use is backend-filtered and hidden fact denial tested. |
| `ClinicalActionDto` | Persisted action projection. | No order, imaging, diagnosis result, treatment, safety warning, debrief, scoring, or faculty workflow is active. |
| `ConversationMessageDto` | Persisted message projection with `used_fact_ids`. | Message content is backend-filtered before return. |
| `TimelineEventDto` | Ordered session timeline projection. | Timeline is not an event-log replacement. `event_log` remains durable replay authority. |
| `SessionStateSnapshotDto` | Recovery projection. | Snapshot is not a fact source and must not replace `fact_ledger`. |
| `RevealedFactReferenceDto` | Session reveal reference. | Stores fact references only; no hidden fact content, faculty notes, prompts, or frontend mock state. |

## Active Mock Agent Foundations

| Contract | Scope | Important Limits |
| --- | --- | --- |
| `AgentRunRequest` | Local Python worker mock-agent request shape. | `mode` is mock-only. No live provider, OpenAI, model routing, tool call, backend API call, or direct DB mutation fields. |
| `AgentContext` | Student-safe/revealed context foundation for mock agents. | No hidden fact content, raw fact ledger content, faculty-only notes, internal prompts, system prompts, API keys, or provider secrets. |
| `AgentRunResponse` | Structured mock-agent output shape. | Includes used fact ids, safety flags, trace, and errors; does not authorize treatment, imaging interpretation, scoring, debrief, or faculty workflow. |
| `AgentTrace` | Local redacted trace foundation. | Redacted by default; no provider payloads, secrets, hidden facts, faculty notes, or internal prompts. |
| `AgentError` | Structured mock-agent error shape. | Error contract only; no provider-specific or tool-call schema. |

## Active Feature Flags

All current gated feature flags are disabled by contract. Step 11 also records that the local mock runtime is enabled:

- `live_agents`
- `openai`
- `network_calls`
- `direct_db_mutation`
- `mock_runtime` is true only for local deterministic worker runtime.
- `temporal`
- `realtime_transport`
- `voice_mode`
- `evaluator_debrief`
- `faculty_review`
- `scenario_publish`
- `agent_control`
- `advanced_imaging`

## Blocked Contract Families

These contract families are required by the architecture, but are intentionally not active yet:

| Contract Family | Gate Required Before Addition | Reason Blocked Now |
| --- | --- | --- |
| Case and case-version DTOs | API integration and role-filtered payload gate. | Backend routes and student/faculty payload contracts are not implemented. |
| Patient twin, hidden fact, revealed fact, and fact ledger DTOs | Runtime context firewall and role-filtered API gate. | Student-visible payload safety is not proven at runtime. |
| Simulation API expansion beyond Step 8B routes | Architecture review, contracts, runtime tests, and safety gates. | Only create/get/submit mock simulation routes are active. |
| Clinical event payload schemas | Simulation/session/action/message/timeline schema gates. | Step 7 only defines envelope and replay shapes, not product payloads. |
| Frontend realtime event consumers and reducers | Event log, outbox, sequence, redaction, replay API, reducer tests, and frontend integration gate. | Step 15 replay/SSE is backend-only and does not authorize frontend integration. |
| Production outbox publisher and Redis/WebSocket fanout | Publisher retry/dead-letter policy, observability, and transport tests. | No production publisher exists; Redis/WebSocket/SSE cannot become source of truth. |
| Live agent provider/model/tool schemas | Eval harness, tool permission matrix, context firewall, safety gates, and Step 12 feature flags. | Step 11 adds mock-agent schemas only; live agents and tool execution remain blocked. |
| Debrief and score DTOs | Evidence-id grounding, rubric schema, and evaluator gate. | Generated teaching claims need evidence controls. |
| Faculty review DTOs | Backend-enforced review workflow and audit schema. | UI-only review gates are invalid. |

## Drift Rules

- If a contract exists in OpenAPI, it must exist in TypeScript and JSON Schema.
- If Python consumes a contract, it must have matching Pydantic schema and version constants.
- If frontend consumes a contract, generated or shared TypeScript contracts must be freshness-checked.
- If an event contract exists, it must include sequence, schema version, role redaction, replay behavior, and duplicate handling.
- If any contract exposes clinical data, hidden fact leakage tests become mandatory before release.
