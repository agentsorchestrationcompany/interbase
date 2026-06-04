import type { RuntimeErrorCode } from "./errors.js"
import type {
  RuntimeMessage,
  RuntimeRequestKind,
  RuntimeRunSummary,
  RuntimeSessionSummary,
  SessionStatus,
} from "./session.js"
import type { NormalizedResponseEvent } from "./normalized-response-events.js"

export type RuntimeOutputChannel = "assistant" | "info" | "stderr"

export interface SessionCreatedEvent {
  type: "session.created"
  session: RuntimeSessionSummary
}

export interface SessionUpdatedEvent {
  type: "session.updated"
  reason: string | null
  session: RuntimeSessionSummary
}

export interface SessionStateEvent {
  type: "session.state"
  reason: string | null
  status: SessionStatus
}

export interface SessionMessageEvent {
  type: "session.message"
  message: RuntimeMessage
}

export interface SessionRunStartedEvent {
  type: "session.run.started"
  run: RuntimeRunSummary
}

export interface SessionOutputEvent {
  type: "session.output"
  channel: RuntimeOutputChannel
  chunk: string
  runId: string
}

export interface SessionRunCompletedEvent {
  type: "session.run.completed"
  run: RuntimeRunSummary
}

export interface SessionErrorEvent {
  type: "session.error"
  code: RuntimeErrorCode
  message: string
  recoverable: boolean
  runId: string | null
}

export interface PolicyRequirementsEvent {
  type: "policy.requirements"
  decisions: string[]
  orchestrationId: string
  requestKind: RuntimeRequestKind
  requiredServer: string | null
  runId: string
}

export interface PolicyBlockedEvent {
  type: "policy.blocked"
  blockingDecision: string
  orchestrationId: string
  reason: string
  requestKind: RuntimeRequestKind
  runId: string
}

export interface McpPreludeStartedEvent {
  type: "mcp.prelude.started"
  orchestrationId: string
  requiredServer: string | null
  requirement: string
  runId: string
}

export interface McpPreludeCompletedEvent {
  type: "mcp.prelude.completed"
  orchestrationId: string
  requiredServer: string | null
  requirement: string
  runId: string
}

export interface ToolRequestedEvent {
  type: "tool.requested"
  authority?: ToolEventAuthority
  itemId: string
  detail: string
  orchestrationId: string
  resultSummary?: string | null
  runId: string
  server?: string | null
  tool?: string | null
  toolKind: string
}

export interface ToolDeniedEvent {
  type: "tool.denied"
  authority?: ToolEventAuthority
  itemId: string
  orchestrationId: string
  reason: string
  runId: string
  server?: string | null
  tool?: string | null
}

export interface ToolEventAuthority {
  sessionId: string
  runId: string
  threadId: string | null
  itemId: string
}

export interface ToolUpdatedEvent {
  type: "tool.updated"
  authority?: ToolEventAuthority
  itemId: string
  detail: string
  orchestrationId: string
  resultSummary?: string | null
  runId: string
  server?: string | null
  tool?: string | null
  toolKind: string
}

export interface ToolCompletedEvent {
  type: "tool.completed"
  authority?: ToolEventAuthority
  itemId: string
  detail: string
  orchestrationId: string
  resultSummary?: string | null
  runId: string
  server?: string | null
  tool?: string | null
  toolKind: string
}

export interface SessionRecoveryEvent {
  type: "session.recovery"
  summary: string
}

export type RuntimeEvent =
  | SessionCreatedEvent
  | SessionUpdatedEvent
  | SessionStateEvent
  | SessionMessageEvent
  | SessionRunStartedEvent
  | SessionOutputEvent
  | SessionRunCompletedEvent
  | SessionErrorEvent
  | PolicyRequirementsEvent
  | PolicyBlockedEvent
  | McpPreludeStartedEvent
  | McpPreludeCompletedEvent
  | ToolRequestedEvent
  | ToolDeniedEvent
  | ToolUpdatedEvent
  | ToolCompletedEvent
  | SessionRecoveryEvent
  | NormalizedResponseEvent

export interface RuntimeEventEnvelope<TEvent extends RuntimeEvent = RuntimeEvent> {
  event: TEvent
  sequence: number
  sessionId: string
  timestamp: string
}

export interface WaitForEventsResponse {
  events: RuntimeEventEnvelope[]
  nextSequence: number
}
