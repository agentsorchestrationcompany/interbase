import { randomUUID } from "node:crypto"
import * as fsSync from "node:fs"
import { mkdir, open, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  absolutePath,
  assertRuntimePathAccess,
  runtimeAccessPolicyFromInput,
  type RuntimeAccessPolicyInput,
  type StateFilePath,
} from "@interbase/cli-runtime-context"

export {
  stateFilePathFromAbsolute,
  type RuntimeAccessPolicyInput,
  type StateFilePath,
} from "@interbase/cli-runtime-context"

export type JsonStateRecoverability = "reconstructable" | "quarantineAndDefault" | "failClosed"
export type JsonStateOperation = "read" | "write" | "update" | "migrate" | "quarantine"
export type JsonStateErrorReason =
  | "notFound"
  | "invalidJson"
  | "invalidSchema"
  | "lockTimeout"
  | "io"
  | "unsupportedVersion"
export type JsonStateConcurrency = "singleProcess" | "multiProcess" | "readOnlyCache"
export type JsonStateLockPolicy = "none" | "advisoryFile"
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export interface JsonStateSchema<T> {
  parse(value: JsonValue): T
}

export interface JsonStateDefinition<T> {
  accessPolicy: RuntimeAccessPolicyInput
  concurrency?: JsonStateConcurrency
  defaultValue(): T
  directoryMode?: number
  fileMode?: number
  kind: string
  interruptedWriteRecovery?: "default"
  lockTimeoutMs?: number
  lockPolicy?: JsonStateLockPolicy
  path: StateFilePath
  quarantineRetention?: number
  recoverability: JsonStateRecoverability
  schema: JsonStateSchema<T>
  tempFileMaxAgeMs?: number
  tempFileRetention?: number
  version: number
}

export interface JsonStateStore<T> {
  path: string
  read(): Promise<T>
  update(updater: (current: T) => T | Promise<T>): Promise<T>
  write(next: T): Promise<void>
}

export interface SyncJsonStateStore<T> {
  path: string
  read(): T
  update(updater: (current: T) => T): T
  write(next: T): void
}

export class LocalStateError extends Error {
  readonly kind: string
  readonly operation: JsonStateOperation
  readonly path: string
  readonly reason: JsonStateErrorReason
  readonly recoverable: boolean

  constructor(input: {
    cause?: Error
    kind: string
    operation: JsonStateOperation
    path: string
    reason: JsonStateErrorReason
    recoverable: boolean
  }) {
    super(`Local state ${input.operation} failed for ${input.kind} at ${input.path}: ${reasonMessage(input.reason)}.`)
    this.name = "LocalStateError"
    this.kind = input.kind
    this.operation = input.operation
    this.path = input.path
    this.reason = input.reason
    this.recoverable = input.recoverable
    if (input.cause) this.cause = input.cause
  }
}

const pathQueues = new Map<string, Promise<void>>()

export function createJsonStateStore<T>(definition: JsonStateDefinition<T>): JsonStateStore<T> {
  const resolvedPath = path.resolve(definition.path)
  const directory = path.dirname(resolvedPath)
  const basename = path.basename(resolvedPath)
  const directoryMode = definition.directoryMode ?? 0o700
  const fileMode = definition.fileMode ?? 0o600
  const tempPrefix = `.${basename}.`
  const lockPolicy = definition.lockPolicy ?? (definition.concurrency === "multiProcess" ? "advisoryFile" : "none")
  const lockTimeoutMs = definition.lockTimeoutMs ?? 5_000

  async function read(): Promise<T> {
    assertRuntimeAccess(definition, resolvedPath, "read")
    let content: string
    try {
      content = await readFile(resolvedPath, "utf8")
    } catch (error) {
      if (error instanceof Error && hasErrorCode(error, "ENOENT")) return definition.defaultValue()
      throw localStateError(
        definition,
        "read",
        "io",
        false,
        error instanceof Error ? error : new Error("Non-error thrown"),
      )
    }
    if (isEmptyOrNulOnly(content)) {
      if (definition.recoverability === "failClosed" && definition.interruptedWriteRecovery !== "default") {
        throw localStateError(definition, "read", "invalidJson", false)
      }
      return definition.defaultValue()
    }
    return await parseContent(definition, resolvedPath, content)
  }

  async function write(next: T): Promise<void> {
    assertRuntimeAccess(definition, resolvedPath, "write")
    const validated = validateForWrite(definition, next)
    await mkdir(directory, { mode: directoryMode, recursive: true })
    await cleanupTempFiles(
      directory,
      tempPrefix,
      definition.tempFileMaxAgeMs ?? 86_400_000,
      definition.tempFileRetention ?? 8,
    )
    const tempPath = path.join(directory, `${tempPrefix}${randomUUID()}.tmp`)
    try {
      await writeFile(tempPath, `${JSON.stringify(validated, null, 2)}\n`, { mode: fileMode })
      await rename(tempPath, resolvedPath)
    } catch (error) {
      try {
        await rm(tempPath, { force: true })
      } catch {
        // Best-effort cleanup must not hide the original write failure.
      }
      throw localStateError(
        definition,
        "write",
        "io",
        false,
        error instanceof Error ? error : new Error("Non-error thrown"),
      )
    }
  }

  async function update(updater: (current: T) => T | Promise<T>): Promise<T> {
    assertRuntimeAccess(definition, resolvedPath, "write")
    return await enqueue(resolvedPath, async () => {
      await mkdir(directory, { mode: directoryMode, recursive: true })
      return await withLock(definition, resolvedPath, lockPolicy, lockTimeoutMs, async () => {
        const current = await read()
        const next = await updater(current)
        await write(next)
        return next
      })
    })
  }

  return { path: resolvedPath, read, update, write }
}

