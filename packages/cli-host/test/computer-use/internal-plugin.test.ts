import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { createComputerUseInternalPlugin } from "@/plugin/computer-use"
import { TestConfig } from "../fixture/config"

const bridge = {
  promise: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.runPromise(effect as Effect.Effect<A, E>),
  fork: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.runFork(effect as Effect.Effect<A, E>),
  run: <A, E, R>(effect: Effect.Effect<A, E, R>) => effect as Effect.Effect<A, E>,
}

describe("computer-use internal plugin", () => {
  test("exposes computer-use tools by default", async () => {
    const plugin = await createComputerUseInternalPlugin({} as any, { bridge, config: TestConfig.make({ get: () => Effect.succeed({}) }) })
    const hooks = await plugin({} as any)
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(["computer_act", "computer_observe", "computer_wait_for"])
  })

  test("exposes computer-use tools when enabled", async () => {
    const plugin = await createComputerUseInternalPlugin(
      {} as any,
      { bridge, config: TestConfig.make({ get: () => Effect.succeed({ computer_use: { enabled: true } }) }) },
    )
    const hooks = await plugin({} as any)
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(["computer_act", "computer_observe", "computer_wait_for"])
  })

  test("explicit disabled config does not hide tools yet", async () => {
    const plugin = await createComputerUseInternalPlugin(
      {} as any,
      { bridge, config: TestConfig.make({ get: () => Effect.succeed({ computer_use: { enabled: false } }) }) },
    )
    const hooks = await plugin({} as any)
    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(["computer_act", "computer_observe", "computer_wait_for"])
  })
})
