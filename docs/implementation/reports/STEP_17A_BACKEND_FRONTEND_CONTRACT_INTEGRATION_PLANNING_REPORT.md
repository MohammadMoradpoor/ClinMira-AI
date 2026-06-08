# Step 17A - Backend/Frontend Contract and Integration Planning

## 1. Executive Verdict

STEP 17A COMPLETE WITH WARNINGS

Step 17A reviewed the post-Step-16 backend, replay/SSE, shared contracts, frontend prototype, safety evidence, and implementation gates. The backend has enough local host-runtime evidence to approve a narrow next frontend task, but not enough to approve broad frontend integration.

Direct frontend route integration remains blocked.

Approved next slice:

Step 17B - Frontend Contract Inventory and Typed API Client Foundation.

Step 17B must be limited to typed client and contract boundary scaffolding, contract inventory, error normalization, temporary actor context handling, idempotency helpers, and unit/guard tests. It must not wire UI routes, consume frontend mock state as truth, open SSE connections, implement replay reducers, add Playwright integration flows, modify backend routes, add contracts, add migrations, add package dependencies, or add production auth/RBAC.

## 2. Evidence Reviewed

| Evidence | Result |
| --- | --- |
| `docs/implementation/IMPLEMENTATION_STATUS.md` | Step 16R accepted Step 16 with warnings and selected Step 17A as planning-only. |
| `docs/implementation/IMPLEMENTATION_BACKLOG.md` | Step 17A exists as a planning gate before any frontend implementation. |
| `docs/implementation/IMPLEMENTATION_PLAYBOOK.md` | Source-of-truth, stop-after-task, no shortcut, report, and testing rules remain active. |
| `docs/implementation/NO_GO_RULES.md` | No-go rules still block frontend mock truth, hidden fact leakage, premature live agents, Redis truth, and production auth claims. |
| `docs/architecture/03_FRONTEND_REQUIRED_UPDATES.md` | Frontend integration must be contract-driven, role-filtered, replay-aware, and not local-state authoritative. |
| `docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md` | PostgreSQL `event_log` and replay are source of truth; SSE is delivery-only. |
| `docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md` | Frontend is untrusted; hidden facts, prompts, secrets, and faculty-only material must be backend-filtered. |
| `docs/architecture/10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md` | Frontend integration must support reconnect, latency/error handling, and observable failures later. |
| `docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md` | Contract, safety, replay, role filtering, and source-of-truth gates remain mandatory. |
| `shared/contracts/CONTRACT_GOVERNANCE.md` | Simulation OpenAPI routes are active; replay/SSE contracts are active but backend-filtered and not frontend-integration authorization by themselves. |
| `shared/contracts/CONTRACT_INVENTORY.md` | Active contract inventory confirms simulation, replay, SSE, and mock-agent boundaries with explicit limitations. |
| `backend/api/src/simulation/**` | Existing create/get/submit routes use temporary actor headers and deterministic mock simulation only. |
| `backend/api/src/replay/**` | Existing replay route reads PostgreSQL `event_log`, applies redaction, cursor, duplicate, and gap behavior. |
| `backend/api/src/realtime/**` | Existing SSE route emits replay-first delivery-only frames. |
| `backend/api/test/step16-db-backed-evidence.db-evidence.mjs` | DB-backed evidence uses existing Nest routes and services against safe local PostgreSQL. |
| `frontend/**` prototype | Contains useful presentation shells but also mock hidden facts, localStorage state, treatment/order/imaging/debrief/faculty semantics, and local simulation logic. |

## 3. Current Architecture State After Step 16R

