-- Migration: 0001_core_identity_and_audit
-- Authority: reviewed SQL is the production schema source of truth.
-- Scope: core identity, tenancy, cohort membership, audit, and migration metadata only.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  name text NOT NULL,
  checksum text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text,
  execution_ms integer,
  success boolean NOT NULL DEFAULT true,
  CONSTRAINT schema_migrations_name_non_empty_ck CHECK (length(btrim(name)) > 0),
  CONSTRAINT schema_migrations_execution_ms_ck CHECK (execution_ms IS NULL OR execution_ms >= 0)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT institutions_name_non_empty_ck CHECK (length(btrim(name)) > 0),
  CONSTRAINT institutions_slug_format_ck CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  CONSTRAINT institutions_status_ck CHECK (status IN ('active', 'suspended', 'archived')),
  CONSTRAINT institutions_settings_object_ck CHECK (jsonb_typeof(settings) = 'object')
);

CREATE UNIQUE INDEX institutions_slug_uq ON institutions (slug);
CREATE INDEX institutions_status_idx ON institutions (status);
CREATE INDEX institutions_active_not_deleted_idx ON institutions (id) WHERE status = 'active' AND deleted_at IS NULL;

CREATE TRIGGER institutions_set_updated_at
BEFORE UPDATE ON institutions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  email text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT users_email_lowercase_ck CHECK (email = lower(email)),
  CONSTRAINT users_email_basic_ck CHECK (email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'),
  CONSTRAINT users_name_non_empty_ck CHECK (length(btrim(name)) > 0),
  CONSTRAINT users_status_ck CHECK (status IN ('active', 'invited', 'suspended', 'archived')),
  CONSTRAINT users_profile_object_ck CHECK (jsonb_typeof(profile) = 'object')
);

CREATE UNIQUE INDEX users_institution_email_uq ON users (institution_id, email);
CREATE UNIQUE INDEX users_institution_id_id_uq ON users (institution_id, id);
CREATE INDEX users_institution_id_idx ON users (institution_id);
CREATE INDEX users_status_idx ON users (status);
CREATE INDEX users_institution_status_idx ON users (institution_id, status);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  user_id uuid NOT NULL,
  role text NOT NULL,
  scope_type text NOT NULL DEFAULT 'institution',
  scope_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_user_institution_fk FOREIGN KEY (institution_id, user_id) REFERENCES users(institution_id, id),
  CONSTRAINT roles_role_ck CHECK (role IN ('student', 'faculty', 'admin', 'owner', 'auditor')),
  CONSTRAINT roles_scope_type_ck CHECK (scope_type IN ('institution', 'cohort', 'case', 'system')),
  CONSTRAINT roles_scope_id_ck CHECK ((scope_type = 'institution' AND scope_id IS NULL) OR scope_type <> 'institution')
);

CREATE UNIQUE INDEX roles_user_institution_role_scope_uq
  ON roles (user_id, institution_id, role, scope_type, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX roles_user_id_idx ON roles (user_id);
CREATE INDEX roles_institution_id_idx ON roles (institution_id);
CREATE INDEX roles_role_idx ON roles (role);
CREATE INDEX roles_scope_idx ON roles (scope_type, scope_id);

CREATE TRIGGER roles_set_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  name text NOT NULL,
  term text,
  program text,
  status text NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT cohorts_name_non_empty_ck CHECK (length(btrim(name)) > 0),
  CONSTRAINT cohorts_status_ck CHECK (status IN ('active', 'archived')),
  CONSTRAINT cohorts_metadata_object_ck CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE UNIQUE INDEX cohorts_institution_name_term_uq ON cohorts (institution_id, lower(name), COALESCE(term, ''));
CREATE UNIQUE INDEX cohorts_institution_id_id_uq ON cohorts (institution_id, id);
CREATE INDEX cohorts_institution_id_idx ON cohorts (institution_id);
CREATE INDEX cohorts_status_idx ON cohorts (status);
CREATE INDEX cohorts_institution_status_idx ON cohorts (institution_id, status);
CREATE INDEX cohorts_term_idx ON cohorts (term);
CREATE INDEX cohorts_program_idx ON cohorts (program);

CREATE TRIGGER cohorts_set_updated_at
BEFORE UPDATE ON cohorts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  cohort_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT enrollments_cohort_institution_fk FOREIGN KEY (institution_id, cohort_id) REFERENCES cohorts(institution_id, id),
  CONSTRAINT enrollments_user_institution_fk FOREIGN KEY (institution_id, user_id) REFERENCES users(institution_id, id),
  CONSTRAINT enrollments_cohort_user_role_uq UNIQUE (cohort_id, user_id, role),
  CONSTRAINT enrollments_role_ck CHECK (role IN ('student', 'faculty', 'assistant', 'observer')),
  CONSTRAINT enrollments_status_ck CHECK (status IN ('active', 'completed', 'dropped', 'archived'))
);

CREATE INDEX enrollments_institution_id_idx ON enrollments (institution_id);
CREATE INDEX enrollments_cohort_id_idx ON enrollments (cohort_id);
CREATE INDEX enrollments_user_id_idx ON enrollments (user_id);
CREATE INDEX enrollments_status_idx ON enrollments (status);
CREATE INDEX enrollments_cohort_role_idx ON enrollments (cohort_id, role);
CREATE INDEX enrollments_institution_user_cohort_idx ON enrollments (institution_id, user_id, cohort_id);

CREATE TRIGGER enrollments_set_updated_at
BEFORE UPDATE ON enrollments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  actor_user_id uuid,
  actor_type text NOT NULL DEFAULT 'system',
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  result text NOT NULL,
  trace_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_actor_user_institution_fk FOREIGN KEY (institution_id, actor_user_id) REFERENCES users(institution_id, id),
  CONSTRAINT audit_logs_actor_user_requires_institution_ck CHECK (actor_user_id IS NULL OR institution_id IS NOT NULL),
  CONSTRAINT audit_logs_actor_type_ck CHECK (actor_type IN ('user', 'system', 'worker', 'admin')),
  CONSTRAINT audit_logs_action_non_empty_ck CHECK (length(btrim(action)) > 0),
  CONSTRAINT audit_logs_resource_type_non_empty_ck CHECK (length(btrim(resource_type)) > 0),
  CONSTRAINT audit_logs_result_ck CHECK (result IN ('success', 'denied', 'failed', 'blocked')),
  CONSTRAINT audit_logs_metadata_object_ck CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX audit_logs_institution_id_idx ON audit_logs (institution_id);
CREATE INDEX audit_logs_actor_user_id_idx ON audit_logs (actor_user_id);
CREATE INDEX audit_logs_action_idx ON audit_logs (action);
CREATE INDEX audit_logs_resource_idx ON audit_logs (resource_type, resource_id);
CREATE INDEX audit_logs_result_idx ON audit_logs (result);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at);
CREATE INDEX audit_logs_trace_id_idx ON audit_logs (trace_id);

INSERT INTO schema_migrations (version, name, checksum, applied_by, execution_ms, success)
VALUES ('0001', 'core_identity_and_audit', NULL, 'sql-first-authority', NULL, true)
ON CONFLICT (version) DO NOTHING;

COMMIT;

