import { Effect } from "effect"
import type {
  ActArgs,
  ComputerUseContext,
  ComputerUseHost,
  ComputerUseToolResult,
  ObserveArgs,
  ReadArtifactInput,
  ReadArtifactResult,
  WaitForArgs,
} from "@interbase/cli-computer-use-plugin"
import type * as Tool from "@/tool/tool"
import { ComputerObserveTool, Testing as ObserveTesting } from "@/computer-use/tool-observe"
import { ComputerActTool, Testing as ActTesting } from "@/computer-use/tool-act"
import { ComputerWaitForTool } from "@/computer-use/tool-wait-for"
import { createComputerUseSessionCoordinator } from "@/computer-use/session"
import { Agent } from "@/agent/agent"
import { Truncate } from "@/tool/truncate"
import { Config } from "@/config/config"

export function createComputerUseHost(): ComputerUseHost {
  const coordinator = createComputerUseSessionCoordinator()
  return {
    observe: (input, context) => runTool(ComputerObserveTool, input, context, coordinator),
    act: (input, context) => runTool(ComputerActTool, input, context, coordinator),
    waitFor: (input, context) => runTool(ComputerWaitForTool, input, context),
    status: (_input, context) =>
      Effect.sync(() => {
        const status = coordinator.status(context.sessionID)
        return {
          output: JSON.stringify(status, null, 2),
          metadata: { decision: "allowed", reason: "allowed", truncated: false },
        }
      }),
    readArtifact: (input, _context) => readArtifact(input, coordinator),
  }
}

function runTool<A extends ObserveArgs | ActArgs | WaitForArgs>(
  toolInfo: typeof ComputerObserveTool | typeof ComputerActTool | typeof ComputerWaitForTool,
  input: A,
  context: ComputerUseContext,
  coordinator?: ReturnType<typeof createComputerUseSessionCoordinator>,
): Effect.Effect<ComputerUseToolResult, never, any> {
  let previousObserve: typeof ObserveTesting.coordinator
  let previousAct: typeof ActTesting.coordinator
  return Effect.gen(function* () {
    previousObserve = ObserveTesting.coordinator
    previousAct = ActTesting.coordinator
    if (coordinator) {
      ObserveTesting.coordinator = coordinator
      ActTesting.coordinator = coordinator
    }
    const info = yield* toolInfo
    const tool = yield* info.init()
    const result = yield* tool.execute(input as never, toToolContext(context))
    return { output: result.output, metadata: result.metadata as ComputerUseToolResult["metadata"] }
  }).pipe(
    Effect.ensuring(Effect.sync(() => {
      if (coordinator) {
        ObserveTesting.coordinator = previousObserve
        ActTesting.coordinator = previousAct
      }
    })),
    Effect.catchDefect((error) => {
      if (error instanceof Error && error.message === "permission_denied") {
        return Effect.succeed({
          output: "computer-use permission was denied.",
          metadata: { decision: "denied", reason: "permission_denied", truncated: false },
        } satisfies ComputerUseToolResult)
      }
      return Effect.die(error)
    }),
    Effect.provide(Agent.defaultLayer),
    Effect.provide(Truncate.defaultLayer),
  )
}

function toToolContext(context: ComputerUseContext): Tool.Context {
  return {
    sessionID: context.sessionID as Tool.Context["sessionID"],
    messageID: context.messageID as Tool.Context["messageID"],
    callID: context.callID,
    providerID: context.providerID,
    modelID: context.modelID,
    abort: context.abort,
    agent: context.agent,
    messages: [],
    metadata: (input) => Effect.sync(() => context.metadata(input)),
    ask: (input) =>
      Effect.promise(() =>
        Effect.runPromise(context.ask(input)).catch(() => {
          throw new Error("permission_denied")
        }),
      ),
  }
}

function readArtifact(input: ReadArtifactInput, coordinator: ReturnType<typeof createComputerUseSessionCoordinator>): Effect.Effect<ReadArtifactResult, never, any> {
  return Effect.gen(function* () {
    if (input.purpose === "provider_attachment" && input.modelLocality === "remote") {
      const config = yield* Config.Service
      const info = yield* config.get()
      const policy = info.computer_use?.model_attachment?.allow_screenshots_to_remote_models ?? "never"
      if (policy !== "always") throw new Error("artifact_forbidden")
    }
    const result = coordinator.readArtifact(input.artifactId, { sessionId: input.sessionID, nowMs: Date.now() })
    if (!result.ok) throw new Error(`artifact_${result.reason}`)
    return {
      mimeType: result.mimeType,
      bytes: result.data,
      cacheControl: "no-store" as const,
      metadata: { artifactId: result.id, kind: result.kind, expiresAt: result.expiresAt, purpose: input.purpose },
    }
  })
}

export * as ComputerUseHost from "./host"
