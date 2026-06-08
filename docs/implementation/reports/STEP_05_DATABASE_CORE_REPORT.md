# Step 5 - Database Core and Migration Authority

## 1. Executive Verdict

STEP 5 COMPLETE WITH WARNINGS

Step 5 established SQL-first migration authority and implemented only the core identity, tenant, cohort, enrollment, audit, and migration metadata schema foundation.

Warnings remain because the SQL migration was not applied to a live PostgreSQL database; no explicit safe local test database was configured. Static SQL validation passed, `psql` is available, and no packages were installed.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| Clinical/product APIs added | No. |
| Clinical tables added | No. |
| Fact ledger added | No. |
| Simulation tables added | No. |
| `event_log`/`outbox_events` added | No. |
| Redis/realtime added | No. |
| Temporal added | No. |
| OpenAI added | No. |
| Frontend changed | No. |
| Agent-worker changed | No. |
| Packages installed | No. |
| Prisma/ORM schema authority added | No. |

## 3. Migration Authority Decision

SQL-first migrations are the production schema authority for ClinMira AI.

Rules established in `backend/database/README.md`:

- Reviewed SQL files in `backend/database/migrations/` are canonical.
- Prisma Migrate must not own production schema changes.
- ORM schema sync is forbidden as production authority.
- Future Prisma or ORM usage may only mirror, introspect, or consume reviewed SQL.
- Python workers must not generate or apply migrations.
- NestJS must not auto-sync database schema.
- Future database changes require reviewed SQL migration files, migration metadata, rollback/forward-fix guidance, static validation, implementation reports, and status updates.

## 4. Database Structure Summary

| Path | Purpose |
| --- | --- |
| `backend/database/README.md` | SQL-first authority, migration policy, tenant/audit rules, deferred scope. |
| `backend/database/migrations/0001_core_identity_and_audit.sql` | Core Step 5 SQL migration. |
| `backend/database/seeds/0001_dev_synthetic_identity_seed.sql` | Development-only synthetic identity seed. |
| `backend/database/tests/core_schema_static.test.mjs` | Static schema validation for allowed tables, columns, constraints, indexes, timestamps, and seed safety. |
| `backend/database/tests/no_forbidden_tables.test.mjs` | Static guard against forbidden future tables, Prisma schema, compose files, runtime integrations, and frontend seed sources. |

Created directories:

- `backend/database/`
- `backend/database/migrations/`
- `backend/database/seeds/`
- `backend/database/tests/`

## 5. Core Tables Implemented

| Table | Purpose | Tenant-scoped? | Key constraints | Key indexes | Notes |
| --- | --- | --- | --- | --- | --- |
| `schema_migrations` | Migration metadata registry. | No | Primary key `version`, non-empty `name`, non-negative `execution_ms`, required `success`. | Primary key on `version`. | Includes Step 5 migration entry. No runner added. |
| `institutions` | Tenant/university root. | Root tenant table | Unique `slug`, status enum, slug format, non-empty name, JSON object settings. | Unique slug, status, active non-deleted partial index. | Uses UUID defaults via `gen_random_uuid()`. |
| `users` | Users within an institution. | Yes | FK to institutions, unique `(institution_id, email)`, lowercase/basic email checks, non-empty name, status enum, JSON object profile. | Tenant/email unique, tenant/id unique for composite FKs, tenant/status indexes. | No password or provider credential columns. |
| `roles` | RBAC assignments. | Yes | Composite FK to same-tenant user, role enum, scope type enum, institution scope requires null scope id. | Unique expression index safely handles null `scope_id`; user, tenant, role, scope indexes. | Allows future resource scopes without adding future domain tables. |
| `cohorts` | Course/cohort grouping. | Yes | FK to institutions, non-empty name, status enum, JSON object metadata. | Tenant/name/term unique expression index, tenant/id unique, tenant/status, term, program indexes. | Handles nullable `term` safely. |
| `enrollments` | User membership in cohorts. | Yes | Composite FKs enforce same-tenant cohort/user, unique `(cohort_id, user_id, role)`, role/status enums. | Tenant, cohort, user, status, cohort/role, tenant/user/cohort indexes. | Membership only; no scoring or clinical state. |
| `audit_logs` | Append-only audit trail by policy. | Nullable tenant scope | FK to institution, optional same-tenant actor FK, actor/result enums, non-empty action/resource type, JSON object metadata. | Tenant, actor, action, resource, result, created_at, trace_id indexes. | No `updated_at`; no update/delete trigger added in Step 5. |

## 6. Seed Summary

Seed created:

- `backend/database/seeds/0001_dev_synthetic_identity_seed.sql`

Synthetic-only contents:

- Institution: `ClinMira Demo University`, slug `clinmira-demo`.
- Users: `demo.student@example.edu`, `demo.faculty@example.edu`, `demo.admin@example.edu`.
- Roles: `student`, `faculty`, `admin`.
- Cohort: `Demo Cohort 2026`.
- Enrollments: student as student, faculty as faculty.
- Audit log: system `development_seed_applied`.

Idempotency:

- Uses deterministic UUIDs.
- Uses `ON CONFLICT` for institution, users, enrollments, and audit log.
- Uses `WHERE NOT EXISTS` inserts for expression-index role and cohort uniqueness.

The seed contains no clinical content, no case content, no patient data, no hidden facts, no session data, no agent data, and no real institutional/user data.

## 7. Static Test Summary

| Test File | What It Verifies |
| --- | --- |
| `backend/database/tests/core_schema_static.test.mjs` | Core migration and seed exist; only allowed tables are created; forbidden future table names are absent from migration; tenant scoping exists; required indexes exist; enum checks exist; mutable tables have timestamps/triggers; audit logs omit `updated_at`; seed is synthetic-only and idempotent. |
| `backend/database/tests/no_forbidden_tables.test.mjs` | Created tables are explicitly allowed; migration/seed do not create or insert into forbidden future tables; no `schema.prisma` exists; no compose file exists; database files add no runtime integrations; seed is not sourced from frontend or real data. |

Note: the first run of `no_forbidden_tables.test.mjs` failed because the test tried to spawn `find` inside the managed sandbox. The test was corrected to use a pure filesystem scan, then passed.

## 8. Forbidden Feature Scan

| Feature | Found? | Evidence | Result |
| --- | --- | --- | --- |
| Case/fact/session/event/agent/debrief/faculty tables | No | SQL migration/seed `rg` scan for forbidden table names returned no matches. | Pass |
| Prisma | No | `rg --files` scan for `schema.prisma` returned no files. | Pass |
| Docker compose | No | `rg --files` scan for compose files returned no files. | Pass |
| Redis | No | Runtime import scan returned no matches. | Pass |
| WebSocket/SSE | No | Runtime import/decorator scan returned no matches. | Pass |
| Temporal | No | Runtime import scan returned no matches. | Pass |
| OpenAI | No | Runtime import/new-call scan returned no matches. | Pass |
| Frontend changes | No Step 5 frontend edits | `git status` still shows pre-existing frontend prototype files from prior steps; Step 5 did not touch them. | Pass with warning |
| Agent-worker changes | No Step 5 worker edits | `backend/agent-worker` remains pre-existing and frozen. | Pass |
| Real patient data | No | Seed uses reserved example addresses and synthetic demo names only. | Pass |
| Clinical seed data | No | Seed static test rejects clinical/patient/fact/session/agent terms and passed. | Pass |

## 9. Commands Run

| Command | Ran? | Result | Notes |
| --- | --- | --- | --- |
| `pwd` | Yes | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Yes | Warning | Dirty worktree remains from prior steps and prototype files. |
| `git diff --stat` | Yes | Warning | Tracked diff stat does not include untracked Step 5 files. |
| `git branch --show-current` | Yes | Pass | `main`. |
| `find backend -maxdepth 4 -type f` | Yes | Pass | Inspected backend skeleton state before edits. |
| `find shared/contracts -maxdepth 5 -type f` | Yes | Pass | Inspected Step 4 contract state before edits. |
| `find docs/implementation -maxdepth 4 -type f` | Yes | Pass | Required implementation docs present. |
| `find . -maxdepth 5 ...` | Yes | Pass | No pre-existing SQL, Prisma schema, migration, or compose files found. |
| `node backend/database/tests/core_schema_static.test.mjs` | Yes | Pass | 10 subtests passed. |
| `node backend/database/tests/no_forbidden_tables.test.mjs` | Yes | Pass after correction | 6 subtests passed after replacing shell `find` with filesystem scan. |
| `npm --prefix backend/api run test` | Yes | Pass | 2 backend health test files passed. |
| `npm --prefix shared/contracts run test` | Yes | Pass | Shared contract test passed. |
| SQL forbidden table `rg` scan | Yes | Pass | No forbidden future table names in migration/seed. |
| Prisma/compose `rg --files` scan | Yes | Pass | No `schema.prisma` or compose files. |
| Runtime import `rg` scan | Yes | Pass | No OpenAI, Redis, Temporal, Prisma, WebSocket/SSE runtime imports. |
| `psql --version` | Yes | Pass | `psql (PostgreSQL) 16.14`. |
| Migration apply against PostgreSQL | No | Not run | No explicitly configured safe local test database was provided. Step 5 evidence is static validation only. |

## 10. Limitations and Warnings

- Actual database migration apply test was not run because no safe PostgreSQL database was explicitly configured.
- PostgreSQL RLS is documented as deferred defense-in-depth; it was not enabled.
- No migration runner was added.
- No application database client was added.
- No NestJS API database connection was added.
- No auth/session API was added.
- No fact ledger exists yet.
- No event log/outbox exists yet.
- No realtime, Redis, Temporal, or OpenAI runtime exists.
- No frontend integration exists.
- The repository remains dirty from prior architecture/frontend/backend skeleton work.

## 11. Step 6 Readiness

Step 6 can start with warnings.

Exact next scope:

- Case Versioning and Fact Ledger.

Step 6 may add only the approved case versioning, patient twin, hidden/revealed fact, fact ledger, and context-firewall foundations. It must not add simulation session behavior, event log/outbox, realtime, live OpenAI calls, frontend integration, debrief, faculty publish, or agent/tool runtime behavior.

