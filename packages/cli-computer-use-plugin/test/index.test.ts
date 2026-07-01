import { describe, expect, test } from "vitest"
import { Effect } from "effect"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { createComputerUsePlugin } from "../src/index.js"
import { ActArgsSchema, ObserveArgsSchema, WaitForArgsSchema } from "../src/schemas.js"
import type { ComputerUseContext, ComputerUseHost, ComputerUseToolResult } from "../src/host.js"

const context: ComputerUseContext = {
  sessionID: "ses_1",
  messageID: "msg_1",
  callID: "call_1",
  providerID: "provider_local",
  modelID: "model_1",
  agent: "build",
  directory: "/tmp/project",
  worktree: "/tmp/project",
  abort: AbortSignal.any([]),
  modelLocality: "remote",
  metadata: () => undefined,
  ask: () => Effect.void,
}

function result(reason: string): ComputerUseToolResult {
  return { output: reason, metadata: { decision: "allowed", reason } }
}

function host(calls: string[]): ComputerUseHost {
  return {
    observe: (_input, ctx) => Effect.sync(() => {
      calls.push(`observe:${ctx.modelLocality}`)
      return result("observe")
    }),
    act: (_input, ctx) => Effect.sync(() => {
      calls.push(`act:${ctx.callID}`)
      return result("act")
    }),
    waitFor: (_input, ctx) => Effect.sync(() => {
      calls.push(`wait:${ctx.providerID}`)
      return result("wait")
    }),
    status: (_input, ctx) => Effect.sync(() => {
      calls.push(`status:${ctx.sessionID}`)
      return result("status")
    }),
    readArtifact: (input, ctx) => Effect.sync(() => {
      calls.push(`artifact:${input.artifactId}:${ctx.modelLocality}`)
      return { mimeType: "image/png", bytes: new Uint8Array([1]), cacheControl: "no-store", metadata: {} }
    }),
  }
}

describe("cli computer-use plugin", () => {
  test("hides model-facing tools when exposure is disabled", async () => {
    const plugin = createComputerUsePlugin({
      host: host([]),
      runtime: { runPromise: (effect) => Effect.runPromise(effect as Effect.Effect<unknown>) as Promise<never> },
      getExposure: async () => ({ enabled: false, exposeTools: false, backend: "native", reason: "feature_disabled" }),
      classifyModel: () => "remote",
    })

    await expect(plugin({} as any)).resolves.toEqual({ tool: {} })
  })

  test("exposes tools and delegates through the host boundary", async () => {
    const calls: string[] = []
    const plugin = createComputerUsePlugin({
      host: host(calls),
      runtime: { runPromise: (effect) => Effect.runPromise(effect as Effect.Effect<unknown>) as Promise<never> },
      getExposure: async () => ({ enabled: true, exposeTools: true, backend: "native" }),
      classifyModel: ({ providerID }) => (providerID?.includes("local") ? "local" : "remote"),
    })
    const hooks = await plugin({} as any)

    expect(Object.keys(hooks.tool ?? {}).sort()).toEqual(["computer_act", "computer_observe", "computer_wait_for"])
    await expect(hooks.tool?.computer_observe?.execute({}, context)).resolves.toEqual(result("observe"))
    await expect(
      hooks.tool?.computer_act?.execute(
        { actionId: "a1", observationId: "o1", app: { name: "App" }, action: { type: "click", elementId: "e1" } },
        context,
      ),
    ).resolves.toEqual(result("act"))
    await expect(hooks.tool?.computer_wait_for?.execute({ condition: { text: "Ready" } }, context)).resolves.toEqual(result("wait"))
    expect(calls).toEqual(["observe:local", "act:call_1", "wait:provider_local"])
  })

  test("schemas accept representative model-facing arguments", () => {
    expect(ObserveArgsSchema.parse({ target: { app: { bundleId: "app.id" }, windowId: "w1" }, includeScreenshot: false })).toMatchObject({ includeScreenshot: false })
    expect(ActArgsSchema.parse({ actionId: "a", observationId: "o", app: { name: "App" }, action: { type: "keyChord", keys: ["Tab"] } })).toMatchObject({ action: { type: "keyChord" } })
    expect(WaitForArgsSchema.parse({ condition: { label: "Done" }, maxAttempts: 2 })).toMatchObject({ maxAttempts: 2 })
  })

  test("does not import cli-host from the public plugin package", () => {
    const src = join(import.meta.dirname, "..", "src")
    const files = readdirSync(src).filter((file) => file.endsWith(".ts"))
    const contents = files.map((file) => readFileSync(join(src, file), "utf8")).join("\n")
    expect(contents).not.toContain("@interbase/cli-host")
    expect(contents).not.toContain("packages/cli-host")
  })
})
