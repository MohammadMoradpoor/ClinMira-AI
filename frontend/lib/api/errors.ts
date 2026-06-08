export type ClinMiraApiErrorKind =
  | "backend_unavailable"
  | "timeout"
  | "bad_request"
  | "missing_actor_context"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "idempotency_conflict"
  | "safety_block"
  | "unknown_response_shape"
  | "unknown_contract_version"
  | "http_error"

export interface ClinMiraApiErrorDetails {
  readonly kind: ClinMiraApiErrorKind
  readonly message: string
  readonly status?: number
  readonly backendCode?: string
  readonly backendMessage?: string | string[]
  readonly route?: string
}

export class ClinMiraApiError extends Error {
  readonly kind: ClinMiraApiErrorKind
  readonly status?: number
  readonly backendCode?: string
  readonly backendMessage?: string | string[]
  readonly route?: string

  constructor(details: ClinMiraApiErrorDetails) {
    super(details.message)
    this.name = "ClinMiraApiError"
    this.kind = details.kind
    this.status = details.status
    this.backendCode = details.backendCode
    this.backendMessage = details.backendMessage
    this.route = details.route
  }
}

export function isClinMiraApiError(error: unknown): error is ClinMiraApiError {
  return error instanceof ClinMiraApiError
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function backendMessageFromBody(body: unknown): string | string[] | undefined {
  if (!isRecord(body)) {
    return undefined
  }

  const message = body.message
  if (typeof message === "string") {
    return message
  }

  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message
  }

  return undefined
}

function backendCodeFromBody(body: unknown): string | undefined {
  if (!isRecord(body) || typeof body.code !== "string") {
    return undefined
  }

  return body.code
}

function renderBackendMessage(backendMessage?: string | string[]): string {
  return Array.isArray(backendMessage) ? backendMessage.join(" ") : (backendMessage ?? "")
}

function inferErrorKind(
  status: number,
  backendCode?: string,
  backendMessage?: string | string[],
): ClinMiraApiErrorKind {
  const lowerCode = backendCode?.toLowerCase() ?? ""
  const lowerMessage = renderBackendMessage(backendMessage).toLowerCase()
  const safetyText = `${lowerCode} ${lowerMessage}`

  if (safetyText.includes("safety") || safetyText.includes("unsafe") || safetyText.includes("blocked_unsupported")) {
    return "safety_block"
  }

  if (
    status === 400 &&
    (lowerCode.includes("actor") ||
      lowerCode.includes("header") ||
      lowerCode.includes("tenant") ||
      lowerMessage.includes("actor") ||
      lowerMessage.includes("header") ||
      lowerMessage.includes("tenant") ||
      lowerMessage.includes("x-clinmira-institution-id") ||
      lowerMessage.includes("x-clinmira-user-id"))
  ) {
    return "missing_actor_context"
  }

  if (status === 400) {
    return "bad_request"
  }

  if (status === 401) {
    return "unauthorized"
  }

  if (status === 403) {
    return "forbidden"
  }

  if (status === 404) {
    return "not_found"
  }

  if (status === 409) {
    return "idempotency_conflict"
  }

  return "http_error"
}

export function normalizeHttpError(status: number, body: unknown, route?: string): ClinMiraApiError {
  const backendCode = backendCodeFromBody(body)
  const backendMessage = backendMessageFromBody(body)
  const kind = inferErrorKind(status, backendCode, backendMessage)
  const renderedMessage = Array.isArray(backendMessage) ? backendMessage.join("; ") : backendMessage

  return new ClinMiraApiError({
    kind,
    status,
    backendCode,
    backendMessage,
    route,
    message: renderedMessage ?? `ClinMira API request failed with HTTP ${status}`,
  })
}

export function normalizeNetworkError(error: unknown, route?: string): ClinMiraApiError {
  if (isClinMiraApiError(error)) {
    return error
  }

  if (isRecord(error) && error.name === "AbortError") {
    return new ClinMiraApiError({
      kind: "timeout",
      route,
      message: "ClinMira API request was aborted or timed out.",
    })
  }

  return new ClinMiraApiError({
    kind: "backend_unavailable",
    route,
    message: "ClinMira API is unavailable.",
  })
}

export function unknownResponseShapeError(route?: string): ClinMiraApiError {
  return new ClinMiraApiError({
    kind: "unknown_response_shape",
    route,
    message: "ClinMira API returned an unknown response shape.",
  })
}

export function unknownContractVersionError(expectedContractVersion: string, route?: string): ClinMiraApiError {
  return new ClinMiraApiError({
    kind: "unknown_contract_version",
    route,
    message: `ClinMira API returned an unsupported contract version; expected ${expectedContractVersion}.`,
  })
}
