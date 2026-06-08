import assert from "node:assert/strict"
import { basename, join, relative, sep } from "node:path"

const composeFileNames = new Set(["docker-compose.yml", "docker-compose.yaml"])
const allowedComposeRelativePath = join("docker", "clinmira-ai", "docker-compose.yml").split(sep).join("/")

function relativeRepoPath(repoRoot, filePath) {
  return relative(repoRoot, filePath).split(sep).join("/")
}

export function dockerComposeFiles(repoFiles, repoRoot) {
  return repoFiles
    .filter((filePath) => composeFileNames.has(basename(filePath)))
    .map((filePath) => relativeRepoPath(repoRoot, filePath))
    .sort()
}

export function assertNoForbiddenDockerComposeFile(repoFiles, repoRoot) {
  const forbiddenMatches = dockerComposeFiles(repoFiles, repoRoot).filter((filePath) => filePath !== allowedComposeRelativePath)
  assert.deepEqual(forbiddenMatches, [])
}

export function assertOnlyApprovedDockerComposeFile(repoFiles, repoRoot) {
  assert.deepEqual(dockerComposeFiles(repoFiles, repoRoot), [allowedComposeRelativePath])
}
