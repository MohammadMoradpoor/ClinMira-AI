# Step 14 - Provider Boundary Test Doubles

## 1. Executive Verdict

STEP 14 COMPLETE WITH WARNINGS

Step 14 added deterministic fake/test-double provider boundary scaffolding inside the Python agent-worker. The new boundary proves request/response/error shapes, fail-closed provider guards, budget/token/timeout/model/kill-switch/evidence checks, structured-output validation, refusal/fallback behavior, and redacted provider traces using local fake data only.

No OpenAI SDK, OpenAI import, OpenAI call, API key read, provider secret read, network client, live provider enablement, live agent runtime, backend API runtime change, database migration, frontend change, Redis/realtime, WebSocket/SSE, Temporal, production publisher/replay API, debrief/faculty/treatment/imaging workflow, production auth/RBAC, package install, env file, Docker compose runtime, or active production provider/tool/model-run schema was added.

Warnings remain because shared contracts typecheck is still blocked by missing `tsc`, DB-backed evals remain skipped without `CLINMIRA_TEST_DATABASE_URL`, `python` is not on PATH while `python3` works, and live-provider rollout remains blocked by later architecture gates.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| OpenAI SDK added | No. |
| OpenAI import/call added | No. |
| API key or provider secret read added | No. |
| Live provider enabled | No. |
| Live agents enabled | No. |
| Network calls enabled | No. |
| Tool calls enabled | No. |
| Backend API runtime changed | No. |
| Database migrations changed | No. |
| Frontend changed | No. |
| Redis/WebSocket/SSE/realtime added | No. |
| Temporal added | No. |
| Production publisher/replay API added | No. |
| Debrief/faculty/treatment/imaging workflow added | No. |
| Packages, lockfiles, env files, compose files changed | No. |

## 3. Provider Boundary Summary

| File | Purpose |
| --- | --- |
| `backend/agent-worker/src/clinmira_agent_worker/provider_boundary.py` | Defines `ProviderRequest`, `ProviderResponse`, `ProviderError`, provider mode/name constants, and provider protocol shape. |
| `backend/agent-worker/src/clinmira_agent_worker/provider_guards.py` | Enforces fake-provider boundary gates before provider execution. |
| `backend/agent-worker/src/clinmira_agent_worker/provider_schema.py` | Performs stdlib-only structured output validation and rejects forbidden keys/text markers. |
| `backend/agent-worker/src/clinmira_agent_worker/provider_trace.py` | Builds deterministic redacted provider traces without raw input, raw context, env values, or allowlists. |
| `backend/agent-worker/src/clinmira_agent_worker/provider_fake.py` | Implements the local deterministic fake provider with success, refusal, blocked, and schema-error paths. |

The fake provider is not wired into the active mock-agent runtime as a live-model path. It is test-double scaffolding only.

## 4. Guard Coverage

Provider guards block:

- Live or non-fake provider mode.
- Kill switch enabled.
- Live provider flags not fully enabled.
- Missing Step 9, Step 10, Step 11, DB-backed eval, trace redaction, or cost-control evidence gates.
- Missing context-firewall evidence.
- Missing deterministic safety precheck evidence.
- `max_tokens <= 0`.
- `max_cost_usd <= 0`.
- `timeout_ms <= 0`.
- Empty model allowlist.
- Model not in allowlist.
- Tool-call, external-network, backend-API, direct-DB-mutation, durable-event, outbox, or Temporal capability requests.
- Hidden/faculty/safety/evaluator-only fact visibility.
- Forbidden fields including `raw_fact_content`, `faculty_only_notes`, `hidden_diagnosis`, `system_prompt`, `internal_prompt`, `tool_secret`, `api_key`, and `provider_secret`.

Even the fake provider runs these guards first. Passing test flags/evidence can allow the fake provider path, but it still never performs network calls, SDK calls, DB writes, backend API calls, tool calls, or live model calls.

## 5. Fake Provider Behavior

| Behavior | Result |
| --- | --- |
| Success | Returns exactly `This is a deterministic fake provider response for testing only.` |
| Refusal | Returns exactly `The fake provider refused this request according to local test rules.` |
| Schema violation simulation | Returns safe `schema_error` response and sanitized structured errors; unsafe output is not returned as success. |
| Budget exceeded | Returns blocked response with cost `0.0`. |
| Token exceeded | Returns blocked response with token estimate `0`. |
| Timeout blocked | Deterministic config validation blocks; no async/runtime timeout added. |
| Kill switch blocked | Gate blocks before fake output. |
| Model not allowed | Gate blocks before fake output. |
| Missing safety/context evidence | Gate blocks before fake output. |

Every response sets `safety_postcheck_required: true`.

## 6. Schema And Trace Safety

Structured output validation checks:

- Output is a dict.
- Required keys exist.
- Values are safe primitive/list/dict types.
- `used_fact_ids` is a list of strings.
- `safety_postcheck_required` is true.
- Forbidden keys are absent.
- Forbidden output text markers are absent.

Provider traces include only redacted metadata:

- `trace_id`
- `provider_name`
- `mode`
- `request_id`
- `agent_name`
- `prompt_version`
- `schema_version`
- `context_version`
- `redaction_applied`
- token/cost estimates
- status and blocked reasons
- safety/context evidence booleans
- `safety_postcheck_required`

Traces do not include raw hidden facts, faculty notes, system prompts, provider secrets, raw environment values, raw model allowlists, frontend mock data, or real patient data.

## 7. Eval Harness Update

Added fake-provider gate metadata/tests only:

- `backend/evals/fixtures/provider-boundary.json`
- `backend/evals/tests/provider-boundary-gates.test.mjs`

The provider-boundary fixture is synthetic-only, requires no live model, requires no OpenAI, and is not added to the Step 9 release suite fixture list. The existing eval runner remains unchanged and still reports the live-agent gate as blocked.

## 8. Tests And Checks

| Command | Ran? | Result | Notes |
| --- | --- | --- | --- |
| `python3 -m unittest discover -s tests` | Yes | Pass | 57 worker tests passed. |
| `python -m unittest discover -s tests` | Yes | Blocked | `python` command is not available in this environment. |
| `node --test backend/evals/tests/*.test.mjs` | Yes | Pass | 7 eval test files passed, including provider-boundary gates. |
| `node backend/evals/lib/eval-runner.mjs` | Yes | Pass with warning | Status `PASSED`; DB eval skipped because `CLINMIRA_TEST_DATABASE_URL` is not configured. |
| `npm --prefix backend/api run test` | Yes | Pass | 5 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Yes | Pass | Backend API typecheck passed. |
| `npm --prefix backend/api run build` | Yes | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Yes | Pass | 4 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Yes | Blocked | `tsc` not found; no package install authorized. |
| `node --test backend/database/tests/*.test.mjs` | Yes | Pass | 10 database tests passed. |
| Runtime OpenAI/API-key scan | Yes | Pass | No OpenAI imports/calls or OpenAI API key/provider secret reads in implementation source. |
| Package dependency scan | Yes | Pass | No OpenAI SDK, Agents SDK, or provider SDK package entry found. |
| Worker network-client scan | Yes | Pass | No worker HTTP/network client imports or calls found. |
| Worker direct-DB mutation scan | Yes | Pass | No worker DB client imports, SQL mutation, event log writes, or outbox writes found. |
| Redis/WebSocket/SSE/Temporal scan | Yes | Pass | No runtime Redis/realtime/Temporal usage in worker/API source. |
| Frontend mock source scan | Yes | Pass | No frontend/localStorage/mock source usage in implementation source. Guard/test references remain tests only. |
| Active provider/tool/model-run schema scan | Yes | Pass | No active production provider/tool/model-run schema added under shared contracts. |
| `git status --short` | Yes | Warning | Dirty repository remains from prior staged/untracked work. |

## 9. Remaining Warnings

- Step 14 is fake/test-double provider boundary scaffolding only.
- Live provider implementation remains blocked.
- OpenAI SDK installation remains blocked.
- API key reads and provider secrets remain blocked.
- Network access for agents remains blocked.
- No DB-backed provider/runtime eval has run because `CLINMIRA_TEST_DATABASE_URL` is absent.
- Shared contracts typecheck remains blocked until a separate approved dependency setup provides `tsc`.
- No production auth/RBAC.
- No production outbox publisher or replay API.
- No realtime, Redis, WebSocket, or SSE.
- No frontend integration.
- No debrief/faculty/treatment/imaging workflow.
- Existing frontend prototype remains prototype-only and must not become source of truth.

## 10. Next Step

Stop here for architecture review.

Recommended next prompt:

```text
You are a strict architecture reviewer.

Review Step 14 provider boundary test doubles against docs/architecture, docs/implementation/IMPLEMENTATION_PLAYBOOK.md, docs/implementation/NO_GO_RULES.md, docs/implementation/reports/STEP_14_PROVIDER_BOUNDARY_TEST_DOUBLES_REPORT.md, docs/architecture/13_OPENAI_SOURCE_REFRESH_AND_LIVE_AGENT_PLAN.md, and docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md.

Check scope creep, OpenAI SDK/import/call/API key usage, provider secret exposure, network usage, live provider enablement, live agent enablement, unsafe gate bypass, missing tests, hidden fact leakage risk, contract/source-of-truth drift, backend API/runtime drift, database migration drift, frontend drift, Redis/realtime/Temporal drift, and whether fake provider scaffolding could be mistaken for production provider behavior.

Do not implement new features. Only review and produce a correction list.
```

Realtime remains deferred to Step 15 unless the architecture review approves continuing. Live OpenAI remains blocked.
