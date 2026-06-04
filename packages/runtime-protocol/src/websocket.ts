import type {
  CloseSessionResponse,
  CreateSessionInput,
  SendSessionMessageInput,
  UpdateSessionInput,
} from "./session.js"
import { runtimeApprovalPolicyValues, runtimeSandboxModeValues } from "./session.js"
import type { RuntimeErrorCode } from "./errors.js"
import type { RuntimeEventEnvelope } from "./events.js"
import type { ProviderId } from "./provider.js"
import type { RuntimeThreadRef } from "./thread.js"
import { runtimeApiVersion, type PrepareNativeShellInput } from "./commands.js"
import { normalizedResponseEventTypeValues } from "./normalized-response-events.js"

export const runtimeWebSocketProtocolVersion = runtimeApiVersion
export const previousRuntimeWebSocketProtocolVersion = "0.1.5"
export const supportedRuntimeWebSocketProtocolVersions = [
  previousRuntimeWebSocketProtocolVersion,
  runtimeWebSocketProtocolVersion,
] as const

export const runtimeWebSocketClientMethodValues = [
  "initialize",
  "ping",
  "agent.list",
  "provider.list",
  "provider.models",
  "providerModel.command",
  "config/bootstrapCodexHome",
  "account.read",
  "account.login.start",
  "account.login.cancel",
  "account.rateLimits.read",
  "approval.resolve",
  "providerChild.serverRequest.respond",
  "skills.list",
  "plugin.list",
  "mcpServerStatus/list",
  "session.create",
  "session.read",
  "session.update",
  "session.message",
  "session.close",
  "nativeShell.prepare",
  "thread.start",
  "thread.read",
  "thread.resume",
  "thread.fork",
  "thread.rollback",
  "thread.shellCommand",
  "thread.backgroundTerminals.clean",
  "thread.list",
  "turn.start",
  "turn.interrupt",
  "turn.steer",
  "shutdown",
  "subscribe",
  "unsubscribe",
  "resume",
] as const

export type RuntimeWebSocketClientMethod = (typeof runtimeWebSocketClientMethodValues)[number]

export function isRuntimeWebSocketClientMethod(value: string): value is RuntimeWebSocketClientMethod {
  return runtimeWebSocketClientMethodValues.includes(value as RuntimeWebSocketClientMethod)
}

export interface RuntimeWebSocketClientEnvelope<
  TMethod extends RuntimeWebSocketClientMethod = RuntimeWebSocketClientMethod,
  TPayload = unknown,
> {
  method: TMethod
  payload: TPayload
  protocolVersion: string
  requestId: string
}

export interface RuntimeWebSocketInitializePayload {
  clientName: string
  clientVersion: string
  supportedRuntimeApiVersion: string
  supportedRuntimeApiVersions?: string[]
}

export interface RuntimeWebSocketPingPayload {
  message: string
}

export interface RuntimeWebSocketInitializeResponse {
  acceptedRuntimeApiVersion: string
  capabilities: string[]
  protocolVersion: string
  serverName: string
  serverVersion: string
}

export interface RuntimeWebSocketAgentCapabilitySet {
  approvals: boolean
  attachments: boolean
  conversationHistoryReadable: boolean
  images: boolean
  modelSelection: boolean
  nativeExecution: boolean
  resume: boolean
  sessionContinuation: boolean
  streaming: boolean
  toolUse: boolean
}

export interface RuntimeWebSocketAgentModelOption {
  available: boolean
  displayName: string
  id: string
  providerId: string
  providerName: string
  unavailableReason: string | null
}

export interface RuntimeWebSocketAgentAvailability {
  agentId: string
  available: boolean
  capabilities: RuntimeWebSocketAgentCapabilitySet
  displayName: string
  models: RuntimeWebSocketAgentModelOption[]
  unavailableReason: string | null
}

export interface RuntimeWebSocketAgentListResponse {
  agents: RuntimeWebSocketAgentAvailability[]
}

export interface RuntimeWebSocketPingResponse {
  message: string
  timestamp: string
}

export const runtimeWebSocketMetadataResponseShapes = {
  initialize: {
    fields: ["acceptedRuntimeApiVersion", "capabilities", "protocolVersion", "serverName", "serverVersion"],
  },
  ping: {
    fields: ["message", "timestamp"],
  },
} as const

export interface RuntimeWebSocketProviderModelsPayload {
  providerId: ProviderId
}

export const runtimeWebSocketProviderModelCommandTypeValues = [
  "model.current",
  "model.list",
  "model.set",
  "provider.current",
  "provider.list",
  "provider.set",
] as const

export type RuntimeWebSocketProviderModelCommandType = (typeof runtimeWebSocketProviderModelCommandTypeValues)[number]

export type RuntimeWebSocketProviderModelCommand =
  | { type: "model.current" }
  | { type: "model.list" }
  | { model: string; type: "model.set" }
  | { type: "provider.current" }
  | { type: "provider.list" }
  | { providerId: string; type: "provider.set" }

export interface RuntimeWebSocketProviderModelCommandPayload {
  command: RuntimeWebSocketProviderModelCommand
  prompt: string
  sessionId: string
}

export interface RuntimeWebSocketConfigBootstrapCodexHomePayload {
  interbase_home: string
  workspace_root: string
}

