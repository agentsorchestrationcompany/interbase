import { afterEach, beforeEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Agent } from "@/agent/agent"
import { Config } from "@/config/config"
import { createComputerUseSessionCoordinator } from "@/computer-use/session"
import { createMockDriver } from "@/computer-use/driver"
import { makeSanitizedMockObservation } from "@interbase/computer-use-testkit"
import { ComputerActTool, Testing } from "@/tool/computer-act"
import { Truncate } from "@/tool/truncate"
import { SessionID, MessageID } from "@/session/schema"
import { Tool } from "@/tool/tool"
import { TestConfig } from "../fixture/config"
import { testEffect } from "../lib/effect"

const baseCtx: Tool.Context = {
  sessionID: SessionID.make("ses_computer"),
  messageID: MessageID.make("msg_computer"),
  callID: "call_computer",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => Effect.void,
  ask: () => Effect.void,
}

const baseArgs: Tool.InferParameters<typeof ComputerActTool> = {
  actionId: "act_1",
  observationId: "obs_1",
  app: { name: "Mock Browser", bundleId: "ai.interbase.mock-browser" },
  windowId: "win-main",
  action: { type: "click" as const, elementId: "el_1" },
}

const layer = (config: Config.Info) =>
  Layer.mergeAll(TestConfig.layer({ get: () => Effect.succeed(config), getGlobal: () => Effect.succeed(config) }), Agent.defaultLayer, Truncate.defaultLayer)

const run = Effect.fn("ComputerActToolTest.run")(function* (args: Tool.InferParameters<typeof ComputerActTool> = baseArgs, ctx: Tool.Context = baseCtx) {
  const info = yield* ComputerActTool
  const tool = yield* info.init()
  return yield* tool.execute(args, ctx)
})

