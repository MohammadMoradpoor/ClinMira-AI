-- Development seed: synthetic identity foundation only.
-- Do not use this file for production data.

BEGIN;

INSERT INTO institutions (id, name, slug, status, settings)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  'ClinMira Demo University',
  'clinmira-demo',
  'active',
  '{"seed":"development-only","synthetic":true}'::jsonb
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status,
    settings = EXCLUDED.settings,
    updated_at = now();

INSERT INTO users (id, institution_id, email, name, status, profile)
VALUES
  (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'demo.student@example.edu',
    'Demo Student',
    'active',
    '{"seed":"development-only","persona":"student"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000101',
    'demo.faculty@example.edu',
    'Demo Faculty',
    'active',
    '{"seed":"development-only","persona":"faculty"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000101',
    'demo.admin@example.edu',
    'Demo Admin',
    'active',
    '{"seed":"development-only","persona":"admin"}'::jsonb
  )
ON CONFLICT (institution_id, email) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status,
    profile = EXCLUDED.profile,
    updated_at = now();

INSERT INTO roles (id, institution_id, user_id, role, scope_type)
SELECT
  '00000000-0000-0000-0000-000000000301',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000201',
  'student',
  'institution'
WHERE NOT EXISTS (
  SELECT 1 FROM roles
  WHERE institution_id = '00000000-0000-0000-0000-000000000101'
    AND user_id = '00000000-0000-0000-0000-000000000201'
    AND role = 'student'
    AND scope_type = 'institution'
    AND scope_id IS NULL
);

INSERT INTO roles (id, institution_id, user_id, role, scope_type)
SELECT
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000202',
  'faculty',
  'institution'
WHERE NOT EXISTS (
  SELECT 1 FROM roles
  WHERE institution_id = '00000000-0000-0000-0000-000000000101'
    AND user_id = '00000000-0000-0000-0000-000000000202'
    AND role = 'faculty'
    AND scope_type = 'institution'
    AND scope_id IS NULL
);

INSERT INTO roles (id, institution_id, user_id, role, scope_type)
SELECT
  '00000000-0000-0000-0000-000000000303',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000203',
  'admin',
  'institution'
WHERE NOT EXISTS (
  SELECT 1 FROM roles
  WHERE institution_id = '00000000-0000-0000-0000-000000000101'
    AND user_id = '00000000-0000-0000-0000-000000000203'
    AND role = 'admin'
    AND scope_type = 'institution'
    AND scope_id IS NULL
);

INSERT INTO cohorts (id, institution_id, name, term, program, status, metadata)
SELECT
  '00000000-0000-0000-0000-000000000401',
  '00000000-0000-0000-0000-000000000101',
  'Demo Cohort 2026',
  '2026',
  'Demo Program',
  'active',
  '{"seed":"development-only","synthetic":true}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM cohorts
  WHERE institution_id = '00000000-0000-0000-0000-000000000101'
    AND lower(name) = lower('Demo Cohort 2026')
    AND COALESCE(term, '') = '2026'
);

INSERT INTO enrollments (id, institution_id, cohort_id, user_id, role, status)
VALUES
  (
    '00000000-0000-0000-0000-000000000501',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000201',
    'student',
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000502',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000202',
    'faculty',
    'active'
  )
ON CONFLICT (cohort_id, user_id, role) DO UPDATE
SET status = EXCLUDED.status,
    updated_at = now();

INSERT INTO audit_logs (
  id,
  institution_id,
  actor_type,
  action,
  resource_type,
  resource_id,
  result,
  metadata
)
VALUES (
  '00000000-0000-0000-0000-000000000601',
  '00000000-0000-0000-0000-000000000101',
  'system',
  'development_seed_applied',
  'schema_migrations',
  NULL,
  'success',
  '{"seed":"0001_dev_synthetic_identity_seed","synthetic":true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

