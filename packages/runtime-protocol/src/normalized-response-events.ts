import type { ProviderId } from "./provider.js"

export const normalizedResponseEventSchemaVersion = 1 as const

export const normalizedResponseEventTypeValues = [
  "run.started",
  "response.started",
  "response.output_text.delta",
  "response.output_text.completed",
  "response.reasoning.delta",
  "response.reasoning.completed",
  "response.output_structured.completed",
  "tool.requested",
  "tool.updated",
  "tool.completed",
  "tool.failed",
  "tool.cancelled",
  "provider.session.updated",
  "provider.usage.reported",
  "provider.metadata.attached",
  "response.completed",
  "response.failed",
  "response.cancelled",
  "run.completed",
  "run.failed",
  "run.cancelled",
] as const

export type NormalizedResponseEventType = (typeof normalizedResponseEventTypeValues)[number]

export const normalizedResponseFinishReasonValues = [
  "stop",
  "length",
  "tool_call",
  "cancelled",
  "error",
  "content_filter",
  "unknown",
] as const

export type NormalizedResponseFinishReason = (typeof normalizedResponseFinishReasonValues)[number]

export const normalizedResponseFailureClassValues = [
  "auth",
  "rate_limit",
  "transport",
  "timeout",
  "validation",
  "provider_internal",
  "tool_execution",
  "content_filter",
  "user_cancelled",
  "daemon_cancelled",
  "resource_exhausted",
  "unknown",
] as const

export type NormalizedResponseFailureClass = (typeof normalizedResponseFailureClassValues)[number]

export interface NormalizedResponseFailure {
  class: NormalizedResponseFailureClass
  debugMessage?: string | null
  message: string
  providerCode?: string | null
  recoverable: boolean
  retryable: boolean
}

export interface NormalizedResponseUsage {
  cachedInputTokens?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  providerUnits?: number | null
  reasoningTokens?: number | null
  toolInputTokens?: number | null
  toolOutputTokens?: number | null
  totalTokens?: number | null
}

export interface NormalizedResponseEventEnvelope {
  attempt: number
  causationId: string | null
  correlationId: string
  dedupeKey: string
  eventId: string
  eventType: NormalizedResponseEventType
  itemId: string | null
  model: string | null
  originResponseId: string | null
  providerId: ProviderId
  providerMetadataRef: string | null
  responseId: string | null
  runId: string
  schemaVersion: typeof normalizedResponseEventSchemaVersion
  sequence: number
  sessionId: string
  timestamp: string
  type?: never
}

export interface RunStartedPayload {
  capabilitySnapshot: Record<string, unknown>
  inputSummaryRef: string | null
  runKind: "interactive_foreground"
  supersedesRunId: string | null
}

export interface ResponseStartedPayload {
  providerRequestRef: string | null
  responseMode: "non_streaming" | "streaming"
  resumedFromResponseId: string | null
}

export interface TextDeltaPayload {
  contentType: "text/markdown" | "text/plain"
  deltaIndex: number
  presentation: "durable_candidate" | "transient"
  text: string
}

export interface TextCompletedPayload {
  contentType: "text/markdown" | "text/plain"
  text: string
}

export interface ReasoningDeltaPayload {
  deltaIndex: number
  text: string
}

export interface ReasoningCompletedPayload {
  text: string
}

export interface StructuredOutputCompletedPayload {
  contentType: string
  output: unknown
}

export interface ToolRequestedPayload {
  inputRef: string | null
  server: string | null
  tool: string | null
  toolKind: string
}

export interface ToolUpdatedPayload {
  detail: string | null
  outputRef: string | null
}

export interface ToolTerminalPayload {
  failure?: NormalizedResponseFailure | null
  outputRef: string | null
}

export interface ProviderSessionUpdatedPayload {
  continuationId: string
  continuationKind: "conversation" | "opaque" | "session"
  reason: string
}

export interface ProviderUsageReportedPayload {
  usage: NormalizedResponseUsage
}

export interface ProviderMetadataAttachedPayload {
  classification: "diagnostic" | "public"
  metadataRef: string
}

export interface ResponseCompletedPayload {
  finishReason: NormalizedResponseFinishReason
}

export interface ResponseFailedPayload {
  failure: NormalizedResponseFailure
}

export interface ResponseCancelledPayload {
  reason:
    | "daemon_shutdown"
    | "provider_session_lost"
    | "resource_exhausted"
    | "superseded_by_new_run"
    | "user_cancelled"
}

export interface RunCompletedPayload {
  durableMessageIds: string[]
}

export interface RunFailedPayload {
  failure: NormalizedResponseFailure
}

export interface RunCancelledPayload {
  reason:
    | "daemon_shutdown"
    | "provider_session_lost"
    | "resource_exhausted"
    | "superseded_by_new_run"
    | "user_cancelled"
}

