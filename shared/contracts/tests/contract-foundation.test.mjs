import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const contractsRoot = join(import.meta.dirname, "..")

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

function extractStringConst(source, name) {
  const match = source.match(new RegExp(`(?:export\\s+)?(?:const\\s+)?${name}\\s*=\\s*"([^"]+)"`))
  assert.ok(match, `Missing string constant ${name}`)
  return match[1]
}

test("OpenAPI exposes only health and approved Step 8B simulation routes", () => {
  const openapi = readJson("openapi/clinmira-api.v1.json")
  const paths = Object.keys(openapi.paths)

  assert.equal(openapi.openapi, "3.1.0")
  assert.equal(openapi["x-clinmira-contract-version"], "openapi.clinmira-api.v1")
  assert.deepEqual(paths.sort(), [
    "/api/v1/health",
    "/api/v1/simulation-sessions",
    "/api/v1/simulation-sessions/{id}",
    "/api/v1/simulation-sessions/{id}/actions",
    "/health",
  ])

  for (const path of paths) {
    assert.doesNotMatch(path, /\/api\/v[0-9]+\/(?:cases|agents|faculty|debrief|events|replay|orders|imaging|scores)/i)
  }
})

test("TypeScript contracts expose canonical DTO names only", () => {
  const healthSource = readText("src/health-response.ts")
  const featureFlagsSource = readText("src/feature-flags.ts")
  const indexSource = readText("src/index.ts")

  assert.match(healthSource, /export interface HealthCheckResponseDto\b/)
  assert.match(healthSource, /export function buildHealthCheckResponseDto\b/)
  assert.match(featureFlagsSource, /export interface FeatureFlagSnapshotDto\b/)
  assert.match(featureFlagsSource, /export function buildFeatureFlagSnapshotDto\b/)
  assert.match(featureFlagsSource, /export const disabledSkeletonFeatureFlagSnapshotDto\b/)
  assert.match(indexSource, /export \* from "\.\/health-response"/)
  assert.match(indexSource, /export \* from "\.\/feature-flags"/)
  assert.match(indexSource, /export \* from "\.\/schema-versions"/)

  assert.doesNotMatch(healthSource, /interface\s+HealthResponse\b/)
  assert.doesNotMatch(healthSource, /buildHealthResponse\b/)
  assert.doesNotMatch(featureFlagsSource, /interface\s+FeatureFlagSnapshot\b/)
  assert.doesNotMatch(featureFlagsSource, /disabledSkeletonFeatureFlags\b/)
})

test("OpenAPI, JSON Schema, TypeScript, and Python versions align", () => {
  const openapi = readJson("openapi/clinmira-api.v1.json")
  const healthSchema = readJson("schemas/health-response.schema.json")
  const featureFlagSchema = readJson("schemas/feature-flags.schema.json")
  const tsVersions = readText("src/schema-versions.ts")
  const pythonVersions = readText("python/clinmira_contracts/versions.py")
  const apiVersion = extractStringConst(tsVersions, "API_CONTRACT_VERSION")
  const healthVersion = extractStringConst(tsVersions, "HEALTH_CONTRACT_VERSION")
  const featureFlagVersion = extractStringConst(tsVersions, "FEATURE_FLAGS_CONTRACT_VERSION")
  const openapiVersion = extractStringConst(tsVersions, "OPENAPI_CONTRACT_VERSION")

  assert.equal(apiVersion, extractStringConst(pythonVersions, "API_CONTRACT_VERSION"))
  assert.equal(healthVersion, extractStringConst(pythonVersions, "HEALTH_CONTRACT_VERSION"))
  assert.equal(featureFlagVersion, extractStringConst(pythonVersions, "FEATURE_FLAGS_CONTRACT_VERSION"))
  assert.equal(openapiVersion, extractStringConst(pythonVersions, "OPENAPI_CONTRACT_VERSION"))

  assert.equal(openapi["x-clinmira-contract-version"], openapiVersion)

  assert.equal(
    openapi.components.schemas.HealthCheckResponseDto.properties.contract_version.const,
    healthSchema.properties.contract_version.const,
  )
  assert.equal(healthSchema.properties.contract_version.const, healthVersion)
  assert.equal(openapi.components.schemas.HealthCheckResponseDto["x-clinmira-contract-version"], healthVersion)
  assert.equal(openapi.components.schemas.FeatureFlagSnapshotDto["x-clinmira-contract-version"], featureFlagVersion)
  assert.match(healthSchema.$id, /health-check-response\.v1\.schema\.json$/)
  assert.match(featureFlagSchema.$id, /feature-flag-snapshot\.v1\.schema\.json$/)
})

test("JSON Schema names match canonical DTO names", () => {
  const healthSchema = readJson("schemas/health-response.schema.json")
  const featureFlagSchema = readJson("schemas/feature-flags.schema.json")

  assert.equal(healthSchema.title, "HealthCheckResponseDto")
  assert.equal(featureFlagSchema.title, "FeatureFlagSnapshotDto")
  assert.equal(healthSchema.properties.feature_flags.$ref, "feature-flags.schema.json")
})

test("skeleton feature flags are explicitly disabled", () => {
  const openapi = readJson("openapi/clinmira-api.v1.json")
  const featureFlagSchema = readJson("schemas/feature-flags.schema.json")

  for (const flag of featureFlagSchema.required) {
    assert.equal(openapi.components.schemas.FeatureFlagSnapshotDto.properties[flag].const, false)
    assert.equal(featureFlagSchema.properties[flag].const, false)
  }
})

test("contract source does not add premature product or runtime surfaces", () => {
  const machineReadableFiles = [
    ...listFiles(join(contractsRoot, "src")),
    ...listFiles(join(contractsRoot, "schemas")),
    ...listFiles(join(contractsRoot, "openapi")),
    ...listFiles(join(contractsRoot, "python")),
  ].filter((filePath) => [".json", ".py", ".ts"].includes(extname(filePath)))

  const combinedSource = machineReadableFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n")

  assert.doesNotMatch(
    combinedSource,
    /CaseDto|SafetyWarningDto|AgentRunDto|DebriefReportDto|FacultyReviewDto|EventLogDto|OutboxEventDto|OrderDto|ImagingResultDto|ScoreDto|EvaluatorOutputDto/,
  )
  assert.doesNotMatch(
    combinedSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
  assert.doesNotMatch(combinedSource, /\/api\/v[0-9]+\/(?:events|replay|agents|debriefs|faculty|orders|imaging|scores)\b/i)
  assert.doesNotMatch(combinedSource, /\b(?:hidden_facts|hiddenDiagnosis|patient_twin|real patient)\b/i)
})

test("contract governance documents exist", () => {
  assert.equal(existsSync(join(contractsRoot, "CONTRACT_GOVERNANCE.md")), true)
  assert.equal(existsSync(join(contractsRoot, "CONTRACT_INVENTORY.md")), true)
})
