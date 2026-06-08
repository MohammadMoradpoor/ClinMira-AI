# Step 8 - Mock Simulation Session Engine

## 1. Executive Verdict

STEP 8 BLOCKED - SQL AND CONTRACT FOUNDATION COMPLETE; RUNTIME API PERSISTENCE BLOCKED.

Step 8 implemented the SQL-first database foundation, static database tests, foundation-only simulation JSON Schemas, contract guard tests, database documentation updates, contract governance updates, and status updates.

The runtime mock simulation API was not implemented because `backend/api` has no approved PostgreSQL client, repository layer, or transaction wrapper, and package installation was not authorized. Implementing `POST /api/v1/simulation-sessions`, `GET /api/v1/simulation-sessions/:id`, or `POST /api/v1/simulation-sessions/:id/actions` without durable database persistence would fake source-of-truth behavior and violate the architecture.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| SQL migration added | Yes: `0004_mock_simulation_session_engine.sql`. |
| Approved six tables only | Yes. |
| Session-level reveal state | Yes, references only. |
| Clinical actions/messages/timeline/snapshots | Yes, schema foundation only. |
| Backend API endpoints | No, blocked by missing approved DB client/transaction layer. |
| Deterministic mock response runtime | No, blocked by missing durable runtime persistence. |
| Live OpenAI | No. |
| Redis/WebSocket/SSE/Temporal | No. |
| Frontend integration | No. |
| Python agent-worker changes | No. |
| Package install | No. |
| Prisma/ORM migration authority | No. |
| Docker compose runtime | No. |

## 3. Mock Simulation Decision

Backend-owned PostgreSQL state is the only valid source of truth for simulation sessions.

Because the current NestJS API/BFF remains health-only and has no approved database client, Step 8 could not safely implement runnable persistence or endpoints. The safe architecture-aligned decision was to create the SQL/contracts/static-test foundation and block runtime API execution.

Required setup before runtime endpoints:

- Approved PostgreSQL client dependency or existing DB access mechanism for `backend/api`.
- Transaction wrapper that can atomically reserve idempotency, write domain rows, write `event_log`, and write `outbox_events`.
- Repository/service boundary that always filters by `institution_id`.
- Integration tests against a safe PostgreSQL database applying migrations `0001` through `0004`.

## 4. Tables Implemented

| Table | Purpose | Safety Notes |
| --- | --- | --- |
| `simulation_sessions` | Backend-owned session state locked to tenant, case, case version, and student. | `patient_state` is a projection only, not fact truth. |
| `session_revealed_facts` | Session-level reveal references. | Stores `fact_id`, reveal rule/action references, target scope, and reason only; no fact content. |
| `clinical_actions` | Durable student action attempts. | Risky `order_attempt`, `diagnosis_attempt`, and `treatment_attempt` cannot be accepted/responded by constraint. |
| `conversation_messages` | Persisted message projections with `used_fact_ids`. | No hidden fact payload columns; no streaming runtime. |
| `timeline_events` | Ordered session timeline projection. | Not a substitute for `event_log`. |
| `session_state_snapshots` | Versioned recovery projection. | Snapshot is not a source of clinical truth. |

## 5. API And Runtime Summary

No simulation API endpoints were added.

Approved but blocked endpoints:

- `POST /api/v1/simulation-sessions`
- `GET /api/v1/simulation-sessions/:id`
- `POST /api/v1/simulation-sessions/:id/actions`

Blocked reason: no approved API database client, transaction wrapper, repository boundary, or migration-apply integration harness exists. The API tests still pass and confirm the API remains health-only.

## 6. Hidden Fact Protection Summary

`fact_ledger` remains the canonical clinical fact source.

`session_revealed_facts` stores references only and does not duplicate `fact_ledger.content`, `student_safe_summary`, `faculty_notes`, hidden fact payloads, prompts, or frontend mock state.

Static guards verify:

- No separate `hidden_facts` or `revealed_facts` tables.
- Reveal state references `fact_ledger`, `fact_reveal_rules`, and `clinical_actions`.
- Conversation messages use `used_fact_ids` arrays rather than hidden fact payload columns.
- Simulation contracts do not expose hidden fact content fields.

## 7. Event And Outbox Usage Summary

Runtime event writes are not implemented because runtime mutations are blocked.

The SQL authority records the required transaction contract:

- Create-session runtime must insert session state, snapshot, timeline, `event_log` event `simulation.session.created`, and `outbox_events` in one PostgreSQL transaction.
- Submit-action runtime must reserve idempotency, insert action/message/timeline/reveal references as authorized, update state version/snapshot, and write `event_log`/`outbox_events` in one PostgreSQL transaction.
- Redis, WebSocket, SSE, frontend state, and model memory remain forbidden as durable truth.

## 8. Contract Foundation Summary

