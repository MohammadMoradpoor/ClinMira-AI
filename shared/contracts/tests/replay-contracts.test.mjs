import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const contractsRoot = join(import.meta.dirname, "..")

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(contractsRoot, relativePath), "utf8"))
}

function readText(relativePath) {
  return readFileSync(join(contractsRoot, relativePath), "utf8")
}

test("Step 15 replay response contract matches backend replay DTO shape", () => {
  const response = readJson("events/replay-response.schema.json")

  assert.equal(response.properties.schema_version.const, "clinmira.replay.v1")
  for (const required of [
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
    assert.equal(response.required.includes(required), true, `${required} missing from replay response`)
  }
})

test("Step 15 replay event contract requires classification and event-level redaction", () => {
  const event = readJson("events/replay-event.schema.json")

  assert.equal(event.title, "ReplayEvent")
  assert.equal(event.properties.sequence.minimum, 1)
  assert.equal(event.properties.payload.type, "object")
  assert.deepEqual(event.properties.payload_classification.enum, [
    "public",
    "student_safe",
    "faculty_only",
    "safety_restricted",
    "internal",
    "audit_only",
  ])
  assert.equal(event.required.includes("redaction_applied"), true)
})

test("Step 15 realtime stream contract is delivery-only and cannot be source of truth", () => {
  const stream = readJson("events/realtime-stream.schema.json")
  const readme = readText("events/README.md")
  const governance = readText("CONTRACT_GOVERNANCE.md")

  assert.equal(stream.title, "RealtimeStreamFrame")
  assert.equal(stream.properties.delivery_only.const, true)
  assert.deepEqual(stream.properties.frame_type.enum, ["replay_event", "replay_complete"])
  assert.match(readme, /SSE in Step 15 is delivery-only and starts with replay from PostgreSQL/i)
  assert.match(governance, /must not create domain truth/i)
  assert.match(governance, /must not read frontend state, Redis state, providers, agents, or model memory/i)
})

test("Step 15 replay contracts forbid hidden fact and provider payload fields by omission", () => {
  const combined = [
    readText("events/replay-event.schema.json"),
    readText("events/replay-response.schema.json"),
    readText("events/realtime-stream.schema.json"),
  ].join("\n")

  assert.doesNotMatch(
    combined,
    /hidden_diagnosis|raw_fact_content|faculty_only_notes|system_prompt|internal_prompt|api_key|provider_secret|tool_secret/i,
  )
  assert.doesNotMatch(combined, /OpenAI|Redis|WebSocket|Temporal|debrief|treatment|imaging/i)
})
