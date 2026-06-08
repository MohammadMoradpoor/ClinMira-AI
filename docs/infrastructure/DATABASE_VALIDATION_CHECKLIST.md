# Database Validation Checklist

## Purpose

This checklist is for manually verifying that a local PostgreSQL test database is ready for Step 16 DB-backed replay and safety evidence.

Every item must be checked against the disposable `clinmira_test` database. Do not use this checklist to approve production, staging, pilot, or real-data environments.

## Environment

- [ ] `CLINMIRA_TEST_DATABASE_URL` is set in the current shell.
- [ ] `CLINMIRA_TEST_DATABASE_URL` points to `clinmira_test`.
- [ ] `CLINMIRA_TEST_DATABASE_URL` does not point to production, staging, pilot, shared QA, or a real-data database.
- [ ] `CLINMIRA_DATABASE_URL` is set to the same value only for local API runtime validation.
- [ ] No `.env` or checked-in credential file was created.
- [ ] PostgreSQL server major version is `16`.
- [ ] `psql "$CLINMIRA_TEST_DATABASE_URL" -c "SELECT current_database(), current_user, version();"` succeeds.

## Migrations

- [ ] `0001_core_identity_and_audit.sql` applied successfully.
- [ ] `0002_case_versioning_and_fact_ledger.sql` applied successfully.
- [ ] `0003_event_log_outbox_idempotency.sql` applied successfully.
- [ ] `0004_mock_simulation_session_engine.sql` applied successfully.
- [ ] `0005_deterministic_safety_engine.sql` applied successfully.
- [ ] `schema_migrations` exists.
- [ ] `schema_migrations` contains exactly the expected versions `0001`, `0002`, `0003`, `0004`, and `0005`.
- [ ] Every expected migration row has `success = true`.
- [ ] `pgcrypto` exists in `pg_extension`.
- [ ] `gen_random_uuid()` returns a UUID.
- [ ] No migration was edited locally to force apply.
- [ ] No migration was skipped or applied out of order.

Manual query:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT version, name, success FROM schema_migrations ORDER BY version;"
```

## Expected Tables

- [ ] `institutions` exists.
- [ ] `users` exists.
- [ ] `roles` exists.
- [ ] `cohorts` exists.
- [ ] `enrollments` exists.
- [ ] `audit_logs` exists.
- [ ] `cases` exists.
- [ ] `case_versions` exists.
- [ ] `patient_twins` exists.
- [ ] `patient_personas` exists.
- [ ] `fact_ledger` exists.
- [ ] `fact_reveal_rules` exists.
- [ ] `fact_access_policies` exists.
- [ ] `idempotency_keys` exists.
- [ ] `event_log` exists.
- [ ] `outbox_events` exists.
- [ ] `simulation_sessions` exists.
- [ ] `clinical_actions` exists.
- [ ] `session_revealed_facts` exists.
- [ ] `conversation_messages` exists.
- [ ] `timeline_events` exists.
- [ ] `session_state_snapshots` exists.
- [ ] `safety_rules` exists.
- [ ] `safety_evaluations` exists.
- [ ] `safety_findings` exists.

Manual query:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

## Forbidden Tables

- [ ] `hidden_facts` does not exist.
- [ ] `revealed_facts` does not exist.
- [ ] `orders` does not exist.
- [ ] `imaging_results` does not exist.
- [ ] `scores` does not exist.
- [ ] `debrief_reports` does not exist.
- [ ] `faculty_reviews` does not exist.
- [ ] `agent_runs` does not exist.
- [ ] `model_runs` does not exist.
- [ ] `tool_calls` does not exist.
- [ ] `websocket_connections` does not exist.
- [ ] `redis_streams` does not exist.
- [ ] `temporal_workflows` does not exist.
- [ ] `event_consumers` does not exist.
- [ ] `replay_cursors` does not exist.

Manual query:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('hidden_facts', 'revealed_facts', 'orders', 'imaging_results', 'scores', 'debrief_reports', 'faculty_reviews', 'agent_runs', 'model_runs', 'tool_calls', 'websocket_connections', 'redis_streams', 'temporal_workflows', 'event_consumers', 'replay_cursors') ORDER BY table_name;"
```

Expected: zero rows.

## Seeds

- [ ] `0001_dev_synthetic_identity_seed.sql` applied.
- [ ] `0002_dev_synthetic_case_fact_seed.sql` applied.
- [ ] `0005_deterministic_safety_rules_seed.sql` applied.
- [ ] Seeded institution is synthetic.
- [ ] Seeded users use example/demo identity only.
- [ ] Fact ledger has at least one `baseline_visible` fact.
- [ ] Fact ledger has at least one `hidden_until_revealed` fact.
- [ ] Hidden facts have no `student_safe_summary` before reveal.
- [ ] Safety rules exist and are enabled.
- [ ] No seed came from frontend mock data, localStorage, real patient data, PHI, MRN, SSN, DOB, or EHR data.

