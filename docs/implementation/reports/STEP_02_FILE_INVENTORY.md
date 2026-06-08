# Step 02 File Inventory

Inventory date: `2026-06-04`

This inventory supports `STEP_02_REPOSITORY_CLEANUP_DECISION.md`. It is inspection-only and does not modify product code.

## Current Git State Summary

| Area | Observed State | Cleanup Decision |
| --- | --- | --- |
| Architecture docs | Added and present. | Keep as source of truth. |
| Implementation docs | Added/modified. | Keep; Step 2 updates status and reports only. |
| Root README | Modified. | Correct wording in Step 3 docs pass. |
| Backend README | Modified. | Keep. |
| Backend API skeleton | Untracked directory. | Keep and correct in Step 3. |
| Python agent-worker skeleton | Untracked directory. | Keep frozen, defer until Step 11. |
| Shared contracts | Untracked directory. | Keep and correct in Step 4. |
| Frontend prototype | Added directory. | Keep as prototype-only. |
| Docker compose plan | Untracked planning doc only. | Keep planning-only. |
| Migrations/SQL/schema authority | Not found. | Step 5 remains blocked. |
| Runtime Redis/WebSocket/SSE | Not found. | Realtime remains blocked. |
| Live OpenAI integration | Not found. | Live agents remain blocked. |
| Ignored generated frontend artifacts | Present on disk. | Do not touch in Step 2. |

## Backend API Skeleton Files

| Path | Classification | Decision |
| --- | --- | --- |
| `backend/api/package.json` | Package manifest | Keep, review in Step 3. |
| `backend/api/src/main.ts` | NestJS bootstrap | Keep, review version prefix policy in Step 3. |
| `backend/api/src/app.module.ts` | Health-only module wiring | Keep. |
| `backend/api/src/health/health.controller.ts` | Health-only controller | Keep. |
| `backend/api/src/health/health.service.ts` | Health-only service | Keep. |
| `backend/api/test/health-contract.test.mjs` | Contract test placeholder | Keep, strengthen later. |
| `backend/api/README.md` | Skeleton docs | Keep. |
| `backend/api/tsconfig.json` | Config | Keep. |
| `backend/api/tsconfig.build.json` | Config | Keep. |
| `backend/api/nest-cli.json` | Config | Keep. |
| `backend/api/.env.example` | Example env | Keep with no secret/live-agent additions. |
| `backend/api/.gitignore` | Hygiene | Keep. |

## Python Agent Worker Skeleton Files

| Path | Classification | Decision |
| --- | --- | --- |
| `backend/agent-worker/pyproject.toml` | Python package manifest | Keep frozen, defer. |
| `backend/agent-worker/src/clinmira_agent_worker/__init__.py` | Package marker | Keep frozen. |
| `backend/agent-worker/src/clinmira_agent_worker/main.py` | Health CLI | Keep frozen. |
| `backend/agent-worker/src/clinmira_agent_worker/settings.py` | Skeleton feature flags | Keep frozen, align later. |
| `backend/agent-worker/src/clinmira_agent_worker/health.py` | Health response | Keep, correct version import later. |
| `backend/agent-worker/tests/test_health.py` | Health tests | Keep frozen. |
| `backend/agent-worker/README.md` | Skeleton docs | Keep. |
| `backend/agent-worker/.gitignore` | Hygiene | Keep. |

## Shared Contracts Files

