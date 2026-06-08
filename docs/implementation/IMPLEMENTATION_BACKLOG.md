# ClinMira AI Implementation Backlog

This backlog sequences future work according to the architecture gates. It is a control artifact, not permission to implement every step immediately.

Each task is atomic. Do not merge steps. Do not continue beyond one task without a separate user request and a separate architecture review.

## Roadmap Numbering Correction - Step 13R

Step 13 was used and accepted as Feature-Flag Scaffolding for Live Provider Controls after the Step 12 official source-refresh plan. This supersedes the historical backlog numbering that labeled Step 13 as Realtime Gateway with Replay.

Recommended reconciliation: Option C - keep Step 13 as the accepted feature-flag scaffolding step, record Step 13R as the architecture review and roadmap numbering reconciliation gate, continue with Step 14 as Provider Boundary Test Doubles, and defer the historical realtime step to Step 15 unless a later architecture review inserts or renames additional safe provider-preparation steps.

This correction does not unblock live OpenAI, live agents, realtime, frontend integration, Redis runtime, WebSocket/SSE runtime, Temporal runtime, production publisher/replay API, debrief, faculty workflow, treatment advice, imaging workflow, or production auth/RBAC.

## Step 15R Review Update - Step 16 Evidence Gate

Step 15R accepted Step 15 as a backend replay/SSE foundation with warnings. Because DB-backed replay/eval evidence has not run without `CLINMIRA_TEST_DATABASE_URL`, the next implementation step is inserted as:

Step 16 - DB-backed Replay and Safety Integration Evidence.

This supersedes the historical backlog section that labeled Step 16 as Frontend API Client and Contracts. Frontend API client/contracts work remains required, but it is deferred until DB-backed replay and safety evidence exists and a later review reconciles post-Step-16 numbering.

This correction does not unblock frontend integration, live OpenAI, live agents, Redis/WebSocket fanout, Temporal runtime, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, or production realtime readiness.

## Step 16R Review Update - Step 17A Planning Gate

Step 16R accepted Step 16 as local host-runtime DB-backed replay and safety evidence with warnings. The next allowed task is not direct frontend implementation.

The next inserted gate is:

Step 17A - Post-Step-16 Backend/Frontend Contract and Integration Planning.

Step 17A is planning/review only. It must define exact frontend integration prerequisites, allowed API/replay contracts, typed client/reducer test requirements, role-filtering expectations, route-valid synthetic actor/case fixture policy, and no-go conditions.

This correction does not unblock frontend implementation, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal runtime, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, package installs, migration edits, seed edits, env edits, Docker Compose runtime, Prisma/ORM, or production realtime readiness.

## Step 17A Review Update - Step 17B Typed Client Foundation Gate

Step 17A completed backend/frontend contract and integration planning. It approves only one narrow next implementation slice:

Step 17B - Frontend Contract Inventory and Typed API Client Foundation.

Step 17B is frontend foundation work only. It may add frontend-local typed API client scaffolding for approved health and Step 8B simulation HTTP routes, contract inventory mapping, normalized errors, temporary non-production actor context handling, idempotency helpers, and unit/guard tests.

This correction does not unblock route UI wiring, replay reducers, SSE consumption, Playwright route flows, backend route changes, shared contract changes, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal runtime, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, package installs, migration edits, seed edits, env edits, Docker Compose runtime, Prisma/ORM, real patient data, or production realtime readiness.

## User-Approved Step 17B-D Docker Isolation Gate

Step 17B-C completed the required typed API client route/path/method correction with warnings. Before the Step 17B-C-R review and before any Step 17C reducer work, the user approved an intermediate isolated local dev/test Docker stack:

Step 17B-D - Isolated Docker Dev/Test Stack and ClinMira Ops Update.

This gate authorizes Docker Compose only under `docker/clinmira-ai/` with project-specific names, localhost host bindings, isolated ports, isolated network, isolated volume, and no product/source/package/migration/seed/shared/existing-env/prod changes. It also authorizes updating `ClinMira-Ops.html` to ClinMira AI Ops.

Step 17B-D2 completed Docker runtime validation, local DB credential finalization, stale database compose guard correction, and Step 16 evidence against the Docker database. Step 17B-D-R should review Step 17B-D plus Step 17B-D2 before returning to Step 17B-C-R. Step 17B-C-R still remains required before Step 17C.

This correction does not unblock route UI wiring, replay reducers, SSE/EventSource consumption, Playwright route flows, backend routes, shared contract changes, package installs, migration edits, seed edits, existing env edits, production config, Prisma/ORM, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal runtime, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, real patient data, or production realtime readiness.

## Step 1 - Implementation Reset, Preflight Audit, and Playbook

| Field | Requirement |
| --- | --- |
| Purpose | Create strict implementation governance and preflight audit. |
| Prerequisites | Architecture docs available or missing docs explicitly listed as blockers. |
| Architecture docs to read | Docs 01-12. |
| Strict scope | `docs/implementation/` only. |
| Non-goals | No product code, APIs, migrations, agents, frontend UI, Docker, packages, or env changes. |
| Expected files/directories | `00_PREFLIGHT_AUDIT.md`, `IMPLEMENTATION_PLAYBOOK.md`, `IMPLEMENTATION_BACKLOG.md`, `CODEX_TASK_TEMPLATE.md`, `IMPLEMENTATION_STATUS.md`, `ARCHITECTURE_COMPLIANCE_CHECKLIST.md`, `NO_GO_RULES.md`. |
| Tests required | File-existence and scope validation. |
| Quality checks | `ls docs/architecture`, `ls docs/implementation`, `git status --short`. |
| Acceptance criteria | Seven docs exist, preflight verdict is explicit, no product code changed. |
| Stop conditions | Missing architecture docs without enough context, or request to modify product code. |
| Next step | Step 2. |

## Step 2 - Repository Cleanup Decision, If Needed

