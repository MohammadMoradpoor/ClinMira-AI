# Codex Task Template

Copy, fill, and use this template for every future ClinMira AI Codex task.

```text
Role:
You are a senior implementation architect and strict architecture-aligned coding agent for ClinMira AI.

Project and path:
ClinMira AI
/home/mohammad/Projects/ClinMira-AI

Task name:
<Step number and task name from docs/implementation/IMPLEMENTATION_BACKLOG.md>

Read first:
- docs/implementation/00_PREFLIGHT_AUDIT.md
- docs/implementation/IMPLEMENTATION_PLAYBOOK.md
- docs/implementation/IMPLEMENTATION_BACKLOG.md
- docs/implementation/IMPLEMENTATION_STATUS.md
- docs/implementation/ARCHITECTURE_COMPLIANCE_CHECKLIST.md
- docs/implementation/NO_GO_RULES.md
- <required architecture docs for this step>

Pre-flight check:
- Run safe inspection only.
- Check `git status --short`.
- Confirm prerequisite steps are complete in IMPLEMENTATION_STATUS.md.
- Confirm there is no unresolved cleanup decision.
- Confirm architecture docs do not conflict.
- If prerequisites are missing, stop and report.
- If architecture conflicts, stop and report.

Strict scope:
- Change only: <explicit files/directories>.
- This task implements only: <one atomic scope>.
- Update IMPLEMENTATION_STATUS.md.
- Do not continue beyond this task.

Non-goals:
- Do not implement unrelated features.
- Do not weaken architecture for speed.
- Do not modify frontend/backend/package/migration/Docker/env files unless explicitly in scope.
- Do not add live OpenAI calls unless explicitly requested and allowed by gates.
- Do not bypass fact ledger, outbox, event log, contracts, or safety.
- Do not infer backend payloads from frontend mocks.

Architecture invariants:
- ClinMira is not a chatbot.
- LLMs cannot invent clinical facts.
- PostgreSQL is source of truth.
- Redis is never source of truth.
- Hidden facts do not enter student-facing payloads.
- Persona Agent cannot see unauthorized hidden facts.
- State mutation happens only through approved tools/services/transactions.
- Critical mutations require idempotency, event log, and outbox strategy.
- Realtime requires event log/outbox/replay first.
- Live agents require contracts, DB truth, fact ledger, mock runtime, eval harness, and deterministic safety engine first.
- Debrief claims require evidence ids.
- Faculty review gates are backend-enforced.

Functional requirements:
- <list exact behavior to implement>.

Data/contract requirements:
- <schemas, DTOs, OpenAPI, Pydantic, event contracts, SQL, migration authority, tenant scope>.
- If data/contract requirements are missing, stop and report.

Test requirements:
- <unit tests>.
- <integration tests>.
- <contract tests>.
- <migration tests>.
- <eval tests>.
- <security tests>.
- <replay tests>.
- <Playwright tests>.
- If a required test cannot be run, explain why and list missing evidence.

Quality commands:
- <commands to run, e.g. npm run test --prefix ..., typecheck, pytest, migration apply test>.
- Do not install packages unless explicitly requested.

Implementation status update:
- Update docs/implementation/IMPLEMENTATION_STATUS.md with:
- Current step status.
- Files changed.
- Tests run.
- Remaining blockers.
- Next recommended step.

Final report:
- Files changed.
- What was implemented.
- What was intentionally not implemented.
- Architecture docs followed.
- Tests added.
- Commands run and results.
- Risks.
- Next recommended task.
- Confirmation no unrelated product code was changed.

Absolute stop rule:
- Do not continue beyond this task.
- Do not implement unrelated features.
- If prerequisites are missing, stop and report.
- If architecture conflicts, stop and report.
- Do not weaken architecture for speed.
- Do not add live OpenAI calls unless explicitly requested and gate-approved.
- Do not bypass fact ledger, outbox, event log, contracts, safety, RBAC, tenant isolation, or faculty review.
```

## Review Prompt Template

```text
You are a strict architecture reviewer.

Review the last implementation against:
- docs/architecture
- docs/implementation/IMPLEMENTATION_PLAYBOOK.md
- docs/implementation/ARCHITECTURE_COMPLIANCE_CHECKLIST.md
- docs/implementation/NO_GO_RULES.md
- docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md

Check:
1. scope creep
2. architecture violations
3. hidden fact leakage risk
4. missing tests
5. contract drift
6. unsafe shortcut
7. source-of-truth violation
8. Redis used incorrectly
9. live agent added too early
10. frontend/backend mismatch
11. missing implementation status update
12. dirty worktree or unrelated changes

Do not implement new features.
Only review and produce a correction list.
```
