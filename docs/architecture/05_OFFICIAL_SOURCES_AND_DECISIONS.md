# Official Sources and Architecture Decisions

This file records the official or primary technical sources used to guide ClinMira AI's architecture and the Architecture Decision Records that future implementation should follow.

Source priority:

1. Official product/framework documentation.
2. Official standards documentation.
3. Primary project documentation for open-source extensions.
4. Secondary sources only when clearly labeled.

No random blog posts were used as architectural authority.

## 1. Official Sources Reviewed

### OpenAI Agents SDK

- Name: OpenAI Agents SDK Intro
- Official URL: https://openai.github.io/openai-agents-python/
- Relevant concept: Agents, agents as tools, handoffs, guardrails, sessions, human-in-the-loop, tracing, realtime agents, Python-first orchestration.
- Impact on ClinMira: Supports using Python Agent Workers with OpenAI Agents SDK as the agent runtime and supports bounded specialist agents, guardrails, and traceable workflows.

### OpenAI Agents SDK Multi-Agent / Agents as Tools

- Name: OpenAI Agents SDK Agent Orchestration
- Official URL: https://openai.github.io/openai-agents-python/multi_agent/
- Relevant concept: LLM-led orchestration vs code orchestration; agents-as-tools manager pattern; handoffs pattern; deterministic code orchestration tradeoffs.
- Impact on ClinMira: Basis for `Hybrid Code-Orchestrated Supervisor + Agents-as-Tools`, where ClinMira's orchestrator controls the simulation and calls specialists for bounded subtasks.

### OpenAI Agents SDK Tools

- Name: OpenAI Agents SDK Tools
- Official URL: https://openai.github.io/openai-agents-python/tools/
- Relevant concept: Function tools, custom function tools, structured tool parameters, agents as tools, tool output handling, timeouts.
- Impact on ClinMira: Basis for controlled tool catalog, tool permission matrix, and structured specialist agent inputs/outputs.

### OpenAI Agents SDK Handoffs

- Name: OpenAI Agents SDK Handoffs
- Official URL: https://openai.github.io/openai-agents-python/handoffs/
- Relevant concept: Handoff lets another agent take over, input filters can modify context, handoffs stay within a run, guardrail boundaries matter.
- Impact on ClinMira: Basis for limiting handoffs to major mode transitions rather than using handoffs for every student message.

### OpenAI Guardrails

- Name: OpenAI Agents SDK Guardrails
- Official URL: https://openai.github.io/openai-agents-python/guardrails/
- Relevant concept: Input guardrails, output guardrails, tool guardrails, tripwires, workflow boundaries.
- Impact on ClinMira: Basis for layered input/output/tool guardrails and safety tripwires. Tool guardrails are especially important because specialist agents are called as tools.

### OpenAI Tracing

- Name: OpenAI Agents SDK Tracing
- Official URL: https://openai.github.io/openai-agents-python/tracing/
- Relevant concept: Traces and spans for LLM generations, tool calls, handoffs, guardrails, and custom events; sensitive data controls.
- Impact on ClinMira: Basis for agent observability, session replay, trace correlation, model/tool logs, faculty trust, and redaction requirements.

### OpenAI Realtime

- Name: OpenAI Agents SDK Realtime Quickstart
- Official URL: https://openai.github.io/openai-agents-python/realtime/quickstart/
- Relevant concept: Server-side realtime agents over WebSocket transport; Python SDK boundary; realtime agent configuration.
- Impact on ClinMira: Basis for voice-ready architecture while keeping MVP text-first and server-managed safety/tool orchestration.

### OpenAI Responses API / Structured Outputs / Streaming

- Name: OpenAI Responses API Reference
- Official URL: https://platform.openai.com/docs/api-reference/responses
- Relevant concept: Stateful model responses, multimodal inputs, function calling, built-in tools, streaming support.
- Impact on ClinMira: Background for structured model interactions and future direct Responses API paths if the team needs low-level control.

- Name: OpenAI Structured Outputs
- Official URL: https://platform.openai.com/docs/guides/structured-outputs
- Relevant concept: JSON Schema-constrained model outputs, explicit refusals, streaming structured outputs.
- Impact on ClinMira: Basis for requiring structured specialist outputs and programmatically detectable refusals or invalid outputs.

- Name: OpenAI Streaming Responses
- Official URL: https://platform.openai.com/docs/guides/streaming-responses
- Relevant concept: Server-sent streaming of model output.
- Impact on ClinMira: Basis for streaming patient messages while retaining backend validation and event reconciliation.

### Temporal

- Name: Temporal Workflows
- Official URL: https://docs.temporal.io/workflows
- Relevant concept: Durable workflow execution, Event History, replay, deterministic workflow code, Activities for external work.
- Impact on ClinMira: Basis for durable simulation workflows, debrief generation, scenario publish, review workflows, and strict separation between deterministic workflow orchestration and nondeterministic LLM/API/database/file activities.

- Name: Temporal Activities
- Official URL: https://docs.temporal.io/activities
- Relevant concept: Activities execute single well-defined actions, can be nondeterministic, should be idempotent, and are executed by workers.
- Impact on ClinMira: Basis for making LLM calls, database writes, object storage access, and realtime emits activities rather than replay-sensitive workflow code.

- Name: Temporal Workers
- Official URL: https://docs.temporal.io/workers
- Relevant concept: Worker processes poll task queues and execute workflow/activity tasks.
- Impact on ClinMira: Basis for separate task queues and scalable agent/debrief/review workers.

- Name: Temporal Retry Policies
- Official URL: https://docs.temporal.io/encyclopedia/retry-policies
- Relevant concept: Declarative retry behavior; Activities retry by default; Workflows are not retried by default.
- Impact on ClinMira: Basis for bounded retries, non-retryable safety/application errors, and idempotent activities.

### PostgreSQL

- Name: PostgreSQL Transactions
- Official URL: https://www.postgresql.org/docs/current/tutorial-transactions.html
- Relevant concept: Transactions bundle multiple steps into all-or-nothing operations and hide incomplete changes from concurrent transactions.
- Impact on ClinMira: Basis for atomic session state updates, action persistence, timeline events, safety warning writes, and scoring updates.

- Name: PostgreSQL Constraints
- Official URL: https://www.postgresql.org/docs/current/ddl-constraints.html
- Relevant concept: Check, not-null, unique, primary key, and foreign key constraints.
- Impact on ClinMira: Basis for enforcing relational integrity, version uniqueness, idempotency uniqueness, score ranges, tenant scoping, and hidden/revealed fact references.

- Name: PostgreSQL Indexes
- Official URL: https://www.postgresql.org/docs/current/indexes.html
- Relevant concept: Indexes improve retrieval speed but add overhead and should be used sensibly.
- Impact on ClinMira: Basis for composite indexes on tenant/status/date, review queues, session timelines, and event replay.

- Name: PostgreSQL JSON Types
- Official URL: https://www.postgresql.org/docs/current/datatype-json.html
- Relevant concept: `json` and `jsonb`, JSONB processing and indexing advantages.
- Impact on ClinMira: Basis for using JSONB selectively for structured flexible payloads, not as a substitute for core relational truth.

- Name: PostgreSQL Explicit Locking
- Official URL: https://www.postgresql.org/docs/current/explicit-locking.html
- Relevant concept: Table and row locking behavior.
- Impact on ClinMira: Basis for careful concurrency design around session state, migrations, and high-contention updates.

### Redis

- Name: Redis Pub/Sub
- Official URL: https://redis.io/docs/latest/develop/pubsub/
- Relevant concept: Pub/Sub messaging, at-most-once delivery, pattern subscriptions, sharded Pub/Sub.
- Impact on ClinMira: Basis for ephemeral realtime fanout and the warning that Pub/Sub must not be the only event persistence mechanism.

