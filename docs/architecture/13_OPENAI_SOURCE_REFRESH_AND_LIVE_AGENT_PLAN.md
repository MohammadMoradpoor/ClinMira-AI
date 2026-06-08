# OpenAI Source Refresh and Live Agent Plan

## 1. Executive Decision

Step 12 is complete as a planning and source-refresh step only. Live OpenAI implementation remains blocked.

ClinMira AI should use a future Python worker provider boundary with the OpenAI Responses API as the primary live model API path when live text agents are eventually approved. The first future implementation step must be feature-flag scaffolding only. It must not install the OpenAI SDK, read API keys, call OpenAI, enable live agents, create active provider schemas, or change runtime behavior.

The official source refresh updates the architecture in three ways:

- The future primary live-model API should be the Responses API, not Chat Completions or Assistants as the primary path.
- OpenAI Agents SDK capabilities are useful for code-first agent workflows, guardrails, tracing, and evaluation, but ClinMira must treat them as bounded provider/orchestration tooling inside our own backend-owned safety, context, event, and audit system.
- OpenAI reusable prompt objects are not a future dependency for ClinMira. OpenAI's prompting docs say prompt creation is being de-emphasized beginning June 3, 2026 and `v1/prompts` is scheduled to shut down on November 30, 2026. ClinMira prompts must be code-managed, versioned, tested, and feature-flagged.

Final live model selection is deferred. Model availability and pricing changed relative to earlier architecture assumptions and must be refreshed from official OpenAI model and pricing pages again immediately before any live provider implementation and again before pilot.

## 2. Official Sources Reviewed

Retrieved date for all sources: 2026-06-05.

