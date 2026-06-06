import { existsSync } from "node:fs"
import { ComputerUseProtocolError, type DriverHealth } from "@interbase/computer-use-protocol"
import type { DesktopAvailabilityDecision } from "@interbase/computer-use-policy"
import type { ComputerUseDriver } from "@/computer-use/driver"
import { detectHostDesktopAvailability } from "@/computer-use/desktop-availability"
import { type HelperAuthenticityResult, type HelperManifest } from "@/computer-use/helper-authenticity"
import { buildHelperLaunchCommand, launchHelperStatusMenu, type HelperLaunchCommand, type HelperLaunchDiscovery } from "@/computer-use/helper-launch"
import { loadHelperManifest } from "@/computer-use/helper-manifest"
import { createHelperProcessDriver } from "@/computer-use/helper-driver"
import { createHelperRpcClient, type HelperRpcClient, type HelperRpcConnection } from "@/computer-use/helper-rpc-client"
import { createNodeHelperBundleDiscovery } from "@/computer-use/helper-discovery-node"
import { createHelperStdioConnection } from "@/computer-use/helper-stdio-connection"

export type NativeHelperDriverFactoryResult =
  | { available: true; driver: ComputerUseDriver; command: HelperLaunchCommand }
  | { available: false; reason: "desktopSessionUnavailable" | "platformUnsupported" | "helper_not_found" | "path_mismatch" | "protocol_mismatch" | "version_out_of_range" | "checksum_mismatch" | "signature_invalid" | "team_id_mismatch" | "bundle_id_mismatch" }

export type NativeHelperDriverFactoryInput = {
  manifest: HelperManifest
  helperPath?: string
  env?: Record<string, string | undefined>
  availability?: DesktopAvailabilityDecision
  discovery: HelperLaunchDiscovery
  connect: (command: HelperLaunchCommand) => HelperRpcConnection
  launchStatusMenu?: (command: HelperLaunchCommand) => void
  nowMs?: () => number
  cleanupAfterCrash?: (reason: string, atMs: number) => void
}

export type DefaultNativeHelperDriverInput = Omit<NativeHelperDriverFactoryInput, "discovery" | "connect" | "manifest"> & { manifest?: HelperManifest }

export function createDefaultNativeHelperDriver(input: DefaultNativeHelperDriverInput = {}): NativeHelperDriverFactoryResult {
  const env = input.env ?? process.env
  const helperPath = input.helperPath ?? env.INTERBASE_COMPUTER_USE_HELPER_PATH
  return createNativeHelperDriver({
    ...input,
    env,
    manifest: input.manifest ?? loadHelperManifest({ env, helperPath }),
    helperPath,
    discovery: createNodeHelperBundleDiscovery(),
    connect: (command) => createHelperStdioConnection(command),
  })
}

export function createNativeHelperDriver(input: NativeHelperDriverFactoryInput): NativeHelperDriverFactoryResult {
  const availability = input.availability ?? detectHostDesktopAvailability({ env: input.env })
  if (!availability.available) return { available: false, reason: availability.reason }

  const launch = buildHelperLaunchCommand({
    manifest: input.manifest,
    helperPath: input.helperPath,
    env: input.env,
    discovery: input.discovery,
  })
  if (!launch.allowed) {
    const requestDir = launch.reason === "helper_not_found" ? explicitHelperRequestDir(input.env) : undefined
    if (!requestDir) return { available: false, reason: launch.reason }
    const command: HelperLaunchCommand = {
      command: "",
      args: [],
      env: { INTERBASE_COMPUTER_USE_PROTOCOL_MAJOR: String(input.manifest.protocolMajor) },
      warnings: ["reused an already-running computer-use helper request directory"],
      requestDir,
      launchMethod: "existingPersistentFileRpc",
    }
    return createAvailableHelperDriver({ ...input, command, launchReason: "untrusted_driver_allowed" })
  }

  return createAvailableHelperDriver({ ...input, command: launch.command, launchReason: launch.reason })
}

function createAvailableHelperDriver(input: NativeHelperDriverFactoryInput & { command: HelperLaunchCommand; launchReason: "verified" | "untrusted_driver_allowed" }): NativeHelperDriverFactoryResult {
  const launchStatusMenu = input.launchStatusMenu ?? launchHelperStatusMenu
  launchStatusMenu(input.command)
  const rpc = createHelperRpcClient({ connection: input.connect(input.command) })
  const driver = createHelperProcessDriver({
    host: rpcSupervisorHost(rpc, input.launchReason),
    client: { observe: (request, config) => rpc.observe(request, config), act: (request) => rpc.act(request), artifact: (id) => rpc.artifact(id) },
    nowMs: input.nowMs,
    cleanupAfterCrash: input.cleanupAfterCrash,
  })
  return { available: true, driver, command: input.command }
}

function explicitHelperRequestDir(env: Record<string, string | undefined> | undefined) {
  const explicit = env?.INTERBASE_COMPUTER_USE_HELPER_REQUEST_DIR?.trim()
  if (explicit && existsSync(explicit)) return explicit
  return undefined
}

function rpcSupervisorHost(rpc: HelperRpcClient, launchReason: "verified" | "untrusted_driver_allowed") {
  let health: DriverHealth | undefined
  const authenticity: HelperAuthenticityResult = launchReason === "verified"
    ? { trusted: true, reason: "verified", warnings: [] }
    : { trusted: true, reason: "untrusted_driver_allowed", warnings: ["untrusted helper driver allowed by explicit development override"] }
  return {
    verifyAuthenticity: () => authenticity,
    launch: async () => {
      health = await rpc.health()
      return health
    },
    status: async () => {
      const status = await rpc.status()
      if (health && !sameHealth(status.health, health)) {
        throw new ComputerUseProtocolError("health_mismatch", "Helper status health does not match launched helper health")
      }
      return status
    },
  }
}

function sameHealth(left: DriverHealth | undefined, right: DriverHealth) {
  return left?.protocolMajor === right.protocolMajor
    && left.driver === right.driver
    && left.version === right.version
    && sameStringSet(left.capabilities, right.capabilities)
}

function sameStringSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const values = new Set(left)
  return right.every((value) => values.has(value))
}
