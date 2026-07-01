import { decideDesktopAvailability, type DesktopAvailabilityDecision } from "@interbase/computer-use-policy"

export type HostDesktopAvailabilityInput = {
  env?: Record<string, string | undefined>
  platform?: string
  nativePlatforms?: string[]
  stdinIsTTY?: boolean
}

export function detectHostDesktopAvailability(input: HostDesktopAvailabilityInput = {}): DesktopAvailabilityDecision {
  const env = input.env ?? process.env
  const platform = input.platform ?? process.platform
  return decideDesktopAvailability({
    platform,
    nativePlatforms: input.nativePlatforms,
    ci: isTruthy(env.CI),
    ssh: Boolean(env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY),
    remoteContainer: isTruthy(env.CODESPACES) || isTruthy(env.REMOTE_CONTAINERS) || isTruthy(env.DEVCONTAINER),
    wsl: platform === "linux" && Boolean(env.WSL_DISTRO_NAME || env.WSL_INTEROP),
    interactive: input.stdinIsTTY ?? process.stdin.isTTY === true,
    hasDesktopSession: hasDesktopSession(platform, env),
  })
}

export function desktopAvailabilityMessage(decision: Exclude<DesktopAvailabilityDecision, { available: true }>) {
  return `${decision.reason}: ${decision.remediation}`
}

function hasDesktopSession(platform: string, env: Record<string, string | undefined>) {
  if (platform === "darwin") return Boolean(env.__CF_USER_TEXT_ENCODING || env.XPC_SERVICE_NAME || env.TERM_PROGRAM)
  if (platform === "linux") return Boolean(env.DISPLAY || env.WAYLAND_DISPLAY)
  if (platform === "win32") return Boolean(env.SESSIONNAME)
  return false
}

function isTruthy(value: string | undefined) {
  return value === "1" || value === "true" || value === "TRUE"
}
