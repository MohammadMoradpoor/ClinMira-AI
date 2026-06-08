# Step 17B-D - Isolated Docker Dev/Test Stack and ClinMira Ops Update

## 1. Executive Verdict

STEP 17B-D COMPLETE WITH WARNINGS; DOCKER RUNTIME VALIDATION BLOCKED

Step 17B-D created the approved isolated local Docker dev/test stack under `docker/clinmira-ai/`, added a scoped `.dockerignore`, replaced the old ops dashboard with `ClinMira AI Ops`, and preserved all product gates.

Runtime validation is incomplete. The first Docker Compose build successfully built the backend API image, then failed during the frontend image install because pnpm blocked unapproved dependency build scripts for `sharp` and `unrs-resolver`. `Dockerfile.frontend` was corrected to use `pnpm install --frozen-lockfile --ignore-scripts`, which is appropriate for this local stack because Next image optimization is disabled. The corrected Docker build, `up`, `ps`, logs, health checks, setup-db run, and Step 16 evidence against the dockerized DB could not be rerun because the required escalated Docker command was rejected by the approval system usage limit.

No backend product source, frontend app/source, shared contracts, migrations, seeds, package files, existing env files, production config, Prisma/ORM, OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher/auth, debrief, faculty, treatment, order, imaging, scoring, or real patient data was added.

## 2. Why This Intermediate Step Was Inserted

This user-approved step was inserted before Step 17B-C-R and Step 17C to provide an isolated local dev/test environment and reduce database bottlenecks during future evidence runs.

This step supersedes earlier Docker blocks only for `docker/clinmira-ai/**` local dev/test infrastructure. It does not authorize production Compose, frontend route wiring, replay reducer work, SSE/EventSource consumption, live agents, or provider runtime.

## 3. Isolation Design

| Area | Design |
| --- | --- |
| Compose project | `clinmira_ai_isolated` |
| Host binding posture | `127.0.0.1` only for exposed host ports |
| Default host ports | Frontend `41730`, API `41731`, PostgreSQL `55433` |
| Default forbidden host ports avoided | `3000`, `3001`, `5432`, Step 16A `55432` |
| Network | Project-specific `clinmira_ai_isolated_net` |
| Volume | Project-specific `clinmira_ai_isolated_postgres_data` |
| Database | `clinmira_ai_docker_dev` |
| Database user | `clinmira_ai_docker_user` |
| Password | Placeholder only in `docker/clinmira-ai/.env.example`; no real secret committed |
| Runtime scope | Existing frontend app, existing backend API, PostgreSQL 16, one-shot setup-db profile |

## 4. Ports Selected and Conflict Checks

Selected ports:

- Frontend/Main App: `41730`.
- Backend API: `41731`.
- PostgreSQL: `55433`.

Preflight observed Step 16A using `127.0.0.1:55432` on container `clinmira-ai-postgres-test`. The selected PostgreSQL port intentionally avoids `55432`.

Port probes reported `41730`, `41731`, `41740`, and `55433` as available before file creation. No existing containers were stopped, renamed, removed, or reconfigured.

## 5. Services Created

| Service | Container | Purpose | Runtime Notes |
| --- | --- | --- | --- |
| `postgres` | `clinmira-ai-isolated-postgres` | PostgreSQL 16 local dev/test database | Uses isolated named volume and localhost host port. |
| `api` | `clinmira-ai-isolated-api` | Existing NestJS API/BFF image | Uses internal Compose DB URL and disabled live-provider flags. |
| `frontend` | `clinmira-ai-isolated-frontend` | Existing Next.js frontend main app | Serves existing app only; no route wiring was added. |
| `setup-db` | one-shot profile service | Apply migrations/seeds | Uses `postgres:16-alpine`, read-only mounted migrations/seeds, and `ON_ERROR_STOP=1`. |

## 6. Network/Volume/Container Naming

| Resource | Name |
| --- | --- |
| Compose project | `clinmira_ai_isolated` |
| Network | `clinmira_ai_isolated_net` |
| Volume | `clinmira_ai_isolated_postgres_data` |
| Frontend container | `clinmira-ai-isolated-frontend` |
| API container | `clinmira-ai-isolated-api` |
| PostgreSQL container | `clinmira-ai-isolated-postgres` |

