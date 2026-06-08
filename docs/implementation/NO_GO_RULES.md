# No-Go Rules

Implementation must stop when any rule below is triggered. Stopping is not failure; it is the architecture doing its job.

| No-Go Rule | Why It Exists | Example Violation | Correct Action | Owner/Reviewer |
| --- | --- | --- | --- | --- |
| 1. Live OpenAI agents are requested before eval harness and safety engine. | Live agents can leak hidden facts, invent claims, or accept unsafe actions without evidence gates. | Adding OpenAI SDK calls before eval/safety tests. | Stop; complete contracts, DB, fact ledger, outbox, mock runtime, eval, and safety first. | Agent Runtime + Safety + Architecture |
| 2. Realtime is requested before event log/outbox. | Direct realtime emits can lose critical events. | Adding WebSocket stream from API after DB write without outbox. | Stop; implement event log, outbox, replay contract, and replay tests first. | Backend + Platform |
| 3. Frontend integration is requested before typed contracts. | Mock payload assumptions create drift and hidden fact leakage risk. | Wiring frontend to ad hoc `/cases` response not in OpenAPI/contracts. | Stop; create typed contracts and freshness checks first. | Frontend + Contracts |
| 4. Treatment workflow is requested before safety engine. | Unsafe treatments must never become accepted state. | Persisting a medication/treatment action before deterministic safety checks. | Stop; implement safety rules, block state, audit, and tests first. | Safety + Backend |
| 5. Debrief is requested before evidence ids and reasoning graph. | Debrief prose can hallucinate teaching points. | Generating feedback text without citations to facts/rubric/timeline. | Stop; require evidence ids and unsupported-claim tests. | Faculty + Safety + Agent Runtime |
| 6. Scenario publish is requested before faculty review gate. | Student-visible content must be reviewed and auditable. | Publishing case version from Scenario Studio without backend approval state. | Stop; implement faculty review workflow and audit tests first. | Faculty + Product + Backend |
| 7. Redis is used as source of truth. | Redis Pub/Sub is ephemeral and Redis state is operational, not authoritative. | Storing clinical session truth only in Redis stream/hash. | Stop; persist truth in PostgreSQL and use Redis only for coordination. | Backend + Platform |
| 8. Hidden facts are sent to frontend. | Hidden facts are assessment material and leakage breaks simulation integrity. | Student payload includes hidden diagnosis or unrevealed finding. | Stop; add role-filtering, redaction, context firewall, and leakage tests. | Safety + Frontend + Backend |
| 9. Persona Agent receives unauthorized hidden facts. | Prompt instruction alone cannot prevent leakage. | Persona input contains hidden diagnosis with instruction "do not reveal." | Stop; filter context before agent call and add hidden fact tests. | Agent Runtime + Safety |
| 10. Agent mutates database directly without orchestrator-approved tool/service. | Agents must not bypass validation, idempotency, safety, audit, or tenant checks. | Agent worker writes order/state row directly. | Stop; route mutation through approved tool/service with guardrails. | Agent Runtime + Backend |
| 11. Migration authority is unclear. | Production schema must be SQL-reviewed and versioned. | Using Prisma Migrate or ORM sync as production schema authority. | Stop; complete SQL-first migration operating procedure and registry. | Backend + Architecture |
| 12. No tests are added for a behavioral change. | Untested behavior can break safety, replay, contracts, or tenant isolation. | Adding route logic without unit/contract/integration tests. | Stop or add required tests in scope. | Task Owner + Reviewer |
| 13. Codex needs to modify unrelated files to complete a task. | Unrelated edits hide regressions and overwrite user work. | Changing frontend UI while working on backend contracts. | Stop; request narrowed scope or separate task. | Architecture + User |
| 14. Architecture docs conflict and no decision is recorded. | Implementation cannot choose policy by convenience. | Backend doc says SQL-first while task asks ORM sync. | Stop; create ADR/update decision with owner approval. | Architecture Owner |
| 15. A shortcut would weaken safety, testability, or auditability. | ClinMira must not become a shallow chatbot or unreliable prototype. | Skipping outbox because demo works locally. | Stop; implement the required gate or report blocker. | Architecture + Responsible Owner |

## Enforcement

- Any no-go finding blocks the task.
- The final report must identify the no-go rule, affected files, risk, and safe next step.
- No-go rules can only change through an ADR with source basis, owner approval, risk analysis, and release-gate impact.
