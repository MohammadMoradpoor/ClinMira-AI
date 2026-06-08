import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const apiRoot = join(repoRoot, "backend", "api")
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

test("approved Step 8B simulation routes remain unchanged while Step 15 registers replay modules separately", () => {
  const simulationController = read("src/simulation/simulation.controller.ts")
  const appModule = read("src/app.module.ts")

  assert.match(appModule, /imports: \[SimulationModule, ReplayModule, RealtimeModule\]/)
  assert.match(simulationController, /@Controller\("api\/v1\/simulation-sessions"\)/)
  assert.match(simulationController, /@Post\(\)/)
  assert.match(simulationController, /@Get\(":id"\)/)
  assert.match(simulationController, /@Post\(":id\/actions"\)/)
  assert.doesNotMatch(simulationController, /events|replay|agents|debriefs|faculty|orders|imaging|scores/i)
})

test("Step 8B uses temporary actor headers and never silent demo defaults", () => {
  const controller = read("src/simulation/simulation.controller.ts")

  assert.match(controller, /x-clinmira-institution-id/)
  assert.match(controller, /x-clinmira-user-id/)
  assert.match(controller, /actor_institution_header_invalid/)
  assert.match(controller, /actor_user_header_invalid/)
  assert.doesNotMatch(controller, /00000000-0000-0000-0000-000000000101|demo tenant|default.*institution/i)
})

test("Step 8B source has no forbidden runtime integrations or frontend imports", () => {
  const sourceFiles = listFiles(srcRoot).filter((filePath) => [".ts", ".js", ".mjs"].includes(extname(filePath)))
  const combinedSource = sourceFiles.map((filePath) => readFileSync(filePath, "utf8")).join("\n")
  const nonRedactionSource = sourceFiles
    .filter((filePath) => !filePath.endsWith(join("replay", "replay-redaction.ts")))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n")

  assert.doesNotMatch(
    combinedSource,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  )
  assert.doesNotMatch(combinedSource, /new\s+(?:PrismaClient|WebSocket|EventSource|OpenAI)\b/i)
  assert.doesNotMatch(combinedSource, /@(?:WebSocketGateway|SubscribeMessage)\b/)
  assert.doesNotMatch(nonRedactionSource, /frontend\/|localStorage|hiddenDiagnosis|mockCases|mockPatients|next\//i)
})

test("Step 8B package adds only approved PostgreSQL persistence dependency", () => {
  const packageJson = JSON.parse(read("package.json"))

  assert.equal(packageJson.dependencies.pg.startsWith("^8."), true)
  assert.equal(packageJson.devDependencies["@types/pg"].startsWith("^8."), true)
  for (const forbidden of ["@prisma/client", "prisma", "typeorm", "sequelize", "drizzle-orm", "redis", "ioredis", "openai", "@temporalio/client", "ws", "socket.io"]) {
    assert.equal(packageJson.dependencies?.[forbidden], undefined, `${forbidden} must not be a runtime dependency`)
    assert.equal(packageJson.devDependencies?.[forbidden], undefined, `${forbidden} must not be a dev dependency`)
  }
})
