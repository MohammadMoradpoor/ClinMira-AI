# TypeScript Contract Location

TypeScript DTOs and contract constants live in this folder.

Current files:

- `feature-flags.ts`
- `health-response.ts`
- `schema-versions.ts`

Current canonical exports:

- `HealthCheckResponseDto`
- `FeatureFlagSnapshotDto`
- `buildHealthCheckResponseDto`
- `buildFeatureFlagSnapshotDto`
- `disabledSkeletonFeatureFlagSnapshotDto`
- `API_CONTRACT_VERSION`
- `HEALTH_CONTRACT_VERSION`
- `FEATURE_FLAGS_CONTRACT_VERSION`

Rules:

- Keep TypeScript DTO names aligned with `shared/contracts/DTO_NAMING.md`.
- Do not add backward aliases for non-canonical DTO names without an ADR-level compatibility exception.
- Do not add clinical DTOs until the contract inventory gate is complete.
- Do not import frontend mock data into this package.
