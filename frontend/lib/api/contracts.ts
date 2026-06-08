export const HEALTH_CHECK_RESPONSE_CONTRACT_VERSION = "health-check-response.v1" as const
export const FEATURE_FLAG_SNAPSHOT_CONTRACT_VERSION = "feature-flag-snapshot.v1" as const
export const CREATE_SIMULATION_SESSION_REQUEST_CONTRACT_VERSION =
  "create-simulation-session-request.v1" as const
export const SIMULATION_SESSION_CONTRACT_VERSION = "simulation-session.v1" as const
export const SUBMIT_SIMULATION_ACTION_REQUEST_CONTRACT_VERSION =
  "submit-simulation-action-request.v1" as const
export const SIMULATION_TURN_RESULT_CONTRACT_VERSION = "simulation-turn-result.v1" as const
export const CLINICAL_ACTION_CONTRACT_VERSION = "clinical-action.v1" as const
export const CONVERSATION_MESSAGE_CONTRACT_VERSION = "conversation-message.v1" as const
export const TIMELINE_EVENT_CONTRACT_VERSION = "timeline-event.v1" as const
export const SESSION_STATE_SNAPSHOT_CONTRACT_VERSION = "session-state-snapshot.v1" as const
export const REVEALED_FACT_REFERENCE_CONTRACT_VERSION = "revealed-fact-reference.v1" as const

export type JsonObject = Record<string, unknown>

export interface FeatureFlagSnapshotDto {
  live_agents: false
  realtime_transport: false
  voice_mode: false
  evaluator_debrief: false
  faculty_review: false
  scenario_publish: false
  agent_control: false
  advanced_imaging: false
}

export interface HealthCheckResponseDto {
  contract_version: typeof HEALTH_CHECK_RESPONSE_CONTRACT_VERSION
  service: "api-bff" | "agent-worker"
  status: "ok" | "degraded" | "blocked"
  version: string
  runtime: string
  timestamp: string
  feature_flags: FeatureFlagSnapshotDto
  checks: Record<string, string>
}

export interface CreateSimulationSessionRequestDto {
  contract_version?: typeof CREATE_SIMULATION_SESSION_REQUEST_CONTRACT_VERSION
  case_version_id: string
  idempotency_key?: string
  client_request_id?: string
}

export type SimulationActionType =
  | "ask_question"
  | "empathy"
  | "history_question"
  | "exam_observation"
  | "order_attempt"
  | "diagnosis_attempt"
  | "treatment_attempt"

export type ClinicalActionStatus = "received" | "accepted" | "responded" | "blocked_unsupported" | "failed"
export type ConversationSpeaker = "student" | "mock_patient" | "system"
export type ConversationStatus = "pending" | "streaming" | "completed" | "failed" | "blocked"
export type ConversationVisibility = "student_safe" | "internal" | "faculty_only"
export type TimelineEventType =
  | "session.created"
  | "student.action.submitted"
  | "mock_patient.response.created"
  | "fact.revealed"
  | "unsupported_action.blocked"
  | "session.state.snapshotted"
export type RevealedTo = "student_payload" | "mock_patient_context" | "safety_context" | "evaluator_context"

export interface SubmitSimulationActionRequestDto {
  contract_version?: typeof SUBMIT_SIMULATION_ACTION_REQUEST_CONTRACT_VERSION
  action_type: SimulationActionType
  text?: string
  payload?: JsonObject
  idempotency_key: string
  client_sequence?: number
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
  payload: JsonObject
  normalized_intent?: string
  blocked_reason?: string
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
  payload: JsonObject
  sequence: number
  created_at: string
}

