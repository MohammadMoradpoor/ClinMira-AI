import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

import { runInitialEval, loadEvalContext } from "../lib/eval-runner.mjs"
import {
  assertNoForbiddenRuntimeIntegrations,
  assertNoFrontendMockSourceUsage,
  assertNoLiveModelUsage,
} from "../lib/eval-assertions.mjs"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const evalRoot = join(repoRoot, "backend", "evals")

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(evalRoot, relativePath), "utf8"))
}

test("eval suite metadata exists and is valid", () => {
  const suite = readJson("eval-suite.json")

  assert.equal(suite.suite_id, "clinmira-initial-eval-harness")
  assert.equal(suite.suite_version, "eval.v1")
  assert.equal(suite.created_for_step, "Step 9")
  assert.equal(suite.target_system, "mock-simulation-runtime")
  assert.equal(suite.requires_live_model, false)
  assert.equal(suite.requires_openai, false)
  assert.equal(suite.release_blocking, true)
  assert.equal(suite.output_schema_version, "clinmira-eval-result.v1")
  assert.equal(suite.fixture_files.length, 5)
})

test("thresholds exist and critical thresholds are zero", () => {
  const thresholds = readJson("thresholds.json")

  for (const [metric, threshold] of Object.entries(thresholds.critical_thresholds)) {
    assert.equal(threshold, 0, `${metric} must be release-blocking zero`)
  }

  assert.equal(thresholds.rate_thresholds.golden_case_pass_rate_min, 1)
  assert.equal(thresholds.rate_thresholds.fixture_schema_valid_rate_min, 1)
  assert.equal(thresholds.rate_thresholds.student_safe_payload_rate_min, 1)
  assert.equal(thresholds.rate_thresholds.fact_reference_required_rate_min, 1)
  assert.equal(thresholds.critical_thresholds.safety_block_missing_count, 0)
  assert.equal(thresholds.critical_thresholds.unsafe_action_accepted_count, 0)
  assert.equal(thresholds.critical_thresholds.safety_finding_missing_count, 0)
})

test("all fixture files exist and are synthetic-only", () => {
  const { suite, fixtures } = loadEvalContext()

  for (const relativePath of suite.fixture_files) {
    assert.equal(existsSync(join(evalRoot, relativePath)), true, `${relativePath} missing`)
    assert.equal(fixtures[relativePath].synthetic_only, true, `${relativePath} must be synthetic-only`)
    assert.equal(Array.isArray(fixtures[relativePath].cases), true, `${relativePath} must define cases`)
    assert.equal(fixtures[relativePath].cases.length > 0, true, `${relativePath} must not be empty`)
  }
})

test("fixtures do not import or reference frontend mock files", () => {
  const { fixtures } = loadEvalContext()
  const combinedFixtures = JSON.stringify(fixtures)

  assert.doesNotMatch(combinedFixtures, /frontend\/lib\/mock-data|frontend\/lib\/simulation-engine|frontend\/types/i)
  assert.doesNotMatch(combinedFixtures, /localStorage|mockCases|mockPatients/i)
})

test("eval runner produces pass/fail/skip summary and blocks live-agent gate", () => {
  const result = runInitialEval({ writeResult: true })

  assert.equal(result.schema_version, "clinmira-eval-result.v1")
  assert.equal(result.status, "PASSED")
  assert.equal(result.summary.failed, 0)
  assert.equal(result.threshold_failures.length, 0)
  assert.equal(result.metrics.safety_block_required_count > 0, true)
  assert.equal(result.metrics.safety_block_missing_count, 0)
  assert.equal(result.metrics.unsafe_action_accepted_count, 0)
  assert.equal(result.metrics.safety_finding_missing_count, 0)
  assert.match(result.live_agent_gate_status, /^blocked_/)
  assert.equal(existsSync(join(evalRoot, "results", "latest.json")), true)

  if (!process.env.CLINMIRA_TEST_DATABASE_URL) {
    assert.equal(result.integration_db_evals.status, "skipped")
  }
})

test("eval harness source has no forbidden runtime integrations or scope creep", () => {
  const sourceFiles = listFiles(evalRoot).filter(
    (filePath) =>
      [".mjs", ".json", ".md"].includes(extname(filePath)) &&
      !filePath.includes(`${join("backend", "evals", "tests")}`) &&
      !filePath.endsWith(join("lib", "eval-assertions.mjs")),
  )
  const combinedSource = sourceFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n")

  assert.equal(assertNoLiveModelUsage(combinedSource).passed, true)
  assert.equal(assertNoForbiddenRuntimeIntegrations(combinedSource).passed, true)
  assert.equal(assertNoFrontendMockSourceUsage(combinedSource).passed, true)
  assert.doesNotMatch(combinedSource, /backend\/agent-worker|agent-worker\/|docker-compose|PrismaClient|WebSocketGateway/i)
})
