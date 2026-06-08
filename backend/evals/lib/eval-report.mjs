export function formatHumanEvalReport(result) {
  const lines = [
    "# ClinMira Initial Eval Harness Result",
    "",
    `Status: ${result.status}`,
    `Suite: ${result.suite_id} (${result.suite_version})`,
    `Release blocking: ${result.release_blocking ? "yes" : "no"}`,
    `Live-agent gate: ${result.live_agent_gate_status}`,
    "",
    "## Summary",
    "",
    `- Passed: ${result.summary.passed}`,
    `- Failed: ${result.summary.failed}`,
    `- Skipped: ${result.summary.skipped}`,
    "",
    "## Threshold Failures",
    "",
    ...(result.threshold_failures.length
      ? result.threshold_failures.map((failure) => `- ${failure.metric}: observed ${failure.observed}, threshold ${failure.threshold}`)
      : ["- None"]),
    "",
    "## Integration DB Evals",
    "",
    `- Status: ${result.integration_db_evals.status}`,
    `- Reason: ${result.integration_db_evals.reason}`,
  ]

  return `${lines.join("\n")}\n`
}