export interface SessionStateSnapshotDto {
  contract_version: typeof SESSION_STATE_SNAPSHOT_CONTRACT_VERSION
  id: string
  session_id: string
  state_version: number
  reason: string
  snapshot: JsonObject
  created_at: string
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

export interface SimulationSessionDto {
  contract_version: typeof SIMULATION_SESSION_CONTRACT_VERSION
  id: string
  institution_id: string
  case_id: string
  case_version_id: string
  student_user_id: string
  status: "active" | "completed" | "abandoned" | "expired" | "blocked"
  state_version: number
  patient_state: JsonObject
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

export interface SimulationErrorDto {
  code: string
  message: string
}

const FORBIDDEN_STUDENT_PAYLOAD_KEYS = new Set([
  "hiddenDiagnosis",
  "hidden_diagnosis",
  "hiddenHistoryPrompt",
  "raw_fact_content",
  "faculty_only_notes",
  "facultyRubric",
  "system_prompt",
  "internal_prompt",
  "provider_secret",
  "tool_secret",
  "api_key",
  "localStorage",
  "treatment_execution",
  "imaging_interpretation",
  "debrief",
  "scoring",
  "faculty_workflow",
])

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isIntegerAtLeast(value: unknown, minimum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= minimum
}

function isSimulationActionType(value: unknown): value is SimulationActionType {
  return (
    value === "ask_question" ||
    value === "empathy" ||
    value === "history_question" ||
    value === "exam_observation" ||
    value === "order_attempt" ||
    value === "diagnosis_attempt" ||
    value === "treatment_attempt"
  )
}

function isClinicalActionStatus(value: unknown): value is ClinicalActionStatus {
  return (
    value === "received" ||
    value === "accepted" ||
    value === "responded" ||
    value === "blocked_unsupported" ||
    value === "failed"
  )
}

function isConversationStatus(value: unknown): value is ConversationStatus {
  return (
    value === "pending" ||
    value === "streaming" ||
    value === "completed" ||
    value === "failed" ||
    value === "blocked"
  )
}

function isTimelineEventType(value: unknown): value is TimelineEventType {
  return (
    value === "session.created" ||
    value === "student.action.submitted" ||
    value === "mock_patient.response.created" ||
    value === "fact.revealed" ||
    value === "unsupported_action.blocked" ||
    value === "session.state.snapshotted"
  )
}

export function hasForbiddenStudentPayloadKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenStudentPayloadKey(item))
  }

  if (!isRecord(value)) {
    return false
  }

  return Object.entries(value).some(
    ([key, nested]) => FORBIDDEN_STUDENT_PAYLOAD_KEYS.has(key) || hasForbiddenStudentPayloadKey(nested),
  )
}

export function assertNoForbiddenStudentPayloadKeys(value: unknown, label: string): void {
  if (hasForbiddenStudentPayloadKey(value)) {
    throw new Error(`${label} contains a prototype-only or non-student-safe field.`)
  }
}

function hasOnlyFalseFeatureFlags(value: unknown): value is FeatureFlagSnapshotDto {
  return (
    isRecord(value) &&
    value.live_agents === false &&
    value.realtime_transport === false &&
    value.voice_mode === false &&
    value.evaluator_debrief === false &&
    value.faculty_review === false &&
    value.scenario_publish === false &&
    value.agent_control === false &&
    value.advanced_imaging === false
  )
}

export function assertHealthCheckResponseDto(value: unknown): value is HealthCheckResponseDto {
  return (
    isRecord(value) &&
    value.contract_version === HEALTH_CHECK_RESPONSE_CONTRACT_VERSION &&
    (value.service === "api-bff" || value.service === "agent-worker") &&
    (value.status === "ok" || value.status === "degraded" || value.status === "blocked") &&
    isString(value.version) &&
    isString(value.runtime) &&
    isString(value.timestamp) &&
    hasOnlyFalseFeatureFlags(value.feature_flags) &&
    isRecord(value.checks) &&
    Object.values(value.checks).every((item) => typeof item === "string") &&
    !hasForbiddenStudentPayloadKey(value)
  )
}

function assertClinicalActionDto(value: unknown): value is ClinicalActionDto {
  return (
    isRecord(value) &&
    value.contract_version === CLINICAL_ACTION_CONTRACT_VERSION &&
    isString(value.id) &&
    isString(value.session_id) &&
    isString(value.actor_user_id) &&
    isSimulationActionType(value.action_type) &&
    isClinicalActionStatus(value.status) &&
    isIntegerAtLeast(value.sequence, 1) &&
    isRecord(value.payload) &&
    isString(value.created_at) &&
    !hasForbiddenStudentPayloadKey(value)
  )
}

