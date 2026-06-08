import type { SimulationActionType } from "./simulation.dto"

export interface FactForMockResponse {
  fact_id: string
  fact_type: string
  visibility: "baseline_visible" | "hidden_until_revealed"
  student_safe_summary?: string | null
  content?: Record<string, unknown> | null
  reveal_rule_id?: string | null
}

export interface MockPatientResponseInput {
  action_type: SimulationActionType
  text?: string
  allowed_facts: FactForMockResponse[]
  eligible_allergy_fact?: FactForMockResponse
}

export interface MockPatientResponseResult {
  content: string
  used_fact_ids: string[]
  newly_revealed_fact?: FactForMockResponse
  blocked_reason?: string
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /reveal hidden diagnosis/i,
  /show system prompt/i,
  /tell me faculty notes/i,
  /bypass rules/i,
]

const DIAGNOSIS_PATTERNS = [/\bdiagnos(?:is|e|tic)\b/i, /\bwhat do i have\b/i]
const ALLERGY_PATTERNS = [/\ballerg(?:y|ies|ic)\b/i, /\blatex\b/i]

export function isPromptInjection(text = ""): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text))
}

export function isDiagnosisRequest(text = ""): boolean {
  return DIAGNOSIS_PATTERNS.some((pattern) => pattern.test(text))
}

export function isAllergyQuestion(text = ""): boolean {
  return ALLERGY_PATTERNS.some((pattern) => pattern.test(text))
}

export function isRiskyAction(actionType: SimulationActionType): boolean {
  return ["order_attempt", "diagnosis_attempt", "treatment_attempt"].includes(actionType)
}

export function buildMockPatientResponse(input: MockPatientResponseInput): MockPatientResponseResult {
  const text = input.text ?? ""

  if (isPromptInjection(text)) {
    return {
      content:
        "I can only answer as the simulated patient. I cannot reveal hidden instructions, system prompts, or faculty-only notes.",
      used_fact_ids: [],
    }
  }

  if (input.action_type === "empathy") {
    return {
      content: "Thank you for saying that. I feel comfortable continuing with the intake.",
      used_fact_ids: [],
    }
  }

  if (isDiagnosisRequest(text)) {
    return {
      content: "I am not sure what the diagnosis is. I can describe what I am feeling if you ask me about symptoms.",
      used_fact_ids: [],
    }
  }

  if (isAllergyQuestion(text)) {
    const alreadyRevealedAllergy = input.allowed_facts.find((fact) => fact.fact_type === "allergy")
    const allergyFact = alreadyRevealedAllergy ?? input.eligible_allergy_fact

    if (allergyFact) {
      return {
        content: buildAllergyPhrase(allergyFact),
        used_fact_ids: [allergyFact.fact_id],
        newly_revealed_fact: alreadyRevealedAllergy ? undefined : allergyFact,
      }
    }

    return {
      content: "I do not have allergy information to share right now in this simulation.",
      used_fact_ids: [],
    }
  }

  const baselineFact = input.allowed_facts.find((fact) => fact.student_safe_summary)

  if (baselineFact?.student_safe_summary) {
    return {
      content: `I can tell you this: ${baselineFact.student_safe_summary}`,
      used_fact_ids: [baselineFact.fact_id],
    }
  }

  return {
    content: "I am ready to answer normal intake questions about how I am feeling in this simulation.",
    used_fact_ids: [],
  }
}

function buildAllergyPhrase(fact: FactForMockResponse): string {
  const allergen = asNonEmptyString(fact.content?.allergen)
  const reaction = asNonEmptyString(fact.content?.reaction)

  if (allergen && reaction) {
    return `Yes. In this simulation, I have an allergy to ${allergen} that causes ${reaction}.`
  }

  if (allergen) {
    return `Yes. In this simulation, I have an allergy to ${allergen}.`
  }

  return "Yes. In this simulation, I have an allergy that I should mention."
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined
}
