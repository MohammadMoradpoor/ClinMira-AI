# Step 7 - Event Log and Transactional Outbox

## 1. Executive Verdict

STEP 7 COMPLETE WITH WARNINGS

Step 7 implemented only the durable event reliability foundation: `event_log`, `outbox_events`, `idempotency_keys`, replay contract schemas, event envelope contract schema, static SQL tests, static event/replay contract tests, database documentation, contract governance/inventory updates, and implementation status updates.

No product APIs, simulation tables, backend runtime publisher, WebSocket/SSE runtime, Redis runtime, Temporal runtime, OpenAI runtime, frontend integration, agent-worker changes, package installs, Prisma schema, Docker compose file, or product behavior were added.

Warnings remain because SQL migration apply was not run against a safe PostgreSQL database, and Step 7 intentionally does not implement publisher workers, replay routes, frontend reducers, or simulation mutations.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| Product APIs added | No. |
| `/events` or `/replay` routes added | No. |
| Simulation tables added | No. |
| Backend runtime publisher added | No. |
| WebSocket/SSE added | No. |
| Redis runtime added | No. |
| Temporal added | No. |
| OpenAI added | No. |
| Frontend changed | No. |
| Agent-worker changed | No. |
| Packages installed | No. |
| Prisma/ORM schema authority added | No. |
| Docker compose runtime added | No. |
| Shared clinical DTOs added | No. |

## 3. Event Reliability Decision

PostgreSQL `event_log` is the durable event source for future replay, audit, trace correlation, and frontend recovery. Redis, WebSocket, SSE, frontend state, and model memory are not source of truth.

`outbox_events` is the post-commit publishing queue. Future mutation services must write domain state, `event_log`, and `outbox_events` in one PostgreSQL transaction before any publish attempt.

`idempotency_keys` is the duplicate-command protection foundation. Future mutating commands must reserve or reuse tenant-scoped idempotency keys before processing.

Sequence policy:

- Event sequence is per `(institution_id, stream_type, stream_id)`.
- Sequence starts at `1`.
- Database uniqueness enforces one sequence value per stream.
- Runtime sequence assignment is deferred to future command handlers.

Replay policy:

- Replay must be backend-filtered by tenant, actor role, payload classification, redaction status, and fact visibility.
- Student replay must not expose hidden/faculty-only/safety-restricted data unless backend policy allows it.
- Replay schemas are foundation-only; no replay route or runtime consumer exists yet.

## 4. Database Structure Summary

| Path | Purpose |
| --- | --- |
| `backend/database/migrations/0003_event_log_outbox_idempotency.sql` | SQL-first Step 7 migration. |
| `backend/database/tests/event_outbox_schema_static.test.mjs` | Static SQL guard for Step 7 tables, constraints, indexes, idempotency, event sequence, and outbox. |
| `backend/database/tests/event_replay_contract_guard.test.mjs` | Static guard for replay contracts, no runtime integrations, no API routes, no Prisma/compose, and no product DTO payloads. |
| `shared/contracts/events/event-envelope.schema.json` | Envelope-level event schema. |
| `shared/contracts/events/replay-request.schema.json` | Future replay request schema. |
| `shared/contracts/events/replay-response.schema.json` | Future replay response schema. |
| `shared/contracts/events/README.md` | Event/replay foundation governance. |
| `shared/contracts/tests/event-replay-foundation.test.mjs` | Shared contract test for event/replay schemas and governance. |
| `shared/contracts/CONTRACT_GOVERNANCE.md` | Updated Step 7 contract rules. |
| `shared/contracts/CONTRACT_INVENTORY.md` | Updated active event/replay foundations and blocked families. |
| `backend/database/README.md` | Updated event reliability, sequence, replay, and deferred runtime policy. |

## 5. Tables Implemented

