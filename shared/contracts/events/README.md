# Event and Replay Contract Foundation

## Scope

Step 7 added envelope-level event and replay schema foundations.

Step 15 activates backend-filtered replay and a delivery-only SSE stream frame contract for already-persisted replay events.

These contracts define durable replay shapes used by backend services. They do not define clinical event payload DTOs, frontend consumers, Redis integration, WebSocket behavior, publisher workers, live-agent payloads, faculty workflow payloads, debrief payloads, treatment payloads, or frontend reducer behavior.

## Contracts

| Contract | File | Version | Purpose |
| --- | --- | --- | --- |
| `EventEnvelope` | `event-envelope.schema.json` | `event-envelope.v1` | Generic durable event wrapper with stream sequence, schema version, payload classification, replayability, and trace/correlation metadata. |
| `ReplayRequest` | `replay-request.schema.json` | `replay-request.v1` | Backend-filtered replay request shape for a simulation session, audience, sequence cursor, and limit. |
| `ReplayEvent` | `replay-event.schema.json` | `replay-event.v1` | Backend-filtered event returned by replay after payload-classification enforcement and deterministic redaction. |
| `ReplayCursor` | `replay-cursor.schema.json` | `replay-cursor.v1` | Sequence cursor used for reconnect and idempotent replay recovery. |
| `ReplayResponse` | `replay-response.schema.json` | `replay-response.v1` | Backend-filtered replay response with redaction, gap, duplicate, next-cursor, and snapshot fallback indicators. |
| `RealtimeStreamFrame` | `realtime-stream.schema.json` | `realtime-stream.v1` | Delivery-only SSE frame for replay events and replay completion control metadata. |

## Governance Rules

- PostgreSQL `event_log` remains the authoritative replay source.
- Event payloads are generic JSON objects at this stage, not clinical DTOs.
- Every event envelope must carry `schema_version`, `sequence`, `payload_classification`, and `replayable`.
- Replay must be backend audience-filtered before any frontend/realtime consumer can use it.
- Student replay must not bypass fact-ledger visibility, fact access policies, or hidden fact redaction.
- SSE in Step 15 is delivery-only and starts with replay from PostgreSQL.
- Redis, WebSocket, SSE, frontend state, and model output must never become source of truth.
- Frontend integration and reducer behavior remain blocked until their later gate.
