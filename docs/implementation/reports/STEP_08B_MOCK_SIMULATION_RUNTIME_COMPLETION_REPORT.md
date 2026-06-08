# Step 8B - Mock Simulation Runtime Completion

## 1. Executive Verdict

STEP 8 RUNTIME COMPLETE WITH WARNINGS

Step 8B completes the previously blocked runtime portion of Step 8. The NestJS API/BFF now has an approved raw PostgreSQL client, lazy database pool setup, explicit transaction wrapper, repository/service/controller boundary, and only the three approved mock simulation runtime endpoints.

Warnings remain because PostgreSQL integration tests were skipped without `CLINMIRA_TEST_DATABASE_URL`, production auth/RBAC is not implemented, the outbox publisher is not implemented, realtime is not implemented, and Step 9 eval harness has not started.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| Step 9 eval harness added | No. |
| Live OpenAI added | No. |
| Agent runtime added | No. |
| Redis/realtime added | No. |
| Temporal added | No. |
| Frontend changed | No Step 8B frontend edits. Pre-existing frontend prototype remains dirty/prototype-only. |
| Agent-worker changed | No Step 8B agent-worker edits. Pre-existing worker skeleton remains deferred. |
| Debrief/faculty/scoring added | No. |
| Imaging/order workflow added | No. Risky attempts are recorded as blocked unsupported only. |
| Treatment advice added | No. |
| Prisma/ORM schema authority added | No. |
| Docker compose runtime added | No. |

## 3. Runtime Persistence Decision

| Decision | Result |
| --- | --- |
| DB client selected | Raw `pg` package in `backend/api` runtime dependencies. |
| Type package | `@types/pg` in `backend/api` dev dependencies. |
| Transaction wrapper | `DatabaseService.withTransaction()` performs `BEGIN`, `COMMIT`, rollback on error, and client release. |
| Repository boundary | `SimulationRepository` owns SQL and persistence; `SimulationService` validates requests and computes idempotency hashes. |
| Institution filtering | All session/action/fact/event queries filter by `institution_id`; session access is also constrained to `student_user_id`. |
| Actor context | Temporary required headers `x-clinmira-institution-id` and `x-clinmira-user-id`; both must be UUIDs and are not production auth. |
| Idempotency strategy | Optional action `idempotency_key` reserves `idempotency_keys`, compares SHA-256 request hash, returns completed response snapshots for duplicates, and conflicts on key/hash mismatch. |
| Event/outbox strategy | Mutations write domain rows, `event_log`, and `outbox_events` in the same PostgreSQL transaction. |
| ORM/schema sync | None. SQL migrations remain the schema authority. |
| Missing DB URL behavior | Health can still run; simulation endpoints fail closed with a database configuration error if `CLINMIRA_DATABASE_URL` is absent. |

## 4. API Endpoints Implemented

Only these approved endpoints were implemented:

| Method | Path | Scope |
| --- | --- | --- |
| `POST` | `/api/v1/simulation-sessions` | Create backend-owned mock simulation session. |
| `GET` | `/api/v1/simulation-sessions/:id` | Return student-safe persisted session aggregate. |
| `POST` | `/api/v1/simulation-sessions/:id/actions` | Persist a deterministic mock action/response turn. |

No replay, event, WebSocket, SSE, agent, debrief, faculty, order, imaging, treatment, or frontend integration endpoints were added.

## 5. Mock Simulation Behavior

| Behavior | Implementation |
| --- | --- |
| Create session | Validates actor and case version, requires a patient twin, creates `simulation_sessions`, baseline reveal references, timeline entry, state snapshot, `event_log`, and `outbox_events`. |
| Get session | Loads a tenant/student-scoped session and returns student-safe messages, timeline, reveal references, and latest snapshot. |
| Submit action | Locks the session row, handles optional idempotency, writes action/message/timeline/state/event/outbox rows, and returns `SimulationTurnResultDto`. |
| Allergy reveal | A hidden allergy may be revealed only through active `ask_directly` reveal rule logic and stored as a reference in `session_revealed_facts`. |
| Prompt injection denial | Inputs such as ignore-instructions/system-prompt/faculty-note bypass attempts receive safe patient-style refusal text and reveal no facts. |
| Diagnosis denial | Direct diagnosis requests do not reveal diagnosis facts and return neutral patient-style uncertainty. |
| Risky action blocking | `order_attempt`, `diagnosis_attempt`, and `treatment_attempt` are marked `blocked_unsupported`; no order, diagnosis, treatment, imaging, or safety workflow is executed. |

## 6. Hidden Fact Protection

`fact_ledger` remains the canonical fact source. The runtime reads only baseline-visible facts, facts already revealed to `student_payload`, or a newly eligible allergy fact permitted by an active `ask_directly` rule.

`session_revealed_facts` stores references only: `fact_id`, `reveal_rule_id`, `revealed_by_action_id`, target scope, reason, and timestamps. It does not duplicate `fact_ledger.content`, faculty notes, internal prompts, hidden diagnosis content, or frontend mock state.

Student-facing DTOs expose fact references through `used_fact_ids` and `revealed_facts`, not hidden fact payload rows. The runtime does not import `frontend/lib/mock-data.ts`, `frontend/lib/simulation-engine.ts`, `frontend/types.ts`, or any frontend source.

## 7. Event/Outbox Usage

| Mutation | Event/Outbox Behavior |
| --- | --- |
| Create session | Writes `simulation.session.created` to `event_log` and a matching pending `outbox_events` row. |
| Submit action | Writes `student.action.submitted`, `mock_patient.response.created` or `unsupported_action.blocked`, optional `fact.revealed`, and `session.state.snapshotted`. |
| Idempotent actions | Completed idempotency rows store the response snapshot and response event reference. |