| Table | Purpose | Tenant-scoped? | Key Constraints | Key Indexes | Notes |
| --- | --- | --- | --- | --- | --- |
| `idempotency_keys` | Duplicate-command protection foundation. | Yes | Same-tenant actor FK, non-empty key/scope/hash, status enum, JSON object response snapshot, null-safe unique lookup. | Tenant, actor, scope, status, expiry, created, lock, unique idempotency lookup. | No command handlers added. Response event FK is added after `event_log` creation. |
| `event_log` | Durable replay/audit event history. | Yes | Same-tenant actor FK, optional causation event FK, optional idempotency FK, unique `(institution_id, stream_type, stream_id, sequence)`, sequence positive, JSON object payload, payload classification enum, redaction status enum. | Tenant, stream sequence, event type, aggregate, actor, correlation, trace, created, replayable, payload classification, payload GIN. | Uses generic stream identifiers and does not depend on future product tables. |
| `outbox_events` | Transactional outbox queue for future post-commit publishing. | Yes | Same-tenant event FK, unique `(event_id, topic)`, topic/schema non-empty, JSON object payload, status enum, attempts nonnegative, publish/dead-letter status consistency. | Tenant, event, topic, status, available, published, dead-lettered, lock, attempts/created, payload GIN, pending publisher partial index. | No publisher worker or runtime fanout added. |

## 6. Replay Contract Summary

Event/replay contracts added:

- `EventEnvelope`: requires `event_id`, `institution_id`, `stream_type`, `stream_id`, `sequence`, `event_type`, `schema_version`, `payload_classification`, `replayable`, `payload`, and `created_at`.
- `ReplayRequest`: defines stream cursor replay through `stream_type`, `stream_id`, `after_sequence`, `limit`, `actor_scope`, and optional `include_non_replayable` defaulting to `false`.
- `ReplayResponse`: defines `from_sequence`, `to_sequence`, `events`, `has_more`, `redaction_applied`, and `snapshot_required`.

Contract limits:

- Event payloads are generic JSON objects, not clinical DTOs.
- No simulation event payloads are implemented.
- No frontend/realtime consumer is implemented.
- No replay API route is implemented.
- Payload classification and schema version are required.
- Runtime replay requires backend role filtering later.

## 7. Static Test Summary

| Test File | Result | What It Verifies |
| --- | --- | --- |
| `backend/database/tests/core_schema_static.test.mjs` | Pass | Step 5 schema remains constrained and seed remains safe. |
| `backend/database/tests/no_forbidden_tables.test.mjs` | Pass | Step 5 migration/seed remain free of forbidden future tables; no Prisma/compose/runtime integration. |
| `backend/database/tests/case_fact_schema_static.test.mjs` | Pass | Step 6 migration remains limited to case/fact tables. |
| `backend/database/tests/fact_visibility_guard.test.mjs` | Pass | Step 6 fact ledger remains canonical and hidden fact policy remains guarded. |
| `backend/database/tests/event_outbox_schema_static.test.mjs` | Pass | Step 7 migration creates only allowed tables and includes required idempotency, event sequence, outbox, constraints, indexes, triggers, and registry entry. |
| `backend/database/tests/event_replay_contract_guard.test.mjs` | Pass | Event/replay contract schemas exist; envelope/replay fields are required; no runtime integrations, product API routes, Prisma/compose, or product DTO payloads were added. |
| `shared/contracts/tests/event-replay-foundation.test.mjs` | Pass | Shared event/replay schemas and governance are foundation-only and non-runtime. |
| `backend/api` tests | Pass | API remains health-only. |
| `shared/contracts` tests | Pass | Health and event/replay foundation contracts pass. |

## 8. Forbidden Feature Scan

| Feature | Found? | Evidence | Result |
| --- | --- | --- | --- |
| Simulation/session/action/message/timeline tables | No | SQL scan for forbidden future table creates/inserts returned no matches. | Pass |
| Orders/imaging/scores/debrief/faculty tables | No | SQL scan for forbidden future table creates/inserts returned no matches. | Pass |
| Agent/model/tool runtime tables | No | SQL scan for forbidden future table creates/inserts returned no matches. | Pass |
| Redis/realtime runtime | No | Runtime import/new/decorator scan returned no matches. | Pass |
| WebSocket/SSE | No | Runtime import/new/decorator scan returned no matches. | Pass |
| Temporal | No | Runtime import scan returned no matches. | Pass |
| OpenAI | No | Runtime import/new-call scan returned no matches. | Pass |
| Frontend changes | No Step 7 frontend edits | Dirty frontend prototype remains from earlier work; Step 7 touched no `frontend/**` files. | Pass with warning |
| Agent-worker changes | No Step 7 worker edits | `backend/agent-worker/**` was not modified. | Pass |
| Backend API route changes | No | API route guard and backend health tests passed. | Pass |
| Prisma | No | `schema.prisma` scan returned no files. | Pass |
| Docker compose | No | Compose file scan returned no files. | Pass |
| Real patient data | No | Seed/contract scans found only guardrail/documentation mentions, not data sources. | Pass |
| Frontend mock source | No | No Step 7 contract or SQL source uses frontend mock data. | Pass |

