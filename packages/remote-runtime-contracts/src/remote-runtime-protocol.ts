import {
  isRemoteRuntimeAttachmentCapability,
  isRemoteRuntimeCapability,
  type RemoteRuntimeAttachmentCapability,
  type RemoteRuntimeCapability,
} from "./capabilities.js"
import {
  isThreadGoalStatus,
  type CreateGoalInput,
  type EditGoalInput,
  type ThreadGoal,
  type UpdateGoalInput,
} from "@interbase/runtime-protocol"

export const runtimeThreadStatusValues = ["idle", "running", "error", "closed", "interrupted"] as const

export type RuntimeThreadStatus = (typeof runtimeThreadStatusValues)[number]
export type MessageRole = "assistant" | "system" | "user"

export interface RuntimeActiveChatMetadataProjection {
  agent: string | null
  createdAt: string
  goal?: ThreadGoal | null
  hasActiveTurn?: boolean | null
  lastText?: string | null
  messageCount?: number | null
  model: string | null
  path: string | null
  projectId: string
  providerId: string | null
  providerName: string | null
  sessionId: string
  status: RuntimeThreadStatus
  title: string
  updatedAt: string
}

export interface RuntimeActiveChatsPayload {
  cursor?: string | null
  limit?: number | null
}

export interface RuntimeActiveChatsPageInfo {
  hasNewer: boolean
  hasOlder: boolean
  newerCursor: string | null
  olderCursor: string | null
}

export interface RuntimeActiveChatsResponse {
  activeChats: RuntimeActiveChatMetadataProjection[]
  pageInfo: RuntimeActiveChatsPageInfo
}

export interface LiveThreadRecord {
  lastEventSequence?: number | null
  providerId: string
  status: RuntimeThreadStatus
  threadId: string
  updatedAt: string
}

export interface RuntimeThreadState {
  lastManagedModel: string | null
  replayPresence: "present" | "missing" | "degraded" | "unknown"
}

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

export type RuntimeWebSocketClientCommand =
  | RuntimeWebSocketClientEnvelope<"providerModel.command", RuntimeWebSocketProviderModelCommandPayload>
  | RuntimeWebSocketClientEnvelope<
      Exclude<RuntimeWebSocketClientMethod, "providerModel.command">,
      Record<string, unknown>
    >

export function isRuntimeWebSocketClientCommand(value: unknown): value is RuntimeWebSocketClientCommand {
  if (
    !isRecord(value) ||
    typeof value.requestId !== "string" ||
    value.requestId.length === 0 ||
    typeof value.protocolVersion !== "string" ||
    value.protocolVersion.length === 0 ||
    typeof value.method !== "string" ||
    !isRuntimeWebSocketClientMethod(value.method) ||
    !isRecord(value.payload)
  ) {
    return false
  }
  if (value.method === "initialize") {
    return (
      isNonEmptyString(value.payload.clientName) &&
      isNonEmptyString(value.payload.clientVersion) &&
      isNonEmptyString(value.payload.supportedRuntimeApiVersion) &&
      (value.payload.supportedRuntimeApiVersions === undefined ||
        (Array.isArray(value.payload.supportedRuntimeApiVersions) &&
          value.payload.supportedRuntimeApiVersions.every(isNonEmptyString)))
    )
  }
  if (value.method === "ping") return typeof value.payload.message === "string"
  if (value.method === "providerModel.command") return isProviderModelCommandPayload(value.payload)
  if (value.method === "subscribe" || value.method === "unsubscribe" || value.method === "resume")
    return isRemoteRuntimeSubscriptionTarget(value.payload)
  return true
}

export type RuntimeWebSocketResponsePayloadKind =
  | "acknowledgement"
  | "account"
  | "credential"
  | "metadata"
  | "provider"
  | "session"
  | "thread"
  | "turn"
  | "replay"
  | "shell"
  | "unknown"

export type RuntimeWebSocketServerMessageType =
  | "response"
  | "error"
  | "event"
  | "delivery"
  | "serverRequest"
  | "heartbeat"
  | "protocolVersionMismatch"

export interface RuntimeWebSocketMethodResponseSchema {
  method: RuntimeWebSocketClientMethod
  payloadKind: RuntimeWebSocketResponsePayloadKind
  serverMessageTypes: readonly RuntimeWebSocketServerMessageType[]
}

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

export interface RuntimeWebSocketResponseEnvelope<TPayload = unknown> {
  payload: TPayload
  requestId: string
  success: true
  type: "response"
}

