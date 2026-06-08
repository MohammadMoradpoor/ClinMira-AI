const DEFAULT_IDEMPOTENCY_SCOPE = "clinmira-step17b"

export interface CreateClinMiraIdempotencyKeyOptions {
  readonly scope?: string
  readonly randomUuid?: () => string
}

function randomUuidFromCrypto(): string {
  const cryptoApi = globalThis.crypto

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID()
  }

  if (!cryptoApi?.getRandomValues) {
    throw new Error("A cryptographic random source is required for ClinMira idempotency keys.")
  }

  const bytes = new Uint8Array(16)
  cryptoApi.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
    .slice(8, 10)
    .join("")}-${hex.slice(10, 16).join("")}`
}

export function createClinMiraIdempotencyKey(options: CreateClinMiraIdempotencyKeyOptions = {}): string {
  const scope = options.scope?.trim() || DEFAULT_IDEMPOTENCY_SCOPE
  const uuid = options.randomUuid?.() ?? randomUuidFromCrypto()

  if (!uuid || uuid.length < 8) {
    throw new Error("ClinMira idempotency key generation failed closed.")
  }

  return `${scope}:${uuid}`
}

export function requireClinMiraIdempotencyKey(value: string | undefined): string {
  if (typeof value !== "string" || value.trim().length < 8) {
    throw new Error("A ClinMira idempotency key is required for this mutating action.")
  }

  return value.trim()
}

export function ensureClinMiraIdempotencyKey(
  value: string | undefined,
  options: CreateClinMiraIdempotencyKeyOptions = {},
): string {
  return requireClinMiraIdempotencyKey(value ?? createClinMiraIdempotencyKey(options))
}