No host networking, shared volumes, broad Docker cleanup commands, or unrelated container names are used.

## 7. PostgreSQL Setup and Health Evidence

Configuration evidence:

- PostgreSQL image: `postgres:16-alpine`.
- Host binding: `127.0.0.1:55433:5432`.
- Healthcheck: `pg_isready -U clinmira_ai_docker_user -d clinmira_ai_docker_dev`.
- Isolated named volume: `clinmira_ai_isolated_postgres_data`.

Runtime evidence:

- Not completed in this run.
- `docker compose ... up -d`, `ps`, logs, `curl`, and `docker exec psql` checks were not run after the frontend Dockerfile correction because the escalated Docker rerun was rejected by the approval usage limit.

## 8. Migration/Seed Evidence

Setup implementation:

- `docker/clinmira-ai/scripts/apply-db.sh` uses `ON_ERROR_STOP=1`.
- It validates `PGDATABASE=clinmira_ai_docker_dev`.
- It validates `PGUSER=clinmira_ai_docker_user`.
- It fails closed if the target looks like production or staging.
- It mounts migrations and seeds read-only.
- It applies migrations `0001` through `0005`.
- It applies synthetic seeds `0001`, `0002`, and `0005`.
- It skips migration SQL if successful `0005` is already present, then reapplies repeatable seeds.

Runtime evidence:

- Not completed in this run because the stack could not be started after the Docker approval usage limit.

## 9. Backend API Docker Evidence

Backend API Docker evidence:

- `docker compose -p clinmira_ai_isolated -f docker/clinmira-ai/docker-compose.yml config` passed.
- `docker compose -p clinmira_ai_isolated -f docker/clinmira-ai/docker-compose.yml --profile setup config` passed.
- `docker compose ... build` built the API image successfully.
- The API image uses existing backend API source only.
- No backend source or package file was changed.
- Live-provider flags are explicitly disabled in the image/Compose environment.

Runtime start/health evidence:

- Not completed after the frontend Dockerfile correction because the required escalated Docker rerun was rejected by the approval usage limit.

## 10. Frontend/Main App Docker Evidence

Frontend Docker evidence:

- The frontend image builds from existing `frontend/package.json` and `frontend/pnpm-lock.yaml`.
- No frontend app/source, package, or lockfile was changed.
- The first image build failed at `pnpm install --frozen-lockfile` because pnpm blocked dependency build scripts for `sharp` and `unrs-resolver`.
- `Dockerfile.frontend` was corrected to `pnpm install --frozen-lockfile --ignore-scripts`.
- The corrected build could not be rerun because the escalated Docker rerun was rejected by the approval usage limit.

Known limitation:

- The frontend container serves the existing main app only. No frontend route wiring, replay reducer, replay client, SSE client, or EventSource usage was added.

## 11. ClinMira-Ops.html Update Summary

`ClinMira-Ops.html` was updated as a ClinMira-branded ops page:

- Page title is `ClinMira AI Ops`.
- Logo path is `./public-materials/logo.png`.
- Image is not base64 embedded.
- Main App is the only populated section.
- Admin Panel, Docs, and System Maintenance are marked `Not available yet`.
- No false admin/docs/worker/live-agent/provider/production/faculty/debrief/imaging/treatment/Redis/WebSocket/Temporal/publisher services are claimed.

## 12. Commands Added to AgentDeck

Main App commands added:

- Start.
- Build.
- Stop.
- Restart.
- Logs.
- Status.
- Apply migrations and seeds.
- Backend health check.
- Optional Step 16 evidence against the dockerized DB.
- Clean only this stack.
- Clean only this stack volume with explicit warning.

All Docker commands include:

- `-p clinmira_ai_isolated`.
- `-f docker/clinmira-ai/docker-compose.yml`.

No broad Docker cleanup commands are present.

## 13. Addresses Added to AgentDeck

Main App addresses added:

- Frontend: `http://127.0.0.1:41730`.
- Backend base: `http://127.0.0.1:41731`.
- Backend health: `http://127.0.0.1:41731/api/v1/health`.
- Fallback health: `http://127.0.0.1:41731/health`.
- PostgreSQL host/port: `127.0.0.1:55433`.
- Database: `clinmira_ai_docker_dev`.
- User: `clinmira_ai_docker_user`.
- Password: `<redacted>`.

No secrets are included.

## 14. Sections Intentionally Left Empty

The following sections remain unavailable by design:

- Admin Panel.
- Docs.
- System Maintenance.

No worker, provider, Redis, WebSocket, Temporal, production publisher, production auth/RBAC, faculty, debrief, treatment, order, imaging, scoring, or live-agent section was populated.

## 15. Tests/Commands Run and Results

| Command | Result | Notes |
| --- | --- | --- |
| `pwd` | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Warning | Repository remains very dirty from previous staged/untracked work; Step 17B-D touched only allowed new files plus status/backlog/report. |
| `command -v docker` | Pass | `/usr/bin/docker`. |
| `docker version` | Pass after escalation | Docker client/server `28.0.1`. |
| `docker compose version` | Pass | Docker Compose `v2.33.1`. |
| Port/container inspection | Pass | Step 16A container observed on `55432`; selected Step 17B-D ports did not collide. |
| `docker compose ... config` | Pass | Runtime services config parsed. |
| `docker compose ... --profile setup config` | Pass | Setup profile config parsed. |
| `docker compose ... build` | Partial/blocker | API image built. Frontend install failed because pnpm blocked ignored build scripts. Dockerfile was corrected. |
| Corrected `docker compose ... build` rerun | Blocked | Escalated Docker command rejected by approval usage limit. |
| `docker compose ... up -d` | Not run | Blocked by approval usage limit after build rerun rejection. |
| `docker compose ... ps` | Not run | Blocked by approval usage limit after build rerun rejection. |
| `docker compose ... logs --no-color --tail=120` | Not run | Blocked by approval usage limit after build rerun rejection. |
| `curl` backend/frontend health checks | Not run | Stack was not started. |
| `docker exec ... psql` | Not run | Stack was not started. |
| `docker compose ... run --rm setup-db` | Not run | Stack was not started. |
| Step 16 evidence against docker DB | Not run | Stack was not started. |
| `node --test frontend/lib/api/typed-api-client.test.mjs` | Pass | 1 test file passed. |
| `frontend/node_modules/.bin/tsc --noEmit --project frontend/tsconfig.json` | Pass | Direct frontend typecheck passed. |
| `npm --prefix frontend run lint` | Pass | Frontend lint passed. |
| `npm --prefix backend/api run test` | Pass | 9 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Pass | Backend API typecheck passed. |
| `npm --prefix backend/api run build` | Pass | Backend API build passed. |
| `npm --prefix shared/contracts run test` | Pass | 5 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Blocked | Existing blocker: `tsc` not found; no package install authorized. |
| `node --test backend/database/tests/*.test.mjs` | Fail due stale guard | 5 passed, 6 failed because older database guard tests assert no `docker-compose.yml` exists anywhere in repo. This is incompatible with this user-approved Docker step. Backend/database tests were not edited because they are outside allowed scope. |
| `node --test backend/evals/tests/*.test.mjs` | Pass | 7 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Pass with warning | Status `PASSED`, threshold failures `0`; DB eval skipped because `CLINMIRA_TEST_DATABASE_URL` was not configured in shell. Generated result side effect was reverted to preserve scope. |
| `python3 -m unittest discover -s tests` in worker | Pass | 57 worker tests passed. |

## 16. Forbidden Implementation Scan Results

Pass:

- No backend API source changes in Step 17B-D.
- No frontend app/source changes in Step 17B-D.
- No agent-worker changes in Step 17B-D.
- No shared contract/OpenAPI changes in Step 17B-D.
- No migration or seed edits in Step 17B-D.
- No package or lockfile edits in Step 17B-D.
- No `.env.local` or existing env file edits.
- No production config added.
- No Prisma/ORM file added.
- No OpenAI SDK/package/call/API-key read added.
- No live agent/provider runtime added.
- No Redis/WebSocket/Temporal runtime added.
- No production publisher/auth/RBAC added.
- No debrief/faculty/treatment/order/imaging/scoring workflow added.
- No real patient data added.
- `ClinMira-Ops.html` has no AgentDeck/base64/old-port markers after correction.

