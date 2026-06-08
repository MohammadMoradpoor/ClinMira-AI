# ClinMira DTO Naming Rules

## Purpose

This document defines shared DTO naming before clinical contracts are added. It prevents frontend, API/BFF, Python workers, Temporal payloads, events, and agent schemas from drifting into ad hoc names.

Current scope:

- Health DTOs.
- Skeleton feature-flag DTOs.
- Naming rules for future DTOs.

Explicitly not included yet:

- Clinical case DTOs.
- Simulation session DTOs.
- Event DTOs.
- Agent tool DTOs.
- Database schema models.

## Naming Pattern

| Contract Type | TypeScript Name | Pydantic Name | JSON Schema Name | Notes |
| --- | --- | --- | --- | --- |
| API response | `<Resource><Action>ResponseDto` | `<Resource><Action>ResponseDto` | `<resource>-<action>-response.v<major>.schema.json` | Example: `HealthCheckResponseDto`. |
| API request | `<Resource><Action>RequestDto` | `<Resource><Action>RequestDto` | `<resource>-<action>-request.v<major>.schema.json` | No clinical requests exist yet. |
| Snapshot | `<Resource>SnapshotDto` | `<Resource>SnapshotDto` | `<resource>-snapshot.v<major>.schema.json` | Example: `FeatureFlagSnapshotDto`. |
| Event payload | `<Domain><EventName>EventDto` | `<Domain><EventName>EventDto` | `<domain>.<event-name>.v<major>.schema.json` | Requires event catalog gate. |
| Agent input | `<AgentName>InputDto` | `<AgentName>InputDto` | `<agent-name>-input.v<major>.schema.json` | Requires agent contract gate. |
| Agent output | `<AgentName>OutputDto` | `<AgentName>OutputDto` | `<agent-name>-output.v<major>.schema.json` | Requires agent contract gate. |
| Tool input | `<ToolName>ToolInputDto` | `<ToolName>ToolInputDto` | `<tool-name>-input.v<major>.schema.json` | Requires tool registry gate. |
| Tool output | `<ToolName>ToolOutputDto` | `<ToolName>ToolOutputDto` | `<tool-name>-output.v<major>.schema.json` | Requires tool registry gate. |

Rules:

- DTO names describe transport contracts, not database tables.
- DTO names must end with `Dto`.
- API DTO names must include `RequestDto` or `ResponseDto`.
- Cross-cutting read models may use `SnapshotDto` only when they are not database entities and expose no clinical state.
- Event DTOs must include schema version and redaction policy before implementation.
- Agent/tool DTOs must include visibility and permission policy before implementation.
- Clinical DTOs must not be created from frontend mock data.
- Every DTO family must have a schema version constant.
- Backward aliases for non-canonical DTO names are forbidden unless an ADR-level compatibility exception is recorded.

## Current DTOs

| DTO | TypeScript Location | Pydantic Location | Schema Location | Version |
| --- | --- | --- | --- | --- |
| `HealthCheckResponseDto` | `shared/contracts/src/health-response.ts` | `shared/contracts/python/clinmira_contracts/schemas/` placeholder | `shared/contracts/schemas/health-response.schema.json` | `health-check-response.v1` |
| `FeatureFlagSnapshotDto` | `shared/contracts/src/feature-flags.ts` | `shared/contracts/python/clinmira_contracts/schemas/` placeholder | `shared/contracts/schemas/feature-flags.schema.json` | `feature-flag-snapshot.v1` |

## Current Canonical Exports

The shared TypeScript contract package must export these names as the canonical health-only surface:

- `API_CONTRACT_VERSION`
- `HEALTH_CONTRACT_VERSION`
- `FEATURE_FLAGS_CONTRACT_VERSION`
- `HealthCheckResponseDto`
- `FeatureFlagSnapshotDto`
- `buildHealthCheckResponseDto`
- `buildFeatureFlagSnapshotDto`
- `disabledSkeletonFeatureFlagSnapshotDto`

The old names `HealthResponse`, `FeatureFlagSnapshot`, `buildHealthResponse`, and `disabledSkeletonFeatureFlags` are not accepted as canonical or compatibility aliases in Step 4.
