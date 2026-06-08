# Step 16 Execution Guide

## Purpose

This guide defines the commands required to execute Step 16 DB-backed replay and safety integration evidence after a safe local PostgreSQL test database exists.

Step 16A did not implement product features. This guide is procedural documentation only.

## Preconditions

Before running Step 16:

- `clinmira_test` exists.
- `clinmira_test_user` exists.
- `CLINMIRA_TEST_DATABASE_URL` points to the disposable local test database.
- The database is not production, staging, pilot, shared QA, or real data.
- No env file is created.
- No frontend integration, live OpenAI, live agents, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty, treatment, order, or imaging workflow is added.

Required shell:

```bash
cd /home/mohammad/Projects/ClinMira-AI
export CLINMIRA_TEST_DATABASE_URL='postgresql://clinmira_test_user:<password>@127.0.0.1:5432/clinmira_test'
export CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL"
export API_PORT=3001
```

## Safety Stop

Run this before any destructive reset:

```bash
case "$CLINMIRA_TEST_DATABASE_URL" in
  *"/clinmira_test"*) printf '%s\n' "Safe-looking local test database URL accepted for Step 16." ;;
  *) printf '%s\n' "Refusing: CLINMIRA_TEST_DATABASE_URL must point to clinmira_test."; exit 1 ;;
esac
```

This check is not a complete security control. The human operator must still confirm the URL is local and disposable.

## Optional Disposable Reset

Use only for the local disposable `clinmira_test` database:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT CREATE, USAGE ON SCHEMA public TO clinmira_test_user;"
```

Do not run this against any shared or non-disposable database.

## Migration Commands

Apply migrations in strict order:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0001_core_identity_and_audit.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0002_case_versioning_and_fact_ledger.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0003_event_log_outbox_idempotency.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0004_mock_simulation_session_engine.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/migrations/0005_deterministic_safety_engine.sql
```

Verify:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT version, name, success FROM schema_migrations ORDER BY version;"
```

Expected:

- Exactly `0001`, `0002`, `0003`, `0004`, and `0005`.
- Every `success` value is `true`.

## Seed Commands

Apply synthetic seeds:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/seeds/0001_dev_synthetic_identity_seed.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/seeds/0002_dev_synthetic_case_fact_seed.sql
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/database/seeds/0005_deterministic_safety_rules_seed.sql
```

Verify:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS institutions FROM institutions;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS users FROM users;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT visibility, count(*) FROM fact_ledger GROUP BY visibility ORDER BY visibility;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT count(*) AS safety_rules FROM safety_rules WHERE enabled = true;"
```

## Database Validation Commands

Required extension:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT extname FROM pg_extension WHERE extname = 'pgcrypto';"
```

Required tables:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

Event log constraints:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT conname FROM pg_constraint WHERE conname IN ('event_log_stream_sequence_uq', 'event_log_payload_classification_ck', 'event_log_redaction_status_ck') ORDER BY conname;"
```

Outbox constraints:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT conname FROM pg_constraint WHERE conname IN ('outbox_events_event_institution_fk', 'outbox_events_event_topic_uq', 'outbox_events_status_ck') ORDER BY conname;"
```

Safety persistence constraints:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT conname FROM pg_constraint WHERE conname IN ('safety_evaluations_session_institution_fk', 'safety_evaluations_action_institution_fk', 'safety_findings_evaluation_institution_fk') ORDER BY conname;"
```

Reference-only reveal table shape:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'session_revealed_facts' ORDER BY ordinal_position;"
```

