import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const databaseRoot = join(import.meta.dirname, "..")
const migrationPath = join(databaseRoot, "migrations", "0003_event_log_outbox_idempotency.sql")

const allowedTables = ["idempotency_keys", "event_log", "outbox_events"]

const forbiddenFutureTables = [
  "simulation_sessions",
  "conversation_messages",
  "clinical_actions",
  "timeline_events",
  "orders",
  "imaging_results",
  "scores",
  "debrief_reports",
  "faculty_reviews",
  "agent_runs",
  "model_runs",
  "tool_calls",
  "replay_cursors",
  "event_consumers",
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

test("event reliability migration exists and creates only Step 7 tables", () => {
  const sql = migrationSql()

  assert.equal(existsSync(migrationPath), true)
  assert.deepEqual(createdTables(sql).sort(), [...allowedTables].sort())
})

test("event reliability migration does not create future product/runtime tables", () => {
  const sql = migrationSql()

  for (const table of forbiddenFutureTables) {
    assert.doesNotMatch(sql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"))
    assert.doesNotMatch(sql, new RegExp(`\\bINSERT INTO ${table}\\b`, "i"))
  }
})

test("all Step 7 tables are tenant scoped", () => {
  const sql = migrationSql()

  for (const table of allowedTables) {
    assert.match(tableBody(sql, table), /institution_id uuid NOT NULL/i, `${table} must require institution_id`)
  }
})

test("idempotency_keys enforces duplicate command protection shape", () => {
  const sql = migrationSql()
  const body = tableBody(sql, "idempotency_keys")

  for (const column of [
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    "actor_user_id uuid",
    "idempotency_key text NOT NULL",
    "command_scope text NOT NULL",
    "request_hash text NOT NULL",
    "status text NOT NULL DEFAULT 'processing'",
    "response_event_id uuid",
    "response_snapshot jsonb",
    "expires_at timestamptz",
    "locked_at timestamptz",
    "locked_by text",
    "created_at timestamptz NOT NULL DEFAULT now()",
    "updated_at timestamptz NOT NULL DEFAULT now()",
  ]) {
    assert.match(body, new RegExp(column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${column} missing`)
  }

  assert.match(body, /CONSTRAINT idempotency_keys_actor_user_institution_fk FOREIGN KEY \(institution_id, actor_user_id\) REFERENCES users\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT idempotency_keys_status_ck CHECK \(status IN \('processing', 'completed', 'failed', 'expired'\)\)/i)
  assert.match(body, /CONSTRAINT idempotency_keys_response_snapshot_object_ck CHECK/i)
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idempotency_keys_lookup_uq[\s\S]*?COALESCE\(actor_user_id, '00000000-0000-0000-0000-000000000000'::uuid\)[\s\S]*?command_scope[\s\S]*?idempotency_key/i)
  assert.match(sql, /CREATE TRIGGER idempotency_keys_set_updated_at[\s\S]*?ON idempotency_keys\b/i)
})

test("event_log enforces durable replay event envelope shape", () => {
  const sql = migrationSql()
  const body = tableBody(sql, "event_log")

  for (const column of [
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    "stream_type text NOT NULL",
    "stream_id uuid NOT NULL",
    "aggregate_type text NOT NULL",
    "aggregate_id uuid",
    "sequence bigint NOT NULL",
    "event_type text NOT NULL",
    "schema_version text NOT NULL",
    "producer text NOT NULL",
    "actor_user_id uuid",
    "causation_event_id uuid",
    "correlation_id text",
    "idempotency_key_id uuid",
    "payload jsonb NOT NULL DEFAULT '{}'::jsonb",
    "payload_classification text NOT NULL DEFAULT 'internal'",
    "replayable boolean NOT NULL DEFAULT true",
    "redaction_status text NOT NULL DEFAULT 'not_redacted'",
    "trace_id text",
    "created_at timestamptz NOT NULL DEFAULT now()",
  ]) {
    assert.match(body, new RegExp(column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${column} missing`)
  }

  assert.match(body, /CONSTRAINT event_log_stream_sequence_uq UNIQUE \(institution_id, stream_type, stream_id, sequence\)/i)
  assert.match(body, /CONSTRAINT event_log_institution_id_id_uq UNIQUE \(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT event_log_sequence_positive_ck CHECK \(sequence > 0\)/i)
  assert.match(body, /CONSTRAINT event_log_payload_object_ck CHECK \(jsonb_typeof\(payload\) = 'object'\)/i)
  assert.match(body, /CONSTRAINT event_log_payload_classification_ck CHECK \(payload_classification IN/i)
  assert.match(body, /'student_safe'/i)
  assert.match(body, /'faculty_only'/i)
  assert.match(body, /'safety_restricted'/i)
  assert.match(body, /CONSTRAINT event_log_redaction_status_ck CHECK \(redaction_status IN/i)
  assert.match(body, /'role_filtered'/i)
  assert.match(body, /'contains_restricted_fields'/i)
})

test("event_log includes replay, audit, and trace indexes", () => {
  const sql = migrationSql()

  for (const expected of [
    "event_log_institution_id_idx",
    "event_log_stream_sequence_idx",
    "event_log_event_type_idx",
    "event_log_aggregate_idx",
    "event_log_actor_user_id_idx",
    "event_log_correlation_id_idx",
    "event_log_trace_id_idx",
    "event_log_created_at_idx",
    "event_log_replayable_idx",
    "event_log_payload_classification_idx",
    "event_log_payload_gin_idx",
  ]) {
    assert.match(sql, new RegExp(`CREATE (?:UNIQUE )?INDEX IF NOT EXISTS ${expected}\\b`, "i"), `${expected} missing`)
  }
})

test("outbox_events enforces transactional publishing queue shape", () => {
  const sql = migrationSql()
  const body = tableBody(sql, "outbox_events")

  for (const column of [
    "id uuid PRIMARY KEY DEFAULT gen_random_uuid()",
    "event_id uuid NOT NULL",
    "topic text NOT NULL",
    "schema_version text NOT NULL",
    "payload jsonb NOT NULL DEFAULT '{}'::jsonb",
    "status text NOT NULL DEFAULT 'pending'",
    "attempts integer NOT NULL DEFAULT 0",
    "available_at timestamptz NOT NULL DEFAULT now()",
    "locked_at timestamptz",
    "locked_by text",
    "last_error text",
    "published_at timestamptz",
    "dead_lettered_at timestamptz",
    "created_at timestamptz NOT NULL DEFAULT now()",
    "updated_at timestamptz NOT NULL DEFAULT now()",
  ]) {
    assert.match(body, new RegExp(column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${column} missing`)
  }

  assert.match(body, /CONSTRAINT outbox_events_event_institution_fk FOREIGN KEY \(institution_id, event_id\) REFERENCES event_log\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT outbox_events_event_topic_uq UNIQUE \(event_id, topic\)/i)
  assert.match(body, /CONSTRAINT outbox_events_status_ck CHECK \(status IN \('pending', 'publishing', 'published', 'failed', 'dead_letter', 'cancelled'\)\)/i)
  assert.match(body, /CONSTRAINT outbox_events_attempts_nonnegative_ck CHECK \(attempts >= 0\)/i)
  assert.match(body, /CONSTRAINT outbox_events_payload_object_ck CHECK \(jsonb_typeof\(payload\) = 'object'\)/i)
  assert.match(sql, /CREATE INDEX IF NOT EXISTS outbox_events_pending_publisher_idx[\s\S]*?WHERE status IN \('pending', 'failed'\)[\s\S]*?published_at IS NULL[\s\S]*?dead_lettered_at IS NULL/i)
  assert.match(sql, /CREATE TRIGGER outbox_events_set_updated_at[\s\S]*?ON outbox_events\b/i)
})

test("idempotency response event FK is added after event_log exists", () => {
  const sql = migrationSql()

  assert.match(sql, /ALTER TABLE idempotency_keys[\s\S]*?ADD CONSTRAINT idempotency_keys_response_event_institution_fk[\s\S]*?FOREIGN KEY \(institution_id, response_event_id\)[\s\S]*?REFERENCES event_log\(institution_id, id\)/i)
})

test("migration registry records Step 7", () => {
  const sql = migrationSql()

  assert.match(sql, /INSERT INTO schema_migrations \(version, name, checksum, applied_by, execution_ms, success\)/i)
  assert.match(sql, /VALUES \('0003', 'event_log_outbox_idempotency'/i)
})
