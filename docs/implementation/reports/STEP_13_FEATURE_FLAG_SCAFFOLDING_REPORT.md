# Step 13 - Feature-Flag Scaffolding for Live Provider Controls

## 1. Executive Verdict

STEP 13 COMPLETE WITH WARNINGS

Step 13 added fail-closed live-provider feature flag scaffolding to the Python agent-worker. The worker can now parse live-provider control flags, expose safe gate status, report blocked reasons through health and CLI output, and prove through tests that live provider access remains disabled by default and blocked without evidence gates.

No OpenAI SDK, OpenAI import, live OpenAI call, API key read, live agent runtime, network client, direct DB mutation, backend API runtime change, database migration, frontend change, provider/tool/model-run schema, Redis/realtime, Temporal, replay publisher, debrief/faculty/treatment/imaging workflow, or package change was added.

Warnings remain because shared contracts typecheck is still blocked by missing `tsc`, DB-backed evals remain skipped without `CLINMIRA_TEST_DATABASE_URL`, and live provider implementation remains blocked by absent DB-backed eval, trace redaction, cost-control, and final acceptance evidence.

## 2. Scope Confirmation

| Scope Item | Confirmation |
| --- | --- |
| OpenAI SDK added | No. |
| OpenAI import/call added | No. |
| API key read added | No. |
| Live agent enabled | No. |
| Provider runtime enabled | No. |
| Network calls enabled | No. |
| Tool calls enabled | No. |
| Frontend changed | No. |
| Backend API runtime changed | No. |
| Database migration changed | No. |
| Redis/realtime added | No. |
| Temporal added | No. |
| Debrief/faculty/treatment/imaging workflow added | No. |
| Packages or lockfiles changed | No. |

## 3. Feature Flag Summary

| Flag | Step 13 Default | Gate Behavior |
| --- | --- | --- |
| `CLINMIRA_LIVE_AGENTS_ENABLED` | `false` | Must be true for any future live provider allowance. |
| `CLINMIRA_OPENAI_PROVIDER_ENABLED` | `false` | Must be true for any future OpenAI provider allowance. |
| `CLINMIRA_AGENT_NETWORK_ENABLED` | `false` | Must be true for any future outbound provider network allowance. |
| `CLINMIRA_AGENT_TOOL_CALLS_ENABLED` | `false` | Reported only; tool calls remain disabled and do not authorize runtime behavior. |
| `CLINMIRA_AGENT_TRACE_EXPORT_ENABLED` | `false` | Reported only; external trace export remains disabled. |
| `CLINMIRA_AGENT_MAX_COST_USD_PER_RUN` | `0.00` | Zero or invalid values block. |
| `CLINMIRA_AGENT_MAX_TOKENS_PER_RUN` | `0` | Zero or invalid values block. |
| `CLINMIRA_AGENT_TIMEOUT_MS` | `0` | Zero or invalid values block. |
| `CLINMIRA_AGENT_ALLOWED_MODELS` | empty | Empty allowlist blocks; status exposes count only, not model names. |
| `CLINMIRA_AGENT_KILL_SWITCH` | `true` | True blocks all live provider access. |

## 4. Gate Contract

Implemented `backend/agent-worker/src/clinmira_agent_worker/feature_flags.py` with:

- `parse_bool(value, default)`
- `parse_float(value, default)`
- `parse_int(value, default)`
- `parse_model_allowlist(value)`
- `LiveProviderFlags`
- `LiveProviderGateStatus`
- `load_live_provider_flags(env)`
- `evaluate_live_provider_gate(flags, evidence)`
- `build_live_provider_status(env)`

`build_live_provider_status()` treats all evidence gates as not passed in Step 13. Even if all environment flags are set to permissive values, live provider access remains blocked unless explicit evidence is supplied to the pure evaluator and future approved code wires that evidence through an approved gate.

Required evidence gates currently reported as false:

- `step_9_eval_gate`
- `step_10_safety_gate`
- `step_11_context_firewall_gate`
- `db_backed_eval_gate`
- `trace_redaction_gate`
- `cost_control_gate`

## 5. Health and CLI Status

Worker health now includes:

- `live_provider_allowed`
- `kill_switch_enabled`
- `allowed_models_count`
- `blocked_reasons_count`
- Safe nested `live_provider_status`

The worker CLI now supports:

```bash
python3 -m clinmira_agent_worker.main live-provider-status
```

Status output includes only safe flag/gate metadata: booleans, numeric budgets, model allowlist count, blocked reasons, and evidence gate booleans. It does not include API keys, secrets, raw environment values, model allowlist names, hidden facts, faculty notes, prompts, or raw traces.

## 6. Disabled Provider Behavior

`DisabledLiveModelProvider` remains the only live-provider object. It raises `LiveModelDisabledError` for both `run()` and `generate()`, now with Step 13 blocked-reason context.

The runtime still rejects `mode: "live"` and forbidden capabilities. Mock agents still run when live flags are requested because requested flags are reported as blocked status, not treated as runtime enablement.

## 7. Files Changed

