# Step 16R - DB-backed Replay and Safety Architecture Review

## 1. Executive Verdict

STEP 16 ACCEPTED WITH WARNINGS

Step 16 DB-backed Replay and Safety Integration Evidence is architecturally acceptable as local host-runtime evidence. The evidence test uses the safe Step 16A PostgreSQL database, exercises existing Nest routes/services for product mutations, verifies PostgreSQL-backed replay and safety persistence, and does not add frontend integration, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, migrations, seed edits, packages, env edits, Docker Compose runtime, Prisma/ORM, or real patient data.

No critical blocker was found. The next step must be Step 17A - Post-Step-16 Backend/Frontend Contract and Integration Planning, review/planning only. Direct frontend implementation is not approved by this review.

Findings:

| ID | Severity | Finding | Required Follow-up |
| --- | --- | --- | --- |
| F1 | Medium | Existing dev seed IDs are valid PostgreSQL UUID text but are not accepted by the stricter simulation route UUID validator. Step 16 correctly used route-valid synthetic fixture rows as preconditions. | Resolve seed/header UUID policy before frontend integration or require Step 17A to use route-valid synthetic actor/case fixtures. |
| F2 | Medium | Step 16 DB evidence is an explicit host-runtime test, not part of the default non-DB `npm --prefix backend/api run test` suite. | Add a named CI/local DB evidence command or script before pilot/prod-like claims. |
| F3 | Medium | Redaction and gap probes insert synthetic `event_log` rows directly. This is acceptable as a replay probe but is not product mutation evidence. | Keep these probes labeled as test-only; future product gap remediation/snapshot fallback needs its own implementation gate. |
| F4 | Medium | Step 9 eval runner still lacks a live API/DB integration runner. With DB env configured it reports `not_implemented_in_step_9_local_harness`. | Build DB-backed eval runner integration before live agents or pilot confidence claims. |
| F5 | Low | Step 16 test-created rows persist in the local test database. They are isolated and synthetic, but not cleaned up per run. | Use disposable DBs or cleanup in future CI/staging evidence. |

## 2. Evidence Reviewed

Reviewed governance and architecture:

- `docs/implementation/00_PREFLIGHT_AUDIT.md`
- `docs/implementation/IMPLEMENTATION_PLAYBOOK.md`
- `docs/implementation/IMPLEMENTATION_BACKLOG.md`
- `docs/implementation/IMPLEMENTATION_STATUS.md`
- `docs/implementation/ARCHITECTURE_COMPLIANCE_CHECKLIST.md`
- `docs/implementation/NO_GO_RULES.md`
- `docs/architecture/01_AGENTIC_CORE_ARCHITECTURE.md`
- `docs/architecture/02_BACKEND_DATABASE_ARCHITECTURE.md`
- `docs/architecture/04_IMPLEMENTATION_ROADMAP.md`
- `docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md`
- `docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md`
- `docs/architecture/10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md`
- `docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md`
- `docs/architecture/13_OPENAI_SOURCE_REFRESH_AND_LIVE_AGENT_PLAN.md`

Reviewed implementation evidence:

- `docs/implementation/reports/STEP_16_DB_BACKED_REPLAY_SAFETY_EVIDENCE_REPORT.md`
- `docs/implementation/reports/STEP_16A_LOCAL_POSTGRES_SETUP_REPORT.md`
- `docs/implementation/reports/STEP_16C_REPLAY_UUID_REDACTION_CORRECTION_REPORT.md`
- `docs/implementation/reports/STEP_15_REALTIME_GATEWAY_WITH_REPLAY_REPORT.md`
- `docs/implementation/reports/STEP_15R_REALTIME_GATEWAY_ARCHITECTURE_REVIEW_REPORT.md`
- `shared/contracts/CONTRACT_GOVERNANCE.md`
- `shared/contracts/CONTRACT_INVENTORY.md`
- `backend/api/test/step16-db-backed-evidence.db-evidence.mjs`
- `backend/api/src/replay/**`
- `backend/api/src/realtime/**`
- `backend/api/src/simulation/**`
- `backend/api/src/safety/**`
- `backend/database/migrations/0001_core_identity_and_audit.sql`
- `backend/database/migrations/0002_case_versioning_and_fact_ledger.sql`
- `backend/database/migrations/0003_event_log_outbox_idempotency.sql`
- `backend/database/migrations/0004_mock_simulation_session_engine.sql`
- `backend/database/migrations/0005_deterministic_safety_engine.sql`