| Field | Requirement |
| --- | --- |
| Purpose | Decide whether previous partial work is kept, corrected, or manually reverted. |
| Prerequisites | Step 1 complete. |
| Architecture docs to read | Docs 04, 11, 12 and `00_PREFLIGHT_AUDIT.md`. |
| Strict scope | Documentation report under `docs/implementation/reports/` unless user explicitly approves cleanup. |
| Non-goals | No automatic deletion, reset, or source modification. |
| Expected files/directories | Cleanup decision report and optional approved cleanup plan. |
| Tests required | Scope scan confirming no product files changed unless approved. |
| Quality checks | `git status --short`, `git diff --stat`, targeted file inventory. |
| Acceptance criteria | User has a clear keep/correct/manual-revert recommendation for suspicious work. |
| Stop conditions | User approval missing for cleanup path. |
| Next step | Step 3 if cleanup approves skeleton path, otherwise approved cleanup task. |

## Step 3 - Backend/API Skeleton

| Field | Requirement |
| --- | --- |
| Purpose | Establish health-only NestJS API/BFF and backend folder boundaries. |
| Prerequisites | Step 2 complete or preflight says no cleanup needed. |
| Architecture docs to read | Docs 02, 04, 05, 07, 12. |
| Strict scope | Backend skeleton, health checks, package metadata if approved. |
| Non-goals | Clinical APIs, DB migrations, auth, realtime, agents, OpenAI, frontend integration. |
| Expected files/directories | `backend/api`, backend README, health controller/service tests. |
| Tests required | Health contract tests and typecheck/build if dependencies exist. |
| Quality checks | API unit tests, no clinical route scan, no migration scan. |
| Acceptance criteria | Health-only API starts/builds or missing dependency evidence is explicit. |
| Stop conditions | Task asks for product endpoints or database state. |
| Next step | Step 4. |

## Step 4 - Shared Contracts and Schema Governance

| Field | Requirement |
| --- | --- |
| Purpose | Establish contract-first source of truth across API, frontend, Python, events, Temporal, tools, and agents. |
| Prerequisites | Step 3 complete; cleanup decision resolved. |
| Architecture docs to read | Docs 02, 03, 04, 05, 07, 12. |
| Strict scope | Shared contracts, schema version constants, contract inventory, contract CI plan. |
| Non-goals | Clinical endpoints, DB migrations, frontend API integration, live agents. |
| Expected files/directories | `shared/contracts`, OpenAPI, TypeScript DTOs, Pydantic schema location, event contract inventory. |
| Tests required | Contract validation, DTO naming sync, OpenAPI/schema drift, TS/Python version sync. |
| Quality checks | Shared contract tests, typecheck, schema drift scans. |
| Acceptance criteria | Contract inventory and freshness policy exist before implementation depends on contracts. |
| Stop conditions | Frontend/backend integration requested before typed contracts. |
| Next step | Step 5. |

## Step 5 - Database Core and Migration Authority

| Field | Requirement |
| --- | --- |
| Purpose | Implement SQL-first migration authority and core institution/user/cohort/audit schema. |
| Prerequisites | Step 4 complete, migration operating procedure approved. |
| Architecture docs to read | Docs 02, 04, 05 ADR-028, 07, 08, 10, 12. |
| Strict scope | SQL migration authority, migration registry, institutions, users, roles, cohorts, enrollments, audit logs, minimal synthetic seed only if approved. |
| Non-goals | Cases, fact ledger, sessions, event log, agents, realtime, frontend integration. |
| Expected files/directories | SQL migrations, migration metadata, database tests, seed files if approved. |
| Tests required | Migration apply, rollback/forward-fix plan, drift, tenant isolation, idempotency/audit tests. |
| Quality checks | SQL review, no Prisma Migrate authority, no Python-generated migrations. |
| Acceptance criteria | SQL-first authority is enforceable and core schema is tenant-scoped. |
| Stop conditions | Migration authority unclear or ORM sync becomes schema authority. |
| Next step | Step 6. |

## Step 6 - Case Versioning and Fact Ledger

| Field | Requirement |
| --- | --- |
| Purpose | Add immutable case versions, patient twins, hidden/revealed facts, fact ledger, and context firewall foundations. |
| Prerequisites | Step 5 complete. |
| Architecture docs to read | Docs 01, 02, 06, 08, 12. |
| Strict scope | Cases, case_versions, patient_twins, hidden_facts, revealed_facts, fact_ledger, reveal-rule contracts. |
| Non-goals | Session engine, live agents, debrief generation, frontend UI. |
| Expected files/directories | SQL migrations, contract schemas, backend services/tests if approved. |
| Tests required | Hidden fact filtering, tenant isolation, fact grounding, reveal-rule tests. |
| Quality checks | No hidden facts in student payloads, no unsupported clinical truth. |
| Acceptance criteria | Every clinical fact can be grounded and role-filtered. |
| Stop conditions | Context firewall missing or hidden fact leakage possible. |
| Next step | Step 7. |

## Step 7 - Event Log and Transactional Outbox

| Field | Requirement |
| --- | --- |
| Purpose | Make critical mutations durable, replayable, idempotent, and publishable after commit. |
| Prerequisites | Steps 4-6 complete; event catalog/replay contract approved. |
| Architecture docs to read | Docs 02, 03, 04, 07, 10, 12. |
| Strict scope | `event_log`, `outbox_events`, sequence assignment, idempotency, replay contract, no WebSocket yet. |
| Non-goals | Realtime gateway, Redis fanout, frontend reducer integration, live agents. |
| Expected files/directories | SQL migrations, replay contract, event schemas, outbox service/tests. |
| Tests required | Crash-after-commit, duplicate event, replay gap, role-redaction replay, idempotency. |
| Quality checks | No direct WebSocket/SSE truth path, PostgreSQL authoritative. |
| Acceptance criteria | Mutation/event/outbox transaction is atomic and replayable. |
| Stop conditions | Direct emit used as source of truth. |
| Next step | Step 8. |

## Step 8 - Mock Simulation Session Engine