- Name: Redis Streams
- Official URL: https://redis.io/docs/latest/develop/data-types/streams/
- Relevant concept: Stream data type for event-like data and consumer patterns.
- Impact on ClinMira: Basis for reconnect replay and stronger event consumption than Pub/Sub when needed.

- Name: Redis INCR
- Official URL: https://redis.io/docs/latest/commands/incr/
- Relevant concept: Atomic counters and rate limiter patterns using `INCR` and `EXPIRE`.
- Impact on ClinMira: Basis for per-user/session rate limiting and short-lived counters.

- Name: Redis Hashes
- Official URL: https://redis.io/docs/latest/develop/data-types/hashes/
- Relevant concept: Hashes as field-value records.
- Impact on ClinMira: Basis for storing short-lived session and agent status cache records.

### Next.js

- Name: Next.js App Router
- Official URL: https://nextjs.org/docs/app
- Relevant concept: App Router framework used by the current frontend.
- Impact on ClinMira: Basis for preserving the current frontend structure.

- Name: Next.js Route Handlers
- Official URL: https://nextjs.org/docs/app/getting-started/route-handlers
- Relevant concept: Custom request handlers in the `app` directory; supported HTTP methods; caching behavior.
- Impact on ClinMira: Basis for optional frontend-side BFF/proxy patterns and route-aware integration.

- Name: Next.js Fetching Data
- Official URL: https://nextjs.org/docs/app/getting-started/fetching-data
- Relevant concept: Server Components, Client Components, data fetching, streaming, Suspense, meaningful loading states.
- Impact on ClinMira: Basis for frontend loading, streaming, and data integration strategy.

- Name: Next.js Server and Client Components
- Official URL: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Relevant concept: Server/client component boundary.
- Impact on ClinMira: Basis for keeping data-heavy views server-friendly while interactive Virtual Clinic parts remain client-driven.

### NestJS

- Name: NestJS Modules
- Official URL: https://docs.nestjs.com/modules
- Relevant concept: Feature modules, dependency injection, module graph, providers, controllers, imports, exports.
- Impact on ClinMira: Basis for modular API/BFF service boundaries.

- Name: NestJS Controllers
- Official URL: https://docs.nestjs.com/controllers
- Relevant concept: Controller routing and request handling.
- Impact on ClinMira: Basis for API route organization.

- Name: NestJS WebSocket Gateways
- Official URL: https://docs.nestjs.com/websockets/gateways
- Relevant concept: WebSocket gateway structure.
- Impact on ClinMira: Basis for realtime gateway implementation.

### FastAPI

- Name: FastAPI Features
- Official URL: https://fastapi.tiangolo.com/features/
- Relevant concept: Python API framework, type hints, async support, validation, OpenAPI.
- Impact on ClinMira: Basis for the FastAPI-only MVP alternative, not the primary recommendation.

### Prisma

- Name: Prisma Data Model
- Official URL: https://www.prisma.io/docs/orm/prisma-schema/data-model/models
- Relevant concept: Prisma schema models and fields.
- Impact on ClinMira: Basis for typed TypeScript API/BFF database models if NestJS uses Prisma.

- Name: Prisma Client CRUD
- Official URL: https://www.prisma.io/docs/orm/prisma-client/queries/crud
- Relevant concept: Type-safe query client operations.
- Impact on ClinMira: Basis for API/BFF data access patterns and DTO alignment.

### MCP

- Name: Model Context Protocol Introduction
- Official URL: https://modelcontextprotocol.io/docs/getting-started/intro
- Relevant concept: Standardized model/tool/resource context protocol.
- Impact on ClinMira: Basis for designing MCP-style tool boundaries and future standardized agent-tool integrations.

- Name: OpenAI Agents SDK MCP Guide
- Official URL: https://openai.github.io/openai-agents-python/mcp/
- Relevant concept: MCP server tool integration in OpenAI Agents SDK.
- Impact on ClinMira: Basis for exposing future clinical tools, faculty tools, or knowledge tools through standardized MCP-compatible boundaries.

### OpenTelemetry

- Name: OpenTelemetry Traces
- Official URL: https://opentelemetry.io/docs/concepts/signals/traces/
- Relevant concept: Distributed traces and spans.
- Impact on ClinMira: Basis for correlating API, Temporal, agent worker, database, Redis, and realtime operations.

- Name: OpenTelemetry Metrics
- Official URL: https://opentelemetry.io/docs/concepts/signals/metrics/
- Relevant concept: Measurements over time for system behavior.
- Impact on ClinMira: Basis for latency, error rate, queue depth, token usage, cost, safety block rate, and faculty review metrics.

- Name: OpenTelemetry Logs
- Official URL: https://opentelemetry.io/docs/concepts/signals/logs/
- Relevant concept: Log signal and correlation with traces/metrics.
- Impact on ClinMira: Basis for structured logs correlated by trace/session/turn.

### Python

- Name: Python asyncio
- Official URL: https://docs.python.org/3/library/asyncio.html
- Relevant concept: Asynchronous I/O in Python.
- Impact on ClinMira: Basis for async Python agent workers and parallel independent checks where safe.

### pgvector

- Name: pgvector
- Primary project URL: https://github.com/pgvector/pgvector
- Relevant concept: Open-source vector similarity search for PostgreSQL.
- Impact on ClinMira: Basis for initial vector search inside PostgreSQL rather than adding a separate vector database in MVP.
- Source classification: Primary project documentation, not PostgreSQL core documentation.

### FHIR

- Name: HL7 FHIR Overview
- Official URL: https://hl7.org/fhir/overview.html
- Relevant concept: FHIR as a standard for exchanging healthcare information electronically; resources as common building blocks.
- Impact on ClinMira: Basis for FHIR-inspired naming without claiming MVP FHIR compliance.

- Name: HL7 FHIR Resource List
- Official URL: https://hl7.org/fhir/resourcelist.html
- Relevant concept: Encounter, Observation, Condition, DiagnosticReport, ImagingStudy, MedicationRequest, Procedure, CarePlan, ClinicalImpression, and related resources.
- Impact on ClinMira: Basis for healthcare-inspired data model mapping.

### DICOMweb

- Name: DICOM PS3.18 Web Services
- Official URL: https://dicom.nema.org/medical/dicom/current/output/chtml/part18/PS3.18.html
- Relevant concept: DICOMweb services for medical imaging access and exchange.
- Impact on ClinMira: Basis for future imaging interoperability discussions, not MVP implementation.

## 2. Architecture Decision Records

### ADR-001: Use Hybrid Code-Orchestrated Supervisor + Agents-as-Tools

Status:

- Accepted for implementation planning.

Context:

- ClinMira needs multi-agent clinical simulation, but cannot allow uncontrolled agent behavior to create clinical facts, unsafe treatment, hidden fact leakage, or inconsistent scoring.

Decision:

- Use a central ClinMira Simulation Orchestrator that controls each session turn and calls specialist agents as bounded tools.

Alternatives considered:

- Fully autonomous swarm.
- Pure handoff chain.
- Single monolithic chatbot agent.

Consequences:

- More application code is required.
- Agent behavior becomes easier to test, trace, and audit.
- State transitions remain deterministic.

Risks:

- Orchestrator can become too complex if service boundaries are not maintained.

Source basis:

- OpenAI Agents SDK Agent Orchestration.
- OpenAI Agents SDK Tools.
- OpenAI Agents SDK Intro.

### ADR-002: Use Limited Handoffs Only for Major Mode Transitions

Status:

- Accepted for implementation planning.

Context:

- Handoffs let a specialist take over the conversation. This is useful for mode changes but risky for every clinical turn.

Decision:

