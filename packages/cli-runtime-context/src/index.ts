import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { Context, Effect, Layer } from "effect"

declare const absolutePathBrand: unique symbol
declare const directoryPathBrand: unique symbol
declare const filePathBrand: unique symbol
declare const homeDirectoryPathBrand: unique symbol
declare const dataDirectoryPathBrand: unique symbol
declare const cacheDirectoryPathBrand: unique symbol
declare const configDirectoryPathBrand: unique symbol
declare const stateDirectoryPathBrand: unique symbol
declare const tempDirectoryPathBrand: unique symbol
declare const binDirectoryPathBrand: unique symbol
declare const logDirectoryPathBrand: unique symbol
declare const launchAgentsDirectoryPathBrand: unique symbol
declare const sandboxRootPathBrand: unique symbol
declare const stateFilePathBrand: unique symbol
declare const databaseFilePathBrand: unique symbol
declare const configFilePathBrand: unique symbol
declare const logFilePathBrand: unique symbol
declare const tempFilePathBrand: unique symbol

export type AbsolutePath = string & { readonly [absolutePathBrand]: true }
export type DirectoryPath = AbsolutePath & { readonly [directoryPathBrand]: true }
export type FilePath = AbsolutePath & { readonly [filePathBrand]: true }
export type HomeDirectoryPath = DirectoryPath & { readonly [homeDirectoryPathBrand]: true }
export type DataDirectoryPath = DirectoryPath & { readonly [dataDirectoryPathBrand]: true }
export type CacheDirectoryPath = DirectoryPath & { readonly [cacheDirectoryPathBrand]: true }
export type ConfigDirectoryPath = DirectoryPath & { readonly [configDirectoryPathBrand]: true }
export type StateDirectoryPath = DirectoryPath & { readonly [stateDirectoryPathBrand]: true }
export type TempDirectoryPath = DirectoryPath & { readonly [tempDirectoryPathBrand]: true }
export type BinDirectoryPath = DirectoryPath & { readonly [binDirectoryPathBrand]: true }
export type LogDirectoryPath = DirectoryPath & { readonly [logDirectoryPathBrand]: true }
export type LaunchAgentsDirectoryPath = DirectoryPath & { readonly [launchAgentsDirectoryPathBrand]: true }
export type SandboxRootPath = DirectoryPath & { readonly [sandboxRootPathBrand]: true }
export type StateFilePath = FilePath & { readonly [stateFilePathBrand]: true }
export type DatabaseFilePath = FilePath & { readonly [databaseFilePathBrand]: true }
export type ConfigFilePath = FilePath & { readonly [configFilePathBrand]: true }
export type LogFilePath = FilePath & { readonly [logFilePathBrand]: true }
export type TempFilePath = FilePath & { readonly [tempFilePathBrand]: true }

export type CliRuntimeMode = "production" | "test"
export type RuntimePathOperation = "read" | "write"
export type InstallationChannel = string

export type RuntimeAccessPolicy =
  | { readonly kind: "production" }
  | { readonly kind: "test"; readonly sandboxRoot: SandboxRootPath }

export type RuntimeAccessPolicyInput =
  | { readonly kind: "production" }
  | { readonly kind: "test"; readonly sandboxRoot: string }

export type CliRuntimePaths = {
  readonly home: HomeDirectoryPath
  readonly data: DataDirectoryPath
  readonly cache: CacheDirectoryPath
  readonly config: ConfigDirectoryPath
  readonly state: StateDirectoryPath
  readonly tmp: TempDirectoryPath
  readonly bin: BinDirectoryPath
  readonly log: LogDirectoryPath
}

export type LaunchdPolicy =
  | {
      readonly kind: "enabled"
      readonly launchAgentsDirectory: LaunchAgentsDirectoryPath
      readonly logFile: LogFilePath
    }
  | { readonly kind: "disabled" }

export type DatabaseTarget =
  | { readonly kind: "memory" }
  | { readonly kind: "file"; readonly path: DatabaseFilePath }
  | { readonly kind: "channel"; readonly channel: InstallationChannel; readonly path: DatabaseFilePath }