Manual queries:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT id, slug, settings FROM institutions;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT email, profile FROM users ORDER BY email;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT visibility, count(*) FROM fact_ledger GROUP BY visibility ORDER BY visibility;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT fact_key, visibility, student_safe_summary IS NULL AS summary_is_null FROM fact_ledger ORDER BY fact_key;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT category, count(*) FROM safety_rules WHERE enabled = true GROUP BY category ORDER BY category;"
```

## Event Log

- [ ] `event_log` has tenant scope through `institution_id`.
- [ ] `event_log_stream_sequence_uq` exists.
- [ ] `event_log_institution_id_id_uq` exists.
- [ ] `event_log_sequence_positive_ck` exists.
- [ ] `event_log_payload_object_ck` exists.
- [ ] `event_log_payload_classification_ck` exists.
- [ ] `event_log_redaction_status_ck` exists.
- [ ] `event_log_stream_sequence_idx` exists.
- [ ] `event_log_replayable_idx` exists.
- [ ] `event_log_payload_classification_idx` exists.
- [ ] Step 16 create-session/action/safety checks produce `event_log` rows.
- [ ] Event sequence starts at `1` for a session stream.
- [ ] Event sequence is strictly increasing per `(institution_id, stream_type, stream_id)`.
- [ ] Replay reads `event_log`; no Redis, SSE, WebSocket, frontend state, or outbox table is replay truth.

Manual queries:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT conname FROM pg_constraint WHERE conname LIKE 'event_log_%' ORDER BY conname;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT indexname FROM pg_indexes WHERE tablename = 'event_log' ORDER BY indexname;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT stream_type, stream_id, sequence, event_type, payload_classification, replayable, redaction_status FROM event_log ORDER BY created_at, sequence;"
```

## Outbox Events

- [ ] `outbox_events` has tenant scope through `institution_id`.
- [ ] `outbox_events_event_institution_fk` exists.
- [ ] `outbox_events_event_topic_uq` exists.
- [ ] `outbox_events_status_ck` exists.
- [ ] `outbox_events_attempts_nonnegative_ck` exists.
- [ ] `outbox_events_pending_publisher_idx` exists.
- [ ] Step 16 create-session/action/safety checks produce `outbox_events` rows after committed mutations.
- [ ] `outbox_events.status` remains a durable queue status.
- [ ] No production publisher is added or claimed by Step 16A.
- [ ] SSE is not treated as outbox publishing truth.

Manual queries:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT conname FROM pg_constraint WHERE conname LIKE 'outbox_events_%' ORDER BY conname;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT indexname FROM pg_indexes WHERE tablename = 'outbox_events' ORDER BY indexname;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT topic, status, attempts, published_at, dead_lettered_at FROM outbox_events ORDER BY created_at;"
```

## Safety Persistence

- [ ] `safety_rules` exists and contains deterministic rules.
- [ ] `safety_evaluations` exists.
- [ ] `safety_findings` exists.
- [ ] `safety_evaluations_session_institution_fk` exists.
- [ ] `safety_evaluations_action_institution_fk` exists.
- [ ] `safety_findings_evaluation_institution_fk` exists.
- [ ] `input_text_excerpt` is length-constrained.
- [ ] `output_text_excerpt` is length-constrained.
- [ ] `matched_excerpt` is length-constrained.
- [ ] Step 16 unsafe action check persists at least one blocking safety evaluation.
- [ ] Step 16 unsafe action check persists at least one safety finding.
- [ ] Safety persistence does not store hidden fact payloads, faculty notes, system prompts, answer keys, provider traces, API keys, or tool secrets.

Manual queries:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT conname FROM pg_constraint WHERE conname LIKE 'safety_%' ORDER BY conname;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT decision, blocked, max_severity, reason, ruleset_version FROM safety_evaluations ORDER BY created_at;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT rule_key, category, severity, action, message FROM safety_findings ORDER BY created_at;"
```

## Replay Persistence

- [ ] Replay route returns persisted `event_log` rows.
- [ ] Replay route filters by `institution_id`.
- [ ] Replay route filters by `stream_type = 'simulation_session'`.
- [ ] Replay route filters by session stream id.
- [ ] Replay route filters `replayable = true`.
- [ ] Replay route orders by sequence.
- [ ] `after_sequence = 0` returns initial replayable events.
- [ ] `after_sequence = N` returns only events with sequence greater than `N`.
- [ ] `next_cursor.after_sequence` advances to the last returned sequence.
- [ ] Gap metadata is documented if a gap is detected.
- [ ] Duplicate metadata is documented if duplicate sequence data is observed.
- [ ] Snapshot fallback requirement is documented when needed.

