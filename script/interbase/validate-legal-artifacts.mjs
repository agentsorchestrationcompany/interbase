#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const root = path.resolve(new URL("../..", import.meta.url).pathname)
const requiredFiles = [
  "LICENSE",
  "packages/cli/LICENSE",
  "packages/cli/NOTICE",
  "packages/cli-host/LICENSE",
  "packages/cli-host/NOTICE",
]

const failures = []
for (const relativePath of requiredFiles) {
  const fullPath = path.join(root, relativePath)
  if (!existsSync(fullPath) || !statSync(fullPath).isFile())
    failures.push(`Missing required legal artifact: ${relativePath}`)
}

const licenseText = readFileSync(path.join(root, "LICENSE"), "utf8")
if (!licenseText.includes("Copyright (c) 2025-2026 Agents Orchestration Company"))
  failures.push("LICENSE must include Agents Orchestration Company copyright attribution")
if (!licenseText.includes("Portions copyright (c) 2025 opencode"))
  failures.push("LICENSE must retain upstream OpenCode attribution for derived portions")

const hostLicense = readFileSync(path.join(root, "packages/cli-host/LICENSE"), "utf8")
if (!hostLicense.includes("Copyright (c) 2025-2026 Agents Orchestration Company"))
  failures.push("packages/cli-host/LICENSE must include Agents Orchestration Company copyright attribution")
if (!hostLicense.includes("Portions copyright (c) 2025 opencode"))
  failures.push("packages/cli-host/LICENSE must retain upstream OpenCode attribution for derived portions")

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("Legal artifact validation passed.")