export interface RuntimeWebSocketErrorEnvelope {
  error: { code: string; message: string; recoverable: boolean }
  requestId?: string
  success: false
  type: "error"
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
  | { event: unknown; type: "event" }
  | { delivery: unknown; type: "delivery" }
  | { payload: unknown; requestId: string; type: "serverRequest" }
  | { timestamp: string; type: "heartbeat" }
  | RuntimeWebSocketProtocolVersionMismatchEnvelope

export function isRuntimeWebSocketServerEnvelope(
  value: unknown,
  expectedRequestId?: string,
): value is RuntimeWebSocketServerEnvelope {
  if (!isRecord(value)) return false
  switch (value.type) {
    case "response":
      return (
        typeof value.requestId === "string" &&
        matchesExpectedRequestId(value.requestId, expectedRequestId) &&
        value.success === true &&
        "payload" in value
      )
    case "error":
      return (
        isRecord(value.error) &&
        typeof value.error.code === "string" &&
        typeof value.error.message === "string" &&
        typeof value.error.recoverable === "boolean" &&
        (typeof value.requestId !== "string" || matchesExpectedRequestId(value.requestId, expectedRequestId)) &&
        value.success === false
      )
    case "event":
      return "event" in value
    case "delivery":
      return "delivery" in value
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
  if (!isRuntimeWebSocketServerEnvelope(value, expectedRequestId)) return false
  if (value.type !== "response") return true
  if (!isRecord(value.payload)) return false
  switch (method) {
    case "initialize":
      return isRuntimeWebSocketInitializeResponse(value.payload)
    case "ping":
      return typeof value.payload.message === "string" && typeof value.payload.timestamp === "string"
    default:
      return true
  }
}

export type RuntimeWebSocketEventResourceRef =
  | { kind: "runtime"; runtimeInstallationId: string }
  | { kind: "activeChats"; runtimeInstallationId: string }
  | { kind: "chat"; runtimeInstallationId: string; sessionId: string }
  | { kind: "chatMessages"; runtimeInstallationId: string; sessionId: string }
  | { kind: "goals"; runtimeInstallationId: string }
  | { kind: "aliases"; runtimeInstallationId: string }
  | { kind: "providers"; runtimeInstallationId: string }

export interface RuntimeWebSocketEventSignaturePayloadInput {
  eventPayloadSha256: string
  gatewayRuntimeAttachmentId: string | null
  keyId: string
  runtimeInstallationId: string
  timestamp: string
  trustedRuntimeClientId: string
}

export interface RuntimeWebSocketEventSignaturePayload {
  algorithm: "ed25519"
  payload: string
}

export interface RuntimeWebSocketEventSignatureProof {
  algorithm: "ed25519"
  eventPayload: string
  eventPayloadSha256: string
  keyId: string
  signature: string
  timestamp: string
}

export function createRuntimeWebSocketEventSignaturePayload(
  input: RuntimeWebSocketEventSignaturePayloadInput,
): RuntimeWebSocketEventSignaturePayload {
  return {
    algorithm: "ed25519",
    payload: [
      "interbase-runtime-websocket-event-signature-v1",
      `runtimeInstallationId:${input.runtimeInstallationId}`,
      `trustedRuntimeClientId:${input.trustedRuntimeClientId}`,
      `gatewayRuntimeAttachmentId:${input.gatewayRuntimeAttachmentId ?? ""}`,
      `keyId:${input.keyId}`,
      `eventPayloadSha256:${input.eventPayloadSha256}`,
      `timestamp:${input.timestamp}`,
    ].join("\n"),
  }
}

export const remoteRuntimeThreadMetadataProjectionFields = [
  "providerId",
  "threadId",
  "status",
  "updatedAt",
  "lastEventSequence",
  "model",
  "replay",
] as const

export const remoteRuntimeActiveChatMetadataProjectionFields = [
  "agent",
  "createdAt",
  "goal",
  "hasActiveTurn",
  "lastText",
  "messageCount",
  "model",
  "path",
  "projectId",
  "providerId",
  "providerName",
  "sessionId",
  "status",
  "title",
  "updatedAt",
] as const

export const remoteRuntimeChatMessagePartProjectionFields = [
  "id",
  "kind",
  "messageId",
  "rawPart",
  "text",
  "title",
  "status",
] as const

export const remoteRuntimeChatMessageProjectionFields = [
  "agent",
  "completedAt",
  "createdAt",
  "errorMessage",
  "errorName",
  "finishReason",
  "id",
  "model",
  "parentId",
  "parts",
  "role",
  "sessionId",
] as const

export type RemoteRuntimeThreadMetadataProjectionField = (typeof remoteRuntimeThreadMetadataProjectionFields)[number]

export type RemoteRuntimeActiveChatMetadataProjectionField =
  (typeof remoteRuntimeActiveChatMetadataProjectionFields)[number]

export type RemoteRuntimeChatMessagePartProjectionField = (typeof remoteRuntimeChatMessagePartProjectionFields)[number]

export type RemoteRuntimeChatMessageProjectionField = (typeof remoteRuntimeChatMessageProjectionFields)[number]

export const remoteRuntimeThreadStatusValues = runtimeThreadStatusValues

export type RemoteRuntimeThreadStatus = RuntimeThreadStatus

export type RemoteRuntimeProjectionFieldSensitivity = "metadata"

export const remoteRuntimeThreadMetadataProjectionSensitivity = {
  providerId: "metadata",
  threadId: "metadata",
  status: "metadata",
  updatedAt: "metadata",
  lastEventSequence: "metadata",
  model: "metadata",
  replay: "metadata",
} satisfies Record<RemoteRuntimeThreadMetadataProjectionField, RemoteRuntimeProjectionFieldSensitivity>

export const remoteRuntimeActiveChatMetadataProjectionSensitivity = {
  agent: "metadata",
  createdAt: "metadata",
  goal: "metadata",
  hasActiveTurn: "metadata",
  lastText: "metadata",
  messageCount: "metadata",
  model: "metadata",
  path: "metadata",
  projectId: "metadata",
  providerId: "metadata",
  providerName: "metadata",
  sessionId: "metadata",
  status: "metadata",
  title: "metadata",
  updatedAt: "metadata",
} satisfies Record<RemoteRuntimeActiveChatMetadataProjectionField, RemoteRuntimeProjectionFieldSensitivity>

export interface RemoteRuntimeThreadMetadataProjection {
  lastEventSequence: number | null
  model: string | null
  providerId: string
  replay: "supported" | "unsupported" | "unavailable"
  status: RemoteRuntimeThreadStatus
  threadId: string
  updatedAt: string
}

export type RemoteRuntimeActiveChatMetadataProjection = RuntimeActiveChatMetadataProjection
export type RemoteRuntimeActiveChatsListPayload = RuntimeActiveChatsPayload
export type RemoteRuntimeActiveChatsPageInfo = RuntimeActiveChatsPageInfo
export type RemoteRuntimeActiveChatsResponse = RuntimeActiveChatsResponse

export type RemoteRuntimeChatMessagePartJSONValue =
  | null
  | boolean
  | number
  | string
  | RemoteRuntimeChatMessagePartJSONValue[]
  | { [key: string]: RemoteRuntimeChatMessagePartJSONValue }

interface RemoteRuntimeChatMessageBasePartPayload {
  id?: string
  messageID?: string
  type: string
}

export interface RemoteRuntimeChatMessageTextPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  synthetic?: boolean
  text?: string
  type: "text" | "reasoning"
  metadata?: { [key: string]: RemoteRuntimeChatMessagePartJSONValue }
}

export interface RemoteRuntimeChatMessageToolPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  input?: { [key: string]: RemoteRuntimeChatMessagePartJSONValue }
  metadata?: { [key: string]: RemoteRuntimeChatMessagePartJSONValue }
  state?: { [key: string]: RemoteRuntimeChatMessagePartJSONValue }
  tool?: string
  type: "tool"
}

export interface RemoteRuntimeChatMessageFilePartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  filename?: string
  mime?: string
  source?: { [key: string]: RemoteRuntimeChatMessagePartJSONValue }
  type: "file"
  url?: string
}

export interface RemoteRuntimeChatMessagePatchPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  files?: RemoteRuntimeChatMessagePartJSONValue[]
  type: "patch"
}

export interface RemoteRuntimeChatMessageSnapshotPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  snapshot?: string
  type: "snapshot" | "step-start"
}

export interface RemoteRuntimeChatMessageStepFinishPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  cost?: number | string
  reason?: string
  tokens?: { [key: string]: RemoteRuntimeChatMessagePartJSONValue }
  type: "step-finish"
}

export interface RemoteRuntimeChatMessageSubtaskPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  agent?: string
  description?: string
  prompt?: string
  type: "subtask"
}

export interface RemoteRuntimeChatMessageAgentPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  name?: string
  type: "agent"
}

export interface RemoteRuntimeChatMessageRetryPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  attempt?: number
  error?: RemoteRuntimeChatMessagePartJSONValue
  type: "retry"
}

export interface RemoteRuntimeChatMessageCompactionPartPayload extends RemoteRuntimeChatMessageBasePartPayload {
  auto?: boolean
  overflow?: boolean
  phase?: "manual" | "preTurn" | "midTurn"
  reason?: "contextLimit" | "modelDownshift" | "userRequested" | "overflow"
  tail_start_id?: string
  type: "compaction"
}

export type RemoteRuntimeChatMessagePartPayload =
  | RemoteRuntimeChatMessageTextPartPayload
  | RemoteRuntimeChatMessageToolPartPayload
  | RemoteRuntimeChatMessageFilePartPayload
  | RemoteRuntimeChatMessagePatchPartPayload
  | RemoteRuntimeChatMessageSnapshotPartPayload
  | RemoteRuntimeChatMessageStepFinishPartPayload
  | RemoteRuntimeChatMessageSubtaskPartPayload
  | RemoteRuntimeChatMessageAgentPartPayload
  | RemoteRuntimeChatMessageRetryPartPayload
  | RemoteRuntimeChatMessageCompactionPartPayload

export interface RemoteRuntimeChatMessagePartProjection {
  id: string | null
  kind: string
  messageId: string | null
  rawPart: RemoteRuntimeChatMessagePartPayload | null
  status: string | null
  text: string | null
  title: string | null
}

export interface RemoteRuntimeChatMessageProjection {
  agent: string | null
  completedAt: string | null
  createdAt: string
  errorMessage: string | null
  errorName: string | null
  finishReason: string | null
  id: string
  model: string | null
  parentId: string | null
  parts: RemoteRuntimeChatMessagePartProjection[]
  role: MessageRole
  sessionId: string
}

export interface RemoteRuntimeChatMessagesPayload {
  cursor?: string | null
  limit?: number | null
  sessionId: string
}

export interface RemoteRuntimeChatMessagesPageInfo {
  hasNewer: boolean
  hasOlder: boolean
  newerCursor: string | null
  olderCursor: string | null
}

export interface RemoteRuntimeChatMessagesResponse {
  messages: RemoteRuntimeChatMessageProjection[]
  pageInfo: RemoteRuntimeChatMessagesPageInfo
  sessionId: string
}

export interface RemoteRuntimeSendMessageResponse {
  message: RemoteRuntimeChatMessageProjection
  sessionId: string
}

export interface RemoteRuntimeGoalResponse {
  completionBudgetReport: string | null
  goal: ThreadGoal | null
  remainingTokens: number | null
}

export interface RemoteRuntimeGoalGetPayload {
  sessionId: string
}

export interface RemoteRuntimeGoalListPayload {
  cursor?: string | null
  limit?: number | null
  status?: ThreadGoal["status"] | null
}

export interface RemoteRuntimeGoalsPageInfo {
  hasOlder: boolean
  olderCursor: string | null
}

export interface RemoteRuntimeGoalCreatePayload {
  input: CreateGoalInput
  sessionId: string
}

export interface RemoteRuntimeGoalEditPayload {
  input: EditGoalInput
  sessionId: string
}

export interface RemoteRuntimeGoalUpdatePayload {
  input: UpdateGoalInput
  sessionId: string
}

export interface RemoteRuntimeGoalClearPayload {
  sessionId: string
}

export interface RemoteRuntimeGoalPausePayload {
  sessionId: string
}

export interface RemoteRuntimeGoalResumePayload {
  sessionId: string
}

export interface RemoteRuntimeGoalsListResponse {
  goals: ThreadGoal[]
  pageInfo?: RemoteRuntimeGoalsPageInfo
}

export const remoteRuntimeGitStatusMaxDiffBytesDefault = 262_144
export const remoteRuntimeGitStatusMaxDiffBytesLimit = 1_048_576

export interface RemoteRuntimeGitStatusInput {
  includeDiff?: boolean | null
  maxDiffBytes?: number | null
}

export interface NormalizedRemoteRuntimeGitStatusInput {
  includeDiff: boolean
  maxDiffBytes: number
}

export interface RemoteRuntimeGitFileStatus {
  conflicted: boolean
  path: string
  renamedFrom: string | null
  staged: string | null
  submodule: boolean
  untracked: boolean
  unstaged: string | null
}

export interface RemoteRuntimeGitRepositoryStatus {
  ahead: number | null
  behind: number | null
  branch: string | null
  diffTruncated: boolean
  directoryId: string
  error: string | null
  files: RemoteRuntimeGitFileStatus[]
  head: string | null
  isRepository: boolean
  path: string
  repositoryRoot: string | null
  stagedDiff: string | null
  unstagedDiff: string | null
  upstream: string | null
}

