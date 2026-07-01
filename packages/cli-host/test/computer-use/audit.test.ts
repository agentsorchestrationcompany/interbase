import { describe, expect, test } from "bun:test"
import { createAuditBuffer, sanitizeAuditEvent } from "@/computer-use/audit"

describe("computer-use audit", () => {
  test("sanitizes observe request targets to metadata only", () => {
    expect(
      sanitizeAuditEvent({
        type: "computer.observe.requested",
        traceId: "trace_1",
        sessionId: "ses_1",
        target: {
          app: { name: "App", bundleId: "bundle", path: "/App.app", rawText: "secret" },
          windowId: "win_1",
          rawAxTree: "secret tree",
        },
      }),
    ).toEqual({
      type: "computer.observe.requested",
      traceId: "trace_1",
      sessionId: "ses_1",
      target: { app: { name: "App", bundleId: "bundle", path: "/App.app" }, windowId: "win_1" },
      rawContentStored: false,
    })
  })

  test("keeps primitive and absent observe targets safe", () => {
    expect(
      sanitizeAuditEvent({ type: "computer.observe.requested", traceId: "trace_1", sessionId: "ses_1", target: "screen" }),
    ).toMatchObject({ target: "screen", rawContentStored: false })
    expect(sanitizeAuditEvent({ type: "computer.observe.requested", traceId: "trace_1", sessionId: "ses_1" })).toMatchObject({
      target: undefined,
      rawContentStored: false,
    })
    expect(
      sanitizeAuditEvent({ type: "computer.observe.requested", traceId: "trace_1", sessionId: "ses_1", target: { app: null } }),
    ).toMatchObject({ target: { app: undefined, windowId: undefined } })
  })

  test("marks all event variants as metadata-only", () => {
    const redactionSummary = {
      secureFieldsRedacted: 1,
      textFieldsRedacted: 2,
      screenshotAvailableToModel: false,
      axTextAvailableToModel: "redacted_summary" as const,
    }
    expect(
      [
        sanitizeAuditEvent({
          type: "computer.observe.allowed",
          traceId: "trace_1",
          observationId: "obs_1",
          app: { name: "App" },
          redactionSummary,
        }),
        sanitizeAuditEvent({ type: "computer.observe.denied", traceId: "trace_1", reason: "app_denied", app: { name: "App" } }),
        sanitizeAuditEvent({ type: "computer.action.requested", traceId: "trace_1", actionId: "act_1", actionType: "click", target: { app: { name: "App", rawText: "secret" } } }),
        sanitizeAuditEvent({ type: "computer.policy.decision", traceId: "trace_1", decision: { allowed: false, reason: "app_denied", app: { name: "App", rawText: "secret" } as any, actionType: "click" } }),
        sanitizeAuditEvent({ type: "computer.approval.prompted", traceId: "trace_1", permissionRequestId: "perm_1", permission: "computer.click", risk: "medium" }),
        sanitizeAuditEvent({ type: "computer.approval.responded", traceId: "trace_1", permissionRequestId: "perm_1", reply: "once" }),
        sanitizeAuditEvent({ type: "computer.action.allowed", traceId: "trace_1", actionId: "act_1" }),
        sanitizeAuditEvent({ type: "computer.action.denied", traceId: "trace_1", actionId: "act_1", reason: "blocked" }),
        sanitizeAuditEvent({
          type: "computer.driver.status",
          traceId: "trace_1",
          status: {
            available: true,
            crashed: false,
            health: { protocolMajor: 0, driver: "mock", version: "0.1.0", capabilities: ["status"] },
            authenticity: { trusted: true, reason: "mock_driver" },
            permissionState: { accessibility: "granted", screenRecording: "granted" },
            missingPermissions: [],
          },
        }),
        sanitizeAuditEvent({ type: "computer.driver.crashed", traceId: "trace_1", exitCode: 9 }),
        sanitizeAuditEvent({ type: "computer.artifact.created", traceId: "trace_1", artifactId: "art_1", kind: "screenshot", ttlMs: 1 }),
        sanitizeAuditEvent({ type: "computer.artifact.deleted", traceId: "trace_1", artifactId: "art_1", reason: "expired" }),
        sanitizeAuditEvent({ type: "computer.approval.revoked", traceId: "trace_1", scope: "observe", revokedActions: 1 }),
      ].map((event) => event.rawContentStored),
    ).toEqual([false, false, false, false, false, false, false, false, false, false, false, false, false])
  })

  test("sanitizes policy decisions and driver status to metadata", () => {
    expect(
      sanitizeAuditEvent({
        type: "computer.policy.decision",
        traceId: "trace_1",
        decision: { allowed: false, reason: "blocked", app: { name: "App", bundleId: "bundle", rawText: "secret" } as any, actionType: "typeText" },
      }),
    ).toEqual({
      type: "computer.policy.decision",
      traceId: "trace_1",
      decision: { allowed: false, reason: "blocked", actionType: "typeText", app: { name: "App", bundleId: "bundle", path: undefined } },
      rawContentStored: false,
    })
    expect(
      sanitizeAuditEvent({
        type: "computer.driver.status",
        traceId: "trace_1",
        status: {
          available: true,
          crashed: false,
          health: { protocolMajor: 0, driver: "mock", version: "0.1.0", capabilities: ["status", "observe"] },
          authenticity: { trusted: true, reason: "mock_driver" },
          permissionState: { accessibility: "granted", screenRecording: "missing" },
          missingPermissions: ["screenRecording"],
        },
      }),
    ).toMatchObject({
      status: {
        protocolVersion: "0.1.0",
        health: { protocolMajor: 0, driver: "mock", version: "0.1.0", capabilities: ["status", "observe"] },
        missingPermissions: ["screenRecording"],
      },
      rawContentStored: false,
    })
  })

  test("sanitizes action targets to app/window metadata", () => {
    expect(
      sanitizeAuditEvent({
        type: "computer.action.requested",
        traceId: "trace_1",
        actionId: "act_1",
        actionType: "typeText",
        target: { app: { name: "App", bundleId: "bundle", rawText: "secret" }, windowId: "win_1", text: "password" },
      }),
    ).toEqual({
      type: "computer.action.requested",
      traceId: "trace_1",
      actionId: "act_1",
      actionType: "typeText",
      target: { app: { name: "App", bundleId: "bundle", path: undefined }, windowId: "win_1" },
      rawContentStored: false,
    })
  })

  test("buffers sanitized events and clears them", () => {
    const buffer = createAuditBuffer()
    buffer.record({ type: "computer.artifact.deleted", traceId: "trace_1", artifactId: "art_1", reason: "expired" })
    expect(buffer.list()).toEqual([
      { type: "computer.artifact.deleted", traceId: "trace_1", artifactId: "art_1", reason: "expired", rawContentStored: false },
    ])
    buffer.clear()
    expect(buffer.list()).toEqual([])
  })
})
