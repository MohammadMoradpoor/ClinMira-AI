import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { test } from "node:test"
import { assertNoForbiddenDockerComposeFile } from "./docker_compose_guard_helpers.mjs"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const databaseRoot = join(repoRoot, "backend", "database")
const migrationPath = join(databaseRoot, "migrations", "0002_case_versioning_and_fact_ledger.sql")
const seedPath = join(databaseRoot, "seeds", "0002_dev_synthetic_case_fact_seed.sql")
const readmePath = join(databaseRoot, "README.md")

const forbiddenTables = [
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

function seedSql() {
  return read(seedPath)
}

test("fact ledger is the only Step 6 clinical fact table", () => {
  const sql = migrationSql()

  assert.match(sql, /CREATE TABLE IF NOT EXISTS fact_ledger/i)
  for (const table of ["hidden_facts", "revealed_facts"]) {
    assert.doesNotMatch(sql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"))
  }
})

test("database README records the canonical fact model decision", () => {
  const readme = read(readmePath)

  assert.match(readme, /`fact_ledger` is the canonical source of clinical facts/i)
  assert.match(readme, /does not create separate `hidden_facts` tables/i)
  assert.match(readme, /Hidden facts are represented as `fact_ledger` rows with restricted `visibility`/i)
  assert.match(readme, /`session_revealed_facts`[\s\S]*stores references only/i)
  assert.match(readme, /`fact_ledger` remains the source of clinical truth/i)
})

test("restricted visibility values require policy-mediated access", () => {
  const sql = migrationSql()

  assert.match(sql, /'hidden_until_revealed'/i)
  assert.match(sql, /'faculty_only'/i)
  assert.match(sql, /'safety_only'/i)
  assert.match(sql, /'evaluator_only'/i)
  assert.match(sql, /fact_access_policies/i)
  assert.match(sql, /'student_payload'/i)
  assert.match(sql, /'persona_agent'/i)
  assert.match(sql, /'safety_agent'/i)
  assert.match(sql, /'deny'/i)
  assert.match(sql, /'allowed_for_safety'/i)
})

test("development seed has explicit context firewall policy examples", () => {
  const sql = seedSql()

  assert.match(sql, /'student_payload'[\s\S]{0,300}'deny'/i)
  assert.match(sql, /'persona_agent'[\s\S]{0,300}'deny'/i)
  assert.match(sql, /'safety_agent'[\s\S]{0,300}'allowed_for_safety'/i)
  assert.match(sql, /'hidden_until_revealed'[\s\S]{0,300}'student_payload'[\s\S]{0,300}'deny'/i)
  assert.match(sql, /'hidden_until_revealed'[\s\S]{0,300}'persona_agent'[\s\S]{0,300}'deny'/i)
  assert.match(sql, /'ask_about_allergies'/i)
  assert.match(sql, /'ask_directly'/i)
})

test("hidden fact seed cannot be student visible before reveal", () => {
  const sql = seedSql()

  assert.match(sql, /'allergy_latex_hidden'[\s\S]*?'hidden_until_revealed'[\s\S]*?NULL/i)
  assert.match(sql, /'allergy_latex_hidden'[\s\S]*?true[\s\S]*?'00000000-0000-0000-0000-000000000202'/i)
})

test("development seed is synthetic-only and avoids future clinical workflow data", () => {
  const sql = seedSql()

  assert.match(sql, /development-only/i)
  assert.match(sql, /synthetic/i)
  assert.match(sql, /synthetic-oral-health-intake/i)
  assert.match(sql, /synthetic_only/i)
  assert.doesNotMatch(sql, /\b(?:diagnosis|treatment plan|prescription|radiograph|cbct|imaging result|medical record|mrn|date_of_birth|ssn|ehr)\b/i)
  assert.doesNotMatch(sql, /frontend\/lib\/mock-data|localStorage|hiddenDiagnosis/i)

  for (const table of forbiddenTables) {
    assert.doesNotMatch(sql, new RegExp(`\\bINSERT INTO ${table}\\b`, "i"), `Forbidden seed target: ${table}`)
  }
})

test("Step 6 SQL does not add runtime integrations or non-SQL migration authorities", () => {
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

test("Step 6 migration does not create future workflow/runtime tables", () => {
  const sql = migrationSql()

  for (const table of forbiddenTables) {
    assert.doesNotMatch(sql, new RegExp(`\\bCREATE TABLE(?: IF NOT EXISTS)? ${table}\\b`, "i"), `Forbidden table created: ${table}`)
  }
})
