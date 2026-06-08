# ClinMira API/BFF Skeleton

This is the NestJS API/BFF skeleton for ClinMira AI.

Current scope:

- NestJS application shell.
- `GET /health`.
- `GET /api/v1/health`.
- Shared health contract usage.
- Feature flags hard-disabled for risky features.

Explicitly not implemented:

- Clinical APIs.
- Case/session/order/debrief/faculty routes.
- Database access.
- SQL migrations.
- Realtime gateway.
- Temporal workflows.
- Live OpenAI calls.
- Agent orchestration.

Commands after dependencies are installed:

```bash
npm run test
npm run typecheck
npm run build
npm run start:dev
```

The current skeleton package includes dependency declarations only. It does not include installed dependencies or a lockfile.