function assertConversationMessageDto(value: unknown): value is ConversationMessageDto {
  return (
    isRecord(value) &&
    value.contract_version === CONVERSATION_MESSAGE_CONTRACT_VERSION &&
    isString(value.id) &&
    isString(value.session_id) &&
    (value.speaker === "student" || value.speaker === "mock_patient" || value.speaker === "system") &&
    value.visibility === "student_safe" &&
    isConversationStatus(value.status) &&
    isString(value.content) &&
    Array.isArray(value.used_fact_ids) &&
    value.used_fact_ids.every((item) => typeof item === "string") &&
    isIntegerAtLeast(value.sequence, 1) &&
    isString(value.created_at) &&
    !hasForbiddenStudentPayloadKey(value)
  )
}

function assertTimelineEventDto(value: unknown): value is TimelineEventDto {
  return (
    isRecord(value) &&
    value.contract_version === TIMELINE_EVENT_CONTRACT_VERSION &&
    isString(value.id) &&
    isString(value.session_id) &&
    isTimelineEventType(value.event_type) &&
    isString(value.title) &&
    isRecord(value.payload) &&
    isIntegerAtLeast(value.sequence, 1) &&
    isString(value.created_at) &&
    !hasForbiddenStudentPayloadKey(value)
  )
}

function assertSessionStateSnapshotDto(value: unknown): value is SessionStateSnapshotDto {
  return (
    isRecord(value) &&
    value.contract_version === SESSION_STATE_SNAPSHOT_CONTRACT_VERSION &&
    isString(value.id) &&
    isString(value.session_id) &&
    isIntegerAtLeast(value.state_version, 1) &&
    isString(value.reason) &&
    isRecord(value.snapshot) &&
    isString(value.created_at) &&
    !hasForbiddenStudentPayloadKey(value)
  )
}

function assertRevealedFactReferenceDto(value: unknown): value is RevealedFactReferenceDto {
  return (
    isRecord(value) &&
    value.contract_version === REVEALED_FACT_REFERENCE_CONTRACT_VERSION &&
    isString(value.session_id) &&
    isString(value.fact_id) &&
    value.revealed_to === "student_payload" &&
    isString(value.reveal_reason) &&
    isString(value.created_at) &&
    !hasForbiddenStudentPayloadKey(value)
  )
}

export function assertSimulationSessionDto(value: unknown): value is SimulationSessionDto {
  return (
    isRecord(value) &&
    value.contract_version === SIMULATION_SESSION_CONTRACT_VERSION &&
    isString(value.id) &&
    isString(value.institution_id) &&
    isString(value.case_id) &&
    isString(value.case_version_id) &&
    isString(value.student_user_id) &&
    (value.status === "active" ||
      value.status === "completed" ||
      value.status === "abandoned" ||
      value.status === "expired" ||
      value.status === "blocked") &&
    isIntegerAtLeast(value.state_version, 1) &&
    isRecord(value.patient_state) &&
    isString(value.started_at) &&
    isString(value.created_at) &&
    isString(value.updated_at) &&
    (value.messages === undefined ||
      (Array.isArray(value.messages) && value.messages.every(assertConversationMessageDto))) &&
    (value.timeline_events === undefined ||
      (Array.isArray(value.timeline_events) && value.timeline_events.every(assertTimelineEventDto))) &&
    (value.revealed_facts === undefined ||
      (Array.isArray(value.revealed_facts) && value.revealed_facts.every(assertRevealedFactReferenceDto))) &&
    (value.state_snapshot === undefined || assertSessionStateSnapshotDto(value.state_snapshot)) &&
    !hasForbiddenStudentPayloadKey(value)
  )
}

export function assertSimulationTurnResultDto(value: unknown): value is SimulationTurnResultDto {
  return (
    isRecord(value) &&
    value.contract_version === SIMULATION_TURN_RESULT_CONTRACT_VERSION &&
    assertSimulationSessionDto(value.session) &&
    assertClinicalActionDto(value.action) &&
    Array.isArray(value.messages) &&
    value.messages.every(assertConversationMessageDto) &&
    Array.isArray(value.timeline_events) &&
    value.timeline_events.every(assertTimelineEventDto) &&
    Array.isArray(value.revealed_facts) &&
    value.revealed_facts.every(assertRevealedFactReferenceDto) &&
    assertSessionStateSnapshotDto(value.state_snapshot) &&
    !hasForbiddenStudentPayloadKey(value)
  )
}
