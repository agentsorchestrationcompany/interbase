import { describe, expect, test } from "bun:test"
import { ComputerUseProtocolError, PROTOCOL_MAJOR } from "@interbase/computer-use-protocol"
import { createMockDriver } from "@/computer-use/driver"
import { makeSanitizedMockObservation } from "@interbase/computer-use-testkit"

describe("computer-use mock driver", () => {
  test("reports trusted mock status and observes through policy", async () => {
    const driver = createMockDriver()
    expect(driver.status()).toMatchObject({
      available: true,
      crashed: false,
      health: { protocolMajor: PROTOCOL_MAJOR, driver: "mock", capabilities: ["status", "observe", "act"] },
      authenticity: { trusted: true, reason: "mock_driver" },
      permissionState: { accessibility: "granted", screenRecording: "granted" },
      missingPermissions: [],
    })
    const observation = await driver.observe({}, { enabled: true })
    expect(observation.app.name).toBe("Mock Browser")
    expect(observation.elements[1]?.text).toBe("[REDACTED:secure]")
  })

  test("performs validated mock actions without native events", async () => {
    const result = await createMockDriver().act({
      id: "act_1",
      observationId: "obs_1",
      app: { name: "Mock Browser", bundleId: "ai.interbase.mock-browser" },
      windowId: "win_1",
      action: { type: "click", elementId: "el_1" },
    })
    expect(result).toEqual({
      id: "act_1",
      status: "performed",
      app: { name: "Mock Browser", bundleId: "ai.interbase.mock-browser" },
      windowId: "win_1",
      warnings: ["mock action; no native OS event was emitted"],
    })
    await expect(createMockDriver().act({ id: "", observationId: "obs_1", app: { name: "Mock" }, action: { type: "click", elementId: "el" } })).rejects.toThrow("id")
  })

  test("surfaces unavailable, crashed, untrusted, and protocol mismatch failures", async () => {
    await expect(createMockDriver({ available: false }).observe({}, { enabled: true })).rejects.toThrow(ComputerUseProtocolError)
    await expect(createMockDriver({ crashed: true }).observe({}, { enabled: true })).rejects.toThrow("crashed")
    await expect(createMockDriver({ trusted: false }).observe({}, { enabled: true })).rejects.toThrow("not trusted")
    await expect(createMockDriver({ protocolMajor: 999 }).observe({}, { enabled: true })).rejects.toThrow("not supported")
  })

  test("reports missing OS permissions for later native parity", () => {
    expect(createMockDriver({ missingPermissions: ["accessibility", "screenRecording"] }).status()).toMatchObject({
      permissionState: { accessibility: "missing", screenRecording: "missing" },
      missingPermissions: ["accessibility", "screenRecording"],
    })
  })

  test("validates observe requests and injected observations", async () => {
    await expect(createMockDriver().observe({ target: { app: {} } }, { enabled: true })).rejects.toThrow("app requires")
    await expect(createMockDriver({ observation: { ...makeSanitizedMockObservation({ enabled: true }), id: "" } }).observe({}, { enabled: true })).rejects.toThrow("Observation requires id")
  })
})
