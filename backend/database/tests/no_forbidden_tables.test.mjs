import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { test } from "node:test"
import { assertOnlyApprovedDockerComposeFile } from "./docker_compose_guard_helpers.mjs"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const databaseRoot = join(repoRoot, "backend", "database")
const migrationPath = join(databaseRoot, "migrations", "0001_core_identity_and_audit.sql")
const seedPath = join(databaseRoot, "seeds", "0001_dev_synthetic_identity_seed.sql")

const allowedTables = new Set([
  "schema_migrations",
  "institutions",
  "users",
  "roles",
  "cohorts",
  "enrollments",
  "audit_logs",
])

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

function repoFilesAtDepth(maxDepth) {
  return listFiles(repoRoot, 0, maxDepth)
}

test("all created SQL tables are explicitly allowed", () => {
  const sql = read(migrationPath)
  const createdTables = [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)? ([a-z_]+)/gi)].map((match) => match[1])

  assert.ok(createdTables.length > 0)
  for (const table of createdTables) {
    assert.equal(allowedTables.has(table), true, `Unexpected table created: ${table}`)
  }
})

test("migration and seed do not create forbidden future tables", () => {
  const combinedSql = `${read(migrationPath)}\n${read(seedPath)}`

  for (const table of forbiddenTables) {
    assert.doesNotMatch(combinedSql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"))
    assert.doesNotMatch(combinedSql, new RegExp(`\\bINSERT INTO ${table}\\b`, "i"))
  }
})

test("no Prisma schema exists in repository scan depth", () => {
  const matches = repoFilesAtDepth(6).filter((filePath) => basename(filePath) === "schema.prisma")
  assert.deepEqual(matches, [])
})

test("only approved local dev/test docker compose file exists in repository scan depth", () => {
  assertOnlyApprovedDockerComposeFile(repoFilesAtDepth(6), repoRoot)
})

test("database files add no runtime integrations", () => {
  const implementationFiles = listFiles(databaseRoot).filter((filePath) => [".mjs", ".sql"].includes(extname(filePath)))
  const combinedSource = implementationFiles.map((filePath) => read(filePath)).join("\n")

  assert.doesNotMatch(
    combinedSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
  assert.doesNotMatch(combinedSource, /new\s+(?:PrismaClient|WebSocket|EventSource|OpenAI)\b/i)
  assert.doesNotMatch(combinedSource, /@(?:WebSocketGateway|SubscribeMessage)\b/)
})

test("database seed is not sourced from frontend or real data", () => {
  const seed = read(seedPath)

  assert.doesNotMatch(seed, /frontend|mock-data|localStorage|hiddenDiagnosis|real patient/i)
  assert.match(seed, /example\.edu/)
  assert.match(seed, /development-only/)
})