export type CliRuntimeContextValue = {
  readonly mode: CliRuntimeMode
  readonly paths: CliRuntimePaths
  readonly accessPolicy: RuntimeAccessPolicy
  readonly databaseTarget: DatabaseTarget
  readonly launchdPolicy: LaunchdPolicy
}

export type CliRuntimeEnv = {
  readonly HOME?: string
  readonly XDG_DATA_HOME?: string
  readonly XDG_CACHE_HOME?: string
  readonly XDG_CONFIG_HOME?: string
  readonly XDG_STATE_HOME?: string
  readonly INTERBASE_TEST_SANDBOX_ROOT?: string
  readonly INTERBASE_DB?: string
  readonly INTERBASE_CONFIG_DIR?: string
  readonly INTERBASE_LAUNCH_AGENTS_DIR?: string
  readonly INTERBASE_LAUNCHD_DISABLED?: string
}

export type DatabasePathInput =
  | { readonly kind: "default" }
  | { readonly kind: "memory" }
  | { readonly kind: "relative"; readonly name: string }
  | { readonly kind: "absolute"; readonly path: string }
  | { readonly kind: "channel"; readonly channel: InstallationChannel }

export type SerializedRuntimeAccessPolicy =
  | { readonly kind: "production" }
  | { readonly kind: "test"; readonly sandboxRoot: string }

export type SerializedDatabaseTarget =
  | { readonly kind: "memory" }
  | { readonly kind: "file"; readonly path: string }
  | { readonly kind: "channel"; readonly channel: InstallationChannel; readonly path: string }

export type SerializedLaunchdPolicy =
  | { readonly kind: "enabled"; readonly launchAgentsDirectory: string; readonly logFile: string }
  | { readonly kind: "disabled" }

export type SerializedCliRuntimeContext = {
  readonly version: 1
  readonly mode: CliRuntimeMode
  readonly paths: {
    readonly home: string
    readonly data: string
    readonly cache: string
    readonly config: string
    readonly state: string
    readonly tmp: string
    readonly bin: string
    readonly log: string
  }
  readonly accessPolicy: SerializedRuntimeAccessPolicy
  readonly databaseTarget: SerializedDatabaseTarget
  readonly launchdPolicy: SerializedLaunchdPolicy
}

export type CliRuntimeSubprocessEnv = {
  readonly HOME: string
  readonly XDG_DATA_HOME: string
  readonly XDG_CACHE_HOME: string
  readonly XDG_CONFIG_HOME: string
  readonly XDG_STATE_HOME: string
  readonly INTERBASE_TEST_SANDBOX_ROOT?: string
  readonly INTERBASE_DB?: string
  readonly INTERBASE_CONFIG_DIR?: string
  readonly INTERBASE_LAUNCH_AGENTS_DIR?: string
  readonly INTERBASE_LAUNCHD_DISABLED?: string
}

type RuntimeErrorCode =
  | "INTERBASE_RELATIVE_PATH"
  | "INTERBASE_SANDBOX_ESCAPE"
  | "INTERBASE_MISSING_TEST_SANDBOX"
  | "INTERBASE_INVALID_DATABASE_OVERRIDE"
  | "INTERBASE_PRODUCTION_ONLY_PATH_IN_TEST"
  | "INTERBASE_INVALID_LAUNCHD_OVERRIDE"
  | "INTERBASE_INVALID_SERIALIZED_RUNTIME_CONTEXT"

class CliRuntimeContextError extends Error {
  readonly code: RuntimeErrorCode
  readonly details: Readonly<Record<string, string>>

  constructor(input: {
    readonly name: string
    readonly code: RuntimeErrorCode
    readonly message: string
    readonly details?: Readonly<Record<string, string>>
  }) {
    super(input.message)
    this.name = input.name
    this.code = input.code
    this.details = input.details ?? {}
  }
}

export class RelativePathError extends CliRuntimeContextError {
  constructor(input: { readonly path: string }) {
    super({
      name: "RelativePathError",
      code: "INTERBASE_RELATIVE_PATH",
      message: "Expected an absolute Interbase runtime path.",
      details: { path: input.path },
    })
  }
}