| Area | State | Planning Impact |
| --- | --- | --- |
| Backend API/BFF | Active for health, Step 8B mock simulation routes, replay route, and delivery-only SSE route. | Narrow frontend client planning can proceed. |
| Database | SQL-first foundation through migrations `0001`-`0005`; local Step 16 DB evidence passed. | Local frontend tests may rely on safe route-valid synthetic rows only when explicitly configured. |
| Event log/replay | PostgreSQL `event_log` is durable replay authority. | Frontend state must be reconstructed from backend responses and replay, not from frontend mock data. |
| Outbox | Durable queue exists and is written for relevant paths; production publisher is absent. | Do not claim production realtime fanout. |
| SSE | Delivery-only replay-first route exists; no Redis/WebSocket fanout and no publisher. | Do not open frontend SSE in the first frontend slice. |
| Safety | Deterministic safety engine exists and Step 16 DB evidence passed for unsafe blocking. | Frontend must render backend safety blocks, not invent safety decisions. |
| Contracts | OpenAPI covers health and Step 8B simulation HTTP routes. JSON schemas cover replay/SSE, but replay/SSE are not in OpenAPI. | Contract gaps must be tracked before reducer/SSE work. |
| Auth/RBAC | Production auth/RBAC absent; temporary actor headers are actor context only. | Frontend client must centralize temporary headers and mark them non-production. |
| Frontend | Prototype exists with mock data and local simulation state. | Presentation can be preserved later, but mock truth and localStorage simulation state cannot be integrated. |
| Live agents/OpenAI | Blocked. | No frontend agent UI integration or live provider path. |

## 4. Approved Backend Route Inventory For Planning

| Route | Method | Current Source | Contract Source | Frontend Planning Decision |
| --- | --- | --- | --- | --- |
| `/health` | `GET` | `backend/api/src/health/health.controller.ts` | OpenAPI and shared TypeScript health DTO. | May be used only for health checks. |
| `/api/v1/health` | `GET` | `backend/api/src/health/health.controller.ts` | OpenAPI and shared TypeScript health DTO. | May be used only for health checks. |
| `/api/v1/simulation-sessions` | `POST` | `backend/api/src/simulation/simulation.controller.ts` | OpenAPI `CreateSimulationSessionRequestDto` and `SimulationSessionDto`; JSON schemas under `shared/contracts/simulation/`. | Approved for Step 17B typed client foundation only. No UI wiring yet. |
| `/api/v1/simulation-sessions/{id}` | `GET` | `backend/api/src/simulation/simulation.controller.ts` | OpenAPI `SimulationSessionDto`; JSON schema under `shared/contracts/simulation/`. | Approved for Step 17B typed client foundation only. No UI wiring yet. |
| `/api/v1/simulation-sessions/{id}/actions` | `POST` | `backend/api/src/simulation/simulation.controller.ts` | OpenAPI `SubmitSimulationActionRequestDto` and `SimulationTurnResultDto`; JSON schemas under `shared/contracts/simulation/`. | Approved for Step 17B typed client foundation only. Require idempotency helper. |
| `/api/v1/simulation-sessions/{sessionId}/replay` | `GET` | `backend/api/src/replay/replay.controller.ts` | JSON schemas under `shared/contracts/events/`; backend runtime DTO in `backend/api/src/replay/replay.dto.ts`; not in OpenAPI. | Do not wire UI in Step 17B. Future reducer/replay task must close or explicitly accept the OpenAPI gap. |
| `/api/v1/simulation-sessions/{sessionId}/events/stream` | `GET` SSE | `backend/api/src/realtime/realtime.controller.ts` | JSON schema `shared/contracts/events/realtime-stream.schema.json`; backend runtime DTO in `backend/api/src/realtime/realtime.dto.ts`; not in OpenAPI. | Do not open SSE in Step 17B. Future SSE task requires replay reducer tests first. |

No other backend route is approved for frontend consumption.

## 5. Shared Contract And OpenAPI Inventory

| Contract Family | Active Source | Frontend Status |
| --- | --- | --- |
| Health | OpenAPI, `shared/contracts/src/health-response.ts`, JSON schema. | Safe for health-only client. |
| Feature flags | OpenAPI component, `shared/contracts/src/feature-flags.ts`, JSON schema. | Status-only. Does not enable live features. |
| Simulation create/get/submit | OpenAPI components and JSON schemas under `shared/contracts/simulation/`. Runtime TypeScript interfaces currently live in backend source. | Approved as Step 17B client contract source through OpenAPI/JSON schema inventory, not backend imports. |
| Replay request/response/cursor/event | JSON schemas under `shared/contracts/events/`. Runtime TypeScript interfaces currently live in backend source. | Approved for planning only. Future frontend reducer task must not import backend DTOs. |
| Realtime stream frame | JSON schema under `shared/contracts/events/realtime-stream.schema.json`. Runtime TypeScript interface currently lives in backend source. | Approved for planning only. No SSE client in Step 17B. |
| Mock-agent contracts | JSON schemas under `shared/contracts/agents/`. | Not approved for frontend consumption. |

