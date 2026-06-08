-- Seed: 0005_deterministic_safety_rules_seed
-- Scope: global deterministic safety rules only. Synthetic metadata; no patient data.

BEGIN;

WITH rules (
  rule_key,
  category,
  severity,
  action,
  matcher_type,
  matcher_config,
  description
) AS (
  VALUES
    (
      'prompt_injection.ignore_previous_instructions',
      'prompt_injection',
      'critical',
      'block',
      'regex',
      '{"patterns":["ignore previous instructions","bypass safety rules","bypass rules","jailbreak","developer message"]}'::jsonb,
      'Blocks prompt-injection attempts that ask the runtime to ignore or bypass instructions.'
    ),
    (
      'hidden_fact.reveal_hidden_diagnosis',
      'hidden_fact_request',
      'critical',
      'block',
      'regex',
      '{"patterns":["reveal hidden diagnosis","hidden diagnosis","actual diagnosis","answer key","all hidden facts"]}'::jsonb,
      'Blocks requests for hidden diagnosis, answer-key, or unrevealed fact material.'
    ),
    (
      'system_prompt.show_system_prompt',
      'system_prompt_request',
      'critical',
      'block',
      'regex',
      '{"patterns":["show system prompt","system prompt","internal instruction","developer rule","policy text"]}'::jsonb,
      'Blocks requests for system prompts, developer instructions, or internal policy text.'
    ),
    (
      'faculty_notes.faculty_only_material',
      'faculty_only_request',
      'critical',
      'block',
      'regex',
      '{"patterns":["faculty-only notes","faculty notes","instructor-only","teacher-only","scoring guide","rubric says"]}'::jsonb,
      'Blocks requests for faculty-only, instructor-only, rubric, or scoring-guide material.'
    ),
    (
      'role_escalation.admin_or_faculty',
      'role_escalation',
      'high',
      'block',
      'regex',
      '{"patterns":["act as admin","act as faculty","pretend you are faculty","role override","admin override"]}'::jsonb,
      'Blocks attempts to escalate from student simulation scope to faculty or admin scope.'
    ),
    (
      'hidden_fact.restricted_safety_or_evaluator_context',
      'hidden_fact_request',
      'critical',
      'block',
      'regex',
      '{"patterns":["safety-only fact","guardrail fact","evaluator-only","evaluator will score","score after this encounter"]}'::jsonb,
      'Blocks requests for restricted safety-only or evaluator-only context.'
    ),
    (
      'unsupported.diagnosis_certainty',
      'unsupported_diagnosis',
      'high',
      'block_unsupported',
      'regex',
      '{"patterns":["final diagnosis","exact diagnosis","diagnose me","what do i have","confirmed diagnosis","diagnosis with certainty"]}'::jsonb,
      'Blocks unsupported diagnosis certainty and answer-generation requests.'
    ),
    (
      'unsupported.treatment_plan',
      'unsupported_treatment',
      'high',
      'block_unsupported',
      'regex',
      '{"patterns":["treatment plan","start treatment","how should i treat","clinical treatment","procedure plan"]}'::jsonb,
      'Blocks unsupported treatment-plan generation and treatment execution requests.'
    ),
    (
      'unsupported.medication_recommendation',
      'unsupported_medication',
      'high',
      'block_unsupported',
      'regex',
      '{"patterns":["which medication","what medication","prescribe","dosage","drug recommendation","antibiotic"]}'::jsonb,
      'Blocks unsupported medication recommendation, prescription, and dosing requests.'
    ),
    (
      'unsupported.imaging_interpretation',
      'unsupported_imaging',
      'high',
      'block_unsupported',
      'regex',
      '{"patterns":["interpret imaging","imaging finding","x-ray","xray","radiograph","ct scan","mri","cbct"]}'::jsonb,
      'Blocks unsupported imaging interpretation requests.'
    ),
    (
      'unsupported.debrief_generation',
      'unsupported_debrief',
      'high',
      'block_unsupported',
      'regex',
      '{"patterns":["generate debrief","debrief","what did i miss","score me","grade me","rubric"]}'::jsonb,
      'Blocks unsupported debrief, score, rubric, and evaluation-generation requests.'
    ),
    (
      'risky_action.order_attempt',
      'risky_action',
      'critical',
      'block_unsupported',
      'action_type',
      '{"action_type":"order_attempt"}'::jsonb,
      'Blocks order attempts in the mock simulation runtime.'
    ),
    (
      'risky_action.diagnosis_attempt',
      'risky_action',
      'critical',
      'block_unsupported',
      'action_type',
      '{"action_type":"diagnosis_attempt"}'::jsonb,
      'Blocks diagnosis submission attempts in the mock simulation runtime.'
    ),
    (
      'risky_action.treatment_attempt',
      'risky_action',
      'critical',
      'block_unsupported',
      'action_type',
      '{"action_type":"treatment_attempt"}'::jsonb,
      'Blocks treatment attempts in the mock simulation runtime.'
    )
)
INSERT INTO safety_rules (
  institution_id,
  rule_key,
  rule_version,
  category,
  severity,
  action,
  matcher_type,
  matcher_config,
  enabled,
  description,
  source
)
SELECT
  NULL,
  r.rule_key,
  'safety-rules.v1',
  r.category,
  r.severity,
  r.action,
  r.matcher_type,
  r.matcher_config,
  true,
  r.description,
  'deterministic_seed'
FROM rules r
WHERE NOT EXISTS (
  SELECT 1
  FROM safety_rules existing
  WHERE existing.institution_id IS NULL
    AND existing.rule_key = r.rule_key
    AND existing.rule_version = 'safety-rules.v1'
    AND existing.deleted_at IS NULL
);

COMMIT;