export type NormalizedResponseEvent =
  | (NormalizedResponseEventEnvelope & { eventType: "run.started"; payload: RunStartedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "response.started"; payload: ResponseStartedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "response.output_text.delta"; payload: TextDeltaPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "response.output_text.completed"; payload: TextCompletedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "response.reasoning.delta"; payload: ReasoningDeltaPayload })
  | (NormalizedResponseEventEnvelope & {
      eventType: "response.reasoning.completed"
      payload: ReasoningCompletedPayload
    })
  | (NormalizedResponseEventEnvelope & {
      eventType: "response.output_structured.completed"
      payload: StructuredOutputCompletedPayload
    })
  | (NormalizedResponseEventEnvelope & { eventType: "tool.requested"; payload: ToolRequestedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "tool.updated"; payload: ToolUpdatedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "tool.completed"; payload: ToolTerminalPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "tool.failed"; payload: ToolTerminalPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "tool.cancelled"; payload: ToolTerminalPayload })
  | (NormalizedResponseEventEnvelope & {
      eventType: "provider.session.updated"
      payload: ProviderSessionUpdatedPayload
    })
  | (NormalizedResponseEventEnvelope & { eventType: "provider.usage.reported"; payload: ProviderUsageReportedPayload })
  | (NormalizedResponseEventEnvelope & {
      eventType: "provider.metadata.attached"
      payload: ProviderMetadataAttachedPayload
    })
  | (NormalizedResponseEventEnvelope & { eventType: "response.completed"; payload: ResponseCompletedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "response.failed"; payload: ResponseFailedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "response.cancelled"; payload: ResponseCancelledPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "run.completed"; payload: RunCompletedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "run.failed"; payload: RunFailedPayload })
  | (NormalizedResponseEventEnvelope & { eventType: "run.cancelled"; payload: RunCancelledPayload })

export type NormalizedResponseValidationResult = { ok: true } | { message: string; ok: false }

export interface NormalizedResponseLifecycleState {
  responses?: Record<string, "cancelled" | "completed" | "failed" | "started">
  run?: "cancelled" | "completed" | "failed" | "started"
  textItems?: Record<string, "completed" | "started">
  reasoningItems?: Record<string, "completed" | "started">
  structuredOutputItems?: Record<string, "completed">
  toolItems?: Record<string, "cancelled" | "completed" | "failed" | "requested">
}

export function isNormalizedResponseEventType(value: string): value is NormalizedResponseEventType {
  return (normalizedResponseEventTypeValues as readonly string[]).includes(value)
}

export function isNormalizedResponseEvent(value: unknown): value is NormalizedResponseEvent {
  if (!value || typeof value !== "object") {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.eventId === "string" &&
    typeof record.eventType === "string" &&
    isNormalizedResponseEventType(record.eventType) &&
    record.schemaVersion === normalizedResponseEventSchemaVersion &&
    typeof record.sequence === "number" &&
    typeof record.sessionId === "string" &&
    typeof record.runId === "string" &&
    typeof record.dedupeKey === "string" &&
    typeof record.payload === "object" &&
    record.payload !== null
  )
}

export function shouldIgnoreUnknownNormalizedResponseEvent(value: unknown) {
  if (!value || typeof value !== "object") {
    return true
  }
  const eventType = (value as { eventType?: unknown }).eventType
  return typeof eventType !== "string" || !isNormalizedResponseEventType(eventType)
}

