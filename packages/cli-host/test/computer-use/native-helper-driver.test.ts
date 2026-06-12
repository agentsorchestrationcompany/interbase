import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR, encodeEnvelope, type DriverHealth, type DriverStatus, type IpcEnvelope } from "@interbase/computer-use-protocol"
import { makeSanitizedMockObservation } from "@interbase/computer-use-testkit"
import { createDefaultNativeHelperDriver, createNativeHelperDriver } from "@/computer-use/native-helper-driver"
import type { HelperLaunchDiscovery } from "@/computer-use/helper-launch"
import type { HelperRpcConnection } from "@/computer-use/helper-rpc-client"

const helperPath = "native/macos/InterbaseComputerUseHelper.app"
const manifest = { expectedPath: helperPath, protocolMajor: PROTOCOL_MAJOR, minVersion: "0.1.0", maxVersionExclusive: "1.0.0", checksum: "abc123", teamId: "TEAMID", bundleId: "ai.interbase.computer-use-helper" }
const health: DriverHealth = { protocolMajor: PROTOCOL_MAJOR, driver: "macos", version: "0.1.0", capabilities: ["status", "observe", "act"] }
const status: DriverStatus = {
  available: true,
  crashed: false,
  health,
  authenticity: { trusted: true, reason: "mock_driver" },
  permissionState: { accessibility: "granted", screenRecording: "granted" },
  missingPermissions: [],
}

const discovery: HelperLaunchDiscovery = {
  exists: () => true,
  candidate: () => ({
    path: helperPath,
    protocolMajor: PROTOCOL_MAJOR,
    version: "0.1.0",
    checksum: "abc123",
    signatureValid: true,
    teamId: "TEAMID",
    bundleId: "ai.interbase.computer-use-helper",
  }),
}

function connection(overrides: { status?: DriverStatus; health?: DriverHealth; crashOnStatus?: boolean } = {}): HelperRpcConnection {
  return {
    request: (line) => {
      const envelope = JSON.parse(line) as IpcEnvelope<{ id: string; method: string; params: unknown }>
      const request = envelope.payload
      if (request.method === "health") return response(request.id, overrides.health ?? health)
      if (request.method === "status") {
        if (overrides.crashOnStatus) return response(request.id, { ...status, crashed: true })
        return response(request.id, overrides.status ?? status)
      }
      if (request.method === "observe") return response(request.id, makeSanitizedMockObservation({ enabled: true }))
      if (request.method === "act") return response(request.id, { id: "act_1", status: "performed", app: { name: "Mock" }, warnings: [] })
      if (request.method === "artifact") return response(request.id, { id: "artifact_1", mimeType: "image/png", dataBase64: "AQID" })
      return response(request.id, true)
    },
  }
}

function response(id: string, result: unknown) {
  return encodeEnvelope({ id, method: "response", protocolMajor: PROTOCOL_MAJOR, payload: { id, result } })
}

