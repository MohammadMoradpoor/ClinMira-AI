# Step 02 Repository Cleanup Decision

Decision date: `2026-06-04`

Scope: repository cleanup decision and partial work classification only.

This report does not approve product implementation. It records whether existing partial work should be kept, corrected, deferred, or treated as blocked before future Codex tasks proceed.

## Executive Verdict

Verdict: `SAFE TO START STEP 3 WITH CORRECTIONS`.

Step 3 may start only as a backend API/BFF skeleton acceptance and correction task. The existing NestJS health-only skeleton can be used as the Step 3 starting point because no clinical APIs, database migrations, Redis runtime, WebSocket/SSE gateway, Temporal workflows, clinical business logic, or live OpenAI calls were found.

This verdict does not make later product work safe. Database, fact ledger, event log/outbox, mock session engine, eval harness, safety engine, Python agent runtime, realtime, frontend integration, faculty publish, debrief, pilot, live agents, and voice remain blocked until their named gates pass.

Primary decisions:

- `backend/api/`: keep and correct in Step 3.
- `shared/contracts/`: keep, but correct DTO/version drift in Step 4 before frontend/backend integration.
- `backend/agent-worker/`: keep as frozen health-only skeleton, defer expansion until Step 11.
- `frontend/`: keep as prototype only, not as backend contract, seed source, clinical truth, or integration authority.
- `backend/DOCKER_COMPOSE_PLAN.md`: keep as planning-only; no compose file is approved.
- Ignored local artifacts under `frontend/.next/`, `frontend/node_modules/`, and `frontend/tsconfig.tsbuildinfo`: do not touch in Step 2; optional manual cleanup may be requested separately.

## Evidence Reviewed

Architecture and governance docs reviewed:

- `docs/implementation/00_PREFLIGHT_AUDIT.md`
- `docs/implementation/IMPLEMENTATION_PLAYBOOK.md`
- `docs/implementation/IMPLEMENTATION_BACKLOG.md`
- `docs/implementation/CODEX_TASK_TEMPLATE.md`
- `docs/implementation/IMPLEMENTATION_STATUS.md`
- `docs/implementation/ARCHITECTURE_COMPLIANCE_CHECKLIST.md`
- `docs/implementation/NO_GO_RULES.md`
- `docs/architecture/02_BACKEND_DATABASE_ARCHITECTURE.md`
- `docs/architecture/03_FRONTEND_REQUIRED_UPDATES.md`
- `docs/architecture/04_IMPLEMENTATION_ROADMAP.md`
- `docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md`
- `docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md`
- `docs/architecture/11_ARCHITECTURE_REVIEW_SUMMARY.md`
- `docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md`

Repository evidence reviewed:

- `git status --short`
- `git diff --stat`
- `git diff --name-only`
- `find backend -maxdepth 3 -type f`
- `find shared -maxdepth 4 -type f`
- `find frontend -maxdepth 3 -type f`
- Scans for migrations, SQL files, compose files, Redis, WebSocket/SSE, live OpenAI usage, network calls, local storage, hidden facts, and mock data imports.
- Targeted reads of backend API skeleton, Python worker skeleton, shared contracts, frontend prototype data, frontend simulation engine, README files, and Docker compose planning note.

No tests or builds were run. Step 2 explicitly limits work to inspection and documentation, and tests/builds can modify generated files in this repository.

## Architecture Gate Basis

The cleanup decision is governed by these non-negotiable gates:

- ClinMira must not become a chatbot; LLM output is not clinical truth.
- PostgreSQL is the source of truth; frontend local state and Redis are not.
- Contracts must exist before integration.
- SQL-first migrations must own schema authority.
- Event log/outbox/replay must exist before realtime trust.
- Context firewall and fact ledger must exist before agents can handle hidden facts.
- Eval harness and deterministic safety must exist before live agents.
- Synthetic-only MVP remains mandatory.

## File-by-File Decision Table

