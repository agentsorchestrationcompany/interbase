import { describe, expect, test } from "bun:test"
import { mkdirSync, rmSync, symlinkSync } from "node:fs"
import path from "node:path"
import {
  InvalidDatabaseOverrideError,
  InvalidSerializedRuntimeContextError,
  RelativePathError,
  SandboxEscapeError,
  absolutePath,
  assertRuntimePathAccess,
  configFilePath,
  createCliRuntimeTestHarness,
  createTestRuntimeContext,
  databaseFilePath,
  databaseTargetForInput,
  deserializeCliRuntimeContext,
  logFilePath,
  parseCliRuntimeEnvironment,
  serializeCliRuntimeContext,
  stateFilePath,
  subprocessEnvForCliRuntimeContext,
  tempFilePath,
  withCliRuntimeTestEnv,
} from "../src/index.js"

const testHome = path.join("/tmp", "interbase-home")

describe("runtime path authority", () => {
  test("requires absolute authority paths", () => {
    expect(() => absolutePath("relative/path")).toThrow(RelativePathError)
  })

  test("creates test paths under the sandbox without filesystem side effects", () => {
    const root = path.join(import.meta.dir, ".tmp", "sandbox-a")
    const context = createTestRuntimeContext(root)

    expect(context.mode).toBe("test")
    expect(context.databaseTarget.kind).toBe("memory")
    expect(context.launchdPolicy.kind).toBe("disabled")
    expect(String(context.paths.state)).toBe(path.join(root, "state", "interbase"))
  })

  test("constructs branded child file paths from branded directories", () => {
    const context = createTestRuntimeContext(path.join(import.meta.dir, ".tmp", "sandbox-b"))

    expect(stateFilePath(context.paths, "state.json")).toEndWith(path.join("state", "interbase", "state.json"))
    expect(configFilePath(context.paths, "config.json")).toEndWith(path.join("config", "interbase", "config.json"))
    expect(logFilePath(context.paths, "runtime.log")).toEndWith(path.join("share", "interbase", "log", "runtime.log"))
    expect(tempFilePath(context.paths, "work.tmp")).toEndWith(path.join("tmp", "work.tmp"))
  })

  test("rejects lexical child path escapes", () => {
    const context = createTestRuntimeContext(path.join(import.meta.dir, ".tmp", "sandbox-c"))

    expect(() => stateFilePath(context.paths, "../escape.json")).toThrow(SandboxEscapeError)
  })

  test("checks reads and writes against test sandbox", () => {
    const context = createTestRuntimeContext(path.join(import.meta.dir, ".tmp", "sandbox-d"))

    assertRuntimePathAccess(context.accessPolicy, stateFilePath(context.paths, "ok.json"), "read")
    expect(() =>
      assertRuntimePathAccess(context.accessPolicy, absolutePath("/tmp/interbase-escape.json"), "write"),
    ).toThrow(SandboxEscapeError)
  })

  test("rejects nonexistent targets under symlinked sandbox parents", () => {
    const root = path.join(import.meta.dir, ".tmp", "sandbox-symlink")
    const outside = path.join(import.meta.dir, ".tmp", "sandbox-symlink-outside")
    rmSync(root, { force: true, recursive: true })
    rmSync(outside, { force: true, recursive: true })
    mkdirSync(root, { recursive: true })
    mkdirSync(outside, { recursive: true })
    symlinkSync(outside, path.join(root, "linked"), "dir")

    try {
      const context = createTestRuntimeContext(root)

      expect(() =>
        assertRuntimePathAccess(
          context.accessPolicy,
          absolutePath(path.join(root, "linked", "new-state.json")),
          "write",
        ),
      ).toThrow(SandboxEscapeError)
    } finally {
      rmSync(root, { force: true, recursive: true })
      rmSync(outside, { force: true, recursive: true })
    }
  })
})

