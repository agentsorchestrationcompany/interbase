import { LocalBackendError } from "./errors.js"
import type {
  RuntimeWebSocketAgentListResponse,
  RuntimeWebSocketAgentModelOption,
  RuntimeWebSocketAgentAvailability,
  RuntimeWebSocketAgentCapabilitySet,
} from "@interbase/runtime-protocol"
import type {
  LocalAgentBackend,
  LocalBackendId,
  LocalConversationDetail,
  LocalConversationSummary,
  LocalModelOption,
} from "./types.js"
import type { LocalRoutingMetadataStore } from "./routing-metadata.js"

export interface LocalAgentBackendRegistry<Context> {
  get(backendId: LocalBackendId): LocalAgentBackend<Context>
  list(): LocalAgentBackend<Context>[]
  listAgents(input: { context: Context; directory: string }): Promise<RuntimeWebSocketAgentListResponse>
  modelOptions(input: { context: Context; directory: string }): Promise<LocalModelOption[]>
  resolve(input: { conversationId: string; directory: string }): Promise<LocalAgentBackend<Context>>
}

export function createLocalAgentBackendRegistry<Context>(input: {
  backends: readonly LocalAgentBackend<Context>[]
  defaultBackendId?: LocalBackendId
  routingMetadata?: LocalRoutingMetadataStore
}): LocalAgentBackendRegistry<Context> {
  const backends = new Map(input.backends.map((backend) => [backend.backendId, backend]))
  const defaultBackendId = input.defaultBackendId ?? "interbaseRuntime"

  function get(backendId: LocalBackendId) {
    const backend = backends.get(backendId)
    if (!backend)
      throw new LocalBackendError(`Unknown local agent backend: ${backendId}.`, "BACKEND_UNAVAILABLE", backendId)
    return backend
  }

  return {
    get,
    list: () => [...backends.values()],
    async listAgents(agentInput) {
      return {
        agents: await Promise.all(
          [...backends.values()].map(async (backend) => {
            const [capabilities, models] = await Promise.all([
              backend.capabilities(agentInput),
              backend.listModels(agentInput),
            ])
            return localBackendToRuntimeAgent({
              backendId: backend.backendId,
              capabilities,
              models: models.map(
                (model): RuntimeWebSocketAgentModelOption => ({
                  available: model.available,
                  displayName: model.displayName,
                  id: model.id,
                  providerId: model.providerId,
                  providerName: model.providerName,
                  unavailableReason: model.unavailableReason ?? null,
                }),
              ),
            })
          }),
        ),
      }
    },
    async modelOptions(modelInput) {
      return (await Promise.all([...backends.values()].map((backend) => backend.listModels(modelInput)))).flat()
    },
    async resolve(resolveInput) {
      const route = await input.routingMetadata?.get(resolveInput)
      return get(route?.backendId ?? defaultBackendId)
    },
  }
}

function localBackendToRuntimeAgent(input: {
  backendId: LocalBackendId
  capabilities: RuntimeWebSocketAgentCapabilitySet
  models: RuntimeWebSocketAgentModelOption[]
}): RuntimeWebSocketAgentAvailability {
  const available = input.models.some((model) => model.available)
  return {
    agentId: input.backendId,
    available,
    capabilities: input.capabilities,
    displayName: localBackendDisplayName(input.backendId),
    models: input.models,
    unavailableReason: available
      ? null
      : (input.models.find((model) => model.unavailableReason)?.unavailableReason ?? "No available models"),
  }
}

function localBackendDisplayName(backendId: LocalBackendId) {
  const displayNames = {
    claude: "Claude",
    codex: "Codex",
    interbaseRuntime: "Interbase",
  } as const satisfies Record<LocalBackendId, string>
  return displayNames[backendId]
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
  listAgents(input: { context: Context; directory: string }): Promise<RuntimeWebSocketAgentListResponse>
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
  }): Promise<{ message?: import("./types.js").LocalConversationMessage | null; messageId?: string | null }>
  updateConversationModel(input: {
    context: Context
    conversationId: string
    directory: string
    model: string
    providerId?: string | null
  }): Promise<LocalConversationSummary>
}

