import {
  ComputerUseProtocolError,
  assertTrustedDriver,
  validateDriverHealth,
  type DriverHealth,
  type DriverStatus,
  type OsPermission,
} from "@interbase/computer-use-protocol"
import { createHelperTransport, type HelperTransport } from "@/computer-use/helper-transport"
import type { HelperAuthenticityResult } from "@/computer-use/helper-authenticity"

export type HelperRequestKind = "observe" | "act"

export type HelperSupervisorDecision =
  | { allowed: true; reason: "ready"; health: DriverHealth; status: DriverStatus; restarted: boolean }
  | { allowed: false; reason: string; retryable: boolean }

export type HelperSupervisorHost = {
  verifyAuthenticity: () => HelperAuthenticityResult
  launch: () => DriverHealth | Promise<DriverHealth>
  status: () => DriverStatus | Promise<DriverStatus>
  cleanupStaleState?: () => void
}

export function createHelperSupervisor(host: HelperSupervisorHost, transport: HelperTransport = createHelperTransport()) {
  let started = false
  let health: DriverHealth | undefined

  return {
    async ensureReady(kind: HelperRequestKind, nowMs: number, requiredPermissions: OsPermission[] = defaultRequiredPermissions(kind)): Promise<HelperSupervisorDecision> {
      if (!started && !transport.canRestart(nowMs)) return { allowed: false, reason: "restart_backoff", retryable: true }
      let restarted = false
      if (!started) {
        const authenticity = host.verifyAuthenticity()
        if (!authenticity.trusted) return { allowed: false, reason: authenticity.reason, retryable: false }
        try {
          health = validateDriverHealth(await host.launch())
          started = true
          restarted = true
          transport.recordStarted()
        } catch (error) {
          started = false
          transport.recordCrash(nowMs)
          return { allowed: false, reason: errorReason(error), retryable: kind === "observe" }
        }
      }

      try {
        const status = assertTrustedDriver(await host.status())
        const permissionReason = deniedPermissionReason(status, requiredPermissions)
        if (permissionReason) return { allowed: false, reason: permissionReason, retryable: false }
        return { allowed: true, reason: "ready", health: health!, status, restarted }
      } catch (error) {
        started = false
        host.cleanupStaleState?.()
        transport.recordCrash(nowMs)
        return { allowed: false, reason: errorReason(error), retryable: kind === "observe" }
      }
    },
    transport,
    isStarted() {
      return started
    },
  }
}

function defaultRequiredPermissions(kind: HelperRequestKind): OsPermission[] {
  return kind === "observe" ? ["accessibility"] : ["accessibility"]
}

function deniedPermissionReason(status: DriverStatus, required: OsPermission[]) {
  for (const permission of required) {
    const grant = status.permissionState[permission]
    if (grant === "missing") return `missing_${permission}_permission`
    if (grant === "unknown") return `unknown_${permission}_permission`
  }
  return undefined
}

function errorReason(error: unknown) {
  if (error instanceof ComputerUseProtocolError) return error.code
  if (error instanceof Error) return error.message || "helper_error"
  return "helper_error"
}
