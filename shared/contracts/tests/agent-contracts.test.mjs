import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const contractsRoot = join(repoRoot, "shared", "contracts")
const agentsRoot = join(contractsRoot, "agents")
const schemaFiles = {
  request: join(agentsRoot, "agent-run-request.schema.json"),
  response: join(agentsRoot, "agent-run-response.schema.json"),
  context: join(agentsRoot, "agent-context.schema.json"),
  trace: join(agentsRoot, "agent-trace.schema.json"),
  error: join(agentsRoot, "agent-error.schema.json"),
}

function read(path) {
  return readFileSync(path, "utf8")
}

function readJson(path) {
  return JSON.parse(read(path))
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(filePath) : [filePath]
  })
}

test("agent contract foundation files exist", () => {
  assert.equal(existsSync(join(agentsRoot, "README.md")), true)
  for (const path of Object.values(schemaFiles)) {
    assert.equal(existsSync(path), true, `${path} missing`)
  }
})

test("agent run request schema is mock-only and requires core fields", () => {
  const schema = readJson(schemaFiles.request)

  assert.equal(schema.title, "AgentRunRequest")
  for (const field of ["contract_version", "agent_name", "mode", "context"]) {
    assert.equal(schema.required.includes(field), true, `${field} must be required`)
  }
  assert.equal(schema.properties.mode.const, "mock")
  assert.equal(schema.properties.agent_name.enum.includes("mock_persona"), true)
  assert.equal(schema.properties.agent_name.enum.includes("mock_evaluator"), true)
})

test("agent response schema requires structured output boundaries", () => {
  const schema = readJson(schemaFiles.response)

  assert.equal(schema.title, "AgentRunResponse")
  for (const field of ["agent_name", "agent_role", "mode", "status", "used_fact_ids", "safety_flags", "trace", "errors"]) {
    assert.equal(schema.required.includes(field), true, `${field} must be required`)
  }
  assert.equal(schema.properties.mode.const, "mock")
  assert.equal(schema.properties.trace.$ref, "agent-trace.schema.json")
})

test("agent context schema excludes hidden visibility and forbidden fields", () => {
  const source = read(schemaFiles.context)
  const schema = JSON.parse(source)

  assert.equal(schema.title, "AgentContext")
  assert.deepEqual(schema.properties.allowed_fact_summaries.items.properties.visibility.enum, [
    "baseline_visible",
    "revealed",
    "student_safe",
  ])
  for (const forbidden of [
    "hidden_until_revealed",
    "faculty_only",
    "safety_only",
    "evaluator_only",
    "raw_fact_content",
    "faculty_only_notes",
    "hidden_diagnosis",
    "system_prompt",
    "internal_prompt",
    "tool_secret",
    "api_key",
    "provider_secret",
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden, "i"), `${forbidden} must not appear in AgentContext`)
  }
})

test("agent trace schema is redacted by default", () => {
  const schema = readJson(schemaFiles.trace)

  assert.equal(schema.title, "AgentTrace")
  assert.equal(schema.properties.redaction_applied.const, true)
  assert.equal(schema.properties.redaction_applied.default, true)
  assert.equal(schema.properties.mode.const, "mock")
})

test("agent contract files contain no OpenAI/provider/key/tool/debrief/faculty schemas", () => {
  const combinedSource = listFiles(agentsRoot)
    .filter((filePath) => extname(filePath) === ".json")
    .map((filePath) => read(filePath))
    .join("\n")

  assert.doesNotMatch(combinedSource, /OpenAI|api_key|provider_secret|tool_secret|model_provider|model_route/i)
  assert.doesNotMatch(combinedSource, /tool_call|handoff|debrief|faculty_review|treatment_plan|imaging_interpretation/i)
  assert.doesNotMatch(combinedSource, /raw_fact_content|hidden_diagnosis|faculty_only_notes|system_prompt|internal_prompt/i)
})

test("governance and inventory mark agent contracts as mock-only", () => {
  const governance = read(join(contractsRoot, "CONTRACT_GOVERNANCE.md"))
  const inventory = read(join(contractsRoot, "CONTRACT_INVENTORY.md"))

  assert.match(governance, /Step 11 authorizes mock-agent contract foundations only/i)
  assert.match(governance, /Live provider integration remains blocked until Step 12 gates pass/i)
  assert.match(inventory, /step-11-mock-agent-contracts/i)
  assert.match(inventory, /Step 11 adds mock-agent schemas only; live agents and tool execution remain blocked/i)
})