| Path | Decision | Reason | Required Correction or Constraint |
| --- | --- | --- | --- |
| `README.md` | Correct in Step 3 docs pass | It says no backend APIs exist, but a health-only skeleton endpoint now exists. | Change wording to "no clinical APIs"; do not expand product claims. |
| `backend/README.md` | Keep | Accurately states backend skeleton is health-only and excludes clinical APIs, migrations, realtime, Temporal, live OpenAI, and business logic. | Keep aligned with Step 3 corrections. |
| `backend/DOCKER_COMPOSE_PLAN.md` | Keep as planning-only | It explicitly creates no compose file and warns against Redis truth, live OpenAI, and compose-driven migrations. | Do not create `docker-compose.yml` until database/outbox/Temporal gates approve it. |
| `backend/api/package.json` | Keep with Step 3 review | Package is private, health-skeleton scoped, and references shared contracts. | Do not install or add dependencies in Step 2. Step 3 may review scripts without broad package changes. |
| `backend/api/src/main.ts` | Keep with Step 3 correction option | Starts NestJS only; no routes beyond module wiring. | Step 3 may centralize API prefix/version policy if required. No auth, DB, Redis, OpenAI, or clinical route expansion. |
| `backend/api/src/app.module.ts` | Keep | Wires only health controller/service. | Keep health-only. |
| `backend/api/src/health/health.controller.ts` | Keep with Step 3 review | Exposes `/health` and `/api/v1/health` only. | Step 3 should verify versioning approach against OpenAPI. |
| `backend/api/src/health/health.service.ts` | Keep | Health response declares database not configured, clinical logic not implemented, live OpenAI disabled, and realtime not configured. | Continue using shared contract builder; no clinical checks. |
| `backend/api/test/health-contract.test.mjs` | Keep with Step 3/4 strengthening | Verifies skeleton contract and disabled feature flags. | Add stronger contract freshness checks in Step 3/4 if approved. |
| `backend/api/README.md` | Keep | Describes health-only API and excluded scope. | Keep wording consistent with root README. |
| `backend/api/tsconfig.json` | Keep | Configuration-only. | No Step 2 action. |
| `backend/api/tsconfig.build.json` | Keep | Configuration-only. | No Step 2 action. |
| `backend/api/nest-cli.json` | Keep | Nest skeleton configuration only. | No Step 2 action. |
| `backend/api/.env.example` | Keep with caution | Skeleton env file is acceptable if it contains no secrets and no live-agent defaults. | Do not add DB/OpenAI/Redis secrets until gated. |
| `backend/api/.gitignore` | Keep | Hygiene file. | No Step 2 action. |
| `backend/agent-worker/pyproject.toml` | Keep, defer | No dependencies and no OpenAI SDK. | Freeze until Step 11; no worker runtime expansion before contracts/evals/safety gates. |
| `backend/agent-worker/src/clinmira_agent_worker/__init__.py` | Keep, defer | States no live OpenAI integration or clinical business logic. | Keep frozen. |
| `backend/agent-worker/src/clinmira_agent_worker/main.py` | Keep, defer | CLI prints health response only and blocks unsafe flags through health builder. | No task queue, tools, agents, DB writes, or OpenAI calls until Step 11+. |
| `backend/agent-worker/src/clinmira_agent_worker/settings.py` | Keep, defer with warning | Live-agent flag is read but rejected by `assert_skeleton_safe`; risky features default disabled. | In Step 11, align feature flags with shared contracts and tenant-aware gating. |
| `backend/agent-worker/src/clinmira_agent_worker/health.py` | Correct in Step 11 or Step 4 if worker contracts are touched | Health response hardcodes `health-response.v1` instead of importing shared Python contract constant. | Replace duplication with shared version constant when Python contract package is wired. |
| `backend/agent-worker/tests/test_health.py` | Keep, defer | Tests disabled live-agent path and flag refusal. | Do not treat as eval/safety harness. |
| `backend/agent-worker/README.md` | Keep, defer | Describes skeleton and excludes OpenAI integration. | Keep aligned with Step 11 freeze. |
| `backend/agent-worker/.gitignore` | Keep | Hygiene file. | No Step 2 action. |
| `shared/contracts/package.json` | Keep with Step 4 review | Private package with contract tests/typecheck scripts. | Do not install or change packages in Step 2. |
| `shared/contracts/README.md` | Keep | States contracts must not be inferred from mock data. | Use as Step 4 governance input. |
| `shared/contracts/DTO_NAMING.md` | Correct in Step 4 | Naming rules are good, but current TS exports do not use DTO suffixes. | Align `HealthResponse`/`FeatureFlagSnapshot` with `HealthCheckResponseDto`/`FeatureFlagSnapshotDto` or update naming decision explicitly. |
| `shared/contracts/openapi/clinmira-api.v1.json` | Keep with Step 4 correction | Health-only OpenAPI is aligned in scope. | Step 4 should align component names, version constants, generated TS/Pydantic expectations, and freshness tests. |
| `shared/contracts/openapi/README.md` | Keep | Correctly states future DTOs must come from contracts, not mock data. | No Step 2 action. |
| `shared/contracts/src/schema-versions.ts` | Keep with Step 4 correction | Central TS constants exist. | Step 4 should ensure OpenAPI, JSON Schema, TS, Python, and worker imports share one version authority. |
| `shared/contracts/src/health-response.ts` | Correct in Step 4 | Exports `HealthResponse`, not the documented `HealthCheckResponseDto`. | Align naming or record ADR-level exception. |
| `shared/contracts/src/feature-flags.ts` | Correct in Step 4 | Exports `FeatureFlagSnapshot`, not the documented `FeatureFlagSnapshotDto`. | Align naming or record ADR-level exception. |
| `shared/contracts/src/index.ts` | Keep with Step 4 correction | Export surface is skeleton-only. | Update after DTO naming correction. |
| `shared/contracts/src/README.md` | Keep | Documents TS DTO and version location. | Keep aligned with Step 4 correction. |
| `shared/contracts/schemas/health-response.schema.json` | Keep with Step 4 review | Health schema is health-only and disabled-feature compatible. | Step 4 should verify schema names and references. |
| `shared/contracts/schemas/feature-flags.schema.json` | Keep with Step 4 review | Requires all risky skeleton flags to be `false`. | Keep as gate evidence for skeleton phases. |
| `shared/contracts/tests/contract-foundation.test.mjs` | Keep with Step 4 strengthening | Confirms health-only OpenAPI and disabled feature flags. | Add name/version drift checks in Step 4. |
| `shared/contracts/python/README.md` | Keep | Correctly reserves Pydantic schema location. | No clinical schemas before gates. |
| `shared/contracts/python/clinmira_contracts/versions.py` | Keep with Step 4/11 correction | Python constants exist but are not consumed by worker. | Wire worker to this source when Python contract package becomes active. |
| `shared/contracts/python/clinmira_contracts/__init__.py` | Keep | Package placeholder. | No Step 2 action. |
| `shared/contracts/python/clinmira_contracts/schemas/__init__.py` | Keep | Placeholder only, no clinical/event/tool/agent schemas. | No Step 2 action. |
| `shared/contracts/python/clinmira_contracts/schemas/README.md` | Keep | Correctly blocks premature clinical/event/tool/agent schemas. | No Step 2 action. |
| `frontend/package.json` | Keep as prototype-only | Frontend package supports UI prototype; no backend integration detected. | Do not use package scripts in Step 2. Do not add backend API integration before contracts. |
| `frontend/pnpm-lock.yaml` | Keep | Existing frontend lockfile. | Do not change packages in Step 2. |
| `frontend/README.md` | Keep with wording caution | Correctly states all data is synthetic mock and no backend API integration exists. | Future copy should avoid implying live agents are operational. |
| `frontend/types.ts` | Keep as prototype-only, correct before integration | Contains `hiddenDiagnosis` and `hiddenHistoryPrompt` in client-side types. | Must not become frontend/backend DTO source. Remove or role-split before any backend integration. |
| `frontend/lib/mock-data.ts` | Keep as prototype-only, high caution | Contains hidden diagnoses, synthetic patient facts, faculty/debrief mock data, and agent events. | Never use as backend seed, contract source, fact ledger source, or student API payload. |
| `frontend/lib/simulation-engine.ts` | Keep as prototype-only | Local deterministic simulation behavior exists but is not backend source-of-truth and lacks fact ledger/outbox. | Do not reuse as backend session engine. Backend Step 8 must implement governed mock runtime using fact ledger/outbox. |
| `frontend/lib/simulation-storage.ts` | Keep as prototype-only, high caution | Uses `localStorage` snapshots. | Local storage must never become clinical/session truth. Remove or quarantine before backend integration. |
| `frontend/lib/i18n/*` | Keep as prototype-only | Uses local storage for locale, not clinical truth. | Safe for UI preference only. |
| `frontend/app/*` | Keep as prototype-only | Routes are UI prototype pages. | Do not wire to backend until contract freshness and reducer/replay tests exist. |
| `frontend/components/dashboard/*` | Keep as prototype-only | Uses mock data for dashboard projections. | Replace with typed backend data only after frontend integration gate. |
| `frontend/components/cases/*` | Keep as prototype-only | Renders case cards and "hidden diagnosis locked" label without displaying hidden diagnosis values. | Must not receive hidden facts from backend student payloads. |
| `frontend/components/virtual-clinic/*` | Keep as prototype-only, high caution | Simulates agent/safety/patient behavior locally. | Backend integration blocked until contracts, fact ledger, outbox/replay, safety, and reducer tests exist. |
| `frontend/components/debriefing/*` | Keep as prototype-only | Debrief content is mock and may not have evidence IDs. | Real debrief blocked until evidence-grounding gate. |
| `frontend/components/faculty/*` | Keep as prototype-only | Faculty dashboard is mock. | Faculty review must be backend-enforced later. |
| `frontend/components/scenario-studio/*` | Keep as prototype-only | Scenario publish UI is mock and uses local status text. | Backend faculty review gate required before publish functionality. |
| `frontend/components/agent-control/*` | Keep as prototype-only | Agent Control is mock data only. | Students must never access real sensitive traces; real feature gated later. |
| `frontend/components/settings/*` | Keep as prototype-only | Uses mock user. | Replace with `GET /me` only after auth/contracts gate. |
| `frontend/components/ui/*` | Keep | UI component library. | No Step 2 action. |
| `frontend/hooks/*` | Keep | UI hooks only. | No Step 2 action. |
| `frontend/scripts/*` | Keep with caution | Audit/screenshot scripts may write artifacts when run. | Do not run in Step 2; future UI tasks can run them when scoped. |
| `frontend/public/*` | Keep | Prototype assets/placeholders. | Must not be treated as clinical imaging approval evidence. |
| `frontend/.next/` | Do not touch in Step 2 | Ignored generated artifact exists on disk. | Optional manual cleanup can be requested separately. |
| `frontend/node_modules/` | Do not touch in Step 2 | Ignored dependency artifact exists on disk. | Optional manual cleanup can be requested separately. |
| `frontend/tsconfig.tsbuildinfo` | Do not touch in Step 2 | Ignored generated artifact exists on disk. | Optional manual cleanup can be requested separately. |

