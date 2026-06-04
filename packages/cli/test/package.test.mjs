import assert from "node:assert/strict"
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import vm from "node:vm"
import { readFileSync } from "node:fs"

import packageJson from "../package.json" with { type: "json" }

const packageRoot = path.resolve(import.meta.dirname, "..")
const launcher = path.join(packageRoot, "bin", "interbase.cjs")

function runLauncherScenario({ arch = "x64", cpuInfo = "", existingPaths = [], lddText = "", platform = "linux" }) {
  const source = readFileSync(launcher, "utf8").replace(/^#!.*\n/, "")
  const script = new vm.Script(`(function(require, process, __filename, console) { ${source}\n})`)
  const exits = []
  const errors = []
  const spawns = []
  const existing = new Set(existingPaths)
  const fn = script.runInNewContext({})

  const mockFs = {
    existsSync(target) {
      if (target === "/etc/alpine-release") return lddText.includes("musl")
      if (target.endsWith("node_modules")) return true
      return existing.has(target)
    },
    readFileSync(target) {
      if (target === "/proc/cpuinfo") return cpuInfo
      throw new Error(`unexpected readFileSync: ${target}`)
    },
    realpathSync(target) {
      return target
    },
  }
  const mockChildProcess = {
    spawnSync(command, args) {
      spawns.push([command, ...args])
      if (command === "ldd") return { status: 0, stdout: lddText, stderr: "" }
      if (command === "sysctl") return { status: 0, stdout: "0", stderr: "" }
      if (String(command).endsWith("interbase") || String(command).endsWith("interbase.exe")) {
        return { status: 0, stdout: "", stderr: "" }
      }
      return { status: 1, stdout: "", stderr: "" }
    },
  }
  const mockProcess = {
    argv: [process.execPath, launcher, "--version"],
    env: {},
    exit(code) {
      exits.push(code)
      throw new Error(`EXIT:${code}`)
    },
  }
  const mockConsole = {
    error(value) {
      errors.push(String(value))
    },
  }

  try {
    fn(
      (specifier) => {
        if (specifier === "child_process") return mockChildProcess
        if (specifier === "fs") return mockFs
        if (specifier === "os") return { arch: () => arch, platform: () => platform }
        if (specifier === "path") return path
        throw new Error(`unexpected require: ${specifier}`)
      },
      mockProcess,
      launcher,
      mockConsole,
    )
  } catch (error) {
    if (!String(error.message).startsWith("EXIT:")) throw error
  }

  return { errors, exits, spawns }
}

test("package metadata owns the public wrapper identity", () => {
  assert.equal(packageJson.name, "interbase")
  assert.equal(packageJson.private, undefined)
  assert.equal(packageJson.bin.interbase, "./bin/interbase.cjs")
  assert.deepEqual(packageJson.files, [
    "bin/interbase.cjs",
    "postinstall.mjs",
    "LICENSE",
    "NOTICE",
    "THIRD_PARTY_NOTICES.md",
    "README.md",
  ])
  assert.equal(packageJson.exports, undefined)
  assert.ok(!packageJson.files.includes("src"))
  assert.ok(!packageJson.files.includes("test"))
})

test("wrapper intentionally does not publish host deep imports", () => {
  assert.equal(packageJson.exports, undefined)
  assert.ok(packageJson.files.every((file) => !file.startsWith("src")))
})

test("launcher passes argv through INTERBASE_BIN_PATH and preserves exit code", () => {
  const root = mkdtempSync(path.join(tmpdir(), "interbase-cli-wrapper-"))
  try {
    const target = path.join(root, "interbase-target.sh")
    writeFileSync(
      target,
      "#!/bin/sh\nprintf 'stdout:%s\\n' \"$1\"\nprintf 'stderr:%s\\n' \"$2\" 1>&2\nexit 17\n",
      "utf8",
    )
    chmodSync(target, 0o755)
    const result = spawnSync(process.execPath, [launcher, "one", "two"], {
      encoding: "utf8",
      env: { ...process.env, INTERBASE_BIN_PATH: target },
    })

    assert.equal(result.status, 17)
    assert.match(result.stdout, /stdout:one/)
    assert.match(result.stderr, /stderr:two/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test("launcher reports missing native package candidates", () => {
  const result = runLauncherScenario({})

  assert.deepEqual(result.exits, [1])
  assert.match(result.errors[0], /failed to install the right version of the interbase CLI/i)
  assert.match(result.errors[0], /interbase-(darwin|linux|windows)-/i)
})

test("launcher prefers musl and baseline candidates in the documented order", () => {
  const result = runLauncherScenario({
    arch: "x64",
    cpuInfo: "flags : sse4_2",
    lddText: "musl libc",
  })

  assert.deepEqual(result.exits, [1])
  assert.match(
    result.errors[0],
    /"interbase-linux-x64-baseline-musl" or "interbase-linux-x64-musl" or "interbase-linux-x64-baseline" or "interbase-linux-x64"/,
  )
})

test("launcher prefers baseline before glibc and musl fallbacks on non-avx2 linux x64", () => {
  const result = runLauncherScenario({
    arch: "x64",
    cpuInfo: "flags : sse4_2",
    lddText: "glibc 2.39",
  })

  assert.deepEqual(result.exits, [1])
  assert.match(
    result.errors[0],
    /"interbase-linux-x64-baseline" or "interbase-linux-x64" or "interbase-linux-x64-baseline-musl" or "interbase-linux-x64-musl"/,
  )
})