export function createSyncJsonStateStore<T>(definition: JsonStateDefinition<T>): SyncJsonStateStore<T> {
  const resolvedPath = path.resolve(definition.path)
  const directory = path.dirname(resolvedPath)
  const basename = path.basename(resolvedPath)
  const directoryMode = definition.directoryMode ?? 0o700
  const fileMode = definition.fileMode ?? 0o600
  const tempPrefix = `.${basename}.`
  const lockPolicy = definition.lockPolicy ?? (definition.concurrency === "multiProcess" ? "advisoryFile" : "none")
  const lockTimeoutMs = definition.lockTimeoutMs ?? 5_000

  function read(): T {
    assertRuntimeAccess(definition, resolvedPath, "read")
    let content: string
    try {
      content = fsSync.readFileSync(resolvedPath, "utf8")
    } catch (error) {
      if (error instanceof Error && hasErrorCode(error, "ENOENT")) return definition.defaultValue()
      throw localStateError(
        definition,
        "read",
        "io",
        false,
        error instanceof Error ? error : new Error("Non-error thrown"),
      )
    }
    if (isEmptyOrNulOnly(content)) {
      if (definition.recoverability === "failClosed" && definition.interruptedWriteRecovery !== "default") {
        throw localStateError(definition, "read", "invalidJson", false)
      }
      return definition.defaultValue()
    }
    return parseContentSync(definition, resolvedPath, content)
  }

  function write(next: T): void {
    assertRuntimeAccess(definition, resolvedPath, "write")
    const validated = validateForWrite(definition, next)
    fsSync.mkdirSync(directory, { mode: directoryMode, recursive: true })
    cleanupTempFilesSync(
      directory,
      tempPrefix,
      definition.tempFileMaxAgeMs ?? 86_400_000,
      definition.tempFileRetention ?? 8,
    )
    const tempPath = path.join(directory, `${tempPrefix}${randomUUID()}.tmp`)
    try {
      fsSync.writeFileSync(tempPath, `${JSON.stringify(validated, null, 2)}\n`, { mode: fileMode })
      fsSync.renameSync(tempPath, resolvedPath)
    } catch (error) {
      try {
        fsSync.rmSync(tempPath, { force: true })
      } catch {
        // Best-effort cleanup must not hide the original write failure.
      }
      throw localStateError(
        definition,
        "write",
        "io",
        false,
        error instanceof Error ? error : new Error("Non-error thrown"),
      )
    }
  }

  function update(updater: (current: T) => T): T {
    assertRuntimeAccess(definition, resolvedPath, "write")
    fsSync.mkdirSync(directory, { mode: directoryMode, recursive: true })
    return withLockSync(definition, resolvedPath, lockPolicy, lockTimeoutMs, () => {
      const next = updater(read())
      write(next)
      return next
    })
  }

  return { path: resolvedPath, read, update, write }
}