## No-Go Findings

No active no-go violation requiring immediate revert or deletion was found.

| No-Go Area | Status | Evidence | Decision |
| --- | --- | --- | --- |
| Live OpenAI added too early | Not triggered | No OpenAI SDK usage or live calls found. Worker refuses live-agent flag. | Keep live agents blocked until Step 12 gates. |
| Realtime before outbox | Not triggered | No WebSocket/SSE gateway or Redis runtime found. | Realtime remains blocked until event log/outbox/replay. |
| Redis used as source of truth | Not triggered | Redis appears only in planning/governance docs. | Redis remains coordination-only when added. |
| Hidden facts sent to frontend | Warning, not active backend violation | Frontend mock/type files contain hidden facts, but no backend payload path exists. | Frontend remains prototype-only; hidden fields must be removed/role-filtered before integration. |
| Frontend/backend contract drift | Warning | Shared contracts are health-only; frontend uses independent mock types. | Frontend integration blocked until typed contracts and freshness tests exist. |
| Migration authority violation | Not triggered | No SQL files, migration dirs, Prisma schema, or compose startup migrations found. | Database work remains blocked until SQL-first authority step. |
| Live agent added too early | Not triggered | Python worker is health-only and has no agent runtime. | Worker expansion deferred. |
| Unsafe shortcut | Warning | Existing frontend simulation could be mistaken for source-of-truth if reused. | Treat frontend simulation as prototype only. |