export function createLocalAgentBackendRouter<Context>(input: {
  defaultBackendId?: LocalBackendId
  registry: LocalAgentBackendRegistry<Context>
  routingMetadata?: LocalRoutingMetadataStore
}): LocalAgentBackendRouter<Context> {
  const defaultBackendId = input.defaultBackendId ?? "interbaseRuntime"

  async function backendForConversation(conversationInput: {
    context: Context
    conversationId: string
    directory: string
  }) {
    const route = await input.routingMetadata?.get(conversationInput)
    if (route) return { backend: input.registry.get(route.backendId), route }
    for (const backend of input.registry
      .list()
      .filter((candidate) => candidate.backendId !== defaultBackendId && candidate.findConversation)) {
      try {
        const conversation = await backend.findConversation?.(conversationInput)
        if (!conversation) continue
        const recoveredRoute = {
          backendConversationId: conversation.backendConversationId,
          backendId: conversation.backendId,
          conversationId: conversation.id,
          createdAt: conversation.createdAt,
          directory: conversationInput.directory,
          title: conversation.title,
          updatedAt: conversation.updatedAt,
        }
        await input.routingMetadata?.put(recoveredRoute)
        return { backend, route: recoveredRoute }
      } catch (error) {
        if (!(error instanceof LocalBackendError) || error.code !== "CONVERSATION_NOT_FOUND") throw error
      }
    }
    return { backend: await input.registry.resolve(conversationInput), route: null }
  }

  async function backendForModel(modelInput: {
    context: Context
    directory: string
    model?: string | null
    providerId?: string | null
  }) {
    if (!modelInput.model || !modelInput.providerId) return input.registry.get(defaultBackendId)
    const options = await input.registry.modelOptions(modelInput)
    const candidates = options.filter(
      (candidate) => candidate.id === modelInput.model && candidate.providerId === modelInput.providerId,
    )
    if (modelInput.providerId === "anthropic") {
      const claudeModel =
        candidates.find((candidate) => candidate.backendId === "claude" && candidate.available) ??
        options.find((candidate) => candidate.backendId === "claude" && candidate.available)
      if (claudeModel) return input.registry.get("claude")
    }
    const model =
      candidates.find((candidate) => candidate.backendId !== defaultBackendId && candidate.available) ??
      candidates.find((candidate) => candidate.available) ??
      candidates[0]
    if (model && !model.available) {
      throw new LocalBackendError(
        `${model.providerName} is unavailable: ${model.unavailableReason ?? "model is not available"}.`,
        "CAPABILITY_UNAVAILABLE",
        model.backendId,
      )
    }
    return input.registry.get(model?.backendId ?? defaultBackendId)
  }

  return {
    async createConversation(createInput) {
      const backend = await backendForModel(createInput)
      const conversation = await backend.createConversation(createInput)
      if (backend.backendId !== defaultBackendId) {
        await input.routingMetadata?.put({
          backendConversationId: conversation.backendConversationId,
          backendId: conversation.backendId,
          conversationId: conversation.id,
          createdAt: conversation.createdAt,
          directory: createInput.directory,
          title: conversation.title,
          updatedAt: conversation.updatedAt,
        })
      }
      return conversation
    },
    async listConversations(listInput) {
      const fromBackends = (
        await Promise.all(input.registry.list().map((backend) => backend.listConversations(listInput)))
      ).flat()
      const routeRecords = (await input.routingMetadata?.list(listInput)) ?? []
      const routesByConversationId = new Map(routeRecords.map((record) => [record.conversationId, record]))
      await Promise.all(
        fromBackends.flatMap((conversation) => {
          if (conversation.backendId === defaultBackendId || !input.routingMetadata) return []
          const route = {
            backendConversationId: conversation.backendConversationId,
            backendId: conversation.backendId,
            conversationId: conversation.id,
            createdAt: conversation.createdAt,
            directory: listInput.directory,
            title: conversation.title,
            updatedAt: conversation.updatedAt,
          }
          return routingRecordsEqual(routesByConversationId.get(conversation.id) ?? null, route)
            ? []
            : [input.routingMetadata.put(route)]
        }),
      )
      const existingIds = new Set(fromBackends.map((conversation) => conversation.id))
      const fromRoutes = routeRecords
        .filter((record) => !existingIds.has(record.conversationId))
        .filter((record) => record.backendId !== "claude")
        .map((record) => ({
          backendConversationId: record.backendConversationId,
          backendId: record.backendId,
          continuation: null,
          createdAt: record.createdAt,
          id: record.conversationId,
          model: record.backendId,
          providerId: record.backendId,
          providerName: record.backendId === "codex" ? "Codex" : record.backendId === "claude" ? "Claude" : "Interbase",
          status: "idle" as const,
          title: record.title ?? record.conversationId,
          updatedAt: record.updatedAt,
        }))
      return [...fromBackends, ...fromRoutes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    listAgents: (agentInput) => input.registry.listAgents(agentInput),
    listModels: (modelInput) => input.registry.modelOptions(modelInput),
    async readConversation(readInput) {
      return await (await backendForConversation(readInput)).backend.readConversation(readInput)
    },
    async sendMessage(sendInput) {
      const { backend, route } = await backendForConversation(sendInput)
      const result = await backend.sendMessage(sendInput)
      if (backend.backendId !== defaultBackendId) {
        await input.routingMetadata?.put({
          backendConversationId: route?.backendConversationId ?? sendInput.conversationId,
          backendId: backend.backendId,
          conversationId: sendInput.conversationId,
          createdAt: route?.createdAt ?? new Date().toISOString(),
          directory: sendInput.directory,
          title: route?.title ?? null,
          updatedAt: result.message?.completedAt ?? result.message?.createdAt ?? new Date().toISOString(),
        })
      }
      return result
    },
    async updateConversationModel(updateInput) {
      const { backend } = await backendForConversation(updateInput)
      if (!backend.updateConversationModel)
        throw new LocalBackendError(
          `${backend.backendId} does not support conversation model updates.`,
          "CAPABILITY_UNAVAILABLE",
          backend.backendId,
        )
      return await backend.updateConversationModel(updateInput)
    },
  }
}

function routingRecordsEqual(
  left: Awaited<ReturnType<LocalRoutingMetadataStore["get"]>>,
  right: NonNullable<Awaited<ReturnType<LocalRoutingMetadataStore["get"]>>>,
) {
  return (
    left?.backendConversationId === right.backendConversationId &&
    left.backendId === right.backendId &&
    left.conversationId === right.conversationId &&
    left.createdAt === right.createdAt &&
    left.directory === right.directory &&
    left.title === right.title &&
    left.updatedAt === right.updatedAt
  )
}