export interface RemoteRuntimeGitStatusResponse {
  repositories: RemoteRuntimeGitRepositoryStatus[]
}

export interface RemoteRuntimePromptAlias {
  alias: string
  prompt: string
  updatedAt: number
}

export interface RemoteRuntimeAliasGetPayload {
  alias: string
}

export interface RemoteRuntimeAliasSetPayload {
  alias: string
  prompt: string
}

export interface RemoteRuntimeAliasDeletePayload {
  alias: string
}

export interface RemoteRuntimeAliasResponse {
  alias: RemoteRuntimePromptAlias | null
}

export interface RemoteRuntimeAliasesListResponse {
  aliases: RemoteRuntimePromptAlias[]
}

export interface RemoteRuntimeAliasDeleteResponse {
  deleted: boolean
}

export function createRemoteRuntimeThreadMetadataProjection(input: {
  live: LiveThreadRecord
  runtimeState: Pick<RuntimeThreadState, "lastManagedModel" | "replayPresence"> | null
}): RemoteRuntimeThreadMetadataProjection {
  return {
    lastEventSequence: input.live.lastEventSequence ?? null,
    model: input.runtimeState?.lastManagedModel ?? null,
    providerId: input.live.providerId,
    replay: replayAvailability(input.runtimeState),
    status: input.live.status,
    threadId: input.live.threadId,
    updatedAt: input.live.updatedAt,
  }
}

function replayAvailability(
  runtimeState: Pick<RuntimeThreadState, "replayPresence"> | null,
): RemoteRuntimeThreadMetadataProjection["replay"] {
  if (!runtimeState) {
    return "unavailable"
  }
  return runtimeState.replayPresence === "present" ? "supported" : "unavailable"
}

export const remoteRuntimeWebSocketClientMethodValues = [
  "directory.list",
  "directory.select",
  "session.list",
  "activeChats.list",
  "chat.start",
  "session.messages",
  "goal.get",
  "goal.list",
  "goal.create",
  "goal.edit",
  "goal.update",
  "goal.clear",
  "goal.pause",
  "goal.resume",
  "alias.list",
  "alias.get",
  "alias.set",
  "alias.delete",
  "git.status",
] as const

export type RemoteRuntimeWebSocketClientMethod = (typeof remoteRuntimeWebSocketClientMethodValues)[number]

export function isRemoteRuntimeWebSocketClientMethod(value: string): value is RemoteRuntimeWebSocketClientMethod {
  return remoteRuntimeWebSocketClientMethodValues.includes(value as RemoteRuntimeWebSocketClientMethod)
}

export const remoteRuntimeWebSocketResponsePayloadKindValues = ["metadata", "session", "goal", "alias", "git"] as const

export type RemoteRuntimeWebSocketResponsePayloadKind = (typeof remoteRuntimeWebSocketResponsePayloadKindValues)[number]

export interface RemoteRuntimeWebSocketMethodResponseSchema {
  method: RemoteRuntimeWebSocketClientMethod
  payloadKind: RemoteRuntimeWebSocketResponsePayloadKind
  serverMessageTypes: readonly ["response", "error", "heartbeat", "protocolVersionMismatch"]
}

const remoteRuntimeWebSocketCommandResponseServerMessageTypes = [
  "response",
  "error",
  "heartbeat",
  "protocolVersionMismatch",
] as const

const remoteRuntimeWebSocketResponsePayloadKindByMethod = {
  "directory.list": "metadata",
  "directory.select": "metadata",
  "session.list": "session",
  "activeChats.list": "session",
  "chat.start": "session",
  "session.messages": "session",
  "goal.get": "goal",
  "goal.list": "goal",
  "goal.create": "goal",
  "goal.edit": "goal",
  "goal.update": "goal",
  "goal.clear": "goal",
  "goal.pause": "goal",
  "goal.resume": "goal",
  "alias.list": "alias",
  "alias.get": "alias",
  "alias.set": "alias",
  "alias.delete": "alias",
  "git.status": "git",
} as const satisfies Record<RemoteRuntimeWebSocketClientMethod, RemoteRuntimeWebSocketResponsePayloadKind>

const remoteRuntimeWebSocketResponseSchemaByMethod = remoteRuntimeWebSocketClientMethodValues.reduce(
  (schemas, method) => {
    schemas[method] = {
      method,
      payloadKind: remoteRuntimeWebSocketResponsePayloadKindByMethod[method],
      serverMessageTypes: remoteRuntimeWebSocketCommandResponseServerMessageTypes,
    }
    return schemas
  },
  {} as Record<RemoteRuntimeWebSocketClientMethod, RemoteRuntimeWebSocketMethodResponseSchema>,
)

export const remoteRuntimeWebSocketResponseSchemas = remoteRuntimeWebSocketClientMethodValues.map(
  (method) => remoteRuntimeWebSocketResponseSchemaByMethod[method],
)

export function remoteRuntimeWebSocketResponseSchemaForMethod(
  method: RemoteRuntimeWebSocketClientMethod,
): RemoteRuntimeWebSocketMethodResponseSchema {
  return remoteRuntimeWebSocketResponseSchemaByMethod[method]
}

export interface RuntimeWebSocketAllowedDirectory {
  directoryId: string
  displayName?: string | null
  path: string
}

export interface RuntimeWebSocketDirectoryAttachment {
  directoryId: string
  gatewayRuntimeAttachmentId: string
  path: string
  status: "online" | "offline" | "revoked" | "unavailable"
}

export interface RuntimeWebSocketDirectoryListResponse {
  activeDirectoryAttachments: RuntimeWebSocketDirectoryAttachment[]
  allowedDirectories: RuntimeWebSocketAllowedDirectory[]
}

export interface RuntimeWebSocketDirectorySelectPayload {
  directoryId: string
}

export interface RuntimeWebSocketDirectorySelectResponse {
  attachment: RuntimeWebSocketDirectoryAttachment | null
  directory: RuntimeWebSocketAllowedDirectory
}

