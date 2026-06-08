# Final Architecture Acceptance Gate

## Purpose

This document is the final go/no-go gate for ClinMira AI architecture. It consolidates the non-negotiable invariants, implementation checklist, traceability matrix, remaining decisions, and final verdict for the entire architecture folder.

This gate is intentionally strict. ClinMira AI must not drift into a simple chatbot, weak CRUD backend, unsafe autonomous agent system, unreliable realtime app, or shallow university demo.

Decision date: `2026-06-04`

## Non-Negotiable Product Invariants

| Invariant | Meaning | Blocking Rule |
| --- | --- | --- |
| ClinMira is not a chatbot | It is a Virtual Clinic Simulation OS with governed agents, deterministic state, faculty review, evals, and replayable events. | Any implementation that treats the LLM as the clinical source of truth is blocked. |
| No Free Clinical Truth | No clinical fact may originate solely from generated text. | Unsupported critical clinical claims fail release. |
| PostgreSQL is source of truth | Redis is coordination/cache; LLM output is not truth; frontend state is projection. | Clinical state cannot depend on Redis Pub/Sub, frontend local state, or model memory. |
| SQL-first migrations own schema | Production schema changes are SQL-reviewed and versioned. | Prisma Migrate or Python-generated migrations cannot be production authority. |
| Contracts before integration | API/event/Pydantic/TypeScript/Temporal/tool schemas are versioned before implementation depends on them. | Contract drift blocks merge/deploy. |
| Outbox before realtime trust | Critical mutations write `event_log` and `outbox_events` atomically. | Direct WebSocket emit cannot be the only event path. |
| Context firewall before agents | Agents see only authorized state slices. | Persona and student-visible outputs cannot receive hidden facts unless reveal policy allows. |
| Eval harness before live agents | Golden, adversarial, grounding, latency, and cost evals exist before live model rollout. | Live agents remain feature-flagged off until eval gates pass. |
| Safety blocks mutate nothing unsafe | Blocked actions do not become accepted treatment/order/score state. | Unsafe accepted treatment must be `0`. |
| Faculty review is backend-enforced | Scenario publish, high-risk content, and approval gates are persisted/audited backend state. | UI-only review gates are invalid. |
| Reconnect uses replay | Frontend recovers from durable event log or snapshot, not hope. | Realtime integration blocks without replay tests. |
| Synthetic-only MVP | MVP uses synthetic educational content and avoids real medical advice. | Real patient data and real clinical-care claims are blocked. |

## Final Architecture Checklist

