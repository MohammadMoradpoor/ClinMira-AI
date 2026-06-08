-- Migration: 0002_case_versioning_and_fact_ledger
-- Authority: reviewed SQL is the production schema source of truth.
-- Scope: case versions, synthetic patient metadata, canonical fact ledger, reveal rules, and fact access policies only.

BEGIN;

CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  title text NOT NULL,
  slug text NOT NULL,
  specialty text NOT NULL,
  difficulty text NOT NULL DEFAULT 'introductory',
  status text NOT NULL DEFAULT 'draft',
  current_version_id uuid,
  created_by_user_id uuid,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT cases_institution_slug_uq UNIQUE (institution_id, slug),
  CONSTRAINT cases_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT cases_created_by_user_institution_fk FOREIGN KEY (institution_id, created_by_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT cases_title_non_empty_ck CHECK (length(btrim(title)) > 0),
  CONSTRAINT cases_slug_format_ck CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  CONSTRAINT cases_specialty_non_empty_ck CHECK (length(btrim(specialty)) > 0),
  CONSTRAINT cases_difficulty_ck CHECK (difficulty IN ('introductory', 'intermediate', 'advanced')),
  CONSTRAINT cases_status_ck CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  CONSTRAINT cases_summary_object_ck CHECK (jsonb_typeof(summary) = 'object')
);

CREATE INDEX IF NOT EXISTS cases_institution_status_specialty_idx ON cases (institution_id, status, specialty);
CREATE INDEX IF NOT EXISTS cases_created_by_user_id_idx ON cases (created_by_user_id);
CREATE INDEX IF NOT EXISTS cases_current_version_id_idx ON cases (current_version_id);

