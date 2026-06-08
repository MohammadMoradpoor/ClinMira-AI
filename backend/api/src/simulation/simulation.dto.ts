export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const SIMULATION_SESSION_CONTRACT_VERSION = "simulation-session.v1" as const
export const CREATE_SIMULATION_SESSION_REQUEST_CONTRACT_VERSION = "create-simulation-session-request.v1" as const
export const SUBMIT_SIMULATION_ACTION_REQUEST_CONTRACT_VERSION = "submit-simulation-action-request.v1" as const
export const SIMULATION_TURN_RESULT_CONTRACT_VERSION = "simulation-turn-result.v1" as const
export const CLINICAL_ACTION_CONTRACT_VERSION = "clinical-action.v1" as const
export const CONVERSATION_MESSAGE_CONTRACT_VERSION = "conversation-message.v1" as const
export const TIMELINE_EVENT_CONTRACT_VERSION = "timeline-event.v1" as const
export const SESSION_STATE_SNAPSHOT_CONTRACT_VERSION = "session-state-snapshot.v1" as const
export const REVEALED_FACT_REFERENCE_CONTRACT_VERSION = "revealed-fact-reference.v1" as const

export const SUPPORTED_ACTION_TYPES = [
  "ask_question",
  "empathy",
  "history_question",
  "exam_observation",
  "order_attempt",
  "diagnosis_attempt",
  "treatment_attempt",
] as const

export type SimulationActionType = (typeof SUPPORTED_ACTION_TYPES)[number]

export type ClinicalActionStatus = "received" | "accepted" | "responded" | "blocked_unsupported" | "failed"
export type ConversationSpeaker = "student" | "mock_patient" | "system"
export type ConversationVisibility = "student_safe" | "internal" | "faculty_only"
export type ConversationStatus = "pending" | "streaming" | "completed" | "failed" | "blocked"
export type TimelineEventType =
  | "session.created"
  | "student.action.submitted"
  | "mock_patient.response.created"
  | "fact.revealed"
  | "unsupported_action.blocked"
  | "safety.action.blocked"
  | "safety.response.blocked"
  | "safety.warning.created"
  | "session.state.snapshotted"
export type RevealedTo = "student_payload" | "mock_patient_context" | "safety_context" | "evaluator_context"

export interface ActorContext {
  institution_id: string
  user_id: string
}

export interface CreateSimulationSessionRequestDto {
  contract_version?: typeof CREATE_SIMULATION_SESSION_REQUEST_CONTRACT_VERSION
  case_version_id: string
  idempotency_key?: string
  client_request_id?: string
}

export interface SubmitSimulationActionRequestDto {
  contract_version?: typeof SUBMIT_SIMULATION_ACTION_REQUEST_CONTRACT_VERSION
  action_type: SimulationActionType
  text?: string
  payload?: Record<string, unknown>
  idempotency_key?: string
  client_sequence?: number
}

export interface RevealedFactReferenceDto {
  contract_version: typeof REVEALED_FACT_REFERENCE_CONTRACT_VERSION
  session_id: string
  fact_id: string
  reveal_rule_id?: string
  revealed_by_action_id?: string
  revealed_to: RevealedTo
  reveal_reason: string
  created_at: string
}

export interface ConversationMessageDto {
  contract_version: typeof CONVERSATION_MESSAGE_CONTRACT_VERSION
  id: string
  session_id: string
  clinical_action_id?: string
  speaker: ConversationSpeaker
  visibility: ConversationVisibility
  status: ConversationStatus
  content: string
  used_fact_ids: string[]
  sequence: number
  created_at: string
}

export interface TimelineEventDto {
  contract_version: typeof TIMELINE_EVENT_CONTRACT_VERSION
  id: string
  session_id: string
  clinical_action_id?: string
  event_type: TimelineEventType
  title: string
  description?: string
  payload: Record<string, unknown>
  sequence: number
  created_at: string
}

export interface SessionStateSnapshotDto {
  contract_version: typeof SESSION_STATE_SNAPSHOT_CONTRACT_VERSION
  id: string
  session_id: string
  state_version: number
  reason: string
  snapshot: Record<string, unknown>
  created_at: string
}

export interface ClinicalActionDto {
  contract_version: typeof CLINICAL_ACTION_CONTRACT_VERSION
  id: string
  session_id: string
  actor_user_id: string
  idempotency_key_id?: string
  action_type: SimulationActionType
  status: ClinicalActionStatus
  sequence: number
  payload: Record<string, unknown>
  normalized_intent?: string
  blocked_reason?: string
  created_at: string
}

export interface SimulationSessionDto {
  contract_version: typeof SIMULATION_SESSION_CONTRACT_VERSION
  id: string
  institution_id: string
  case_id: string
  case_version_id: string
  student_user_id: string
  status: "active" | "completed" | "abandoned" | "expired" | "blocked"
  state_version: number
  patient_state: Record<string, unknown>
  started_at: string
  completed_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
  messages?: ConversationMessageDto[]
  timeline_events?: TimelineEventDto[]
  revealed_facts?: RevealedFactReferenceDto[]
  state_snapshot?: SessionStateSnapshotDto
}

export interface SimulationTurnResultDto {
  contract_version: typeof SIMULATION_TURN_RESULT_CONTRACT_VERSION
  session: SimulationSessionDto
  action: ClinicalActionDto
  messages: ConversationMessageDto[]
  timeline_events: TimelineEventDto[]
  revealed_facts: RevealedFactReferenceDto[]
  state_snapshot: SessionStateSnapshotDto
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

export function isSupportedActionType(value: unknown): value is SimulationActionType {
  return typeof value === "string" && SUPPORTED_ACTION_TYPES.includes(value as SimulationActionType)
}
