# Preflight Audit

## 1. Repository Snapshot

| Field | Result |
| --- | --- |
| Current path | `/home/mohammad/Projects/ClinMira-AI` |
| Branch name | `main` |
| Git status summary | Dirty worktree with many added files, modified `README.md`, modified `backend/README.md`, modified implementation docs, untracked backend skeleton, untracked shared contracts, and added frontend prototype files. |
| Top-level folders | `.agents`, `.codex`, `.git`, `backend`, `docs`, `frontend`, `shared` |
| Detected frontend folder | `frontend/` |
| Detected backend folder | `backend/` |
| Detected docs folder | `docs/` |
| Detected package manager | `pnpm` for frontend via `frontend/pnpm-lock.yaml`; `npm` scripts exist in frontend/backend/shared package files. |
| Detected test tools | Node test runner in backend/shared, TypeScript typecheck, ESLint/Next build scripts in frontend, Python `unittest` in agent worker, Playwright dependency in frontend. |

Git status highlights:

- `docs/architecture/01` through `12` are added.
- `docs/implementation/CODEX_TASK_TEMPLATE.md`, `IMPLEMENTATION_BACKLOG.md`, `IMPLEMENTATION_PLAYBOOK.md`, and `IMPLEMENTATION_STATUS.md` existed before this reset step and are added/modified.
- `frontend/` contains a large added prototype.
- `backend/api/` and `backend/agent-worker/` are untracked skeleton folders.
- `shared/contracts/` is untracked shared contract work.

## 2. Architecture Docs Availability

| Document | Exists? | Notes | Blocking? |
| --- | --- | --- | --- |
| `01_AGENTIC_CORE_ARCHITECTURE.md` | Yes | Defines agents-as-tools, context firewall, fact ledger, No Free Clinical Truth, live-agent gates. | No |
| `02_BACKEND_DATABASE_ARCHITECTURE.md` | Yes | Defines NestJS/Python/PostgreSQL/Redis/Temporal boundaries, SQL-first schema, outbox, event log. | No |
| `03_FRONTEND_REQUIRED_UPDATES.md` | Yes | Defines typed contracts, state machine, replay/reducer, no hidden facts in frontend payloads. | No |
| `04_IMPLEMENTATION_ROADMAP.md` | Yes | Defines corrected order: contracts, DB, fact ledger, outbox, mock runtime, eval, safety, live agents. | No |
| `05_OFFICIAL_SOURCES_AND_DECISIONS.md` | Yes | Defines ADRs including SQL-first migrations, contract-first, Redis not source of truth, outbox/replay. | No |
| `06_AGENT_EVALUATION_AND_SAFETY_TESTING.md` | Yes | Defines eval categories, hidden fact leakage, unsafe treatment and debrief grounding gates. | No |
| `07_EVENT_RELIABILITY_AND_CONTRACT_GOVERNANCE.md` | Yes | Defines event log, outbox, replay contract, ordering, redaction, dead-letter policy. | No |
| `08_SECURITY_THREAT_MODEL_AND_AI_GOVERNANCE.md` | Yes | Defines RBAC, tenant isolation, prompt injection, hidden fact leakage, incident response. | No |
| `09_ENTERPRISE_EDUCATION_MARKET_READINESS.md` | Yes | Defines university pilot, faculty calibration, LTI readiness boundaries. | No |
| `10_PRODUCTION_SLO_COST_AND_OBSERVABILITY.md` | Yes | Defines SLOs, replay/cost/observability dashboards, retention/redaction. | No |
| `11_ARCHITECTURE_REVIEW_SUMMARY.md` | Yes | Strict verdict: approved for implementation planning, not production/live-agent rollout. | No |
| `12_FINAL_ARCHITECTURE_ACCEPTANCE_GATE.md` | Yes | Final go/no-go gates and non-negotiable invariants. | No |

Architecture availability verdict: all required architecture docs exist.

## 3. Existing Implementation State