export class SandboxEscapeError extends CliRuntimeContextError {
  constructor(input: {
    readonly path: string
    readonly sandboxRoot: string
    readonly operation: RuntimePathOperation
  }) {
    super({
      name: "SandboxEscapeError",
      code: "INTERBASE_SANDBOX_ESCAPE",
      message: "Interbase runtime path is outside the configured test sandbox.",
      details: { operation: input.operation, path: input.path, sandboxRoot: input.sandboxRoot },
    })
  }
}

export class MissingTestSandboxError extends CliRuntimeContextError {
  constructor() {
    super({
      name: "MissingTestSandboxError",
      code: "INTERBASE_MISSING_TEST_SANDBOX",
      message: "Interbase test runtime requires an explicit sandbox root.",
    })
  }
}

export class InvalidDatabaseOverrideError extends CliRuntimeContextError {
  constructor(input: { readonly value: string }) {
    super({
      name: "InvalidDatabaseOverrideError",
      code: "INTERBASE_INVALID_DATABASE_OVERRIDE",
      message: "INTERBASE_DB must be :memory:, an absolute path, or a safe file name.",
      details: { value: input.value },
    })
  }
}

export class ProductionOnlyPathInTestError extends CliRuntimeContextError {
  constructor(input: { readonly path: string; readonly sandboxRoot: string }) {
    super({
      name: "ProductionOnlyPathInTestError",
      code: "INTERBASE_PRODUCTION_ONLY_PATH_IN_TEST",
      message: "Interbase test runtime cannot use production user-state paths.",
      details: { path: input.path, sandboxRoot: input.sandboxRoot },
    })
  }
}

export class InvalidLaunchdOverrideError extends CliRuntimeContextError {
  constructor(input: { readonly value: string }) {
    super({
      name: "InvalidLaunchdOverrideError",
      code: "INTERBASE_INVALID_LAUNCHD_OVERRIDE",
      message: "LaunchAgents override must be an absolute path.",
      details: { value: input.value },
    })
  }
}

export class InvalidSerializedRuntimeContextError extends CliRuntimeContextError {
  constructor(input: { readonly reason: string }) {
    super({
      name: "InvalidSerializedRuntimeContextError",
      code: "INTERBASE_INVALID_SERIALIZED_RUNTIME_CONTEXT",
      message: "Serialized Interbase runtime context is invalid.",
      details: { reason: input.reason },
    })
  }
}

export function absolutePath(input: string): AbsolutePath {
  if (!path.isAbsolute(input)) throw new RelativePathError({ path: input })
  return brandAbsolute(path.resolve(input))
}

export function sandboxRootPath(input: string): SandboxRootPath {
  return brandSandboxRoot(path.resolve(absolutePath(input)))
}

export function stateFilePath(paths: CliRuntimePaths, name: string): StateFilePath {
  return brandStateFile(joinFile(paths.state, name))
}

export function stateFilePathFromAbsolute(input: string): StateFilePath {
  return brandStateFile(path.resolve(absolutePath(input)))
}

export function databaseFilePath(paths: CliRuntimePaths, input: DatabasePathInput): DatabaseFilePath {
  if (input.kind === "memory") throw new InvalidDatabaseOverrideError({ value: ":memory:" })
  if (input.kind === "absolute") return brandDatabaseFile(path.resolve(absolutePath(input.path)))
  if (input.kind === "relative") return brandDatabaseFile(joinFile(paths.data, input.name))
  if (input.kind === "channel")
    return brandDatabaseFile(joinFile(paths.data, databaseFileNameForChannel(input.channel)))
  return brandDatabaseFile(joinFile(paths.data, "interbase.db"))
}

export function databaseTargetForInput(
  paths: CliRuntimePaths,
  override: string | undefined,
  channel: InstallationChannel,
): DatabaseTarget {
  return databaseTarget(paths, override, channel)
}

export function configFilePath(paths: CliRuntimePaths, name: string): ConfigFilePath {
  return brandConfigFile(joinFile(paths.config, name))
}

