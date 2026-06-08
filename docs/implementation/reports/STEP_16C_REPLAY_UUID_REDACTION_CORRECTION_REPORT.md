# Step 16C - Replay/SSE UUID Validation and Replay Redaction Correction

## 1. Executive Verdict

STEP 16C COMPLETE WITH WARNINGS

Step 16C corrected only the two blockers found during the Step 16 DB-backed evidence attempt:

- Replay and delivery-only SSE now use one local PostgreSQL-compatible UUID validator.
- Replay redaction now removes frontend mock markers and `localStorage` markers recursively from persisted replay payloads.

Step 16 is not complete. The full Step 16 DB-backed replay and safety evidence run must be rerun from the beginning.

Warnings remain because shared contract typecheck still cannot run without `tsc` in `shared/contracts`, and Step 16 full create-session/action/safety/idempotency/event_log/outbox/replay/reconnect/gap/duplicate/SSE evidence has not been rerun.

## 2. Pre-flight Findings

| Item | Finding |
| --- | --- |
| Repository path | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| Step 16A | Complete; local PostgreSQL test database exists at sanitized target `127.0.0.1:55432/clinmira_ai_step16_test`. |
| Step 16 blocker | Replay rejected a valid PostgreSQL UUID with `session_id_invalid`. |
| Redaction blocker | Replay redaction removed hidden/prompt/secret markers but did not remove frontend mock or `localStorage` markers. |
| Scope | Limited to replay/realtime source, backend API tests, this report, and implementation status. |
| Forbidden features | No architecture document authorizes frontend integration, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty, treatment, order, imaging, package installs, migrations, seed edits, env edits, Compose runtime, Prisma/ORM, or real patient data in Step 16C. |

## 3. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| Frontend integration added | No. |
| Frontend files modified for Step 16C | No. Existing dirty/prototype frontend state remains pre-existing. |
| Live OpenAI/OpenAI SDK/API key read added | No. |
| Live agents/provider runtime added | No. |
| Redis/WebSocket/Temporal added | No. |
| Production publisher/auth/RBAC added | No. |
| Debrief/faculty/treatment/order/imaging workflow added | No. |
| Migrations or seeds edited | No. |
| Package or lockfile changed | No. |
| Env files changed | No. |
| Docker Compose/Prisma added | No. |
| Full Step 16 rerun performed | No. |

## 4. Files Changed

| File | Purpose |
| --- | --- |
| `backend/api/src/replay/replay-uuid.ts` | Added one shared local PostgreSQL UUID validator. |
| `backend/api/src/replay/replay.service.ts` | Replaced defective local regex with shared UUID helper. |
| `backend/api/src/replay/replay.controller.ts` | Replaced actor header regex with shared UUID helper. |
| `backend/api/src/realtime/realtime.controller.ts` | Replaced actor header regex with shared UUID helper for delivery-only SSE. |
| `backend/api/src/replay/replay-redaction.ts` | Extended recursive key/value redaction for frontend mock and `localStorage` marker families. |
| `backend/api/test/replay-uuid-redaction-step16c.test.mjs` | Added focused Step 16C UUID and redaction regression tests. |
| `backend/api/test/replay-runtime.test.mjs` | Tightened static guard so frontend marker strings are allowed only in redaction policy, not runtime imports/source-of-truth usage. |
| `backend/api/test/health-skeleton-guard.test.mjs` | Tightened broad frontend guard to exclude redaction-policy marker strings from false positives. |
| `docs/implementation/reports/STEP_16C_REPLAY_UUID_REDACTION_CORRECTION_REPORT.md` | Added this report. |
| `docs/implementation/IMPLEMENTATION_STATUS.md` | Updated Step 16C status and next step. |

## 5. UUID Validation Defect Summary

Step 16 found that the replay service rejected a valid PostgreSQL/RFC4122 session UUID before reaching the database lookup. The previous regex required the version nibble and variant position but accidentally omitted the final hyphen group shape by using `[89ab][0-9a-f]{12}` instead of `[0-9a-f]{4}-[0-9a-f]{12}`. This caused valid PostgreSQL UUID text to fail closed incorrectly.

Duplicate UUID regexes also existed in replay and realtime controllers, creating drift risk.

## 6. UUID Validation Correction

`backend/api/src/replay/replay-uuid.ts` now defines one local helper:

```ts
isPostgresUuid(value: unknown): value is string
```

The helper accepts only hyphenated PostgreSQL UUID text format:

```text
xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

It is hex-only, case-insensitive, and rejects missing values, empty strings, arrays, non-strings, malformed UUIDs, UUID-like strings with missing or extra groups, path traversal, query fragments, and whitespace-padded values.

Replay service, replay controller actor headers, and realtime/SSE actor headers now use the same helper. No dependency was added.

## 7. UUID Tests Added

`backend/api/test/replay-uuid-redaction-step16c.test.mjs` proves:

- Valid lowercase PostgreSQL UUID is accepted.
- Valid uppercase UUID is accepted.
- Valid mixed-case UUID is accepted.
- PostgreSQL-emitted UUID text reaches replay service lookup instead of failing validation.
- Missing, empty, array, non-string, no-hyphen, missing-group, extra-group, non-hex, path traversal, query-fragment, and whitespace-padded values are rejected.
- Replay service rejects malformed session IDs before DB work.
- Replay controller, realtime controller, and replay service all use the shared helper and no longer define local `UUID_PATTERN` constants.

## 8. Redaction Defect Summary

Step 16 found that persisted replay payloads could still emit frontend mock and `localStorage` markers in otherwise `student_safe` replay output. Hidden diagnosis, prompts, and secret-like markers were already being removed, but frontend/mock/localStorage marker families were not part of the recursive redaction policy.

This was a source-of-truth and safety-governance gap: backend replay must never trust frontend redaction, frontend mock state, or local storage state.

## 9. Redaction Correction

`backend/api/src/replay/replay-redaction.ts` now treats the following marker families as unsafe in keys and string values:

- `frontend_mock`
- `frontend mock`
- `mockFrontend`
- `mock_frontend`
- `mockData`
- `mock_data`
- `mockSource`
- `mock_source`
- `localStorage`
- `local_storage`
- `local-storage`
- `window.localStorage`
- frontend mock-data path-like strings

Unsafe object keys are removed. Unsafe scalar string values are replaced with `[redacted]`. Arrays and nested objects remain recursively sanitized. Safe event shape is preserved when possible, and redaction applies to student, faculty, and system replay output.

Existing redaction for hidden diagnosis, raw fact content, faculty-only notes, safety-only/evaluator-only material, prompts, provider traces, API keys, and secret-like fields remains active.

## 10. Redaction Tests Added

`backend/api/test/replay-uuid-redaction-step16c.test.mjs` proves:

- Frontend mock markers are removed from top-level keys.
- `mockData`/mock frontend markers are removed from nested keys.
- `localStorage`, `local_storage`, `window.localStorage`, and mock-source markers in string values are replaced with `[redacted]`.
- Arrays and mixed nested objects are recursively redacted.
- Student, faculty, and system audiences are covered.
- Existing hidden diagnosis, system prompt, provider trace, API-key, and faculty-only note redaction was not weakened.
- Tests use synthetic payloads only and do not import or read frontend files.

## 11. Targeted DB-backed UUID Probe Result

Result: PASS

A minimal local DB-backed probe was run against the Step 16A safe test database. The first attempt was blocked by sandbox networking with `connect EPERM 127.0.0.1:55432`; the same sanitized local-only probe was rerun with approved escalation.

The probe:

- Loaded `.env.local` without printing the database URL or secrets.
- Refused non-test database names.
- Inserted one synthetic institution, user, case, case version, simulation session, and replayable `event_log` row.
- Called the compiled `ReplayService.replaySession()` with a valid PostgreSQL UUID.
- Verified the valid UUID reached replay lookup.
- Verified one replay event returned.
- Verified frontend mock and `localStorage` markers were absent from serialized replay output.

Sanitized result:

```json
{
  "db_probe": "passed",
  "host": "127.0.0.1",
  "port": "55432",
  "database": "clinmira_ai_step16_test",
  "replay_events": 1,
  "uuid_validation": "valid_uuid_reached_replay_lookup",
  "redaction": "frontend_and_localstorage_markers_removed"
}
```

This probe does not complete Step 16 and does not replace full Step 16 evidence.

## 12. Forbidden Implementation Scan Results

| Scan | Result |
| --- | --- |
| OpenAI SDK/import/call/API key read in replay/realtime source | Pass; no matches. |
| Redis/WebSocket/Temporal runtime in replay/realtime source | Pass; no matches. |
| Prisma/ORM usage | Pass; no `schema.prisma` and no Prisma runtime matches. |
| Frontend imports/mock-data imports in replay/realtime source | Pass; no matches. |
| Frontend mock/localStorage marker mentions | Pass with expected matches only in redaction policy and tests. |
| Worker direct DB mutation scan | Pass; no worker DB/client/event_log/outbox mutation matches. |
| Forbidden-file diff scan | Pass for Step 16C scope; no Step 16C edits under frontend, agent-worker source, migrations, seeds, shared contracts, packages, env files, Docker Compose, Prisma, or architecture docs. Existing dirty repository state remains from prior steps. |

## 13. Commands Run and Results

| Command | Result | Notes |
| --- | --- | --- |
| `pwd` | Pass | Confirmed project path. |
| `git status --short` | Warning | Repository remains dirty from prior staged/untracked architecture, backend, frontend, shared, infra, and report work. |
| `.env.local` presence check | Pass | Root and backend API env files present; no secret values printed. |
| `npm --prefix backend/api run test` | Pass | 9 backend API test files passed. |
| `node --test backend/api/test/replay-uuid-redaction-step16c.test.mjs backend/api/test/replay-runtime.test.mjs backend/api/test/replay-redaction.test.mjs backend/api/test/realtime-gateway-guard.test.mjs` | Pass | Focused Step 16C, replay runtime, replay redaction, and realtime guard tests passed. |
| `npm --prefix backend/api run typecheck` | Pass | TypeScript no-emit check passed. |
| `npm --prefix backend/api run build` | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Pass | 5 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Blocked | `tsc` not found; no package install authorized. Existing warning, not caused by Step 16C. |
| `node --test backend/database/tests/*.test.mjs` | Pass | 11 database static test files passed. |
| `node --test backend/evals/tests/*.test.mjs` | Pass | 7 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Pass with warning | Status `PASSED`; DB eval still skipped because `CLINMIRA_TEST_DATABASE_URL` was not configured for the eval runner environment. |
| `python3 -m unittest discover -s tests` in `backend/agent-worker` | Pass | 57 worker tests passed. |
| Focused Step 16C tests | Pass | Included in backend API test suite. |
| Targeted local DB UUID/redaction probe | Pass after escalation | Initial sandbox `EPERM`; escalated local-only probe passed. |
| Source-only forbidden runtime scans | Pass | No forbidden runtime matches in replay/realtime source. |
| Frontend/localStorage source-of-truth import scan | Pass | No frontend/mock-data imports in replay/realtime source. |
| Worker direct DB mutation scan | Pass | No worker DB mutation matches. |
| Prisma/Compose scan | Pass | No `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml`. |

## 14. Intentionally Not Implemented

- No full Step 16 rerun.
- No frontend integration.
- No live OpenAI, OpenAI SDK, OpenAI import/call, or API key read.
- No live agents or provider runtime.
- No Redis, WebSocket gateway, or production realtime fanout.
- No Temporal workflow or worker.
- No production outbox publisher.
- No production auth/RBAC.
- No debrief, faculty workflow, treatment workflow, order workflow, imaging workflow, scoring, or clinical advice.
- No migration or seed edits.
- No package or lockfile changes.
- No env file edits.
- No Docker Compose runtime.
- No Prisma/ORM.
- No real patient data.
- No use of frontend mocks or localStorage as backend truth.

## 15. Remaining Warnings and Blockers

- Step 16 full DB-backed replay and safety evidence remains incomplete and must be rerun from the beginning.
- Shared contract typecheck remains blocked because `tsc` is not installed in `shared/contracts`.
- Eval runner DB-backed integration eval remains skipped in the command environment.
- Production auth/RBAC is absent; temporary actor headers remain non-production.
- Production outbox publisher is absent.
- Frontend integration remains blocked.
- Live OpenAI, live agents, and provider runtime remain blocked.
- Redis/WebSocket fanout and Temporal remain blocked.
- Debrief, faculty workflow, treatment/order/imaging workflows remain blocked.
- Dirty repository state remains from prior staged/untracked work.

## 16. Next Recommended Task

Rerun Step 16 only as DB-backed Replay and Safety Integration Evidence from the beginning using the Step 16A local database and this Step 16C report.

Exact next task:

```text
Use docs/implementation/reports/STEP_16C_REPLAY_UUID_REDACTION_CORRECTION_REPORT.md, docs/implementation/reports/STEP_16_DB_BACKED_REPLAY_SAFETY_EVIDENCE_REPORT.md, docs/implementation/reports/STEP_16A_LOCAL_POSTGRES_SETUP_REPORT.md, docs/implementation/reports/STEP_15R_REALTIME_GATEWAY_ARCHITECTURE_REVIEW_REPORT.md, docs/implementation/IMPLEMENTATION_STATUS.md, docs/implementation/IMPLEMENTATION_PLAYBOOK.md, docs/implementation/NO_GO_RULES.md, docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md, docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md, and docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md.

Rerun Step 16 only as DB-backed Replay and Safety Integration Evidence from the beginning using the Step 16A local database. Do not add frontend integration, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, package installs, migrations, seed edits, env-file changes, Docker Compose runtime, Prisma/ORM, or real patient data.
```
