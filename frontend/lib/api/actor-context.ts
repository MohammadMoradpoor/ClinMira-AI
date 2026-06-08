const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface NonProductionActorContext {
  readonly institutionId: string
  readonly userId: string
}

export const NON_PRODUCTION_ACTOR_CONTEXT_NOTICE =
  "Temporary Step 17B actor context only. These headers are not production auth or RBAC."

export function isStrictUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

export function createNonProductionActorContext(input: NonProductionActorContext): NonProductionActorContext {
  if (!isStrictUuid(input.institutionId)) {
    throw new Error("Non-production actor context requires a UUID institutionId.")
  }

  if (!isStrictUuid(input.userId)) {
    throw new Error("Non-production actor context requires a UUID userId.")
  }

  return {
    institutionId: input.institutionId,
    userId: input.userId,
  }
}

export function toNonProductionActorHeaders(input: NonProductionActorContext): Record<string, string> {
  const actorContext = createNonProductionActorContext(input)

  return {
    "x-clinmira-institution-id": actorContext.institutionId,
    "x-clinmira-user-id": actorContext.userId,
  }
}

export const isUuidLike = isStrictUuid
