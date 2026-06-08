import { Controller, Get } from "@nestjs/common"

import type { HealthCheckResponseDto } from "@clinmira/contracts"

import { HealthService } from "./health.service"

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("health")
  getHealth(): HealthCheckResponseDto {
    return this.healthService.getHealth()
  }

  @Get("api/v1/health")
  getVersionedHealth(): HealthCheckResponseDto {
    return this.healthService.getHealth()
  }
}
