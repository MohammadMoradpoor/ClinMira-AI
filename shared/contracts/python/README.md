# Python/Pydantic Contract Location

This folder is the Python contract package location for future Pydantic schemas.

Current scope:

- Version constants.
- Package placeholders.

Current canonical constants:

- `API_CONTRACT_VERSION`
- `HEALTH_CONTRACT_VERSION`
- `HEALTH_CHECK_RESPONSE_CONTRACT_VERSION`
- `FEATURE_FLAGS_CONTRACT_VERSION`
- `FEATURE_FLAG_SNAPSHOT_CONTRACT_VERSION`

Explicitly not included yet:

- Pydantic dependency.
- Clinical schemas.
- Agent input/output schemas.
- Tool schemas.
- Event schemas.

Rules:

- Pydantic models must be added only after the relevant contract gate is approved.
- Python schema names must match `shared/contracts/DTO_NAMING.md`.
- Python contracts must not define independent clinical truth or database schema.
