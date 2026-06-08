import assert from "node:assert/strict"
import fs from "node:fs"
import Module from "node:module"
import path from "node:path"
import test from "node:test"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

const require = createRequire(import.meta.url)
const ts = require("../../node_modules/typescript")
const testDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(testDir, "../../..")

if (!Module._extensions[".ts"]) {
  Module._extensions[".ts"] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8")
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: filename,
    }).outputText

    module._compile(output, filename)
  }
}

const contracts = require("./contracts.ts")
const inventory = require("./contract-inventory.ts")
const { ClinMiraApiClient } = require("./client.ts")
const errors = require("./errors.ts")
const actorContext = require("./actor-context.ts")
const idempotency = require("./idempotency.ts")
const sessionApi = require("../simulation/session-api.ts")

const UUIDS = {
  institution: "11111111-1111-4111-8111-111111111111",
  user: "22222222-2222-4222-8222-222222222222",
  case: "33333333-3333-4333-8333-333333333333",
  caseVersion: "44444444-4444-4444-8444-444444444444",
  session: "55555555-5555-4555-8555-555555555555",
  action: "66666666-6666-4666-8666-666666666666",
  message: "77777777-7777-4777-8777-777777777777",
  event: "88888888-8888-4888-8888-888888888888",
  snapshot: "99999999-9999-4999-8999-999999999999",
}

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8")
}

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    url: "/test",
    text: async () => JSON.stringify(body),
  }
}

function makeHealth(overrides = {}) {
  return {
    contract_version: contracts.HEALTH_CHECK_RESPONSE_CONTRACT_VERSION,
    service: "api-bff",
    status: "ok",
    version: "test",
    runtime: "node",
    timestamp: "2026-06-06T00:00:00.000Z",
    feature_flags: {
      live_agents: false,
      realtime_transport: false,
      voice_mode: false,
      evaluator_debrief: false,
      faculty_review: false,
      scenario_publish: false,
      agent_control: false,
      advanced_imaging: false,
    },
    checks: {
      database: "not_checked",
    },
    ...overrides,
  }
}

function makeSession(overrides = {}) {
  return {
    contract_version: contracts.SIMULATION_SESSION_CONTRACT_VERSION,
    id: UUIDS.session,
    institution_id: UUIDS.institution,
    case_id: UUIDS.case,
    case_version_id: UUIDS.caseVersion,
    student_user_id: UUIDS.user,
    status: "active",
    state_version: 1,
    patient_state: {
      display_name: "Synthetic student-safe patient projection",
    },
    started_at: "2026-06-06T00:00:00.000Z",
    created_at: "2026-06-06T00:00:00.000Z",
    updated_at: "2026-06-06T00:00:00.000Z",
    ...overrides,
  }
}

function makeTurnResult(overrides = {}) {
  return {
    contract_version: contracts.SIMULATION_TURN_RESULT_CONTRACT_VERSION,
    session: makeSession(),
    action: {
      contract_version: contracts.CLINICAL_ACTION_CONTRACT_VERSION,
      id: UUIDS.action,
      session_id: UUIDS.session,
      actor_user_id: UUIDS.user,
      action_type: "ask_question",
      status: "responded",
      sequence: 1,
      payload: {},
      created_at: "2026-06-06T00:00:01.000Z",
    },
    messages: [
      {
        contract_version: contracts.CONVERSATION_MESSAGE_CONTRACT_VERSION,
        id: UUIDS.message,
        session_id: UUIDS.session,
        clinical_action_id: UUIDS.action,
        speaker: "mock_patient",
        visibility: "student_safe",
        status: "completed",
        content: "I can answer that in a simple way.",
        used_fact_ids: [],
        sequence: 1,
        created_at: "2026-06-06T00:00:01.000Z",
      },
    ],
    timeline_events: [
      {
        contract_version: contracts.TIMELINE_EVENT_CONTRACT_VERSION,
        id: UUIDS.event,
        session_id: UUIDS.session,
        clinical_action_id: UUIDS.action,
        event_type: "student.action.submitted",
        title: "Student action submitted",
        payload: {},
        sequence: 1,
        created_at: "2026-06-06T00:00:01.000Z",
      },
    ],
    revealed_facts: [],
    state_snapshot: {
      contract_version: contracts.SESSION_STATE_SNAPSHOT_CONTRACT_VERSION,
      id: UUIDS.snapshot,
      session_id: UUIDS.session,
      state_version: 1,
      reason: "mock_turn_completed",
      snapshot: {},
      created_at: "2026-06-06T00:00:01.000Z",
    },
    ...overrides,
  }
}

