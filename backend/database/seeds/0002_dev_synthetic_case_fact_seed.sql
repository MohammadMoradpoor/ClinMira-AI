-- Development seed: synthetic case and fact-ledger foundation only.
-- Do not use this file for production data or clinical care.

BEGIN;

INSERT INTO cases (
  id,
  institution_id,
  title,
  slug,
  specialty,
  difficulty,
  status,
  created_by_user_id,
  summary
)
VALUES (
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000101',
  'Synthetic Oral Health Intake',
  'synthetic-oral-health-intake',
  'general_dentistry',
  'introductory',
  'draft',
  '00000000-0000-0000-0000-000000000202',
  '{"seed":"development-only","synthetic":true,"purpose":"case-versioning-foundation"}'::jsonb
)
ON CONFLICT (institution_id, slug) DO UPDATE
SET title = EXCLUDED.title,
    specialty = EXCLUDED.specialty,
    difficulty = EXCLUDED.difficulty,
    status = EXCLUDED.status,
    created_by_user_id = EXCLUDED.created_by_user_id,
    summary = EXCLUDED.summary,
    updated_at = now();

INSERT INTO case_versions (
  id,
  institution_id,
  case_id,
  version,
  status,
  title,
  student_summary,
  faculty_summary,
  learning_objectives,
  expected_reasoning_path,
  source_hash,
  created_by_user_id
)
VALUES (
  '00000000-0000-0000-0000-000000000711',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000701',
  1,
  'draft',
  'Synthetic Oral Health Intake v1',
  'Practice opening intake questions with a synthetic patient in a controlled educational scenario.',
  'Development-only case-versioning seed with synthetic-only source material.',
  '["Collect a concise chief concern","Practice respectful intake communication"]'::jsonb,
  '[]'::jsonb,
  'sha256:synthetic-step-06-case-version-v1',
  '00000000-0000-0000-0000-000000000202'
)
ON CONFLICT (case_id, version) DO UPDATE
SET status = EXCLUDED.status,
    title = EXCLUDED.title,
    student_summary = EXCLUDED.student_summary,
    faculty_summary = EXCLUDED.faculty_summary,
    learning_objectives = EXCLUDED.learning_objectives,
    expected_reasoning_path = EXCLUDED.expected_reasoning_path,
    source_hash = EXCLUDED.source_hash,
    created_by_user_id = EXCLUDED.created_by_user_id,
    updated_at = now();

UPDATE cases
SET current_version_id = '00000000-0000-0000-0000-000000000711',
    updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000701';

INSERT INTO patient_twins (
  id,
  institution_id,
  case_version_id,
  display_name,
  age_years,
  sex,
  chief_complaint,
  baseline_state,
  synthetic_profile
)
VALUES (
  '00000000-0000-0000-0000-000000000721',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000711',
  'Demo Synthetic Patient',
  34,
  'unspecified',
  'Mild mouth discomfort during a simulated intake exercise.',
  '{"seed":"development-only","synthetic":true,"affect":"calm","session_state_not_started":true}'::jsonb,
  '{"seed":"development-only","source":"synthetic","synthetic_only":true}'::jsonb
)
ON CONFLICT (case_version_id) DO UPDATE
SET display_name = EXCLUDED.display_name,
    age_years = EXCLUDED.age_years,
    sex = EXCLUDED.sex,
    chief_complaint = EXCLUDED.chief_complaint,
    baseline_state = EXCLUDED.baseline_state,
    synthetic_profile = EXCLUDED.synthetic_profile,
    updated_at = now();

INSERT INTO patient_personas (
  id,
  institution_id,
  patient_twin_id,
  communication_style,
  health_literacy,
  reliability,
  anxiety_level,
  trust_level,
  traits,
  non_verbal_cues
)
VALUES (
  '00000000-0000-0000-0000-000000000722',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000721',
  'neutral',
  'typical',
  'reliable',
  25,
  55,
  '{"seed":"development-only","synthetic":true,"tone":"plain"}'::jsonb,
  '{"seed":"development-only","synthetic":true,"baseline":"relaxed"}'::jsonb
)
ON CONFLICT (patient_twin_id) DO UPDATE
SET communication_style = EXCLUDED.communication_style,
    health_literacy = EXCLUDED.health_literacy,
    reliability = EXCLUDED.reliability,
    anxiety_level = EXCLUDED.anxiety_level,
    trust_level = EXCLUDED.trust_level,
    traits = EXCLUDED.traits,
    non_verbal_cues = EXCLUDED.non_verbal_cues,
    updated_at = now();

