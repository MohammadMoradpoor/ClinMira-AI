import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const apiRoot = join(repoRoot, "backend", "api")
const realtimeRoot = join(apiRoot, "src", "realtime")

function read(relativePath) {
  return readFileSync(join(apiRoot, relativePath), "utf8")
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(filePath) : [filePath]
  })
}

test("optional SSE realtime gateway files exist and are registered", () => {
  for (const relativePath of [
    "src/realtime/realtime.module.ts",
    "src/realtime/realtime.controller.ts",
    "src/realtime/realtime.service.ts",
    "src/realtime/realtime.dto.ts",
  ]) {
    assert.equal(existsSync(join(apiRoot, relativePath)), true, `${relativePath} missing`)
  }

  assert.match(read("src/app.module.ts"), /RealtimeModule/)
})

test("SSE route starts with replay and emits delivery-only replay frames plus completion metadata", () => {
  const controller = read("src/realtime/realtime.controller.ts")
  const service = read("src/realtime/realtime.service.ts")
  const dto = read("src/realtime/realtime.dto.ts")

  assert.match(controller, /@Sse\(":sessionId\/events\/stream"\)/)
  assert.match(service, /replayService\.replaySession/)
  assert.match(service, /frame_type: "replay_event"/)
  assert.match(service, /frame_type: "replay_complete"/)
  assert.match(service, /delivery_only: true/)
  assert.match(service, /delivery_control_not_domain_event/)
  assert.match(dto, /RealtimeStreamFrameDto/)
  assert.match(dto, /"replay_event" \| "replay_complete"/)
})

test("SSE gateway has no Redis, WebSocket, polling loop, publisher, provider, frontend, or unpersisted domain truth", () => {
  const source = listFiles(realtimeRoot)
    .filter((filePath) => [".ts", ".js", ".mjs"].includes(extname(filePath)))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n")

  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*(?:redis|ioredis|@nestjs\/websockets|@temporalio|@prisma|openai|ws|socket\.io|agent-worker|provider)[^"']*["']/i,
  )
  assert.doesNotMatch(source, /WebSocketGateway|SubscribeMessage|setInterval|setTimeout|while\s*\(|INSERT INTO|UPDATE\s+[a-z_]+|outbox_events/i)
  assert.doesNotMatch(source, /frontend\/|localStorage|mockCases|mockPatients|OPENAI_API_KEY|PROVIDER_SECRET|TOOL_SECRET/i)
})