Prerequisites confirmed:

- Step 16A complete.
- Step 16C complete.
- Step 16 marked complete with warnings.
- Step 16R is review-only.

## 3. Files Changed By Step 16

Step 16 reported these files changed:

| File | Review Result |
| --- | --- |
| `backend/api/test/step16-db-backed-evidence.db-evidence.mjs` | Acceptable evidence-only DB-backed test. It does not become product runtime logic. |
| `backend/evals/results/latest.json` | Acceptable generated eval artifact from the existing eval runner. The Step 16R rerun restored DB-env output after the plain eval command produced a skipped-DB artifact. |
| `docs/implementation/reports/STEP_16_DB_BACKED_REPLAY_SAFETY_EVIDENCE_REPORT.md` | Acceptable evidence report update. |
| `docs/implementation/IMPLEMENTATION_STATUS.md` | Acceptable status update. |

Step 16 did not report product runtime source changes, migrations, seed edits, package changes, frontend changes, env edits, Compose files, or Prisma/ORM files.

## 4. Scope Review

Step 16 stayed within the evidence scope.

| Scope Item | Result |
| --- | --- |
| Evidence-only test | Pass. The new `.db-evidence.mjs` file starts Nest from source and validates existing runtime behavior. |
| Product runtime changes | Pass. Step 16 did not add runtime features. |
| Frontend integration | Pass. None added. |
| Production infrastructure | Pass. No publisher, Redis, WebSocket, Temporal, production auth/RBAC, or Compose runtime added. |
| Hidden feature in tests | Pass with warning. Synthetic SQL setup/probe rows are test-only and explicitly labeled; they must not be treated as product implementation. |
| Migration/seed changes | Pass. None changed by Step 16. |
| Package/env changes | Pass. None changed by Step 16. |

The repository remains broadly dirty from prior staged/untracked work. This review did not attempt cleanup and did not treat existing frontend/prototype work as Step 16 scope.

## 5. Source-of-Truth Review

Pass.

Step 16 evidence uses PostgreSQL as the authoritative source for migrations, tables, seeds, sessions, actions, messages, timeline events, snapshots, safety persistence, idempotency, `event_log`, `outbox_events`, replay, and SSE replay-first output.

The evidence test performs product mutations through:

- `POST /api/v1/simulation-sessions`
- `POST /api/v1/simulation-sessions/:id/actions`
- `GET /api/v1/simulation-sessions/:id/replay`
- `GET /api/v1/simulation-sessions/:id/events/stream`

Manual SQL is limited to:

- Verifying DB foundation.
- Creating route-valid synthetic fixture rows because the old dev seed IDs do not satisfy the simulation route UUID validator.
- Inserting synthetic replay redaction/gap/duplicate probes.

No frontend state, localStorage, frontend mock data, Redis, worker memory, fake provider memory, or model/provider state is used as source of truth.

## 6. Fact Ledger And Hidden Fact Review

Pass with warnings.

Evidence reviewed confirms:

- `fact_ledger` remains canonical for clinical facts.
- Hidden facts are represented as restricted-visibility `fact_ledger` rows.
- Session reveal state stores fact references only in `session_revealed_facts`.
- Baseline visible facts are revealed at session creation.
- The allergy fact is revealed only after the safe direct allergy question.
- Blocked safety actions do not run reveal logic.
- Student payload checks reject hidden diagnosis, raw fact content, faculty notes, prompts, provider traces, API-key/secret markers, frontend mock markers, and localStorage markers.

Warning: Step 16 proves this for local synthetic fixtures and selected routes. It does not yet prove frontend reducer behavior or production RBAC-mediated audience behavior.

## 7. Safety Review

Pass.

Evidence reviewed confirms:

- Unsafe `treatment_attempt` is blocked by deterministic safety.
- Unsafe accepted treatment/order/diagnosis count remains `0` for the tested DB-backed session.
- `safety_evaluations` and `safety_findings` persist in the caller transaction.
- Safety block writes safe system message and timeline event.
- Safety block writes `event_log` and `outbox_events`.
- Safety output is student-safe and does not reveal guardrail internals beyond safe block metadata.

