# Step 17B-C - Frontend Typed API Client Route Gate Correction

## 1. Executive Verdict

STEP 17B-C COMPLETE WITH WARNINGS

Step 17B-C corrected the Step 17B-R public client route/path/method bypass. `ClinMiraApiClient.request()` now resolves the approved route inventory entry before `fetch`, enforces the inventory HTTP method, rejects unsafe or unrelated `path` overrides, requires dynamic route paths to be explicitly resolved, and accepts only canonical UUID substitutions for approved `{id}` path parameters.

Step 17C remains blocked pending a Step 17B-C-R architecture review. This correction did not implement route UI wiring, replay reducer, replay client, SSE/EventSource client, Playwright route flows, backend route changes, shared contract changes, package changes, migrations, seeds, env edits, Docker Compose runtime, Prisma/ORM, OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, or real patient data.

## 2. Evidence Reviewed

- `docs/implementation/00_PREFLIGHT_AUDIT.md`
- `docs/implementation/IMPLEMENTATION_PLAYBOOK.md`
- `docs/implementation/IMPLEMENTATION_BACKLOG.md`
- `docs/implementation/IMPLEMENTATION_STATUS.md`
- `docs/implementation/ARCHITECTURE_COMPLIANCE_CHECKLIST.md`
- `docs/implementation/NO_GO_RULES.md`
- `docs/implementation/reports/STEP_17B_R_FRONTEND_CONTRACT_TYPED_API_CLIENT_FOUNDATION_REVIEW_REPORT.md`
- `docs/implementation/reports/STEP_17B_FRONTEND_CONTRACT_TYPED_API_CLIENT_FOUNDATION_REPORT.md`
- `docs/implementation/reports/STEP_17A_BACKEND_FRONTEND_CONTRACT_INTEGRATION_PLANNING_REPORT.md`
- `docs/architecture/03_FRONTEND_REQUIRED_UPDATES.md`
- `docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md`
- `docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md`
- `docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md`
- `shared/contracts/CONTRACT_GOVERNANCE.md`
- `shared/contracts/CONTRACT_INVENTORY.md`
- `shared/contracts/openapi/clinmira-api.v1.json`
- `frontend/lib/api/client.ts`
- `frontend/lib/api/contract-inventory.ts`
- `frontend/lib/api/contracts.ts`
- `frontend/lib/api/errors.ts`
- `frontend/lib/api/typed-api-client.test.mjs`
- `frontend/lib/simulation/session-api.ts`
- `frontend/package.json`
- `frontend/tsconfig.json`

## 3. Files Changed

- `frontend/lib/api/client.ts`
- `frontend/lib/api/typed-api-client.test.mjs`
- `docs/implementation/reports/STEP_17B_C_FRONTEND_TYPED_API_CLIENT_ROUTE_GATE_CORRECTION_REPORT.md`
- `docs/implementation/IMPLEMENTATION_STATUS.md`
- `docs/implementation/IMPLEMENTATION_BACKLOG.md`

No backend source, shared contract source, frontend UI route/component, package, lockfile, migration, seed, env, Docker Compose, Prisma/ORM, or agent-worker source file was changed.

## 4. Route/Path/Method Defect Summary

Step 17B-R found that the public client approved `routeTemplate` but then allowed an arbitrary optional `path` to become the actual network path. It also allowed the caller to provide a method that differed from the approved route inventory method.

Risk before correction: a caller could pair an approved route template such as `/health` with an unrelated same-origin path, or use an approved path with the wrong method, and the request could reach `fetch`.

Corrected behavior: template approval, method approval, and path approval all happen before `fetch`.

## 5. Route Template Enforcement Summary

- `request()` still rejects route templates not present in `STEP_17B_APPROVED_ROUTE_INVENTORY`.
- `request()` now resolves the exact inventory entry with `getStep17BRouteInventoryEntry()`.
- Future-only replay/SSE route templates remain unapproved and fail before `fetch`.
- No new route wrappers were added.

## 6. Path Enforcement Summary

The client now rejects before `fetch`:

- Unrelated same-origin paths.
- Replay paths.
- SSE/event stream paths.
- Absolute URLs.
- Protocol-relative URLs.
- Path traversal and decoded path traversal.
- Query or fragment bypass attempts.
- Extra path segments.
- Missing dynamic path segments.
- Malformed UUID path parameters.
- Dynamic route templates called without a resolved path.

Approved dynamic paths still pass only for:

- `GET /api/v1/simulation-sessions/<canonical-uuid>`
- `POST /api/v1/simulation-sessions/<canonical-uuid>/actions`

## 7. Method Enforcement Summary

The client now rejects method mismatches before `fetch`, including:

- `POST /health`
- `POST /api/v1/health`
- `GET /api/v1/simulation-sessions`
- `POST /api/v1/simulation-sessions/{id}`
- `GET /api/v1/simulation-sessions/{id}/actions`

The route inventory remains the method authority.

## 8. Session Wrapper Compatibility Summary

Existing wrappers still work:

- `getHealth()`
- `getVersionedHealth()`
- `createSimulationSession()`
- `getSimulationSession()`
- `submitSimulationAction()`

Wrapper behavior remains unchanged: temporary actor headers are still attached for simulation calls, contract versions are still checked, idempotency keys are still generated or required for mutations, UUID identifiers are still validated, and hidden/faculty/debrief/imaging/scoring prototype keys are still rejected.

## 9. Tests Added

Added guard coverage proving rejection before `fetch` for:

- `client.request({ routeTemplate: "/health", path: "/api/v1/unapproved", method: "GET" })`.
- `client.request({ routeTemplate: "/health", path: "/api/v1/simulation-sessions", method: "GET" })`.
- Replay path override.
- SSE path override.
- Absolute URL override.
- Protocol-relative URL override.
- Path traversal.
- Extra segment.
- Missing path parameter.
- Malformed UUID path parameter.
- Query and fragment bypass attempts.
- Dynamic route template without resolved path.
- `POST /health`.
- `POST /api/v1/health`.
- `GET /api/v1/simulation-sessions`.
- `POST /api/v1/simulation-sessions/{id}`.
- `GET /api/v1/simulation-sessions/{id}/actions`.

Added positive coverage proving valid dynamic UUID paths still reach `fetch` for the approved get-session and submit-action routes.

## 10. Forbidden Implementation Scan Results

| Scan | Result |
| --- | --- |
| `backend/api/src`, `frontend/lib/mock-data`, `frontend/lib/simulation-engine`, `frontend/lib/simulation-storage` imports in Step 17B frontend API/session files | Pass; no matches. |
| `localStorage`, `EventSource`, `WebSocket`, `OpenAI`, `ioredis`, `redis`, `Temporal`, `provider` scan | Pass with expected defensive denylist/test/future-only inventory mentions only. |
| Replay/SSE runtime wrapper scan | Pass; matches only future-only inventory and tests. |
| Prisma/Compose/Dockerfile scan | Pass; no `schema.prisma`, `docker-compose.yml`, `docker-compose.yaml`, or `Dockerfile` found. |
| Backend/shared source drift | Pass; no backend/shared source files were modified by Step 17B-C. |

## 11. Commands Run and Results

| Command | Result | Notes |
| --- | --- | --- |
| `pwd` | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Warning | Dirty repository remains from prior staged/untracked work; Step 17B-C changed only the scoped frontend client/test and implementation docs. |
| `node --test frontend/lib/api/typed-api-client.test.mjs` | Pass | Focused route/path/method guard suite passed. |
| `frontend/node_modules/.bin/tsc --noEmit --project frontend/tsconfig.json` | Pass | Direct frontend TypeScript check passed. |
| `npm --prefix frontend run lint` | Pass | ESLint passed. |
| `npm --prefix frontend run build` | Pass after escalation | Sandbox run failed because Turbopack tried to create/bind a helper process; exact rerun outside sandbox passed. |
| `npm --prefix backend/api run test` | Pass | 9 backend API tests passed. |
| `npm --prefix backend/api run typecheck` | Pass | Backend API typecheck passed. |
| `npm --prefix backend/api run build` | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Pass | 5 shared contract tests passed. |
| `npm --prefix shared/contracts run typecheck` | Blocked | `tsc` not found in `shared/contracts`; no package install authorized. |
| `node --test backend/database/tests/*.test.mjs` | Pass | 11 database static tests passed. |
| `node --test backend/evals/tests/*.test.mjs` | Pass | 7 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Pass with warning | Status `PASSED`, threshold failures `0`, skipped `1`; DB eval skipped because `CLINMIRA_TEST_DATABASE_URL` was not configured in that shell. Generated latest-result artifact was restored. |
| `cd backend/agent-worker && python3 -m unittest discover -s tests` | Pass | 57 worker tests passed. |
| Optional Step 16 DB-backed evidence command | Pass after escalation | Sandbox run failed; exact no-secret-output rerun outside sandbox passed against the safe local test database. |

## 12. Skipped Commands and Why

No requested command was skipped. `npm --prefix shared/contracts run typecheck` was attempted and remains blocked by missing local `tsc`; this is an existing dependency/setup warning and does not block the Step 17B-C correction.

## 13. What Was Intentionally Not Implemented

- No route UI wiring.
- No replay reducer.
- No replay client.
- No SSE/EventSource client.
- No WebSocket usage.
- No Playwright route flow.
- No React component changes.
- No backend route changes.
- No shared contract/OpenAPI changes.
- No package or lockfile changes.
- No migration or seed edits.
- No env file edits.
- No Docker Compose runtime.
- No Prisma/ORM.
- No OpenAI SDK, API key read, live OpenAI call, live agent, or provider runtime.
- No Redis/WebSocket fanout.
- No Temporal runtime.
- No production publisher.
- No production auth/RBAC.
- No debrief, faculty workflow, treatment/order/imaging workflow, scoring, or clinical advice.
- No real patient data.
- No frontend mock data or localStorage simulation truth path.

## 14. Remaining Warnings and Blockers

- Step 17B-C has not yet had its architecture review.
- Step 17C replay reducer remains blocked until Step 17B-C-R accepts this correction.
- Route UI wiring remains blocked.
- SSE/EventSource consumption remains blocked.
- Playwright route flows remain blocked.
- Replay/SSE frontend contract gap remains for future reducer/SSE work.
- Temporary actor headers remain non-production context only and are not auth/RBAC.
- Shared contracts typecheck remains blocked because local `tsc` is missing in `shared/contracts`.
- Frontend package still lacks `test` and `typecheck` scripts; direct commands are currently used.
- Existing frontend prototype remains dirty/prototype-only and must not become backend truth.

## 15. Go/No-Go Decision For Step 17C

NO-GO for Step 17C implementation until Step 17B-C-R architecture review accepts this correction.

GO for Step 17B-C-R architecture review.

## 16. Next Recommended Task

Step 17B-C-R - Frontend Typed API Client Route Gate Correction Architecture Review.

The review should verify scope, route/path/method gate behavior, tests, forbidden scans, and whether Step 17C may proceed as a narrow replay reducer foundation only. It must not implement reducer, UI wiring, SSE/EventSource, Playwright route flows, backend/shared changes, package changes, live agents, provider runtime, Redis/WebSocket, Temporal, production publisher/auth, debrief/faculty/treatment/order/imaging workflow, or real patient data.
