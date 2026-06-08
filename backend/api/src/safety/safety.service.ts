import { Injectable } from "@nestjs/common"

import {
  POST_RESPONSE_SAFETY_RULES,
  PRE_ACTION_SAFETY_RULES,
} from "./safety-rules"
import {
  SAFETY_EVALUATION_CONTRACT_VERSION,
  SAFETY_FINDING_CONTRACT_VERSION,
  SAFETY_RULESET_VERSION,
  type PostResponseSafetyInput,
  type PreActionSafetyInput,
  type SafetyDecision,
  type SafetyEvaluationResultDto,
  type SafetyFindingDto,
  type SafetyRuleDefinition,
  type SafetySeverity,
} from "./safety.dto"

@Injectable()
export class SafetyService {
  evaluatePreAction(input: PreActionSafetyInput): SafetyEvaluationResultDto {
    const findings = PRE_ACTION_SAFETY_RULES.flatMap((rule) => this.matchPreActionRule(rule, input))

    return buildEvaluation("pre_action", findings, {
      action_type: input.action_type,
      deterministic: true,
    })
  }

  evaluatePostResponse(input: PostResponseSafetyInput): SafetyEvaluationResultDto {
    const findings = POST_RESPONSE_SAFETY_RULES.flatMap((rule) => this.matchPostResponseRule(rule, input))

    return buildEvaluation("post_response", findings, {
      action_type: input.action_type,
      deterministic: true,
      used_fact_ids_count: input.used_fact_ids.length,
    })
  }

  private matchPreActionRule(rule: SafetyRuleDefinition, input: PreActionSafetyInput): SafetyFindingDto[] {
    if (rule.action_types?.includes(input.action_type)) {
      return [toFinding(rule, input.action_type)]
    }

    const text = input.text ?? ""
    if (!text) {
      return []
    }

    const matchedPattern = rule.text_patterns?.find((pattern) => pattern.test(text))
    return matchedPattern ? [toFinding(rule, excerptForPattern(text, matchedPattern))] : []
  }

  private matchPostResponseRule(rule: SafetyRuleDefinition, input: PostResponseSafetyInput): SafetyFindingDto[] {
    if (rule.requires_fact_reference) {
      return responseRequiresFactReference(input.response_text) && input.used_fact_ids.length === 0
        ? [toFinding(rule, "missing_fact_reference")]
        : []
    }

    const matchedPattern = rule.response_patterns?.find((pattern) => pattern.test(input.response_text))
    return matchedPattern ? [toFinding(rule, excerptForPattern(input.response_text, matchedPattern))] : []
  }
}

function buildEvaluation(
  evaluationType: SafetyEvaluationResultDto["evaluation_type"],
  findings: SafetyFindingDto[],
  metadata: Record<string, unknown>,
): SafetyEvaluationResultDto {
  const decision = chooseDecision(findings)
  const maxSeverity = chooseMaxSeverity(findings)
  const blocked = decision === "block" || decision === "block_unsupported"

  return {
    contract_version: SAFETY_EVALUATION_CONTRACT_VERSION,
    evaluation_type: evaluationType,
    decision,
    max_severity: maxSeverity,
    blocked,
    reason:
      findings.length === 0
        ? "No deterministic safety rule matched."
        : `Deterministic safety rules matched: ${findings.map((finding) => finding.rule_key).join(", ")}`,
    ruleset_version: SAFETY_RULESET_VERSION,
    findings,
    metadata,
  }
}

function chooseDecision(findings: SafetyFindingDto[]): SafetyDecision {
  if (findings.some((finding) => finding.action === "block")) {
    return "block"
  }
  if (findings.some((finding) => finding.action === "block_unsupported")) {
    return "block_unsupported"
  }
  if (findings.some((finding) => finding.action === "warn")) {
    return "warn"
  }
  return "allow"
}

function chooseMaxSeverity(findings: SafetyFindingDto[]): SafetySeverity {
  const rank: Record<SafetySeverity, number> = {
    none: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  }

  return findings.reduce<SafetySeverity>(
    (max, finding) => (rank[finding.severity] > rank[max] ? finding.severity : max),
    "none",
  )
}

function toFinding(rule: SafetyRuleDefinition, matchedExcerpt: string): SafetyFindingDto {
  return {
    contract_version: SAFETY_FINDING_CONTRACT_VERSION,
    rule_key: rule.rule_key,
    category: rule.category,
    severity: rule.severity,
    action: rule.action,
    message: rule.message,
    matched_excerpt: sanitizeExcerpt(matchedExcerpt),
    metadata: {
      rule_version: rule.rule_version,
      deterministic: true,
    },
  }
}

function excerptForPattern(text: string, pattern: RegExp): string {
  const match = text.match(pattern)
  if (!match?.index) {
    return match?.[0] ?? text
  }

  const start = Math.max(0, match.index - 32)
  const end = Math.min(text.length, match.index + match[0].length + 32)
  return text.slice(start, end)
}

function sanitizeExcerpt(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 512)
}

function responseRequiresFactReference(text: string): boolean {
  return /^I can tell you this:/i.test(text) || /^Yes\. In this simulation, I have/i.test(text)
}
