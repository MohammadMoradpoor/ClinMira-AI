-- Migration: 0004_mock_simulation_session_engine
-- Authority: reviewed SQL is the production schema source of truth.
-- Scope: mock simulation session state, revealed fact references, actions, messages, timeline, and snapshots only.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS case_versions_institution_case_id_id_uq
  ON case_versions (institution_id, case_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS fact_reveal_rules_institution_id_id_uq
  ON fact_reveal_rules (institution_id, id);

CREATE TABLE IF NOT EXISTS simulation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  case_id uuid NOT NULL,
  case_version_id uuid NOT NULL,
  student_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  state_version integer NOT NULL DEFAULT 1,
  patient_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT simulation_sessions_case_institution_fk FOREIGN KEY (institution_id, case_id) REFERENCES cases(institution_id, id),
  CONSTRAINT simulation_sessions_case_version_institution_fk FOREIGN KEY (institution_id, case_version_id) REFERENCES case_versions(institution_id, id),
  CONSTRAINT simulation_sessions_case_version_case_fk FOREIGN KEY (institution_id, case_id, case_version_id) REFERENCES case_versions(institution_id, case_id, id),
  CONSTRAINT simulation_sessions_student_user_institution_fk FOREIGN KEY (institution_id, student_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT simulation_sessions_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT simulation_sessions_status_ck CHECK (status IN ('active', 'completed', 'abandoned', 'expired', 'blocked')),
  CONSTRAINT simulation_sessions_state_version_positive_ck CHECK (state_version > 0),
  CONSTRAINT simulation_sessions_patient_state_object_ck CHECK (jsonb_typeof(patient_state) = 'object'),
  CONSTRAINT simulation_sessions_completion_status_ck CHECK (
    completed_at IS NULL OR status IN ('completed', 'abandoned', 'expired', 'blocked')
  )
);

CREATE INDEX IF NOT EXISTS simulation_sessions_institution_id_idx ON simulation_sessions (institution_id);
CREATE INDEX IF NOT EXISTS simulation_sessions_case_id_idx ON simulation_sessions (case_id);
CREATE INDEX IF NOT EXISTS simulation_sessions_case_version_id_idx ON simulation_sessions (case_version_id);
CREATE INDEX IF NOT EXISTS simulation_sessions_student_user_id_idx ON simulation_sessions (student_user_id);
CREATE INDEX IF NOT EXISTS simulation_sessions_status_idx ON simulation_sessions (status);
CREATE INDEX IF NOT EXISTS simulation_sessions_started_at_idx ON simulation_sessions (started_at);
CREATE INDEX IF NOT EXISTS simulation_sessions_expires_at_idx ON simulation_sessions (expires_at);
CREATE INDEX IF NOT EXISTS simulation_sessions_active_not_deleted_idx
  ON simulation_sessions (institution_id, student_user_id, started_at)
  WHERE status = 'active' AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS simulation_sessions_set_updated_at ON simulation_sessions;
CREATE TRIGGER simulation_sessions_set_updated_at
BEFORE UPDATE ON simulation_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS clinical_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  session_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  idempotency_key_id uuid,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'received',
  sequence integer NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  normalized_intent text,
  blocked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinical_actions_session_institution_fk FOREIGN KEY (institution_id, session_id) REFERENCES simulation_sessions(institution_id, id),
  CONSTRAINT clinical_actions_actor_user_institution_fk FOREIGN KEY (institution_id, actor_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT clinical_actions_idempotency_key_institution_fk FOREIGN KEY (institution_id, idempotency_key_id) REFERENCES idempotency_keys(institution_id, id),
  CONSTRAINT clinical_actions_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT clinical_actions_session_sequence_uq UNIQUE (session_id, sequence),
  CONSTRAINT clinical_actions_action_type_ck CHECK (action_type IN (
    'ask_question',
    'empathy',
    'history_question',
    'exam_observation',
    'order_attempt',
    'diagnosis_attempt',
    'treatment_attempt'
  )),
  CONSTRAINT clinical_actions_status_ck CHECK (status IN (
    'received',
    'accepted',
    'responded',
    'blocked_unsupported',
    'failed'
  )),
  CONSTRAINT clinical_actions_sequence_positive_ck CHECK (sequence > 0),
  CONSTRAINT clinical_actions_payload_object_ck CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT clinical_actions_risky_action_not_accepted_ck CHECK (
    action_type NOT IN ('order_attempt', 'diagnosis_attempt', 'treatment_attempt')
    OR status IN ('received', 'blocked_unsupported', 'failed')
  ),
  CONSTRAINT clinical_actions_blocked_reason_ck CHECK (
    status <> 'blocked_unsupported'
    OR (blocked_reason IS NOT NULL AND length(btrim(blocked_reason)) > 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS clinical_actions_session_idempotency_key_uq
  ON clinical_actions (session_id, idempotency_key_id)
  WHERE idempotency_key_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS clinical_actions_institution_id_idx ON clinical_actions (institution_id);
CREATE INDEX IF NOT EXISTS clinical_actions_session_id_idx ON clinical_actions (session_id);
CREATE INDEX IF NOT EXISTS clinical_actions_actor_user_id_idx ON clinical_actions (actor_user_id);
CREATE INDEX IF NOT EXISTS clinical_actions_idempotency_key_id_idx ON clinical_actions (idempotency_key_id);
CREATE INDEX IF NOT EXISTS clinical_actions_action_type_idx ON clinical_actions (action_type);
CREATE INDEX IF NOT EXISTS clinical_actions_status_idx ON clinical_actions (status);
CREATE INDEX IF NOT EXISTS clinical_actions_created_at_idx ON clinical_actions (created_at);

CREATE TABLE IF NOT EXISTS session_revealed_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  session_id uuid NOT NULL,
  fact_id uuid NOT NULL,
  reveal_rule_id uuid,
  revealed_by_action_id uuid,
  revealed_to text NOT NULL DEFAULT 'student_payload',
  reveal_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_revealed_facts_session_institution_fk FOREIGN KEY (institution_id, session_id) REFERENCES simulation_sessions(institution_id, id),
  CONSTRAINT session_revealed_facts_fact_institution_fk FOREIGN KEY (institution_id, fact_id) REFERENCES fact_ledger(institution_id, fact_id),
  CONSTRAINT session_revealed_facts_reveal_rule_institution_fk FOREIGN KEY (institution_id, reveal_rule_id) REFERENCES fact_reveal_rules(institution_id, id),
  CONSTRAINT session_revealed_facts_action_institution_fk FOREIGN KEY (institution_id, revealed_by_action_id) REFERENCES clinical_actions(institution_id, id),
  CONSTRAINT session_revealed_facts_session_fact_target_uq UNIQUE (session_id, fact_id, revealed_to),
  CONSTRAINT session_revealed_facts_revealed_to_ck CHECK (revealed_to IN (
    'student_payload',
    'mock_patient_context',
    'safety_context',
    'evaluator_context'
  )),
  CONSTRAINT session_revealed_facts_reveal_reason_non_empty_ck CHECK (length(btrim(reveal_reason)) > 0)
);

CREATE INDEX IF NOT EXISTS session_revealed_facts_institution_id_idx ON session_revealed_facts (institution_id);
CREATE INDEX IF NOT EXISTS session_revealed_facts_session_id_idx ON session_revealed_facts (session_id);
CREATE INDEX IF NOT EXISTS session_revealed_facts_fact_id_idx ON session_revealed_facts (fact_id);
CREATE INDEX IF NOT EXISTS session_revealed_facts_reveal_rule_id_idx ON session_revealed_facts (reveal_rule_id);
CREATE INDEX IF NOT EXISTS session_revealed_facts_revealed_to_idx ON session_revealed_facts (revealed_to);
CREATE INDEX IF NOT EXISTS session_revealed_facts_created_at_idx ON session_revealed_facts (created_at);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  session_id uuid NOT NULL,
  clinical_action_id uuid,
  speaker text NOT NULL,
  visibility text NOT NULL DEFAULT 'student_safe',
  status text NOT NULL DEFAULT 'completed',
  content text NOT NULL,
  used_fact_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  sequence integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_messages_session_institution_fk FOREIGN KEY (institution_id, session_id) REFERENCES simulation_sessions(institution_id, id),
  CONSTRAINT conversation_messages_action_institution_fk FOREIGN KEY (institution_id, clinical_action_id) REFERENCES clinical_actions(institution_id, id),
  CONSTRAINT conversation_messages_session_sequence_uq UNIQUE (session_id, sequence),
  CONSTRAINT conversation_messages_speaker_ck CHECK (speaker IN ('student', 'mock_patient', 'system')),
  CONSTRAINT conversation_messages_visibility_ck CHECK (visibility IN ('student_safe', 'internal', 'faculty_only')),
  CONSTRAINT conversation_messages_status_ck CHECK (status IN ('pending', 'streaming', 'completed', 'failed', 'blocked')),
  CONSTRAINT conversation_messages_content_non_empty_ck CHECK (length(btrim(content)) > 0),
  CONSTRAINT conversation_messages_used_fact_ids_array_ck CHECK (jsonb_typeof(used_fact_ids) = 'array'),
  CONSTRAINT conversation_messages_sequence_positive_ck CHECK (sequence > 0)
);

CREATE INDEX IF NOT EXISTS conversation_messages_institution_id_idx ON conversation_messages (institution_id);
CREATE INDEX IF NOT EXISTS conversation_messages_session_id_idx ON conversation_messages (session_id);
CREATE INDEX IF NOT EXISTS conversation_messages_clinical_action_id_idx ON conversation_messages (clinical_action_id);
CREATE INDEX IF NOT EXISTS conversation_messages_speaker_idx ON conversation_messages (speaker);
CREATE INDEX IF NOT EXISTS conversation_messages_visibility_idx ON conversation_messages (visibility);
CREATE INDEX IF NOT EXISTS conversation_messages_status_idx ON conversation_messages (status);
CREATE INDEX IF NOT EXISTS conversation_messages_created_at_idx ON conversation_messages (created_at);

CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  session_id uuid NOT NULL,
  clinical_action_id uuid,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sequence integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timeline_events_session_institution_fk FOREIGN KEY (institution_id, session_id) REFERENCES simulation_sessions(institution_id, id),
  CONSTRAINT timeline_events_action_institution_fk FOREIGN KEY (institution_id, clinical_action_id) REFERENCES clinical_actions(institution_id, id),
  CONSTRAINT timeline_events_session_sequence_uq UNIQUE (session_id, sequence),
  CONSTRAINT timeline_events_event_type_ck CHECK (event_type IN (
    'session.created',
    'student.action.submitted',
    'mock_patient.response.created',
    'fact.revealed',
    'unsupported_action.blocked',
    'session.state.snapshotted'
  )),
  CONSTRAINT timeline_events_title_non_empty_ck CHECK (length(btrim(title)) > 0),
  CONSTRAINT timeline_events_payload_object_ck CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT timeline_events_sequence_positive_ck CHECK (sequence > 0)
);

CREATE INDEX IF NOT EXISTS timeline_events_institution_id_idx ON timeline_events (institution_id);
CREATE INDEX IF NOT EXISTS timeline_events_session_id_idx ON timeline_events (session_id);
CREATE INDEX IF NOT EXISTS timeline_events_clinical_action_id_idx ON timeline_events (clinical_action_id);
CREATE INDEX IF NOT EXISTS timeline_events_event_type_idx ON timeline_events (event_type);
CREATE INDEX IF NOT EXISTS timeline_events_created_at_idx ON timeline_events (created_at);

CREATE TABLE IF NOT EXISTS session_state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  session_id uuid NOT NULL,
  state_version integer NOT NULL,
  reason text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_state_snapshots_session_institution_fk FOREIGN KEY (institution_id, session_id) REFERENCES simulation_sessions(institution_id, id),
  CONSTRAINT session_state_snapshots_session_state_version_uq UNIQUE (session_id, state_version),
  CONSTRAINT session_state_snapshots_state_version_positive_ck CHECK (state_version > 0),
  CONSTRAINT session_state_snapshots_reason_non_empty_ck CHECK (length(btrim(reason)) > 0),
  CONSTRAINT session_state_snapshots_snapshot_object_ck CHECK (jsonb_typeof(snapshot) = 'object')
);