| Field | Requirement |
| --- | --- |
| Purpose | Create deterministic session/action/message/timeline behavior using fact ledger and no live OpenAI. |
| Prerequisites | Steps 5-7 complete. |
| Architecture docs to read | Docs 01, 02, 03, 04, 06, 07, 12. |
| Strict scope | Create session, submit action, mock patient response, persist action/message/timeline, event writes. |
| Non-goals | Live agents, frontend integration, debrief, voice, imaging beyond placeholders. |
| Expected files/directories | Simulation services, repositories, contract tests, persistence tests. |
| Tests required | Determinism, idempotency, fact grounding, hidden fact denial, transaction/event tests. |
| Quality checks | No live OpenAI calls, no frontend leakage, no unsupported clinical facts. |
| Acceptance criteria | Mock responses are grounded only in allowed facts. |
| Stop conditions | Fact ledger or outbox unavailable. |
| Next step | Step 9. |

## Step 9 - Initial Eval Harness

| Field | Requirement |
| --- | --- |
| Purpose | Establish eval evidence before live agents. |
| Prerequisites | Step 8 complete. |
| Architecture docs to read | Docs 01, 06, 08, 10, 12. |
| Strict scope | Golden cases, hidden fact leakage suite, unsupported claim tests, fixture storage. |
| Non-goals | Live model routing, production dashboards, faculty calibration workflow. |
| Expected files/directories | Eval fixtures, harness scripts, reports, versioned suite metadata. |
| Tests required | Eval smoke tests and release-blocking thresholds. |
| Quality checks | Hidden fact leakage critical rate equals `0`. |
| Acceptance criteria | Eval harness can block live-agent work. |
| Stop conditions | No stored eval evidence. |
| Next step | Step 10. |

## Step 10 - Deterministic Safety Engine

| Field | Requirement |
| --- | --- |
| Purpose | Prevent unsafe accepted treatment and unsafe state mutation. |
| Prerequisites | Steps 6, 8, 9 complete. |
| Architecture docs to read | Docs 01, 06, 08, 12. |
| Strict scope | Safety rules, pre/post checks, warnings, blocks, faculty triggers, tests. |
| Non-goals | Live agents, debrief, scenario publish. |
| Expected files/directories | Safety engine modules, rule fixtures, tests, contracts. |
| Tests required | Unsafe accepted treatment equals `0`, prompt injection bypass equals `0`, rollback tests. |
| Quality checks | Blocked actions mutate nothing unsafe. |
| Acceptance criteria | Unsafe actions fail closed and are audited. |
| Stop conditions | Treatment path can bypass safety. |
| Next step | Step 11. |

## Step 11 - Python Agent Runtime Skeleton

| Field | Requirement |
| --- | --- |
| Purpose | Add mock-agent runtime boundaries without live model calls. |
| Prerequisites | Steps 4, 9, 10 complete. |
| Architecture docs to read | Docs 01, 04, 05, 06, 08, 10, 12. |
| Strict scope | Python runtime skeleton, mock agents, Pydantic contracts, disabled live path. |
| Non-goals | OpenAI network calls, autonomous swarm, direct DB mutation. |
| Expected files/directories | `backend/agent-worker`, contracts, tests. |
| Tests required | Contract tests, mock behavior tests, feature flag fail-closed tests. |
| Quality checks | Live calls impossible by default. |
| Acceptance criteria | Agent runtime can execute mock paths only. |
| Stop conditions | Live OpenAI path introduced. |
| Next step | Step 12. |

## Step 12 - Official Source Refresh and Live-Agent Planning

| Field | Requirement |
| --- | --- |
| Purpose | Refresh official OpenAI sources and define the future live-provider plan without implementation. |
| Prerequisites | Steps 4-11 complete with eval, safety, and mock-agent evidence. |
| Architecture docs to read | Docs 01, 05 source refresh, 06, 08, 10, 12. |
| Strict scope | Official source review, architecture plan, future flags/cost/trace/eval gates, no runtime behavior. |
| Non-goals | OpenAI SDK install, OpenAI calls, API key reads, live agents, provider runtime, active provider schemas. |
| Expected files/directories | `docs/architecture/13_OPENAI_SOURCE_REFRESH_AND_LIVE_AGENT_PLAN.md`, Step 12 report, status update. |
| Tests required | Existing worker/API/contracts/database/eval checks; forbidden implementation scans. |
| Quality checks | Official sources only, no SDK/calls/API keys, no runtime/provider/frontend/migration changes. |
| Acceptance criteria | Future Responses API/provider-boundary decision is documented and live implementation remains blocked. |
| Stop conditions | Any request to install SDK, read keys, call OpenAI, or enable live runtime. |
| Next step | Step 13. |

## Step 13 - Feature-Flag Scaffolding for Live Provider Controls

| Field | Requirement |
| --- | --- |
| Purpose | Add fail-closed configuration declarations and safe status reporting for future live-provider controls. |
| Prerequisites | Step 12 complete; no live provider implementation approved. |
| Architecture docs to read | Docs 01, 06, 08, 10, 12, and `13_OPENAI_SOURCE_REFRESH_AND_LIVE_AGENT_PLAN.md`. |
| Strict scope | Python worker feature flag parsing, safe status/health reporting, disabled-provider tests. |
| Non-goals | OpenAI SDK, OpenAI imports/calls, API key reads, live agents, provider runtime, network calls, tool execution, active provider schemas. |
| Expected files/directories | `backend/agent-worker/src/clinmira_agent_worker/feature_flags.py`, worker tests, Step 13 report, status update. |
| Tests required | Defaults off, kill switch true, zero budget/token/timeout block, empty allowlist block, all env flags still block without evidence, no secret reads. |
| Quality checks | No OpenAI package/import/call/API-key read, no network client, no direct worker DB mutation, no frontend/backend/migration/realtime drift. |
| Acceptance criteria | Live provider remains disabled and status exposes only safe blocked metadata. |
| Stop conditions | Any live provider enablement, OpenAI dependency, API key use, or runtime network path. |
| Next step | Step 13R. |