| Source | URL | Relevant Section | Decision Impact | Confidence | Changes Architecture? |
| --- | --- | --- | --- | --- | --- |
| SDKs and CLI | https://developers.openai.com/api/docs/libraries | Official SDK installation and SDK examples | Future SDK use should be the official Python SDK in the Python worker only, after explicit package approval. | High | Yes, confirms SDK path and blocks third-party wrappers. |
| Migrate to the Responses API | https://developers.openai.com/api/docs/guides/migrate-to-responses | Responses API migration, storage, strict function definitions | Primary future API path should be Responses API; default `store: false` is required for ClinMira live calls. | High | Yes, updates API recommendation. |
| Responses API reference | https://platform.openai.com/docs/api-reference/responses/create?api-mode=responses | Create response, tools, state, streaming, token count | Future provider must expose a narrow Responses adapter with no direct state authority. | High | Yes, defines provider boundary constraints. |
| Agents SDK overview | https://developers.openai.com/api/docs/guides/agents | Agents SDK decision point | Agents SDK is optional future tooling, not an immediate runtime dependency. | High | Yes, clarifies SDK role. |
| Agents orchestration and handoffs | https://developers.openai.com/api/docs/guides/agents/orchestration | Handoffs versus agents-as-tools | ClinMira should prefer agents-as-tools under a manager/orchestrator. Handoffs remain blocked unless separately contracted. | High | Reinforces existing architecture. |
| Agents guardrails and human review | https://developers.openai.com/api/docs/guides/agents/guardrails-approvals | Input, output, tool guardrails, human review | Future live calls must run context firewall and deterministic safety before provider calls and output guardrails after provider output. | High | Reinforces and strengthens gates. |
| Agents integrations and observability | https://developers.openai.com/api/docs/guides/agents/integrations-observability | Tracing and integrations | Agent traces must be redacted before export or storage; trace export remains disabled by default. | High | Yes, adds stricter trace-export flag. |
| Evaluate agent workflows | https://developers.openai.com/api/docs/guides/agent-evals | Trace grading, datasets, eval runs | Step 9 eval harness remains mandatory and future trace-based evals should be added before live rollout. | High | Reinforces eval gate. |
| Structured model outputs | https://developers.openai.com/api/docs/guides/structured-outputs | JSON Schema, typed outputs, refusals | Future live agent outputs must use schema validation and programmatic refusal handling. | High | Reinforces contract-first output validation. |
| Function calling | https://developers.openai.com/api/docs/guides/function-calling | Tool lifecycle, tool outputs, parallel calls | Tool calls remain blocked until tool schemas, permissions, max calls, idempotency, and safety gates exist. | High | Reinforces blocked tool-call stance. |
| Prompting | https://developers.openai.com/api/docs/guides/prompting | Prompts as application code; prompt object deprecation | ClinMira must store prompts in code-managed versioned helpers, not reusable prompt objects. | High | Yes, changes future prompt management. |
| Prompt engineering | https://developers.openai.com/api/docs/guides/prompt-engineering | Prompt engineering with Responses API and context planning | Prompt changes require fixtures, evals, and versioned review; context windows need explicit budget controls. | High | Reinforces eval and context rules. |
| Safety best practices | https://developers.openai.com/api/docs/guides/safety-best-practices | Moderation, adversarial testing, HITL, constrained input/output | ClinMira must keep red-team, hidden fact, unsafe action, and HITL/faculty gates release-blocking. | High | Reinforces safety gates. |
| Production best practices | https://developers.openai.com/api/docs/guides/production-best-practices | Organization, billing limits, API keys | API keys must remain server-side secrets only; project/billing limits and usage monitoring are required before live calls. | High | Reinforces secrets and cost controls. |
| Cost optimization | https://developers.openai.com/api/docs/guides/cost-optimization | Reduce requests, tokens, and model size; Batch/Flex | Future live provider must enforce per-run and per-session budgets, no uncontrolled loops, and smaller-model routes only after eval evidence. | High | Reinforces cost gate. |
| API pricing | https://openai.com/api/pricing/ | Current model, tool, realtime, Batch, Flex, and data residency prices | Final model selection and budget math must be refreshed immediately before any live implementation. | High | Yes, pricing/model assumptions must not be hard-coded now. |
| Model selection | https://developers.openai.com/api/docs/guides/model-selection | Accuracy first, cost/latency second | Model routing must choose by eval target, risk, latency, cost, and feature flags, not ad hoc prompt decisions. | Medium-high | Reinforces routing matrix. |
| Rate limits | https://developers.openai.com/api/docs/guides/rate-limits/usage-tiers | RPM, TPM, usage limits, headers | Future provider must handle rate limits, quotas, and retries without uncontrolled loops. | Medium-high | Reinforces budget/rate control. |
| Data controls in the OpenAI platform | https://developers.openai.com/api/docs/guides/your-data | API data use, abuse logs, ZDR/MAM, storage | ClinMira must set `store: false` by default, avoid platform state as source of truth, and keep synthetic-only scope until privacy review. | High | Yes, strengthens retention and state rules. |

No third-party blogs, community posts, or unofficial sources were used for decisions.

## 3. Current OpenAI Surface Summary

The official current surface relevant to ClinMira includes:

- Responses API for model responses, multimodal inputs, tool-capable requests, conversation/state features, structured outputs, and future provider calls.
- Official OpenAI SDKs for Python, JavaScript/TypeScript, .NET, Java, Go, and Ruby, with Python and JavaScript examples using `responses.create`.
- Agents SDK for code-first agent workflows where the application owns orchestration, tools, approvals, and state.
- Agents SDK guardrails for automatic input, output, and tool checks, plus human review for sensitive actions.
- Agents SDK tracing and integrations that can emit structured records of model calls, tool calls, handoffs, guardrails, and custom spans.
- Agent workflow evaluation using traces, graders, datasets, and eval runs.
- Structured Outputs for JSON Schema-constrained outputs and programmatic refusal handling.
- Function calling/tool calling where the model requests a tool call and application code executes and returns the tool result.
- Prompting guidance that treats prompts as application code and warns against future dependence on reusable prompt objects.
- Safety best practices including moderation, adversarial testing, human oversight, constrained inputs, output limits, and user safety identifiers.
- Production practices for API key protection, organization/project controls, usage limits, and staged environments.
- Cost optimization guidance around fewer requests, fewer tokens, smaller models, Batch API, and Flex processing.
- Current pricing/model pages that are materially time-sensitive and must be refreshed again before live enablement.
- Data controls covering storage, abuse monitoring, Zero Data Retention and Modified Abuse Monitoring eligibility, and `store` behavior.