export function validateNormalizedResponseTransition(
  state: NormalizedResponseLifecycleState,
  event: NormalizedResponseEvent,
): NormalizedResponseValidationResult {
  const runState = state.run
  if (runState === "cancelled" || runState === "completed" || runState === "failed") {
    return { message: `Run ${event.runId} is terminal.`, ok: false }
  }

  const responseId = event.responseId
  const itemId = event.itemId
  const responses = state.responses ?? {}
  const textItems = state.textItems ?? {}
  const reasoningItems = state.reasoningItems ?? {}
  const toolItems = state.toolItems ?? {}
  const structuredOutputItems = state.structuredOutputItems ?? {}

  switch (event.eventType) {
    case "run.started":
      return runState ? { message: `Run ${event.runId} already started.`, ok: false } : { ok: true }
    case "response.started":
      if (!responseId) {
        return { message: "response.started requires responseId.", ok: false }
      }
      return responses[responseId] ? { message: `Response ${responseId} already exists.`, ok: false } : { ok: true }
    case "response.output_text.delta":
      if (!responseId || responses[responseId] !== "started") {
        return { message: "Text delta requires a started response.", ok: false }
      }
      if (!itemId) {
        return { message: "Text delta requires itemId.", ok: false }
      }
      if (textItems[itemId] === "completed") {
        return { message: `Text item ${itemId} is terminal.`, ok: false }
      }
      return event.payload.text.length > 0 ? { ok: true } : { message: "Text delta must not be empty.", ok: false }
    case "response.output_text.completed":
      if (!responseId || responses[responseId] !== "started") {
        return { message: "Text completion requires a started response.", ok: false }
      }
      if (!itemId) {
        return { message: "Text completion requires itemId.", ok: false }
      }
      return textItems[itemId] === "completed"
        ? { message: `Text item ${itemId} is already completed.`, ok: false }
        : { ok: true }
    case "response.reasoning.delta":
      if (!responseId || responses[responseId] !== "started") {
        return { message: "Reasoning delta requires a started response.", ok: false }
      }
      if (!itemId) {
        return { message: "Reasoning delta requires itemId.", ok: false }
      }
      if (reasoningItems[itemId] === "completed") {
        return { message: `Reasoning item ${itemId} is terminal.`, ok: false }
      }
      return event.payload.text.length > 0 ? { ok: true } : { message: "Reasoning delta must not be empty.", ok: false }
    case "response.reasoning.completed":
      if (!responseId || responses[responseId] !== "started") {
        return { message: "Reasoning completion requires a started response.", ok: false }
      }
      if (!itemId) {
        return { message: "Reasoning completion requires itemId.", ok: false }
      }
      return reasoningItems[itemId] === "completed"
        ? { message: `Reasoning item ${itemId} is already completed.`, ok: false }
        : { ok: true }
    case "response.output_structured.completed":
      if (!responseId || responses[responseId] !== "started") {
        return { message: "Structured output requires a started response.", ok: false }
      }
      if (!itemId) {
        return { message: "Structured output requires itemId.", ok: false }
      }
      return structuredOutputItems[itemId]
        ? { message: `Structured output item ${itemId} is already completed.`, ok: false }
        : { ok: true }
    case "tool.requested":
      if (!itemId) {
        return { message: "Tool request requires itemId.", ok: false }
      }
      return toolItems[itemId] ? { message: `Tool item ${itemId} already exists.`, ok: false } : { ok: true }
    case "tool.updated":
      if (!itemId || toolItems[itemId] !== "requested") {
        return { message: "Tool update requires a requested tool item.", ok: false }
      }
      return { ok: true }
    case "tool.completed":
    case "tool.failed":
    case "tool.cancelled":
      if (!itemId || toolItems[itemId] !== "requested") {
        return { message: "Tool terminal event requires a requested tool item.", ok: false }
      }
      return { ok: true }
    case "response.completed":
    case "response.failed":
    case "response.cancelled":
      if (!responseId || responses[responseId] !== "started") {
        return { message: "Response terminal event requires a started response.", ok: false }
      }
      return { ok: true }
    case "run.completed":
    case "run.failed":
    case "run.cancelled":
      return runState === "started"
        ? { ok: true }
        : { message: "Run terminal event requires a started run.", ok: false }
    case "provider.session.updated":
    case "provider.usage.reported":
    case "provider.metadata.attached":
      return { ok: true }
  }
}

export function applyNormalizedResponseTransition(
  state: NormalizedResponseLifecycleState,
  event: NormalizedResponseEvent,
): NormalizedResponseLifecycleState {
  const next: NormalizedResponseLifecycleState = {
    responses: { ...(state.responses ?? {}) },
    run: state.run,
    textItems: { ...(state.textItems ?? {}) },
    reasoningItems: { ...(state.reasoningItems ?? {}) },
    structuredOutputItems: { ...(state.structuredOutputItems ?? {}) },
    toolItems: { ...(state.toolItems ?? {}) },
  }
  switch (event.eventType) {
    case "run.started":
      next.run = "started"
      break
    case "run.completed":
      next.run = "completed"
      break
    case "run.failed":
      next.run = "failed"
      break
    case "run.cancelled":
      next.run = "cancelled"
      break
    case "response.started":
      next.responses![event.responseId!] = "started"
      break
    case "response.completed":
      next.responses![event.responseId!] = "completed"
      break
    case "response.failed":
      next.responses![event.responseId!] = "failed"
      break
    case "response.cancelled":
      next.responses![event.responseId!] = "cancelled"
      break
    case "response.output_text.delta":
      next.textItems![event.itemId!] = "started"
      break
    case "response.output_text.completed":
      next.textItems![event.itemId!] = "completed"
      break
    case "response.reasoning.delta":
      next.reasoningItems![event.itemId!] = "started"
      break
    case "response.reasoning.completed":
      next.reasoningItems![event.itemId!] = "completed"
      break
    case "response.output_structured.completed":
      next.structuredOutputItems![event.itemId!] = "completed"
      break
    case "tool.requested":
    case "tool.updated":
      next.toolItems![event.itemId!] = "requested"
      break
    case "tool.completed":
      next.toolItems![event.itemId!] = "completed"
      break
    case "tool.failed":
      next.toolItems![event.itemId!] = "failed"
      break
    case "tool.cancelled":
      next.toolItems![event.itemId!] = "cancelled"
      break
  }
  return next
}
