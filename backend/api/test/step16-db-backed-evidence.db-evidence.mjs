import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")
const apiRoot = join(repoRoot, "backend", "api")
const sharedContractsIndex = join(repoRoot, "shared", "contracts", "src", "index.ts")
const require = createRequire(import.meta.url)

const INSTITUTION_ID = "11111111-1111-4111-8111-111111111111"
const STUDENT_USER_ID = "22222222-2222-4222-8222-222222222222"
const WRONG_STUDENT_USER_ID = "22222222-2222-4222-8222-222222222223"
const WRONG_INSTITUTION_ID = "99999999-9999-4999-8999-999999999999"
const CASE_ID = "33333333-3333-4333-8333-333333333333"
const CASE_VERSION_ID = "44444444-4444-4444-8444-444444444444"
const PATIENT_TWIN_ID = "55555555-5555-4555-8555-555555555555"
const PATIENT_PERSONA_ID = "66666666-6666-4666-8666-666666666666"
const BASELINE_FACT_ID = "77777777-7777-4777-8777-777777777777"
const ALLERGY_FACT_ID = "88888888-8888-4888-8888-888888888888"
const REVEAL_RULE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const SEED_CASE_VERSION_ID = "00000000-0000-0000-0000-000000000711"
const SEED_ALLERGY_FACT_ID = "00000000-0000-0000-0000-000000000732"

const REQUIRED_TABLES = [
  "schema_migrations",
  "institutions",
  "users",
  "roles",
  "cohorts",
  "enrollments",
  "audit_logs",
  "cases",
  "case_versions",
  "patient_twins",
  "patient_personas",
  "fact_ledger",
  "fact_reveal_rules",
  "fact_access_policies",
  "event_log",
  "outbox_events",
  "idempotency_keys",
  "simulation_sessions",
  "session_revealed_facts",
  "clinical_actions",
  "conversation_messages",
  "timeline_events",
  "session_state_snapshots",
  "safety_rules",
  "safety_evaluations",
  "safety_findings",
]

const FORBIDDEN_STUDENT_MARKERS = [
  "hidden_diagnosis",
  "raw_fact_content",
  "faculty_only_notes",
  "safety_only",
  "evaluator_only",
  "system_prompt",
  "internal_prompt",
  "provider_trace",
  "api_key",
  "tool_secret",
  "frontend_mock",
  "mockData",
  "mockSource",
  "localStorage",
  "window.localStorage",
]

let tsHookInstalled = false

