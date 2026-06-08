# Step 12 - Official Source Refresh and Feature-Flagged OpenAI Integration Planning

## 1. Executive Verdict

STEP 12 PLANNING COMPLETE WITH WARNINGS

Step 12 completed an official OpenAI source refresh and created the architecture plan for future feature-flagged OpenAI integration. No live OpenAI implementation was added. Live OpenAI calls, OpenAI SDK installation, API key usage, live agents, provider runtime behavior, frontend integration, realtime, Redis, WebSocket/SSE, Temporal, production publisher, replay API, debrief/faculty/treatment workflows, imaging interpretation, production auth/RBAC, and active provider/tool-call/model-run schemas remain blocked.

Warnings remain because DB-backed evals still require `CLINMIRA_TEST_DATABASE_URL`, shared contracts typecheck remains unavailable without `tsc` in `shared/contracts`, and final live model selection cannot be made until another official model/pricing refresh happens immediately before future live implementation.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| OpenAI SDK added | No. |
| OpenAI call added | No. |
| API key usage added | No. |
| Live agent enabled | No. |
| Frontend changed | No. |
| Backend API runtime changed | No. |
| Database migration changed | No. |
| Agent-worker provider runtime enabled | No. |
| Redis/realtime added | No. |
| Temporal added | No. |
| Debrief/faculty/treatment workflow added | No. |
| Active OpenAI provider schemas added | No. |
| Tool-call/model-run schemas activated | No. |
| Packages installed | No. |

## 3. Official Sources Reviewed

Retrieved date for all sources: 2026-06-05.

| Source | URL | Area | Decision Impact |
| --- | --- | --- | --- |
| SDKs and CLI | https://developers.openai.com/api/docs/libraries | OpenAI SDKs | Use official Python SDK only in a later approved worker/provider step. |
| Migrate to the Responses API | https://developers.openai.com/api/docs/guides/migrate-to-responses | Responses API | Prefer Responses API for future live text/model provider path; require `store: false`. |
| Responses API reference | https://platform.openai.com/docs/api-reference/responses/create?api-mode=responses | API reference | Provider boundary must be narrow, budgeted, and not source of truth. |
| Agents SDK overview | https://developers.openai.com/api/docs/guides/agents | Agents SDK | Agents SDK is optional future tooling, not a Step 12 runtime dependency. |
| Agents orchestration and handoffs | https://developers.openai.com/api/docs/guides/agents/orchestration | Orchestration | Prefer agents-as-tools under code-owned orchestration; handoffs remain blocked. |
| Agents guardrails and human review | https://developers.openai.com/api/docs/guides/agents/guardrails-approvals | Guardrails | Require input/output/tool guardrails and human review gates for sensitive paths. |
| Agents integrations and observability | https://developers.openai.com/api/docs/guides/agents/integrations-observability | Tracing | Keep trace export disabled until redaction/privacy tests pass. |
| Evaluate agent workflows | https://developers.openai.com/api/docs/guides/agent-evals | Evals | Extend Step 9 with trace, grader, dataset, and live-shadow eval evidence before rollout. |
| Structured model outputs | https://developers.openai.com/api/docs/guides/structured-outputs | Structured outputs | Future outputs must use schema validation and programmatic refusal handling. |
| Function calling | https://developers.openai.com/api/docs/guides/function-calling | Tools | Tool calls remain blocked until contracts, permissions, idempotency, and tests exist. |
| Prompting | https://developers.openai.com/api/docs/guides/prompting | Prompt governance | Prompts must be code-managed/versioned; reusable prompt objects are rejected. |
| Prompt engineering | https://developers.openai.com/api/docs/guides/prompt-engineering | Context and prompt tests | Prompt changes need tests, fixtures, and evals. |
| Safety best practices | https://developers.openai.com/api/docs/guides/safety-best-practices | Safety | Red-team, constrained input/output, HITL, and safety identifiers remain required. |
| Production best practices | https://developers.openai.com/api/docs/guides/production-best-practices | Production/API keys | API keys must remain server-side; usage limits and project controls are required. |
| Cost optimization | https://developers.openai.com/api/docs/guides/cost-optimization | Cost | Require fewer requests/tokens, model allowlists, smaller models only after eval evidence. |
| API pricing | https://openai.com/api/pricing/ | Pricing | Refresh pricing again before live implementation and pilot; do not hard-code model choice now. |
| Model selection | https://developers.openai.com/api/docs/guides/model-selection | Model routing | Optimize accuracy first, then cost/latency under eval evidence. |
| Rate limits | https://developers.openai.com/api/docs/guides/rate-limits/usage-tiers | Usage controls | Add rate-limit, retry, timeout, and no-loop controls before live calls. |
| Data controls | https://developers.openai.com/api/docs/guides/your-data | Privacy/data retention | Use `store: false` by default and do not use OpenAI state as ClinMira source of truth. |

