import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const databaseRoot = join(import.meta.dirname, "..")
const migrationPath = join(databaseRoot, "migrations", "0002_case_versioning_and_fact_ledger.sql")
const seedPath = join(databaseRoot, "seeds", "0002_dev_synthetic_case_fact_seed.sql")

const allowedTables = [
  "cases",
  "case_versions",
  "patient_twins",
  "patient_personas",
  "fact_ledger",
  "fact_reveal_rules",
  "fact_access_policies",
]

const forbiddenFutureTables = [
  "hidden_facts",
  "revealed_facts",
  "simulation_sessions",
  "conversation_messages",
  "clinical_actions",
  "timeline_events",
  "event_log",
  "outbox_events",
  "orders",
  "imaging_results",
  "scores",
  "debrief_reports",
  "faculty_reviews",
  "agent_runs",
  "model_runs",
  "tool_calls",
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

test("case versioning and fact ledger migration files exist", () => {
  assert.equal(existsSync(migrationPath), true)
  assert.equal(existsSync(seedPath), true)
})

test("migration creates only approved Step 6 tables", () => {
  const tables = createdTables(migrationSql()).sort()

  assert.deepEqual(tables, [...allowedTables].sort())
})

test("migration and seed do not create or populate forbidden future tables", () => {
  const combinedSql = `${migrationSql()}\n${seedSql()}`

  for (const table of forbiddenFutureTables) {
    assert.doesNotMatch(combinedSql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"))
    assert.doesNotMatch(combinedSql, new RegExp(`\\bINSERT INTO ${table}\\b`, "i"))
  }
})

test("all Step 6 tables are tenant scoped", () => {
  const sql = migrationSql()

  for (const table of allowedTables) {
    assert.match(tableBody(sql, table), /institution_id uuid NOT NULL/i, `${table} must require institution_id`)
  }
})

test("case and version tables enforce tenant relationships and immutable version shape", () => {
  const sql = migrationSql()
  const caseVersions = tableBody(sql, "case_versions")

  assert.match(sql, /CONSTRAINT cases_created_by_user_institution_fk FOREIGN KEY \(institution_id, created_by_user_id\) REFERENCES users\(institution_id, id\)/i)
  assert.match(sql, /CONSTRAINT cases_current_version_institution_fk[\s\S]*?FOREIGN KEY \(institution_id, current_version_id\)[\s\S]*?REFERENCES case_versions\(institution_id, id\)/i)
  assert.match(caseVersions, /CONSTRAINT case_versions_case_institution_fk FOREIGN KEY \(institution_id, case_id\) REFERENCES cases\(institution_id, id\)/i)
  assert.match(caseVersions, /CONSTRAINT case_versions_case_version_uq UNIQUE \(case_id, version\)/i)
  assert.match(caseVersions, /CONSTRAINT case_versions_institution_id_id_uq UNIQUE \(institution_id, id\)/i)
  assert.match(caseVersions, /CONSTRAINT case_versions_learning_objectives_array_ck CHECK \(jsonb_typeof\(learning_objectives\) = 'array'\)/i)
  assert.match(caseVersions, /CONSTRAINT case_versions_expected_reasoning_path_array_ck CHECK \(jsonb_typeof\(expected_reasoning_path\) = 'array'\)/i)
  assert.match(sql, /CREATE OR REPLACE FUNCTION prevent_case_version_content_mutation\(\)/i)
  assert.match(sql, /OLD\.status IN \('approved', 'published'\)/i)
  assert.match(sql, /CREATE TRIGGER case_versions_prevent_content_mutation/i)
})

test("patient twin and persona tables stay synthetic metadata only", () => {
  const sql = migrationSql()
  const twins = tableBody(sql, "patient_twins")
  const personas = tableBody(sql, "patient_personas")

  assert.match(twins, /CONSTRAINT patient_twins_case_version_institution_fk FOREIGN KEY \(institution_id, case_version_id\) REFERENCES case_versions\(institution_id, id\)/i)
  assert.match(twins, /CONSTRAINT patient_twins_case_version_uq UNIQUE \(case_version_id\)/i)
  assert.match(twins, /baseline_state jsonb NOT NULL DEFAULT '\{\}'::jsonb/i)
  assert.match(twins, /synthetic_profile jsonb NOT NULL DEFAULT '\{\}'::jsonb/i)
  assert.match(twins, /CONSTRAINT patient_twins_baseline_state_object_ck CHECK \(jsonb_typeof\(baseline_state\) = 'object'\)/i)
  assert.match(personas, /CONSTRAINT patient_personas_patient_twin_institution_fk FOREIGN KEY \(institution_id, patient_twin_id\) REFERENCES patient_twins\(institution_id, id\)/i)
  assert.match(personas, /CONSTRAINT patient_personas_patient_twin_uq UNIQUE \(patient_twin_id\)/i)
  assert.match(personas, /CONSTRAINT patient_personas_health_literacy_ck CHECK \(health_literacy IN \('limited', 'typical', 'high'\)\)/i)
  assert.match(personas, /CONSTRAINT patient_personas_reliability_ck CHECK \(reliability IN \('reliable', 'variable', 'unreliable'\)\)/i)
})

test("fact ledger is canonical and constrained for grounding", () => {
  const sql = migrationSql()
  const facts = tableBody(sql, "fact_ledger")

  assert.match(facts, /fact_id uuid PRIMARY KEY DEFAULT gen_random_uuid\(\)/i)
  assert.match(facts, /case_version_id uuid NOT NULL/i)
  assert.match(facts, /fact_key text NOT NULL/i)
  assert.match(facts, /content jsonb NOT NULL/i)
  assert.match(facts, /CONSTRAINT fact_ledger_case_version_institution_fk FOREIGN KEY \(institution_id, case_version_id\) REFERENCES case_versions\(institution_id, id\)/i)
  assert.match(facts, /CONSTRAINT fact_ledger_case_version_fact_key_uq UNIQUE \(case_version_id, fact_key\)/i)
  assert.match(facts, /CONSTRAINT fact_ledger_institution_case_fact_id_uq UNIQUE \(institution_id, case_version_id, fact_id\)/i)
  assert.match(facts, /CONSTRAINT fact_ledger_fact_type_ck CHECK \(fact_type IN/i)
  assert.match(facts, /CONSTRAINT fact_ledger_visibility_ck CHECK \(visibility IN/i)
  assert.match(facts, /'baseline_visible'/i)
  assert.match(facts, /'hidden_until_revealed'/i)
  assert.match(facts, /'faculty_only'/i)
  assert.match(facts, /'safety_only'/i)
  assert.match(facts, /'evaluator_only'/i)
  assert.match(facts, /CONSTRAINT fact_ledger_source_type_ck CHECK \(source_type IN/i)
  assert.match(facts, /CONSTRAINT fact_ledger_content_object_ck CHECK \(jsonb_typeof\(content\) = 'object'\)/i)
  assert.match(facts, /CONSTRAINT fact_ledger_visible_summary_ck CHECK/i)
  assert.match(facts, /CONSTRAINT fact_ledger_hidden_summary_ck CHECK/i)
  assert.match(facts, /CONSTRAINT fact_ledger_approval_consistency_ck CHECK/i)
})

test("fact reveal and access policy tables encode context firewall foundations", () => {
  const sql = migrationSql()
  const revealRules = tableBody(sql, "fact_reveal_rules")
  const accessPolicies = tableBody(sql, "fact_access_policies")

  assert.match(revealRules, /CONSTRAINT fact_reveal_rules_fact_institution_fk FOREIGN KEY \(institution_id, case_version_id, fact_id\) REFERENCES fact_ledger\(institution_id, case_version_id, fact_id\)/i)
  assert.match(revealRules, /CONSTRAINT fact_reveal_rules_fact_rule_key_uq UNIQUE \(fact_id, rule_key\)/i)
  assert.match(revealRules, /'ask_directly'/i)
  assert.match(revealRules, /'student_action'/i)
  assert.match(revealRules, /'faculty_override'/i)
  assert.match(revealRules, /CONSTRAINT fact_reveal_rules_rule_config_object_ck CHECK \(jsonb_typeof\(rule_config\) = 'object'\)/i)

  assert.match(accessPolicies, /CONSTRAINT fact_access_policies_case_version_institution_fk FOREIGN KEY \(institution_id, case_version_id\) REFERENCES case_versions\(institution_id, id\)/i)
  assert.match(accessPolicies, /CONSTRAINT fact_access_policies_fact_institution_fk FOREIGN KEY \(institution_id, case_version_id, fact_id\) REFERENCES fact_ledger\(institution_id, case_version_id, fact_id\)/i)
  assert.match(accessPolicies, /CONSTRAINT fact_access_policies_target_ck CHECK \(fact_id IS NOT NULL OR fact_type IS NOT NULL OR visibility IS NOT NULL\)/i)
  assert.match(accessPolicies, /'student_payload'/i)
  assert.match(accessPolicies, /'persona_agent'/i)
  assert.match(accessPolicies, /'safety_agent'/i)
  assert.match(accessPolicies, /'deny'/i)
  assert.match(accessPolicies, /'allowed_for_safety'/i)
})

test("required indexes and triggers are present", () => {
  const sql = migrationSql()

  for (const expected of [
    "cases_institution_status_specialty_idx",
    "case_versions_case_status_idx",
    "patient_twins_institution_case_version_idx",
    "patient_personas_institution_patient_twin_idx",
    "fact_ledger_case_visibility_source_idx",
    "fact_ledger_content_gin_idx",
    "fact_reveal_rules_type_active_idx",
    "fact_access_policies_case_actor_idx",
    "fact_access_policies_visibility_actor_idx",
    "fact_access_policies_active_idx",
  ]) {
    assert.match(sql, new RegExp(`CREATE (?:UNIQUE )?INDEX IF NOT EXISTS ${expected}\\b`, "i"), `${expected} index missing`)
  }

  for (const table of ["cases", "case_versions", "patient_twins", "patient_personas", "fact_ledger", "fact_reveal_rules", "fact_access_policies"]) {
    assert.match(sql, new RegExp(`CREATE TRIGGER ${table}_set_updated_at[\\s\\S]*?ON ${table}\\b`, "i"), `${table} updated_at trigger missing`)
  }
})

test("migration registry records Step 6", () => {
  const sql = migrationSql()

  assert.match(sql, /INSERT INTO schema_migrations \(version, name, checksum, applied_by, execution_ms, success\)/i)
  assert.match(sql, /VALUES \('0002', 'case_versioning_and_fact_ledger'/i)
})