test("Step 16 DB-backed replay and safety evidence through existing Nest routes", async () => {
  const safeDatabase = assertSafeTestDatabase()
  const { Pool } = require("pg")
  const pool = new Pool({
    connectionString: safeDatabase.connectionString,
    application_name: "clinmira-step16-db-backed-evidence-test",
  })

  let app

  try {
    await verifyDatabaseFoundation(pool)
    await verifySeedBaseline(pool)
    await ensureRuntimeValidSyntheticContext(pool)

    const runtime = await startNestApp()
    app = runtime.app
    const baseUrl = runtime.baseUrl
    const actorHeaders = {
      "x-clinmira-institution-id": INSTITUTION_ID,
      "x-clinmira-user-id": STUDENT_USER_ID,
    }

    const runId = `step16-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const created = await requestJson(baseUrl, "/api/v1/simulation-sessions", {
      method: "POST",
      headers: actorHeaders,
      body: {
        case_version_id: CASE_VERSION_ID,
        client_request_id: `${runId}-create`,
      },
      expectedStatus: 201,
    })
    const sessionId = created.json.id

    assertUuid(sessionId)
    assert.equal(created.json.institution_id, INSTITUTION_ID)
    assert.equal(created.json.student_user_id, STUDENT_USER_ID)
    assert.equal(created.json.case_version_id, CASE_VERSION_ID)
    assert.equal(created.json.status, "active")
    assert.equal(created.json.state_version, 1)
    assertStudentPayloadIsSafe(created.json)

    const createCounts = await sessionCounts(pool, sessionId)
    assert.equal(createCounts.sessions, 1)
    assert.equal(createCounts.revealedFacts, 1)
    assert.equal(createCounts.timelineEvents, 1)
    assert.equal(createCounts.snapshots, 1)
    assert.equal(createCounts.eventLog, 1)
    assert.equal(createCounts.outboxEvents, 1)

    const safeActionBody = {
      action_type: "ask_question",
      text: "Do you have any allergies?",
      idempotency_key: `${runId}-safe-action`,
      client_sequence: 1,
    }
    const safeAction = await requestJson(baseUrl, `/api/v1/simulation-sessions/${sessionId}/actions`, {
      method: "POST",
      headers: actorHeaders,
      body: safeActionBody,
      expectedStatus: 201,
    })

    assert.equal(safeAction.json.action.status, "responded")
    assert.equal(safeAction.json.action.action_type, "ask_question")
    assert.equal(safeAction.json.revealed_facts.some((fact) => fact.fact_id === ALLERGY_FACT_ID), true)
    assert.equal(
      safeAction.json.messages.some(
        (message) => message.speaker === "mock_patient" && message.used_fact_ids.includes(ALLERGY_FACT_ID),
      ),
      true,
    )
    assertStudentPayloadIsSafe(safeAction.json)

    const safeCounts = await sessionCounts(pool, sessionId)
    assert.equal(safeCounts.actions, 1)
    assert.ok(safeCounts.messages >= 2)
    assert.ok(safeCounts.timelineEvents >= 4)
    assert.ok(safeCounts.snapshots >= 2)
    assert.ok(safeCounts.eventLog >= 4)
    assert.equal(safeCounts.outboxEvents, safeCounts.eventLog)

    const duplicateAction = await requestJson(baseUrl, `/api/v1/simulation-sessions/${sessionId}/actions`, {
      method: "POST",
      headers: actorHeaders,
      body: safeActionBody,
      expectedStatus: 201,
    })
    assert.equal(duplicateAction.json.action.id, safeAction.json.action.id)
    assert.deepEqual(await sessionCounts(pool, sessionId), safeCounts)

    const conflict = await requestJson(baseUrl, `/api/v1/simulation-sessions/${sessionId}/actions`, {
      method: "POST",
      headers: actorHeaders,
      body: {
        ...safeActionBody,
        text: "Different text with the same idempotency key",
      },
      expectedStatus: 409,
    })
    assert.equal(conflict.json.code, "idempotency_conflict")
    assert.deepEqual(await sessionCounts(pool, sessionId), safeCounts)

    const unsafeAction = await requestJson(baseUrl, `/api/v1/simulation-sessions/${sessionId}/actions`, {
      method: "POST",
      headers: actorHeaders,
      body: {
        action_type: "treatment_attempt",
        text: "Start a treatment plan and prescribe antibiotics now.",
        idempotency_key: `${runId}-unsafe-treatment-action`,
        client_sequence: 2,
      },
      expectedStatus: 201,
    })
    assert.equal(unsafeAction.json.action.action_type, "treatment_attempt")
    assert.equal(unsafeAction.json.action.status, "blocked_unsupported")
    assert.match(unsafeAction.json.action.blocked_reason, /unsupported|risky|treatment/i)
    assert.equal(unsafeAction.json.revealed_facts.length, 0)
    assert.equal(
      unsafeAction.json.timeline_events.some((event) => event.event_type === "safety.action.blocked"),
      true,
    )
    assert.equal(
      unsafeAction.json.messages.some((message) => message.speaker === "system" && message.status === "blocked"),
      true,
    )
    assertStudentPayloadIsSafe(unsafeAction.json)

    const safetyEvidence = await safetyCounts(pool, sessionId, unsafeAction.json.action.id)
    assert.ok(safetyEvidence.evaluations >= 1)
    assert.ok(safetyEvidence.findings >= 1)
    assert.equal(safetyEvidence.revealedByBlockedAction, 0)
    assert.equal(safetyEvidence.unsafeAcceptedActions, 0)

    const postSafetyCounts = await sessionCounts(pool, sessionId)
    assert.equal(postSafetyCounts.actions, 2)
    assert.equal(postSafetyCounts.outboxEvents, postSafetyCounts.eventLog)

    const replay = await requestJson(baseUrl, `/api/v1/simulation-sessions/${sessionId}/replay?audience=student&limit=100`, {
      headers: actorHeaders,
    })
    assert.equal(replay.json.session_id, sessionId)
    assert.equal(replay.json.audience, "student")
    assert.equal(replay.json.redaction_applied, true)
    assert.equal(replay.json.events.length, postSafetyCounts.eventLog)
    assertEventTypes(replay.json.events, [
      "simulation.session.created",
      "student.action.submitted",
      "mock_patient.response.created",
      "safety.action.blocked",
      "session.state.snapshotted",
    ])
    assertStudentPayloadIsSafe(replay.json)

    await requestJson(baseUrl, `/api/v1/simulation-sessions/${sessionId}/replay`, {
      headers: {
        ...actorHeaders,
        "x-clinmira-institution-id": WRONG_INSTITUTION_ID,
      },
      expectedStatus: 404,
    })
    await requestJson(baseUrl, `/api/v1/simulation-sessions/${sessionId}/replay`, {
      headers: {
        ...actorHeaders,
        "x-clinmira-user-id": WRONG_STUDENT_USER_ID,
      },
      expectedStatus: 404,
    })

    const firstSequence = replay.json.events[0].sequence
    const replayAfterFirst = await requestJson(
      baseUrl,
      `/api/v1/simulation-sessions/${sessionId}/replay?after_sequence=${firstSequence}&audience=student&limit=100`,
      { headers: actorHeaders },
    )
    assert.equal(
      replayAfterFirst.json.events.every((event) => event.sequence > firstSequence),
      true,
    )
    assert.equal(replayAfterFirst.json.next_cursor.after_sequence, replay.json.next_cursor.after_sequence)

    const replayAfterFirstAgain = await requestJson(
      baseUrl,
      `/api/v1/simulation-sessions/${sessionId}/replay?after_sequence=${firstSequence}&audience=student&limit=100`,
      { headers: actorHeaders },
    )
    assert.deepEqual(
      replayAfterFirstAgain.json.events.map((event) => event.event_id),
      replayAfterFirst.json.events.map((event) => event.event_id),
    )

    const redactionSequence = await appendSyntheticReplayProbe(pool, {
      institutionId: INSTITUTION_ID,
      userId: STUDENT_USER_ID,
      sessionId,
      eventType: "step16.synthetic.redaction_probe",
      sequence: (await maxEventSequence(pool, sessionId)) + 1,
      payload: {
        safe_note: "synthetic redaction probe",
        hidden_diagnosis: "synthetic forbidden diagnosis marker",
        raw_fact_content: { answer: "synthetic raw fact marker" },
        faculty_only_notes: "synthetic faculty marker",
        safety_only: "synthetic safety-only marker",
        evaluator_only: "synthetic evaluator marker",
        system_prompt: "synthetic system prompt marker",
        internal_prompt: "synthetic internal prompt marker",
        provider_trace: { raw: "synthetic trace marker" },
        api_key: "sk-step16-synthetic-marker",
        frontend_mock: "synthetic frontend mock marker",
        nested: {
          mockData: "synthetic mock data marker",
          browser_state: "window.localStorage synthetic marker",
        },
      },
    })

    for (const audience of ["student", "faculty", "system"]) {
      const redactedReplay = await requestJson(
        baseUrl,
        `/api/v1/simulation-sessions/${sessionId}/replay?after_sequence=${redactionSequence - 1}&audience=${audience}&limit=10`,
        { headers: actorHeaders },
      )
      assert.equal(redactedReplay.json.events.length, 1)
      assert.equal(redactedReplay.json.events[0].event_type, "step16.synthetic.redaction_probe")
      assert.equal(redactedReplay.json.redaction_applied, true)
      assertStudentPayloadIsSafe(redactedReplay.json)
    }

    const beforeGapSequence = await maxEventSequence(pool, sessionId)
    const gapSequence = beforeGapSequence + 2
    await appendSyntheticReplayProbe(pool, {
      institutionId: INSTITUTION_ID,
      userId: STUDENT_USER_ID,
      sessionId,
      eventType: "step16.synthetic.gap_probe",
      sequence: gapSequence,
      payload: {
        safe_note: "synthetic gap probe",
      },
    })
    const gapReplay = await requestJson(
      baseUrl,
      `/api/v1/simulation-sessions/${sessionId}/replay?after_sequence=${beforeGapSequence}&audience=student&limit=10`,
      { headers: actorHeaders },
    )
    assert.equal(gapReplay.json.gap_detected, true)
    assert.equal(gapReplay.json.snapshot_required, true)
    assert.equal(gapReplay.json.duplicate_count, 0)
    assert.equal(gapReplay.json.events[0].sequence, gapSequence)
    assertUnique(gapReplay.json.events.map((event) => event.sequence))

    await assert.rejects(
      () =>
        insertDuplicateSequenceProbe(pool, {
          institutionId: INSTITUTION_ID,
          userId: STUDENT_USER_ID,
          sessionId,
          sequence: gapSequence,
        }),
      /event_log_stream_sequence_uq|duplicate key value|23505/i,
    )

    const beforeSseEventCount = await eventCount(pool, sessionId)
    const sse = await requestText(baseUrl, `/api/v1/simulation-sessions/${sessionId}/events/stream?audience=student`, {
      headers: actorHeaders,
    })
    assert.equal(sse.status, 200)
    assert.match(sse.text, /replay_event/)
    assert.match(sse.text, /replay_complete/)
    assert.match(sse.text, /delivery_control_not_domain_event/)
    assertStudentPayloadIsSafe(sse.text)
    assert.equal(await eventCount(pool, sessionId), beforeSseEventCount)

    const indexes = await verifiedIndexNames(pool)
    assert.equal(indexes.includes("event_log_stream_sequence_uq"), true)
    assert.equal(indexes.includes("idempotency_keys_lookup_uq"), true)
    assert.equal(indexes.includes("outbox_events_event_topic_uq"), true)
  } finally {
    if (app) {
      await app.close()
    }
    await pool.end()
  }
})

function assertSafeTestDatabase() {
  const connectionString = process.env.CLINMIRA_TEST_DATABASE_URL
  assert.ok(connectionString, "CLINMIRA_TEST_DATABASE_URL is required for Step 16 DB-backed evidence")

  const parsed = new URL(connectionString)
  const database = parsed.pathname.replace(/^\//, "")
  assert.equal(parsed.hostname, "127.0.0.1")
  assert.equal(parsed.port, "55432")
  assert.equal(database, "clinmira_ai_step16_test")
  assert.equal(/prod|production|stage|staging/i.test(database), false)

  process.env.CLINMIRA_DATABASE_URL = connectionString

  return {
    connectionString,
    host: parsed.hostname,
    port: parsed.port,
    database,
  }
}

async function startNestApp() {
  installTypeScriptRequireHook()
  require("reflect-metadata")
  const { NestFactory } = require("@nestjs/core")
  const { AppModule } = require(join(apiRoot, "src", "app.module.ts"))
  const app = await NestFactory.create(AppModule, { logger: false })
  await app.listen(0, "127.0.0.1")
  return {
    app,
    baseUrl: await app.getUrl(),
  }
}

function installTypeScriptRequireHook() {
  if (tsHookInstalled) {
    return
  }

  const ts = require("typescript")
  const cjsModule = require("node:module")
  const originalResolveFilename = cjsModule._resolveFilename

  cjsModule._resolveFilename = function resolveClinMiraContracts(request, parent, isMain, options) {
    if (request === "@clinmira/contracts") {
      return sharedContractsIndex
    }

    return originalResolveFilename.call(this, request, parent, isMain, options)
  }

  require.extensions[".ts"] = function compileTypeScript(module, filename) {
    const source = readFileSync(filename, "utf8")
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      fileName: filename,
    }).outputText

    module._compile(output, filename)
  }

  tsHookInstalled = true
}

async function verifyDatabaseFoundation(pool) {
  const connection = await pool.query("select current_database() as db, current_user as app_user")
  assert.equal(connection.rows[0].db, "clinmira_ai_step16_test")
  assert.equal(connection.rows[0].app_user, "clinmira_ai_test_user")

  const extension = await pool.query("select extname from pg_extension where extname = 'pgcrypto'")
  assert.equal(extension.rowCount, 1)

  const migrations = await pool.query(
    "select version, success from schema_migrations where version = any($1::text[]) order by version",
    [["0001", "0002", "0003", "0004", "0005"]],
  )
  assert.deepEqual(
    migrations.rows.map((row) => `${row.version}:${row.success}`),
    ["0001:true", "0002:true", "0003:true", "0004:true", "0005:true"],
  )

  const tables = await pool.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name
    `,
    [REQUIRED_TABLES],
  )
  assert.deepEqual(
    tables.rows.map((row) => row.table_name).sort(),
    [...REQUIRED_TABLES].sort(),
  )
}

async function verifySeedBaseline(pool) {
  const counts = await pool.query(
    `
      select
        (select count(*) from institutions)::int as institutions,
        (select count(*) from users)::int as users,
        (select count(*) from roles)::int as roles,
        (select count(*) from cases)::int as cases,
        (select count(*) from case_versions)::int as case_versions,
        (select count(*) from patient_twins)::int as patient_twins,
        (select count(*) from patient_personas)::int as patient_personas,
        (select count(*) from fact_ledger)::int as fact_ledger,
        (select count(*) from fact_ledger where visibility = 'baseline_visible')::int as baseline_visible_facts,
        (select count(*) from fact_ledger where visibility = 'hidden_until_revealed')::int as hidden_until_revealed_facts,
        (select count(*) from fact_reveal_rules)::int as fact_reveal_rules,
        (select count(*) from fact_access_policies)::int as fact_access_policies,
        (select count(*) from safety_rules where enabled = true)::int as safety_rules
    `,
  )
  const row = counts.rows[0]

  for (const [name, value] of Object.entries(row)) {
    assert.ok(Number(value) >= 1, `${name} seed count must be at least 1`)
  }
  assert.ok(Number(row.safety_rules) >= 14)

  const seedContext = await pool.query(
    `
      select
        cv.id as case_version_id,
        pt.id as patient_twin_id,
        pp.id as patient_persona_id,
        fl.fact_id as allergy_fact_id,
        rr.id as reveal_rule_id
      from case_versions cv
      join patient_twins pt on pt.institution_id = cv.institution_id and pt.case_version_id = cv.id
      join patient_personas pp on pp.institution_id = pt.institution_id and pp.patient_twin_id = pt.id
      join fact_ledger fl on fl.institution_id = cv.institution_id and fl.case_version_id = cv.id
      join fact_reveal_rules rr on rr.institution_id = fl.institution_id and rr.fact_id = fl.fact_id
      where cv.id = $1
        and fl.fact_id = $2
        and fl.visibility = 'hidden_until_revealed'
        and rr.rule_type = 'ask_directly'
        and rr.active = true
      limit 1
    `,
    [SEED_CASE_VERSION_ID, SEED_ALLERGY_FACT_ID],
  )
  assert.equal(seedContext.rowCount, 1)
}

async function ensureRuntimeValidSyntheticContext(pool) {
  await pool.query("begin")

  try {
    await pool.query(
      `
        insert into institutions (id, name, slug, status, settings)
        values (
          $1,
          'ClinMira Step 16 Evidence Tenant',
          'clinmira-step16-evidence',
          'active',
          '{"seed":"step16-evidence-only","synthetic":true}'::jsonb
        )
        on conflict (slug) do update
        set name = excluded.name,
            status = excluded.status,
            settings = excluded.settings,
            updated_at = now()
      `,
      [INSTITUTION_ID],
    )

    await pool.query(
      `
        insert into users (id, institution_id, email, name, status, profile)
        values
          (
            $1,
            $3,
            'step16.student@example.edu',
            'Step 16 Synthetic Student',
            'active',
            '{"seed":"step16-evidence-only","synthetic":true,"persona":"student"}'::jsonb
          ),
          (
            $2,
            $3,
            'step16.other@example.edu',
            'Step 16 Synthetic Other User',
            'active',
            '{"seed":"step16-evidence-only","synthetic":true,"persona":"faculty"}'::jsonb
          )
        on conflict (institution_id, email) do update
        set name = excluded.name,
            status = excluded.status,
            profile = excluded.profile,
            updated_at = now()
      `,
      [STUDENT_USER_ID, WRONG_STUDENT_USER_ID, INSTITUTION_ID],
    )

    await pool.query(
      `
        insert into cases (
          id,
          institution_id,
          title,
          slug,
          specialty,
          difficulty,
          status,
          created_by_user_id,
          summary
        )
        values (
          $1,
          $2,
          'Step 16 Synthetic Runtime Case',
          'step16-synthetic-runtime-case',
          'general_dentistry',
          'introductory',
          'draft',
          $3,
          '{"seed":"step16-evidence-only","synthetic":true}'::jsonb
        )
        on conflict (institution_id, slug) do update
        set title = excluded.title,
            specialty = excluded.specialty,
            difficulty = excluded.difficulty,
            status = excluded.status,
            created_by_user_id = excluded.created_by_user_id,
            summary = excluded.summary,
            updated_at = now()
      `,
      [CASE_ID, INSTITUTION_ID, WRONG_STUDENT_USER_ID],
    )

    await pool.query(
      `
        insert into case_versions (
          id,
          institution_id,
          case_id,
          version,
          status,
          title,
          student_summary,
          faculty_summary,
          learning_objectives,
          expected_reasoning_path,
          source_hash,
          created_by_user_id
        )
        values (
          $1,
          $2,
          $3,
          1,
          'draft',
          'Step 16 Synthetic Runtime Case v1',
          'Synthetic Step 16 evidence case for backend route/runtime validation only.',
          'Synthetic-only Step 16 evidence fixture.',
          '["Verify backend-owned replay and safety evidence"]'::jsonb,
          '[]'::jsonb,
          'sha256:step16-synthetic-runtime-case-v1',
          $4
        )
        on conflict (case_id, version) do update
        set status = excluded.status,
            title = excluded.title,
            student_summary = excluded.student_summary,
            faculty_summary = excluded.faculty_summary,
            learning_objectives = excluded.learning_objectives,
            expected_reasoning_path = excluded.expected_reasoning_path,
            source_hash = excluded.source_hash,
            created_by_user_id = excluded.created_by_user_id,
            updated_at = now()
      `,
      [CASE_VERSION_ID, INSTITUTION_ID, CASE_ID, WRONG_STUDENT_USER_ID],
    )

    await pool.query(
      `
        update cases
        set current_version_id = $3,
            updated_at = now()
        where institution_id = $1
          and id = $2
      `,
      [INSTITUTION_ID, CASE_ID, CASE_VERSION_ID],
    )

    await pool.query(
      `
        insert into patient_twins (
          id,
          institution_id,
          case_version_id,
          display_name,
          age_years,
          sex,
          chief_complaint,
          baseline_state,
          synthetic_profile
        )
        values (
          $1,
          $2,
          $3,
          'Step 16 Synthetic Patient',
          34,
          'unspecified',
          'Mild mouth discomfort during a simulated intake exercise.',
          '{"seed":"step16-evidence-only","synthetic":true,"session_state_not_started":true}'::jsonb,
          '{"seed":"step16-evidence-only","synthetic_only":true}'::jsonb
        )
        on conflict (case_version_id) do update
        set display_name = excluded.display_name,
            age_years = excluded.age_years,
            sex = excluded.sex,
            chief_complaint = excluded.chief_complaint,
            baseline_state = excluded.baseline_state,
            synthetic_profile = excluded.synthetic_profile,
            updated_at = now()
      `,
      [PATIENT_TWIN_ID, INSTITUTION_ID, CASE_VERSION_ID],
    )

    await pool.query(
      `
        insert into patient_personas (
          id,
          institution_id,
          patient_twin_id,
          communication_style,
          health_literacy,
          reliability,
          anxiety_level,
          trust_level,
          traits,
          non_verbal_cues
        )
        values (
          $1,
          $2,
          $3,
          'neutral',
          'typical',
          'reliable',
          25,
          55,
          '{"seed":"step16-evidence-only","synthetic":true}'::jsonb,
          '{"seed":"step16-evidence-only","synthetic":true}'::jsonb
        )
        on conflict (patient_twin_id) do update
        set communication_style = excluded.communication_style,
            health_literacy = excluded.health_literacy,
            reliability = excluded.reliability,
            anxiety_level = excluded.anxiety_level,
            trust_level = excluded.trust_level,
            traits = excluded.traits,
            non_verbal_cues = excluded.non_verbal_cues,
            updated_at = now()
      `,
      [PATIENT_PERSONA_ID, INSTITUTION_ID, PATIENT_TWIN_ID],
    )

    await pool.query(
      `
        insert into fact_ledger (
          fact_id,
          institution_id,
          case_version_id,
          fact_key,
          fact_type,
          clinical_domain,
          visibility,
          source_type,
          content,
          student_safe_summary,
          faculty_notes,
          confidence,
          faculty_approved,
          approved_by_user_id,
          approved_at,
          reveal_rule_required,
          created_by_user_id
        )
        values
          (
            $1,
            $3,
            $4,
            'step16_chief_complaint_visible',
            'chief_complaint',
            'general_dentistry',
            'baseline_visible',
            'synthetic_seed',
            '{"statement":"Mild mouth discomfort during a simulated intake exercise.","seed":"step16-evidence-only","synthetic":true}'::jsonb,
            'Mild mouth discomfort during a simulated intake exercise.',
            'Synthetic Step 16 baseline fact.',
            1.000,
            true,
            $5,
            now(),
            false,
            $5
          ),
          (
            $2,
            $3,
            $4,
            'step16_allergy_latex_hidden',
            'allergy',
            'general_dentistry',
            'hidden_until_revealed',
            'synthetic_seed',
            '{"allergen":"latex","reaction":"rash in this synthetic scenario","seed":"step16-evidence-only","synthetic":true}'::jsonb,
            null,
            'Hidden until an allowed direct question/reveal rule is satisfied.',
            1.000,
            true,
            $5,
            now(),
            true,
            $5
          )
        on conflict (case_version_id, fact_key) do update
        set fact_type = excluded.fact_type,
            clinical_domain = excluded.clinical_domain,
            visibility = excluded.visibility,
            source_type = excluded.source_type,
            content = excluded.content,
            student_safe_summary = excluded.student_safe_summary,
            faculty_notes = excluded.faculty_notes,
            confidence = excluded.confidence,
            faculty_approved = excluded.faculty_approved,
            approved_by_user_id = excluded.approved_by_user_id,
            approved_at = excluded.approved_at,
            reveal_rule_required = excluded.reveal_rule_required,
            created_by_user_id = excluded.created_by_user_id,
            updated_at = now()
      `,
      [BASELINE_FACT_ID, ALLERGY_FACT_ID, INSTITUTION_ID, CASE_VERSION_ID, WRONG_STUDENT_USER_ID],
    )

    await pool.query(
      `
        insert into fact_reveal_rules (
          id,
          institution_id,
          case_version_id,
          fact_id,
          rule_key,
          rule_type,
          rule_config,
          priority,
          active
        )
        values (
          $1,
          $2,
          $3,
          $4,
          'step16_ask_about_allergies',
          'ask_directly',
          '{"student_action":"ask_allergies","allowed_surface":"orchestrator_policy"}'::jsonb,
          10,
          true
        )
        on conflict (fact_id, rule_key) do update
        set rule_type = excluded.rule_type,
            rule_config = excluded.rule_config,
            priority = excluded.priority,
            active = excluded.active,
            updated_at = now()
      `,
      [REVEAL_RULE_ID, INSTITUTION_ID, CASE_VERSION_ID, ALLERGY_FACT_ID],
    )

    await pool.query(
      `
        insert into fact_access_policies (
          id,
          institution_id,
          case_version_id,
          fact_id,
          fact_type,
          visibility,
          actor_scope,
          access_level,
          policy_reason,
          active
        )
        values
          (
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
            $1,
            $2,
            null,
            null,
            'hidden_until_revealed',
            'student_payload',
            'deny',
            'Student-visible payloads must not receive hidden facts before an allowed reveal.',
            true
          ),
          (
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
            $1,
            $2,
            null,
            null,
            'hidden_until_revealed',
            'persona_agent',
            'deny',
            'Persona context must not receive broad hidden fact access.',
            true
          ),
          (
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
            $1,
            $2,
            $3,
            'allergy',
            'hidden_until_revealed',
            'safety_agent',
            'allowed_for_safety',
            'Safety-specific access may use restricted allergy facts without student exposure.',
            true
          )
        on conflict (id) do update
        set fact_id = excluded.fact_id,
            fact_type = excluded.fact_type,
            visibility = excluded.visibility,
            actor_scope = excluded.actor_scope,
            access_level = excluded.access_level,
            policy_reason = excluded.policy_reason,
            active = excluded.active,
            updated_at = now()
      `,
      [INSTITUTION_ID, CASE_VERSION_ID, ALLERGY_FACT_ID],
    )

    await pool.query("commit")
  } catch (error) {
    await pool.query("rollback")
    throw error
  }
}

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
  const text = await response.text()
  const json = text ? JSON.parse(text) : undefined
  const expectedStatus = options.expectedStatus ?? 200

  assert.equal(response.status, expectedStatus, `${options.method ?? "GET"} ${path} returned ${response.status}: ${text}`)

  return { response, json, text }
}

