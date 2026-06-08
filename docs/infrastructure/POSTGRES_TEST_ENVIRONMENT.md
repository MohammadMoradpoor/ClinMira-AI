# PostgreSQL Test Environment

## Purpose

This document defines the local PostgreSQL test environment required to unblock Step 16 DB-backed replay and safety evidence.

Step 16A is infrastructure preparation only. It does not authorize product features, frontend integration, OpenAI integration, live agents, Redis/WebSocket infrastructure, Temporal workflows, production auth/RBAC, production publishers, new migrations, new simulation behavior, new replay behavior, or new safety behavior.

## Source Of Truth Inputs

This environment is governed by:

- `docs/implementation/IMPLEMENTATION_STATUS.md`
- `docs/implementation/IMPLEMENTATION_BACKLOG.md`
- `docs/implementation/IMPLEMENTATION_PLAYBOOK.md`
- `docs/implementation/NO_GO_RULES.md`
- `docs/architecture/`
- `backend/database/`
- `backend/api/src/database/`
- `backend/api/test/`

The repository currently treats reviewed SQL in `backend/database/migrations/` as the schema authority. Prisma Migrate, ORM auto-sync, Python-generated migrations, Docker compose runtime, and frontend mock state are not schema authorities.

## Required PostgreSQL Version

Use PostgreSQL 16.x for local Step 16 validation.

The local client observed during Step 16A is:

```text
psql (PostgreSQL) 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)
```

PostgreSQL 16.x is the required local target because it matches the available client and supports the repository's current use of:

- `pgcrypto`
- `gen_random_uuid()`
- `jsonb`
- GIN indexes on JSONB payloads
- partial indexes
- PL/pgSQL trigger functions
- transactional DDL
- composite foreign keys

Older PostgreSQL versions must not be used for Step 16 evidence unless a separate architecture review explicitly accepts them.

## Required Extensions

The required extension is:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

`0001_core_identity_and_audit.sql` creates this extension. The test database owner must have enough permission to create it, or a PostgreSQL superuser must preinstall it in `clinmira_test`.

Validation query:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';"
```

Expected result: one row with `pgcrypto`.

## Expected Database

Use this local test database:

```text
database: clinmira_test
role: clinmira_test_user
schema: public
```

The database must be disposable and safe for destructive setup. It must not be production, staging, pilot, shared QA, or any database containing real or institution-owned data.

## Expected Schemas

The current migrations create objects in the default `public` schema only.

Expected extension:

- `pgcrypto`

Expected tables after migrations `0001` through `0005`:

- `schema_migrations`
- `institutions`
- `users`
- `roles`
- `cohorts`
- `enrollments`
- `audit_logs`
- `cases`
- `case_versions`
- `patient_twins`
- `patient_personas`
- `fact_ledger`
- `fact_reveal_rules`
- `fact_access_policies`
- `idempotency_keys`
- `event_log`
- `outbox_events`
- `simulation_sessions`
- `clinical_actions`
- `session_revealed_facts`
- `conversation_messages`
- `timeline_events`
- `session_state_snapshots`
- `safety_rules`
- `safety_evaluations`
- `safety_findings`

Forbidden tables for Step 16A and Step 16 setup:

- `hidden_facts`
- `revealed_facts`
- `orders`
- `imaging_results`
- `scores`
- `debrief_reports`
- `faculty_reviews`
- `agent_runs`
- `model_runs`
- `tool_calls`
- `websocket_connections`
- `redis_streams`
- `temporal_workflows`
- `event_consumers`
- `replay_cursors`

## Migration Order

Apply migrations in strict numeric order. Do not skip, reorder, cherry-pick, or manually edit them.

| Order | Migration | Required Before | Adds |
| --- | --- | --- | --- |
| 1 | `0001_core_identity_and_audit.sql` | All later migrations | `pgcrypto`, `schema_migrations`, identity, tenancy, roles, cohorts, enrollments, audit logs, `set_updated_at()`. |
| 2 | `0002_case_versioning_and_fact_ledger.sql` | Simulation sessions, safety, replay evidence | Cases, immutable case versions, patient twins/personas, canonical `fact_ledger`, reveal rules, access policies. |
| 3 | `0003_event_log_outbox_idempotency.sql` | Mock simulation runtime, replay, SSE evidence | `idempotency_keys`, durable `event_log`, durable `outbox_events`. |
| 4 | `0004_mock_simulation_session_engine.sql` | Safety persistence, create-session/action evidence | `simulation_sessions`, `clinical_actions`, messages, timeline, snapshots, reference-only revealed facts. |
| 5 | `0005_deterministic_safety_engine.sql` | Safety block/warn evidence | `safety_rules`, `safety_evaluations`, `safety_findings`, safety timeline event names. |

## Seed Order

Apply only the synthetic development seeds after all migrations:

| Order | Seed | Purpose |
| --- | --- | --- |
| 1 | `0001_dev_synthetic_identity_seed.sql` | Synthetic tenant, student, faculty, admin, cohort, enrollment, audit seed. |
| 2 | `0002_dev_synthetic_case_fact_seed.sql` | Synthetic case version, patient twin/persona, one visible fact, one restricted hidden fact, reveal rule, access policies. |
| 3 | `0005_deterministic_safety_rules_seed.sql` | Global deterministic safety rules only. |

These seeds are not production data, clinical care data, patient data, frontend source data, or hidden-fact leakage authorization.

## Safety Requirements

- Use only a disposable local or CI test database.
- Never point `CLINMIRA_TEST_DATABASE_URL` at production, staging, pilot, shared QA, or any database with real data.
- Do not create `.env`, `.env.local`, checked-in credentials, Docker compose runtime, or package changes for Step 16A.
- Keep `CLINMIRA_TEST_DATABASE_URL` in the current shell only.
- Map `CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL"` only when running the NestJS API against the local test database.
- Do not install OpenAI SDKs or add OpenAI environment variables.
- Do not add Redis, WebSocket, Temporal, production publisher, production auth/RBAC, frontend integration, agent runtime, debrief, faculty, treatment, order, or imaging workflows.
- Treat PostgreSQL as the only durable source of truth for Step 16 evidence.
- Treat SSE as delivery-only; it must not become source of truth.
- Treat `outbox_events` as a durable queue only; Step 16A does not add a publisher.

