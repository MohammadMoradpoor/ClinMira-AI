# Step 15R - Realtime Gateway with Replay Architecture Review

## 1. Executive Verdict

STEP 15 REVIEW PASSED WITH WARNINGS

Step 15 is accepted as a backend replay/SSE foundation. The implementation stayed within the approved replay-first scope: PostgreSQL `event_log` is the replay source, `outbox_events` remains the durable queue, replay is backend-filtered, SSE is delivery-only, and no frontend integration, live OpenAI, live agents, provider runtime, Redis, WebSocket gateway, Temporal, production auth/RBAC, production publisher, clinical workflow expansion, package change, migration, Prisma, or Docker compose runtime was added.

No blocking correction is required before the next gated evidence step. Warnings remain because DB-backed replay/eval evidence was skipped without `CLINMIRA_TEST_DATABASE_URL`, shared contracts typecheck is still blocked by missing `tsc`, temporary actor headers are not production auth/RBAC, the production outbox publisher is absent, SSE is not production realtime readiness, and frontend integration remains blocked.

## 2. Scope Review

| Scope Item | Review Result | Evidence |
| --- | --- | --- |
| Live OpenAI | Pass | Source/package scans found no OpenAI SDK, imports, calls, or Responses/Chat Completions calls. |
| OpenAI SDK | Pass | Package dependency scan found no OpenAI or Agents SDK dependency entries. |
| API key reads | Pass | Source scans found no OpenAI API key, provider secret, or tool secret reads. |
| Live agents | Pass | Agent-worker remains mock/fake-only; Step 15 made no worker runtime changes. |
| Provider runtime | Pass | Replay/SSE code does not read provider or fake-provider state. |
| Frontend integration | Pass | No frontend edits and no backend/shared runtime imports from frontend mock/localStorage paths. |
| Redis | Pass | No Redis/ioredis runtime usage in backend API or worker source. |
| WebSocket gateway | Pass | No `@nestjs/websockets`, `WebSocketGateway`, `ws`, or socket runtime path. |
| Redis/WebSocket/SSE source of truth | Pass | SSE emits replay-filtered frames only; PostgreSQL remains authoritative. |
| Temporal | Pass | No Temporal imports/runtime usage. |
| Production auth/RBAC | Pass with warning | Temporary Step 8B headers are validated as UUID actor context only and remain non-production. |
| Production publisher | Pass with warning | No publisher loop was added; `outbox_events` remains a durable queue only. |
| Debrief/faculty/treatment/imaging workflows | Pass | No workflow expansion or clinical business logic was added. |
| Database migrations | Pass | Step 15 added no migration files. |
| Package changes | Pass | No package or lockfile drift was introduced by Step 15. |

## 3. Source-of-Truth Review

PostgreSQL `event_log` is the only replay source used by the Step 15 backend. `ReplayRepository.loadReplayableSessionEvents()` reads `event_log` filtered by `institution_id`, `simulation_session` stream or aggregate id, `replayable = true`, and `sequence > after_sequence`, ordered by durable sequence.

`outbox_events` remains the durable post-commit publishing queue from Step 7/8B/10. Step 15 did not implement a publisher worker and did not substitute SSE, Redis, WebSocket, frontend state, localStorage, agent-worker state, provider state, or model memory as source of truth.

SSE is a delivery wrapper over filtered replay frames plus a safe completion control frame. It cannot create domain truth, cannot publish new domain events, and cannot bypass replay redaction.

## 4. Replay Route Review

| Area | Result | Evidence | Remaining Risk |
| --- | --- | --- | --- |
| Route shape | Pass | `GET /api/v1/simulation-sessions/:sessionId/replay` is registered under the simulation sessions controller. | No blocking risk. |
| `sessionId` validation | Pass | Controller/service require UUID format and fail closed with replay-specific errors. | No blocking risk. |
| Cursor validation | Pass | `after_sequence` defaults to `0`, must be a single integer, and cannot be negative. | No blocking risk. |
| Limit validation | Pass | `limit` defaults to `100`, caps at `500`, and rejects arrays/non-integers/out-of-range values. | No blocking risk. |
| Audience validation | Pass | `audience` defaults to `student` and accepts only `student`, `faculty`, or `system`. | Real RBAC still absent; audience modes are not production authorization. |
| Tenant scoping | Pass | User and session queries require matching `institution_id`. | Cross-tenant DB-backed integration evidence remains future work. |
| Actor/session scoping | Pass | Actor user must exist, session must match `student_user_id`, and deleted sessions are excluded. | Faculty/system audience is still constrained through the same temporary student actor path. |
| Replay filtering | Pass | Query reads only `replayable = true` session events after the cursor. | Event payload catalog remains generic; future event-type allowlists need a later gate. |
| Sequence ordering | Pass | `ORDER BY sequence ASC, created_at ASC, id ASC`. | No blocking risk. |
| Response shape | Pass | Includes schema version, session id, audience, sequence range, `has_more`, events, gap/duplicate metadata, next cursor, redaction, and snapshot flag. | OpenAPI for replay/SSE is not implemented yet; JSON schema and runtime DTOs are active. |
| Error handling | Pass | Bad request and not-found errors convert to HTTP exceptions. | Production auth errors remain future work. |