## 4. Integration Decision

Recommended future path:

- Primary future API: OpenAI Responses API.
- Primary future location: Python agent-worker provider boundary.
- Primary future SDK: official OpenAI Python SDK only after a separate approved package/install step.
- Primary orchestration stance: ClinMira backend/worker orchestration owns safety, context, event, audit, cost, and state; model calls are bounded tools, not source of truth.
- Agents SDK stance: optional later wrapper for code-first guardrails/tracing/evals if it can be constrained by ClinMira provider boundary, redaction, and feature flags.
- Prompt stance: prompts are code-managed, versioned helpers with fixtures/evals, not OpenAI reusable prompt objects.
- Storage stance: future provider calls default `store: false`; ClinMira PostgreSQL/event_log/outbox remain source of truth.

Rejected paths:

- No Step 12 SDK install.
- No raw OpenAI HTTP calls.
- No frontend OpenAI calls.
- No API key reads.
- No Chat Completions as primary new live-agent path.
- No Assistants API as state/source-of-truth.
- No autonomous handoffs/swarm.
- No built-in tools without separate contracts.
- No trace export before redaction/privacy tests.
- No live rollout readiness claim.

Live implementation remains blocked because DB-backed evals have not run, source refresh is planning-only, feature flags are not scaffolded yet, provider runtime is disabled, cost/trace gates are not implemented, and no live-agent acceptance gate has passed.

## 5. Feature Flags

All live flags must default off or fail-closed.

| Flag | Default | Requirement |
| --- | --- | --- |
| `CLINMIRA_LIVE_AGENTS_ENABLED` | `false` | Master live-agent gate. |
| `CLINMIRA_OPENAI_PROVIDER_ENABLED` | `false` | OpenAI provider adapter gate. |
| `CLINMIRA_AGENT_NETWORK_ENABLED` | `false` | Outbound provider network gate. |
| `CLINMIRA_AGENT_TOOL_CALLS_ENABLED` | `false` | Model-requested tool-call gate. |
| `CLINMIRA_AGENT_TRACE_EXPORT_ENABLED` | `false` | External trace export gate. |
| `CLINMIRA_AGENT_MAX_COST_USD_PER_RUN` | `0.00` | Zero blocks calls. |
| `CLINMIRA_AGENT_MAX_TOKENS_PER_RUN` | `0` | Zero blocks calls. |
| `CLINMIRA_AGENT_TIMEOUT_MS` | `0` | Zero blocks calls. |
| `CLINMIRA_AGENT_ALLOWED_MODELS` | empty | Empty allowlist blocks calls. |
| `CLINMIRA_AGENT_KILL_SWITCH` | `true` | True blocks all live calls. |

Feature flags cannot disable safety, audit, tenant isolation, hidden fact filtering, source-of-truth rules, event logging, or outbox requirements.

## 6. Safety Gates

Required before any future live model call:

- Step 9 eval thresholds pass.
- Step 10 safety thresholds pass.
- Step 11 no-live/context-firewall tests pass.
- DB-backed evals pass with `CLINMIRA_TEST_DATABASE_URL`.
- Hidden fact leakage equals `0`.
- Prompt-injection hidden fact leakage equals `0`.
- Unsafe action accepted equals `0`.
- Unsupported diagnosis/treatment/imaging/debrief/faculty claims equal `0`.
- Cost cap tests pass.
- Timeout/retry/kill-switch tests pass.
- Trace redaction tests pass.
- Context firewall blocks hidden/faculty/safety/evaluator-only slices.
- Deterministic safety pre-check runs before provider call.
- Deterministic safety post-check runs before persistence or student-visible output.
- No direct DB mutation from agent-worker.
- No frontend mock source usage.
- Provider remains disabled by default.

## 7. Cost Controls

Required controls:

- Per-run max token budget.
- Per-run max USD budget.
- Per-session max model calls.
- Tenant daily/monthly budget.
- Model allowlist.
- Timeout.
- Retry limit.
- Kill switch.
- Audit/event logging for attempted, blocked, completed, failed, and budget-exceeded runs.
- No uncontrolled background loops.
- No unbounded tool-call chains.
- Pricing refresh before implementation and before pilot.
- Cost metrics including model, route reason, token counts, cached tokens, latency, estimated cost, tenant, session, and agent.

## 8. Trace and Redaction Controls

Required trace controls:

- Store redacted traces only.
- Keep external trace export disabled by default.
- Do not store raw hidden facts, hidden diagnosis, faculty notes, system prompts, provider secrets, API keys, tool secrets, raw hidden patient data, real patient data, or frontend mock data.
- Link future traces to `event_log` through backend orchestration, not direct worker DB mutation.
- Include trace id, agent run id, prompt version, schema version, context version, redaction policy version, safety results, token counts, estimated cost, latency, and status.
- Redaction tests must pass before any trace export flag can be enabled.

## 9. Eval Requirements

Future eval additions must cover:

- Hidden fact leakage.
- Prompt injection and system prompt extraction.
- Faculty-only, safety-only, and evaluator-only extraction.
- Unsupported diagnosis, treatment, medication/order, imaging, and debrief claims.
- Unsafe accepted actions.
- Tool-call permission bypass.
- Unauthorized handoff.
- Context firewall failure.
- Structured output schema invalidity.
- Refusal/fallback correctness.
- Cost cap, token cap, timeout, retry, and kill-switch behavior.
- Trace redaction.
- No frontend mock source usage.
- No real patient data usage.
- DB-backed event/outbox/idempotency behavior.
- Model route and prompt version regression.

## 10. Files Changed

| File | Change |
| --- | --- |
| `docs/architecture/13_OPENAI_SOURCE_REFRESH_AND_LIVE_AGENT_PLAN.md` | Added Step 12 official source refresh and live-agent planning gate. |
| `docs/implementation/reports/STEP_12_OPENAI_SOURCE_REFRESH_PLANNING_REPORT.md` | Added Step 12 implementation report. |
| `docs/implementation/IMPLEMENTATION_STATUS.md` | Updated current phase, completed steps, blockers, decisions, and next step. |

## 11. Tests and Checks

