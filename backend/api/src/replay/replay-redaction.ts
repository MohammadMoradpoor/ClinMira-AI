import {
  isReplayPayloadClassification,
  type ReplayAudience,
  type ReplayEventDto,
  type ReplayEventLogRow,
  type ReplayPayloadClassification,
} from "./replay.dto"

const STUDENT_CLASSIFICATIONS = new Set<ReplayPayloadClassification>(["public", "student_safe"])
const FACULTY_CLASSIFICATIONS = new Set<ReplayPayloadClassification>([
  "public",
  "student_safe",
  "faculty_only",
  "safety_restricted",
])
const SYSTEM_CLASSIFICATIONS = new Set<ReplayPayloadClassification>([
  "public",
  "student_safe",
  "faculty_only",
  "safety_restricted",
  "internal",
  "audit_only",
])

const FORBIDDEN_KEY_MARKERS = new Set([
  "apikey",
  "authorization",
  "answerkey",
  "debrieftargets",
  "developermessage",
  "evaluatoronly",
  "facultyonlynotes",
  "facultynotes",
  "frontendmock",
  "hiddenanswer",
  "hiddendiagnosis",
  "hiddenfact",
  "hiddenfacts",
  "internalprompt",
  "matchedexcerpt",
  "mockdata",
  "mockfrontend",
  "mocksource",
  "password",
  "providersecret",
  "providertrace",
  "rawfactcontent",
  "rubric",
  "safetyonly",
  "scoring",
  "secret",
  "systemprompt",
  "toolsecret",
  "tracepayload",
  "windowlocalstorage",
])

const FORBIDDEN_TEXT_PATTERNS = [
  /api\s*key/i,
  /answer\s*key/i,
  /debrief\s*target/i,
  /evaluator[-_\s]*only/i,
  /faculty[-_\s]*only/i,
  /faculty\s*note/i,
  /frontend[-_\s]*mock/i,
  /hidden[-_\s]*diagnosis/i,
  /hidden[-_\s]*fact/i,
  /hidden_until_revealed/i,
  /internal\s*prompt/i,
  /local[-_\s]*storage/i,
  /mock[-_\s]*data/i,
  /mock[-_\s]*frontend/i,
  /mock[-_\s]*source/i,
  /provider\s*secret/i,
  /provider\s*trace/i,
  /raw\s*fact/i,
  /safety[-_\s]*only/i,
  /system\s*prompt/i,
  /tool\s*secret/i,
  /window\.localStorage/i,
  new RegExp(`frontend[/\\\\][^\\s"']*mock[-_]?data`, "i"),
]

const STUDENT_SAFETY_KEYS = new Set([
  "action_id",
  "action_type",
  "blocked_reason",
  "message",
  "safety_categories",
  "safety_decision",
  "safety_rule_keys",
  "session_id",
  "status",
])

export interface ReplayRedactionResult {
  event: ReplayEventDto | null
  redaction_applied: boolean
}

interface SanitizedValue {
  value: unknown
  redaction_applied: boolean
}

export function redactReplayEvent(row: ReplayEventLogRow, audience: ReplayAudience): ReplayRedactionResult {
  if (!isReplayPayloadClassification(row.payload_classification)) {
    return {
      event: null,
      redaction_applied: true,
    }
  }

  if (!classificationAllowed(row.payload_classification, audience, row.event_type)) {
    return {
      event: null,
      redaction_applied: true,
    }
  }

  const payloadResult = payloadForAudience(row, audience)

  return {
    event: {
      event_id: row.event_id,
      sequence: row.sequence,
      event_type: row.event_type,
      occurred_at: row.created_at,
      payload_classification: payloadResult.classification,
      payload: payloadResult.payload,
      redaction_applied: payloadResult.redaction_applied,
      event_schema_version: row.event_schema_version,
      trace_id: row.trace_id,
      correlation_id: row.correlation_id,
    },
    redaction_applied: payloadResult.redaction_applied,
  }
}

function classificationAllowed(
  classification: ReplayPayloadClassification,
  audience: ReplayAudience,
  eventType: string,
): boolean {
  if (audience === "student") {
    return STUDENT_CLASSIFICATIONS.has(classification) || (classification === "safety_restricted" && isSafetyEvent(eventType))
  }

  if (audience === "faculty") {
    return FACULTY_CLASSIFICATIONS.has(classification)
  }

  return SYSTEM_CLASSIFICATIONS.has(classification)
}

