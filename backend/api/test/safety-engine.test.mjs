import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const apiRoot = join(repoRoot, "backend", "api")
const safetyRoot = join(apiRoot, "src", "safety")

function read(relativePath) {
  return readFileSync(join(apiRoot, relativePath), "utf8")
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(filePath) : [filePath]
  })
}

test("deterministic safety module files exist without adding safety controller routes", () => {
  for (const relativePath of [
    "src/safety/safety.module.ts",
    "src/safety/safety.service.ts",
    "src/safety/safety.repository.ts",
    "src/safety/safety-rules.ts",
    "src/safety/safety.dto.ts",
    "src/safety/safety.errors.ts",
  ]) {
    assert.equal(existsSync(join(apiRoot, relativePath)), true, `${relativePath} missing`)
  }

  const safetySource = listFiles(safetyRoot)
    .filter((filePath) => [".ts", ".js", ".mjs"].includes(extname(filePath)))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n")

  assert.doesNotMatch(safetySource, /@Controller|@Get|@Post|@Put|@Patch|@Delete/i)
})

test("safety rules cover required deterministic pre-action blocks", () => {
  const rules = read("src/safety/safety-rules.ts")

  for (const required of [
    "prompt_injection.ignore_previous_instructions",
    "hidden_fact.reveal_hidden_diagnosis",
    "system_prompt.show_system_prompt",
    "faculty_notes.faculty_only_material",
    "role_escalation.admin_or_faculty",
    "hidden_fact.restricted_safety_or_evaluator_context",
    "unsupported.diagnosis_certainty",
    "unsupported.treatment_plan",
    "unsupported.medication_recommendation",
    "unsupported.imaging_interpretation",
    "unsupported.debrief_generation",
    "risky_action.order_attempt",
    "risky_action.diagnosis_attempt",
    "risky_action.treatment_attempt",
  ]) {
    assert.match(rules, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${required} missing`)
  }

  assert.match(rules, /action: "block"/)
  assert.match(rules, /action: "block_unsupported"/)
  assert.match(rules, /requires_fact_reference: true/)
})

test("safety service is deterministic and exposes pre/post evaluation methods", () => {
  const service = read("src/safety/safety.service.ts")

  assert.match(service, /evaluatePreAction\(input: PreActionSafetyInput\)/)
  assert.match(service, /evaluatePostResponse\(input: PostResponseSafetyInput\)/)
  assert.match(service, /chooseDecision/)
  assert.match(service, /responseRequiresFactReference/)
  assert.doesNotMatch(service, /OpenAI|chat\.completions|responses\.create|fetch\(|axios|redis|ioredis|Temporal|WebSocket|EventSource/i)
})

test("safety repository persists evaluations and findings in the caller transaction", () => {
  const repository = read("src/safety/safety.repository.ts")

  assert.match(repository, /persistEvaluation\(\s*client: TransactionClient/)
  assert.match(repository, /INSERT INTO safety_evaluations/)
  assert.match(repository, /INSERT INTO safety_findings/)
  assert.match(repository, /WHERE rule_key = \$3/)
  assert.match(repository, /AND \(institution_id = \$1 OR institution_id IS NULL\)/)
  assert.match(repository, /input_text_excerpt/)
  assert.match(repository, /output_text_excerpt/)
  assert.doesNotMatch(repository, /DatabaseService|withTransaction|new Pool|OpenAI|redis|Temporal|WebSocket/i)
})

test("mock simulation submit-action flow gates before reveal logic and records safety events", () => {
  const repository = read("src/simulation/simulation.repository.ts")
  const module = read("src/simulation/simulation.module.ts")
  const dto = read("src/simulation/simulation.dto.ts")

  assert.match(module, /imports: \[DatabaseModule, SafetyModule\]/)
  assert.match(repository, /private readonly safetyService: SafetyService/)
  assert.match(repository, /private readonly safetyRepository: SafetyRepository/)
  assert.match(repository, /evaluatePreAction[\s\S]*persistEvaluation[\s\S]*if \(isBlockingSafetyDecision\(preActionSafety\)\)[\s\S]*safety\.action\.blocked[\s\S]*loadAllowedFacts/)
  assert.match(repository, /evaluatePostResponse[\s\S]*persistEvaluation[\s\S]*if \(isBlockingSafetyDecision\(postResponseSafety\)\)[\s\S]*safety\.response\.blocked[\s\S]*mockResponse\.newly_revealed_fact/)
  assert.match(repository, /safety\.warning\.created/)
  assert.match(repository, /INSERT INTO event_log/)
  assert.match(repository, /INSERT INTO outbox_events/)
  for (const eventType of ["safety.action.blocked", "safety.response.blocked", "safety.warning.created"]) {
    assert.match(dto, new RegExp(`"${eventType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i"), `${eventType} missing from TimelineEventType`)
  }
})

test("safety source adds no forbidden live-agent, realtime, frontend, or product workflow code", () => {
  const sourceFiles = [
    ...listFiles(safetyRoot),
    join(apiRoot, "src", "simulation", "simulation.repository.ts"),
    join(apiRoot, "src", "simulation", "simulation.module.ts"),
  ].filter((filePath) => [".ts", ".js", ".mjs"].includes(extname(filePath)))
  const combinedSource = sourceFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n")

  assert.doesNotMatch(
    combinedSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
  assert.doesNotMatch(combinedSource, /new\s+(?:PrismaClient|WebSocket|EventSource|OpenAI)\b/i)
  assert.doesNotMatch(combinedSource, /frontend\/|localStorage|hiddenDiagnosis|mockCases|mockPatients|next\//i)
  assert.doesNotMatch(combinedSource, /INSERT INTO (?:orders|imaging_results|debrief_reports|faculty_reviews|agent_runs|model_runs|tool_calls)\b/i)
})