- Use handoffs only for Simulation, Scenario Creation, Debriefing, Faculty Review, and future Voice/Realtime modes.

Alternatives considered:

- Handoff to a specialist for every student action.
- Never use handoffs.

Consequences:

- Patient-facing simulation remains stable.
- Specialist contexts stay bounded.
- Major modes can still use specialized prompts and tools.

Risks:

- Some mode transitions may need careful context filters.

Source basis:

- OpenAI Agents SDK Handoffs.
- OpenAI Agents SDK Guardrails.

### ADR-003: Use Python for Agent Runtime

Status:

- Accepted for implementation planning.

Context:

- ClinMira needs OpenAI Agents SDK, structured agent tools, guardrails, tracing, future realtime agents, and AI workflow flexibility.

Decision:

- Use Python for agent workers and the OpenAI Agents SDK runtime.

Alternatives considered:

- TypeScript-only agent runtime.
- API/BFF directly calling OpenAI without a separate worker.
- Third-party graph framework as primary runtime.

Consequences:

- Better alignment with OpenAI Agents SDK Python docs.
- Clean separation between API/BFF and agent execution.
- Requires cross-service contracts between NestJS and Python.

Risks:

- TypeScript/Python schema drift.

Source basis:

- OpenAI Agents SDK Intro.
- Python asyncio documentation.
- Temporal Python developer guide.

### ADR-004: Use NestJS API/BFF + Python Agent Workers

Status:

- Accepted as preferred architecture; FastAPI-only remains MVP alternative.

Context:

- ClinMira has a Next.js frontend and needs a SaaS-grade API/BFF with auth, RBAC, modules, WebSocket gateway, DTOs, and multi-tenant structure.

Decision:

- Use NestJS as the API/BFF and Python as the agent worker runtime.

Alternatives considered:

- FastAPI-only backend.
- Next.js Route Handlers as full backend.
- Monolithic Python worker/API.

Consequences:

- Strong TypeScript alignment for frontend contracts.
- Clean agent separation.
- More services than FastAPI-only.

Risks:

- Extra integration overhead.

Source basis:

- NestJS Modules, Controllers, WebSocket Gateways.
- FastAPI Features for alternative.
- Next.js Route Handlers for frontend-side BFF considerations.

### ADR-005: Use PostgreSQL as Source of Truth

Status:

- Accepted.

Context:

- ClinMira needs durable tenant-scoped data, versioned cases, sessions, hidden/revealed facts, timeline, safety warnings, scores, debriefs, reviews, and audit logs.

Decision:

- Use PostgreSQL as the authoritative data store.

Alternatives considered:

- Redis as primary state.
- Document database as primary store.
- Separate event store first.

Consequences:

- Strong relational integrity and transaction guarantees.
- Clear auditability.
- JSONB available for controlled flexible payloads.

Risks:

- Overusing JSONB can hide core relationships.

Source basis:

- PostgreSQL Transactions.
- PostgreSQL Constraints.
- PostgreSQL Indexes.
- PostgreSQL JSON Types.

### ADR-006: Use Redis for Realtime/Cache/Session Coordination

Status:

- Accepted.

Context:

- ClinMira needs low-latency cache, presence, realtime fanout, rate limiting, and short-lived agent status.

Decision:

- Use Redis for cache, presence, Pub/Sub fanout, Streams replay where needed, and rate limiting.

Alternatives considered:

- PostgreSQL-only realtime polling.
- Kafka/NATS for MVP.
- Redis as primary source of truth.

Consequences:

- Fast operational coordination.
- Keeps PostgreSQL as truth.
- Can add stronger event bus later if scale requires it.

Risks:

- Pub/Sub at-most-once delivery can lose events if treated as durable.

Source basis:

- Redis Pub/Sub.
- Redis Streams.
- Redis INCR.
- Redis Hashes.

### ADR-007: Use Temporal for Durable Simulation Workflows

Status:

- Accepted for durable workflow phases.

Context:

- Simulation actions, order tests, debrief generation, scenario publishing, faculty review, and future voice sessions are multi-step workflows with retries and failure recovery needs.

Decision:

- Use Temporal for durable workflows and task queues. Put LLM/API/database/file work in Activities.

Alternatives considered:

- Plain background jobs.
- Queue-only worker.
- Synchronous API calls for everything.

Consequences:

- Better failure recovery and workflow visibility.
- Requires deterministic workflow discipline.
- Adds operational complexity.

Risks:

- Workflow nondeterminism if LLM calls or database calls are placed inside Workflow code.

Source basis:

- Temporal Workflows.
- Temporal Activities.
- Temporal Workers.
- Temporal Retry Policies.

### ADR-008: Use MCP-Style Tool Boundaries

Status:

- Accepted as design principle; full MCP integration future.

Context:

- Agent tools need stable schemas, permissions, and auditability. Future integrations may need standardized tool interfaces.

Decision:

- Design tools with MCP-style boundaries: named capabilities, schema, permissions, source basis, and controlled outputs.

Alternatives considered:

- Ad hoc Python functions with broad inputs.
- Agents directly querying databases.

Consequences:

- Tools become easier to test and expose safely.
- Future MCP integration is easier.

Risks:

- Over-standardizing before concrete tools exist.

Source basis:

- Model Context Protocol introduction.
- OpenAI Agents SDK MCP guide.
- OpenAI Agents SDK Tools.

### ADR-009: Use FHIR-Inspired Clinical Data Model, Not Full FHIR in MVP

Status:

- Accepted.

Context:

- ClinMira is educational simulation software, not an EHR. Full FHIR compliance would add substantial complexity before MVP value is proven.

Decision:

- Use FHIR-inspired names and mappings for Encounter, Observation, Condition, DiagnosticReport, ImagingStudy, MedicationRequest, Procedure, CarePlan, and ClinicalImpression, but do not implement full FHIR in MVP.

Alternatives considered:

- Full FHIR resources and FHIR REST API in MVP.
- No healthcare-inspired structure.

Consequences:

- Easier faculty and future interoperability conversations.
- Avoids premature conformance burden.

Risks:

- Stakeholders may assume FHIR compliance unless docs are explicit.

Source basis:

- HL7 FHIR Overview.
- HL7 FHIR Resource List.

### ADR-010: Use Curated/Synthetic Imaging First, Not Unrestricted Generation

Status:

- Accepted.

Context:

- Medical/dental imaging must be accurate, reviewed, and educationally appropriate. Free image generation can invent findings or create misleading images.

Decision:

- MVP uses curated synthetic images with faculty-approved metadata. Future image generation must be review-gated.

Alternatives considered:

- Generate radiographs/CBCT freely per session.
- Text-only imaging findings.

Consequences:

- Safer and more faculty-trustworthy imaging.
- Requires asset library and metadata.

Risks:

- More upfront content work.

Source basis:

- OpenAI Guardrails and structured output sources for output control.
- DICOM PS3.18 for future imaging interoperability awareness.
- Faculty review architecture requirement.

### ADR-011: Use OpenTelemetry and Agent Tracing from Early Stages

Status:

- Accepted.

Context:

- Multi-agent clinical simulation needs traceability for safety, debugging, cost, faculty review, and platform operations.

Decision:

- Use OpenAI Agents SDK tracing plus OpenTelemetry spans, metrics, and logs from early backend stages.

Alternatives considered:

- Add observability after MVP.
- Store only application logs.

Consequences:

- Easier debugging and faculty audit.
- Requires redaction and retention policy.

Risks:

- Sensitive data could be captured if tracing is not configured carefully.

Source basis:

- OpenAI Agents SDK Tracing.
- OpenTelemetry Traces.
- OpenTelemetry Metrics.
- OpenTelemetry Logs.

### ADR-012: Use Frontend Mock-to-Real Transition via Typed Contracts

