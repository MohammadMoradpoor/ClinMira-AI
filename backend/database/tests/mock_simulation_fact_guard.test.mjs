import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { test } from "node:test"
import { assertNoForbiddenDockerComposeFile } from "./docker_compose_guard_helpers.mjs"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const databaseRoot = join(repoRoot, "backend", "database")
const migrationPath = join(databaseRoot, "migrations", "0004_mock_simulation_session_engine.sql")
const readmePath = join(databaseRoot, "README.md")

const forbiddenRuntimeTables = [
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

function listFiles(directory, depth = 0, maxDepth = Number.POSITIVE_INFINITY) {
  if (depth > maxDepth) {
    return []
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name)
    if (entry.isDirectory()) {
      if ([".git", ".next", "node_modules", "dist"].includes(entry.name)) {
        return []
      }

      return listFiles(filePath, depth + 1, maxDepth)
    }

    return [filePath]
  })
}

function read(path) {
  return readFileSync(path, "utf8")
}

function migrationSql() {
  return read(migrationPath)
}

function tableBody(sql, tableName) {
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = sql.match(new RegExp(`CREATE TABLE(?: IF NOT EXISTS)? ${escaped} \\(([\\s\\S]*?)\\n\\);`, "i"))
  assert.ok(match, `Missing CREATE TABLE body for ${tableName}`)
  return match[1]
}

test("session reveal state stores fact references only", () => {
  const body = tableBody(migrationSql(), "session_revealed_facts")

  assert.match(body, /fact_id uuid NOT NULL/i)
  assert.match(body, /reveal_rule_id uuid/i)
  assert.match(body, /revealed_by_action_id uuid/i)
  assert.match(body, /CONSTRAINT session_revealed_facts_fact_institution_fk FOREIGN KEY \(institution_id, fact_id\) REFERENCES fact_ledger\(institution_id, fact_id\)/i)
  assert.match(body, /CONSTRAINT session_revealed_facts_reveal_rule_institution_fk FOREIGN KEY \(institution_id, reveal_rule_id\) REFERENCES fact_reveal_rules\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT session_revealed_facts_action_institution_fk FOREIGN KEY \(institution_id, revealed_by_action_id\) REFERENCES clinical_actions\(institution_id, id\)/i)
  assert.match(body, /CONSTRAINT session_revealed_facts_session_fact_target_uq UNIQUE \(session_id, fact_id, revealed_to\)/i)
  assert.match(body, /CONSTRAINT session_revealed_facts_revealed_to_ck CHECK \(revealed_to IN \(\s*'student_payload',\s*'mock_patient_context',\s*'safety_context',\s*'evaluator_context'\s*\)\)/i)
})

test("session_revealed_facts does not duplicate hidden fact content or faculty-only fields", () => {
  const body = tableBody(migrationSql(), "session_revealed_facts")

  for (const forbiddenColumn of [
    "content",
    "fact_content",
    "hidden_content",
    "student_safe_summary",
    "faculty_notes",
    "faculty_summary",
    "diagnosis",
    "treatment_plan",
    "prompt",
    "system_prompt",
  ]) {
    assert.doesNotMatch(body, new RegExp(`\\b${forbiddenColumn}\\b`, "i"), `${forbiddenColumn} must not exist`)
  }
})

test("conversation messages only cite used fact ids and do not embed hidden fact payload columns", () => {
  const body = tableBody(migrationSql(), "conversation_messages")

  assert.match(body, /used_fact_ids jsonb NOT NULL DEFAULT '\[\]'::jsonb/i)
  assert.match(body, /CONSTRAINT conversation_messages_used_fact_ids_array_ck CHECK \(jsonb_typeof\(used_fact_ids\) = 'array'\)/i)
  for (const forbiddenColumn of [
    "fact_content",
    "hidden_fact",
    "faculty_notes",
    "raw_prompt",
    "system_prompt",
    "diagnosis",
    "treatment_plan",
  ]) {
    assert.doesNotMatch(body, new RegExp(`\\b${forbiddenColumn}\\b`, "i"), `${forbiddenColumn} must not exist`)
  }
})

test("mock simulation state cannot introduce separate hidden_facts or revealed_facts tables", () => {
  const sql = migrationSql()

  for (const table of ["hidden_facts", "revealed_facts"]) {
    assert.doesNotMatch(sql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"))
    assert.doesNotMatch(sql, new RegExp(`\\bINSERT INTO ${table}\\b`, "i"))
  }
})

test("database README records Step 8 source-of-truth and runtime blocker decisions", () => {
  const readme = read(readmePath)

  assert.match(readme, /Step 8 adds the database-only foundation for mock simulation sessions/i)
  assert.match(readme, /`session_revealed_facts`[\s\S]{0,140}stores references only/i)
  assert.match(readme, /does not duplicate `fact_ledger\.content`/i)
  assert.match(readme, /Runtime API endpoints are blocked until an approved database client/i)
  assert.match(readme, /No Redis, WebSocket, SSE, Temporal, live OpenAI, frontend integration, debrief, scoring, faculty workflow, orders, or imaging workflow/i)
})

test("Step 8 database work does not add runtime integrations or non-SQL migration authorities", () => {
  const implementationFiles = listFiles(databaseRoot).filter((filePath) => [".mjs", ".sql"].includes(extname(filePath)))
  const combinedSource = implementationFiles.map((filePath) => read(filePath)).join("\n")
  const repoFiles = listFiles(repoRoot, 0, 6)

  assert.deepEqual(repoFiles.filter((filePath) => basename(filePath) === "schema.prisma"), [])
  assertNoForbiddenDockerComposeFile(repoFiles, repoRoot)
  assert.doesNotMatch(
    combinedSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
  assert.doesNotMatch(combinedSource, /new\s+(?:PrismaClient|WebSocket|EventSource|OpenAI)\b/i)
  assert.doesNotMatch(combinedSource, /@(?:WebSocketGateway|SubscribeMessage)\b/)
})

test("Step 8 migration does not create later workflow or runtime tables", () => {
  const sql = migrationSql()

  for (const table of forbiddenRuntimeTables) {
    assert.doesNotMatch(sql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"), `Forbidden table created: ${table}`)
  }
})
