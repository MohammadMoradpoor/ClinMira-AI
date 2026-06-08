# ClinMira OpenAPI Contracts

This folder is the OpenAPI contract location for the API/BFF.

Current scope:

- `clinmira-api.v1.json` contains health endpoints only.

Rules:

- Do not add clinical case, simulation, debrief, faculty, agent-control, or realtime endpoints until the relevant contract gate is complete.
- OpenAPI contract changes must be mirrored in TypeScript DTOs and Python/Pydantic schema planning.
- Future generated frontend DTOs must come from this contract or an approved generation pipeline, not from mock data.
- Health endpoints are safe because they expose no clinical, tenant, student, faculty, agent, or event data.