export function logFilePath(paths: CliRuntimePaths, name: string): LogFilePath {
  return brandLogFile(joinFile(paths.log, name))
}

export function tempFilePath(paths: CliRuntimePaths, name: string): TempFilePath {
  return brandTempFile(joinFile(paths.tmp, name))
}

export function assertRuntimePathAccess(
  policy: RuntimeAccessPolicy,
  targetPath: AbsolutePath,
  operation: RuntimePathOperation,
): void {
  if (policy.kind === "production") return
  const targetExists = existsSync(targetPath)
  const root = existsSync(policy.sandboxRoot)
    ? realpathBoundary(policy.sandboxRoot)
    : realpathExistingParentBoundary(policy.sandboxRoot)
  const target = targetExists ? realpathBoundary(targetPath) : realpathExistingParentBoundary(targetPath)
  if (isPathInside(root, target)) return
  throw new SandboxEscapeError({ operation, path: targetPath, sandboxRoot: policy.sandboxRoot })
}

export function runtimeAccessPolicyFromInput(input: RuntimeAccessPolicyInput): RuntimeAccessPolicy {
  if (input.kind === "production") return input
  return { kind: "test", sandboxRoot: sandboxRootPath(input.sandboxRoot) }
}

export function parseCliRuntimeEnvironment(env: CliRuntimeEnv): CliRuntimeContextValue {
  if (env.INTERBASE_TEST_SANDBOX_ROOT?.trim()) return testRuntimeContextFromEnv(env)
  const paths = productionPaths(env)
  return {
    mode: "production",
    paths,
    accessPolicy: { kind: "production" },
    databaseTarget: databaseTarget(paths, env.INTERBASE_DB, "local"),
    launchdPolicy: launchdPolicy(paths, env),
  }
}

function testRuntimeContextFromEnv(env: CliRuntimeEnv): CliRuntimeContextValue {
  const context = createTestRuntimeContext(env.INTERBASE_TEST_SANDBOX_ROOT?.trim() ?? "")
  const configOverride = env.INTERBASE_CONFIG_DIR?.trim()
  if (!configOverride) return context
  const config = brandConfigDirectory(path.resolve(absolutePath(configOverride)))
  assertRuntimePathAccess(context.accessPolicy, config, "read")
  return { ...context, paths: { ...context.paths, config } }
}

export function createTestRuntimeContext(root: string): CliRuntimeContextValue {
  if (!root.trim()) throw new MissingTestSandboxError()
  const sandboxRoot = sandboxRootPath(root.trim())
  const paths = testPaths(sandboxRoot)
  const context = {
    mode: "test",
    paths,
    accessPolicy: { kind: "test", sandboxRoot },
    databaseTarget: { kind: "memory" },
    launchdPolicy: { kind: "disabled" },
  } satisfies CliRuntimeContextValue
  for (const value of Object.values(paths)) assertRuntimePathAccess(context.accessPolicy, value, "read")
  return context
}

export function serializeCliRuntimeContext(value: CliRuntimeContextValue): SerializedCliRuntimeContext {
  return {
    version: 1,
    mode: value.mode,
    paths: value.paths,
    accessPolicy: value.accessPolicy,
    databaseTarget: value.databaseTarget,
    launchdPolicy: value.launchdPolicy,
  }
}

export function deserializeCliRuntimeContext(value: SerializedCliRuntimeContext): CliRuntimeContextValue {
  if (value.version !== 1) throw new InvalidSerializedRuntimeContextError({ reason: "unsupported version" })
  const paths = rebrandPaths(value.paths)
  const accessPolicy = deserializeAccessPolicy(value.accessPolicy)
  const result = {
    mode: value.mode,
    paths,
    accessPolicy,
    databaseTarget: deserializeDatabaseTarget(paths, value.databaseTarget),
    launchdPolicy: deserializeLaunchdPolicy(value.launchdPolicy),
  } satisfies CliRuntimeContextValue
  if (result.mode === "test" && result.accessPolicy.kind !== "test")
    throw new InvalidSerializedRuntimeContextError({ reason: "test mode requires test access policy" })
  if (result.mode === "production" && result.accessPolicy.kind !== "production")
    throw new InvalidSerializedRuntimeContextError({ reason: "production mode requires production access policy" })
  if (result.accessPolicy.kind === "test")
    for (const item of Object.values(result.paths)) assertRuntimePathAccess(result.accessPolicy, item, "read")
  return result
}