describe("environment parsing", () => {
  test("preserves production XDG layout", () => {
    const context = parseCliRuntimeEnvironment({
      HOME: testHome,
      XDG_DATA_HOME: "/xdg/data",
      XDG_CACHE_HOME: "/xdg/cache",
      XDG_CONFIG_HOME: "/xdg/config",
      XDG_STATE_HOME: "/xdg/state",
      INTERBASE_LAUNCHD_DISABLED: "1",
    })

    expect(String(context.paths.data)).toBe("/xdg/data/interbase")
    expect(String(context.paths.cache)).toBe("/xdg/cache/interbase")
    expect(String(context.paths.config)).toBe("/xdg/config/interbase")
    expect(String(context.paths.state)).toBe("/xdg/state/interbase")
    expect(context.databaseTarget.kind).toBe("channel")
  })

  test("preserves INTERBASE_DB override semantics", () => {
    const memory = parseCliRuntimeEnvironment({ HOME: testHome, INTERBASE_DB: ":memory:" })
    const absolute = parseCliRuntimeEnvironment({ HOME: testHome, INTERBASE_DB: "/tmp/interbase-test.db" })
    const relative = parseCliRuntimeEnvironment({
      HOME: testHome,
      XDG_DATA_HOME: "/xdg/data",
      INTERBASE_DB: "custom.db",
    })

    expect(memory.databaseTarget.kind).toBe("memory")
    expect(absolute.databaseTarget.kind).toBe("file")
    expect(absolute.databaseTarget.kind === "file" ? absolute.databaseTarget.path : "").toBe("/tmp/interbase-test.db")
    expect(relative.databaseTarget.kind === "file" ? relative.databaseTarget.path : "").toBe(
      "/xdg/data/interbase/custom.db",
    )
    expect(() => parseCliRuntimeEnvironment({ HOME: testHome, INTERBASE_DB: "../escape.db" })).toThrow(
      InvalidDatabaseOverrideError,
    )
  })

  test("preserves config override inside test sandbox", () => {
    const root = path.join(import.meta.dir, ".tmp", "sandbox-config")
    const config = path.join(root, "override-config")
    const context = parseCliRuntimeEnvironment({
      INTERBASE_CONFIG_DIR: config,
      INTERBASE_TEST_SANDBOX_ROOT: root,
    })

    expect(context.mode).toBe("test")
    expect(String(context.paths.config)).toBe(config)
  })

  test("constructs database paths without creating them", () => {
    const context = createTestRuntimeContext(path.join(import.meta.dir, ".tmp", "sandbox-e"))

    expect(databaseFilePath(context.paths, { kind: "channel", channel: "nightly" })).toEndWith("interbase-nightly.db")
  })

  test("creates explicit channel database targets", () => {
    const context = parseCliRuntimeEnvironment({ HOME: testHome, XDG_DATA_HOME: "/xdg/data" })
    const target = databaseTargetForInput(context.paths, undefined, "canary")

    expect(target.kind).toBe("channel")
    expect(target.kind === "channel" ? target.path : "").toBe("/xdg/data/interbase/interbase-canary.db")
  })
})

describe("serialization", () => {
  test("round trips through plain strings and rebrands on deserialize", () => {
    const context = createTestRuntimeContext(path.join(import.meta.dir, ".tmp", "sandbox-f"))
    const serialized = serializeCliRuntimeContext(context)
    const deserialized = deserializeCliRuntimeContext(serialized)

    expect(serialized.version).toBe(1)
    expect(deserialized).toEqual(context)
  })

  test("rejects mismatched serialized mode and policy", () => {
    const context = createTestRuntimeContext(path.join(import.meta.dir, ".tmp", "sandbox-g"))
    const serialized = { ...serializeCliRuntimeContext(context), accessPolicy: { kind: "production" as const } }

    expect(() => deserializeCliRuntimeContext(serialized)).toThrow(InvalidSerializedRuntimeContextError)
  })

  test("projects subprocess env from typed context", () => {
    const context = createTestRuntimeContext(path.join(import.meta.dir, ".tmp", "sandbox-h"))
    const env = subprocessEnvForCliRuntimeContext(context)

    expect(env.INTERBASE_TEST_SANDBOX_ROOT).toBe(path.join(import.meta.dir, ".tmp", "sandbox-h"))
    expect(env.INTERBASE_DB).toBe(":memory:")
    expect(env.INTERBASE_LAUNCHD_DISABLED).toBe("1")
  })
})

describe("test harness", () => {
  test("creates isolated typed helpers and restores env", () => {
    const previousSandbox = process.env.INTERBASE_TEST_SANDBOX_ROOT
    const harness = createCliRuntimeTestHarness({ root: path.join(import.meta.dir, ".tmp", "harness") })

    try {
      expect(String(harness.root)).toBe(path.join(import.meta.dir, ".tmp", "harness"))
      expect(harness.context.launchdPolicy.kind).toBe("disabled")
      expect(harness.stateFilePath("state.json")).toEndWith(path.join("state", "interbase", "state.json"))
      expect(harness.databaseFilePath("state.db")).toEndWith(path.join("share", "interbase", "state.db"))

      withCliRuntimeTestEnv(harness, () => {
        expect(process.env.INTERBASE_TEST_SANDBOX_ROOT).toBe(String(harness.root))
        expect(process.env.INTERBASE_DB).toBe(":memory:")
      })

      expect(process.env.INTERBASE_TEST_SANDBOX_ROOT).toBe(previousSandbox)
    } finally {
      harness.cleanup()
    }
  })
})
