export type ClinMiraHttpMethod = "GET" | "POST"

export type Step17BRouteStatus = "approved_step_17b" | "future_only_blocked"

export interface FrontendContractInventoryEntry {
  readonly method: ClinMiraHttpMethod
  readonly path: string
  readonly contractSource: string
  readonly requestTypeName: string | null
  readonly responseTypeName: string
  readonly temporaryActorContextRequired: boolean
  readonly idempotencyKeyRequired: boolean
  readonly status: Step17BRouteStatus
  readonly notes: string
}

export const STEP_17B_APPROVED_ROUTE_INVENTORY = [
  {
    method: "GET",
    path: "/health",
    contractSource: "shared/contracts/openapi/clinmira-api.v1.json#/paths/~1health",
    requestTypeName: null,
    responseTypeName: "HealthCheckResponseDto",
    temporaryActorContextRequired: false,
    idempotencyKeyRequired: false,
    status: "approved_step_17b",
    notes: "Health-only endpoint. Exposes no clinical data.",
  },
  {
    method: "GET",
    path: "/api/v1/health",
    contractSource: "shared/contracts/openapi/clinmira-api.v1.json#/paths/~1api~1v1~1health",
    requestTypeName: null,
    responseTypeName: "HealthCheckResponseDto",
    temporaryActorContextRequired: false,
    idempotencyKeyRequired: false,
    status: "approved_step_17b",
    notes: "Versioned health-only endpoint. Exposes no clinical data.",
  },
  {
    method: "POST",
    path: "/api/v1/simulation-sessions",
    contractSource:
      "shared/contracts/openapi/clinmira-api.v1.json#/paths/~1api~1v1~1simulation-sessions",
    requestTypeName: "CreateSimulationSessionRequestDto",
    responseTypeName: "SimulationSessionDto",
    temporaryActorContextRequired: true,
    idempotencyKeyRequired: true,
    status: "approved_step_17b",
    notes: "Creates a backend-owned deterministic mock session. Temporary actor headers are not auth/RBAC.",
  },
  {
    method: "GET",
    path: "/api/v1/simulation-sessions/{id}",
    contractSource:
      "shared/contracts/openapi/clinmira-api.v1.json#/paths/~1api~1v1~1simulation-sessions~1{id}",
    requestTypeName: null,
    responseTypeName: "SimulationSessionDto",
    temporaryActorContextRequired: true,
    idempotencyKeyRequired: false,
    status: "approved_step_17b",
    notes: "Reads a student-safe session projection for the temporary actor context.",
  },
  {
    method: "POST",
    path: "/api/v1/simulation-sessions/{id}/actions",
    contractSource:
      "shared/contracts/openapi/clinmira-api.v1.json#/paths/~1api~1v1~1simulation-sessions~1{id}~1actions",
    requestTypeName: "SubmitSimulationActionRequestDto",
    responseTypeName: "SimulationTurnResultDto",
    temporaryActorContextRequired: true,
    idempotencyKeyRequired: true,
    status: "approved_step_17b",
    notes: "Submits deterministic mock actions only. Safety decisions remain backend-owned.",
  },
] as const satisfies readonly FrontendContractInventoryEntry[]

export const STEP_17B_FUTURE_ONLY_ROUTE_INVENTORY = [
  {
    method: "GET",
    path: "/api/v1/simulation-sessions/{sessionId}/replay",
    contractSource: "shared/contracts/events/replay-response.schema.json",
    requestTypeName: "ReplayRequest",
    responseTypeName: "ReplayResponse",
    temporaryActorContextRequired: true,
    idempotencyKeyRequired: false,
    status: "future_only_blocked",
    notes: "Future replay/reducer work only. No Step 17B client wrapper is implemented.",
  },
  {
    method: "GET",
    path: "/api/v1/simulation-sessions/{sessionId}/events/stream",
    contractSource: "shared/contracts/events/realtime-stream.schema.json",
    requestTypeName: "RealtimeStreamRequest",
    responseTypeName: "RealtimeStreamFrame",
    temporaryActorContextRequired: true,
    idempotencyKeyRequired: false,
    status: "future_only_blocked",
    notes: "Future delivery-only SSE work only. No EventSource/SSE client is implemented in Step 17B.",
  },
] as const satisfies readonly FrontendContractInventoryEntry[]

export type Step17BApprovedRouteTemplate = (typeof STEP_17B_APPROVED_ROUTE_INVENTORY)[number]["path"]

const APPROVED_ROUTE_TEMPLATES = new Set<string>(
  STEP_17B_APPROVED_ROUTE_INVENTORY.map((entry) => entry.path),
)

export function isStep17BApprovedRouteTemplate(path: string): path is Step17BApprovedRouteTemplate {
  return APPROVED_ROUTE_TEMPLATES.has(path)
}

export function getStep17BRouteInventoryEntry(path: Step17BApprovedRouteTemplate) {
  return STEP_17B_APPROVED_ROUTE_INVENTORY.find((entry) => entry.path === path)
}
