import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const apiRoot = join(import.meta.dirname, "..")
const srcRoot = join(apiRoot, "src")

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function read(relativePath) {
  return readFileSync(join(apiRoot, relativePath), "utf8")
}

test("API/BFF exposes only health, approved Step 8B simulation endpoints, and Step 15 replay/SSE endpoints", () => {
  const controller = read("src/health/health.controller.ts")
  const routeMatches = [...controller.matchAll(/@Get\("([^"]+)"\)/g)].map((match) => match[1]).sort()
  const simulationController = read("src/simulation/simulation.controller.ts")
  const replayController = read("src/replay/replay.controller.ts")
  const realtimeController = read("src/realtime/realtime.controller.ts")
  const simulationRoutes = [
    ...simulationController.matchAll(/@(Get|Post)\("([^"]*)"\)/g),
  ].map((match) => `${match[1].toUpperCase()} ${match[2] || "/"}`)
  if (/@Post\(\)/.test(simulationController)) {
    simulationRoutes.push("POST /")
  }

  assert.deepEqual(routeMatches, ["api/v1/health", "health"])
  assert.doesNotMatch(controller, /@(?:Post|Put|Patch|Delete)\(/)
  assert.deepEqual(simulationRoutes.sort(), ["GET :id", "POST /", "POST :id/actions"])
  assert.match(replayController, /@Get\(":sessionId\/replay"\)/)
  assert.match(realtimeController, /@Sse\(":sessionId\/events\/stream"\)/)
})

test("health service declares risky capabilities disabled and simulation DB explicitly configured or not", () => {
  const service = read("src/health/health.service.ts")

  for (const expected of [
    'clinical_product_apis: "mock_simulation_only"',
    'clinical_business_logic: "not_implemented"',
    'live_openai_calls: "disabled"',
    'realtime_transport: "not_configured"',
    'temporal_workflows: "not_configured"',
  ]) {
    assert.match(service, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }

  assert.match(service, /database: process\.env\.CLINMIRA_DATABASE_URL \? "configured_for_simulation" : "not_configured"/)
})

test("API/BFF does not contain forbidden product implementation beyond Step 15", () => {
  const sourceFiles = listFiles(srcRoot).filter((filePath) => [".ts", ".js", ".mjs"].includes(extname(filePath)))
  const combinedSource = sourceFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n")
  const nonRedactionSource = sourceFiles
    .filter((filePath) => !filePath.endsWith(join("replay", "replay-redaction.ts")))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n")

  assert.doesNotMatch(combinedSource, /@(?:Put|Patch|Delete)\(/)
  assert.doesNotMatch(combinedSource, /@(?:Get|Post|Sse)\("(?:cases|agents|debriefs|faculty|orders|imaging|scores)/i)
  assert.doesNotMatch(combinedSource, /from\s+["'][^"']*(?:openai|@prisma|redis|ioredis|@nestjs\/websockets|@temporalio|ws|socket\.io)[^"']*["']/i)
  assert.doesNotMatch(combinedSource, /new\s+(?:PrismaClient|WebSocket|EventSource|OpenAI)\b/i)
  assert.doesNotMatch(combinedSource, /@(?:WebSocketGateway|SubscribeMessage)\b/)
  assert.doesNotMatch(nonRedactionSource, /\b(?:hidden_facts|hiddenDiagnosis|real patient)\b/i)
  assert.doesNotMatch(nonRedactionSource, /frontend/i)
  assert.doesNotMatch(combinedSource, /@\/|next\//i)
})
