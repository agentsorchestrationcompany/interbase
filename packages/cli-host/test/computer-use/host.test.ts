import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { createComputerUseHost } from "@/computer-use/host"
import { createMockDriver } from "@/computer-use/driver"
import { Testing as ObserveTesting } from "@/computer-use/tool-observe"
import { TestConfig } from "../fixture/config"
import type { ComputerUseContext } from "@interbase/cli-computer-use-plugin"

const context: ComputerUseContext = {
  sessionID: "ses_host",
  messageID: "msg_host",
  callID: "call_host",
  providerID: "openai",
  modelID: "gpt-5",
  agent: "build",
  directory: "/tmp/project",
  worktree: "/tmp/project",
  abort: AbortSignal.any([]),
  modelLocality: "remote",
  metadata: () => undefined,
  ask: () => Effect.fail("denied") as unknown as Effect.Effect<void>,
}

const allowedContext: ComputerUseContext = {
  ...context,
  sessionID: "ses_allowed",
  ask: () => Effect.void,
}

const allowedLocalContext: ComputerUseContext = {
  ...allowedContext,
  providerID: "ollama",
  modelID: "llama3",
  modelLocality: "local",
}

describe("computer-use host", () => {
  test("maps permission denial to a normal denied tool result", async () => {
    const host = createComputerUseHost()
    ObserveTesting.driver = createMockDriver()
    const result = await Effect.runPromise(
      (host.observe({}, context) as Effect.Effect<unknown>).pipe(
        Effect.provide(TestConfig.layer({
          get: () => Effect.succeed({ computer_use: { enabled: true } }),
        })),
      ),
    )
    ObserveTesting.driver = undefined
    expect(result).toMatchObject({ metadata: { decision: "denied", reason: "permission_denied" } })
  })

  test("reads artifacts created by observe through the same host", async () => {
    const host = createComputerUseHost()
    const layer = TestConfig.layer({
      get: () => Effect.succeed({ computer_use: { enabled: true, model_attachment: { allow_screenshots_to_remote_models: "always" } } }),
    })
    ObserveTesting.driver = { ...createMockDriver(), readArtifact: () => new Uint8Array([1, 2, 3]) }
    const observed = await Effect.runPromise((host.observe({}, allowedLocalContext) as Effect.Effect<any>).pipe(Effect.provide(layer)))
    ObserveTesting.driver = undefined
    const parsed = JSON.parse(observed.output)
    expect(parsed.screenshot, JSON.stringify(observed)).toBeDefined()
    const artifactId = parsed.screenshot.id

    const artifact = await Effect.runPromise(
      (host.readArtifact({ artifactId, sessionID: allowedLocalContext.sessionID, purpose: "debug", modelLocality: "remote" }, allowedLocalContext) as Effect.Effect<any>).pipe(Effect.provide(layer)),
    )
    expect(artifact).toMatchObject({ mimeType: "image/png", cacheControl: "no-store", metadata: { artifactId, purpose: "debug" } })
    expect(artifact.bytes.byteLength).toBeGreaterThan(0)
  })

  test("denies remote provider artifact attachments unless policy explicitly allows them", async () => {
    const host = createComputerUseHost()
    const createLayer = TestConfig.layer({
      get: () => Effect.succeed({ computer_use: { enabled: true, model_attachment: { allow_screenshots_to_remote_models: "always" } } }),
    })
    const deniedLayer = TestConfig.layer({
      get: () => Effect.succeed({ computer_use: { enabled: true, model_attachment: { allow_screenshots_to_remote_models: "never" } } }),
    })
    ObserveTesting.driver = { ...createMockDriver(), readArtifact: () => new Uint8Array([1, 2, 3]) }
    const observed = await Effect.runPromise((host.observe({}, allowedLocalContext) as Effect.Effect<any>).pipe(Effect.provide(createLayer)))
    ObserveTesting.driver = undefined
    const parsed = JSON.parse(observed.output)
    expect(parsed.screenshot, JSON.stringify(observed)).toBeDefined()
    const artifactId = parsed.screenshot.id

    await expect(
      Effect.runPromise(
        (host.readArtifact({ artifactId, sessionID: allowedLocalContext.sessionID, purpose: "provider_attachment", modelLocality: "remote" }, allowedLocalContext) as Effect.Effect<any>).pipe(Effect.provide(deniedLayer)),
      ),
    ).rejects.toThrow("artifact_forbidden")

    const allowedLayer = TestConfig.layer({
      get: () => Effect.succeed({
        computer_use: {
          enabled: true,
          model_attachment: { allow_screenshots_to_remote_models: "always" },
        },
      }),
    })
    await expect(
      Effect.runPromise(
        (host.readArtifact({ artifactId, sessionID: allowedLocalContext.sessionID, purpose: "provider_attachment", modelLocality: "remote" }, allowedLocalContext) as Effect.Effect<any>).pipe(Effect.provide(allowedLayer)),
      ),
    ).resolves.toMatchObject({ metadata: { artifactId, purpose: "provider_attachment" } })
  })
})
