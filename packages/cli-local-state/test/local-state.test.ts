import { chmod, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import {
  absolutePath,
  configFilePath,
  createCliRuntimeTestHarness,
  createTestRuntimeContext,
  stateFilePathFromAbsolute,
} from "@interbase/cli-runtime-context"
import {
  createJsonStateStore,
  createSyncJsonStateStore,
  LocalStateError,
  type JsonStateDefinition,
  type JsonStateSchema,
  type JsonValue,
} from "../src/index.js"

interface CounterState {
  items: string[]
  version: 1
}

const counterSchema: JsonStateSchema<CounterState> = {
  parse(value) {
    if (!isJsonObject(value)) throw new Error("invalid schema")
    if (value.version !== 1) throw new Error("unsupported version")
    if (!Array.isArray(value.items) || !value.items.every((item) => typeof item === "string")) {
      throw new Error("invalid schema")
    }
    return { items: [...value.items], version: 1 }
  },
}

const rawStringPath = "/tmp/state.json"
const rawStringStateDefinition: JsonStateDefinition<CounterState> = {
  accessPolicy: { kind: "production" },
  defaultValue: () => ({ items: [], version: 1 }),
  kind: "counter state",
  // @ts-expect-error local state path authority requires a branded StateFilePath.
  path: rawStringPath,
  recoverability: "failClosed",
  schema: counterSchema,
  version: 1,
}
void rawStringStateDefinition

const wrongBrandedPath = configFilePath(
  createTestRuntimeContext("/tmp/interbase-local-state-type-test").paths,
  "state.json",
)
const wrongBrandedStateDefinition: JsonStateDefinition<CounterState> = {
  accessPolicy: { kind: "production" },
  defaultValue: () => ({ items: [], version: 1 }),
  kind: "counter state",
  // @ts-expect-error local state path authority rejects non-state file brands.
  path: wrongBrandedPath,
  recoverability: "failClosed",
  schema: counterSchema,
  version: 1,
}
void wrongBrandedStateDefinition

describe("cli local JSON state", () => {
  test("missing files default and valid files decode", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    const store = counterStore(file, "failClosed")

    await expect(store.read()).resolves.toEqual({ items: [], version: 1 })
    await writeFile(file, `${JSON.stringify({ items: ["a"], version: 1 })}\n`)
    await expect(store.read()).resolves.toEqual({ items: ["a"], version: 1 })
    await rm(root, { force: true, recursive: true })
  })

  test("runtime policy checks reads as well as writes", async () => {
    const harness = createCliRuntimeTestHarness({ prefix: "interbase-local-state-policy-" })
    const outside = path.join(`${harness.root}-outside`, "interbase-local-state-outside.json")
    const store = createJsonStateStore<CounterState>({
      accessPolicy: harness.context.accessPolicy,
      defaultValue: () => ({ items: [], version: 1 }),
      kind: "counter state",
      path: stateFilePathFromAbsolute(outside),
      recoverability: "failClosed",
      schema: counterSchema,
      version: 1,
    })

    try {
      expect(() => absolutePath(outside)).not.toThrow()
      await expect(store.read()).rejects.toThrow("outside the configured test sandbox")
      await expect(store.write({ items: [], version: 1 })).rejects.toThrow("outside the configured test sandbox")
    } finally {
      harness.cleanup()
      await rm(outside, { force: true })
    }
  })

  test("empty and NUL-only files follow recovery policy", async () => {
    const root = createTestRoot()
    const failFile = path.join(root, "fail.json")
    const recoverFile = path.join(root, "recover.json")
    await writeFile(failFile, "")
    await writeFile(recoverFile, "\u0000\u0000")

    await expect(counterStore(failFile, "failClosed").read()).rejects.toMatchObject({
      kind: "counter state",
      operation: "read",
      path: failFile,
      reason: "invalidJson",
      recoverable: false,
    })
    await expect(counterStore(recoverFile, "quarantineAndDefault").read()).resolves.toEqual({ items: [], version: 1 })
    await rm(root, { force: true, recursive: true })
  })

  test("malformed and schema-invalid files fail closed or quarantine", async () => {
    const root = createTestRoot()
    const malformedFile = path.join(root, "malformed.json")
    const schemaFile = path.join(root, "schema.json")
    const recoverFile = path.join(root, "recover.json")
    await writeFile(malformedFile, "{")
    await writeFile(schemaFile, JSON.stringify({ items: [], version: 2 }))
    await writeFile(recoverFile, "{")

    await expect(counterStore(malformedFile, "failClosed").read()).rejects.toMatchObject({ reason: "invalidJson" })
    await expect(counterStore(schemaFile, "failClosed").read()).rejects.toMatchObject({ reason: "unsupportedVersion" })
    await expect(counterStore(recoverFile, "reconstructable").read()).resolves.toEqual({ items: [], version: 1 })
    expect((await readdir(root)).some((entry) => entry.startsWith("recover.json.corrupt."))).toBe(true)
    await rm(root, { force: true, recursive: true })
  })

  test("write validates, writes atomically, and applies modes", async () => {
    const root = createTestRoot()
    const file = path.join(root, "nested", "state.json")
    const store = counterStore(file, "failClosed")

    await store.write({ items: ["a"], version: 1 })
    expect(await store.read()).toEqual({ items: ["a"], version: 1 })
    expect(await readFile(file, "utf8")).toBe(`${JSON.stringify({ items: ["a"], version: 1 }, null, 2)}\n`)
    expect((await stat(path.dirname(file))).mode & 0o777).toBe(0o700)
    expect((await stat(file)).mode & 0o777).toBe(0o600)
    await rm(root, { force: true, recursive: true })
  })

  test("write rejects schema-invalid next state before persistence", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    const store = createJsonStateStore<{ items: string[]; version: number }>({
      accessPolicy: { kind: "production" },
      defaultValue: () => ({ items: [], version: 1 }),
      kind: "counter state",
      path: stateFilePathFromAbsolute(file),
      recoverability: "failClosed",
      schema: counterSchema,
      version: 1,
    })

    await expect(store.write({ items: [], version: 2 })).rejects.toMatchObject({
      operation: "write",
      reason: "unsupportedVersion",
    })
    await rm(root, { force: true, recursive: true })
  })

  test("update serializes concurrent in-process updates", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    const store = counterStore(file, "failClosed")

    await Promise.all(
      Array.from({ length: 20 }, (_value, index) =>
        store.update(async (current) => {
          await new Promise((resolve) => setTimeout(resolve, index % 3))
          return { items: [...current.items, `item-${index}`], version: 1 }
        }),
      ),
    )

    expect([...(await store.read()).items].sort()).toEqual(
      Array.from({ length: 20 }, (_value, index) => `item-${index}`).sort(),
    )
    await rm(root, { force: true, recursive: true })
  })

  test("temporary cleanup is bounded and safe", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    await mkdir(root, { recursive: true })
    for (let index = 0; index < 5; index += 1) {
      const tempPath = path.join(root, `.state.json.${index}.tmp`)
      await writeFile(tempPath, "stale")
      const stale = new Date(Date.now() - 60_000 - index)
      await utimes(tempPath, stale, stale)
    }
    await writeFile(path.join(root, ".other.json.1.tmp"), "other")

    await counterStore(file, "failClosed", { tempFileMaxAgeMs: 0, tempFileRetention: 2 }).write({
      items: [],
      version: 1,
    })

    const entries = await readdir(root)
    expect(entries.filter((entry) => entry.startsWith(".state.json.") && entry.endsWith(".tmp"))).toHaveLength(2)
    expect(entries).toContain(".other.json.1.tmp")
    await rm(root, { force: true, recursive: true })
  })

  test("quarantine filenames are collision-safe", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    const store = counterStore(file, "quarantineAndDefault")

    await writeFile(file, "{")
    await store.read()
    await writeFile(file, "{")
    await store.read()

    expect((await readdir(root)).filter((entry) => entry.startsWith("state.json.corrupt."))).toHaveLength(2)
    await rm(root, { force: true, recursive: true })
  })

  test("quarantine retention is bounded", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    const store = counterStore(file, "quarantineAndDefault", { quarantineRetention: 2 })

    for (let index = 0; index < 4; index += 1) {
      await writeFile(file, "{")
      await store.read()
    }

    expect((await readdir(root)).filter((entry) => entry.startsWith("state.json.corrupt."))).toHaveLength(2)
    await rm(root, { force: true, recursive: true })
  })

  test("advisory locks serialize multi-process policy and preserve live locks", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    const store = counterStore(file, "failClosed", { concurrency: "multiProcess", lockTimeoutMs: 60 })
    await mkdir(root, { recursive: true })
    await writeFile(`${file}.lock`, JSON.stringify({ pid: process.pid }))

    await expect(store.update((current) => current)).rejects.toMatchObject({ reason: "lockTimeout", recoverable: true })
    await rm(`${file}.lock`, { force: true })
    await expect(store.update((current) => ({ items: [...current.items, "a"], version: 1 }))).resolves.toEqual({
      items: ["a"],
      version: 1,
    })
    await rm(root, { force: true, recursive: true })
  })

  test("stale advisory locks are recovered only when owner is gone", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    const lockFile = `${file}.lock`
    const store = counterStore(file, "failClosed", { concurrency: "multiProcess" })
    await mkdir(root, { recursive: true })
    await writeFile(lockFile, JSON.stringify({ pid: 999_999_999 }))
    const stale = new Date(Date.now() - 60_000)
    await chmod(lockFile, 0o600)
    await utimes(lockFile, stale, stale)

    await expect(store.update((current) => ({ items: [...current.items, "recovered"], version: 1 }))).resolves.toEqual({
      items: ["recovered"],
      version: 1,
    })
    expect(await readFile(file, "utf8")).toContain("recovered")
    await rm(root, { force: true, recursive: true })
  })

  test("local state errors include stable details", async () => {
    const root = createTestRoot()
    const file = path.join(root, "state.json")
    await writeFile(file, "{")

    const error = await counterStore(file, "failClosed")
      .read()
      .catch((caught) => caught)
    expect(error).toBeInstanceOf(LocalStateError)
    expect(error.message).toBe(`Local state read failed for counter state at ${file}: invalid JSON.`)
    await rm(root, { force: true, recursive: true })
  })

  test("local state error messages cover all structured reasons", () => {
    const base = { kind: "counter state", operation: "read" as const, path: "/tmp/state.json", recoverable: false }
    expect(new LocalStateError({ ...base, reason: "notFound" }).message).toContain("not found")
    expect(new LocalStateError({ ...base, reason: "invalidSchema" }).message).toContain("invalid schema")
    expect(new LocalStateError({ ...base, reason: "lockTimeout", recoverable: true }).message).toContain("lock timeout")
    expect(new LocalStateError({ ...base, reason: "io" }).message).toContain("I/O error")
  })

  test("sync store matches async read write recovery and cleanup semantics", async () => {
    const root = createTestRoot("interbase-local-state-sync-")
    const file = path.join(root, "state.json")
    const store = syncCounterStore(file, "failClosed")

    expect(store.read()).toEqual({ items: [], version: 1 })
    store.write({ items: ["a"], version: 1 })
    expect(store.read()).toEqual({ items: ["a"], version: 1 })
    expect(store.update((current) => ({ items: [...current.items, "b"], version: 1 }))).toEqual({
      items: ["a", "b"],
      version: 1,
    })
    expect((await stat(file)).mode & 0o777).toBe(0o600)

    await writeFile(file, "{")
    expect(() => store.read()).toThrow(LocalStateError)
    await writeFile(file, "{")
    expect(syncCounterStore(file, "quarantineAndDefault").read()).toEqual({ items: [], version: 1 })
    expect((await readdir(root)).some((entry) => entry.startsWith("state.json.corrupt."))).toBe(true)

    const retainedStore = syncCounterStore(file, "quarantineAndDefault", { quarantineRetention: 1 })
    await writeFile(file, "{")
    expect(retainedStore.read()).toEqual({ items: [], version: 1 })
    await writeFile(file, "{")
    expect(retainedStore.read()).toEqual({ items: [], version: 1 })
    expect((await readdir(root)).filter((entry) => entry.startsWith("state.json.corrupt."))).toHaveLength(1)

    await writeFile(file, "\u0000")
    expect(syncCounterStore(file, "quarantineAndDefault").read()).toEqual({ items: [], version: 1 })
    await writeFile(file, JSON.stringify({ items: [], version: 2 }))
    expect(() => store.read()).toThrow(LocalStateError)
    expect(() =>
      createSyncJsonStateStore<{ items: string[]; version: number }>({
        accessPolicy: { kind: "production" },
        defaultValue: () => ({ items: [], version: 1 }),
        kind: "counter state",
        path: stateFilePathFromAbsolute(file),
        recoverability: "failClosed",
        schema: counterSchema,
        version: 1,
      }).write({ items: [], version: 2 }),
    ).toThrow(LocalStateError)
    await rm(root, { force: true, recursive: true })
  })

  test("sync store handles temp cleanup and advisory locks", async () => {
    const root = createTestRoot("interbase-local-state-sync-")
    const file = path.join(root, "state.json")
    await mkdir(root, { recursive: true })
    for (let index = 0; index < 4; index += 1) {
      const tempPath = path.join(root, `.state.json.${index}.tmp`)
      await writeFile(tempPath, "stale")
      const stale = new Date(Date.now() - 60_000 - index)
      await utimes(tempPath, stale, stale)
    }
    syncCounterStore(file, "failClosed", { tempFileMaxAgeMs: 0, tempFileRetention: 1 }).write({ items: [], version: 1 })
    expect(
      (await readdir(root)).filter((entry) => entry.startsWith(".state.json.") && entry.endsWith(".tmp")),
    ).toHaveLength(1)

    await writeFile(`${file}.lock`, JSON.stringify({ pid: process.pid }))
    expect(() =>
      syncCounterStore(file, "failClosed", { concurrency: "multiProcess", lockTimeoutMs: 40 }).update(
        (current) => current,
      ),
    ).toThrow(LocalStateError)
    await rm(`${file}.lock`, { force: true })
    await writeFile(`${file}.lock`, JSON.stringify({ pid: 999_999_999 }))
    const stale = new Date(Date.now() - 60_000)
    await utimes(`${file}.lock`, stale, stale)
    expect(
      syncCounterStore(file, "failClosed", { concurrency: "multiProcess" }).update((current) => ({
        items: [...current.items, "locked"],
        version: 1,
      })),
    ).toEqual({ items: ["locked"], version: 1 })
    await rm(root, { force: true, recursive: true })
  })
})