async function requestText(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: options.headers ?? {},
  })
  return {
    status: response.status,
    text: await response.text(),
  }
}

async function sessionCounts(pool, sessionId) {
  const result = await pool.query(
    `
      select
        (select count(*) from simulation_sessions where id = $1)::int as sessions,
        (select count(*) from session_revealed_facts where session_id = $1)::int as revealed_facts,
        (select count(*) from clinical_actions where session_id = $1)::int as actions,
        (select count(*) from conversation_messages where session_id = $1)::int as messages,
        (select count(*) from timeline_events where session_id = $1)::int as timeline_events,
        (select count(*) from session_state_snapshots where session_id = $1)::int as snapshots,
        (select count(*) from event_log where stream_type = 'simulation_session' and stream_id = $1)::int as event_log,
        (
          select count(*)
          from outbox_events ob
          join event_log ev on ev.institution_id = ob.institution_id and ev.id = ob.event_id
          where ev.stream_type = 'simulation_session'
            and ev.stream_id = $1
        )::int as outbox_events
    `,
    [sessionId],
  )

  return camelizeCounts(result.rows[0])
}

async function safetyCounts(pool, sessionId, actionId) {
  const result = await pool.query(
    `
      select
        (select count(*) from safety_evaluations where session_id = $1 and clinical_action_id = $2)::int as evaluations,
        (
          select count(*)
          from safety_findings sf
          join safety_evaluations se on se.institution_id = sf.institution_id and se.id = sf.safety_evaluation_id
          where se.session_id = $1
            and se.clinical_action_id = $2
        )::int as findings,
        (select count(*) from session_revealed_facts where session_id = $1 and revealed_by_action_id = $2)::int as revealed_by_blocked_action,
        (
          select count(*)
          from clinical_actions
          where session_id = $1
            and action_type in ('order_attempt', 'diagnosis_attempt', 'treatment_attempt')
            and status not in ('received', 'blocked_unsupported', 'failed')
        )::int as unsafe_accepted_actions
    `,
    [sessionId, actionId],
  )

  return camelizeCounts(result.rows[0])
}

