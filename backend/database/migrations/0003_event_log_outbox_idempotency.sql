-- Migration: 0003_event_log_outbox_idempotency
-- Authority: reviewed SQL is the production schema source of truth.
-- Scope: durable event log, transactional outbox, idempotency, and replay foundations only.

BEGIN;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  actor_user_id uuid,
  idempotency_key text NOT NULL,
  command_scope text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  response_event_id uuid,
  response_snapshot jsonb,
  expires_at timestamptz,
  locked_at timestamptz,
  locked_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT idempotency_keys_actor_user_institution_fk FOREIGN KEY (institution_id, actor_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT idempotency_keys_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT idempotency_keys_key_non_empty_ck CHECK (length(btrim(idempotency_key)) > 0),
  CONSTRAINT idempotency_keys_command_scope_non_empty_ck CHECK (length(btrim(command_scope)) > 0),
  CONSTRAINT idempotency_keys_request_hash_non_empty_ck CHECK (length(btrim(request_hash)) > 0),
  CONSTRAINT idempotency_keys_status_ck CHECK (status IN ('processing', 'completed', 'failed', 'expired')),
  CONSTRAINT idempotency_keys_response_snapshot_object_ck CHECK (
    response_snapshot IS NULL OR jsonb_typeof(response_snapshot) = 'object'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idempotency_keys_lookup_uq
  ON idempotency_keys (
    institution_id,
    COALESCE(actor_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    command_scope,
    idempotency_key
  );
CREATE INDEX IF NOT EXISTS idempotency_keys_institution_id_idx ON idempotency_keys (institution_id);
CREATE INDEX IF NOT EXISTS idempotency_keys_actor_user_id_idx ON idempotency_keys (actor_user_id);
CREATE INDEX IF NOT EXISTS idempotency_keys_command_scope_idx ON idempotency_keys (command_scope);
CREATE INDEX IF NOT EXISTS idempotency_keys_status_idx ON idempotency_keys (status);
CREATE INDEX IF NOT EXISTS idempotency_keys_expires_at_idx ON idempotency_keys (expires_at);
CREATE INDEX IF NOT EXISTS idempotency_keys_created_at_idx ON idempotency_keys (created_at);
CREATE INDEX IF NOT EXISTS idempotency_keys_locked_idx ON idempotency_keys (locked_at, locked_by);

DROP TRIGGER IF EXISTS idempotency_keys_set_updated_at ON idempotency_keys;
CREATE TRIGGER idempotency_keys_set_updated_at
BEFORE UPDATE ON idempotency_keys
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  stream_type text NOT NULL,
  stream_id uuid NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid,
  sequence bigint NOT NULL,
  event_type text NOT NULL,
  schema_version text NOT NULL,
  producer text NOT NULL,
  actor_user_id uuid,
  causation_event_id uuid,
  correlation_id text,
  idempotency_key_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_classification text NOT NULL DEFAULT 'internal',
  replayable boolean NOT NULL DEFAULT true,
  redaction_status text NOT NULL DEFAULT 'not_redacted',
  trace_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_log_actor_user_institution_fk FOREIGN KEY (institution_id, actor_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT event_log_causation_event_institution_fk FOREIGN KEY (institution_id, causation_event_id) REFERENCES event_log(institution_id, id),
  CONSTRAINT event_log_idempotency_key_institution_fk FOREIGN KEY (institution_id, idempotency_key_id) REFERENCES idempotency_keys(institution_id, id),
  CONSTRAINT event_log_stream_sequence_uq UNIQUE (institution_id, stream_type, stream_id, sequence),
  CONSTRAINT event_log_institution_id_id_uq UNIQUE (institution_id, id),
  CONSTRAINT event_log_stream_type_non_empty_ck CHECK (length(btrim(stream_type)) > 0),
  CONSTRAINT event_log_aggregate_type_non_empty_ck CHECK (length(btrim(aggregate_type)) > 0),
  CONSTRAINT event_log_event_type_non_empty_ck CHECK (length(btrim(event_type)) > 0),
  CONSTRAINT event_log_schema_version_non_empty_ck CHECK (length(btrim(schema_version)) > 0),
  CONSTRAINT event_log_producer_non_empty_ck CHECK (length(btrim(producer)) > 0),
  CONSTRAINT event_log_sequence_positive_ck CHECK (sequence > 0),
  CONSTRAINT event_log_payload_object_ck CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT event_log_payload_classification_ck CHECK (payload_classification IN (
    'public',
    'student_safe',
    'faculty_only',
    'safety_restricted',
    'internal',
    'audit_only'
  )),
  CONSTRAINT event_log_redaction_status_ck CHECK (redaction_status IN (
    'not_redacted',
    'role_filtered',
    'redacted',
    'contains_restricted_fields'
  ))
);

CREATE INDEX IF NOT EXISTS event_log_institution_id_idx ON event_log (institution_id);
CREATE INDEX IF NOT EXISTS event_log_stream_sequence_idx ON event_log (institution_id, stream_type, stream_id, sequence);
CREATE INDEX IF NOT EXISTS event_log_event_type_idx ON event_log (event_type);
CREATE INDEX IF NOT EXISTS event_log_aggregate_idx ON event_log (aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS event_log_actor_user_id_idx ON event_log (actor_user_id);
CREATE INDEX IF NOT EXISTS event_log_correlation_id_idx ON event_log (correlation_id);
CREATE INDEX IF NOT EXISTS event_log_trace_id_idx ON event_log (trace_id);
CREATE INDEX IF NOT EXISTS event_log_created_at_idx ON event_log (created_at);
CREATE INDEX IF NOT EXISTS event_log_replayable_idx ON event_log (replayable);
CREATE INDEX IF NOT EXISTS event_log_payload_classification_idx ON event_log (payload_classification);
CREATE INDEX IF NOT EXISTS event_log_payload_gin_idx ON event_log USING GIN (payload);

CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  event_id uuid NOT NULL,
  topic text NOT NULL,
  schema_version text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  published_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_events_event_institution_fk FOREIGN KEY (institution_id, event_id) REFERENCES event_log(institution_id, id),
  CONSTRAINT outbox_events_event_topic_uq UNIQUE (event_id, topic),
  CONSTRAINT outbox_events_topic_non_empty_ck CHECK (length(btrim(topic)) > 0),
  CONSTRAINT outbox_events_schema_version_non_empty_ck CHECK (length(btrim(schema_version)) > 0),
  CONSTRAINT outbox_events_payload_object_ck CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT outbox_events_status_ck CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'dead_letter', 'cancelled')),
  CONSTRAINT outbox_events_attempts_nonnegative_ck CHECK (attempts >= 0),
  CONSTRAINT outbox_events_published_status_ck CHECK (published_at IS NULL OR status = 'published'),
  CONSTRAINT outbox_events_dead_letter_status_ck CHECK (dead_lettered_at IS NULL OR status = 'dead_letter')
);

CREATE INDEX IF NOT EXISTS outbox_events_institution_id_idx ON outbox_events (institution_id);
CREATE INDEX IF NOT EXISTS outbox_events_event_id_idx ON outbox_events (event_id);
CREATE INDEX IF NOT EXISTS outbox_events_topic_idx ON outbox_events (topic);
CREATE INDEX IF NOT EXISTS outbox_events_status_idx ON outbox_events (status);
CREATE INDEX IF NOT EXISTS outbox_events_available_at_idx ON outbox_events (available_at);
CREATE INDEX IF NOT EXISTS outbox_events_published_at_idx ON outbox_events (published_at);
CREATE INDEX IF NOT EXISTS outbox_events_dead_lettered_at_idx ON outbox_events (dead_lettered_at);
CREATE INDEX IF NOT EXISTS outbox_events_locked_idx ON outbox_events (locked_at, locked_by);
CREATE INDEX IF NOT EXISTS outbox_events_attempts_created_at_idx ON outbox_events (attempts, created_at);
CREATE INDEX IF NOT EXISTS outbox_events_payload_gin_idx ON outbox_events USING GIN (payload);
CREATE INDEX IF NOT EXISTS outbox_events_pending_publisher_idx
  ON outbox_events (available_at, created_at)
  WHERE status IN ('pending', 'failed')
    AND published_at IS NULL
    AND dead_lettered_at IS NULL;

DROP TRIGGER IF EXISTS outbox_events_set_updated_at ON outbox_events;
CREATE TRIGGER outbox_events_set_updated_at
BEFORE UPDATE ON outbox_events
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'idempotency_keys_response_event_institution_fk'
  ) THEN
    ALTER TABLE idempotency_keys
      ADD CONSTRAINT idempotency_keys_response_event_institution_fk
      FOREIGN KEY (institution_id, response_event_id)
      REFERENCES event_log(institution_id, id);
  END IF;
END;
$$;

INSERT INTO schema_migrations (version, name, checksum, applied_by, execution_ms, success)
VALUES ('0003', 'event_log_outbox_idempotency', NULL, 'sql-first-authority', NULL, true)
ON CONFLICT (version) DO NOTHING;

COMMIT;
