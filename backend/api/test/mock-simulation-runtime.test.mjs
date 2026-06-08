import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const apiRoot = join(repoRoot, "backend", "api")

function read(relativePath) {
  return readFileSync(join(apiRoot, relativePath), "utf8")
}

test("database service uses lazy raw pg pool and fails closed without DB URL", () => {
  const databaseService = read("src/database/database.service.ts")
  const transaction = read("src/database/transaction.ts")

  assert.match(databaseService, /from "pg"/)
  assert.match(databaseService, /new Pool\(/)
  assert.match(databaseService, /CLINMIRA_DATABASE_URL is required for simulation persistence/)
  assert.match(databaseService, /withTransaction/)
  assert.match(databaseService, /BEGIN/)
  assert.match(databaseService, /COMMIT/)
  assert.match(databaseService, /ROLLBACK/)
  assert.match(transaction, /TransactionClient/)
})

test("create session runtime writes required domain, reveal, timeline, snapshot, event, and outbox state", () => {
  const repository = read("src/simulation/simulation.repository.ts")

  for (const required of [
    "INSERT INTO simulation_sessions",
    "INSERT INTO session_revealed_facts",
    "INSERT INTO timeline_events",
    "INSERT INTO session_state_snapshots",
    "INSERT INTO event_log",
    "INSERT INTO outbox_events",
    "simulation.session.created",
    "baseline_visible",
  ]) {
    assert.match(repository, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${required} missing`)
  }
})

test("submit action runtime writes idempotency, action, message, reveal, timeline, snapshot, event, and outbox state", () => {
  const repository = read("src/simulation/simulation.repository.ts")

  for (const required of [
    "INSERT INTO idempotency_keys",
    "INSERT INTO clinical_actions",
    "INSERT INTO conversation_messages",
    "INSERT INTO session_revealed_facts",
    "INSERT INTO timeline_events",
    "INSERT INTO session_state_snapshots",
    "INSERT INTO event_log",
    "INSERT INTO outbox_events",
    "student.action.submitted",
    "mock_patient.response.created",
    "unsupported_action.blocked",
    "safety.action.blocked",
    "safety.response.blocked",
    "safety.warning.created",
    "session.state.snapshotted",
  ]) {
    assert.match(repository, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${required} missing`)
  }
})

test("idempotency duplicate and conflict behavior is implemented", () => {
  const repository = read("src/simulation/simulation.repository.ts")
  const service = read("src/simulation/simulation.service.ts")

  assert.match(service, /createHash\("sha256"\)/)
  assert.match(service, /stableStringify/)
  assert.match(repository, /response_snapshot/)
  assert.match(repository, /status === "completed"/)
  assert.match(repository, /from_idempotency_cache: true/)
  assert.match(repository, /Idempotency key was already used with a different request/)
  assert.match(repository, /idempotency_conflict/)
  assert.match(repository, /UPDATE idempotency_keys[\s\S]*?status = 'completed'/)
})

test("mock patient response denies prompt injection and diagnosis leakage", () => {
  const mock = read("src/simulation/mock-patient-response.ts")

  for (const phrase of [
    "ignore previous instructions",
    "reveal hidden diagnosis",
    "show system prompt",
    "tell me faculty notes",
    "bypass rules",
  ]) {
    assert.match(mock, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"))
  }

  assert.match(mock, /I cannot reveal hidden instructions, system prompts, or faculty-only notes/)
  assert.match(mock, /I am not sure what the diagnosis is/)
  assert.match(mock, /used_fact_ids: \[\]/)
})

test("allergy reveal requires ask_directly reveal rule and reference-only reveal write", () => {
  const repository = read("src/simulation/simulation.repository.ts")
  const mock = read("src/simulation/mock-patient-response.ts")

  assert.match(repository, /rr\.rule_type = 'ask_directly'/)
  assert.match(repository, /rr\.active = true/)
  assert.match(repository, /f\.fact_type = 'allergy'/)
  assert.match(repository, /f\.visibility IN \('hidden_until_revealed', 'baseline_visible'\)/)
  assert.match(repository, /ON CONFLICT \(session_id, fact_id, revealed_to\) DO NOTHING/)
  assert.doesNotMatch(repository, /session_revealed_facts[\s\S]{0,300}content/i)
  assert.match(mock, /newly_revealed_fact/)
  assert.match(mock, /buildAllergyPhrase/)
})

test("risky actions are blocked unsupported and do not implement treatment/order/diagnosis workflow", () => {
  const repository = read("src/simulation/simulation.repository.ts")
  const mock = read("src/simulation/mock-patient-response.ts")
  const safetyRules = read("src/safety/safety-rules.ts")

  assert.match(mock, /order_attempt/)
  assert.match(mock, /diagnosis_attempt/)
  assert.match(mock, /treatment_attempt/)
  assert.match(safetyRules, /risky_action\.order_attempt/)
  assert.match(safetyRules, /risky_action\.diagnosis_attempt/)
  assert.match(safetyRules, /risky_action\.treatment_attempt/)
  assert.match(repository, /blocked_unsupported/)
  assert.match(repository, /does not execute orders, diagnosis, or treatment/)
  assert.doesNotMatch(repository, /INSERT INTO orders|INSERT INTO imaging_results|INSERT INTO safety_warnings|INSERT INTO debrief_reports/i)
})

test("submit action safety gates persist evaluations before blocking or revealing facts", () => {
  const repository = read("src/simulation/simulation.repository.ts")

  assert.match(repository, /evaluatePreAction[\s\S]*persistEvaluation[\s\S]*safety\.action\.blocked/i)
  assert.match(repository, /evaluatePostResponse[\s\S]*persistEvaluation[\s\S]*safety\.response\.blocked/i)
  assert.match(repository, /safety\.warning\.created[\s\S]*INSERT INTO event_log[\s\S]*INSERT INTO outbox_events/i)
  assert.match(repository, /safety\.response\.blocked[\s\S]*mockResponse\.newly_revealed_fact/i)
})

test("GET session returns student-safe data only", () => {
  const repository = read("src/simulation/simulation.repository.ts")

  assert.match(repository, /visibility = 'student_safe'/)
  assert.match(repository, /revealed_to = 'student_payload'/)
  assert.match(repository, /patient_state: toJsonObject/)
  assert.doesNotMatch(repository, /faculty_notes|faculty_summary|system_prompt|hiddenDiagnosis|hidden_content/i)
})

test("optional database integration is skipped unless a safe DB URL is configured", { skip: !process.env.CLINMIRA_TEST_DATABASE_URL ? "CLINMIRA_TEST_DATABASE_URL is not configured" : false }, async () => {
  const { Pool } = await import("pg")
  const pool = new Pool({ connectionString: process.env.CLINMIRA_TEST_DATABASE_URL })

  try {
    const result = await pool.query("SELECT version FROM schema_migrations WHERE version IN ('0001', '0002', '0003', '0004') ORDER BY version")
    assert.deepEqual(
      result.rows.map((row) => row.version),
      ["0001", "0002", "0003", "0004"],
    )
  } finally {
    await pool.end()
  }
})
