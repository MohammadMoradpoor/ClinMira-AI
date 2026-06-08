import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { basename, extname, join } from "node:path"
import { test } from "node:test"

const contractsRoot = join(import.meta.dirname, "..")
const simulationRoot = join(contractsRoot, "simulation")

const expectedSchemas = {
  "create-simulation-session-request.schema.json": {
    title: "CreateSimulationSessionRequestDto",
    version: "create-simulation-session-request.v1",
  },
  "simulation-session.schema.json": {
    title: "SimulationSessionDto",
    version: "simulation-session.v1",
  },
  "submit-simulation-action-request.schema.json": {
    title: "SubmitSimulationActionRequestDto",
    version: "submit-simulation-action-request.v1",
  },
  "simulation-turn-result.schema.json": {
    title: "SimulationTurnResultDto",
    version: "simulation-turn-result.v1",
  },
  "clinical-action.schema.json": {
    title: "ClinicalActionDto",
    version: "clinical-action.v1",
  },
  "conversation-message.schema.json": {
    title: "ConversationMessageDto",
    version: "conversation-message.v1",
  },
  "timeline-event.schema.json": {
    title: "TimelineEventDto",
    version: "timeline-event.v1",
  },
  "session-state-snapshot.schema.json": {
    title: "SessionStateSnapshotDto",
    version: "session-state-snapshot.v1",
  },
  "revealed-fact-reference.schema.json": {
    title: "RevealedFactReferenceDto",
    version: "revealed-fact-reference.v1",
  },
}

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

test("simulation foundation contract files exist with only approved DTO names", () => {
  assert.equal(existsSync(join(simulationRoot, "README.md")), true)

  const actualSchemaFiles = listFiles(simulationRoot)
    .filter((filePath) => extname(filePath) === ".json")
    .map((filePath) => basename(filePath))
    .sort()

  assert.deepEqual(actualSchemaFiles, Object.keys(expectedSchemas).sort())
})

test("simulation schemas use canonical DTO titles and version constants", () => {
  for (const [fileName, expected] of Object.entries(expectedSchemas)) {
    const schema = readJson(`simulation/${fileName}`)

    assert.equal(schema.title, expected.title)
    assert.match(schema.$id, new RegExp(`${expected.version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.schema\\.json$`))
    assert.equal(schema.properties.contract_version.const, expected.version)
    assert.equal(schema.additionalProperties, false)
  }
})

test("simulation request and action schemas match approved mock action boundaries", () => {
  const submit = readJson("simulation/submit-simulation-action-request.schema.json")
  const action = readJson("simulation/clinical-action.schema.json")

  const expectedActionTypes = [
    "ask_question",
    "empathy",
    "history_question",
    "exam_observation",
    "order_attempt",
    "diagnosis_attempt",
    "treatment_attempt",
  ]

  assert.deepEqual(submit.properties.action_type.enum, expectedActionTypes)
  assert.deepEqual(action.properties.action_type.enum, expectedActionTypes)
  assert.deepEqual(action.properties.status.enum, ["received", "accepted", "responded", "blocked_unsupported", "failed"])
  assert.equal(submit.required.includes("idempotency_key"), false)
  assert.equal(submit.properties.idempotency_key.minLength, 8)
  assert.equal(submit.properties.text.type, "string")
})

test("revealed fact contract is reference-only and never includes hidden fact payload fields", () => {
  const schemaText = readText("simulation/revealed-fact-reference.schema.json")
  const schema = JSON.parse(schemaText)

  assert.deepEqual(schema.properties.revealed_to.enum, [
    "student_payload",
    "mock_patient_context",
    "safety_context",
    "evaluator_context",
  ])
  for (const forbidden of [
    "content",
    "fact_content",
    "hidden_content",
    "student_safe_summary",
    "faculty_notes",
    "faculty_summary",
    "diagnosis",
    "treatment_plan",
    "system_prompt",
    "prompt_injection",
  ]) {
    assert.doesNotMatch(schemaText, new RegExp(`\\b${forbidden}\\b`, "i"), `${forbidden} must not be in reveal refs`)
  }
})

test("conversation and turn result schemas cite fact ids without adding debrief, score, faculty, agent, or imaging contracts", () => {
  const message = readJson("simulation/conversation-message.schema.json")
  const turn = readJson("simulation/simulation-turn-result.schema.json")
  const combinedSource = listFiles(simulationRoot)
    .filter((filePath) => [".json", ".md"].includes(extname(filePath)))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n")

  assert.equal(message.properties.used_fact_ids.items.format, "uuid")
  assert.equal(turn.properties.revealed_facts.items.$ref, "revealed-fact-reference.schema.json")
  assert.doesNotMatch(
    combinedSource,
    /OrderDto|ImagingResultDto|SafetyWarningDto|DebriefReportDto|FacultyReviewDto|ScoreDto|RubricDto|EvaluatorOutputDto|AgentRunDto|ModelRunDto|ToolCallDto/i,
  )
})

test("simulation contracts keep only approved Step 8B OpenAPI routes", () => {
  const governance = readText("CONTRACT_GOVERNANCE.md")
  const inventory = readText("CONTRACT_INVENTORY.md")
  const readme = readText("simulation/README.md")
  const openapi = readJson("openapi/clinmira-api.v1.json")
  const paths = Object.keys(openapi.paths).sort()

  assert.match(governance, /Step 8B activates only the approved mock simulation API routes/i)
  assert.match(inventory, /SimulationSessionDto/)
  assert.match(inventory, /Step 8B mock simulation API routes remain active/i)
  assert.match(readme, /Only these OpenAPI routes are active in Step 8B/i)
  assert.deepEqual(paths, [
    "/api/v1/health",
    "/api/v1/simulation-sessions",
    "/api/v1/simulation-sessions/{id}",
    "/api/v1/simulation-sessions/{id}/actions",
    "/health",
  ])
  assert.equal(openapi.paths["/api/v1/simulation-sessions"].post.operationId, "createSimulationSession")
  assert.equal(openapi.paths["/api/v1/simulation-sessions/{id}"].get.operationId, "getSimulationSession")
  assert.equal(openapi.paths["/api/v1/simulation-sessions/{id}/actions"].post.operationId, "submitSimulationAction")
  assert.doesNotMatch(JSON.stringify(openapi.paths), /\/api\/v[0-9]+\/(?:events|replay|agents|debriefs|faculty|orders|imaging|scores)\b/i)
})

test("simulation contract files do not import runtime integrations or frontend mock sources", () => {
  const combinedSource = listFiles(simulationRoot)
    .filter((filePath) => [".json", ".md"].includes(extname(filePath)))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n")

  assert.doesNotMatch(
    combinedSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
  assert.doesNotMatch(combinedSource, /new\s+(?:PrismaClient|WebSocket|EventSource|OpenAI)\b/i)
  assert.doesNotMatch(combinedSource, /frontend\/|localStorage|hiddenDiagnosis|mockCases|mockPatients/i)
})
