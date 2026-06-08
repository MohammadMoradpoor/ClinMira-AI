# Step 15 - Realtime Gateway with Replay

## 1. Executive Verdict

STEP 15 COMPLETE WITH WARNINGS

Step 15 implemented a replay-first backend Realtime Gateway foundation. The API/BFF now exposes backend-filtered replay at `GET /api/v1/simulation-sessions/:sessionId/replay` and a delivery-only SSE route at `GET /api/v1/simulation-sessions/:sessionId/events/stream`.

Warnings remain because DB-backed replay integration was not run without `CLINMIRA_TEST_DATABASE_URL`, shared contracts typecheck remains blocked because `tsc` is not installed in `shared/contracts`, production auth/RBAC is still absent, the production outbox publisher is still absent, and frontend integration remains blocked.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| Live OpenAI added | No. |
| OpenAI SDK added | No. |
| API key read added | No. |
| Live agents added | No. |
| Frontend integration added | No. |
| Redis source of truth added | No. |
| WebSocket/SSE source of truth added | No. SSE is delivery-only and replay-first. |
| Temporal added | No. |
| Production auth/RBAC added | No. Temporary Step 8B headers remain context only. |
| Debrief/faculty/treatment/imaging workflow added | No. |
| Agent-worker/provider runtime changed | No. |
| Database migration added | No. |
| Packages installed | No. |
| Prisma or docker-compose added | No. |

## 3. Replay Gateway Summary

| Area | Implementation |
| --- | --- |
| Route | `GET /api/v1/simulation-sessions/:sessionId/replay`. |
| Module | `backend/api/src/replay/replay.module.ts`. |
| Service | `ReplayService.replaySession()` validates UUID, parses cursor/limit/audience, scopes actor, reads replay rows, redacts events, and returns cursor metadata. |
| Repository | `ReplayRepository.loadReplayableSessionEvents()` reads PostgreSQL `event_log` only, filtered by `institution_id`, `simulation_session` stream/aggregate id, `replayable = true`, and `sequence > cursor`. |
| Scope validation | Requires existing temporary `x-clinmira-institution-id` and `x-clinmira-user-id`, validates the user exists, and scopes replay to a session with matching `institution_id`, `id`, `student_user_id`, and `deleted_at IS NULL`. |
| Cursor | `after_sequence` defaults to `0`; `limit` defaults to `100` and caps at `500`; `audience` defaults to `student`. |
| Source of truth | PostgreSQL `event_log` is the replay source; `outbox_events` remains the durable publishing queue. No frontend, Redis, provider, worker, or model state is read. |

## 4. Realtime Transport Summary

SSE was implemented because NestJS and RxJS are already installed and no package installation was required.

The SSE route is delivery-only:

- It calls `ReplayService.replaySession()` first.
- It emits filtered `replay_event` frames for already persisted replay events.
- It emits one safe `replay_complete` control frame with cursor/gap/duplicate metadata.
- It does not poll, publish, create background jobs, use Redis, use WebSocket, emit unpersisted domain events, or bypass replay redaction.

SSE is not production realtime readiness and does not unblock frontend integration.

## 5. Redaction and Audience Filtering

| Audience | Allowed | Redacted | Blocked |
| --- | --- | --- | --- |
| `student` | `public`, `student_safe`, and safety blocked/warning events converted to student-safe payloads. | All returned student events have `redaction_applied: true`; safety payloads are reduced to allowed keys. | `faculty_only`, `internal`, `audit_only`, non-safety `safety_restricted`, hidden diagnosis, raw facts, faculty notes, rubric/scoring/debrief targets, prompts, traces, API keys, and secrets. |
| `faculty` | `public`, `student_safe`, `faculty_only`, and `safety_restricted` metadata. | Restricted classifications return metadata-only payloads; secrets/prompts/raw hidden content are removed. | `internal`, `audit_only`, raw hidden facts, system/internal prompts, provider traces, API keys, and secrets. |
| `system` | All classification metadata may be represented. | Restricted/internal/audit payloads are metadata-only unless already public/student-safe; secrets/prompts/raw hidden content are removed. | API keys, provider secrets, tool secrets, system prompts, internal prompts, raw hidden fact content, and unsafe trace payloads. |

## 6. Sequence / Gap / Duplicate Handling

Replay is sequence-aware:

- Events are ordered by durable `event_log.sequence ASC, created_at ASC, id ASC`.
- `next_cursor.after_sequence` advances to the highest source event sequence in the returned page, even if some events are filtered out.
- `duplicate_count` is computed from duplicate sequence values in the returned source page.
- `gap_detected` is true when source replay sequences after the cursor are not contiguous.
- `snapshot_required` mirrors gap detection so future clients know a full snapshot reload may be required.
- Reconnect behavior is idempotent: callers pass the last received `after_sequence`, and the backend returns replayable events after that cursor.

