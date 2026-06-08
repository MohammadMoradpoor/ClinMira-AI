# Step 17B-R - Frontend Contract Typed API Client Foundation Architecture Review

## 1. Executive Verdict

STEP 17B ACCEPTED WITH REQUIRED CORRECTIONS BEFORE STEP 17C

Step 17B stayed within the intended frontend typed API/client foundation scope and did not add UI route wiring, replay reducer behavior, SSE/EventSource usage, Playwright route flows, backend route changes, shared contract changes, package changes, migrations, seeds, env edits, Docker Compose runtime, Prisma/ORM, OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, or real patient data.

However, Step 17B cannot yet unblock Step 17C because the public `ClinMiraApiClient.request()` API can be used with an approved `routeTemplate` while overriding `path` to an arbitrary same-origin path, and it does not enforce that the requested HTTP method matches the route inventory. This violates the Step 17B-R requirement that route templates cannot be bypassed to call arbitrary routes.

Required correction before Step 17C:

- Add a route/path/method gate so `path` can only be omitted or match the approved route template with validated path-parameter substitution.
- Reject method mismatches against `STEP_17B_APPROVED_ROUTE_INVENTORY`.
- Add guard tests proving arbitrary `path` override and method mismatch fail before `fetch` is called.

## 2. Evidence Reviewed

- `docs/implementation/00_PREFLIGHT_AUDIT.md`
- `docs/implementation/IMPLEMENTATION_PLAYBOOK.md`
- `docs/implementation/IMPLEMENTATION_BACKLOG.md`
- `docs/implementation/IMPLEMENTATION_STATUS.md`
- `docs/implementation/ARCHITECTURE_COMPLIANCE_CHECKLIST.md`
- `docs/implementation/NO_GO_RULES.md`
- `docs/implementation/reports/STEP_17B_FRONTEND_CONTRACT_TYPED_API_CLIENT_FOUNDATION_REPORT.md`
- `docs/implementation/reports/STEP_17A_BACKEND_FRONTEND_CONTRACT_INTEGRATION_PLANNING_REPORT.md`
- `docs/implementation/reports/STEP_16R_DB_BACKED_REPLAY_SAFETY_ARCHITECTURE_REVIEW_REPORT.md`
- `docs/architecture/03_FRONTEND_REQUIRED_UPDATES.md`
- `docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md`
- `docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md`
- `docs/architecture/10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md`
- `docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md`
- `shared/contracts/CONTRACT_GOVERNANCE.md`
- `shared/contracts/CONTRACT_INVENTORY.md`
- `shared/contracts/openapi/clinmira-api.v1.json`
- `shared/contracts/simulation/**`
- `shared/contracts/events/**`
- `frontend/lib/api/actor-context.ts`
- `frontend/lib/api/client.ts`
- `frontend/lib/api/contract-inventory.ts`
- `frontend/lib/api/contracts.ts`
- `frontend/lib/api/errors.ts`
- `frontend/lib/api/idempotency.ts`
- `frontend/lib/api/typed-api-client.test.mjs`
- `frontend/lib/simulation/session-api.ts`
- `frontend/package.json`
- `frontend/tsconfig.json`

## 3. Files Changed By Step 17B

Step 17B reported these files:

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

Review note: the repository remains broadly dirty from prior staged work, so `git status --short` cannot by itself isolate Step 17B provenance. This review used the Step 17B report, implementation status, targeted file inspection, and forbidden scans to evaluate Step 17B scope.

## 4. Scope Review

| Scope Item | Result |
| --- | --- |
| Frontend API/session foundation only | Pass. Changes are limited to API helper/session wrapper files and docs according to Step 17B evidence. |
| UI route wiring | Pass. No route/app/page/component wiring was found in Step 17B files. |
| React component modification | Pass by Step 17B evidence and targeted review; existing prototype components remain pre-existing dirty work. |
| Replay reducer | Pass. No reducer file or reducer behavior exists in Step 17B. |
| SSE/EventSource client | Pass. Only future-only inventory notes mention SSE/EventSource. |
| Playwright route flow | Pass. None added. |
| Backend/shared/database/package/env/Compose/Prisma drift | Pass for Step 17B evidence. Review validation rewrote the eval latest-result artifact during eval runner execution and restored it; no persistent backend diff was left by this review. |

Scope verdict: acceptable.

## 5. Approved Route Inventory Review

Approved inventory exactly includes:

- `GET /health`
- `GET /api/v1/health`
- `POST /api/v1/simulation-sessions`
- `GET /api/v1/simulation-sessions/{id}`
- `POST /api/v1/simulation-sessions/{id}/actions`

Future-only inventory includes:

- `GET /api/v1/simulation-sessions/{sessionId}/replay`
- `GET /api/v1/simulation-sessions/{sessionId}/events/stream`

No replay wrapper or SSE wrapper exists in `frontend/lib/simulation/session-api.ts`.

Finding F1 - Required correction:

`ClinMiraApiClient.request()` checks `routeTemplate`, but it accepts `path?: string` and uses `path` directly for the network call. A caller can pass an approved template such as `/health` while setting `path` to an unapproved route. The same public API also does not verify that `options.method` matches the inventory method for the chosen template.

This is not currently exploited by the session wrappers, but the public client foundation is not strict enough to satisfy Step 17B-R.

## 6. Contract Boundary Review

Pass with warning.

The frontend-local DTOs in `frontend/lib/api/contracts.ts` map to approved OpenAPI/shared schema names and versions for health and Step 8B simulation routes. The review found no imports from:

- `backend/api/src/**`
- `frontend/lib/mock-data.ts`
- `frontend/lib/simulation-engine.ts`
- `frontend/lib/simulation-storage.ts`

Hidden/prototype-only fields are not declared as DTO properties. They appear only in a defensive denylist and tests. Replay/SSE contract gaps remain documented as future-only inventory entries rather than silently implemented.

Warning: because Step 17B uses frontend-local DTOs rather than generated/shared TypeScript exports, future contract drift remains possible until a later shared TypeScript export/freshness task exists.

## 7. Typed Client Behavior Review

Pass with required correction.

Positive findings:

- Configurable `baseUrl` exists and defaults to same-origin paths without env edits.
- `fetchImpl` injection supports tests.
- Empty response parsing is handled.
- Malformed JSON maps to `unknown_response_shape`.
- Unknown contract version maps to `unknown_contract_version`.
- No new dependency, secret read, env read, or package change was added.

Required correction:

- Public request path/method gate must be tightened so approved templates cannot be used to reach arbitrary paths or mismatched methods.

Additional warning:

- `expectedContractVersion` and `validateResponse` are optional in the public request API. The approved session wrappers use them correctly. Before broad route wiring, either raw public request use must remain constrained to wrappers or route inventory metadata should drive mandatory validation for all approved response-bearing routes.

## 8. Error Handling Review

Pass.

Normalized errors cover:

- `backend_unavailable`
- `timeout`
- `bad_request`
- `missing_actor_context`
- `unauthorized`
- `forbidden`
- `not_found`
- `idempotency_conflict`
- `safety_block`
- `unknown_response_shape`
- `unknown_contract_version`
- `http_error`

Backend `code` and `message` are preserved in the normalized error object. Safety-block classification is treated as backend error/state metadata, not frontend clinical judgment.

## 9. Temporary Actor Context Review

Pass.

`frontend/lib/api/actor-context.ts` centralizes temporary actor context headers:

- `x-clinmira-institution-id`
- `x-clinmira-user-id`

The helper validates canonical UUID-like values, clearly states that the headers are not production auth/RBAC, and does not source values from frontend mock data, localStorage, env files, or session storage.

Production auth/RBAC remains absent and blocked for later security gates.

## 10. Idempotency Review

Pass.

`frontend/lib/api/idempotency.ts`:

- Prefers `globalThis.crypto.randomUUID()`.
- Falls back to `crypto.getRandomValues()` UUID v4 generation.
- Does not use timestamp-only IDs.
- Uses no new package.
- Is isolated from clinical logic.

`frontend/lib/simulation/session-api.ts` generates idempotency keys for create-session and submit-action wrappers, and requires/normalizes keys before sending mutating requests.

## 11. Session API Wrapper Review

Pass.

Only these wrappers exist:

- `getHealth()`
- `getVersionedHealth()`
- `createSimulationSession()`
- `getSimulationSession()`
- `submitSimulationAction()`

The wrappers:

- Attach temporary actor headers for simulation routes.
- Add contract versions.
- Generate/require idempotency keys for mutating calls.
- Validate UUID path/body identifiers.
- Reject structured prototype-only hidden/faculty/debrief/imaging/scoring payload keys before submission.
- Use response validators.

No replay wrapper, SSE wrapper, reducer, local simulation fallback, mock-data import, localStorage path, or UI route wiring was found.

## 12. Hidden Fact And Prototype Leakage Review

Pass.

DTO declarations do not expose:

- `hiddenDiagnosis`
- `hidden_diagnosis`
- `hiddenHistoryPrompt`
- `facultyRubric`
- `raw_fact_content`
- `faculty_only_notes`
- `treatment_execution`
- `imaging_interpretation`
- `debrief`
- `scoring`
- `faculty_workflow`
- `system_prompt`
- `internal_prompt`
- provider secrets, tool secrets, or API keys

