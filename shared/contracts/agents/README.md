# Agent Contracts

Step 11 authorizes mock-agent contract foundations only.

These schemas define the shape used by the Python agent-worker skeleton for deterministic local mock agents. They do not authorize live model providers, OpenAI-specific fields, model routing, tool calls, handoffs, debrief generation, faculty review, imaging interpretation, treatment planning, or frontend integration.

Important limits:

- `mode` is mock-only.
- Agent context is student-safe or revealed-fact-reference-only.
- Persona input must not include hidden facts, faculty-only notes, internal prompts, provider secrets, or raw fact ledger content.
- Agent traces are redacted by default.
- The disabled live-provider path remains outside these contracts until Step 12 gates pass.
