# Production SLO, Cost, and Observability

## SLOs

Production readiness requires explicit service-level objectives before university pilots. Initial targets should be refined after load testing, but the architecture must know what to measure.

| SLO | Initial Pilot Target | Measurement |
| --- | --- | --- |
| API availability | 99.5% during agreed pilot window. | API health and request success. |
| Simulation session creation | P95 <= 1000ms. | `POST /simulation-sessions` latency. |
| Patient response start latency | P95 <= 2500ms after accepted action. | Time from accepted action to first message delta. |
| Full patient response latency | P95 <= 8000ms for text responses. | Time to `patient.message.completed`. |
| Deterministic action processing | P95 <= 1200ms. | API/workflow/rule trace. |
| Realtime delivery | P95 <= 750ms from event persisted to client receipt. | Event log timestamp to client telemetry. |
| Reconnect recovery | P95 <= 3000ms. | Reconnect telemetry and event replay logs. |
| Debrief generation | P95 <= 60s async for MVP text debrief. | Workflow start to `debrief.generated`. |
| Agent run success | >= 98% excluding intentional safety blocks. | `agent_runs.status`. |
| Event replay success | >= 99.5% for core replay requests. | Replay endpoint/gateway metrics. |
| Safety block correctness | Zero unsafe accepted treatment in golden tests. | Eval harness. |
| Hidden fact leakage | Zero critical leaks in release tests. | Eval harness/security suite. |

These are conservative pilot assumptions. Platform owner updates them in Milestone 14.5 after load-test evidence; Milestone 17.5 is blocked if targets remain unmeasured.

SLO rules:

- Safety correctness gates override latency/cost convenience.
- MVP SLOs may be lower than production SLOs but must be measured.
- SLOs must be split by action type because a quick safety check and debrief generation have different expectations.

## Latency Budget

Patient encounters feel alive only if latency is planned across the full path.

| Step | Budget Owner | Notes |
| --- | --- | --- |
| Frontend submit | Frontend | Button/composer should show immediate pending state. |
| API validation | API/BFF | Auth, RBAC, DTO validation, idempotency lookup. |
| Session load | Simulation service | Redis hot cache plus PostgreSQL truth. |
| Route classification | Orchestrator | Deterministic route when action id exists; fast model only for free text. |
| Safety pre-check | Safety engine | Deterministic rules first. |
| Agent run | Agent worker | Only required agents run; stream patient response when safe. |
| State persistence | Backend DB | Transaction includes state/event/outbox. |
| Event publish | Outbox publisher/realtime | Publish after commit; monitor lag. |
| Frontend render | Frontend reducer/components | Apply by sequence; avoid expensive rerenders. |

Latency risks:

- Running all agents every turn.
- Rebuilding huge context windows.
- Waiting for debrief-grade reasoning on simple questions.
- Emitting realtime directly instead of through reliable event path.
- Frontend reducer processing large transcripts inefficiently.

Acceptance criteria:

- Trace spans exist for every latency-budget step.
- P95 and P99 are visible by action type.
- Latency regressions are reviewed before deployment.

## Cost Budget

Cost must be designed, not discovered after launch.

Cost dimensions:

- Cost per session.
- Cost per agent run.
- Cost by page/feature.
- Cost per debrief.
- Cost per scenario validation.
- Future voice cost per minute.
- Cost by tenant/institution.
- Cost by model.

Initial pilot cost assumptions:

| Cost Item | Pilot Budget Assumption | Owner | Blocking Rule |
| --- | --- | --- | --- |
| Text simulation session | Target <= USD 0.75 per completed text session. | Platform + Product | Milestone 17.5 blocks if measured median exceeds budget without pricing waiver. |
| Debrief generation | Target <= USD 0.25 per generated debrief. | Agent Runtime + Product | Debrief rollout blocks if budget is exceeded in eval runs. |
| Scenario validation | Target <= USD 0.50 per validation workflow. | Agent Runtime + Faculty/Clinical | Scenario publish rollout blocks if no cost model exists. |
| Future voice | Placeholder <= USD 0.20 per voice minute until official pricing/model choice is approved. | Platform | Voice feature flag cannot enable without refreshed official pricing and SLO review. |
| Per-tenant monthly alert | Alert at 70% and 90% of tenant budget. | Platform + Product | Pilot tenant launch blocks without alert thresholds. |
| Per-session model calls | Hard cap: 20 model calls per text session, excluding debrief; warn at 12. | Agent Runtime | Live agents block if call cap is not enforced. |
| Transcript token window | Max active context window: 12k tokens before summary/compaction; hard fail closed at model-specific safe limit. | Agent Runtime | Long-session tests block without compaction behavior. |