| File | Change |
| --- | --- |
| `backend/agent-worker/src/clinmira_agent_worker/feature_flags.py` | Added fail-closed live-provider flag parsing, gate evaluation, and safe status builder. |
| `backend/agent-worker/src/clinmira_agent_worker/settings.py` | Wired live-provider flags/gate into worker settings while keeping runtime live features disabled. |
| `backend/agent-worker/src/clinmira_agent_worker/health.py` | Added safe live-provider gate status to health output. |
| `backend/agent-worker/src/clinmira_agent_worker/live_model_provider.py` | Updated disabled provider to surface Step 13 gate blocked reasons while still failing closed. |
| `backend/agent-worker/src/clinmira_agent_worker/main.py` | Added `live-provider-status` CLI command. |
| `backend/agent-worker/src/clinmira_agent_worker/runtime.py` | Updated fail-closed live-mode wording and kept mock-only runtime enforcement. |
| `backend/agent-worker/tests/test_feature_flags.py` | Added feature flag, gate, secret-read, status, and CLI tests. |
| `backend/agent-worker/tests/test_health.py` | Updated health/gate tests for fail-closed status behavior. |
| `backend/agent-worker/tests/test_no_live_openai.py` | Added disabled-provider and all-live-flags-still-blocked assertions. |
| `backend/agent-worker/tests/test_runtime_skeleton.py` | Updated live-mode failure assertion and added mock-runtime-with-live-flags test. |
| `docs/implementation/reports/STEP_13_FEATURE_FLAG_SCAFFOLDING_REPORT.md` | Added this report. |
| `docs/implementation/IMPLEMENTATION_STATUS.md` | Updated current phase, completed steps, blockers, decisions, and next prompt. |

## 8. Tests and Checks

| Command | Ran? | Result | Notes |
| --- | --- | --- | --- |
| `python3 -m unittest discover -s tests` | Yes | Pass | 35 worker tests passed. |
| `python -m unittest discover -s tests` | Yes | Blocked | `python` command is not available in this environment. |
| `PYTHONPATH=src:../../shared/contracts/python python3 -m clinmira_agent_worker.main health` | Yes | Pass | Health reported live provider blocked, kill switch enabled, model count `0`, blocked reasons count `14`. |
| `PYTHONPATH=src:../../shared/contracts/python python3 -m clinmira_agent_worker.main live-provider-status` | Yes | Pass | Status reported `live_provider_allowed: false` with all Step 13 default blockers. |
| `PYTHONPATH=src:../../shared/contracts/python python3 -m clinmira_agent_worker.main run-mock-agent --agent-name mock_persona --input-text ...` | Yes | Pass | Mock agent still runs with no model/network/DB calls. |
| `npm --prefix backend/api run test` | Yes | Pass | 5 backend API test files passed. |
| `npm --prefix backend/api run typecheck` | Yes | Pass | Backend API TypeScript typecheck passed. |
| `npm --prefix backend/api run build` | Yes | Pass | Nest build passed. |
| `npm --prefix shared/contracts run test` | Yes | Pass | 4 shared contract test files passed. |
| `npm --prefix shared/contracts run typecheck` | Yes | Blocked | `tsc` not found; no package install authorized for Step 13. |
| `node --test backend/database/tests/*.test.mjs` | Yes | Pass | 10 database test files passed. |
| `node --test backend/evals/tests/*.test.mjs` | Yes | Pass | 6 eval test files passed. |
| `node backend/evals/lib/eval-runner.mjs` | Yes | Pass with warning | Status `PASSED`; DB eval skipped because `CLINMIRA_TEST_DATABASE_URL` is not configured. |
| Worker source OpenAI/API-key scan | Yes | Pass | No OpenAI import/call/provider SDK or API key names in worker source. |
| Worker source network-client scan | Yes | Pass | No `requests`, `httpx`, `aiohttp`, `urllib`, `socket`, `fetch`, or HTTP connection use. |
| Worker source direct-DB mutation scan | Yes | Pass | No DB client imports, SQL mutation, `event_log`, or `outbox_events` use in worker source. |
| Worker source frontend mock scan | Yes | Pass | No frontend/localStorage/mock source references in worker source. |
| Worker source Redis/realtime/Temporal scan | Yes | Pass | No Redis, WebSocket/SSE/EventSource, or Temporal runtime use. |
| Package dependency scan | Yes | Pass | No OpenAI SDK, Agents SDK, or Python HTTP-client dependency entries found. |
| Prisma/docker compose scan | Yes | Pass | No `schema.prisma`, `docker-compose.yml`, or `docker-compose.yaml` found. |
| `git status --short` | Yes | Warning | Dirty repository remains from prior staged/untracked architecture/prototype work. |

## 9. Remaining Warnings

- No live provider implementation.
- No OpenAI SDK or OpenAI API calls.
- No API key reads.
- No network access enabled for agents.
- No DB-backed evals because `CLINMIRA_TEST_DATABASE_URL` is absent.
- Shared contracts typecheck remains blocked until a separate approved dependency setup provides `tsc`.
- No production auth/RBAC.
- No production outbox publisher or replay API.
- No realtime, Redis, WebSocket, or SSE.
- No frontend integration.
- No debrief/faculty/treatment/imaging workflow.
- Existing frontend prototype remains prototype-only and must not become source of truth.
- Roadmap numbering still needs care because the backlog labels Step 13 as realtime while this approved task used Step 13 for feature-flag scaffolding.

## 10. Next Step

Stop here for architecture review.

Recommended next prompt:

```text
You are a strict architecture reviewer.

Review Step 13 feature-flag scaffolding against docs/architecture, docs/implementation/IMPLEMENTATION_PLAYBOOK.md, docs/architecture/13_OPENAI_SOURCE_REFRESH_AND_LIVE_AGENT_PLAN.md, and docs/architecture/12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md.

Check scope creep, OpenAI SDK/import/call/API key usage, secret exposure, unsafe flag defaults, kill-switch behavior, evidence-gate bypass, live provider enablement, network enablement, tool-call enablement, direct DB mutation, frontend/backend mismatch, Redis/realtime/Temporal drift, missing tests, and source-of-truth violations.

Do not implement new features. Only review and produce a correction list.
```