## Local Environment Requirements

Required local tools:

- Linux shell
- PostgreSQL 16.x server
- `psql`
- Node/npm dependencies already present for `backend/api`, `shared/contracts`, `backend/database`, and `backend/evals`
- Python 3 for the existing agent-worker regression suite

Expected runtime settings:

```bash
export CLINMIRA_TEST_DATABASE_URL='postgresql://clinmira_test_user:<password>@127.0.0.1:5432/clinmira_test'
export CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL"
export API_PORT=3001
```

`CLINMIRA_DATABASE_URL` is required by `backend/api/src/database/database.service.ts`. `CLINMIRA_TEST_DATABASE_URL` is required by the Step 16 test/eval gate. For Step 16, both should point to the same disposable local database in the current shell.

## Test Environment Requirements

The test role must be able to:

- Connect to `clinmira_test`.
- Create the `pgcrypto` extension, or use it after a superuser preinstalls it.
- Create tables, indexes, triggers, functions, constraints, and comments in `public`.
- Insert synthetic seed data.
- Drop and recreate the `public` schema when resetting a disposable database.
- Run read/write integration checks against simulation, safety, event, outbox, and replay tables.

The test environment must not require:

- Docker compose.
- Redis.
- WebSockets.
- Temporal.
- OpenAI credentials.
- Frontend runtime.
- Production auth provider.
- Production publisher.

## Audit And Gap Analysis

| Area | Finding | Readiness |
| --- | --- | --- |
| Existing migrations | Migrations `0001` through `0005` exist, are SQL-first, and record rows in `schema_migrations`. | Ready for local apply validation. |
| Migration ordering | Later migrations depend on objects created earlier, especially `set_updated_at()`, identity tables, case/fact tables, `idempotency_keys`, `event_log`, and simulation tables. | Must apply in numeric order only. |
| Migration dependencies | `0005` depends on `simulation_sessions`, `clinical_actions`, and `timeline_events`; `0004` depends on `case_versions`, `fact_ledger`, `fact_reveal_rules`, and `idempotency_keys`; `0003` depends on identity tables. | Ready if full chain is applied. |
| Migration runner | No migration runner exists. | Gap: Step 16 setup must use explicit `psql -f` commands. |
| Rollback migrations | No down migrations exist. | Gap: local rollback is database/schema reset only. Production rollback remains out of scope. |
| Static tests | Database static tests exist and pass in prior Step 16 evidence. | Ready as non-DB guardrails. |
| DB-backed tests | Existing DB-aware backend test only checks `schema_migrations` for `0001` through `0004` when `CLINMIRA_TEST_DATABASE_URL` exists. | Gap: Step 16 must add or perform DB-backed evidence for `0005`, runtime persistence, replay, outbox, idempotency, redaction, and safety. |
| Eval runner | Eval runner reports DB evals as skipped when `CLINMIRA_TEST_DATABASE_URL` is absent. | Gap: current eval runner does not implement DB-backed runtime evals; Step 16 must not fake them. |
| Seed requirements | Synthetic identity, case/fact, and safety seeds exist. | Partially ready. |
| Seed/API UUID compatibility | Seed UUIDs are deterministic all-zero style values, but API controllers validate RFC4122-style UUID version/variant nibbles. | Gap: API-route Step 16 evidence needs a valid-UUID synthetic fixture setup or an approved seed/validator correction before route calls can use seeded IDs. |
| Event log requirements | `event_log` enforces tenant, stream, sequence, replayability, classification, redaction status, indexes, and uniqueness. | Schema ready; DB-backed replay evidence still required. |
| Outbox requirements | `outbox_events` has event FK, topic uniqueness, status lifecycle, attempts, pending publisher index. | Schema ready; no publisher added. |
| Replay requirements | Step 15 replay reads PostgreSQL `event_log`; no replay migration was added. | Runtime exists; DB-backed replay/reconnect/redaction evidence still required. |
| Safety persistence | `safety_rules`, `safety_evaluations`, and `safety_findings` exist and store sanitized excerpts. | Schema ready; DB-backed safety block/warn evidence still required. |
| Redaction | Unit/static redaction tests exist. | DB-backed hostile payload replay evidence still required. |
| Production hardening | RLS, production auth/RBAC, production publisher, Redis/WebSocket fanout, Temporal, live agents, and frontend integration remain blocked. | Not ready by design. |

## Forbidden Production Usage

This setup is for local and CI-style validation only.

Do not use this database, role, password, seed data, setup guide, or rollback procedure for production, staging, pilot, customer demos, university pilots, real patient data, or institution-owned data.

Step 16A docs do not constitute production readiness. They only remove the local database provisioning ambiguity that blocked DB-backed evidence.