| Path | Classification | Decision |
| --- | --- | --- |
| `shared/contracts/package.json` | Contract package manifest | Keep, review in Step 4. |
| `shared/contracts/README.md` | Contract docs | Keep. |
| `shared/contracts/DTO_NAMING.md` | Naming governance | Correct drift in Step 4. |
| `shared/contracts/openapi/clinmira-api.v1.json` | Health-only OpenAPI | Keep, align names/versions in Step 4. |
| `shared/contracts/openapi/README.md` | OpenAPI docs | Keep. |
| `shared/contracts/src/schema-versions.ts` | TS version constants | Keep, test cross-surface alignment. |
| `shared/contracts/src/health-response.ts` | TS health type | Correct DTO naming in Step 4. |
| `shared/contracts/src/feature-flags.ts` | TS feature flag type | Correct DTO naming in Step 4. |
| `shared/contracts/src/index.ts` | TS exports | Update after Step 4 corrections. |
| `shared/contracts/src/README.md` | TS contract docs | Keep. |
| `shared/contracts/schemas/health-response.schema.json` | JSON Schema | Keep. |
| `shared/contracts/schemas/feature-flags.schema.json` | JSON Schema | Keep. |
| `shared/contracts/tests/contract-foundation.test.mjs` | Contract test placeholder | Keep, strengthen in Step 4. |
| `shared/contracts/python/README.md` | Python contract docs | Keep. |
| `shared/contracts/python/clinmira_contracts/versions.py` | Python constants | Keep, consume from worker later. |
| `shared/contracts/python/clinmira_contracts/__init__.py` | Python package marker | Keep. |
| `shared/contracts/python/clinmira_contracts/schemas/__init__.py` | Pydantic placeholder | Keep. |
| `shared/contracts/python/clinmira_contracts/schemas/README.md` | Pydantic placeholder docs | Keep. |

## Frontend Prototype Groups

| Path or Pattern | Classification | Decision |
| --- | --- | --- |
| `frontend/package.json` | Frontend prototype manifest | Keep prototype-only. |
| `frontend/pnpm-lock.yaml` | Lockfile | Keep. |
| `frontend/README.md` | Frontend docs | Keep with wording caution. |
| `frontend/types.ts` | Prototype UI types | Keep prototype-only; hidden fields must not become contracts. |
| `frontend/lib/mock-data.ts` | Prototype synthetic data | Keep prototype-only; never backend seed/contract source. |
| `frontend/lib/simulation-engine.ts` | Prototype local simulation | Keep prototype-only; not backend session engine. |
| `frontend/lib/simulation-storage.ts` | Prototype local storage | Keep prototype-only; local storage not truth. |
| `frontend/lib/i18n/*` | Prototype i18n | Keep. |
| `frontend/app/*` | Prototype routes | Keep prototype-only. |
| `frontend/components/dashboard/*` | Prototype dashboard UI | Keep prototype-only. |
| `frontend/components/cases/*` | Prototype case UI | Keep prototype-only. |
| `frontend/components/virtual-clinic/*` | Prototype simulation UI | Keep prototype-only, high caution. |
| `frontend/components/debriefing/*` | Prototype debrief UI | Keep prototype-only. |
| `frontend/components/faculty/*` | Prototype faculty UI | Keep prototype-only. |
| `frontend/components/scenario-studio/*` | Prototype studio UI | Keep prototype-only. |
| `frontend/components/agent-control/*` | Prototype agent-control UI | Keep prototype-only. |
| `frontend/components/settings/*` | Prototype settings UI | Keep prototype-only. |
| `frontend/components/ui/*` | UI components | Keep. |
| `frontend/hooks/*` | UI hooks | Keep. |
| `frontend/scripts/*` | UI audit scripts | Keep, do not run in Step 2. |
| `frontend/public/*` | Prototype assets | Keep; not clinical imaging evidence. |

## Ignored Generated Artifacts Observed

| Path | Decision |
| --- | --- |
| `frontend/.next/` | Do not touch in Step 2. Optional manual cleanup only. |
| `frontend/node_modules/` | Do not touch in Step 2. Optional manual cleanup only. |
| `frontend/tsconfig.tsbuildinfo` | Do not touch in Step 2. Optional manual cleanup only. |

## Explicitly Absent

| Area | Evidence | Gate Impact |
| --- | --- | --- |
| SQL migrations | No `.sql`, migration directory, or Prisma schema found. | Database work blocked until SQL-first authority. |
| Docker compose runtime | No `docker-compose.yml` or `.yaml` found. | Compose remains planning-only. |
| Live OpenAI runtime | No OpenAI imports or SDK use found. | Live agents remain blocked. |
| Redis runtime | No Redis imports/runtime usage found. | Redis remains unimplemented and blocked as source of truth. |
| WebSocket/SSE backend | No gateway/runtime found. | Realtime remains blocked until outbox/replay. |
| Temporal workflows | No Temporal runtime found. | Workflow implementation remains blocked. |
