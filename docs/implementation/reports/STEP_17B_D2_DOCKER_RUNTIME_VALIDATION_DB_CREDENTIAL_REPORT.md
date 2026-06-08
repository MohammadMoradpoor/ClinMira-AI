# Step 17B-D2 - Docker Runtime Validation, DB Credential Finalization, and Test-Guard Correction

## 1. Executive Verdict

STEP 17B-D2 COMPLETE WITH WARNINGS

The isolated ClinMira AI Docker dev/test stack is now runtime-validated with finalized local-only Docker database credentials, explicit `--env-file docker/clinmira-ai/.env` command usage, healthy frontend/API/PostgreSQL containers, applied migrations/seeds, corrected stale database compose guards, and passing Step 16 DB-backed evidence against the Docker PostgreSQL database.

Warnings remain because the repository is still broadly dirty from prior steps, `shared/contracts` typecheck still cannot run because `tsc` is not installed in that package, and Step 17B-D2 is not an architecture review. Step 17B-D-R remains required before returning to Step 17B-C-R.

## 2. Current Docker Stack Detected

| Item | Detected |
| --- | --- |
| Compose project | `clinmira_ai` |
| Network | `clinmira_ai_net` |
| Volume | `clinmira_ai_postgres_data` |
| PostgreSQL container | `clinmira-ai-postgres` |
| API container | `clinmira-ai-api` |
| Frontend container | `clinmira-ai-frontend` |
| Frontend port | `127.0.0.1:41730 -> 3000` |
| API port | `127.0.0.1:41731 -> 3001` |
| PostgreSQL port | `127.0.0.1:55433 -> 5432` |

Final `docker compose ps` showed all three containers `healthy`.

## 3. Naming Reconciliation

The actual stack names are `clinmira_ai`, `clinmira_ai_net`, `clinmira_ai_postgres_data`, `clinmira-ai-postgres`, `clinmira-ai-api`, and `clinmira-ai-frontend`.

Stale `clinmira_ai_isolated` references were replaced in the current status/next-step guidance. The only compose file found in the repository scan is `docker/clinmira-ai/docker-compose.yml`.

## 4. Credential Strategy

`docker/clinmira-ai/.env` was created as a gitignored local-only file. It contains a generated strong local-only password and matching container/host database URLs. The password was not printed in command output, report text, or final status.

Because the PostgreSQL volume already existed, the `clinmira_ai_docker_user` password was finalized in the running `clinmira-ai-postgres` container instead of deleting the volume. No broad Docker cleanup or volume reset was performed.

## 5. `.env` Creation/Update Summary With Secrets Redacted

The generated local file contains these keys:

```text
CLINMIRA_DOCKER_POSTGRES_DB=clinmira_ai_docker_dev
CLINMIRA_DOCKER_POSTGRES_USER=clinmira_ai_docker_user
CLINMIRA_DOCKER_POSTGRES_PASSWORD=<redacted>
CLINMIRA_DOCKER_POSTGRES_HOST_PORT=55433
CLINMIRA_DOCKER_API_PORT=41731
CLINMIRA_DOCKER_FRONTEND_PORT=41730
CLINMIRA_DOCKER_DATABASE_URL=<redacted>
CLINMIRA_DOCKER_HOST_DATABASE_URL=<redacted>
```

`docker/clinmira-ai/.env.example` keeps placeholders only and includes the same required key set.

## 6. Gitignore Verification

`git check-ignore -v docker/clinmira-ai/.env` returned:

```text
.gitignore:7:docker/clinmira-ai/.env docker/clinmira-ai/.env
```

`.dockerignore` now also excludes nested `.env` files while preserving `.env.example`.

## 7. Ports And Isolation Evidence

`docker ps` showed only the ClinMira stack on the requested ports:

```text
clinmira-ai-api        127.0.0.1:41731->3001/tcp
clinmira-ai-postgres   127.0.0.1:55433->5432/tcp
clinmira-ai-frontend   127.0.0.1:41730->3000/tcp
```

No running container used Step 16A port `55432`. The Step 16A Docker volume name was visible, but it was not modified or removed.

## 8. Running Container Evidence

Final scoped compose status:

```text
clinmira-ai-api        Up (healthy)   127.0.0.1:41731->3001/tcp
clinmira-ai-frontend   Up (healthy)   127.0.0.1:41730->3000/tcp
clinmira-ai-postgres   Up (healthy)   127.0.0.1:55433->5432/tcp
```

Scoped logs showed Nest startup, health/simulation/replay/SSE route registration, Next.js readiness, and PostgreSQL `16.14` ready to accept connections.

## 9. PostgreSQL Health Evidence

`docker exec clinmira-ai-postgres pg_isready -U clinmira_ai_docker_user -d clinmira_ai_docker_dev` returned:

```text
/var/run/postgresql:5432 - accepting connections
```

Database identity:

```text
current_database: clinmira_ai_docker_dev
current_user: clinmira_ai_docker_user
```

## 10. Migration/Seed Evidence

`docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml run --rm setup-db` completed successfully.

`schema_migrations` contains:

```text
0001 t
0002 t
0003 t
0004 t
0005 t
```

Synthetic seed validation from setup output returned expected counts: `institutions=1`, `fact_ledger=2`, `safety_rules=14`.

## 11. Required Table And Seed Count Evidence

Required table probe returned these key tables:

```text
audit_logs
case_versions
cases
clinical_actions
cohorts
conversation_messages
enrollments
event_log
fact_ledger
idempotency_keys
institutions
outbox_events
patient_twins
roles
safety_evaluations
safety_findings
safety_rules
simulation_sessions
timeline_events
users
```

Seed count probe returned:

```text
institutions=1
users=3
roles=3
cases=1
facts=2
safety_rules=14
```

## 12. Backend API Health Evidence

`curl -fsS http://127.0.0.1:41731/api/v1/health` returned `status: "ok"`, `runtime: "nestjs"`, `database: "configured_for_simulation"`, and all risky feature flags remained `false`.

Live OpenAI calls, realtime transport, and Temporal workflows remain disabled/not configured in the health payload.

## 13. Frontend Health/Load Evidence

`curl -I http://127.0.0.1:41730/` returned:

```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 61396
```

The frontend container healthcheck also reported `healthy`.

## 14. Step 16 Evidence Against Docker DB Result

Step 16 evidence was run with:

```bash
set -a
. docker/clinmira-ai/.env
set +a
CLINMIRA_TEST_DATABASE_URL="$CLINMIRA_DOCKER_HOST_DATABASE_URL" npm --prefix backend/api run test -- --test-name-pattern='Step 16 DB-backed replay and safety evidence'
```

The sandboxed first attempt failed with `EPERM 127.0.0.1:55433`; the escalated rerun passed.

Result: `43` tests passed, `0` failed, `0` skipped.

## 15. Database Guard-Test Correction Summary

The stale database guards previously asserted that no compose file could exist anywhere in the repository. They now allow exactly `docker/clinmira-ai/docker-compose.yml` while continuing to forbid root/arbitrary compose files and `schema.prisma`.

Added helper: `backend/database/tests/docker_compose_guard_helpers.mjs`.

Corrected guard files:

```text
backend/database/tests/no_forbidden_tables.test.mjs
backend/database/tests/replay_runtime_guard.test.mjs
backend/database/tests/mock_simulation_fact_guard.test.mjs
backend/database/tests/fact_visibility_guard.test.mjs
backend/database/tests/safety_engine_guard.test.mjs
backend/database/tests/event_replay_contract_guard.test.mjs
```

`node --test backend/database/tests/*.test.mjs` passed: `11` tests passed.

## 16. ClinMira-Ops.html Sync Summary

The existing ClinMira ops dashboard now lives at `ClinMira-Ops.html` to match the project name.

The dashboard now uses explicit env-file compose commands and includes runtime commands for start, build, stop, restart, logs, status, backend health, frontend health, setup-db, PostgreSQL identity, schema migrations, Step 16 evidence, and scoped cleanup.

## 17. Commands Run And Results

