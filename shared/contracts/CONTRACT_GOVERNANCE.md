# ClinMira Contract Governance

## Purpose

This document controls how shared contracts change before product implementation starts. It exists to prevent ad hoc route shapes, frontend mock assumptions, Python schema drift, hidden fact leakage, and premature agent/realtime schemas.

## Current Scope

Step 4 authorizes health-only API contract governance:

- OpenAPI paths: `/health` and `/api/v1/health`.
- OpenAPI components: `HealthCheckResponseDto` and `FeatureFlagSnapshotDto`.
- TypeScript DTOs and builders for the same two DTOs.
- JSON Schemas for the same two DTOs.
- Python version constants and schema package placeholder only.
- Contract tests and static guard scans.

Step 7 authorizes event/replay contract foundations only:

- Event envelope JSON Schema: `events/event-envelope.schema.json`.
- Replay request JSON Schema: `events/replay-request.schema.json`.
- Replay response JSON Schema: `events/replay-response.schema.json`.
- Event/replay README and inventory entries.

Step 7 event contracts are envelope-level only. Event payloads are generic JSON objects and are not clinical DTOs. No simulation event payloads, frontend consumers, realtime runtime, Redis runtime, WebSocket/SSE behavior, replay API route, or publisher worker is implemented by these contracts.

Step 8 authorizes simulation contract foundations:

- Simulation JSON Schemas under `simulation/`.
- DTO naming for create-session, session, submit-action, turn result, action, message, timeline, snapshot, and revealed fact reference.
- Contract tests that prove simulation schemas are foundation-only and do not activate OpenAPI routes.

Step 8B activates only the approved mock simulation API routes:

- `POST /api/v1/simulation-sessions`
- `GET /api/v1/simulation-sessions/{id}`
- `POST /api/v1/simulation-sessions/{id}/actions`

Step 8B simulation contracts are student-safe by default. No frontend consumer, Python agent consumer, live OpenAI path, Redis runtime, WebSocket/SSE behavior, Temporal workflow, debrief, scoring, faculty workflow, order workflow, imaging workflow, replay API, event API, or product event payload schema is implemented by these contracts.

Step 11 authorizes mock-agent contract foundations only:

- Agent run request JSON Schema: `agents/agent-run-request.schema.json`.
- Agent run response JSON Schema: `agents/agent-run-response.schema.json`.
- Agent context JSON Schema: `agents/agent-context.schema.json`.
- Agent trace JSON Schema: `agents/agent-trace.schema.json`.
- Agent error JSON Schema: `agents/agent-error.schema.json`.
- Python version constants for these schemas.

Step 11 agent contracts are mock-runtime contracts only. They do not authorize live OpenAI calls, provider SDK fields, model routing, tool calls, handoffs, direct database mutation, backend API calls, Temporal workflows, debrief generation, faculty review, treatment advice, or imaging interpretation. Live provider integration remains blocked until Step 12 gates pass and must be feature-flagged off by default.

Step 15 authorizes backend-filtered replay and delivery-only SSE stream contracts:

- Replay event JSON Schema: `events/replay-event.schema.json`.
- Replay cursor JSON Schema: `events/replay-cursor.schema.json`.
- Updated replay request/response JSON Schemas: `events/replay-request.schema.json`, `events/replay-response.schema.json`.
- Realtime stream frame JSON Schema: `events/realtime-stream.schema.json`.

Step 15 replay contracts are backend-filtered and PostgreSQL-backed. They authorize only replay from `event_log` for already-persisted simulation-session events and optional SSE delivery of filtered replay frames. They do not authorize Redis as source of truth, WebSocket behavior, frontend integration, frontend reducer behavior, live agents, provider runtime, Temporal workflows, production publisher workers, treatment/order/imaging workflows, debrief generation, faculty workflow, or production auth/RBAC.

## Forbidden Until Later Gates

Do not add these contracts before their later gates:

- Clinical case, case version, patient twin, hidden fact, revealed fact, or fact ledger DTOs.
- Order, imaging, diagnosis result, treatment, safety warning, score, faculty review, evaluator, or debrief DTOs.
- Clinical event payload DTOs beyond generic replay envelopes.
- Redis/WebSocket source-of-truth transport schemas.
- Frontend reducer or frontend realtime consumer schemas.
- Live-agent provider, tool input/output, guardrail, handoff, model routing, or unredacted tracing payload schemas.
- Faculty review, analytics, rubric, score, or pilot-readiness DTOs.
- Database schema, migration, ORM model, Prisma schema, SQL file, or seed contract.

## Naming Rules

- Canonical DTO names must end with `Dto`.
- API responses use `<Resource><Action>ResponseDto`.
- API requests use `<Resource><Action>RequestDto`.
- Cross-cutting non-entity snapshots may use `<Resource>SnapshotDto`.
- JSON Schema titles must match canonical DTO names.
- OpenAPI component names must match canonical DTO names.
- TypeScript and Python constants must use the same version values.
- Non-canonical aliases are forbidden unless an ADR-level compatibility exception is recorded.

## Version Rules

