#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const root = path.resolve(new URL("../..", import.meta.url).pathname)
const workflowPath = path.join(root, ".github", "workflows", "public-ci.yml")

if (!existsSync(workflowPath)) {
  console.log("CI workflow validation skipped: .github/workflows/public-ci.yml is not present.")
  process.exit(0)
}

const workflow = readFileSync(workflowPath, "utf8")

const requiredSnippets = [
  "validate:",
  "package-dry-run:",
  "pure-plugin-mode:",
  "isolated-public-checkout:",
  "release-prep-dry-run:",
  "- run: bun run validate",
  "- run: bun run test:pure-plugin-mode",
  "- run: bun run check:isolated-public-checkout",
  "- run: bun run release:cli:prepare -- --version 0.0.1",
  "- run: bun run release:cli:verify",
]

const forbiddenSnippets = ["packages/opencode", "bun run --cwd packages/opencode"]

const failures = []
for (const snippet of requiredSnippets) {
  if (!workflow.includes(snippet)) failures.push(`public-ci workflow is missing required snippet: ${snippet}`)
}
for (const snippet of forbiddenSnippets) {
  if (workflow.includes(snippet)) failures.push(`public-ci workflow still contains stale snippet: ${snippet}`)
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("CI workflow validation passed.")
