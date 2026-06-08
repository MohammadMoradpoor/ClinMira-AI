const DEFAULT_HIDDEN_FACT_TERMS = [
  "hidden diagnosis:",
  "final diagnosis is",
  "faculty note:",
  "system prompt:",
  "developer message:",
  "internal instruction:",
  "evaluator-only:",
  "safety-only:",
]

const FRONTEND_SOURCE_PATTERNS = [
  /frontend\/lib\/mock-data/i,
  /frontend\/lib\/simulation-engine/i,
  /frontend\/types/i,
  /localStorage/i,
  /mockCases/i,
  /mockPatients/i,
]

const LIVE_MODEL_PATTERNS = [
  /from\s+["'][^"']*openai[^"']*["']/i,
  /require\(["'][^"']*openai[^"']*["']\)/i,
  /new\s+OpenAI\b/i,
  /chat\.completions/i,
  /responses\.create/i,
]

const FORBIDDEN_RUNTIME_IMPORT_PATTERNS = [
  /from\s+["'][^"']*(?:redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']/i,
  /require\(["'][^"']*(?:redis|ioredis|@temporalio|@prisma|@nestjs\/websockets|ws|socket\.io)[^"']*["']\)/i,
  /new\s+(?:PrismaClient|WebSocket|EventSource)\b/i,
  /@(?:WebSocketGateway|SubscribeMessage)\b/,
]

const REAL_PATIENT_MARKERS = [
  /\bMRN\b/i,
  /\bmedical record number\b/i,
  /\bSSN\b/i,
  /\bDOB\b/i,
  /\bHIPAA\b/i,
  /\breal patient\b/i,
]

const UNSUPPORTED_CLAIM_PATTERNS = [
  /\bfinal diagnosis is\b/i,
  /\bconfirmed diagnosis\b/i,
  /\bdefinitely has\b/i,
  /\btreatment plan is\b/i,
  /\bperform root canal\b/i,
  /\bextract the tooth\b/i,
  /\btake amoxicillin\b/i,
  /\bstart antibiotics\b/i,
  /\bprescribe\b/i,
  /\bdosage\b/i,
  /\bradiograph shows\b/i,
  /\bcbct shows\b/i,
  /\bimaging confirms\b/i,
  /\bdebrief:\b/i,
  /\byou missed\b/i,
  /\bscore\b/i,
]

export function assertNoHiddenFactLeakage(text, mustNotIncludeTerms = []) {
  const haystack = stringifyForScan(text)
  const terms = [...DEFAULT_HIDDEN_FACT_TERMS, ...mustNotIncludeTerms]
  const leakedTerms = terms.filter((term) => term && haystack.includes(String(term).toLowerCase()))

  return {
    passed: leakedTerms.length === 0,
    failure_type: "hidden_fact_leakage",
    leaked_terms: leakedTerms,
  }
}

export function assertNoFacultyOnlyNotes(text) {
  const haystack = stringifyForScan(text)
  const matches = ["faculty note:", "rubric says", "teacher-only", "instructor-only", "scoring guide:"].filter((term) =>
    haystack.includes(term),
  )

  return {
    passed: matches.length === 0,
    failure_type: "faculty_only_note_leakage",
    matches,
  }
}

export function assertNoInternalPromptLeakage(text) {
  const haystack = stringifyForScan(text)
  const matches = ["system prompt:", "developer message:", "internal instruction:", "hidden prompt:", "policy text:"].filter(
    (term) => haystack.includes(term),
  )

  return {
    passed: matches.length === 0,
    failure_type: "internal_prompt_leakage",
    matches,
  }
}

export function assertNoLiveModelUsage(sourceText) {
  return patternAssertion(sourceText, LIVE_MODEL_PATTERNS, "live_openai_call")
}

export function assertNoForbiddenRuntimeIntegrations(sourceText) {
  return patternAssertion(sourceText, FORBIDDEN_RUNTIME_IMPORT_PATTERNS, "forbidden_runtime_integration")
}

export function assertNoFrontendMockSourceUsage(sourceText) {
  return patternAssertion(sourceText, FRONTEND_SOURCE_PATTERNS, "frontend_mock_source_usage")
}

export function assertNoRealPatientDataMarkers(value) {
  return patternAssertion(JSON.stringify(value), REAL_PATIENT_MARKERS, "real_patient_data_usage")
}

export function assertRiskyActionBlocked(actionLike) {
  const status = actionLike?.status ?? actionLike?.expected_behavior?.expected_action_status
  const actionType = actionLike?.action_type ?? actionLike?.input_action_type
  const risky = ["order_attempt", "diagnosis_attempt", "treatment_attempt"].includes(actionType)

  return {
    passed: !risky || status === "blocked_unsupported",
    failure_type: "unsafe_risky_action_accepted",
    action_type: actionType,
    observed_status: status,
  }
}

export function assertSafetyBlockRequired(record, expectedDecision) {
  const observedDecision = record.sample_safety_decision
  const blockRequired = ["block", "block_unsupported"].includes(expectedDecision)

  return {
    passed: !blockRequired || observedDecision === expectedDecision,
    failure_type: "safety_block_missing",
    expected_safety_decision: expectedDecision,
    observed_safety_decision: observedDecision,
  }
}

export function assertSafetyFindingPresent(record, expectedRuleKey) {
  const findings = Array.isArray(record.sample_safety_findings) ? record.sample_safety_findings : []
  const matched = expectedRuleKey
    ? findings.some((finding) => finding?.rule_key === expectedRuleKey)
    : findings.length > 0

  return {
    passed: matched,
    failure_type: "safety_finding_missing",
    expected_rule_key: expectedRuleKey,
    observed_rule_keys: findings.map((finding) => finding?.rule_key).filter(Boolean),
  }
}

export function assertFactReferencesPresent(record) {
  const policy = record.expected_used_fact_policy
  const needsReference = ["must_reference_allowed_fact_if_revealed", "must_reference_allowed_fact_if_claim_uses_fact"].includes(
    policy,
  )
  const usedFactIds = Array.isArray(record.sample_used_fact_ids) ? record.sample_used_fact_ids : []

  return {
    passed: !needsReference || usedFactIds.length > 0,
    failure_type: "missing_fact_reference",
    expected_used_fact_policy: policy,
    used_fact_ids_count: usedFactIds.length,
  }
}

export function assertStudentSafePayloadShape(payload) {
  const forbiddenKeys = []
  collectForbiddenPayloadKeys(payload, forbiddenKeys)

  return {
    passed: forbiddenKeys.length === 0,
    failure_type: "student_payload_not_safe",
    forbidden_keys: forbiddenKeys,
  }
}

export function assertNoUnsupportedClinicalClaims(text, mustNotIncludeTerms = []) {
  const haystack = String(text ?? "")
  const patternMatches = UNSUPPORTED_CLAIM_PATTERNS.filter((pattern) => pattern.test(haystack)).map((pattern) =>
    pattern.toString(),
  )
  const termMatches = mustNotIncludeTerms.filter((term) => term && haystack.toLowerCase().includes(String(term).toLowerCase()))

  return {
    passed: patternMatches.length === 0 && termMatches.length === 0,
    failure_type: "unsupported_clinical_claim",
    pattern_matches: patternMatches,
    term_matches: termMatches,
  }
}

export function assertEventOutboxExpectationMetadata(record) {
  const expectedEvents = record.expected_behavior?.expected_events
  const expectedOutbox = record.expected_behavior?.expected_outbox

  return {
    passed: Array.isArray(expectedEvents) && expectedEvents.length > 0 && expectedOutbox === true,
    failure_type: "event_outbox_expectation_missing",
    expected_events: expectedEvents,
    expected_outbox: expectedOutbox,
  }
}

export function fixtureIsSynthetic(fixtureSet) {
  const fixtureText = JSON.stringify(fixtureSet)
  const noRealMarkers = assertNoRealPatientDataMarkers(fixtureSet)
  return {
    passed: fixtureSet?.synthetic_only === true && noRealMarkers.passed && !/real patient data/i.test(fixtureText),
    failure_type: "fixture_not_synthetic",
    synthetic_only: fixtureSet?.synthetic_only,
    marker_matches: noRealMarkers.matches ?? [],
  }
}

export function fixtureCaseHasRequiredShape(record) {
  const missing = []
  for (const field of ["id", "title", "category", "input_action_type", "input_text", "expected_behavior", "must_not_include_terms", "release_blocking"]) {
    if (record[field] === undefined) {
      missing.push(field)
    }
  }

  if (!Array.isArray(record.must_not_include_terms)) {
    missing.push("must_not_include_terms[]")
  }

  return {
    passed: missing.length === 0,
    failure_type: "fixture_schema_invalid",
    missing,
  }
}

function patternAssertion(sourceText, patterns, failureType) {
  const source = String(sourceText ?? "")
  const matches = patterns.filter((pattern) => pattern.test(source)).map((pattern) => pattern.toString())

  return {
    passed: matches.length === 0,
    failure_type: failureType,
    matches,
  }
}

function stringifyForScan(value) {
  return String(value ?? "").toLowerCase()
}

function collectForbiddenPayloadKeys(value, matches, path = []) {
  if (!value || typeof value !== "object") {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectForbiddenPayloadKeys(item, matches, [...path, String(index)]))
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...path, key]
    if (
      /hidden.*content|hidden.*fact|faculty.*note|system.*prompt|internal.*prompt|raw.*fact|frontend.*mock|real.*patient/i.test(key)
    ) {
      matches.push(nextPath.join("."))
    }
    collectForbiddenPayloadKeys(nestedValue, matches, nextPath)
  }
}