- Every canonical DTO family must have a version constant.
- Health contract version: `health-check-response.v1`.
- Feature flag snapshot contract version: `feature-flag-snapshot.v1`.
- OpenAPI contract version: `openapi.clinmira-api.v1`.
- API contract version: `api.v1`.
- Event envelope schema version: `event-envelope.v1`.
- Replay request schema version: `replay-request.v1`.
- Replay response schema version: `replay-response.v1`.
- Replay event schema version: `replay-event.v1`.
- Replay cursor schema version: `replay-cursor.v1`.
- Realtime stream schema version: `realtime-stream.v1`.
- Create simulation session request schema version: `create-simulation-session-request.v1`.
- Simulation session schema version: `simulation-session.v1`.
- Submit simulation action request schema version: `submit-simulation-action-request.v1`.
- Simulation turn result schema version: `simulation-turn-result.v1`.
- Clinical action schema version: `clinical-action.v1`.
- Conversation message schema version: `conversation-message.v1`.
- Timeline event schema version: `timeline-event.v1`.
- Session state snapshot schema version: `session-state-snapshot.v1`.
- Revealed fact reference schema version: `revealed-fact-reference.v1`.
- Agent run request schema version: `agent-run-request.v1`.
- Agent run response schema version: `agent-run-response.v1`.
- Agent context schema version: `agent-context.v1`.
- Agent trace schema version: `agent-trace.v1`.
- Agent error schema version: `agent-error.v1`.
- Breaking changes require a new version, inventory update, tests, and implementation report.
- Additive optional fields require an inventory update and contract test update.

## Event And Replay Rules

- PostgreSQL `event_log` is the authoritative replay source.
- Redis/WebSocket/SSE transports are never source of truth.
- `EventEnvelope` must include `sequence`, `schema_version`, `event_type`, `payload_classification`, `replayable`, `payload`, and `created_at`.
- Replay schemas must include redaction, gap, duplicate, next-cursor, and snapshot fallback indicators.
- Replay is a backend-filtered operation that reads PostgreSQL `event_log`; it must not read frontend state, Redis state, providers, agents, or model memory.
- Student replay must never bypass fact-ledger visibility, fact access policies, or hidden fact redaction.
- Step 15 SSE, if active, is delivery-only and must start with replay. It must not create domain truth, emit unpersisted events as truth, or bypass replay filtering.
- Event payload schemas for sessions, actions, messages, scores, debriefs, faculty review, or agents require their later gates.

## Simulation Contract Rules

- Simulation contracts in Step 8B are active only for the approved mock runtime routes.
- OpenAPI paths for simulation are limited to create session, get session, and submit action.
- `RevealedFactReferenceDto` must contain fact ids and reveal metadata only; it must not include hidden fact content, faculty notes, prompts, or frontend mock state.
- `ConversationMessageDto.used_fact_ids` may cite fact ids for future grounding checks, but message payloads must be backend-filtered by role before any frontend use.
- Risky action attempts may be represented as actions with `blocked_unsupported`, but treatment/order/diagnosis workflow contracts remain blocked.
- Simulation schemas do not authorize event payload schemas; mutation events remain generic `EventEnvelope` payloads until a later event catalog gate.
- Temporary Step 8B actor headers are actor context only and are not production auth/RBAC.

## Mock Agent Contract Rules

- Agent contracts added in Step 11 are mock-only and must use `mode: mock`.
- `AgentContext` may include student-safe summaries, revealed fact ids, student action text, communication style, and limited safety metadata only.
- Persona agent context must not contain hidden facts, hidden diagnosis, raw fact content, faculty-only notes, internal prompts, system prompts, provider secrets, or API keys.
- `AgentRunResponse` must include `agent_name`, `agent_role`, `mode`, `status`, `used_fact_ids`, `safety_flags`, `trace`, and `errors`.
- `AgentTrace` must be redacted by default and must not include provider payloads, internal prompts, secrets, hidden fact content, or faculty notes.
- Mock Safety Agent contracts do not replace the backend deterministic safety engine; backend safety remains authority.
- Imaging and Evaluator agents remain disabled placeholders and must not define imaging interpretation, scoring, rubric, faculty, or debrief behavior.
- Live provider schemas, OpenAI-specific fields, model routing schemas, tool-call schemas, handoff schemas, debrief schemas, faculty review schemas, treatment plan schemas, and imaging interpretation schemas remain blocked until later gates.

## No-Go Conditions

Stop the task and report blocked if any of these appear:

- A contract is inferred from frontend mock data.
- A student-visible schema contains hidden facts, hidden diagnosis, raw faculty-only rubric details, real patient data, or unredacted trace content.
- A runtime integration is added to contracts work outside its approved step, including OpenAI, Redis, Temporal, WebSocket, database, Prisma, SQL, Docker runtime, or SSE source-of-truth behavior.
- A clinical fact payload, product-event payload, agent, faculty, scoring, imaging, order, treatment, or debrief contract appears before its architecture gate.
- TypeScript, Python, OpenAPI, or JSON Schema versions diverge.
- Backend API imports non-canonical DTO names.

## Required Evidence For Any Contract Change

Every future contract task must update:

- `CONTRACT_INVENTORY.md`.
- `DTO_NAMING.md` when naming patterns change.
- OpenAPI or JSON Schema files for the affected route/schema.
- TypeScript DTO exports.
- Python/Pydantic schema location or version constants when relevant.
- Contract tests that prove freshness and no forbidden fields.
- `docs/implementation/IMPLEMENTATION_STATUS.md`.
- A step report under `docs/implementation/reports/`.

## Review Gate

Contract work is accepted only when:

- `npm --prefix shared/contracts run test` passes.
- Backend health-only tests pass if backend imports changed.
- Static scans show no premature clinical, event, agent, realtime, database, or frontend integration surface.
- Any skipped build/typecheck is explicitly reported with the reason.
