import { Controller, Headers, Param, Query, Sse } from "@nestjs/common"
import { from, type Observable } from "rxjs"

import { type ReplayActorContext } from "../replay/replay.dto"
import { ReplayBadRequestError, toReplayHttpException } from "../replay/replay.errors"
import { isPostgresUuid } from "../replay/replay-uuid"
import { RealtimeService } from "./realtime.service"
import type { RealtimeSseMessage } from "./realtime.dto"

@Controller("api/v1/simulation-sessions")
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Sse(":sessionId/events/stream")
  async streamSessionEvents(
    @Headers("x-clinmira-institution-id") institutionId: string | undefined,
    @Headers("x-clinmira-user-id") userId: string | undefined,
    @Param("sessionId") sessionId: string,
    @Query("after_sequence") afterSequence: unknown,
    @Query("audience") audience: unknown,
  ): Promise<Observable<RealtimeSseMessage>> {
    try {
      const messages = await this.realtimeService.replayFirstStreamMessages(
        this.actorFromHeaders(institutionId, userId),
        sessionId,
        {
          after_sequence: afterSequence,
          audience,
        },
      )

      return from(messages)
    } catch (error) {
      throw toReplayHttpException(error)
    }
  }

  private actorFromHeaders(institutionId: string | undefined, userId: string | undefined): ReplayActorContext {
    const scopedInstitutionId = institutionId ?? ""
    const scopedUserId = userId ?? ""

    if (!isPostgresUuid(scopedInstitutionId)) {
      throw toReplayHttpException(
        new ReplayBadRequestError("actor_institution_header_invalid", "x-clinmira-institution-id must be a UUID"),
      )
    }

    if (!isPostgresUuid(scopedUserId)) {
      throw toReplayHttpException(
        new ReplayBadRequestError("actor_user_header_invalid", "x-clinmira-user-id must be a UUID"),
      )
    }

    return {
      institution_id: scopedInstitutionId,
      user_id: scopedUserId,
      audience: "student",
    }
  }
}