async function parseContent<T>(definition: JsonStateDefinition<T>, filePath: string, content: string): Promise<T> {
  let parsed: JsonValue
  try {
    parsed = JSON.parse(content) as JsonValue
  } catch (error) {
    if (definition.recoverability === "failClosed") {
      throw localStateError(
        definition,
        "read",
        "invalidJson",
        false,
        error instanceof Error ? error : new Error("Non-error thrown"),
      )
    }
    await quarantine(definition, filePath)
    return definition.defaultValue()
  }
  try {
    return definition.schema.parse(parsed)
  } catch (error) {
    const parsedError = error instanceof Error ? error : new Error("Non-error thrown")
    const reason = hasUnsupportedVersionMessage(parsedError) ? "unsupportedVersion" : "invalidSchema"
    if (definition.recoverability === "failClosed") {
      throw localStateError(definition, "read", reason, false, parsedError)
    }
    await quarantine(definition, filePath)
    return definition.defaultValue()
  }
}

function parseContentSync<T>(definition: JsonStateDefinition<T>, filePath: string, content: string): T {
  let parsed: JsonValue
  try {
    parsed = JSON.parse(content) as JsonValue
  } catch (error) {
    if (definition.recoverability === "failClosed") {
      throw localStateError(
        definition,
        "read",
        "invalidJson",
        false,
        error instanceof Error ? error : new Error("Non-error thrown"),
      )
    }
    quarantineSync(definition, filePath)
    return definition.defaultValue()
  }
  try {
    return definition.schema.parse(parsed)
  } catch (error) {
    const parsedError = error instanceof Error ? error : new Error("Non-error thrown")
    const reason = hasUnsupportedVersionMessage(parsedError) ? "unsupportedVersion" : "invalidSchema"
    if (definition.recoverability === "failClosed") {
      throw localStateError(definition, "read", reason, false, parsedError)
    }
    quarantineSync(definition, filePath)
    return definition.defaultValue()
  }
}

function validateForWrite<T>(definition: JsonStateDefinition<T>, next: T): T {
  try {
    return definition.schema.parse(JSON.parse(JSON.stringify(next)) as JsonValue)
  } catch (error) {
    const parsedError = error instanceof Error ? error : new Error("Non-error thrown")
    throw localStateError(
      definition,
      "write",
      hasUnsupportedVersionMessage(parsedError) ? "unsupportedVersion" : "invalidSchema",
      false,
      parsedError,
    )
  }
}

async function enqueue<T>(resolvedPath: string, run: () => Promise<T>): Promise<T> {
  const previous = pathQueues.get(resolvedPath) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  const waitForCurrent = () => current
  const tail = previous.then(waitForCurrent, waitForCurrent)
  pathQueues.set(resolvedPath, tail)
  await previous
  try {
    return await run()
  } finally {
    release()
    if (pathQueues.get(resolvedPath) === tail) pathQueues.delete(resolvedPath)
  }
}

