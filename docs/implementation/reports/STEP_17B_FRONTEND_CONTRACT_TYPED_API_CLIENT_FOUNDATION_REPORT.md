# Step 17B - Frontend Contract Inventory and Typed API Client Foundation

## 1. Executive Verdict

STEP 17B COMPLETE WITH WARNINGS

Step 17B added a frontend-local typed API boundary for the approved health and Step 8B simulation HTTP routes only. It includes route inventory, local DTO/type definitions mapped to shared contract names and versions, response validators, normalized errors, temporary non-production actor headers, idempotency key generation, session API wrappers, and guard tests.

Warnings remain because broad frontend integration is still blocked, replay/SSE are future-only in the frontend, frontend package scripts do not include `test` or `typecheck`, the frontend production build hit a Turbopack sandbox process/port restriction and could not be rerun with escalation due the approval usage limit, shared contract typecheck is still blocked by missing `tsc`, and DB-backed evals were skipped because `.env.local` was not sourced for the eval runner.

## 2. Evidence Reviewed

- `docs/implementation/IMPLEMENTATION_STATUS.md`
- `docs/implementation/IMPLEMENTATION_BACKLOG.md`
- `docs/implementation/IMPLEMENTATION_PLAYBOOK.md`
- `docs/implementation/NO_GO_RULES.md`
- `docs/implementation/reports/STEP_17A_BACKEND_FRONTEND_CONTRACT_INTEGRATION_PLANNING_REPORT.md`
- `docs/architecture/03_FRONTEND_REQUIRED_UPDATES.md`
- `docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md`
- `docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md`
- `docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md`
- `shared/contracts/CONTRACT_GOVERNANCE.md`
- `shared/contracts/CONTRACT_INVENTORY.md`
- `shared/contracts/openapi/clinmira-api.v1.json`
- `shared/contracts/simulation/*.schema.json`
- `frontend/package.json`
- `frontend/tsconfig.json`

## 3. Files Changed

- `frontend/lib/api/actor-context.ts`
- `frontend/lib/api/client.ts`
- `frontend/lib/api/contract-inventory.ts`
- `frontend/lib/api/contracts.ts`
- `frontend/lib/api/errors.ts`
- `frontend/lib/api/idempotency.ts`
- `frontend/lib/api/typed-api-client.test.mjs`
- `frontend/lib/simulation/session-api.ts`
- `docs/implementation/reports/STEP_17B_FRONTEND_CONTRACT_TYPED_API_CLIENT_FOUNDATION_REPORT.md`
- `docs/implementation/IMPLEMENTATION_STATUS.md`
- `docs/implementation/IMPLEMENTATION_BACKLOG.md`

No frontend route files, UI components, frontend mock-data files, backend source files, shared contract files, migrations, seeds, package files, env files, Docker Compose files, Prisma files, or agent runtime files were intentionally modified by Step 17B.

## 4. Approved Route Inventory Implemented

Step 17B approved routes:

| Method | Path | Response Contract | Notes |
| --- | --- | --- | --- |
| `GET` | `/health` | `HealthCheckResponseDto` | Health-only. |
| `GET` | `/api/v1/health` | `HealthCheckResponseDto` | Versioned health-only. |
| `POST` | `/api/v1/simulation-sessions` | `SimulationSessionDto` | Temporary actor headers and idempotency key required by frontend wrapper. |
| `GET` | `/api/v1/simulation-sessions/{id}` | `SimulationSessionDto` | Student-safe session projection only. |
| `POST` | `/api/v1/simulation-sessions/{id}/actions` | `SimulationTurnResultDto` | Temporary actor headers and idempotency key required by frontend wrapper. |

Future-only blocked routes:

| Method | Path | Status |
| --- | --- | --- |
| `GET` | `/api/v1/simulation-sessions/{sessionId}/replay` | Future-only; no frontend wrapper. |
| `GET` | `/api/v1/simulation-sessions/{sessionId}/events/stream` | Future-only; no `EventSource` or SSE client. |

