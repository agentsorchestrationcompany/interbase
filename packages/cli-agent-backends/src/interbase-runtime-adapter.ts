import { interbaseRuntimeCapabilities } from "./backend.js"
import { unsupportedBackendOperation } from "./errors.js"
import { runtimeChatToLocalConversation, runtimeMessageToLocalMessage } from "./normalization.js"
import type { LocalAgentBackend, LocalBackendRuntimeBridge } from "./types.js"

export function createInterbaseRuntimeAdapter<Context>(
  bridge: LocalBackendRuntimeBridge<Context>,
): LocalAgentBackend<Context> {
  return {
    backendId: "interbaseRuntime",
    async capabilities() {
      return interbaseRuntimeCapabilities
    },
    async createConversation(input) {
      return runtimeChatToLocalConversation(
        (
          await bridge.startChat(input.context, {
            directoryId: input.directoryId ?? input.directory,
            model: input.model ?? undefined,
            providerId: input.providerId ?? undefined,
            title: input.title ?? undefined,
          })
        ).chat,
      )
    },
    async listConversations(input) {
      return (await bridge.listActiveChats(input.context)).map(runtimeChatToLocalConversation)
    },
    async listModels(input) {
      if (!input.context)
        throw unsupportedBackendOperation("interbaseRuntime", "provider model listing without runtime context")
      return (await bridge.listProviders(input.context)).all.flatMap((provider) =>
        Object.values(provider.models).map((model) => ({
          available: model.status === "active",
          backendId: "interbaseRuntime" as const,
          capabilities: interbaseRuntimeCapabilities,
          displayName: model.name,
          id: model.id,
          providerId: provider.id,
          providerName: provider.name,
          unavailableReason: model.status === "active" ? null : model.status,
        })),
      )
    },
    async readConversation(input) {
      const chat = await bridge.readSession(input.context, {
        sessionId: input.conversationId,
      })
      const messages = await bridge.listSessionMessages(input.context, { sessionId: input.conversationId })
      const fallback = {
        backendConversationId: input.conversationId,
        backendId: "interbaseRuntime" as const,
        continuation: null,
        createdAt: new Date(0).toISOString(),
        id: input.conversationId,
        model: null,
        providerId: null,
        providerName: null,
        status: "idle" as const,
        title: input.conversationId,
        updatedAt: new Date(0).toISOString(),
      }
      const summary = chat ? runtimeChatToLocalConversation(chat) : fallback
      return {
        ...summary,
        capabilities: interbaseRuntimeCapabilities,
        messages: messages.messages.map(runtimeMessageToLocalMessage),
      }
    },
    async sendMessage(input) {
      const response = await bridge.sendSessionMessage(input.context, {
        input: { content: input.content },
        sessionId: input.conversationId,
      })
      return {
        message: runtimeMessageToLocalMessage(response.message),
        messageId: response.message.id,
      }
    },
    async *streamConversation() {
      throw unsupportedBackendOperation(
        "interbaseRuntime",
        "direct backend streaming; remote runtime event subscriptions provide live updates",
      )
    },
    async updateConversationModel(input) {
      const updated = await bridge.updateSession(input.context, {
        input: {
          model: input.model,
          providerId: input.providerId ?? undefined,
        },
        sessionId: input.conversationId,
      })
      if (isRecord(updated) && isRecord(updated.chat)) {
        return runtimeChatToLocalConversation(updated.chat as never)
      }
      return await this.readConversation(input)
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
