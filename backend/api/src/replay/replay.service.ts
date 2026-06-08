import { Injectable } from "@nestjs/common"

import { DatabaseService } from "../database/database.service"
import { detectSequenceIntegrity, maxReplaySequence, parseReplayQuery } from "./replay-cursor"
import {
  REPLAY_RESPONSE_SCHEMA_VERSION,
  type ReplayActorContext,
  type ReplayResponseDto,
} from "./replay.dto"
import { ReplayBadRequestError } from "./replay.errors"
import { redactReplayEvent } from "./replay-redaction"
import { ReplayRepository } from "./replay.repository"
import { isPostgresUuid } from "./replay-uuid"

@Injectable()
export class ReplayService {
  constructor(
    private readonly database: DatabaseService,
    private readonly repository: ReplayRepository,
  ) {}

  async replaySession(
    actor: ReplayActorContext,
    sessionId: string,
    rawQuery: {
      after_sequence?: unknown
      limit?: unknown
      audience?: unknown
    },
  ): Promise<ReplayResponseDto> {
    if (!isPostgresUuid(sessionId)) {
      throw new ReplayBadRequestError("session_id_invalid", "sessionId must be a UUID")
    }

    const query = parseReplayQuery(rawQuery)
    const scopedActor: ReplayActorContext = {
      ...actor,
      audience: query.audience,
    }

    return this.database.withTransaction(async (client) => {
      await this.repository.assertSessionScope(client, scopedActor, sessionId)

      const rowsWithLookahead = await this.repository.loadReplayableSessionEvents(
        client,
        scopedActor,
        sessionId,
        query.after_sequence,
        query.limit + 1,
      )
      const pageRows = rowsWithLookahead.slice(0, query.limit)
      const hasMore = rowsWithLookahead.length > query.limit
      const sequenceIntegrity = detectSequenceIntegrity(pageRows, query.after_sequence)
      const toSequenceInclusive = maxReplaySequence(pageRows, query.after_sequence)
      const redactedResults = pageRows.map((row) => redactReplayEvent(row, scopedActor.audience))
      const events = redactedResults
        .map((result) => result.event)
        .filter((event): event is NonNullable<typeof event> => event !== null)
      const redactionApplied = scopedActor.audience === "student" || redactedResults.some((result) => result.redaction_applied)

      return {
        schema_version: REPLAY_RESPONSE_SCHEMA_VERSION,
        session_id: sessionId,
        audience: scopedActor.audience,
        from_sequence_exclusive: query.after_sequence,
        to_sequence_inclusive: toSequenceInclusive,
        has_more: hasMore,
        events,
        gap_detected: sequenceIntegrity.gap_detected,
        duplicate_count: sequenceIntegrity.duplicate_count,
        next_cursor: {
          after_sequence: toSequenceInclusive,
        },
        redaction_applied: redactionApplied,
        snapshot_required: sequenceIntegrity.gap_detected,
      }
    })
  }
}
