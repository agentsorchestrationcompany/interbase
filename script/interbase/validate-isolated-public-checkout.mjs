#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readlinkSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const rootSkip = new Set([
  ".git",
  ".sst",
  ".turbo",
  ".vscode",
  ".worktrees",
  "artifacts",
  "coverage",
  "dist",
  "node_modules",
  "opencode-dev",
  "playground",
  "refs",
  "result",
  "target",
  "tmp",
])
const directorySkip = new Set(["coverage", "dist", "node_modules", "ts-dist"])
const fileSkip = new Set(["tsconfig.tsbuildinfo"])

function parseArgs(argv) {
  const args = { keep: false }
  for (const value of argv) {
    if (value === "--keep") args.keep = true
  }
  return args
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/")
}

function shouldSkip(source) {
  const rel = relative(source)
  const base = path.basename(source)
  if (!rel || rel === ".") return false
  if (!rel.includes("/") && rootSkip.has(base)) return true
  if (fileSkip.has(base)) return true
  const info = lstatSync(source)
  if (info.isDirectory() && directorySkip.has(base)) return true
  if (rel.endsWith(".bun-build")) return true
  return false
}

function copyTree(source, destination) {
  const info = lstatSync(source)
  if (shouldSkip(source)) return
  if (info.isDirectory()) {
    mkdirSync(destination, { recursive: true })
    for (const entry of readdirSync(source)) copyTree(path.join(source, entry), path.join(destination, entry))
    return
  }
  if (info.isSymbolicLink()) {
    const target = readlinkSync(source)
    const resolvedTarget = path.resolve(path.dirname(source), target)
    const relativeTarget = path.relative(repoRoot, resolvedTarget)
    if (path.isAbsolute(target) || relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
      throw new Error(`${relative(source)}: isolated public checkout must not rely on external symlinks`)
    }
    mkdirSync(path.dirname(destination), { recursive: true })
    cpSync(source, destination, { dereference: false })
    return
  }
  if (!info.isFile()) return
  mkdirSync(path.dirname(destination), { recursive: true })
  cpSync(source, destination, { dereference: false })
}

function commandEnv(home) {
  const keep = ["BUN_INSTALL", "CI", "LANG", "LC_ALL", "PATH", "SHELL", "TMPDIR"]
  const cache = path.join(home, ".cache")
  const config = path.join(home, ".config")
  const data = path.join(home, ".local", "share")
  return Object.fromEntries(
    keep
      .flatMap((name) => {
        const value = process.env[name]
        return typeof value === "string" && value.length > 0 ? [[name, value]] : []
      })
      .concat([
        ["BUN_INSTALL_CACHE_DIR", path.join(cache, "bun-install")],
        ["HOME", home],
        ["NPM_CONFIG_USERCONFIG", path.join(home, ".npmrc")],
        ["XDG_CACHE_HOME", cache],
        ["XDG_CONFIG_HOME", config],
        ["XDG_DATA_HOME", data],
        ["npm_config_userconfig", path.join(home, ".npmrc")],
      ]),
  )
}

function run(command, args, cwd, home) {
  const result = spawnSync(command, args, {
    cwd,
    env: commandEnv(home),
    stdio: "inherit",
    encoding: "utf8",
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}`)
}

const args = parseArgs(process.argv.slice(2))
const isolatedParent = mkdtempSync(path.join(tmpdir(), "interbase-public-checkout-"))
const isolatedRoot = path.join(isolatedParent, "interbase")
const isolatedHome = path.join(isolatedParent, "home")

try {
  mkdirSync(isolatedHome, { recursive: true })
  copyTree(repoRoot, isolatedRoot)
  run("git", ["init", "--quiet"], isolatedRoot, isolatedHome)
  run("bun", ["install", "--frozen-lockfile"], isolatedRoot, isolatedHome)
  run("bun", ["run", "validate"], isolatedRoot, isolatedHome)
  console.log(`Isolated public checkout validation passed at ${isolatedRoot}.`)
} finally {
  if (args.keep) {
    console.log(`Kept isolated checkout at ${isolatedRoot}.`)
  } else {
    rmSync(isolatedParent, { force: true, recursive: true })
  }
}