Status:

- Accepted.

Context:

- The frontend is already a polished prototype. Replacing mock data all at once risks regressions and contract drift.

Decision:

- Introduce typed API contracts, realtime event reducer, and route-by-route mock replacement.

Alternatives considered:

- Rewrite frontend after backend.
- Keep mock state and patch in backend calls ad hoc.

Consequences:

- Preserves UI quality.
- Supports incremental integration and testing.
- Requires careful DTO generation or schema synchronization.

Risks:

- Temporary mock/real hybrid complexity.

Source basis:

- Next.js App Router.
- Next.js Fetching Data.
- Next.js Route Handlers.
- Prisma data model and client docs if NestJS/Prisma is used.

## 3. Source Gaps and Watch Items

- OpenAI Realtime Agents are marked as beta in official SDK docs, so ClinMira should remain text-first for MVP and treat voice as feature-flagged future work.
- pgvector is primary project documentation rather than PostgreSQL core documentation; it is acceptable for initial vector search planning but should be reviewed again before implementation.
- DICOMweb is future-facing only. MVP should not claim DICOM integration.
- FHIR is used as inspiration only. MVP should not claim FHIR compliance.
- OpenAI Docs MCP tooling was not available in this environment, so OpenAI-specific source review used official OpenAI web documentation domains and official SDK docs.

## 4. Additional Official Sources for Governance Upgrade

### OWASP Top 10 for LLM Applications

- Name: OWASP Top 10 for Large Language Model Applications
- Official URL: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Relevant concept: Prompt injection, insecure/improper output handling, sensitive information disclosure, supply chain risk, model denial of service/unbounded consumption, excessive agency, system prompt leakage, vector/embedding weaknesses, misinformation/overreliance.
- Why it matters for ClinMira: ClinMira is an agentic LLM application with tools, hidden facts, scoring, safety, and student-facing outputs.
- Implementation implication: Security tests must cover prompt injection, hidden diagnosis extraction, tool abuse, scoring manipulation, output validation, and denial-of-wallet.
- Risk if ignored: A student could bypass safety, reveal hidden facts, manipulate scores, or trigger excessive model costs.

### NIST AI RMF

- Name: NIST AI Risk Management Framework
- Official URL: https://www.nist.gov/itl/ai-risk-management-framework
- Relevant concept: Govern, Map, Measure, Manage framework for AI risk.
- Why it matters for ClinMira: Medical-education-adjacent AI needs governance, accountability, validation, and human oversight even with synthetic data.
- Implementation implication: Maintain AI risk register, eval evidence, faculty oversight, review logs, and deployment gates.
- Risk if ignored: The product may be technically impressive but institutionally untrustworthy.

### NIST Generative AI Profile

- Name: NIST AI 600-1: Artificial Intelligence Risk Management Framework: Generative Artificial Intelligence Profile
- Official URL: https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf
- Relevant concept: Generative AI-specific risks and controls layered onto AI RMF.
- Why it matters for ClinMira: Patient Twin responses, debriefing, and scenario authoring are generative AI features.
- Implementation implication: Add red-team tests, content provenance, disclosure, human review, and risk measurement.
- Risk if ignored: GenAI-specific risks such as hallucination, overreliance, and synthetic content misuse may be under-controlled.

### WCAG 2.2

- Name: Web Content Accessibility Guidelines 2.2
- Official URL: https://www.w3.org/TR/WCAG22/
- Relevant concept: Accessibility success criteria for perceivable, operable, understandable, and robust web content.
- Why it matters for ClinMira: Universities require accessible educational software for students and faculty.
- Implementation implication: Target WCAG 2.2 AA where reasonable, with keyboard, focus, contrast, screen reader, reduced motion, and text overflow checks.
- Risk if ignored: ClinMira may fail university procurement or exclude learners.

### 1EdTech LTI / LTI Advantage

- Name: 1EdTech Learning Tools Interoperability and LTI Advantage
- Official URL: https://www.1edtech.org/standards/lti
- Relevant concept: LMS launch, roles, names/role provisioning, assignment and grade services, trusted learning platform integration.
- Why it matters for ClinMira: University buyers expect LMS interoperability, role mapping, cohort/course launch, and possible grade passback.
- Implementation implication: Design institution, cohort, enrollment, role, assignment, and grade-passback readiness without implementing full LTI in MVP.
- Risk if ignored: Enterprise university adoption becomes harder even if core simulation is strong.

### PostgreSQL Row Level Security

- Name: PostgreSQL Row Security Policies
- Official URL: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Relevant concept: Row-level security policies can restrict which rows are returned or modified; default deny applies when enabled without policy.
- Why it matters for ClinMira: Tenant isolation is core to university deployments.
- Implementation implication: Evaluate RLS as defense-in-depth for production while keeping application-level tenant checks.
- Risk if ignored: Cross-tenant data exposure risk increases.

### OpenAPI Specification

- Name: OpenAPI Specification
- Official URL: https://spec.openapis.org/oas/
- Relevant concept: Standard interface description for HTTP APIs.
- Why it matters for ClinMira: Contract-first API design prevents frontend/backend drift.
- Implementation implication: API/BFF routes must produce versioned OpenAPI contracts, generated TypeScript DTOs, and compatibility tests.
- Risk if ignored: Integration turns into ad hoc payload drift and shallow prototype behavior.

### Redis Streams Consumer Groups

- Name: Redis Streams
- Official URL: https://redis.io/docs/latest/develop/data-types/streams/
- Relevant concept: Streams support `XREAD`, `XREADGROUP`, acknowledgements, trimming, and consumer-group patterns.
- Why it matters for ClinMira: Realtime replay and publisher/consumer coordination need stronger semantics than Pub/Sub alone.
- Implementation implication: Use persistent PostgreSQL event log as truth and optionally Redis Streams for replay/consumer coordination.
- Risk if ignored: Realtime updates can be lost or duplicated without recovery strategy.

### NestJS Validation/OpenAPI/Guards

- Name: NestJS Pipes, Guards, Interceptors, OpenAPI
- Official URLs: https://docs.nestjs.com/pipes, https://docs.nestjs.com/guards, https://docs.nestjs.com/interceptors, https://docs.nestjs.com/openapi/introduction
- Relevant concept: Request validation, authorization, cross-cutting concerns, and OpenAPI integration.
- Why it matters for ClinMira: API/BFF must be strict, typed, tenant-scoped, and observable.
- Implementation implication: Use validation pipes, guards, interceptors, and OpenAPI generation as part of API governance.
- Risk if ignored: Backend becomes weak CRUD endpoints with inconsistent validation/auth.

### Prisma Transactions and Migrations

- Name: Prisma Transactions and Migrations
- Official URLs: https://www.prisma.io/docs/orm/prisma-client/queries/transactions, https://www.prisma.io/docs/orm/prisma-migrate
- Relevant concept: Transactional operations and schema migration workflow.
- Why it matters for ClinMira: API/BFF data writes must align with PostgreSQL transactions, outbox, and migration discipline.
- Implementation implication: Transactional outbox and state mutation flows must use database transactions carefully.
- Risk if ignored: Lost events, inconsistent state, and migration drift.

### OpenTelemetry Semantic Conventions

- Name: OpenTelemetry Semantic Conventions
- Official URL: https://opentelemetry.io/docs/concepts/semantic-conventions/
- Relevant concept: Common names for traces, metrics, logs, resources, and operations.
- Why it matters for ClinMira: API, Temporal, Redis, DB, agent, and frontend telemetry must correlate cleanly.
- Implementation implication: Use semantic conventions for HTTP, DB, messaging, and custom agent/session attributes.
- Risk if ignored: Observability data becomes difficult to query or compare.

### Pydantic JSON Schema

