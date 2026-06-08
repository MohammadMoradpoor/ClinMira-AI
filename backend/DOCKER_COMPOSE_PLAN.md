# Docker Compose Plan

No `docker-compose.yml` file is created in this skeleton task.

Reason:

- The current implementation includes only health-check skeletons.
- No PostgreSQL, Redis, Temporal, object storage, realtime gateway, migrations, or clinical runtime exists yet.
- The architecture requires SQL-first migration planning and outbox/event replay planning before production-like local infrastructure is treated as authoritative.

Future aligned compose scope:

| Service | When It Becomes Valid |
| --- | --- |
| `api-bff` | After API skeleton dependencies are installed and contract-first routes are approved. |
| `agent-worker` | After worker task queues/contracts are approved; live agents remain disabled. |
| `postgres` | After SQL-first migration operating procedure and schema plan are approved. |
| `redis` | After outbox/event replay planning defines Redis as coordination only. |
| `temporal` | After workflow/activity payload contracts are approved. |

Compose rules:

- Do not use Redis as clinical truth.
- Do not enable live OpenAI calls through compose defaults.
- Do not add database migrations through compose startup scripts.
- Health checks may point only at skeleton health endpoints until real gates pass.