Pricing source rule:

- Official model pricing must be refreshed from the provider's official pricing page during Milestone 6.5 and again before Milestone 17.5. Product owns business budget; Platform owns technical cost telemetry; Agent Runtime owns model routing adherence. Release is blocked until the cost model exists for enabled live models.

Model routing controls:

- Deterministic rules when possible.
- Fast model for routing/classification.
- Stronger model for debrief/evaluator/faculty summary.
- No expensive model call on safety-blocked path unless needed for explanation.
- Transcript summarization to control token growth.
- Cache static case context by case version hash.
- Per-agent token caps.
- Per-session model-call budget.
- Per-tenant cost alerts.

Required persisted fields:

- `model_name`
- `reason_for_model_choice`
- `input_token_count`
- `output_token_count`
- `latency_ms`
- `estimated_cost`
- `agent_name`
- `session_id`
- `case_version_id`
- `tenant_id`
- `prompt_version`
- `tool_schema_version`

Acceptance criteria:

- Cost/session dashboard exists before pilot.
- Model/prompt change includes cost regression review.
- Denial-of-wallet tests exist in security suite.

## Observability

Observability must correlate frontend, API, Temporal, agent worker, database, Redis, realtime gateway, and OpenAI trace data.

Required trace identifiers:

- `trace_id`
- `span_id`
- `workflow_id`
- `activity_id`
- `session_id`
- `turn_id`
- `event_id`
- `agent_run_id`
- `tool_call_id`
- `model_run_id`
- `tenant_id`
- `case_version_id`

Observability surfaces:

- API traces.
- Temporal workflow/activity traces.
- Agent traces.
- OpenAI Agents SDK trace correlation.
- Database query metrics and lock waits.
- Redis Pub/Sub/Stream metrics.
- WebSocket connection metrics.
- Frontend telemetry.
- User experience metrics.
- Eval harness metrics.
- Faculty review metrics.

Source basis:

- OpenTelemetry traces, metrics, logs, and semantic conventions provide common naming and correlation patterns.
- OpenAI Agents SDK tracing provides agent-specific trace detail.

## Dashboards

### System Health Dashboard

Track:

- API availability and latency.
- Worker health.
- Temporal task queue backlog.
- PostgreSQL CPU/IO/locks.
- Redis memory/latency/stream lag.
- Object storage errors.

### Agent Health Dashboard

Track:

- Agent runs by agent/status.
- Tool call success/failure.
- Guardrail pass/fail.
- Model latency.
- Token usage.
- Cost estimate.
- Prompt/model versions.

### Safety Health Dashboard

Track:

- Safety warnings by rule/severity.
- Blocks by case/action.
- Unsafe attempts.
- Hidden fact leakage eval results.
- Prompt injection test results.
- Faculty review triggers.

### Cost Dashboard

Track:

- Cost/session.
- Cost/debrief.
- Cost by tenant.
- Cost by model.
- Cost by agent.
- Cost regression after deployments.

### Faculty Review Dashboard

Track:

- Review queue depth.
- Review age/SLA.
- Approval/rejection rate.
- Faculty override rate.
- Reviewer disagreement.
- Case quality issues.

### Learning Analytics Dashboard

Track:

- Competency trends.
- Common missed evidence.
- Unsafe treatment attempts.
- Session completion.
- Suggested next case outcomes.

### Event Replay Dashboard

Track:

- Outbox lag.
- Publish attempts.
- Replay requests.
- Replay success/failure.
- Sequence gaps.
- Duplicate events ignored.

## Alerting

Alerts:

- Hidden fact leakage detected.
- Unsafe accepted action detected.
- Agent failure spike.
- Guardrail failure spike.
- P95/P99 latency spike.
- Cost/session spike.
- WebSocket disconnect spike.
- Event replay failure.
- Outbox publisher lag.
- Temporal queue backlog.
- PostgreSQL lock wait spike.
- Redis memory/stream lag.
- Faculty review backlog.
- Cross-tenant access denied spike.

