import { Injectable } from "@nestjs/common"
import type { QueryResultRow } from "pg"

import type { TransactionClient } from "../database/transaction"
import {
  isReplayPayloadClassification,
  REPLAY_EVENT_STREAM_TYPE,
  type ReplayActorContext,
  type ReplayEventLogRow,
  type ReplayPayloadClassification,
} from "./replay.dto"
import { ReplayNotFoundError } from "./replay.errors"

interface SessionScopeRow extends QueryResultRow {
  id: string
}

interface UserScopeRow extends QueryResultRow {
  id: string
}

interface EventLogQueryRow extends QueryResultRow {
  event_id: string
  institution_id: string
  stream_type: string
  stream_id: string
  sequence: string | number
  event_type: string
  event_schema_version: string
  payload_classification: string
  replayable: boolean
  payload: unknown
  redaction_status: string | null
  trace_id: string | null
  correlation_id: string | null
  created_at: Date | string
}

@Injectable()
export class ReplayRepository {
  async assertSessionScope(
    client: TransactionClient,
    actor: ReplayActorContext,
    sessionId: string,
  ): Promise<void> {
    const userResult = await client.query<UserScopeRow>(
      `
        SELECT id
        FROM users
        WHERE institution_id = $1
          AND id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [actor.institution_id, actor.user_id],
    )

    if (userResult.rowCount !== 1) {
      throw new ReplayNotFoundError("Replay actor was not found for institution")
    }

    const sessionResult = await client.query<SessionScopeRow>(
      `
        SELECT id
        FROM simulation_sessions
        WHERE institution_id = $1
          AND id = $2
          AND student_user_id = $3
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [actor.institution_id, sessionId, actor.user_id],
    )

    if (sessionResult.rowCount !== 1) {
      throw new ReplayNotFoundError()
    }
  }

  async loadReplayableSessionEvents(
    client: TransactionClient,
    actor: ReplayActorContext,
    sessionId: string,
    afterSequence: number,
    limitWithLookahead: number,
  ): Promise<ReplayEventLogRow[]> {
    const result = await client.query<EventLogQueryRow>(
      `
        SELECT
          id::text AS event_id,
          institution_id::text AS institution_id,
          stream_type,
          stream_id::text AS stream_id,
          sequence,
          event_type,
          schema_version AS event_schema_version,
          payload_classification,
          replayable,
          payload,
          redaction_status,
          trace_id,
          correlation_id,
          created_at
        FROM event_log
        WHERE institution_id = $1
          AND (
            (stream_type = $2 AND stream_id = $3::uuid)
            OR (aggregate_type = 'simulation_session' AND aggregate_id = $3::uuid)
          )
          AND replayable = true
          AND sequence > $4::bigint
        ORDER BY sequence ASC, created_at ASC, id ASC
        LIMIT $5
      `,
      [
        actor.institution_id,
        REPLAY_EVENT_STREAM_TYPE,
        sessionId,
        afterSequence,
        limitWithLookahead,
      ],
    )

    return result.rows.map(mapEventLogRow)
  }
}

function mapEventLogRow(row: EventLogQueryRow): ReplayEventLogRow {
  const classification = isReplayPayloadClassification(row.payload_classification)
    ? row.payload_classification
    : ("internal" satisfies ReplayPayloadClassification)

  return {
    event_id: row.event_id,
    institution_id: row.institution_id,
    stream_type: row.stream_type,
    stream_id: row.stream_id,
    sequence: Number(row.sequence),
    event_type: row.event_type,
    event_schema_version: row.event_schema_version,
    payload_classification: classification,
    replayable: row.replayable,
    payload: toJsonObject(row.payload),
    redaction_status: row.redaction_status ?? undefined,
    trace_id: row.trace_id ?? undefined,
    correlation_id: row.correlation_id ?? undefined,
    created_at: toIso(row.created_at),
  }
}

function toJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }

  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}
