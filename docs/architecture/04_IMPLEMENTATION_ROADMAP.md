# ClinMira AI Full Implementation Roadmap

## 1. Strategic Foundation

ClinMira AI should be built in a staged sequence that protects the product's most important property: a trustworthy Virtual Clinic Simulation OS where synthetic patient interactions are realistic, but clinical facts, safety decisions, scoring, and faculty review are controlled and auditable.

Recommended sequence:

1. Validate architecture docs.
2. Create backend foundation.
3. Build database schemas.
4. Build simulation session engine.
5. Build agent runtime.
6. Build safety engine.
7. Connect frontend.
8. Add Temporal.
9. Add observability.
10. Add faculty workflows.
11. Add production hardening.

The guiding implementation rule is:

- Build deterministic contracts and state before adding powerful agent behavior.
- Use mock agents before live model calls.
- Add safety before accepting treatment and imaging actions.
- Add tracing before scaling agent complexity.
- Preserve the existing premium frontend design while replacing mock state step by step.

## 2. Milestones

### Milestone 0 - Architecture Documentation

Goal:

- Establish implementation-ready architecture and decision records.

Tasks:

- Create and review architecture docs.
- Confirm stack choices and MVP boundaries.
- Confirm official source basis.

Expected outputs:

- `01_AGENTIC_CORE_ARCHITECTURE.md`
- `02_BACKEND_DATABASE_ARCHITECTURE.md`
- `03_FRONTEND_REQUIRED_UPDATES.md`
- `04_IMPLEMENTATION_ROADMAP.md`
- `05_OFFICIAL_SOURCES_AND_DECISIONS.md`

Acceptance criteria:

- Docs cover agents, backend, DB, safety, realtime, faculty review, frontend integration, observability, and roadmap.
- No implementation code created.

Test plan:

- Documentation validation checklist.

Risks:

- Future implementation ignores docs.

Dependencies:

- None.

### Milestone 1 - Backend Skeleton

Goal:

- Create backend structure after docs are approved.

Tasks:

- Add NestJS API/BFF skeleton or approved alternative.
- Add Python agent-worker skeleton.
- Add shared contract directory.
- Add environment configuration and local compose plan.

Expected outputs:

- API service starts.
- Agent worker starts.
- Health endpoints.
- No real clinical behavior yet.

Acceptance criteria:

- Services run locally.
- Repo structure matches documented modules.

Test plan:

- Health check smoke tests.
- Lint/type checks.

Risks:

- Premature backend complexity.

Dependencies:

- Milestone 0.

### Milestone 2 - Database Schema

Goal:

- Establish PostgreSQL source of truth.

Tasks:

- Implement core migrations for institutions, users, cases, case versions, sessions, actions, messages, orders, imaging, timeline, warnings, rubrics, scores, debriefs, reviews, and audit logs.
- Add constraints, indexes, and idempotency uniqueness.
- Add synthetic seed data.

Expected outputs:

- Database schema.
- Seeded synthetic case fixtures.
- Migration scripts.

Acceptance criteria:

- Core tables exist with tenant scope and relational integrity.
- Hidden facts are separated from student-visible case data.

Test plan:

- Migration test.
- Constraint test.
- Seed data smoke test.

Risks:

- JSONB used where relational columns are required.

Dependencies:

- Milestone 1.

### Milestone 3 - Case Library Backend

Goal:

- Replace frontend case mock data with backend-approved cases.

Tasks:

- Implement `GET /cases`.
- Implement `GET /cases/:id`.
- Add student/faculty visibility rules.
- Hide hidden diagnosis/facts from students.

Expected outputs:

- Case list/detail APIs.
- DTOs for frontend.

Acceptance criteria:

- Students only receive approved visible fields.
- Faculty can see authorized review metadata.

Test plan:

- API tests for visibility.
- Hidden fact leakage tests.

Risks:

- Case payload exposes hidden diagnosis.

Dependencies:

- Milestone 2.

### Milestone 4 - Simulation Session Backend

Goal:

- Create/load sessions and persist student actions with mock simulation behavior.

Tasks:

- Implement `POST /simulation-sessions`.
- Implement `GET /simulation-sessions/:id`.
- Implement `POST /simulation-sessions/:id/actions`.
- Add idempotency keys.
- Persist messages, actions, snapshots, and timeline events.

Expected outputs:

- Text-only session API with mock patient response.

Acceptance criteria:

- Session locks to a case version.
- Actions are idempotent.
- Refresh restores session state.

Test plan:

- Session lifecycle API tests.
- Idempotency tests.

Risks:

- Session state becomes frontend-owned.

Dependencies:

- Milestone 3.

### Milestone 5 - Realtime Event Layer

Goal:

- Add realtime session updates.

Tasks:

- Implement WebSocket or SSE session stream.
- Define event schema and sequence.
- Add Redis fanout/presence.
- Add reconnect replay.

Expected outputs:

- `message.completed`, `timeline.updated`, `agent.status.updated`, and `safety.warning.created` events.

Acceptance criteria:

- Client can reconnect and recover missed events.
- Duplicate events are ignored.

Test plan:

- Realtime integration tests.
- Reducer ordering tests.

Risks:

- Event ordering bugs create inconsistent UI.

Dependencies:

- Milestone 4.

### Milestone 6 - Agent Orchestrator MVP

Goal:

- Add controlled Python orchestrator using mock or live OpenAI Agents SDK paths.

Tasks:

- Implement `SimulationTurnCommand` and `SimulationTurnResult`.
- Add route classification.
- Add tool permission matrix.
- Add mock specialists as tools.
- Add OpenAI Agents SDK integration behind feature flag.

Expected outputs:

- Orchestrator can process questions, exams, orders, diagnosis, and treatment commands through structured tool calls.

Acceptance criteria:

- Orchestrator controls all state mutations.
- Specialist agents cannot mutate state directly.

Test plan:

- Orchestrator unit tests.
- Tool permission tests.

Risks:

- LLM starts deciding clinical truth.

Dependencies:

- Milestone 4.

### Milestone 7 - Persona + Safety Agents

Goal:

- Add grounded patient responses and first safety blocks.

Tasks:

- Implement Patient Persona Agent with allowed facts.
- Implement Safety Agent rule engine.
- Add fact-grounded output schema.
- Add allergy, medication, red flag, early diagnosis, and imaging justification rules.

Expected outputs:

- Patient responses generated from allowed facts.
- Unsafe treatment blocked.

Acceptance criteria:

- Persona Agent cannot reveal hidden facts.
- Safety block prevents accepted treatment state.

Test plan:

- Hidden fact leakage tests.
- Safety rule tests.
- Golden patient response tests.

Risks:

- Overly strict safety makes simulation feel rigid.

Dependencies:

- Milestone 6.

### Milestone 8 - Clinical Actions and Orders

Goal:

- Support real clinical workspace actions.

Tasks:

- Implement exam actions.
- Implement order actions.
- Persist order status.
- Feed evaluator/timeline.
- Add warning states.

Expected outputs:

- Backend-backed history, exam, order, diagnosis, and treatment state.

Acceptance criteria:

- Clinical actions update session state through backend.
- Order actions can warn/block as configured.

Test plan:

- Clinical action API tests.
- Timeline event tests.

Risks:

- Action taxonomy becomes too narrow for future cases.

Dependencies:

- Milestone 7.

### Milestone 9 - Imaging Mock Service

Goal:

- Release approved synthetic imaging results from stored assets.

Tasks:

- Add object storage integration.
- Add curated image metadata.
- Link orders to imaging results.
- Enforce faculty approval flag.

Expected outputs:

- `imaging.result.ready` event and frontend rendering.

Acceptance criteria:

- Unapproved imaging cannot be released.
- Findings come from metadata, not generated guesses.

Test plan:

- Imaging order tests.
- Approval gating tests.

Risks:

- Imaging metadata lacks educational clarity.

Dependencies:

- Milestone 8.

### Milestone 10 - Evaluator + Debrief

Goal:

- Add rubric-grounded scoring and final debrief.

Tasks:

- Implement rubric scoring.
- Map actions/timeline to rubric evidence.
- Generate debrief report.
- Suggest next cases.

Expected outputs:

- Score updates.
- Debrief report.
- Reasoning map and mistake replay.

Acceptance criteria:

- Every score/debrief item links to rubric and evidence.
- Debrief cannot invent events.

Test plan:

- Rubric scoring tests.
- Debrief grounding tests.

Risks:

- Feedback becomes generic or untrustworthy.

Dependencies:

- Milestone 8.

### Milestone 11 - Faculty Review

Goal:

- Add human-in-the-loop review workflows.

Tasks:

- Implement review queue.
- Add approve/reject actions.
- Add review triggers for scenarios, images, unsafe outputs, and debriefs.
- Add audit logs.

Expected outputs:

- Faculty review dashboard data.
- Review queue lifecycle.

Acceptance criteria:

- Faculty decisions are audited.
- Scenario/image/debrief release respects review status.

Test plan:

- Review workflow tests.
- RBAC tests.

Risks:

- Review queue noise reduces faculty trust.

Dependencies:

- Milestone 9.
- Milestone 10.

### Milestone 12 - Scenario Studio Backend

Goal:

- Persist and publish faculty-authored scenarios.

Tasks:

- Implement scenario draft CRUD.
- Implement validation workflow.
- Implement publish workflow.
- Create immutable case versions after approval.

Expected outputs:

- Backend-driven Scenario Studio.
- Published scenarios in Case Library.

Acceptance criteria:

- Drafts are versioned.
- Publish requires validation and review according to tenant policy.

Test plan:

- Scenario CRUD tests.
- Publish workflow tests.

Risks:

- Faculty-created scenarios bypass safety metadata requirements.

Dependencies:

- Milestone 11.

### Milestone 13 - Agent Control Observability

Goal:

- Make agent behavior inspectable.

Tasks:

- Persist agent runs, tool calls, model runs, guardrails, and trace ids.
- Implement Agent Control APIs.
- Add latency, token, cost, status, and safety metrics.

Expected outputs:

- Agent Control dashboard from backend data.

Acceptance criteria:

- Faculty/admin can inspect why a turn behaved as it did.
- Sensitive fields are redacted as policy requires.

Test plan:

- Trace correlation tests.
- Redaction tests.

Risks:

- Too much sensitive data stored in logs/traces.

Dependencies:

- Milestone 6.

### Milestone 14 - Frontend Integration

Goal:

- Replace mock state route by route.

Tasks:

- Add API client.
- Add typed contracts.
- Replace Case Library mock data.
- Connect Virtual Clinic sessions and realtime.
- Connect debrief, faculty dashboard, scenario studio, and agent control.

Expected outputs:

- Frontend uses backend data for core flows.

Acceptance criteria:

- Existing premium UI remains intact.
- Backend unavailable and safety states render clearly.

Test plan:

- Playwright E2E.
- Screenshot/responsive audits.
- i18n/theme tests.

Risks:

- UI/backend contract drift.

Dependencies:

- Milestones 3 through 13.

### Milestone 15 - Temporal Hardening

Goal:

- Move critical multi-step flows into durable workflows.

Tasks:

- Harden ClinicalActionWorkflow.
- Harden GenerateDebriefWorkflow.
- Harden ScenarioPublishWorkflow.
- Add retry policies, timeouts, idempotency, and failure recovery.

Expected outputs:

- Durable workflows for simulation and review operations.

Acceptance criteria:

- Worker restart does not lose in-flight action or debrief.
- Nondeterministic work remains in Activities.

Test plan:

- Temporal integration tests.
- Failure/retry tests.

Risks:

- Workflow determinism errors.

Dependencies:

- Milestone 6.
- Milestone 10.
- Milestone 12.

### Milestone 16 - Voice-Ready Architecture

Goal:

- Prepare for low-latency patient interview without production voice dependency.

Tasks:

- Define voice events.
- Add transcript storage.
- Add feature-flagged voice UI states.
- Design server-managed OpenAI Realtime Agent path.

Expected outputs:

- Voice-ready contracts and optional prototype path.

Acceptance criteria:

- Voice transcript reconciles into same session/action model.
- Safety still gates risky actions.

Test plan:

- Transcript-to-action tests.
- Voice safety simulation tests.

Risks:

- Voice bypasses hidden fact and safety controls.

Dependencies:

- Milestone 5.
- Milestone 7.

### Milestone 17 - Production Readiness

Goal:

- Prepare for controlled university pilot with synthetic data.

Tasks:

- Add load testing.
- Add backup/restore plan.
- Add retention/redaction policy.
- Add tenant isolation tests.
- Add monitoring and alerts.
- Add incident runbooks.
- Add cost budgets.

Expected outputs:

- Pilot-ready deployment plan.
- Observability dashboards.
- Operational runbooks.

Acceptance criteria:

- P95 latency, error rate, safety block rate, queue backlog, token usage, and review volume are monitored.
- Security and tenant isolation tests pass.

Test plan:

- Load tests.
- Security tests.
- Failover tests.
- Faculty acceptance tests.