export interface RuntimeWebSocketAccountReadPayload {
  interbaseHome?: string | null
}

export interface RuntimeWebSocketAccountLoginStartPayload {
  apiKey?: string | null
  interbaseHome?: string | null
  providerId?: ProviderId | null
  type: string
}

export interface RuntimeWebSocketAccountLoginCancelPayload {
  loginId?: string | null
}

export interface RuntimeWebSocketSkillsListPayload {
  cwds?: string[]
}

export interface RuntimeWebSocketMcpServerStatusListPayload {
  cursor?: string | null
  detail?: "full" | "toolsAndAuthOnly" | null
  limit?: number | null
}

export type RuntimeMcpAuthStatus = "unsupported" | "notLoggedIn" | "bearerToken" | "oauth"

export interface RuntimeMcpResource {
  name: string
  title?: string | null
  uri: string
}

export interface RuntimeMcpResourceTemplate {
  name: string
  title?: string | null
  uriTemplate: string
}

export interface RuntimeMcpServerStatus {
  authStatus: RuntimeMcpAuthStatus
  name: string
  resourceTemplates: RuntimeMcpResourceTemplate[]
  resources: RuntimeMcpResource[]
  tools: Record<string, unknown>
}

export interface RuntimeMcpServerStatusListResponse {
  data: RuntimeMcpServerStatus[]
  nextCursor?: string | null
}

export interface RuntimeWebSocketSessionUpdatePayload {
  input: UpdateSessionInput
  sessionId: string
}

export interface RuntimeWebSocketSessionReadPayload {
  sessionId: string
}

export interface RuntimeWebSocketSessionMessagePayload {
  input: SendSessionMessageInput
  sessionId: string
}

export interface RuntimeWebSocketSessionClosePayload {
  sessionId: string
}

export interface RuntimeWebSocketNativeShellPreparePayload {
  input: PrepareNativeShellInput
  sessionId: string
}

export interface RuntimeWebSocketThreadStartPayload {
  approvalPolicy?: string | null
  cwd?: string | null
  model?: string | null
  modelProvider?: string | null
  sandbox?: string | null
}

export interface RuntimeWebSocketThreadReadPayload {
  includeTurns?: boolean
  threadId: string
}

export interface RuntimeWebSocketThreadResumePayload extends RuntimeWebSocketThreadStartPayload {
  persistExtendedHistory?: boolean
  threadId: string
}

export interface RuntimeWebSocketThreadForkPayload extends RuntimeWebSocketThreadResumePayload {
  ephemeral?: boolean
  path?: string | null
}

export interface RuntimeWebSocketThreadRollbackPayload {
  numTurns: number
  threadId: string
}

export interface RuntimeWebSocketThreadShellCommandPayload {
  approvalPolicy?: string | null
  args: string[]
  command: string
  cwd?: string | null
  environment?: Record<string, string>
  sandboxPolicy?: string | null
  sessionId?: string | null
  threadId: string
  turnId?: string | null
}

export interface RuntimeWebSocketThreadBackgroundTerminalsCleanPayload {
  threadId: string
}

export type RuntimeWebSocketApprovalDecision = "Approved" | "Rejected"

export interface RuntimeWebSocketApprovalResolvePayload {
  approvalId: string
  decision: RuntimeWebSocketApprovalDecision
}

export interface RuntimeWebSocketProviderChildServerRequestRespondPayload {
  requestId: string
  response: unknown
}

export interface RuntimeWebSocketTurnStartPayload {
  approvalPolicy?: string | null
  cwd?: string | null
  effort?: string | null
  input: string[]
  model?: string | null
  personality?: string | null
  sandboxPolicy?: string | null
  summary?: string | null
  threadId: string
}

export interface RuntimeWebSocketTurnInterruptPayload {
  threadId: string
  turnId: string
}

export interface RuntimeWebSocketTurnSteerPayload {
  expectedTurnId: string
  input: string[]
  threadId: string
}

export interface RuntimeWebSocketSubscriptionPayload {
  afterSequence?: number
  sessionId?: string
  threadId?: string
}

export interface RuntimeWebSocketProviderThreadSubscriptionPayload {
  afterSequence?: number
  threadRef: RuntimeThreadRef
}

export type RuntimeWebSocketSubscriptionTarget =
  | RuntimeWebSocketSubscriptionPayload
  | RuntimeWebSocketProviderThreadSubscriptionPayload

export type RuntimeWebSocketResumePayload = RuntimeWebSocketSubscriptionTarget & {
  clientId?: string
}

export interface RuntimeWebSocketReplayPayload {
  events: RuntimeWebSocketEventFrame[]
  nextSequence: number
  replayedCount: number
}

export interface RuntimeWebSocketReplayUnavailablePayload {
  afterSequence: number
  reason: string
  recoverable: false
  subscription: RuntimeWebSocketSubscriptionTarget
}

