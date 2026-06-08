# Enterprise Education Market Readiness

## Product Positioning

ClinMira AI is:

- A Virtual Clinic Simulation OS.
- A synthetic Patient Twin platform.
- An OSCE-ready training platform.
- A faculty-reviewed simulation engine.
- A clinical reasoning and communication practice environment.
- A competency analytics platform.
- An agent-observable, safety-aware medical/dental education system.

ClinMira AI is not:

- A chatbot.
- A virtual doctor.
- A real diagnosis app.
- A medical advice tool.
- A generic LLM wrapper.
- A normal CRUD learning app.
- An unrestricted autonomous agent swarm.

Why positioning matters:

- University buyers need confidence that ClinMira is educational infrastructure, not a consumer health assistant.
- Faculty need control over cases, rubrics, imaging, safety, and debriefs.
- Students need a realistic patient encounter without being exposed to unsafe real-world clinical advice.

Acceptance criteria:

- Product copy, onboarding, docs, and UI consistently frame ClinMira as synthetic educational simulation.
- No MVP route suggests real patient care, diagnosis, or treatment advice.

## University Buyer Requirements

| Requirement | Why It Matters | Architecture Implication |
| --- | --- | --- |
| Faculty control | Faculty must trust and approve educational content. | Scenario Studio, faculty review, immutable case versions. |
| Scenario authoring | Schools need local curriculum alignment. | Draft/publish workflows, rubrics, review queue. |
| Cohort analytics | Faculty track class performance and risk. | Cohorts, enrollments, analytics, dashboards. |
| Assessment rubrics | OSCE and competency training require scoring consistency. | Rubric templates/items, evaluator evidence, calibration. |
| Student progress | Learners need feedback and next cases. | Scores, debriefs, suggested next case ids. |
| LMS integration | Universities live inside LMS workflows. | LTI readiness, role/course mapping, future grade passback. |
| Accessibility | Procurement and learner inclusion. | WCAG 2.2 AA target, audits, component state catalog. |
| Audit logs | Trust, support, and governance. | Audit/event logs, trace ids, review snapshots. |
| Data privacy | Institutional security requirement. | Tenant isolation, redaction, retention, no real patient data MVP. |
| Role management | Student/faculty/admin workflows differ. | RBAC, institution/cohort enrollment. |
| Exportable reports | Faculty and admins need evidence. | Debrief exports, cohort analytics, audit export future. |

## LTI / LMS Readiness

LTI/LTI Advantage is future integration scope, but the data model must be ready.

Planned capabilities:

- LMS launch into ClinMira.
- Role mapping from LMS to ClinMira roles.
- Course/cohort mapping.
- Assignment/resource link mapping to cases or scenario sets.
- Names and Role Provisioning Services readiness for roster sync.
- Assignment and Grade Services readiness for grade passback.
- Institution configuration for LMS platform settings.
- SSO future readiness.

Data model readiness:

- `institutions` can map to LMS platform/deployment.
- `cohorts` can map to courses/sections.
- `enrollments` can map LMS memberships.
- `roles` can map LMS roles.
- `cases` and `simulation_sessions` can map assignment/resource links.
- `scores` and `debrief_reports` can map future grade passback policies.

Source basis:

- 1EdTech LTI/LTI Advantage standards define interoperable learning tool launches, roles, names/role provisioning, and assignment/grade services.

Acceptance criteria:

- MVP does not need full LTI implementation.
- Enterprise pilot readiness includes an LTI mapping plan.
- Grade passback is not enabled until faculty grading policy is approved.

## Faculty Calibration Loop

Faculty calibration turns agent evaluation into trusted educational assessment.

Loop:

1. Faculty authors or reviews case.
2. Case includes objectives, hidden facts, reveal rules, safety traps, rubric, and expected reasoning path.
3. Golden student transcripts are generated or authored.
4. Evaluator Agent scores transcripts.
5. Faculty reviewers score the same transcripts.
6. Agreement and disagreement are measured.
7. Rubric, scoring rules, and debrief language are revised.
8. Case version is approved or returned for changes.
9. Pilot results feed future case improvement.

Metrics:

- Case quality score.
- Rubric clarity score.
- Evaluator/faculty agreement.
- Faculty override rate.
- Reviewer disagreement rate.
- Student confusion rate from debrief feedback.
- Safety warning false positive/negative review.

Acceptance criteria:

- No serious pilot case goes live without faculty calibration.
- Reviewer disagreement has documented resolution.
- Faculty overrides are tracked and used to improve rubrics.

## Pilot Readiness