Risks:

- Overengineering before real pilot usage.

Dependencies:

- Milestones 0 through 16.

## 3. MVP Scope

MVP includes:

- Synthetic educational cases only.
- Text patient encounter.
- Controlled agent facts from case/session state.
- Patient Persona Agent.
- Safety Agent with deterministic rules.
- Basic Physiology state transitions.
- Clinical actions for history, exam, orders, diagnosis, treatment, and completion.
- Order tests.
- Curated/synthetic imaging mock results.
- Timeline.
- Rubric-grounded evaluator.
- Debriefing.
- Basic faculty dashboard.
- Basic scenario studio.
- Basic agent control.
- WebSocket or SSE realtime events.
- PostgreSQL source of truth.
- Redis cache/presence/realtime coordination.
- Temporal for at least debrief/scenario publish or clinical action hardening by later MVP phase.
- OpenTelemetry and OpenAI Agents SDK tracing metadata.

MVP success criteria:

- A student can start a synthetic case, interview the patient, perform exam/order actions, receive safety warnings, submit diagnosis/treatment, complete the session, and receive a grounded debrief.
- A faculty user can review scenarios, imaging approvals, unsafe outputs, debriefs, and basic cohort metrics.
- Engineering can replay a session turn through action, agent run, safety result, state patch, and realtime event.

## 4. Not in MVP

Not in MVP:

- Real patient data.
- Real medical advice.
- Real clinical care workflows.
- Unrestricted image generation.
- Real DICOM integration.
- Production voice realtime.
- Billing.
- Complex institution SSO.
- Full FHIR compliance.
- External EHR integration.
- Fully autonomous agent swarm.
- Agents inventing clinical facts.
- Student access to hidden diagnosis before allowed.
- Complex marketplace or content licensing.

Explicitly deferred:

- Full DICOMweb integration.
- Formal FHIR conformance.
- Advanced voice interruption and multimodal exam workflows.
- Full analytics warehouse.
- Advanced adaptive curriculum recommendations.

## 5. Production Scope

Production scope includes:

- Multi-tenant universities.
- RBAC and tenant isolation.
- Temporal durability for critical workflows.
- Full observability and tracing.
- Faculty review workflows.
- Scalable API and worker containers.
- Managed PostgreSQL and Redis.
- Object storage with lifecycle policies.
- Advanced analytics.
- Real-time voice.
- Compliance hardening.
- Redaction and retention controls.
- Backup/restore and disaster recovery.
- Cost controls by tenant, model, case, and workflow.
- Robust scenario authoring lifecycle.
- Accessibility and internationalization support.

Production readiness criteria:

- Security review completed.
- Tenant isolation tested.
- No PHI path enabled unless compliance program explicitly approved.
- Synthetic asset policy documented.
- Faculty audit and override workflows tested.
- Monitoring and incident response in place.

## 6. Risk Register

| Risk | Impact | Mitigation | Owner |
| --- | --- | --- | --- |
| Hallucination | Patient or debrief invents clinical facts. | Fact-grounded state, structured outputs, output guardrails, source ids. | Agent runtime |
| Safety issues | Unsafe treatment advice shown. | Safety Agent, deterministic rules, tripwires, faculty review. | Safety/backend |
| Latency | Virtual Clinic feels slow. | Route by intent, cache case context, stream messages, avoid all-agent turns. | Backend/agent |
| Cost | Multi-agent sessions become expensive. | Model tiering, token tracking, fewer agent calls, budgets. | Platform |
| Data privacy | Trust or compliance failure. | Synthetic-only MVP, tenant scope, redaction, encryption, audit logs. | Platform/security |
| Faculty trust | Faculty rejects scores/content. | Rubric grounding, review queues, traceability, source basis. | Product/faculty |
| Inconsistent clinical state | Patient facts drift. | PostgreSQL truth, snapshots, revealed facts, deterministic transitions. | Backend |
| UI/backend contract drift | Integration slows. | Shared/generated contracts, E2E tests, DTO review. | Frontend/backend |
| Agent trace complexity | Hard to debug. | OpenTelemetry plus agent events and trace ids from day one. | Platform |
| Overengineering | MVP delayed. | Modular monolith first, service-ready boundaries, feature flags. | Engineering |
| Redis misuse | Lost clinical truth. | Redis cache only; PostgreSQL persists truth. | Backend |
| Temporal misuse | Workflow nondeterminism. | Put LLM/API/DB/file work in Activities. | Backend |
| Unapproved imaging | Educational risk. | Curated assets, approval flags, release rules. | Imaging/faculty |
| Hidden fact leakage | Case integrity broken. | Visibility filters, output guardrails, tests. | Backend/agent |

