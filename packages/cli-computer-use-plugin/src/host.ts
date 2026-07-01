import type { Effect } from "effect"
import type { ToolContext } from "@interbase/plugin"
import type { ActArgs, ObserveArgs, WaitForArgs } from "./schemas.js"

export type ModelLocality = "local" | "remote"

export type ComputerUseToolMetadata = {
  decision: "allowed" | "denied"
  reason: string
  [key: string]: unknown
}

export type ComputerUseToolResult = {
  output: string
  metadata: ComputerUseToolMetadata
}

export type ComputerUseContext = ToolContext & {
  modelLocality: ModelLocality
}

export type ComputerUseExposure = {
  enabled: boolean
  exposeTools: boolean
  backend: "native"
  reason?: string
}

export type ReadArtifactInput = {
  artifactId: string
  sessionID: string
  purpose: "provider_attachment" | "preview" | "debug"
  modelLocality: ModelLocality
}

export type ReadArtifactResult = {
  mimeType: string
  bytes: Uint8Array
  cacheControl: "no-store"
  metadata: Record<string, unknown>
}

export interface ComputerUseHost {
  observe(input: ObserveArgs, context: ComputerUseContext): Effect.Effect<ComputerUseToolResult, never, any>
  act(input: ActArgs, context: ComputerUseContext): Effect.Effect<ComputerUseToolResult, never, any>
  waitFor(input: WaitForArgs, context: ComputerUseContext): Effect.Effect<ComputerUseToolResult, never, any>
  status(input: Record<string, never>, context: ComputerUseContext): Effect.Effect<ComputerUseToolResult, never, any>
  readArtifact(input: ReadArtifactInput, context: ComputerUseContext): Effect.Effect<ReadArtifactResult, never, any>
}

export type ComputerUseRuntime = {
  runPromise<A, E, R>(effect: Effect.Effect<A, E, R>): Promise<A>
}