async function assertRequestRejectedBeforeFetch(requestOptions, expected = { kind: "bad_request" }) {
  let fetchCallCount = 0
  const client = new ClinMiraApiClient({
    fetchImpl: async () => {
      fetchCallCount += 1
      return jsonResponse(makeHealth())
    },
  })

  await assert.rejects(() => client.request(requestOptions), expected)
  assert.equal(fetchCallCount, 0)
}

test("Step 17B inventory exposes only approved routes and keeps replay/SSE future-only", () => {
  const approvedRoutes = inventory.STEP_17B_APPROVED_ROUTE_INVENTORY.map((entry) => `${entry.method} ${entry.path}`)
  assert.deepEqual(approvedRoutes, [
    "GET /health",
    "GET /api/v1/health",
    "POST /api/v1/simulation-sessions",
    "GET /api/v1/simulation-sessions/{id}",
    "POST /api/v1/simulation-sessions/{id}/actions",
  ])

  assert.equal(inventory.isStep17BApprovedRouteTemplate("/api/v1/simulation-sessions/{sessionId}/replay"), false)
  assert.equal(inventory.isStep17BApprovedRouteTemplate("/api/v1/simulation-sessions/{sessionId}/events/stream"), false)
  assert.equal(inventory.STEP_17B_FUTURE_ONLY_ROUTE_INVENTORY.length, 2)
  assert.ok(inventory.STEP_17B_FUTURE_ONLY_ROUTE_INVENTORY.every((entry) => entry.status === "future_only_blocked"))
})