INSERT INTO fact_ledger (
  fact_id,
  institution_id,
  case_version_id,
  fact_key,
  fact_type,
  clinical_domain,
  visibility,
  source_type,
  content,
  student_safe_summary,
  faculty_notes,
  confidence,
  faculty_approved,
  approved_by_user_id,
  approved_at,
  reveal_rule_required,
  created_by_user_id
)
VALUES
  (
    '00000000-0000-0000-0000-000000000731',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000711',
    'chief_complaint_visible',
    'chief_complaint',
    'general_dentistry',
    'baseline_visible',
    'synthetic_seed',
    '{"statement":"Mild mouth discomfort during a simulated intake exercise.","seed":"development-only","synthetic":true}'::jsonb,
    'Mild mouth discomfort during a simulated intake exercise.',
    'Baseline student-visible intake fact for schema validation.',
    1.000,
    true,
    '00000000-0000-0000-0000-000000000202',
    now(),
    false,
    '00000000-0000-0000-0000-000000000202'
  ),
  (
    '00000000-0000-0000-0000-000000000732',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000711',
    'allergy_latex_hidden',
    'allergy',
    'general_dentistry',
    'hidden_until_revealed',
    'synthetic_seed',
    '{"allergen":"latex","reaction":"rash in this synthetic scenario","seed":"development-only","synthetic":true}'::jsonb,
    NULL,
    'Hidden until an allowed direct question/reveal rule is satisfied.',
    1.000,
    true,
    '00000000-0000-0000-0000-000000000202',
    now(),
    true,
    '00000000-0000-0000-0000-000000000202'
  )
ON CONFLICT (case_version_id, fact_key) DO UPDATE
SET fact_type = EXCLUDED.fact_type,
    clinical_domain = EXCLUDED.clinical_domain,
    visibility = EXCLUDED.visibility,
    source_type = EXCLUDED.source_type,
    content = EXCLUDED.content,
    student_safe_summary = EXCLUDED.student_safe_summary,
    faculty_notes = EXCLUDED.faculty_notes,
    confidence = EXCLUDED.confidence,
    faculty_approved = EXCLUDED.faculty_approved,
    approved_by_user_id = EXCLUDED.approved_by_user_id,
    approved_at = EXCLUDED.approved_at,
    reveal_rule_required = EXCLUDED.reveal_rule_required,
    created_by_user_id = EXCLUDED.created_by_user_id,
    updated_at = now();

INSERT INTO fact_reveal_rules (
  id,
  institution_id,
  case_version_id,
  fact_id,
  rule_key,
  rule_type,
  rule_config,
  priority,
  active
)
VALUES (
  '00000000-0000-0000-0000-000000000741',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000711',
  '00000000-0000-0000-0000-000000000732',
  'ask_about_allergies',
  'ask_directly',
  '{"student_action":"ask_allergies","allowed_surface":"orchestrator_policy"}'::jsonb,
  10,
  true
)
ON CONFLICT (fact_id, rule_key) DO UPDATE
SET rule_type = EXCLUDED.rule_type,
    rule_config = EXCLUDED.rule_config,
    priority = EXCLUDED.priority,
    active = EXCLUDED.active,
    updated_at = now();

INSERT INTO fact_access_policies (
  id,
  institution_id,
  case_version_id,
  fact_id,
  fact_type,
  visibility,
  actor_scope,
  access_level,
  policy_reason,
  active
)
VALUES
  (
    '00000000-0000-0000-0000-000000000751',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000711',
    NULL,
    NULL,
    'hidden_until_revealed',
    'student_payload',
    'deny',
    'Student-visible payloads must not receive hidden facts before an allowed reveal.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000752',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000711',
    NULL,
    NULL,
    'hidden_until_revealed',
    'persona_agent',
    'deny',
    'Persona context must not receive broad hidden fact access.',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000753',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000711',
    '00000000-0000-0000-0000-000000000732',
    'allergy',
    'hidden_until_revealed',
    'safety_agent',
    'allowed_for_safety',
    'Safety-specific access may use restricted allergy facts to block unsafe actions without exposing them to the student.',
    true
  )
ON CONFLICT (id) DO UPDATE
SET fact_id = EXCLUDED.fact_id,
    fact_type = EXCLUDED.fact_type,
    visibility = EXCLUDED.visibility,
    actor_scope = EXCLUDED.actor_scope,
    access_level = EXCLUDED.access_level,
    policy_reason = EXCLUDED.policy_reason,
    active = EXCLUDED.active,
    updated_at = now();

COMMIT;
