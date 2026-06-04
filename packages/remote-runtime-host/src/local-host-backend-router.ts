import type { RuntimeWebSocketAgentListResponse } from "@interbase/runtime-protocol"
import type {
  LocalAgentBackendRouter,
  LocalBackendCapabilities,
  LocalBackendRuntimeBridge,
  LocalConversationSummary,
  LocalModelOption,
} from "./local-backend-types.js"
import { runtimeChatToLocalConversation, runtimeMessageToLocalMessage } from "./local-backend-normalization.js"

const interbaseRuntimeCapabilities: LocalBackendCapabilities = {
  approvals: true,
  attachments: true,
  conversationHistoryReadable: true,
  images: true,
  modelSelection: true,
  nativeExecution: true,
  resume: true,
  sessionContinuation: true,
  streaming: true,
  toolUse: true,
}

export function createHostLocalAgentBackendRouter<Context>(
  bridge: LocalBackendRuntimeBridge<Context>,
): LocalAgentBackendRouter<Context> {
  return {
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
    async listAgents(input): Promise<RuntimeWebSocketAgentListResponse> {
      const models = await this.listModels(input)
      return {
        agents: [
          {
            agentId: "interbaseRuntime",
            available: models.some((model) => model.available),
            capabilities: interbaseRuntimeCapabilities,
            displayName: "Interbase",
            models: models.map((model) => ({
              available: model.available,
              displayName: model.displayName,
              id: model.id,
              providerId: model.providerId,
              providerName: model.providerName,
              unavailableReason: model.unavailableReason ?? null,
            })),
            unavailableReason: models.some((model) => model.available)
              ? null
              : (models.find((model) => model.unavailableReason)?.unavailableReason ?? "No available models"),
          },
        ],
      }
    },
    async listModels(input): Promise<LocalModelOption[]> {
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
      const chat = await bridge.readSession(input.context, { sessionId: input.conversationId })
      const messages = await bridge.listSessionMessages(input.context, { sessionId: input.conversationId })
      const fallback: LocalConversationSummary = {
        backendConversationId: input.conversationId,
        backendId: "interbaseRuntime",
        continuation: null,
        createdAt: new Date(0).toISOString(),
        id: input.conversationId,
        model: null,
        providerId: null,
        providerName: null,
        status: "idle",
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
    async updateConversationModel(input) {
      const updated = await bridge.updateSession(input.context, {
        input: { model: input.model, providerId: input.providerId ?? undefined },
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