## 9. Commands Run

| Command | Ran? | Result | Notes |
| --- | --- | --- | --- |
| `pwd` | Yes | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Yes | Warning | Dirty worktree remains from prior architecture/prototype work. |
| `git diff --stat` | Yes | Warning | Tracked diff stat omits untracked Step 7 files until added to git. |
| `git branch --show-current` | Yes | Pass | `main`. |
| `find backend/database -maxdepth 5 -type f` | Yes | Pass | Confirmed migration/tests. |
| `find shared/contracts -maxdepth 6 -type f` | Yes | Pass | Confirmed event/replay schema files. |
| `find docs/implementation -maxdepth 4 -type f` | Yes | Pass | Reports/status present. |
| `find backend/api -maxdepth 5 -type f` | Yes | Pass | API inspected; no edits. |
| `node backend/database/tests/core_schema_static.test.mjs` | Yes | Pass | 10 subtests passed. |
| `node backend/database/tests/no_forbidden_tables.test.mjs` | Yes | Pass | 6 subtests passed. |
| `node backend/database/tests/case_fact_schema_static.test.mjs` | Yes | Pass | 10 subtests passed. |
| `node backend/database/tests/fact_visibility_guard.test.mjs` | Yes | Pass | 8 subtests passed. |
| `node backend/database/tests/event_outbox_schema_static.test.mjs` | Yes | Pass | 9 subtests passed. |
| `node backend/database/tests/event_replay_contract_guard.test.mjs` | Yes | Pass | 7 subtests passed. |
| `npm --prefix backend/api run test` | Yes | Pass | 2 backend health test files passed. |
| `npm --prefix shared/contracts run test` | Yes | Pass | 2 shared contract test files passed. |
| SQL forbidden table `rg` scan | Yes | Pass | No forbidden creates/inserts in migrations or seeds. |
| Runtime integration `rg` scan | Yes | Pass | No runtime imports/new calls/decorators detected. |
| Prisma/compose file scans | Yes | Pass | No files found. |
| Seed/source safety `rg` scan | Yes | Pass with docs/test mentions | Matches were guardrail/docs/test phrases only, not real data or frontend mock sources. |
| `psql --version` | Yes | Pass | `psql (PostgreSQL) 16.14` is available. |
| Migration apply against PostgreSQL | No | Not run | No explicitly configured safe PostgreSQL database was provided. |

## 10. Limitations and Warnings

- SQL migration apply was not run against PostgreSQL because no safe test database was explicitly configured.
- No publisher worker exists yet.
- No API replay endpoint exists yet.
- No WebSocket/SSE runtime exists yet.
- No Redis integration exists yet.
- No simulation mutation writes exist yet.
- No frontend reducer/replay integration exists yet.
- Runtime role filtering and redaction enforcement are not implemented yet; Step 7 only defines schema/policy foundations.
- Crash-after-commit and replay-gap integration tests remain future work because no mutation runtime or publisher exists in Step 7.
- The repository remains dirty from earlier architecture/prototype work; Step 7 only changed allowed database, shared contract, and implementation documentation paths.

## 11. Step 8 Readiness

Step 8 can start with warnings after the mandatory post-task architecture review.

Exact next implementation scope after review:

- Mock Simulation Session Engine.
- Create session.
- Submit action.
- Mock patient response.
- Persist action/message/timeline through backend-owned state.
- Use `fact_ledger`.
- Write durable events through `event_log`/`outbox_events`.
- No live OpenAI.

Still blocked:

- Realtime until event log/outbox/replay and reducer tests pass.
- Frontend integration until typed contracts/replay/safety gates pass.
- Live agents until contracts, database truth, fact ledger, event log/outbox, mock simulation, eval harness, and deterministic safety gates pass.
- Debrief, faculty workflow, pilot, Redis runtime, WebSocket/SSE runtime, and voice remain blocked by their named gates.