## 5. Contract Source Mapping

| Frontend Type | Source |
| --- | --- |
| `HealthCheckResponseDto` | `shared/contracts/openapi/clinmira-api.v1.json`, `HealthCheckResponseDto`, `health-check-response.v1`. |
| `FeatureFlagSnapshotDto` | `shared/contracts/openapi/clinmira-api.v1.json`, `FeatureFlagSnapshotDto`, `feature-flag-snapshot.v1`. |
| `CreateSimulationSessionRequestDto` | OpenAPI and `shared/contracts/simulation/create-simulation-session-request.schema.json`. |
| `SimulationSessionDto` | OpenAPI and `shared/contracts/simulation/simulation-session.schema.json`. |
| `SubmitSimulationActionRequestDto` | OpenAPI and `shared/contracts/simulation/submit-simulation-action-request.schema.json`. |
| `SimulationTurnResultDto` | OpenAPI and `shared/contracts/simulation/simulation-turn-result.schema.json`. |
| `ClinicalActionDto` | OpenAPI and `shared/contracts/simulation/clinical-action.schema.json`. |
| `ConversationMessageDto` | OpenAPI and `shared/contracts/simulation/conversation-message.schema.json`. |
| `TimelineEventDto` | OpenAPI and `shared/contracts/simulation/timeline-event.schema.json`. |
| `SessionStateSnapshotDto` | OpenAPI and `shared/contracts/simulation/session-state-snapshot.schema.json`. |
| `RevealedFactReferenceDto` | OpenAPI and `shared/contracts/simulation/revealed-fact-reference.schema.json`. |

No frontend DTO imports from `backend/api/src/**` were added.

## 6. Contract Gaps and Limitations

- Replay and SSE are not represented as frontend-ready OpenAPI paths in Step 17B. They remain future-only inventory entries.
- Step 17B uses frontend-local TypeScript definitions derived from shared contract names and versions. It does not generate types or modify shared contracts.
- Temporary actor headers are not production auth or RBAC.
- The frontend boundary validates student-safe projections, but the backend remains source of truth for tenant scoping, fact ledger, event log, outbox, replay, safety, and persistence.
- No route UI wiring, reducer state machine, reconnect behavior, Playwright route flow, or SSE consumer exists in this step.

## 7. Typed API Client Implementation Summary

`frontend/lib/api/client.ts` implements a fetch-based `ClinMiraApiClient` with:

- Configurable `baseUrl`, defaulting to same-origin paths.
- Injected `fetchImpl` for tests.
- Route-template allowlist enforcement using Step 17B inventory.
- Safe JSON parsing for empty or malformed responses.
- Contract version checking.
- Runtime response validators.
- HTTP, network, timeout, shape, and contract-version error normalization.

It does not include backend DTO imports, env secret reads, OpenAI, Redis, WebSocket, `EventSource`, Temporal, provider runtime, localStorage, or frontend mock-data access.

## 8. Frontend-Local DTO/Type Boundary Summary

`frontend/lib/api/contracts.ts` defines only Step 17B-approved DTOs and contract constants. Runtime validators reject:

- Unknown health contract versions.
- Non-false feature flag values.
- Non-student-safe conversation visibility in student-facing payloads.
- Non-`student_payload` fact reveal references.
- Unsupported enum drift for action status, action type, message status, timeline event type, and session status.
- Prototype-only hidden/faculty/debrief/imaging/scoring fields inside response payloads.

## 9. Normalized Error Handling Summary

`frontend/lib/api/errors.ts` maps:

- Network errors to `backend_unavailable`.
- Abort/timeout to `timeout`.
- Actor/header 400s to `missing_actor_context`.
- 400s to `bad_request`.
- 401 to `unauthorized`.
- 403 to `forbidden`.
- 404 to `not_found`.
- 409 to `idempotency_conflict`.
- Safety/unsafe/blocked-unsupported markers to `safety_block`.
- Bad response validation to `unknown_response_shape`.
- Unexpected contract versions to `unknown_contract_version`.

## 10. Temporary Actor Context Helper Summary

`frontend/lib/api/actor-context.ts` centralizes temporary Step 17B actor headers:

- `x-clinmira-institution-id`
- `x-clinmira-user-id`

The helper validates strict canonical UUIDs and clearly labels these headers as non-production actor context only. It does not implement auth, RBAC, localStorage sourcing, mock user sourcing, session persistence, or env-based secret reads.

## 11. Idempotency Helper Summary

`frontend/lib/api/idempotency.ts` uses `crypto.randomUUID()` when available and falls back to `crypto.getRandomValues()` UUID v4 generation. It rejects short or missing explicit keys for mutating actions and exposes an `ensureClinMiraIdempotencyKey()` helper used by session wrappers.

No timestamp-only or package-based idempotency generator was added.

## 12. Session API Wrapper Summary

`frontend/lib/simulation/session-api.ts` exposes:

- `getHealth()`
- `getVersionedHealth()`
- `createSimulationSession()`
- `getSimulationSession()`
- `submitSimulationAction()`

The wrappers validate UUID path/body identifiers, attach temporary actor headers for simulation calls, add contract versions, generate idempotency keys for mutating calls, validate responses, and reject structured prototype-only hidden/faculty/debrief/imaging/scoring payload keys before submission.

No replay wrapper, SSE wrapper, reducer, local fallback, mock-data import, localStorage path, or UI route wiring was added.

## 13. Guard Test Coverage

`frontend/lib/api/typed-api-client.test.mjs` covers:

- Approved route inventory exactness.
- Replay/SSE future-only inventory status.
- No backend source imports.
- No frontend mock-data/simulation-engine/simulation-storage imports.
- No localStorage truth path.
- No OpenAI, Redis, WebSocket, `EventSource`, or Temporal runtime usage.
- DTO hidden/faculty/debrief/imaging/scoring field exclusion.
- Hidden/prototype payload rejection.
- Student-safe response projection validation.
- Non-production actor context labeling and strict UUID validation.
- Idempotency generation/requirement.
- Normalized error mapping.
- Client rejection of future/unapproved routes before fetch.
- Session wrapper route/body/header/idempotency behavior.

## 14. Forbidden Implementation Scan Results

| Scan | Result |
| --- | --- |
| Runtime forbidden import/transport scan over client/contracts/errors/idempotency/actor/session wrapper | Pass; no matches. |
| Replay/SSE scan | Expected future-only matches only in `contract-inventory.ts`; no runtime wrapper/client matches. |
| Hidden/prototype field scan | Matches are defensive denylist/test fixtures and `evaluator_debrief` health feature flag only; no DTO property declarations. |
| Prisma/Compose scan | Pass; no `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml` found. |
| Frontend route/component/mock status | Existing prototype files remain pre-existing dirty work; Step 17B did not edit UI route/component/mock source files. |

## 15. Commands Run and Results

