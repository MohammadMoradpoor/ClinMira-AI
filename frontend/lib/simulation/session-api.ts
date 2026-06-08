import {
  createNonProductionActorContext,
  isStrictUuid,
  toNonProductionActorHeaders,
  type NonProductionActorContext,
} from "../api/actor-context"
import { ClinMiraApiClient } from "../api/client"
import {
  assertHealthCheckResponseDto,
  assertNoForbiddenStudentPayloadKeys,
  assertSimulationSessionDto,
  assertSimulationTurnResultDto,
  CREATE_SIMULATION_SESSION_REQUEST_CONTRACT_VERSION,
  HEALTH_CHECK_RESPONSE_CONTRACT_VERSION,
  SIMULATION_SESSION_CONTRACT_VERSION,
  SIMULATION_TURN_RESULT_CONTRACT_VERSION,
  SUBMIT_SIMULATION_ACTION_REQUEST_CONTRACT_VERSION,
  type CreateSimulationSessionRequestDto,
  type HealthCheckResponseDto,
  type SimulationSessionDto,
  type SubmitSimulationActionRequestDto,
  type SimulationActionType,
  type SimulationTurnResultDto,
} from "../api/contracts"
import { ensureClinMiraIdempotencyKey } from "../api/idempotency"

export interface ClinMiraSessionApiOptions {
  readonly client?: ClinMiraApiClient
}

export interface CreateSimulationSessionInput {
  readonly case_version_id: string
  readonly idempotency_key?: string
  readonly client_request_id?: string
}

export interface SubmitSimulationActionInput {
  readonly action_type: SimulationActionType
  readonly text?: string
  readonly payload?: Record<string, unknown>
  readonly idempotency_key?: string
  readonly client_sequence?: number
}

function clientFromOptions(options: ClinMiraSessionApiOptions | undefined): ClinMiraApiClient {
  return options?.client ?? new ClinMiraApiClient()
}

function requireUuid(value: string, label: string): string {
  if (!isStrictUuid(value)) {
    throw new Error(`ClinMira session API requires a UUID ${label}.`)
  }

  return value
}

function requireSimulationActionType(value: SimulationActionType): SimulationActionType {
  if (
    value !== "ask_question" &&
    value !== "empathy" &&
    value !== "history_question" &&
    value !== "exam_observation" &&
    value !== "order_attempt" &&
    value !== "diagnosis_attempt" &&
    value !== "treatment_attempt"
  ) {
    throw new Error("ClinMira session API requires an approved simulation action_type.")
  }

  return value
}

function sessionPath(sessionId: string): string {
  return `/api/v1/simulation-sessions/${encodeURIComponent(requireUuid(sessionId, "sessionId"))}`
}

function sessionActionsPath(sessionId: string): string {
  return `${sessionPath(sessionId)}/actions`
}

export async function getHealth(options?: ClinMiraSessionApiOptions): Promise<HealthCheckResponseDto> {
  return clientFromOptions(options).request<HealthCheckResponseDto>({
    routeTemplate: "/health",
    method: "GET",
    expectedContractVersion: HEALTH_CHECK_RESPONSE_CONTRACT_VERSION,
    validateResponse: assertHealthCheckResponseDto,
  })
}

export async function getVersionedHealth(options?: ClinMiraSessionApiOptions): Promise<HealthCheckResponseDto> {
  return clientFromOptions(options).request<HealthCheckResponseDto>({
    routeTemplate: "/api/v1/health",
    method: "GET",
    expectedContractVersion: HEALTH_CHECK_RESPONSE_CONTRACT_VERSION,
    validateResponse: assertHealthCheckResponseDto,
  })
}

export async function createSimulationSession(
  actorContextInput: NonProductionActorContext,
  input: CreateSimulationSessionInput,
  options?: ClinMiraSessionApiOptions,
): Promise<SimulationSessionDto> {
  const actorContext = createNonProductionActorContext(actorContextInput)
  const request: CreateSimulationSessionRequestDto = {
    contract_version: CREATE_SIMULATION_SESSION_REQUEST_CONTRACT_VERSION,
    case_version_id: requireUuid(input.case_version_id, "case_version_id"),
    idempotency_key: ensureClinMiraIdempotencyKey(input.idempotency_key, {
      scope: "create-simulation-session",
    }),
    client_request_id: input.client_request_id,
  }

  return clientFromOptions(options).request<SimulationSessionDto>({
    routeTemplate: "/api/v1/simulation-sessions",
    method: "POST",
    headers: toNonProductionActorHeaders(actorContext),
    body: request,
    expectedContractVersion: SIMULATION_SESSION_CONTRACT_VERSION,
    validateResponse: assertSimulationSessionDto,
  })
}

export async function getSimulationSession(
  actorContextInput: NonProductionActorContext,
  sessionId: string,
  options?: ClinMiraSessionApiOptions,
): Promise<SimulationSessionDto> {
  const actorContext = createNonProductionActorContext(actorContextInput)

  return clientFromOptions(options).request<SimulationSessionDto>({
    routeTemplate: "/api/v1/simulation-sessions/{id}",
    path: sessionPath(sessionId),
    method: "GET",
    headers: toNonProductionActorHeaders(actorContext),
    expectedContractVersion: SIMULATION_SESSION_CONTRACT_VERSION,
    validateResponse: assertSimulationSessionDto,
  })
}

export async function submitSimulationAction(
  actorContextInput: NonProductionActorContext,
  sessionId: string,
  input: SubmitSimulationActionInput,
  options?: ClinMiraSessionApiOptions,
): Promise<SimulationTurnResultDto> {
  const actorContext = createNonProductionActorContext(actorContextInput)
  assertNoForbiddenStudentPayloadKeys(input.payload, "SubmitSimulationActionInput.payload")

  const request: SubmitSimulationActionRequestDto = {
    contract_version: SUBMIT_SIMULATION_ACTION_REQUEST_CONTRACT_VERSION,
    action_type: requireSimulationActionType(input.action_type),
    text: input.text,
    payload: input.payload,
    idempotency_key: ensureClinMiraIdempotencyKey(input.idempotency_key, {
      scope: "submit-simulation-action",
    }),
    client_sequence: input.client_sequence,
  }

  return clientFromOptions(options).request<SimulationTurnResultDto>({
    routeTemplate: "/api/v1/simulation-sessions/{id}/actions",
    path: sessionActionsPath(sessionId),
    method: "POST",
    headers: toNonProductionActorHeaders(actorContext),
    body: request,
    expectedContractVersion: SIMULATION_TURN_RESULT_CONTRACT_VERSION,
    validateResponse: assertSimulationTurnResultDto,
  })
}
