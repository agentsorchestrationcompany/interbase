import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR, type DriverHealth, type DriverStatus } from "@interbase/computer-use-protocol"
import { createHelperProcessDriver } from "@/computer-use/helper-driver"
import { makeSanitizedMockObservation } from "@interbase/computer-use-testkit"

const health: DriverHealth = { protocolMajor: PROTOCOL_MAJOR, driver: "mock", version: "0.1.0", capabilities: ["status", "observe", "act"] }
const status: DriverStatus = {
  available: true,
  crashed: false,
  health,
  authenticity: { trusted: true, reason: "mock_driver" },
  permissionState: { accessibility: "granted", screenRecording: "granted" },
  missingPermissions: [],
}

describe("computer-use helper process driver", () => {
  test("adapts helper observe and action requests through supervisor readiness", async () => {
    let launched = 0
    const observation = makeSanitizedMockObservation({ enabled: true })
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
        launch: () => {
          launched++
          return health
        },
        status: () => status,
      },
      client: {
        observe: (request) => ({ ...observation, warnings: [...observation.warnings, request.includeScreenshot === false ? "no screenshot" : "screenshot allowed"] }),
        act: (request) => ({ id: request.id, status: "performed", app: request.app, windowId: request.windowId, warnings: [] }),
        artifact: () => new Uint8Array([1, 2, 3]),
      },
      nowMs: () => 1_000,
    })
    expect(await driver.status()).toBe(status)
    expect((await driver.observe({ includeScreenshot: false }, { enabled: true })).warnings).toContain("no screenshot")
    expect(await driver.act({ id: "act_1", observationId: observation.id, app: observation.app, action: { type: "click", elementId: "el_1" } })).toMatchObject({
      id: "act_1",
      status: "performed",
    })
    expect(await driver.readArtifact?.("artifact_1")).toEqual(new Uint8Array([1, 2, 3]))
    expect(launched).toBe(1)
  })

  test("leaves artifact reads unsupported when the helper client has no artifact method", () => {
    const driver = createHelperProcessDriver({
      host: { verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }), launch: () => health, status: () => status },
      client: { observe: () => makeSanitizedMockObservation({ enabled: true }), act: () => ({ id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }) },
    })
    expect(driver.readArtifact).toBeUndefined()
  })

  test("denies observe when helper authenticity fails before launch", async () => {
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: false, reason: "path_mismatch", warnings: [] }),
        launch: () => health,
        status: () => status,
      },
      client: { observe: () => makeSanitizedMockObservation({ enabled: true }), act: () => ({ id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }) },
    })
    await expect(driver.observe({}, { enabled: true })).rejects.toThrow("path_mismatch")
  })

  test("does not silently retry actions when helper status crashes", async () => {
    let acted = false
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
        launch: () => health,
        status: () => ({ ...status, crashed: true }),
      },
      client: {
        observe: () => makeSanitizedMockObservation({ enabled: true }),
        act: () => {
          acted = true
          return { id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }
        },
      },
      nowMs: () => 1_000,
    })
    await expect(driver.act({ id: "act", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).rejects.toThrow("driver_crashed")
    expect(acted).toBe(false)
  })

  test("requires screen recording only for screenshot observe requests", async () => {
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
        launch: () => health,
        status: () => ({ ...status, permissionState: { accessibility: "granted", screenRecording: "missing" }, missingPermissions: ["screenRecording"] }),
      },
      client: { observe: () => makeSanitizedMockObservation({ enabled: true }), act: () => ({ id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }) },
      nowMs: () => 1_000,
    })
    expect(await driver.observe({ includeScreenshot: false }, { enabled: true })).toMatchObject({ id: "obs_mock_001" })
    await expect(driver.observe({ includeScreenshot: true }, { enabled: true })).rejects.toThrow("missing_screenRecording_permission")
  })

  test("requires screen recording for artifact reads", async () => {
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
        launch: () => health,
        status: () => ({ ...status, permissionState: { accessibility: "granted", screenRecording: "missing" }, missingPermissions: ["screenRecording"] }),
      },
      client: { observe: () => makeSanitizedMockObservation({ enabled: true }), act: () => ({ id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }), artifact: () => new Uint8Array([1]) },
      nowMs: () => 1_000,
    })
    await expect(driver.readArtifact?.("artifact")).rejects.toThrow("missing_screenRecording_permission")
  })

  test("requires accessibility for helper actions", async () => {
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
        launch: () => health,
        status: () => ({ ...status, permissionState: { accessibility: "missing", screenRecording: "granted" }, missingPermissions: ["accessibility"] }),
      },
      client: { observe: () => makeSanitizedMockObservation({ enabled: true }), act: () => ({ id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }) },
      nowMs: () => 1_000,
    })
    await expect(driver.act({ id: "act", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).rejects.toThrow(
      "missing_accessibility_permission",
    )
  })

  test("invokes crash cleanup hook when helper status crashes", async () => {
    const cleanups: Array<{ reason: string; atMs: number }> = []
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
        launch: () => health,
        status: () => ({ ...status, crashed: true }),
      },
      client: { observe: () => makeSanitizedMockObservation({ enabled: true }), act: () => ({ id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }) },
      nowMs: () => 5,
      cleanupAfterCrash: (reason, atMs) => cleanups.push({ reason, atMs }),
    })
    await expect(driver.observe({}, { enabled: true })).rejects.toThrow("driver_crashed")
    expect(cleanups).toEqual([{ reason: "helper_crashed", atMs: 5 }])
  })

  test("validates helper observe requests and responses", async () => {
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
        launch: () => health,
        status: () => status,
      },
      client: { observe: () => ({ ...makeSanitizedMockObservation({ enabled: true }), id: "" }), act: () => ({ id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }) },
      nowMs: () => 1_000,
    })
    await expect(driver.observe({ maxNodeCount: 0 }, { enabled: true })).rejects.toThrow("maxNodeCount")
    await expect(driver.observe({}, { enabled: true })).rejects.toThrow("Observation requires id")
  })

  test("validates helper action requests before readiness", async () => {
    let launched = false
    const driver = createHelperProcessDriver({
      host: {
        verifyAuthenticity: () => ({ trusted: true, reason: "verified", warnings: [] }),
        launch: () => {
          launched = true
          return health
        },
        status: () => status,
      },
      client: { observe: () => makeSanitizedMockObservation({ enabled: true }), act: () => ({ id: "act", status: "performed", app: { name: "Mock" }, warnings: [] }) },
    })
    await expect(driver.act({ id: "", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).rejects.toThrow("id")
    expect(launched).toBe(false)
  })
})
