import type { FeatureFlagSnapshotDto } from "./feature-flags"
import { HEALTH_CONTRACT_VERSION } from "./schema-versions"

export { HEALTH_CONTRACT_VERSION }

export type HealthStatus = "ok" | "degraded" | "blocked"
export type SkeletonServiceName = "api-bff" | "agent-worker"

export interface HealthCheckResponseDto {
  contract_version: typeof HEALTH_CONTRACT_VERSION
  service: SkeletonServiceName
  status: HealthStatus
  version: string
  runtime: string
  timestamp: string
  feature_flags: FeatureFlagSnapshotDto
  checks: Record<string, string>
}

export function buildHealthCheckResponseDto(
  input: Omit<HealthCheckResponseDto, "contract_version" | "timestamp">,
): HealthCheckResponseDto {
  return {
    contract_version: HEALTH_CONTRACT_VERSION,
    timestamp: new Date().toISOString(),
    ...input,
  }
}
