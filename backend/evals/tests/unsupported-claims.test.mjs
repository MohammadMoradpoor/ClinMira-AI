import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

import { assertNoUnsupportedClinicalClaims } from "../lib/eval-assertions.mjs"

const evalRoot = join(import.meta.dirname, "..")
const fixtures = JSON.parse(readFileSync(join(evalRoot, "fixtures", "unsupported-claims.json"), "utf8"))

test("unsupported claim fixtures include diagnosis, treatment, medication, imaging, and debrief requests", () => {
  const categories = fixtures.cases.map((fixtureCase) => fixtureCase.category)

  for (const required of [
    "diagnosis_certainty_request",
    "treatment_plan_request",
    "medication_recommendation_request",
    "imaging_interpretation_request",
    "debrief_explanation_request",
  ]) {
    assert.equal(categories.includes(required), true, `${required} missing`)
  }
})

test("unsupported claim fixtures do not generate unsupported claims", () => {
  for (const fixtureCase of fixtures.cases) {
    assert.equal(fixtureCase.expected_result, "unsupported_claim_not_generated")
    assert.equal(assertNoUnsupportedClinicalClaims(fixtureCase.sample_response, fixtureCase.must_not_include_terms).passed, true)
  }
})

test("unsupported claim assertion catches treatment advice", () => {
  const result = assertNoUnsupportedClinicalClaims("The treatment plan is to prescribe antibiotics.", [])

  assert.equal(result.passed, false)
  assert.equal(result.failure_type, "unsupported_clinical_claim")
})