## Risks

| Risk | Severity | Why It Matters | Required Control |
| --- | --- | --- | --- |
| Frontend hidden fact data in client files | High | If reused during backend integration, student-visible payloads could leak hidden diagnoses or hidden history. | Do not use `frontend/types.ts` or `frontend/lib/mock-data.ts` as backend DTO/seed/contract source. |
| Frontend local storage snapshots | High | Local state cannot be clinical/session truth. | Backend sessions must use PostgreSQL, fact ledger, event log, and replay. |
| Shared DTO naming drift | Medium | Contract governance weakens if OpenAPI, TypeScript, and Python names diverge. | Correct in Step 4 before integration. |
| Duplicated contract version constants | Medium | Worker/OpenAPI/TS/Python version drift can pass unnoticed. | Centralize or test cross-surface version alignment in Step 4/11. |
| Root README stale wording | Low | "No backend APIs" is now inaccurate because health endpoints exist. | Correct in Step 3 docs pass to "no clinical APIs." |
| Generated frontend artifacts on disk | Low | `.next`, `node_modules`, and tsbuild info can confuse file inventory. | Optional separate cleanup; do not touch in Step 2. |
| Prototype wording says "live" or "agent" | Medium | Could imply operational live agents. | Future frontend copy should distinguish simulated/mock from live runtime. |