| Area | Required Gate | Status | Evidence File | Owner | Blocking |
| --- | --- | --- | --- | --- | --- |
| Agentic architecture | Hybrid code-orchestrated supervisor with agents-as-tools; no autonomous swarm. | Accepted | `01_AGENTIC_CORE_ARCHITECTURE.md` | Architecture Owner | Yes |
| Agent contracts | Every enabled agent has input/output/context/tool/guardrail/eval/fallback contract. | Accepted as requirement | `01_AGENTIC_CORE_ARCHITECTURE.md` | Agent Runtime Owner | Yes for live agents |
| Model routing | Runtime decision matrix with cost/latency/fallback evidence. | Accepted | `01_AGENTIC_CORE_ARCHITECTURE.md`, `10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md` | Agent Runtime + Platform | Yes for live agents |
| No Free Clinical Truth | Every clinical claim grounded in fact/rule/event/rubric/faculty source. | Accepted | `01_AGENTIC_CORE_ARCHITECTURE.md`, `02_BACKEND_DATABASE_ARCHITECTURE.md`, `06_AGENT_EVALUATION_AND_SAFETY_TESTING.md` | Safety + Faculty | Yes |
| Migration authority | SQL-first migrations are single source of schema truth. | Accepted | `02_BACKEND_DATABASE_ARCHITECTURE.md`, `05_OFFICIAL_SOURCES_AND_DECISIONS.md` ADR-028 | Backend Owner | Yes |
| Transactional mutations | Critical mutations use DB transaction with domain state, event log, and outbox. | Accepted | `02_BACKEND_DATABASE_ARCHITECTURE.md`, `07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md` | Backend Owner | Yes |
| Index/retention/restore | Required index catalog, retention table, and restore drill criteria exist. | Accepted | `02_BACKEND_DATABASE_ARCHITECTURE.md`, `10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md` | Backend + Platform | Yes before pilot |
| Frontend state machine | Virtual Clinic states and impossible-transition behavior defined. | Accepted | `03_FRONTEND_REQUIRED_UPDATES.md` | Frontend Owner | Yes for integration |
| Component catalog | Critical UI components/states documented and release-gated. | Accepted | `03_FRONTEND_REQUIRED_UPDATES.md` | Frontend Owner | Yes before pilot |
| Playwright scenarios | Safety, replay, hidden facts, faculty, debrief, redaction, responsive scenarios listed. | Accepted | `03_FRONTEND_REQUIRED_UPDATES.md` | Frontend Owner | Yes before pilot |
| Roadmap order | Contracts/schema -> DB -> fact ledger -> outbox -> mock simulation -> eval -> safety -> live agents. | Accepted | `04_IMPLEMENTATION_ROADMAP.md` | Architecture Owner | Yes |
| Owner/RACI | Every milestone has accountable role. | Accepted | `04_IMPLEMENTATION_ROADMAP.md` | Architecture Owner | Yes for ticketing |
| Official sources | Source refresh register with volatility and refresh rules exists. | Accepted | `05_OFFICIAL_SOURCES_AND_DECISIONS.md` | Architecture Owner | Yes for source-dependent milestones |
| ADRs | ADR-001 through ADR-038 recorded. | Accepted | `05_OFFICIAL_SOURCES_AND_DECISIONS.md` | Architecture Owner | Yes |
| Eval gates | Release gate thresholds, eval versioning, faculty calibration thresholds exist. | Accepted | `06_AGENT_EVALUATION_AND_SAFETY_TESTING.md` | Safety + Faculty | Yes |
| Event replay | Ordering invariants, replay API, contract CI, dead-letter policy exist. | Accepted | `07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md` | Backend + Platform | Yes |
| Security | Incident playbooks, security harness, and waiver policy exist. | Accepted | `08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md` | Security Owner | Yes |
| University pilot | Entry criteria, buyer validation, differentiation matrix exist. | Accepted | `09_ENTERPRISE_EDUCATION_MARKET_READINESS.md` | Product/Market | Yes for pilot |
| SLO/cost | Initial pilot SLOs, budgets, cardinality, dashboard acceptance exist. | Accepted | `10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md` | Platform + Product | Yes before pilot |
| Final review | Strict verdict and blocker register exist. | Accepted | `11_ARCHITECTURE_REVIEW_SUMMARY.md` | Architecture Owner | Yes |

## Implementation Go/No-Go Gates

| Gate | Go Condition | No-Go Condition |
| --- | --- | --- |
| Start backend implementation | Contracts/schema tickets reference docs 02, 04, 05, 07, and 12. | Team starts with live agents or ad hoc route shapes. |
| Start database migrations | SQL-first migration metadata, transaction/index/retention plan exists. | Prisma Migrate or ORM sync is used as production authority. |
| Start frontend backend integration | API/event contracts, generated types, reducer tests, component states exist. | Frontend infers backend payloads from mocks. |
| Enable realtime-critical sessions | Outbox, event log, replay endpoint, dead-letter policy, and reducer tests pass. | Direct WebSocket emit is relied on for truth. |
| Enable live text agents | Agent contracts, eval harness, safety rules, red-team suite, cost/latency telemetry pass. | Any critical leakage, unsafe accepted action, unsupported claim, or unauthorized tool call exists. |
| Enable debrief generation | Evidence-id grounding and unsupported-claim tests pass. | Debrief prose can contain uncited clinical teaching claims. |
| Publish pilot cases | Faculty approval and calibration thresholds pass. | Faculty override/disagreement thresholds fail or review can be bypassed. |
| Start university pilot | Milestone 17.5 packet passes: SLOs, security, accessibility, support, onboarding, buyer validation. | Any non-waivable gate fails. |
| Claim standards integration | Formal implementation and tests exist. | MVP only has readiness hooks for LTI/FHIR/DICOMweb. |
| Enable voice | Official realtime source/pricing refreshed, safety/realtime contracts updated, text gates already pass. | Voice enabled before text safety/reliability evidence. |

## Traceability Matrix