Validators reject these markers recursively in student-facing response projections and structured action payloads. Conversation visibility is constrained to `student_safe`, and revealed fact references are constrained to `student_payload`.

No frontend hidden-field rehydration path was found in the Step 17B files.

## 13. Test Quality Review

Pass with required additions.

Existing `frontend/lib/api/typed-api-client.test.mjs` covers:

- Approved route inventory exactness.
- Replay/SSE future-only state.
- No backend source imports.
- No frontend mock/simulation/storage imports.
- No localStorage truth path.
- No OpenAI, Redis, WebSocket, EventSource, Temporal runtime usage.
- Hidden/prototype field exclusion.
- Actor context labeling and UUID validation.
- Idempotency behavior.
- Normalized error mapping.
- Unapproved route rejection by `routeTemplate`.
- Session wrapper route/body/header/idempotency behavior.

Required test additions:

- Test that `client.request({ routeTemplate: "/health", path: "/api/v1/unapproved", method: "GET" })` fails before `fetch`.
- Test that method mismatches, such as `POST /health` or `GET /api/v1/simulation-sessions`, fail before `fetch`.

## 14. Build/Tooling Warning Classification

| Warning | Classification |
| --- | --- |
| Frontend package lacks `test` script | Acceptable for Step 17B-R and correction task because direct `node --test` works; blocker before mature CI/release ergonomics. |
| Frontend package lacks `typecheck` script | Acceptable for Step 17B-R and correction task because direct local `tsc` works; blocker before mature CI/release ergonomics. |
| Frontend production build sandbox failure | Not a code blocker. Sandboxed build failed due Turbopack helper process/port restriction; escalated build passed. |
| Shared contracts typecheck missing `tsc` | Existing warning. Does not block the Step 17B client correction, but blocks full shared-contract CI confidence and release claims. |
| DB-backed eval skipped by eval runner when env not sourced | Existing warning. Optional Step 16 DB-backed evidence passed when `.env.local` was sourced outside sandbox. Blocks pilot/live-agent confidence, not the Step 17B client correction. |

## 15. Security/Governance Review

Pass.

Review found no Step 17B addition of:

- OpenAI SDK/import/call/API-key read.
- Live agents.
- Provider runtime.
- Redis runtime.
- WebSocket runtime.
- Temporal runtime.
- Production publisher.
- Production auth/RBAC.
- Prisma/ORM.
- Docker Compose runtime.
- Real patient data.
- Env file edits.

Temporary actor headers remain non-production context only.

## 16. Forbidden Implementation Scan Results

| Scan | Result |
| --- | --- |
| `backend/api/src` imports in Step 17B frontend files | Pass; no matches. |
| Frontend mock/simulation/storage imports | Pass; no matches. |
| localStorage usage in client/session modules | Pass; only denylist/test references in API/test files. |
| EventSource/WebSocket/OpenAI/Redis/Temporal/provider runtime | Pass with expected future-only/denylist/test mentions only. |
| Replay/SSE wrappers | Pass; future-only inventory/test references only. |
| Hidden/prototype DTO fields | Pass; denylist/test fixture matches only, no DTO property declarations. |
| Unapproved route strings | Pass for wrappers; fail for public client enforcement because `path` can bypass template gating. |
| Package/lockfile changes | Pass for Step 17B-R; no package changes made by this review. |
| Migration/seed/env/Compose/Prisma changes | Pass for Step 17B-R; no persistent changes made by this review. |
| Backend/shared changes from review commands | Restored; eval result artifact diff was removed. |

## 17. Remaining Warnings Classified By Gate

| Warning / Blocker | Classification |
| --- | --- |
| Public client `path` override can bypass approved route templates | Blocker before Step 17C. |
| Public client does not enforce inventory method match | Blocker before Step 17C. |
| Missing path/method bypass tests | Blocker before Step 17C. |
| Frontend package lacks `test` script | Acceptable warning for Step 17C/correction; blocker before CI hardening. |
| Frontend package lacks `typecheck` script | Acceptable warning for Step 17C/correction; blocker before CI hardening. |
| Frontend production build not proven in sandbox | Resolved as sandbox-only warning; escalated build passed. |
| Shared contracts typecheck missing `tsc` | Acceptable warning for client correction; blocker before contract CI/release confidence. |
| DB-backed eval skipped by eval runner without env | Acceptable warning for client correction; blocker before pilot/live agents. |
| Broad frontend integration blocked | Remains blocked before route UI wiring. |
| Replay reducer blocked | Remains blocked until Step 17B correction passes and a narrow Step 17C is approved. |
| SSE consumption blocked | Blocker before SSE; requires reducer/replay gate first. |
| Route UI wiring blocked | Blocker before UI integration. |
| Production auth/RBAC absent | Blocker before pilot/production and faculty/admin audiences. |
| Production outbox publisher absent | Blocker before production realtime/fanout. |
| CI/staging DB evidence absent | Blocker before production-like confidence. |
| Live OpenAI/live agents/provider runtime blocked | Blocker before live agents. |
| Debrief/faculty/treatment/order/imaging workflows absent | Blocker before those feature gates. |