## Step 13R - Architecture Review and Roadmap Numbering Reconciliation

| Field | Requirement |
| --- | --- |
| Purpose | Review Step 13 and reconcile roadmap numbering without implementation. |
| Prerequisites | Step 13 complete. |
| Architecture docs to read | Docs 01, 06, 08, 10, 12, `13_OPENAI_SOURCE_REFRESH_AND_LIVE_AGENT_PLAN.md`, playbook, backlog, checklist, no-go rules. |
| Strict scope | Review report, status update, documentation-only backlog correction if needed. |
| Non-goals | Provider boundary test doubles, SDK install, OpenAI calls, API keys, realtime, frontend, API runtime, migrations. |
| Expected files/directories | `docs/implementation/reports/STEP_13R_ARCHITECTURE_REVIEW_REPORT.md`, status update, optional backlog correction. |
| Tests required | Safe existing regression checks and static no-go scans. |
| Quality checks | No runtime code, frontend, API runtime, migration, package, env, compose, Redis/realtime, Temporal, or OpenAI changes. |
| Acceptance criteria | Review verdict is explicit and next step name is unambiguous. |
| Stop conditions | Missing required docs, review failure, or need for runtime changes. |
| Next step | Step 14 if review passes. |

## Step 14 - Provider Boundary Test Doubles

| Field | Requirement |
| --- | --- |
| Purpose | Define a narrow provider boundary using deterministic fake/test-double behavior only. |
| Prerequisites | Step 13R passed; live provider remains disabled. |
| Architecture docs to read | Docs 01, 06, 08, 10, 12, and `13_OPENAI_SOURCE_REFRESH_AND_LIVE_AGENT_PLAN.md`. |
| Strict scope | Interface/test-double contracts inside the Python worker only if explicitly approved. |
| Non-goals | OpenAI SDK, OpenAI calls, API key reads, network calls, active provider runtime, real provider schemas, frontend, API runtime, migrations. |
| Expected files/directories | Worker provider-boundary interface and deterministic fake tests if approved by a separate task. |
| Tests required | Budget, timeout, kill-switch, refusal, trace redaction, schema validation, and safety-pre/post behavior using fake data only. |
| Quality checks | Fake provider cannot call network, read secrets, write DB, or enable live mode. |
| Acceptance criteria | Future provider shape is testable while live calls remain impossible. |
| Stop conditions | Any SDK install, API key access, network path, live provider enablement, or runtime OpenAI call. |
| Next step | Step 15 or a separately approved provider-preparation substep. |

## Step 15 - Realtime Gateway with Replay

| Field | Requirement |
| --- | --- |
| Purpose | Add realtime after durable event log/outbox/replay is proven and explicitly approved. |
| Prerequisites | Step 7 complete, replay tests pass, and Step 13R roadmap review accepted the renumbering. |
| Architecture docs to read | Docs 02, 03, 07, 10, 12. |
| Strict scope | WebSocket/SSE gateway, replay handshake, Redis coordination if approved, no source-of-truth Redis. |
| Non-goals | Direct WebSocket truth, frontend full integration, voice, live agents. |
| Expected files/directories | Realtime gateway, replay tests, metrics. |
| Tests required | Reconnect replay, sequence gaps, duplicate handling, role redaction. |
| Quality checks | Event replay success target and no hidden facts in student streams. |
| Acceptance criteria | Realtime recovers from disconnect via durable replay. |
| Stop conditions | Outbox/event log/replay evidence missing, or Redis becomes source of truth. |
| Next step | Step 16. |

## Step 16 - DB-backed Replay and Safety Integration Evidence

| Field | Requirement |
| --- | --- |
| Purpose | Prove existing mock simulation, deterministic safety, event log, outbox, replay, redaction, cursor, reconnect, gap/duplicate, and idempotency behavior against a safe migrated PostgreSQL test database. |
| Prerequisites | Step 15R accepted; safe `CLINMIRA_TEST_DATABASE_URL` available or absence reported honestly. |
| Architecture docs to read | Docs 02, 07, 08, 10, 12, Step 15R report, playbook, no-go rules. |
| Strict scope | DB-backed evidence, test fixtures, integration tests, report/status update. Exercise existing routes and migrations only. |
| Non-goals | Frontend integration, frontend API client, production publisher, Redis/WebSocket fanout, Temporal, live OpenAI, live agents, provider runtime, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow. |
| Expected files/directories | Integration evidence/tests if approved, Step 16 report, implementation status update. |
| Tests required | Migration apply/verification for `0001` through `0005`, synthetic seed/setup, create session, submit safe action, safety block replay, idempotent action replay, event log/outbox persistence, replay reconnect cursor, duplicate/gap handling where feasible, student redaction. |
| Quality checks | No hidden fact leakage, no frontend/localStorage/mock source usage, PostgreSQL remains source of truth, outbox remains durable queue, SSE remains delivery-only. |
| Acceptance criteria | DB-backed evidence proves or explicitly blocks replay/safety reliability claims; skipped DB checks are not faked. |
| Stop conditions | No safe database and task requires DB-backed proof, hidden fact leakage, unsafe mutation, frontend integration request, Redis/WebSocket truth path, migration drift, or live provider request. |
| Next step | Post-Step-16 review and roadmap-numbering reconciliation before frontend contract/client work. |

## Step 17A - Post-Step-16 Backend/Frontend Contract and Integration Planning

