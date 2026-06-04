import { createHash, randomUUID } from "node:crypto"
import os from "node:os"
import path from "node:path"
import {
  createJsonStateStore,
  stateFilePathFromAbsolute,
  type JsonStateSchema,
  type RuntimeAccessPolicyInput,
  type StateFilePath,
} from "@interbase/cli-local-state"
import { claudeCapabilities } from "./backend.js"
import { LocalBackendError } from "./errors.js"
import type {
  LocalAgentBackend,
  LocalConversationDetail,
  LocalConversationMessage,
  LocalConversationSummary,
} from "./types.js"

const claudeStoreVersion = 1
const defaultClaudeModel = "claude-sonnet-4-5-20250929"

export interface ClaudeSdkClient {
  messages: {
    create(
      input: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ): Promise<unknown> | AsyncIterable<unknown>
  }
  models?: {
    list(input?: Record<string, unknown>): Promise<unknown> | AsyncIterable<unknown>
    retrieve?(modelId: string): Promise<unknown>
  }
}

export interface ClaudeAdapterAuth {
  apiKey?: string | null
  authToken?: string | null
}

export interface ClaudeAdapterOptions {
  accessPolicy?: RuntimeAccessPolicyInput
  createClient?: () => Promise<ClaudeSdkClient> | ClaudeSdkClient
  maxTokens?: number
  now?: () => string
  resolveAuth?: () => Promise<ClaudeAdapterAuth | null | undefined> | ClaudeAdapterAuth | null | undefined
  stateDirectory?: string
  stateFilePath?: StateFilePath
}

interface ClaudeConversationRecord extends LocalConversationSummary {
  directory: string
  messages: LocalConversationMessage[]
}

interface ClaudeStoreFile {
  conversations: ClaudeConversationRecord[]
  version: typeof claudeStoreVersion
}

const claudeStoreSchema: JsonStateSchema<ClaudeStoreFile> = {
  parse(value) {
    if (!isRecord(value) || value.version !== claudeStoreVersion || !Array.isArray(value.conversations)) {
      throw new Error("invalid schema")
    }
    const conversations = value.conversations.flatMap(normalizeStoredConversation)
    if (conversations.length !== value.conversations.length) throw new Error("invalid schema")
    return { conversations, version: claudeStoreVersion }
  },
}