export function subprocessEnvForCliRuntimeContext(value: CliRuntimeContextValue): CliRuntimeSubprocessEnv {
  return {
    HOME: value.paths.home,
    XDG_DATA_HOME: path.dirname(value.paths.data),
    XDG_CACHE_HOME: path.dirname(value.paths.cache),
    XDG_CONFIG_HOME: path.dirname(value.paths.config),
    XDG_STATE_HOME: path.dirname(value.paths.state),
    INTERBASE_TEST_SANDBOX_ROOT: value.accessPolicy.kind === "test" ? value.accessPolicy.sandboxRoot : undefined,
    INTERBASE_DB:
      value.databaseTarget.kind === "memory"
        ? ":memory:"
        : value.databaseTarget.kind === "file"
          ? value.databaseTarget.path
          : undefined,
    INTERBASE_CONFIG_DIR: value.paths.config,
    INTERBASE_LAUNCH_AGENTS_DIR:
      value.launchdPolicy.kind === "enabled" ? value.launchdPolicy.launchAgentsDirectory : undefined,
    INTERBASE_LAUNCHD_DISABLED: value.launchdPolicy.kind === "disabled" ? "1" : undefined,
  }
}

export type RuntimeStateStoreDeps = { readonly accessPolicy: RuntimeAccessPolicy }
export type RuntimeDatabaseDeps = {
  readonly accessPolicy: RuntimeAccessPolicy
  readonly databaseTarget: DatabaseTarget
}

export type CliRuntimeTestHarness = {
  readonly root: SandboxRootPath
  readonly context: CliRuntimeContextValue
  readonly env: CliRuntimeSubprocessEnv
  readonly stateFilePath: (name: string) => StateFilePath
  readonly configFilePath: (name: string) => ConfigFilePath
  readonly databaseFilePath: (name: string) => DatabaseFilePath
  readonly logFilePath: (name: string) => LogFilePath
  readonly tempFilePath: (name: string) => TempFilePath
  readonly cleanup: () => void
}

export function createCliRuntimeTestHarness(
  input: { readonly root?: string; readonly prefix?: string } = {},
): CliRuntimeTestHarness {
  const root = sandboxRootPath(
    input.root ?? mkdtempSync(path.join(os.tmpdir(), input.prefix ?? "interbase-runtime-test-")),
  )
  const context = createTestRuntimeContext(root)
  return {
    root,
    context,
    env: subprocessEnvForCliRuntimeContext(context),
    stateFilePath: (name) => stateFilePath(context.paths, name),
    configFilePath: (name) => configFilePath(context.paths, name),
    databaseFilePath: (name) => databaseFilePath(context.paths, { kind: "relative", name }),
    logFilePath: (name) => logFilePath(context.paths, name),
    tempFilePath: (name) => tempFilePath(context.paths, name),
    cleanup: () => rmSync(root, { force: true, recursive: true }),
  }
}

export function withCliRuntimeTestEnv<T>(harness: CliRuntimeTestHarness, run: () => T): T {
  const previous = captureRuntimeEnv(process.env)
  applyRuntimeEnv(harness.env)
  try {
    return run()
  } finally {
    restoreRuntimeEnv(previous)
  }
}

export class CliRuntimeContext extends Context.Service<CliRuntimeContext, CliRuntimeContextValue>()(
  "@interbase/CliRuntimeContext",
) {}

export const liveLayer = Layer.effect(
  CliRuntimeContext,
  Effect.sync(() => CliRuntimeContext.of(parseCliRuntimeEnvironment(cliRuntimeEnvFromProcessEnv(process.env)))),
)

export const layerWith = (value: CliRuntimeContextValue) =>
  Layer.succeed(CliRuntimeContext, CliRuntimeContext.of(value))
export const testLayer = (root: string) => layerWith(createTestRuntimeContext(root))