export type RuntimeWebSocketClientCommand =
  | RuntimeWebSocketClientEnvelope<"initialize", RuntimeWebSocketInitializePayload>
  | RuntimeWebSocketClientEnvelope<"ping", RuntimeWebSocketPingPayload>
  | RuntimeWebSocketClientEnvelope<"agent.list", Record<string, never>>
  | RuntimeWebSocketClientEnvelope<"provider.list", Record<string, never>>
  | RuntimeWebSocketClientEnvelope<"provider.models", RuntimeWebSocketProviderModelsPayload>
  | RuntimeWebSocketClientEnvelope<"providerModel.command", RuntimeWebSocketProviderModelCommandPayload>
  | RuntimeWebSocketClientEnvelope<"config/bootstrapCodexHome", RuntimeWebSocketConfigBootstrapCodexHomePayload>
  | RuntimeWebSocketClientEnvelope<"account.read", RuntimeWebSocketAccountReadPayload>
  | RuntimeWebSocketClientEnvelope<"account.login.start", RuntimeWebSocketAccountLoginStartPayload>
  | RuntimeWebSocketClientEnvelope<"account.login.cancel", RuntimeWebSocketAccountLoginCancelPayload>
  | RuntimeWebSocketClientEnvelope<"account.rateLimits.read", Record<string, never>>
  | RuntimeWebSocketClientEnvelope<"approval.resolve", RuntimeWebSocketApprovalResolvePayload>
  | RuntimeWebSocketClientEnvelope<
      "providerChild.serverRequest.respond",
      RuntimeWebSocketProviderChildServerRequestRespondPayload
    >
  | RuntimeWebSocketClientEnvelope<"skills.list", RuntimeWebSocketSkillsListPayload>
  | RuntimeWebSocketClientEnvelope<"plugin.list", Record<string, never>>
  | RuntimeWebSocketClientEnvelope<"mcpServerStatus/list", RuntimeWebSocketMcpServerStatusListPayload>
  | RuntimeWebSocketClientEnvelope<"session.create", CreateSessionInput>
  | RuntimeWebSocketClientEnvelope<"session.read", RuntimeWebSocketSessionReadPayload>
  | RuntimeWebSocketClientEnvelope<"session.update", RuntimeWebSocketSessionUpdatePayload>
  | RuntimeWebSocketClientEnvelope<"session.message", RuntimeWebSocketSessionMessagePayload>
  | RuntimeWebSocketClientEnvelope<"session.close", RuntimeWebSocketSessionClosePayload>
  | RuntimeWebSocketClientEnvelope<"nativeShell.prepare", RuntimeWebSocketNativeShellPreparePayload>
  | RuntimeWebSocketClientEnvelope<"thread.start", RuntimeWebSocketThreadStartPayload>
  | RuntimeWebSocketClientEnvelope<"thread.read", RuntimeWebSocketThreadReadPayload>
  | RuntimeWebSocketClientEnvelope<"thread.resume", RuntimeWebSocketThreadResumePayload>
  | RuntimeWebSocketClientEnvelope<"thread.fork", RuntimeWebSocketThreadForkPayload>
  | RuntimeWebSocketClientEnvelope<"thread.rollback", RuntimeWebSocketThreadRollbackPayload>
  | RuntimeWebSocketClientEnvelope<"thread.shellCommand", RuntimeWebSocketThreadShellCommandPayload>
  | RuntimeWebSocketClientEnvelope<
      "thread.backgroundTerminals.clean",
      RuntimeWebSocketThreadBackgroundTerminalsCleanPayload
    >
  | RuntimeWebSocketClientEnvelope<"thread.list", Record<string, never>>
  | RuntimeWebSocketClientEnvelope<"turn.start", RuntimeWebSocketTurnStartPayload>
  | RuntimeWebSocketClientEnvelope<"turn.interrupt", RuntimeWebSocketTurnInterruptPayload>
  | RuntimeWebSocketClientEnvelope<"turn.steer", RuntimeWebSocketTurnSteerPayload>
  | RuntimeWebSocketClientEnvelope<"shutdown", Record<string, never>>
  | RuntimeWebSocketClientEnvelope<"subscribe", RuntimeWebSocketSubscriptionTarget>
  | RuntimeWebSocketClientEnvelope<"unsubscribe", RuntimeWebSocketSubscriptionTarget>
  | RuntimeWebSocketClientEnvelope<"resume", RuntimeWebSocketResumePayload>

