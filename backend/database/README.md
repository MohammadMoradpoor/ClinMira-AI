# ClinMira Database Foundation

## Purpose

This folder is the SQL-first database authority for ClinMira AI. Step 5 establishes the core tenant, user, cohort, role, audit, and migration metadata foundation. Step 6 adds the database-only foundation for case versioning, synthetic patient metadata, and the canonical fact ledger. Step 7 adds durable event logging, transactional outbox, and idempotency foundations. Step 8 adds the database-only foundation for mock simulation sessions.

This is not clinical product implementation. It does not create runtime simulation APIs, realtime infrastructure, agent runtime state, frontend integration, treatment workflows, debriefs, scores, orders, faculty review behavior, publisher workers, or replay API routes.

## SQL-First Authority

Reviewed SQL files in `backend/database/migrations/` are the production schema authority.

Rules:

- SQL migration files are canonical.
- Prisma Migrate must not own production schema changes.
- ORM schema sync is forbidden as production authority.
- Future Prisma or ORM usage may only mirror, introspect, or consume reviewed SQL.
- Python workers must not generate or apply migrations.
- NestJS must not auto-sync database schema.
- Every database change needs a reviewed SQL migration, static validation, implementation report, and status update.

## Migration Naming

Migration files use zero-padded ordering:

```text
NNNN_short_description.sql
```

Current migration:

```text
0001_core_identity_and_audit.sql
0002_case_versioning_and_fact_ledger.sql
0003_event_log_outbox_idempotency.sql
0004_mock_simulation_session_engine.sql
```

The numeric prefix is the migration version and must be unique. Later migrations must not reuse or reorder previous numbers.

## Migration Registry

The `schema_migrations` table records migration metadata:

- `version`
- `name`
- `checksum`
- `applied_at`
- `applied_by`
- `execution_ms`
- `success`

Step 5 does not add a migration runner. A future runner may record checksums and timing, but the reviewed SQL file remains the authority.

## Rollback And Forward-Fix Policy

Production rollback must be explicitly reviewed. For early schema foundations, prefer forward-fix migrations when data may exist.

Every future migration should document:

- Affected tables and indexes.
- Expected lock level.
- Backfill plan, if any.
- Rollback or forward-fix approach.
- Tenant isolation impact.
- Event/replay compatibility impact.
- Data retention impact.
- Test evidence.

## Tenant-Scoping Rule

Every tenant-scoped table has `institution_id`.

Step 5 tenant-scoped tables:

- `users`
- `roles`
- `cohorts`
- `enrollments`
- `audit_logs`

Step 6 tenant-scoped tables:

- `cases`
- `case_versions`
- `patient_twins`
- `patient_personas`
- `fact_ledger`
- `fact_reveal_rules`
- `fact_access_policies`

Step 7 tenant-scoped tables:

- `idempotency_keys`
- `event_log`
- `outbox_events`

Step 8 tenant-scoped tables:

- `simulation_sessions`
- `session_revealed_facts`
- `clinical_actions`
- `conversation_messages`
- `timeline_events`
- `session_state_snapshots`

Application services must always filter tenant-scoped queries by `institution_id`. PostgreSQL Row Level Security is deferred as defense-in-depth until policy and test harnesses exist.

## Case Versioning Rule

`case_versions` is the immutable versioned content foundation. Draft versions may be edited, but approved or published content fields are protected by the `case_versions_prevent_content_mutation` trigger. Status-only lifecycle movement remains possible for approved/published versions when it does not mutate source content.

`cases.current_version_id` points to the active version metadata, but sessions and future clinical workflows must lock to a specific `case_versions.id` rather than relying on mutable case metadata.

## Canonical Fact Model

`fact_ledger` is the canonical source of clinical facts for ClinMira.

Step 6 intentionally does not create separate `hidden_facts` tables. Hidden facts are represented as `fact_ledger` rows with restricted `visibility`, especially `hidden_until_revealed`, plus `fact_reveal_rules` and `fact_access_policies`.

Step 8 adds session-level reveal state through `session_revealed_facts`. That table stores references only and does not duplicate `fact_ledger.content`, `student_safe_summary`, `faculty_notes`, hidden fact payloads, prompts, or frontend mock state.

This means:

- Student-facing payloads must be assembled from access policy decisions, not raw fact rows.
- Persona context must not receive hidden facts unless a reveal rule allows it.
- Safety-specific access may use restricted facts only through explicit policy such as `allowed_for_safety`.
- Session-level reveal state records which fact ids were revealed to which context, but `fact_ledger` remains the source of clinical truth.
- No future route, agent, or frontend payload may treat generated text, frontend mock state, or model memory as clinical truth.

## Audit Rule

`audit_logs` is append-only by policy. It records actor, tenant, resource, action, result, trace, network, and metadata context where available.

Step 5 does not add update/delete enforcement triggers for audit logs. Enforcement can be added later with explicit policy, tests, and operational review.

## Event Reliability Rule

`event_log` is the durable replayable event history for future critical mutations. PostgreSQL remains the authoritative event source; Redis, WebSocket, SSE, model memory, and frontend state must never become durable event truth.

`outbox_events` is the post-commit publishing queue. Future mutation services must write domain state, `event_log`, and `outbox_events` in one PostgreSQL transaction before any external publish. Step 7 does not add a publisher worker or mark events as published.

`idempotency_keys` is the duplicate-command protection foundation. Future mutating commands must reserve or reuse an idempotency key inside the same tenant scope before command processing can create durable state.

### Event Sequence Policy

- Sequence is scoped to `(institution_id, stream_type, stream_id)`.
- Sequence starts at `1`.
- Sequence must be strictly increasing per stream.
- The database enforces uniqueness through `event_log_stream_sequence_uq`.
- Future command handlers must assign sequence inside the same transaction as domain mutation, event log insert, and outbox insert.
- Step 7 establishes sequence constraints only; it does not implement runtime sequence assignment.

### Replay Policy

- Replay uses `event_log` as the authoritative source.
- Replay contracts are envelope-level foundations in `shared/contracts/events/`.
- Future replay APIs must filter by tenant, actor role, payload classification, redaction status, and fact visibility.
- Student replay must never expose hidden, faculty-only, or safety-restricted payload data without backend authorization and redaction.
- If a replay gap or unsupported schema is found, future services must fail closed and require an authoritative snapshot.

Step 7 does not add WebSocket/SSE runtime, Redis runtime, a replay endpoint, a publisher worker, frontend reducer integration, or simulation sessions. Step 8 depends on this foundation for mock simulation persistence. Step 13 depends on this foundation plus replay/reducer tests before realtime can be enabled.

## Mock Simulation Session Rule

Step 8 creates the database-only foundation for deterministic mock simulation sessions:

- `simulation_sessions` locks each session to `institution_id`, `case_id`, `case_version_id`, and `student_user_id`.
- `clinical_actions` stores submitted student actions, tenant-scoped idempotency references, action sequence, payload object, and unsupported risky action blocks.
- `conversation_messages` stores persisted messages and `used_fact_ids` references for future grounding checks.
- `timeline_events` stores ordered session timeline projections.
- `session_revealed_facts` stores only fact/reveal-rule/action references and reveal target scope.
- `session_state_snapshots` stores recovery projections only.

Create-session and submit-action runtime mutations must reserve or reuse an `idempotency_keys` row, write domain state, write `event_log`, and write `outbox_events` in one PostgreSQL transaction. Runtime API endpoints are blocked until an approved database client, transaction wrapper, repository boundary, and integration tests exist in the NestJS API/BFF.

No Redis, WebSocket, SSE, Temporal, live OpenAI, frontend integration, debrief, scoring, faculty workflow, orders, or imaging workflow is authorized by Step 8. Risky `order_attempt`, `diagnosis_attempt`, and `treatment_attempt` actions may be recorded as unsupported attempts only; the mock engine must not mutate treatment state.

## Deferred Tables

Do not add agent, debrief, score, order, realtime, or review tables in Step 8.

Specifically deferred:

- Agent/model/tool runtime tables until later agent gates.
- Debrief, faculty review, score, and analytics tables until their gated steps.
- Publisher workers and realtime transports until later event/replay and realtime gates.

## Development Seed

`seeds/0001_dev_synthetic_identity_seed.sql` is development-only. It uses synthetic demo institution/user/cohort data and reserved example email addresses. It must not be used as clinical content, case content, patient content, or hidden fact source.

`seeds/0002_dev_synthetic_case_fact_seed.sql` is development-only. It uses one synthetic demo case, one synthetic case version, one synthetic patient twin/persona, one baseline visible intake fact, one restricted hidden fact, one reveal rule, and three access-policy examples. It must not be treated as real patient data, medical advice, frontend source of truth, session state, or agent behavior.
