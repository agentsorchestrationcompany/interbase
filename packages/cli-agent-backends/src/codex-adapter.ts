import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { codexCapabilities } from "./backend.js"
import { LocalBackendError } from "./errors.js"
import type {
  LocalAgentBackend,
  LocalConversationEvent,
  LocalConversationMessage,
  LocalConversationSummary,
} from "./types.js"

export interface CodexSdkClient {
  resumeThread(threadId: string): CodexSdkThread
  startThread(options?: { skipGitRepoCheck?: boolean; workingDirectory?: string }): CodexSdkThread
}

export interface CodexSdkThread {
  id?: string
  threadId?: string
  run(input: string): Promise<{ finalResponse?: string | null; items?: unknown[] }>
  runStreamed(input: string): Promise<{ events: AsyncIterable<Record<string, unknown>> }>
}

export interface CodexAdapterOptions {
  codexHome?: string
  createClient?: () => Promise<CodexSdkClient> | CodexSdkClient
  now?: () => string
}

export function createCodexAdapter(options: CodexAdapterOptions = {}): LocalAgentBackend<unknown> {
  const now = options.now ?? (() => new Date().toISOString())
  const codexHome = options.codexHome ?? path.join(os.homedir(), ".codex")
  let availability: Promise<{ available: boolean; unavailableReason: string | null }> | null = null

  async function client() {
    if (options.createClient) return await options.createClient()
    const mod = (await import("@openai/codex-sdk")) as { Codex: new () => CodexSdkClient }
    return new mod.Codex()
  }

  async function threadIdFrom(thread: CodexSdkThread) {
    const threadId = thread.threadId ?? thread.id
    if (!threadId)
      throw new LocalBackendError("Codex SDK did not return a persisted thread id.", "BACKEND_UNAVAILABLE", "codex")
    return threadId
  }

  async function checkAvailability() {
    availability ??= (async () => {
      try {
        await client()
        return { available: true, unavailableReason: null }
      } catch (error) {
        return {
          available: false,
          unavailableReason: error instanceof Error ? error.message : "Codex SDK unavailable",
        }
      }
    })()
    return availability
  }

  return {
    backendId: "codex",
    async capabilities() {
      return codexCapabilities
    },
    async createConversation(input) {
      const thread = (await client()).startThread({ skipGitRepoCheck: true, workingDirectory: input.directory })
      const id = await threadIdFrom(thread)
      return {
        backendConversationId: id,
        backendId: "codex",
        continuation: { codexThreadId: id },
        createdAt: now(),
        id,
        model: input.model ?? "codex",
        providerId: input.providerId ?? "codex",
        providerName: "Codex",
        status: "idle",
        title: input.title ?? "Codex conversation",
        updatedAt: now(),
      }
    },
    async listConversations(input) {
      return await listCodexConversations({ codexHome, directory: input.directory, now })
    },
    async listModels() {
      const checked = await checkAvailability()
      return [
        {
          available: checked.available,
          backendId: "codex",
          capabilities: codexCapabilities,
          displayName: "Codex",
          id: "codex",
          providerId: "codex",
          providerName: "Codex",
          unavailableReason: checked.unavailableReason,
        },
      ]
    },
    async readConversation(input) {
      const conversation = await readCodexConversation({
        codexHome,
        directory: input.directory,
        now,
        threadId: input.conversationId,
      })
      return {
        backendConversationId: input.conversationId,
        backendId: "codex",
        capabilities: codexCapabilities,
        continuation: { codexThreadId: input.conversationId },
        createdAt: conversation?.createdAt ?? now(),
        id: input.conversationId,
        messages: conversation?.messages ?? [],
        model: "codex",
        providerId: "codex",
        providerName: "Codex",
        status: "idle",
        title: conversation?.title ?? input.conversationId,
        updatedAt: conversation?.updatedAt ?? now(),
      }
    },
    async sendMessage(input) {
      const turn = await (await client()).resumeThread(input.conversationId).run(input.content)
      const messageId = stringField(turn, "id") ?? `${input.conversationId}:latest`
      return {
        message:
          typeof turn.finalResponse === "string" && turn.finalResponse.length > 0
            ? {
                backendMetadata: { codexItemsAvailable: Array.isArray(turn.items) },
                completedAt: now(),
                createdAt: now(),
                errorMessage: null,
                errorName: null,
                finishReason: null,
                id: messageId,
                model: null,
                parentId: null,
                parts: [{ id: null, kind: "text", rawPart: null, status: null, text: turn.finalResponse, title: null }],
                role: "assistant",
              }
            : null,
        messageId,
      }
    },
    async *streamConversation(input) {
      const streamed = await (await client()).resumeThread(input.conversationId).runStreamed("")
      for await (const event of streamed.events) {
        if (input.signal?.aborted) return
        yield normalizeCodexEvent(event, input.conversationId, now())
      }
    },
  }
}