export function isRuntimeWebSocketClientCommand(value: unknown): value is RuntimeWebSocketClientCommand {
  if (!isRecord(value)) {
    return false
  }
  if (typeof value.requestId !== "string" || value.requestId.length === 0) {
    return false
  }
  if (typeof value.protocolVersion !== "string" || !isRuntimeWebSocketProtocolVersionSupported(value.protocolVersion)) {
    return false
  }
  if (typeof value.method !== "string" || !isRuntimeWebSocketClientMethod(value.method)) {
    return false
  }
  if (!isRecord(value.payload)) {
    return false
  }
  if (value.method === "initialize") {
    const payload = value.payload
    return (
      typeof payload.clientName === "string" &&
      payload.clientName.length > 0 &&
      typeof payload.clientVersion === "string" &&
      payload.clientVersion.length > 0 &&
      typeof payload.supportedRuntimeApiVersion === "string" &&
      payload.supportedRuntimeApiVersion.length > 0 &&
      (payload.supportedRuntimeApiVersions === undefined ||
        (Array.isArray(payload.supportedRuntimeApiVersions) &&
          payload.supportedRuntimeApiVersions.every((version) => typeof version === "string" && version.length > 0)))
    )
  }
  if (value.method === "ping") {
    return typeof value.payload.message === "string"
  }
  if (
    value.method === "provider.list" ||
    value.method === "agent.list" ||
    value.method === "account.rateLimits.read" ||
    value.method === "plugin.list" ||
    value.method === "thread.list" ||
    value.method === "shutdown"
  ) {
    return Object.keys(value.payload).length === 0
  }
  if (value.method === "provider.models") {
    return isNonEmptyString(value.payload.providerId)
  }
  if (value.method === "providerModel.command") {
    const payload = value.payload
    return isProviderModelCommandPayload(payload)
  }
  if (value.method === "config/bootstrapCodexHome") {
    return isNonEmptyString(value.payload.interbase_home) && isNonEmptyString(value.payload.workspace_root)
  }
  if (value.method === "account.read") {
    return isOptionalStringOrNull(value.payload.interbaseHome)
  }
  if (value.method === "account.login.start") {
    return (
      isNonEmptyString(value.payload.type) &&
      isOptionalStringOrNull(value.payload.apiKey) &&
      isOptionalStringOrNull(value.payload.interbaseHome) &&
      isOptionalStringOrNull(value.payload.providerId)
    )
  }
  if (value.method === "account.login.cancel") {
    return isOptionalStringOrNull(value.payload.loginId)
  }
  if (value.method === "approval.resolve") {
    return (
      isNonEmptyString(value.payload.approvalId) &&
      (value.payload.decision === "Approved" || value.payload.decision === "Rejected")
    )
  }
  if (value.method === "providerChild.serverRequest.respond") {
    return isNonEmptyString(value.payload.requestId) && "response" in value.payload
  }
  if (value.method === "skills.list") {
    return value.payload.cwds === undefined || isStringArray(value.payload.cwds)
  }
  if (value.method === "mcpServerStatus/list") {
    return (
      isOptionalStringOrNull(value.payload.cursor) &&
      (value.payload.detail === undefined ||
        value.payload.detail === null ||
        value.payload.detail === "full" ||
        value.payload.detail === "toolsAndAuthOnly") &&
      isOptionalSafeIntegerOrNull(value.payload.limit)
    )
  }
  if (value.method === "session.create") {
    return isCreateSessionInput(value.payload)
  }
  if (value.method === "session.read" || value.method === "session.close") {
    return isNonEmptyString(value.payload.sessionId)
  }
  if (value.method === "session.update") {
    return (
      isNonEmptyString(value.payload.sessionId) &&
      isRecord(value.payload.input) &&
      isUpdateSessionInput(value.payload.input)
    )
  }
  if (value.method === "session.message") {
    return (
      isNonEmptyString(value.payload.sessionId) &&
      isRecord(value.payload.input) &&
      isSendSessionMessageInput(value.payload.input)
    )
  }
  if (value.method === "nativeShell.prepare") {
    return (
      isNonEmptyString(value.payload.sessionId) &&
      isRecord(value.payload.input) &&
      isOptionalString(value.payload.input.initialInput)
    )
  }
  if (value.method === "thread.start") {
    return isThreadStartPayload(value.payload)
  }
  if (value.method === "thread.read") {
    return (
      isNonEmptyString(value.payload.threadId) &&
      (value.payload.includeTurns === undefined || typeof value.payload.includeTurns === "boolean")
    )
  }
  if (value.method === "thread.resume") {
    return (
      isNonEmptyString(value.payload.threadId) &&
      isThreadStartPayload(value.payload) &&
      (value.payload.persistExtendedHistory === undefined || typeof value.payload.persistExtendedHistory === "boolean")
    )
  }
  if (value.method === "thread.fork") {
    return (
      isNonEmptyString(value.payload.threadId) &&
      isThreadStartPayload(value.payload) &&
      (value.payload.ephemeral === undefined || typeof value.payload.ephemeral === "boolean") &&
      isOptionalStringOrNull(value.payload.path)
    )
  }
  if (value.method === "thread.rollback") {
    return isNonEmptyString(value.payload.threadId) && isSafeNonNegativeInteger(value.payload.numTurns)
  }
  if (value.method === "thread.shellCommand") {
    return (
      isNonEmptyString(value.payload.threadId) &&
      isNonEmptyString(value.payload.command) &&
      isStringArray(value.payload.args) &&
      isOptionalStringOrNull(value.payload.approvalPolicy) &&
      isOptionalStringOrNull(value.payload.cwd) &&
      isOptionalStringOrNull(value.payload.sandboxPolicy) &&
      isOptionalStringOrNull(value.payload.sessionId) &&
      isOptionalStringOrNull(value.payload.turnId) &&
      (value.payload.environment === undefined || isRecordOfStrings(value.payload.environment))
    )
  }
  if (value.method === "thread.backgroundTerminals.clean") {
    return isNonEmptyString(value.payload.threadId)
  }
  if (value.method === "turn.start") {
    return (
      isNonEmptyString(value.payload.threadId) &&
      isStringArray(value.payload.input) &&
      isThreadStartPayload(value.payload) &&
      isOptionalStringOrNull(value.payload.effort) &&
      isOptionalStringOrNull(value.payload.personality) &&
      isOptionalStringOrNull(value.payload.summary)
    )
  }
  if (value.method === "turn.interrupt") {
    return isNonEmptyString(value.payload.threadId) && isNonEmptyString(value.payload.turnId)
  }
  if (value.method === "turn.steer") {
    return (
      isNonEmptyString(value.payload.threadId) &&
      isNonEmptyString(value.payload.expectedTurnId) &&
      isStringArray(value.payload.input)
    )
  }
  if (value.method === "subscribe" || value.method === "unsubscribe") {
    return isRuntimeWebSocketSubscriptionTarget(value.payload)
  }
  return isRuntimeWebSocketSubscriptionTarget(value.payload) && isOptionalString(value.payload.clientId)
}

