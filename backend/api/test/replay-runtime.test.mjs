import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const apiRoot = join(repoRoot, "backend", "api")
const replayRoot = join(apiRoot, "src", "replay")

function read(relativePath) {
  return readFileSync(join(apiRoot, relativePath), "utf8")
}

function listFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(filePath) : [filePath]
  })
}

test("Step 15 replay module, controller, service, repository, cursor, redaction, and errors exist", () => {
  for (const relativePath of [
    "src/replay/replay.module.ts",
    "src/replay/replay.controller.ts",
    "src/replay/replay.service.ts",
    "src/replay/replay.repository.ts",
    "src/replay/replay.dto.ts",
    "src/replay/replay-redaction.ts",
    "src/replay/replay-cursor.ts",
    "src/replay/replay-uuid.ts",
    "src/replay/replay.errors.ts",
  ]) {
    assert.equal(existsSync(join(apiRoot, relativePath)), true, `${relativePath} missing`)
  }

  const appModule = read("src/app.module.ts")
  assert.match(appModule, /ReplayModule/)
})

test("replay route contract uses temporary actor headers and validates query cursor", () => {
  const controller = read("src/replay/replay.controller.ts")
  const service = read("src/replay/replay.service.ts")
  const cursor = read("src/replay/replay-cursor.ts")
  const uuid = read("src/replay/replay-uuid.ts")

  assert.match(controller, /@Controller\("api\/v1\/simulation-sessions"\)/)
  assert.match(controller, /@Get\(":sessionId\/replay"\)/)
  assert.match(controller, /x-clinmira-institution-id/)
  assert.match(controller, /x-clinmira-user-id/)
  assert.match(controller, /actor_institution_header_invalid/)
  assert.match(controller, /actor_user_header_invalid/)
  assert.match(service, /sessionId must be a UUID/)
  assert.match(cursor, /parseReplayAfterSequence/)
  assert.match(cursor, /parseReplayLimit/)
  assert.match(cursor, /REPLAY_MAX_LIMIT/)
  assert.match(cursor, /audience must be one of student, faculty, or system/)
  assert.match(service, /isPostgresUuid/)
  assert.match(controller, /isPostgresUuid/)
  assert.match(uuid, /POSTGRES_UUID_PATTERN/)
  assert.match(uuid, /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}/)
})

test("replay repository reads PostgreSQL event_log by institution, session stream, replayable flag, and sequence", () => {
  const repository = read("src/replay/replay.repository.ts")

  assert.match(repository, /FROM event_log/)
  assert.match(repository, /stream_type = \$2 AND stream_id = \$3::uuid/)
  assert.match(repository, /aggregate_type = 'simulation_session' AND aggregate_id = \$3::uuid/)
  assert.match(repository, /institution_id = \$1/)
  assert.match(repository, /replayable = true/)
  assert.match(repository, /sequence > \$4::bigint/)
  assert.match(repository, /ORDER BY sequence ASC, created_at ASC, id ASC/)
  assert.match(repository, /LIMIT \$5/)
  assert.match(repository, /FROM simulation_sessions[\s\S]*student_user_id = \$3/)
})

test("replay service returns reconnect cursor, duplicate count, gap metadata, and snapshot fallback", () => {
  const service = read("src/replay/replay.service.ts")
  const cursor = read("src/replay/replay-cursor.ts")

  assert.match(service, /rowsWithLookahead\.slice\(0, query\.limit\)/)
  assert.match(service, /hasMore = rowsWithLookahead\.length > query\.limit/)
  assert.match(service, /detectSequenceIntegrity/)
  assert.match(service, /maxReplaySequence/)
  assert.match(service, /next_cursor/)
  assert.match(service, /gap_detected/)
  assert.match(service, /duplicate_count/)
  assert.match(service, /snapshot_required: sequenceIntegrity\.gap_detected/)
  assert.match(cursor, /seen\.has\(sequence\)/)
  assert.match(cursor, /duplicateCount \+= 1/)
  assert.match(cursor, /sequence > previous \+ 1/)
})

test("replay source never imports frontend, Redis, OpenAI, Temporal, WebSocket, provider, or worker runtime", () => {
  const sourceFiles = listFiles(replayRoot)
    .filter((filePath) => [".ts", ".js", ".mjs"].includes(extname(filePath)))
  const source = sourceFiles
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n")
  const sourceOutsideRedactionPolicy = sourceFiles
    .filter((filePath) => !filePath.endsWith(join("replay", "replay-redaction.ts")))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n")

  assert.doesNotMatch(
    source,
    /from\s+["'][^"']*(?:openai|redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io|agent-worker|provider)[^"']*["']/i,
  )
  assert.doesNotMatch(source, /new\s+(?:PrismaClient|WebSocket|EventSource|OpenAI)\b/i)
  assert.doesNotMatch(sourceOutsideRedactionPolicy, /frontend\/|localStorage|mockCases|mockPatients|next\//i)
  assert.doesNotMatch(source, /OPENAI_API_KEY|PROVIDER_SECRET|TOOL_SECRET/i)
})
