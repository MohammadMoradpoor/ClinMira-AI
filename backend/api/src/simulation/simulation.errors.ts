import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"

import { DatabaseConfigurationError } from "../database/database.service"

export class SimulationBadRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "SimulationBadRequestError"
  }
}

export class SimulationNotFoundError extends Error {
  constructor(message = "Simulation resource not found") {
    super(message)
    this.name = "SimulationNotFoundError"
  }
}

export class SimulationConflictError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "SimulationConflictError"
  }
}

export function toSimulationHttpException(error: unknown): Error {
  if (error instanceof DatabaseConfigurationError) {
    return new ServiceUnavailableException({
      code: "database_not_configured",
      message: error.message,
    })
  }

  if (error instanceof SimulationBadRequestError) {
    return new BadRequestException({
      code: error.code,
      message: error.message,
    })
  }

  if (error instanceof SimulationNotFoundError) {
    return new NotFoundException({
      code: "simulation_not_found",
      message: error.message,
    })
  }

  if (error instanceof SimulationConflictError) {
    return new ConflictException({
      code: error.code,
      message: error.message,
    })
  }

  return error instanceof Error ? error : new Error("Unknown simulation runtime error")
}