The outbox publisher is still not implemented. Replay API is still not implemented. Redis, WebSocket, SSE, and realtime fanout remain blocked and are not used as source of truth.

## 8. Contracts/OpenAPI

Simulation contracts were finalized for Step 8B runtime use:

- `CreateSimulationSessionRequestDto`
- `SimulationSessionDto`
- `SubmitSimulationActionRequestDto`
- `SimulationTurnResultDto`
- `ClinicalActionDto`
- `ConversationMessageDto`
- `TimelineEventDto`
- `SessionStateSnapshotDto`
- `RevealedFactReferenceDto`

OpenAPI now includes health endpoints plus only the three approved Step 8B simulation endpoints. Simulation DTOs are student-safe by default and do not include hidden fact content fields, faculty-only notes, internal prompts, raw outbox/event internals, or frontend mock state.

## 9. Tests and Checks

| Command | Ran? | Result | Notes |
| --- | --- | --- | --- |
| `pwd` | Yes | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Yes | Warning | Dirty repo remains from prior architecture/prototype work. |
| `git diff --stat` | Yes | Warning | Tracked diff stat omits untracked Step 8B files until added to git. |
| `git branch --show-current` | Yes | Pass | `main`. |
| `cat backend/api/package.json` | Yes | Pass | Direct dependency change limited to `pg`; dev dependency `@types/pg`. |
| `find backend/api -maxdepth 8 -type f` | Yes | Warning | Command ran; output includes `node_modules` and `dist` generated by approved install/build. |
| `find backend/database -maxdepth 6 -type f` | Yes | Pass | Confirmed migrations/tests. |
| `find shared/contracts -maxdepth 8 -type f` | Yes | Pass | Confirmed simulation/event/OpenAPI/contracts. |
| `node backend/database/tests/core_schema_static.test.mjs` | Yes | Pass | 10 tests passed. |
| `node backend/database/tests/no_forbidden_tables.test.mjs` | Yes | Pass | 6 tests passed. |
| `node backend/database/tests/case_fact_schema_static.test.mjs` | Yes | Pass | 10 tests passed. |
| `node backend/database/tests/fact_visibility_guard.test.mjs` | Yes | Pass | 8 tests passed. |
| `node backend/database/tests/event_outbox_schema_static.test.mjs` | Yes | Pass | 9 tests passed. |
| `node backend/database/tests/event_replay_contract_guard.test.mjs` | Yes | Pass | 7 tests passed after updating stale Step 7 expectations for Step 8B endpoints. |
| `node backend/database/tests/mock_simulation_schema_static.test.mjs` | Yes | Pass | 11 tests passed. |
| `node backend/database/tests/mock_simulation_fact_guard.test.mjs` | Yes | Pass | 7 tests passed. |
| `node --test backend/database/tests/*.test.mjs` | Yes | Pass | 8 database test files passed. |
| `npm --prefix shared/contracts run test` | Yes | Pass | 3 contract test files passed. |
| `npm --prefix backend/api run test` | Yes | Pass | 4 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Yes | Pass | Backend API TypeScript check passed. |
| `npm --prefix backend/api run build` | Yes | Pass | Nest build passed. |
| `npm --prefix shared/contracts run typecheck` | Yes | Blocked | `tsc` not found because shared contract dependencies were not installed and package approval was limited to backend API `pg`/`@types/pg`. |
| Forbidden runtime import scan | Yes | Pass | No OpenAI/Redis/Temporal/WebSocket/SSE/Prisma imports in Step 8B source areas. |
| Frontend mock import scan | Yes | Pass | No backend/database/shared imports from frontend mock sources. |
| Prisma schema scan | Yes | Pass | No `schema.prisma` found. |
| Docker compose scan | Yes | Pass | No `docker-compose.yml` or `docker-compose.yaml` found. |
| Direct dependency scan | Yes | Pass | No blocked direct backend API dependencies found. |
| Frontend/agent-worker diff scan | Yes | Pass with warning | No tracked Step 8B diff under these paths; pre-existing prototype/worker dirty state remains. |

## 10. Integration Test Status

`CLINMIRA_TEST_DATABASE_URL` was not configured in this shell.

Migrations `0001` through `0004` were not applied to a live test database during Step 8B. Create-session integration, allergy reveal integration, prompt-injection no-leak integration, and idempotency duplicate integration tests were skipped honestly rather than faked.

The backend API runtime test includes an optional integration subtest that is skipped unless `CLINMIRA_TEST_DATABASE_URL` is present.

## 11. Remaining Warnings

- No Step 9 eval harness yet.
- No deterministic safety engine yet.
- No live agents.
- No realtime runtime.
- No frontend integration.
- No outbox publisher worker.
- No replay API.
- No production auth/RBAC; Step 8B uses temporary UUID actor headers only.
- No production migration apply evidence because no safe PostgreSQL test database was configured.
- Shared contract typecheck remains blocked until a separate approved dependency install/setup step.
- Existing frontend prototype still contains mock state and remains non-authoritative.

## 12. Step 9 Readiness

Step 9 can start with warnings.

Exact next scope: Initial Eval Harness.

Step 9 must remain limited to golden cases, hidden fact leakage tests, unsupported claim tests, safety fixtures, fixture storage, eval metadata, and release-blocking eval smoke tests. Step 9 must not add live OpenAI, live agents, realtime, frontend integration, debrief generation, faculty workflow, treatment advice, Redis, WebSocket/SSE, Temporal, or production publisher behavior.
