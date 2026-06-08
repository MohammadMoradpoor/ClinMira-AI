import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common"

import { DatabaseConfigurationError } from "../database/database.service"

export class ReplayBadRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = "ReplayBadRequestError"
  }
}

export class ReplayNotFoundError extends Error {
  constructor(message = "Replay session not found for actor scope") {
    super(message)
    this.name = "ReplayNotFoundError"
  }
}

export function toReplayHttpException(error: unknown): Error {
  if (error instanceof DatabaseConfigurationError) {
    return new ServiceUnavailableException({
      code: "database_not_configured",
      message: error.message,
    })
  }

  if (error instanceof ReplayBadRequestError) {
    return new BadRequestException({
      code: error.code,
      message: error.message,
    })
  }

  if (error instanceof ReplayNotFoundError) {
    return new NotFoundException({
      code: "replay_session_not_found",
      message: error.message,
    })
  }

  return error instanceof Error ? error : new Error("Unknown replay runtime error")
}