## 7. Definition of Done

### Architecture Docs DoD

- All five requested files exist.
- Official sources and ADRs are documented.
- MVP and production scope are separated.
- No implementation code is created.
- Every major component has implementation path, risks, and acceptance criteria.

### Backend Modules DoD

- Module has documented responsibility.
- APIs are authenticated, authorized, validated, and tenant-scoped.
- Mutations are idempotent where needed.
- Errors map to frontend states.
- Audit events are emitted for sensitive operations.

### DB Schema DoD

- Tables have primary keys, tenant scope where relevant, timestamps, and constraints.
- Versioned content is immutable after publish.
- Hidden facts are separated from revealed facts.
- Indexes support expected query patterns.
- Migrations and seed data are tested.

### Agent Runtime DoD

- Orchestrator owns turn flow.
- Specialist agents run as tools.
- Structured output validation exists.
- Tool permissions are enforced.
- Guardrails and source grounding are tested.
- Agent runs, tool calls, and traces are logged.

### Frontend Integration DoD

- API client and realtime client are typed.
- Components render loading, error, reconnect, safety, and review states.
- Realtime reducer is deterministic.
- Hidden facts are not rendered unless backend reveals them.
- Playwright flow passes for core session lifecycle.

### Safety Guardrails DoD

- Safety rules have ids, severity, rationale, and tests.
- Blocks prevent state mutation.
- Warnings persist and emit realtime events.
- Faculty review triggers work.
- Unsafe output regression fixtures pass.

### Testing DoD

- Unit tests for contracts, reducers, rules, and orchestration.
- Integration tests for APIs, workflows, DB, and realtime.
- E2E tests for student and faculty flows.
- Screenshot/responsive audits for major frontend states.
- Hidden fact leakage tests.
- Safety scenario regression tests.

### Observability DoD

- API, Temporal, agent worker, DB, Redis, and realtime spans correlate by trace/session/turn.
- Agent events and model/tool usage are visible.
- Safety block rate, latency, token usage, cost, and review queue depth are monitored.
- Sensitive trace fields are redacted according to policy.

## 8. Strict Milestone Addendum

These milestones are mandatory quality gates layered into the original roadmap. They exist to prevent ClinMira from drifting into a simple chatbot, weak backend, unreliable realtime prototype, or unsafe agent system.

### Milestone 2.5 - Shared Contracts and Schema Governance

Goal:

- Establish contract-first architecture before frontend/backend integration.

Tasks:

- Define OpenAPI for API/BFF routes.
- Define event schemas for realtime/event log.
- Define Pydantic schemas for Python agent-worker payloads.
- Generate TypeScript DTOs.
- Add schema compatibility tests.
- Create `contract_versions` registry plan.

Expected outputs:

- Versioned API, event, Temporal payload, and agent output contracts.

Measurable exit criteria:

- API contract tests pass.
- Event contract tests pass.
- Generated TypeScript types match backend DTOs.
- No route returns hidden facts to student role.

Dependencies:

- Milestone 2.

### Milestone 5.5 - Transactional Outbox and Event Replay

Goal:

- Make realtime updates durable and replayable.

Tasks:

- Implement `outbox_events`.
- Implement `event_log`.
- Add session sequence numbers.
- Add outbox publisher.
- Add reconnect replay endpoint/path.
- Add duplicate handling.

Expected outputs:

- No important session event depends solely on direct WebSocket emit.

Measurable exit criteria:

- Event replay success reaches at least `99.5%` in core replay tests.
- Duplicate event handling tests pass.
- API crash-after-commit recovery test passes.
- Frontend can rebuild session from snapshot plus event log.

Dependencies:

- Milestone 5.

### Milestone 6.5 - Agent Evaluation Harness

Goal:

- Block unsafe or ungrounded agent behavior before live expansion.

Tasks:

- Build golden case suite.
- Add hidden fact leakage tests.
- Add safety tests.
- Add persona consistency tests.
- Add imaging hallucination tests.
- Add debrief grounding tests.
- Track latency and cost regressions.

Expected outputs:

- Eval suites and results for every live agent/prompt/model version.