## 5. Redaction and Audience Filtering Review

| Audience | Result | Evidence | Risk |
| --- | --- | --- | --- |
| `student` | Pass | Allows only `public`, `student_safe`, and safety blocked/warning events converted to student-safe payloads; hidden/faculty/internal/audit classifications are filtered out. | Source sequences may advance across filtered events, so a frontend reducer must use `next_cursor`, not visible event count. |
| `faculty` | Pass with warning | Allows `public`, `student_safe`, `faculty_only`, and `safety_restricted`; restricted classifications return metadata-only payloads and still sanitize forbidden keys/text. | Real faculty RBAC is absent, so this is a redaction contract path, not production authorization. |
| `system` | Pass with warning | Allows classification metadata for all defined classifications, but restricted/internal/audit payloads are metadata-only unless public/student-safe and secrets/prompts/raw fact content are removed. | System audience must remain backend/admin-only once real auth/RBAC exists. |

Student replay does not receive hidden facts, hidden diagnosis, raw restricted `fact_ledger` content, faculty-only payloads, safety-only/evaluator-only/internal/audit payloads, faculty notes, rubrics, scoring/debrief targets, system/internal prompts, provider traces, agent traces, API keys, provider secrets, tool secrets, real patient data, or frontend mock data.

Revealed facts are reduced to references only: fact id, reveal rule id, action id, reveal target, reveal reason, and creation timestamp. Restricted or malformed classifications fail closed by omission or metadata-only behavior.

## 6. SSE Delivery Review

Step 15 SSE passes as delivery-only foundation.

`RealtimeService.replayFirstStreamMessages()` calls `ReplayService.replaySession()` first, converts replay events into `replay_event` frames with `delivery_only: true`, and emits a final `replay_complete` frame with replay schema version, next cursor, `has_more`, `gap_detected`, and `duplicate_count`.

The SSE path does not poll indefinitely, create a background job, publish outbox events, write domain state, use Redis, use WebSocket, call providers/agents, import frontend state, or emit unpersisted domain truth. It is not production realtime readiness and does not unblock frontend integration.

Remaining SSE limitations:

- No production publisher loop.
- No frontend reducer or replay client.
- No heartbeat/backpressure/presence metrics.
- No production auth/RBAC stream authorization.
- No Redis/WebSocket fanout.
- No DB-backed reconnect integration evidence.

## 7. Sequence / Gap / Duplicate Review

| Item | Result | Evidence |
| --- | --- | --- |
| Cursor validation | Pass | `after_sequence` is parsed as a single non-negative integer and defaults to `0`. |
| `next_cursor` | Pass | Advances to the maximum durable source sequence in the returned source page, or the input cursor if no rows exist. |
| `duplicate_count` | Pass | Counts duplicated sequence values in the source page. |
| `gap_detected` | Pass | Detects non-contiguous source sequences after the cursor. |
| `snapshot_required` | Pass | Mirrors `gap_detected` so future clients know when snapshot reload is required. |
| Reconnect replay | Pass with warning | Callers can resume from last durable cursor; DB-backed reconnect testing remains skipped. |
| Idempotent replay | Pass | Replay reads persisted events only and has no mutation path. |

Review note: gap detection is based on source replay rows, not the final visible event list after audience filtering. This is acceptable for source integrity and cursor recovery, but future frontend reducers must treat missing visible sequence numbers as filtered/omitted until the backend reports `gap_detected: true` or `snapshot_required: true`.

## 8. Contract Review

Step 15 contract governance passes with warnings.

Active Step 15 contracts:

- `shared/contracts/events/replay-request.schema.json`
- `shared/contracts/events/replay-response.schema.json`
- `shared/contracts/events/replay-event.schema.json`
- `shared/contracts/events/replay-cursor.schema.json`
- `shared/contracts/events/realtime-stream.schema.json`
- `shared/contracts/CONTRACT_GOVERNANCE.md`
- `shared/contracts/CONTRACT_INVENTORY.md`

Contract tests confirm replay response fields, event classification/redaction fields, delivery-only SSE frames, and omission of hidden fact/provider/runtime concepts. Governance states that replay is backend-filtered, PostgreSQL-backed, and does not authorize Redis/WebSocket/SSE as source of truth, frontend integration, live agents, provider runtime, Temporal workflows, production publisher workers, treatment/order/imaging workflows, debrief, faculty workflow, or production auth/RBAC.

Warnings:

- Replay/SSE routes are not yet represented in OpenAPI.
- Event payload schemas remain generic objects; clinical event payload catalogs require later gates.
- Shared contracts TypeScript typecheck remains blocked because `tsc` is unavailable in `shared/contracts`.

## 9. Test Evidence Review

| Command | Result | Notes |
| --- | --- | --- |
| `git branch --show-current` | Pass | Current branch is `main`. |
| `git status --short` | Warning | Dirty repository remains from prior staged/untracked architecture, backend, frontend, shared, and report work. |
| `git diff --stat` | Warning | Tracked diffs are docs/status/backlog/playbook/README oriented; untracked Step files remain outside tracked stat. |
| `npm --prefix backend/api run test` | Pass | 8 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Pass | Backend API TypeScript typecheck passed. |
| `npm --prefix backend/api run build` | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Pass | 5 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Blocked | `tsc` not found; no package install authorized. |
| `node --test backend/database/tests/*.test.mjs` | Pass | 11 database/static test files passed. |
| `node --test backend/evals/tests/*.test.mjs` | Pass | 7 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Pass with warning | Status `PASSED`; DB eval skipped because `CLINMIRA_TEST_DATABASE_URL` is not configured. |
| `python3 -m unittest discover -s tests` in `backend/agent-worker` | Pass | 57 worker tests passed. |
| OpenAI/API-key scan | Pass | No OpenAI imports/calls/API-key/provider-secret/tool-secret reads in scoped source. |
| Package dependency scan | Pass | No OpenAI/Agents SDK dependency entries found in scoped package files. |
| Redis/WebSocket/Temporal scan | Pass | No Redis, WebSocket gateway, or Temporal runtime in backend API or worker source. |
| Frontend mock source scan | Pass | No frontend/localStorage/mock source usage in scoped backend/worker/eval/shared areas outside tests. |
| Worker direct DB mutation scan | Pass | No worker DB clients, SQL mutation, `event_log`, or `outbox_events` writes. |
| Prisma/docker compose scan | Pass | No `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml` found. |

## 10. Remaining Warnings

- Shared contracts typecheck remains blocked because `tsc` is not installed in `shared/contracts`.
- DB-backed replay/eval integration remains skipped because `CLINMIRA_TEST_DATABASE_URL` is absent.
- Production auth/RBAC is not implemented; temporary actor headers are not authorization.
- Production outbox publisher is not implemented.
- Frontend integration is not implemented.
- Frontend reducer/replay client is not implemented.
- SSE is delivery-only and not production realtime readiness.
- Redis/WebSocket fanout remains blocked.
- Temporal remains blocked.
- Live OpenAI remains blocked.
- Live agents and provider runtime remain blocked.
- Debrief, faculty workflow, treatment/order/imaging workflows remain blocked.
- Event payload catalogs and OpenAPI replay/SSE surfacing remain future contract work.
- Dirty repository state remains from prior staged/untracked work.

## 11. Next Step Recommendation

Recommended next step: Step 16 - DB-backed Replay and Safety Integration Evidence.

Rationale: Step 15 passes review, but production confidence is still weak because DB-backed replay, reconnect, safety block replay, idempotency, event/outbox, tenant/session scoping, and gap/duplicate behavior have not been exercised against a safe migrated PostgreSQL test database.

Exact recommended next prompt:

```text
Use docs/implementation/reports/STEP_15R_REALTIME_GATEWAY_ARCHITECTURE_REVIEW_REPORT.md, docs/implementation/IMPLEMENTATION_STATUS.md, docs/implementation/IMPLEMENTATION_PLAYBOOK.md, docs/implementation/NO_GO_RULES.md, docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md, docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md, docs/architecture/10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md, and docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md.

Implement Step 16 only as DB-backed Replay and Safety Integration Evidence. Use a safe CLINMIRA_TEST_DATABASE_URL if available, verify migrations 0001 through 0005, seed only synthetic data, run create-session/action/safety/replay/reconnect/idempotency/event-log/outbox integration evidence, and produce a report/status update.

Do not add frontend integration, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, package installs, migrations, env files, or Docker compose runtime.
```

Do not recommend frontend integration, live OpenAI, Temporal, production realtime fanout, production publisher, or live agents yet.

## 12. Final Validation

| Validation | Result |
| --- | --- |
| Step 15R report exists | Pass. |
| `IMPLEMENTATION_STATUS.md` updated | Pass. |
| Runtime code changed by Step 15R | No. |
| Frontend files changed by Step 15R | No. |
| Backend API runtime changed by Step 15R | No. |
| Database migrations changed by Step 15R | No. |
| Agent-worker/provider runtime changed by Step 15R | No. |
| OpenAI SDK/import/call added | No. |
| API key read added | No. |
| Redis/WebSocket/Temporal added | No. |
| Production publisher added | No. |
| Frontend integration added | No. |
| Tests/checks reported honestly | Yes. |
| Next step avoids frontend/live OpenAI/live agents/production realtime | Yes. |
