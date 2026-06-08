import { Injectable } from "@nestjs/common"

import {
  buildHealthCheckResponseDto,
  disabledSkeletonFeatureFlagSnapshotDto,
  type HealthCheckResponseDto,
} from "@clinmira/contracts"

@Injectable()
export class HealthService {
  getHealth(): HealthCheckResponseDto {
    return buildHealthCheckResponseDto({
      service: "api-bff",
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
      runtime: "nestjs",
      feature_flags: disabledSkeletonFeatureFlagSnapshotDto,
      checks: {
        clinical_product_apis: "mock_simulation_only",
        clinical_business_logic: "not_implemented",
        database: process.env.CLINMIRA_DATABASE_URL ? "configured_for_simulation" : "not_configured",
        live_openai_calls: "disabled",
        realtime_transport: "not_configured",
        temporal_workflows: "not_configured",
      },
    })
  }
}
