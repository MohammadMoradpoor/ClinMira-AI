# Step 10 - Deterministic Safety Engine

## 1. Executive Verdict

STEP 10 COMPLETE WITH WARNINGS

Step 10 implemented a deterministic, rule-based safety engine for the active mock simulation runtime. It adds SQL-first safety rule/evaluation/finding tables, global deterministic safety rule seeds, backend pre-action and post-response safety checks, safety event logging/outbox integration, release-blocking eval metrics, and static/runtime guard tests.

Warnings remain because DB-backed runtime evals were skipped without `CLINMIRA_TEST_DATABASE_URL`, shared contract typecheck remains unavailable without installed `tsc` in `shared/contracts`, and there is still no live-agent runtime, production auth/RBAC, production outbox publisher, replay API, frontend integration, or realtime runtime.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| Live OpenAI added | No. |
| Live agents added | No. |
| Agent-worker changed | No Step 10 agent-worker edits. |
| Frontend changed | No Step 10 frontend edits. Existing prototype remains prototype-only. |
| Redis/realtime added | No Redis, WebSocket, SSE, or realtime runtime. |
| Temporal added | No. |
| Debrief/faculty/scoring added | No. |
| Treatment/order/imaging workflow added | No. Unsupported attempts are blocked; no execution workflow added. |
| Production auth/RBAC added | No. Temporary actor headers remain Step 8B-only. |
| Packages installed | No. |
| Prisma/ORM added | No. |
| Real patient data added | No. |

## 3. Implementation Summary

| Area | Implementation |
| --- | --- |
| Database migration | `backend/database/migrations/0005_deterministic_safety_engine.sql`. |
| Safety tables | `safety_rules`, `safety_evaluations`, `safety_findings`. |
| Timeline events | Added `safety.action.blocked`, `safety.response.blocked`, `safety.warning.created` to timeline constraint. |
| Seed | `backend/database/seeds/0005_deterministic_safety_rules_seed.sql` inserts global `institution_id NULL` deterministic rules. |
| Backend module | `backend/api/src/safety/**` with DTOs, rule definitions, service, repository, module, and error type. |
| Simulation integration | `submitAction` runs `evaluatePreAction` before mock response/reveal logic and `evaluatePostResponse` before persisting mock patient responses. |
| Blocking behavior | Safety blocks persist evaluation/findings, mark action `blocked_unsupported`, write student-safe system message, timeline event, `event_log`, and `outbox_events`; no reveal logic runs. |
| Warning behavior | Safety warnings persist evaluations/findings and write `safety.warning.created` timeline/event/outbox while allowing safe mock responses. |
| Eval harness | Added safety block/finding assertions and zero-tolerance metrics. |

## 4. Safety Coverage

| Category | Decision |
| --- | --- |
| Prompt injection / instruction bypass | `block`. |
| Hidden diagnosis / answer-key request | `block`. |
| System prompt / internal instruction request | `block`. |
| Faculty-only / rubric / scoring-guide request | `block`. |
| Role escalation to admin/faculty | `block`. |
| Safety-only or evaluator-only context request | `block`. |
| Diagnosis certainty request | `block_unsupported`. |
| Treatment plan request | `block_unsupported`. |
| Medication recommendation request | `block_unsupported`. |
| Imaging interpretation request | `block_unsupported`. |
| Debrief/scoring generation request | `block_unsupported`. |
| `order_attempt`, `diagnosis_attempt`, `treatment_attempt` | `block_unsupported`. |
| Post-response hidden/internal leakage | `block`. |
| Post-response unsupported treatment/medication/diagnosis/imaging/debrief claim | `block_unsupported`. |
| Post-response missing fact references for fact-bearing text | `warn`. |

## 5. Eval Metrics

| Metric | Required | Current |
| --- | --- | --- |
| `hidden_fact_leakage_critical_count` | `0` | Pass: `0`. |
| `unsupported_treatment_advice_count` | `0` | Pass: `0`. |
| `unsafe_risky_action_accepted_count` | `0` | Pass: `0`. |
| `safety_block_required_count` | Evidence metric | `20`. |
| `safety_block_missing_count` | `0` | Pass: `0`. |
| `unsafe_action_accepted_count` | `0` | Pass: `0`. |
| `safety_finding_missing_count` | `0` | Pass: `0`. |
| `live_openai_call_count` | `0` | Pass: `0`. |
| `frontend_mock_source_usage_count` | `0` | Pass: `0`. |
| `fact_reference_required_rate_min` | `1.0` | Pass: `1.0`. |

## 6. Tests and Checks

| Command | Ran? | Result | Notes |
| --- | --- | --- | --- |
| `node --test backend/database/tests/*.test.mjs` | Yes | Pass | 10 database test files passed. |
| `node --test backend/evals/tests/*.test.mjs` | Yes | Pass | 5 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Yes | Pass | Status `PASSED`; threshold failures `0`; DB-backed eval skipped. |
| `npm --prefix backend/api run test` | Yes | Pass | 5 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Yes | Pass | Backend API TypeScript typecheck passed. |
| `npm --prefix backend/api run build` | Yes | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Yes | Pass | 3 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Yes | Blocked | `tsc` not found; no package install authorized for Step 10. |
| Forbidden runtime import scan | Yes | Pass | No OpenAI/Redis/Temporal/WebSocket/SSE/Prisma imports in scoped source areas. |
| Frontend mock source scan | Yes | Pass | No backend/database/shared/eval runtime imports from frontend mock paths. |
| Prisma schema scan | Yes | Pass | No `schema.prisma` found. |
| Docker compose scan | Yes | Pass | No `docker-compose.yml` or `docker-compose.yaml` found. |
| Frontend/agent-worker tracked diff scan | Yes | Pass with warning | No tracked Step 10 diff under these paths; pre-existing dirty/prototype state remains. |

## 7. Remaining Warnings

- No DB-backed runtime eval run because `CLINMIRA_TEST_DATABASE_URL` is absent.
- Migration apply was not verified against a safe PostgreSQL database.
- Shared contracts typecheck remains blocked until a separate approved dependency setup provides `tsc`.
- No live agents or live OpenAI calls.
- No production auth/RBAC.
- No frontend integration.
- No realtime, Redis, WebSocket/SSE, or replay API.
- No production outbox publisher.
- Existing frontend prototype remains dirty/prototype-only and must not become source of truth.

## 8. Step 11 Readiness

Step 11 can start with warnings only after an architecture review of Step 10 if the user wants a strict independent gate.

Recommended next scope: Agent-worker control skeleton and safety-aligned worker contract only, if authorized by the backlog. Step 11 must not add live OpenAI calls, live agents, frontend integration, realtime, debrief/faculty workflows, treatment advice, Redis/WebSocket/SSE, Temporal runtime, production publisher, or production auth/RBAC unless the implementation playbook explicitly authorizes that sub-scope.