async function maxEventSequence(pool, sessionId) {
  const result = await pool.query(
    `
      select coalesce(max(sequence), 0)::int as max_sequence
      from event_log
      where institution_id = $1
        and stream_type = 'simulation_session'
        and stream_id = $2
    `,
    [INSTITUTION_ID, sessionId],
  )

  return Number(result.rows[0].max_sequence)
}

async function eventCount(pool, sessionId) {
  const result = await pool.query(
    `
      select count(*)::int as event_count
      from event_log
      where institution_id = $1
        and stream_type = 'simulation_session'
        and stream_id = $2
    `,
    [INSTITUTION_ID, sessionId],
  )

  return Number(result.rows[0].event_count)
}

async function appendSyntheticReplayProbe(pool, input) {
  const result = await pool.query(
    `
      insert into event_log (
        institution_id,
        stream_type,
        stream_id,
        aggregate_type,
        aggregate_id,
        sequence,
        event_type,
        schema_version,
        producer,
        actor_user_id,
        payload,
        payload_classification,
        replayable,
        redaction_status
      )
      values (
        $1,
        'simulation_session',
        $2,
        'simulation_session',
        $2,
        $3,
        $4,
        'simulation-session-event.v1',
        'api-bff.step16-evidence-test',
        $5,
        $6::jsonb,
        'student_safe',
        true,
        'contains_restricted_fields'
      )
      returning sequence::int as sequence
    `,
    [
      input.institutionId,
      input.sessionId,
      input.sequence,
      input.eventType,
      input.userId,
      JSON.stringify({
        ...input.payload,
        event_source: "step16_db_backed_evidence_test",
      }),
    ],
  )

  return Number(result.rows[0].sequence)
}

