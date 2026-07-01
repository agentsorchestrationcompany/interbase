import type { ComputerUseExposure, ComputerUseHost, ComputerUseRuntime, ComputerUseToolResult, ModelLocality } from "@interbase/cli-computer-use-plugin"
import { Flag } from "@interbase/core/flag/flag"

export const providerComputerUseToolName = "computer_use"

export type ProviderComputerCallItem = {
  id: string
  status?: string
}

export type ProviderComputerUsePreviewArgs = {
  displayWidth?: number
  displayHeight?: number
  environment?: "browser" | "mac" | "windows" | "ubuntu"
}

export type ProviderComputerUseAdapterInput = {
  host: ComputerUseHost
  runtime: ComputerUseRuntime
  getExposure: () => Promise<ComputerUseExposure>
  classifyModel: (input: { providerID?: string; modelID?: string }) => ModelLocality
  supportsNativeComputerUse: (input: { providerID?: string; modelID?: string }) => boolean
}

export type ProviderComputerUseContext = {
  sessionID: string
  messageID: string
  callID?: string
  providerID?: string
  modelID?: string
  agent: string
  directory: string
  worktree: string
  abort: AbortSignal
}

export function createProviderComputerUseAdapter(input: ProviderComputerUseAdapterInput) {
  return {
    async shouldAdvertise(model: { providerID?: string; modelID?: string }) {
      if (Flag.INTERBASE_PURE) return false
      const exposure = await input.getExposure()
      const plausibleBackend = exposure.backend === "native"
      return exposure.enabled && exposure.exposeTools && plausibleBackend && input.supportsNativeComputerUse(model)
    },
    async observe(args: Parameters<ComputerUseHost["observe"]>[0], context: ProviderComputerUseContext): Promise<ComputerUseToolResult> {
      return input.runtime.runPromise(input.host.observe(args, toComputerUseContext(input, context)))
    },
    async deny(reason: string): Promise<ComputerUseToolResult> {
      return {
        output: `computer-use provider request denied: ${reason}`,
        metadata: { decision: "denied", reason, truncated: false },
      }
    },
  }
}

export function providerComputerUseToolCall(item: ProviderComputerCallItem) {
  return {
    type: "tool-call" as const,
    toolCallId: item.id,
    toolName: providerComputerUseToolName,
    input: "",
    providerExecuted: true,
  }
}

export function providerComputerUseToolResult(item: ProviderComputerCallItem) {
  return {
    type: "tool-result" as const,
    toolCallId: item.id,
    toolName: providerComputerUseToolName,
    result: providerComputerUseResultPayload(item),
  }
}

export function providerComputerUseResultPayload(item: ProviderComputerCallItem) {
  return {
    type: "computer_use_tool_result" as const,
    status: item.status || "completed",
  }
}

export function providerComputerUseToolInputStart(item: ProviderComputerCallItem) {
  return {
    type: "tool-input-start" as const,
    id: item.id,
    toolName: providerComputerUseToolName,
  }
}

export function providerComputerUseToolInputEnd(item: ProviderComputerCallItem) {
  return {
    type: "tool-input-end" as const,
    id: item.id,
  }
}

export function providerComputerUsePreviewTool(args: ProviderComputerUsePreviewArgs = {}) {
  return {
    type: "computer_use_preview" as const,
    display_width: args.displayWidth,
    display_height: args.displayHeight,
    environment: args.environment,
  }
}

function toComputerUseContext(input: ProviderComputerUseAdapterInput, context: ProviderComputerUseContext) {
  return {
    ...context,
    modelLocality: input.classifyModel({ providerID: context.providerID, modelID: context.modelID }),
    metadata: () => undefined,
    ask: () => Promise.reject(new Error("permission_denied")) as never,
  }
}

export * as ComputerUseProviderAdapter from "./provider-adapter"
