import type { SimulationActionType } from "../simulation/simulation.dto"

export const SAFETY_RULESET_VERSION = "safety-rules.v1" as const
export const SAFETY_EVALUATION_CONTRACT_VERSION = "safety-evaluation.v1" as const
export const SAFETY_FINDING_CONTRACT_VERSION = "safety-finding.v1" as const

export type SafetyEvaluationType = "pre_action" | "post_response"
export type SafetyDecision = "allow" | "warn" | "block" | "block_unsupported"
export type SafetySeverity = "none" | "low" | "medium" | "high" | "critical"
export type SafetyRuleSeverity = Exclude<SafetySeverity, "none">
export type SafetyAction = SafetyDecision
export type SafetyCategory =
  | "prompt_injection"
  | "hidden_fact_request"
  | "faculty_only_request"
  | "system_prompt_request"
  | "role_escalation"
  | "unsupported_diagnosis"
  | "unsupported_treatment"
  | "unsupported_medication"
  | "unsupported_imaging"
  | "unsupported_debrief"
  | "risky_action"
  | "fact_reference"
  | "uncertain"

export interface SafetyRuleDefinition {
  rule_key: string
  rule_version: typeof SAFETY_RULESET_VERSION
  category: SafetyCategory
  severity: SafetyRuleSeverity
  action: SafetyAction
  message: string
  text_patterns?: RegExp[]
  action_types?: SimulationActionType[]
  response_patterns?: RegExp[]
  requires_fact_reference?: boolean
}

export interface SafetyFindingDto {
  contract_version: typeof SAFETY_FINDING_CONTRACT_VERSION
  rule_key: string
  category: SafetyCategory
  severity: SafetyRuleSeverity
  action: SafetyAction
  message: string
  matched_excerpt?: string
  metadata: Record<string, unknown>
}

export interface SafetyEvaluationResultDto {
  contract_version: typeof SAFETY_EVALUATION_CONTRACT_VERSION
  evaluation_type: SafetyEvaluationType
  decision: SafetyDecision
  max_severity: SafetySeverity
  blocked: boolean
  reason: string
  ruleset_version: typeof SAFETY_RULESET_VERSION
  findings: SafetyFindingDto[]
  metadata: Record<string, unknown>
}

export interface PreActionSafetyInput {
  institution_id: string
  session_id: string
  clinical_action_id: string
  action_type: SimulationActionType
  text?: string
  payload?: Record<string, unknown>
}

export interface PostResponseSafetyInput {
  institution_id: string
  session_id: string
  clinical_action_id: string
  action_type: SimulationActionType
  response_text: string
  used_fact_ids: string[]
}

export interface PersistSafetyEvaluationInput {
  institution_id: string
  session_id: string
  clinical_action_id: string
  input_text?: string
  output_text?: string
  action_type: SimulationActionType
  evaluation: SafetyEvaluationResultDto
}

export interface PersistedSafetyEvaluationDto {
  id: string
  decision: SafetyDecision
  blocked: boolean
  finding_count: number
}