Important contract limitation: `shared/contracts/src/index.ts` currently exports only feature flags, health response, and schema versions. It does not export frontend-ready TypeScript DTOs for simulation, replay, or SSE. Step 17B must not import backend DTO files as a shortcut.

## 6. Contract Gaps And Blockers

| Gap | Severity | Required Future Action |
| --- | --- | --- |
| Replay and SSE active routes are not represented in OpenAPI. | Medium | Future reducer/SSE step must either add approved OpenAPI coverage in a dedicated contract step or explicitly use shared event JSON schemas with freshness tests. |
| Shared TypeScript exports do not include simulation/replay/SSE DTOs. | High for frontend ergonomics | Step 17B must create frontend-local adapter types only from approved contracts or stop for a contract-export step. It must not import backend runtime DTOs. |
| Shared contracts typecheck still fails because `tsc` is missing in `shared/contracts`. | Medium | Separate approved dependency setup is needed before claiming shared TypeScript typecheck evidence. |
| Temporary actor headers are not production auth/RBAC. | High | Step 17B may centralize temporary headers for local development only; production auth/RBAC remains a later backend/security gate. |
| Route-valid synthetic fixture setup is not a frontend artifact. | Medium | Frontend tests must use safe route-valid DB setup or stop if no fixture IDs are available. Do not hardcode mock frontend IDs as backend truth. |
| Clinical event payload catalog remains generic. | Medium | Future event catalog work is needed before rich frontend timelines can assume event-specific payload shapes. |
| Frontend prototype types contain hidden/faculty/treatment/order/imaging/debrief fields. | High | Step 17B must avoid these prototype types for backend DTOs. Future UI integration must replace or filter them. |

## 7. First Safe Frontend Integration Slice Proposal

Approved next task name:

Step 17B - Frontend Contract Inventory and Typed API Client Foundation.

Allowed Step 17B scope:

- Add frontend-local typed HTTP client foundation for approved health and Step 8B simulation routes.
- Add frontend-local contract inventory mapping each consumed route to OpenAPI/JSON schema source.
- Add normalized error handling for backend unavailable, bad request, tenant/user header errors, idempotency conflicts, safety blocks, and unknown contract versions.
- Add temporary actor context configuration helper for local development only, explicitly marked not auth/RBAC.
- Add idempotency key helper for create-session and submit-action retry safety.
- Add unit/guard tests proving no frontend mock data, localStorage simulation state, backend DTO imports, OpenAI, Redis/WebSocket, Temporal, or unsupported route consumption.
- Update Step 17B report/status only after completion.

Forbidden in Step 17B:

- No route UI wiring.
- No reducer implementation.
- No SSE connection.
- No Playwright route integration.
- No backend route changes.
- No shared contract edits unless separately authorized.
- No package install or lockfile change.
- No migrations, seeds, env edits, Docker Compose, Prisma/ORM, production auth/RBAC, live agents, or OpenAI.

## 8. Typed API Client Plan

Recommended Step 17B files:

| File | Purpose |
| --- | --- |
| `frontend/lib/api/client.ts` | Fetch wrapper with base URL, JSON parsing, timeout hook if already supported without new packages, and normalized errors. |
| `frontend/lib/api/contracts.ts` | Frontend-local type aliases/interfaces derived from approved OpenAPI/JSON schema inventory, with schema version constants. |
| `frontend/lib/api/errors.ts` | Normalized error types and helpers. |
| `frontend/lib/api/actor-context.ts` | Temporary local actor context header builder, clearly marked non-production and not auth/RBAC. |
| `frontend/lib/api/idempotency.ts` | Client idempotency key helper for retry-safe actions. |
| `frontend/lib/simulation/session-api.ts` | Thin typed calls for create session, get session, and submit action. |
| `frontend/lib/api/*.test.*` or equivalent existing test location | Guard tests. Do not add a new test framework or package. |

Client rules:

- Use OpenAPI/JSON schema names as the DTO naming source.
- Do not import from `backend/api/src/**`.
- Do not import from `frontend/lib/mock-data.ts`, `frontend/lib/simulation-engine.ts`, or `frontend/lib/simulation-storage.ts`.
- Require `idempotency_key` for submit-action calls even if the backend DTO currently allows it as optional.
- Treat `blocked_unsupported` and safety-block statuses as backend decisions to render later, not as client-side clinical rules.
- Do not store simulation state in localStorage.

