# Architecture Review Summary

## Final Architecture Score

Score date: `2026-06-04`

| Area | Score | Strict Verdict |
| --- | --- | --- |
| Agentic Core | 9.3/10 | Strong supervised agents-as-tools architecture with context firewall, fact ledger, no-free-clinical-truth invariant, model routing, failure policy, and release-blocking agent gates. Live agents remain blocked until eval, safety, cost, and trace evidence exists. |
| Backend/Database | 9.4/10 | PostgreSQL source of truth, SQL-first migration authority, transactional outbox, durable event log, replay, tenant isolation, transaction patterns, indexes, retention, and restore gates are specified. Implementation must begin with contracts/schema, not live agents. |
| Frontend Integration | 9.1/10 | Virtual Clinic state machine, event reducer, component state catalog, Playwright scenarios, telemetry contract, accessibility, redaction, and reconnect states are implementation-ready. Backend integration is blocked until contract freshness and reducer/replay tests pass. |
| Roadmap | 9.3/10 | Owner/RACI, corrected build order, measurable gates, and stop/no-go conditions now prevent chatbot-first or demo-first drift. Timeline dates still require team scheduling, but role ownership and blocking milestones are defined. |
| Official Sources/ADRs | 9.3/10 | Official-source register, volatility, refresh rules, and ADR-001 through ADR-038 are documented. Evolving sources must be refreshed at the named milestones before implementation claims. |
| Evaluation/Safety | 9.2/10 | Release gate table, eval versioning, faculty calibration thresholds, and revision policy are defined. The system is not cleared for live agents until stored eval evidence passes. |
| Event Reliability | 9.4/10 | Outbox, event log, ordering invariants, replay API contract, contract CI, and dead-letter policy are strict enough for reliable realtime implementation. |
| Security/Governance | 9.2/10 | OWASP/NIST mapping, incident playbooks, security harness, non-waivable gates, tenant isolation, prompt injection, and faculty bypass controls are defined. Pilot blocks until harness evidence exists. |
| Market/Pilot Readiness | 9.0/10 | University pilot entry criteria, buyer validation, differentiation matrix, LTI-readiness boundaries, and faculty workflow gates are defined. Pilot remains blocked until buyer/faculty evidence exists. |
| Production/SLO/Observability | 9.1/10 | Initial pilot SLOs, cost budgets, dashboard acceptance, cardinality rules, retention/redaction, and backup/restore gates are explicit. Full production SLOs are intentionally deferred until load evidence. |

Overall architecture score: `9.25/10`.

This is strong enough to guide top-tier implementation planning. It is not a production launch approval and not a live-agent rollout approval.

## Blocker Resolution Register

| Blocker | Status | Resolution / Remaining Gate | Owner | Blocking Milestone |
| --- | --- | --- | --- | --- |
| Architecture could become a simple chatbot | Resolved in architecture | Hybrid code-orchestrated supervisor, agents-as-tools, fact ledger, no-free-clinical-truth invariant, context firewall, and eval gates are mandatory. | Architecture Owner | Blocks all implementation if violated. |
| Live agents could be built before safe foundations | Resolved in architecture | Corrected implementation order requires contracts/schema, DB core, fact ledger, outbox/event log, mock runtime, eval harness, and safety before live agents. | Architecture Owner | Milestone 6.5/7 |
| Migration authority ambiguous | Resolved in architecture | SQL-first migrations are the single schema authority; Prisma Client mirrors for TypeScript queries only. | Backend Owner | Milestone 2/4 |
| Realtime could lose critical events | Resolved in architecture | Transactional outbox, event log, replay API, ordering invariants, dead-letter policy, and reducer tests are mandatory. | Backend + Platform | Milestone 5.5 |
| Hidden facts could leak through agent context | Resolved in architecture | Context firewall, visibility matrix, no-free-clinical-truth invariant, guardrails, and hidden fact evals are release-blocking. | Safety Owner | Milestone 6.5/7 |
| Unsafe treatment could be accepted | Resolved in architecture | Deterministic safety rules, pre/post checks, faculty triggers, and `0` unsafe accepted treatment gate are mandatory. | Safety + Faculty | Milestone 7 |
| Debrief could hallucinate teaching points | Resolved in architecture | Evidence ids required for every debrief claim; unsupported critical claims must be `0`. | Faculty + Agent Runtime | Milestone 11 |
| Frontend could hide rare critical states | Resolved in architecture | Component state catalog, state machine, reducer contract, and Playwright scenarios are mandatory. | Frontend Owner | Milestone 8 |
| Incident response could be improvised | Resolved in architecture | Incident playbooks, security harness, waiver policy, and non-waivable gates are defined. | Security Owner | Milestone 7.5/17 |
| Faculty trust could be assumed | Partially resolved | Calibration thresholds are defined, but real faculty evidence must be collected. | Faculty/Clinical Owner | Milestone 10.5 |
| Buyer validation could be skipped | Partially resolved | Buyer validation plan and pilot entry criteria are defined, but interviews/procurement evidence must be collected. | Product/Market Owner | Milestone 17.5 |
| Pilot SLO targets could remain vague | Resolved for pilot | Initial pilot SLOs/cost budgets are explicit; full production targets wait for measured load evidence. | Platform/Observability | Milestone 14.5/17.5 |
| Full production SLOs not final | Intentionally deferred | Initial pilot targets govern implementation; full production targets require load data and are updated after telemetry evidence. | Platform + Product | Blocks full production, not implementation planning. |
| Final live model/pricing selection | Intentionally deferred | Model routing matrix and budgets are defined; official pricing/model refresh required before live agents/voice. | Agent Runtime + Platform + Product | Milestone 6.5 and 16 |
| LTI/FHIR/DICOMweb compliance | Intentionally deferred | MVP is readiness-only and must not claim compliance/integration. | Product/Market + Architecture | Blocks compliance claims, not MVP architecture. |

## Strict Verdict

Verdict: `APPROVED FOR IMPLEMENTATION PLANNING`.

Allowed next step:

- Start implementation tickets for contracts, SQL schema planning, fact ledger, event schemas, API contracts, Pydantic schemas, generated TypeScript DTOs, migration registry, and contract CI.

Not allowed yet:

- Do not enable live OpenAI agents before Milestone 6.5 and Milestone 7 gates pass.
- Do not ship realtime-critical frontend/backend integration before Milestone 5.5 outbox/event replay gates pass.
- Do not publish pilot cases before faculty calibration passes.
- Do not start a serious university pilot before Milestone 17.5 entry criteria pass.
- Do not claim FHIR, DICOMweb, LTI, clinical decision support, real diagnosis, or real patient-care capability in MVP.

Final implementation rule:

- If implementation conflicts with these architecture documents, implementation is wrong until an ADR updates the architecture with owner approval, source basis, risk analysis, and release-gate impact.
