# Step 6 - Case Versioning and Fact Ledger

## 1. Executive Verdict

STEP 6 COMPLETE WITH WARNINGS

Step 6 implemented the database-only foundation for case versioning, synthetic patient metadata, canonical clinical fact grounding, reveal rules, and context-firewall access policy foundations.

No product APIs, frontend integration, simulation session behavior, realtime, Redis, Temporal, live OpenAI calls, agent runtime, debriefs, scores, orders, event log, outbox, Docker runtime, package installs, Prisma schema, or environment files were added.

Warnings remain because the SQL migrations were statically validated but not applied to a safe PostgreSQL database in this task.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| Approved Step 6 migration added | Yes: `backend/database/migrations/0002_case_versioning_and_fact_ledger.sql`. |
| Approved Step 6 synthetic seed added | Yes: `backend/database/seeds/0002_dev_synthetic_case_fact_seed.sql`. |
| Case/version tables added | Yes: `cases`, `case_versions`. |
| Synthetic patient metadata added | Yes: `patient_twins`, `patient_personas`. |
| Canonical fact ledger added | Yes: `fact_ledger`. |
| Reveal/access policy foundation added | Yes: `fact_reveal_rules`, `fact_access_policies`. |
| Separate `hidden_facts` table added | No. |
| Session-level reveal table added | No. |
| Simulation/session/message/action/timeline tables added | No. |
| `event_log`/`outbox_events` added | No. |
| Product APIs/routes added | No. |
| Frontend changed | No. |
| Agent worker changed | No. |
| Shared clinical contracts added | No. |
| Redis/WebSocket/SSE/Temporal/OpenAI runtime added | No. |
| Package install or Docker runtime added | No. |

## 3. Canonical Fact Model Decision

`fact_ledger` is the canonical source of clinical facts for ClinMira.

Step 6 intentionally does not create separate `hidden_facts` or session-level reveal tables. Hidden facts are represented as `fact_ledger` rows with restricted `visibility`, especially `hidden_until_revealed`.

Reveal eligibility is modeled through `fact_reveal_rules`. Context access is modeled through `fact_access_policies`.

Session-level reveal state remains deferred until simulation sessions exist. Future simulation work must use the fact ledger and policy tables; it must not treat frontend mock state, generated text, or model memory as clinical truth.

## 4. Database Structure Summary

| Path | Purpose |
| --- | --- |
| `backend/database/migrations/0002_case_versioning_and_fact_ledger.sql` | SQL-first Step 6 schema migration. |
| `backend/database/seeds/0002_dev_synthetic_case_fact_seed.sql` | Development-only synthetic case/fact seed. |
| `backend/database/tests/case_fact_schema_static.test.mjs` | Static schema test for allowed tables, constraints, indexes, triggers, and forbidden future tables. |
| `backend/database/tests/fact_visibility_guard.test.mjs` | Static hidden fact visibility, context firewall, seed safety, and runtime-integration guard. |
| `backend/database/README.md` | Updated SQL authority notes, Step 6 tenant tables, case versioning rule, canonical fact model, and deferred scope. |

## 5. Tables Implemented

| Table | Purpose | Key Protections |
| --- | --- | --- |
| `cases` | Tenant-scoped case library metadata. | Same-tenant creator FK, slug/status/difficulty checks, current version FK added after version table exists. |
| `case_versions` | Immutable versioned case content foundation. | Unique `(case_id, version)`, JSONB array checks, same-tenant FKs, trigger blocks approved/published content mutation. |
| `patient_twins` | Synthetic patient metadata for a case version. | Unique one twin per case version, same-tenant version FK, JSONB object checks, age/sex checks. |
| `patient_personas` | Communication/persona metadata for a synthetic twin. | Unique one persona per twin, same-tenant twin FK, literacy/reliability/persona checks. |
| `fact_ledger` | Canonical clinical fact grounding table. | Unique `(case_version_id, fact_key)`, fact type/source/visibility checks, JSONB content object, approval consistency, hidden facts require null student summary. |
| `fact_reveal_rules` | Reveal eligibility rules for facts. | Same-tenant fact FK, unique `(fact_id, rule_key)`, rule type enum, JSONB object config, priority check. |
| `fact_access_policies` | Context firewall policy foundation. | Same-tenant case/fact FKs, actor scope/access level checks, target requirement, active policy indexes. |

## 6. Hidden Fact Protection Summary

- Hidden facts are represented only as `fact_ledger.visibility = 'hidden_until_revealed'`.
- `fact_ledger_hidden_summary_ck` requires hidden facts to have `student_safe_summary IS NULL`.
- `fact_access_policies` includes actor scopes for `student_payload`, `persona_agent`, `safety_agent`, evaluator/faculty/system scopes, and access levels including `deny` and `allowed_for_safety`.
- The Step 6 seed denies `hidden_until_revealed` facts to `student_payload`.
- The Step 6 seed denies broad hidden fact access to `persona_agent`.
- The Step 6 seed permits one hidden allergy fact for `safety_agent` only through `allowed_for_safety`.
- No frontend payload, API route, session state, or agent prompt assembly was implemented.

## 7. Seed Summary

Seed created:

- `backend/database/seeds/0002_dev_synthetic_case_fact_seed.sql`

Synthetic-only contents:

- One demo case under `clinmira-demo`: `Synthetic Oral Health Intake`.
- One draft case version.
- One synthetic patient twin.
- One persona metadata record.
- One baseline visible chief complaint fact.
- One restricted allergy fact.
- One `ask_directly` reveal rule.
- Three context access policy examples: deny student payload, deny persona context, allow safety-specific access.

Seed safety:

- Uses deterministic UUIDs.
- Uses `ON CONFLICT` idempotency.
- Contains no real user/institution/patient data.
- Contains no frontend mock source.
- Contains no diagnosis-heavy, treatment, imaging, session, agent, score, debrief, order, event, or review seed data.

## 8. Static Test Summary

| Test File | Result | What It Verifies |
| --- | --- | --- |
| `backend/database/tests/core_schema_static.test.mjs` | Pass | Step 5 schema still creates only core identity/audit tables and synthetic identity seed remains safe. |
| `backend/database/tests/no_forbidden_tables.test.mjs` | Pass | No Prisma schema, no compose file, no runtime integrations, and Step 5 migration/seed still avoid future table creation. |
| `backend/database/tests/case_fact_schema_static.test.mjs` | Pass | Step 6 migration exists, creates only approved tables, includes tenant scoping, FKs, constraints, indexes, triggers, immutable case version guard, and migration registry entry. |
| `backend/database/tests/fact_visibility_guard.test.mjs` | Pass | `fact_ledger` is canonical; no separate hidden/reveal tables; README documents the model; seed includes hidden fact deny policies and safety-specific allowance; no runtime integrations. |
| `backend/api` health tests | Pass | Backend API remains health-only. |
| `shared/contracts` tests | Pass | Shared contracts remain health-only and unchanged by Step 6. |

## 9. Forbidden Feature Scan

| Feature | Found? | Evidence | Result |
| --- | --- | --- | --- |
| Separate hidden/reveal tables | No | SQL scan for `CREATE TABLE hidden_facts` and `CREATE TABLE revealed_facts` returned no matches. | Pass |
| Simulation/session/message/action/timeline tables | No | SQL scan for forbidden future table creates/inserts returned no matches. | Pass |
| Event log/outbox | No | SQL scan for `event_log`/`outbox_events` creates/inserts returned no matches. | Pass |
| Orders/imaging/scores/debrief/faculty review | No | SQL scan for forbidden future table creates/inserts returned no matches. | Pass |
| Agent/model/tool runtime tables | No | SQL scan for forbidden future table creates/inserts returned no matches. | Pass |
| Redis/WebSocket/SSE/Temporal/OpenAI/Prisma runtime imports | No | Runtime import/new/decorator scan returned no matches. | Pass |
| Frontend mock or real-data seed source | No | Seed scan for frontend/local storage/real-data markers returned no matches after wording cleanup. | Pass |
| Docker compose or Prisma schema | No | Static tests confirmed no compose file or `schema.prisma` in repository scan depth. | Pass |

## 10. Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `pwd` | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Warning | Dirty worktree remains from prior steps/prototype files. |
| `git diff --stat` | Warning | Tracked diff stat omits untracked Step 6 files until they are added to git. |
| `git branch --show-current` | Pass | `main`. |
| `find backend/database -maxdepth 5 -type f` | Pass | Confirmed Step 6 migration, seed, and tests are present. |
| `find docs/implementation -maxdepth 4 -type f` | Pass | Implementation reports/status files present. |
| `find shared/contracts -maxdepth 5 -type f` | Pass | Shared contracts inspected; no Step 6 edits. |
| `find backend/api -maxdepth 5 -type f` | Pass | API inspected; no Step 6 edits. |
| `node backend/database/tests/core_schema_static.test.mjs` | Pass | 10 subtests passed. |
| `node backend/database/tests/no_forbidden_tables.test.mjs` | Pass | 6 subtests passed. |
| `node backend/database/tests/case_fact_schema_static.test.mjs` | Pass | 10 subtests passed. |
| `node backend/database/tests/fact_visibility_guard.test.mjs` | Pass | 8 subtests passed. |
| `npm --prefix backend/api run test` | Pass | 2 backend health test files passed. |
| `npm --prefix shared/contracts run test` | Pass | 1 shared contract test file passed. |
| SQL forbidden table `rg` scan | Pass | No forbidden creates/inserts in migrations or seeds. |
| Runtime integration `rg` scan | Pass | No runtime imports/new calls/decorators detected. |
| Seed source `rg` scan | Pass | No frontend/local storage/real-data seed source markers detected. |
| `psql --version` | Pass | `psql (PostgreSQL) 16.14` is available. |
| Migration apply against PostgreSQL | Not run | No explicitly configured safe PostgreSQL database was provided. |

## 11. Limitations and Warnings

- SQL migration apply was not run against PostgreSQL because no safe test database was explicitly configured.
- No migration runner was added.
- No rollback/forward-fix migration was executed.
- No API repository/query layer was added.
- No context firewall service was added; Step 6 only creates database policy foundations.
- No session-level reveal state exists yet because simulation sessions are intentionally absent.
- No event log/outbox exists yet; Step 7 remains required before realtime or durable mutation claims.
- No frontend integration exists.
- No live agent, model call, prompt assembly, or OpenAI SDK integration exists.
- The repository remains dirty from earlier architecture/prototype work; Step 6 only changed allowed database and implementation documentation paths.

## 12. Step 7 Readiness

Step 7 can start with warnings after the mandatory post-task architecture review.

Allowed next implementation scope:

- Event Log and Transactional Outbox.
- Durable `event_log`.
- Durable `outbox_events`.
- Event sequence foundation.
- Idempotency foundation.
- Replay contract foundation.
- No WebSocket/SSE/realtime runtime yet.

Still blocked:

- Mock simulation until Step 7 completes.
- Realtime until event log/outbox/replay tests pass.
- Frontend integration until typed contracts/replay/safety gates pass.
- Live agents until contracts, database truth, fact ledger, event log/outbox, mock simulation, eval harness, and deterministic safety gates pass.