## 9. Replay/Reducer Plan

Replay/reducer implementation is not approved for Step 17B.

Future Step 17C should implement a replay reducer only after Step 17B client foundation passes.

Reducer requirements for the future:

- Durable sequence is authoritative.
- Duplicate events with sequence less than or equal to the applied cursor are ignored.
- Sequence gaps fail closed into `snapshot_required` or `needs_replay_reload`; they must not be patched from frontend mock data.
- Unknown schema versions fail closed.
- Redacted payloads must remain redacted; frontend must not rehydrate hidden fields.
- Event IDs are used for dedupe where available.
- `event_log` replay responses and initial session responses are reconciled deterministically.
- Safety-block events cannot be turned into accepted clinical mutations by UI state.
- Reducer tests must cover duplicates, gaps, redaction, safety block, reconnect, out-of-order frames, and unknown event types.

## 10. SSE Delivery-Only Plan

SSE client implementation is not approved for Step 17B.

Future SSE implementation requirements:

- Start from replay.
- Treat SSE as delivery-only, never source of truth.
- Use the replay reducer, not independent UI mutation logic.
- Reconnect with `after_sequence`.
- On gap, duplicate ambiguity, or unknown frame, close stream and request replay/snapshot.
- Do not connect to Redis or WebSocket.
- Do not treat SSE completion frames as domain events.
- Do not show hidden, faculty-only, internal, raw fact, prompt, trace, or secret payload fields.

## 11. Role-Filtering And Redaction Requirements

Initial frontend integration must be student-only.

Frontend may receive:

- Student-safe session projection fields.
- Student-safe conversation message content.
- Student-safe timeline entries.
- Revealed fact references containing fact IDs and reveal metadata only.
- Backend safety block/warning summaries intended for student display.

Frontend must never receive or render:

- `hiddenDiagnosis`
- `hidden_diagnosis`
- `raw_fact_content`
- `faculty_only_notes`
- `hiddenHistoryPrompt`
- `facultyRubric`
- `system_prompt`
- `internal_prompt`
- `provider_secret`
- `tool_secret`
- API keys or provider payloads
- frontend mock data as backend truth
- `localStorage` simulation snapshots as backend truth

Faculty/system/admin audiences remain blocked until production auth/RBAC and role-filtered backend contracts exist.

## 12. Route-Valid Synthetic Fixture Policy

Step 17B may use route-valid synthetic IDs only when they come from an approved safe local test database setup or explicit test fixture setup.

Rules:

- Do not use `frontend/lib/mock-data.ts` case IDs as backend route IDs.
- Do not hardcode non-UUID prototype IDs into backend calls.
- Do not modify database seeds in a frontend task.
- Do not add backend fixture endpoints in a frontend task.
- If route-valid institution, user, and case version IDs are not available, Step 17B must stop and report blocked.
- Test fixtures must be synthetic and training-only.
- No real patient data is permitted.

## 13. Frontend Prototype Risk Review

| Prototype Surface | Risk | Planning Decision |
| --- | --- | --- |
| `frontend/lib/mock-data.ts` | Contains hidden diagnoses, hidden history prompts, faculty/debrief/scoring semantics, imaging/order/treatment content, and named synthetic users/patients. | Prototype-only. Must not become contract, backend fixture, source of truth, or eval source. |
| `frontend/lib/simulation-engine.ts` | Implements local simulation logic, scoring, order/imaging/treatment behavior, and safety-like messages. | Must not be backend integration logic. Future UI may keep presentation patterns only after replacing state source. |
| `frontend/lib/simulation-storage.ts` | Stores simulation snapshots in localStorage. | Must not store backend simulation truth. Locale/theme localStorage is separate and acceptable. |
| `frontend/types.ts` | Defines prototype types with `hiddenDiagnosis`, `hiddenHistoryPrompt`, `facultyRubric`, treatment, order, imaging, and debrief fields. | Must not be reused as backend DTO source. |
| `frontend/components/virtual-clinic/virtual-clinic-content.tsx` | Uses local simulation engine and mock data with live-agent, order, treatment, imaging UI semantics. | Broad integration blocked. Future work must replace data boundary in narrow slices. |
| `frontend/components/agent-control/**` | Uses mock agent events and faculty review queue. | Not approved for backend integration. |
| `frontend/components/debriefing/**` | Uses mock debrief reports and faculty rubric. | Not approved until evaluator/debrief/faculty gates. |
| `frontend/components/scenario-studio/**` | Uses mock scenario authoring/faculty publish concepts. | Not approved until scenario/faculty gates. |
| Dashboard/case library components | Use mock data but may be presentational. | Backend integration requires separate contract and role-filtered data gates. |

