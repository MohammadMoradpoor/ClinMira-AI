# Simulation Contract Foundation

Step 8 authorized mock simulation contract foundations. Step 8B activates only the approved mock simulation runtime API contracts.

These schemas describe the DTO names and safety boundaries for future backend-owned mock simulation persistence:

- `CreateSimulationSessionRequestDto`
- `SimulationSessionDto`
- `SubmitSimulationActionRequestDto`
- `SimulationTurnResultDto`
- `ClinicalActionDto`
- `ConversationMessageDto`
- `TimelineEventDto`
- `SessionStateSnapshotDto`
- `RevealedFactReferenceDto`

Only these OpenAPI routes are active in Step 8B:

- `POST /api/v1/simulation-sessions`
- `GET /api/v1/simulation-sessions/{id}`
- `POST /api/v1/simulation-sessions/{id}/actions`

The NestJS API/BFF uses raw PostgreSQL persistence for these routes. Runtime writes must use domain rows, `idempotency_keys` when supplied, `event_log`, and `outbox_events` atomically.

Safety boundaries:

- `fact_ledger` remains the clinical fact source of truth.
- `session_revealed_facts` and `RevealedFactReferenceDto` store fact references only, not hidden fact content.
- Student-facing results must be assembled by backend role filtering, not frontend mock data.
- Live OpenAI, agent runtime, Redis, WebSocket, SSE, Temporal, debrief, scoring, faculty workflow, imaging workflow, and treatment mutation contracts remain blocked.