Manual query:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT stream_id, sequence, event_type FROM event_log WHERE stream_type = 'simulation_session' AND replayable = true ORDER BY stream_id, sequence;"
```

## Idempotency

- [ ] `idempotency_keys` exists.
- [ ] `idempotency_keys_lookup_uq` exists.
- [ ] `idempotency_keys_response_event_institution_fk` exists.
- [ ] Mutating API path reserves idempotency key before durable action effects.
- [ ] Reusing the same idempotency key with the same request returns cached response or no duplicate durable mutation.
- [ ] Reusing the same idempotency key with a different request fails as conflict.
- [ ] Duplicate action submission does not create duplicate `clinical_actions`.
- [ ] Duplicate action submission does not create duplicate `event_log` rows.
- [ ] Duplicate action submission does not create duplicate `outbox_events`.

Manual queries:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT conname FROM pg_constraint WHERE conname LIKE 'idempotency_keys_%' ORDER BY conname;"
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT command_scope, idempotency_key, request_hash, status, response_event_id FROM idempotency_keys ORDER BY created_at;"
```

## Redaction

- [ ] Student replay contains only public/student-safe events or sanitized safety events.
- [ ] Student replay does not expose `hidden_diagnosis`.
- [ ] Student replay does not expose `raw_fact_content`.
- [ ] Student replay does not expose `faculty_only_notes`.
- [ ] Student replay does not expose system prompts.
- [ ] Student replay does not expose provider traces.
- [ ] Student replay does not expose API keys, provider secrets, or tool secrets.
- [ ] Faculty replay receives restricted metadata only where allowed, not raw secrets or prompts.
- [ ] System replay receives restricted metadata only where allowed, not raw secrets or prompts.
- [ ] `session_revealed_facts` stores references only, not fact content.
- [ ] `conversation_messages.used_fact_ids` stores fact ids only.

Manual query:

```bash
psql "$CLINMIRA_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -c "SELECT payload::text FROM event_log WHERE payload::text ~* 'hidden_diagnosis|raw_fact_content|faculty_only_notes|system_prompt|api_key|provider_secret|tool_secret|localStorage|frontend';"
```

Expected for student-safe events: no leaked restricted content. If hostile synthetic payload rows are inserted by an approved Step 16 test, replay output must redact them.

## Integration Tests

- [ ] `npm --prefix backend/api run test` passes with `CLINMIRA_TEST_DATABASE_URL` present.
- [ ] `npm --prefix backend/api run typecheck` passes.
- [ ] `npm --prefix backend/api run build` passes.
- [ ] `npm --prefix shared/contracts run test` passes.
- [ ] `node --test backend/database/tests/*.test.mjs` passes.
- [ ] `node --test backend/evals/tests/*.test.mjs` passes.
- [ ] `node backend/evals/lib/eval-runner.mjs` passes or reports DB-backed runtime eval status honestly.
- [ ] `python3 -m unittest discover -s tests` passes in `backend/agent-worker`.
- [ ] Any skipped DB-backed test is explicitly reported and not counted as passed evidence.
- [ ] Shared contract typecheck status is reported honestly if `tsc` is unavailable.

## Scope Guard

- [ ] No frontend files changed.
- [ ] No OpenAI SDK installed.
- [ ] No OpenAI imports, calls, or API key reads added.
- [ ] No live agent runtime enabled.
- [ ] No provider runtime enabled.
- [ ] No Redis infrastructure added.
- [ ] No WebSocket infrastructure added.
- [ ] No Temporal workflows or workers added.
- [ ] No production auth/RBAC added.
- [ ] No production publisher added.
- [ ] No new business feature added.
- [ ] No new simulation logic added by Step 16A.
- [ ] No new replay logic added by Step 16A.
- [ ] No new safety logic added by Step 16A.
- [ ] No package or lockfile changed by Step 16A.
- [ ] No database migration changed by Step 16A.
- [ ] No env file created by Step 16A.
- [ ] No Docker compose runtime created by Step 16A.

## Final Manual Verdict

Mark one:

- [ ] Ready for Step 16 DB-backed evidence.
- [ ] Ready for migration/seed validation only; API-route evidence blocked by valid-UUID fixture gap.
- [ ] Blocked; database URL absent.
- [ ] Blocked; migration apply failed.
- [ ] Blocked; unsafe database target.
- [ ] Blocked; forbidden scope change detected.

Reviewer notes:

```text
Date:
Reviewer:
Database target:
PostgreSQL version:
Migration verdict:
Seed verdict:
Integration verdict:
Remaining blockers:
```