No treatment, order, diagnosis, imaging, debrief, scoring, or faculty workflow was implemented.

## 8. Idempotency Review

Pass.

Evidence reviewed confirms:

- Duplicate idempotency requests are exercised through backend runtime.
- Same idempotency key plus same payload returns the existing outcome.
- Same idempotency key plus different payload returns `409 idempotency_conflict`.
- Duplicate request does not duplicate action, message, timeline, event, or outbox rows.
- Idempotency scope includes institution, actor, command scope, and key.

Remaining warning: concurrent idempotency stress/load testing is not part of Step 16 and remains a future reliability task.

## 9. Event_log / Outbox Review

Pass.

Evidence reviewed confirms:

- Create-session writes `event_log` and `outbox_events`.
- Safe action writes `event_log` and `outbox_events`.
- Safety block writes `event_log` and `outbox_events`.
- Event sequence is monotonic for the tested simulation-session stream.
- `event_log_stream_sequence_uq`, `idempotency_keys_lookup_uq`, and `outbox_events_event_topic_uq` exist.
- `outbox_events` remains a durable queue only.
- No production publisher or simulated publisher loop was added.

Warning: no crash-after-commit or publisher retry/dead-letter behavior was implemented or proven in Step 16.

## 10. Replay / SSE Review

Pass with warnings.

Evidence reviewed confirms:

- Replay accepts valid PostgreSQL/RFC-style session UUIDs after Step 16C.
- Replay reads PostgreSQL `event_log`, not SSE state.
- Replay filters by institution, session, and student actor.
- Wrong tenant and wrong student fail closed.
- `after_sequence` returns only later events.
- `next_cursor.after_sequence` advances by durable source sequence.
- Repeated replay with the same cursor is idempotent.
- Replay redaction applies for student, faculty, and system audiences.
- SSE starts with replay and emits only persisted `replay_event` frames plus `replay_complete` delivery metadata.
- SSE does not create domain events, publish unpersisted events, or replace `event_log`.

Warnings:

- SSE is delivery-only and is not production realtime readiness.
- No frontend reducer/replay client exists.
- No Redis/WebSocket fanout exists.
- No production publisher exists.

## 11. Gap / Duplicate Review

Pass with limitation.

Evidence reviewed confirms:

- Duplicate sequence insertion fails because of the database unique constraint.
- Replay reports `duplicate_count = 0` when duplicate rows are impossible.
- A synthetic gap probe returns `gap_detected = true` and `snapshot_required = true`.
- Cursor behavior remains deterministic after a gap.

Limitation: gap remediation and authoritative snapshot fallback are not implemented. Reporting `snapshot_required` is acceptable for this step, but frontend reducer work must not pretend gap recovery is solved beyond the current metadata.

## 12. Test Quality Review

Pass with warnings.

`backend/api/test/step16-db-backed-evidence.db-evidence.mjs` is deterministic enough for local evidence and fails closed if:

- `CLINMIRA_TEST_DATABASE_URL` is absent.
- Host is not `127.0.0.1`.
- Port is not `55432`.
- Database is not `clinmira_ai_step16_test`.
- Database name suggests production/staging.

The test does not print the DB URL or secrets. It uses synthetic data only, imports no frontend files, edits no migrations or seeds, starts existing Nest routes/services, and avoids broad catch blocks that would hide failures.

Warnings:

- It uses a custom TypeScript require hook for local source execution.
- It persists synthetic rows and does not clean them up.
- It is not included in the default non-DB test suite; it must be run explicitly with DB env.
- It uses direct SQL for fixture/probe setup, which is acceptable only because product mutations are still tested through routes.

## 13. Contract / Schema Review

Pass with warnings.

No Step 16 contract drift was found. Replay/SSE behavior remains aligned with `shared/contracts/events/*` and the Step 15 contract governance.

No OpenAPI update was required for Step 16 because Step 16 is evidence-only. Existing warning remains: replay/SSE routes are active in backend/shared JSON schema governance but are not yet represented in OpenAPI.

SQL-first migration authority remains intact. No Prisma/ORM authority was introduced.

## 14. Security / Governance Review

Pass with warnings.

Evidence reviewed confirms:

- No OpenAI SDK/import/call/API-key read was added.
- No live agents/provider runtime was added.
- No Redis/WebSocket/Temporal runtime was added.
- No production publisher/auth/RBAC was added.
- No Prisma/ORM schema authority was added.
- No Docker Compose runtime was added.
- No real patient data was added.
- Local env secrets remain gitignored and were not printed.
- Temporary actor headers remain clearly non-production actor context.

Warnings:

- Production auth/RBAC remains absent.
- RLS remains deferred as defense-in-depth.
- CI/staging/prod-like evidence remains absent.
- Dirty worktree remains a governance risk for future steps.

## 15. Forbidden Implementation Scan Results

| Scan | Result |
| --- | --- |
| OpenAI import/call/API-key focused scan | Pass. No actual imports, calls, `OPENAI_API_KEY`, or env key reads in scoped runtime source. |
| Broad OpenAI/secret marker scan | Pass with expected guard/redaction mentions only. |
| Redis/WebSocket/Temporal focused scan | Pass. No runtime imports or gateway annotations found. |
| Frontend/localStorage/mock source scan | Pass with expected docs/tests/eval guard/redaction-policy mentions only. |
| Worker direct DB mutation scan | Pass. No worker DB client, SQL mutation, `event_log`, or `outbox_events` writes. |
| Prisma/Compose scan | Pass. No `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml` found. |
| Env file status | Pass. No tracked env files changed. |
| Migration/seed status | Pass for Step 16R. Current repo has pre-existing added migrations/seeds from earlier steps, but Step 16R did not edit them. |
| Frontend status | Pass for Step 16R. Current repo has pre-existing frontend prototype files, but Step 16R did not edit frontend. |

## 16. Remaining Warnings Classified By Gate

| Warning | Classification | Blocks |
| --- | --- | --- |
| Shared contracts typecheck blocked because `tsc` missing | Acceptable warning for Step 17A planning; blocker before contract build confidence claims | Contract CI, frontend implementation confidence |
| Step 9 eval runner lacks live API/DB integration runner | Acceptable warning for Step 17A planning; blocker before live agents and pilot | Live agents, pilot confidence |
| Production auth/RBAC absent | Blocker before frontend integration beyond local planning, pilot, production | Frontend integration, pilot, production |
| Production outbox publisher absent | Blocker before production realtime/fanout/pilot | Frontend realtime reliance, pilot, production |
| SSE delivery-only | Acceptable warning for Step 17A planning; blocker before production realtime readiness | Production realtime |
| CI/staging/prod-like DB evidence absent | Acceptable warning for Step 17A planning; blocker before pilot/production claims | Pilot, production |
| Frontend prototype hidden/mock state | Blocker before frontend integration | Frontend integration, safety |
| Existing dev seed IDs incompatible with current simulation UUID validator | Blocker before frontend integration unless Step 17A chooses route-valid fixtures or approved correction | Frontend integration/dev workflow |
| Live OpenAI/live agents/provider runtime blocked | Blocker before live agents | Live agents |
| Redis/WebSocket fanout absent | Acceptable warning for planning; blocker before production realtime fanout | Production realtime/fanout |
| Temporal absent | Acceptable warning until Temporal workflow tasks are requested | Temporal workflows |
| Debrief/faculty/treatment/order/imaging workflows absent | Acceptable warning for Step 17A; blocker before those product workflows | Debrief, faculty, treatment, order, imaging |
| Test rows persist in local DB | Acceptable warning for local evidence; blocker before CI/staging-grade evidence | CI/staging/pilot |