- Name: Pydantic JSON Schema
- Official URL: https://docs.pydantic.dev/latest/concepts/json_schema/
- Relevant concept: Python model schemas can generate JSON Schema for validation and documentation.
- Why it matters for ClinMira: Python agent workers need strict schemas aligned with OpenAPI/events.
- Implementation implication: Agent inputs/outputs should be Pydantic-validated and versioned.
- Risk if ignored: Python workers drift from API/frontend contracts.

## 5. Additional Architecture Decision Records

### ADR-013: Use Transactional Outbox for Reliable Realtime Events

Status:

- Accepted.

Context:

- ClinMira cannot lose safety warnings, patient messages, timeline events, imaging results, scores, or faculty review events.

Decision:

- Write state mutation and outbox event in the same PostgreSQL transaction; publish asynchronously to Redis/WebSocket/SSE.

Alternatives considered:

- Direct WebSocket emit after DB write.
- Redis Pub/Sub as source of truth.
- Poll-only frontend.

Consequences:

- Realtime becomes recoverable.
- Adds publisher worker and outbox cleanup.

Risks:

- Duplicate delivery if consumers are not idempotent.

Source basis:

- PostgreSQL transactions.
- Redis Pub/Sub delivery caveat.
- Redis Streams consumer/replay concepts.

Implementation implication:

- Add `outbox_events`, publisher, retry, and duplicate handling.

Test implication:

- Crash-after-commit and duplicate-publish tests are required.

### ADR-014: Use Persistent Event Log for Session Replay

Status:

- Accepted.

Context:

- Virtual Clinic sessions need reconnect replay, audit, debrief evidence, and debugging.

Decision:

- Store replayable session events in `event_log` with sequence and schema version.

Alternatives considered:

- Rely only on Redis Streams.
- Reconstruct entirely from domain tables.

Consequences:

- Easier frontend replay and faculty audit.
- Requires event schema governance.

Risks:

- Event payloads could expose hidden facts if redaction is ignored.

Source basis:

- PostgreSQL source-of-truth design.
- Redis Pub/Sub/Streams official docs.

Implementation implication:

- Every student-visible event needs role-aware payload and sequence.

Test implication:

- Replay tests and redaction tests are release gates.

### ADR-015: Use Agent Evaluation Harness Before Live Agent Expansion

Status:

- Accepted.

Context:

- Agent prompts and model choices can regress silently.

Decision:

- Require golden scenarios, safety tests, hidden fact tests, debrief grounding, prompt injection tests, and cost/latency regression before live expansion.

Alternatives considered:

- Manual prompt review only.
- Faculty review only after pilot.

Consequences:

- Higher implementation discipline.
- Safer agent changes.

Risks:

- Eval suite maintenance burden.

Source basis:

- OpenAI guardrails/tracing.
- NIST AI RMF measure/manage concepts.
- OWASP LLM risk categories.

Implementation implication:

- Add eval data model and CI gates.

Test implication:

- Hidden fact leakage and unsafe accepted treatment must be zero.

### ADR-016: Use OWASP LLM Top 10 as LLM Security Baseline

Status:

- Accepted.

Context:

- ClinMira uses LLMs with tools, hidden facts, scoring, and safety-critical outputs.

Decision:

- Map LLM security tests and controls to OWASP LLM Top 10 categories.

Alternatives considered:

- Traditional web security only.
- Prompt-only security review.

Consequences:

- Better coverage for prompt injection, excessive agency, output handling, sensitive disclosure, and unbounded consumption.

Risks:

- OWASP categories evolve; docs must be reviewed periodically.

Source basis:

- OWASP Top 10 for LLM Applications.

Implementation implication:

- Security red-team suite is required before pilot.

Test implication:

- Prompt injection, hidden fact extraction, tool abuse, and cost abuse tests block release.

### ADR-017: Use NIST AI RMF / GenAI Profile for Governance

Status:

- Accepted.

Context:

- Medical-education AI requires governance and accountability, not only technical tests.

Decision:

- Use NIST AI RMF and GenAI Profile concepts for govern/map/measure/manage, validation, transparency, and oversight.

Alternatives considered:

- No formal AI governance framework.

Consequences:

- Stronger institutional readiness.
- Adds documentation and review work.

Risks:

- Overhead if applied too bureaucratically for MVP.

Source basis:

- NIST AI RMF.
- NIST AI 600-1 Generative AI Profile.

Implementation implication:

- Maintain risk register, eval evidence, faculty review, and deployment decision logs.

Test implication:

- Pilot readiness includes governance evidence.

### ADR-018: Use WCAG 2.2 AA as Accessibility Target

Status:

- Accepted.

Context:

- ClinMira is education software for universities and should support accessibility requirements.

Decision:

- Target WCAG 2.2 AA where reasonable.

Alternatives considered:

- Basic visual QA only.
- Accessibility deferred until post-pilot.

Consequences:

- Better university readiness and learner inclusion.

Risks:

- Requires manual testing beyond automation.

Source basis:

- W3C WCAG 2.2.

Implementation implication:

- Add keyboard, focus, contrast, screen reader, reduced-motion, and EN/TR overflow checks.

Test implication:

- Accessibility smoke tests are pilot gates.

### ADR-019: Prepare LTI/LTI Advantage for University LMS Integration

Status:

- Accepted as future-readiness, not MVP implementation.

Context:

- Universities often expect LMS launch, role mapping, course/cohort mapping, and grade passback.

Decision:

- Design data model and product flow with LTI/LTI Advantage readiness.

Alternatives considered:

- Ignore LMS integration until after pilot.

Consequences:

- Easier enterprise sales and pilot planning.

Risks:

- Premature implementation could distract from core simulation.

Source basis:

- 1EdTech LTI standards.

Implementation implication:

- Keep institution/cohort/enrollment/role/grade entities compatible with future LTI mapping.

Test implication:

- Market readiness checklist includes LTI launch/role/grade-passback plan.

### ADR-020: Use Explicit Model Routing and Cost Budgets

Status:

- Accepted.

Context:

- Multi-agent systems can become slow and expensive if every turn runs strong models.

Decision:

- Define model routing, token budgets, cost/session budgets, and alerting.

Alternatives considered:

- One model for all tasks.
- Cost monitoring after production.

Consequences:

- Better scalability and predictable pricing.

Risks:

- Too aggressive cost optimization can reduce feedback quality.

Source basis:

- OpenAI Agents SDK orchestration/performance considerations.
- OWASP unbounded consumption risk.

Implementation implication:

- Persist model, tokens, cost estimate, and routing reason for every model run.

Test implication:

- Cost regression tests block release beyond threshold.

### ADR-021: Use Contract-First API and Schema Versioning

Status:

- Accepted.

Context:

- Frontend, API/BFF, Python workers, events, Temporal payloads, and agent outputs must not drift.

Decision:

- Use OpenAPI, generated TypeScript types, Pydantic schemas, event schema versions, and compatibility tests.

Alternatives considered:

- Handwritten DTOs only.
- Contract updates after implementation.

Consequences:

- More upfront contract work.
- Safer integration.

Risks:

- Generated contracts can lag if CI does not enforce them.

Source basis:

- OpenAPI Specification.
- Pydantic JSON Schema.
- NestJS OpenAPI.

Implementation implication:

- Add `contract_versions` and CI contract checks.

Test implication:

- Contract drift blocks release.

### ADR-022: Use Context Firewall for Agent Visibility Control

Status:

- Accepted.

Context:

- Prompt instructions are not enough to prevent hidden fact leakage.

Decision:

- Build a context firewall that controls each agent's visible state and hidden fact access.

Alternatives considered:

- Give agents full case state and ask them not to reveal it.

Consequences:

- Stronger privacy and simulation integrity.

Risks:

- Under-informing Safety Agent if policy is too restrictive.

Source basis:

- OWASP prompt injection/sensitive disclosure risks.
- OpenAI guardrails and tools.

Implementation implication:

- Context assembler must be a tested service with visibility policy ids.

Test implication:

- Persona hidden fact context must be zero.

### ADR-023: Use Clinical Fact Ledger as Grounding Source

Status:

- Accepted.

Context:

- ClinMira's core rule is that LLMs can phrase answers but cannot invent clinical facts.

Decision:

- Maintain a fact ledger for all clinical claims and require output grounding.

Alternatives considered:

- Transcript-only grounding.
- Prompt-based "do not hallucinate" instruction.

Consequences:

- Stronger debrief, faculty review, and patient consistency.

Risks:

- Fact ledger authoring effort.

Source basis:

- OpenAI structured outputs.
- PostgreSQL source-of-truth architecture.

Implementation implication:

- Add `fact_ledger` and `used_fact_ids` to agent outputs.

Test implication:

- Unsupported clinical facts block release.

### ADR-024: Use Reasoning Graph for Debrief and Faculty Analytics

Status:

- Accepted.

Context:

- Debrief and faculty dashboards need more than transcript summaries.

Decision:

- Represent hypotheses, evidence, missed evidence, unsafe jumps, diagnosis, treatment, and rubric mapping as graph nodes/edges.

Alternatives considered:

- Free-form debrief text only.

Consequences:

- Better mistake replay and cohort analytics.

Risks:

- Graph complexity if over-modeled.

Source basis:

- Faculty rubric/evaluation architecture.
- NIST measurement/accountability concepts.

Implementation implication:

- Add reasoning graph nodes/edges and evaluator mapping rules.

Test implication:

- Debrief claims must cite graph/fact/timeline evidence.

### ADR-025: Use Faculty Calibration Loop Before Market Pilot

Status:

- Accepted.

Context:

- Faculty trust is decisive for adoption.

Decision:

- Run calibration with faculty reviewers before serious pilot.

Alternatives considered:

- Trust evaluator agent scores.
- Wait for pilot feedback.

Consequences:

- Better rubric quality and buyer trust.

Risks:

- Slower pilot readiness.

Source basis:

- NIST AI governance and human oversight.
- 1EdTech market context for institutional evaluation.

Implementation implication:

- Track faculty agreement, overrides, and disagreement handling.

Test implication:

- Faculty agreement threshold must be met before market pilot.

### ADR-026: Use Redis Only as Coordination Layer, Not Source of Truth

Status:

- Accepted.

Context:

- Redis is excellent for hot state and messaging but Pub/Sub delivery can be at-most-once.

Decision:

- Use Redis for cache, presence, fanout, streams, and rate limiting; never as durable clinical source of truth.

Alternatives considered:

- Redis session state as primary truth.

Consequences:

- More reliable recovery.

Risks:

- Extra PostgreSQL/event-log reads during replay.

Source basis:

- Redis Pub/Sub.
- Redis Streams.
- PostgreSQL transactions.

Implementation implication:

- Realtime rebuilds from PostgreSQL event log/snapshots.

Test implication:

- Redis loss does not lose clinical/session truth.

### ADR-027: Use OpenTelemetry + Agent Tracing From Early Stages

Status:

- Accepted and reinforces ADR-011.

Context:

- Agentic platforms are difficult to debug without distributed traces, metrics, logs, and agent-run metadata.

Decision:

- Correlate OpenTelemetry spans with OpenAI Agents SDK traces, Temporal workflow ids, session ids, turn ids, and event ids from early stages.

Alternatives considered:

- Add tracing after MVP.

Consequences:

- Better safety audit, debugging, cost tracking, and production readiness.

Risks:

- Sensitive data exposure if redaction is weak.

Source basis:

- OpenTelemetry semantic conventions.
- OpenAI Agents SDK tracing.

Implementation implication:

- Persist trace ids, agent run ids, model/tool metadata, redaction status, and latency/cost metrics.

Test implication:

- Trace correlation and redaction tests are required.

## 6. Source Refresh Register

Refresh date: `2026-06-04`

This register records the current official-source status used for the final architecture hardening pass. Sources marked evolving must be refreshed before implementation milestones that depend on them.

