import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const apiRoot = join(import.meta.dirname, "..")

function read(relativePath) {
  return readFileSync(join(apiRoot, relativePath), "utf8")
}

test("student replay only allows public/student-safe events or sanitized safety events", () => {
  const redaction = read("src/replay/replay-redaction.ts")

  assert.match(redaction, /STUDENT_CLASSIFICATIONS/)
  assert.match(redaction, /"public", "student_safe"/)
  assert.match(redaction, /classification === "safety_restricted" && isSafetyEvent/)
  assert.match(redaction, /classification: audience === "student" \? "student_safe" : "safety_restricted"/)
  assert.match(redaction, /studentSafeSafetyPayload/)
})

test("redaction removes hidden facts, faculty notes, prompts, provider traces, API keys, and secrets", () => {
  const redaction = read("src/replay/replay-redaction.ts")

  for (const forbidden of [
    "apikey",
    "answerkey",
    "debrieftargets",
    "evaluatoronly",
    "facultyonlynotes",
    "facultynotes",
    "hiddendiagnosis",
    "hiddenfact",
    "hiddenfacts",
    "internalprompt",
    "providersecret",
    "providertrace",
    "rawfactcontent",
    "rubric",
    "safetyonly",
    "scoring",
    "systemprompt",
    "toolsecret",
    "tracepayload",
  ]) {
    assert.match(redaction, new RegExp(forbidden, "i"), `${forbidden} redaction marker missing`)
  }

  assert.match(redaction, /FORBIDDEN_TEXT_PATTERNS/)
  assert.match(redaction, /\[redacted\]/)
  assert.match(redaction, /normalized\.includes\("secret"\)/)
})

test("revealed facts are sanitized to references only", () => {
  const redaction = read("src/replay/replay-redaction.ts")

  assert.match(redaction, /sanitizeRevealedFactReferences/)
  assert.match(redaction, /fact_id/)
  assert.match(redaction, /reveal_rule_id/)
  assert.match(redaction, /revealed_by_action_id/)
  assert.match(redaction, /revealed_to/)
  assert.match(redaction, /reveal_reason/)
  assert.doesNotMatch(redaction, /reference\[key\][\s\S]{0,120}content/i)
})

test("faculty and system audiences still get restricted metadata instead of raw restricted payloads", () => {
  const redaction = read("src/replay/replay-redaction.ts")

  assert.match(redaction, /FACULTY_CLASSIFICATIONS/)
  assert.match(redaction, /SYSTEM_CLASSIFICATIONS/)
  assert.match(redaction, /restricted_event: true/)
  assert.match(redaction, /source_classification: row\.payload_classification/)
})