| Command | Ran? | Result | Notes |
| --- | --- | --- | --- |
| `pwd` | Yes | Pass | Confirmed `/home/mohammad/Projects/ClinMira-AI`. |
| `git status --short` | Yes | Warning | Dirty repository remains from prior architecture/prototype work. |
| `git diff --stat` | Yes | Warning | Pre-existing tracked docs changes remain; Step 12 adds docs/status only. |
| `git branch --show-current` | Yes | Pass | `main`. |
| `find docs/architecture -maxdepth 4 -type f` | Yes | Pass | Required architecture docs found. |
| `find docs/implementation -maxdepth 4 -type f` | Yes | Pass | Required implementation docs/reports found. |
| `find backend/agent-worker -maxdepth 8 -type f` | Yes | Pass | Worker source/tests found. |
| `find backend/api -maxdepth 8 -type f` | Yes | Warning | Includes existing `node_modules` and `dist`; implementation scans excluded generated/vendor trees. |
| `find backend/evals -maxdepth 6 -type f` | Yes | Pass | Eval harness files found. |
| `find shared/contracts -maxdepth 8 -type f` | Yes | Pass | Shared contract files found. |
| Official OpenAI source refresh | Yes | Pass | Used only official OpenAI domains. Docs MCP was unavailable in this session; official-domain browser fallback was used. |
| Pre-edit forbidden implementation scan | Yes | Pass with docs/test mentions | No active OpenAI/provider/network/direct worker DB/Prisma/compose implementation detected. Docs/tests mention blocked patterns as guardrails. |
| `cd backend/agent-worker && python3 -m unittest discover -s tests` | Yes | Pass | 25 worker tests passed. |
| `npm --prefix backend/api run test` | Yes | Pass | 5 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Yes | Pass | Backend API TypeScript typecheck passed. |
| `npm --prefix backend/api run build` | Yes | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Yes | Pass | 4 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Yes | Blocked | `tsc` not found; no package install authorized for Step 12. |
| `node --test backend/database/tests/*.test.mjs` | Yes | Pass | 10 database test files passed. |
| `node --test backend/evals/tests/*.test.mjs` | Yes | Pass | 6 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Yes | Pass with warning | Status `PASSED`; live-agent gate remains blocked; DB eval skipped because `CLINMIRA_TEST_DATABASE_URL` is not configured. |
| Runtime OpenAI/import/API-key scan | Yes | Pass | No OpenAI imports/calls, provider SDK imports, or API key reads in backend runtime source. |
| Network/provider client scan | Yes | Pass | No HTTP/provider client imports in backend API or agent-worker source. |
| Redis/WebSocket/SSE/Temporal scan | Yes | Pass | No runtime Redis, WebSocket/SSE, or Temporal imports/usages in backend runtime source. |
| Frontend mock source scan | Yes | Pass with warning | Matches are existing docs/tests guardrails only; no backend/worker runtime imports from frontend mock paths. |
| Direct DB mutation from agent-worker scan | Yes | Pass | No SQL/client/direct mutation patterns found in worker source. |
| Prisma/docker compose scan | Yes | Pass | No `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml` found. |
| OpenAI SDK package scan | Yes | Pass | No OpenAI SDK dependency entries found in package/pyproject files. |
| Feature flag documentation scan | Yes | Pass | Required flags, default-off values, zero budgets, empty allowlist, and kill switch true are documented. |
| Source/report/status existence scan | Yes | Pass | Step 12 architecture doc, report, official sources table, final verdict, and strict readiness text exist. |
| Frontend/API runtime/migration diff scan | Yes | Pass with warning | `git diff --name-only -- frontend backend/api/src backend/database/migrations backend/agent-worker/src` returned no tracked Step 12 diff; broader `git status` still shows pre-existing untracked/staged prototype and backend source state. |

## 12. Remaining Warnings

- No live implementation.
- No OpenAI SDK.
- No live OpenAI calls.
- No API key usage.
- No DB-backed evals because `CLINMIRA_TEST_DATABASE_URL` is still absent.
- Shared contracts typecheck may remain blocked until a separate approved dependency setup provides `tsc`.
- No production auth/RBAC.
- No production outbox publisher.
- No replay API/runtime.
- No realtime, Redis, WebSocket, or SSE.
- No frontend integration.
- No debrief/faculty workflow.
- No treatment/order/imaging workflow.
- Existing frontend prototype remains prototype-only and must not become source of truth.
- Model/pricing pages are time-sensitive and must be refreshed again before implementation.

## 13. Step 13 Readiness

Ready for Step 13 as feature-flag scaffolding only.

Step 13 must be limited to fail-closed feature flag declarations, status/reporting, and tests proving live remains disabled. It must not install the OpenAI SDK, import OpenAI, call OpenAI, read API keys, enable network calls, enable live agents, change backend API runtime behavior, modify database migrations, modify frontend, create active provider/tool/model-run schemas, add Redis/realtime, add Temporal, add production publisher/replay API, add debrief/faculty/treatment/imaging workflows, or claim live rollout readiness.

If the roadmap keeps Step 13 reserved for realtime, the next task should be renamed Step 12B - Feature-Flag Scaffolding Only. Realtime remains blocked either way.