async function withLock<T>(
  definition: JsonStateDefinition<T>,
  filePath: string,
  policy: JsonStateLockPolicy,
  timeoutMs: number,
  run: () => Promise<T>,
): Promise<T> {
  if (policy === "none") return await run()
  const lockPath = `${filePath}.lock`
  const deadline = Date.now() + timeoutMs
  while (true) {
    let acquired = false
    try {
      const handle = await open(lockPath, "wx", 0o600)
      await handle.writeFile(
        JSON.stringify({
          acquiredAt: new Date().toISOString(),
          hostname: os.hostname(),
          pid: process.pid,
          runId: process.pid,
        }),
      )
      await handle.close()
      acquired = true
    } catch (error) {
      if (error instanceof LocalStateError) throw error
      if (!(error instanceof Error) || !hasErrorCode(error, "EEXIST"))
        throw localStateError(
          definition,
          "update",
          "io",
          false,
          error instanceof Error ? error : new Error("Non-error thrown"),
        )
      if (await recoverStaleLock(lockPath)) continue
      if (Date.now() >= deadline) throw localStateError(definition, "update", "lockTimeout", true, error)
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    if (!acquired) continue
    try {
      return await run()
    } finally {
      await rm(lockPath, { force: true, recursive: true })
    }
  }
}

function withLockSync<T>(
  definition: JsonStateDefinition<T>,
  filePath: string,
  policy: JsonStateLockPolicy,
  timeoutMs: number,
  run: () => T,
): T {
  if (policy === "none") return run()
  const lockPath = `${filePath}.lock`
  const deadline = Date.now() + timeoutMs
  while (true) {
    let acquired = false
    try {
      const handle = fsSync.openSync(lockPath, "wx", 0o600)
      try {
        fsSync.writeFileSync(
          handle,
          JSON.stringify({
            acquiredAt: new Date().toISOString(),
            hostname: os.hostname(),
            pid: process.pid,
            runId: process.pid,
          }),
        )
      } finally {
        fsSync.closeSync(handle)
      }
      acquired = true
    } catch (error) {
      if (error instanceof LocalStateError) throw error
      if (!(error instanceof Error) || !hasErrorCode(error, "EEXIST"))
        throw localStateError(
          definition,
          "update",
          "io",
          false,
          error instanceof Error ? error : new Error("Non-error thrown"),
        )
      if (recoverStaleLockSync(lockPath)) continue
      if (Date.now() >= deadline) throw localStateError(definition, "update", "lockTimeout", true, error)
      sleepSync(20)
    }
    if (!acquired) continue
    try {
      return run()
    } finally {
      fsSync.rmSync(lockPath, { force: true, recursive: true })
    }
  }
}

async function recoverStaleLock(lockPath: string): Promise<boolean> {
  const timeoutMs = 5_000
  try {
    const lockStat = await stat(lockPath)
    if (Date.now() - lockStat.mtimeMs < timeoutMs) return false
    const content = await readLockFile(lockPath)
    const parsed = content.length > 0 ? (JSON.parse(content) as { pid?: number }) : {}
    if (typeof parsed.pid === "number" && isPidAlive(parsed.pid)) return false
    await rm(lockPath, { force: true, recursive: true })
    return true
  } catch (error) {
    if (error instanceof Error && hasErrorCode(error, "ENOENT")) return true
    return false
  }
}

function recoverStaleLockSync(lockPath: string): boolean {
  const timeoutMs = 5_000
  try {
    const lockStat = fsSync.statSync(lockPath)
    if (Date.now() - lockStat.mtimeMs < timeoutMs) return false
    const content = readLockFileSync(lockPath)
    const parsed = content.length > 0 ? (JSON.parse(content) as { pid?: number }) : {}
    if (typeof parsed.pid === "number" && isPidAlive(parsed.pid)) return false
    fsSync.rmSync(lockPath, { force: true, recursive: true })
    return true
  } catch (error) {
    if (error instanceof Error && hasErrorCode(error, "ENOENT")) return true
    return false
  }
}

async function readLockFile(lockPath: string): Promise<string> {
  try {
    return await readFile(lockPath, "utf8")
  } catch {
    return ""
  }
}

function readLockFileSync(lockPath: string): string {
  try {
    return fsSync.readFileSync(lockPath, "utf8")
  } catch {
    return ""
  }
}

async function quarantine<T>(definition: JsonStateDefinition<T>, filePath: string): Promise<void> {
  assertRuntimeAccess(definition, filePath, "write")
  const quarantinePath = `${filePath}.corrupt.${new Date().toISOString().replaceAll(":", "-")}.${randomUUID()}`
  try {
    await rename(filePath, quarantinePath)
    await cleanupQuarantineFiles(filePath, definition.quarantineRetention ?? 8)
  } catch (error) {
    throw localStateError(
      definition,
      "quarantine",
      "io",
      false,
      error instanceof Error ? error : new Error("Non-error thrown"),
    )
  }
}

function quarantineSync<T>(definition: JsonStateDefinition<T>, filePath: string): void {
  assertRuntimeAccess(definition, filePath, "write")
  const quarantinePath = `${filePath}.corrupt.${new Date().toISOString().replaceAll(":", "-")}.${randomUUID()}`
  try {
    fsSync.renameSync(filePath, quarantinePath)
    cleanupQuarantineFilesSync(filePath, definition.quarantineRetention ?? 8)
  } catch (error) {
    throw localStateError(
      definition,
      "quarantine",
      "io",
      false,
      error instanceof Error ? error : new Error("Non-error thrown"),
    )
  }
}

async function cleanupQuarantineFiles(filePath: string, retention: number): Promise<void> {
  const directory = path.dirname(filePath)
  const prefix = `${path.basename(filePath)}.corrupt.`
  let entries: string[]
  try {
    entries = await readdir(directory)
  } catch (error) {
    if (error instanceof Error && hasErrorCode(error, "ENOENT")) return
    throw error
  }
  const candidates: { mtimeMs: number; path: string }[] = []
  for (const entry of entries) {
    if (!entry.startsWith(prefix)) continue
    const corruptPath = path.join(directory, entry)
    try {
      const corruptStat = await stat(corruptPath)
      candidates.push({ mtimeMs: corruptStat.mtimeMs, path: corruptPath })
    } catch {
      // Another process may have already removed it.
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs)
  for (const candidate of candidates.slice(retention)) {
    await rm(candidate.path, { force: true })
  }
}

function cleanupQuarantineFilesSync(filePath: string, retention: number): void {
  const directory = path.dirname(filePath)
  const prefix = `${path.basename(filePath)}.corrupt.`
  let entries: string[]
  try {
    entries = fsSync.readdirSync(directory)
  } catch (error) {
    if (error instanceof Error && hasErrorCode(error, "ENOENT")) return
    throw error
  }
  const candidates = entries.flatMap((entry): { mtimeMs: number; path: string }[] => {
    if (!entry.startsWith(prefix)) return []
    const corruptPath = path.join(directory, entry)
    try {
      return [{ mtimeMs: fsSync.statSync(corruptPath).mtimeMs, path: corruptPath }]
    } catch {
      return []
    }
  })
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs)
  for (const candidate of candidates.slice(retention)) {
    fsSync.rmSync(candidate.path, { force: true })
  }
}

async function cleanupTempFiles(
  directory: string,
  tempPrefix: string,
  maxAgeMs: number,
  retention: number,
): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(directory)
  } catch (error) {
    if (error instanceof Error && hasErrorCode(error, "ENOENT")) return
    throw error
  }
  const candidates: { mtimeMs: number; path: string }[] = []
  for (const entry of entries) {
    if (!entry.startsWith(tempPrefix) || !entry.endsWith(".tmp")) continue
    const tempPath = path.join(directory, entry)
    try {
      const tempStat = await stat(tempPath)
      if (Date.now() - tempStat.mtimeMs >= maxAgeMs) candidates.push({ mtimeMs: tempStat.mtimeMs, path: tempPath })
    } catch {
      // Another process may have already removed it.
    }
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs)
  for (const candidate of candidates.slice(retention)) {
    await rm(candidate.path, { force: true })
  }
}