Pilot checklist:

- Approved synthetic cases across target specialties.
- Faculty onboarding guide.
- Student onboarding guide.
- Support workflow and escalation path.
- Known limitations and non-medical-advice framing.
- WCAG-oriented accessibility smoke check.
- Tenant isolation validation.
- Audit/export plan.
- Eval harness pass evidence.
- Security red-team pass evidence.
- Realtime replay and reconnect tests.
- Production SLO/cost dashboard.
- Faculty review queue workflow.

Success metrics:

- Session completion rate.
- Time to first patient response.
- Student satisfaction and perceived realism.
- Faculty trust score.
- Faculty override rate.
- Rubric agreement.
- Safety block comprehension.
- Learning outcome improvement proxy.
- Case reuse/adoption.
- Support ticket rate.

## Competitive Differentiation

ClinMira is not just another AI health assistant because it is education-first.

Differentiators:

- Synthetic Patient Twins with controlled facts.
- Multi-agent simulation under code-orchestrated supervision.
- LLMs phrase but do not invent clinical facts.
- Faculty-authored and faculty-reviewed cases.
- Rubric-grounded evaluation.
- Reasoning graph and mistake replay.
- Safety guardrails before and after risky actions.
- Agent observability and traceability.
- Curated/synthetic imaging with approval gates.
- Realtime session replay and event reliability.
- LMS/university readiness.

Market risk if ignored:

- Product will be perceived as a chatbot demo.
- Faculty will not trust scoring.
- Universities will worry about accessibility, privacy, and LMS fit.
- Differentiation from generic AI tutors will be weak.

## Enterprise Packaging Readiness

Future enterprise requirements:

- Tenant admin dashboard.
- Institution settings.
- Role and cohort management.
- Case assignment workflows.
- Faculty review SLAs.
- Audit export.
- Data retention settings.
- Language settings, including EN/TR.
- Support/admin impersonation policy with audit.
- Billing/contract usage metrics future.
- Deployment/security documentation.

Acceptance criteria before serious university pilot:

- Institution and cohort data model exists.
- Faculty can assign/review cases or pilot assignment plan exists.
- Review queue is usable by faculty.
- Audit events exist for sensitive operations.
- Support team can inspect session state with appropriate role and redaction.

## Accessibility and Inclusion

University readiness requires accessible simulation experiences.

Requirements:

- WCAG 2.2 AA target where reasonable.
- Keyboard-only Virtual Clinic flow.
- Screen-reader-friendly safety warnings and agent status.
- Color-independent warning/block indicators.
- Reduced motion mode.
- Mobile and tablet usability.
- Turkish text overflow checks.
- Plain-language patient/faculty explanations.

Acceptance criteria:

- Accessibility audit findings are tracked before pilot.
- Critical blockers in Virtual Clinic and debrief are resolved before pilot.

## Market-Ready Acceptance Criteria

ClinMira is market-ready for a serious university pilot only when:

- Architecture docs are accepted.
- MVP scope is explicit and non-MVP claims are not marketed.
- Faculty calibration loop passes.
- Eval harness passes release gates.
- Security threat model release gates pass.
- Realtime event replay works.
- Tenant isolation tests pass.
- WCAG-oriented smoke checks pass.
- LTI readiness plan exists.
- Production SLO/cost/observability dashboard exists.
- Pilot onboarding/support workflow exists.
- Faculty can review, approve, reject, and audit cases/debriefs.

## University Pilot Entry Criteria

ClinMira may enter a serious university pilot only after this entry gate passes.

| Area | Minimum Entry Criterion | Owner | Evidence |
| --- | --- | --- | --- |
| Approved cases | At least `8` faculty-approved synthetic cases across the target pilot specialties, each with hidden facts, reveal rules, safety traps, rubric, and golden transcript. | Faculty/Clinical | Case approval packet. |
| Case calibration | Pilot cases meet faculty calibration thresholds in `06_AGENT_EVALUATION_AND_SAFETY_TESTING.md`. | Faculty/Clinical | Calibration report. |
| Safety gates | Hidden fact leakage, unsafe accepted treatment, unapproved imaging findings, and critical unsupported debrief claims are all `0`. | Safety | Eval/security run. |
| Realtime reliability | Event replay success >= `99.5%`; reconnect recovery P95 <= `3000ms`. | Backend + Platform | Replay dashboard/test evidence. |
| SLO dashboard | API/session/patient response/debrief/event replay/cost dashboards exist. | Platform/Observability | Dashboard snapshot. |
| Tenant isolation | Cross-tenant API/event/object/faculty tests pass. | Security | Security test report. |
| Accessibility | WCAG 2.2 AA-oriented keyboard/focus/contrast/screen-reader smoke checks pass for pilot scope. | Frontend | Accessibility evidence. |
| Faculty workflow | Review queue supports approve/reject/request changes with audit. | Faculty/Clinical + Backend | E2E test/report. |
| Student onboarding | Synthetic simulation framing, limitations, safe-use guidance, and support path are approved. | Product/Market | Onboarding packet. |
| Faculty onboarding | Case review, rubric interpretation, calibration, and incident escalation materials are approved. | Product/Market + Faculty | Faculty packet. |
| Support workflow | Incident escalation, support contact, triage owner, and response SLA are documented. | Product/Market + Security | Support playbook. |
| Non-MVP claims | No marketing/UI copy claims real diagnosis, real patient care, FHIR compliance, DICOMweb integration, or LTI compliance in MVP. | Product/Market | Copy review. |