| Command | Result | Notes |
| --- | --- | --- |
| `node --test frontend/lib/api/typed-api-client.test.mjs` | Pass | Step 17B frontend-local guard suite passed. |
| `frontend/node_modules/.bin/tsc --noEmit --project frontend/tsconfig.json` | Pass | Direct frontend TypeScript check passed without package changes. |
| `npm --prefix frontend run lint` | Pass | ESLint passed. |
| `npm --prefix backend/api run test` | Pass | 9 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Pass | Backend API typecheck passed. |
| `npm --prefix backend/api run build` | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Pass | 5 shared contract tests passed. |
| `node --test backend/database/tests/*.test.mjs` | Pass | 11 database static tests passed. |
| `node --test backend/evals/tests/*.test.mjs` | Pass | 7 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Pass with warning | Status `PASSED`, threshold failures `0`, skipped `1`; DB evals skipped because `CLINMIRA_TEST_DATABASE_URL` was not configured in this shell. Generated latest-result diff was restored to avoid backend artifact changes in Step 17B. |
| `python3 -m unittest discover -s tests` in `backend/agent-worker` | Pass | 57 worker tests passed. |
| Runtime forbidden implementation scan | Pass | No forbidden runtime matches. |
| Replay/SSE inventory scan | Pass with expected inventory matches | Future-only inventory documents replay/SSE blocked state. |
| Hidden/prototype field scan | Pass with expected denylist/test matches | Defensive guards only; no DTO property exposure. |
| `find . -name schema.prisma -o -name docker-compose.yml -o -name docker-compose.yaml` | Pass | No output. |

## 16. Skipped Commands and Why

| Command | Status | Reason |
| --- | --- | --- |
| `npm --prefix frontend run test` | Blocked | Frontend package has no `test` script. Used direct `node --test frontend/lib/api/typed-api-client.test.mjs`. |
| `npm --prefix frontend run typecheck` | Blocked | Frontend package has no `typecheck` script. Used direct local `tsc` binary. |
| `npm --prefix frontend run build` | Blocked after sandbox failure | Turbopack failed under sandbox while creating/binding a helper process. Escalated rerun was rejected by the approval system due the current usage limit, so no workaround was attempted. |
| `npm --prefix shared/contracts run typecheck` | Blocked | `tsc` is not installed in `shared/contracts`; this is a known existing blocker. |
| DB-backed frontend route tests | Not run by design | Step 17B did not add route UI wiring, Playwright route flows, replay reducer, or backend integration tests. |

## 17. What Was Intentionally Not Implemented

- No route UI wiring.
- No replay reducer.
- No SSE or `EventSource` client.
- No Playwright route flow.
- No backend route changes.
- No shared contract/OpenAPI changes.
- No database migration or seed changes.
- No package or lockfile changes.
- No env file changes.
- No Docker Compose or Prisma work.
- No OpenAI SDK, API key read, live OpenAI call, live agent, or provider runtime.
- No Redis/WebSocket fanout.
- No Temporal runtime.
- No production publisher.
- No production auth/RBAC.
- No debrief, scoring, faculty workflow, treatment/order workflow, or imaging interpretation.
- No real patient data.
- No use of frontend mock data, local simulation engine, simulation storage, or localStorage as truth.

## 18. Remaining Warnings and Blockers

- Broad frontend integration remains blocked.
- Replay reducer and SSE consumption remain blocked.
- Replay/SSE frontend contract gap remains because these routes are not OpenAPI-backed for frontend consumption.
- Temporary actor headers are not production auth/RBAC.
- Frontend package has no `test` or `typecheck` script.
- Frontend production build could not be completed in this environment due sandbox/approval constraints.
- Shared contracts typecheck remains blocked by missing `tsc`.
- DB-backed eval runner path was skipped because the DB URL was not configured in this shell.
- Existing frontend prototype remains dirty/prototype-only and contains hidden/prototype state that must not become backend truth.

## 19. Go/No-Go Decision

GO for Step 17B review.

NO-GO for broad frontend integration, route UI wiring, replay reducer, SSE consumption, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief/scoring/faculty workflow, treatment/order/imaging workflow, package installs, backend/shared/database/env/Compose/Prisma changes, or real patient data.

## 20. Next Recommended Task

Step 17B-R - Frontend Contract Typed API Client Foundation Architecture Review.

The next task should be review-only and should verify scope creep, contract drift, hidden fact leakage risk, temporary actor context handling, idempotency behavior, replay/SSE blocked posture, frontend mock/localStorage isolation, missing tests, and frontend/backend mismatch before any Step 17C replay reducer or route wiring begins.
