import { spawn } from "node:child_process"
import { verifyHelperAuthenticity, type HelperCandidate, type HelperManifest } from "@/computer-use/helper-authenticity"

export type HelperLaunchCommand = {
  command: string
  args: string[]
  env: Record<string, string>
  warnings: string[]
  appPath?: string
  launchMethod?: "direct" | "launchServicesPersistentFileRpc"
}

export type HelperStatusMenuLaunchCommand = {
  command: string
  args: string[]
  env: Record<string, string>
}

export type HelperLaunchDiscovery = {
  exists: (path: string) => boolean
  candidate: (path: string) => HelperCandidate | undefined
}

export type HelperLaunchOptions = {
  manifest: HelperManifest
  helperPath?: string
  env?: Record<string, string | undefined>
  discovery: HelperLaunchDiscovery
}

export type HelperLaunchDecision =
  | { allowed: true; reason: "verified" | "untrusted_driver_allowed"; command: HelperLaunchCommand }
  | { allowed: false; reason: "helper_not_found" | "path_mismatch" | "protocol_mismatch" | "version_out_of_range" | "checksum_mismatch" | "signature_invalid" | "team_id_mismatch" | "bundle_id_mismatch" }

export function buildHelperLaunchCommand(options: HelperLaunchOptions): HelperLaunchDecision {
  const manifest = options.manifest
  const helperPath = options.helperPath ?? manifest.expectedPath
  if (!options.discovery.exists(helperPath)) return { allowed: false, reason: "helper_not_found" }
  const candidate = options.discovery.candidate(helperPath)
  if (!candidate) return { allowed: false, reason: "helper_not_found" }
  const authenticity = verifyHelperAuthenticity({
    manifest,
    candidate,
    allowUntrustedDriver: options.env?.INTERBASE_COMPUTER_USE_ALLOW_UNTRUSTED_DRIVER === "1",
  })
  if (!authenticity.trusted) return { allowed: false, reason: authenticity.reason }
  const command: HelperLaunchCommand = helperPath.endsWith(".app") ? {
    command: "/usr/bin/open",
    args: [],
    env: { INTERBASE_COMPUTER_USE_PROTOCOL_MAJOR: String(manifest.protocolMajor) },
    warnings: authenticity.warnings,
    appPath: helperPath,
    launchMethod: "launchServicesPersistentFileRpc",
  } : {
    command: executablePath(helperPath),
    args: ["--stdio"],
    env: { INTERBASE_COMPUTER_USE_PROTOCOL_MAJOR: String(manifest.protocolMajor) },
    warnings: authenticity.warnings,
  }
  return {
    allowed: true,
    reason: authenticity.reason,
    command,
  }
}

export function buildHelperStatusMenuLaunchCommand(command: HelperLaunchCommand): HelperStatusMenuLaunchCommand | undefined {
  if (command.appPath === undefined) return undefined
  return {
    command: "/usr/bin/open",
    args: ["-g", command.appPath, "--args", "--status-menu"],
    env: command.env,
  }
}

export function launchHelperStatusMenu(command: HelperLaunchCommand): void {
  const menu = buildHelperStatusMenuLaunchCommand(command)
  if (menu === undefined) return
  try {
    const child = spawn(menu.command, menu.args, {
      detached: true,
      env: { ...process.env, ...menu.env },
      stdio: "ignore",
    })
    child.unref()
  } catch {
    // The monitor UI is best-effort; helper RPC still enforces policy and permissions.
  }
}

function executablePath(path: string) {
  return path
}
