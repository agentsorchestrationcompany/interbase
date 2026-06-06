#!/usr/bin/env node

import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const scriptRepoRoot = path.resolve(scriptDir, "..", "..")
const repoRoot = process.argv[2] ? path.resolve(scriptRepoRoot, process.argv[2]) : scriptRepoRoot
const wrapperRoot = path.join(repoRoot, "packages", "cli")
const wrapperBin = path.join(wrapperRoot, "bin", "interbase")
const hostBin = path.join(repoRoot, "packages", "cli-host", "bin", "interbase")
const helperSourceRoot = path.join(repoRoot, "native", "macos", "InterbaseComputerUseHelper")
const helperBundle = path.join(repoRoot, "native", "macos", "InterbaseComputerUseHelper.app")
const helperBundleScript = path.join(helperSourceRoot, "scripts", "build-app-bundle.sh")

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    stdio: "inherit",
    env: options.env ? { ...process.env, ...options.env } : process.env,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function renderLauncher(target, env = {}) {
  return [
    "#!/usr/bin/env node",
    "import { spawnSync } from 'node:child_process'",
    `const target = ${JSON.stringify(target)}`,
    `const env = { ...process.env, ...${JSON.stringify(env)} }`,
    "const result = spawnSync(target, process.argv.slice(2), { stdio: 'inherit', env })",
    "if (result.error) {",
    "  console.error(result.error.message)",
    "  process.exit(1)",
    "}",
    "process.exit(result.status ?? 0)",
    "",
  ].join("\n")
}

function buildComputerUseHelperIfAvailable() {
  if (process.platform !== "darwin") return undefined
  if (!existsSync(helperBundleScript)) return undefined

  run("bash", [helperBundleScript, helperBundle])
  if (!existsSync(helperBundle)) throw new Error(`Missing computer-use helper app after build at ${helperBundle}`)
  return helperBundle
}

run("npm", ["run", "build:cli"], { env: { INTERBASE_CHANNEL: process.env.INTERBASE_CHANNEL ?? "main" } })
const builtHelperBundle = buildComputerUseHelperIfAvailable()

if (!existsSync(hostBin)) throw new Error(`Missing public CLI host binary at ${hostBin}`)
mkdirSync(path.dirname(wrapperBin), { recursive: true })
writeFileSync(
  wrapperBin,
  renderLauncher(
    hostBin,
    builtHelperBundle
      ? {
          INTERBASE_COMPUTER_USE_HELPER_PATH: builtHelperBundle,
          INTERBASE_COMPUTER_USE_ALLOW_UNTRUSTED_DRIVER: "1",
        }
      : {},
  ),
  "utf8",
)
chmodSync(wrapperBin, 0o755)

run("npm", ["link"], { cwd: wrapperRoot })
console.log(`Linked local public interbase CLI to ${hostBin}`)
if (builtHelperBundle) console.log(`Linked local computer-use helper to ${builtHelperBundle}`)