Forbidden tables:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('hidden_facts', 'revealed_facts', 'orders', 'imaging_results', 'debrief_reports', 'faculty_reviews', 'agent_runs', 'model_runs', 'tool_calls', 'websocket_connections', 'redis_streams', 'temporal_workflows') ORDER BY table_name;"
```

Expected: zero rows.

## Repository Regression Commands

Run non-DB and DB-aware repository checks:

```bash
npm --prefix backend/api run test
npm --prefix backend/api run typecheck
npm --prefix backend/api run build
npm --prefix shared/contracts run test
node --test backend/database/tests/*.test.mjs
node --test backend/evals/tests/*.test.mjs
node backend/evals/lib/eval-runner.mjs
cd backend/agent-worker && python3 -m unittest discover -s tests
```

Known warning:

- `npm --prefix shared/contracts run typecheck` may remain blocked until `tsc` is installed in `shared/contracts`.

## API Runtime Commands

Build and start the API against the disposable test database:

```bash
cd /home/mohammad/Projects/ClinMira-AI
export CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL"
export API_PORT=3001
npm --prefix backend/api run build
npm --prefix backend/api run start
```

In another shell with the same database URL:

```bash
export CLINMIRA_TEST_DATABASE_URL='postgresql://clinmira_test_user:<password>@127.0.0.1:5432/clinmira_test'
export CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL"
```

Health check:

```bash
curl -fsS http://127.0.0.1:3001/api/v1/health
```

Expected: health response reports database as configured for simulation.

## Step 16 Evidence Targets

Step 16 must produce DB-backed evidence for all of these:

- Migrations `0001` through `0005` applied and recorded.
- Synthetic seed setup applied.
- Create-session route persists `simulation_sessions`, `timeline_events`, `session_state_snapshots`, `event_log`, and `outbox_events`.
- Safe submit-action route persists `clinical_actions`, `conversation_messages`, `timeline_events`, `session_state_snapshots`, `event_log`, and `outbox_events`.
- Safety-blocked action persists `safety_evaluations`, `safety_findings`, safety timeline events, `event_log`, and `outbox_events`.
- Unsafe mutation is not accepted for treatment/order/diagnosis attempts.
- Idempotency key reuse prevents duplicate action effects.
- Replay route reads persisted `event_log` rows.
- `after_sequence` returns only later events.
- Replay returns advancing cursor metadata.
- Replay redaction strips hidden facts, raw fact content, faculty-only notes, prompts, traces, and secrets for student/faculty/system audiences as applicable.
- Gap and duplicate behavior is either proven or explicitly documented with current constraints.
- SSE route remains replay-first and delivery-only.

## Known Execution Gap

The current synthetic seed IDs are deterministic all-zero style UUIDs. Current API controllers require RFC4122-style UUID version/variant nibbles.

Do not claim route-level Step 16 evidence if API calls fail because seeded IDs are rejected by UUID validation.

Acceptable next actions are:

- Use Step 16 to add approved DB-backed test fixtures with valid synthetic UUIDs if explicitly in scope.
- Or run a separate approved seed correction task.
- Or record Step 16 as blocked by seed/API UUID compatibility.

Unacceptable shortcuts:

- Weakening UUID validation just to make seeded IDs pass.
- Hardcoding default demo actor IDs in controllers.
- Treating frontend mock data as fixture truth.
- Using real patient data.
- Skipping route evidence while claiming route evidence passed.

## Expected Success Criteria

Step 16 succeeds only if:

- `CLINMIRA_TEST_DATABASE_URL` is present and safe.
- PostgreSQL 16.x connection succeeds.
- `pgcrypto` exists.
- Migrations `0001` through `0005` apply in order.
- `schema_migrations` has `0001` through `0005` with `success = true`.
- Synthetic seeds apply.
- Required table, constraint, and index validations pass.
- Existing non-DB regression suites pass.
- DB-backed simulation, safety, replay, redaction, idempotency, event log, and outbox evidence is produced or explicitly blocked with cause.
- No forbidden runtime or product scope is added.

## Failure Criteria

Stop and report if any of these occur:

- `CLINMIRA_TEST_DATABASE_URL` is absent.
- The URL points anywhere other than a disposable local/CI test database.
- Migration apply fails.
- `schema_migrations` is missing any of `0001` through `0005`.
- `pgcrypto` is missing.
- Required tables or constraints are missing.
- Forbidden tables exist.
- API route evidence cannot run because seed IDs fail UUID validation and no approved valid fixture exists.
- Hidden fact leakage appears in replay or response payloads.
- A treatment/order/diagnosis attempt is accepted as clinical mutation.
- Duplicate idempotency key creates duplicate durable effects.
- Replay reads from anything other than PostgreSQL `event_log`.
- Outbox is treated as published without a production publisher.
- Redis, WebSocket, frontend state, SSE, or model memory is treated as source of truth.
- Any OpenAI SDK/import/call/API key read, live agent, Temporal runtime, production auth/RBAC, production publisher, frontend integration, package install, env file, Docker compose runtime, migration, debrief, faculty, treatment, order, or imaging workflow is added.

## Exact Step 16 Run Command

After setup, the command context needed before rerunning the Step 16 Codex task is:

```bash
cd /home/mohammad/Projects/ClinMira-AI
export CLINMIRA_TEST_DATABASE_URL='postgresql://clinmira_test_user:<password>@127.0.0.1:5432/clinmira_test'
export CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL"
```

Then rerun the Step 16 task prompt as DB-backed Replay and Safety Integration Evidence.

Do not proceed to frontend integration, Step 16R acceptance, production publisher, live OpenAI, live agents, Redis/WebSocket fanout, Temporal, or production realtime until Step 16 evidence is real and reviewed.
