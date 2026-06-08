import { createHash } from "node:crypto"

import { Injectable } from "@nestjs/common"

import { DatabaseService } from "../database/database.service"
import {
  isSupportedActionType,
  isUuid,
  type ActorContext,
  type CreateSimulationSessionRequestDto,
  type SimulationSessionDto,
  type SimulationTurnResultDto,
  type SubmitSimulationActionRequestDto,
} from "./simulation.dto"
import { SimulationBadRequestError } from "./simulation.errors"
import { SimulationRepository } from "./simulation.repository"

@Injectable()
export class SimulationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly repository: SimulationRepository,
  ) {}

  async createSession(actor: ActorContext, body: unknown): Promise<SimulationSessionDto> {
    const request = this.parseCreateSessionRequest(body)

    return this.database.withTransaction((client) =>
      this.repository.createSession(client, actor, request.case_version_id),
    )
  }

  async getSession(actor: ActorContext, sessionId: string): Promise<SimulationSessionDto> {
    if (!isUuid(sessionId)) {
      throw new SimulationBadRequestError("session_id_invalid", "Session id must be a UUID")
    }

    return this.database.withTransaction((client) => this.repository.getSession(client, actor, sessionId))
  }

  async submitAction(actor: ActorContext, sessionId: string, body: unknown): Promise<SimulationTurnResultDto> {
    if (!isUuid(sessionId)) {
      throw new SimulationBadRequestError("session_id_invalid", "Session id must be a UUID")
    }

    const request = this.parseSubmitActionRequest(body)
    const requestHash = hashRequest({
      session_id: sessionId,
      actor_user_id: actor.user_id,
      action_type: request.action_type,
      text: request.text ?? null,
      payload: request.payload ?? {},
    })

    const result = await this.database.withTransaction((client) =>
      this.repository.submitAction(client, actor, sessionId, requestHash, request),
    )

    return result.result
  }

  private parseCreateSessionRequest(body: unknown): CreateSimulationSessionRequestDto {
    const record = asRecord(body)

    if (!record || !isUuid(record.case_version_id)) {
      throw new SimulationBadRequestError("case_version_id_invalid", "case_version_id must be a UUID")
    }

    return {
      case_version_id: record.case_version_id,
      idempotency_key: optionalString(record.idempotency_key),
      client_request_id: optionalString(record.client_request_id),
    }
  }

  private parseSubmitActionRequest(body: unknown): SubmitSimulationActionRequestDto {
    const record = asRecord(body)

    if (!record || !isSupportedActionType(record.action_type)) {
      throw new SimulationBadRequestError("action_type_invalid", "action_type is not supported by the mock engine")
    }

    const text = optionalString(record.text)
    const payload = asRecord(record.payload) ?? {}
    const idempotencyKey = optionalString(record.idempotency_key)
    const clientSequence = typeof record.client_sequence === "number" ? record.client_sequence : undefined

    if (idempotencyKey !== undefined && idempotencyKey.trim().length < 8) {
      throw new SimulationBadRequestError("idempotency_key_invalid", "idempotency_key must be at least 8 characters")
    }

    if (clientSequence !== undefined && (!Number.isInteger(clientSequence) || clientSequence < 1)) {
      throw new SimulationBadRequestError("client_sequence_invalid", "client_sequence must be a positive integer")
    }

    return {
      action_type: record.action_type,
      text,
      payload,
      idempotency_key: idempotencyKey,
      client_sequence: clientSequence,
    }
  }
}

function hashRequest(value: Record<string, unknown>): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex")
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`
  }

  return JSON.stringify(value)
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}