## 14. Required Future Tests

Step 17B tests:

- Client refuses unapproved routes.
- Client does not import `frontend/lib/mock-data.ts`, `frontend/lib/simulation-engine.ts`, or `frontend/lib/simulation-storage.ts`.
- Client does not import `backend/api/src/**`.
- Client does not call OpenAI, Redis, WebSocket, Temporal, or provider runtime.
- Typed create/get/submit functions preserve contract version fields.
- Submit-action helper includes idempotency key.
- Temporary actor headers are centralized and labeled non-production.
- Error normalization covers bad request, missing actor headers, idempotency conflict, backend unavailable, and unknown response shape.

Future Step 17C reducer tests:

- Replay cursor advancement.
- Duplicate events ignored.
- Gap detection forces replay/snapshot.
- Redacted payload stays redacted.
- Safety block cannot become accepted mutation.
- Unknown event type/schema fails closed.

Future route integration tests:

- Create backend session from route-valid fixture.
- Submit safe question.
- Render mock patient response from backend only.
- Render safety block from backend only.
- Reconnect from replay cursor.
- Prove no hidden/faculty/internal fields are rendered.
- Prove localStorage simulation state is not used as source of truth.

## 15. No-Go Conditions

Stop immediately if any future task attempts to:

- Use frontend mock data as backend truth.
- Use localStorage simulation state as backend truth.
- Import backend runtime DTO files into frontend.
- Add or consume unapproved backend routes.
- Wire UI before typed client and guard tests pass.
- Open SSE before replay reducer tests pass.
- Add Redis/WebSocket fanout.
- Treat SSE as source of truth.
- Add OpenAI SDK, OpenAI calls, API key reads, live agents, or provider runtime.
- Add production auth/RBAC claims.
- Add debrief, faculty workflow, treatment, order, or imaging workflows.
- Add migrations, seeds, env files, packages, Docker Compose runtime, Prisma/ORM, or real patient data.
- Render hidden facts, raw fact content, faculty-only notes, prompts, traces, or secrets.

## 16. Remaining Blockers Classified By Gate

| Gate | Blocker | Classification |
| --- | --- | --- |
| Frontend typed client | Shared TypeScript exports for simulation/replay/SSE are incomplete. | Can proceed with frontend-local adapter only if tied to OpenAPI/JSON schema inventory and guarded by tests. |
| Frontend UI integration | Prototype uses mock data/local state and hidden fields. | Broad integration blocked. |
| Replay reducer | No frontend reducer exists and replay/SSE routes are not in OpenAPI. | Blocked until Step 17C. |
| SSE frontend consumption | No reducer and no frontend stream tests. | Blocked until after replay reducer foundation. |
| Production auth/RBAC | Temporary actor headers only. | Blocked until security/backend gate. |
| Production realtime | No publisher, Redis/WebSocket fanout, or production transport observability. | Blocked. |
| Live agents/OpenAI | Provider runtime and live model evidence gates remain blocked. | Blocked. |
| Debrief/faculty/treatment/order/imaging | Architecture gates not complete. | Blocked. |
| Contract build confidence | `shared/contracts` typecheck cannot run because `tsc` is missing. | Warning; separate setup needed. |
| Pilot/production claims | CI/staging DB evidence and production auth/RBAC are absent. | Blocked. |

