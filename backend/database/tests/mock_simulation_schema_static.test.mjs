import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const databaseRoot = join(import.meta.dirname, "..")
const migrationPath = join(databaseRoot, "migrations", "0004_mock_simulation_session_engine.sql")

const allowedTables = [
  "simulation_sessions",
  "session_revealed_facts",
  "clinical_actions",
  "conversation_messages",
  "timeline_events",
  "session_state_snapshots",
]

const forbiddenFutureTables = [
  "hidden_facts",
  "revealed_facts",
  "orders",
  "imaging_results",
  "scores",
  "debrief_reports",
  "faculty_reviews",
  "agent_runs",
  "model_runs",
  "tool_calls",
  "safety_warnings",
  "rubrics",
  "evaluator_outputs",
  "realtime_connections",
  "websocket_connections",
  "redis_streams",
  "temporal_workflows",
]

function read(path) {
  return readFileSync(path, "utf8")
}

function migrationSql() {
  return read(migrationPath)
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

test("mock simulation migration exists and creates only the approved Step 8 tables", () => {
  const sql = migrationSql()

  assert.equal(existsSync(migrationPath), true)
  assert.deepEqual(createdTables(sql).sort(), [...allowedTables].sort())
})

test("mock simulation migration does not create forbidden future workflow/runtime tables", () => {
  const sql = migrationSql()

  for (const table of forbiddenFutureTables) {
    assert.doesNotMatch(sql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"))
    assert.doesNotMatch(sql, new RegExp(`\\bINSERT INTO ${table}\\b`, "i"))
  }
})

test("all Step 8 tables are tenant scoped", () => {
  const sql = migrationSql()

  for (const table of allowedTables) {
    assert.match(tableBody(sql, table), /institution_id uuid NOT NULL/i, `${table} must require institution_id`)
  }
})

test("simulation_sessions locks each session to a tenant, case, case version, and student", () => {
  const sql = migrationSql()
  const body = tableBody(sql, "simulation_sessions")

  for (const column of [
    "case_id uuid NOT NULL",
    "case_version_id uuid NOT NULL",
    "student_user_id uuid NOT NULL",
    "status text NOT NULL DEFAULT 'active'",
    "state_version integer NOT NULL DEFAULT 1",
    "patient_state jsonb NOT NULL DEFAULT '{}'::jsonb",
  ]) {
    assert.match(body, new RegExp(column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${column} missing`)
  }

  assert.match(body, /CONSTRAINT simulation_sessions_case_institution_fk FOREIGN KEY \(institution_id, case_id\) REFERENCES cases\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT simulation_sessions_case_version_institution_fk FOREIGN KEY \(institution_id, case_version_id\) REFERENCES case_versions\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT simulation_sessions_case_version_case_fk FOREIGN KEY \(institution_id, case_id, case_version_id\) REFERENCES case_versions\(institution_id, case_id, id\)/i)
  assert.match(body, /CONSTRAINT simulation_sessions_student_user_institution_fk FOREIGN KEY \(institution_id, student_user_id\) REFERENCES users\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT simulation_sessions_status_ck CHECK \(status IN \('active', 'completed', 'abandoned', 'expired', 'blocked'\)\)/i)
  assert.match(body, /CONSTRAINT simulation_sessions_state_version_positive_ck CHECK \(state_version > 0\)/i)
  assert.match(body, /CONSTRAINT simulation_sessions_patient_state_object_ck CHECK \(jsonb_typeof\(patient_state\) = 'object'\)/i)
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS case_versions_institution_case_id_id_uq\s+ON case_versions \(institution_id, case_id, id\)/i)
  assert.match(sql, /CREATE TRIGGER simulation_sessions_set_updated_at[\s\S]*?ON simulation_sessions\b/i)
})

test("clinical_actions records idempotent student actions and blocks unsupported risky action acceptance", () => {
  const sql = migrationSql()
  const body = tableBody(sql, "clinical_actions")

  assert.match(body, /CONSTRAINT clinical_actions_session_institution_fk FOREIGN KEY \(institution_id, session_id\) REFERENCES simulation_sessions\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT clinical_actions_actor_user_institution_fk FOREIGN KEY \(institution_id, actor_user_id\) REFERENCES users\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT clinical_actions_idempotency_key_institution_fk FOREIGN KEY \(institution_id, idempotency_key_id\) REFERENCES idempotency_keys\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT clinical_actions_session_sequence_uq UNIQUE \(session_id, sequence\)/i)
  assert.match(body, /CONSTRAINT clinical_actions_action_type_ck CHECK \(action_type IN/i)
  for (const actionType of [
    "ask_question",
    "empathy",
    "history_question",
    "exam_observation",
    "order_attempt",
    "diagnosis_attempt",
    "treatment_attempt",
  ]) {
    assert.match(body, new RegExp(`'${actionType}'`, "i"), `${actionType} missing`)
  }
  assert.match(body, /CONSTRAINT clinical_actions_status_ck CHECK \(status IN \(\s*'received',\s*'accepted',\s*'responded',\s*'blocked_unsupported',\s*'failed'\s*\)\)/i)
  assert.match(body, /CONSTRAINT clinical_actions_sequence_positive_ck CHECK \(sequence > 0\)/i)
  assert.match(body, /CONSTRAINT clinical_actions_payload_object_ck CHECK \(jsonb_typeof\(payload\) = 'object'\)/i)
  assert.match(body, /CONSTRAINT clinical_actions_risky_action_not_accepted_ck CHECK \([\s\S]*?action_type NOT IN \('order_attempt', 'diagnosis_attempt', 'treatment_attempt'\)[\s\S]*?OR status IN \('received', 'blocked_unsupported', 'failed'\)[\s\S]*?\)/i)
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS clinical_actions_session_idempotency_key_uq[\s\S]*?WHERE idempotency_key_id IS NOT NULL/i)
})

test("conversation_messages stores deterministic message projections without enabling realtime runtime", () => {
  const body = tableBody(migrationSql(), "conversation_messages")

  assert.match(body, /CONSTRAINT conversation_messages_session_institution_fk FOREIGN KEY \(institution_id, session_id\) REFERENCES simulation_sessions\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT conversation_messages_action_institution_fk FOREIGN KEY \(institution_id, clinical_action_id\) REFERENCES clinical_actions\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT conversation_messages_session_sequence_uq UNIQUE \(session_id, sequence\)/i)
  assert.match(body, /CONSTRAINT conversation_messages_speaker_ck CHECK \(speaker IN \('student', 'mock_patient', 'system'\)\)/i)
  assert.match(body, /CONSTRAINT conversation_messages_visibility_ck CHECK \(visibility IN \('student_safe', 'internal', 'faculty_only'\)\)/i)
  assert.match(body, /CONSTRAINT conversation_messages_status_ck CHECK \(status IN \('pending', 'streaming', 'completed', 'failed', 'blocked'\)\)/i)
  assert.match(body, /CONSTRAINT conversation_messages_content_non_empty_ck CHECK \(length\(btrim\(content\)\) > 0\)/i)
  assert.match(body, /CONSTRAINT conversation_messages_used_fact_ids_array_ck CHECK \(jsonb_typeof\(used_fact_ids\) = 'array'\)/i)
})

test("timeline_events records only approved mock session event names", () => {
  const body = tableBody(migrationSql(), "timeline_events")

  assert.match(body, /CONSTRAINT timeline_events_session_sequence_uq UNIQUE \(session_id, sequence\)/i)
  for (const eventType of [
    "session.created",
    "student.action.submitted",
    "mock_patient.response.created",
    "fact.revealed",
    "unsupported_action.blocked",
    "session.state.snapshotted",
  ]) {
    assert.match(body, new RegExp(`'${eventType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`, "i"), `${eventType} missing`)
  }
  assert.match(body, /CONSTRAINT timeline_events_title_non_empty_ck CHECK \(length\(btrim\(title\)\) > 0\)/i)
  assert.match(body, /CONSTRAINT timeline_events_payload_object_ck CHECK \(jsonb_typeof\(payload\) = 'object'\)/i)
  assert.match(body, /CONSTRAINT timeline_events_sequence_positive_ck CHECK \(sequence > 0\)/i)
})

test("session_state_snapshots are versioned projections rather than clinical fact sources", () => {
  const body = tableBody(migrationSql(), "session_state_snapshots")

  assert.match(body, /CONSTRAINT session_state_snapshots_session_institution_fk FOREIGN KEY \(institution_id, session_id\) REFERENCES simulation_sessions\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT session_state_snapshots_session_state_version_uq UNIQUE \(session_id, state_version\)/i)
  assert.match(body, /CONSTRAINT session_state_snapshots_state_version_positive_ck CHECK \(state_version > 0\)/i)
  assert.match(body, /CONSTRAINT session_state_snapshots_reason_non_empty_ck CHECK \(length\(btrim\(reason\)\) > 0\)/i)
  assert.match(body, /CONSTRAINT session_state_snapshots_snapshot_object_ck CHECK \(jsonb_typeof\(snapshot\) = 'object'\)/i)
})

test("approved indexes support tenant lookup, timeline ordering, idempotency, and replay recovery", () => {
  const sql = migrationSql()

  for (const expected of [
    "simulation_sessions_active_not_deleted_idx",
    "clinical_actions_session_idempotency_key_uq",
    "clinical_actions_session_id_idx",
    "session_revealed_facts_session_id_idx",
    "session_revealed_facts_revealed_to_idx",
    "conversation_messages_session_id_idx",
    "conversation_messages_visibility_idx",
    "timeline_events_session_id_idx",
    "timeline_events_event_type_idx",
    "session_state_snapshots_session_id_idx",
    "session_state_snapshots_state_version_idx",
  ]) {
    assert.match(sql, new RegExp(`CREATE (?:UNIQUE )?INDEX IF NOT EXISTS ${expected}\\b`, "i"), `${expected} missing`)
  }
})

test("mutation transaction contract remains tied to idempotency, event_log, and outbox foundations", () => {
  const sql = migrationSql()

  assert.match(sql, /idempotency_keys/i)
  assert.match(sql, /event_log event_type simulation\.session\.created/i)
  assert.match(sql, /outbox_events/i)
  assert.match(sql, /Approved runtime submit-action mutations must reserve idempotency_keys/i)
  assert.match(sql, /event_log, and outbox_events in one transaction/i)
})

test("migration registry records Step 8", () => {
  const sql = migrationSql()

  assert.match(sql, /INSERT INTO schema_migrations \(version, name, checksum, applied_by, execution_ms, success\)/i)
  assert.match(sql, /VALUES \('0004', 'mock_simulation_session_engine'/i)
})
