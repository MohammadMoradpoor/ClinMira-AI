# ClinMira AI Implementation Playbook

## 1. Purpose

This playbook is the implementation control document for ClinMira AI. It prevents architecture drift and ensures every future Codex task is atomic, testable, reviewable, and aligned with the approved architecture in `docs/architecture`.

This document does not authorize product implementation by itself. It defines how implementation may proceed after preflight, cleanup decisions, architecture gates, and task-specific prerequisites are satisfied.

Primary authority:

- `docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md`
- `docs/architecture/04_IMPLEMENTATION_ROADMAP.md`
- `docs/architecture/11_ARCHITECTURE_REVIEW_SUMMARY.md`
- This playbook and the live status file in `docs/implementation/IMPLEMENTATION_STATUS.md`

## 2. Core Architecture Invariants

Every future task must preserve these invariants:

- ClinMira is not a chatbot. It is a governed Virtual Clinic Simulation OS.
- LLM output cannot invent clinical facts.
- PostgreSQL is the source of truth for clinical, session, audit, event, and assessment state.
- Redis is not source of truth. Redis may only coordinate cache, presence, fanout, streams, rate limits, or short-lived operational state.
- Agents cannot directly mutate state.
- State mutation happens only through orchestrator-approved tools, services, or transactions.
- Persona Agent cannot see unauthorized hidden facts.
- Hidden facts never go to student-facing frontend payloads.
- Every debrief claim requires an evidence id.
- Every critical mutation must have idempotency, event log, and outbox strategy.
- Live OpenAI agents require contracts, database truth, fact ledger, event log/outbox, mock simulation, eval harness, and deterministic safety gates first.
- Realtime requires event log/outbox/replay first.
- Frontend integration requires typed contracts first.
- Treatment actions require deterministic safety engine first.
- Scenario publish requires backend-enforced faculty review gate.
- Faculty approval, safety gates, tenant isolation, and auditability are backend responsibilities, not UI promises.
- Synthetic-only MVP remains mandatory; no real patient data or real clinical-care claims are allowed.

## 3. Required Implementation Order

The implementation order is strict. Do not skip, merge, or reorder steps unless an ADR updates the architecture with owner approval.

| Step | Task | Release Meaning |
| --- | --- | --- |
| 1 | Implementation Reset, Preflight Audit, and Playbook | Establish control system only. No product code. |
| 2 | Repository Cleanup Decision, if needed | Decide whether previous partial work is kept, corrected, or manually reverted. |
| 3 | Backend/API Skeleton only | Health-only NestJS API/BFF and skeleton boundaries. |
| 4 | Shared Contracts and Schema Governance | Contract inventory, OpenAPI, TypeScript DTOs, Pydantic locations, schema versions, contract CI plan. |
| 5 | Database Core and Migration Authority | SQL-first migration operating procedure, registry, core tenant/user schema plan and implementation only after gates. |
| 6 | Case Versioning and Fact Ledger | Immutable cases, versions, patient twins, facts, reveal rules, fact ledger, context firewall plan/tests. |
| 7 | Event Log and Transactional Outbox | Durable `event_log`, `outbox_events`, sequence, idempotency, replay contract, no WebSocket yet. |
| 8 | Mock Simulation Session Engine | Deterministic create session, submit action, mock patient response, persist action/message/timeline using fact ledger. |
| 9 | Initial Eval Harness | Golden cases, hidden fact leakage tests, unsupported claim tests, safety fixtures. |
| 10 | Deterministic Safety Engine | Pre/post safety rules, unsafe action blocking, warnings, faculty triggers. |
| 11 | Python Agent Runtime Skeleton with Mock Agents | Agent contracts, mock/disabled agents, no live OpenAI calls. |
| 12 | OpenAI Agents SDK Integration Behind Feature Flag | Live model path only after prior gates, off by default, tenant-aware, audited. |
| 13 | Realtime Gateway with Replay | WebSocket/SSE only after event log/outbox/replay tests pass. |
| 14 | Frontend API Client and Contracts | Generated/typed clients and contract freshness checks. |
| 15 | Virtual Clinic Backend Integration | Route-by-route mock replacement using reducer/replay/safety tests. |
| 16 | Imaging Mock Service | Curated synthetic imaging, approval and visibility rules. |
| 17 | Evaluator and Debrief Engine | Evidence-grounded scoring/debrief, no unsupported claims. |
| 18 | Faculty Review Workflow | Backend-enforced review states, audit logs, publish gates. |
| 19 | Scenario Studio Backend | Draft/version/publish workflow with faculty review and validation. |
| 20 | Agent Control Observability | Redacted traces, RBAC, audit, telemetry correlation. |
| 21 | Production Observability, Cost, and SLO Dashboards | Dashboards, alerts, budgets, replay metrics, retention evidence. |
| 22 | Pilot Readiness Hardening | Accessibility, support, buyer/faculty evidence, security, go/no-go packet. |