function cleanupTempFilesSync(directory: string, tempPrefix: string, maxAgeMs: number, retention: number): void {
  let entries: string[]
  try {
    entries = fsSync.readdirSync(directory)
  } catch (error) {
    if (error instanceof Error && hasErrorCode(error, "ENOENT")) return
    throw error
  }
  const candidates = entries.flatMap((entry): { mtimeMs: number; path: string }[] => {
    if (!entry.startsWith(tempPrefix) || !entry.endsWith(".tmp")) return []
    const tempPath = path.join(directory, entry)
    try {
      const tempStat = fsSync.statSync(tempPath)
      return Date.now() - tempStat.mtimeMs >= maxAgeMs ? [{ mtimeMs: tempStat.mtimeMs, path: tempPath }] : []
    } catch {
      return []
    }
  })
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs)
  for (const candidate of candidates.slice(retention)) {
    fsSync.rmSync(candidate.path, { force: true })
  }
}

function localStateError<T>(
  definition: JsonStateDefinition<T>,
  operation: JsonStateOperation,
  reason: JsonStateErrorReason,
  recoverable: boolean,
  cause?: Error,
): LocalStateError {
  return new LocalStateError({
    cause,
    kind: definition.kind,
    operation,
    path: path.resolve(definition.path),
    reason,
    recoverable,
  })
}

function isEmptyOrNulOnly(content: string): boolean {
  if (content.length === 0) return true
  for (const character of content) {
    if (character !== "\u0000") return false
  }
  return true
}

function hasErrorCode(error: object, code: string): boolean {
  return "code" in error && error.code === code
}

function hasUnsupportedVersionMessage(error: Error): boolean {
  return error.message.toLowerCase().includes("unsupported version")
}

function assertRuntimeAccess<T>(
  definition: JsonStateDefinition<T>,
  targetPath: string,
  operation: "read" | "write",
): void {
  assertRuntimePathAccess(runtimeAccessPolicyFromInput(definition.accessPolicy), absolutePath(targetPath), operation)
}

function isPathInside(root: string, value: string): boolean {
  const relative = path.relative(root, path.resolve(value))
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

function reasonMessage(reason: JsonStateErrorReason): string {
  if (reason === "invalidJson") return "invalid JSON"
  if (reason === "invalidSchema") return "invalid schema"
  if (reason === "unsupportedVersion") return "unsupported version"
  if (reason === "lockTimeout") return "lock timeout"
  if (reason === "notFound") return "not found"
  return "I/O error"
}
