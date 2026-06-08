# ClinMira Shared Contracts

This folder contains shared, versioned contracts that are safe for the current backend skeleton.

Current scope:

- Health response contract.
- Skeleton feature-flag contract.
- Health-only OpenAPI skeleton.
- TypeScript contract source location.
- Python/Pydantic contract location placeholder.
- Schema version constants.
- Contract governance and inventory documents.
- Contract foundation tests.

Explicitly not included yet:

- Clinical case contracts.
- Simulation session contracts.
- Agent tool contracts.
- Realtime event contracts.
- Database schema or migrations.

Rules:

- Add clinical, realtime, or agent contracts only through the contract-first backlog gates.
- Do not infer frontend/backend payloads from mock data.
- Keep live-agent and voice flags disabled until their release gates pass.

## Folder Map

| Folder/File | Purpose |
| --- | --- |
| `openapi/` | OpenAPI API/BFF contracts. Current file is health-only. |
| `src/` | TypeScript DTOs and schema version constants. |
| `python/` | Python/Pydantic contract package location. Pydantic models are not added yet. |
| `schemas/` | JSON Schemas for current skeleton DTOs. |
| `tests/` | Contract foundation tests. |
| `DTO_NAMING.md` | DTO naming rules for TypeScript, Python/Pydantic, JSON Schema, OpenAPI, events, tools, and agents. |
| `CONTRACT_GOVERNANCE.md` | Contract change rules, no-go conditions, and required evidence before new contracts are added. |
| `CONTRACT_INVENTORY.md` | Current health-only contract inventory and blocked future contract surfaces. |

## Canonical Current DTOs

| DTO | Version | Surfaces |
| --- | --- | --- |
| `HealthCheckResponseDto` | `health-check-response.v1` | OpenAPI component, TypeScript DTO, JSON Schema, Python version constant placeholder. |
| `FeatureFlagSnapshotDto` | `feature-flag-snapshot.v1` | OpenAPI component, TypeScript DTO, JSON Schema, Python version constant placeholder. |
