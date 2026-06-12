import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { ComputerUse, createComputerUseSessionCoordinator } from "@/computer-use/session"
import { testEffect } from "../lib/effect"

const it = testEffect(ComputerUse.defaultLayer)

const performed = (id: string) => ({ id, status: "performed" as const, app: { name: "Mock" }, warnings: [] })

const observation = (id: string) => ({
  id,
  protocolVersion: "0.1.0",
  createdAt: "2026-01-01T00:00:00.000Z",
  app: { name: "Mock" },
  elements: [],
  warnings: [],
  promptInjectionWarning: "",
  redaction: { secureFieldsRedacted: 0, textFieldsRedacted: 0, screenshotAvailableToModel: false, axTextAvailableToModel: "none" as const },
})

describe("computer-use session coordinator", () => {
  test("creates sessions and reports empty status", () => {
    const coordinator = createComputerUseSessionCoordinator()
    expect(coordinator.ensureSession("ses_1")).toMatchObject({ sessionId: "ses_1" })
    expect(coordinator.ensureSession("ses_1")).toBe(coordinator.ensureSession("ses_1"))
    expect(coordinator.status("ses_1")).toEqual({
      sessionId: "ses_1",
      cancelled: undefined,
      revokedApps: [],
      pendingActions: [],
      activeArtifacts: [],
    })
  })

  test("serializes actions globally", async () => {
    const coordinator = createComputerUseSessionCoordinator()
    const order: string[] = []
    let releaseFirst!: () => void
    const first = coordinator.enqueueAction({
      id: "a",
      sessionId: "ses_1",
      appKey: "app",
      scope: "click",
      run: () =>
        new Promise((resolve) => {
          order.push("first:start")
          releaseFirst = () => {
            order.push("first:end")
            resolve(performed("a"))
          }
        }),
    })
    const second = coordinator.enqueueAction({
      id: "b",
      sessionId: "ses_2",
      appKey: "app",
      scope: "click",
      run: () => {
        order.push("second")
        return performed("b")
      },
    })

    await Promise.resolve()
    expect(order).toEqual(["first:start"])
    releaseFirst()
    await expect(first).resolves.toMatchObject({ id: "a" })
    await expect(second).resolves.toMatchObject({ id: "b" })
    expect(order).toEqual(["first:start", "first:end", "second"])
  })

  test("serializes screenshot observations only", async () => {
    const coordinator = createComputerUseSessionCoordinator()
    const order: string[] = []
    let releaseFirst!: () => void
    const first = coordinator.enqueueObservation({
      includeScreenshot: true,
      run: () =>
        new Promise((resolve) => {
          order.push("first:start")
          releaseFirst = () => {
            order.push("first:end")
            resolve(observation("obs_1"))
          }
        }),
    })
    const second = coordinator.enqueueObservation({
      includeScreenshot: true,
      run: () => {
        order.push("second")
        return observation("obs_2")
      },
    })
    await Promise.resolve()
    expect(order).toEqual(["first:start"])
    releaseFirst()
    await expect(first).resolves.toMatchObject({ id: "obs_1" })
    await expect(second).resolves.toMatchObject({ id: "obs_2" })
    expect(order).toEqual(["first:start", "first:end", "second"])

    void coordinator.enqueueObservation({ includeScreenshot: true, run: () => new Promise(() => {}) })
    const nonScreenshot = coordinator.enqueueObservation({ includeScreenshot: false, run: () => observation("obs_no_screenshot") })
    await expect(nonScreenshot).resolves.toMatchObject({ id: "obs_no_screenshot" })
  })

  test("cancels queued session actions and revokes artifacts", async () => {
    const coordinator = createComputerUseSessionCoordinator()
    coordinator.artifacts.create({ id: "art_1", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 100, bytes: 1 })
    let releaseFirst!: () => void
    const first = coordinator.enqueueAction({
      id: "a",
      sessionId: "ses_0",
      appKey: "app",
      scope: "click",
      run: () =>
        new Promise((resolve) => {
          releaseFirst = () => resolve(performed("a"))
        }),
    })
    const queued = coordinator.enqueueAction({
      id: "b",
      sessionId: "ses_1",
      appKey: "app",
      scope: "click",
      run: () => performed("b"),
    })
    await Promise.resolve()
    const cancelled = coordinator.cancelSession("ses_1", "user", 1)
    expect(cancelled).toEqual({ revokedActions: ["b"], deletedArtifacts: ["art_1"] })
    releaseFirst()
    await expect(first).resolves.toMatchObject({ id: "a" })
    await expect(queued).rejects.toThrow("cancelled")
    expect(coordinator.status("ses_1")).toMatchObject({ cancelled: { reason: "user", atMs: 1 }, pendingActions: [] })
  })

  test("revokes an app and rejects active action after run", async () => {
    const coordinator = createComputerUseSessionCoordinator()
    coordinator.artifacts.create({ id: "art_1", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 100, bytes: 1 })
    let revoke!: () => void
    const action = coordinator.enqueueAction({
      id: "a",
      sessionId: "ses_1",
      appKey: "app",
      scope: "click",
      run: () => {
        revoke()
        return performed("a")
      },
    })
    revoke = () => {
      expect(coordinator.revokeApp("ses_1", "app", "policy", 2)).toEqual({ revokedActions: ["a"], deletedArtifacts: ["art_1"] })
    }
    await expect(action).rejects.toThrow("approval revoked")
    expect(coordinator.status("ses_1")).toMatchObject({ revokedApps: ["app"], pendingActions: [] })
  })

  test("keeps unaffected app actions pending when revoking another app", async () => {
    const coordinator = createComputerUseSessionCoordinator()
    const action = coordinator.enqueueAction({ id: "a", sessionId: "ses_1", appKey: "other", scope: "click", run: () => performed("a") })
    expect(coordinator.revokeApp("ses_1", "app", "policy", 1)).toEqual({ revokedActions: [], deletedArtifacts: [] })
    await expect(action).resolves.toMatchObject({ id: "a" })
  })

  test("reads artifacts through the session coordinator", () => {
    const coordinator = createComputerUseSessionCoordinator()
    coordinator.artifacts.create({ id: "art_1", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 100, bytes: 2, data: new Uint8Array([7, 8]) })
    const result = coordinator.readArtifact("art_1", { sessionId: "ses_1", nowMs: 1 })
    expect(result.ok ? [...result.data] : []).toEqual([7, 8])
  })

  test("cleans stale sessions and artifacts after helper crash", async () => {
    const coordinator = createComputerUseSessionCoordinator()
    coordinator.ensureSession("ses_1")
    coordinator.ensureSession("ses_2")
    coordinator.artifacts.create({ id: "art_1", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 100, bytes: 1 })
    coordinator.artifacts.create({ id: "art_2", sessionId: "ses_2", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 100, bytes: 1 })
    coordinator.artifacts.create({ id: "art_orphan", sessionId: "ses_orphan", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 100, bytes: 1 })
    let release!: () => void
    const first = coordinator.enqueueAction({
      id: "a",
      sessionId: "ses_1",
      appKey: "app",
      scope: "click",
      run: () => new Promise((resolve) => {
        release = () => resolve(performed("a"))
      }),
    })
    const second = coordinator.enqueueAction({ id: "b", sessionId: "ses_2", appKey: "app", scope: "click", run: () => performed("b") })
    await Promise.resolve()
    expect(coordinator.cleanupAfterHelperCrash("helper_crashed", 5)).toEqual({ revokedActions: ["a", "b"], deletedArtifacts: ["art_1", "art_2", "art_orphan"] })
    release()
    await expect(first).rejects.toThrow("cancelled")
    await expect(second).rejects.toThrow("cancelled")
    expect(coordinator.status("ses_1")).toMatchObject({ cancelled: { reason: "helper_crashed", atMs: 5 }, activeArtifacts: [] })
    expect(coordinator.status("ses_2")).toMatchObject({ cancelled: { reason: "helper_crashed", atMs: 5 }, activeArtifacts: [] })
    expect(coordinator.status("ses_orphan")).toMatchObject({ activeArtifacts: [] })
  })

  it.instance("exposes coordinator operations as a per-instance Effect service", () =>
    Effect.gen(function* () {
      const computerUse = yield* ComputerUse.Service
      expect(yield* computerUse.ensureSession("ses_service")).toMatchObject({ sessionId: "ses_service" })
      expect(yield* computerUse.enqueueAction({ id: "svc_action", sessionId: "ses_service", appKey: "app", scope: "click", run: () => performed("svc_action") })).toMatchObject({ id: "svc_action" })
      expect(yield* computerUse.readArtifact("missing", { sessionId: "ses_service", nowMs: 0 })).toEqual({ ok: false, reason: "not_found" })
      expect(yield* computerUse.cancelSession("ses_service", "user", 1)).toEqual({ revokedActions: ["svc_action"], deletedArtifacts: [] })
      expect(yield* computerUse.revokeApp("ses_service", "app", "policy", 2)).toEqual({ revokedActions: [], deletedArtifacts: [] })
      expect(yield* computerUse.cleanupAfterHelperCrash("helper_crashed", 3)).toEqual({ revokedActions: [], deletedArtifacts: [] })
      expect(yield* computerUse.status("ses_service")).toMatchObject({ cancelled: { reason: "helper_crashed", atMs: 3 }, revokedApps: ["app"] })
    }),
  )
})
