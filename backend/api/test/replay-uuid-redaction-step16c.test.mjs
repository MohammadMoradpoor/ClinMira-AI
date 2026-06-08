import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { test } from "node:test"
import vm from "node:vm"

const require = createRequire(import.meta.url)
const ts = require("typescript")
const apiRoot = join(import.meta.dirname, "..")

function read(relativePath) {
  return readFileSync(join(apiRoot, relativePath), "utf8")
}

function loadTsModule(relativePath, stubs = {}) {
  const source = read(relativePath)
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      experimentalDecorators: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: relativePath,
  }).outputText
  const module = { exports: {} }
  const localRequire = (specifier) => {
    if (specifier in stubs) {
      return stubs[specifier]
    }

    throw new Error(`Unexpected test import ${specifier} from ${relativePath}`)
  }

  vm.runInNewContext(output, {
    require: localRequire,
    exports: module.exports,
    module,
  }, {
    filename: relativePath,
  })

  return module.exports
}

function loadReplayUuid() {
  return loadTsModule("src/replay/replay-uuid.ts")
}

function loadReplayRedaction() {
  const dto = loadTsModule("src/replay/replay.dto.ts")
  return loadTsModule("src/replay/replay-redaction.ts", {
    "./replay.dto": dto,
  })
}

function loadReplayService() {
  const replayUuid = loadReplayUuid()
  const replayErrors = {
    ReplayBadRequestError: class ReplayBadRequestError extends Error {
      constructor(code, message) {
        super(message)
        this.code = code
      }
    },
  }

  return loadTsModule("src/replay/replay.service.ts", {
    "@nestjs/common": { Injectable: () => (target) => target },
    "../database/database.service": {},
    "./replay-cursor": {
      detectSequenceIntegrity: () => ({ gap_detected: false, duplicate_count: 0 }),
      maxReplaySequence: (_events, fallbackSequence) => fallbackSequence,
      parseReplayQuery: (rawQuery) => ({
        after_sequence: Number(rawQuery.after_sequence ?? 0),
        audience: rawQuery.audience ?? "student",
        limit: Number(rawQuery.limit ?? 100),
      }),
    },
    "./replay.dto": { REPLAY_RESPONSE_SCHEMA_VERSION: "clinmira.replay.v1" },
    "./replay.errors": replayErrors,
    "./replay-redaction": { redactReplayEvent: () => ({ event: null, redaction_applied: false }) },
    "./replay.repository": {},
    "./replay-uuid": replayUuid,
  })
}

function buildReplayRow(payload, audience = "student") {
  return {
    event_id: "11111111-1111-4111-8111-111111111111",
    institution_id: "22222222-2222-4222-8222-222222222222",
    stream_type: "simulation_session",
    stream_id: "33333333-3333-4333-8333-333333333333",
    sequence: 1,
    event_type: "step16c.redaction.regression",
    event_schema_version: "simulation-session-event.v1",
    payload_classification: audience === "system_restricted" ? "internal" : "student_safe",
    replayable: true,
    payload,
    redaction_status: "contains_restricted_fields",
    created_at: "2026-06-06T00:00:00.000Z",
  }
}

test("Step 16C UUID helper accepts PostgreSQL UUID text and rejects malformed values", () => {
  const { isPostgresUuid } = loadReplayUuid()

  for (const valid of [
    "123e4567-e89b-12d3-a456-426614174000",
    "123E4567-E89B-12D3-A456-426614174000",
    "123e4567-E89b-12D3-a456-426614174000",
    "00000000-0000-0000-0000-000000000000",
  ]) {
    assert.equal(isPostgresUuid(valid), true, `${valid} should be accepted`)
  }

  for (const invalid of [
    undefined,
    null,
    "",
    [],
    42,
    "123e4567-e89b-12d3-a456",
    "123e4567e89b12d3a456426614174000",
    "123e4567-e89b-12d3-a456-426614174000-extra",
    "zzze4567-e89b-12d3-a456-426614174000",
    "../123e4567-e89b-12d3-a456-426614174000",
    "123e4567-e89b-12d3-a456-426614174000?audience=student",
    " 123e4567-e89b-12d3-a456-426614174000 ",
  ]) {
    assert.equal(isPostgresUuid(invalid), false, `${String(invalid)} should be rejected`)
  }
})

test("Step 16C replay and SSE controllers share the PostgreSQL UUID validator", () => {
  const replayController = read("src/replay/replay.controller.ts")
  const realtimeController = read("src/realtime/realtime.controller.ts")
  const replayService = read("src/replay/replay.service.ts")

  assert.match(replayController, /import \{ isPostgresUuid \} from "\.\/replay-uuid"/)
  assert.match(realtimeController, /import \{ isPostgresUuid \} from "\.\.\/replay\/replay-uuid"/)
  assert.match(replayService, /import \{ isPostgresUuid \} from "\.\/replay-uuid"/)
  assert.doesNotMatch(replayController, /const UUID_PATTERN/)
  assert.doesNotMatch(realtimeController, /const UUID_PATTERN/)
  assert.doesNotMatch(replayService, /const UUID_PATTERN/)
})