## 17. Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `pwd` | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Warning | Repository remains broadly dirty from prior staged/untracked implementation work. |
| `git diff --stat` | Pass after DB-aware eval rerun | No tracked diff remained from the eval artifact after rerun. |
| `git branch --show-current` | Pass | `main`. |
| `npm --prefix backend/api run test` | Pass | 9 backend API tests passed. |
| `npm --prefix backend/api run typecheck` | Pass | Backend API typecheck passed. |
| `npm --prefix backend/api run build` | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Pass | 5 shared contract tests passed. |
| `npm --prefix shared/contracts run typecheck` | Blocked | `tsc` not found in `shared/contracts`; no package install authorized. |
| `node --test backend/database/tests/*.test.mjs` | Pass | 11 database static tests passed. |
| `node --test backend/evals/tests/*.test.mjs` | Pass | 7 eval tests passed. |
| `python3 -m unittest discover -s tests` from `backend/agent-worker` | Pass | 57 worker tests passed. |
| `node backend/evals/lib/eval-runner.mjs` without sourced DB env | Pass with warning | Passed with DB eval skipped because DB env was not configured in that process. |
| `set -a; . ./.env.local; set +a; node backend/evals/lib/eval-runner.mjs` | Pass | Passed with skipped count `0`; DB URL configured but Step 9 harness reports DB integration runner is not implemented. |
| `set -a; . ./.env.local; set +a; CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL" node --test backend/api/test/step16-db-backed-evidence.db-evidence.mjs` | Pass | DB-backed Step 16 evidence test passed through existing Nest routes/services. |

## 18. Forbidden Implementation Scan Results

| Scan | Result | Interpretation |
| --- | --- | --- |
| OpenAI/API-key/provider secret scan | Pass with guard-only matches | Matches were forbidden-field guard strings in worker context/provider schema; no OpenAI SDK import/call/API key read found. |
| Redis/WebSocket/Temporal scan | Pass with disabled guard/status matches | Matches were disabled Temporal guard/status fields; no Redis/WebSocket runtime found. |
| Frontend mock/localStorage/hidden field scan | Warning | Existing prototype imports mock data, contains hidden diagnosis/history fields, treatment/order/imaging/debrief semantics, and simulation localStorage. Classified as prototype-only risk. |
| Prisma/Compose scan | Pass | No `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml` found. |
| Worker direct DB mutation scan | Pass | No worker DB client or SQL mutation path found. |
| Production publisher/auth/RBAC/workflow scan | Warning | Existing backend comments and frontend prototype strings reference blocked domains; no Step 17A implementation change was made. |
| Targeted git status for forbidden paths | Warning | Many forbidden paths are already added from prior steps/prototype state. Step 17A must change only docs/status/backlog/report. |

## 19. Go/No-Go Decision For The Next Task

Go for Step 17B only as a narrow typed API client and contract inventory foundation.

No-go for broad frontend integration.

No-go for reducer implementation in Step 17B.

No-go for SSE frontend consumption in Step 17B.

No-go for Playwright route integration in Step 17B.

No-go for any backend, database, shared contract, package, env, Docker Compose, Prisma, OpenAI, live-agent, Redis/WebSocket, Temporal, production publisher, production auth/RBAC, debrief, faculty, treatment, order, or imaging change in Step 17B.

## 20. Exact Next Recommended Codex Task Name And Scope

Task name:

Step 17B - Frontend Contract Inventory and Typed API Client Foundation.

Exact next prompt:

```text
Use docs/implementation/reports/STEP_17A_BACKEND_FRONTEND_CONTRACT_INTEGRATION_PLANNING_REPORT.md, docs/implementation/IMPLEMENTATION_STATUS.md, docs/implementation/IMPLEMENTATION_BACKLOG.md, docs/implementation/NO_GO_RULES.md, shared/contracts/CONTRACT_GOVERNANCE.md, shared/contracts/CONTRACT_INVENTORY.md, shared/contracts/openapi/clinmira-api.v1.json, docs/architecture/03_FRONTEND_REQUIRED_UPDATES.md, docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md, docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md, and docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md.

Implement Step 17B only as Frontend Contract Inventory and Typed API Client Foundation. Add frontend-local typed API client scaffolding for approved health and Step 8B simulation HTTP routes, contract inventory mapping, normalized errors, temporary non-production actor context helper, idempotency key helper, and unit/guard tests. Do not wire any UI route, do not implement a replay reducer, do not open SSE, do not add Playwright route flows, do not import backend DTOs, do not use frontend mock data or localStorage simulation state as truth, and do not modify backend routes, shared contracts, migrations, seeds, packages, env files, Docker Compose, Prisma/ORM, OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, or real patient data.
```