function isProviderModelCommandPayload(payload: Record<string, unknown>) {
  if (
    !isRecord(payload.command) ||
    !isOptionalString(payload.prompt) ||
    !isOptionalString(payload.sessionId) ||
    typeof payload.command.type !== "string" ||
    !runtimeWebSocketProviderModelCommandTypeValues.includes(
      payload.command.type as RuntimeWebSocketProviderModelCommandType,
    )
  ) {
    return false
  }

  switch (payload.command.type) {
    case "model.set":
      return isNonEmptyString(payload.command.model)
    case "provider.set":
      return isNonEmptyString(payload.command.providerId)
    default:
      return true
  }
}

function isCreateSessionInput(payload: Record<string, unknown>) {
  return (
    isNonEmptyString(payload.providerId) &&
    isNonEmptyString(payload.workspaceRoot) &&
    isOptionalRuntimeExecutionMode(payload.executionMode) &&
    isOptionalString(payload.model) &&
    isOptionalBoolean(payload.trustModel) &&
    isOptionalStringOrNull(payload.reasoningEffort) &&
    isOptionalBooleanOrNull(payload.fastMode) &&
    isOptionalSandboxMode(payload.sandboxMode) &&
    isOptionalApprovalPolicy(payload.approvalPolicy) &&
    isOptionalStringOrNull(payload.permissionPresetId) &&
    isOptionalString(payload.title)
  )
}

function isUpdateSessionInput(payload: Record<string, unknown>) {
  return (
    isOptionalStringOrNull(payload.title) &&
    isOptionalString(payload.providerId) &&
    isOptionalStringOrNull(payload.model) &&
    isOptionalStringOrNull(payload.reasoningEffort) &&
    isOptionalBooleanOrNull(payload.fastMode) &&
    isOptionalSandboxMode(payload.sandboxMode) &&
    isOptionalApprovalPolicy(payload.approvalPolicy) &&
    isOptionalStringOrNull(payload.permissionPresetId)
  )
}

function isSendSessionMessageInput(payload: Record<string, unknown>) {
  return (
    typeof payload.content === "string" &&
    (payload.mode === undefined || payload.mode === "default" || payload.mode === "interrupt")
  )
}

function isThreadStartPayload(payload: Record<string, unknown>) {
  return (
    isOptionalStringOrNull(payload.approvalPolicy) &&
    isOptionalStringOrNull(payload.cwd) &&
    isOptionalStringOrNull(payload.model) &&
    isOptionalStringOrNull(payload.modelProvider) &&
    isOptionalStringOrNull(payload.sandbox) &&
    isOptionalStringOrNull(payload.sandboxPolicy)
  )
}

function isRuntimeWebSocketSubscriptionTarget(payload: Record<string, unknown>) {
  if (isRuntimeWebSocketProviderThreadSubscriptionPayload(payload)) {
    return true
  }

  return (
    isOptionalSafeIntegerOrNull(payload.afterSequence) &&
    (isNonEmptyString(payload.sessionId) || isNonEmptyString(payload.threadId))
  )
}

function isOptionalRuntimeExecutionMode(value: unknown) {
  return value === undefined || value === null || value === "managed" || value === "native"
}

function isOptionalSandboxMode(value: unknown) {
  return value === undefined || value === null || runtimeSandboxModeValues.includes(value as never)
}

function isOptionalApprovalPolicy(value: unknown) {
  return value === undefined || value === null || runtimeApprovalPolicyValues.includes(value as never)
}

function isOptionalBoolean(value: unknown) {
  return value === undefined || typeof value === "boolean"
}

function isOptionalBooleanOrNull(value: unknown) {
  return value === undefined || value === null || typeof value === "boolean"
}

function isOptionalString(value: unknown) {
  return value === undefined || typeof value === "string"
}

function isOptionalStringOrNull(value: unknown) {
  return value === undefined || value === null || typeof value === "string"
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string")
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string")
}

