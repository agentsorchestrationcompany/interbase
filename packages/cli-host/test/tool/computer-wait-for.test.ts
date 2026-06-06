import { afterEach, beforeEach, describe, expect } from "bun:test"
import { Effect, Layer } from "effect"
import { Agent } from "@/agent/agent"
import { Config } from "@/config/config"
import { createMockDriver } from "@/computer-use/driver"
import { ComputerWaitForTool, Testing } from "@/tool/computer-wait-for"
import { Truncate } from "@/tool/truncate"
import { SessionID, MessageID } from "@/session/schema"
import { Tool } from "@/tool/tool"
import { makeSanitizedMockObservation } from "@interbase/computer-use-testkit"
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

const baseArgs: Tool.InferParameters<typeof ComputerWaitForTool> = {
  condition: { label: "Search" },
}

const layer = (config: Config.Info) =>
  Layer.mergeAll(TestConfig.layer({ get: () => Effect.succeed(config), getGlobal: () => Effect.succeed(config) }), Agent.defaultLayer, Truncate.defaultLayer)

const run = Effect.fn("ComputerWaitForToolTest.run")(function* (
  args: Tool.InferParameters<typeof ComputerWaitForTool> = baseArgs,
  ctx: Tool.Context = baseCtx,
) {
  const info = yield* ComputerWaitForTool
  const tool = yield* info.init()
  return yield* tool.execute(args, ctx)
})

describe("computer.waitFor", () => {
  beforeEach(() => {
    Testing.driver = createMockDriver()
  })

  afterEach(() => {
    Testing.driver = undefined
    Testing.desktopAvailability = undefined
    Testing.nativeDriver = undefined
  })

  testEffect(layer({})).effect("matches observed element conditions by default", () =>
    Effect.gen(function* () {
      const result = yield* run({ condition: { label: "Search", text: "Search" }, maxAttempts: 3 })
      expect(result.metadata).toMatchObject({ decision: "allowed", reason: "matched", attempts: 1 })
      expect(JSON.parse(result.output)).toMatchObject({ matched: true, attempts: 1 })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("requires native desktop availability", () =>
    Effect.gen(function* () {
      Testing.driver = undefined
      Testing.desktopAvailability = { available: false, reason: "desktopSessionUnavailable", remediation: "no desktop" }
      const result = yield* run()
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "desktopSessionUnavailable", attempts: 0 })
      expect(result.output).toContain("no desktop")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("reports native helper discovery failures on supported desktops", () =>
    Effect.gen(function* () {
      Testing.driver = undefined
      Testing.desktopAvailability = { available: true, reason: "desktop_session_available" }
      Testing.nativeDriver = { available: false, reason: "helper_not_found" }
      const result = yield* run()
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "helper_not_found", attempts: 0 })
      expect(result.output).toContain("Native computer.waitFor helper unavailable")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("matches observed element conditions", () =>
    Effect.gen(function* () {
      const metadata: unknown[] = []
      const asks: unknown[] = []
      const result = yield* run({ condition: { label: "Search", text: "Search" }, maxAttempts: 3 }, { ...baseCtx, metadata: (input) => Effect.sync(() => metadata.push(input)), ask: (input) => Effect.sync(() => asks.push(input)) })
      expect(JSON.parse(result.output)).toMatchObject({ matched: true, attempts: 1, observationId: "obs_mock_001" })
      expect(result.metadata).toMatchObject({ decision: "allowed", reason: "matched", attempts: 1, observationId: "obs_mock_001" })
      expect(result.metadata.auditEvents.map((event) => event.type)).toEqual([
        "computer.observe.requested",
        "computer.driver.status",
        "computer.policy.decision",
        "computer.policy.decision",
        "computer.approval.prompted",
        "computer.approval.responded",
        "computer.observe.allowed",
      ])
      expect(metadata).toHaveLength(1)
      expect(asks).toMatchObject([{ permission: "computer.observe", patterns: ["frontmost:window"] }])
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies when already aborted", () =>
    Effect.gen(function* () {
      const controller = new AbortController()
      controller.abort()
      const result = yield* run(baseArgs, { ...baseCtx, abort: controller.signal })
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "aborted", attempts: 0 })
      expect(result.metadata.auditEvents.map((event) => event.type)).toEqual(["computer.observe.requested", "computer.observe.denied"])
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("denies when aborted between wait attempts", () =>
    Effect.gen(function* () {
      const controller = new AbortController()
      const emptyObservation = makeSanitizedMockObservation(undefined, { elements: [] })
      Testing.driver = {
        ...createMockDriver({ observation: emptyObservation }),
        observe: (request, config) => {
          controller.abort()
          return createMockDriver({ observation: emptyObservation }).observe(request, config)
        },
      }
      const result = yield* run({ condition: { label: "Missing" }, maxAttempts: 2 }, { ...baseCtx, abort: controller.signal })
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "aborted", attempts: 1 })
      expect(result.metadata.auditEvents.map((event) => event.type)).toContain("computer.observe.denied")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("times out after bounded attempts", () =>
    Effect.gen(function* () {
      const result = yield* run({ condition: { label: "Missing" }, maxAttempts: 2 })
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "condition_timeout", attempts: 2 })
      expect(result.output).toContain("not observed")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("rejects invalid empty conditions", () =>
    Effect.gen(function* () {
      const result = yield* run({ condition: {}, maxAttempts: 20 })
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "invalid_condition", attempts: 0 })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true, app_denylist: [{ bundleId: "ai.interbase.mock-browser" }] } })).effect(
    "enforces app denylist",
    () =>
      Effect.gen(function* () {
        const result = yield* run()
        expect(result.metadata).toMatchObject({ decision: "denied", reason: "app_denied", attempts: 1 })
        expect(result.output).toContain("denied by app policy")
      }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("surfaces driver protocol errors", () =>
    Effect.gen(function* () {
      Testing.driver = createMockDriver({ protocolMajor: 999 })
      const result = yield* run()
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "denied", reason: "unsupported_protocol", attempts: 1 })
      expect(result.output).toContain("not supported")
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("matches by element id", () =>
    Effect.gen(function* () {
      Testing.driver = createMockDriver({ observation: makeSanitizedMockObservation({ enabled: true }, { elements: [{ id: "ready", role: "status", label: "Ready" }] }) })
      const result = yield* run({ condition: { elementId: "ready" } })
      Testing.driver = undefined
      expect(result.metadata).toMatchObject({ decision: "allowed", reason: "matched" })
    }),
  )

  testEffect(layer({ computer_use: { enabled: true } })).effect("enforces target app and window before matching conditions", () =>
    Effect.gen(function* () {
      const matched = yield* run({ target: { app: { bundleId: "ai.interbase.mock-browser" }, windowId: "win-main" }, condition: { label: "Search" } })
      expect(matched.metadata).toMatchObject({ decision: "allowed" })
      const appMismatch = yield* run({ target: { app: { name: "Other" } }, condition: { label: "Search" } })
      expect(appMismatch.metadata).toMatchObject({ decision: "denied", reason: "target_app_changed", attempts: 1 })
      const asks: unknown[] = []
      yield* run({ target: { app: { name: "Other" } }, condition: { label: "Search" } }, { ...baseCtx, ask: (input) => Effect.sync(() => asks.push(input)) })
      expect(asks).toEqual([])
      const windowMismatch = yield* run({ target: { windowId: "other" }, condition: { label: "Search" } })
      expect(windowMismatch.metadata).toMatchObject({ decision: "denied", reason: "target_window_changed", attempts: 1 })
    }),
  )
})