## 18. Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `pwd` | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Warning | Repo remains broadly dirty/staged from prior work. |
| `node --test frontend/lib/api/typed-api-client.test.mjs` | Pass | Step 17B guard suite passed. |
| `frontend/node_modules/.bin/tsc --noEmit --project frontend/tsconfig.json` | Pass | Direct frontend typecheck passed. |
| `npm --prefix frontend run lint` | Pass | ESLint passed. |
| `npm --prefix frontend run build` | Pass after escalation | Sandboxed run failed due Turbopack process/port restriction; escalated rerun passed. |
| `npm --prefix backend/api run test` | Pass | 9 backend API tests passed. |
| `npm --prefix backend/api run typecheck` | Pass | Backend API typecheck passed. |
| `npm --prefix backend/api run build` | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Pass | 5 shared contract tests passed. |
| `npm --prefix shared/contracts run typecheck` | Blocked | `tsc` not found in `shared/contracts`. |
| `node --test backend/database/tests/*.test.mjs` | Pass | 11 database static tests passed. |
| `node --test backend/evals/tests/*.test.mjs` | Pass | 7 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Pass with warning | Status `PASSED`, threshold failures `0`, skipped `1`; DB eval skipped without env. Generated artifact was restored. |
| `python3 -m unittest discover -s tests` in `backend/agent-worker` | Pass | 57 worker tests passed. |
| Optional DB evidence command with `.env.local` sourced | Pass after escalation | Sandboxed run failed without detail; escalated rerun passed. |
| `npm --prefix frontend run test` | Blocked | Missing script. |
| `npm --prefix frontend run typecheck` | Blocked | Missing script. |
| Static forbidden scans | Pass with expected matches | Expected future-only inventory and defensive denylist/test mentions only. |

## 19. Architecture Compliance Checklist Result

| Invariant | Result |
| --- | --- |
| ClinMira is not a chatbot | Pass. No chatbot/live-agent behavior added. |
| PostgreSQL remains source of truth | Pass. Frontend client is transport/projection only. |
| Frontend/localStorage/mock data not source of truth | Pass. No such source usage in Step 17B files. |
| Hidden facts protected | Pass. DTOs omit hidden fields; validators reject hidden/prototype markers. |
| Backend safety authority | Pass. Frontend normalizes safety block metadata but does not make safety decisions. |
| Idempotency for frontend actions | Pass for session wrappers. |
| Realtime requires replay first | Pass. Step 17B did not implement SSE/realtime. |
| Replay reducer not premature | Pass. No reducer exists. |
| Temporary actor context not auth/RBAC | Pass. Explicitly labeled non-production. |
| Contract-first frontend boundary | Pass with required correction. DTO names/versions align, but public client route/method bypass must be fixed. |

## 20. Go/No-Go Decision

NO-GO for Step 17C until Step 17B-C correction is completed.

Step 17B is not rejected outright. It is accepted as a mostly compliant typed API foundation, but it has a required client route/method gate correction before any reducer, replay client, route UI wiring, or broader frontend integration begins.

Next allowed task:

Step 17B-C - Frontend Typed API Client Route Gate Correction.

Step 17B-C must be limited to `frontend/lib/api/client.ts`, `frontend/lib/api/contract-inventory.ts` only if needed for method/path lookup, `frontend/lib/api/typed-api-client.test.mjs`, the Step 17B-C report, and status/backlog updates. It must not add route UI wiring, replay reducer, SSE client, Playwright route flows, backend/shared/database/package/env/Compose/Prisma changes, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, or real patient data.

## 21. Next Recommended Task

Step 17B-C - Frontend Typed API Client Route Gate Correction.

Required prompt scope:

- Correct the public client so approved `routeTemplate` values cannot be paired with arbitrary `path` values.
- Validate that dynamic paths match only their approved template substitution.
- Validate that HTTP method matches the route inventory.
- Add guard tests for path bypass and method mismatch.
- Rerun Step 17B guard tests, direct frontend typecheck, frontend lint/build, and no-go scans.
- Update implementation status and produce a Step 17B-C correction report.

Step 17C - Frontend Replay Reducer Foundation remains blocked until Step 17B-C passes and a follow-up review or status update explicitly approves the reducer scope.