| Field | Requirement |
| --- | --- |
| Purpose | Plan the first safe frontend/backend integration slice after DB-backed replay and safety evidence. |
| Prerequisites | Step 16R accepted Step 16 with warnings. |
| Architecture docs to read | Docs 03, 07, 08, 10, 12, shared contract governance/inventory, Step 16R report. |
| Strict scope | Planning/report/status only. Define frontend typed contract strategy, reducer/replay requirements, role filtering, route-valid fixture policy, and no-go conditions. |
| Non-goals | Frontend implementation, API clients, reducers, Playwright tests, new backend routes, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow. |
| Expected files/directories | Step 17A planning report and implementation status/backlog updates only. |
| Tests required | Review-only checks and forbidden implementation scans. No product tests unless a command is needed to validate current evidence. |
| Quality checks | No product code, frontend code, package, migration, seed, env, Compose, Prisma, OpenAI, Redis/WebSocket, Temporal, publisher, or auth/RBAC change. |
| Acceptance criteria | Direct frontend implementation has a clear, narrow next task or remains blocked with named prerequisites. |
| Stop conditions | Any request to implement frontend integration, infer contracts from mock data, use frontend/localStorage as truth, or weaken hidden-fact/replay/safety gates. |
| Next step | Step 17 frontend contract/client foundation only if Step 17A explicitly approves a narrow implementation slice. |

## Step 17B - Frontend Contract Inventory and Typed API Client Foundation

| Field | Requirement |
| --- | --- |
| Purpose | Add a narrow frontend typed API client foundation without route UI integration. |
| Prerequisites | Step 17A complete and accepted with warnings. |
| Architecture docs to read | Docs 03, 07, 08, 12, shared contract governance/inventory, OpenAPI, Step 17A report. |
| Strict scope | Frontend-local typed API client scaffolding for approved health and Step 8B simulation HTTP routes; contract inventory mapping; normalized errors; temporary non-production actor context helper; idempotency key helper; unit/guard tests; Step 17B report/status update. |
| Non-goals | Route UI wiring, replay reducer, SSE client, Playwright route flows, backend route changes, shared contract changes, migrations, seeds, package installs, env edits, Docker Compose runtime, Prisma/ORM, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, real patient data. |
| Expected files/directories | `frontend/lib/api/client.ts`, `frontend/lib/api/contracts.ts`, `frontend/lib/api/errors.ts`, `frontend/lib/api/actor-context.ts`, `frontend/lib/api/idempotency.ts`, `frontend/lib/simulation/session-api.ts`, frontend-local tests using existing tooling, Step 17B report, status update. |
| Tests required | API client unit tests, contract inventory guard, no mock-data/localStorage truth guard, no backend DTO import guard, idempotency helper test, temporary actor header test, normalized error tests, existing regression checks where safe. |
| Quality checks | No imports from `backend/api/src/**`, `frontend/lib/mock-data.ts`, `frontend/lib/simulation-engine.ts`, or `frontend/lib/simulation-storage.ts`; no OpenAI, Redis/WebSocket, Temporal, provider runtime, package, migration, seed, env, Compose, or Prisma changes. |
| Acceptance criteria | Frontend has a typed client boundary for approved routes only, tests prove it cannot consume prototype truth or unapproved routes, and broad integration remains blocked for a later reducer/route task. |
| Stop conditions | Need for backend DTO imports, missing route-valid fixture policy for tests that call the backend, request to wire UI, request to open SSE, request to add packages, request to edit contracts/backend/database/env, or any hidden-fact/mock-state source-of-truth risk. |
| Next step | Step 17C - Frontend Replay Reducer Foundation only after Step 17B review accepts the client foundation. |

## Step 17B-R - Frontend Contract Typed API Client Foundation Architecture Review

| Field | Requirement |
| --- | --- |
| Purpose | Review Step 17B before any reducer, SSE, or route UI work begins. |
| Prerequisites | Step 17B complete with report, guard tests, and status update. |
| Architecture docs to read | Docs 03, 07, 08, 12, shared contract governance/inventory, OpenAPI, Step 17A report, Step 17B report. |
| Strict scope | Review/report/status only. Produce correction list and go/no-go decision. |
| Non-goals | Product code changes, frontend route wiring, replay reducer, SSE client, Playwright route flows, backend/shared/database changes, packages, env, Compose, Prisma, live OpenAI, live agents, provider runtime, Redis/WebSocket, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, real patient data. |
| Expected files/directories | `docs/implementation/reports/STEP_17B_R_FRONTEND_CONTRACT_TYPED_API_CLIENT_FOUNDATION_REVIEW_REPORT.md`, `docs/implementation/IMPLEMENTATION_STATUS.md`, and backlog update only if the review changes the next gate. |
| Tests required | Review may rerun Step 17B guard tests and static scans. Do not add new implementation tests unless correcting documentation-only evidence. |
| Quality checks | Confirm no imports from backend source or frontend prototype truth, no hidden/prototype DTO exposure, no replay/SSE runtime consumer, no OpenAI/Redis/WebSocket/Temporal/provider runtime, and no package/env/backend/shared drift. |
| Acceptance criteria | Step 17B is accepted or a precise correction list exists. Step 17C remains blocked unless review accepts Step 17B. |
| Stop conditions | Any need to change implementation code, any hidden fact leak risk, any unapproved route wrapper, any UI wiring request, any backend/shared/package/env change request. |
| Next step | Step 17B-C route gate correction was required by this review and has since been completed. Current next gate is Step 17B-C-R review before Step 17C. |

## Step 17B-C - Frontend Typed API Client Route Gate Correction