Alert rules:

- Safety/security alerts page responsible owners.
- Cost alerts can route to platform/product owners.
- Faculty backlog alerts route to faculty/admin owners.
- Alerts must include trace/session/event ids where safe.

## Retention and Redaction

Retention policies must be tenant-aware and resource-specific.

| Resource | Retention Consideration | Redaction Requirement |
| --- | --- | --- |
| Traces | Useful for debugging but may contain sensitive prompts. | Redact secrets, hidden facts for student-visible views. |
| Transcripts | Needed for debrief and faculty review. | Synthetic-only MVP; role-filtered access. |
| Audit logs | Needed for security/governance. | Preserve actor/resource/result; avoid unnecessary content. |
| Event logs | Needed for replay/debrief/debugging. | Role-filtered payloads. |
| Object storage | Synthetic images/audio. | Access controlled; lifecycle policy. |
| Eval artifacts | Needed for model/prompt release evidence. | Redact raw prompts if needed. |
| Model/tool calls | Needed for traceability/cost. | Store hashes/redacted payloads where appropriate. |

PII policy:

- No real patient data in MVP.
- Student/faculty identity is still personal data and must be protected.
- Do not send raw clinical text to third-party analytics without explicit policy.

Acceptance criteria:

- Redaction policy is testable.
- Retention policy table exists before pilot.
- Student/faculty role access to traces/events is enforced.

## Production Acceptance Criteria

ClinMira is production/pilot ready only when:

- SLOs are defined and measured.
- Latency budget spans exist.
- Cost/session is measured and budgeted.
- Agent, safety, cost, event replay, and faculty dashboards exist.
- Critical alerts are configured.
- Trace/event/session correlation works.
- Retention/redaction policies are implemented for pilot scope.
- Backup/restore has been tested.
- Redis loss does not lose clinical truth.
- Outbox replay recovers missed events.
- Eval/security release gates pass.

## Observability Cardinality Rules

Metrics must not use unbounded or high-cardinality labels. High-cardinality identifiers belong in logs/traces, not metric labels.

Allowed metric labels:

- `environment`
- `service`
- `route_template`
- `agent_name`
- `event_type`
- `status`
- `tenant_tier`
- `model_family`
- `case_specialty`

Disallowed metric labels:

- `session_id`
- `user_id`
- `trace_id`
- `event_id`
- `message_id`
- raw prompt text
- raw patient message text
- arbitrary case title

Detailed identifiers must be trace attributes or structured log fields with redaction policy. OpenTelemetry semantic conventions are the naming baseline; custom ClinMira attributes use the prefix `clinmira.*`.

## Dashboard Acceptance Matrix

| Dashboard | Owner | Metric Source | Alert Thresholds | Pilot Requirement |
| --- | --- | --- | --- | --- |
| System Health | Platform | API, DB, Redis, Temporal, object storage metrics. | API availability < 99.5%, DB lock spike, Redis memory/latency spike. | Required for Milestone 17.5. |
| Agent Health | Agent Runtime | `agent_runs`, `model_runs`, OpenAI traces, tool calls. | Agent success < 98%, tool error spike, guardrail tripwire spike. | Required before live agents. |
| Safety Health | Safety | Eval runs, safety warnings, guardrail results. | Any unsafe accepted treatment or hidden fact leakage. | Required before treatment actions. |
| Cost | Platform + Product | `model_runs`, token/cost estimates, tenant budgets. | 70% and 90% tenant budget, cost/session above budget. | Required before live agents. |
| Faculty Review | Faculty/Clinical | `faculty_reviews`, review events, calibration results. | Review backlog > 48h for pilot queue, high disagreement rate. | Required before pilot cases. |
| Learning Analytics | Product + Faculty/Clinical | Scores, reasoning graph, debriefs, session metrics. | Cohort risk signals reviewed manually in MVP. | Required for market pilot, not backend skeleton. |
| Event Replay | Backend + Observability | `event_log`, `outbox_events`, replay telemetry. | Replay success < 99.5%, outbox lag > 60s. | Required before realtime integration. |