Measurable exit criteria:

- Hidden fact leakage equals `0`.
- Unsafe accepted treatment equals `0`.
- Unsupported debrief claim equals `0`.
- Imaging hallucination equals `0`.
- Eval run artifacts are stored.

Dependencies:

- Milestone 6.

### Milestone 7.5 - LLM Security Red Team

Goal:

- Test ClinMira against LLM-specific abuse before pilot.

Tasks:

- Prompt injection tests.
- Hidden diagnosis extraction tests.
- Safety bypass tests.
- Scoring manipulation tests.
- Tool abuse tests.
- Excessive agency and denial-of-wallet tests.

Expected outputs:

- OWASP LLM Top 10 mapped test suite and remediation log.

Measurable exit criteria:

- Prompt injection bypass equals `0` for release-blocking cases.
- Hidden diagnosis extraction success equals `0`.
- Unauthorized tool invocation success equals `0`.
- Any successful bypass is added to regression suite before closure.

Dependencies:

- Milestone 7.

### Milestone 10.5 - Faculty Calibration Pilot

Goal:

- Confirm evaluator/rubric behavior aligns with faculty judgment.

Tasks:

- Run sample sessions through faculty reviewers.
- Measure rubric agreement.
- Track faculty overrides.
- Capture reviewer disagreement.
- Improve case/rubric/scoring rules.

Expected outputs:

- Faculty calibration report and revised rubrics.

Measurable exit criteria:

- Faculty agreement threshold met.
- Faculty approval enforcement verified.
- Reviewer disagreement handling documented.

Dependencies:

- Milestone 10.

### Milestone 14.5 - Product Analytics and UX Telemetry

Goal:

- Measure whether the product is reliable, understandable, and educationally effective.

Tasks:

- Add frontend metrics.
- Add session metrics.
- Add agent metrics.
- Add learning outcome metrics.
- Add safety comprehension metrics.

Expected outputs:

- Product analytics dashboard and telemetry governance.

Measurable exit criteria:

- Time to first patient response tracked.
- Reconnect rate tracked.
- Safety block follow-up behavior tracked.
- Abandoned session rate tracked.
- Telemetry redaction policy tested.

Dependencies:

- Milestone 14.

### Milestone 17.5 - Enterprise University Pilot Readiness

Goal:

- Prepare for serious university pilot readiness, not just technical demo readiness.

Tasks:

- LTI/LTI Advantage readiness plan.
- WCAG 2.2 AA audit pass where reasonable.
- Audit export plan.
- Tenant isolation validation.
- Faculty onboarding checklist.
- Student onboarding checklist.
- Support workflow.

Expected outputs:

- Pilot readiness checklist and go/no-go review.

Measurable exit criteria:

- Cross-tenant access tests pass.
- WCAG keyboard/focus/contrast/screen-reader smoke tests pass.
- Audit export works for pilot scope.
- Faculty onboarding materials approved.

Dependencies:

- Milestone 17.

## 9. Temporal Timing Correction

Temporal hardening can happen later, but Temporal boundaries cannot be postponed. Workflow-safe design, Activity boundaries, retry strategy, idempotency, and payload versioning must be planned from the first backend skeleton.

Rules:

- Milestone 1 defines candidate workflows and task queues.
- Milestone 2.5 defines workflow payload schemas and versioning.
- Milestone 4 action processing is designed as workflow-compatible even if first implementation is synchronous.
- Milestone 5.5 event/outbox design is workflow-compatible.
- Milestone 6 agent calls are designed as Activities, not replay-sensitive Workflow code.
- Milestone 15 hardens Temporal behavior, but does not invent boundaries from scratch.

Acceptance criteria:

- No implementation phase introduces nondeterministic work into Temporal Workflow code.
- Every external call has an Activity boundary plan.
- Every retryable Activity has idempotency strategy.

## 10. Global Measurable Exit Gates

These quality gates apply across milestones.