| Field | Requirement |
| --- | --- |
| Purpose | Correct the Step 17B public client route/path/method bypass before any replay reducer work begins. |
| Prerequisites | Step 17B-R complete and finding accepted. |
| Architecture docs to read | Docs 03, 07, 08, 12, shared contract governance/inventory, OpenAPI, Step 17B report, Step 17B-R report. |
| Strict scope | Correct approved route template/path/method enforcement in the frontend API client and tests only. Produce correction report and status update. |
| Non-goals | Route UI wiring, replay reducer, replay client, SSE/EventSource client, Playwright route flows, React components, backend/shared/database changes, packages, env, Compose, Prisma, live OpenAI, live agents, provider runtime, Redis/WebSocket, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, real patient data. |
| Expected files/directories | `frontend/lib/api/client.ts`, `frontend/lib/api/contract-inventory.ts` only if needed for lookup helpers, `frontend/lib/api/typed-api-client.test.mjs`, `docs/implementation/reports/STEP_17B_C_FRONTEND_TYPED_API_CLIENT_ROUTE_GATE_CORRECTION_REPORT.md`, `docs/implementation/IMPLEMENTATION_STATUS.md`, and backlog update only if the next gate changes. |
| Tests required | Existing Step 17B guard suite; new tests proving arbitrary `path` override fails before fetch and method mismatch fails before fetch; direct frontend `tsc`; frontend lint/build where available; forbidden scans. |
| Quality checks | Public client cannot call unapproved routes by pairing approved templates with arbitrary paths. Public client cannot use methods that differ from inventory. No replay/SSE wrapper appears. No backend DTO, frontend mock, localStorage truth, OpenAI, Redis/WebSocket, Temporal, provider runtime, package/env/backend/shared drift. |
| Acceptance criteria | Route/path/method bypass is closed and tested. Step 17C may be reconsidered only after correction evidence passes. |
| Stop conditions | Need to modify backend/shared/contracts/packages/env/migrations/seeds, request to add reducer/UI/SSE/Playwright, or inability to close bypass without broader contract changes. |
| Next step | Step 17B-C-R - Frontend Typed API Client Route Gate Correction Architecture Review. Step 17C remains blocked until that review accepts the correction. |

## Step 17B-C-R - Frontend Typed API Client Route Gate Correction Architecture Review

| Field | Requirement |
| --- | --- |
| Purpose | Review Step 17B-C before any replay reducer, replay client, SSE, or route UI work begins. |
| Prerequisites | Step 17B-C complete with correction report, guard tests, validation evidence, and status update. |
| Architecture docs to read | Docs 03, 07, 08, 12, shared contract governance/inventory, OpenAPI, Step 17A report, Step 17B report, Step 17B-R report, Step 17B-C report. |
| Strict scope | Review/report/status only. Produce correction acceptance or a precise correction list. |
| Non-goals | Product code changes, route UI wiring, replay reducer, replay client, SSE/EventSource client, Playwright route flows, React components, backend/shared/database changes, packages, env, Compose, Prisma, live OpenAI, live agents, provider runtime, Redis/WebSocket, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, real patient data. |
| Expected files/directories | `docs/implementation/reports/STEP_17B_C_R_FRONTEND_TYPED_API_CLIENT_ROUTE_GATE_CORRECTION_REVIEW_REPORT.md`, `docs/implementation/IMPLEMENTATION_STATUS.md`, and backlog update only if the review changes the next gate. |
| Tests required | Review may rerun Step 17B-C guard tests, direct frontend `tsc`, frontend lint/build where available, and static forbidden scans. Do not add implementation tests unless the review is explicitly converted into a correction task. |
| Quality checks | Confirm public client cannot pair approved templates with arbitrary paths, methods must match inventory, invalid calls fail before `fetch`, valid wrappers still work, no replay/SSE wrapper appears, and no backend DTO, frontend mock, localStorage truth, OpenAI, Redis/WebSocket, Temporal, provider runtime, package/env/backend/shared drift exists. |
| Acceptance criteria | Step 17B-C is accepted or a precise correction list exists. Step 17C remains blocked unless review explicitly accepts the correction and defines the reducer-only scope. |
| Stop conditions | Any need to change implementation code, any route/path/method bypass still possible, any hidden fact/mock-state source-of-truth risk, any UI/reducer/SSE/Playwright request, or any backend/shared/package/env change request. |
| Next step | Step 17B-D-R is currently inserted before this review. After Step 17B-D-R, return to Step 17B-C-R. Step 17C remains blocked until Step 17B-C-R accepts the correction and status explicitly approves reducer scope. |

## Step 17B-D - Isolated Docker Dev/Test Stack and ClinMira Ops Update

| Field | Requirement |
| --- | --- |
| Purpose | Create an isolated local Docker dev/test stack and update `ClinMira-Ops.html` to ClinMira AI ops without touching product behavior. |
| Prerequisites | Step 17B-C complete with warnings and user approval for this standalone Docker isolation gate. |
| Architecture docs to read | Docs 02, 03, 07, 08, 10, 12, implementation playbook/status/backlog/no-go docs, Step 17A/17B/17B-R/17B-C reports, Step 16A and Step 16 reports. |
| Strict scope | `docker/clinmira-ai/**`, `.dockerignore`, `ClinMira-Ops.html`, Step 17B-D report, status update, and backlog update only if needed. |
| Non-goals | Step 17C, route UI wiring, replay reducer/client, SSE/EventSource, Playwright route flows, backend routes, shared contracts/OpenAPI, package changes, migration edits, seed edits, existing env edits, production config, Prisma/ORM, OpenAI, live agents, provider runtime, Redis/WebSocket, Temporal, production publisher/auth, debrief/faculty/treatment/order/imaging workflow, real patient data. |
| Expected files/directories | `docker/clinmira-ai/docker-compose.yml`, Dockerfiles, `.env.example`, README, setup script, `.dockerignore`, `ClinMira-Ops.html`, Step 17B-D report, status update. |
| Tests required | Docker config, build/start when Docker is available, setup-db migration/seed run, health checks, forbidden scans, existing frontend/backend/shared/database/eval/worker checks where safe. |
| Quality checks | All Docker commands scoped by project and compose file; no default host ports, no host networking, no broad Docker cleanup, no Step 16A disturbance, no forbidden product/source/package/migration/seed/env/shared changes. |
| Acceptance criteria | Stack files exist, isolation names/ports are correct, ops page is ClinMira-branded, no false services are claimed, and any runtime/build blockers are explicitly documented. |
| Stop conditions | Docker unavailable, port conflicts cannot be resolved, stack requires forbidden product/package/migration/seed/env changes, secrets would be committed, Step 16A would be modified, or forbidden runtime/workflow is introduced. |
| Next step | Step 17B-D2 completed runtime validation. Step 17B-D-R remains the next review gate. |

