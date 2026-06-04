import { type SQLiteBunDatabase } from "drizzle-orm/bun-sqlite"
import { migrate } from "drizzle-orm/bun-sqlite/migrator"
import { type SQLiteTransaction } from "drizzle-orm/sqlite-core"
export * from "drizzle-orm"
import { LocalContext } from "@/util/local-context"
import * as Log from "@interbase/core/util/log"
import { NamedError } from "@interbase/core/util/error"
import z from "zod"
import path from "path"
import { readFileSync, readdirSync, existsSync } from "fs"
import { Flag } from "@interbase/core/flag/flag"
import { InstallationChannel } from "@interbase/core/installation/version"
import { InstanceState } from "@/effect/instance-state"
import { iife } from "@/util/iife"
import { init } from "#db"
import {
  absolutePath,
  assertRuntimePathAccess,
  cliRuntimeEnvFromProcessEnv,
  databaseTargetForInput,
  parseCliRuntimeEnvironment,
} from "@interbase/cli-runtime-context"

declare const INTERBASE_MIGRATIONS: { sql: string; timestamp: number; name: string }[] | undefined

export const NotFoundError = NamedError.create(
  "NotFoundError",
  z.object({
    message: z.string(),
  }),
)

const log = Log.create({ service: "db" })
const runtimeContext = parseCliRuntimeEnvironment(cliRuntimeEnvFromProcessEnv(process.env))

function runtimeDatabasePath() {
  const target =
    runtimeContext.databaseTarget.kind === "channel"
      ? databaseTargetForInput(
          runtimeContext.paths,
          undefined,
          Flag.INTERBASE_DISABLE_CHANNEL_DB ? "prod" : InstallationChannel,
        )
      : runtimeContext.databaseTarget
  if (target.kind === "memory") return ":memory:"
  return target.path
}

export function getChannelPath() {
  const target = databaseTargetForInput(
    runtimeContext.paths,
    undefined,
    Flag.INTERBASE_DISABLE_CHANNEL_DB ? "prod" : InstallationChannel,
  )
  if (target.kind === "memory") return ":memory:"
  return target.path
}

function sessionArgv() {
  for (let i = 0; i < process.argv.length; i++) {
    const value = process.argv[i]
    if (value === "-s" || value === "--session") return process.argv[i + 1]
    if (value.startsWith("--session=")) return value.slice("--session=".length)
  }
}

const pathCtx = LocalContext.create<{ path: string }>("database.path")

function currentPath() {
  try {
    return pathCtx.use().path
  } catch {
    return Path
  }
}

export function providePath<T>(path: string, fn: () => T) {
  return pathCtx.provide({ path }, fn)
}

export function listPaths() {
  const current = Path
  const names = existsSync(runtimeContext.paths.data)
    ? readdirSync(runtimeContext.paths.data).filter((item) => item.startsWith("interbase") && item.endsWith(".db"))
    : []
  return [...new Set([current, ...names.map((item) => path.join(runtimeContext.paths.data, item))])]
}

function hasSession(dbPath: string, sessionID: string) {
  if (!existsSync(dbPath)) return false
  try {
    const db = clientFor(dbPath)
    try {
      return Boolean(db.$client.prepare("select 1 from session where id = ? limit 1").get(sessionID))
    } catch {
      return false
    }
  } catch {
    return false
  }
}

export function resolveSessionPath(sessionID: string, currentPath?: string): string | undefined {
  const activePath = currentPath ?? Path
  if (hasSession(activePath, sessionID)) return activePath
  const candidates = listPaths().filter((item) => item !== activePath)
  return candidates.find((candidate) => hasSession(candidate, sessionID))
}

export const Path = iife(() => {
  if (runtimeContext.databaseTarget.kind !== "channel") return runtimeDatabasePath()
  const sessionID = sessionArgv()
  if (sessionID) return resolveSessionPath(sessionID) ?? getChannelPath()
  return getChannelPath()
})

export type Transaction = SQLiteTransaction<"sync", void>

type Client = ReturnType<typeof init>

const clients = new Map<string, Client>()