export interface RuntimeWebSocketChatStartPayload {
  directoryId: string
  model?: string | null
  providerId?: string | null
  title?: string | null
}

export interface RuntimeWebSocketChatStartResponse {
  chat: RemoteRuntimeActiveChatMetadataProjection
}

export interface RuntimeWebSocketInitializeResponse {
  acceptedRuntimeApiVersion: string
  activeChats: RemoteRuntimeActiveChatMetadataProjection[]
  activeDirectoryAttachments: RuntimeWebSocketDirectoryAttachment[]
  allowedDirectories: RuntimeWebSocketAllowedDirectory[]
  attachmentCapabilities: RemoteRuntimeAttachmentCapability[]
  featureCapabilities: RemoteRuntimeCapability[]
  protocolVersion: string
  serverName: string
  serverVersion: string
  supportedMethods: RemoteRuntimeProtocolClientMethod[]
}

export type RuntimeWebSocketSessionMessagesPayload = RemoteRuntimeChatMessagesPayload

export interface RemoteRuntimeProtocolClientEnvelope<
  TMethod extends RemoteRuntimeProtocolClientMethod = RemoteRuntimeProtocolClientMethod,
  TPayload = unknown,
> {
  method: TMethod
  payload: TPayload
  protocolVersion: string
  requestId: string
}

export type RemoteRuntimeProtocolClientMethod = RuntimeWebSocketClientMethod | RemoteRuntimeWebSocketClientMethod

export const remoteRuntimeProtocolClientMethodValues = [
  ...runtimeWebSocketClientMethodValues,
  ...remoteRuntimeWebSocketClientMethodValues.filter((method) => !isRuntimeWebSocketClientMethod(method)),
] as readonly RemoteRuntimeProtocolClientMethod[]

export function isRemoteRuntimeProtocolClientMethod(value: string): value is RemoteRuntimeProtocolClientMethod {
  return isRuntimeWebSocketClientMethod(value) || isRemoteRuntimeWebSocketClientMethod(value)
}

export type RemoteRuntimeProtocolClientCommand =
  | RuntimeWebSocketClientCommand
  | RemoteRuntimeProtocolClientEnvelope<"directory.list", Record<string, never>>
  | RemoteRuntimeProtocolClientEnvelope<"directory.select", RuntimeWebSocketDirectorySelectPayload>
  | RemoteRuntimeProtocolClientEnvelope<"session.list", RemoteRuntimeActiveChatsListPayload>
  | RemoteRuntimeProtocolClientEnvelope<"activeChats.list", RemoteRuntimeActiveChatsListPayload>
  | RemoteRuntimeProtocolClientEnvelope<"chat.start", RuntimeWebSocketChatStartPayload>
  | RemoteRuntimeProtocolClientEnvelope<"session.messages", RemoteRuntimeChatMessagesPayload>
  | RemoteRuntimeProtocolClientEnvelope<"goal.get", RemoteRuntimeGoalGetPayload>
  | RemoteRuntimeProtocolClientEnvelope<"goal.list", RemoteRuntimeGoalListPayload>
  | RemoteRuntimeProtocolClientEnvelope<"goal.create", RemoteRuntimeGoalCreatePayload>
  | RemoteRuntimeProtocolClientEnvelope<"goal.edit", RemoteRuntimeGoalEditPayload>
  | RemoteRuntimeProtocolClientEnvelope<"goal.update", RemoteRuntimeGoalUpdatePayload>
  | RemoteRuntimeProtocolClientEnvelope<"goal.clear", RemoteRuntimeGoalClearPayload>
  | RemoteRuntimeProtocolClientEnvelope<"goal.pause", RemoteRuntimeGoalPausePayload>
  | RemoteRuntimeProtocolClientEnvelope<"goal.resume", RemoteRuntimeGoalResumePayload>
  | RemoteRuntimeProtocolClientEnvelope<"alias.list", Record<string, never>>
  | RemoteRuntimeProtocolClientEnvelope<"alias.get", RemoteRuntimeAliasGetPayload>
  | RemoteRuntimeProtocolClientEnvelope<"alias.set", RemoteRuntimeAliasSetPayload>
  | RemoteRuntimeProtocolClientEnvelope<"alias.delete", RemoteRuntimeAliasDeletePayload>
  | RemoteRuntimeProtocolClientEnvelope<"git.status", RemoteRuntimeGitStatusInput>

export function isRemoteRuntimeProtocolClientCommand(value: unknown): value is RemoteRuntimeProtocolClientCommand {
  if (isRuntimeWebSocketClientCommand(value)) {
    return true
  }
  if (!isRecord(value) || !isRecord(value.payload)) {
    return false
  }
  if (
    typeof value.requestId !== "string" ||
    value.requestId.length === 0 ||
    typeof value.protocolVersion !== "string" ||
    typeof value.method !== "string" ||
    !isRemoteRuntimeWebSocketClientMethod(value.method)
  ) {
    return false
  }
  switch (value.method) {
    case "directory.list":
      return Object.keys(value.payload).length === 0
    case "directory.select":
      return isNonEmptyString(value.payload.directoryId)
    case "session.list":
    case "activeChats.list":
      return isOptionalStringOrNull(value.payload.cursor) && isOptionalSafeIntegerOrNull(value.payload.limit)
    case "chat.start":
      return (
        isNonEmptyString(value.payload.directoryId) &&
        isOptionalStringOrNull(value.payload.model) &&
        isOptionalStringOrNull(value.payload.providerId) &&
        isOptionalStringOrNull(value.payload.title)
      )
    case "session.messages":
      return (
        isNonEmptyString(value.payload.sessionId) &&
        isOptionalStringOrNull(value.payload.cursor) &&
        isOptionalSafeIntegerOrNull(value.payload.limit)
      )
    case "goal.get":
    case "goal.clear":
    case "goal.pause":
    case "goal.resume":
      return isNonEmptyString(value.payload.sessionId)
    case "goal.list":
      return (
        isOptionalStringOrNull(value.payload.cursor) &&
        isOptionalSafeIntegerOrNull(value.payload.limit) &&
        (value.payload.status === undefined ||
          value.payload.status === null ||
          (typeof value.payload.status === "string" && isThreadGoalStatus(value.payload.status)))
      )
    case "goal.create":
      return isNonEmptyString(value.payload.sessionId) && isCreateGoalInput(value.payload.input)
    case "goal.edit":
      return isNonEmptyString(value.payload.sessionId) && isEditGoalInput(value.payload.input)
    case "goal.update":
      return isNonEmptyString(value.payload.sessionId) && isUpdateGoalInput(value.payload.input)
    case "alias.list":
      return Object.keys(value.payload).length === 0
    case "alias.get":
    case "alias.delete":
      return isNonEmptyString(value.payload.alias)
    case "alias.set":
      return isNonEmptyString(value.payload.alias) && isNonEmptyString(value.payload.prompt)
    case "git.status":
      return isRemoteRuntimeGitStatusInput(value.payload, { strict: true })
  }
}