## Step 17B-D2 - Docker Runtime Validation, DB Credential Finalization, and Test-Guard Correction

| Field | Requirement |
| --- | --- |
| Purpose | Finalize the local Docker DB credential file, validate the current Docker runtime stack, correct stale database compose guards, and produce Step 16 evidence against the Docker database. |
| Prerequisites | Step 17B-D complete with warnings and Docker stack files present under `docker/clinmira-ai/`. |
| Architecture docs to read | Docs 02, 03, 07, 08, 10, 12, implementation playbook/status/backlog/no-go docs, Step 17B-D report, Step 16/16A/16R reports. |
| Strict scope | `docker/clinmira-ai/.env`, `.env.example`, README, compose/Dockerfiles only as needed for runtime correction, `.gitignore`, `.dockerignore`, `ClinMira-Ops.html`, stale `backend/database/tests/**` compose guards, Step 17B-D2 report, status/backlog updates. |
| Non-goals | Product code, frontend app source, backend API source/routes, agent runtime, shared contracts/OpenAPI, package/lockfile changes, migrations, seeds, production config, Prisma/ORM, OpenAI, live agents, provider runtime, Redis/WebSocket, Temporal, production publisher/auth, debrief/faculty/treatment/order/imaging workflow, real patient data. |
| Expected files/directories | `docs/implementation/reports/STEP_17B_D2_DOCKER_RUNTIME_VALIDATION_DB_CREDENTIAL_REPORT.md`, gitignored `docker/clinmira-ai/.env`, Docker doc/runtime corrections if needed, database guard-test corrections if needed, status/backlog updates. |
| Tests required | Compose config/build/up/ps/logs, setup-db, PostgreSQL health/identity/schema/table/seed probes, API/frontend health, Step 16 DB-backed evidence against Docker DB, database guard tests, backend API tests/typecheck/build, shared tests, frontend typed-client guard test, eval tests/runner, worker tests, forbidden scans. |
| Quality checks | Secrets are never printed or committed; commands use `--env-file docker/clinmira-ai/.env`; only `docker/clinmira-ai/docker-compose.yml` is allowed; no Step 16A disturbance; no forbidden runtime or product behavior drift. |
| Acceptance criteria | Docker stack is healthy on ports `41730`, `41731`, and `55433`; migrations/seeds apply; Step 16 evidence passes against Docker DB; stale compose guards pass; report/status are updated. |
| Stop conditions | Need to modify product source, packages, migrations, seeds, shared contracts, frontend app source, production config, Step 16A DB, or any forbidden runtime; inability to keep secrets local-only; unsafe Docker cleanup required. |
| Next step | Step 17B-D-R - review Step 17B-D and Step 17B-D2 before returning to Step 17B-C-R. |

## Step 17B-D-R - Isolated Docker Dev/Test Stack Architecture Review

| Field | Requirement |
| --- | --- |
| Purpose | Review Step 17B-D and Step 17B-D2 isolation, scope, Docker safety, credential handling, ops page claims, stale guard correction, and runtime evidence before returning to frontend review gates. |
| Prerequisites | Step 17B-D and Step 17B-D2 complete with reports/status updates. |
| Architecture docs to read | Docs 02, 03, 07, 08, 10, 12, implementation playbook/status/backlog/no-go docs, Step 17B-D report, Step 17B-D2 report. |
| Strict scope | Review report/status update only, plus rerunning scoped Docker validation commands if useful. |
| Non-goals | Product code changes, route UI wiring, replay reducer/client, SSE/EventSource, backend/shared/database/package/env/prod changes, OpenAI, live agents, provider runtime, Redis/WebSocket, Temporal, production publisher/auth, debrief/faculty/treatment/order/imaging workflow, real patient data. |
| Expected files/directories | Step 17B-D-R review report, status update, backlog update only if sequencing changes. |
| Tests required | Rerun or review Step 17B-D2 compose build/up/ps/logs/setup-db/health/DB identity/schema/Step16 evidence, forbidden scans, and relevant existing checks. |
| Quality checks | No unrelated containers stopped/changed; no Step 16A disturbance; no broad Docker cleanup; no committed secrets; no false ops services; no product behavior drift. |
| Acceptance criteria | Step 17B-D plus Step 17B-D2 are accepted or a precise correction list exists. Return to Step 17B-C-R after review acceptance. |
| Stop conditions | Review discovers source/package/migration/seed/env/prod drift, unsafe Docker cleanup, port collision, Step 16A interference, or forbidden runtime additions. |
| Next step | Step 17B-C-R after Step 17B-D-R accepts the Docker gate. Step 17C remains blocked until Step 17B-C-R accepts the route correction. |

## Deferred Former Step 16 - Frontend API Client and Contracts

This frontend contract/client step remains required but is deferred until Step 16 DB-backed Replay and Safety Integration Evidence passes or is explicitly reviewed. Do not start frontend integration from this backlog without a fresh review gate.

Historical purpose: replace mock assumptions with typed contract-driven API clients, generated/shared contracts, request helpers, contract drift tests, and no route-wide integration unless scoped.

## Step 17 - Virtual Clinic Backend Integration

| Field | Requirement |
| --- | --- |
| Purpose | Integrate Virtual Clinic route with backend session/action/replay safely. |
| Prerequisites | Steps 8, 15, and 16 complete. |
| Architecture docs to read | Docs 03, 04, 07, 08, 10, 12. |
| Strict scope | Route-by-route integration with reducer and component states. |
| Non-goals | Live agents, debrief, scenario publish. |
| Expected files/directories | Frontend route/client/reducer tests. |
| Tests required | Reducer determinism, reconnect replay, safety rollback, hidden fact denial, Playwright. |
| Quality checks | Student UI never receives hidden facts. |
| Acceptance criteria | Backend integration does not regress critical UI states. |
| Stop conditions | Reducer/replay tests absent. |
| Next step | Step 18. |

