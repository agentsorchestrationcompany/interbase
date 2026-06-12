import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { createProviderComputerUseAdapter } from "@/computer-use/provider-adapter"
import type { ComputerUseHost, ComputerUseToolResult } from "@interbase/cli-computer-use-plugin"

const result: ComputerUseToolResult = { output: "observed", metadata: { decision: "allowed", reason: "allowed" } }

describe("provider computer-use host adapter", () => {
  test("advertises only when exposure and provider support allow it", async () => {
    const adapter = createProviderComputerUseAdapter({
      host: host(),
      runtime: { runPromise: (effect) => Effect.runPromise(effect as Effect.Effect<unknown>) as Promise<never> },
      getExposure: async () => ({ enabled: true, exposeTools: true, backend: "native" }),
      classifyModel: () => "remote",
      supportsNativeComputerUse: ({ providerID }) => providerID === "openai",
    })
    await expect(adapter.shouldAdvertise({ providerID: "openai", modelID: "gpt-5" })).resolves.toBe(true)
    await expect(adapter.shouldAdvertise({ providerID: "other", modelID: "model" })).resolves.toBe(false)
  })

  test("does not advertise when exposure is disabled", async () => {
    const adapter = createProviderComputerUseAdapter({
      host: host(),
      runtime: { runPromise: (effect) => Effect.runPromise(effect as Effect.Effect<unknown>) as Promise<never> },
      getExposure: async () => ({ enabled: false, exposeTools: false, backend: "native", reason: "feature_disabled" }),
      classifyModel: () => "remote",
      supportsNativeComputerUse: () => true,
    })
    await expect(adapter.shouldAdvertise({ providerID: "openai" })).resolves.toBe(false)
  })

  test("does not advertise in pure mode", async () => {
    const previous = process.env.INTERBASE_PURE
    process.env.INTERBASE_PURE = "1"
    try {
      const adapter = createProviderComputerUseAdapter({
        host: host(),
        runtime: { runPromise: (effect) => Effect.runPromise(effect as Effect.Effect<unknown>) as Promise<never> },
        getExposure: async () => ({ enabled: true, exposeTools: true, backend: "native" }),
        classifyModel: () => "remote",
        supportsNativeComputerUse: () => true,
      })
      await expect(adapter.shouldAdvertise({ providerID: "openai" })).resolves.toBe(false)
    } finally {
      if (previous === undefined) delete process.env.INTERBASE_PURE
      else process.env.INTERBASE_PURE = previous
    }
  })

  test("delegates observe requests through the host with classified model locality", async () => {
    const calls: string[] = []
    const adapter = createProviderComputerUseAdapter({
      host: host(calls),
      runtime: { runPromise: (effect) => Effect.runPromise(effect as Effect.Effect<unknown>) as Promise<never> },
      getExposure: async () => ({ enabled: true, exposeTools: true, backend: "native" }),
      classifyModel: () => "local",
      supportsNativeComputerUse: () => true,
    })
    await expect(adapter.observe({}, context())).resolves.toEqual(result)
    expect(calls).toEqual(["observe:local"])
  })

  test("maps denials to provider-safe tool results", async () => {
    const adapter = createProviderComputerUseAdapter({
      host: host(),
      runtime: { runPromise: (effect) => Effect.runPromise(effect as Effect.Effect<unknown>) as Promise<never> },
      getExposure: async () => ({ enabled: true, exposeTools: true, backend: "native" }),
      classifyModel: () => "remote",
      supportsNativeComputerUse: () => true,
    })
    await expect(adapter.deny("permission_denied")).resolves.toMatchObject({ metadata: { decision: "denied", reason: "permission_denied" } })
  })
})

function host(calls: string[] = []): ComputerUseHost {
  return {
    observe: (_args, ctx) => Effect.sync(() => {
      calls.push(`observe:${ctx.modelLocality}`)
      return result
    }),
    act: () => Effect.succeed(result),
    waitFor: () => Effect.succeed(result),
    status: () => Effect.succeed(result),
    readArtifact: () => Effect.succeed({ mimeType: "image/png", bytes: new Uint8Array(), cacheControl: "no-store", metadata: {} }),
  }
}

function context() {
  return {
    sessionID: "ses",
    messageID: "msg",
    providerID: "openai",
    modelID: "gpt-5",
    agent: "build",
    directory: "/tmp/project",
    worktree: "/tmp/project",
    abort: AbortSignal.any([]),
  }
}
