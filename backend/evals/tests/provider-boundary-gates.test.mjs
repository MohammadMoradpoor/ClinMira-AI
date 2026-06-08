import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8")
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath))
}

test("provider boundary fake-provider fixture is synthetic and live-free", () => {
  const fixturePath = join(repoRoot, "backend", "evals", "fixtures", "provider-boundary.json")
  const fixture = readJson("backend/evals/fixtures/provider-boundary.json")

  assert.equal(existsSync(fixturePath), true)
  assert.equal(fixture.fixture_id, "clinmira-provider-boundary-gates.v1")
  assert.equal(fixture.created_for_step, "Step 14")
  assert.equal(fixture.synthetic_only, true)
  assert.equal(fixture.requires_live_model, false)
  assert.equal(fixture.requires_openai, false)
  assert.equal(fixture.provider_boundary_type, "fake_test_double_only")
  assert.equal(fixture.cases.length, 3)
})

test("provider boundary source exposes only fake test-double scaffolding", () => {
  const boundary = read("backend/agent-worker/src/clinmira_agent_worker/provider_boundary.py")
  const fakeProvider = read("backend/agent-worker/src/clinmira_agent_worker/provider_fake.py")
  const guards = read("backend/agent-worker/src/clinmira_agent_worker/provider_guards.py")
  const liveProvider = read("backend/agent-worker/src/clinmira_agent_worker/live_model_provider.py")

  assert.match(boundary, /class ProviderRequest/)
  assert.match(boundary, /class ProviderResponse/)
  assert.match(boundary, /class ProviderError/)
  assert.match(fakeProvider, /class FakeProvider/)
  assert.match(guards, /validate_provider_request/)
  assert.match(liveProvider, /class DisabledLiveModelProvider/)
  assert.doesNotMatch(`${boundary}\n${fakeProvider}\n${guards}`, /Responses API adapter|Agents SDK adapter|model routing/i)
})

test("provider boundary source has no live provider calls or network imports", () => {
  const combined = [
    "provider_boundary.py",
    "provider_fake.py",
    "provider_guards.py",
    "provider_schema.py",
    "provider_trace.py",
    "live_model_provider.py",
  ]
    .map((fileName) => read(`backend/agent-worker/src/clinmira_agent_worker/${fileName}`))
    .join("\n")

  assert.doesNotMatch(combined, /^\s*(?:from|import)\s+openai\b/im)
  assert.doesNotMatch(combined, /OpenAI\s*\(|responses\.create|chat\.completions/i)
  const providerSecretMarkers = [
    ["OPENAI", "API", "KEY"].join("_"),
    ["OPENAI", "ORG", "ID"].join("_"),
  ]
  for (const marker of providerSecretMarkers) {
    assert.equal(combined.includes(marker), false)
  }
  assert.doesNotMatch(combined, /^\s*(?:from|import)\s+(?:requests|httpx|aiohttp|urllib|socket)\b/im)
  assert.doesNotMatch(combined, /\b(?:fetch|urlopen|HTTPConnection|HTTPSConnection)\b/)
})
