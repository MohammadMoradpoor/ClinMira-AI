import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { test } from "node:test"
import { assertNoForbiddenDockerComposeFile } from "./docker_compose_guard_helpers.mjs"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const contractsRoot = join(repoRoot, "shared", "contracts")
const eventsRoot = join(contractsRoot, "events")
const databaseRoot = join(repoRoot, "backend", "database")

const schemaFiles = {
  envelope: join(eventsRoot, "event-envelope.schema.json"),
  replayCursor: join(eventsRoot, "replay-cursor.schema.json"),
  replayEvent: join(eventsRoot, "replay-event.schema.json"),
  replayRequest: join(eventsRoot, "replay-request.schema.json"),
  replayResponse: join(eventsRoot, "replay-response.schema.json"),
  realtimeStream: join(eventsRoot, "realtime-stream.schema.json"),
}

function read(path) {
  return readFileSync(path, "utf8")
}

function readJson(path) {
  return JSON.parse(read(path))
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

test("event and replay contract foundation files exist", () => {
  assert.equal(existsSync(join(eventsRoot, "README.md")), true)

  for (const path of Object.values(schemaFiles)) {
    assert.equal(existsSync(path), true, `${path} missing`)
  }
})

test("event envelope schema requires replay-critical fields", () => {
  const schema = readJson(schemaFiles.envelope)

  assert.equal(schema.title, "EventEnvelope")
  assert.match(schema.$id, /event-envelope\.v1\.schema\.json$/)
  for (const field of [
    "event_id",
    "institution_id",
    "stream_type",
    "stream_id",
    "sequence",
    "event_type",
    "schema_version",
    "payload_classification",
    "replayable",
    "payload",
    "created_at",
  ]) {
    assert.equal(schema.required.includes(field), true, `${field} must be required`)
  }

  assert.equal(schema.properties.sequence.minimum, 1)
  assert.deepEqual(schema.properties.payload_classification.enum, [
    "public",
    "student_safe",
    "faculty_only",
    "safety_restricted",
    "internal",
    "audit_only",
  ])
  assert.equal(schema.properties.payload.type, "object")
})

test("replay request schema is session-based and defaults non-replayable inclusion to false", () => {
  const schema = readJson(schemaFiles.replayRequest)

  assert.equal(schema.title, "ReplayRequest")
  assert.match(schema.$id, /replay-request\.v1\.schema\.json$/)
  for (const field of ["session_id", "after_sequence", "limit", "audience"]) {
    assert.equal(schema.required.includes(field), true, `${field} must be required`)
  }

  assert.equal(schema.properties.stream_type.const, "simulation_session")
  assert.equal(schema.properties.after_sequence.minimum, 0)
  assert.equal(schema.properties.limit.maximum, 500)
  assert.equal(schema.properties.include_non_replayable.default, false)
  assert.equal(schema.properties.audience.enum.includes("student"), true)
  assert.equal(schema.properties.audience.enum.includes("faculty"), true)
  assert.equal(schema.properties.audience.enum.includes("system"), true)
})

test("replay response schema includes redaction, cursor, gap, duplicate, and snapshot fallback fields", () => {
  const schema = readJson(schemaFiles.replayResponse)

  assert.equal(schema.title, "ReplayResponse")
  assert.match(schema.$id, /replay-response\.v1\.schema\.json$/)
  for (const field of [
    "schema_version",
    "session_id",
    "audience",
    "from_sequence_exclusive",
    "to_sequence_inclusive",
    "has_more",
    "events",
    "gap_detected",
    "duplicate_count",
    "next_cursor",
    "redaction_applied",
    "snapshot_required",
  ]) {
    assert.equal(schema.required.includes(field), true, `${field} must be required`)
  }

  assert.equal(schema.properties.events.items.$ref, "replay-event.schema.json")
  assert.equal(schema.properties.next_cursor.$ref, "replay-cursor.schema.json")
  assert.equal(schema.properties.redaction_applied.type, "boolean")
  assert.equal(schema.properties.snapshot_required.type, "boolean")
})

test("replay event, cursor, and realtime stream schemas enforce Step 15 replay safety", () => {
  const replayEvent = readJson(schemaFiles.replayEvent)
  const replayCursor = readJson(schemaFiles.replayCursor)
  const realtimeStream = readJson(schemaFiles.realtimeStream)

  assert.equal(replayEvent.title, "ReplayEvent")
  assert.equal(replayEvent.required.includes("payload_classification"), true)
  assert.equal(replayEvent.required.includes("redaction_applied"), true)
  assert.equal(replayEvent.properties.sequence.minimum, 1)
  assert.equal(replayCursor.title, "ReplayCursor")
  assert.equal(replayCursor.properties.after_sequence.minimum, 0)
  assert.equal(realtimeStream.title, "RealtimeStreamFrame")
  assert.equal(realtimeStream.properties.delivery_only.const, true)
})

test("contract governance and inventory describe event foundation limits", () => {
  const governance = read(join(contractsRoot, "CONTRACT_GOVERNANCE.md"))
  const inventory = read(join(contractsRoot, "CONTRACT_INVENTORY.md"))
  const eventsReadme = read(join(eventsRoot, "README.md"))

  assert.match(governance, /Step 7 authorizes event\/replay contract foundations only/i)
  assert.match(governance, /Step 15 authorizes backend-filtered replay/i)
  assert.match(governance, /Event payloads are generic JSON objects and are not clinical DTOs/i)
  assert.match(governance, /Replay is a backend-filtered operation that reads PostgreSQL `event_log`/i)
  assert.match(inventory, /health-plus-event-replay-plus-step-8b-simulation-runtime/i)
  assert.match(inventory, /\/api\/v1\/simulation-sessions\/\{sessionId\}\/replay/i)
  assert.match(inventory, /RealtimeStreamFrame/i)
  assert.match(inventory, /Payload is a generic object only/i)
  assert.match(eventsReadme, /do not define clinical event payload DTOs/i)
  assert.match(eventsReadme, /Student replay must not bypass fact-ledger visibility/i)
  assert.match(eventsReadme, /SSE in Step 15 is delivery-only/i)
})

test("event contract files do not add runtime integrations or product DTO payloads", () => {
  const eventFiles = listFiles(eventsRoot).filter((filePath) => [".json", ".md"].includes(extname(filePath)))
  const combinedSource = eventFiles.map((filePath) => read(filePath)).join("\n")

  assert.doesNotMatch(
    combinedSource,
    /CaseDto|SimulationSessionDto|ClinicalActionDto|ConversationMessageDto|TimelineEventDto|SafetyWarningDto|AgentRunDto|DebriefReportDto|FacultyReviewDto|EventLogDto|OutboxEventDto/i,
  )
  assert.doesNotMatch(combinedSource, /\/api\/v[0-9]+\/(?:agents|debriefs|faculty)\b/i)
  assert.doesNotMatch(
    combinedSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
  assert.doesNotMatch(combinedSource, /new\s+(?:PrismaClient|WebSocket|EventSource|OpenAI)\b/i)
})

test("Step 7/8B did not add Prisma schema, compose file, blocked API route, or worker runtime files", () => {
  const repoFiles = listFiles(repoRoot, 0, 6)
  const apiFiles = listFiles(join(repoRoot, "backend", "api"))
  const databaseFiles = listFiles(databaseRoot)

  assert.deepEqual(repoFiles.filter((filePath) => basename(filePath) === "schema.prisma"), [])
  assertNoForbiddenDockerComposeFile(repoFiles, repoRoot)

  const apiSource = apiFiles
    .filter((filePath) => [".ts", ".mjs"].includes(extname(filePath)))
    .map((filePath) => read(filePath))
    .join("\n")
  assert.doesNotMatch(apiSource, /@(?:Controller|Get|Post|Put|Patch|Delete)\(["']\/?(?:cases|agents|debriefs|faculty)/i)
  assert.match(apiSource, /@Get\(":sessionId\/replay"\)/)

  const databaseRuntimeSource = databaseFiles
    .filter((filePath) => [".sql", ".mjs"].includes(extname(filePath)))
    .map((filePath) => read(filePath))
    .join("\n")
  assert.doesNotMatch(
    databaseRuntimeSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
})