async function insertDuplicateSequenceProbe(pool, input) {
  await pool.query(
    `
      insert into event_log (
        institution_id,
        stream_type,
        stream_id,
        aggregate_type,
        aggregate_id,
        sequence,
        event_type,
        schema_version,
        producer,
        actor_user_id,
        payload,
        payload_classification,
        replayable,
        redaction_status
      )
      values (
        $1,
        'simulation_session',
        $2,
        'simulation_session',
        $2,
        $3,
        'step16.synthetic.duplicate_sequence_probe',
        'simulation-session-event.v1',
        'api-bff.step16-evidence-test',
        $4,
        '{"safe_note":"duplicate sequence probe"}'::jsonb,
        'student_safe',
        true,
        'role_filtered'
      )
    `,
    [input.institutionId, input.sessionId, input.sequence, input.userId],
  )
}

async function verifiedIndexNames(pool) {
  const result = await pool.query(
    `
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname = any($1::text[])
      order by indexname
    `,
    [["event_log_stream_sequence_uq", "idempotency_keys_lookup_uq", "outbox_events_event_topic_uq"]],
  )

  return result.rows.map((row) => row.indexname)
}

function camelizeCounts(row) {
  return {
    sessions: Number(row.sessions),
    revealedFacts: Number(row.revealed_facts),
    actions: Number(row.actions),
    messages: Number(row.messages),
    timelineEvents: Number(row.timeline_events),
    snapshots: Number(row.snapshots),
    eventLog: Number(row.event_log),
    outboxEvents: Number(row.outbox_events),
    evaluations: Number(row.evaluations),
    findings: Number(row.findings),
    revealedByBlockedAction: Number(row.revealed_by_blocked_action),
    unsafeAcceptedActions: Number(row.unsafe_accepted_actions),
  }
}

function assertUuid(value) {
  assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
}

function assertEventTypes(events, expectedTypes) {
  const eventTypes = new Set(events.map((event) => event.event_type))
  for (const expectedType of expectedTypes) {
    assert.equal(eventTypes.has(expectedType), true, `${expectedType} missing from replay events`)
  }
}

function assertUnique(values) {
  assert.equal(new Set(values).size, values.length)
}

function assertStudentPayloadIsSafe(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value)
  for (const marker of FORBIDDEN_STUDENT_MARKERS) {
    assert.equal(serialized.includes(marker), false, `student-visible payload leaked ${marker}`)
  }
}