Foundation-only simulation schemas were added under `shared/contracts/simulation/`:

- `CreateSimulationSessionRequestDto`
- `SimulationSessionDto`
- `SubmitSimulationActionRequestDto`
- `SimulationTurnResultDto`
- `ClinicalActionDto`
- `ConversationMessageDto`
- `TimelineEventDto`
- `SessionStateSnapshotDto`
- `RevealedFactReferenceDto`

OpenAPI was not updated because no simulation endpoint is active.

## 9. Static And Unit Tests Run

| Command | Result |
| --- | --- |
| `node backend/database/tests/core_schema_static.test.mjs` | Pass, 10 tests. |
| `node backend/database/tests/no_forbidden_tables.test.mjs` | Pass, 6 tests. |
| `node backend/database/tests/case_fact_schema_static.test.mjs` | Pass, 10 tests. |
| `node backend/database/tests/fact_visibility_guard.test.mjs` | Pass, 8 tests. |
| `node backend/database/tests/event_outbox_schema_static.test.mjs` | Pass, 9 tests. |
| `node backend/database/tests/event_replay_contract_guard.test.mjs` | Pass, 7 tests. |
| `node backend/database/tests/mock_simulation_schema_static.test.mjs` | Pass, 11 tests. |
| `node backend/database/tests/mock_simulation_fact_guard.test.mjs` | Pass, 7 tests. |
| `npm --prefix backend/api run test` | Pass, 2 test files. |
| `npm --prefix shared/contracts run test` | Pass, 3 test files. |

## 10. Commands And Inventory Results

| Command | Result |
| --- | --- |
| `git status --short` | Dirty worktree remains from earlier work; Step 8 changes are scoped to database, shared contracts, and implementation docs. |
| `git diff --stat` | Tracked diff showed prior tracked docs/README files only; new Step 8 files are untracked until git add. |
| `find backend/database -maxdepth 5 -type f` | Confirmed `0004` migration and new Step 8 database tests. |
| `find backend/api -maxdepth 7 -type f` | Confirmed health-only API files; no simulation module. |
| `find shared/contracts -maxdepth 8 -type f` | Confirmed simulation schema foundation and contract test files. |
| Forbidden future table scan | Pass; no forbidden table creates in migrations/seeds. |
| Runtime integration scan | Pass; no OpenAI/Redis/Temporal/WebSocket/SSE/Prisma runtime imports or constructors in scoped code. |
| Frontend/mock source scan | Pass with guard-test mentions only; no frontend mock source used by SQL/contracts/API. |
| Agent-worker/frontend status scan | Existing dirty prototype/worker skeleton remains; Step 8 did not modify them. |
| Prisma/compose scans | Pass; no `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml` found. |

## 11. Forbidden Feature Scan Result

| Feature | Result |
| --- | --- |
| Live OpenAI or OpenAI SDK | Not added. |
| Python agent-worker changes | Not added. |
| Redis/WebSocket/SSE/Temporal runtime | Not added. |
| Frontend integration or frontend mock data dependency | Not added. |
| Orders/imaging/scores/debrief/faculty/safety/evaluator/agent/model/tool tables | Not added. |
| Prisma schema or ORM schema authority | Not added. |
| Docker compose runtime | Not added. |
| Simulation API endpoints without persistence | Not added. |
| Hidden fact content in reveal state | Not added. |

## 12. Remaining Warnings And Blockers

- Runtime API persistence is blocked until an approved database client and transaction boundary exist.
- Migration apply test was not run because no explicitly configured safe PostgreSQL database was provided.
- No create-session or submit-action runtime exists yet.
- No deterministic mock response service exists yet.
- No runtime event/outbox writes exist yet.
- The repository remains dirty from earlier architecture/prototype work.
- Frontend prototype still contains mock simulation state and must remain non-authoritative.

## 13. Step 9 Readiness And Next Step

Step 9 cannot start yet.

Reason: Step 9 eval harness depends on an actual mock simulation runtime surface. Step 8 currently has SQL/contracts/static foundations only, with runtime API persistence blocked.

Mandatory next step:

```text
You are a strict architecture reviewer.

Review Step 8 against:
- docs/architecture
- docs/implementation/IMPLEMENTATION_PLAYBOOK.md
- docs/implementation/reports/STEP_08_MOCK_SIMULATION_SESSION_ENGINE_REPORT.md
- docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md

Check scope creep, architecture violations, hidden fact leakage risk, missing tests, contract drift, unsafe shortcut, source-of-truth violation, Redis misuse, live agent added too early, frontend/backend mismatch, and whether the runtime API persistence blocker is correctly handled.

Do not implement new features.
Only review and produce a correction list.
```

After review passes, the next implementation task should be an explicitly approved backend API persistence setup/completion task for Step 8 runtime endpoints, including approved DB client selection or package installation approval.
