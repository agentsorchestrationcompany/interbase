import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR, type DriverHealth, type DriverStatus } from "@interbase/computer-use-protocol"
import { createHelperSupervisor } from "@/computer-use/helper-supervisor"

const health: DriverHealth = { protocolMajor: PROTOCOL_MAJOR, driver: "mock", version: "0.1.0", capabilities: ["status", "observe"] }
const status: DriverStatus = {
  available: true,
  crashed: false,
  health,
  authenticity: { trusted: true, reason: "mock_driver" },
  permissionState: { accessibility: "granted", screenRecording: "granted" },
  missingPermissions: [],
}

describe("computer-use helper supervisor", () => {
  test("lazy-starts after authenticity verification and reuses running helper", async () => {
    let verified = 0
    let launched = 0
    const supervisor = createHelperSupervisor({
      verifyAuthenticity: () => {
        verified++
        return { trusted: true, reason: "verified", warnings: [] }
      },
      launch: () => {
        launched++
        return health
      },
      status: () => status,
    })
    expect(supervisor.isStarted()).toBe(false)
    expect(await supervisor.ensureReady("observe", 1_000)).toMatchObject({ allowed: true, reason: "ready", restarted: true })
    expect(await supervisor.ensureReady("act", 1_001)).toMatchObject({ allowed: true, reason: "ready", restarted: false })
    expect({ verified, launched, started: supervisor.isStarted() }).toEqual({ verified: 1, launched: 1, started: true })
  })

  test("denies launch before start when authenticity fails", async () => {
    let launched = false
    const supervisor = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: false, reason: "signature_invalid", warnings: [] }),
      launch: () => {
        launched = true
        return health
      },
      status: () => status,
    })
    expect(await supervisor.ensureReady("observe", 1_000)).toEqual({ allowed: false, reason: "signature_invalid", retryable: false })
    expect(launched).toBe(false)
  })

  test("records launch protocol failures and applies restart backoff", async () => {
    const supervisor = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
      launch: () => ({ ...health, protocolMajor: 999 }),
      status: () => status,
    })
    expect(await supervisor.ensureReady("observe", 1_000)).toEqual({ allowed: false, reason: "unsupported_protocol", retryable: true })
    expect(await supervisor.ensureReady("observe", 1_100)).toEqual({ allowed: false, reason: "restart_backoff", retryable: true })
  })

  test("cleans stale state after crashes and restarts observe calls after backoff", async () => {
    let cleaned = 0
    let launched = 0
    let crashed = true
    const supervisor = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
      launch: () => {
        launched++
        return health
      },
      status: () => ({ ...status, crashed }),
      cleanupStaleState: () => {
        cleaned++
        crashed = false
      },
    })
    expect(await supervisor.ensureReady("observe", 1_000)).toEqual({ allowed: false, reason: "driver_crashed", retryable: true })
    expect(await supervisor.ensureReady("observe", 1_100)).toEqual({ allowed: false, reason: "restart_backoff", retryable: true })
    expect(await supervisor.ensureReady("observe", 1_250)).toMatchObject({ allowed: true, restarted: true })
    expect({ cleaned, launched }).toEqual({ cleaned: 1, launched: 2 })
  })

  test("does not silently retry actions after helper crash", async () => {
    const supervisor = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
      launch: () => health,
      status: () => ({ ...status, crashed: true }),
    })
    expect(await supervisor.ensureReady("act", 1_000)).toEqual({ allowed: false, reason: "driver_crashed", retryable: false })
  })

  test("fails closed when required OS permissions are missing or unknown", async () => {
    const missingAccessibility = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
      launch: () => health,
      status: () => ({ ...status, permissionState: { accessibility: "missing", screenRecording: "granted" }, missingPermissions: ["accessibility"] }),
    })
    expect(await missingAccessibility.ensureReady("observe", 1_000)).toEqual({ allowed: false, reason: "missing_accessibility_permission", retryable: false })

    const unknownScreenRecording = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
      launch: () => health,
      status: () => ({ ...status, permissionState: { accessibility: "granted", screenRecording: "unknown" } }),
    })
    expect(await unknownScreenRecording.ensureReady("observe", 1_000, ["accessibility", "screenRecording"])).toEqual({
      allowed: false,
      reason: "unknown_screenRecording_permission",
      retryable: false,
    })
    expect(await unknownScreenRecording.ensureReady("observe", 1_001, ["accessibility"])).toMatchObject({ allowed: true, reason: "ready" })
  })

  test("allows callers to request no extra OS permissions", async () => {
    const supervisor = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
      launch: () => health,
      status: () => ({ ...status, permissionState: { accessibility: "unknown", screenRecording: "unknown" } }),
    })
    expect(await supervisor.ensureReady("observe", 1_000, [])).toMatchObject({ allowed: true, reason: "ready" })
  })

  test("maps launch and status defects to stable reasons", async () => {
    const launchError = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
      launch: () => {
        throw new Error("launch_failed")
      },
      status: () => status,
    })
    expect(await launchError.ensureReady("act", 1_000)).toEqual({ allowed: false, reason: "launch_failed", retryable: false })

    const statusError = createHelperSupervisor({
      verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
      launch: () => health,
      status: () => {
        throw "bad-status"
      },
    })
    expect(await statusError.ensureReady("observe", 1_000)).toEqual({ allowed: false, reason: "helper_error", retryable: true })
  })
})