| Source | Official URL | Volatility | Refresh Rule | Architecture Impact |
| --- | --- | --- | --- | --- |
| OpenAI Agents SDK Intro | https://openai.github.io/openai-agents-python/ | Evolving | Refresh before Milestone 6.5 and every live-agent model/runtime upgrade. | Supports agents, agents-as-tools, guardrails, sessions, tracing, realtime agents. |
| OpenAI Agent Orchestration | https://openai.github.io/openai-agents-python/multi_agent/ | Evolving | Refresh before orchestrator implementation. | Supports manager/orchestrator and bounded specialist agents. |
| OpenAI Tools | https://openai.github.io/openai-agents-python/tools/ | Evolving | Refresh before tool registry implementation. | Supports function tools and agents-as-tools boundaries. |
| OpenAI Handoffs | https://openai.github.io/openai-agents-python/handoffs/ | Evolving | Refresh before any handoff use. | Handoffs are limited to explicit mode changes, not default session flow. |
| OpenAI Guardrails | https://openai.github.io/openai-agents-python/guardrails/ | Evolving | Refresh before safety/guardrail implementation. | Supports input/output/tool guardrail policy and tripwires. |
| OpenAI Tracing | https://openai.github.io/openai-agents-python/tracing/ | Evolving | Refresh before trace/redaction implementation. | Supports agent trace correlation and debugging. |
| OpenAI Realtime | https://openai.github.io/openai-agents-python/realtime/quickstart/ | Evolving | Refresh before Milestone 16 voice/realtime enablement. | Future voice path remains feature-flagged until refreshed. |
| OpenAI Responses API | https://platform.openai.com/docs/api-reference/responses | Evolving | Refresh before direct Responses API paths. | Structured model interactions and streaming background. |
| OpenAI Structured Outputs | https://platform.openai.com/docs/guides/structured-outputs | Evolving | Refresh before schema-constrained output implementation. | Basis for structured specialist outputs. |
| OpenAI Streaming | https://platform.openai.com/docs/guides/streaming-responses | Evolving | Refresh before patient message streaming. | Supports streaming UI with backend reconciliation. |
| Temporal Workflows | https://docs.temporal.io/workflows | Stable with SDK evolution | Refresh before Temporal implementation. | Workflow replay and deterministic workflow rules. |
| Temporal Activities | https://docs.temporal.io/activities | Stable with SDK evolution | Refresh before workflow/activity code. | LLM/API/DB/file work belongs in Activities. |
| Temporal Workers | https://docs.temporal.io/workers | Stable with SDK evolution | Refresh before worker/task queue implementation. | Task queue/worker scaling. |
| Temporal Retry Policies | https://docs.temporal.io/encyclopedia/retry-policies | Stable | Refresh before retry policy implementation. | Bounded retries and idempotency. |
| PostgreSQL Transactions | https://www.postgresql.org/docs/current/tutorial-transactions.html | Stable; current docs can advance by major version | Refresh before SQL migration baseline. | Atomic domain mutation plus outbox/event writes. |
| PostgreSQL Constraints | https://www.postgresql.org/docs/current/ddl-constraints.html | Stable | Refresh before schema implementation. | Relational integrity and tenant/idempotency constraints. |
| PostgreSQL Indexes | https://www.postgresql.org/docs/current/indexes.html | Stable | Refresh before index implementation. | Composite/partial index strategy. |
| PostgreSQL JSON Types | https://www.postgresql.org/docs/current/datatype-json.html | Stable | Refresh before JSONB payload decisions. | JSONB only for controlled structured payloads. |
| PostgreSQL Explicit Locking | https://www.postgresql.org/docs/current/explicit-locking.html | Stable | Refresh before high-contention mutation code. | Row/table lock planning. |
| PostgreSQL Row Security | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | Stable | Refresh before optional production RLS. | Defense-in-depth tenant isolation. |
| Redis Pub/Sub | https://redis.io/docs/latest/develop/pubsub/ | Stable/evolving | Refresh before realtime gateway implementation. | Pub/Sub is ephemeral and not source of truth. |
| Redis Streams | https://redis.io/docs/latest/develop/data-types/streams/ | Stable/evolving | Refresh before Redis-backed replay/consumer use. | Streams may support consumer tracking; PostgreSQL remains authoritative. |
| Redis INCR | https://redis.io/docs/latest/commands/incr/ | Stable | Refresh before rate-limit implementation. | Rate limit counters and budgets. |
| Redis Hashes | https://redis.io/docs/latest/develop/data-types/hashes/ | Stable | Refresh before hot status cache implementation. | Short-lived session/agent status cache. |
| Next.js App Router | https://nextjs.org/docs/app | Evolving; latest observed 16.2.2 | Refresh before frontend integration plan. | App Router, Server/Client component boundary, loading/streaming states. |
| Next.js Route Handlers | https://nextjs.org/docs/app/getting-started/route-handlers | Evolving | Refresh before frontend proxy/BFF choices. | Optional route handlers and API proxy boundaries. |
| Next.js Data Fetching | https://nextjs.org/docs/app/getting-started/fetching-data | Evolving | Refresh before page integration. | Server/client fetching and Suspense/loading behavior. |
| Next.js Server/Client Components | https://nextjs.org/docs/app/getting-started/server-and-client-components | Evolving | Refresh before component integration. | Interactive Virtual Clinic remains client-controlled where needed. |
| NestJS Modules | https://docs.nestjs.com/modules | Stable/evolving | Refresh before API/BFF scaffold. | Modular service boundaries. |
| NestJS Controllers | https://docs.nestjs.com/controllers | Stable/evolving | Refresh before route implementation. | Controller organization. |
| NestJS WebSocket Gateways | https://docs.nestjs.com/websockets/gateways | Stable/evolving | Refresh before realtime gateway. | WebSocket architecture. |
| NestJS Guards/Pipes/OpenAPI | https://docs.nestjs.com/guards | Stable/evolving | Refresh before auth/validation/contracts. | RBAC, validation, OpenAPI governance. |
| FastAPI Features | https://fastapi.tiangolo.com/features/ | Stable/evolving | Refresh only if FastAPI-only alternative is revived. | Alternative backend path, not primary. |
| Prisma Data Model | https://www.prisma.io/docs/orm/prisma-schema/data-model/models | Evolving | Refresh before Prisma Client usage. | Typed API/BFF data access mirror only. |
| Prisma Client CRUD | https://www.prisma.io/docs/orm/prisma-client/queries/crud | Evolving | Refresh before query layer implementation. | Typed queries. |
| Prisma Migrate | https://www.prisma.io/docs/orm/prisma-migrate | Evolving | Refresh before migration tooling setup. | Explicitly not schema authority; SQL-first migrations own production schema. |
| Prisma Transactions | https://www.prisma.io/docs/orm/prisma-client/queries/transactions | Evolving | Refresh before API transaction use. | Supports typed transaction calls against SQL-owned schema. |
| MCP Introduction | https://modelcontextprotocol.io/docs/getting-started/intro | Evolving | Refresh before MCP-style integrations. | Tool/resource protocol readiness. |
| OpenAI Agents SDK MCP | https://openai.github.io/openai-agents-python/mcp/ | Evolving | Refresh before MCP tool server use. | Future standardized tool integration. |
| OpenTelemetry Semantic Conventions | https://opentelemetry.io/docs/concepts/semantic-conventions/ | Evolving | Refresh before telemetry naming. | Trace/metric/log naming baseline. |
| Pydantic JSON Schema | https://docs.pydantic.dev/latest/concepts/json_schema/ | Stable/evolving | Refresh before agent schema generation. | Pydantic schemas for Python worker contracts. |
| Python Documentation | https://docs.python.org/3/ | Stable/evolving by release | Refresh before runtime version lock. | Python agent worker runtime. |
| pgvector Project Docs | https://github.com/pgvector/pgvector | Evolving | Refresh before vector feature implementation. | Optional early vector search. |
| FHIR Overview | https://hl7.org/fhir/overview.html | Stable/evolving by release | Refresh before any FHIR claim/integration. | FHIR-inspired only; no MVP compliance claim. |
| DICOMweb Standard | https://dicom.nema.org/medical/dicom/current/output/chtml/part18/PS3.18.html | Stable/evolving by standard edition | Refresh before DICOMweb integration. | Curated synthetic imaging now; DICOMweb future only. |
| OWASP Top 10 for LLM Applications | https://owasp.org/www-project-top-10-for-large-language-model-applications/ | Evolving | Refresh before Milestone 7.5 and security releases. | Prompt injection, insecure output handling, denial-of-wallet, excessive agency. |
| NIST AI RMF | https://www.nist.gov/itl/ai-risk-management-framework | Stable governance baseline | Refresh before governance review. | Govern/map/measure/manage framework. |
| NIST Generative AI Profile | https://www.nist.gov/itl/ai-risk-management-framework | Evolving governance baseline | Refresh before safety/governance review. | GenAI-specific risk controls. |
| WCAG 2.2 | https://www.w3.org/TR/WCAG22/ | Stable | Refresh before accessibility audit. | WCAG 2.2 AA-oriented pilot gate. |
| 1EdTech LTI | https://www.1edtech.org/standards/lti | Stable/evolving | Refresh before LMS integration planning. | LTI readiness only in MVP. |
| 1EdTech LTI Advantage | https://www.1edtech.org/standards/lti/lti-advantage | Stable/evolving | Refresh before grade/passback planning. | AGS/NRPS/DL readiness; no MVP claim. |
| OpenAPI Specification | https://spec.openapis.org/oas/latest.html | Stable/evolving | Refresh before contract tooling. | API contract-first governance. |

## 7. Final Architecture Decision Records

### ADR-028: Use SQL-First Migrations as the Single Migration Authority

Status:

- Accepted.

Context:

- ClinMira requires PostgreSQL-specific constraints, partial indexes, tenant boundaries, outbox/event log guarantees, row-security options, and SQL-reviewable migration safety across NestJS and Python workers.

Decision:

- SQL migration files are the canonical database schema authority. Prisma Client may mirror schema for typed TypeScript queries; Prisma Migrate does not own production schema. Python workers do not generate or apply migrations.

Alternatives considered:

- Prisma Migrate owns schema.
- Separate TypeScript and Python migration paths.

Consequences:

- More explicit SQL review and migration metadata.
- Better cross-service consistency and PostgreSQL feature control.

Risks:

- Prisma schema can drift if CI does not enforce mirror freshness.

Implementation implication:

- Add SQL migration registry, `contract_versions`, Prisma mirror checks, and migration tests.

Test implication:

- CI blocks on schema drift, migration apply failure, missing rollback/forward-fix plan, or tenant isolation regression.

Owner:

- Backend Owner with Architecture Owner approval.

### ADR-029: Block Release Without Agent Eval Harness

Status:

- Accepted.

Context:

- Prompt quality and demos are not sufficient for clinical education safety or scoring trust.

Decision:

- Live agents cannot be broadly enabled until golden, adversarial, grounding, safety, latency, and cost eval suites produce stored evidence.

Alternatives considered:

- Manual spot checks.
- Add evals after pilot feedback.

Consequences:

- Slower initial rollout; much safer model/prompt upgrades.