| Area | State | Evidence Path | Risk | Recommended Action |
| --- | --- | --- | --- | --- |
| Backend API | Partial | `backend/api/` | Health-only NestJS skeleton exists but is untracked and must be reviewed before being accepted as Step 3. | Review in Step 2; keep/correct/manual revert decision. |
| Database schema | Absent | No SQL/migration/prisma paths detected. | Database work remains blocked; no source-of-truth schema exists. | Do not implement until Step 5. |
| Migrations | Absent | No migration directories or `.sql` files detected. | SQL-first migration authority not implemented. | Complete Step 5 before migrations. |
| Shared contracts | Partial | `shared/contracts/` | Health-only contracts exist; DTO naming/version drift risk has been identified. | Review/correct before Step 4 advances. |
| Python agent worker | Partial | `backend/agent-worker/` | Health-only worker exists and refuses live agent flag; still untracked. | Review in Step 2; keep/correct/manual revert decision. |
| Temporal worker | Absent | No Temporal code detected. | Durable workflow boundaries not implemented. | Do not implement before required backend/agent gates. |
| OpenAI integration | Absent | No live OpenAI package/call implementation detected. | Safe currently; live agents remain blocked. | Keep blocked until Step 12. |
| Event log/outbox | Absent | No `event_log`/`outbox_events` implementation detected. | Realtime/session reliability cannot be claimed. | Implement only at Step 7. |
| Eval harness | Absent | No eval harness files detected. | Live agents and safety claims remain blocked. | Implement Step 9 before live agents. |
| Safety engine | Absent | No safety engine implementation detected. | Treatment workflows and live agents blocked. | Implement Step 10 after prerequisites. |
| Realtime gateway | Absent | No WebSocket/SSE backend gateway detected. | Realtime trust cannot be claimed. | Implement only after Step 7. |
| Frontend backend integration | Absent/partial risk | `frontend/` prototype uses mock data/storage. | Prototype exists, but backend contracts are not integrated. Risk of mock payload assumptions. | Step 2 must review frontend status; Step 14/15 blocked. |

## 4. Possible Incomplete Previous Work

| File/Path | Why Suspicious | Recommendation | Blocks Step 2? |
| --- | --- | --- | --- |
| `backend/api/` | Untracked health-only API skeleton appears to come from previous Codex implementation attempts. | Review. Keep only if confirmed health-only and architecture-aligned. Correct tests/contracts if kept. | Yes |
| `backend/agent-worker/` | Untracked Python worker skeleton appears to come from previous Codex implementation attempts. | Review. Keep only if no live OpenAI calls and no clinical logic. | Yes |
| `shared/contracts/` | Untracked contract foundation exists before the reset audit. DTO naming/version drift risk exists. | Review/correct before Step 4. | Yes |
| `backend/DOCKER_COMPOSE_PLAN.md` | Planning note exists while no compose file exists. Safe as docs but must not imply infrastructure is approved. | Keep if documented as planning-only. | No |
| `docs/implementation/IMPLEMENTATION_BACKLOG.md` | Previously modified before this reset request. | Replace with stricter Step 1 backlog. | No after reset |
| `docs/implementation/IMPLEMENTATION_STATUS.md` | Previously modified and contained blocked task status. | Replace with reset status and cleanup blockers. | No after reset |
| `README.md` and `backend/README.md` | Modified in dirty worktree outside this docs-only step. | Do not modify now. Review in Step 2. | Yes |
| `frontend/` | Large added prototype exists with mock simulation storage/engine. Could predate backend architecture controls. | Review. Keep only as prototype; do not infer backend contracts from it. | Yes |

No files were deleted or reverted during this preflight.

## 5. Blockers Before Implementation

| Blocker | Severity | Details | Blocks |
| --- | --- | --- | --- |
| Dirty git state | High | Many added/modified files are present. Some are likely previous implementation attempts. | All product implementation |
| Cleanup decision missing | High | Existing backend/shared/frontend work must be accepted, corrected, or manually reverted. | Step 3+ |
| SQL-first migration authority missing | High | No SQL migration procedure, registry, or tests exist. | Database, cases, sessions, fact ledger, outbox |
| Contract governance incomplete | High | Health-only contracts exist, but contract inventory and full drift checks are missing. | Backend integration, frontend integration, agents, events |
| Shared DTO drift risk | Medium | OpenAPI/docs currently use DTO suffix naming while TypeScript health types do not fully match. | Contract generation/frontend integration |
| Fact ledger/context firewall missing | High | No implementation exists for hidden/revealed facts or context visibility. | Simulation, agents, debrief, safety |
| Event log/outbox missing | High | No durable replay or transactional outbox exists. | Realtime, reliable sessions, frontend replay |
| Eval harness missing | High | Live agents cannot be enabled. | Agents, debrief, pilot |
| Safety engine missing | High | Treatment/action workflows cannot safely accept clinical behavior. | Simulation actions, live agents, pilot |
| Faculty review gate missing | High | Scenario publish and high-risk content remain blocked. | Scenario Studio, pilot |

## 6. Final Preflight Verdict

SAFE WITH WARNINGS

Step 2 is safe and recommended as the next action because it is a cleanup decision step, not product implementation. Product implementation is not safe yet.

Required next action:

- Run Step 2 - Repository Cleanup Decision, if needed.
- Do not implement product code until Step 2 decides the cleanup path for `frontend/`, `backend/api/`, `backend/agent-worker/`, `shared/contracts/`, `README.md`, and `backend/README.md`.