test("frontend API foundation has no forbidden imports, runtime transports, or localStorage truth", () => {
  const sourceFiles = [
    "frontend/lib/api/actor-context.ts",
    "frontend/lib/api/client.ts",
    "frontend/lib/api/contracts.ts",
    "frontend/lib/api/errors.ts",
    "frontend/lib/api/idempotency.ts",
    "frontend/lib/simulation/session-api.ts",
  ]

  for (const relativePath of sourceFiles) {
    const source = readProjectFile(relativePath)
    assert.doesNotMatch(source, /backend\/api\/src/)
    assert.doesNotMatch(source, /mock-data|simulation-engine|simulation-storage/)
    assert.doesNotMatch(source, /\bEventSource\b|\bWebSocket\b|\bOpenAI\b|\bioredis\b|\bTemporal\b/)
    assert.doesNotMatch(source, /from\s+["']redis["']|require\(["']redis["']\)/)
    assert.doesNotMatch(source, /(?:window|globalThis)\.localStorage|localStorage\.(?:get|set|remove|clear)Item/)
  }

  const inventorySource = readProjectFile("frontend/lib/api/contract-inventory.ts")
  assert.doesNotMatch(inventorySource, /backend\/api\/src/)
  assert.doesNotMatch(inventorySource, /mock-data|simulation-engine|simulation-storage/)
  assert.doesNotMatch(inventorySource, /\bOpenAI\b|\bioredis\b|\bTemporal\b/)
  assert.doesNotMatch(inventorySource, /from\s+["']redis["']|require\(["']redis["']\)/)
})

test("replay and SSE are not implemented by the client or session wrapper", () => {
  const clientSource = readProjectFile("frontend/lib/api/client.ts")
  const sessionSource = readProjectFile("frontend/lib/simulation/session-api.ts")

  assert.doesNotMatch(clientSource, /replay|events\/stream|EventSource/)
  assert.doesNotMatch(sessionSource, /replay|events\/stream|EventSource/)
})

test("DTO declarations do not expose prototype hidden/faculty/debrief/imaging fields", () => {
  const source = readProjectFile("frontend/lib/api/contracts.ts")
  const forbiddenDtoFields = [
    "hiddenDiagnosis",
    "hidden_diagnosis",
    "hiddenHistoryPrompt",
    "facultyRubric",
    "raw_fact_content",
    "faculty_only_notes",
    "treatment_execution",
    "imaging_interpretation",
    "debrief",
    "scoring",
    "faculty_workflow",
  ]

  for (const field of forbiddenDtoFields) {
    assert.doesNotMatch(source, new RegExp(`^\\s*${field}\\??:`, "m"))
  }
})

test("contract validators reject hidden payload markers and non-student-safe projections", () => {
  assert.equal(contracts.assertSimulationSessionDto(makeSession()), true)
  assert.equal(
    contracts.assertSimulationSessionDto(
      makeSession({
        patient_state: {
          hiddenDiagnosis: "Do not expose this",
        },
      }),
    ),
    false,
  )
  assert.equal(
    contracts.assertSimulationTurnResultDto(
      makeTurnResult({
        messages: [
          {
            contract_version: contracts.CONVERSATION_MESSAGE_CONTRACT_VERSION,
            id: UUIDS.message,
            session_id: UUIDS.session,
            speaker: "system",
            visibility: "internal",
            status: "completed",
            content: "Internal only",
            used_fact_ids: [],
            sequence: 1,
            created_at: "2026-06-06T00:00:01.000Z",
          },
        ],
      }),
    ),
    false,
  )
})

test("temporary actor context is labeled non-production and validates strict UUIDs", () => {
  assert.match(actorContext.NON_PRODUCTION_ACTOR_CONTEXT_NOTICE, /not production auth or RBAC/i)
  assert.equal(actorContext.isStrictUuid(UUIDS.institution), true)
  assert.equal(actorContext.isStrictUuid("not-a-uuid"), false)

  assert.deepEqual(
    actorContext.toNonProductionActorHeaders({
      institutionId: UUIDS.institution,
      userId: UUIDS.user,
    }),
    {
      "x-clinmira-institution-id": UUIDS.institution,
      "x-clinmira-user-id": UUIDS.user,
    },
  )

  assert.throws(() =>
    actorContext.createNonProductionActorContext({
      institutionId: "not-a-uuid",
      userId: UUIDS.user,
    }),
  )
})

test("idempotency helper requires or generates cryptographic UUID-backed keys", () => {
  assert.equal(
    idempotency.createClinMiraIdempotencyKey({
      scope: "test-scope",
      randomUuid: () => UUIDS.action,
    }),
    `test-scope:${UUIDS.action}`,
  )
  assert.equal(
    idempotency.ensureClinMiraIdempotencyKey(undefined, {
      scope: "generated-scope",
      randomUuid: () => UUIDS.event,
    }),
    `generated-scope:${UUIDS.event}`,
  )
  assert.throws(() => idempotency.requireClinMiraIdempotencyKey("short"))
})

test("client normalizes network, contract, shape, actor, idempotency, and safety errors", async () => {
  assert.equal(errors.normalizeNetworkError(new Error("offline")).kind, "backend_unavailable")
  assert.equal(errors.normalizeNetworkError({ name: "AbortError" }).kind, "timeout")
  assert.equal(errors.normalizeHttpError(400, { code: "missing_actor_headers", message: "missing" }).kind, "missing_actor_context")
  assert.equal(errors.normalizeHttpError(400, { message: "Missing x-clinmira-institution-id header" }).kind, "missing_actor_context")
  assert.equal(errors.normalizeHttpError(409, { code: "idempotency_conflict", message: "duplicate" }).kind, "idempotency_conflict")
  assert.equal(errors.normalizeHttpError(400, { code: "unsafe_action_blocked", message: "blocked_unsupported" }).kind, "safety_block")

  const contractClient = new ClinMiraApiClient({
    fetchImpl: async () => jsonResponse(makeHealth({ contract_version: "wrong-version" })),
  })
  await assert.rejects(
    () =>
      contractClient.request({
        routeTemplate: "/health",
        method: "GET",
        expectedContractVersion: contracts.HEALTH_CHECK_RESPONSE_CONTRACT_VERSION,
      }),
    { kind: "unknown_contract_version" },
  )

  const shapeClient = new ClinMiraApiClient({
    fetchImpl: async () => jsonResponse(makeHealth()),
  })
  await assert.rejects(
    () =>
      shapeClient.request({
        routeTemplate: "/health",
        method: "GET",
        validateResponse: () => false,
      }),
    { kind: "unknown_response_shape" },
  )
})

test("client rejects future or unknown route templates before fetch", async () => {
  await assertRequestRejectedBeforeFetch({
    routeTemplate: "/api/v1/simulation-sessions/{sessionId}/replay",
    method: "GET",
  })
})

test("client rejects arbitrary path overrides before fetch", async () => {
  const rejectedRequests = [
    {
      routeTemplate: "/health",
      path: "/api/v1/unapproved",
      method: "GET",
    },
    {
      routeTemplate: "/health",
      path: "/api/v1/simulation-sessions",
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: `/api/v1/simulation-sessions/${UUIDS.session}/replay`,
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: `/api/v1/simulation-sessions/${UUIDS.session}/events/stream`,
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: `https://evil.example/api/v1/simulation-sessions/${UUIDS.session}`,
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: `//evil.example/api/v1/simulation-sessions/${UUIDS.session}`,
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: "/api/v1/simulation-sessions/../health",
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: `/api/v1/simulation-sessions/${UUIDS.session}/extra`,
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: "/api/v1/simulation-sessions/",
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: "/api/v1/simulation-sessions/not-a-uuid",
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: `/api/v1/simulation-sessions/${UUIDS.session}?next=/actions`,
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: `/api/v1/simulation-sessions/${UUIDS.session}#actions`,
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      method: "GET",
    },
  ]

  for (const requestOptions of rejectedRequests) {
    await assertRequestRejectedBeforeFetch(requestOptions)
  }
})

test("client enforces approved route inventory methods before fetch", async () => {
  const rejectedRequests = [
    {
      routeTemplate: "/health",
      method: "POST",
    },
    {
      routeTemplate: "/api/v1/health",
      method: "POST",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions",
      method: "GET",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}",
      path: `/api/v1/simulation-sessions/${UUIDS.session}`,
      method: "POST",
    },
    {
      routeTemplate: "/api/v1/simulation-sessions/{id}/actions",
      path: `/api/v1/simulation-sessions/${UUIDS.session}/actions`,
      method: "GET",
    },
  ]

  for (const requestOptions of rejectedRequests) {
    await assertRequestRejectedBeforeFetch(requestOptions)
  }
})

test("client accepts approved dynamic UUID path substitutions", async () => {
  const calls = []
  const client = new ClinMiraApiClient({
    fetchImpl: async (url, init) => {
      calls.push({ url, method: init?.method })

      if (String(url).endsWith("/actions")) {
        return jsonResponse(makeTurnResult())
      }

      return jsonResponse(makeSession())
    },
  })

  const session = await client.request({
    routeTemplate: "/api/v1/simulation-sessions/{id}",
    path: `/api/v1/simulation-sessions/${UUIDS.session}`,
    method: "GET",
  })
  const turnResult = await client.request({
    routeTemplate: "/api/v1/simulation-sessions/{id}/actions",
    path: `/api/v1/simulation-sessions/${UUIDS.session}/actions`,
    method: "POST",
    body: {
      contract_version: contracts.SUBMIT_SIMULATION_ACTION_REQUEST_CONTRACT_VERSION,
      action_type: "ask_question",
      idempotency_key: `submit-simulation-action:${UUIDS.action}`,
    },
  })

  assert.equal(session.id, UUIDS.session)
  assert.equal(turnResult.session.id, UUIDS.session)
  assert.deepEqual(calls, [
    {
      url: `/api/v1/simulation-sessions/${UUIDS.session}`,
      method: "GET",
    },
    {
      url: `/api/v1/simulation-sessions/${UUIDS.session}/actions`,
      method: "POST",
    },
  ])
})

test("session API uses actor headers, approved routes, and generated idempotency keys", async () => {
  const calls = []
  const client = new ClinMiraApiClient({
    fetchImpl: async (url, init) => {
      calls.push({
        url,
        method: init?.method,
        headers: init?.headers,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      })

      if (String(url).endsWith("/actions")) {
        return jsonResponse(makeTurnResult())
      }

      return jsonResponse(makeSession())
    },
  })

  await sessionApi.createSimulationSession(
    { institutionId: UUIDS.institution, userId: UUIDS.user },
    { case_version_id: UUIDS.caseVersion },
    { client },
  )
  await sessionApi.submitSimulationAction(
    { institutionId: UUIDS.institution, userId: UUIDS.user },
    UUIDS.session,
    { action_type: "ask_question", text: "How are you feeling?" },
    { client },
  )

  assert.equal(calls[0].url, "/api/v1/simulation-sessions")
  assert.equal(calls[0].method, "POST")
  assert.equal(calls[0].body.contract_version, contracts.CREATE_SIMULATION_SESSION_REQUEST_CONTRACT_VERSION)
  assert.match(calls[0].body.idempotency_key, /^create-simulation-session:/)

  assert.equal(calls[1].url, `/api/v1/simulation-sessions/${UUIDS.session}/actions`)
  assert.equal(calls[1].method, "POST")
  assert.equal(calls[1].body.contract_version, contracts.SUBMIT_SIMULATION_ACTION_REQUEST_CONTRACT_VERSION)
  assert.match(calls[1].body.idempotency_key, /^submit-simulation-action:/)
  assert.equal(calls[1].headers.get("x-clinmira-institution-id"), UUIDS.institution)
  assert.equal(calls[1].headers.get("x-clinmira-user-id"), UUIDS.user)
})

test("session API rejects invalid UUID paths and hidden structured action payloads", async () => {
  const client = new ClinMiraApiClient({
    fetchImpl: async () => {
      throw new Error("fetch should not be called when local validation fails")
    },
  })

  await assert.rejects(() =>
    sessionApi.getSimulationSession(
      { institutionId: UUIDS.institution, userId: UUIDS.user },
      "not-a-uuid",
      { client },
    ),
  )

  await assert.rejects(() =>
    sessionApi.submitSimulationAction(
      { institutionId: UUIDS.institution, userId: UUIDS.user },
      UUIDS.session,
      {
        action_type: "ask_question",
        payload: {
          facultyRubric: "prototype-only field",
        },
      },
      { client },
    ),
  )
})