export async function readCodexThreadMessages(input: {
  codexHome: string
  threadId: string
}): Promise<LocalConversationMessage[]> {
  return (await readCodexConversation({ ...input, now: () => new Date().toISOString() }))?.messages ?? []
}

export async function listCodexConversations(input: {
  codexHome: string
  directory?: string | null
  now?: () => string
}): Promise<LocalConversationSummary[]> {
  const conversations = await readCodexConversationFiles(input)
  return conversations
    .filter((conversation) => !input.directory || !conversation.directory || conversation.directory === input.directory)
    .map(({ directory: _directory, messages: _messages, ...conversation }) => conversation)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

async function readCodexConversation(input: {
  codexHome: string
  directory?: string | null
  now: () => string
  threadId: string
}): Promise<CodexConversationRecord | null> {
  return (
    (await readCodexConversationFiles(input)).find(
      (conversation) =>
        conversation.id === input.threadId &&
        (!input.directory || !conversation.directory || conversation.directory === input.directory),
    ) ?? null
  )
}

async function readCodexConversationFiles(input: {
  codexHome: string
  directory?: string | null
  now?: () => string
}): Promise<CodexConversationRecord[]> {
  const now = input.now ?? (() => new Date().toISOString())
  return (
    await Promise.all(
      (await codexSessionFiles(path.join(input.codexHome, "sessions"))).map(async (file) => {
        const text = await readFile(file, "utf8")
        return codexFileToConversations(text, now)
      }),
    )
  ).flat()
}

interface CodexConversationRecord extends LocalConversationSummary {
  directory: string | null
  messages: LocalConversationMessage[]
}

function codexFileToConversations(text: string, now: () => string): CodexConversationRecord[] {
  let metadata: { createdAt: string | null; directory: string | null; threadId: string } | null = null
  const legacyMessages: LocalConversationMessage[] = []
  const sessionMessages: LocalConversationMessage[] = []
  const lines = text.split("\n")

  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue
    let record: unknown
    try {
      record = JSON.parse(line)
    } catch {
      continue
    }
    if (!isRecord(record)) continue

    const sessionMetadata = codexSessionMetadata(record)
    if (sessionMetadata) {
      metadata = sessionMetadata
      continue
    }

    if (metadata) {
      const message = codexSessionRecordToMessage(record, metadata.threadId, index)
      if (message) sessionMessages.push(message)
      const eventMessage = codexSessionEventToMessage(record, metadata.threadId, index)
      if (eventMessage) sessionMessages.push(eventMessage)
      continue
    }

    const threadId = codexRecordThreadId(record)
    if (!threadId) continue
    legacyMessages.push(...codexRecordToMessage(record, threadId, index))
  }

  if (metadata) {
    return [
      codexConversationFromMessages({
        createdAt: metadata.createdAt ?? sessionMessages[0]?.createdAt ?? now(),
        directory: metadata.directory,
        messages: sessionMessages,
        threadId: metadata.threadId,
        title: metadata.threadId,
        updatedAt: sessionMessages.at(-1)?.createdAt ?? metadata.createdAt ?? now(),
      }),
    ]
  }

  const byThread = new Map<string, LocalConversationMessage[]>()
  for (const message of legacyMessages) {
    const threadId = typeof message.backendMetadata?.threadId === "string" ? message.backendMetadata.threadId : null
    if (!threadId) continue
    byThread.set(threadId, [...(byThread.get(threadId) ?? []), message])
  }
  return [...byThread].map(([threadId, messages]) =>
    codexConversationFromMessages({
      createdAt: messages[0]?.createdAt ?? now(),
      directory: null,
      messages,
      threadId,
      title: threadId,
      updatedAt: messages.at(-1)?.createdAt ?? now(),
    }),
  )
}