## 7. Contract Updates

| Contract | Change |
| --- | --- |
| `shared/contracts/events/replay-request.schema.json` | Updated to session/audience/cursor/limit shape for Step 15 replay. |
| `shared/contracts/events/replay-response.schema.json` | Updated to `clinmira.replay.v1` response with events, cursor, gap, duplicate, redaction, and snapshot indicators. |
| `shared/contracts/events/replay-event.schema.json` | Added backend-filtered replay event item schema. |
| `shared/contracts/events/replay-cursor.schema.json` | Added reconnect cursor schema. |
| `shared/contracts/events/realtime-stream.schema.json` | Added delivery-only SSE frame schema. |
| `shared/contracts/CONTRACT_GOVERNANCE.md` | Updated Step 15 replay/SSE delivery-only governance. |
| `shared/contracts/CONTRACT_INVENTORY.md` | Updated active contracts/routes and blocked future contract families. |

No OpenAPI or frontend generated types were added in Step 15.

## 8. Tests and Checks

| Command | Ran? | Result | Notes |
| --- | --- | --- | --- |
| `pwd` | Yes | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Yes | Warning | Dirty repository remains from previous steps and existing frontend/prototype work. |
| `git diff --stat` | Yes | Warning | Tracked diff stat omits untracked Step 15 files until added to git. |
| `git branch --show-current` | Yes | Pass | `main`. |
| `find backend/api -maxdepth 8 -type f` | Yes | Warning | Inventory ran; output includes existing `node_modules` and generated `dist`. |
| `find backend/database -maxdepth 6 -type f` | Yes | Pass | Confirmed migrations/tests; no Step 15 migration added. |
| `find shared/contracts -maxdepth 8 -type f` | Yes | Pass | Confirmed event replay contracts/tests. |
| `find backend/evals -maxdepth 6 -type f` | Yes | Pass | Confirmed eval harness files. |
| `find backend/agent-worker -maxdepth 8 -type f` | Yes | Pass | Confirmed no Step 15 worker source edits. |
| `npm --prefix backend/api run test` | Yes | Pass | 8 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Yes | Pass | Backend TypeScript typecheck passed. |
| `npm --prefix backend/api run build` | Yes | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Yes | Pass | 5 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Yes | Blocked | `tsc` not found; no package install authorized. |
| `node --test backend/database/tests/*.test.mjs` | Yes | Pass | 11 database/static test files passed. |
| `node --test backend/evals/tests/*.test.mjs` | Yes | Pass | 7 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Yes | Pass with warning | Status `PASSED`; DB eval skipped because `CLINMIRA_TEST_DATABASE_URL` is not configured. |
| `python3 -m unittest discover -s tests` in `backend/agent-worker` | Yes | Pass | 57 worker tests passed. |
| OpenAI/API-key scan | Yes | Pass | No OpenAI imports/calls/API key/provider secret reads in scoped implementation source. |
| Package dependency scan | Yes | Pass | No OpenAI/Agents SDK dependency entries found. |
| Redis/WebSocket/Temporal scan | Yes | Pass | No Redis, WebSocket gateway, or Temporal runtime in backend API or agent-worker source. |
| Frontend mock source scan | Yes | Pass | No frontend/localStorage/mock source usage in backend API, worker, eval fixtures, or shared contracts outside tests. |
| Worker direct DB mutation scan | Yes | Pass | No worker DB clients, SQL mutation, `event_log`, or `outbox_events` writes. |
| Prisma/docker compose scan | Yes | Pass | No `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml` found. |

## 9. Remaining Warnings

- No DB-backed replay integration run because `CLINMIRA_TEST_DATABASE_URL` is absent.
- No production auth/RBAC; temporary actor headers are not production authorization.
- No production outbox publisher.
- No frontend integration or frontend reducer/replay client.
- No Redis source of truth, Redis fanout, or Redis stream.
- No WebSocket gateway.
- SSE is delivery-only and not source of truth.
- No Temporal runtime.
- No live OpenAI, OpenAI SDK, API key read, provider runtime, or live agents.
- No debrief, faculty workflow, treatment/order/imaging workflow, or production clinical workflow expansion.
- Shared contracts typecheck remains blocked until a separate approved dependency setup provides `tsc`.
- Existing dirty/prototype repository state remains.

## 10. Step 15R Readiness

Ready for Step 15R architecture review with warnings.

Step 15R must review replay source-of-truth integrity, redaction, payload classification enforcement, SSE delivery-only behavior, cursor/gap/duplicate handling, no frontend integration, no Redis/WebSocket/Temporal drift, no OpenAI/provider/live-agent drift, and missing DB-backed replay evidence.

Do not mark frontend integration, live agents, live OpenAI, production publisher, production auth/RBAC, Redis/WebSocket fanout, or production realtime ready.