Pilot stop conditions:

- Any critical hidden fact leak.
- Any unsafe treatment accepted as valid.
- Any cross-tenant exposure.
- Any faculty approval bypass.
- Event replay failure that loses safety, score, review, or imaging events.
- Faculty trust score or override rate indicates calibration failure after review cycle.

## Buyer Validation Plan

The pilot must validate buyer trust, not only student delight.

| Validation Track | Questions to Answer | Participants | Evidence |
| --- | --- | --- | --- |
| Faculty trust | Do faculty trust case control, rubric scoring, debrief grounding, and review workflow? | 5-8 faculty reviewers across target programs. | Interview notes, calibration metrics, override patterns. |
| Curriculum fit | Do cases map to learning objectives and course timing? | Course leads/program directors. | Case-to-objective matrix. |
| Procurement/security | Are tenant isolation, audit logs, retention, accessibility, and data posture acceptable for pilot? | IT/security/procurement stakeholders. | Security questionnaire responses and gaps. |
| LMS workflow | Is LTI readiness enough for pilot, or is LMS launch/grade passback required? | LMS/admin stakeholders. | Integration requirement decision. |
| Student experience | Do students understand the simulation, safety warnings, and debrief feedback? | Pilot student cohort. | Completion, satisfaction, confusion, safety follow-up metrics. |
| Faculty workload | Does review/calibration create acceptable workload? | Faculty reviewers. | Review queue age, review time, backlog. |
| Differentiation | Does ClinMira feel meaningfully different from chatbot, LMS quiz, or existing simulator options? | Faculty, program leads, students. | Differentiation interview synthesis. |

Buyer validation exit:

- Product/Market Owner produces a pilot validation memo before broader rollout.
- Architecture Owner updates roadmap/ADRs if buyer requirements change core technical scope.
- Non-MVP integration requests such as LTI, FHIR, or DICOMweb are logged as future decisions, not silently added to MVP.

## Market Differentiation Matrix

| Capability | Generic AI Chatbot | Virtual Patient Simulator | LMS Quiz/Case Tool | Clinical OSCE Platform | ClinMira AI Target |
| --- | --- | --- | --- | --- | --- |
| Controlled clinical truth | Weak; model may invent. | Medium; scripted cases. | High but static. | High for stations. | High; fact ledger and no-free-truth invariant. |
| Synthetic patient conversation | High language fluency but weak grounding. | Medium, often scripted. | Low. | Medium depending vendor. | High; persona agent uses allowed facts only. |
| Hidden/revealed fact management | Weak. | Medium. | Medium. | Medium/high. | High; context firewall and reveal rules. |
| Safety blocking | Weak/general. | Medium. | Low/medium. | Medium. | High; deterministic rules plus guardrails. |
| Rubric-grounded scoring | Weak. | Medium. | High for quizzes, limited interaction. | High. | High; evaluator, rubric, reasoning graph, faculty calibration. |
| Faculty authoring/review | Weak. | Medium/high. | High. | High. | High; Scenario Studio and review gates. |
| Realtime reliability/replay | Weak. | Varies. | Low need. | Varies. | High; outbox, event log, replay API. |
| Agent observability | Weak. | Low/medium. | Low. | Low. | High; agent runs, traces, guardrails, model/tool logs. |
| University/LMS readiness | Weak. | Varies. | High. | Medium/high. | Future-ready; LTI-ready without MVP compliance claim. |
| Differentiated value | Conversational novelty. | Simulation library. | Assessment workflow. | OSCE operations. | Agentic Virtual Clinic Simulation OS with faculty-governed truth and safety. |