| Gate | Required Target Before Pilot |
| --- | --- |
| Hidden fact leakage | `0` release-blocking leaks. |
| Unsafe accepted treatment | `0` accepted unsafe treatments. |
| Unsupported debrief claim | `0` critical unsupported claims. |
| Imaging hallucination | `0` unapproved findings. |
| Prompt injection bypass | `0` release-blocking bypasses. |
| Event replay | Core replay success >= `99.5%`; missed-event replay works for session events. |
| Reconnect | Reconnect recovery P95 <= `3000ms` and measured. |
| P95 patient response start | P95 <= `2500ms` after accepted action and monitored. |
| Cost/session | Budget defined by MVP and pilot tier. |
| Failed tool-call recovery | Retry/fallback behavior tested for critical tools. |
| Faculty approval enforcement | Scenario/image/debrief review gates cannot be bypassed. |
| Contract compatibility | API/event/agent contracts pass CI. |
| Build/test pass | Frontend/backend/agent tests pass for touched surfaces. |
| Tenant isolation | Cross-tenant API/event/object access tests pass. |
| Accessibility | WCAG 2.2 AA-oriented smoke checks pass where reasonable. |

Any failure in the first five gates blocks release unless explicitly waived by architecture, safety, and faculty owners with documented rationale.

## 11. Final Owner and RACI Matrix

Every milestone must have a named owner role before implementation tickets are opened. A person can hold multiple roles in a small team, but the role responsibility cannot be omitted.

Role definitions:

| Role | Accountability |
| --- | --- |
| Architecture Owner | Maintains architecture invariants, ADRs, implementation gate order, and cross-doc consistency. |
| Backend Owner | Owns NestJS/API, database services, SQL migrations, transactions, tenant isolation, and outbox/event log. |
| Agent Runtime Owner | Owns Python agent workers, model routing, prompts, tool schemas, guardrails integration, and agent traces. |
| Safety Owner | Owns safety rules, hidden fact leakage prevention, prompt-injection defense, unsafe action gates, and safety evals. |
| Frontend Owner | Owns Next.js integration, Virtual Clinic state machine, event reducer, component state catalog, accessibility, and telemetry. |
| Faculty/Clinical Owner | Owns case quality, rubrics, clinical facts, faculty calibration, scenario approvals, and educational validity. |
| Platform/Observability Owner | Owns deployment, Temporal, Redis, SLOs, logs/traces/metrics, backup/restore, cost telemetry, and alerts. |
| Security Owner | Owns RBAC, tenant isolation verification, threat model, incident response, dependency/tool security, and waivers. |
| Product/Market Owner | Owns MVP scope, buyer validation, pilot entry, onboarding/support, pricing assumptions, and non-MVP claims. |

Milestone RACI:

| Milestone | Primary Owner | Accountable | Consulted | Release Evidence |
| --- | --- | --- | --- | --- |
| 0. Audit/current frontend | Architecture Owner | Product/Market | Frontend, Backend | Scope map and mock inventory. |
| 1. Architecture baseline | Architecture Owner | Product/Market | Backend, Agent Runtime, Faculty | Accepted ADR baseline. |
| 2. Data model planning | Backend Owner | Architecture | Faculty, Security | SQL schema plan and tenant rules. |
| 2.5 Shared contracts | Architecture + Backend | Architecture | Frontend, Agent Runtime, Security | OpenAPI/event/Pydantic/TS contract tests. |
| 3. API/BFF skeleton | Backend Owner | Architecture | Frontend, Security | Auth/RBAC/API smoke tests. |
| 4. DB core and fact ledger | Backend Owner | Architecture | Faculty, Safety | SQL migrations, fact ledger, transaction tests. |
| 5. Mock simulation engine | Backend + Frontend | Product/Market | Faculty, Safety | Deterministic mock session works. |
| 5.5 Outbox/event replay | Backend Owner | Platform/Observability | Frontend, Security | Crash-after-commit and replay tests. |
| 6. Agent worker scaffold | Agent Runtime Owner | Architecture | Safety, Backend | Mock/disabled live agents behind flag. |
| 6.5 Eval harness | Safety + Agent Runtime | Architecture | Faculty, Platform | Release gate eval artifacts. |
| 7. Safety engine | Safety Owner | Architecture | Faculty, Backend, Security | Unsafe action and hidden fact tests. |
| 7.5 LLM red team | Security + Safety | Architecture | Agent Runtime | OWASP-mapped test/remediation evidence. |
| 8. Virtual Clinic integration | Frontend Owner | Product/Market | Backend, Safety | Reducer/replay/safety Playwright tests. |
| 9. Imaging and orders | Backend + Frontend | Faculty/Clinical | Safety | Approved asset release tests. |
| 10. Faculty review workflow | Faculty/Clinical + Backend | Product/Market | Security | Review audit and approval tests. |
| 10.5 Faculty calibration | Faculty/Clinical | Product/Market | Safety, Agent Runtime | Calibration report thresholds met. |
| 11. Debrief/reasoning graph | Agent Runtime + Faculty | Product/Market | Backend, Frontend | Evidence-grounded debrief tests. |
| 12. Scenario Studio | Faculty/Clinical + Backend | Product/Market | Frontend, Security | Publish workflow cannot bypass review. |
| 14. Analytics dashboards | Platform/Observability | Product/Market | Frontend, Faculty | Dashboard/telemetry evidence. |
| 14.5 Product telemetry | Product + Frontend | Product/Market | Platform, Security | Redaction-safe UX metrics. |
| 15. Temporal hardening | Platform/Observability | Architecture | Backend, Agent Runtime | Workflow/activity retry/idempotency tests. |
| 16. Voice-ready path | Agent Runtime + Frontend | Architecture | Safety, Product | Voice disabled until official model/pricing gate. |
| 17. Security/accessibility hardening | Security + Frontend | Product/Market | Platform, Faculty | Tenant/accessibility/security pass evidence. |
| 17.5 Pilot readiness | Product/Market | Architecture | All owners | Go/no-go packet. |

