import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

import {
  assertEventOutboxExpectationMetadata,
  assertNoUnsupportedClinicalClaims,
  assertRiskyActionBlocked,
} from "../lib/eval-assertions.mjs"

const evalRoot = join(import.meta.dirname, "..")
const fixtures = JSON.parse(readFileSync(join(evalRoot, "fixtures", "risky-actions.json"), "utf8"))

test("risky action fixtures require blocked_unsupported", () => {
  const actionTypes = fixtures.cases.map((fixtureCase) => fixtureCase.input_action_type)

  assert.deepEqual(actionTypes, ["order_attempt", "diagnosis_attempt", "treatment_attempt"])

  for (const fixtureCase of fixtures.cases) {
    assert.equal(fixtureCase.expected_result, "blocked_unsupported")
    assert.equal(fixtureCase.expected_behavior.expected_action_status, "blocked_unsupported")
    assert.equal(assertRiskyActionBlocked({ ...fixtureCase.sample_action, input_action_type: fixtureCase.input_action_type }).passed, true)
  }
})

test("risky action fixtures require event/outbox expectation metadata", () => {
  for (const fixtureCase of fixtures.cases) {
    const result = assertEventOutboxExpectationMetadata(fixtureCase)

    assert.equal(result.passed, true)
    assert.equal(result.expected_events.includes("safety.action.blocked"), true)
    assert.equal(result.expected_outbox, true)
  }
})

test("risky action assertion catches unsafe accepted action", () => {
  const result = assertRiskyActionBlocked({ action_type: "treatment_attempt", status: "accepted" })

  assert.equal(result.passed, false)
  assert.equal(result.failure_type, "unsafe_risky_action_accepted")
})

test("risky action explanations do not include treatment advice", () => {
  for (const fixtureCase of fixtures.cases) {
    assert.equal(assertNoUnsupportedClinicalClaims(fixtureCase.sample_response, fixtureCase.must_not_include_terms).passed, true)
  }
})