export function cliRuntimeEnvFromProcessEnv(env: NodeJS.ProcessEnv): CliRuntimeEnv {
  return {
    HOME: env.HOME,
    XDG_DATA_HOME: env.XDG_DATA_HOME,
    XDG_CACHE_HOME: env.XDG_CACHE_HOME,
    XDG_CONFIG_HOME: env.XDG_CONFIG_HOME,
    XDG_STATE_HOME: env.XDG_STATE_HOME,
    INTERBASE_TEST_SANDBOX_ROOT: env.INTERBASE_TEST_SANDBOX_ROOT,
    INTERBASE_DB: env.INTERBASE_DB,
    INTERBASE_CONFIG_DIR: env.INTERBASE_CONFIG_DIR,
    INTERBASE_LAUNCH_AGENTS_DIR: env.INTERBASE_LAUNCH_AGENTS_DIR,
    INTERBASE_LAUNCHD_DISABLED: env.INTERBASE_LAUNCHD_DISABLED,
  }
}

function captureRuntimeEnv(env: NodeJS.ProcessEnv): CliRuntimeEnv {
  return cliRuntimeEnvFromProcessEnv(env)
}

function applyRuntimeEnv(env: CliRuntimeSubprocessEnv): void {
  process.env.HOME = env.HOME
  process.env.XDG_DATA_HOME = env.XDG_DATA_HOME
  process.env.XDG_CACHE_HOME = env.XDG_CACHE_HOME
  process.env.XDG_CONFIG_HOME = env.XDG_CONFIG_HOME
  process.env.XDG_STATE_HOME = env.XDG_STATE_HOME
  setOptionalEnv("INTERBASE_TEST_SANDBOX_ROOT", env.INTERBASE_TEST_SANDBOX_ROOT)
  setOptionalEnv("INTERBASE_DB", env.INTERBASE_DB)
  setOptionalEnv("INTERBASE_CONFIG_DIR", env.INTERBASE_CONFIG_DIR)
  setOptionalEnv("INTERBASE_LAUNCH_AGENTS_DIR", env.INTERBASE_LAUNCH_AGENTS_DIR)
  setOptionalEnv("INTERBASE_LAUNCHD_DISABLED", env.INTERBASE_LAUNCHD_DISABLED)
}

function restoreRuntimeEnv(env: CliRuntimeEnv): void {
  setOptionalEnv("HOME", env.HOME)
  setOptionalEnv("XDG_DATA_HOME", env.XDG_DATA_HOME)
  setOptionalEnv("XDG_CACHE_HOME", env.XDG_CACHE_HOME)
  setOptionalEnv("XDG_CONFIG_HOME", env.XDG_CONFIG_HOME)
  setOptionalEnv("XDG_STATE_HOME", env.XDG_STATE_HOME)
  setOptionalEnv("INTERBASE_TEST_SANDBOX_ROOT", env.INTERBASE_TEST_SANDBOX_ROOT)
  setOptionalEnv("INTERBASE_DB", env.INTERBASE_DB)
  setOptionalEnv("INTERBASE_CONFIG_DIR", env.INTERBASE_CONFIG_DIR)
  setOptionalEnv("INTERBASE_LAUNCH_AGENTS_DIR", env.INTERBASE_LAUNCH_AGENTS_DIR)
  setOptionalEnv("INTERBASE_LAUNCHD_DISABLED", env.INTERBASE_LAUNCHD_DISABLED)
}

function setOptionalEnv(key: keyof CliRuntimeEnv, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}

