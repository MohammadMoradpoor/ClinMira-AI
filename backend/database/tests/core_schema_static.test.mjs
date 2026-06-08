import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const databaseRoot = join(import.meta.dirname, "..")
const migrationPath = join(databaseRoot, "migrations", "0001_core_identity_and_audit.sql")
const seedPath = join(databaseRoot, "seeds", "0001_dev_synthetic_identity_seed.sql")

const allowedTables = [
  "schema_migrations",
  "institutions",
  "users",
  "roles",
  "cohorts",
  "enrollments",
  "audit_logs",
]

const forbiddenTables = [
  "cases",
  "case_versions",
  "patient_twins",
  "hidden_facts",
  "revealed_facts",
  "fact_ledger",
  "simulation_sessions",
  "conversation_messages",
  "clinical_actions",
  "timeline_events",
  "event_log",
  "outbox_events",
  "agent_runs",
  "model_runs",
  "tool_calls",
  "debrief_reports",
  "faculty_reviews",
]

function read(path) {
  return readFileSync(path, "utf8")
}

function migrationSql() {
  return read(migrationPath)
}

function seedSql() {
  return read(seedPath)
}

function tableBody(sql, tableName) {
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = sql.match(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${escaped} \\(([\\s\\S]*?)\\n\\);`, "i"))
  assert.ok(match, `Missing CREATE TABLE body for ${tableName}`)
  return match[1]
}

function createdTables(sql) {
  return [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? ([a-z_]+)/gi)].map((match) => match[1])
}

test("core schema migration and seed files exist", () => {
  assert.equal(existsSync(migrationPath), true)
  assert.equal(existsSync(seedPath), true)
})

test("migration creates only the allowed Step 5 tables", () => {
  const tables = createdTables(migrationSql()).sort()
  assert.deepEqual(tables, [...allowedTables].sort())
})

test("migration does not contain forbidden future table names", () => {
  const sql = migrationSql()

  for (const table of forbiddenTables) {
    assert.doesNotMatch(sql, new RegExp(`\\b${table}\\b`, "i"), `Forbidden table name leaked into migration: ${table}`)
  }
})

test("tenant-scoped tables include institution_id", () => {
  const sql = migrationSql()

  for (const table of ["users", "roles", "cohorts", "enrollments"]) {
    assert.match(tableBody(sql, table), /institution_id uuid NOT NULL/i, `${table} must require institution_id`)
  }

  assert.match(tableBody(sql, "audit_logs"), /institution_id uuid REFERENCES institutions\(id\)/i)
})

test("migration includes tenant, status, role, and audit indexes", () => {
  const sql = migrationSql()

  for (const expected of [
    "institutions_slug_uq",
    "institutions_status_idx",
    "users_institution_email_uq",
    "users_institution_status_idx",
    "roles_user_institution_role_scope_uq",
    "roles_scope_idx",
    "cohorts_institution_status_idx",
    "enrollments_institution_user_cohort_idx",
    "enrollments_cohort_role_idx",
    "audit_logs_institution_id_idx",
    "audit_logs_actor_user_id_idx",
    "audit_logs_resource_idx",
    "audit_logs_created_at_idx",
    "audit_logs_trace_id_idx",
  ]) {
    assert.match(sql, new RegExp(`CREATE (?:UNIQUE )?INDEX ${expected}\\b`, "i"), `${expected} index missing`)
  }
})

test("migration includes enum-style check constraints", () => {
  const sql = migrationSql()

  for (const expected of [
    "institutions_status_ck",
    "users_status_ck",
    "roles_role_ck",
    "roles_scope_type_ck",
    "cohorts_status_ck",
    "enrollments_role_ck",
    "enrollments_status_ck",
    "audit_logs_actor_type_ck",
    "audit_logs_result_ck",
  ]) {
    assert.match(sql, new RegExp(`CONSTRAINT ${expected}\\b`, "i"), `${expected} constraint missing`)
  }
})

test("mutable tables have timestamps and updated_at triggers", () => {
  const sql = migrationSql()

  for (const table of ["institutions", "users", "roles", "cohorts", "enrollments"]) {
    const body = tableBody(sql, table)
    assert.match(body, /created_at timestamptz NOT NULL DEFAULT now\(\)/i, `${table} missing created_at`)
    assert.match(body, /updated_at timestamptz NOT NULL DEFAULT now\(\)/i, `${table} missing updated_at`)
    assert.match(sql, new RegExp(`CREATE TRIGGER ${table}_set_updated_at[\\s\\S]*?ON ${table}\\b`, "i"))
  }
})

test("audit logs are append-only by shape and do not have updated_at", () => {
  const body = tableBody(migrationSql(), "audit_logs")

  assert.match(body, /created_at timestamptz NOT NULL DEFAULT now\(\)/i)
  assert.doesNotMatch(body, /\bupdated_at\b/i)
})

test("development seed is synthetic-only and idempotent", () => {
  const sql = seedSql()

  assert.match(sql, /ClinMira Demo University/)
  assert.match(sql, /clinmira-demo/)
  assert.match(sql, /demo\.student@example\.edu/)
  assert.match(sql, /demo\.faculty@example\.edu/)
  assert.match(sql, /demo\.admin@example\.edu/)
  assert.match(sql, /ON CONFLICT/i)
  assert.match(sql, /development-only/)
  assert.match(sql, /synthetic/)
})

test("development seed contains no clinical content source data", () => {
  const sql = seedSql()

  assert.doesNotMatch(sql, /\b(?:patient|diagnosis|symptom|treatment|medication|imaging|radiograph|cbct|hidden|fact|session|agent)\b/i)
  for (const table of forbiddenTables) {
    assert.doesNotMatch(sql, new RegExp(`\\b${table}\\b`, "i"), `Forbidden table name leaked into seed: ${table}`)
  }
})