Live OpenAI agents must not be implemented before all of these exist and pass: contracts, database core, fact ledger, event log/outbox, mock simulation, eval harness, and deterministic safety engine.

## 4. Atomic Task Rule

Every Codex task must:

- Implement only one step or one explicitly bounded slice from one step.
- Read the relevant architecture docs first.
- State strict scope before edits.
- State non-goals before edits.
- Add or update tests required by the step.
- Run relevant checks, or state clearly why a check could not be run.
- Update `docs/implementation/IMPLEMENTATION_STATUS.md`.
- Produce a final report with files changed, checks, risks, and next step.
- Stop after the task and wait for the next user request.

If a task needs work from a later step, stop and report the blocked prerequisite. Do not "just stub" unsafe behavior.

## 5. Review After Every Task

After every implementation task, run a separate review prompt before continuing.

The review must check:

- Scope creep.
- Architecture violations.
- Hidden fact leakage risk.
- Missing tests.
- Contract drift.
- Unsafe shortcut.
- Redis source-of-truth misuse.
- Live agent added too early.
- Frontend/backend mismatch.
- Missing `IMPLEMENTATION_STATUS.md` update.
- Dirty worktree conflicts with unrelated user work.
- Package, migration, Docker, or environment changes outside scope.

Review findings must be listed first, ordered by severity, with file and line references where possible.

## 6. Branching and Git Safety

Rules:

- Do not use destructive git commands.
- Do not reset automatically.
- Do not delete user work.
- Do not revert unrelated dirty changes.
- Report dirty state before implementation.
- Recommend separate branches for each implementation step.
- Include `git status --short` and git diff summary in final reports when relevant.
- If previous incomplete work exists, document it and ask for a cleanup decision instead of deleting it.

## 7. Testing Policy

Every task must define required evidence before or alongside implementation.

| Task Area | Minimum Required Evidence |
| --- | --- |
| Documentation/control | Required files exist, scope scan confirms docs-only changes. |
| Contracts | OpenAPI/schema validation, TypeScript DTO checks, Pydantic/schema alignment, freshness/drift tests. |
| Database/migrations | SQL migration apply test, drift test, tenant isolation test, transaction/idempotency test. |
| Fact ledger/context firewall | Hidden fact access tests, visibility matrix tests, unsupported claim tests, redaction tests. |
| Event/outbox/replay | Crash-after-commit test, duplicate event test, replay gap test, role-redaction replay test. |
| Mock simulation | Deterministic response tests, fact grounding tests, persistence tests, idempotency tests. |
| Safety | Unsafe accepted treatment equals `0`, prompt injection bypass equals `0`, unauthorized tool mutation equals `0`. |
| Agent runtime | Contract tests, mock-agent tests, hidden fact leakage tests, model routing/cost evidence before live. |
| Frontend integration | Reducer determinism tests, safety rollback test, reconnect replay test, Playwright scenarios, accessibility checks. |
| Faculty workflows | Approval bypass tests, RBAC tests, audit tests, calibration evidence. |
| Observability/SLO | Trace correlation, metrics, dashboards, cost alerts, replay success, cardinality review. |

Build, lint, typecheck, unit, integration, contract, migration, eval, security, replay, and Playwright tests are required when the task touches those areas. If test infrastructure is missing, the task must either add the approved test infrastructure within scope or stop and report.

## 8. Feature Flag Policy

These features must be behind tenant-aware, audited flags and off by default until gates pass:

- Live OpenAI agents.
- Voice/realtime agents.
- Debrief generation.
- Scenario publish.
- Faculty review enforcement.
- Realtime gateway.
- LTI integration.
- Experimental model routing.
- Advanced imaging paths.
- Agent Control trace UI.

Feature flags cannot disable safety, audit, tenant isolation, hidden fact filtering, or source-of-truth requirements in production.

## 9. Stop Conditions

Codex must stop if:

- Architecture docs conflict and no ADR decision is recorded.
- A required prerequisite is missing.
- The task would require unrelated changes.
- Test infrastructure is missing and cannot be safely added in scope.
- A live OpenAI call would be introduced too early.
- Hidden facts would leak.
- Redis would become source of truth.
- Event log/outbox prerequisite is missing for realtime.
- Typed contracts are missing for frontend integration.
- Migration authority is unclear.
- A treatment workflow is requested before safety engine.
- A debrief workflow is requested before evidence ids and grounding tests.
- Scenario publish is requested before backend faculty review gate.
- Product code is requested in a docs-only task.

Stopping is correct behavior when a gate blocks the request.

## 10. Final Report Format

Every task must return:

- Files changed.
- What was implemented.
- What was intentionally not implemented.
- Architecture docs followed.
- Tests added.
- Commands run.
- Results.
- Risks.
- Blockers.
- Next recommended task.

The final report must also confirm whether product code, packages, migrations, APIs, frontend UI, Docker files, environment files, or live model calls were changed.
