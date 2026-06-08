-- Migration: 0005_deterministic_safety_engine
-- Authority: reviewed SQL is the production schema source of truth.
-- Scope: deterministic safety rules, evaluations, findings, and approved safety timeline events only.

BEGIN;

CREATE TABLE IF NOT EXISTS safety_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  rule_key text NOT NULL,
  rule_version text NOT NULL DEFAULT 'safety-rules.v1',
  category text NOT NULL,
  severity text NOT NULL,
  action text NOT NULL,
  matcher_type text NOT NULL,
  matcher_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  description text NOT NULL,
  source text NOT NULL DEFAULT 'deterministic_seed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT safety_rules_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT safety_rules_rule_key_non_empty_ck CHECK (length(btrim(rule_key)) > 0),
  CONSTRAINT safety_rules_rule_version_non_empty_ck CHECK (length(btrim(rule_version)) > 0),
  CONSTRAINT safety_rules_category_ck CHECK (category IN (
    'prompt_injection',
    'hidden_fact_request',
    'faculty_only_request',
    'system_prompt_request',
    'role_escalation',
    'unsupported_diagnosis',
    'unsupported_treatment',
    'unsupported_medication',
    'unsupported_imaging',
    'unsupported_debrief',
    'risky_action',
    'fact_reference',
    'uncertain'
  )),
  CONSTRAINT safety_rules_severity_ck CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT safety_rules_action_ck CHECK (action IN ('allow', 'warn', 'block', 'block_unsupported')),
  CONSTRAINT safety_rules_matcher_type_ck CHECK (matcher_type IN ('keyword', 'regex', 'action_type', 'response_shape')),
  CONSTRAINT safety_rules_matcher_config_object_ck CHECK (jsonb_typeof(matcher_config) = 'object'),
  CONSTRAINT safety_rules_description_non_empty_ck CHECK (length(btrim(description)) > 0),
  CONSTRAINT safety_rules_source_non_empty_ck CHECK (length(btrim(source)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS safety_rules_scope_rule_version_uq
  ON safety_rules (
    COALESCE(institution_id, '00000000-0000-0000-0000-000000000000'::uuid),
    rule_key,
    rule_version
  )
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS safety_rules_institution_id_idx ON safety_rules (institution_id);
CREATE INDEX IF NOT EXISTS safety_rules_rule_key_idx ON safety_rules (rule_key);
CREATE INDEX IF NOT EXISTS safety_rules_category_idx ON safety_rules (category);
CREATE INDEX IF NOT EXISTS safety_rules_enabled_idx ON safety_rules (enabled) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS safety_rules_set_updated_at ON safety_rules;
CREATE TRIGGER safety_rules_set_updated_at
BEFORE UPDATE ON safety_rules
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS safety_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  session_id uuid NOT NULL,
  clinical_action_id uuid,
  evaluation_type text NOT NULL,
  input_text_excerpt text,
  output_text_excerpt text,
  decision text NOT NULL,
  max_severity text NOT NULL DEFAULT 'none',
  blocked boolean NOT NULL DEFAULT false,
  reason text NOT NULL,
  ruleset_version text NOT NULL,
  evaluated_by text NOT NULL DEFAULT 'deterministic_safety_engine',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safety_evaluations_session_institution_fk FOREIGN KEY (institution_id, session_id) REFERENCES simulation_sessions(institution_id, id),
  CONSTRAINT safety_evaluations_action_institution_fk FOREIGN KEY (institution_id, clinical_action_id) REFERENCES clinical_actions(institution_id, id),
  CONSTRAINT safety_evaluations_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT safety_evaluations_evaluation_type_ck CHECK (evaluation_type IN ('pre_action', 'post_response')),
  CONSTRAINT safety_evaluations_decision_ck CHECK (decision IN ('allow', 'warn', 'block', 'block_unsupported')),
  CONSTRAINT safety_evaluations_max_severity_ck CHECK (max_severity IN ('none', 'low', 'medium', 'high', 'critical')),
  CONSTRAINT safety_evaluations_reason_non_empty_ck CHECK (length(btrim(reason)) > 0),
  CONSTRAINT safety_evaluations_ruleset_version_non_empty_ck CHECK (length(btrim(ruleset_version)) > 0),
  CONSTRAINT safety_evaluations_evaluated_by_non_empty_ck CHECK (length(btrim(evaluated_by)) > 0),
  CONSTRAINT safety_evaluations_metadata_object_ck CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT safety_evaluations_input_excerpt_length_ck CHECK (input_text_excerpt IS NULL OR length(input_text_excerpt) <= 512),
  CONSTRAINT safety_evaluations_output_excerpt_length_ck CHECK (output_text_excerpt IS NULL OR length(output_text_excerpt) <= 512),
  CONSTRAINT safety_evaluations_blocked_decision_ck CHECK (
    (blocked = true AND decision IN ('block', 'block_unsupported'))
    OR (blocked = false AND decision IN ('allow', 'warn'))
  )
);

CREATE INDEX IF NOT EXISTS safety_evaluations_institution_id_idx ON safety_evaluations (institution_id);
CREATE INDEX IF NOT EXISTS safety_evaluations_session_id_idx ON safety_evaluations (session_id);
CREATE INDEX IF NOT EXISTS safety_evaluations_clinical_action_id_idx ON safety_evaluations (clinical_action_id);
CREATE INDEX IF NOT EXISTS safety_evaluations_decision_idx ON safety_evaluations (decision);
CREATE INDEX IF NOT EXISTS safety_evaluations_created_at_idx ON safety_evaluations (created_at);

CREATE TABLE IF NOT EXISTS safety_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  safety_evaluation_id uuid NOT NULL,
  rule_id uuid REFERENCES safety_rules(id),
  rule_key text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL,
  action text NOT NULL,
  message text NOT NULL,
  matched_excerpt text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safety_findings_evaluation_institution_fk FOREIGN KEY (institution_id, safety_evaluation_id) REFERENCES safety_evaluations(institution_id, id),
  CONSTRAINT safety_findings_rule_key_non_empty_ck CHECK (length(btrim(rule_key)) > 0),
  CONSTRAINT safety_findings_category_ck CHECK (category IN (
    'prompt_injection',
    'hidden_fact_request',
    'faculty_only_request',
    'system_prompt_request',
    'role_escalation',
    'unsupported_diagnosis',
    'unsupported_treatment',
    'unsupported_medication',
    'unsupported_imaging',
    'unsupported_debrief',
    'risky_action',
    'fact_reference',
    'uncertain'
  )),
  CONSTRAINT safety_findings_severity_ck CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT safety_findings_action_ck CHECK (action IN ('allow', 'warn', 'block', 'block_unsupported')),
  CONSTRAINT safety_findings_message_non_empty_ck CHECK (length(btrim(message)) > 0),
  CONSTRAINT safety_findings_matched_excerpt_length_ck CHECK (matched_excerpt IS NULL OR length(matched_excerpt) <= 512),
  CONSTRAINT safety_findings_metadata_object_ck CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS safety_findings_institution_id_idx ON safety_findings (institution_id);
CREATE INDEX IF NOT EXISTS safety_findings_evaluation_id_idx ON safety_findings (safety_evaluation_id);
CREATE INDEX IF NOT EXISTS safety_findings_rule_id_idx ON safety_findings (rule_id);
CREATE INDEX IF NOT EXISTS safety_findings_rule_key_idx ON safety_findings (rule_key);
CREATE INDEX IF NOT EXISTS safety_findings_category_idx ON safety_findings (category);
CREATE INDEX IF NOT EXISTS safety_findings_severity_idx ON safety_findings (severity);

ALTER TABLE timeline_events DROP CONSTRAINT IF EXISTS timeline_events_event_type_ck;
ALTER TABLE timeline_events
  ADD CONSTRAINT timeline_events_event_type_ck CHECK (event_type IN (
    'session.created',
    'student.action.submitted',
    'mock_patient.response.created',
    'fact.revealed',
    'unsupported_action.blocked',
    'session.state.snapshotted',
    'safety.action.blocked',
    'safety.response.blocked',
    'safety.warning.created'
  ));

COMMENT ON TABLE safety_rules IS
  'Deterministic safety rules are reviewed rule metadata only. They do not call models, store hidden fact payloads, or define clinical advice workflows.';

COMMENT ON TABLE safety_evaluations IS
  'Safety evaluations record deterministic pre-action and post-response decisions with sanitized excerpts and metadata only.';

COMMENT ON TABLE safety_findings IS
  'Safety findings record matched rule keys, categories, severities, and sanitized excerpts. They must not duplicate hidden facts, faculty notes, system prompts, or answer keys.';

INSERT INTO schema_migrations (version, name, checksum, applied_by, execution_ms, success)
VALUES ('0005', 'deterministic_safety_engine', NULL, 'sql-first-authority', NULL, true)
ON CONFLICT (version) DO NOTHING;

COMMIT;
