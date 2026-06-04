#!/usr/bin/env node

import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, "..", "..")
const wrapperRoot = path.join(repoRoot, "packages", "cli")
const wrapperBin = path.join(wrapperRoot, "bin", "interbase")
const hostBin = path.join(repoRoot, "packages", "cli-host", "bin", "interbase")

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: "inherit",
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function renderLauncher(target) {
  return [
    "#!/usr/bin/env node",
    "import { spawnSync } from 'node:child_process'",
    `const target = ${JSON.stringify(target)}`,
    "const result = spawnSync(target, process.argv.slice(2), { stdio: 'inherit' })",
    "if (result.error) {",
    "  console.error(result.error.message)",
    "  process.exit(1)",
    "}",
    "process.exit(result.status ?? 0)",
    "",
  ].join("\n")
}

run("npm", ["run", "build:cli"])

if (!existsSync(hostBin)) throw new Error(`Missing public CLI host binary at ${hostBin}`)
mkdirSync(path.dirname(wrapperBin), { recursive: true })
writeFileSync(wrapperBin, renderLauncher(hostBin), "utf8")
chmodSync(wrapperBin, 0o755)

run("npm", ["link"], { cwd: wrapperRoot })
console.log(`Linked local public interbase CLI to ${hostBin}`)