describe("computer-use native helper driver factory", () => {
  test("default native factory short-circuits unavailable desktop sessions", () => {
    expect(createDefaultNativeHelperDriver({ availability: { available: false, reason: "desktopSessionUnavailable", remediation: "Open a desktop session." } })).toEqual({
      available: false,
      reason: "desktopSessionUnavailable",
    })
  })

  test("default native factory reports missing generated helper artifacts", () => {
    const statusMenuCommands: unknown[] = []
    const result = createDefaultNativeHelperDriver({
      availability: { available: true, reason: "desktop_session_available" },
      launchStatusMenu: (command) => statusMenuCommands.push(command),
    })
    expect(result).toEqual({ available: false, reason: "helper_not_found" })
    expect(statusMenuCommands).toEqual([])
  })

  test("creates a supervised driver from availability, discovery, launch, and RPC", async () => {
    const commands: unknown[] = []
    const menuCommands: unknown[] = []
    const result = createNativeHelperDriver({
      availability: { available: true, reason: "desktop_session_available" },
      manifest,
      discovery,
      connect: (command) => {
        commands.push(command)
        return connection()
      },
      launchStatusMenu: (command) => menuCommands.push(command),
      nowMs: () => 1_000,
    })
    expect(result).toMatchObject({ available: true, command: { command: "/usr/bin/open", args: [], appPath: helperPath, launchMethod: "launchServicesPersistentFileRpc" } })
    if (!result.available) throw new Error("expected driver")
    expect(await result.driver.observe({ includeScreenshot: false }, { enabled: true })).toMatchObject({ id: "obs_mock_001" })
    expect(await result.driver.act({ id: "act_1", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).toMatchObject({ status: "performed" })
    expect([...(await result.driver.readArtifact!("artifact_1"))]).toEqual([1, 2, 3])
    expect(commands).toHaveLength(1)
    expect(menuCommands).toEqual(commands)
  })

  test("returns desktop and launch denials before connecting", () => {
    let connected = false
    expect(
      createNativeHelperDriver({
        availability: { available: false, reason: "platformUnsupported", remediation: "unsupported" },
        manifest,
        discovery,
        connect: () => {
          connected = true
          return connection()
        },
      }),
    ).toEqual({ available: false, reason: "platformUnsupported" })
    expect(
      createNativeHelperDriver({
        availability: { available: true, reason: "desktop_session_available" },
        manifest,
        discovery: { ...discovery, exists: () => false },
        connect: () => {
          connected = true
          return connection()
        },
      }),
    ).toEqual({ available: false, reason: "helper_not_found" })
    expect(connected).toBe(false)
  })

  test("does not launch status menu when helper launch is denied", () => {
    const menuCommands: unknown[] = []
    expect(
      createNativeHelperDriver({
        availability: { available: true, reason: "desktop_session_available" },
        manifest,
        discovery: { ...discovery, exists: () => false },
        connect: () => connection(),
        launchStatusMenu: (command) => menuCommands.push(command),
      }),
    ).toEqual({ available: false, reason: "helper_not_found" })
    expect(menuCommands).toEqual([])
  })

  test("propagates helper permission readiness failures", async () => {
    const result = createNativeHelperDriver({
      availability: { available: true, reason: "desktop_session_available" },
      manifest,
      discovery,
      connect: () => connection({ status: { ...status, permissionState: { accessibility: "granted", screenRecording: "missing" }, missingPermissions: ["screenRecording"] } }),
      nowMs: () => 1_000,
    })
    if (!result.available) throw new Error("expected driver")
    expect(await result.driver.observe({ includeScreenshot: false }, { enabled: true })).toMatchObject({ id: "obs_mock_001" })
    await expect(result.driver.observe({ includeScreenshot: true }, { enabled: true })).rejects.toThrow("missing_screenRecording_permission")
  })

  test("cleans up after helper crashes", async () => {
    const cleanups: unknown[] = []
    const result = createNativeHelperDriver({
      availability: { available: true, reason: "desktop_session_available" },
      manifest,
      discovery,
      connect: () => connection({ crashOnStatus: true }),
      cleanupAfterCrash: (reason, atMs) => cleanups.push({ reason, atMs }),
      nowMs: () => 5,
    })
    if (!result.available) throw new Error("expected driver")
    await expect(result.driver.observe({ includeScreenshot: false }, { enabled: true })).rejects.toThrow("driver_crashed")
    expect(cleanups).toEqual([{ reason: "helper_crashed", atMs: 5 }])
  })

  test("fails when helper status health diverges from launched health", async () => {
    const result = createNativeHelperDriver({
      availability: { available: true, reason: "desktop_session_available" },
      manifest,
      discovery,
      connect: () => connection({ status: { ...status, health: { ...health, capabilities: ["status"] } } }),
      nowMs: () => 1_000,
    })
    if (!result.available) throw new Error("expected driver")
    await expect(result.driver.observe({ includeScreenshot: false }, { enabled: true })).rejects.toThrow("health_mismatch")
  })

  test("fails when helper status capabilities diverge without changing length", async () => {
    const result = createNativeHelperDriver({
      availability: { available: true, reason: "desktop_session_available" },
      manifest,
      discovery,
      connect: () => connection({ status: { ...status, health: { ...health, capabilities: ["status", "observe", "artifact"] } } }),
      nowMs: () => 1_000,
    })
    if (!result.available) throw new Error("expected driver")
    await expect(result.driver.observe({ includeScreenshot: false }, { enabled: true })).rejects.toThrow("health_mismatch")
  })

  test("passes explicit untrusted-driver override through supervisor authenticity", async () => {
    const result = createNativeHelperDriver({
      availability: { available: true, reason: "desktop_session_available" },
      manifest: { expectedPath: helperPath, protocolMajor: PROTOCOL_MAJOR, minVersion: "0.1.0" },
      helperPath: "/tmp/dev-helper",
      env: { INTERBASE_COMPUTER_USE_ALLOW_UNTRUSTED_DRIVER: "1" },
      discovery: { exists: () => true, candidate: () => ({ path: "/tmp/dev-helper", protocolMajor: PROTOCOL_MAJOR, version: "0.1.0" }) },
      connect: () => connection(),
    })
    expect(result).toMatchObject({ available: true, command: { command: "/tmp/dev-helper", warnings: ["untrusted helper driver allowed by explicit development override"] } })
    if (!result.available) throw new Error("expected driver")
    expect(await result.driver.observe({ includeScreenshot: false }, { enabled: true })).toMatchObject({ id: "obs_mock_001" })
  })
})
