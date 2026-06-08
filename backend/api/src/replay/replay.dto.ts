export const REPLAY_RESPONSE_SCHEMA_VERSION = "clinmira.replay.v1" as const
export const REPLAY_DEFAULT_LIMIT = 100
export const REPLAY_MAX_LIMIT = 500
export const REPLAY_EVENT_STREAM_TYPE = "simulation_session" as const

export const REPLAY_AUDIENCES = ["student", "faculty", "system"] as const
export type ReplayAudience = (typeof REPLAY_AUDIENCES)[number]

export const REPLAY_PAYLOAD_CLASSIFICATIONS = [
  "public",
  "student_safe",
  "faculty_only",
  "safety_restricted",
  "internal",
  "audit_only",
] as const
export type ReplayPayloadClassification = (typeof REPLAY_PAYLOAD_CLASSIFICATIONS)[number]

export interface ReplayActorContext {
  institution_id: string
  user_id: string
  audience: ReplayAudience
}

export interface ReplayEventLogRow {
  event_id: string
  institution_id: string
  stream_type: string
  stream_id: string
  sequence: number
  event_type: string
  event_schema_version: string
  payload_classification: ReplayPayloadClassification
  replayable: boolean
  payload: Record<string, unknown>
  redaction_status?: string
  trace_id?: string
  correlation_id?: string
  created_at: string
}

export interface ReplayEventDto {
  event_id: string
  sequence: number
  event_type: string
  occurred_at: string
  payload_classification: ReplayPayloadClassification
  payload: Record<string, unknown>
  redaction_applied: boolean
  event_schema_version?: string
  trace_id?: string
  correlation_id?: string
}

export interface ReplayCursorDto {
  after_sequence: number
}

export interface ReplayResponseDto {
  schema_version: typeof REPLAY_RESPONSE_SCHEMA_VERSION
  session_id: string
  audience: ReplayAudience
  from_sequence_exclusive: number
  to_sequence_inclusive: number
  has_more: boolean
  events: ReplayEventDto[]
  gap_detected: boolean
  duplicate_count: number
  next_cursor: ReplayCursorDto
  redaction_applied: boolean
  snapshot_required: boolean
}

export interface ReplayRequestQuery {
  after_sequence: number
  limit: number
  audience: ReplayAudience
}

export function isReplayAudience(value: unknown): value is ReplayAudience {
  return typeof value === "string" && REPLAY_AUDIENCES.includes(value as ReplayAudience)
}

export function isReplayPayloadClassification(value: unknown): value is ReplayPayloadClassification {
  return (
    typeof value === "string" &&
    REPLAY_PAYLOAD_CLASSIFICATIONS.includes(value as ReplayPayloadClassification)
  )
}