CREATE INDEX IF NOT EXISTS session_state_snapshots_institution_id_idx ON session_state_snapshots (institution_id);
CREATE INDEX IF NOT EXISTS session_state_snapshots_session_id_idx ON session_state_snapshots (session_id);
CREATE INDEX IF NOT EXISTS session_state_snapshots_state_version_idx ON session_state_snapshots (state_version);
CREATE INDEX IF NOT EXISTS session_state_snapshots_created_at_idx ON session_state_snapshots (created_at);

COMMENT ON TABLE simulation_sessions IS
  'Mock simulation sessions are backend-owned PostgreSQL state. Approved runtime create-session mutations must write simulation_sessions, session_state_snapshots, timeline_events, event_log event_type simulation.session.created, and outbox_events in one transaction.';

COMMENT ON TABLE clinical_actions IS
  'Mock simulation actions are durable student actions. Approved runtime submit-action mutations must reserve idempotency_keys, persist clinical_actions, conversation_messages, timeline_events, session_revealed_facts when authorized, session_state_snapshots, event_log, and outbox_events in one transaction.';

COMMENT ON TABLE session_revealed_facts IS
  'Session reveal state stores fact references only. It must never duplicate fact_ledger.content, faculty notes, hidden fact payloads, or frontend mock state.';

COMMENT ON TABLE session_state_snapshots IS
  'Session snapshots are projections for recovery and replay support. fact_ledger remains the clinical fact source of truth.';

INSERT INTO schema_migrations (version, name, checksum, applied_by, execution_ms, success)
VALUES ('0004', 'mock_simulation_session_engine', NULL, 'sql-first-authority', NULL, true)
ON CONFLICT (version) DO NOTHING;

COMMIT;