## 12. Corrected Implementation Order

The implementation order is mandatory. Live OpenAI agents are not the first milestone and must not become the core prototype before deterministic truth, contracts, evals, and safety exist.

Required order:

1. Contracts and schema governance: OpenAPI, event schemas, Pydantic schemas, generated TypeScript types, SQL migration authority, contract CI.
2. Database core: tenant tables, immutable case versions, fact ledger, session state, action commands, audit logs.
3. Deterministic fact/reveal system: hidden/revealed facts, state versions, rule/source ids, faculty-approved case data.
4. Transactional outbox and durable event log: sequence numbers, publisher, replay endpoint, reducer tests.
5. Mock simulation runtime: deterministic patient/fact responses and frontend state integration without live agents.
6. Eval harness: golden cases, hidden fact leakage tests, safety tests, debrief grounding, contract snapshots, cost/latency capture.
7. Safety engine: deterministic pre/post checks, guardrails, prompt-injection tests, tool permission enforcement.
8. Live text agents behind feature flag: only after contracts, DB, outbox/replay, mock runtime, eval harness, and safety gates pass.
9. Faculty calibration and scenario publish gates.
10. Enterprise/pilot hardening: dashboards, backup/restore, accessibility, tenant isolation, support workflow.
11. Future realtime voice: only after text safety/reliability gates and official model/pricing refresh.

Stop/no-go conditions:

| Condition | Stop Action | Resume Requirement |
| --- | --- | --- |
| Hidden fact leakage in student-visible path | Freeze live agents/case publish. | Patch context/firewall/output guardrail and add regression test. |
| Unsafe accepted treatment | Freeze treatment actions and live agent expansion. | Safety rule/faculty review fix plus eval pass. |
| Outbox/event replay not implemented | Do not ship realtime-critical backend integration. | Milestone 5.5 pass evidence. |
| Contract drift | Block merge/deploy. | Contract CI green and generated types updated. |
| Migration authority violation | Halt schema work. | SQL-first migration and registry corrected. |
| Cross-tenant access | Freeze affected routes/events/assets. | Security fix, audit review, cross-tenant tests pass. |
| Faculty approval bypass | Freeze scenario/image/debrief publish. | Review workflow patch and audit tests pass. |
| Cost runaway | Disable live agent/debrief flags for affected tenant. | Cost cap/routing fix and budget owner approval. |
| SLO dashboard missing | Block Milestone 17.5 pilot readiness. | Required dashboards and alerts operational. |
| Accessibility critical blocker | Block serious pilot route. | Fix keyboard/focus/contrast/screen-reader blocker. |

## 13. Milestone Exit Gate Format

Each milestone ticket must contain this exit-gate block:

| Field | Required Content |
| --- | --- |
| Owner | Named role/person accountable. |
| Scope | What is included and explicitly excluded. |
| Contracts | API/event/Pydantic/TypeScript/schema versions affected. |
| Data | Tables, migrations, retention, and tenant impact. |
| Safety | Hidden facts, unsafe actions, prompt/tool risks. |
| Realtime | Event/outbox/replay impact. |
| Eval | Test suites and thresholds. |
| Observability | Metrics/traces/logs/dashboard evidence. |
| Faculty | Review/calibration implications. |
| Stop condition | Specific failure that blocks continuation. |
