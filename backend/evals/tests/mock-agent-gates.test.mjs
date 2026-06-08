import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

import { runInitialEval } from "../lib/eval-runner.mjs"

const repoRoot = join(import.meta.dirname, "..", "..", "..")

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

test("live-agent gate remains blocked after mock-agent skeleton", () => {
  const result = runInitialEval({ writeResult: false })

  assert.equal(result.status, "PASSED")
  assert.match(result.live_agent_gate_status, /^blocked_/)
})

test("mock Persona context firewall rejects hidden and restricted facts", () => {
  const firewall = read("backend/agent-worker/src/clinmira_agent_worker/context_firewall.py")
  const runtime = read("backend/agent-worker/src/clinmira_agent_worker/runtime.py")

  for (const visibility of ["hidden_until_revealed", "faculty_only", "safety_only", "evaluator_only"]) {
    assert.match(firewall, new RegExp(`"${visibility}"`, "i"), `${visibility} rejection missing`)
  }
  assert.match(firewall, /Persona Agent cannot receive fact visibility/i)
  assert.match(runtime, /validate_agent_context\(request\.agent_name, request\.context\)/)
})
