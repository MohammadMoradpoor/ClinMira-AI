import { Controller, Get, Headers, Param, Query } from "@nestjs/common"

import { type ReplayActorContext, type ReplayResponseDto } from "./replay.dto"
import { ReplayBadRequestError, toReplayHttpException } from "./replay.errors"
import { ReplayService } from "./replay.service"
import { isPostgresUuid } from "./replay-uuid"

@Controller("api/v1/simulation-sessions")
export class ReplayController {
  constructor(private readonly replayService: ReplayService) {}

  @Get(":sessionId/replay")
  async replaySession(
    @Headers("x-clinmira-institution-id") institutionId: string | undefined,
    @Headers("x-clinmira-user-id") userId: string | undefined,
    @Param("sessionId") sessionId: string,
    @Query("after_sequence") afterSequence: unknown,
    @Query("limit") limit: unknown,
    @Query("audience") audience: unknown,
  ): Promise<ReplayResponseDto> {
    try {
      return await this.replayService.replaySession(this.actorFromHeaders(institutionId, userId), sessionId, {
        after_sequence: afterSequence,
        limit,
        audience,
      })
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
