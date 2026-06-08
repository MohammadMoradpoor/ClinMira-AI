import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const databaseRoot = join(import.meta.dirname, "..")
const migrationPath = join(databaseRoot, "migrations", "0005_deterministic_safety_engine.sql")
const seedPath = join(databaseRoot, "seeds", "0005_deterministic_safety_rules_seed.sql")

const allowedTables = ["safety_rules", "safety_evaluations", "safety_findings"]
const approvedSafetyEvents = ["safety.action.blocked", "safety.response.blocked", "safety.warning.created"]

function read(path) {
  return readFileSync(path, "utf8")
}

function migrationSql() {
  return read(migrationPath)
}

function seedSql() {
  return read(seedPath)
}

function createdTables(sql) {
  return [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? ([a-z_]+)/gi)].map((match) => match[1])
}

function tableBody(sql, tableName) {
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = sql.match(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${escaped} \\(([\\s\\S]*?)\\n\\);`, "i"))
  assert.ok(match, `Missing CREATE TABLE body for ${tableName}`)
  return match[1]
}

test("deterministic safety migration exists and creates only approved Step 10 tables", () => {
  const sql = migrationSql()

  assert.equal(existsSync(migrationPath), true)
  assert.deepEqual(createdTables(sql).sort(), [...allowedTables].sort())
})

test("safety tables are tenant scoped and linked to simulation transaction state", () => {
  const sql = migrationSql()

  for (const table of allowedTables) {
    assert.match(tableBody(sql, table), /institution_id uuid/i, `${table} must include institution_id`)
  }

  assert.match(tableBody(sql, "safety_evaluations"), /FOREIGN KEY \(institution_id, session_id\) REFERENCES simulation_sessions\(institution_id, id\)/i)
  assert.match(tableBody(sql, "safety_evaluations"), /FOREIGN KEY \(institution_id, clinical_action_id\) REFERENCES clinical_actions\(institution_id, id\)/i)
  assert.match(tableBody(sql, "safety_findings"), /FOREIGN KEY \(institution_id, safety_evaluation_id\) REFERENCES safety_evaluations\(institution_id, id\)/i)
})

test("safety schema stores sanitized decisions and findings, not hidden fact payloads", () => {
  const sql = migrationSql()

  assert.match(tableBody(sql, "safety_evaluations"), /input_text_excerpt text/i)
  assert.match(tableBody(sql, "safety_evaluations"), /output_text_excerpt text/i)
  assert.match(tableBody(sql, "safety_evaluations"), /CHECK \(input_text_excerpt IS NULL OR length\(input_text_excerpt\) <= 512\)/i)
  assert.match(tableBody(sql, "safety_findings"), /matched_excerpt text/i)
  assert.match(tableBody(sql, "safety_findings"), /CHECK \(matched_excerpt IS NULL OR length\(matched_excerpt\) <= 512\)/i)

  for (const forbiddenColumn of [
    "fact_content",
    "hidden_content",
    "faculty_notes",
    "answer_key",
    "system_prompt",
    "diagnosis_payload",
    "treatment_plan_payload",
  ]) {
    assert.doesNotMatch(sql, new RegExp(`\\b${forbiddenColumn}\\b`, "i"), `${forbiddenColumn} must not be stored`)
  }
})

test("timeline event constraint is extended only with approved safety events", () => {
  const sql = migrationSql()

  assert.match(sql, /ALTER TABLE timeline_events DROP CONSTRAINT IF EXISTS timeline_events_event_type_ck/i)
  assert.match(sql, /ALTER TABLE timeline_events[\s\S]*ADD CONSTRAINT timeline_events_event_type_ck CHECK/i)
  for (const eventType of approvedSafetyEvents) {
    assert.match(sql, new RegExp(`'${eventType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`, "i"), `${eventType} missing`)
  }
  assert.doesNotMatch(sql, /websocket|redis|sse|realtime|temporal/i)
})

test("safety seed creates global deterministic rules for required categories", () => {
  const sql = seedSql()

  assert.equal(existsSync(seedPath), true)
  assert.match(sql, /SELECT\s+NULL,[\s\S]*?'safety-rules\.v1'/i)
  for (const required of [
    "prompt_injection.ignore_previous_instructions",
    "hidden_fact.reveal_hidden_diagnosis",
    "system_prompt.show_system_prompt",
    "faculty_notes.faculty_only_material",
    "role_escalation.admin_or_faculty",
    "hidden_fact.restricted_safety_or_evaluator_context",
    "unsupported.diagnosis_certainty",
    "unsupported.treatment_plan",
    "unsupported.medication_recommendation",
    "unsupported.imaging_interpretation",
    "unsupported.debrief_generation",
    "risky_action.order_attempt",
    "risky_action.diagnosis_attempt",
    "risky_action.treatment_attempt",
  ]) {
    assert.match(sql, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${required} missing`)
  }
})

test("migration registry records Step 10", () => {
  const sql = migrationSql()

  assert.match(sql, /INSERT INTO schema_migrations \(version, name, checksum, applied_by, execution_ms, success\)/i)
  assert.match(sql, /VALUES \('0005', 'deterministic_safety_engine'/i)
})