function productionPaths(env: CliRuntimeEnv): CliRuntimePaths {
  const home = brandHomeDirectory(path.resolve(env.HOME?.trim() || os.homedir()))
  const dataRoot = env.XDG_DATA_HOME?.trim() || path.join(home, ".local", "share")
  const cacheRoot = env.XDG_CACHE_HOME?.trim() || path.join(home, ".cache")
  const configRoot = env.XDG_CONFIG_HOME?.trim() || path.join(home, ".config")
  const stateRoot = env.XDG_STATE_HOME?.trim() || path.join(home, ".local", "state")
  const data = brandDataDirectory(path.join(absolutePath(dataRoot), "interbase"))
  const cache = brandCacheDirectory(path.join(absolutePath(cacheRoot), "interbase"))
  const config = brandConfigDirectory(
    env.INTERBASE_CONFIG_DIR?.trim()
      ? path.resolve(absolutePath(env.INTERBASE_CONFIG_DIR.trim()))
      : path.join(absolutePath(configRoot), "interbase"),
  )
  const state = brandStateDirectory(path.join(absolutePath(stateRoot), "interbase"))
  return {
    home,
    data,
    cache,
    config,
    state,
    tmp: brandTempDirectory(path.join(os.tmpdir(), "interbase")),
    bin: brandBinDirectory(path.join(cache, "bin")),
    log: brandLogDirectory(path.join(data, "log")),
  }
}

function testPaths(root: SandboxRootPath): CliRuntimePaths {
  return {
    home: brandHomeDirectory(path.join(root, "home")),
    data: brandDataDirectory(path.join(root, "share", "interbase")),
    cache: brandCacheDirectory(path.join(root, "cache", "interbase")),
    config: brandConfigDirectory(path.join(root, "config", "interbase")),
    state: brandStateDirectory(path.join(root, "state", "interbase")),
    tmp: brandTempDirectory(path.join(root, "tmp")),
    bin: brandBinDirectory(path.join(root, "cache", "interbase", "bin")),
    log: brandLogDirectory(path.join(root, "share", "interbase", "log")),
  }
}

function databaseTarget(
  paths: CliRuntimePaths,
  override: string | undefined,
  channel: InstallationChannel,
): DatabaseTarget {
  if (!override?.trim())
    return { kind: "channel", channel, path: databaseFilePath(paths, { kind: "channel", channel }) }
  const value = override.trim()
  if (value === ":memory:") return { kind: "memory" }
  if (path.isAbsolute(value)) return { kind: "file", path: databaseFilePath(paths, { kind: "absolute", path: value }) }
  if (value.includes("/") || value.includes("\\") || value === "." || value === "..")
    throw new InvalidDatabaseOverrideError({ value })
  return { kind: "file", path: databaseFilePath(paths, { kind: "relative", name: value }) }
}

function launchdPolicy(paths: CliRuntimePaths, env: CliRuntimeEnv): LaunchdPolicy {
  if (env.INTERBASE_LAUNCHD_DISABLED === "1") return { kind: "disabled" }
  const launchAgentsDirectory = env.INTERBASE_LAUNCH_AGENTS_DIR?.trim()
    ? brandLaunchAgentsDirectory(path.resolve(absolutePath(env.INTERBASE_LAUNCH_AGENTS_DIR.trim())))
    : brandLaunchAgentsDirectory(path.join(paths.home, "Library", "LaunchAgents"))
  return { kind: "enabled", launchAgentsDirectory, logFile: logFilePath(paths, "launchd.log") }
}

function deserializeAccessPolicy(value: SerializedRuntimeAccessPolicy): RuntimeAccessPolicy {
  if (value.kind === "production") return value
  return { kind: "test", sandboxRoot: sandboxRootPath(value.sandboxRoot) }
}

function deserializeDatabaseTarget(paths: CliRuntimePaths, value: SerializedDatabaseTarget): DatabaseTarget {
  if (value.kind === "memory") return value
  if (value.kind === "file")
    return { kind: "file", path: databaseFilePath(paths, { kind: "absolute", path: value.path }) }
  return {
    kind: "channel",
    channel: value.channel,
    path: databaseFilePath(paths, { kind: "absolute", path: value.path }),
  }
}

function deserializeLaunchdPolicy(value: SerializedLaunchdPolicy): LaunchdPolicy {
  if (value.kind === "disabled") return value
  return {
    kind: "enabled",
    launchAgentsDirectory: brandLaunchAgentsDirectory(path.resolve(absolutePath(value.launchAgentsDirectory))),
    logFile: brandLogFile(path.resolve(absolutePath(value.logFile))),
  }
}