## Step 18 - Imaging Mock Service

| Field | Requirement |
| --- | --- |
| Purpose | Add synthetic curated imaging flow with approvals and visibility. |
| Prerequisites | Steps 6-8, 10, and 15 as relevant. |
| Architecture docs to read | Docs 01, 02, 06, 08, 09, 12. |
| Strict scope | Mock imaging orders/results/assets, approval flags, evidence ids. |
| Non-goals | Real DICOMweb compliance, unrestricted image generation, live agent diagnosis. |
| Expected files/directories | Imaging service, contracts, tests, synthetic assets metadata. |
| Tests required | Approval, visibility, fact grounding, event replay. |
| Quality checks | No unapproved imaging findings. |
| Acceptance criteria | Imaging is synthetic, approved, replayable, and grounded. |
| Stop conditions | Real imaging compliance claimed. |
| Next step | Step 19. |

## Step 19 - Evaluator and Debrief Engine

| Field | Requirement |
| --- | --- |
| Purpose | Add evidence-grounded scoring/debrief. |
| Prerequisites | Steps 6, 8-10, and 18 as relevant. |
| Architecture docs to read | Docs 01, 06, 08, 09, 12. |
| Strict scope | Evaluator rules, rubric evidence, debrief evidence ids, tests. |
| Non-goals | Unsupported teaching claims, live debrief model without gates. |
| Expected files/directories | Evaluator/debrief services, contracts, tests. |
| Tests required | Unsupported claim equals `0`, evidence id coverage, faculty review triggers. |
| Quality checks | Every debrief claim maps to approved evidence. |
| Acceptance criteria | Debrief cannot invent clinical teaching points. |
| Stop conditions | Evidence graph missing. |
| Next step | Step 20. |

## Step 20 - Faculty Review Workflow

| Field | Requirement |
| --- | --- |
| Purpose | Enforce backend review gates for publish, high-risk content, and overrides. |
| Prerequisites | Steps 5, 10, and 19 complete. |
| Architecture docs to read | Docs 06, 08, 09, 11, 12. |
| Strict scope | Review states, RBAC, audit, approval/rejection, bypass tests. |
| Non-goals | UI-only review gates, pilot claims. |
| Expected files/directories | Faculty review services, contracts, tests. |
| Tests required | Approval bypass, RBAC, audit, tenant isolation. |
| Quality checks | Backend enforces review state. |
| Acceptance criteria | Scenario/content/debrief gates cannot be bypassed. |
| Stop conditions | UI-only approval path. |
| Next step | Step 21. |

## Step 21 - Scenario Studio Backend

| Field | Requirement |
| --- | --- |
| Purpose | Add draft/version/publish backend workflow. |
| Prerequisites | Steps 6 and 20 complete. |
| Architecture docs to read | Docs 02, 06, 08, 09, 12. |
| Strict scope | Scenario drafts, validations, publish into immutable case version, faculty gate. |
| Non-goals | Real patient data, unrestricted content generation, frontend redesign. |
| Expected files/directories | Scenario services, migrations/contracts/tests. |
| Tests required | Publish gate, validation, version immutability, audit. |
| Quality checks | Synthetic-only and faculty-reviewed. |
| Acceptance criteria | Student-visible cases require approved publish flow. |
| Stop conditions | Publish bypass possible. |
| Next step | Step 22. |

## Step 22 - Agent Control Observability

| Field | Requirement |
| --- | --- |
| Purpose | Expose safe, redacted agent traces and system observability for faculty/admin. |
| Prerequisites | Steps 11-14 and security redaction policy complete. |
| Architecture docs to read | Docs 01, 05, 08, 10, 12. |
| Strict scope | Redacted trace views, RBAC, telemetry correlation, audit. |
| Non-goals | Raw hidden fact trace exposure, student access. |
| Expected files/directories | Observability APIs/UI integration/contracts/tests. |
| Tests required | RBAC, redaction, tenant isolation, trace correlation. |
| Quality checks | No raw prompts/hidden facts in unauthorized views. |
| Acceptance criteria | Agent Control is useful without leaking protected data. |
| Stop conditions | Redaction unproven. |
| Next step | Step 23. |

## Step 23 - Production Observability, Cost, and SLO

| Field | Requirement |
| --- | --- |
| Purpose | Add SLO/cost/replay/safety/faculty dashboards and alerts. |
| Prerequisites | Relevant product flows implemented and instrumented. |
| Architecture docs to read | Docs 02, 07, 08, 10, 12. |
| Strict scope | Metrics, traces, dashboards, alerts, cost telemetry, retention evidence. |
| Non-goals | Full production launch approval. |
| Expected files/directories | Observability config/docs/tests. |
| Tests required | Trace correlation, replay alert, cost alert, cardinality, redaction. |
| Quality checks | Dashboards meet doc 10 acceptance matrix. |
| Acceptance criteria | Pilot readiness can be objectively measured. |
| Stop conditions | Missing SLO dashboards for pilot. |
| Next step | Step 24. |

## Step 24 - Pilot Readiness Hardening

| Field | Requirement |
| --- | --- |
| Purpose | Prepare university pilot go/no-go packet. |
| Prerequisites | Steps 1-23 complete with evidence. |
| Architecture docs to read | Docs 08, 09, 10, 11, 12. |
| Strict scope | Pilot packet, accessibility, support, backup/restore, security, buyer/faculty evidence. |
| Non-goals | Production launch, compliance claims not implemented. |
| Expected files/directories | Pilot readiness report, evidence index, runbooks. |
| Tests required | Accessibility, security, restore, SLO, faculty calibration, support workflow. |
| Quality checks | No FHIR/DICOMweb/LTI compliance claim unless implemented and tested. |
| Acceptance criteria | Milestone 17.5 packet passes or explicitly blocks pilot. |
| Stop conditions | Any non-waivable gate fails. |
| Next step | Pilot go/no-go review, not automatic launch. |