| Requirement | Architecture Source | Planned Artifact | Test/Evidence | Owner | Milestone |
| --- | --- | --- | --- | --- | --- |
| Agent orchestration is code-supervised | Docs 01, 05 ADR-001 | Orchestrator service, tool registry | Agent flow tests, trace evidence | Architecture + Agent Runtime | 6 |
| Agents cannot invent clinical truth | Docs 01, 02, 06 | Fact ledger, grounding schemas | Unsupported claim evals | Safety + Faculty | 4, 6.5 |
| Hidden facts are protected | Docs 01, 06, 08 | Context firewall, visibility rules | Hidden fact leakage suite | Safety | 6.5, 7 |
| Safety pre/post checks exist | Docs 01, 06, 08 | Safety rule engine, guardrails | Unsafe action tests | Safety | 7 |
| SQL-first schema authority | Docs 02, 05 ADR-028 | SQL migrations, migration registry | Migration CI and drift checks | Backend | 2, 4 |
| Critical mutations are atomic | Docs 02, 07 | Transaction patterns, repositories | Transaction/idempotency tests | Backend | 4, 5.5 |
| Realtime events are durable | Docs 02, 07 | `event_log`, `outbox_events`, publisher | Crash-after-commit tests | Backend + Platform | 5.5 |
| Frontend reducer is deterministic | Docs 03, 07 | Event reducer and replay client | Reducer/Playwright tests | Frontend | 8 |
| Component states cover rare failures | Doc 03 | Storybook/catalog or visual docs | Component state audit | Frontend | 8 |
| Implementation order prevents chatbot drift | Doc 04 | Milestone tickets | Architecture review | Architecture | All |
| Official sources are refreshed | Doc 05 | Source refresh register | Source review artifact | Architecture | 2.5, 6.5, 16, 17.5 |
| Eval evidence gates releases | Docs 06, 10 | Eval tables/dashboards | Eval run artifacts | Safety + Agent Runtime | 6.5 |
| Faculty calibration gates pilot | Docs 06, 09 | Calibration workflow/report | Agreement/override metrics | Faculty/Clinical | 10.5 |
| Security incidents are actionable | Doc 08 | Incident playbooks, harness | Security run/drill evidence | Security | 7.5, 17 |
| Pilot readiness is measurable | Docs 09, 10, 11 | Pilot packet | Go/no-go review | Product/Market | 17.5 |
| SLOs and costs are measurable | Doc 10 | Dashboards/alerts/model_runs | SLO/cost evidence | Platform + Product | 14.5, 17.5 |

## Remaining Decisions Register

These are not architecture gaps. They are explicitly deferred because they require implementation evidence, official pricing refresh, buyer evidence, or future integration scope.

| Decision | Why Not Final Now | Temporary Assumption | Owner | Deadline | Blocks |
| --- | --- | --- | --- | --- | --- |
| Full production SLO targets | Need real load, cohort, deployment, and usage data. | Use initial pilot targets in doc 10. | Platform/Observability + Product | Milestone 14.5 review; Milestone 17.5 pilot gate. | Full production launch, not implementation planning. |
| Final live OpenAI text model selection | Model availability/pricing/performance can change. | Use routing matrix and pilot cost budgets; refresh official pricing before live enablement. | Agent Runtime + Platform + Product | Milestone 6.5 for text agents. | Live agents. |
| Final realtime/voice model and pricing | Voice is non-MVP and official realtime capabilities/pricing evolve. | Text-first MVP; `voice_mode` disabled. | Agent Runtime + Platform + Product | Milestone 16. | Voice enablement. |
| LTI implementation depth | Buyer validation must decide launch/roster/grade-passback need. | LTI-ready data model only; no MVP compliance claim. | Product/Market | Milestone 17.5 buyer validation or enterprise phase. | LTI compliance/grade passback claims. |
| FHIR/DICOMweb integration | MVP uses synthetic curated assets and FHIR-inspired data only. | No FHIR/DICOMweb compliance claim. | Product/Market + Architecture | Enterprise integration phase. | Standards compliance claims. |
| Faculty calibration thresholds after first cohort | Initial thresholds need pilot evidence. | Use doc 06 initial thresholds. | Faculty/Clinical + Safety | After first 30 pilot sessions or 2 faculty review cycles. | Broad pilot expansion if thresholds fail. |
| Enterprise retention by contract | Institutional contracts may differ. | Use initial pilot retention table. | Security + Product | Before signed pilot contract. | Tenant launch if contract requires different policy. |

## Final Verdict

Verdict: `APPROVED FOR IMPLEMENTATION PLANNING`.

ClinMira AI architecture is approved to move into implementation planning and ticket breakdown. The first implementation work must be contracts, SQL schema authority, fact ledger, event schemas, and contract CI. Live OpenAI agents, realtime-critical rollout, university pilot, and voice remain blocked until their named gates pass.

This verdict does not approve production launch. It approves a strict architecture foundation that future implementation must follow.

Final rule:

- Architecture changes require an ADR update with official-source basis, owner approval, risk analysis, release-gate impact, and traceability update.
