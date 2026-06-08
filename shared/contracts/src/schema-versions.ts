export const CONTRACT_VERSION_SET = "clinmira-contracts.v0.skeleton"
export const OPENAPI_CONTRACT_VERSION = "openapi.clinmira-api.v1"
export const API_CONTRACT_VERSION = "api.v1"
export const HEALTH_CONTRACT_VERSION = "health-check-response.v1"
export const HEALTH_CHECK_RESPONSE_CONTRACT_VERSION = HEALTH_CONTRACT_VERSION
export const FEATURE_FLAGS_CONTRACT_VERSION = "feature-flag-snapshot.v1"
export const FEATURE_FLAG_SNAPSHOT_CONTRACT_VERSION = FEATURE_FLAGS_CONTRACT_VERSION

export const CURRENT_SCHEMA_VERSIONS = {
  contractVersionSet: CONTRACT_VERSION_SET,
  openapi: OPENAPI_CONTRACT_VERSION,
  api: API_CONTRACT_VERSION,
  healthCheckResponse: HEALTH_CONTRACT_VERSION,
  featureFlagSnapshot: FEATURE_FLAGS_CONTRACT_VERSION,
} as const
