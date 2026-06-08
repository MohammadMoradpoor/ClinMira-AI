# ClinMira Initial Eval Harness

Step 9 creates the first release-blocking evaluation harness for ClinMira AI.

This harness is intentionally local and deterministic. It does not call OpenAI, does not run live agents, does not use frontend mock data, and does not require Redis, WebSocket/SSE, Temporal, Docker, or production auth/RBAC.

## Scope

- Versioned eval suite metadata.
- Release-blocking threshold policy.
- Synthetic golden, hidden fact leakage, prompt injection, unsupported claim, and risky action fixtures.
- Assertion utilities for student-safe payloads, hidden fact denial, fact grounding, and source boundary checks.
- Local eval runner that writes `backend/evals/results/latest.json`.
- Optional DB-backed runtime evals only when `CLINMIRA_TEST_DATABASE_URL` is configured.

## Run

```sh
node backend/evals/lib/eval-runner.mjs
node --test backend/evals/tests/*.test.mjs
```

## Gate

Passing Step 9 does not unblock live agents. Live agents remain blocked until later eval, safety, context-firewall, auth/RBAC, feature-flag, and architecture gates pass.