Risks:

- Eval suites can become stale without versioning.

Implementation implication:

- Add `eval_suites`, `eval_cases`, `eval_runs`, `eval_results`, `eval_failures`, and dashboard evidence.

Test implication:

- Hidden fact leakage, unsafe accepted treatment, unapproved imaging, unsupported critical debrief claims, and release-blocking prompt injection must be `0`.

Owner:

- Safety Owner + Agent Runtime Owner.

### ADR-030: Block Release Without Transactional Outbox and Event Replay

Status:

- Accepted.

Context:

- Direct WebSocket emits and Redis Pub/Sub can lose events after crashes or disconnects.

Decision:

- Critical mutations must write domain state, `event_log`, and `outbox_events` in one PostgreSQL transaction before realtime publish.

Alternatives considered:

- Emit directly after commit.
- Rely on Redis Pub/Sub only.

Consequences:

- More backend infrastructure but reliable realtime recovery.

Risks:

- Publisher lag and duplicate delivery require monitoring/dedupe.

Implementation implication:

- Add outbox publisher, event sequence numbers, replay endpoint, dead-letter policy, and frontend reducer dedupe.

Test implication:

- Crash-after-commit, duplicate event, replay gap, reconnect, and role-redaction tests are release gates.

Owner:

- Backend Owner + Platform/Observability Owner.

### ADR-031: Block Release Without Contract Tests

Status:

- Accepted.

Context:

- Frontend, API/BFF, Python worker, Temporal payload, event schema, and agent output drift can silently break the simulation.

Decision:

- Contract-first development is mandatory. API/event/Pydantic/TypeScript/Temporal/tool schemas must be versioned and tested in CI.

Alternatives considered:

- Handwritten DTOs only.
- Update contracts after implementation.

Consequences:

- Upfront contract work increases, but integration failures decrease.

Risks:

- Generated contract packages can lag if not automated.

Implementation implication:

- Add schema generation and freshness checks to Milestone 2.5.

Test implication:

- Contract drift blocks merge/deploy.

Owner:

- Architecture Owner + Contracts Owner.

### ADR-032: Block Release Without Security Red-Team Suite

Status:

- Accepted.

Context:

- ClinMira is vulnerable to LLM-specific attacks such as prompt injection, excessive agency, hidden fact extraction, tool abuse, and denial-of-wallet.

Decision:

- OWASP LLM Top 10-mapped adversarial testing is mandatory before pilot and before material model/prompt/tool upgrades.

Alternatives considered:

- Rely on vendor model safety.
- Manual security review only.

Consequences:

- Security work becomes measurable and repeatable.

Risks:

- Red-team prompts need ongoing refresh as attackers adapt.

Implementation implication:

- Maintain adversarial prompt corpus, remediation log, and regression suite.

Test implication:

- Any successful release-blocking bypass is added to regression tests before closure.

Owner:

- Security Owner + Safety Owner.

### ADR-033: Block Pilot Without Faculty Calibration

Status:

- Accepted.

Context:

- Educational scoring and case quality require faculty trust, not only automated scoring.

Decision:

- Pilot cases must pass faculty calibration thresholds for rubric agreement, override rate, reviewer disagreement, and safety false negatives before serious university pilot.

Alternatives considered:

- Use evaluator scores directly.
- Calibrate after pilot.

Consequences:

- Pilot readiness depends on faculty availability and evidence.

Risks:

- Initial thresholds may need revision after first pilot cohort.

Implementation implication:

- Add calibration workflows, reports, reviewer assignments, and revision policy.

Test implication:

- Calibration report is required evidence for Milestone 10.5 and 17.5.

Owner:

- Faculty/Clinical Owner.

### ADR-034: Use Feature Flags for Live Agents, Voice, Debrief, and Scenario Publish

Status:

- Accepted.

Context:

- High-risk features must be controlled by tenant, environment, and gate evidence.

Decision:

- `live_agents`, `voice_mode`, `evaluator_debrief`, `scenario_publish`, `faculty_review`, `agent_control`, and `advanced_imaging` are feature-flagged with audit visibility.

Alternatives considered:

- Global enablement at deploy time.
- UI-only toggles.

Consequences:

- Safer rollout and rollback.

Risks:

- Misconfigured flags can create inconsistent product behavior.

Implementation implication:

- Feature flags must be tenant-aware and audited; safety features cannot be disabled by ordinary flags in production.

Test implication:

- Flag matrix tests prove disabled high-risk features cannot leak.

Owner:

- Product/Market Owner + Platform/Observability Owner.

### ADR-035: Use Synthetic-Only Data for MVP

Status:

- Accepted.

Context:

- MVP is medical-education adjacent and does not need real patient data.

Decision:

- MVP must use synthetic educational cases, synthetic patients, synthetic imaging/audio assets, and clear non-medical-advice framing.

Alternatives considered:

- Import real patient cases with de-identification.

Consequences:

- Lower privacy/compliance burden and safer iteration.

Risks:

- Synthetic realism needs faculty review to maintain educational value.

Implementation implication:

- Product copy, data model, onboarding, and asset workflows must reject real patient data in MVP.

Test implication:

- Upload/publish workflows include real-patient-data warnings and review gates where applicable.

Owner:

- Product/Market Owner + Faculty/Clinical Owner + Security Owner.

### ADR-036: Require Evidence IDs for Every Debrief Claim

Status:

- Accepted.

Context:

- Debriefs can strongly shape student learning and must not become persuasive hallucinated summaries.

Decision:

- Every debrief claim, score explanation, missed evidence note, and recommended next step must cite fact, rule, event, rubric, graph, or faculty source ids.

Alternatives considered:

- Free-form debrief prose with general rubric alignment.

Consequences:

- Debriefs become auditable and faculty-reviewable.

Risks:

- Evidence mapping adds implementation complexity.

Implementation implication:

- Debrief schemas require evidence ids and unsupported claim filtering.

Test implication:

- Unsupported critical debrief claims must be `0`.

Owner:

- Faculty/Clinical Owner + Agent Runtime Owner.

### ADR-037: Do Not Claim FHIR, DICOMweb, or LTI Compliance in MVP

Status:

- Accepted.

Context:

- Architecture is inspired by clinical and education standards, but implementation scope does not include formal compliance/integration.

Decision:

- MVP may be FHIR-inspired, DICOMweb-ready, and LTI-ready, but product and technical documentation must not claim compliance or production integration until implemented and tested.

Alternatives considered:

- Market future readiness as compliance.

Consequences:

- More honest buyer messaging and lower procurement risk.

Risks:

- Enterprise buyers may ask for integrations earlier.

Implementation implication:

- Data model preserves mapping hooks; integration claims remain blocked by future milestone decisions.

Test implication:

- Pilot acceptance checks product copy and onboarding for non-MVP compliance claims.

Owner:

- Product/Market Owner + Architecture Owner.

### ADR-038: Use Initial Pilot SLO Targets Before Full Production Targets

Status:

- Accepted.

Context:

- Full production targets need implementation load data, but pilot readiness cannot proceed with vague SLO placeholders.

Decision:

- Use explicit initial pilot SLOs in `10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md`; revise after Milestone 14.5 load/telemetry evidence and before Milestone 17.5.

Alternatives considered:

- Leave targets undefined until implementation.
- Declare aggressive production SLOs without evidence.

Consequences:

- The team can build dashboards, alerts, and tests now while preserving evidence-based refinement.

Risks:

- Initial assumptions may be too high or low.

Implementation implication:

- SLO dashboards and release gates use initial targets until the SLO owner updates them through documented review.

Test implication:

- Milestone 17.5 blocks if pilot SLOs are unmeasured or dashboards missing.

Owner:

- Platform/Observability Owner + Product/Market Owner.
