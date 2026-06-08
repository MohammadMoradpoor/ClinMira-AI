# ClinMira Backend

This backend directory now contains a skeleton only.

Included:

- `api/`: NestJS API/BFF skeleton with health checks only.
- `agent-worker/`: Python agent-worker skeleton with health checks only.
- `DOCKER_COMPOSE_PLAN.md`: compose planning notes; no compose file is created yet.

Not included:

- Clinical APIs.
- Database migrations.
- Realtime gateway.
- Temporal workflows.
- Live OpenAI calls.
- Clinical business logic.

The skeleton exists to establish safe service boundaries. Future work must follow `docs/implementation/IMPLEMENTATION_PLAYBOOK.md`.
