import { describe, expect, test } from "bun:test"
import {
  ComputerUseProtocolError,
  MAX_AX_PAYLOAD_BYTES,
  MAX_IPC_ENVELOPE_BYTES,
  PROTOCOL_MAJOR,
  assertTrustedDriver,
  backendSupports,
  describeBackendLimitations,
  decodeEnvelope,
  clampPointToDisplay,
  displayContainingPoint,
  encodeEnvelope,
  makeDriverRequest,
  makeElementId,
  hasRequiredPermissions,
  missingPermissionsFromState,
  normalizeActionPoint,
  permissionStateFromMissing,
  pointToDesktopLogical,
  rectToDesktopLogical,
  resolveElement,
  resolveSemanticActionTarget,
  screenshotGeometryForDisplay,
  validateActionRequest,
  validateArtifactReadRequest,
  validateArtifactReadResult,
  validateDriverHealth,
  validateDriverRequest,
  validateDriverResponse,
  validateObservation,
  validateObserveRequest,
  type DriverHealth,
  type DriverStatus,
  type IpcEnvelope,
  type Observation,
} from "../src/index.js"

describe("computer-use protocol", () => {
  test("creates stable element ids", () => {
    expect(makeElementId({ app: { name: "Mock Browser" }, role: "AX Button", index: 2 })).toBe(
      "el:mock-browser:window:ax-button:2",
    )
    expect(makeElementId({ app: { name: "Ignored", bundleId: "ai.interbase.Mock" }, windowId: "A B", role: "", index: 0 })).toBe(
      "el:ai.interbase.mock:a-b:unknown:0",
    )
  })

  test("round-trips newline framed envelopes", () => {
    const envelope: IpcEnvelope<{ ok: true }> = { id: "1", method: "health", protocolMajor: PROTOCOL_MAJOR, payload: { ok: true } }
    expect(decodeEnvelope(encodeEnvelope(envelope))).toEqual(envelope)
  })

  test("rejects unsupported outgoing protocol major", () => {
    expect(() => encodeEnvelope({ id: "1", method: "health", protocolMajor: 99, payload: {} })).toThrow(ComputerUseProtocolError)
  })

  test("rejects oversized outgoing envelopes", () => {
    expect(() =>
      encodeEnvelope({ id: "1", method: "health", protocolMajor: PROTOCOL_MAJOR, payload: "x".repeat(MAX_IPC_ENVELOPE_BYTES) }),
    ).toThrow("maximum size")
  })

  test("rejects invalid incoming frames", () => {
    expect(() => decodeEnvelope("{}")).toThrow("newline framed")
    expect(() => decodeEnvelope("not-json\n")).toThrow("valid JSON")
    expect(() => decodeEnvelope(`${JSON.stringify({ id: "1", method: "health", protocolMajor: 99, payload: {} })}\n`)).toThrow(
      "not supported",
    )
    expect(() => decodeEnvelope(`${JSON.stringify({ id: "1", method: "health", protocolMajor: PROTOCOL_MAJOR })}\n`)).toThrow(
      "missing required fields",
    )
    expect(() => decodeEnvelope(`${"x".repeat(MAX_IPC_ENVELOPE_BYTES)}\n`)).toThrow("maximum size")
  })

  test("validates driver health negotiation", () => {
    const health: DriverHealth = { protocolMajor: PROTOCOL_MAJOR, driver: "mock", version: "0.1.0", capabilities: ["observe"] }
    expect(validateDriverHealth(health)).toEqual(health)
    expect(() => validateDriverHealth({ ...health, protocolMajor: 999 })).toThrow("not supported")
    expect(() => validateDriverHealth({ ...health, capabilities: [] })).toThrow("capabilities")
    expect(() => validateDriverHealth({ ...health, driver: "unknown" as never })).toThrow("backend")
    expect(() => validateDriverHealth({ ...health, capabilities: ["screenshot"] })).toThrow("unsupported capabilities")
  })

  test("describes backend capabilities and limitations", () => {
    expect(backendSupports("mock", "act")).toBe(true)
    expect(backendSupports("linux", "act")).toBe(false)
    expect(describeBackendLimitations("macos")).toEqual([
      "requires Accessibility permission",
      "requires Screen Recording permission",
    ])
    const limitations = describeBackendLimitations("mock")
    limitations.push("mutated")
    expect(describeBackendLimitations("mock")).not.toContain("mutated")
  })

  test("asserts trusted driver status before use", () => {
    const status: DriverStatus = {
      available: true,
      crashed: false,
      health: { protocolMajor: PROTOCOL_MAJOR, driver: "mock", version: "0.1.0", capabilities: ["observe"] },
      authenticity: { trusted: true, reason: "mock_driver" },
      permissionState: { accessibility: "granted", screenRecording: "granted" },
      missingPermissions: [],
    }
    expect(assertTrustedDriver(status)).toEqual(status)
    expect(() => assertTrustedDriver({ ...status, available: false })).toThrow("unavailable")
    expect(() => assertTrustedDriver({ ...status, crashed: true })).toThrow("crashed")
    expect(() =>
      assertTrustedDriver({ ...status, authenticity: { trusted: false as const, reason: "signature_invalid" as const } }),
    ).toThrow("not trusted")
    expect(() => assertTrustedDriver({ ...status, health: undefined })).toThrow("health metadata")
    expect(() => assertTrustedDriver({ ...status, health: { ...status.health!, protocolMajor: 999 } })).toThrow("not supported")
  })

  test("normalizes OS permission state for helper status", () => {
    const state = permissionStateFromMissing(["accessibility"], ["screenRecording"])
    expect(state).toEqual({ accessibility: "missing", screenRecording: "unknown" })
    expect(missingPermissionsFromState(state)).toEqual(["accessibility"])
    expect(hasRequiredPermissions(state, [])).toBe(true)
    expect(hasRequiredPermissions(state, ["accessibility"])).toBe(false)
    expect(hasRequiredPermissions(permissionStateFromMissing([]), ["accessibility", "screenRecording"])).toBe(true)
  })

  test("validates observe requests", () => {
    expect(validateObserveRequest({ target: { app: { bundleId: "ai.interbase.mock" }, windowId: "win_1" }, maxTreeDepth: 1, maxNodeCount: 10 })).toMatchObject({
      maxTreeDepth: 1,
    })
    expect(validateObserveRequest({ includeScreenshot: false, includeAXTree: false })).toEqual({ includeScreenshot: false, includeAXTree: false })
    expect(() => validateObserveRequest({ target: { app: {} } })).toThrow("app requires")
    expect(() => validateObserveRequest({ target: { windowId: "" } })).toThrow("windowId")
    expect(() => validateObserveRequest({ maxTreeDepth: 0 })).toThrow("maxTreeDepth")
    expect(() => validateObserveRequest({ maxTreeDepth: 1.5 })).toThrow("maxTreeDepth")
    expect(() => validateObserveRequest({ maxNodeCount: -1 })).toThrow("maxNodeCount")
  })

  test("validates observations and rejects malformed driver output", () => {
    const observation: Observation = {
      id: "obs_1",
      protocolVersion: "0.1.0",
      createdAt: "2026-01-01T00:00:00.000Z",
      app: { name: "Mock", signing: { teamId: "TEAMID", signingIdentifier: "ai.interbase.mock", codeSignatureValid: true } },
      window: { id: "win_1", bounds: { x: 0, y: 0, width: 10, height: 10 } },
      screenshot: {
        id: "artifact_1",
        kind: "screenshot",
        mimeType: "image/png",
        expiresAt: "2026-01-01T00:15:00.000Z",
        geometry: { pixelWidth: 20, pixelHeight: 20, scale: 2, desktopOrigin: { x: 0, y: 0 }, cropOrigin: { x: 1, y: 2 } },
      },
      elements: [{ id: "el_1", role: "button", depth: 0, bounds: { x: 1, y: 2, width: 3, height: 4 } }],
      warnings: [],
      promptInjectionWarning: "",
      redaction: { secureFieldsRedacted: 0, textFieldsRedacted: 0, screenshotAvailableToModel: false, axTextAvailableToModel: "none" },
    }
    expect(validateObservation(observation)).toEqual(observation)
    expect(validateObservation(observation).app.signing).toEqual({ teamId: "TEAMID", signingIdentifier: "ai.interbase.mock", codeSignatureValid: true })
    expect(validateObservation({ ...observation, window: { ...observation.window!, visible: true } }).window?.visible).toBe(true)
    expect(validateObservation({ ...observation, window: undefined, screenshot: undefined })).toMatchObject({ id: "obs_1" })
    expect(() => validateObservation({ ...observation, id: "" })).toThrow("requires id")
    expect(() => validateObservation({ ...observation, protocolVersion: "9.0.0" })).toThrow("protocolVersion")
    expect(() => validateObservation({ ...observation, createdAt: "yesterday" })).toThrow("createdAt")
    expect(() => validateObservation({ ...observation, app: { name: "" } })).toThrow("app identity")
    expect(() => validateObservation({ ...observation, app: { name: "Mock", signing: { teamId: 123 } as never } })).toThrow("teamId")
    expect(() => validateObservation({ ...observation, app: { name: "Mock", signing: { signingIdentifier: 123 } as never } })).toThrow("signingIdentifier")
    expect(() => validateObservation({ ...observation, app: { name: "Mock", signing: { codeSignatureValid: "yes" } as never } })).toThrow("codeSignatureValid")
    expect(() => validateObservation({ ...observation, window: { id: "" } })).toThrow("window requires")
    expect(() => validateObservation({ ...observation, window: { id: "win", bounds: { x: 0, y: 0, width: -1, height: 1 } } })).toThrow("rectangle")
    expect(() => validateObservation({ ...observation, window: { id: "win", visible: "yes" as never } })).toThrow("visible")
    expect(() => validateObservation({ ...observation, elements: [{ id: "el_big", role: "text", text: "x".repeat(MAX_AX_PAYLOAD_BYTES) }] })).toThrow("AX payload")
    expect(() => validateObservation({ ...observation, screenshot: { ...observation.screenshot!, id: "" } })).toThrow("artifact id")
    expect(() => validateObservation({ ...observation, screenshot: { ...observation.screenshot!, kind: "file" as never } })).toThrow("artifact type")
    expect(() => validateObservation({ ...observation, screenshot: { ...observation.screenshot!, expiresAt: "later" } })).toThrow("expiresAt")
    expect(() =>
      validateObservation({ ...observation, screenshot: { ...observation.screenshot!, geometry: { ...observation.screenshot!.geometry!, scale: 0 } } }),
    ).toThrow("dimensions")
    expect(() =>
      validateObservation({ ...observation, screenshot: { ...observation.screenshot!, geometry: { ...observation.screenshot!.geometry!, cropOrigin: { x: Number.NaN, y: 0 } } } }),
    ).toThrow("crop origin")
    expect(() => validateObservation({ ...observation, elements: undefined as never })).toThrow("elements")
    expect(() => validateObservation({ ...observation, elements: [{ id: "", role: "button" }] })).toThrow("id and role")
    expect(() => validateObservation({ ...observation, elements: [{ id: "el", role: "button", depth: -1 }] })).toThrow("depth")
    expect(() => validateObservation({ ...observation, warnings: undefined as never })).toThrow("warnings")
    expect(() => validateObservation({ ...observation, redaction: undefined as never })).toThrow("redaction")
    expect(() => validateObservation({ ...observation, redaction: { ...observation.redaction, secureFieldsRedacted: -1 } })).toThrow("redaction")
    expect(() => validateObservation({ ...observation, redaction: { ...observation.redaction, axTextAvailableToModel: "raw" as never } })).toThrow("redaction")
  })

  test("validates primitive action requests", () => {
    const base = { id: "act_1", observationId: "obs_1", app: { name: "Mock", signing: { teamId: "TEAMID", signingIdentifier: "ai.interbase.mock" } } }
    expect(validateActionRequest({ ...base, action: { type: "click", elementId: "el_1" } })).toEqual({
      ...base,
      action: { type: "click", elementId: "el_1" },
    })
    expect(validateActionRequest({ ...base, action: { type: "click", elementId: "el_1" } }).app.signing?.teamId).toBe("TEAMID")
    expect(validateActionRequest({ ...base, windowId: "win_1", action: { type: "doubleClick", point: { x: 1, y: 2, space: "windowLogical" } } })).toMatchObject({
      action: { type: "doubleClick" },
    })
    expect(validateActionRequest({ ...base, windowId: "win_1", action: { type: "movePointer", point: { x: 1, y: 2, space: "windowLogical" } } })).toMatchObject({
      action: { type: "movePointer" },
    })
    expect(validateActionRequest({ ...base, windowId: "win_1", action: { type: "drag", from: { x: 1, y: 2, space: "windowLogical" }, to: { x: 3, y: 4, space: "windowLogical" } } })).toMatchObject({
      action: { type: "drag" },
    })
    expect(validateActionRequest({ ...base, action: { type: "scroll", deltaY: 1 } })).toMatchObject({ action: { type: "scroll" } })
    expect(validateActionRequest({ ...base, action: { type: "typeText", text: "health" } })).toMatchObject({ action: { type: "typeText" } })
    expect(validateActionRequest({ ...base, action: { type: "keyChord", keys: ["Tab"] } })).toMatchObject({ action: { type: "keyChord" } })
    expect(() => validateActionRequest({ ...base, id: "", action: { type: "click", elementId: "el_1" } })).toThrow("id")
    expect(() => validateActionRequest({ ...base, observationId: "", action: { type: "click", elementId: "el_1" } })).toThrow("observationId")
    expect(() => validateActionRequest({ ...base, app: { name: "" }, action: { type: "click", elementId: "el_1" } })).toThrow("app identity")
    expect(() => validateActionRequest({ ...base, app: { name: "Mock", signing: { teamId: 123 } as never }, action: { type: "click", elementId: "el_1" } })).toThrow("teamId")
    expect(() => validateActionRequest({ ...base, action: { type: "click" } })).toThrow("elementId or point")
    expect(() => validateActionRequest({ ...base, action: { type: "click", point: { x: 1, y: 2, space: "windowLogical" } } })).toThrow("windowId context")
    expect(() => validateActionRequest({ ...base, windowId: "win_1", action: { type: "click", point: { x: 1, y: 2 } } })).toThrow("coordinate space")
    expect(() => validateActionRequest({ ...base, action: { type: "movePointer", point: { x: 1, y: 2, space: "windowLogical" } } })).toThrow("windowId context")
    expect(() => validateActionRequest({ ...base, windowId: "win_1", action: { type: "movePointer", point: { x: 1, y: 2 } } })).toThrow("coordinate space")
    expect(() => validateActionRequest({ ...base, action: { type: "drag", from: { x: 1, y: 2, space: "windowLogical" }, to: { x: 3, y: 4, space: "windowLogical" } } })).toThrow("windowId context")
    expect(() => validateActionRequest({ ...base, windowId: "win_1", action: { type: "drag", from: { x: 1, y: 2, space: "windowLogical" }, to: { x: 3, y: 4 } } })).toThrow("coordinate space")
    expect(() => validateActionRequest({ ...base, action: { type: "scroll", deltaX: 0, deltaY: 0 } })).toThrow("non-zero")
    expect(() => validateActionRequest({ ...base, action: { type: "typeText", text: "" } })).toThrow("non-empty")
    expect(() => validateActionRequest({ ...base, action: { type: "keyChord", keys: [] } })).toThrow("keys")
    expect(() => validateActionRequest({ ...base, action: { type: "unknown" } as never })).toThrow("not supported")
  })

  test("validates semantic action requests", () => {
    const base = { id: "act_1", observationId: "obs_1", app: { name: "Mock" } }
    expect(validateActionRequest({ ...base, action: { type: "clickElement", selector: { elementId: "el_1" } } })).toMatchObject({
      action: { type: "clickElement" },
    })
    expect(validateActionRequest({ ...base, action: { type: "focusElement", selector: { elementId: "el_1" } } })).toMatchObject({
      action: { type: "focusElement" },
    })
    expect(validateActionRequest({ ...base, action: { type: "setElementValue", selector: { role: "field" }, value: "health" } })).toMatchObject({
      action: { type: "setElementValue" },
    })
    expect(validateActionRequest({ ...base, action: { type: "focusWindow", windowId: "win_1" } })).toMatchObject({
      action: { type: "focusWindow" },
    })
    expect(validateActionRequest({ ...base, action: { type: "focusApp" } })).toMatchObject({
      action: { type: "focusApp" },
    })
    expect(validateActionRequest({ ...base, action: { type: "launchApp" } })).toMatchObject({
      action: { type: "launchApp" },
    })
    expect(validateActionRequest({ ...base, action: { type: "fileDialog", operation: "selectFile", artifactId: "artifact_1" } })).toMatchObject({
      action: { type: "fileDialog", operation: "selectFile" },
    })
    expect(validateActionRequest({ ...base, action: { type: "selectMenuItem", selector: { label: "File" } } })).toMatchObject({
      action: { type: "selectMenuItem" },
    })
    expect(validateActionRequest({ ...base, action: { type: "openContextMenu", selector: { label: "Save" } } })).toMatchObject({
      action: { type: "openContextMenu" },
    })
    expect(() => validateActionRequest({ ...base, action: { type: "clickElement", selector: {} } })).toThrow("selector")
    expect(() => validateActionRequest({ ...base, action: { type: "focusElement", selector: {} } })).toThrow("selector")
    expect(() => validateActionRequest({ ...base, action: { type: "selectMenuItem", selector: {} } })).toThrow("selector")
    expect(() => validateActionRequest({ ...base, action: { type: "openContextMenu", selector: {} } })).toThrow("selector")
    expect(() => validateActionRequest({ ...base, action: { type: "setElementValue", selector: { elementId: "el_1" }, value: "" } })).toThrow(
      "non-empty",
    )
    expect(() =>
      validateActionRequest({ ...base, action: { type: "setElementValue", selector: { elementId: "el_1" }, value: "secret", secureField: true } }),
    ).toThrow("secure")
    expect(() => validateActionRequest({ ...base, action: { type: "focusWindow", windowId: "" } })).toThrow("windowId")
    expect(() => validateActionRequest({ ...base, action: { type: "fileDialog", operation: "openFolder" as never } })).toThrow("operation")
    expect(() => validateActionRequest({ ...base, action: { type: "fileDialog", operation: "saveFile", artifactId: "" } })).toThrow("artifactId")
  })

  test("validates artifact read requests and results", () => {
    expect(validateArtifactReadRequest({ id: "artifact_1" })).toEqual({ id: "artifact_1" })
    expect(validateArtifactReadResult({ id: "artifact_1", mimeType: "image/png", dataBase64: "AQID" })).toEqual({ id: "artifact_1", mimeType: "image/png", dataBase64: "AQID" })
    expect(() => validateArtifactReadRequest({ id: "" })).toThrow("requires id")
    expect(() => validateArtifactReadResult({ id: "", mimeType: "image/png", dataBase64: "AQID" })).toThrow("requires id")
    expect(() => validateArtifactReadResult({ id: "artifact_1", mimeType: "text/plain" as never, dataBase64: "AQID" })).toThrow("mimeType")
    expect(() => validateArtifactReadResult({ id: "artifact_1", mimeType: "image/png", dataBase64: "not base64" })).toThrow("base64")
  })

  test("resolves semantic targets against latest observations", () => {
    const observation = {
      id: "obs_1",
      protocolVersion: "0.1.0",
      createdAt: "2026-01-01T00:00:00.000Z",
      app: { name: "Mock" },
      window: { id: "win_1" },
      elements: [
        { id: "button_1", role: "button", label: "Save" },
        { id: "field_1", role: "field", label: "Name", text: "Ada" },
        { id: "field_2", role: "field", label: "Password", secure: true },
      ],
      warnings: [],
      promptInjectionWarning: "",
      redaction: { secureFieldsRedacted: 0, textFieldsRedacted: 0, screenshotAvailableToModel: false, axTextAvailableToModel: "none" as const },
    }
    const base = { id: "act_1", observationId: "obs_1", app: { name: "Mock" } }
    expect(resolveElement(observation, { label: "Save" })).toEqual({ id: "button_1", role: "button", label: "Save" })
    expect(resolveSemanticActionTarget({ ...base, action: { type: "clickElement", selector: { label: "Save" } } }, observation)).toMatchObject({
      action: { type: "click", elementId: "button_1" },
    })
    expect(resolveSemanticActionTarget({ ...base, action: { type: "focusElement", selector: { label: "Save" } } }, observation)).toMatchObject({
      action: { type: "click", elementId: "button_1" },
    })
    expect(resolveSemanticActionTarget({ ...base, action: { type: "selectMenuItem", selector: { label: "Save" } } }, observation)).toMatchObject({
      action: { type: "click", elementId: "button_1" },
    })
    expect(resolveSemanticActionTarget({ ...base, action: { type: "setElementValue", selector: { elementId: "field_1" }, value: "Grace" } }, observation)).toMatchObject({
      action: { type: "typeText", text: "Grace" },
    })
    expect(resolveSemanticActionTarget({ ...base, action: { type: "focusWindow", windowId: "win_1" } }, observation)).toMatchObject({
      windowId: "win_1",
      action: { type: "keyChord", keys: ["Meta", "Tab"] },
    })
    expect(resolveSemanticActionTarget({ ...base, action: { type: "openContextMenu", selector: { label: "Save" } } }, observation)).toMatchObject({
      action: { type: "openContextMenu" },
    })
    expect(resolveSemanticActionTarget({ ...base, action: { type: "scroll", deltaY: 1 } }, observation)).toMatchObject({ action: { type: "scroll" } })
    expect(() => resolveElement(observation, { label: "Missing" })).toThrow("not found")
    expect(() => resolveElement(observation, { role: "field" })).toThrow("multiple")
    expect(() => resolveElement(observation, { elementId: "field_2" })).toThrow("secure")
    expect(() => resolveSemanticActionTarget({ ...base, action: { type: "focusWindow", windowId: "win_2" } }, observation)).toThrow("window")
  })

  test("validates driver request and response envelopes", () => {
    expect(makeDriverRequest({ id: "req_1", method: "artifact", params: { id: "artifact_1" }, deadlineMs: 1 })).toEqual({
      id: "req_1",
      method: "artifact",
      protocolMajor: PROTOCOL_MAJOR,
      payload: { id: "req_1", method: "artifact", params: { id: "artifact_1" }, deadlineMs: 1 },
    })
    expect(validateDriverRequest({ id: "req_1", method: "shutdown", params: undefined })).toMatchObject({ method: "shutdown" })
    expect(() => validateDriverRequest({ id: "", method: "status", params: {} })).toThrow("requires id")
    expect(() => validateDriverRequest({ id: "req_1", method: "nope" as never, params: {} })).toThrow("method")
    expect(() => validateDriverRequest({ id: "req_1", method: "status", params: {}, deadlineMs: 0 })).toThrow("deadline")
    expect(() => validateDriverRequest({ id: "req_1", method: "status", params: {}, deadlineMs: 1.5 })).toThrow("deadline")
    expect(validateDriverResponse({ id: "req_1", result: { ok: true } })).toEqual({ id: "req_1", result: { ok: true } })
    expect(validateDriverResponse({ id: "req_1", error: { code: "x", message: "bad" } })).toMatchObject({ error: { code: "x" } })
    expect(() => validateDriverResponse({ id: "", result: true })).toThrow("requires id")
    expect(() => validateDriverResponse({ id: "req_1", result: true, error: { code: "x", message: "bad" } })).toThrow("both")
    expect(() => validateDriverResponse({ id: "req_1" })).toThrow("requires result or error")
    expect(() => validateDriverResponse({ id: "req_1", error: { code: "", message: "" } })).toThrow("code and message")
  })

  test("converts points and rects to desktop logical coordinates", () => {
    const screenshot = {
      pixelWidth: 400,
      pixelHeight: 200,
      scale: 2,
      desktopOrigin: { x: -100, y: 50 },
      cropOrigin: { x: 10, y: 20 },
    }
    expect(pointToDesktopLogical({ x: 1, y: 2 })).toEqual({ x: 1, y: 2, space: "desktopLogical" })
    expect(pointToDesktopLogical({ x: 5, y: 6, space: "windowLogical" }, { windowOrigin: { x: 100, y: 200 } })).toEqual({
      x: 105,
      y: 206,
      space: "desktopLogical",
    })
    expect(pointToDesktopLogical({ x: 20, y: 40, space: "screenshotPixel" }, { screenshot })).toEqual({
      x: -80,
      y: 90,
      space: "desktopLogical",
    })
    expect(pointToDesktopLogical({ x: 20, y: 40, space: "screenshotPixel" }, { screenshot: { ...screenshot, cropOrigin: undefined } })).toEqual({
      x: -90,
      y: 70,
      space: "desktopLogical",
    })
    expect(rectToDesktopLogical({ x: 20, y: 40, width: 100, height: 50, space: "screenshotPixel" }, { screenshot })).toEqual({
      x: -80,
      y: 90,
      width: 50,
      height: 25,
      space: "desktopLogical",
    })
    expect(rectToDesktopLogical({ x: 5, y: 6, width: 7, height: 8, space: "windowLogical" }, { windowOrigin: { x: -10, y: -20 } })).toEqual({
      x: -5,
      y: -14,
      width: 7,
      height: 8,
      space: "desktopLogical",
    })
    expect(() => pointToDesktopLogical({ x: 1, y: 2, space: "windowLogical" })).toThrow("window origin")
    expect(() => pointToDesktopLogical({ x: 1, y: 2, space: "screenshotPixel" })).toThrow("screenshot geometry")
    expect(() => rectToDesktopLogical({ x: 1, y: 2, width: 3, height: 4, space: "screenshotPixel" })).toThrow("screenshot geometry")
  })

  test("normalizes coordinate action points", () => {
    const request = {
      id: "act_1",
      observationId: "obs_1",
      app: { name: "Mock" },
      action: { type: "click" as const, point: { x: 10, y: 20, space: "windowLogical" as const } },
    }
    expect(normalizeActionPoint(request, { windowOrigin: { x: 1, y: 2 } })).toEqual({
      ...request,
      action: { type: "click", point: { x: 11, y: 22, space: "desktopLogical" } },
    })
    expect(normalizeActionPoint({ ...request, action: { type: "movePointer" as const, point: { x: 10, y: 20, space: "windowLogical" as const } } }, { windowOrigin: { x: 1, y: 2 } })).toMatchObject({
      action: { type: "movePointer", point: { x: 11, y: 22, space: "desktopLogical" } },
    })
    expect(normalizeActionPoint({ ...request, action: { type: "drag" as const, from: { x: 1, y: 2, space: "windowLogical" as const }, to: { x: 3, y: 4, space: "windowLogical" as const } } }, { windowOrigin: { x: 10, y: 20 } })).toMatchObject({
      action: { type: "drag", from: { x: 11, y: 22, space: "desktopLogical" }, to: { x: 13, y: 24, space: "desktopLogical" } },
    })
    const noPoint = { ...request, action: { type: "click" as const, elementId: "el_1" } }
    expect(normalizeActionPoint(noPoint)).toBe(noPoint)
    const key = { ...request, action: { type: "keyChord" as const, keys: ["Tab"] } }
    expect(normalizeActionPoint(key)).toBe(key)
  })

  test("selects displays and normalizes display screenshot geometry", () => {
    const displays = [
      { id: "left", bounds: { x: -1920, y: 0, width: 1920, height: 1080 }, scale: 1 },
      { id: "main", bounds: { x: 0, y: 0, width: 1440, height: 900 }, scale: 2, primary: true },
      { id: "top", bounds: { x: 0, y: -900, width: 1440, height: 900 }, scale: 1.5 },
    ]
    expect(displayContainingPoint({ x: -10, y: 10 }, displays).id).toBe("left")
    expect(displayContainingPoint({ x: 100, y: -10, space: "desktopLogical" }, displays).id).toBe("top")
    expect(displayContainingPoint({ x: 2_000, y: 500 }, displays).id).toBe("main")
    expect(clampPointToDisplay({ x: 2_000, y: -10 }, displays[1]!)).toEqual({ x: 1440, y: 0, space: "desktopLogical" })
    expect(screenshotGeometryForDisplay(displays[1]!)).toEqual({
      pixelWidth: 2880,
      pixelHeight: 1800,
      scale: 2,
      desktopOrigin: { x: 0, y: 0 },
    })
    expect(() => displayContainingPoint({ x: 0, y: 0 }, [])).toThrow("display geometry")
  })
})