Warnings:

- Static scans find `OPENAI` only in explicit disabled env flag names and "not implemented" documentation.
- Static scans find internal container ports `3000`, `3001`, and `5432`; these are not host bindings. Host bindings use `41730`, `41731`, and `55433`.
- Database static tests need a later approved guard update because prior "no compose file anywhere" assertions now conflict with this inserted infrastructure gate.

## 17. What Was Intentionally Not Implemented

Not implemented:

- Step 17C.
- Replay reducer.
- Replay client.
- SSE client.
- EventSource.
- Frontend route wiring.
- Playwright route flows.
- React component changes.
- Backend route changes.
- Shared contract/OpenAPI changes.
- Package installs or package script changes.
- Migration or seed edits.
- Existing env file edits.
- Production secrets.
- Production auth/RBAC.
- Production publisher.
- Redis.
- WebSocket fanout.
- Temporal.
- Live OpenAI.
- OpenAI SDK.
- API-key reads.
- Live agents.
- Provider runtime.
- Debrief, faculty, treatment, order, imaging, or scoring workflow.
- Prisma/ORM.
- Real patient data.

## 18. Remaining Warnings/Blockers

| Blocker | Severity | Required Action |
| --- | --- | --- |
| Corrected frontend Docker image build not rerun | Medium | Rerun `docker compose -p clinmira_ai_isolated -f docker/clinmira-ai/docker-compose.yml build` after approval capacity is available. |
| Stack startup not validated | Medium | Rerun `up -d`, `ps`, logs, health checks, and Postgres `psql` checks. |
| Migrations/seeds not run in docker stack | Medium | Run `docker compose -p clinmira_ai_isolated -f docker/clinmira-ai/docker-compose.yml run --rm setup-db`. |
| Step 16 evidence against docker DB not run | Medium | Export sanitized docker DB URL in shell only and run the Step 16 evidence test. |
| Database static tests fail due stale no-Compose assertions | Medium | A later approved test-governance correction should update those guard tests to allow `docker/clinmira-ai/docker-compose.yml` only. |
| Shared contracts typecheck still blocked | Medium | `tsc` is not installed in `shared/contracts`; no package install was authorized. |
| Step 17B-D-R review not complete | High | Run an architecture review and, ideally, rerun Docker runtime validation there. |
| Step 17B-C-R remains required | High | Return to Step 17B-C-R after Docker review accepts the infrastructure step. |

## 19. Next Recommended Task

Run Step 17B-D-R first as an isolated Docker dev/test stack architecture review and validation rerun.

Recommended next prompt:

```text
Review Step 17B-D only as Isolated Docker Dev/Test Stack and ClinMira Ops Architecture Review. Use docs/implementation/reports/STEP_17B_D_ISOLATED_DOCKER_DEV_TEST_STACK_REPORT.md, docs/implementation/IMPLEMENTATION_STATUS.md, docs/implementation/IMPLEMENTATION_BACKLOG.md, docs/implementation/NO_GO_RULES.md, docker/clinmira-ai/**, .dockerignore, ClinMira-Ops.html, and the relevant architecture docs. Verify isolation, host ports, project/container/network/volume names, no Step 16A disturbance, no unrelated container changes, no product source/package/migration/seed/env/contract changes, no forbidden runtime additions, and no false ops claims. If Docker approval capacity is available, rerun compose build, up, ps, logs, setup-db, health checks, PostgreSQL identity/schema checks, and optional Step 16 evidence against the dockerized DB. Do not implement Step 17C, route UI wiring, replay reducer/client, SSE/EventSource, backend routes, shared contracts, package changes, migrations, seeds, env files, OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher/auth, debrief, faculty, treatment/order/imaging workflow, Prisma/ORM, or real patient data.
```

After Step 17B-D-R accepts this infrastructure step, return to Step 17B-C-R before any Step 17C reducer work. Step 17C remains blocked.