describe("computer.act", () => {
  beforeEach(() => {
    Testing.driver = createMockDriver()
  })

  afterEach(() => {
    Testing.driver = undefined
    Testing.coordinator = undefined
    Testing.nowMs = undefined
    Testing.desktopAvailability = undefined
    Testing.nativeDriver = undefined
  })

  testEffect(layer({})).effect("performs one low-risk mock action by default", () =>
    Effect.gen(function* () {
      const result = yield* run()
      expect(result.metadata).toMatchObject({ decision: "allowed", reason: "allowed" })
      expect(JSON.parse(result.output)).toMatchObject({ id: baseArgs.actionId, status: "performed" })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("requires native desktop availability", () =>
    Effect.gen(function* () {
      Testing.driver = undefined
      Testing.desktopAvailability = { available: false, reason: "desktopSessionUnavailable", remediation: "no desktop" }
      const result = yield* run()
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "desktopSessionUnavailable" })
      expect(result.output).toContain("no desktop")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("reports native helper discovery failures on supported desktops", () =>
    Effect.gen(function* () {
      Testing.driver = undefined
      Testing.desktopAvailability = { available: true, reason: "desktop_session_available" }
      Testing.nativeDriver = { available: false, reason: "helper_not_found" }
      const result = yield* run()
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "helper_not_found" })
      expect(result.output).toContain("Native computer.act helper unavailable")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("performs one low-risk mock action", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const metadata: unknown[] = []
      const asks: unknown[] = []
      const result = yield* run(baseArgs, { ...baseCtx, metadata: (input) => Effect.sync(() => metadata.push(input)), ask: (input) => Effect.sync(() => asks.push(input)) })
      Testing.nowMs = undefined
      const parsed = JSON.parse(result.output)
      expect(result.metadata).toMatchObject({ decision: "allowed", reason: "allowed", risk: { level: "medium" } })
      expect(result.metadata.permissionPrompt).toMatchObject({
        requestedAction: "click",
        requestedScopes: ["click"],
        modelAttachment: { screenshot: "deny", axText: "deny", screenshotPreviewAllowed: false },
        options: ["allow_once", "allow_session", "always_allow", "deny"],
      })
      expect(result.metadata.auditEvents.map((event) => event.type)).toEqual([
        "computer.action.requested",
        "computer.driver.status",
        "computer.policy.decision",
        "computer.approval.prompted",
        "computer.approval.responded",
        "computer.action.allowed",
      ])
      expect(parsed).toMatchObject({ id: "act_1", status: "performed", warnings: ["mock action; no native OS event was emitted"] })
      expect(metadata).toHaveLength(1)
      expect(asks).toMatchObject([{ permission: "computer.click", patterns: ["ai.interbase.mock-browser:win-main:click"], always: ["ai.interbase.mock-browser"] }])
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("cancels the computer-use session when already aborted", () =>
    Effect.gen(function* () {
      const controller = new AbortController()
      controller.abort()
      const coordinator = createComputerUseSessionCoordinator()
      Testing.coordinator = coordinator
      const result = yield* run(baseArgs, { ...baseCtx, abort: controller.signal })
      Testing.coordinator = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "aborted" })
      expect(result.metadata.auditEvents.map((event) => event.type)).toEqual([
        "computer.action.requested",
        "computer.action.denied",
      ])
      expect(coordinator.status(baseCtx.sessionID)).toMatchObject({ cancelled: { reason: "aborted" } })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("cancels queued action state when aborted during execution", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const controller = new AbortController()
      const coordinator = createComputerUseSessionCoordinator()
      Testing.coordinator = coordinator
      Testing.driver = {
        ...createMockDriver(),
        act: (request) => {
          controller.abort()
          return { id: request.id, status: "performed", app: request.app, warnings: [] }
        },
      }
      const result = yield* run(baseArgs, { ...baseCtx, abort: controller.signal })
      Testing.nowMs = undefined
      Testing.coordinator = undefined
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "session_cancelled" })
      expect(result.metadata.auditEvents.map((event) => event.type)).toContain("computer.approval.revoked")
      expect(coordinator.status(baseCtx.sessionID)).toMatchObject({ cancelled: { reason: "aborted" }, pendingActions: [] })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("revalidates driver status immediately before action execution", () =>
    Effect.gen(function* () {
      let statusCalls = 0
      const driver = createMockDriver()
      Testing.driver = {
        ...driver,
        status: () => {
          statusCalls += 1
          return statusCalls > 1 ? { ...driver.status(), crashed: true } : driver.status()
        },
      }
      const result = yield* run()
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "driver_crashed" })
      expect(result.metadata.auditEvents.map((event) => event.type)).toContain("computer.driver.crashed")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies actions when the target window is hidden before execution", () =>
    Effect.gen(function* () {
      const driver = createMockDriver()
      Testing.driver = {
        ...driver,
        observe: async (request, config) => ({ ...(await driver.observe(request, config)), window: { id: "win-main", visible: false } }),
      }
      const result = yield* run()
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "target_window_hidden" })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("resolves semantic click actions against the latest observation", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const result = yield* run({ ...baseArgs, actionId: "act_semantic", action: { type: "clickElement" as const, selector: { label: "Search" } } })
      Testing.nowMs = undefined
      const parsed = JSON.parse(result.output)
      expect(result.metadata).toMatchObject({ decision: "allowed", permissionPrompt: { requestedAction: "clickElement", requestedScopes: ["semanticAction"] } })
      expect(parsed).toMatchObject({ id: "act_semantic", status: "performed" })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("accepts Phase B semantic action surface", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const focus = yield* run({ ...baseArgs, actionId: "act_focus_element", action: { type: "focusElement" as const, selector: { label: "Search" } } })
      Testing.nowMs = 2000
      const menu = yield* run({ ...baseArgs, actionId: "act_select_menu", action: { type: "selectMenuItem" as const, selector: { label: "Search" } } })
      Testing.nowMs = 3000
      const contextMenu = yield* run({ ...baseArgs, actionId: "act_context_menu", action: { type: "openContextMenu" as const, selector: { label: "Search" } } })
      Testing.nowMs = undefined
      expect(focus.metadata).toMatchObject({ decision: "allowed", permissionPrompt: { requestedAction: "focusElement", requestedScopes: ["semanticAction"] } })
      expect(menu.metadata).toMatchObject({ decision: "allowed", permissionPrompt: { requestedAction: "selectMenuItem", requestedScopes: ["semanticAction"] } })
      expect(contextMenu.metadata).toMatchObject({ decision: "allowed", permissionPrompt: { requestedAction: "openContextMenu", requestedScopes: ["semanticAction"] } })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("accepts app focus and launch action surface", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const focus = yield* run({ ...baseArgs, actionId: "act_focus_app", action: { type: "focusApp" as const } })
      Testing.nowMs = 2000
      const launch = yield* run({ ...baseArgs, actionId: "act_launch_app", action: { type: "launchApp" as const } })
      Testing.nowMs = undefined
      expect(focus.metadata).toMatchObject({ decision: "allowed", permissionPrompt: { requestedAction: "focusApp", requestedScopes: ["semanticAction"] } })
      expect(launch.metadata).toMatchObject({ decision: "allowed", permissionPrompt: { requestedAction: "launchApp", requestedScopes: ["semanticAction"] } })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("gates file dialog helpers with fileDialog approval", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const asks: unknown[] = []
      const result = yield* run(
        { ...baseArgs, actionId: "act_file_dialog", action: { type: "fileDialog" as const, operation: "selectFile" as const, artifactId: "artifact_1" } },
        { ...baseCtx, ask: (input) => Effect.sync(() => asks.push(input)) },
      )
      Testing.nowMs = undefined
      expect(result.metadata).toMatchObject({ decision: "allowed", risk: { level: "high" }, permissionPrompt: { requestedAction: "fileDialog", requestedScopes: ["fileDialog"] } })
      expect(asks).toMatchObject([{ permission: "computer.fileDialog", patterns: ["ai.interbase.mock-browser:win-main:fileDialog"] }])
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies stale semantic action targets", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const result = yield* run({ ...baseArgs, actionId: "act_stale", action: { type: "clickElement" as const, selector: { label: "Missing" } } })
      Testing.nowMs = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "stale_element" })
      expect(result.output).toContain("not found")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("blocks secure typing", () =>
    Effect.gen(function* () {
      const result = yield* run({ ...baseArgs, action: { type: "typeText" as const, text: "secret", secureField: true } })
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "blocked_risk", risk: { level: "blocked" } })
      expect(result.output).toContain("secure fields")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("does not ask for blocked action permissions", () =>
    Effect.gen(function* () {
      const asks: unknown[] = []
      yield* run({ ...baseArgs, action: { type: "typeText" as const, text: "secret", secureField: true } }, { ...baseCtx, ask: (input) => Effect.sync(() => asks.push(input)) })
      expect(asks).toEqual([])
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("blocks app-switch and paste key chords before approval", () =>
    Effect.gen(function* () {
      const asks: unknown[] = []
      const appSwitch = yield* run({ ...baseArgs, action: { type: "keyChord" as const, keys: ["Meta", "Tab"] } }, { ...baseCtx, ask: (input) => Effect.sync(() => asks.push(input)) })
      const paste = yield* run({ ...baseArgs, action: { type: "keyChord" as const, keys: ["Meta", "V"] } }, { ...baseCtx, ask: (input) => Effect.sync(() => asks.push(input)) })
      expect(appSwitch.metadata).toMatchObject({ decision: "denied", reason: "blocked_risk", risk: { level: "blocked" } })
      expect(paste.metadata).toMatchObject({ decision: "denied", reason: "blocked_risk", risk: { level: "blocked" } })
      expect(asks).toEqual([])
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies coordinate pointer actions without window context", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const result = yield* run({ ...baseArgs, windowId: undefined, action: { type: "click" as const, point: { x: 1, y: 2, space: "windowLogical" as const } } })
      Testing.nowMs = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "invalid_action" })
      expect(result.output).toContain("windowId context")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("performs movePointer as a pointer action", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const result = yield* run({ ...baseArgs, actionId: "act_move", action: { type: "movePointer" as const, point: { x: 1, y: 2, space: "windowLogical" as const } } })
      Testing.nowMs = undefined
      const parsed = JSON.parse(result.output)
      expect(result.metadata).toMatchObject({ decision: "allowed", permissionPrompt: { requestedAction: "movePointer", requestedScopes: ["click"] } })
      expect(parsed).toMatchObject({ id: "act_move", status: "performed" })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("performs drag as a pointer action", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const result = yield* run({ ...baseArgs, actionId: "act_drag", action: { type: "drag" as const, from: { x: 1, y: 2, space: "windowLogical" as const }, to: { x: 3, y: 4, space: "windowLogical" as const } } })
      Testing.nowMs = undefined
      const parsed = JSON.parse(result.output)
      expect(result.metadata).toMatchObject({ decision: "allowed", permissionPrompt: { requestedAction: "drag", requestedScopes: ["click"] } })
      expect(parsed).toMatchObject({ id: "act_drag", status: "performed" })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true, app_denylist: [{ bundleId: "ai.interbase.mock-browser" }] } })).effect(
    "enforces app denylist before action",
    () =>
      Effect.gen(function* () {
        const result = yield* run()
        expect(result.metadata).toMatchObject({ decision: "denied", reason: "app_denied" })
        expect(result.metadata.permissionPrompt).toMatchObject({
          options: ["deny"],
          block: { overridable: false, reason: "app denied by computer-use policy" },
        })
      }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("rate limits repeated actions", () =>
    Effect.gen(function* () {
      Testing.nowMs = 1000
      const info = yield* ComputerActTool
      const tool = yield* info.init()
      const first = yield* tool.execute(baseArgs, baseCtx)
      const second = yield* tool.execute({ ...baseArgs, actionId: "act_2" }, baseCtx)
      Testing.nowMs = undefined
      expect(first.metadata).toMatchObject({ decision: "allowed" })
      expect(second.metadata).toMatchObject({ decision: "denied", reason: "rate_limited" })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies driver protocol mismatch", () =>
    Effect.gen(function* () {
      Testing.driver = createMockDriver({ protocolMajor: 999 })
      const result = yield* run()
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "unsupported_protocol" })
      expect(result.output).toContain("not supported")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies when session is cancelled before action runs", () =>
    Effect.gen(function* () {
      const coordinator = createComputerUseSessionCoordinator()
      coordinator.cancelSession(baseCtx.sessionID, "user", 1)
      Testing.coordinator = coordinator
      const result = yield* run({ ...baseArgs, actionId: "act_cancelled" })
      Testing.coordinator = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "session_cancelled" })
      expect(result.output).toContain("session cancelled")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies when app approval is revoked before action runs", () =>
    Effect.gen(function* () {
      const coordinator = createComputerUseSessionCoordinator()
      coordinator.revokeApp(baseCtx.sessionID, "ai.interbase.mock-browser", "policy", 1)
      Testing.coordinator = coordinator
      const result = yield* run({ ...baseArgs, actionId: "act_revoked" })
      Testing.coordinator = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "app_revoked" })
      expect(result.output).toContain("approval revoked")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies if frontmost app changes before action", () =>
    Effect.gen(function* () {
      Testing.driver = createMockDriver({ observation: makeSanitizedMockObservation({ enabled: true }, { app: { name: "Other", bundleId: "other" } }) })
      const result = yield* run({ ...baseArgs, actionId: "act_app_changed" })
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "target_app_changed" })
      expect(result.output).toContain("target_app_changed")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true, app_denylist: [{ bundleId: "blocked" }] } })).effect(
    "denies if denied app becomes frontmost before action",
    () =>
      Effect.gen(function* () {
        Testing.driver = createMockDriver({ observation: makeSanitizedMockObservation({ enabled: true }, { app: { name: "Blocked", bundleId: "blocked" } }) })
        const result = yield* run({ ...baseArgs, actionId: "act_denied_frontmost" })
        Testing.driver = undefined
        expect(result.metadata).toMatchObject({ decision: "denied", reason: "frontmost_app_denied" })
      }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies if target window changes before action", () =>
    Effect.gen(function* () {
      Testing.driver = createMockDriver({ observation: makeSanitizedMockObservation({ enabled: true }, { window: { id: "other_window" } }) })
      const result = yield* run({ ...baseArgs, actionId: "act_window_changed" })
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "target_window_changed" })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies if a modal blocks the target before action", () =>
    Effect.gen(function* () {
      Testing.driver = createMockDriver({ observation: makeSanitizedMockObservation({ enabled: true }, { warnings: ["modal dialog covers target"] }) })
      const result = yield* run({ ...baseArgs, actionId: "act_modal" })
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "modal_warning_detected" })
    }),
  )
})
