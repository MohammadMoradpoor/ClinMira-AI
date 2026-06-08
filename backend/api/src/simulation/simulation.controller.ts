import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common"

import { isUuid, type ActorContext, type SimulationSessionDto, type SimulationTurnResultDto } from "./simulation.dto"
import { SimulationBadRequestError, toSimulationHttpException } from "./simulation.errors"
import { SimulationService } from "./simulation.service"

@Controller("api/v1/simulation-sessions")
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post()
  async createSession(
    @Headers("x-clinmira-institution-id") institutionId: string | undefined,
    @Headers("x-clinmira-user-id") userId: string | undefined,
    @Body() body: unknown,
  ): Promise<SimulationSessionDto> {
    try {
      return await this.simulationService.createSession(this.actorFromHeaders(institutionId, userId), body)
    } catch (error) {
      throw toSimulationHttpException(error)
    }
  }

  @Get(":id")
  async getSession(
    @Headers("x-clinmira-institution-id") institutionId: string | undefined,
    @Headers("x-clinmira-user-id") userId: string | undefined,
    @Param("id") sessionId: string,
  ): Promise<SimulationSessionDto> {
    try {
      return await this.simulationService.getSession(this.actorFromHeaders(institutionId, userId), sessionId)
    } catch (error) {
      throw toSimulationHttpException(error)
    }
  }

  @Post(":id/actions")
  async submitAction(
    @Headers("x-clinmira-institution-id") institutionId: string | undefined,
    @Headers("x-clinmira-user-id") userId: string | undefined,
    @Param("id") sessionId: string,
    @Body() body: unknown,
  ): Promise<SimulationTurnResultDto> {
    try {
      return await this.simulationService.submitAction(this.actorFromHeaders(institutionId, userId), sessionId, body)
    } catch (error) {
      throw toSimulationHttpException(error)
    }
  }

  private actorFromHeaders(institutionId: string | undefined, userId: string | undefined): ActorContext {
    if (!isUuid(institutionId)) {
      throw toSimulationHttpException(
        new SimulationBadRequestError("actor_institution_header_invalid", "x-clinmira-institution-id must be a UUID"),
      )
    }

    if (!isUuid(userId)) {
      throw toSimulationHttpException(
        new SimulationBadRequestError("actor_user_header_invalid", "x-clinmira-user-id must be a UUID"),
      )
    }

    return {
      institution_id: institutionId,
      user_id: userId,
    }
  }
}
