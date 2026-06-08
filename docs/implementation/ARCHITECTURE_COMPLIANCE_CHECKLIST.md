# Architecture Compliance Checklist

Every future implementation must pass this checklist before it is accepted. If an item is not applicable, the final report must say why.

## Agentic Compliance

| Check | Required Evidence | Pass? |
| --- | --- | --- |
| Agents-as-tools only unless approved | Orchestrator/tool contract shows code-supervised routing. |  |
| No autonomous swarm | No peer-to-peer autonomous agent mutation path exists. |  |
| No hidden fact access by Persona Agent | Context firewall test and agent input snapshot prove allowed facts only. |  |
| No clinical fact invention | Output maps to `fact_ledger`, rule id, event id, rubric id, or approved transition id. |  |
| Structured outputs where required | JSON/Pydantic/schema validation for agent outputs. |  |
| Agent cannot directly mutate DB | Tool/service boundary tests and code review evidence. |  |
| Live agents behind gate | `live_agents` flag off by default, eval/safety/cost evidence attached. |  |

## Backend Compliance

| Check | Required Evidence | Pass? |
| --- | --- | --- |
| PostgreSQL source of truth | Domain state persisted in PostgreSQL, not frontend/local/Redis/model memory. |  |
| Redis not source of truth | Redis usage is cache/presence/fanout/coordination only. |  |
| Idempotency for mutations | Unique idempotency keys or natural unique constraints tested. |  |
| Transactions | Critical mutation writes domain state, audit/event, and outbox atomically. |  |
| Outbox/event log | Replayable event and `outbox_events` exist for critical frontend-visible changes. |  |
| Audit logs | Sensitive operations record actor, tenant, resource, action, result, trace id. |  |
| Tenant scope | Every tenant-scoped table/query/API/event includes institution/tenant enforcement. |  |
| SQL-first migration authority | Reviewed SQL migration owns production schema. |  |

## Frontend Compliance

| Check | Required Evidence | Pass? |
| --- | --- | --- |
| Typed contracts | Frontend API/event types generated or imported from approved contracts. |  |
| No hidden facts | Student-visible payload tests and redaction checks. |  |
| Blocked actions not shown as accepted | Reducer/UI tests for safety block and rollback states. |  |
| Replay/duplicate handling | Reducer handles sequence gaps, duplicate events, reconnect replay. |  |
| EN/TR layout safety | Overflow/accessibility checks for English and Turkish where touched. |  |
| Accessibility | Keyboard/focus/contrast/screen-reader checks for touched components. |  |
| No mock payload inference | Mock data does not define backend DTO shape. |  |

## Security Compliance

| Check | Required Evidence | Pass? |
| --- | --- | --- |
| RBAC | Guards/tests for student, faculty, admin, tenant roles. |  |
| Tenant isolation | Cross-tenant API/event/object tests fail closed. |  |
| Prompt injection tests | Injection attempts cannot reveal facts, alter scores, or call tools. |  |
| Redaction | Hidden facts, prompts, traces, and sensitive fields redacted by role. |  |
| Tool permission matrix | Tool calls validate actor, tenant, session, mode, and state. |  |
| Audit trail | Denials, approvals, safety blocks, and manual overrides are auditable. |  |
| Waiver policy | Any waiver has owner, expiry, risk, monitoring, rollback, tests. |  |

## Evaluation Compliance

| Check | Required Evidence | Pass? |
| --- | --- | --- |
| Eval harness before live agents | Versioned eval suite with stored pass evidence. |  |
| Hidden fact leakage tests | Critical leakage rate is `0`. |  |
| Unsafe treatment tests | Unsafe accepted treatment is `0`. |  |
| Unsupported debrief claim tests | Unsupported critical debrief claims are `0`. |  |
| Faculty calibration | Agreement/override/disagreement evidence before pilot. |  |
| Contract snapshots | Eval inputs and outputs reference schema versions. |  |

## Production Compliance

| Check | Required Evidence | Pass? |
| --- | --- | --- |
| Tracing | Frontend, API, DB, worker, agent, Redis/realtime traces correlate by id. |  |
| Metrics | SLO metrics exist for API, replay, safety, agents, cost, frontend. |  |
| SLOs | Current milestone SLO targets and dashboards exist. |  |
| Cost tracking | Model/token/session/tenant costs recorded and alerted. |  |
| Retention | Retention and redaction policy implemented for touched data. |  |
| Backup/restore | Restore drill evidence for DB/event/audit data before pilot. |  |
| Dashboard acceptance | Dashboard acceptance matrix from doc 10 is satisfied for relevant scope. |  |