function isOptionalSafeIntegerOrNull(value: unknown) {
  return value === undefined || value === null || isSafeNonNegativeInteger(value)
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

export type RuntimeWebSocketSessionCloseResponse = CloseSessionResponse

export const runtimeWebSocketResponsePayloadKindValues = [
  "acknowledgement",
  "account",
  "credential",
  "metadata",
  "provider",
  "session",
  "thread",
  "turn",
  "replay",
  "shell",
  "unknown",
] as const

export type RuntimeWebSocketResponsePayloadKind = (typeof runtimeWebSocketResponsePayloadKindValues)[number]

export interface RuntimeWebSocketMethodResponseSchema {
  method: RuntimeWebSocketClientMethod
  payloadKind: RuntimeWebSocketResponsePayloadKind
  serverMessageTypes: readonly RuntimeWebSocketServerMessageType[]
}

export const runtimeWebSocketServerMessageTypeValues = [
  "response",
  "error",
  "event",
  "delivery",
  "serverRequest",
  "heartbeat",
  "protocolVersionMismatch",
] as const

export type RuntimeWebSocketServerMessageType = (typeof runtimeWebSocketServerMessageTypeValues)[number]

const runtimeWebSocketCommandResponseServerMessageTypes = [
  "response",
  "error",
  "heartbeat",
  "protocolVersionMismatch",
] as const satisfies readonly RuntimeWebSocketServerMessageType[]

const runtimeWebSocketResponsePayloadKindByMethod = {
  initialize: "metadata",
  ping: "acknowledgement",
  "agent.list": "metadata",
  "provider.list": "provider",
  "provider.models": "provider",
  "providerModel.command": "provider",
  "config/bootstrapCodexHome": "credential",
  "account.read": "account",
  "account.login.start": "credential",
  "account.login.cancel": "credential",
  "account.rateLimits.read": "account",
  "approval.resolve": "acknowledgement",
  "providerChild.serverRequest.respond": "acknowledgement",
  "skills.list": "metadata",
  "plugin.list": "metadata",
  "mcpServerStatus/list": "metadata",
  "session.create": "session",
  "session.read": "session",
  "session.update": "session",
  "session.message": "session",
  "session.close": "session",
  "nativeShell.prepare": "shell",
  "thread.start": "thread",
  "thread.read": "thread",
  "thread.resume": "thread",
  "thread.fork": "thread",
  "thread.rollback": "thread",
  "thread.shellCommand": "shell",
  "thread.backgroundTerminals.clean": "acknowledgement",
  "thread.list": "thread",
  "turn.start": "turn",
  "turn.interrupt": "turn",
  "turn.steer": "turn",
  shutdown: "acknowledgement",
  subscribe: "replay",
  unsubscribe: "acknowledgement",
  resume: "replay",
} as const satisfies Record<RuntimeWebSocketClientMethod, RuntimeWebSocketResponsePayloadKind>

const runtimeWebSocketResponseSchemaByMethod = runtimeWebSocketClientMethodValues.reduce(
  (schemas, method) => {
    schemas[method] = {
      method,
      payloadKind: runtimeWebSocketResponsePayloadKindByMethod[method],
      serverMessageTypes: runtimeWebSocketCommandResponseServerMessageTypes,
    }
    return schemas
  },
  {} as Record<RuntimeWebSocketClientMethod, RuntimeWebSocketMethodResponseSchema>,
)

export const runtimeWebSocketResponseSchemas = runtimeWebSocketClientMethodValues.map(
  (method) => runtimeWebSocketResponseSchemaByMethod[method],
)

export function runtimeWebSocketResponseSchemaForMethod(
  method: RuntimeWebSocketClientMethod,
): RuntimeWebSocketMethodResponseSchema {
  return runtimeWebSocketResponseSchemaByMethod[method]
}

export function isRuntimeWebSocketProviderThreadSubscriptionPayload(
  value: unknown,
): value is RuntimeWebSocketProviderThreadSubscriptionPayload {
  if (!isRecord(value) || !isRecord(value.threadRef)) {
    return false
  }
  if (
    typeof value.afterSequence !== "undefined" &&
    (typeof value.afterSequence !== "number" || !Number.isSafeInteger(value.afterSequence) || value.afterSequence < 0)
  ) {
    return false
  }
  return (
    typeof value.threadRef.providerId === "string" &&
    value.threadRef.providerId.length > 0 &&
    typeof value.threadRef.threadId === "string" &&
    value.threadRef.threadId.length > 0
  )
}

export interface RuntimeWebSocketResponseEnvelope<TPayload = unknown> {
  payload: TPayload
  requestId: string
  success: boolean
  type: "response"
}

export interface RuntimeWebSocketErrorPayload {
  code: RuntimeErrorCode
  details?: unknown
  message: string
  recoverable: boolean
}

export interface RuntimeWebSocketErrorEnvelope {
  error: RuntimeWebSocketErrorPayload
  requestId?: string
  success: false
  type: "error"
}

export interface RuntimeWebSocketEventFrame<TPayload = unknown> {
  eventType: string
  payload: TPayload
  sequence: number
  sessionId: string
  timestamp: string
}

export type RuntimeDeliveryMode = "liveOnly" | "persistOnly" | "liveAndPersist"

const runtimeDeliveryModeValues = [
  "liveOnly",
  "persistOnly",
  "liveAndPersist",
] as const satisfies readonly RuntimeDeliveryMode[]

export type RuntimeDeliveryOriginKind = "runtime" | "provider" | "providerChild"

const runtimeDeliveryOriginKindValues = [
  "runtime",
  "provider",
  "providerChild",
] as const satisfies readonly RuntimeDeliveryOriginKind[]

export interface RuntimeDeliveryOrigin {
  kind: RuntimeDeliveryOriginKind
  providerId?: string | null
  providerRunId?: string | null
}

export type RuntimeDeliveryPayload<TNotification = unknown, TServerRequest = unknown> =
  | { kind: "notification"; notification: TNotification }
  | { kind: "serverRequest"; request: TServerRequest }
  | { kind: "bridgeNotification"; method: string; params: unknown }

const runtimeDeliveryPayloadKindValues = [
  "notification",
  "serverRequest",
  "bridgeNotification",
] as const satisfies readonly RuntimeDeliveryPayload["kind"][]

export interface RuntimeDeliveryFrame<TNotification = unknown, TServerRequest = unknown> {
  /**
   * Stable daemon-assigned id for one projected UI fact. Clients use this for
   * idempotent UI application; persisted event dedupe remains the event-store
   * authority.
   */
  id: string
  mode: RuntimeDeliveryMode
  origin: RuntimeDeliveryOrigin
  payload: RuntimeDeliveryPayload<TNotification, TServerRequest>
  sourceEvent?: RuntimeWebSocketEventFrame | null
  threadId?: string | null
  turnId?: string | null
}

export const runtimeWebSocketEventTypeValues = [
  "session.created",
  "session.updated",
  "session.closed",
  "thread.started",
  "thread.updated",
  "thread.resumed",
  "thread.forked",
  "thread.rollback",
  "session.message.created",
  "session.run.started",
  "session.output.delta",
  "session.output.completed",
  "session.message.completed",
  "session.interbase.notification",
  "session.run.completed",
  "session.run.failed",
  "session.item.started",
  "session.recovery",
  "provider.child.serverRequest",
  "tool.call.started",
  "tool.call.progress",
  "tool.call.completed",
  "tool.call.failed",
  "approval.requested",
  "approval.resolved",
  "shell.command.started",
  "shell.command.output",
  "shell.command.completed",
  "shell.command.failed",
  "mcp.server.status.changed",
  "daemon.warning",
  "daemon.error",
  ...normalizedResponseEventTypeValues,
] as const

export type RuntimeWebSocketEventType = (typeof runtimeWebSocketEventTypeValues)[number]

export function isRuntimeWebSocketEventType(value: string): value is RuntimeWebSocketEventType {
  return runtimeWebSocketEventTypeValues.includes(value as RuntimeWebSocketEventType)
}

export function isRuntimeWebSocketEventFrame(value: unknown): value is RuntimeWebSocketEventFrame {
  return (
    isRecord(value) &&
    typeof value.eventType === "string" &&
    isRuntimeWebSocketEventType(value.eventType) &&
    "payload" in value &&
    typeof value.sequence === "number" &&
    Number.isSafeInteger(value.sequence) &&
    value.sequence >= 0 &&
    typeof value.sessionId === "string" &&
    value.sessionId.length > 0 &&
    typeof value.timestamp === "string" &&
    value.timestamp.length > 0
  )
}

export interface RuntimeWebSocketEventEnvelope {
  event: RuntimeWebSocketEventFrame
  type: "event"
}

export interface RuntimeWebSocketDeliveryEnvelope<TNotification = unknown, TServerRequest = unknown> {
  delivery: RuntimeDeliveryFrame<TNotification, TServerRequest>
  type: "delivery"
}

export function isRuntimeDeliveryFrame(value: unknown): value is RuntimeDeliveryFrame {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.mode === "string" &&
    runtimeDeliveryModeValues.includes(value.mode as RuntimeDeliveryMode) &&
    isRecord(value.origin) &&
    typeof value.origin.kind === "string" &&
    runtimeDeliveryOriginKindValues.includes(value.origin.kind as RuntimeDeliveryOriginKind) &&
    isRecord(value.payload) &&
    typeof value.payload.kind === "string" &&
    runtimeDeliveryPayloadKindValues.includes(value.payload.kind as RuntimeDeliveryPayload["kind"])
  )
}

