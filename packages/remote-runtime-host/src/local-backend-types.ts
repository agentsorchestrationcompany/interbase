import type {
  RemoteRuntimeActiveChatsListPayload,
  RemoteRuntimeActiveChatMetadataProjection,
  RemoteRuntimeChatMessageProjection,
  RemoteRuntimeChatMessagePartPayload,
  RemoteRuntimeChatMessagesPayload,
  RemoteRuntimeChatMessagesResponse,
  RemoteRuntimeSendMessageResponse,
  RuntimeWebSocketChatStartPayload,
  RuntimeWebSocketChatStartResponse,
} from "@interbase/remote-runtime-contracts"
import type {
  RuntimeProviderListResponse,
  RuntimeWebSocketSessionMessagePayload,
  RuntimeWebSocketSessionUpdatePayload,
} from "@interbase/runtime-protocol"

export const localBackendIdValues = ["interbaseRuntime", "codex", "claude"] as const

export type LocalBackendId = (typeof localBackendIdValues)[number]

export type LocalConversationStatus = "closed" | "error" | "idle" | "interrupted" | "running"

export type LocalConversationRole = "assistant" | "system" | "user"

export type LocalConversationEventType =
  | "conversation.created"
  | "conversation.updated"
  | "message.started"
  | "message.delta"
  | "message.completed"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "turn.completed"
  | "error"

export interface LocalBackendCapabilities {
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

export interface LocalConversationContentPart {
  id: string | null
  kind: string
  rawPart?: RemoteRuntimeChatMessagePartPayload | null
  status?: string | null
  text?: string | null
  title?: string | null
}

export interface LocalConversationMessage {
  backendMetadata?: Record<string, unknown> | null
  completedAt?: string | null
  createdAt: string
  errorMessage?: string | null
  errorName?: string | null
  finishReason?: string | null
  id: string
  model?: string | null
  parentId?: string | null
  parts: LocalConversationContentPart[]
  role: LocalConversationRole
}

export interface LocalConversationSummary {
  backendConversationId: string
  backendId: LocalBackendId
  continuation?: Record<string, boolean | number | string | null> | null
  createdAt: string
  hasActiveTurn?: boolean | null
  id: string
  lastText?: string | null
  messageCount?: number | null
  model: string | null
  providerId: string | null
  providerName: string | null
  status: LocalConversationStatus
  title: string
  updatedAt: string
}

export interface LocalConversationDetail extends LocalConversationSummary {
  capabilities: LocalBackendCapabilities
  messages: LocalConversationMessage[]
}

export interface LocalConversationEvent {
  backendId: LocalBackendId
  conversationId: string
  messageId?: string | null
  partId?: string | null
  rawEvent?: Record<string, unknown> | null
  textDelta?: string | null
  timestamp: string
  type: LocalConversationEventType
}

export interface LocalModelOption {
  available: boolean
  backendId: LocalBackendId
  capabilities: LocalBackendCapabilities
  displayName: string
  id: string
  providerId: string
  providerName: string
  unavailableReason?: string | null
}

export interface LocalBackendOperationInput<Context> {
  context: Context
  directory: string
}

export interface LocalAgentBackend<Context = unknown> {
  readonly backendId: LocalBackendId
  capabilities(input: { directory: string; context?: Context | null }): Promise<LocalBackendCapabilities>
  createConversation(
    input: LocalBackendOperationInput<Context> & {
      directoryId?: string | null
      model?: string | null
      providerId?: string | null
      title?: string | null
    },
  ): Promise<LocalConversationSummary>
  listConversations(input: LocalBackendOperationInput<Context>): Promise<LocalConversationSummary[]>
  listModels(input: { directory: string; context?: Context | null }): Promise<LocalModelOption[]>
  findConversation?(
    input: LocalBackendOperationInput<Context> & {
      conversationId: string
    },
  ): Promise<LocalConversationSummary | null>
  readConversation(
    input: LocalBackendOperationInput<Context> & {
      conversationId: string
    },
  ): Promise<LocalConversationDetail>
  sendMessage(
    input: LocalBackendOperationInput<Context> & {
      content: string
      conversationId: string
    },
  ): Promise<{ message?: LocalConversationMessage | null; messageId?: string | null }>
  streamConversation(
    input: LocalBackendOperationInput<Context> & {
      conversationId: string
      signal?: AbortSignal
    },
  ): AsyncIterable<LocalConversationEvent>
  updateConversationModel?(
    input: LocalBackendOperationInput<Context> & {
      conversationId: string
      model: string
      providerId?: string | null
    },
  ): Promise<LocalConversationSummary>
}

export interface LocalBackendRuntimeBridge<Context> {
  listActiveChats(
    context: Context,
    payload?: RemoteRuntimeActiveChatsListPayload,
  ): Promise<RemoteRuntimeActiveChatMetadataProjection[]>
  listProviders(context: Context): Promise<RuntimeProviderListResponse>
  readSession(
    context: Context,
    payload: { sessionId: string },
  ): Promise<RemoteRuntimeActiveChatMetadataProjection | null>
  listSessionMessages(
    context: Context,
    payload: RemoteRuntimeChatMessagesPayload,
  ): Promise<RemoteRuntimeChatMessagesResponse>
  sendSessionMessage(
    context: Context,
    payload: RuntimeWebSocketSessionMessagePayload,
  ): Promise<RemoteRuntimeSendMessageResponse>
  startChat(context: Context, payload: RuntimeWebSocketChatStartPayload): Promise<RuntimeWebSocketChatStartResponse>
  updateSession(context: Context, payload: RuntimeWebSocketSessionUpdatePayload): Promise<unknown>
}

export interface LocalRoutingMetadataRecord {
  backendConversationId: string
  backendId: LocalBackendId
  conversationId: string
  createdAt: string
  directory: string
  title: string | null
  updatedAt: string
}

export interface LocalRoutingMetadataStore {
  get(input: { conversationId: string; directory: string }): Promise<LocalRoutingMetadataRecord | null>
  list(input: { directory: string }): Promise<LocalRoutingMetadataRecord[]>
  put(record: LocalRoutingMetadataRecord): Promise<void>
}

export interface LocalAgentBackendRouter<Context> {
  createConversation(input: {
    context: Context
    directory: string
    directoryId?: string | null
    model?: string | null
    providerId?: string | null
    title?: string | null
  }): Promise<LocalConversationSummary>
  listConversations(input: { context: Context; directory: string }): Promise<LocalConversationSummary[]>
  listAgents(input: { context: Context; directory: string }): Promise<{ agents: unknown[] }>
  listModels(input: { context: Context; directory: string }): Promise<LocalModelOption[]>
  readConversation(input: {
    context: Context
    conversationId: string
    directory: string
  }): Promise<LocalConversationDetail>
  sendMessage(input: {
    context: Context
    content: string
    conversationId: string
    directory: string
  }): Promise<{ message?: LocalConversationMessage | null; messageId?: string | null }>
  updateConversationModel(input: {
    context: Context
    conversationId: string
    directory: string
    model: string
    providerId?: string | null
  }): Promise<LocalConversationSummary>
}
