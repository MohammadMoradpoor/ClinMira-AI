# ClinMira AI Docker Dev/Test Stack

This stack is a local-only development and test convenience for ClinMira AI. It is not production infrastructure, not a deployment plan, and not approval for broad frontend integration, live agents, Redis/WebSocket fanout, Temporal, production auth/RBAC, or a production outbox publisher.

## Boundaries

- Compose project: `clinmira_ai`
- Network: `clinmira_ai_net`
- Volume: `clinmira_ai_postgres_data`
- Frontend container: `clinmira-ai-frontend`
- API container: `clinmira-ai-api`
- PostgreSQL container: `clinmira-ai-postgres`
- Frontend host URL: `http://127.0.0.1:41730`
- Backend base URL: `http://127.0.0.1:41731`
- PostgreSQL host target: `127.0.0.1:55433/clinmira_ai_docker_dev`

## First-Time Setup

The local runtime file is `docker/clinmira-ai/.env`. It is intentionally gitignored and must contain a strong local-only password. The committed example file contains placeholders only.

```bash
cp docker/clinmira-ai/.env.example docker/clinmira-ai/.env
```

After copying, replace `<strong-local-only-password>` in `docker/clinmira-ai/.env` with a local-only password and update both database URL values to match.

Start and build the stack:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml up -d --build
```

Apply migrations and synthetic seeds:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml run --rm setup-db
```

## Daily Commands

Build:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml build
```

Start:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml up -d
```

Stop containers without removing the database volume:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml stop
```

Restart:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml restart
```

Status:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml ps
```

Logs:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml logs --tail=100
```

Clean stack containers and network only:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml down
```

Clean stack and delete the database volume:

```bash
docker compose --env-file docker/clinmira-ai/.env -p clinmira_ai -f docker/clinmira-ai/docker-compose.yml down -v
```

Warning: `down -v` deletes `clinmira_ai_postgres_data`. It is allowed only for this stack and must not be used against Step 16A, staging, or production databases.

## Health Checks

Backend health:

```bash
curl -fsS http://127.0.0.1:41731/api/v1/health
```

Fallback backend health:

```bash
curl -fsS http://127.0.0.1:41731/health
```

Frontend main app:

```bash
curl -I http://127.0.0.1:41730/
```

PostgreSQL identity:

```bash
docker exec clinmira-ai-postgres psql -U clinmira_ai_docker_user -d clinmira_ai_docker_dev -c "select current_database(), current_user;"
```

Schema migrations:

```bash
docker exec clinmira-ai-postgres psql -U clinmira_ai_docker_user -d clinmira_ai_docker_dev -c "select version, success from schema_migrations order by version;"
```

## Step 16 Evidence Against This Stack

Use a shell-only environment export when explicitly rerunning Step 16 evidence. Do not create or edit `.env.local` for this stack.

```bash
set -a
. docker/clinmira-ai/.env
set +a
CLINMIRA_TEST_DATABASE_URL="$CLINMIRA_DOCKER_HOST_DATABASE_URL" npm --prefix backend/api run test -- --test-name-pattern='Step 16 DB-backed replay and safety evidence'
```

This uses the ignored local Docker database URL without printing the password.

## What This Stack Does Not Provide

- No live OpenAI calls.
- No OpenAI SDK installation.
- No Python agent-worker service.
- No Redis.
- No WebSocket fanout.
- No Temporal.
- No production auth/RBAC.
- No production outbox publisher.
- No frontend route wiring or replay reducer.
- No faculty, debrief, treatment, order, imaging, or scoring workflow.
- No real patient data.
