import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const contractsRoot = join(import.meta.dirname, "..")
const eventsRoot = join(contractsRoot, "events")

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(contractsRoot, relativePath), "utf8"))
}

function readText(relativePath) {
  return readFileSync(join(contractsRoot, relativePath), "utf8")
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(filePath) : [filePath]
  })
}

test("event replay foundation contract files exist", () => {
  for (const relativePath of [
    "events/README.md",
    "events/event-envelope.schema.json",
    "events/replay-cursor.schema.json",
    "events/replay-event.schema.json",
    "events/replay-request.schema.json",
    "events/replay-response.schema.json",
    "events/realtime-stream.schema.json",
  ]) {
    assert.equal(existsSync(join(contractsRoot, relativePath)), true, `${relativePath} missing`)
  }
})

test("event envelope schema is envelope-level and replay-safe", () => {
  const schema = readJson("events/event-envelope.schema.json")

  assert.equal(schema.title, "EventEnvelope")
  assert.match(schema.$id, /event-envelope\.v1\.schema\.json$/)
  for (const field of ["sequence", "schema_version", "event_type", "payload_classification", "replayable", "payload"]) {
    assert.equal(schema.required.includes(field), true, `${field} must be required`)
  }
  assert.deepEqual(schema.properties.payload_classification.enum, [
    "public",
    "student_safe",
    "faculty_only",
    "safety_restricted",
    "internal",
    "audit_only",
  ])
})

test("replay request and response schemas include cursor, redaction, gap, and duplicate controls", () => {
  const request = readJson("events/replay-request.schema.json")
  const response = readJson("events/replay-response.schema.json")

  assert.equal(request.title, "ReplayRequest")
  assert.equal(response.title, "ReplayResponse")
  assert.equal(request.properties.include_non_replayable.default, false)
  assert.equal(request.properties.audience.enum.includes("student"), true)
  assert.equal(request.properties.audience.enum.includes("faculty"), true)
  assert.equal(request.properties.audience.enum.includes("system"), true)
  assert.equal(request.properties.stream_type.const, "simulation_session")
  assert.equal(response.required.includes("redaction_applied"), true)
  assert.equal(response.required.includes("snapshot_required"), true)
  assert.equal(response.required.includes("gap_detected"), true)
  assert.equal(response.required.includes("duplicate_count"), true)
  assert.equal(response.required.includes("next_cursor"), true)
  assert.equal(response.properties.events.items.$ref, "replay-event.schema.json")
  assert.equal(response.properties.next_cursor.$ref, "replay-cursor.schema.json")
})

test("replay event, cursor, and realtime stream contracts are backend-filtered and delivery-only", () => {
  const replayEvent = readJson("events/replay-event.schema.json")
  const replayCursor = readJson("events/replay-cursor.schema.json")
  const realtimeStream = readJson("events/realtime-stream.schema.json")

  assert.equal(replayEvent.title, "ReplayEvent")
  assert.equal(replayEvent.required.includes("payload_classification"), true)
  assert.equal(replayEvent.required.includes("redaction_applied"), true)
  assert.equal(replayEvent.properties.payload_classification.enum.includes("student_safe"), true)
  assert.equal(replayEvent.properties.payload_classification.enum.includes("faculty_only"), true)
  assert.equal(replayCursor.title, "ReplayCursor")
  assert.equal(replayCursor.properties.after_sequence.minimum, 0)
  assert.equal(realtimeStream.title, "RealtimeStreamFrame")
  assert.equal(realtimeStream.properties.delivery_only.const, true)
  assert.deepEqual(realtimeStream.properties.frame_type.enum, ["replay_event", "replay_complete"])
})

test("event governance documents mark replay active and frontend/live integrations blocked", () => {
  const governance = readText("CONTRACT_GOVERNANCE.md")
  const inventory = readText("CONTRACT_INVENTORY.md")
  const readme = readText("events/README.md")

  assert.match(governance, /Step 7 authorizes event\/replay contract foundations only/i)
  assert.match(governance, /Step 15 authorizes backend-filtered replay/i)
  assert.match(governance, /delivery-only SSE stream contracts/i)
  assert.match(inventory, /EventEnvelope/)
  assert.match(inventory, /ReplayRequest/)
  assert.match(inventory, /ReplayEvent/)
  assert.match(inventory, /ReplayCursor/)
  assert.match(inventory, /ReplayResponse/)
  assert.match(inventory, /RealtimeStreamFrame/)
  assert.match(inventory, /\/api\/v1\/simulation-sessions\/\{sessionId\}\/replay/i)
  assert.match(readme, /PostgreSQL `event_log` remains the authoritative replay source/i)
  assert.match(readme, /SSE in Step 15 is delivery-only/i)
})

test("event contract machine-readable files do not add product DTOs or runtime integrations", () => {
  const machineReadableFiles = listFiles(eventsRoot).filter((filePath) => [".json"].includes(extname(filePath)))
  const combinedSource = machineReadableFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n")

  assert.doesNotMatch(
    combinedSource,
    /CaseDto|SimulationSessionDto|ClinicalActionDto|ConversationMessageDto|TimelineEventDto|SafetyWarningDto|AgentRunDto|DebriefReportDto|FacultyReviewDto|EventLogDto|OutboxEventDto/i,
  )
  assert.doesNotMatch(
    combinedSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
  assert.doesNotMatch(combinedSource, /\/api\/v[0-9]+\/(?:agents|debriefs|faculty)\b/i)
  assert.match(combinedSource, /delivery_only/i)
})