## 4. Recommended Future Integration Path

Recommended future path:

1. Keep Step 12 as planning only. No runtime provider code is authorized.
2. Implement Step 13 as feature-flag scaffolding only if approved. Step 13 may define configuration validation and fail-closed status reporting, but still must not install OpenAI SDKs or call OpenAI.
3. Implement a future Python worker provider boundary only after Step 13 flags, Step 9/10/11 gates, DB-backed evals, cost controls, trace redaction tests, and source refresh acceptance pass.
4. Use the official OpenAI Python SDK in the Python worker only after explicit package approval.
5. Use Responses API as the primary model API path for future live text agents.
6. Default every future provider request to `store: false` unless a later privacy/legal review explicitly approves a different setting.
7. Keep application state, clinical facts, reveal policy, event history, idempotency, outbox, and audit in ClinMira PostgreSQL. OpenAI conversation/application state must never become ClinMira source of truth.
8. Keep deterministic backend safety and context firewall outside the model and before provider calls.
9. Keep tool execution outside the model. A model may only request a tool in a later approved step; ClinMira code must validate the request, enforce permissions, apply idempotency, and route mutation through backend services.
10. Use structured outputs and schema validation for model responses in any future live path.
11. Treat Agents SDK as optional future orchestration/tracing/guardrail tooling only if it can be wrapped by ClinMira provider boundaries and redaction policies. Agents SDK must not bypass backend orchestration, direct DB mutation restrictions, or event/outbox requirements.

## 5. Rejected Alternatives

| Alternative | Verdict | Reason |
| --- | --- | --- |
| Add OpenAI SDK in Step 12 | Rejected | Step 12 is source refresh and planning only. Package installation would create implementation scope. |
| Direct OpenAI calls from NestJS API/BFF | Rejected | Live provider work belongs in the Python worker/provider boundary. API/BFF remains orchestrator-facing and must not become a model-call hotspot. |
| OpenAI calls from frontend | Rejected | API keys and hidden context must never reach client-side code. Frontend mock state is not source of truth. |
| Use Chat Completions as primary new live-agent path | Rejected | Official docs point new agentic/tool-capable work toward Responses API. |
| Use Assistants API as ClinMira state source | Rejected | ClinMira state authority is PostgreSQL, fact ledger, event log, and outbox. |
| Raw HTTP client instead of official SDK | Rejected | Official SDK is the maintainable future path unless an ADR proves a safer exception. |
| Third-party agent frameworks as runtime authority | Rejected | They would add contract, trace, tool, and safety ambiguity without official-source control. |
| Autonomous swarm or unconstrained handoffs | Rejected | ClinMira architecture requires code-supervised orchestration and agents-as-tools. |
| Built-in web/file/code/MCP tools for clinical runtime by default | Rejected | Each tool needs separate contract, permission, idempotency, cost, trace, and eval gates. |
| Reusable OpenAI prompt objects as core prompt storage | Rejected | Current prompting docs deprecate prompt object creation and schedule `v1/prompts` shutdown. |
| Store raw traces or raw provider prompts | Rejected | Hidden facts, system prompts, faculty notes, secrets, and raw restricted context must be redacted. |
| Stream live model output to frontend before replay/realtime gates | Rejected | Realtime/frontend integration remains blocked until durable replay and reducer gates pass. |

## 6. Feature Flags and Kill Switches