| Command | Result |
| --- | --- |
| `git check-ignore -v docker/clinmira-ai/.env` | Pass; local env is ignored. |
| `docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml config --quiet` | Pass. |
| `docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml up -d --build` | Pass after Dockerfile runtime packaging corrections. |
| `docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml ps` | Pass; all three services healthy. |
| `docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml run --rm setup-db` | Pass; migrations/seeds applied. |
| `docker exec clinmira-ai-postgres pg_isready ...` | Pass. |
| PostgreSQL identity/migration/table/seed probes | Pass. |
| `curl -fsS http://127.0.0.1:41731/api/v1/health` | Pass. |
| `curl -I http://127.0.0.1:41730/` | Pass. |
| Step 16 DB-backed evidence against Docker DB | Pass after escalation; 43 passed. |
| `node --test backend/database/tests/*.test.mjs` | Pass; 11 passed. |
| `npm --prefix backend/api run test` | Pass; 9 files passed. |
| `npm --prefix backend/api run typecheck` | Pass. |
| `npm --prefix backend/api run build` | Pass. |
| `npm --prefix shared/contracts run test` | Pass; 5 passed. |
| `npm --prefix shared/contracts run typecheck` | Blocked; `tsc` not found. |
| `node --test frontend/lib/api/typed-api-client.test.mjs` | Pass. |
| `node --test backend/evals/tests/*.test.mjs` | Pass; 7 passed. |
| `node backend/evals/lib/eval-runner.mjs` without DB URL | Pass with DB eval skipped. |
| Eval runner with Docker DB URL | Pass; skipped 0, DB eval status says live API/DB integration runner is not implemented in Step 9 harness. |
| `python3 -m unittest discover -s tests` in worker | Pass; 57 passed. |

## 18. Forbidden Implementation Scan Results

Forbidden runtime scan across Step 17B-D2-touched infrastructure/test/status files found no actual OpenAI, provider SDK, Redis, WebSocket, Temporal, Prisma, API-key, provider-secret, or tool-secret runtime implementation.

Matches were limited to guard-test regex assertions that intentionally forbid those patterns.

`find . -maxdepth 5 \( -name 'docker-compose.yml' -o -name 'docker-compose.yaml' \)` returned only:

```text
./docker/clinmira-ai/docker-compose.yml
```

`find . -name 'schema.prisma' -print` returned no results.

## 19. What Was Intentionally Not Implemented

No frontend route wiring, replay reducer, replay client, SSE/EventSource client, Playwright route flow, backend route, shared contract/OpenAPI change, database migration, seed edit, package/lockfile change, production config, production auth/RBAC, production publisher, Redis/WebSocket fanout, Temporal workflow/worker, OpenAI SDK, live OpenAI call, live agent, provider runtime, debrief, faculty workflow, treatment/order/imaging workflow, scoring workflow, Prisma/ORM, or real patient data was added.

## 20. Remaining Warnings/Blockers

- Step 17B-D-R architecture review remains required before returning to Step 17B-C-R.
- `shared/contracts` typecheck remains blocked because `tsc` is not installed in that package.
- The repository remains broadly dirty from prior steps; continue only with narrow explicit scopes.
- Docker validation is local dev/test evidence, not production deployment authorization.
- The Step 9 eval runner still does not implement a live API/DB integration runner; Step 16 evidence covers DB-backed API route/runtime proof separately.
- Production auth/RBAC, publisher, frontend integration, Redis/WebSocket fanout, live agents, and production realtime remain blocked.

## 21. Next Recommended Task

Run Step 17B-D-R as review-only against this report and the current Docker stack.

Exact next scope:

```text
Review Step 17B-D and Step 17B-D2 as Isolated Docker Dev/Test Stack Architecture Review. Use docs/implementation/reports/STEP_17B_D_ISOLATED_DOCKER_DEV_TEST_STACK_REPORT.md, docs/implementation/reports/STEP_17B_D2_DOCKER_RUNTIME_VALIDATION_DB_CREDENTIAL_REPORT.md, docker/clinmira-ai/**, ClinMira-Ops.html, .gitignore, .dockerignore, backend/database/tests/**, docs/implementation/IMPLEMENTATION_STATUS.md, docs/implementation/IMPLEMENTATION_BACKLOG.md, docs/implementation/NO_GO_RULES.md, and architecture docs 02, 03, 07, 08, 10, and 12. Do not implement product code. Confirm scope, isolation, credentials, no Step 16A disturbance, no forbidden runtime additions, and whether Step 17B-C-R may proceed after review.
```