function payloadForAudience(
  row: ReplayEventLogRow,
  audience: ReplayAudience,
): {
  payload: Record<string, unknown>
  classification: ReplayPayloadClassification
  redaction_applied: boolean
} {
  if (row.payload_classification === "safety_restricted") {
    return {
      payload: studentSafeSafetyPayload(row.payload),
      classification: audience === "student" ? "student_safe" : "safety_restricted",
      redaction_applied: true,
    }
  }

  if (row.payload_classification !== "public" && row.payload_classification !== "student_safe") {
    return {
      payload: {
        restricted_event: true,
        source_classification: row.payload_classification,
      },
      classification: row.payload_classification,
      redaction_applied: true,
    }
  }

  const sanitized = sanitizeReplayValue(row.payload)
  return {
    payload: toObject(sanitized.value),
    classification: row.payload_classification,
    redaction_applied: audience === "student" || sanitized.redaction_applied || row.redaction_status === "role_filtered",
  }
}

function studentSafeSafetyPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const safePayload: Record<string, unknown> = {
    safety_event: true,
  }

  for (const [key, value] of Object.entries(payload)) {
    if (!STUDENT_SAFETY_KEYS.has(key)) {
      continue
    }

    const sanitized = sanitizeReplayValue(value)
    if (sanitized.value !== undefined) {
      safePayload[key] = sanitized.value
    }
  }

  if (!("message" in safePayload) && !("blocked_reason" in safePayload)) {
    safePayload.message = "A deterministic safety event was recorded for this simulation turn."
  }

  return safePayload
}

function sanitizeReplayValue(value: unknown): SanitizedValue {
  if (Array.isArray(value)) {
    let redactionApplied = false
    const items = value
      .map((item) => {
        const sanitized = sanitizeReplayValue(item)
        redactionApplied = redactionApplied || sanitized.redaction_applied
        return sanitized.value
      })
      .filter((item) => item !== undefined)

    return {
      value: items,
      redaction_applied: redactionApplied,
    }
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return sanitizeObject(record)
  }

  if (typeof value === "string") {
    if (FORBIDDEN_TEXT_PATTERNS.some((pattern) => pattern.test(value))) {
      return {
        value: "[redacted]",
        redaction_applied: true,
      }
    }

    return {
      value,
      redaction_applied: false,
    }
  }

  return {
    value,
    redaction_applied: false,
  }
}

function sanitizeObject(record: Record<string, unknown>): SanitizedValue {
  const output: Record<string, unknown> = {}
  let redactionApplied = false

  for (const [key, value] of Object.entries(record)) {
    if (isForbiddenKey(key)) {
      redactionApplied = true
      continue
    }

    if (key === "revealed_facts" && Array.isArray(value)) {
      output[key] = sanitizeRevealedFactReferences(value)
      redactionApplied = true
      continue
    }

    const sanitized = sanitizeReplayValue(value)
    redactionApplied = redactionApplied || sanitized.redaction_applied
    if (sanitized.value !== undefined) {
      output[key] = sanitized.value
    }
  }

  return {
    value: output,
    redaction_applied: redactionApplied,
  }
}

function sanitizeRevealedFactReferences(value: unknown[]): Record<string, unknown>[] {
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      const reference: Record<string, unknown> = {}

      for (const key of ["fact_id", "reveal_rule_id", "revealed_by_action_id", "revealed_to", "reveal_reason", "created_at"]) {
        if (typeof item[key] === "string") {
          reference[key] = item[key]
        }
      }

      return reference
    })
}

function isSafetyEvent(eventType: string): boolean {
  return eventType.startsWith("safety.") || eventType.includes(".blocked")
}

function isForbiddenKey(key: string): boolean {
  const normalized = normalizeKey(key)

  return (
    FORBIDDEN_KEY_MARKERS.has(normalized) ||
    normalized.includes("apikey") ||
    normalized.includes("authorization") ||
    normalized.includes("password") ||
    normalized.includes("providersecret") ||
    normalized.includes("secret") ||
    normalized.includes("systemprompt") ||
    normalized.includes("toolsecret") ||
    normalized.includes("frontendmock") ||
    normalized.includes("mockfrontend") ||
    normalized.includes("mockdata") ||
    normalized.includes("mocksource") ||
    normalized.includes("localstorage")
  )
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}