export function normalizeRemoteRuntimeGitStatusInput(
  value: unknown = {},
  options: { strict?: boolean } = {},
): NormalizedRemoteRuntimeGitStatusInput {
  if (!isRemoteRuntimeGitStatusInput(value, options)) {
    throw new Error("Remote runtime git status input is invalid.")
  }
  return {
    includeDiff: value.includeDiff ?? false,
    maxDiffBytes: value.maxDiffBytes ?? remoteRuntimeGitStatusMaxDiffBytesDefault,
  }
}

export type RemoteRuntimeProtocolMethodResponseSchema = Omit<
  RuntimeWebSocketMethodResponseSchema | RemoteRuntimeWebSocketMethodResponseSchema,
  "serverMessageTypes"
> & {
  serverMessageTypes: readonly string[]
}

export const remoteRuntimeProtocolResponseSchemas = [
  ...runtimeWebSocketResponseSchemas,
  ...remoteRuntimeWebSocketResponseSchemas.filter((schema) => !isRuntimeWebSocketClientMethod(schema.method)),
] as readonly RemoteRuntimeProtocolMethodResponseSchema[]

export function remoteRuntimeProtocolResponseSchemaForMethod(
  method: RemoteRuntimeProtocolClientMethod,
): RemoteRuntimeProtocolMethodResponseSchema {
  if (isRemoteRuntimeWebSocketClientMethod(method)) {
    return remoteRuntimeWebSocketResponseSchemaForMethod(method)
  }
  return runtimeWebSocketResponseSchemaForMethod(method)
}

export function isRemoteRuntimeProtocolServerEnvelopeForMethod(
  method: RemoteRuntimeProtocolClientMethod,
  value: unknown,
  expectedRequestId?: string,
): value is RuntimeWebSocketServerEnvelope {
  if (isRuntimeWebSocketClientMethod(method)) {
    return isRuntimeWebSocketServerEnvelopeForMethod(method, value, expectedRequestId)
  }
  return isRemoteRuntimeWebSocketServerEnvelopeForMethod(method, value, expectedRequestId)
}

function isRemoteRuntimeWebSocketServerEnvelopeForMethod(
  method: RemoteRuntimeWebSocketClientMethod,
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
        value.success === true &&
        isRemoteRuntimeWebSocketResponsePayloadForMethod(method, value.payload)
      )
    case "error":
      return (
        isRecord(value.error) &&
        typeof value.error.code === "string" &&
        typeof value.error.message === "string" &&
        typeof value.error.recoverable === "boolean" &&
        (typeof value.requestId !== "string" || matchesExpectedRequestId(value.requestId, expectedRequestId)) &&
        value.success === false
      )
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

function isRemoteRuntimeWebSocketResponsePayloadForMethod(
  method: RemoteRuntimeWebSocketClientMethod,
  payload: unknown,
): boolean {
  switch (method) {
    case "directory.list":
      return isRuntimeWebSocketDirectoryListResponse(payload)
    case "directory.select":
      return isRuntimeWebSocketDirectorySelectResponse(payload)
    case "session.list":
    case "activeChats.list":
      return isRemoteRuntimeActiveChatsResponse(payload)
    case "chat.start":
      return isRecord(payload) && isRemoteRuntimeActiveChatMetadataProjection(payload.chat)
    case "session.messages":
      return isRemoteRuntimeChatMessagesResponse(payload)
    case "goal.get":
    case "goal.create":
    case "goal.edit":
    case "goal.update":
    case "goal.clear":
    case "goal.pause":
    case "goal.resume":
      return isRemoteRuntimeGoalResponse(payload)
    case "goal.list":
      return isRemoteRuntimeGoalsListResponse(payload)
    case "alias.list":
      return isRemoteRuntimeAliasesListResponse(payload)
    case "alias.get":
    case "alias.set":
      return isRemoteRuntimeAliasResponse(payload)
    case "alias.delete":
      return isRemoteRuntimeAliasDeleteResponse(payload)
    case "git.status":
      return isRemoteRuntimeGitStatusResponse(payload)
  }
}

function isRuntimeWebSocketDirectoryListResponse(value: unknown): value is RuntimeWebSocketDirectoryListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.activeDirectoryAttachments) &&
    value.activeDirectoryAttachments.every(isRuntimeWebSocketDirectoryAttachment) &&
    Array.isArray(value.allowedDirectories) &&
    value.allowedDirectories.every(isRuntimeWebSocketAllowedDirectory)
  )
}

function isRuntimeWebSocketDirectorySelectResponse(value: unknown): value is RuntimeWebSocketDirectorySelectResponse {
  return (
    isRecord(value) &&
    (value.attachment === null || isRuntimeWebSocketDirectoryAttachment(value.attachment)) &&
    isRuntimeWebSocketAllowedDirectory(value.directory)
  )
}

function isRuntimeWebSocketAllowedDirectory(value: unknown): value is RuntimeWebSocketAllowedDirectory {
  return (
    isRecord(value) &&
    isNonEmptyString(value.directoryId) &&
    isOptionalStringOrNull(value.displayName) &&
    isNonEmptyString(value.path)
  )
}