export interface RuntimeWebSocketServerRequestEnvelope<TPayload = unknown> {
  payload: TPayload
  requestId: string
  type: "serverRequest"
}

export interface RuntimeWebSocketHeartbeatEnvelope {
  timestamp: string
  type: "heartbeat"
}

export interface RuntimeWebSocketProtocolVersionMismatchEnvelope {
  expectedVersion: string
  message: string
  receivedVersion: string
  type: "protocolVersionMismatch"
}

export type RuntimeWebSocketServerEnvelope<TPayload = unknown> =
  | RuntimeWebSocketResponseEnvelope<TPayload>
  | RuntimeWebSocketErrorEnvelope
  | RuntimeWebSocketEventEnvelope
  | RuntimeWebSocketDeliveryEnvelope
  | RuntimeWebSocketServerRequestEnvelope
  | RuntimeWebSocketHeartbeatEnvelope
  | RuntimeWebSocketProtocolVersionMismatchEnvelope

export function isRuntimeWebSocketServerEnvelope(
  value: unknown,
  expectedRequestId?: string,
): value is RuntimeWebSocketServerEnvelope {
  if (!isRecord(value)) {
    return false
  }

  switch (value.type) {
    case "response":
      return (
        typeof value.requestId === "string" &&
        matchesExpectedRequestId(value.requestId, expectedRequestId) &&
        typeof value.success === "boolean" &&
        "payload" in value
      )
    case "error":
      return (
        value.error != null &&
        isRecord(value.error) &&
        typeof value.error.code === "string" &&
        typeof value.error.message === "string" &&
        typeof value.error.recoverable === "boolean" &&
        (typeof value.requestId !== "string" || matchesExpectedRequestId(value.requestId, expectedRequestId)) &&
        value.success === false
      )
    case "event":
      return isRuntimeWebSocketEventFrame(value.event)
    case "delivery":
      return isRuntimeDeliveryFrame(value.delivery)
    case "serverRequest":
      return typeof value.requestId === "string" && "payload" in value
    case "heartbeat":
      return typeof value.timestamp === "string"
    case "protocolVersionMismatch":
      return (
        typeof value.expectedVersion === "string" &&
        typeof value.message === "string" &&
        typeof value.receivedVersion === "string"
      )
    default:
      return false
  }
}