All live-provider flags must be tenant-aware, auditable, default-off, and fail-closed.

| Flag | Required Default | Meaning | Enablement Rule |
| --- | --- | --- | --- |
| `CLINMIRA_LIVE_AGENTS_ENABLED` | `false` | Master live-agent runtime flag. | Must remain false until all live-agent gates pass. |
| `CLINMIRA_OPENAI_PROVIDER_ENABLED` | `false` | Allows OpenAI provider adapter to be used. | Requires live agents enabled, kill switch off, model allowlist, budgets, and trace controls. |
| `CLINMIRA_AGENT_NETWORK_ENABLED` | `false` | Allows worker outbound provider network calls. | Requires approved provider adapter and no direct arbitrary network calls. |
| `CLINMIRA_AGENT_TOOL_CALLS_ENABLED` | `false` | Allows model-requested tool calls to be considered. | Requires tool registry, tool contracts, max call counts, idempotency, and safety tests. |
| `CLINMIRA_AGENT_TRACE_EXPORT_ENABLED` | `false` | Allows traces to leave local redacted storage. | Requires redaction tests and privacy/security approval. |
| `CLINMIRA_AGENT_MAX_COST_USD_PER_RUN` | `0.00` | Per-run hard model-cost ceiling. | Must be configured to a positive approved value before calls. |
| `CLINMIRA_AGENT_MAX_TOKENS_PER_RUN` | `0` | Per-run token hard cap. | Must be configured to a positive model-safe value before calls. |
| `CLINMIRA_AGENT_TIMEOUT_MS` | `0` | Per-run timeout. | Must be configured to a positive approved value before calls. |
| `CLINMIRA_AGENT_ALLOWED_MODELS` | empty | Comma-separated model allowlist. | Empty allowlist blocks calls. |
| `CLINMIRA_AGENT_KILL_SWITCH` | `true` | Emergency stop for all live provider calls. | Any true value blocks live calls regardless of other flags. |

Feature flag invariants:

- Safety, audit, tenant isolation, hidden fact filtering, and event/source-of-truth rules cannot be disabled by feature flags.
- A live call is allowed only if the kill switch is false, all required live flags are explicitly enabled, budgets are positive, a model is allowlisted, eval evidence is current, and trace redaction is verified.
- Flag changes must be auditable with actor, tenant, previous value, new value, reason, timestamp, and correlation id.
- Step 13 may scaffold these flags but must not connect them to OpenAI runtime calls.

## 7. Safety Gates Before Live Model Calls

All gates below are required before any live OpenAI call:

- Step 9 eval thresholds pass with stored evidence.
- Step 10 deterministic safety thresholds pass with stored evidence.
- Step 11 no-live-agent and context-firewall tests pass.
- DB-backed evals pass with a safe `CLINMIRA_TEST_DATABASE_URL`.
- Hidden fact leakage count is `0`.
- Prompt-injection hidden fact leakage count is `0`.
- Unsafe action accepted count is `0`.
- Unsupported diagnosis, treatment, imaging, faculty, and debrief claim counts are `0`.
- No frontend mock source usage appears in backend, worker, contracts, evals, or provider context.
- Live path is feature-flagged off by default.
- Provider disabled path remains tested and fail-closed.
- Trace redaction tests pass.
- Cost cap, token cap, timeout, retry, and kill-switch tests pass.
- Context firewall verifies allowed and forbidden fact slices for every agent route.
- Deterministic safety pre-check runs before provider calls.
- Deterministic safety post-check runs before student-visible output is persisted or emitted.
- Structured output schema validation and refusal/fallback handling pass.
- Tool calls remain disabled unless separate tool-call contracts and permission tests pass.
- No direct DB mutation from agent-worker exists.
- Event log and outbox write path is defined for future agent-run events through backend orchestration, not direct worker mutation.
- Human/faculty review gates exist for high-risk or uncertain outputs before clinical teaching claims are trusted.

