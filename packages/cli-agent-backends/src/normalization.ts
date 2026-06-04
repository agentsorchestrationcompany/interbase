import type {
  RemoteRuntimeActiveChatMetadataProjection,
  RemoteRuntimeChatMessageProjection,
} from "@interbase/remote-runtime-contracts"
import type { RuntimeProviderListResponse } from "@interbase/runtime-protocol"
import type {
  LocalConversationDetail,
  LocalConversationEvent,
  LocalConversationMessage,
  LocalConversationSummary,
  LocalModelOption,
} from "./types.js"

export function runtimeChatToLocalConversation(
  chat: RemoteRuntimeActiveChatMetadataProjection,
): LocalConversationSummary {
  return {
    backendConversationId: chat.sessionId,
    backendId: "interbaseRuntime",
    continuation: null,
    createdAt: chat.createdAt,
    hasActiveTurn: chat.hasActiveTurn,
    id: chat.sessionId,
    model: chat.model,
    providerId: chat.providerId,
    providerName: chat.providerName,
    status: chat.status,
    title: chat.title,
    updatedAt: chat.updatedAt,
  }
}

export function localConversationToRuntimeChat(
  conversation: LocalConversationSummary,
  directory: string,
): RemoteRuntimeActiveChatMetadataProjection {
  return {
    agent: conversation.backendId === "interbaseRuntime" ? null : conversation.providerName,
    createdAt: conversation.createdAt,
    hasActiveTurn: conversation.hasActiveTurn ?? null,
    lastText: conversation.lastText ?? null,
    messageCount: conversation.messageCount ?? null,
    model: conversation.model,
    path: directory,
    projectId: directory,
    providerId: conversation.providerId,
    providerName: conversation.providerName,
    sessionId: conversation.id,
    status: conversation.status,
    title: conversation.title,
    updatedAt: conversation.updatedAt,
  }
}

export function runtimeMessageToLocalMessage(message: RemoteRuntimeChatMessageProjection): LocalConversationMessage {
  return {
    backendMetadata: null,
    completedAt: message.completedAt,
    createdAt: message.createdAt,
    errorMessage: message.errorMessage,
    errorName: message.errorName,
    finishReason: message.finishReason,
    id: message.id,
    model: message.model,
    parentId: message.parentId,
    parts: message.parts.map((part) => ({
      id: part.id,
      kind: part.kind,
      rawPart: part.rawPart,
      status: part.status,
      text: part.text,
      title: part.title,
    })),
    role: message.role,
  }
}

export function localMessageToRuntimeMessage(
  conversationId: string,
  message: LocalConversationMessage,
  agent: string | null = null,
): RemoteRuntimeChatMessageProjection {
  return {
    agent,
    completedAt: message.completedAt ?? null,
    createdAt: message.createdAt,
    errorMessage: message.errorMessage ?? null,
    errorName: message.errorName ?? null,
    finishReason: message.finishReason ?? null,
    id: message.id,
    model: message.model ?? null,
    parentId: message.parentId ?? null,
    parts: message.parts.map((part) => ({
      id: part.id,
      kind: part.kind,
      messageId: message.id,
      rawPart: part.rawPart ?? null,
      status: part.status ?? null,
      text: part.text ?? null,
      title: part.title ?? null,
    })),
    role: message.role,
    sessionId: conversationId,
  }
}

export function localConversationDetailToRuntimeMessages(
  detail: LocalConversationDetail,
): RemoteRuntimeChatMessageProjection[] {
  const agent = detail.backendId === "interbaseRuntime" ? null : detail.providerName
  return detail.messages.map((message) => localMessageToRuntimeMessage(detail.id, message, agent))
}

export function localModelsToRuntimeProviderList(models: readonly LocalModelOption[]): RuntimeProviderListResponse {
  const grouped = new Map<string, LocalModelOption[]>()
  for (const model of models) {
    grouped.set(model.providerId, [...(grouped.get(model.providerId) ?? []), model])
  }
  return {
    all: [...grouped].map(([providerId, providerModels]) => ({
      id: providerId,
      models: Object.fromEntries(
        providerModels.map((model) => [
          model.id,
          {
            id: model.id,
            name: model.available
              ? model.displayName
              : `${model.displayName} (${model.unavailableReason ?? "Unavailable"})`,
            status: model.available ? "active" : "unavailable",
          },
        ]),
      ),
      name: providerModels[0]?.providerName ?? providerId,
    })),
    connected: [...new Set(models.filter((model) => model.available).map((model) => model.providerId))],
    default: Object.fromEntries(
      [...grouped].flatMap(([providerId, providerModels]) => {
        const selected = providerModels.find((model) => model.available)
        return selected ? [[providerId, selected.id]] : []
      }),
    ),
  }
}

export function mergeRuntimeProviderLists(
  first: RuntimeProviderListResponse,
  second: RuntimeProviderListResponse,
): RuntimeProviderListResponse {
  const byProvider = new Map(first.all.map((provider) => [provider.id, provider]))
  for (const provider of second.all) {
    const existing = byProvider.get(provider.id)
    byProvider.set(
      provider.id,
      existing
        ? {
            ...existing,
            models: mergeRuntimeProviderModels(existing.models, provider.models),
          }
        : provider,
    )
  }
  return {
    all: [...byProvider.values()],
    connected: [...new Set([...first.connected, ...second.connected])],
    default: { ...first.default, ...second.default },
  }
}

function mergeRuntimeProviderModels(
  existing: RuntimeProviderListResponse["all"][number]["models"],
  incoming: RuntimeProviderListResponse["all"][number]["models"],
) {
  return Object.fromEntries(
    [...new Set([...Object.keys(existing), ...Object.keys(incoming)])].map((modelId) => {
      const existingModel = existing[modelId]
      const incomingModel = incoming[modelId]
      if (existingModel?.status === "active" && incomingModel?.status === "unavailable") return [modelId, existingModel]
      return [modelId, incomingModel ?? existingModel]
    }),
  )
}

export function localEventToRemoteRuntimeEvent(event: LocalConversationEvent) {
  const base = {
    backendID: event.backendId,
    messageID: event.messageId ?? undefined,
    partID: event.partId ?? undefined,
    sessionID: event.conversationId,
  }
  if (event.type === "conversation.created") return { properties: base, type: "session.created" }
  if (event.type === "conversation.updated" || event.type === "turn.completed")
    return { properties: base, type: "session.updated" }
  if (event.type === "message.delta") {
    return {
      properties: { ...base, delta: event.textDelta ?? "", field: "text" },
      type: "message.part.delta",
    }
  }
  if (event.type === "message.completed")
    return { properties: { ...base, info: { id: event.messageId } }, type: "message.updated" }
  return { properties: base, type: "session.updated" }
}