function isRuntimeWebSocketDirectoryAttachment(value: unknown): value is RuntimeWebSocketDirectoryAttachment {
  return (
    isRecord(value) &&
    isNonEmptyString(value.directoryId) &&
    isNonEmptyString(value.gatewayRuntimeAttachmentId) &&
    isNonEmptyString(value.path) &&
    (value.status === "online" ||
      value.status === "offline" ||
      value.status === "revoked" ||
      value.status === "unavailable")
  )
}

function isRemoteRuntimeActiveChatsResponse(value: unknown): value is RemoteRuntimeActiveChatsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.activeChats) &&
    value.activeChats.every(isRemoteRuntimeActiveChatMetadataProjection) &&
    isRemoteRuntimeActiveChatsPageInfo(value.pageInfo)
  )
}

function isRemoteRuntimeChatMessagesResponse(value: unknown): value is RemoteRuntimeChatMessagesResponse {
  return (
    isRecord(value) &&
    isNonEmptyString(value.sessionId) &&
    Array.isArray(value.messages) &&
    value.messages.every(isRemoteRuntimeChatMessageProjection) &&
    isRemoteRuntimeActiveChatsPageInfo(value.pageInfo)
  )
}

function isRemoteRuntimeActiveChatsPageInfo(value: unknown): value is RemoteRuntimeActiveChatsPageInfo {
  return (
    isRecord(value) &&
    typeof value.hasNewer === "boolean" &&
    typeof value.hasOlder === "boolean" &&
    isOptionalStringOrNull(value.newerCursor) &&
    isOptionalStringOrNull(value.olderCursor)
  )
}

function isRemoteRuntimeActiveChatMetadataProjection(
  value: unknown,
): value is RemoteRuntimeActiveChatMetadataProjection {
  return (
    isRecord(value) &&
    isOptionalStringOrNull(value.agent) &&
    isNonEmptyString(value.createdAt) &&
    (value.goal === undefined || value.goal === null || isThreadGoal(value.goal)) &&
    (value.hasActiveTurn === undefined || typeof value.hasActiveTurn === "boolean") &&
    isOptionalStringOrNull(value.lastText) &&
    isOptionalSafeIntegerOrNull(value.messageCount) &&
    isOptionalStringOrNull(value.model) &&
    isOptionalStringOrNull(value.path) &&
    isNonEmptyString(value.projectId) &&
    isOptionalStringOrNull(value.providerId) &&
    isOptionalStringOrNull(value.providerName) &&
    isNonEmptyString(value.sessionId) &&
    typeof value.status === "string" &&
    remoteRuntimeThreadStatusValues.includes(value.status as RemoteRuntimeThreadStatus) &&
    isNonEmptyString(value.title) &&
    isNonEmptyString(value.updatedAt)
  )
}

function isRemoteRuntimeGoalResponse(value: unknown): value is RemoteRuntimeGoalResponse {
  return (
    isRecord(value) &&
    (value.completionBudgetReport === null || typeof value.completionBudgetReport === "string") &&
    (value.goal === null || isThreadGoal(value.goal)) &&
    isOptionalSafeIntegerOrNull(value.remainingTokens)
  )
}

function isRemoteRuntimeGoalsListResponse(value: unknown): value is RemoteRuntimeGoalsListResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.goals) &&
    value.goals.every(isThreadGoal) &&
    (value.pageInfo === undefined ||
      (isRecord(value.pageInfo) &&
        typeof value.pageInfo.hasOlder === "boolean" &&
        isOptionalStringOrNull(value.pageInfo.olderCursor)))
  )
}

function isRemoteRuntimePromptAlias(value: unknown): value is RemoteRuntimePromptAlias {
  return (
    isRecord(value) &&
    isNonEmptyString(value.alias) &&
    isNonEmptyString(value.prompt) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  )
}

function isRemoteRuntimeAliasResponse(value: unknown): value is RemoteRuntimeAliasResponse {
  return isRecord(value) && (value.alias === null || isRemoteRuntimePromptAlias(value.alias))
}

function isRemoteRuntimeAliasesListResponse(value: unknown): value is RemoteRuntimeAliasesListResponse {
  return isRecord(value) && Array.isArray(value.aliases) && value.aliases.every(isRemoteRuntimePromptAlias)
}

function isRemoteRuntimeAliasDeleteResponse(value: unknown): value is RemoteRuntimeAliasDeleteResponse {
  return isRecord(value) && typeof value.deleted === "boolean"
}

export function isRemoteRuntimeGitStatusInput(
  value: unknown,
  options: { strict?: boolean } = {},
): value is RemoteRuntimeGitStatusInput {
  return (
    isRecord(value) &&
    (!options.strict || Object.keys(value).every((key) => key === "includeDiff" || key === "maxDiffBytes")) &&
    (value.includeDiff === undefined || value.includeDiff === null || typeof value.includeDiff === "boolean") &&
    (value.maxDiffBytes === undefined ||
      value.maxDiffBytes === null ||
      (typeof value.maxDiffBytes === "number" &&
        Number.isSafeInteger(value.maxDiffBytes) &&
        value.maxDiffBytes >= 1 &&
        value.maxDiffBytes <= remoteRuntimeGitStatusMaxDiffBytesLimit))
  )
}

export function isRemoteRuntimeGitStatusResponse(value: unknown): value is RemoteRuntimeGitStatusResponse {
  return isRecord(value) && Array.isArray(value.repositories) && value.repositories.every(isRemoteRuntimeGitRepositoryStatus)
}