## 17. Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `pwd` | Pass | `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Warning | Dirty repo remains from prior steps. |
| `npm --prefix backend/api run test` | Pass | 9 non-DB backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Pass | TypeScript no-emit passed. |
| `npm --prefix backend/api run build` | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Pass | 5 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Blocked warning | `tsc: not found`; no package install authorized. |
| `node --test backend/database/tests/*.test.mjs` | Pass | 11 database static/guard tests passed. |
| `node --test backend/evals/tests/*.test.mjs` | Pass | 7 eval tests passed. |
| `node backend/evals/lib/eval-runner.mjs` | Pass with warning | Without DB env: thresholds passed, skipped `1`, DB eval skipped. |
| `set -a; . ./.env.local; set +a; node backend/evals/lib/eval-runner.mjs` | Pass with warning | With DB env: thresholds passed, skipped `0`, DB integration runner still `not_implemented_in_step_9_local_harness`. |
| `python3 -m unittest discover -s tests` in `backend/agent-worker` | Pass | 57 worker tests passed. |
| `set -a; . ./.env.local; set +a; CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL" node --test backend/api/test/step16-db-backed-evidence.db-evidence.mjs` | Pass | Focused Step 16 DB-backed evidence test passed. Required host-runtime escalation for local DB access. |
| `set -a; . ./.env.local; set +a; CLINMIRA_DATABASE_URL="$CLINMIRA_TEST_DATABASE_URL" npm --prefix backend/api run test` | Pass | 43 backend API tests passed with DB env. Required host-runtime escalation for local DB access. |
| OpenAI focused scan | Pass | No actual runtime imports/calls/API-key reads. |
| Redis/WebSocket/Temporal focused scan | Pass | No actual runtime imports/gateway/Temporal usage. |
| Frontend/localStorage/mock source scan | Pass with expected mentions | Guard/redaction/eval mentions only. |
| Worker direct DB mutation scan | Pass | No matches. |
| Prisma/Compose scan | Pass | No files found. |

Skipped/blocked command:

- `npm --prefix shared/contracts run typecheck` did not pass because `tsc` is not installed in `shared/contracts`. This is an existing warning and does not block Step 16R acceptance, but it blocks contract build confidence claims.

## 18. Architecture Compliance Checklist Result

| Area | Result | Notes |
| --- | --- | --- |
| Agentic compliance | Pass for Step 16 scope | No live agents, no worker DB mutation, no provider runtime. |
| Backend compliance | Pass with warnings | PostgreSQL source of truth, idempotency, transactions, event log, and outbox evidenced locally. Production auth/RBAC/publisher remain absent. |
| Frontend compliance | Not approved for implementation | Frontend integration remains blocked; frontend mock/localStorage state must not become truth. |
| Security compliance | Pass with warnings | Tenant/student scoped replay passed locally; production auth/RBAC and CI/staging evidence remain blockers. |
| Evaluation compliance | Pass with warnings | Eval thresholds pass; Step 9 DB integration runner missing. |
| Production compliance | Not production-ready | No production SLO, publisher, auth/RBAC, CI/staging evidence, backup/restore, or dashboards claimed. |

No no-go rule was triggered by Step 16 evidence.

## 19. Go / No-go Decision

Decision: Step 16 is accepted with warnings.

Go:

- Proceed to Step 17A - Post-Step-16 Backend/Frontend Contract and Integration Planning, review/planning only.

No-go:

- Do not proceed directly to Step 17 frontend implementation.
- Do not add frontend integration, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, package installs, migration edits, seed edits, env edits, Docker Compose runtime, Prisma/ORM, or real patient data from this review.

## 20. Next Recommended Task

Step 17A - Post-Step-16 Backend/Frontend Contract and Integration Planning.

Exact next scope:

```text
Use docs/implementation/reports/STEP_16R_DB_BACKED_REPLAY_SAFETY_ARCHITECTURE_REVIEW_REPORT.md, docs/implementation/reports/STEP_16_DB_BACKED_REPLAY_SAFETY_EVIDENCE_REPORT.md, docs/implementation/IMPLEMENTATION_STATUS.md, docs/implementation/IMPLEMENTATION_BACKLOG.md, docs/implementation/NO_GO_RULES.md, shared/contracts/CONTRACT_GOVERNANCE.md, shared/contracts/CONTRACT_INVENTORY.md, docs/architecture/03_FRONTEND_REQUIRED_UPDATES.md, docs/architecture/07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md, docs/architecture/08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md, and docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md.

Perform Step 17A only as Post-Step-16 Backend/Frontend Contract and Integration Planning. Produce a planning report that defines exact frontend integration prerequisites, allowed API/replay contracts, typed client/reducer test requirements, role-filtering expectations, route-valid synthetic actor/case fixture policy, and no-go conditions.

Do not implement frontend code, API clients, reducers, Playwright tests, new backend routes, live OpenAI, live agents, provider runtime, Redis/WebSocket fanout, Temporal, production publisher, production auth/RBAC, debrief, faculty workflow, treatment/order/imaging workflow, package installs, migrations, seed edits, env edits, Docker Compose runtime, Prisma/ORM, or real patient data.
```
