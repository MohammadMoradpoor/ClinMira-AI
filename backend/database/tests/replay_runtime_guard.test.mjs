import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { test } from "node:test"
import { assertNoForbiddenDockerComposeFile } from "./docker_compose_guard_helpers.mjs"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const apiRoot = join(repoRoot, "backend", "api")
const databaseRoot = join(repoRoot, "backend", "database")

function read(path) {
  return readFileSync(path, "utf8")
}

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

test("Step 15 adds no migration and uses existing event_log/outbox schema authority", () => {
  const migrationFiles = listFiles(join(databaseRoot, "migrations")).filter((filePath) => extname(filePath) === ".sql")
  const migrationNames = migrationFiles.map((filePath) => basename(filePath)).sort()
  const eventOutboxMigration = read(join(databaseRoot, "migrations", "0003_event_log_outbox_idempotency.sql"))

  assert.deepEqual(
    migrationNames.filter((name) => /^0006|replay|realtime/i.test(name)),
    [],
    "Step 15 must not add a replay/realtime migration",
  )
  assert.match(eventOutboxMigration, /CREATE TABLE IF NOT EXISTS event_log/)
  assert.match(eventOutboxMigration, /CREATE TABLE IF NOT EXISTS outbox_events/)
  assert.match(eventOutboxMigration, /UNIQUE \(institution_id, stream_type, stream_id, sequence\)/)
  assert.match(eventOutboxMigration, /payload_classification/)
  assert.match(eventOutboxMigration, /replayable boolean NOT NULL DEFAULT true/)
})

test("replay runtime reads event_log and does not use outbox, Redis, or frontend state as replay truth", () => {
  const repository = read(join(apiRoot, "src", "replay", "replay.repository.ts"))
  const service = read(join(apiRoot, "src", "replay", "replay.service.ts"))
  const realtime = read(join(apiRoot, "src", "realtime", "realtime.service.ts"))

  assert.match(repository, /FROM event_log/)
  assert.match(repository, /replayable = true/)
  assert.match(repository, /ORDER BY sequence ASC/)
  assert.match(repository, /institution_id = \$1/)
  assert.match(service, /redactReplayEvent/)
  assert.match(realtime, /replayService\.replaySession/)
  assert.doesNotMatch(`${repository}\n${service}\n${realtime}`, /FROM outbox_events|INSERT INTO outbox_events|redis|ioredis|frontend\/|localStorage/i)
})

test("Step 15 repository has no Prisma schema, docker compose, or hidden fact payload exposure patterns", () => {
  const repoFiles = listFiles(repoRoot, 0, 6)
  const replaySource = listFiles(join(apiRoot, "src", "replay"))
    .filter((filePath) => [".ts", ".mjs"].includes(extname(filePath)))
    .map((filePath) => read(filePath))
    .join("\n")

  assert.deepEqual(repoFiles.filter((filePath) => basename(filePath) === "schema.prisma"), [])
  assertNoForbiddenDockerComposeFile(repoFiles, repoRoot)
  assert.doesNotMatch(replaySource, /fact_ledger[\s\S]{0,160}content/i)
  assert.doesNotMatch(replaySource, /hidden_diagnosis|faculty_only_notes|raw_fact_content|system_prompt|api_key|provider_secret/i)
})