test("Step 16C replay service regression accepts a PostgreSQL UUID before repository lookup", async () => {
  const { ReplayService } = loadReplayService()
  let transactionStarted = false
  let sessionScopeChecked = false
  const service = new ReplayService(
    {
      withTransaction: async (work) => {
        transactionStarted = true
        return work({})
      },
    },
    {
      assertSessionScope: async () => {
        sessionScopeChecked = true
      },
      loadReplayableSessionEvents: async () => [],
    },
  )

  const result = await service.replaySession(
    {
      institution_id: "22222222-2222-4222-8222-222222222222",
      user_id: "33333333-3333-4333-8333-333333333333",
      audience: "student",
    },
    "123e4567-e89b-12d3-a456-426614174000",
    {
      after_sequence: "0",
      audience: "student",
      limit: "10",
    },
  )

  assert.equal(transactionStarted, true)
  assert.equal(sessionScopeChecked, true)
  assert.equal(result.session_id, "123e4567-e89b-12d3-a456-426614174000")
})

test("Step 16C replay service still rejects malformed session UUIDs before DB work", async () => {
  const { ReplayService } = loadReplayService()
  let transactionStarted = false
  const service = new ReplayService(
    {
      withTransaction: async () => {
        transactionStarted = true
      },
    },
    {
      assertSessionScope: async () => {},
      loadReplayableSessionEvents: async () => [],
    },
  )

  await assert.rejects(
    () => service.replaySession(
      {
        institution_id: "22222222-2222-4222-8222-222222222222",
        user_id: "33333333-3333-4333-8333-333333333333",
        audience: "student",
      },
      "123e4567-e89b-12d3-a456",
      {},
    ),
    (error) => error.code === "session_id_invalid",
  )
  assert.equal(transactionStarted, false)
})

test("Step 16C redaction removes frontend mock and localStorage markers recursively", () => {
  const { redactReplayEvent } = loadReplayRedaction()
  const payload = {
    safe_message: "This event is safe.",
    frontend_mock: "remove key",
    nested: {
      mockData: "remove nested key",
      safe_nested: "contains frontend mock marker",
      deeper: {
        safe_deeper: "window.localStorage should not leak",
      },
    },
    array_payload: [
      "mock_source should be redacted",
      { safe_array_key: "local_storage should be redacted" },
      { mock_frontend: "remove array object key" },
    ],
  }

  for (const audience of ["student", "faculty", "system"]) {
    const result = redactReplayEvent(buildReplayRow(payload), audience)
    const serialized = JSON.stringify(result)

    assert.equal(result.event.payload.safe_message, "This event is safe.")
    assert.equal(serialized.includes("frontend_mock"), false, `${audience} leaked frontend_mock key`)
    assert.equal(serialized.includes("mockData"), false, `${audience} leaked mockData key`)
    assert.equal(serialized.includes("mock_frontend"), false, `${audience} leaked mock_frontend key`)
    assert.equal(serialized.includes("localStorage"), false, `${audience} leaked localStorage marker`)
    assert.equal(serialized.includes("local_storage"), false, `${audience} leaked local_storage marker`)
    assert.equal(serialized.includes("mock_source"), false, `${audience} leaked mock_source marker`)
    assert.match(serialized, /\[redacted\]/)
  }
})

test("Step 16C redaction does not weaken hidden, prompt, secret, or provider trace filtering", () => {
  const { redactReplayEvent } = loadReplayRedaction()
  const payload = {
    safe_message: "This event is safe.",
    hidden_diagnosis: "STEP16C_HIDDEN_DIAGNOSIS",
    system_prompt: "STEP16C_SYSTEM_PROMPT",
    provider_trace: "STEP16C_PROVIDER_TRACE",
    api_key: "STEP16C_API_KEY",
    nested: {
      faculty_only_notes: "STEP16C_FACULTY_NOTES",
      safe_text: "This string mentions hidden diagnosis and must be redacted.",
    },
  }

  const result = redactReplayEvent(buildReplayRow(payload), "student")
  const serialized = JSON.stringify(result)

  assert.equal(result.event.payload.safe_message, "This event is safe.")
  for (const marker of [
    "STEP16C_HIDDEN_DIAGNOSIS",
    "STEP16C_SYSTEM_PROMPT",
    "STEP16C_PROVIDER_TRACE",
    "STEP16C_API_KEY",
    "STEP16C_FACULTY_NOTES",
    "hidden_diagnosis",
    "system_prompt",
    "provider_trace",
    "api_key",
    "faculty_only_notes",
  ]) {
    assert.equal(serialized.includes(marker), false, `${marker} leaked`)
  }
  assert.match(serialized, /\[redacted\]/)
})