function codexConversationFromMessages(input: {
  createdAt: string
  directory: string | null
  messages: LocalConversationMessage[]
  threadId: string
  title: string
  updatedAt: string
}): CodexConversationRecord {
  const hasUserMessageEvents = input.messages.some(
    (message) => message.role === "user" && message.backendMetadata?.codexUserMessageAuthority === "event_msg",
  )
  const messages = input.messages
    .filter(
      (message) =>
        !hasUserMessageEvents ||
        message.role !== "user" ||
        message.backendMetadata?.codexUserMessageAuthority === "event_msg",
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const lastText =
    [...messages]
      .reverse()
      .flatMap((message) =>
        message.parts.flatMap((part) =>
          typeof part.text === "string" && part.text.trim().length > 0 ? [part.text.trim()] : [],
        ),
      )
      .at(0) ?? null
  const firstUserText = messages
    .find((message) => message.role === "user")
    ?.parts.flatMap((part) => (typeof part.text === "string" && part.text.trim().length > 0 ? [part.text.trim()] : []))
    .at(0)
  const title = firstUserText ? codexConversationTitle(firstUserText) : input.title
  return {
    backendConversationId: input.threadId,
    backendId: "codex",
    continuation: { codexThreadId: input.threadId },
    createdAt: input.createdAt,
    directory: input.directory,
    id: input.threadId,
    messages,
    lastText,
    messageCount: messages.length,
    model: "codex",
    providerId: "codex",
    providerName: "Codex",
    status: "idle",
    title,
    updatedAt: input.updatedAt,
  }
}

function codexConversationTitle(text: string) {
  const singleLine = text.replace(/\s+/g, " ").trim()
  return singleLine.length > 80 ? `${singleLine.slice(0, 77)}...` : singleLine
}

function codexSessionMetadata(record: Record<string, unknown>) {
  if (record.type !== "session_meta" || !isRecord(record.payload)) return null
  const threadId = typeof record.payload.id === "string" ? record.payload.id : null
  if (!threadId) return null
  return {
    createdAt:
      typeof record.payload.timestamp === "string" ? record.payload.timestamp : stringField(record, "timestamp"),
    directory: typeof record.payload.cwd === "string" ? record.payload.cwd : null,
    threadId,
  }
}

function codexSessionRecordToMessage(
  record: Record<string, unknown>,
  threadId: string,
  index: number,
): LocalConversationMessage | null {
  if (record.type !== "response_item" || !isRecord(record.payload)) return null
  const payload = record.payload
  if (payload.type !== "message") return null
  const role =
    payload.role === "assistant" || payload.role === "system" || payload.role === "user" ? payload.role : null
  if (!role) return null
  const content = codexMessageContentText(payload.content)
  if (!content) return null
  const createdAt = stringField(record, "timestamp") ?? new Date(0).toISOString()
  const id = stringField(payload, "id") ?? codexProjectionId(threadId, createdAt, index, payload)
  return {
    backendMetadata: { codexRecordType: "response_item", threadId },
    completedAt: null,
    createdAt,
    errorMessage: null,
    errorName: null,
    finishReason: null,
    id,
    model: null,
    parentId: null,
    parts: [
      {
        id: `${id}:text`,
        kind: "text",
        rawPart: { text: content, type: "text" },
        status: null,
        text: content,
        title: null,
      },
    ],
    role,
  }
}

function codexSessionEventToMessage(
  record: Record<string, unknown>,
  threadId: string,
  index: number,
): LocalConversationMessage | null {
  if (record.type !== "event_msg" || !isRecord(record.payload)) return null
  const payload = record.payload
  if (payload.type !== "user_message" || typeof payload.message !== "string" || payload.message.trim().length === 0)
    return null
  const createdAt = stringField(record, "timestamp") ?? new Date(0).toISOString()
  const id = codexProjectionId(threadId, createdAt, index, payload)
  return {
    backendMetadata: { codexRecordType: "event_msg", codexUserMessageAuthority: "event_msg", threadId },
    completedAt: null,
    createdAt,
    errorMessage: null,
    errorName: null,
    finishReason: null,
    id,
    model: null,
    parentId: null,
    parts: [
      {
        id: `${id}:text`,
        kind: "text",
        rawPart: { text: payload.message.trim(), type: "text" },
        status: null,
        text: payload.message.trim(),
        title: null,
      },
    ],
    role: "user",
  }
}

function codexRecordToMessage(record: unknown, threadId: string, index = 0): LocalConversationMessage[] {
  if (!isRecord(record)) return []
  if (codexRecordThreadId(record) !== threadId) return []
  const role = record.role === "assistant" || record.role === "system" || record.role === "user" ? record.role : null
  const content =
    typeof record.content === "string" ? record.content : typeof record.text === "string" ? record.text : null
  if (!role || !content) return []
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : new Date(0).toISOString()
  const id = typeof record.id === "string" ? record.id : codexProjectionId(threadId, createdAt, index, record)
  return [
    {
      backendMetadata: { threadId },
      completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
      createdAt,
      errorMessage: null,
      errorName: null,
      finishReason: null,
      id,
      model: null,
      parentId: null,
      parts: [
        {
          id: `${id}:text`,
          kind: "text",
          rawPart: { text: content, type: "text" },
          status: null,
          text: content,
          title: null,
        },
      ],
      role,
    },
  ]
}

function codexMessageContentText(content: unknown) {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return null
  const text = content
    .flatMap((part) => {
      if (!isRecord(part)) return []
      return typeof part.text === "string" ? [part.text] : []
    })
    .join("\n")
  return text.length > 0 ? text : null
}

function codexProjectionId(threadId: string, createdAt: string, index: number, payload: Record<string, unknown>) {
  const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)
  return `${threadId}:${createdAt}:${index}:${hash}`
}

function codexRecordThreadId(record: Record<string, unknown>) {
  return typeof record.threadId === "string"
    ? record.threadId
    : typeof record.thread === "string"
      ? record.thread
      : null
}

async function codexSessionFiles(directory: string): Promise<string[]> {
  try {
    return (await readdir(directory, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath, entry.name))
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return []
    throw error
  }
}

function normalizeCodexEvent(
  event: Record<string, unknown>,
  conversationId: string,
  timestamp: string,
): LocalConversationEvent {
  if (event.type === "item.completed") {
    return { backendId: "codex", conversationId, rawEvent: event, timestamp, type: "message.completed" }
  }
  if (event.type === "turn.completed") {
    return { backendId: "codex", conversationId, rawEvent: event, timestamp, type: "turn.completed" }
  }
  if (typeof event.delta === "string") {
    return {
      backendId: "codex",
      conversationId,
      rawEvent: event,
      textDelta: event.delta,
      timestamp,
      type: "message.delta",
    }
  }
  return { backendId: "codex", conversationId, rawEvent: event, timestamp, type: "conversation.updated" }
}

function stringField(value: unknown, field: string) {
  return isRecord(value) && typeof value[field] === "string" ? value[field] : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