function rebrandPaths(value: SerializedCliRuntimeContext["paths"]): CliRuntimePaths {
  return {
    home: brandHomeDirectory(path.resolve(absolutePath(value.home))),
    data: brandDataDirectory(path.resolve(absolutePath(value.data))),
    cache: brandCacheDirectory(path.resolve(absolutePath(value.cache))),
    config: brandConfigDirectory(path.resolve(absolutePath(value.config))),
    state: brandStateDirectory(path.resolve(absolutePath(value.state))),
    tmp: brandTempDirectory(path.resolve(absolutePath(value.tmp))),
    bin: brandBinDirectory(path.resolve(absolutePath(value.bin))),
    log: brandLogDirectory(path.resolve(absolutePath(value.log))),
  }
}

function joinFile(parent: DirectoryPath, name: string): FilePath {
  const normalized = path.resolve(parent, name)
  if (!isPathInside(parent, normalized))
    throw new SandboxEscapeError({ operation: "write", path: normalized, sandboxRoot: parent })
  return brandFile(normalized)
}

function databaseFileNameForChannel(channel: InstallationChannel) {
  if (["latest", "beta", "prod"].includes(channel)) return "interbase.db"
  return `interbase-${channel.replace(/[^a-zA-Z0-9._-]/g, "-")}.db`
}

function realpathBoundary(value: AbsolutePath): AbsolutePath {
  return brandAbsolute(realpathSync(value))
}

function realpathExistingParentBoundary(value: AbsolutePath): AbsolutePath {
  const missingSegments: string[] = []
  let candidate = value
  while (!existsSync(candidate)) {
    const parent = path.dirname(candidate)
    if (parent === candidate) return value
    missingSegments.unshift(path.basename(candidate))
    candidate = brandAbsolute(parent)
  }
  return brandAbsolute(path.resolve(realpathSync(candidate), ...missingSegments))
}

function isPathInside(root: string, value: string) {
  const relative = path.relative(path.resolve(root), path.resolve(value))
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function brandAbsolute(value: string): AbsolutePath {
  return value as AbsolutePath
}

function brandDirectory(value: string): DirectoryPath {
  return brandAbsolute(value) as DirectoryPath
}

function brandFile(value: string): FilePath {
  return brandAbsolute(value) as FilePath
}

function brandHomeDirectory(value: string): HomeDirectoryPath {
  return brandDirectory(value) as HomeDirectoryPath
}

function brandDataDirectory(value: string): DataDirectoryPath {
  return brandDirectory(value) as DataDirectoryPath
}

function brandCacheDirectory(value: string): CacheDirectoryPath {
  return brandDirectory(value) as CacheDirectoryPath
}

function brandConfigDirectory(value: string): ConfigDirectoryPath {
  return brandDirectory(value) as ConfigDirectoryPath
}

function brandStateDirectory(value: string): StateDirectoryPath {
  return brandDirectory(value) as StateDirectoryPath
}

function brandTempDirectory(value: string): TempDirectoryPath {
  return brandDirectory(value) as TempDirectoryPath
}

function brandBinDirectory(value: string): BinDirectoryPath {
  return brandDirectory(value) as BinDirectoryPath
}

function brandLogDirectory(value: string): LogDirectoryPath {
  return brandDirectory(value) as LogDirectoryPath
}

function brandLaunchAgentsDirectory(value: string): LaunchAgentsDirectoryPath {
  return brandDirectory(value) as LaunchAgentsDirectoryPath
}

function brandSandboxRoot(value: string): SandboxRootPath {
  return brandDirectory(value) as SandboxRootPath
}

function brandStateFile(value: string): StateFilePath {
  return brandFile(value) as StateFilePath
}

function brandDatabaseFile(value: string): DatabaseFilePath {
  return brandFile(value) as DatabaseFilePath
}

function brandConfigFile(value: string): ConfigFilePath {
  return brandFile(value) as ConfigFilePath
}

function brandLogFile(value: string): LogFilePath {
  return brandFile(value) as LogFilePath
}

function brandTempFile(value: string): TempFilePath {
  return brandFile(value) as TempFilePath
}