## Required User Decisions

These are the decisions this report recommends the user accept before Step 3 starts:

| Decision | Recommended Choice | If Rejected |
| --- | --- | --- |
| Keep frontend prototype? | Keep as prototype-only, not integration authority. | Request a separate manual cleanup/revert task; do not start Step 3 if cleanup affects backend assumptions. |
| Keep backend API skeleton? | Keep and correct as Step 3 starting point. | Manually revert or rebuild skeleton in a separate approved task. |
| Keep shared contracts foundation? | Keep and correct in Step 4. | Rebuild contracts before any frontend/backend integration. |
| Keep Python worker skeleton? | Keep frozen and defer until Step 11. | Manually revert worker in separate approved task. |
| Keep Docker compose planning note? | Keep planning-only. | Remove in separate approved docs cleanup task. |
| Delete ignored generated artifacts? | Do not do it in Step 2. | If desired, request a separate cleanup task with explicit delete approval. |

## Step 3 Readiness Decision

Step 3 status: `READY WITH CORRECTIONS`.

Allowed Step 3 scope:

- Review and normalize the NestJS API/BFF skeleton.
- Keep health-only endpoints.
- Keep live agents, clinical logic, database, Redis, realtime, Temporal, and frontend integration disabled.
- Correct README wording around health-only backend APIs if Step 3 includes docs touch.
- Strengthen health contract tests if this stays inside backend/shared health-only scope.

Step 3 must not:

- Add clinical APIs.
- Add database migrations or schema files.
- Add case/session/fact/outbox tables.
- Add live OpenAI calls or SDK integration.
- Add Redis, WebSocket, SSE, or realtime gateway.
- Add Temporal workflows.
- Modify frontend UI or wire frontend to backend.
- Use frontend mock data as backend seed or contract source.
- Create `docker-compose.yml`.
- Install packages unless explicitly approved in the Step 3 prompt.

## What Must Not Be Touched

Until their named gates open, future tasks must not touch:

- `frontend/` for backend integration.
- Database schema/migrations.
- `event_log`, `outbox_events`, replay, Redis, WebSocket, or SSE runtime.
- Live OpenAI or any model provider runtime.
- Agent tools, tool permissions, or direct DB mutation by agents.
- Scenario publish backend behavior.
- Debrief generation.
- Faculty review publish gates.
- Real patient data, clinical advice claims, FHIR/DICOMweb/LTI compliance claims, or voice runtime.

## Tests Not Run

Tests/builds were not run for Step 2 because the task forbids implementation work and forbids tests/builds that may modify files. This repository currently has generated frontend artifacts on disk, so running build/typecheck/audit scripts would risk changing outputs outside the allowed Step 2 write set.

Inspection-only checks were performed instead:

- File inventory.
- Git status and diff review.
- Search for live OpenAI, Redis runtime, WebSocket/SSE, migrations, SQL files, compose files, network calls, local storage, hidden facts, and mock data imports.
- Targeted source reads for backend, worker, contracts, frontend prototype, README, and compose planning note.

## Stop Rule

After Step 2, Codex must stop. Do not continue into Step 3 in the same task. The next task must explicitly request Step 3 and must cite this report, the implementation playbook, and the final architecture acceptance gate.
