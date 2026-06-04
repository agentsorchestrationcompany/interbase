import fs from "fs/promises"
import { Context, Effect, Layer } from "effect"
import {
  absolutePath,
  assertRuntimePathAccess,
  cliRuntimeEnvFromProcessEnv,
  parseCliRuntimeEnvironment,
} from "@interbase/cli-runtime-context"
import { Flock } from "./util/flock"
import { Flag } from "./flag/flag"

const runtimeContext = parseCliRuntimeEnvironment(cliRuntimeEnvFromProcessEnv(process.env))

export interface Interface {
  home: string
  data: string
  cache: string
  config: string
  state: string
  tmp: string
  bin: string
  log: string
}

const paths: Interface = {
  get home() {
    return runtimeContext.paths.home
  },
  data: runtimeContext.paths.data,
  bin: runtimeContext.paths.bin,
  log: runtimeContext.paths.log,
  cache: runtimeContext.paths.cache,
  config: runtimeContext.paths.config,
  state: runtimeContext.paths.state,
  tmp: runtimeContext.paths.tmp,
}

export const Path = paths

assertTestSandboxPaths(paths)

Flock.setGlobal({ state: paths.state })

await Promise.all([
  fs.mkdir(Path.data, { recursive: true }),
  fs.mkdir(Path.config, { recursive: true }),
  fs.mkdir(Path.state, { recursive: true }),
  fs.mkdir(Path.tmp, { recursive: true }),
  fs.mkdir(Path.log, { recursive: true }),
  fs.mkdir(Path.bin, { recursive: true }),
])

export class Service extends Context.Service<Service, Interface>()("@interbase/Global") {}

export function make(input: Partial<Interface> = {}): Interface {
  return {
    home: Path.home,
    data: Path.data,
    cache: Path.cache,
    config: Flag.INTERBASE_CONFIG_DIR ?? Path.config,
    state: Path.state,
    tmp: Path.tmp,
    bin: Path.bin,
    log: Path.log,
    ...input,
  }
}

export const layer = Layer.effect(
  Service,
  Effect.sync(() => Service.of(make())),
)

export const layerWith = (input: Partial<Interface>) =>
  Layer.effect(
    Service,
    Effect.sync(() => Service.of(make(input))),
  )

function assertTestSandboxPaths(input: Interface) {
  if (!isLikelyTestProcess() && runtimeContext.accessPolicy.kind !== "test") return
  if (runtimeContext.accessPolicy.kind !== "test") {
    throw new Error(
      "Interbase test process started without INTERBASE_TEST_SANDBOX_ROOT. Run tests through the package test harness so user data paths are isolated.",
    )
  }
  const entries = [
    ["home", input.home],
    ["data", input.data],
    ["cache", input.cache],
    ["config", input.config],
    ["state", input.state],
    ["tmp", input.tmp],
    ["bin", input.bin],
    ["log", input.log],
  ] as const
  for (const [name, value] of entries) {
    try {
      assertRuntimePathAccess(runtimeContext.accessPolicy, absolutePath(value), "read")
    } catch {
      throw new Error(
        `Interbase test ${name} path escapes sandbox: ${value} is not inside ${runtimeContext.accessPolicy.sandboxRoot}.`,
      )
    }
  }
}

function isLikelyTestProcess() {
  if (process.env.NODE_ENV === "test") return true
  if (process.env.BUN_TEST === "1") return true
  return false
}

export * as Global from "./global"