export function isRuntimeWebSocketServerEnvelopeForMethod(
  method: RuntimeWebSocketClientMethod,
  value: unknown,
  expectedRequestId?: string,
): value is RuntimeWebSocketServerEnvelope {
  if (!isRuntimeWebSocketServerEnvelope(value, expectedRequestId)) {
    return false
  }

  if (value.type !== "response") {
    return true
  }

  if (!isRecord(value.payload)) {
    return false
  }

  switch (method) {
    case "initialize":
      return isRuntimeWebSocketInitializeResponse(value.payload)
    case "ping":
      return isRuntimeWebSocketPingResponse(value.payload)
    case "subscribe":
    case "resume":
      return isRuntimeWebSocketReplayResponse(value.payload)
    default:
      return true
  }
}

function isRuntimeWebSocketInitializeResponse(payload: Record<string, unknown>) {
  return (
    isNonEmptyString(payload.acceptedRuntimeApiVersion) &&
    Array.isArray(payload.capabilities) &&
    payload.capabilities.every(isNonEmptyString) &&
    isNonEmptyString(payload.protocolVersion) &&
    isNonEmptyString(payload.serverName) &&
    isNonEmptyString(payload.serverVersion)
  )
}

function isRuntimeWebSocketPingResponse(payload: Record<string, unknown>) {
  return isNonEmptyString(payload.message) && isNonEmptyString(payload.timestamp)
}

function isRuntimeWebSocketReplayResponse(payload: Record<string, unknown>) {
  return isRuntimeWebSocketReplayPayload(payload) || isRuntimeWebSocketReplayUnavailablePayload(payload)
}

function isRuntimeWebSocketReplayPayload(payload: Record<string, unknown>) {
  return (
    Array.isArray(payload.events) &&
    payload.events.every(isRuntimeWebSocketEventFrame) &&
    isSafeNonNegativeInteger(payload.nextSequence) &&
    isSafeNonNegativeInteger(payload.replayedCount)
  )
}

function isRuntimeWebSocketReplayUnavailablePayload(payload: Record<string, unknown>) {
  return (
    isSafeNonNegativeInteger(payload.afterSequence) &&
    isNonEmptyString(payload.reason) &&
    payload.recoverable === false &&
    isRecord(payload.subscription) &&
    isRuntimeWebSocketSubscriptionTarget(payload.subscription)
  )
}

export function isRuntimeWebSocketProtocolVersionSupported(
  receivedVersion: string,
  supportedVersions: readonly string[] = supportedRuntimeWebSocketProtocolVersions,
) {
  return supportedVersions.includes(receivedVersion)
}

export function selectRuntimeWebSocketProtocolVersion(
  payload: RuntimeWebSocketInitializePayload,
  supportedVersions: readonly string[] = supportedRuntimeWebSocketProtocolVersions,
) {
  const clientVersions = payload.supportedRuntimeApiVersions ?? [payload.supportedRuntimeApiVersion]
  for (let index = supportedVersions.length - 1; index >= 0; index -= 1) {
    const version = supportedVersions[index]
    if (version && clientVersions.includes(version)) {
      return version
    }
  }
  return null
}

export function createRuntimeWebSocketProtocolVersionMismatch(input: {
  expectedVersion?: string
  receivedVersion: string
  supportedVersions?: readonly string[]
}): RuntimeWebSocketProtocolVersionMismatchEnvelope {
  const expectedVersion = input.expectedVersion ?? runtimeWebSocketProtocolVersion
  const supportedVersions = input.supportedVersions ?? supportedRuntimeWebSocketProtocolVersions
  return {
    expectedVersion,
    message: `Runtime WebSocket protocol version mismatch: expected ${expectedVersion}, got ${input.receivedVersion}. Supported versions: ${supportedVersions.join(", ")}. Update the CLI/runtime or update the client so their supported protocol windows overlap.`,
    receivedVersion: input.receivedVersion,
    type: "protocolVersionMismatch",
  }
}

export function runtimeEventEnvelopeToWebSocketEventFrame(envelope: RuntimeEventEnvelope): RuntimeWebSocketEventFrame {
  const eventType = "eventType" in envelope.event ? envelope.event.eventType : envelope.event.type

  return {
    eventType,
    payload: envelope.event,
    sequence: envelope.sequence,
    sessionId: envelope.sessionId,
    timestamp: envelope.timestamp,
  }
}

export function createRuntimeWebSocketReplayPayload(
  events: RuntimeWebSocketEventFrame[],
): RuntimeWebSocketReplayPayload {
  return {
    events,
    nextSequence: events.at(-1)?.sequence != null ? events.at(-1)!.sequence + 1 : 0,
    replayedCount: events.length,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function matchesExpectedRequestId(actualRequestId: string, expectedRequestId: string | undefined) {
  return expectedRequestId === undefined || actualRequestId === expectedRequestId
}