## 8. Context Firewall Requirements

The context firewall is a non-negotiable pre-provider boundary.

Allowed future provider context:

- Student-safe visible facts.
- Facts revealed by policy for the active session.
- Stable case metadata that is not hidden, faculty-only, safety-only, evaluator-only, or secret.
- Student action text after input safety checks.
- Explicit agent purpose, output schema, refusal rules, and allowed response shape.
- Redacted conversation/timeline summaries when needed and budgeted.

Forbidden future provider context unless a later role-specific contract explicitly allows it:

- Hidden diagnosis and unrevealed hidden facts.
- Faculty-only notes, rubrics, answer keys, or debrief target answers.
- Safety-only facts except inside a narrowly contracted safety context that cannot produce student-facing content.
- Evaluator-only facts except inside a post-completion evaluator path.
- System prompts or internal policy text not intended for the provider.
- API keys, provider secrets, tool secrets, tenant secrets, credentials, or raw auth data.
- Frontend mock data, local storage simulation state, or prototype fixtures as source of truth.
- Raw patient data or real clinical records.

Context firewall output requirements:

- Every provider call must include a context classification and context version.
- Every student-visible clinical claim must map to `fact_id`, `rule_id`, or `timeline_event_id`.
- Output without grounding must be blocked, rewritten, or sent to review.
- Safety-blocked actions must not trigger persona, evaluator, imaging, or treatment-like generation except a safe deterministic explanation.

## 9. Cost Controls

Required cost controls before live calls:

- Per-run token cap.
- Per-run estimated USD cost cap.
- Per-session max model-call cap.
- Tenant-level daily and monthly model budget.
- Model allowlist.
- Timeout.
- Retry limit.
- No background uncontrolled loops.
- No unbounded tool-call chains.
- No expensive model call on safety-blocked turns unless a later safety review contract approves it.
- Current official pricing refresh before implementation and before pilot.
- Runtime cost estimate from model, input tokens, output tokens, cached input tokens, tool usage, and processing mode.
- Audit/event logging for attempted call, blocked call, completed call, budget-exceeded path, and kill-switch path.
- Alerts for cost/session regression, tenant spend threshold, abnormal retry rate, and model route drift.

Default budget behavior:

- Empty model allowlist blocks calls.
- Zero max tokens blocks calls.
- Zero max cost blocks calls.
- Timeout unset or zero blocks calls.
- Kill switch true blocks calls.

## 10. Trace and Redaction Requirements

Trace policy:

- Store only redacted traces in ClinMira.
- Link traces to event log entries using `trace_id`, `agent_run_id`, `session_id`, `case_version_id`, and correlation id.
- Future OpenAI trace export remains disabled by default.
- If Agents SDK trace export is later enabled, it must pass redaction, privacy, and security tests before export.
- Worker must not write trace records directly to PostgreSQL unless a later approved backend-orchestrated path exists.

Trace content must never include:

- Raw hidden facts.
- Hidden diagnosis.
- Faculty-only notes.
- Safety-only raw facts outside safety-only internal evidence.
- Evaluator-only content before the correct role/time gate.
- API keys.
- Provider secrets.
- Tool secrets.
- System prompts.
- Internal prompts.
- Raw patient hidden data.
- Real patient data.
- Frontend mock data.

Minimum trace fields:

- `trace_id`
- `agent_run_id`
- `agent_name`
- `model_name` or `model_route`
- `prompt_version`
- `schema_version`
- `tool_schema_version` when tools are later approved
- `context_version`
- `redaction_policy_version`
- `input_token_count`
- `output_token_count`
- `estimated_cost_usd`
- `latency_ms`
- `safety_precheck_result`
- `safety_postcheck_result`
- `context_firewall_result`
- `status`
- `failure_classification`

## 11. Eval Requirements

Future live integration must extend the Step 9 eval harness before live calls.

