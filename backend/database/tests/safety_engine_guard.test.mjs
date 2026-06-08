import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { test } from "node:test"
import { assertNoForbiddenDockerComposeFile } from "./docker_compose_guard_helpers.mjs"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const databaseRoot = join(repoRoot, "backend", "database")
const migrationPath = join(databaseRoot, "migrations", "0005_deterministic_safety_engine.sql")
const seedPath = join(databaseRoot, "seeds", "0005_deterministic_safety_rules_seed.sql")

const forbiddenFutureTables = [
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

test("Step 10 database work does not add future workflow/runtime tables", () => {
  const combinedSql = `${read(migrationPath)}\n${read(seedPath)}`

  for (const table of forbiddenFutureTables) {
    assert.doesNotMatch(combinedSql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"), `Forbidden table created: ${table}`)
    assert.doesNotMatch(combinedSql, new RegExp(`\\bINSERT INTO ${table}\\b`, "i"), `Forbidden seed target: ${table}`)
  }
})

test("Step 10 database work adds no runtime integrations or non-SQL migration authority", () => {
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

test("safety seed is synthetic rule metadata and not sourced from frontend prototype data", () => {
  const sql = read(seedPath)

  assert.match(sql, /deterministic_seed/i)
  assert.doesNotMatch(sql, /frontend\/lib\/mock-data|localStorage|hiddenDiagnosis|mockCases|mockPatients/i)
  assert.doesNotMatch(sql, /\bMRN\b|medical record number|SSN|DOB|real patient/i)
})

test("safety migration does not make Redis, WebSocket, SSE, or Temporal replay claims", () => {
  const sql = read(migrationPath)

  assert.doesNotMatch(sql, /\bRedis\b|WebSocket|socket\.io|SSE|EventSource|Temporal|workflow runtime/i)
  assert.doesNotMatch(sql, /CREATE TABLE(?: IF NOT EXISTS)? (?:event_consumers|replay_cursors)\b/i)
})