function clientFor(dbPath: string) {
  assertTestSandboxDatabasePath(dbPath)
  const cached = clients.get(dbPath)
  if (cached) return cached

  log.info("opening database", { path: dbPath })

  const db = init(dbPath)

  db.run("PRAGMA journal_mode = WAL")
  db.run("PRAGMA synchronous = NORMAL")
  db.run("PRAGMA busy_timeout = 5000")
  db.run("PRAGMA cache_size = -64000")
  db.run("PRAGMA foreign_keys = ON")
  db.run("PRAGMA wal_checkpoint(PASSIVE)")

  const entries =
    typeof INTERBASE_MIGRATIONS !== "undefined"
      ? INTERBASE_MIGRATIONS
      : migrations(path.join(import.meta.dirname, "../../migration"))
  if (entries.length > 0) {
    log.info("applying migrations", {
      count: entries.length,
      mode: typeof INTERBASE_MIGRATIONS !== "undefined" ? "bundled" : "dev",
    })
    if (Flag.INTERBASE_SKIP_MIGRATIONS) {
      for (const item of entries) {
        item.sql = "select 1;"
      }
    }
    applyMigrations(db, entries)
  }

  clients.set(dbPath, db)
  return db
}

function assertTestSandboxDatabasePath(dbPath: string) {
  if (dbPath === ":memory:") return
  try {
    assertRuntimePathAccess(runtimeContext.accessPolicy, absolutePath(dbPath), "write")
  } catch {
    if (runtimeContext.accessPolicy.kind === "production") return
    throw new Error(
      `Refusing to open Interbase test database outside sandbox: ${dbPath} is not inside ${runtimeContext.accessPolicy.sandboxRoot}.`,
    )
  }
}

type Journal = { sql: string; timestamp: number; name: string }[]

// Drizzle's migrate overloads trigger expensive variance checks here; narrow to the journal overload we actually use.
const migrateFromJournal = migrate as unknown as (db: SQLiteBunDatabase, entries: Journal) => void

function applyMigrations(db: SQLiteBunDatabase, entries: Journal) {
  migrateFromJournal(db, entries)
}

function time(tag: string) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(tag)
  if (!match) return 0
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  )
}

function migrations(dir: string): Journal {
  const dirs = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  const sql = dirs
    .map((name) => {
      const file = path.join(dir, name, "migration.sql")
      if (!existsSync(file)) return
      return {
        sql: readFileSync(file, "utf-8"),
        timestamp: time(name),
        name,
      }
    })
    .filter(Boolean) as Journal

  return sql.sort((a, b) => a.timestamp - b.timestamp)
}

export function Client(path = currentPath()) {
  return clientFor(path)
}

export function close(path?: string) {
  const targets = path ? [path] : [...clients.keys()]
  for (const item of targets) {
    clients.get(item)?.$client.close()
    clients.delete(item)
  }
}

export type TxOrDb = Transaction | Client

const ctx = LocalContext.create<{
  tx: TxOrDb
  effects: (() => void | Promise<void>)[]
  path: string
}>("database")

export function use<T>(callback: (trx: TxOrDb) => T): T {
  try {
    return callback(ctx.use().tx)
  } catch (err) {
    if (err instanceof LocalContext.NotFound) {
      const path = currentPath()
      const effects: (() => void | Promise<void>)[] = []
      const client = Client(path)
      const result = ctx.provide({ effects, tx: client, path }, () => callback(client))
      for (const effect of effects) effect()
      return result
    }
    throw err
  }
}

export function usePath<T>(path: string, callback: (trx: TxOrDb) => T): T {
  return providePath(path, () => use(callback))
}

export function effect(fn: () => any | Promise<any>) {
  const path = currentPath()
  const bound = InstanceState.bind(() => providePath(path, fn))
  try {
    ctx.use().effects.push(bound)
  } catch {
    bound()
  }
}

type NotPromise<T> = T extends Promise<any> ? never : T

export function transaction<T>(
  callback: (tx: TxOrDb) => NotPromise<T>,
  options?: {
    behavior?: "deferred" | "immediate" | "exclusive"
  },
): NotPromise<T> {
  try {
    return callback(ctx.use().tx)
  } catch (err) {
    if (err instanceof LocalContext.NotFound) {
      const path = currentPath()
      const effects: (() => void | Promise<void>)[] = []
      const txCallback = InstanceState.bind((tx: TxOrDb) => ctx.provide({ tx, effects, path }, () => callback(tx)))
      const result = Client(path).transaction(txCallback, { behavior: options?.behavior })
      for (const effect of effects) effect()
      return result as NotPromise<T>
    }
    throw err
  }
}

export function transactionPath<T>(
  path: string,
  callback: (tx: TxOrDb) => NotPromise<T>,
  options?: {
    behavior?: "deferred" | "immediate" | "exclusive"
  },
): NotPromise<T> {
  return providePath(path, () => transaction(callback, options))
}

export * as Database from "./db"