function counterStore(
  file: string,
  recoverability: "reconstructable" | "quarantineAndDefault" | "failClosed",
  options: {
    concurrency?: "singleProcess" | "multiProcess" | "readOnlyCache"
    lockTimeoutMs?: number
    quarantineRetention?: number
    tempFileMaxAgeMs?: number
    tempFileRetention?: number
  } = {},
) {
  return createJsonStateStore<CounterState>({
    accessPolicy: { kind: "production" },
    concurrency: options.concurrency,
    defaultValue: () => ({ items: [], version: 1 }),
    kind: "counter state",
    lockTimeoutMs: options.lockTimeoutMs,
    path: stateFilePathFromAbsolute(file),
    quarantineRetention: options.quarantineRetention,
    recoverability,
    schema: counterSchema,
    tempFileMaxAgeMs: options.tempFileMaxAgeMs,
    tempFileRetention: options.tempFileRetention,
    version: 1,
  })
}

function syncCounterStore(
  file: string,
  recoverability: "reconstructable" | "quarantineAndDefault" | "failClosed",
  options: {
    concurrency?: "singleProcess" | "multiProcess" | "readOnlyCache"
    lockTimeoutMs?: number
    quarantineRetention?: number
    tempFileMaxAgeMs?: number
    tempFileRetention?: number
  } = {},
) {
  return createSyncJsonStateStore<CounterState>({
    accessPolicy: { kind: "production" },
    concurrency: options.concurrency,
    defaultValue: () => ({ items: [], version: 1 }),
    kind: "counter state",
    lockTimeoutMs: options.lockTimeoutMs,
    path: stateFilePathFromAbsolute(file),
    quarantineRetention: options.quarantineRetention,
    recoverability,
    schema: counterSchema,
    tempFileMaxAgeMs: options.tempFileMaxAgeMs,
    tempFileRetention: options.tempFileRetention,
    version: 1,
  })
}

function createTestRoot(prefix = "interbase-local-state-") {
  return createCliRuntimeTestHarness({ prefix }).root
}

function isJsonObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