Required eval families:

- Hidden fact leakage.
- Prompt injection and system prompt extraction.
- Faculty-only note extraction.
- Safety-only and evaluator-only context extraction.
- Unsupported diagnosis certainty.
- Unsupported treatment advice.
- Unsupported medication/order action.
- Unsupported imaging interpretation.
- Unsafe action accepted.
- Tool-call permission bypass.
- Unauthorized handoff or agent ownership transfer.
- Context firewall failure.
- Structured output schema invalidity.
- Refusal/fallback correctness.
- Cost cap exceeded.
- Token cap exceeded.
- Timeout and retry behavior.
- Kill-switch behavior.
- Trace redaction.
- No frontend mock source usage.
- No real patient data usage.
- DB-backed session/action/event/outbox integration.
- Model route and prompt version regression.

Evidence rules:

- All critical safety metrics must be zero-tolerance.
- Eval artifacts must be stored with suite version, prompt version, model route, schema version, feature flags, and retrieved source refresh date.
- Passing deterministic mock evals does not by itself authorize live calls.
- Live shadow evals, if later approved, must use synthetic content only and stay tenant-gated.

## 12. Implementation Phases After Step 12

| Phase | Scope | Explicit Non-Scope | Exit Gate |
| --- | --- | --- | --- |
| Step 13 - Feature-Flag Scaffolding Only | Add fail-closed config declarations, documentation, health/status reporting, and tests that live remains disabled. | No SDK, no API keys, no OpenAI calls, no runtime provider. | Flags default off and kill switch true. |
| Step 13B - Provider Boundary Test Doubles | Add provider interface and deterministic fake provider tests only if approved. | No SDK, no network, no provider secrets. | Fake provider proves budget, timeout, trace, refusal, schema, and safety behavior. |
| Step 14 - Contract Extension Planning | Draft inactive model-run/provider/tool-call contracts if approved. | No active provider schemas and no tool execution. | Contracts remain marked not implemented and blocked. |
| Step 15 - SDK Install and Disabled Adapter | Install official SDK only after approval and keep adapter disabled. | No live calls. | Import scans, disabled-provider tests, and kill-switch tests pass. |
| Step 16 - Synthetic Live Shadow Eval | If separately approved, run tightly budgeted synthetic evals in a controlled environment. | No student-facing output, no frontend, no real users. | All critical metrics remain zero and cost evidence passes. |
| Later Live Rollout Gate | Tenant-gated live text agents for a limited case family. | No voice, no autonomous swarm, no treatment/order execution. | Architecture acceptance gate and faculty/security/platform signoff. |

If the implementation roadmap keeps Step 13 reserved for realtime, the next safe task should be named Step 12B instead. Realtime remains blocked regardless of naming.

## 13. Open Questions

- Which official OpenAI model family will be selected for the first synthetic live shadow eval after pricing and model docs are refreshed again?
- Should ClinMira use direct Responses API via official Python SDK first, or wrap early live testing in Agents SDK for trace/guardrail convenience?
- What exact cost ceiling should Product approve for one live synthetic session, one debrief candidate, and one scenario validation candidate?
- What trace export policy is acceptable under institutional privacy requirements?
- Will the pilot require Zero Data Retention, Modified Abuse Monitoring, data residency, or a standard API project with `store: false`?
- What Step naming should be used if the historical roadmap still reserves Step 13 for realtime?

## 14. Final Verdict

PLANNING COMPLETE - LIVE IMPLEMENTATION STILL BLOCKED

Step 12 is approved only as source refresh and planning. It does not authorize live OpenAI calls, OpenAI SDK installation, API key usage, live agents, provider runtime changes, frontend integration, realtime, Redis, WebSocket/SSE, Temporal, production outbox publisher, replay API, debrief generation, faculty workflow, treatment advice, imaging interpretation, production auth/RBAC, or active OpenAI provider/tool/model-run schemas.