export function createClaudeAdapter(options: ClaudeAdapterOptions = {}): LocalAgentBackend<unknown> {
  const now = options.now ?? (() => new Date().toISOString())
  const stateDirectory = options.stateDirectory ?? path.join(os.homedir(), ".interbase", "mobile-claude")
  const storePath = options.stateFilePath ?? stateFilePathFromAbsolute(path.join(stateDirectory, "conversations.json"))
  const storeState = createJsonStateStore<ClaudeStoreFile>({
    accessPolicy: options.accessPolicy ?? { kind: "production" },
    concurrency: "multiProcess",
    defaultValue: () => ({ conversations: [], version: claudeStoreVersion }),
    kind: "Claude conversation continuity state",
    path: storePath,
    recoverability: "failClosed",
    schema: claudeStoreSchema,
    version: claudeStoreVersion,
  })
  const maxTokens = options.maxTokens ?? 4096
  let clientPromise: Promise<ClaudeSdkClient> | null = null
  let modelOptionsPromise: Promise<Awaited<ReturnType<typeof loadModelOptions>>> | null = null

  async function client() {
    const next =
      clientPromise ??
      (async () => {
        if (options.createClient) return await options.createClient()
        const mod = (await import("@anthropic-ai/sdk")) as unknown as {
          default?: new (options?: ClaudeAdapterAuth) => ClaudeSdkClient
          Anthropic?: new (options?: ClaudeAdapterAuth) => ClaudeSdkClient
        }
        const Anthropic = mod.default ?? mod.Anthropic
        return new Anthropic!(compactAuth(await options.resolveAuth?.()))
      })()
    clientPromise = next
    try {
      return await next
    } catch (error) {
      if (clientPromise === next) clientPromise = null
      throw error
    }
  }

  async function checkAvailability() {
    try {
      await client()
      return { available: true, unavailableReason: null }
    } catch (error) {
      return {
        available: false,
        unavailableReason: error instanceof Error ? error.message : "Anthropic SDK unavailable",
      }
    }
  }

  async function readStore(): Promise<ClaudeStoreFile> {
    return await storeState.read()
  }

  async function putConversation(next: ClaudeConversationRecord) {
    return await storeState
      .update((store) => {
        const normalizedNext = withClaudeSummaryStats(next)
        const conversations = store.conversations.filter((conversation) => conversation.id !== normalizedNext.id)
        conversations.push(normalizedNext)
        return { conversations, version: claudeStoreVersion }
      })
      .then((store) => {
        const conversation = store.conversations.find((candidate) => candidate.id === next.id)
        if (!conversation)
          throw new LocalBackendError(
            `Claude conversation not found after persistence: ${next.id}.`,
            "CONVERSATION_NOT_FOUND",
            "claude",
          )
        return conversation
      })
  }

  async function getConversation(conversationId: string, directory?: string | null) {
    return (
      (await readStore()).conversations.find((conversation) => {
        return conversation.id === conversationId && (!directory || conversation.directory === directory)
      }) ?? null
    )
  }

  async function requireConversation(conversationId: string, directory?: string | null) {
    const conversation = await getConversation(conversationId, directory)
    if (!conversation)
      throw new LocalBackendError(
        `Claude conversation not found: ${conversationId}.`,
        "CONVERSATION_NOT_FOUND",
        "claude",
      )
    return conversation
  }

  async function createAssistantMessage(input: { conversation: ClaudeConversationRecord; signal?: AbortSignal }) {
    const response = await (
      await client()
    ).messages.create(
      {
        max_tokens: maxTokens,
        messages: conversationMessagesForClaude(input.conversation.messages),
        model: input.conversation.model ?? defaultClaudeModel,
      },
      { signal: input.signal },
    )
    if (isAsyncIterable(response) || !isRecord(response)) {
      throw new LocalBackendError(
        "Anthropic SDK returned an invalid message response.",
        "BACKEND_UNAVAILABLE",
        "claude",
      )
    }
    return anthropicMessageToLocalMessage(response, input.conversation.id, now())
  }

  async function modelOptions() {
    const next = modelOptionsPromise ?? loadModelOptions()
    modelOptionsPromise = next
    try {
      const models = await next
      if (!models.some((model) => model.available) && modelOptionsPromise === next) modelOptionsPromise = null
      return models
    } catch (error) {
      if (modelOptionsPromise === next) modelOptionsPromise = null
      throw error
    }
  }

  async function loadModelOptions() {
    const checked = await checkAvailability()
    if (!checked.available) {
      return [
        {
          available: false,
          backendId: "claude" as const,
          capabilities: claudeCapabilities,
          displayName: "Claude",
          id: defaultClaudeModel,
          providerId: "anthropic",
          providerName: "Anthropic",
          unavailableReason: checked.unavailableReason,
        },
      ]
    }

    let sdkModels: { id: string; name: string }[]
    try {
      sdkModels = await listAnthropicModels(await client())
    } catch (error) {
      return [
        {
          available: false,
          backendId: "claude" as const,
          capabilities: claudeCapabilities,
          displayName: "Claude",
          id: defaultClaudeModel,
          providerId: "anthropic",
          providerName: "Anthropic",
          unavailableReason: error instanceof Error ? error.message : "Anthropic model listing unavailable",
        },
      ]
    }
    return sdkModels.map((model) => ({
      available: true,
      backendId: "claude" as const,
      capabilities: claudeCapabilities,
      displayName: model.name,
      id: model.id,
      providerId: "anthropic",
      providerName: "Anthropic",
      unavailableReason: null,
    }))
  }

  async function retrieveModel(modelId: string) {
    let retrieved: unknown
    try {
      retrieved = await (await client()).models?.retrieve?.(modelId)
    } catch (error) {
      throw new LocalBackendError(
        `Anthropic model is unavailable: ${error instanceof Error ? error.message : "requested model is not available"}.`,
        "CAPABILITY_UNAVAILABLE",
        "claude",
      )
    }
    if (!isRecord(retrieved) || typeof retrieved.id !== "string") return null
    return {
      available: true,
      backendId: "claude" as const,
      capabilities: claudeCapabilities,
      displayName:
        typeof retrieved.display_name === "string"
          ? retrieved.display_name
          : typeof retrieved.name === "string"
            ? retrieved.name
            : retrieved.id,
      id: retrieved.id,
      providerId: "anthropic",
      providerName: "Anthropic",
      unavailableReason: null,
    }
  }

  async function selectedClaudeModel(input: { model?: string | null; providerId?: string | null }) {
    if (input.providerId && input.providerId !== "anthropic") {
      throw new LocalBackendError("Claude only supports Anthropic models.", "CAPABILITY_UNAVAILABLE", "claude")
    }
    const models = await modelOptions()
    const selected = input.model
      ? (models.find((model) => model.id === input.model && model.providerId === "anthropic") ??
        (await retrieveModel(input.model)))
      : (models.find((model) => model.available) ?? models[0])
    if (!selected?.available)
      throw new LocalBackendError(
        `${selected?.providerName ?? "Anthropic"} is unavailable: ${selected?.unavailableReason ?? "requested model is not available"}.`,
        "CAPABILITY_UNAVAILABLE",
        "claude",
      )
    return selected
  }

  return {
    backendId: "claude",
    async capabilities() {
      return claudeCapabilities
    },
    async createConversation(input) {
      const model = await selectedClaudeModel(input)
      const timestamp = now()
      const id = `claude_${randomUUID()}`
      return await putConversation({
        backendConversationId: id,
        backendId: "claude",
        continuation: { claudeConversationId: id },
        createdAt: timestamp,
        directory: input.directory,
        hasActiveTurn: false,
        id,
        messages: [],
        model: model.id,
        providerId: model.providerId,
        providerName: model.providerName,
        status: "idle",
        title: input.title ?? "Claude conversation",
        updatedAt: timestamp,
      })
    },
    async listConversations(input) {
      return (await readStore()).conversations
        .filter((conversation) => conversation.directory === input.directory)
        .map(({ directory: _directory, messages: _messages, ...conversation }) => conversation)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async listModels() {
      return await modelOptions()
    },
    async findConversation(input) {
      const conversation = await getConversation(input.conversationId, input.directory)
      if (!conversation) return null
      const { directory: _directory, messages: _messages, ...summary } = conversation
      return summary
    },
    async readConversation(input): Promise<LocalConversationDetail> {
      const conversation = await requireConversation(input.conversationId, input.directory)
      return {
        ...conversation,
        capabilities: claudeCapabilities,
      }
    },
    async sendMessage(input) {
      const conversation = await requireConversation(input.conversationId, input.directory)
      const userMessage = textMessage({
        conversationId: conversation.id,
        createdAt: now(),
        id: `msg_${randomUUID()}`,
        role: "user",
        text: input.content,
      })
      const pendingConversation = await putConversation({
        ...conversation,
        messages: [...conversation.messages, userMessage],
        status: "running",
        updatedAt: userMessage.createdAt,
      })
      try {
        const assistant = await createAssistantMessage({ conversation: pendingConversation })
        await putConversation({
          ...pendingConversation,
          messages: [...pendingConversation.messages, assistant],
          status: "idle",
          title: titleFromMessages(pendingConversation.title, pendingConversation.messages),
          updatedAt: assistant.completedAt ?? assistant.createdAt,
        })
        return { message: assistant, messageId: assistant.id }
      } catch (error) {
        const failedAt = now()
        await putConversation({ ...pendingConversation, status: "error", updatedAt: failedAt })
        throw error
      }
    },
    async *streamConversation(input) {
      const conversation = await requireConversation(input.conversationId, input.directory)
      const runningConversation = await putConversation({ ...conversation, status: "running", updatedAt: now() })
      let text = ""
      const messageId = `msg_${randomUUID()}`
      const partId = `${messageId}:text`
      try {
        if (input.signal?.aborted) {
          await putConversation({ ...runningConversation, status: "interrupted", updatedAt: now() })
          return
        }
        const stream = await (
          await client()
        ).messages.create(
          {
            max_tokens: maxTokens,
            messages: conversationMessagesForClaude(runningConversation.messages),
            model: runningConversation.model ?? defaultClaudeModel,
            stream: true,
          },
          { signal: input.signal },
        )
        if (!isAsyncIterable(stream)) {
          throw new LocalBackendError(
            "Anthropic SDK returned an invalid streaming response.",
            "BACKEND_UNAVAILABLE",
            "claude",
          )
        }
        yield {
          backendId: "claude",
          conversationId: runningConversation.id,
          messageId,
          partId,
          timestamp: now(),
          type: "message.started",
        }
        for await (const event of stream) {
          if (input.signal?.aborted) {
            await putConversation({ ...runningConversation, status: "interrupted", updatedAt: now() })
            return
          }
          const delta = anthropicStreamTextDelta(event)
          if (delta) {
            text += delta
            yield {
              backendId: "claude",
              conversationId: runningConversation.id,
              messageId,
              partId,
              rawEvent: isRecord(event) ? event : { event },
              textDelta: delta,
              timestamp: now(),
              type: "message.delta",
            }
            continue
          }
          yield {
            backendId: "claude",
            conversationId: runningConversation.id,
            rawEvent: isRecord(event) ? event : { event },
            timestamp: now(),
            type: "conversation.updated",
          }
        }
        if (text.length === 0) {
          throw new LocalBackendError(
            "Anthropic SDK streaming response completed without text content.",
            "BACKEND_UNAVAILABLE",
            "claude",
          )
        }
        const assistant = textMessage({
          conversationId: runningConversation.id,
          createdAt: now(),
          id: messageId,
          model: runningConversation.model,
          role: "assistant",
          text,
        })
        await putConversation({
          ...runningConversation,
          messages: [...runningConversation.messages, assistant],
          status: "idle",
          updatedAt: assistant.completedAt ?? assistant.createdAt,
        })
        yield {
          backendId: "claude",
          conversationId: runningConversation.id,
          messageId,
          partId,
          timestamp: now(),
          type: "message.completed",
        }
        yield { backendId: "claude", conversationId: runningConversation.id, timestamp: now(), type: "turn.completed" }
      } catch (error) {
        await putConversation({ ...runningConversation, status: "error", updatedAt: now() })
        throw error
      }
    },
    async updateConversationModel(input) {
      const conversation = await requireConversation(input.conversationId, input.directory)
      const model = await selectedClaudeModel(input)
      return await putConversation({
        ...conversation,
        model: model.id,
        providerId: model.providerId,
        providerName: model.providerName,
        updatedAt: now(),
      })
    },
  }
}

async function listAnthropicModels(client: ClaudeSdkClient) {
  if (!client.models?.list)
    throw new LocalBackendError("Anthropic SDK model listing is unavailable.", "BACKEND_UNAVAILABLE", "claude")
  const listed = client.models.list({ limit: 100 })
  if (isAsyncIterable(listed)) return await asyncIterableToModels(listed)
  const response = await listed
  if (isAsyncIterable(response)) return await asyncIterableToModels(response)
  const data =
    isRecord(response) && Array.isArray(response.data) ? response.data : Array.isArray(response) ? response : []
  return recordsToModels(data)
}

async function asyncIterableToModels(models: AsyncIterable<unknown>) {
  const values: unknown[] = []
  for await (const model of models) values.push(model)
  return recordsToModels(values)
}

function recordsToModels(data: unknown[]) {
  return data.flatMap((model): { id: string; name: string }[] => {
    if (!isRecord(model) || typeof model.id !== "string") return []
    return [
      {
        id: model.id,
        name:
          typeof model.display_name === "string"
            ? model.display_name
            : typeof model.name === "string"
              ? model.name
              : model.id,
      },
    ]
  })
}

function normalizeStoredConversation(value: unknown): ClaudeConversationRecord[] {
  if (
    !isRecord(value) ||
    value.backendId !== "claude" ||
    typeof value.id !== "string" ||
    typeof value.directory !== "string"
  )
    return []
  const timestamp = typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString()
  return [
    withClaudeSummaryStats({
      backendConversationId: typeof value.backendConversationId === "string" ? value.backendConversationId : value.id,
      backendId: "claude",
      continuation: isRecord(value.continuation)
        ? (value.continuation as Record<string, boolean | number | string | null>)
        : { claudeConversationId: value.id },
      createdAt: timestamp,
      directory: value.directory,
      hasActiveTurn: value.hasActiveTurn === true,
      id: value.id,
      messages: Array.isArray(value.messages) ? value.messages.flatMap(normalizeStoredMessage) : [],
      model: typeof value.model === "string" ? value.model : defaultClaudeModel,
      providerId: typeof value.providerId === "string" ? value.providerId : "anthropic",
      providerName: typeof value.providerName === "string" ? value.providerName : "Anthropic",
      status:
        value.status === "running" ||
        value.status === "error" ||
        value.status === "closed" ||
        value.status === "interrupted"
          ? value.status
          : "idle",
      title: typeof value.title === "string" ? value.title : value.id,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : timestamp,
    }),
  ]
}

function withClaudeSummaryStats(conversation: ClaudeConversationRecord): ClaudeConversationRecord {
  return {
    ...conversation,
    lastText: conversation.messages.at(-1)?.parts.find((part) => part.text)?.text ?? null,
    messageCount: conversation.messages.length,
  }
}

function compactAuth(auth: ClaudeAdapterAuth | null | undefined) {
  if (!auth) return undefined
  const compacted = {
    ...(auth.apiKey ? { apiKey: auth.apiKey } : {}),
    ...(auth.authToken ? { authToken: auth.authToken } : {}),
  }
  return Object.keys(compacted).length > 0 ? compacted : undefined
}

function normalizeStoredMessage(value: unknown): LocalConversationMessage[] {
  if (!isRecord(value) || typeof value.id !== "string") return []
  const role = value.role === "assistant" || value.role === "system" || value.role === "user" ? value.role : null
  if (!role) return []
  return [
    {
      backendMetadata: isRecord(value.backendMetadata) ? value.backendMetadata : null,
      completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
      createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date(0).toISOString(),
      errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : null,
      errorName: typeof value.errorName === "string" ? value.errorName : null,
      finishReason: typeof value.finishReason === "string" ? value.finishReason : null,
      id: value.id,
      model: typeof value.model === "string" ? value.model : null,
      parentId: typeof value.parentId === "string" ? value.parentId : null,
      parts: Array.isArray(value.parts)
        ? value.parts.flatMap((part) =>
            isRecord(part)
              ? [
                  {
                    id: typeof part.id === "string" ? part.id : null,
                    kind: typeof part.kind === "string" ? part.kind : "text",
                    rawPart: localPartPayload(part.rawPart),
                    status: typeof part.status === "string" ? part.status : null,
                    text: typeof part.text === "string" ? part.text : null,
                    title: typeof part.title === "string" ? part.title : null,
                  },
                ]
              : [],
          )
        : [],
      role,
    },
  ]
}

function conversationMessagesForClaude(messages: LocalConversationMessage[]) {
  return messages.flatMap((message) => {
    if (message.role !== "assistant" && message.role !== "user") return []
    const text = message.parts
      .map((part) => part.text)
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join("\n")
    return text.length > 0 ? [{ content: text, role: message.role }] : []
  })
}

function anthropicMessageToLocalMessage(
  response: unknown,
  conversationId: string,
  timestamp: string,
): LocalConversationMessage {
  const responseRecord = isRecord(response) ? response : {}
  const text = anthropicContentText(responseRecord.content)
  if (text.length === 0) {
    throw new LocalBackendError(
      "Anthropic SDK returned a message response without text content.",
      "BACKEND_UNAVAILABLE",
      "claude",
    )
  }
  return {
    backendMetadata: { claudeMessageId: typeof responseRecord.id === "string" ? responseRecord.id : null },
    completedAt: timestamp,
    createdAt: timestamp,
    errorMessage: null,
    errorName: null,
    finishReason: typeof responseRecord.stop_reason === "string" ? responseRecord.stop_reason : null,
    id:
      typeof responseRecord.id === "string"
        ? responseRecord.id
        : claudeProjectionId(conversationId, timestamp, responseRecord),
    model: typeof responseRecord.model === "string" ? responseRecord.model : null,
    parentId: null,
    parts: [{ id: null, kind: "text", rawPart: { text, type: "text" }, status: null, text, title: null }],
    role: "assistant",
  }
}

function localPartPayload(value: unknown) {
  if (!isRecord(value) || value.type !== "text") return null
  return typeof value.text === "string" ? { text: value.text, type: "text" as const } : { type: "text" as const }
}

function anthropicContentText(content: unknown) {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .flatMap((part) => {
      if (!isRecord(part)) return []
      return part.type === "text" && typeof part.text === "string" ? [part.text] : []
    })
    .join("\n")
}

function textMessage(input: {
  conversationId: string
  createdAt: string
  id: string
  model?: string | null
  role: "assistant" | "user"
  text: string
}): LocalConversationMessage {
  return {
    backendMetadata: { claudeConversationId: input.conversationId },
    completedAt: input.role === "assistant" ? input.createdAt : null,
    createdAt: input.createdAt,
    errorMessage: null,
    errorName: null,
    finishReason: null,
    id: input.id,
    model: input.model ?? null,
    parentId: null,
    parts: [
      {
        id: `${input.id}:text`,
        kind: "text",
        rawPart: { text: input.text, type: "text" },
        status: null,
        text: input.text,
        title: null,
      },
    ],
    role: input.role,
  }
}

function titleFromMessages(currentTitle: string, messages: LocalConversationMessage[]) {
  if (currentTitle !== "Claude conversation") return currentTitle
  const firstUserText = messages.find((message) => message.role === "user")?.parts.find((part) => part.text)?.text
  return firstUserText ? firstUserText.slice(0, 80) : currentTitle
}

function anthropicStreamTextDelta(event: unknown) {
  if (!isRecord(event)) return null
  if (
    event.type === "content_block_delta" &&
    isRecord(event.delta) &&
    event.delta.type === "text_delta" &&
    typeof event.delta.text === "string"
  )
    return event.delta.text
  if (typeof event.text === "string") return event.text
  if (typeof event.delta === "string") return event.delta
  return null
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return isRecord(value) && typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function"
}

function claudeProjectionId(conversationId: string, createdAt: string, payload: Record<string, unknown>) {
  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)
  return `${conversationId}:${createdAt}:${hash}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
