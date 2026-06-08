import { Injectable } from "@nestjs/common"
import type { QueryResultRow } from "pg"

import type { TransactionClient } from "../database/transaction"
import type {
  PersistSafetyEvaluationInput,
  PersistedSafetyEvaluationDto,
  SafetyFindingDto,
} from "./safety.dto"

interface SafetyEvaluationRow extends QueryResultRow {
  id: string
  decision: PersistSafetyEvaluationInput["evaluation"]["decision"]
  blocked: boolean
}

@Injectable()
export class SafetyRepository {
  async persistEvaluation(
    client: TransactionClient,
    input: PersistSafetyEvaluationInput,
  ): Promise<PersistedSafetyEvaluationDto> {
    const evaluationResult = await client.query<SafetyEvaluationRow>(
      `
        INSERT INTO safety_evaluations (
          institution_id,
          session_id,
          clinical_action_id,
          evaluation_type,
          input_text_excerpt,
          output_text_excerpt,
          decision,
          max_severity,
          blocked,
          reason,
          ruleset_version,
          evaluated_by,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          'deterministic_safety_engine',
          $12::jsonb
        )
        RETURNING id, decision, blocked
      `,
      [
        input.institution_id,
        input.session_id,
        input.clinical_action_id,
        input.evaluation.evaluation_type,
        sanitizeExcerpt(input.input_text),
        sanitizeExcerpt(input.output_text),
        input.evaluation.decision,
        input.evaluation.max_severity,
        input.evaluation.blocked,
        input.evaluation.reason,
        input.evaluation.ruleset_version,
        JSON.stringify({
          ...input.evaluation.metadata,
          action_type: input.action_type,
          finding_count: input.evaluation.findings.length,
        }),
      ],
    )

    const evaluation = evaluationResult.rows[0]
    for (const finding of input.evaluation.findings) {
      await this.insertFinding(client, input.institution_id, evaluation.id, input.evaluation.ruleset_version, finding)
    }

    return {
      id: evaluation.id,
      decision: evaluation.decision,
      blocked: evaluation.blocked,
      finding_count: input.evaluation.findings.length,
    }
  }

  private async insertFinding(
    client: TransactionClient,
    institutionId: string,
    safetyEvaluationId: string,
    rulesetVersion: string,
    finding: SafetyFindingDto,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO safety_findings (
          institution_id,
          safety_evaluation_id,
          rule_id,
          rule_key,
          category,
          severity,
          action,
          message,
          matched_excerpt,
          metadata
        )
        VALUES (
          $1,
          $2,
          (
            SELECT id
            FROM safety_rules
            WHERE rule_key = $3
              AND rule_version = $4
              AND enabled = true
              AND deleted_at IS NULL
              AND (institution_id = $1 OR institution_id IS NULL)
            ORDER BY institution_id ASC NULLS LAST
            LIMIT 1
          ),
          $3,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb
        )
      `,
      [
        institutionId,
        safetyEvaluationId,
        finding.rule_key,
        rulesetVersion,
        finding.category,
        finding.severity,
        finding.action,
        finding.message,
        sanitizeExcerpt(finding.matched_excerpt),
        JSON.stringify(finding.metadata),
      ],
    )
  }
}

function sanitizeExcerpt(value: string | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim()
  return normalized ? normalized.slice(0, 512) : null
}
