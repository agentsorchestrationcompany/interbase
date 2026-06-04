#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

const root = path.resolve(new URL("../..", import.meta.url).pathname)
const readIfPresent = (relativePath) => {
  const fullPath = path.join(root, relativePath)
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : null
}

const files = {
  rootReadme: readIfPresent("README.md"),
  packageReadme: readFileSync(path.join(root, "packages/cli/README.md"), "utf8"),
  installationSource: readFileSync(path.join(root, "packages/cli-host/src/installation/index.ts"), "utf8"),
  uninstallSource: readFileSync(path.join(root, "packages/cli-host/src/cli/cmd/uninstall.ts"), "utf8"),
}

const requiredSnippets = [
  { file: "packageReadme", text: "npm install -g interbase" },
  { file: "packageReadme", text: "bun install -g interbase" },
  { file: "packageReadme", text: "pnpm install -g interbase" },
  { file: "packageReadme", text: "yarn global add interbase" },
  { file: "packageReadme", text: "scoop install interbase" },
  { file: "packageReadme", text: "choco install interbase" },
  { file: "packageReadme", text: "npm uninstall -g interbase" },
  { file: "packageReadme", text: "pnpm uninstall -g interbase" },
  { file: "packageReadme", text: "bun remove -g interbase" },
  { file: "packageReadme", text: "yarn global remove interbase" },
  { file: "packageReadme", text: "brew install agentsorchestrationcompany/homebrew-tap/interbase" },
  { file: "packageReadme", text: "brew uninstall interbase" },
  { file: "packageReadme", text: "scoop uninstall interbase" },
  { file: "packageReadme", text: "choco uninstall interbase" },
  { file: "installationSource", text: "export const NpmPackageName = InterbaseOverlay.release.npmPackage" },
  { file: "installationSource", text: "export const HomebrewTapRepository = InterbaseOverlay.release.homebrewTap" },
  { file: "uninstallSource", text: "npm: `npm uninstall -g ${Installation.NpmPackageName}`" },
  { file: "uninstallSource", text: "pnpm: `pnpm uninstall -g ${Installation.NpmPackageName}`" },
  { file: "uninstallSource", text: "bun: `bun remove -g ${Installation.NpmPackageName}`" },
  { file: "uninstallSource", text: "yarn: `yarn global remove ${Installation.NpmPackageName}`" },
  { file: "uninstallSource", text: 'brew: "brew uninstall interbase"' },
  { file: "uninstallSource", text: 'scoop: "scoop uninstall interbase"' },
  { file: "uninstallSource", text: 'choco: "choco uninstall interbase"' },
]

if (files.rootReadme) {
  requiredSnippets.unshift(
    { file: "rootReadme", text: "brew install agentsorchestrationcompany/homebrew-tap/interbase" },
    { file: "rootReadme", text: "bun install -g interbase" },
    { file: "rootReadme", text: "npm install -g interbase" },
  )
}

const failures = requiredSnippets
  .filter((entry) => !files[entry.file]?.includes(entry.text))
  .map((entry) => `${entry.file} is missing required install-consistency text: ${entry.text}`)

if (!files.packageReadme.includes("agentsorchestrationcompany/interbase"))
  failures.push("packages/cli/README.md must reference the public source/support repository")
if (!files.packageReadme.includes("agentsorchestrationcompany/interbase"))
  failures.push("packages/cli/README.md must reference the public release repository")
if (!files.packageReadme.includes("interbase"))
  failures.push("packages/cli/README.md must reference the interbase binary name")

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("Docs install consistency validation passed.")
