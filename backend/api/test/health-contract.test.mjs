import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"

const repoRoot = join(import.meta.dirname, "..", "..", "..")

test("health schema is the skeleton health contract", () => {
  const schema = JSON.parse(
    readFileSync(join(repoRoot, "shared/contracts/schemas/health-response.schema.json"), "utf8"),
  )

  assert.equal(schema.title, "HealthCheckResponseDto")
  assert.equal(schema.$id, "https://clinmira.ai/contracts/health-check-response.v1.schema.json")
  assert.equal(schema.properties.contract_version.const, "health-check-response.v1")
  assert.deepEqual(schema.properties.service.enum, ["api-bff", "agent-worker"])
})

test("skeleton feature flags require risky features to be disabled", () => {
  const schema = JSON.parse(
    readFileSync(join(repoRoot, "shared/contracts/schemas/feature-flags.schema.json"), "utf8"),
  )

  for (const flag of schema.required) {
    assert.equal(schema.properties[flag].const, false)
  }
})