DROP TRIGGER IF EXISTS cases_set_updated_at ON cases;
CREATE TRIGGER cases_set_updated_at
BEFORE UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS case_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  case_id uuid NOT NULL,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  student_summary text NOT NULL,
  faculty_summary text,
  learning_objectives jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_reasoning_path jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_hash text NOT NULL,
  created_by_user_id uuid,
  approved_by_user_id uuid,
  approved_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT case_versions_case_institution_fk FOREIGN KEY (institution_id, case_id) REFERENCES cases(institution_id, id),
  CONSTRAINT case_versions_created_by_user_institution_fk FOREIGN KEY (institution_id, created_by_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT case_versions_approved_by_user_institution_fk FOREIGN KEY (institution_id, approved_by_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT case_versions_case_version_uq UNIQUE (case_id, version),
  CONSTRAINT case_versions_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT case_versions_version_positive_ck CHECK (version > 0),
  CONSTRAINT case_versions_status_ck CHECK (status IN ('draft', 'review', 'approved', 'published', 'superseded', 'archived')),
  CONSTRAINT case_versions_title_non_empty_ck CHECK (length(btrim(title)) > 0),
  CONSTRAINT case_versions_student_summary_non_empty_ck CHECK (length(btrim(student_summary)) > 0),
  CONSTRAINT case_versions_learning_objectives_array_ck CHECK (jsonb_typeof(learning_objectives) = 'array'),
  CONSTRAINT case_versions_expected_reasoning_path_array_ck CHECK (jsonb_typeof(expected_reasoning_path) = 'array'),
  CONSTRAINT case_versions_source_hash_non_empty_ck CHECK (length(btrim(source_hash)) > 0),
  CONSTRAINT case_versions_approval_consistency_ck CHECK (
    (approved_by_user_id IS NULL AND approved_at IS NULL)
    OR (approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS case_versions_institution_status_idx ON case_versions (institution_id, status);
CREATE INDEX IF NOT EXISTS case_versions_case_status_idx ON case_versions (case_id, status);
CREATE INDEX IF NOT EXISTS case_versions_created_by_user_id_idx ON case_versions (created_by_user_id);
CREATE INDEX IF NOT EXISTS case_versions_approved_by_user_id_idx ON case_versions (approved_by_user_id);

CREATE OR REPLACE FUNCTION prevent_case_version_content_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('approved', 'published') AND (
    OLD.institution_id IS DISTINCT FROM NEW.institution_id
    OR OLD.case_id IS DISTINCT FROM NEW.case_id
    OR OLD.version IS DISTINCT FROM NEW.version
    OR OLD.title IS DISTINCT FROM NEW.title
    OR OLD.student_summary IS DISTINCT FROM NEW.student_summary
    OR OLD.faculty_summary IS DISTINCT FROM NEW.faculty_summary
    OR OLD.learning_objectives IS DISTINCT FROM NEW.learning_objectives
    OR OLD.expected_reasoning_path IS DISTINCT FROM NEW.expected_reasoning_path
    OR OLD.source_hash IS DISTINCT FROM NEW.source_hash
  ) THEN
    RAISE EXCEPTION 'approved or published case version content is immutable';
  END IF;

  IF OLD.status = 'published' AND NEW.status NOT IN ('published', 'superseded', 'archived') THEN
    RAISE EXCEPTION 'published case versions cannot move backward in status';
  END IF;

  IF OLD.status = 'approved' AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'approved case versions cannot move back to draft';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS case_versions_prevent_content_mutation ON case_versions;
CREATE TRIGGER case_versions_prevent_content_mutation
BEFORE UPDATE ON case_versions
FOR EACH ROW
EXECUTE FUNCTION prevent_case_version_content_mutation();

DROP TRIGGER IF EXISTS case_versions_set_updated_at ON case_versions;
CREATE TRIGGER case_versions_set_updated_at
BEFORE UPDATE ON case_versions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'cases_current_version_institution_fk'
  ) THEN
    ALTER TABLE cases
      ADD CONSTRAINT cases_current_version_institution_fk
      FOREIGN KEY (institution_id, current_version_id)
      REFERENCES case_versions(institution_id, id);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS patient_twins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  case_version_id uuid NOT NULL,
  display_name text NOT NULL,
  age_years integer,
  sex text,
  chief_complaint text NOT NULL,
  baseline_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  synthetic_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_twins_case_version_institution_fk FOREIGN KEY (institution_id, case_version_id) REFERENCES case_versions(institution_id, id),
  CONSTRAINT patient_twins_case_version_uq UNIQUE (case_version_id),
  CONSTRAINT patient_twins_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT patient_twins_display_name_non_empty_ck CHECK (length(btrim(display_name)) > 0),
  CONSTRAINT patient_twins_age_years_ck CHECK (age_years IS NULL OR (age_years >= 0 AND age_years <= 120)),
  CONSTRAINT patient_twins_sex_ck CHECK (sex IS NULL OR sex IN ('female', 'male', 'intersex', 'unspecified')),
  CONSTRAINT patient_twins_chief_complaint_non_empty_ck CHECK (length(btrim(chief_complaint)) > 0),
  CONSTRAINT patient_twins_baseline_state_object_ck CHECK (jsonb_typeof(baseline_state) = 'object'),
  CONSTRAINT patient_twins_synthetic_profile_object_ck CHECK (jsonb_typeof(synthetic_profile) = 'object')
);

CREATE INDEX IF NOT EXISTS patient_twins_institution_case_version_idx ON patient_twins (institution_id, case_version_id);

DROP TRIGGER IF EXISTS patient_twins_set_updated_at ON patient_twins;
CREATE TRIGGER patient_twins_set_updated_at
BEFORE UPDATE ON patient_twins
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS patient_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  patient_twin_id uuid NOT NULL,
  communication_style text NOT NULL DEFAULT 'neutral',
  health_literacy text NOT NULL DEFAULT 'typical',
  reliability text NOT NULL DEFAULT 'reliable',
  anxiety_level integer NOT NULL DEFAULT 30,
  trust_level integer NOT NULL DEFAULT 50,
  traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  non_verbal_cues jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_personas_patient_twin_institution_fk FOREIGN KEY (institution_id, patient_twin_id) REFERENCES patient_twins(institution_id, id),
  CONSTRAINT patient_personas_patient_twin_uq UNIQUE (patient_twin_id),
  CONSTRAINT patient_personas_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT patient_personas_communication_style_ck CHECK (communication_style IN ('neutral', 'concise', 'anxious', 'reserved', 'talkative')),
  CONSTRAINT patient_personas_health_literacy_ck CHECK (health_literacy IN ('limited', 'typical', 'high')),
  CONSTRAINT patient_personas_reliability_ck CHECK (reliability IN ('reliable', 'variable', 'unreliable')),
  CONSTRAINT patient_personas_anxiety_level_ck CHECK (anxiety_level BETWEEN 0 AND 100),
  CONSTRAINT patient_personas_trust_level_ck CHECK (trust_level BETWEEN 0 AND 100),
  CONSTRAINT patient_personas_traits_object_ck CHECK (jsonb_typeof(traits) = 'object'),
  CONSTRAINT patient_personas_non_verbal_cues_object_ck CHECK (jsonb_typeof(non_verbal_cues) = 'object')
);

CREATE INDEX IF NOT EXISTS patient_personas_institution_patient_twin_idx ON patient_personas (institution_id, patient_twin_id);

DROP TRIGGER IF EXISTS patient_personas_set_updated_at ON patient_personas;
CREATE TRIGGER patient_personas_set_updated_at
BEFORE UPDATE ON patient_personas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS fact_ledger (
  fact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  case_version_id uuid NOT NULL,
  fact_key text NOT NULL,
  fact_type text NOT NULL,
  clinical_domain text NOT NULL DEFAULT 'general',
  visibility text NOT NULL,
  source_type text NOT NULL,
  source_id uuid,
  content jsonb NOT NULL,
  student_safe_summary text,
  faculty_notes text,
  confidence numeric(4, 3) NOT NULL DEFAULT 1.000,
  faculty_approved boolean NOT NULL DEFAULT false,
  approved_by_user_id uuid,
  approved_at timestamptz,
  reveal_rule_required boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deprecated_at timestamptz,
  CONSTRAINT fact_ledger_case_version_institution_fk FOREIGN KEY (institution_id, case_version_id) REFERENCES case_versions(institution_id, id),
  CONSTRAINT fact_ledger_created_by_user_institution_fk FOREIGN KEY (institution_id, created_by_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT fact_ledger_approved_by_user_institution_fk FOREIGN KEY (institution_id, approved_by_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT fact_ledger_case_version_fact_key_uq UNIQUE (case_version_id, fact_key),
  CONSTRAINT fact_ledger_institution_fact_id_uq UNIQUE (institution_id, fact_id),
  CONSTRAINT fact_ledger_institution_case_fact_id_uq UNIQUE (institution_id, case_version_id, fact_id),
  CONSTRAINT fact_ledger_fact_key_non_empty_ck CHECK (length(btrim(fact_key)) > 0),
  CONSTRAINT fact_ledger_fact_type_ck CHECK (fact_type IN (
    'chief_complaint',
    'history',
    'symptom',
    'medication',
    'allergy',
    'risk_factor',
    'vital_sign',
    'exam_finding',
    'diagnosis',
    'differential',
    'lab_result',
    'imaging_finding',
    'safety_rule',
    'teaching_point',
    'other'
  )),
  CONSTRAINT fact_ledger_clinical_domain_non_empty_ck CHECK (length(btrim(clinical_domain)) > 0),
  CONSTRAINT fact_ledger_visibility_ck CHECK (visibility IN (
    'baseline_visible',
    'hidden_until_revealed',
    'faculty_only',
    'safety_only',
    'evaluator_only',
    'deprecated'
  )),
  CONSTRAINT fact_ledger_source_type_ck CHECK (source_type IN (
    'case_author',
    'faculty_review',
    'clinical_rule',
    'imaging_metadata',
    'session_observation',
    'student_action',
    'safety_rule',
    'synthetic_seed',
    'system_seed'
  )),
  CONSTRAINT fact_ledger_content_object_ck CHECK (jsonb_typeof(content) = 'object'),
  CONSTRAINT fact_ledger_confidence_ck CHECK (confidence >= 0 AND confidence <= 1),
  CONSTRAINT fact_ledger_visible_summary_ck CHECK (
    visibility <> 'baseline_visible'
    OR (student_safe_summary IS NOT NULL AND length(btrim(student_safe_summary)) > 0)
  ),
  CONSTRAINT fact_ledger_hidden_summary_ck CHECK (
    visibility <> 'hidden_until_revealed'
    OR student_safe_summary IS NULL
  ),
  CONSTRAINT fact_ledger_approval_consistency_ck CHECK (
    (faculty_approved = false AND approved_by_user_id IS NULL AND approved_at IS NULL)
    OR (faculty_approved = true AND approved_by_user_id IS NOT NULL AND approved_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS fact_ledger_case_visibility_source_idx ON fact_ledger (case_version_id, visibility, source_type);
CREATE INDEX IF NOT EXISTS fact_ledger_institution_visibility_idx ON fact_ledger (institution_id, visibility);
CREATE INDEX IF NOT EXISTS fact_ledger_fact_type_idx ON fact_ledger (fact_type);
CREATE INDEX IF NOT EXISTS fact_ledger_created_by_user_id_idx ON fact_ledger (created_by_user_id);
CREATE INDEX IF NOT EXISTS fact_ledger_approved_by_user_id_idx ON fact_ledger (approved_by_user_id);
CREATE INDEX IF NOT EXISTS fact_ledger_content_gin_idx ON fact_ledger USING GIN (content);

DROP TRIGGER IF EXISTS fact_ledger_set_updated_at ON fact_ledger;
CREATE TRIGGER fact_ledger_set_updated_at
BEFORE UPDATE ON fact_ledger
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS fact_reveal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  case_version_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  rule_key text NOT NULL,
  rule_type text NOT NULL,
  rule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fact_reveal_rules_case_version_institution_fk FOREIGN KEY (institution_id, case_version_id) REFERENCES case_versions(institution_id, id),
  CONSTRAINT fact_reveal_rules_fact_institution_fk FOREIGN KEY (institution_id, case_version_id, fact_id) REFERENCES fact_ledger(institution_id, case_version_id, fact_id),
  CONSTRAINT fact_reveal_rules_fact_rule_key_uq UNIQUE (fact_id, rule_key),
  CONSTRAINT fact_reveal_rules_rule_key_non_empty_ck CHECK (length(btrim(rule_key)) > 0),
  CONSTRAINT fact_reveal_rules_rule_type_ck CHECK (rule_type IN (
    'ask_directly',
    'student_action',
    'faculty_override',
    'safety_override',
    'time_or_sequence',
    'never_student_visible'
  )),
  CONSTRAINT fact_reveal_rules_rule_config_object_ck CHECK (jsonb_typeof(rule_config) = 'object'),
  CONSTRAINT fact_reveal_rules_priority_ck CHECK (priority >= 0)
);

CREATE INDEX IF NOT EXISTS fact_reveal_rules_case_version_idx ON fact_reveal_rules (case_version_id);
CREATE INDEX IF NOT EXISTS fact_reveal_rules_fact_id_idx ON fact_reveal_rules (fact_id);
CREATE INDEX IF NOT EXISTS fact_reveal_rules_type_active_idx ON fact_reveal_rules (rule_type, active);

DROP TRIGGER IF EXISTS fact_reveal_rules_set_updated_at ON fact_reveal_rules;
CREATE TRIGGER fact_reveal_rules_set_updated_at
BEFORE UPDATE ON fact_reveal_rules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS fact_access_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  case_version_id uuid NOT NULL,
  fact_id uuid,
  fact_type text,
  visibility text,
  actor_scope text NOT NULL,
  access_level text NOT NULL,
  policy_reason text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fact_access_policies_case_version_institution_fk FOREIGN KEY (institution_id, case_version_id) REFERENCES case_versions(institution_id, id),
  CONSTRAINT fact_access_policies_fact_institution_fk FOREIGN KEY (institution_id, case_version_id, fact_id) REFERENCES fact_ledger(institution_id, case_version_id, fact_id),
  CONSTRAINT fact_access_policies_target_ck CHECK (fact_id IS NOT NULL OR fact_type IS NOT NULL OR visibility IS NOT NULL),
  CONSTRAINT fact_access_policies_fact_type_ck CHECK (
    fact_type IS NULL
    OR fact_type IN (
      'chief_complaint',
      'history',
      'symptom',
      'medication',
      'allergy',
      'risk_factor',
      'vital_sign',
      'exam_finding',
      'diagnosis',
      'differential',
      'lab_result',
      'imaging_finding',
      'safety_rule',
      'teaching_point',
      'other'
    )
  ),
  CONSTRAINT fact_access_policies_visibility_ck CHECK (
    visibility IS NULL
    OR visibility IN (
      'baseline_visible',
      'hidden_until_revealed',
      'faculty_only',
      'safety_only',
      'evaluator_only',
      'deprecated'
    )
  ),
  CONSTRAINT fact_access_policies_actor_scope_ck CHECK (actor_scope IN (
    'student_payload',
    'persona_agent',
    'orchestrator',
    'safety_agent',
    'evaluator_agent',
    'faculty_user',
    'faculty_review_agent',
    'imaging_agent',
    'system_audit'
  )),
  CONSTRAINT fact_access_policies_access_level_ck CHECK (access_level IN (
    'deny',
    'allow_visible',
    'allow_if_revealed',
    'allowed_for_safety',
    'faculty_only',
    'evaluator_after_completion'
  )),
  CONSTRAINT fact_access_policies_policy_reason_non_empty_ck CHECK (length(btrim(policy_reason)) > 0)
);

CREATE INDEX IF NOT EXISTS fact_access_policies_case_actor_idx ON fact_access_policies (case_version_id, actor_scope, active);
CREATE INDEX IF NOT EXISTS fact_access_policies_fact_id_idx ON fact_access_policies (fact_id);
CREATE INDEX IF NOT EXISTS fact_access_policies_visibility_actor_idx ON fact_access_policies (visibility, actor_scope, access_level);
CREATE INDEX IF NOT EXISTS fact_access_policies_active_idx ON fact_access_policies (institution_id, case_version_id) WHERE active = true;

DROP TRIGGER IF EXISTS fact_access_policies_set_updated_at ON fact_access_policies;
CREATE TRIGGER fact_access_policies_set_updated_at
BEFORE UPDATE ON fact_access_policies
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO schema_migrations (version, name, checksum, applied_by, execution_ms, success)
VALUES ('0002', 'case_versioning_and_fact_ledger', NULL, 'sql-first-authority', NULL, true)
ON CONFLICT (version) DO NOTHING;

COMMIT;