export function isRemoteRuntimeGitRepositoryStatus(value: unknown): value is RemoteRuntimeGitRepositoryStatus {
  return (
    isRecord(value) &&
    isOptionalSafeIntegerOrNull(value.ahead) &&
    isOptionalSafeIntegerOrNull(value.behind) &&
    isOptionalStringOrNull(value.branch) &&
    typeof value.diffTruncated === "boolean" &&
    isNonEmptyString(value.directoryId) &&
    isOptionalStringOrNull(value.error) &&
    Array.isArray(value.files) &&
    value.files.every(isRemoteRuntimeGitFileStatus) &&
    isOptionalStringOrNull(value.head) &&
    typeof value.isRepository === "boolean" &&
    isNonEmptyString(value.path) &&
    isOptionalStringOrNull(value.repositoryRoot) &&
    isOptionalStringOrNull(value.stagedDiff) &&
    isOptionalStringOrNull(value.unstagedDiff) &&
    isOptionalStringOrNull(value.upstream)
  )
}

export function isRemoteRuntimeGitFileStatus(value: unknown): value is RemoteRuntimeGitFileStatus {
  return (
    isRecord(value) &&
    typeof value.conflicted === "boolean" &&
    isNonEmptyString(value.path) &&
    isOptionalStringOrNull(value.renamedFrom) &&
    isGitStatusCode(value.staged) &&
    typeof value.submodule === "boolean" &&
    typeof value.untracked === "boolean" &&
    isGitStatusCode(value.unstaged)
  )
}

function isThreadGoal(value: unknown): value is ThreadGoal {
  return (
    isRecord(value) &&
    isNonEmptyString(value.threadId) &&
    typeof value.objective === "string" &&
    typeof value.status === "string" &&
    isThreadGoalStatus(value.status) &&
    (value.tokenBudget === null || (typeof value.tokenBudget === "number" && Number.isInteger(value.tokenBudget))) &&
    typeof value.tokensUsed === "number" &&
    Number.isFinite(value.tokensUsed) &&
    typeof value.timeUsedSeconds === "number" &&
    Number.isFinite(value.timeUsedSeconds) &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  )
}

function isCreateGoalInput(value: unknown): value is CreateGoalInput {
  return (
    isRecord(value) &&
    typeof value.objective === "string" &&
    (value.token_budget === undefined ||
      (typeof value.token_budget === "number" && Number.isInteger(value.token_budget)))
  )
}

function isEditGoalInput(value: unknown): value is EditGoalInput {
  return (
    isRecord(value) &&
    typeof value.objective === "string" &&
    (value.token_budget === undefined ||
      value.token_budget === null ||
      (typeof value.token_budget === "number" && Number.isInteger(value.token_budget)))
  )
}

function isUpdateGoalInput(value: unknown): value is UpdateGoalInput {
  return isRecord(value) && (value.status === "complete" || value.status === "blocked")
}

function isRemoteRuntimeChatMessageProjection(value: unknown): value is RemoteRuntimeChatMessageProjection {
  return (
    isRecord(value) &&
    isOptionalStringOrNull(value.agent) &&
    isOptionalStringOrNull(value.completedAt) &&
    isNonEmptyString(value.createdAt) &&
    isOptionalStringOrNull(value.errorMessage) &&
    isOptionalStringOrNull(value.errorName) &&
    isOptionalStringOrNull(value.finishReason) &&
    isNonEmptyString(value.id) &&
    isOptionalStringOrNull(value.model) &&
    isOptionalStringOrNull(value.parentId) &&
    Array.isArray(value.parts) &&
    value.parts.every(isRemoteRuntimeChatMessagePartProjection) &&
    (value.role === "user" || value.role === "assistant" || value.role === "system") &&
    isNonEmptyString(value.sessionId)
  )
}

function isRemoteRuntimeChatMessagePartProjection(value: unknown): value is RemoteRuntimeChatMessagePartProjection {
  return (
    isRecord(value) &&
    isOptionalStringOrNull(value.id) &&
    isNonEmptyString(value.kind) &&
    isOptionalStringOrNull(value.messageId) &&
    (value.rawPart === null || isRecord(value.rawPart)) &&
    isOptionalStringOrNull(value.status) &&
    isOptionalStringOrNull(value.text) &&
    isOptionalStringOrNull(value.title)
  )
}

function isProviderModelCommandPayload(payload: Record<string, unknown>): boolean {
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

  if (payload.command.type === "model.set") return isNonEmptyString(payload.command.model)
  if (payload.command.type === "provider.set") return isNonEmptyString(payload.command.providerId)
  return true
}

function isRemoteRuntimeSubscriptionTarget(payload: Record<string, unknown>): boolean {
  return (
    isOptionalSafeIntegerOrNull(payload.afterSequence) &&
    (isNonEmptyString(payload.sessionId) ||
      isNonEmptyString(payload.threadId) ||
      (isRecord(payload.threadRef) &&
        isNonEmptyString(payload.threadRef.providerId) &&
        isNonEmptyString(payload.threadRef.threadId)))
  )
}

function isRuntimeWebSocketInitializeResponse(payload: Record<string, unknown>): boolean {
  return (
    isNonEmptyString(payload.acceptedRuntimeApiVersion) &&
    Array.isArray(payload.attachmentCapabilities) &&
    payload.attachmentCapabilities.every(isRemoteRuntimeAttachmentCapability) &&
    Array.isArray(payload.featureCapabilities) &&
    payload.featureCapabilities.every(isRemoteRuntimeCapability) &&
    isNonEmptyString(payload.protocolVersion) &&
    isNonEmptyString(payload.serverName) &&
    isNonEmptyString(payload.serverVersion) &&
    Array.isArray(payload.supportedMethods) &&
    payload.supportedMethods.every(isRemoteRuntimeProtocolClientMethod)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string"
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isOptionalStringOrNull(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string"
}

function isOptionalSafeIntegerOrNull(value: unknown): value is number | null | undefined {
  return value === undefined || value === null || (typeof value === "number" && Number.isSafeInteger(value))
}

function isGitStatusCode(value: unknown): value is RemoteRuntimeGitFileStatus["staged"] {
  return value === null || value === "M" || value === "A" || value === "D" || value === "R" || value === "C" || value === "U" || value === "?" || value === "!"
}

function matchesExpectedRequestId(value: string, expectedRequestId?: string) {
  return expectedRequestId === undefined || value === expectedRequestId
}
