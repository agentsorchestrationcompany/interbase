import {
  createAuthorizationFailureEnvelope,
  remoteRuntimeCapabilityValues,
  createRuntimeUnavailableEnvelope,
  type GatewayRuntimeAttachment,
  type RemoteRuntimeClientAttachment,
  remoteRuntimeHttpContractVersion,
  type RemoteRuntimeEncryptedPayload,
  type RemoteRuntimeJsonValue,
  type RemoteRuntimeRealtimeEventType,
  type RemoteRuntimeTransportFailureEnvelope,
  type RemoteRuntimeWebSocketSignedAction,
  remoteRuntimeAttachmentCapabilityValues,
  type RemoteRuntimeAttachmentCapability,
  type RemoteRuntimeCapability,
  type RemoteRuntimeAsymmetricPrivateKeyReference,
  type RuntimeWebSocketAllowedDirectory,
  type RuntimeWebSocketEventSignatureProof,
} from "@interbase/remote-runtime-contracts"
import {
  createRuntimeWebSocketEventSignatureProof,
  decryptRuntimeCommandPayload,
  type RemoteRuntimeActiveChatsSnapshot,
  type RemoteRuntimeAliasesSnapshot,
  type RemoteRuntimeChatMessagesSnapshot,
  type RemoteRuntimeChatSnapshot,
  type RemoteRuntimeGoalsSnapshot,
  type RemoteRuntimeGitStatusSnapshot,
  type RemoteRuntimeProvidersSnapshot,
  type RemoteRuntimeRealtimeResourceRef,
  type RemoteRuntimeEncryptionKey,
  type RemoteRuntimeCapabilitiesSnapshot,
  type RemoteRuntimeDirectoriesSnapshot,
  type RemoteRuntimeStatusSnapshot,
  type RuntimeOperationFrame,
  validateRemoteRuntimeClientAttachmentRequest,
} from "@interbase/remote-runtime-host"
import {
  normalizeRemoteRuntimeGitStatusInput,
  requiredRemoteRuntimeApiString,
  type RemoteRuntimeSerializedEncryptionKey as RemoteRuntimeSerializedEncryptionKey,
} from "@interbase/remote-runtime-contracts"
import {
  createRemoteRuntimeCommandErrorEnvelope,
  createRemoteRuntimeMetadataCommandHandlers,
  defineRemoteRuntimeCommandHandlers,
  applyRemoteRuntimeMirroredStatus,
  applyRemoteRuntimeMirroredSessionEvent,
  createRemoteRuntimeActiveChatPage,
  createRemoteRuntimeChatMessagesPage,
  decodeRemoteRuntimeActiveChatCursor,
  encodeRemoteRuntimeActiveChatCursor,
  remoteRuntimeActiveChatSummary,
  remoteRuntimeDirectoryDisplayName,
  remoteRuntimeReattachDelayMs,
  redactRemoteRuntimeDiagnosticString,
  remoteRuntimeMetadataSupportedMethods,
  remoteRuntimeDefaultAttachmentCapabilities,
  remoteRuntimeDefaultFeatureCapabilities,
  remoteRuntimeFeatureSet,
  remoteRuntimeSupportedMethods,
  type RemoteRuntimeFeatureSet,
  type RemoteRuntimeEventInput,
  type RemoteRuntimeEventOrigin,
  type RemoteRuntimeLogEntry,
  type RemoteRuntimeCommandHandler,
  type RemoteRuntimeSupportedCommandHandlers,
  type RemoteRuntimeConnectorAttachmentInput as PublicRemoteRuntimeConnectorAttachmentInput,
  type RemoteRuntimeConnectorSessionInput as PublicRemoteRuntimeConnectorSessionInput,
  type RemoteRuntimeSessionActivityPublication,
  type RemoteRuntimeState,
  type RemoteRuntimeStatus,
  type LocalRemoteRuntimeWebSocketAttachmentInput as PublicLocalRemoteRuntimeWebSocketAttachmentInput,
  type LocalRemoteRuntimeWebSocketAttachmentResult,
} from "@interbase/remote-runtime-host"
import { JsonFileGoalStore, ThreadGoalManager, type StoredThreadGoal } from "./goal-state.js"
import { existsSync, watch, type FSWatcher } from "node:fs"

export type {
  LocalRemoteRuntimeWebSocketAttachmentResult,
  RemoteRuntimeMetadataCommandHandlers,
  RemoteRuntimeMetadataCommandHandlersOptions,
  RemoteRuntimeMetadataSupportedMethod,
  RemoteRuntimeCommandAdapterOptions,
  RemoteRuntimeCommandHandler,
  RemoteRuntimeCommandHandlers,
  RemoteRuntimeEventInput,
  RemoteRuntimeFeatureSet,
  RemoteRuntimeLogEntry,
  RemoteRuntimeSupportedCommandHandlers,
  RemoteRuntimeSupportedMethod,
  RemoteRuntimeStatus,
} from "@interbase/remote-runtime-host"
export {
  createRemoteRuntimeMetadataCommandHandlers,
  createRemoteRuntimeCommandAdapter,
  defineRemoteRuntimeCommandHandlers,
  remoteRuntimeMetadataSupportedMethods,
  remoteRuntimeDefaultAttachmentCapabilities,
  remoteRuntimeDefaultFeatureCapabilities,
  remoteRuntimeSupportedMethods,
} from "@interbase/remote-runtime-host"
export type {
  RemoteRuntimeActiveChatsSnapshot,
  RemoteRuntimeAliasesSnapshot,
  RemoteRuntimeChatMessagesSnapshot,
  RemoteRuntimeChatSnapshot,
  RemoteRuntimeProvidersSnapshot,
  RemoteRuntimeGoalsSnapshot,
  RemoteRuntimeGitStatusSnapshot,
  RemoteRuntimeCapabilitiesSnapshot,
  RemoteRuntimeDirectoriesSnapshot,
  RemoteRuntimeStatusSnapshot,
} from "@interbase/remote-runtime-host"
export type { RemoteRuntimeGitStatusReadInput, RemoteRuntimeGoalsReadInput } from "./local-remote-runtime-gateway.js"
export type {
  RuntimeProviderListResponse,
  ThreadGoal,
  RuntimeWebSocketSessionMessagePayload,
  RuntimeWebSocketSessionUpdatePayload,
} from "@interbase/runtime-protocol"
export type {
  RemoteRuntimeAliasDeletePayload,
  RemoteRuntimeAliasDeleteResponse,
  RemoteRuntimeAliasGetPayload,
  RemoteRuntimeAliasResponse,
  RemoteRuntimeAliasSetPayload,
  RemoteRuntimeAliasesListResponse,
  RemoteRuntimeActiveChatMetadataProjection,
  RemoteRuntimeActiveChatsListPayload,
  RemoteRuntimeActiveChatsResponse,
  RemoteRuntimeChatMessagePartJSONValue,
  RemoteRuntimeChatMessagePartPayload,
  RemoteRuntimeChatMessagePartProjection,
  RemoteRuntimeChatMessageProjection,
  RemoteRuntimeChatMessagesPayload,
  RemoteRuntimeChatMessagesResponse,
  RemoteRuntimeGoalClearPayload,
  RemoteRuntimeGoalCreatePayload,
  RemoteRuntimeGoalEditPayload,
  RemoteRuntimeGoalGetPayload,
  RemoteRuntimeGoalListPayload,
  RemoteRuntimeGitStatusInput,
  RemoteRuntimeGitStatusResponse,
  RemoteRuntimeGoalPausePayload,
  RemoteRuntimeGoalResponse,
  RemoteRuntimeGoalResumePayload,
  RemoteRuntimeGoalsListResponse,
  RemoteRuntimeGoalUpdatePayload,
  RemoteRuntimePromptAlias,
  RemoteRuntimeProtocolClientMethod,
  RemoteRuntimeSendMessageResponse,
  RuntimeWebSocketChatStartPayload,
  RuntimeWebSocketChatStartResponse,
} from "@interbase/remote-runtime-contracts"
import {
  type EditGoalInput,
  type ThreadGoal,
  type RuntimeProviderListResponse,
  type RuntimeWebSocketEventType,
  type RuntimeWebSocketPingResponse,
  type RuntimeWebSocketServerEnvelope,
  type RuntimeWebSocketSessionReadPayload,
  type RuntimeWebSocketSessionUpdatePayload,
  type RuntimeWebSocketSessionMessagePayload,
} from "@interbase/runtime-protocol"
import type {
  RemoteRuntimeAliasDeletePayload,
  RemoteRuntimeAliasDeleteResponse,
  RemoteRuntimeAliasGetPayload,
  RemoteRuntimeAliasResponse,
  RemoteRuntimeAliasSetPayload,
  RemoteRuntimeAliasesListResponse,
  RemoteRuntimeProtocolClientCommand,
  RemoteRuntimeProtocolClientMethod,
  RemoteRuntimeActiveChatMetadataProjection,
  RemoteRuntimeActiveChatsListPayload,
  RemoteRuntimeActiveChatsResponse,
  RemoteRuntimeChatMessageProjection,
  RemoteRuntimeChatMessagesPayload,
  RemoteRuntimeChatMessagesResponse,
  RemoteRuntimeGoalClearPayload,
  RemoteRuntimeGoalCreatePayload,
  RemoteRuntimeGoalEditPayload,
  RemoteRuntimeGoalGetPayload,
  RemoteRuntimeGoalListPayload,
  RemoteRuntimeGitStatusInput,
  RemoteRuntimeGitStatusResponse,
  RemoteRuntimeGoalPausePayload,
  RemoteRuntimeGoalResponse,
  RemoteRuntimeGoalResumePayload,
  RemoteRuntimeGoalsListResponse,
  RemoteRuntimeGoalUpdatePayload,
  RemoteRuntimePromptAlias,
  RemoteRuntimeSendMessageResponse,
  RuntimeWebSocketChatStartPayload,
  RuntimeWebSocketChatStartResponse,
  RuntimeWebSocketDirectoryListResponse,
  RuntimeWebSocketDirectorySelectPayload,
  RuntimeWebSocketDirectorySelectResponse,
  RuntimeWebSocketInitializeResponse,
} from "@interbase/remote-runtime-contracts"
import { setTimeout as sleepTimeout } from "node:timers/promises"
import { createHash } from "node:crypto"
import path from "node:path"
import type {
  RemoteRuntimeActiveChatsReadInput,
  RemoteRuntimeChatMessagesReadInput,
  RemoteRuntimeChatReadInput,
  RemoteRuntimeDirectorySelector,
  RemoteRuntimeEncryptionInput,
  RemoteRuntimeGoalsReadInput,
  RemoteRuntimeGitStatusReadInput,
  RemoteRuntimeInstallationSelector,
  RemoteRuntimeProjectionSelector,
  RemoteRuntimeProviderReadInput,
  RemoteRuntimeSelector,
  RemoteRuntimeSendChatMessageInput,
  RemoteRuntimeStartChatInput,
  RemoteRuntimeStartInput,
  RemoteRuntimeStatusSelector,
  RemoteRuntimeStopSelector,
  RemoteRuntimeUpdateChatInput,
} from "./local-remote-runtime-gateway.js"
import { JsonFilePromptAliasesStore, PromptAliasesManager, type StoredPromptAlias } from "./prompt-aliases.js"
import { createHostLocalAgentBackendRouter } from "./local-host-backend-router.js"
import {
  localConversationDetailToRuntimeMessages,
  localConversationToRuntimeChat,
  localMessageToRuntimeMessage,
  localModelsToRuntimeProviderList,
  mergeRuntimeProviderLists,
} from "./local-backend-normalization.js"
import type {
  LocalAgentBackend,
  LocalAgentBackendRouter,
  LocalBackendRuntimeBridge,
  LocalRoutingMetadataRecord,
  LocalRoutingMetadataStore,
} from "./local-backend-types.js"
import { createSessionTurnCoordinator } from "./session-turn-coordinator.js"

export {
  createLocalRemoteRuntimeInvalidWebSocketJsonActionEnvelope,
  createInMemoryRemoteRuntimeNonceReplayStore,
  dispatchLocalRemoteRuntimeHttpRequest,
  dispatchLocalRemoteRuntimeReadSnapshotRequest,
  createInMemoryLocalRemoteRuntimeCommandIdempotencyStore,
  createLocalRemoteRuntimeCommandFingerprint,
  createLocalRemoteRuntimeJsonResponse,
  createLocalRemoteRuntimeWebSocketSessionAccepted,
  isLocalRemoteRuntimeGatewayPath,
  isUnsignedRemoteRuntimeHostReadRequest,
  isSignedLocalRemoteRuntimeGatewayRequest,
  localRemoteRuntimeCommandBodyAuthority,
  localRemoteRuntimeCommandBodyJson,
  localRemoteRuntimeInstallationIdFromQuery,
  localRemoteRuntimeReadSnapshotCanonicalPath,
  localRemoteRuntimeRequestIdHeaderName,
  parseLocalRemoteRuntimeWebSocketUpgradeAuthority,
  parseRemoteRuntimeEncryptionRequest,
  parseRemoteRuntimeHostStopRequest,
  parseRemoteRuntimeGitStatusQuery,
  parseRemoteRuntimeInstallationSelectorQuery,
  parseRemoteRuntimePageQuery,
  parseRemoteRuntimeProjectionSelectorQuery,
  parseRemoteRuntimeSelectorQuery,
  parseRemoteRuntimeStatusSelectorQuery,
  parseRemoteRuntimeSendMessageRequest,
  parseRemoteRuntimeStartChatRequest,
  parseRemoteRuntimeStartRequest,
  parseRemoteRuntimeStopRequest,
  parseRemoteRuntimeStopSelectorQuery,
  parseRemoteRuntimeUpdateChatRequest,
  localRuntimeAccessTokenHeaderName,
  localRuntimeAccessTokenIdHeaderName,
  remoteRuntimeHttpRequestSignatureHeaderName,
  remoteRuntimeHttpRequestSigningKeyIdHeaderName,
  remoteRuntimeHttpVersionHeaderName,
  remoteRuntimeTransportProtocolVersion,
  normalizeLocalRemoteRuntimeGatewayTrustedDeviceAuthorities,
  prepareLocalRemoteRuntimeHttpAdmission,
  prepareLocalRemoteRuntimeReadSnapshotAdmission,
  prepareLocalRemoteRuntimeWebSocketAdmission,
  resolveLocalRemoteRuntimeGatewayAuthority,
  runLocalRemoteRuntimeCommandWithIdempotency,
  runValidatedLocalRemoteRuntimeCommandRequest,
  validateLocalRemoteRuntimeWebSocketAction,
} from "./local-remote-runtime-gateway.js"
export type {
  LocalRemoteRuntimeCommandBodyAuthority,
  LocalRemoteRuntimeCommandIdempotencyRecord,
  LocalRemoteRuntimeCommandIdempotencyStore,
  LocalRemoteRuntimeHttpHeader,
  LocalRemoteRuntimeHttpQueryEntry,
  LocalRemoteRuntimeHttpAdmissionInput,
  LocalRemoteRuntimeHttpAdmissionResult,
  LocalRemoteRuntimeReadSnapshotAuthority,
  LocalRemoteRuntimeWebSocketActionValidationInput,
  LocalRemoteRuntimeWebSocketActionValidationResult,
  LocalRemoteRuntimeWebSocketAdmissionInput,
  LocalRemoteRuntimeWebSocketAdmissionResult,
  PrepareLocalRemoteRuntimeHttpAdmissionInput,
  PrepareLocalRemoteRuntimeReadSnapshotAdmissionInput,
  LocalRemoteRuntimeGatewayAuthorityState,
  LocalRemoteRuntimeJsonResponse,
  LocalRemoteRuntimeJsonResponseInput,
  LocalRemoteRuntimeReadSnapshotRequestInput,
  LocalRemoteRuntimeReadSnapshotRoute,
  LocalRemoteRuntimeWebSocketUpgradeAuthority,
  LocalRemoteRuntimeGatewayResolvedAuthority,
  LocalRemoteRuntimeValidatedCommandResult,
  RemoteRuntimeActiveChatsReadInput,
  RemoteRuntimeAllSelector,
  RemoteRuntimeChatMessagesReadInput,
  RemoteRuntimeChatReadInput,
  RemoteRuntimeCommandAuthority,
  RemoteRuntimeDirectorySelector,
  RemoteRuntimeEncryptionInput,
  RemoteRuntimeInstallationSelector,
  RemoteRuntimeProjectionSelector,
  RemoteRuntimeStatusSelector,
  RemoteRuntimeStopSelector,
  RemoteRuntimeHostStopInput,
  RemoteRuntimePageQuery,
  RemoteRuntimeProviderReadInput,
  RemoteRuntimeSelector,
  RemoteRuntimeSendChatMessageInput,
  RemoteRuntimeStartChatInput,
  RemoteRuntimeStartInput,
  RemoteRuntimeStartRequestInput,
  RemoteRuntimeUpdateChatInput,
  RunLocalRemoteRuntimeCommandWithIdempotencyInput,
  RunValidatedLocalRemoteRuntimeCommandRequestInput,
} from "./local-remote-runtime-gateway.js"

const remoteRuntimeEventFrameMaxBytes = 512 * 1024
const remoteRuntimeProjectedPartMaxBytes = 128 * 1024

export type RemoteRuntimeConnectorAttachmentInput = PublicRemoteRuntimeConnectorAttachmentInput

export type RemoteRuntimeConnectorSessionInput = PublicRemoteRuntimeConnectorSessionInput<
  RemoteRuntimeSupportedCommandHandlers,
  RuntimeOperationFrame
>

export type LocalRemoteRuntimeWebSocketAttachmentInput =
  PublicLocalRemoteRuntimeWebSocketAttachmentInput<RemoteRuntimeWebSocketSignedAction>

export interface RemoteRuntimeHostDeps<Context> {
  issueRuntimeAttachmentTicket(input: {
    apiBaseUrl: string
    authorizationToken: string
    runtimeInstallationId: string
  }): Promise<Record<string, unknown>>
  runConnectorRuntimeSession(input: RemoteRuntimeConnectorSessionInput): Promise<GatewayRuntimeAttachment>
  loadContext(input: { directory: string }): Promise<Context>
  disposeContext(context: Context): Promise<void>
  listActiveChats(
    context: Context,
    payload?: RemoteRuntimeActiveChatsListPayload,
  ): Promise<RemoteRuntimeActiveChatMetadataProjection[]>
  listGoals?(input: {
    cursor?: string | null
    directories: readonly string[]
    limit?: number | null
    status?: ThreadGoal["status"] | null
  }): Promise<RemoteRuntimeGoalsListResponse>
  readGitStatus?(input: {
    directories: readonly RuntimeWebSocketAllowedDirectory[]
    includeDiff: boolean
    maxDiffBytes: number
  }): Promise<RemoteRuntimeGitStatusResponse>
  getAnthropicAuth?(context: Context): Promise<{ apiKey?: string | null; authToken?: string | null } | null | undefined>
  listProviders(context: Context): Promise<RuntimeProviderListResponse>
  projectActiveChat?(context: Context, sessionId: string): Promise<RemoteRuntimeActiveChatMetadataProjection | null>
  projectSessionMessage?(
    context: Context,
    sessionId: string,
    messageId: string,
  ): Promise<RemoteRuntimeChatMessageProjection | null>
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
  publishSessionActivity?(context: Context, input: RemoteRuntimeSessionActivityPublication): Promise<void> | void
  subscribeEvents(context: Context, handler: (event: RemoteRuntimeEventInput) => void): () => void
}

export interface RemoteRuntimeManagerOptions<Context> {
  attachmentCapabilities?: readonly RemoteRuntimeAttachmentCapability[]
  codexHome?: string
  connectorVersion: string
  createBackendRouter?(input: {
    entry: RemoteRuntimeEntry<Context>
    localBackends: LocalAgentBackend<Context>[]
    routingMetadata: LocalRoutingMetadataStore
    runtimeBridge: LocalBackendRuntimeBridge<Context>
  }): LocalAgentBackendRouter<Context>
  createLocalBackends?(input: {
    claudeStateDirectory: string
    codexHome?: string
    context?: Context
    now: () => string
    resolveAnthropicAuth():
      | Promise<{ apiKey?: string | null; authToken?: string | null } | null | undefined>
      | { apiKey?: string | null; authToken?: string | null }
      | null
      | undefined
  }): LocalAgentBackend<Context>[]
  createRoutingMetadataStore?(input: { stateDirectory: string }): LocalRoutingMetadataStore
  deps: RemoteRuntimeHostDeps<Context>
  goalStateDirectory?: string
  maxRemoteRuntimeEventDeliveryFailures?: number
  /** @deprecated Use maxRemoteRuntimeEventDeliveryFailures. */
  maxClientEventDeliveryFailures?: number
  routingMetadataStore?: LocalRoutingMetadataStore
  maxLogEntries?: number
  featureCapabilities?: readonly RemoteRuntimeCapability[]
  now?(): string
  onConnected?(status: RemoteRuntimeStatus): void
  promptAliasesStateDirectory?: string
  random?(): number
  randomUUID?(): string
  sleep?(milliseconds: number): Promise<void>
}

interface RemoteRuntimeEntry<Context> {
  abort: AbortController
  allowedDirectories: readonly RuntimeWebSocketAllowedDirectory[]
  connectorPrimary: boolean
  aliasesStateSync?: Promise<void>
  aliasesStateWatcher?: FSWatcher
  context?: Context
  localStatePoll?: ReturnType<typeof setInterval>
  observedAliases?: Map<string, StoredPromptAlias>
  observedGoals?: Map<string, StoredThreadGoal>
  key: string
  localBackends?: LocalAgentBackend<Context>[]
  localBackendRouter?: LocalAgentBackendRouter<Context>
  localRoutingMetadata?: LocalRoutingMetadataStore
  logs: RemoteRuntimeLogEntry[]
  goalManager?: ThreadGoalManager
  goalStateSync?: Promise<void>
  goalStateWatcher?: FSWatcher
  remoteRuntimeEventSequence: number
  remoteRuntimeEventSubscriptions: Map<string, RemoteRuntimeEventSubscription>
  promptAliases?: PromptAliasesManager
  mirroredSessionStatuses: Map<string, RemoteRuntimeActiveChatMetadataProjection["status"]>
  runtimeEncryptionKey?: RemoteRuntimeEncryptionKey
  run?: Promise<void>
  status: RemoteRuntimeEntryStatus
}

type RemoteRuntimeEntryStatus = Mutable<RemoteRuntimeStatus> & {
  directory: string
  directoryId: string
}

type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key]
}

interface RemoteRuntimeEventSubscription {
  consecutiveDeliveryFailures: number
  contextSubscribed: boolean
  deliverRuntimeEnvelope(envelope: RuntimeWebSocketServerEnvelope): Promise<void>
  gatewayRuntimeAttachmentId: string
  health: "subscribed" | "unhealthy"
  lastDeliveryAt?: string
  pending: Promise<void>
  runtimeResponseSigningPrivateKey?: RemoteRuntimeAsymmetricPrivateKeyReference
  trustedRuntimeClientId: string
  unsubscribe(): void
}

interface QueuedRemoteRuntimeSessionMessage<Context> {
  context: Context
  directory: string
  payload: RuntimeWebSocketSessionMessagePayload
  router: LocalAgentBackendRouter<Context>
}

export function createRemoteRuntimeManager<Context>(options: RemoteRuntimeManagerOptions<Context>) {
  const entries = new Map<string, RemoteRuntimeEntry<Context>>()
  const attachmentCapabilities = options.attachmentCapabilities ?? remoteRuntimeDefaultAttachmentCapabilities
  const featureCapabilities = options.featureCapabilities ?? remoteRuntimeDefaultFeatureCapabilities
  const enabledFeatureCapabilities = remoteRuntimeCapabilityValues.filter((capability) =>
    featureCapabilities.includes(capability),
  )
  const supportedMethods = enabledRemoteRuntimeSupportedMethods(enabledFeatureCapabilities)
  const maxLogEntries = options.maxLogEntries ?? 200
  const maxRemoteRuntimeEventDeliveryFailures = Math.max(
    1,
    options.maxRemoteRuntimeEventDeliveryFailures ?? options.maxClientEventDeliveryFailures ?? 3,
  )
  const now = options.now ?? defaultNow
  const random = options.random ?? Math.random
  const randomUUID = options.randomUUID ?? defaultRandomUUID
  const sleep = options.sleep ?? defaultSleep
  const runtimeBridge: LocalBackendRuntimeBridge<Context> = {
    listActiveChats: options.deps.listActiveChats,
    listProviders: options.deps.listProviders,
    readSession: async (context, payload) => {
      const projected = await Promise.resolve(options.deps.projectActiveChat?.(context, payload.sessionId) ?? null)
      if (projected) {
        return projected
      }
      return (await options.deps.listActiveChats(context)).find((chat) => chat.sessionId === payload.sessionId) ?? null
    },
    listSessionMessages: options.deps.listSessionMessages,
    sendSessionMessage: options.deps.sendSessionMessage,
    startChat: options.deps.startChat,
    updateSession: options.deps.updateSession,
  }
  const sessionTurns = createSessionTurnCoordinator<
    QueuedRemoteRuntimeSessionMessage<Context>,
    RemoteRuntimeSendMessageResponse["message"]
  >({
    getSessionId: (input) => input.payload.sessionId,
    runPrompt: async (input) => {
      const sent = await input.router.sendMessage({
        context: input.context,
        content: input.payload.input.content,
        conversationId: input.payload.sessionId,
        directory: input.directory,
      })
      if (sent.message) {
        return localMessageToRuntimeMessage(input.payload.sessionId, sent.message)
      }
      const detail = await input.router.readConversation({
        context: input.context,
        conversationId: input.payload.sessionId,
        directory: input.directory,
      })
      const message = localConversationDetailToRuntimeMessages(detail).find(
        (candidate) => !sent.messageId || candidate.id === sent.messageId,
      )
      if (!message) {
        throw new Error(
          "Local backend accepted the remote runtime message but did not return readable message authority.",
        )
      }
      return message
    },
  })

  function appendLog(entry: RemoteRuntimeEntry<Context>, level: RemoteRuntimeLogEntry["level"], message: string) {
    entry.logs.push({
      level,
      message: redactRemoteRuntimeDiagnosticString(message),
      timestamp: now(),
    })
    if (entry.logs.length > maxLogEntries) {
      entry.logs.splice(0, entry.logs.length - maxLogEntries)
    }
  }

  function activeChatWithMirroredStatus(
    entry: RemoteRuntimeEntry<Context>,
    activeChat: RemoteRuntimeActiveChatMetadataProjection,
    scope: "list" | "read" | null = "read",
  ) {
    return attachGoalProjection(
      entry,
      applyRemoteRuntimeMirroredStatus(activeChat, entry.mirroredSessionStatuses.get(activeChat.sessionId)),
      scope,
    )
  }

  function projectActiveChatsWithMirroredStatus(
    entriesByDirectory: ReadonlyMap<string, RemoteRuntimeEntry<Context>>,
    activeChats: RemoteRuntimeActiveChatMetadataProjection[],
  ) {
    return activeChats.flatMap((activeChat) => {
      const activeChatEntry = activeChat.path ? entriesByDirectory.get(activeChat.path) : undefined
      if (!activeChatEntry) return []
      return [
        attachGoalProjection(
          activeChatEntry,
          applyRemoteRuntimeMirroredStatus(
            activeChat,
            activeChatEntry.mirroredSessionStatuses.get(activeChat.sessionId),
          ),
          "list",
        ),
      ]
    })
  }

  function activeChatProjectionEntries(entry: RemoteRuntimeEntry<Context>) {
    materializeAllowedDirectoryEntries(entry)
    return [...entries.values()].filter(
      (candidate) =>
        candidate.status.state === "online" &&
        candidate.status.accountId === entry.status.accountId &&
        candidate.status.runtimeInstallationId === entry.status.runtimeInstallationId,
    )
  }

  function projectionEntriesForSelector(entry: RemoteRuntimeEntry<Context>, selector: RemoteRuntimeProjectionSelector) {
    return selector.directory || selector.directoryId ? [entry] : activeChatProjectionEntries(entry)
  }

  async function listAllActiveChatsForEntry(entry: RemoteRuntimeEntry<Context>) {
    const context = await ensureEntryContext(entry)
    const activeChats: RemoteRuntimeActiveChatMetadataProjection[] = []
    const seenSessionIds = new Set<string>()
    let cursor: string | null = null
    do {
      const page = createRemoteRuntimeActiveChatPage(await options.deps.listActiveChats(context, { cursor, limit: 100 }), {
        cursor,
        limit: 100,
      })
      const newActiveChats = page.activeChats.filter((activeChat) => !seenSessionIds.has(activeChat.sessionId))
      for (const activeChat of newActiveChats) {
        seenSessionIds.add(activeChat.sessionId)
      }
      activeChats.push(
        ...newActiveChats.map((activeChat) => ({
          ...activeChat,
          path: activeChat.path ?? entry.status.directory,
        })),
      )
      if (page.activeChats.length > 0 && newActiveChats.length === 0) break
      cursor = page.pageInfo.olderCursor
    } while (cursor)
    return activeChats
  }

  function createConsolidatedActiveChatProjectionPage(
    activeChats: RemoteRuntimeActiveChatMetadataProjection[],
    payload: RemoteRuntimeActiveChatsListPayload,
  ): RemoteRuntimeActiveChatsResponse {
    const limit = Math.min(Math.max(payload.limit ?? 25, 1), 100)
    const cursor = payload.cursor ? decodeRemoteRuntimeActiveChatCursor(payload.cursor) : null
    const startOffset = cursor?.offset ?? 0
    const page = activeChats.slice(startOffset, startOffset + limit)
    const last = page.at(-1)
    const hasOlder = activeChats.length > startOffset + limit
    return {
      activeChats: page,
      pageInfo: {
        hasNewer: startOffset > 0,
        hasOlder,
        newerCursor:
          startOffset > 0 && page[0]
            ? encodeRemoteRuntimeActiveChatCursor(page[0], Math.max(0, startOffset - limit))
            : null,
        olderCursor:
          hasOlder && last ? encodeRemoteRuntimeActiveChatCursor(last, startOffset + page.length, [last.sessionId]) : null,
      },
    }
  }

  function selectEntries(selector: RemoteRuntimeSelector) {
    return [...entries.values()].filter((entry) => {
      if (selector.directory && entry.status.directory !== selector.directory) return false
      if (selector.directoryId && entry.status.directoryId !== selector.directoryId) return false
      if (selector.runtimeInstallationId && entry.status.runtimeInstallationId !== selector.runtimeInstallationId) {
        return false
      }
      return true
    })
  }

  function hasSelector(selector: RemoteRuntimeSelector) {
    return Boolean(selector.directory || selector.directoryId || selector.runtimeInstallationId)
  }

  function visibleStatusEntries(selector: RemoteRuntimeSelector) {
    const primary = singleRuntimeInstallationPrimaryEntry(selector)
    if (primary) return [primary]
    const selected = selectEntries(selector)
    return hasSelector(selector)
      ? selected
      : selected.filter((entry) => entry.connectorPrimary && entry.status.state !== "stopped")
  }

  function singleSelectedRuntimeEntry(selector: RemoteRuntimeSelector) {
    const selected = selectEntries(selector).filter((entry) => entry.status.state === "online")
    if (selected.length === 0 && selector.runtimeInstallationId && (selector.directoryId || selector.directory)) {
      const materialized = materializeAllowedDirectoryEntry(selector)
      if (materialized?.status.state === "online") return materialized
    }
    if (selected.length === 1) {
      return selected[0]
    }
    if (selected.length === 0) {
      throw new Error("No matching online remote runtime is running.")
    }
    throw new Error("Remote runtime selector matched multiple online runtimes; include directoryId or directory.")
  }

  function singleActiveChatRuntimeEntry(selector: RemoteRuntimeSelector) {
    if (selector.runtimeInstallationId && !selector.directoryId && !selector.directory) {
      const selected = selectEntries(selector).filter((entry) => entry.status.state === "online")
      const connectorPrimary = selected.filter((entry) => entry.connectorPrimary)
      if (connectorPrimary.length === 1) return connectorPrimary[0]
    }
    return singleSelectedRuntimeEntry(selector)
  }

  function singleGitStatusRuntimeEntry(selector: RemoteRuntimeSelector) {
    if ((selector.directoryId || selector.directory) && !selector.runtimeInstallationId) {
      const selected = [...entries.values()].filter(
        (entry) =>
          entry.connectorPrimary &&
          entry.status.state === "online" &&
          entry.allowedDirectories.some(
            (directory) =>
              (!selector.directoryId || directory.directoryId === selector.directoryId) &&
              (!selector.directory || directory.path === selector.directory),
          ),
      )
      if (selected.length === 1) return selected[0]
      if (selected.length === 0) throw new Error("No matching online remote runtime is running.")
      throw new Error("Remote runtime selector matched multiple online runtimes; include runtimeInstallationId.")
    }
    return singleActiveChatRuntimeEntry(selector)
  }

  function singleRuntimeInstallationPrimaryEntry(selector: RemoteRuntimeSelector) {
    if (selector.runtimeInstallationId && !selector.directoryId && !selector.directory) {
      const selected = selectEntries(selector)
      const connectorPrimary = selected.filter((entry) => entry.connectorPrimary)
      if (connectorPrimary.length === 1) return connectorPrimary[0]
    }
    return undefined
  }

  function selectRuntimePrimaryOnlineEntries(selector: RemoteRuntimeInstallationSelector) {
    return selectEntries(selector).filter((entry) => entry.status.state === "online" && entry.connectorPrimary)
  }

  function selectRuntimeConfigurationEntries(selector: RemoteRuntimeInstallationSelector) {
    return selectEntries(selector)
  }

  function selectStopEntries(selector: RemoteRuntimeStopSelector) {
    return "all" in selector && selector.all ? [...entries.values()] : selectEntries(selector)
  }

  function materializeAllowedDirectoryEntry(selector: RemoteRuntimeSelector) {
    const primary = [...entries.values()].find(
      (entry) =>
        entry.connectorPrimary &&
        entry.status.state === "online" &&
        (!selector.runtimeInstallationId || entry.status.runtimeInstallationId === selector.runtimeInstallationId),
    )
    if (!primary) return undefined
    const allowed = primary.allowedDirectories.find(
      (directory) =>
        (selector.directoryId && directory.directoryId === selector.directoryId) ||
        (selector.directory && directory.path === selector.directory),
    )
    if (!allowed) return undefined
    const key = remoteRuntimeKey({
      accountId: primary.status.accountId,
      directory: allowed.path,
      runtimeInstallationId: primary.status.runtimeInstallationId,
    })
    const existing = entries.get(key)
    if (existing) return existing
    const child: RemoteRuntimeEntry<Context> = {
      abort: primary.abort,
      allowedDirectories: primary.allowedDirectories,
      connectorPrimary: false,
      key,
      logs: primary.logs,
      remoteRuntimeEventSequence: primary.remoteRuntimeEventSequence,
      remoteRuntimeEventSubscriptions: primary.remoteRuntimeEventSubscriptions,
      mirroredSessionStatuses: primary.mirroredSessionStatuses,
      runtimeEncryptionKey: primary.runtimeEncryptionKey,
      status: {
        accountId: primary.status.accountId,
        allowedDirectories: primary.allowedDirectories,
        apiBaseUrl: primary.status.apiBaseUrl,
        commandEncryptionConfigured: primary.status.commandEncryptionConfigured,
        directoryId: allowed.directoryId,
        directory: allowed.path,
        gatewayRuntimeAttachmentId: primary.status.gatewayRuntimeAttachmentId,
        lastHeartbeatAt: primary.status.lastHeartbeatAt,
        runtimeInstallationId: primary.status.runtimeInstallationId,
        startedAt: primary.status.startedAt,
        state: primary.status.state,
      },
    }
    entries.set(key, child)
    return child
  }

  function materializeAllowedDirectoryEntries(entry: RemoteRuntimeEntry<Context>) {
    for (const directory of entry.allowedDirectories) {
      materializeAllowedDirectoryEntry({
        directoryId: directory.directoryId,
        runtimeInstallationId: entry.status.runtimeInstallationId,
      })
    }
  }

  function singleVisibleRuntimeEntry(selector: RemoteRuntimeSelector) {
    const selected = visibleStatusEntries(selector)
    if (selected.length === 1) {
      return selected[0]
    }
    if (selected.length === 0) {
      throw new Error("No matching remote runtime is running.")
    }
    throw new Error("Remote runtime selector matched multiple runtimes; include directoryId or directory.")
  }

  function supersededRuntimeEntries(input: RemoteRuntimeStartInput) {
    return [...entries.values()].filter(
      (entry) => entry.status.accountId === input.accountId && entry.status.apiBaseUrl === input.apiBaseUrl,
    )
  }

  async function stopEntry(entry: RemoteRuntimeEntry<Context>) {
    if (entry.status.state === "stopped") return
    stopLocalStateWatchers(entry)
    stopRemoteRuntimeEventForwarding(entry)
    entry.status.state = "stopping"
    appendLog(entry, "info", "Stopping remote runtime connector.")
    entry.abort.abort()
    if (entry.run) await entry.run
    entry.status.state = "stopped"
  }

  async function waitForAttachment(entry: RemoteRuntimeEntry<Context>): Promise<void> {
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (entry.status.state === "online") return
      if (entry.status.state === "errored") {
        throw new Error(entry.status.lastError ?? "Remote runtime connector failed.")
      }
      await sleep(25)
    }
    throw new Error("Remote runtime connector did not attach before the local timeout.")
  }

  function activeDirectoryAttachments(entry: RemoteRuntimeEntry<Context>) {
    return [...entries.values()]
      .filter(
        (candidate) =>
          candidate.status.accountId === entry.status.accountId &&
          candidate.status.runtimeInstallationId === entry.status.runtimeInstallationId &&
          candidate.status.gatewayRuntimeAttachmentId &&
          (candidate.status.state === "online" || candidate.status.state === "starting"),
      )
      .map((candidate) => ({
        directoryId: candidate.status.directoryId,
        gatewayRuntimeAttachmentId: candidate.status.gatewayRuntimeAttachmentId!,
        path: candidate.status.directory,
        status: candidate.status.state === "online" ? ("online" as const) : ("revoked" as const),
      }))
  }

  function allowedRuntimeDirectories(entry: RemoteRuntimeEntry<Context>) {
    return entry.allowedDirectories
  }

  function selectedGitStatusDirectories(
    entry: RemoteRuntimeEntry<Context>,
    selector: RemoteRuntimeSelector,
  ): RuntimeWebSocketAllowedDirectory[] {
    const directories = allowedRuntimeDirectories(entry)
    if (!selector.directory && !selector.directoryId) return [...directories]
    const selected = directories.filter(
      (directory) =>
        (!selector.directoryId || directory.directoryId === selector.directoryId) &&
        (!selector.directory || directory.path === selector.directory),
    )
    if (selected.length === 0) {
      throw new Error("No matching authorized remote runtime directory was found.")
    }
    return selected
  }

  async function readRemoteRuntimeGitStatus(
    entry: RemoteRuntimeEntry<Context>,
    input: RemoteRuntimeGitStatusInput & RemoteRuntimeSelector = {},
  ): Promise<RemoteRuntimeGitStatusResponse> {
    const normalized = normalizeRemoteRuntimeGitStatusInput(input)
    const directories = selectedGitStatusDirectories(entry, input)
    if (options.deps.readGitStatus) {
      return await options.deps.readGitStatus({
        directories,
        includeDiff: normalized.includeDiff,
        maxDiffBytes: normalized.maxDiffBytes,
      })
    }
    return {
      repositories: directories.map((directory) => ({
        ahead: null,
        behind: null,
        branch: null,
        diffTruncated: false,
        directoryId: directory.directoryId,
        error: "Git status reader is unavailable.",
        files: [],
        head: null,
        isRepository: false,
        path: directory.path,
        repositoryRoot: null,
        stagedDiff: null,
        unstagedDiff: null,
        upstream: null,
      })),
    }
  }

  async function ensureEntryContext(entry: RemoteRuntimeEntry<Context>) {
    if (entry.context) return entry.context
    if (entry.status.state === "stopped" || entry.status.state === "stopping") {
      throw new Error("Remote runtime is not connected to a project instance.")
    }
    const context = await options.deps.loadContext({ directory: entry.status.directory })
    if (context === undefined) {
      throw new Error("Remote runtime is not connected to a project instance.")
    }
    entry.context = context
    startLocalStateWatchers(entry)
    subscribeRemoteRuntimeEventForwarders(entry, entry.context)
    return entry.context
  }

  function subscribeRemoteRuntimeEventForwarders(entry: RemoteRuntimeEntry<Context>, context: Context) {
    for (const [clientAttachmentId, subscription] of entry.remoteRuntimeEventSubscriptions) {
      if (subscription.contextSubscribed) continue
      subscription.unsubscribe()
      subscription.unsubscribe = options.deps.subscribeEvents(context, (event) => {
        const current = entry.remoteRuntimeEventSubscriptions.get(clientAttachmentId)
        if (!current) return
        void queueRemoteRuntimeEvent(entry, event, clientAttachmentId, current)
      })
      subscription.contextSubscribed = true
    }
  }

  function applyMirroredSessionStatus(entry: RemoteRuntimeEntry<Context>, event: RemoteRuntimeEventInput) {
    applyRemoteRuntimeMirroredSessionEvent(entry.mirroredSessionStatuses, event)
  }

  function selectRuntimeDirectory(
    entry: RemoteRuntimeEntry<Context>,
    payload: RuntimeWebSocketDirectorySelectPayload,
  ): RuntimeWebSocketDirectorySelectResponse {
    const directory = allowedRuntimeDirectories(entry).find(
      (candidate) => candidate.directoryId === payload.directoryId,
    )
    if (!directory) {
      throw new Error("Remote runtime directory is not allowlisted for this runtime installation.")
    }
    materializeAllowedDirectoryEntry({
      directoryId: payload.directoryId,
      runtimeInstallationId: entry.status.runtimeInstallationId,
    })
    return {
      attachment:
        activeDirectoryAttachments(entry).find((candidate) => candidate.directoryId === payload.directoryId) ?? null,
      directory,
    }
  }

  async function startRemoteRuntimeChat(
    entry: RemoteRuntimeEntry<Context>,
    payload: RuntimeWebSocketChatStartPayload,
  ): Promise<RuntimeWebSocketChatStartResponse> {
    const scopedEntry = entry.status.directoryId === payload.directoryId
      ? entry
      : materializeAllowedDirectoryEntry({
          directoryId: payload.directoryId,
          runtimeInstallationId: entry.status.runtimeInstallationId,
        })
    if (!scopedEntry) {
      throw new Error("Remote runtime directory is not allowlisted for this runtime installation.")
    }
    if (scopedEntry.status.directoryId !== payload.directoryId) {
      throw new Error("Remote runtime chat start must target this runtime attachment directory.")
    }
    const context = await ensureEntryContext(scopedEntry)
    const conversation = await backendRouter(scopedEntry).createConversation({
      context,
      directory: scopedEntry.status.directory,
      directoryId: payload.directoryId,
      model: payload.model ?? null,
      providerId: payload.providerId ?? null,
      title: payload.title ?? null,
    })
    const chat = attachGoalProjection(
      scopedEntry,
      localConversationToRuntimeChat(conversation, scopedEntry.status.directory),
      "read",
    )
    await publishRemoteRuntimeProjection(scopedEntry, {
      activeChat: chat,
      eventType: "session.created",
      projectedMessage: null,
      sessionId: chat.sessionId,
    })
    await publishRemoteRuntimeCommandActivity(scopedEntry, {
      properties: {
        info: sessionInfoFromRemoteRuntimeChat(chat),
        sessionID: chat.sessionId,
      },
      type: "session.updated",
    })
    return { chat }
  }

  async function listRemoteRuntimeProviders(entry: RemoteRuntimeEntry<Context>): Promise<RuntimeProviderListResponse> {
    const context = await ensureEntryContext(entry)
    return mergeRuntimeProviderLists(
      await options.deps.listProviders(context),
      localModelsToRuntimeProviderList(
        (
          await Promise.all(
            localBackends(entry).map((backend) =>
              backend.listModels({
                context,
                directory: entry.status.directory,
              }),
            ),
          )
        ).flat(),
      ),
    )
  }

  async function listRemoteRuntimeActiveChats(
    entry: RemoteRuntimeEntry<Context>,
    payload: RemoteRuntimeActiveChatsListPayload,
  ): Promise<RemoteRuntimeActiveChatsResponse> {
    const context = await ensureEntryContext(entry)
    const page = await listActiveChatProjectionPage(entry, context, payload as RemoteRuntimeActiveChatsReadInput)
    appendLog(
      entry,
      "info",
      `Runtime activeChats.list returned ${page.activeChats.length} active chats hasOlder=${page.pageInfo.hasOlder}.`,
    )
    return page
  }

  async function listRemoteRuntimeChatMessages(
    entry: RemoteRuntimeEntry<Context>,
    payload: RemoteRuntimeChatMessagesPayload,
  ): Promise<RemoteRuntimeChatMessagesResponse> {
    appendLog(
      entry,
      "info",
      `session.messages start sessionId=${payload.sessionId} limit=${payload.limit ?? "<default>"} cursor=${payload.cursor ? "present" : "<none>"}.`,
    )
    const context = await ensureEntryContext(entry)
    try {
      appendLog(entry, "info", `session.messages routing lookup start sessionId=${payload.sessionId}.`)
      const route = await routingMetadata(entry).get({
        conversationId: payload.sessionId,
        directory: entry.status.directory,
      })
      appendLog(
        entry,
        "info",
        `session.messages routing lookup result sessionId=${payload.sessionId} backend=${route?.backendId ?? "<none>"}.`,
      )
      if (!route || route.backendId === "interbaseRuntime") {
        try {
          appendLog(entry, "info", `session.messages interbaseRuntime list start sessionId=${payload.sessionId}.`)
          const page = await options.deps.listSessionMessages(context, payload)
          appendLog(
            entry,
            "info",
            `session.messages interbaseRuntime list success sessionId=${payload.sessionId} messages=${page.messages.length} hasOlder=${page.pageInfo.hasOlder}.`,
          )
          return page
        } catch (error) {
          appendLog(
            entry,
            "error",
            `session.messages interbaseRuntime list failed sessionId=${payload.sessionId}: ${errorDiagnostic(error)}`,
          )
          if (route?.backendId === "interbaseRuntime") throw error
        }
      }
      appendLog(entry, "info", `session.messages local backend read start sessionId=${payload.sessionId}.`)
      const detail = await backendRouter(entry).readConversation({
        context,
        conversationId: payload.sessionId,
        directory: entry.status.directory,
      })
      const page = createRemoteRuntimeChatMessagesPage(
        payload.sessionId,
        localConversationDetailToRuntimeMessages(detail),
        payload,
      )
      appendLog(
        entry,
        "info",
        `session.messages local backend read success sessionId=${payload.sessionId} backend=${detail.backendId} messages=${page.messages.length} hasOlder=${page.pageInfo.hasOlder}.`,
      )
      return page
    } catch (error) {
      appendLog(entry, "error", `session.messages failed sessionId=${payload.sessionId}: ${errorDiagnostic(error)}`)
      throw error
    }
  }

  async function updateRemoteRuntimeChat(
    entry: RemoteRuntimeEntry<Context>,
    payload: RuntimeWebSocketSessionUpdatePayload,
  ): Promise<RuntimeWebSocketChatStartResponse> {
    const context = await ensureEntryContext(entry)
    const chat = attachGoalProjection(
      entry,
      localConversationToRuntimeChat(
        await backendRouter(entry).updateConversationModel({
          context,
          conversationId: payload.sessionId,
          directory: entry.status.directory,
          model: payload.input.model ?? "",
          providerId: payload.input.providerId ?? null,
        }),
        entry.status.directory,
      ),
      "read",
    )
    await publishRemoteRuntimeProjection(entry, {
      activeChat: chat,
      eventType: "session.updated",
      projectedMessage: null,
      sessionId: payload.sessionId,
    })
    await publishRemoteRuntimeCommandActivity(entry, {
      properties: {
        info: sessionInfoFromRemoteRuntimeChat(chat),
        sessionID: payload.sessionId,
      },
      type: "session.updated",
    })
    return { chat }
  }

  async function sendRemoteRuntimeChatMessage(
    entry: RemoteRuntimeEntry<Context>,
    payload: RuntimeWebSocketSessionMessagePayload,
  ): Promise<RemoteRuntimeSendMessageResponse> {
    const context = await ensureEntryContext(entry)
    const router = backendRouter(entry)
    const resolvedPayload = resolveRemoteRuntimePromptAlias(entry, payload)
    const accepted = await sessionTurns.submit({
      context,
      directory: entry.status.directory,
      payload: resolvedPayload,
      router,
    })
    const conversation = await router.readConversation({
      context,
      conversationId: resolvedPayload.sessionId,
      directory: entry.status.directory,
    })
    const projectedMessage =
      localConversationDetailToRuntimeMessages(conversation).find((message) => message.id === accepted.message.id) ??
      accepted.message
    await publishRemoteRuntimeProjection(entry, {
      activeChat: attachGoalProjection(
        entry,
        localConversationToRuntimeChat(conversation, entry.status.directory),
        "read",
      ),
      eventType: "session.message.completed",
      projectedMessage,
      sessionId: resolvedPayload.sessionId,
    })
    await publishRemoteRuntimeCommandActivity(entry, {
      properties: {
        info: messageInfoFromRemoteRuntimeMessage(projectedMessage),
        sessionID: resolvedPayload.sessionId,
      },
      type: "message.updated",
    })
    await Promise.all(
      projectedMessage.parts.map((part: RemoteRuntimeChatMessageProjection["parts"][number]) =>
        publishRemoteRuntimeCommandActivity(entry, {
          properties: {
            part: partInfoFromRemoteRuntimeMessagePart(part, projectedMessage.id, resolvedPayload.sessionId),
            sessionID: resolvedPayload.sessionId,
          },
          type: "message.part.updated",
        }),
      ),
    )
    return {
      message: projectedMessage,
      sessionId: resolvedPayload.sessionId,
    }
  }

  function resolveRemoteRuntimePromptAlias(
    entry: RemoteRuntimeEntry<Context>,
    payload: RuntimeWebSocketSessionMessagePayload,
  ): RuntimeWebSocketSessionMessagePayload {
    const resolved = promptAliases(entry).resolve(payload.input.content)
    if (!resolved) return payload
    return {
      ...payload,
      input: {
        ...payload.input,
        content: resolved.prompt,
      },
    }
  }

  async function publishRemoteRuntimeCommandActivity(
    entry: RemoteRuntimeEntry<Context>,
    event: RemoteRuntimeEventInput,
  ) {
    if (!entry.context || !options.deps.publishSessionActivity) return
    await options.deps.publishSessionActivity(entry.context, {
      directory: entry.status.directory,
      event: {
        ...event,
        origin: { kind: "remoteRuntimeCommand" },
      },
      origin: { kind: "remoteRuntimeCommand" },
    })
  }

  function readRemoteRuntimeGoal(entry: RemoteRuntimeEntry<Context>, sessionId: string): RemoteRuntimeGoalResponse {
    const goal = goalManager(entry).getGoal(sessionId)
    return goalResponse(goal)
  }

  async function readAuthoritativeRemoteRuntimeGoal(
    entry: RemoteRuntimeEntry<Context>,
    sessionId: string,
  ): Promise<RemoteRuntimeGoalResponse> {
    return (await hasSessionAuthority(entry, sessionId)) ? readRemoteRuntimeGoal(entry, sessionId) : goalResponse(null)
  }

  async function listAuthoritativeRemoteRuntimeGoals(
    entry: RemoteRuntimeEntry<Context>,
    payload: RemoteRuntimeGoalListPayload & RemoteRuntimeProjectionSelector,
  ): Promise<RemoteRuntimeGoalsListResponse> {
    const projectionEntries = projectionEntriesForSelector(entry, payload)
    if (options.deps.listGoals) {
      const page = await options.deps.listGoals({
        ...(payload.cursor ? { cursor: payload.cursor } : {}),
        directories: projectionEntries.map((candidate) => candidate.status.directory),
        ...(payload.limit !== undefined && payload.limit !== null ? { limit: payload.limit } : {}),
        ...(payload.status ? { status: payload.status } : {}),
      })
      const pageInfo = page.pageInfo ?? { hasOlder: false, olderCursor: null }
      appendLog(
        entry,
        "info",
        `goal.list sqlite result directoryId=${entry.status.directoryId} directoryCount=${projectionEntries.length} status=${payload.status ?? "<any>"} returnedGoalCount=${page.goals.length} hasOlder=${pageInfo.hasOlder}.`,
      )
      return { goals: page.goals, pageInfo }
    }
    if (projectionEntries.length > 1) {
      throw new Error("Remote runtime goal aggregation requires a goal list reader.")
    }
    const requestedLimit = typeof payload.limit === "number" && Number.isFinite(payload.limit) ? payload.limit : 20
    const limit = Math.trunc(Math.min(Math.max(requestedLimit, 1), 100))
    const cursor = payload.cursor ? decodeRemoteRuntimeGoalCursor(payload.cursor) : null
    const storedGoals = goalManager(entry).listGoals()
    appendLog(
      entry,
      "info",
      `goal.list start directoryId=${entry.status.directoryId} status=${payload.status ?? "<any>"} limit=${limit} cursor=${payload.cursor ? "present" : "<none>"} goalStateFile=${goalStateFilePath(entry)} storedGoalCount=${storedGoals.length}.`,
    )
    const projectableSessionIds = await listProjectableGoalSessionIds(entry, projectionEntries)
    const authorityFilteredGoals = storedGoals.filter((goal) => projectableSessionIds.has(goal.threadId))
    const filteredGoals = authorityFilteredGoals
      .filter((goal) => payload.status == null || goal.status === payload.status)
      .sort(compareStoredGoalsDescending)
      .filter((goal) => !cursor || compareGoalToCursor(goal, cursor) > 0)
    const pageGoals = filteredGoals.slice(0, limit)
    const hasOlder = filteredGoals.length > limit
    const visibleGoals = hasOlder ? pageGoals.slice(0, limit) : pageGoals
    appendLog(
      entry,
      "info",
      `goal.list result directoryId=${entry.status.directoryId} storedGoalCount=${storedGoals.length} authorityFilteredGoalCount=${authorityFilteredGoals.length} filteredGoalCount=${filteredGoals.length} returnedGoalCount=${visibleGoals.length} hasOlder=${hasOlder}.`,
    )
    return {
      goals: visibleGoals.map(toThreadGoal),
      pageInfo: {
        hasOlder,
        olderCursor: hasOlder ? encodeRemoteRuntimeGoalCursor(visibleGoals.at(-1)!) : null,
      },
    }
  }

  async function listProjectableGoalSessionIds(
    entry: RemoteRuntimeEntry<Context>,
    projectionEntries: RemoteRuntimeEntry<Context>[],
  ): Promise<Set<string>> {
    const activeChatsByEntry = await Promise.all(projectionEntries.map((candidate) => listAllActiveChatsForEntry(candidate)))
    const routingRecordsByEntry = await Promise.all(
      projectionEntries.map((candidate) => routingMetadata(candidate).list({ directory: candidate.status.directory })),
    )
    return new Set([
      ...activeChatsByEntry.flatMap((activeChats) => activeChats.map((activeChat) => activeChat.sessionId)),
      ...routingRecordsByEntry.flatMap((records) => records.map((record) => record.conversationId)),
    ])
  }

  async function mutateRemoteRuntimeGoal(
    entry: RemoteRuntimeEntry<Context>,
    sessionId: string,
    mutate: () => RemoteRuntimeGoalResponse,
  ): Promise<RemoteRuntimeGoalResponse> {
    const response = mutate()
    rememberObservedGoals(entry)
    const activeChat = await readSessionProjectionOrNull(entry, sessionId)
    const invalidates: RemoteRuntimeRealtimeResourceRef[] = [
      { kind: "goals", runtimeInstallationId: entry.status.runtimeInstallationId },
      { kind: "activeChats", runtimeInstallationId: entry.status.runtimeInstallationId },
    ]
    if (activeChat) {
      invalidates.push({ kind: "chat", runtimeInstallationId: entry.status.runtimeInstallationId, sessionId })
      await publishRemoteRuntimeProjection(entry, {
        activeChat,
        eventType: "session.updated",
        projectedMessage: null,
        sessionId,
      })
    }
    if (hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.events")) {
      await publishStandaloneRemoteRuntimeEvent(entry, {
        eventType: "goals.changed",
        payload: {
          goal: response.goal,
          invalidates,
          sessionId,
        },
        resource: { kind: "goals", runtimeInstallationId: entry.status.runtimeInstallationId },
      })
    }
    return response
  }

  async function mutateAuthoritativeRemoteRuntimeGoal(
    entry: RemoteRuntimeEntry<Context>,
    sessionId: string,
    mutate: () => RemoteRuntimeGoalResponse,
  ): Promise<RemoteRuntimeGoalResponse> {
    await ensureProjectableSession(entry, sessionId)
    return await mutateRemoteRuntimeGoal(entry, sessionId, mutate)
  }

  async function ensureProjectableSession(entry: RemoteRuntimeEntry<Context>, sessionId: string): Promise<void> {
    if (!(await hasSessionAuthority(entry, sessionId))) {
      throw new Error(`Remote runtime chat ${sessionId} was not found.`)
    }
  }

  async function hasSessionAuthority(entry: RemoteRuntimeEntry<Context>, sessionId: string): Promise<boolean> {
    const context = await ensureEntryContext(entry)
    const route = await routingMetadata(entry).get({
      conversationId: sessionId,
      directory: entry.status.directory,
    })
    if (route) {
      return true
    }
    const hostChat = await runtimeBridge.readSession(context, { sessionId })
    if (hostChat) {
      return true
    }
    return (
      await backendRouter(entry).listConversations({
        context,
        directory: entry.status.directory,
      })
    ).some((conversation) => conversation.id === sessionId)
  }

  function listRemoteRuntimeAliases(entry: RemoteRuntimeEntry<Context>): RemoteRuntimeAliasesListResponse {
    return { aliases: promptAliases(entry).list().map(toPromptAlias) }
  }

  function readRemoteRuntimeAlias(entry: RemoteRuntimeEntry<Context>, alias: string): RemoteRuntimeAliasResponse {
    return { alias: toPromptAliasOrNull(promptAliases(entry).get(alias)) }
  }

  function setRemoteRuntimeAlias(
    entry: RemoteRuntimeEntry<Context>,
    payload: RemoteRuntimeAliasSetPayload,
  ): RemoteRuntimeAliasResponse {
    const response = { alias: toPromptAlias(promptAliases(entry).set(payload.alias, payload.prompt)) }
    rememberObservedAliases(entry)
    return response
  }

  function deleteRemoteRuntimeAlias(
    entry: RemoteRuntimeEntry<Context>,
    alias: string,
  ): RemoteRuntimeAliasDeleteResponse {
    const response = { deleted: promptAliases(entry).delete(alias) }
    rememberObservedAliases(entry)
    return response
  }

  async function publishStandaloneRemoteRuntimeEvent(
    entry: RemoteRuntimeEntry<Context>,
    input: {
      eventType: RemoteRuntimeRealtimeEventType
      payload: Record<string, unknown>
      resource: RemoteRuntimeRealtimeResourceRef
    },
  ) {
    if (entry.remoteRuntimeEventSubscriptions.size === 0) {
      return
    }
    entry.remoteRuntimeEventSequence += 1
    const sequence = entry.remoteRuntimeEventSequence
    await Promise.all(
      [...entry.remoteRuntimeEventSubscriptions.entries()].map(async ([clientAttachmentId, subscription]) =>
        deliverRemoteRuntimeEventEnvelope(
          entry,
          clientAttachmentId,
          subscription,
          await signRemoteRuntimeEventEnvelope(subscription, entry.status.runtimeInstallationId, {
            event: {
              eventType: input.eventType,
              gatewayRuntimeAttachmentId: subscription.gatewayRuntimeAttachmentId,
              payload: input.payload,
              resource: input.resource,
              runtimeInstallationId: entry.status.runtimeInstallationId,
              sequence,
              timestamp: now(),
            },
            type: "event",
          } as unknown as RuntimeWebSocketServerEnvelope),
        ),
      ),
    )
  }

  function createRuntimeCommandHandlers(
    entry: RemoteRuntimeEntry<Context>,
  ): Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> {
    return {
      initialize: async (command) => {
        appendLog(
          entry,
          "info",
          "Runtime initialize returned no active chat compatibility projections; activeChats.list remains the paginated authority.",
        )
        return (await createRemoteRuntimeMetadataCommandHandlers({
          activeDirectoryAttachments: activeDirectoryAttachments(entry),
          allowedDirectories: allowedRuntimeDirectories(entry),
          attachmentCapabilities,
          featureCapabilities: enabledFeatureCapabilities,
          now,
          serverName: "interbase-remote-runtime",
          serverVersion: options.connectorVersion,
          supportedMethods,
        }).initialize(command)) as RuntimeWebSocketInitializeResponse
      },
      ping: (command): RuntimeWebSocketPingResponse =>
        createRemoteRuntimeMetadataCommandHandlers({
          activeDirectoryAttachments: activeDirectoryAttachments(entry),
          allowedDirectories: allowedRuntimeDirectories(entry),
          attachmentCapabilities,
          featureCapabilities: enabledFeatureCapabilities,
          now,
          serverName: "interbase-remote-runtime",
          serverVersion: options.connectorVersion,
          supportedMethods,
        }).ping(command) as RuntimeWebSocketPingResponse,
      "directory.list": (): RuntimeWebSocketDirectoryListResponse => ({
        activeDirectoryAttachments: activeDirectoryAttachments(entry),
        allowedDirectories: [...allowedRuntimeDirectories(entry)],
      }),
      "directory.select": (command): RuntimeWebSocketDirectorySelectResponse =>
        selectRuntimeDirectory(entry, command.payload as RuntimeWebSocketDirectorySelectPayload),
      "agent.list": async () => {
        const context = await ensureEntryContext(entry)
        return backendRouter(entry).listAgents({
          context,
          directory: entry.status.directory,
        })
      },
      "chat.start": async (command): Promise<RuntimeWebSocketChatStartResponse> =>
        startRemoteRuntimeChat(entry, command.payload as RuntimeWebSocketChatStartPayload),
      "provider.list": async (): Promise<RuntimeProviderListResponse> => listRemoteRuntimeProviders(entry),
      "session.list": async (command): Promise<RemoteRuntimeActiveChatsResponse> => {
        return listRemoteRuntimeActiveChats(entry, command.payload as RemoteRuntimeActiveChatsListPayload)
      },
      "activeChats.list": async (command): Promise<RemoteRuntimeActiveChatsResponse> => {
        return listRemoteRuntimeActiveChats(entry, command.payload as RemoteRuntimeActiveChatsListPayload)
      },
      "session.read": async (command): Promise<RuntimeWebSocketChatStartResponse> => {
        const payload = command.payload as RuntimeWebSocketSessionReadPayload
        return {
          chat: await readSessionProjection(entry, payload.sessionId),
        }
      },
      "session.messages": async (command): Promise<RemoteRuntimeChatMessagesResponse> =>
        listRemoteRuntimeChatMessages(entry, command.payload as RemoteRuntimeChatMessagesPayload),
      "session.update": async (command): Promise<RuntimeWebSocketChatStartResponse> =>
        updateRemoteRuntimeChat(entry, command.payload as RuntimeWebSocketSessionUpdatePayload),
      "session.message": async (command): Promise<RemoteRuntimeSendMessageResponse> =>
        sendRemoteRuntimeChatMessage(entry, command.payload as RuntimeWebSocketSessionMessagePayload),
      ...(hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.git.read")
        ? {
            "git.status": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGitStatusResponse> =>
              readRemoteRuntimeGitStatus(entry, command.payload as RemoteRuntimeGitStatusInput),
          }
        : {}),
      ...(hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.read")
        ? {
            "goal.get": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGoalResponse> =>
              readAuthoritativeRemoteRuntimeGoal(entry, (command.payload as RemoteRuntimeGoalGetPayload).sessionId),
          }
        : {}),
      ...(hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.list")
        ? {
            "goal.list": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGoalsListResponse> =>
              listAuthoritativeRemoteRuntimeGoals(entry, {
                ...(command.payload as RemoteRuntimeGoalListPayload),
                runtimeInstallationId: entry.status.runtimeInstallationId,
              }),
          }
        : {}),
      ...(hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.mutate")
        ? {
            "goal.create": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGoalResponse> =>
              ensureProjectableSession(entry, (command.payload as RemoteRuntimeGoalCreatePayload).sessionId).then(() =>
                mutateRemoteRuntimeGoal(entry, (command.payload as RemoteRuntimeGoalCreatePayload).sessionId, () => {
                  const payload = command.payload as RemoteRuntimeGoalCreatePayload
                  return goalResponse(
                    goalManager(entry).createGoal(
                      payload.sessionId,
                      payload.input.objective,
                      payload.input.token_budget,
                    ),
                  )
                }),
              ),
            "goal.edit": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGoalResponse> =>
              mutateAuthoritativeRemoteRuntimeGoal(
                entry,
                (command.payload as RemoteRuntimeGoalEditPayload).sessionId,
                () => {
                  const payload = command.payload as RemoteRuntimeGoalEditPayload
                  const edited = goalManager(entry).editGoalObjective(
                    payload.sessionId,
                    payload.input.objective,
                    payload.input.token_budget,
                  )
                  return goalResponse(edited.goal)
                },
              ),
            "goal.update": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGoalResponse> =>
              mutateAuthoritativeRemoteRuntimeGoal(
                entry,
                (command.payload as RemoteRuntimeGoalUpdatePayload).sessionId,
                () => {
                  const payload = command.payload as RemoteRuntimeGoalUpdatePayload
                  if (payload.input.status === "complete") {
                    return goalResponse(goalManager(entry).updateGoalComplete(payload.sessionId))
                  }
                  return goalResponse(goalManager(entry).updateGoalBlocked(payload.sessionId))
                },
              ),
            "goal.clear": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGoalResponse> =>
              mutateAuthoritativeRemoteRuntimeGoal(
                entry,
                (command.payload as RemoteRuntimeGoalClearPayload).sessionId,
                () => {
                  const payload = command.payload as RemoteRuntimeGoalClearPayload
                  goalManager(entry).clearGoal(payload.sessionId)
                  return { completionBudgetReport: null, goal: null, remainingTokens: null }
                },
              ),
            "goal.pause": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGoalResponse> =>
              mutateAuthoritativeRemoteRuntimeGoal(
                entry,
                (command.payload as RemoteRuntimeGoalPausePayload).sessionId,
                () => {
                  const payload = command.payload as RemoteRuntimeGoalPausePayload
                  return goalResponse(goalManager(entry).setGoalStatus(payload.sessionId, "paused"))
                },
              ),
            "goal.resume": (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeGoalResponse> =>
              mutateAuthoritativeRemoteRuntimeGoal(
                entry,
                (command.payload as RemoteRuntimeGoalResumePayload).sessionId,
                () => {
                  const payload = command.payload as RemoteRuntimeGoalResumePayload
                  return goalResponse(goalManager(entry).setGoalStatus(payload.sessionId, "active"))
                },
              ),
          }
        : {}),
      ...(hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.list")
        ? {
            "alias.list": (): RemoteRuntimeAliasesListResponse => listRemoteRuntimeAliases(entry),
          }
        : {}),
      ...(hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.read")
        ? {
            "alias.get": (command: RemoteRuntimeProtocolClientCommand): RemoteRuntimeAliasResponse =>
              readRemoteRuntimeAlias(entry, (command.payload as RemoteRuntimeAliasGetPayload).alias),
          }
        : {}),
      ...(hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.mutate")
        ? {
            "alias.set": async (command: RemoteRuntimeProtocolClientCommand): Promise<RemoteRuntimeAliasResponse> => {
              const response = setRemoteRuntimeAlias(entry, command.payload as RemoteRuntimeAliasSetPayload)
              if (hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.events")) {
                await publishStandaloneRemoteRuntimeEvent(entry, {
                  eventType: "aliases.changed",
                  payload: {
                    alias: response.alias,
                    invalidates: [{ kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId }],
                  },
                  resource: { kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId },
                })
              }
              return response
            },
            "alias.delete": async (
              command: RemoteRuntimeProtocolClientCommand,
            ): Promise<RemoteRuntimeAliasDeleteResponse> => {
              const payload = command.payload as RemoteRuntimeAliasDeletePayload
              const response = deleteRemoteRuntimeAlias(entry, payload.alias)
              if (hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.events")) {
                await publishStandaloneRemoteRuntimeEvent(entry, {
                  eventType: "aliases.changed",
                  payload: {
                    alias: null,
                    invalidates: [{ kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId }],
                  },
                  resource: { kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId },
                })
              }
              return response
            },
          }
        : {}),
    }
  }

  function localBackends(entry: RemoteRuntimeEntry<Context>) {
    entry.localBackends ??= options.createLocalBackends
      ? options.createLocalBackends({
          claudeStateDirectory: claudeStateDirectory(entry),
          codexHome: options.codexHome,
          context: entry.context,
          now,
          resolveAnthropicAuth: () => (entry.context ? options.deps.getAnthropicAuth?.(entry.context) : undefined),
        })
      : []
    return entry.localBackends
  }

  function backendRouter(entry: RemoteRuntimeEntry<Context>) {
    entry.localBackendRouter ??= createBackendRouter(entry, localBackends(entry))
    return entry.localBackendRouter
  }

  function promptAliases(entry: RemoteRuntimeEntry<Context>) {
    entry.promptAliases ??= new PromptAliasesManager({
      store: new JsonFilePromptAliasesStore(promptAliasesStateFilePath(entry)),
    })
    return entry.promptAliases
  }

  function goalManager(entry: RemoteRuntimeEntry<Context>) {
    entry.goalManager ??= new ThreadGoalManager({
      store: new JsonFileGoalStore(goalStateFilePath(entry)),
    })
    return entry.goalManager
  }

  function goalStateFilePath(entry: RemoteRuntimeEntry<Context>) {
    return path.join(options.goalStateDirectory ?? path.join(entry.status.directory, ".interbase"), "goals.json")
  }

  function promptAliasesStateFilePath(entry: RemoteRuntimeEntry<Context>) {
    return path.join(
      options.promptAliasesStateDirectory ?? path.join(entry.status.directory, ".interbase"),
      "prompt-aliases.json",
    )
  }

  function rememberObservedGoals(entry: RemoteRuntimeEntry<Context>) {
    entry.observedGoals = new Map(
      goalManager(entry)
        .listGoals()
        .map((goal) => [goal.threadId, goal]),
    )
  }

  function rememberObservedAliases(entry: RemoteRuntimeEntry<Context>) {
    entry.observedAliases = new Map(
      promptAliases(entry)
        .list()
        .map((alias) => [alias.alias, alias]),
    )
  }

  function startLocalStateWatchers(entry: RemoteRuntimeEntry<Context>) {
    rememberObservedGoals(entry)
    rememberObservedAliases(entry)
    entry.goalStateWatcher = watchLocalStateFile(goalStateFilePath(entry), () => {
      void queueGoalStateSync(entry)
    })
    entry.aliasesStateWatcher = watchLocalStateFile(promptAliasesStateFilePath(entry), () => {
      void queueAliasesStateSync(entry)
    })
    entry.localStatePoll = setInterval(() => {
      void queueGoalStateSync(entry)
      void queueAliasesStateSync(entry)
    }, 10)
    entry.localStatePoll.unref?.()
  }

  function stopLocalStateWatchers(entry: RemoteRuntimeEntry<Context>) {
    if (entry.localStatePoll) {
      clearInterval(entry.localStatePoll)
      entry.localStatePoll = undefined
    }
    entry.goalStateWatcher?.close()
    entry.goalStateWatcher = undefined
    entry.aliasesStateWatcher?.close()
    entry.aliasesStateWatcher = undefined
  }

  function watchLocalStateFile(filePath: string, onChange: () => void): FSWatcher | undefined {
    const watchPath = nearestExistingDirectory(path.dirname(filePath))
    if (!watchPath) return undefined
    return watch(watchPath, { persistent: false }, () => onChange())
  }

  function nearestExistingDirectory(start: string): string | null {
    let current = start
    while (!existsSync(current)) {
      const parent = path.dirname(current)
      if (parent === current) return null
      current = parent
    }
    return current
  }

  function queueGoalStateSync(entry: RemoteRuntimeEntry<Context>) {
    entry.goalStateSync = (entry.goalStateSync ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        await syncObservedGoalChanges(entry)
      })
    return entry.goalStateSync
  }

  function queueAliasesStateSync(entry: RemoteRuntimeEntry<Context>) {
    entry.aliasesStateSync = (entry.aliasesStateSync ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        await syncObservedAliasChanges(entry)
      })
    return entry.aliasesStateSync
  }

  async function syncObservedGoalChanges(entry: RemoteRuntimeEntry<Context>) {
    const previous = entry.observedGoals ?? new Map<string, StoredThreadGoal>()
    const current = new Map(
      goalManager(entry)
        .listGoals()
        .map((goal) => [goal.threadId, goal]),
    )
    entry.observedGoals = current
    for (const sessionId of changedKeys(previous, current, fingerprintStoredGoal)) {
      if (entry.abort.signal.aborted || !entry.context || !(await hasSessionAuthority(entry, sessionId))) {
        continue
      }
      const goal = current.get(sessionId) ?? null
      const activeChat = await readSessionProjectionOrNull(entry, sessionId)
      const invalidates: RemoteRuntimeRealtimeResourceRef[] = [
        { kind: "goals", runtimeInstallationId: entry.status.runtimeInstallationId },
        { kind: "activeChats", runtimeInstallationId: entry.status.runtimeInstallationId },
      ]
      if (activeChat) {
        invalidates.push({ kind: "chat", runtimeInstallationId: entry.status.runtimeInstallationId, sessionId })
        await publishRemoteRuntimeProjection(entry, {
          activeChat,
          eventType: "session.updated",
          projectedMessage: null,
          sessionId,
        })
      }
      if (hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.events")) {
        await publishStandaloneRemoteRuntimeEvent(entry, {
          eventType: "goals.changed",
          payload: {
            goal: goal ? toThreadGoal(goal) : null,
            invalidates,
            sessionId,
          },
          resource: { kind: "goals", runtimeInstallationId: entry.status.runtimeInstallationId },
        })
      }
    }
  }

  async function syncObservedAliasChanges(entry: RemoteRuntimeEntry<Context>) {
    const previous = entry.observedAliases ?? new Map<string, StoredPromptAlias>()
    const current = new Map(
      promptAliases(entry)
        .list()
        .map((alias) => [alias.alias, alias]),
    )
    entry.observedAliases = current
    for (const alias of changedKeys(previous, current, fingerprintStoredAlias)) {
      if (
        entry.abort.signal.aborted ||
        !hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.events")
      ) {
        continue
      }
      await publishStandaloneRemoteRuntimeEvent(entry, {
        eventType: "aliases.changed",
        payload: {
          alias: toPromptAliasOrNull(current.get(alias) ?? null),
          invalidates: [{ kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId }],
        },
        resource: { kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId },
      })
    }
  }

  function changedKeys<Value>(
    previous: Map<string, Value>,
    current: Map<string, Value>,
    fingerprint: (value: Value) => string,
  ): string[] {
    const keys = new Set([...previous.keys(), ...current.keys()])
    return [...keys].filter((key) => {
      const before = previous.get(key)
      const after = current.get(key)
      if (!before || !after) return before !== after
      return fingerprint(before) !== fingerprint(after)
    })
  }

  function fingerprintStoredGoal(goal: StoredThreadGoal) {
    return JSON.stringify(goal)
  }

  function fingerprintStoredAlias(alias: StoredPromptAlias) {
    return JSON.stringify(alias)
  }

  function attachGoalProjection(
    entry: RemoteRuntimeEntry<Context>,
    chat: RemoteRuntimeActiveChatMetadataProjection,
    scope: "list" | "read" | null = "read",
  ): RemoteRuntimeActiveChatMetadataProjection {
    if (scope === null) {
      return withoutGoalProjection(chat)
    }
    if (scope === "read" && !hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.read")) {
      return withoutGoalProjection(chat)
    }
    if (scope === "list" && !hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.list")) {
      return withoutGoalProjection(chat)
    }
    const goal = goalManager(entry).getGoal(chat.sessionId)
    return { ...chat, goal: goal ? toThreadGoal(goal) : null }
  }

  function createBackendRouter(
    entry: RemoteRuntimeEntry<Context>,
    localBackends: LocalAgentBackend<Context>[],
  ): LocalAgentBackendRouter<Context> {
    if (options.createBackendRouter) {
      return options.createBackendRouter({
        entry,
        localBackends,
        routingMetadata: routingMetadata(entry),
        runtimeBridge,
      })
    }
    if (localBackends.length > 0) {
      throw new Error("Remote runtime manager requires createBackendRouter when local backends are injected.")
    }
    return createHostLocalAgentBackendRouter(runtimeBridge)
  }

  function routingMetadata(entry: RemoteRuntimeEntry<Context>) {
    const stateDirectory = `${entry.status.directory}/.interbase/remote-runtime-agent-backends`
    if (!entry.localRoutingMetadata) {
      const records: LocalRoutingMetadataRecord[] = []
      entry.localRoutingMetadata = options.routingMetadataStore ??
        options.createRoutingMetadataStore?.({ stateDirectory }) ?? {
          async get(input) {
            return (
              records.find(
                (record) => record.directory === input.directory && record.conversationId === input.conversationId,
              ) ?? null
            )
          },
          async list(input) {
            return records.filter((record) => record.directory === input.directory)
          },
          async put(record) {
            const index = records.findIndex(
              (candidate) =>
                candidate.directory === record.directory && candidate.conversationId === record.conversationId,
            )
            if (index >= 0) records.splice(index, 1, record)
            else records.push(record)
          },
        }
    }
    return entry.localRoutingMetadata
  }

  function claudeStateDirectory(entry: RemoteRuntimeEntry<Context>) {
    return `${entry.status.directory}/.interbase/remote-runtime-claude`
  }

  async function listActiveChatProjectionPage(
    entry: RemoteRuntimeEntry<Context>,
    _context: Context,
    payload: RemoteRuntimeActiveChatsReadInput,
  ): Promise<RemoteRuntimeActiveChatsResponse> {
    const projectionEntries = projectionEntriesForSelector(entry, payload)
    const entriesByDirectory = new Map(projectionEntries.map((candidate) => [candidate.status.directory, candidate]))
    const activeChats = (await Promise.all(projectionEntries.map((candidate) => listAllActiveChatsForEntry(candidate))))
      .flat()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    return createConsolidatedActiveChatProjectionPage(
      projectActiveChatsWithMirroredStatus(entriesByDirectory, activeChats),
      payload,
    )
  }

  async function readSessionProjection(
    entry: RemoteRuntimeEntry<Context>,
    sessionId: string,
  ): Promise<RemoteRuntimeActiveChatMetadataProjection> {
    const projected = await readSessionProjectionOrNull(entry, sessionId)
    if (!projected) {
      throw new Error(`Remote runtime chat ${sessionId} was not found.`)
    }
    return projected
  }

  async function readSessionProjectionOrNull(
    entry: RemoteRuntimeEntry<Context>,
    sessionId: string,
  ): Promise<RemoteRuntimeActiveChatMetadataProjection | null> {
    const context = await ensureEntryContext(entry)
    const route = await routingMetadata(entry).get({
      conversationId: sessionId,
      directory: entry.status.directory,
    })
    if (!route || route.backendId === "interbaseRuntime") {
      const hostChat = await runtimeBridge.readSession(context, { sessionId })
      if (hostChat) {
        return activeChatWithMirroredStatus(entry, hostChat, "read") ?? hostChat
      }
    }
    const knownConversation = (
      await backendRouter(entry).listConversations({
        context,
        directory: entry.status.directory,
      })
    ).some((conversation) => conversation.id === sessionId)
    if (!knownConversation && route?.backendId !== undefined && route.backendId !== "interbaseRuntime") {
      return null
    }
    let conversation
    try {
      conversation = await backendRouter(entry).readConversation({
        context,
        conversationId: sessionId,
        directory: entry.status.directory,
      })
    } catch (error) {
      if (!knownConversation && isMissingConversationError(error)) {
        return null
      }
      throw error
    }
    const projectedChat = localConversationToRuntimeChat(conversation, entry.status.directory)
    return activeChatWithMirroredStatus(entry, projectedChat, "read") ?? projectedChat
  }

  async function projectActiveChatForRuntimeEvent(
    entry: RemoteRuntimeEntry<Context>,
    event: RemoteRuntimeEventInput,
    context: Context,
    sessionId: string,
  ) {
    const hostActiveChat = await Promise.resolve(options.deps.projectActiveChat?.(context, sessionId) ?? null)
    if (hostActiveChat) {
      return activeChatWithMirroredStatus(
        entry,
        hostActiveChat,
        goalProjectionScopeForEventType(remoteRuntimeEventType(event)),
      )
    }
    if (
      !isRecord(event.properties) ||
      (event.properties.backendID !== "claude" && event.properties.backendID !== "codex")
    ) {
      return null
    }

    const localConversation =
      (
        await backendRouter(entry).listConversations({
          context,
          directory: entry.status.directory,
        })
      ).find((conversation) => conversation.id === sessionId) ?? null
    return localConversation
      ? activeChatWithMirroredStatus(
          entry,
          localConversationToRuntimeChat(localConversation, entry.status.directory),
          goalProjectionScopeForEventType(remoteRuntimeEventType(event)),
        )
      : null
  }

  function startRemoteRuntimeEventForwarding(
    entry: RemoteRuntimeEntry<Context>,
    clientAttachmentId: string,
    gatewayRuntimeAttachmentId: string,
    deliverRuntimeEnvelope: (envelope: RuntimeWebSocketServerEnvelope) => Promise<void>,
    input?: Pick<
      LocalRemoteRuntimeWebSocketAttachmentInput,
      "runtimeResponseSigningPrivateKey" | "trustedRuntimeClientId"
    >,
  ) {
    if (entry.remoteRuntimeEventSubscriptions.has(clientAttachmentId)) {
      appendLog(entry, "info", `Remote runtime events were already streaming to ${clientAttachmentId}.`)
      return
    }
    const subscriptionContext = entry.context
    if (!subscriptionContext) {
      appendLog(entry, "info", `Remote runtime events for ${clientAttachmentId} will start after project context loads.`)
      void ensureEntryContext(entry).catch((error) => {
        appendLog(entry, "error", `Remote runtime event context load failed: ${errorDiagnostic(error)}`)
      })
    }
    const unsubscribe = subscriptionContext
      ? options.deps.subscribeEvents(subscriptionContext, (event) => {
      const subscription = entry.remoteRuntimeEventSubscriptions.get(clientAttachmentId)
      if (!subscription) return
      void queueRemoteRuntimeEvent(entry, event, clientAttachmentId, subscription)
    })
      : () => undefined
    entry.remoteRuntimeEventSubscriptions.set(clientAttachmentId, {
      consecutiveDeliveryFailures: 0,
      contextSubscribed: subscriptionContext !== undefined,
      deliverRuntimeEnvelope,
      gatewayRuntimeAttachmentId,
      health: "subscribed",
      pending: Promise.resolve(),
      runtimeResponseSigningPrivateKey: input?.runtimeResponseSigningPrivateKey,
      trustedRuntimeClientId: input?.trustedRuntimeClientId ?? "",
      unsubscribe,
    })
    appendLog(entry, "info", `Streaming remote runtime events to ${clientAttachmentId}.`)
  }

  function attachLocalRemoteRuntimeWebSocket(
    input: LocalRemoteRuntimeWebSocketAttachmentInput,
  ): LocalRemoteRuntimeWebSocketAttachmentResult {
    const request = validateRemoteRuntimeClientAttachmentRequest(input.action.payload)
    if (!request.ok) return request
    if (
      request.value.accountId !== input.accountId ||
      request.value.runtimeInstallationId !== input.runtimeInstallationId ||
      request.value.trustedRuntimeClientId !== input.trustedRuntimeClientId
    ) {
      return {
        error: createAuthorizationFailureEnvelope(
          request.value.requestId,
          "Remote runtime attachment does not match the signed WebSocket session authority.",
        ),
        ok: false,
      }
    }
    const selectedEntries = selectRuntimePrimaryOnlineEntries({ runtimeInstallationId: input.runtimeInstallationId })
    if (selectedEntries.length !== 1) {
      return {
        error: createRuntimeUnavailableEnvelope(
          request.value.requestId,
          "No matching online remote runtime is running.",
        ),
        ok: false,
      }
    }
    const entry = selectedEntries[0]
    if (entry.status.accountId !== input.accountId) {
      return {
        error: createAuthorizationFailureEnvelope(
          request.value.requestId,
          "Remote runtime attachment does not match this runtime installation.",
        ),
        ok: false,
      }
    }
    const response: RemoteRuntimeClientAttachment = {
      accountId: input.accountId,
      deviceTrustLevel: "trusted",
      gatewayRuntimeAttachmentId: entry.status.gatewayRuntimeAttachmentId ?? `lgwa_${randomUUID()}`,
      clientAttachmentId: `lmda_${randomUUID()}`,
      runtimeInstallationId: input.runtimeInstallationId,
      status: "attached",
      trustedRuntimeClientId: input.trustedRuntimeClientId,
    }
    startRemoteRuntimeEventForwarding(
      entry,
      response.clientAttachmentId,
      response.gatewayRuntimeAttachmentId,
      input.deliverRuntimeEnvelope,
      input,
    )
    return { ok: true, response }
  }

  function queueRemoteRuntimeEvent(
    entry: RemoteRuntimeEntry<Context>,
    event: RemoteRuntimeEventInput,
    clientAttachmentId: string,
    subscription: RemoteRuntimeEventSubscription,
  ) {
    const run = subscription.pending.then(() =>
      forwardRemoteRuntimeEvent(entry, event, clientAttachmentId, subscription),
    )
    subscription.pending = run
    return run
  }

  async function forwardRemoteRuntimeEvent(
    entry: RemoteRuntimeEntry<Context>,
    event: RemoteRuntimeEventInput,
    clientAttachmentId: string,
    subscription: RemoteRuntimeEventSubscription,
  ) {
    applyMirroredSessionStatus(entry, event)
    const sessionId = remoteRuntimeEventSessionId(event)
    const eventType = remoteRuntimeEventType(event)
    if (!sessionId || !eventType) {
      appendLog(
        entry,
        "info",
        `Ignoring remote runtime event type=${event.type} because session or event type projection was unavailable.`,
      )
      return
    }
    const context = entry.context
    if (!context) {
      appendLog(
        entry,
        "error",
        `Remote runtime could not project event type=${eventType} sessionId=${sessionId} because project context was missing.`,
      )
      return
    }

    entry.remoteRuntimeEventSequence += 1
    const sequence = entry.remoteRuntimeEventSequence
    try {
      const activeChat = remoteRuntimeEventHasInlineStreamingPayload(event)
        ? null
        : await projectActiveChatForRuntimeEvent(entry, event, context, sessionId)
      const payload = await remoteRuntimeEventPayload(context, event, activeChat, options.deps.projectSessionMessage)
      appendLog(
        entry,
        "info",
        `Forwarding remote runtime event sequence=${sequence} eventType=${eventType} sourceType=${event.type} sessionId=${sessionId} activeChat=${remoteRuntimeActiveChatSummary(payload.activeChat)}.`,
      )
      await deliverRemoteRuntimeEventEnvelope(
        entry,
        clientAttachmentId,
        subscription,
        await signRemoteRuntimeEventEnvelope(
          subscription,
          entry.status.runtimeInstallationId,
          compactRemoteRuntimeEventEnvelope(
            {
              activeChat,
              event,
              eventType,
              gatewayRuntimeAttachmentId: subscription.gatewayRuntimeAttachmentId,
              payload,
              resource: remoteRuntimeEventResource(entry.status.runtimeInstallationId, sessionId, eventType),
              runtimeInstallationId: entry.status.runtimeInstallationId,
              sequence,
              sessionId,
              timestamp: now(),
            },
            (message) => appendLog(entry, "info", message),
          ),
        ),
      )
    } catch (error) {
      appendLog(entry, "error", `Remote runtime event delivery failed: ${errorMessage(error)}`)
    }
  }

  async function publishMirroredSessionActivity(input: {
    directory: string
    event: RemoteRuntimeEventInput
    sourceRunId?: string | null
  }) {
    const selected = selectEntries({ directory: input.directory })
    await Promise.all(
      selected.flatMap((entry) =>
        [...entry.remoteRuntimeEventSubscriptions.entries()].map(([clientAttachmentId, subscription]) =>
          queueRemoteRuntimeEvent(entry, input.event, clientAttachmentId, subscription),
        ),
      ),
    )
    if (selected.length === 0) {
      return
    }
    for (const entry of selected) {
      applyMirroredSessionStatus(entry, input.event)
    }
  }

  async function publishRemoteRuntimeProjection(
    entry: RemoteRuntimeEntry<Context>,
    input: {
      activeChat: RemoteRuntimeActiveChatMetadataProjection | null
      eventType: RuntimeWebSocketEventType
      projectedMessage: RemoteRuntimeChatMessageProjection | null
      sessionId: string
    },
  ) {
    if (entry.remoteRuntimeEventSubscriptions.size === 0) {
      return
    }
    entry.remoteRuntimeEventSequence += 1
    const sequence = entry.remoteRuntimeEventSequence
    await Promise.all(
      [...entry.remoteRuntimeEventSubscriptions.entries()].map(async ([clientAttachmentId, subscription]) =>
        deliverRemoteRuntimeEventEnvelope(
          entry,
          clientAttachmentId,
          subscription,
          await signRemoteRuntimeEventEnvelope(
            subscription,
            entry.status.runtimeInstallationId,
            compactRemoteRuntimeEventEnvelope(
              {
                activeChat: input.activeChat,
                event: { properties: { sessionID: input.sessionId }, type: input.eventType },
                eventType: input.eventType,
                gatewayRuntimeAttachmentId: subscription.gatewayRuntimeAttachmentId,
                payload: {
                  activeChat: input.activeChat,
                  projectedMessage: input.projectedMessage,
                  projectedPart: null,
                  textDelta: null,
                  truncated: false,
                },
                resource: remoteRuntimeEventResource(
                  entry.status.runtimeInstallationId,
                  input.sessionId,
                  input.eventType,
                ),
                runtimeInstallationId: entry.status.runtimeInstallationId,
                sequence,
                sessionId: input.sessionId,
                timestamp: now(),
              },
              (message) => appendLog(entry, "info", message),
            ),
          ),
        ),
      ),
    )
  }

  async function deliverRemoteRuntimeEventEnvelope(
    entry: RemoteRuntimeEntry<Context>,
    clientAttachmentId: string,
    subscription: RemoteRuntimeEventSubscription,
    envelope: RuntimeWebSocketServerEnvelope,
  ) {
    try {
      await subscription.deliverRuntimeEnvelope(envelope)
      subscription.consecutiveDeliveryFailures = 0
      subscription.health = "subscribed"
      subscription.lastDeliveryAt = now()
    } catch (error) {
      subscription.consecutiveDeliveryFailures += 1
      subscription.health = "unhealthy"
      appendLog(entry, "error", `Remote runtime event delivery failed: ${errorMessage(error)}`)
      if (subscription.consecutiveDeliveryFailures >= maxRemoteRuntimeEventDeliveryFailures) {
        detachRemoteRuntimeEventSubscription(
          entry,
          clientAttachmentId,
          subscription,
          `Detached remote runtime event subscription ${clientAttachmentId} after repeated delivery failures.`,
        )
      }
    }
  }

  function detachRemoteRuntimeEventSubscription(
    entry: RemoteRuntimeEntry<Context>,
    clientAttachmentId: string,
    subscription: RemoteRuntimeEventSubscription,
    message: string,
  ) {
    if (entry.remoteRuntimeEventSubscriptions.get(clientAttachmentId) === subscription) {
      entry.remoteRuntimeEventSubscriptions.delete(clientAttachmentId)
      subscription.unsubscribe()
      appendLog(entry, "info", message)
    }
  }

  async function signRemoteRuntimeEventEnvelope(
    subscription: RemoteRuntimeEventSubscription,
    runtimeInstallationId: string,
    envelope: RuntimeWebSocketServerEnvelope,
  ): Promise<RuntimeWebSocketServerEnvelope> {
    if (envelope.type !== "event" || !subscription.runtimeResponseSigningPrivateKey) {
      return envelope
    }
    const eventPayload = Buffer.from(JSON.stringify(envelope.event)).toString("base64url")
    const timestamp = now()
    const signature: RuntimeWebSocketEventSignatureProof = await createRuntimeWebSocketEventSignatureProof({
      eventPayload,
      payload: {
        eventPayloadSha256: createHash("sha256").update(eventPayload).digest("base64url"),
        gatewayRuntimeAttachmentId: subscription.gatewayRuntimeAttachmentId,
        keyId: subscription.runtimeResponseSigningPrivateKey.keyId,
        runtimeInstallationId,
        timestamp,
        trustedRuntimeClientId: subscription.trustedRuntimeClientId,
      },
      privateKey: subscription.runtimeResponseSigningPrivateKey,
    })
    const signedEnvelope = { ...envelope, signature }
    return signedEnvelope
  }

  function stopRemoteRuntimeEventForwarding(entry: RemoteRuntimeEntry<Context>) {
    for (const subscription of entry.remoteRuntimeEventSubscriptions.values()) {
      subscription.unsubscribe()
    }
    entry.remoteRuntimeEventSubscriptions.clear()
  }

  async function decryptRemoteRuntimeCommand(
    entry: RemoteRuntimeEntry<Context>,
    payload: RemoteRuntimeEncryptedPayload,
    _frame: RuntimeOperationFrame,
  ): Promise<RemoteRuntimeProtocolClientCommand> {
    if (!entry.runtimeEncryptionKey) {
      throw new Error("Remote runtime encryption is not configured.")
    }
    const decrypted = await decryptRuntimeCommandPayload(payload, entry.runtimeEncryptionKey)
    if (!decrypted.ok) {
      throw new Error(decrypted.error.message)
    }
    return decrypted.value
  }

  function markOnline(entry: RemoteRuntimeEntry<Context>, attachment: GatewayRuntimeAttachment) {
    entry.status.gatewayRuntimeAttachmentId = attachment.gatewayRuntimeAttachmentId
    entry.status.lastHeartbeatAt = now()
    entry.status.state = "online"
    appendLog(entry, "info", `Remote runtime attached through ${attachment.gatewayRuntimeAttachmentId}.`)
    options.onConnected?.(snapshotStatus(entry))
  }

  async function createAttachmentInput(input: RemoteRuntimeStartInput): Promise<RemoteRuntimeConnectorAttachmentInput> {
    const ticket = await options.deps.issueRuntimeAttachmentTicket({
      apiBaseUrl: input.apiBaseUrl,
      authorizationToken: input.authorizationToken,
      runtimeInstallationId: input.runtimeInstallationId,
    })
    return {
      accountId: input.accountId,
      allowedDirectories: [...(input.allowedDirectories && input.allowedDirectories.length > 0
        ? input.allowedDirectories
        : [{ directoryId: input.directoryId, displayName: remoteRuntimeDirectoryDisplayName(input.directory), path: input.directory }])],
      attachmentCapabilities,
      connectorVersion: options.connectorVersion,
      directoryId: input.directoryId,
      directoryPath: input.directory,
      featureCapabilities: enabledFeatureCapabilities,
      requestId: randomUUID(),
      runtimeInstallationId: input.runtimeInstallationId,
      ticket: requiredRemoteRuntimeApiString(ticket, "ticket", "runtime attachment ticket"),
    }
  }

  async function runConnectorSessionLoop(
    entry: RemoteRuntimeEntry<Context>,
    input: RemoteRuntimeStartInput,
    initialAttachmentInput: RemoteRuntimeConnectorAttachmentInput,
  ) {
    let nextAttachmentInput: RemoteRuntimeConnectorAttachmentInput | undefined = initialAttachmentInput
    let consecutiveReattachFailures = 0
    while (!entry.abort.signal.aborted) {
      entry.status.state = "starting"
      try {
        const attachmentInput = nextAttachmentInput ?? (await createAttachmentInput(input))
        nextAttachmentInput = undefined
        const onRemoteRuntimeClientAttachment = ({
          deliverRuntimeEnvelope,
          clientAttachmentId,
        }: {
          deliverRuntimeEnvelope(envelope: RuntimeWebSocketServerEnvelope): Promise<void>
          clientAttachmentId: string
        }) => {
          startRemoteRuntimeEventForwarding(
            entry,
            clientAttachmentId,
            entry.status.gatewayRuntimeAttachmentId ?? clientAttachmentId,
            deliverRuntimeEnvelope,
          )
        }
        const onRemoteRuntimeClientDetached = ({ clientAttachmentId }: { clientAttachmentId: string }) => {
          const subscription = entry.remoteRuntimeEventSubscriptions.get(clientAttachmentId)
          if (!subscription) {
            return
          }
          detachRemoteRuntimeEventSubscription(
            entry,
            clientAttachmentId,
            subscription,
            `Detached remote runtime event subscription ${clientAttachmentId} because the remote runtime attachment closed.`,
          )
        }
        await options.deps.runConnectorRuntimeSession({
          apiBaseUrl: input.apiBaseUrl,
          attachmentInput,
          authorizationToken: input.authorizationToken,
          onAttachment: (attachment) => {
            consecutiveReattachFailures = 0
            markOnline(entry, attachment)
          },
          onRuntimeHeartbeat: () => {
            entry.status.lastHeartbeatAt = now()
          },
          onRemoteRuntimeClientAttachment,
          onRemoteRuntimeClientDetached,
          pollIntervalMs: input.pollIntervalMs,
          pollRuntimeOperations: true,
          decryptRuntimeCommand: (payload, frame) => decryptRemoteRuntimeCommand(entry, payload, frame),
          runtimeCommandHandlers: createRuntimeCommandHandlers(entry) as RemoteRuntimeSupportedCommandHandlers,
          signal: entry.abort.signal,
        })
        return
      } catch (error) {
        if (entry.abort.signal.aborted || !isRuntimeAttachmentReattachSignal(error)) {
          throw error
        }
        stopRemoteRuntimeEventForwarding(entry)
        entry.status.gatewayRuntimeAttachmentId = undefined
        entry.status.state = "starting"
        const delayMs = remoteRuntimeReattachDelayMs(consecutiveReattachFailures, random)
        consecutiveReattachFailures += 1
        appendLog(entry, "info", `Remote runtime gateway attachment was unavailable; reattaching in ${delayMs}ms.`)
        await sleep(delayMs)
      }
    }
  }

  return {
    attachLocalRemoteRuntimeWebSocket,
    async start(input: RemoteRuntimeStartInput): Promise<RemoteRuntimeStatus> {
      const key = remoteRuntimeKey(input)
      const existing = entries.get(key)
      if (existing?.status.state === "starting") {
        appendLog(existing, "info", "Remote runtime already running.")
        return snapshotStatus(existing)
      }
      if (existing?.status.state === "online") {
        appendLog(existing, "info", "Refreshing remote runtime gateway attachment.")
        await stopEntry(existing)
      }
      for (const superseded of supersededRuntimeEntries(input)) {
        if (superseded.key === key || superseded.status.state === "stopped") {
          continue
        }
        appendLog(superseded, "info", "Stopping superseded remote runtime for this account.")
        await stopEntry(superseded)
      }
      const runtimeEncryptionKey = input.runtimeEncryptionKey
        ? remoteRuntimeEncryptionKeyFromSerialized(input.runtimeEncryptionKey)
        : existing?.runtimeEncryptionKey
      const allowedDirectories = input.allowedDirectories && input.allowedDirectories.length > 0
        ? input.allowedDirectories
        : [{
            directoryId: input.directoryId,
            displayName: remoteRuntimeDirectoryDisplayName(input.directory),
            path: input.directory,
          }]

      const abort = new AbortController()
      const entry: RemoteRuntimeEntry<Context> = {
        allowedDirectories,
        abort,
        connectorPrimary: true,
        key,
        logs: existing ? [...existing.logs] : [],
        remoteRuntimeEventSequence: 0,
        remoteRuntimeEventSubscriptions: new Map(),
        mirroredSessionStatuses: existing ? new Map(existing.mirroredSessionStatuses) : new Map(),
        runtimeEncryptionKey,
        status: {
          accountId: input.accountId,
          allowedDirectories,
          apiBaseUrl: input.apiBaseUrl,
          commandEncryptionConfigured: runtimeEncryptionKey !== undefined,
          directoryId: input.directoryId,
          directory: input.directory,
          runtimeInstallationId: input.runtimeInstallationId,
          startedAt: now(),
          state: "starting",
        },
      }
      entries.set(key, entry)
      appendLog(entry, "info", "Starting remote runtime connector.")

      let attachmentInput: RemoteRuntimeConnectorAttachmentInput
      try {
        attachmentInput = await createAttachmentInput(input)
      } catch (error) {
        entries.delete(key)
        stopLocalStateWatchers(entry)
        entry.status.state = "errored"
        entry.status.lastError = errorMessage(error)
        appendLog(entry, "error", `Remote runtime connector failed: ${entry.status.lastError}`)
        throw error
      }

      entry.run = runConnectorSessionLoop(entry, input, attachmentInput)
        .then(() => {
          if (entry.status.state !== "stopping") {
            entry.status.state = abort.signal.aborted ? "stopped" : "stopped"
            appendLog(entry, "info", "Remote runtime connector stopped.")
          }
        })
        .catch((error) => {
          if (abort.signal.aborted) {
            entry.status.state = "stopped"
            appendLog(entry, "info", "Remote runtime connector stopped.")
            return
          }
          entry.status.state = "errored"
          entry.status.lastError = errorMessage(error)
          appendLog(entry, "error", `Remote runtime connector failed: ${entry.status.lastError}`)
        })
        .finally(async () => {
          stopLocalStateWatchers(entry)
          stopRemoteRuntimeEventForwarding(entry)
          if (entry.context) {
            try {
              await options.deps.disposeContext(entry.context)
            } catch {
              // Cleanup is best-effort; the runtime has already stopped or failed.
            }
            entry.context = undefined
          }
        })

      void ensureEntryContext(entry).catch((error) => {
        entry.status.lastError = errorMessage(error)
        appendLog(entry, "error", `Remote runtime project context load failed: ${entry.status.lastError}`)
      })
      await waitForAttachment(entry)
      await Promise.resolve()
      return snapshotStatus(entry)
    },

    async configureEncryption(input: RemoteRuntimeEncryptionInput): Promise<RemoteRuntimeStatus[]> {
      const selected = selectRuntimeConfigurationEntries(input)
      if (selected.length === 0) {
        throw new Error("No matching remote runtime is running.")
      }

      const runtimeEncryptionKey = await remoteRuntimeEncryptionKey(input.setupToken)
      for (const entry of selected) {
        entry.runtimeEncryptionKey = runtimeEncryptionKey
        entry.status.commandEncryptionConfigured = true
        appendLog(entry, "info", "Configured remote runtime encryption.")
      }
      return selected.map(snapshotStatus)
    },

    async stop(selector: RemoteRuntimeStopSelector = { all: true }): Promise<RemoteRuntimeStatus[]> {
      const selected = selectStopEntries(selector).filter((entry) => entry.status.state !== "stopped")
      if (selected.length === 0) return []
      await Promise.all(selected.map((entry) => stopEntry(entry)))
      return selected.map(snapshotStatus)
    },

    status(selector: RemoteRuntimeStatusSelector = { all: true }): RemoteRuntimeStatus[] {
      return ("all" in selector && selector.all ? visibleStatusEntries({}) : visibleStatusEntries(selector)).map(snapshotStatus)
    },

    runtimeStatusSnapshot(selector: RemoteRuntimeInstallationSelector): RemoteRuntimeStatusSnapshot {
      const entry = singleVisibleRuntimeEntry(selector)
      return {
        attachmentCapabilities: [...attachmentCapabilities],
        allowedDirectories: allowedRuntimeDirectories(entry),
        connectorVersion: options.connectorVersion,
        gatewayRuntimeAttachmentId: entry.status.gatewayRuntimeAttachmentId ?? null,
        lastHeartbeatAt: entry.status.lastHeartbeatAt ?? null,
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        runtimeInstallationId: entry.status.runtimeInstallationId,
        state: remoteRuntimeSnapshotState(entry.status.state),
      }
    },

    runtimeDirectoriesSnapshot(selector: RemoteRuntimeInstallationSelector): RemoteRuntimeDirectoriesSnapshot {
      const entry = singleVisibleRuntimeEntry(selector)
      return {
        activeDirectoryAttachments: activeDirectoryAttachments(entry),
        allowedDirectories: allowedRuntimeDirectories(entry),
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        runtimeInstallationId: entry.status.runtimeInstallationId,
      }
    },

    runtimeCapabilitiesSnapshot(selector: RemoteRuntimeInstallationSelector): RemoteRuntimeCapabilitiesSnapshot {
      const entry = singleVisibleRuntimeEntry(selector)
      return {
        attachmentCapabilities: [...attachmentCapabilities],
        featureCapabilities: enabledFeatureCapabilities,
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        runtimeInstallationId: entry.status.runtimeInstallationId,
        supportedMethods: [...supportedMethods],
      }
    },

    async getRemoteRuntimeGoal(
      input: RemoteRuntimeGoalGetPayload & RemoteRuntimeDirectorySelector,
    ): Promise<RemoteRuntimeGoalResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.read")
      const entry = singleSelectedRuntimeEntry(input)
      return await readAuthoritativeRemoteRuntimeGoal(entry, input.sessionId)
    },

    async listRemoteRuntimeGoals(
      input: RemoteRuntimeGoalListPayload & RemoteRuntimeProjectionSelector,
    ): Promise<RemoteRuntimeGoalsListResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.list")
      return await listAuthoritativeRemoteRuntimeGoals(singleActiveChatRuntimeEntry(input), input)
    },

    createRemoteRuntimeGoal(
      input: RemoteRuntimeGoalCreatePayload & RemoteRuntimeDirectorySelector,
    ): Promise<RemoteRuntimeGoalResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.mutate")
      const entry = singleSelectedRuntimeEntry(input)
      return ensureProjectableSession(entry, input.sessionId).then(() =>
        mutateRemoteRuntimeGoal(entry, input.sessionId, () =>
          goalResponse(goalManager(entry).createGoal(input.sessionId, input.input.objective, input.input.token_budget)),
        ),
      )
    },

    editRemoteRuntimeGoal(
      input: RemoteRuntimeGoalEditPayload & RemoteRuntimeDirectorySelector,
    ): Promise<RemoteRuntimeGoalResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.mutate")
      const entry = singleSelectedRuntimeEntry(input)
      return mutateAuthoritativeRemoteRuntimeGoal(entry, input.sessionId, () => {
        const edited = goalManager(entry).editGoalObjective(
          input.sessionId,
          input.input.objective,
          input.input.token_budget,
        )
        return goalResponse(edited.goal)
      })
    },

    updateRemoteRuntimeGoal(
      input: RemoteRuntimeGoalUpdatePayload & RemoteRuntimeDirectorySelector,
    ): Promise<RemoteRuntimeGoalResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.mutate")
      const entry = singleSelectedRuntimeEntry(input)
      return mutateAuthoritativeRemoteRuntimeGoal(entry, input.sessionId, () =>
        goalResponse(
          input.input.status === "complete"
            ? goalManager(entry).updateGoalComplete(input.sessionId)
            : goalManager(entry).updateGoalBlocked(input.sessionId),
        ),
      )
    },

    clearRemoteRuntimeGoal(
      input: RemoteRuntimeGoalClearPayload & RemoteRuntimeDirectorySelector,
    ): Promise<RemoteRuntimeGoalResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.mutate")
      const entry = singleSelectedRuntimeEntry(input)
      return mutateAuthoritativeRemoteRuntimeGoal(entry, input.sessionId, () => {
        goalManager(entry).clearGoal(input.sessionId)
        return { completionBudgetReport: null, goal: null, remainingTokens: null }
      })
    },

    pauseRemoteRuntimeGoal(
      input: RemoteRuntimeGoalPausePayload & RemoteRuntimeDirectorySelector,
    ): Promise<RemoteRuntimeGoalResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.mutate")
      const entry = singleSelectedRuntimeEntry(input)
      return mutateAuthoritativeRemoteRuntimeGoal(entry, input.sessionId, () =>
        goalResponse(goalManager(entry).setGoalStatus(input.sessionId, "paused")),
      )
    },

    resumeRemoteRuntimeGoal(
      input: RemoteRuntimeGoalResumePayload & RemoteRuntimeDirectorySelector,
    ): Promise<RemoteRuntimeGoalResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.mutate")
      const entry = singleSelectedRuntimeEntry(input)
      return mutateAuthoritativeRemoteRuntimeGoal(entry, input.sessionId, () =>
        goalResponse(goalManager(entry).setGoalStatus(input.sessionId, "active")),
      )
    },

    listRemoteRuntimeAliases(input: RemoteRuntimeDirectorySelector): RemoteRuntimeAliasesListResponse {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.list")
      return listRemoteRuntimeAliases(singleSelectedRuntimeEntry(input))
    },

    async readRemoteRuntimeGitStatus(
      input: RemoteRuntimeGitStatusReadInput,
    ): Promise<RemoteRuntimeGitStatusResponse> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.git.read")
      const entry = singleGitStatusRuntimeEntry(input)
      return await readRemoteRuntimeGitStatus(entry, input)
    },

    async readRemoteRuntimeGitStatusSnapshot(
      input: RemoteRuntimeGitStatusReadInput,
    ): Promise<RemoteRuntimeGitStatusSnapshot> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.git.read")
      const entry = singleGitStatusRuntimeEntry(input)
      const status = await readRemoteRuntimeGitStatus(entry, input)
      return {
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        repositories: status.repositories,
        resourceVersion: null,
        runtimeInstallationId: entry.status.runtimeInstallationId,
      }
    },

    async listRemoteRuntimeGoalsSnapshot(input: RemoteRuntimeGoalsReadInput): Promise<RemoteRuntimeGoalsSnapshot> {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.goal.list")
      const entry = singleActiveChatRuntimeEntry(input)
      const page = await listAuthoritativeRemoteRuntimeGoals(entry, input)
      return {
        goals: page.goals,
        pageInfo: page.pageInfo ?? { hasOlder: false, olderCursor: null },
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        resourceVersion: null,
        runtimeInstallationId: entry.status.runtimeInstallationId,
      }
    },

    listRemoteRuntimeAliasesSnapshot(input: RemoteRuntimeDirectorySelector): RemoteRuntimeAliasesSnapshot {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.list")
      const entry = singleSelectedRuntimeEntry(input)
      return {
        aliases: listRemoteRuntimeAliases(entry).aliases,
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        resourceVersion: null,
        runtimeInstallationId: entry.status.runtimeInstallationId,
      }
    },

    getRemoteRuntimeAlias(input: RemoteRuntimeAliasGetPayload & RemoteRuntimeDirectorySelector): RemoteRuntimeAliasResponse {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.read")
      return readRemoteRuntimeAlias(singleSelectedRuntimeEntry(input), input.alias)
    },

    setRemoteRuntimeAlias(input: RemoteRuntimeAliasSetPayload & RemoteRuntimeDirectorySelector): RemoteRuntimeAliasResponse {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.mutate")
      const entry = singleSelectedRuntimeEntry(input)
      const response = setRemoteRuntimeAlias(entry, input)
      if (hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.events")) {
        void publishStandaloneRemoteRuntimeEvent(entry, {
          eventType: "aliases.changed",
          payload: {
            alias: response.alias,
            invalidates: [{ kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId }],
          },
          resource: { kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId },
        })
      }
      return response
    },

    deleteRemoteRuntimeAlias(
      input: RemoteRuntimeAliasDeletePayload & RemoteRuntimeDirectorySelector,
    ): RemoteRuntimeAliasDeleteResponse {
      requireFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.mutate")
      const entry = singleSelectedRuntimeEntry(input)
      const response = deleteRemoteRuntimeAlias(entry, input.alias)
      if (hasFeatureCapability(enabledFeatureCapabilities, "remoteRuntime.alias.events")) {
        void publishStandaloneRemoteRuntimeEvent(entry, {
          eventType: "aliases.changed",
          payload: {
            alias: null,
            invalidates: [{ kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId }],
          },
          resource: { kind: "aliases", runtimeInstallationId: entry.status.runtimeInstallationId },
        })
      }
      return response
    },

    listRemoteRuntimeActiveChats(input: RemoteRuntimeActiveChatsReadInput): Promise<RemoteRuntimeActiveChatsResponse> {
      return listRemoteRuntimeActiveChats(singleActiveChatRuntimeEntry(input), input)
    },

    async listRemoteRuntimeActiveChatsSnapshot(
      input: RemoteRuntimeActiveChatsReadInput,
    ): Promise<RemoteRuntimeActiveChatsSnapshot> {
      const entry = singleActiveChatRuntimeEntry(input)
      const page = await listRemoteRuntimeActiveChats(entry, input)
      return {
        activeChats: page.activeChats,
        pageInfo: page.pageInfo,
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        resourceVersion: null,
        runtimeInstallationId: entry.status.runtimeInstallationId,
        snapshotId: null,
      }
    },

    readRemoteRuntimeChat(input: RemoteRuntimeChatReadInput): Promise<RemoteRuntimeActiveChatMetadataProjection> {
      return readSessionProjection(singleSelectedRuntimeEntry(input), input.sessionId)
    },

    async readRemoteRuntimeChatSnapshot(input: RemoteRuntimeChatReadInput): Promise<RemoteRuntimeChatSnapshot> {
      const entry = singleSelectedRuntimeEntry(input)
      return {
        chat: await readSessionProjection(entry, input.sessionId),
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        resourceVersion: null,
        runtimeInstallationId: entry.status.runtimeInstallationId,
      }
    },

    listRemoteRuntimeChatMessages(
      input: RemoteRuntimeChatMessagesReadInput,
    ): Promise<RemoteRuntimeChatMessagesResponse> {
      return listRemoteRuntimeChatMessages(singleSelectedRuntimeEntry(input), input)
    },

    async listRemoteRuntimeChatMessagesSnapshot(
      input: RemoteRuntimeChatMessagesReadInput,
    ): Promise<RemoteRuntimeChatMessagesSnapshot> {
      const entry = singleSelectedRuntimeEntry(input)
      const page = await listRemoteRuntimeChatMessages(entry, input)
      return {
        messages: page.messages,
        pageInfo: page.pageInfo,
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        resourceVersion: null,
        runtimeInstallationId: entry.status.runtimeInstallationId,
        sessionId: page.sessionId,
      }
    },

    listRemoteRuntimeProviders(input: RemoteRuntimeProviderReadInput): Promise<RuntimeProviderListResponse> {
      return listRemoteRuntimeProviders(singleSelectedRuntimeEntry(input))
    },

    async listRemoteRuntimeProvidersSnapshot(
      input: RemoteRuntimeProviderReadInput,
    ): Promise<RemoteRuntimeProvidersSnapshot> {
      const entry = singleSelectedRuntimeEntry(input)
      return {
        providers: await listRemoteRuntimeProviders(entry),
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        resourceVersion: null,
        runtimeInstallationId: entry.status.runtimeInstallationId,
      }
    },

    startRemoteRuntimeChat(input: RemoteRuntimeStartChatInput): Promise<RuntimeWebSocketChatStartResponse> {
      return startRemoteRuntimeChat(singleSelectedRuntimeEntry(input), input)
    },

    updateRemoteRuntimeChat(input: RemoteRuntimeUpdateChatInput): Promise<RuntimeWebSocketChatStartResponse> {
      return updateRemoteRuntimeChat(singleSelectedRuntimeEntry(input), input)
    },

    sendRemoteRuntimeChatMessage(input: RemoteRuntimeSendChatMessageInput): Promise<RemoteRuntimeSendMessageResponse> {
      return sendRemoteRuntimeChatMessage(singleSelectedRuntimeEntry(input), input)
    },

    logs(selector: RemoteRuntimeStatusSelector = { all: true }): RemoteRuntimeLogEntry[] {
      return ("all" in selector && selector.all ? visibleStatusEntries({}) : visibleStatusEntries(selector)).flatMap(
        (entry) => entry.logs,
      )
    },

    publishSessionActivity(input: {
      directory: string
      event: RemoteRuntimeEventInput
      sourceRunId?: string | null
    }): Promise<void> {
      return publishMirroredSessionActivity(input)
    },

    features(): RemoteRuntimeFeatureSet {
      return remoteRuntimeFeatureSet()
    },
  }
}

async function remoteRuntimeEncryptionKey(setupToken: string): Promise<RemoteRuntimeEncryptionKey> {
  return {
    key: createHash("sha256").update(setupToken).digest(),
    keyId: "client_setup_token:v1",
  }
}

function remoteRuntimeEncryptionKeyFromSerialized(
  input: RemoteRuntimeSerializedEncryptionKey,
): RemoteRuntimeEncryptionKey {
  return {
    key: Buffer.from(input.keyBase64, "base64url"),
    keyId: input.keyId,
  }
}

function remoteRuntimeKey(input: { accountId: string; directory: string; runtimeInstallationId: string }) {
  return [input.directory, input.accountId, input.runtimeInstallationId].join("\0")
}

function defaultNow() {
  return new Date().toISOString()
}

function defaultRandomUUID() {
  return crypto.randomUUID()
}

function defaultSleep(milliseconds: number) {
  return sleepTimeout(milliseconds)
}

function enabledRemoteRuntimeSupportedMethods(
  featureCapabilities: readonly RemoteRuntimeCapability[],
): RemoteRuntimeProtocolClientMethod[] {
  return remoteRuntimeSupportedMethods.filter((method) => remoteRuntimeMethodEnabled(method, featureCapabilities))
}

function remoteRuntimeMethodEnabled(
  method: RemoteRuntimeProtocolClientMethod,
  featureCapabilities: readonly RemoteRuntimeCapability[],
): boolean {
  const requiredCapabilities = remoteRuntimeFeatureCapabilitiesForMethod(method)
  return (
    requiredCapabilities.length === 0 ||
    requiredCapabilities.every((capability) => hasFeatureCapability(featureCapabilities, capability))
  )
}

function remoteRuntimeFeatureCapabilitiesForMethod(
  method: RemoteRuntimeProtocolClientMethod,
): readonly RemoteRuntimeCapability[] {
  switch (method) {
    case "git.status":
      return ["remoteRuntime.git.read"]
    case "goal.get":
      return ["remoteRuntime.goal.read"]
    case "goal.list":
      return ["remoteRuntime.goal.list"]
    case "goal.create":
    case "goal.edit":
    case "goal.update":
    case "goal.clear":
    case "goal.pause":
    case "goal.resume":
      return ["remoteRuntime.goal.mutate"]
    case "alias.get":
      return ["remoteRuntime.alias.read"]
    case "alias.list":
      return ["remoteRuntime.alias.list"]
    case "alias.set":
    case "alias.delete":
      return ["remoteRuntime.alias.mutate"]
    default:
      return []
  }
}

function hasFeatureCapability(
  featureCapabilities: readonly RemoteRuntimeCapability[],
  capability: RemoteRuntimeCapability,
): boolean {
  return featureCapabilities.includes(capability)
}

function requireFeatureCapability(
  featureCapabilities: readonly RemoteRuntimeCapability[],
  capability: RemoteRuntimeCapability,
) {
  if (!hasFeatureCapability(featureCapabilities, capability)) {
    throw new Error(`Remote runtime capability ${capability} is not enabled.`)
  }
}

function snapshotStatus<Context>(entry: RemoteRuntimeEntry<Context>): RemoteRuntimeStatus {
  return {
    accountId: entry.status.accountId,
    allowedDirectories: entry.allowedDirectories,
    apiBaseUrl: entry.status.apiBaseUrl,
    commandEncryptionConfigured: entry.status.commandEncryptionConfigured,
    ...(entry.status.gatewayRuntimeAttachmentId ? { gatewayRuntimeAttachmentId: entry.status.gatewayRuntimeAttachmentId } : {}),
    ...(entry.status.lastError ? { lastError: entry.status.lastError } : {}),
    ...(entry.status.lastHeartbeatAt ? { lastHeartbeatAt: entry.status.lastHeartbeatAt } : {}),
    runtimeInstallationId: entry.status.runtimeInstallationId,
    ...(entry.status.startedAt ? { startedAt: entry.status.startedAt } : {}),
    state: entry.status.state,
  }
}

function remoteRuntimeSnapshotState(state: RemoteRuntimeState): RemoteRuntimeStatusSnapshot["state"] {
  switch (state) {
    case "online":
      return "online"
    case "stopped":
      return "offline"
    case "errored":
      return "unavailable"
    case "starting":
    case "stopping":
      return "unavailable"
  }
}

function remoteRuntimeEventSessionId(event: RemoteRuntimeEventInput): string | null {
  const properties = event.properties
  if (!isRecord(properties)) {
    return null
  }
  const sessionId = properties.sessionID
  return typeof sessionId === "string" && sessionId.length > 0 ? sessionId : null
}

function sessionInfoFromRemoteRuntimeChat(chat: RemoteRuntimeActiveChatMetadataProjection) {
  return {
    id: chat.sessionId,
    ...(chat.model && chat.providerId ? { model: { id: chat.model, providerID: chat.providerId } } : {}),
    title: chat.title,
    time: {
      created: dateMs(chat.createdAt),
      updated: dateMs(chat.updatedAt),
    },
  }
}

function messageInfoFromRemoteRuntimeMessage(message: RemoteRuntimeChatMessageProjection) {
  return {
    ...(message.agent ? { agent: message.agent } : {}),
    ...(message.finishReason ? { finish: message.finishReason } : {}),
    id: message.id,
    ...(message.model ? { modelID: message.model } : {}),
    ...(message.parentId ? { parentID: message.parentId } : {}),
    role: message.role,
    sessionID: message.sessionId,
    time: {
      created: dateMs(message.createdAt),
      ...(message.completedAt ? { completed: dateMs(message.completedAt) } : {}),
    },
  }
}

function partInfoFromRemoteRuntimeMessagePart(
  part: RemoteRuntimeChatMessageProjection["parts"][number],
  messageId: string,
  sessionId: string,
) {
  return {
    ...(part.rawPart ?? {}),
    id: part.id,
    messageID: part.messageId ?? messageId,
    sessionID: sessionId,
    type: part.kind,
  }
}

function dateMs(value: string) {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function remoteRuntimeEventType(event: RemoteRuntimeEventInput): RuntimeWebSocketEventType | null {
  switch (event.type) {
    case "session.created":
      return "session.created"
    case "session.updated":
    case "session.status":
      return "session.updated"
    case "session.deleted":
      return "session.closed"
    case "message.updated":
      return "session.message.completed"
    case "message.part.updated":
    case "message.part.delta":
      return "session.output.delta"
    case "message.removed":
    case "message.part.removed":
      return "session.updated"
    default:
      return null
  }
}

function remoteRuntimeEventResource(
  runtimeInstallationId: string,
  sessionId: string,
  eventType: RuntimeWebSocketEventType,
): RemoteRuntimeRealtimeResourceRef {
  switch (eventType) {
    case "session.message.created":
    case "session.output.delta":
    case "session.output.completed":
    case "session.message.completed":
      return { kind: "chatMessages", runtimeInstallationId, sessionId }
    case "session.updated":
      return { kind: "chat", runtimeInstallationId, sessionId }
    default:
      return { kind: "activeChats", runtimeInstallationId }
  }
}

function goalProjectionScopeForEventType(eventType: RuntimeWebSocketEventType | null): "list" | "read" | null {
  switch (eventType) {
    case "session.created":
    case "session.closed":
      return "list"
    case "session.updated":
      return "read"
    default:
      return null
  }
}

function eventProjectedPart(event: RemoteRuntimeEventInput): unknown {
  if (event.type !== "message.part.updated" || !isRecord(event.properties)) {
    return null
  }
  if (!isRecord(event.properties.part)) {
    return null
  }
  if (jsonByteLength(event.properties.part) > remoteRuntimeProjectedPartMaxBytes) {
    return null
  }
  return projectRemoteRuntimeEventPart(event.properties.part)
}

async function remoteRuntimeEventPayload<Context>(
  context: Context,
  event: RemoteRuntimeEventInput,
  activeChat: RemoteRuntimeActiveChatMetadataProjection | null,
  projectSessionMessage: RemoteRuntimeHostDeps<Context>["projectSessionMessage"],
) {
  const projectedPart = compactEventValue(eventProjectedPart(event))
  const projectedMessageSource = await remoteRuntimeEventMessage(context, event, projectSessionMessage)
  const projectedMessage = compactEventValue(projectedMessageSource)
  const textDeltaSource = remoteRuntimeEventTextDelta(event)
  const textDelta = compactEventValue(textDeltaSource)
  return {
    activeChat,
    projectedMessage,
    projectedPart,
    textDelta,
    truncated:
      (remoteRuntimeEventHasPartSource(event) && projectedPart === null) ||
      (projectedMessageSource !== null && projectedMessage === null) ||
      (textDeltaSource !== null && textDelta === null),
  }
}

function remoteRuntimeEventHasInlineStreamingPayload(event: RemoteRuntimeEventInput) {
  return eventProjectedPart(event) !== null || remoteRuntimeEventTextDelta(event) !== null
}

function remoteRuntimeEventHasPartSource(event: RemoteRuntimeEventInput) {
  return event.type === "message.part.updated" && isRecord(event.properties) && isRecord(event.properties.part)
}

async function remoteRuntimeEventMessage<Context>(
  context: Context,
  event: RemoteRuntimeEventInput,
  projectSessionMessage: RemoteRuntimeHostDeps<Context>["projectSessionMessage"],
) {
  if (!projectSessionMessage || !isRecord(event.properties)) {
    return null
  }
  const sessionId = event.properties.sessionID as string
  if (event.type === "message.part.updated") {
    const messageId =
      isRecord(event.properties.part) && typeof event.properties.part.messageID === "string"
        ? event.properties.part.messageID
        : null
    return messageId ? await projectSessionMessage(context, sessionId, messageId) : null
  }
  if (
    event.type !== "message.updated" ||
    !isRecord(event.properties.info) ||
    typeof event.properties.info.id !== "string"
  ) {
    return null
  }
  return await projectSessionMessage(context, sessionId, event.properties.info.id)
}

function remoteRuntimeEventTextDelta(event: RemoteRuntimeEventInput) {
  if (event.type !== "message.part.delta" || !isRecord(event.properties)) {
    return null
  }
  return {
    delta: typeof event.properties.delta === "string" ? event.properties.delta : null,
    field: typeof event.properties.field === "string" ? event.properties.field : null,
    messageID: typeof event.properties.messageID === "string" ? event.properties.messageID : null,
    partID: typeof event.properties.partID === "string" ? event.properties.partID : null,
    sessionID: typeof event.properties.sessionID === "string" ? event.properties.sessionID : null,
  }
}

function compactEventValue(value: unknown) {
  if (value === null || value === undefined) {
    return null
  }
  return jsonByteLength(value) > remoteRuntimeProjectedPartMaxBytes ? null : value
}

function projectRemoteRuntimeEventPart(part: Record<string, unknown>) {
  const type = typeof part.type === "string" ? part.type : null
  if (!type) {
    return null
  }

  const payload: Record<string, unknown> = { type }
  if (typeof part.id === "string") {
    payload.id = part.id
  }
  if (typeof part.messageID === "string") {
    payload.messageID = part.messageID
  }

  if (type === "text") {
    if (typeof part.text === "string") {
      payload.text = part.text
    }
    if (typeof part.synthetic === "boolean") {
      payload.synthetic = part.synthetic
    }
    const metadata = recordPart(part.metadata)
    if (typeof metadata?.kind === "string") {
      payload.metadata = { kind: metadata.kind }
    }
    return payload
  }

  if (type === "reasoning") {
    if (typeof part.text === "string") {
      payload.text = part.text
    }
    return payload
  }

  if (type === "tool") {
    if (typeof part.tool === "string") {
      payload.tool = part.tool
    }
    const state = recordPart(part.state)
    if (state) {
      const projectedState: Record<string, unknown> = {}
      if (typeof state.status === "string") {
        projectedState.status = state.status
      }
      if (typeof state.title === "string") {
        projectedState.title = state.title
      }
      const input = projectToolInput(typeof part.tool === "string" ? part.tool : null, recordPart(state.input))
      if (input) {
        projectedState.input = input
      }
      if (typeof state.output === "string") {
        projectedState.output = state.output
      }
      if (typeof state.error === "string") {
        projectedState.error = state.error
      }
      const metadata = projectToolMetadata(
        typeof part.tool === "string" ? part.tool : null,
        recordPart(state.metadata),
        state,
      )
      if (metadata) {
        projectedState.metadata = metadata
      }
      if (recordPart(state.time)?.compacted !== undefined) {
        projectedState.time = { compacted: true }
      }
      if (Object.keys(projectedState).length > 0) {
        payload.state = projectedState
      }
    }
    return payload
  }

  if (type === "file") {
    copyPartString(part, payload, "filename")
    copyPartString(part, payload, "mime")
    copyPartString(part, payload, "url")
    const source = recordPart(part.source)
    if (source) {
      payload.source = source
    }
    return payload
  }

  if (type === "patch") {
    if (Array.isArray(part.files)) {
      payload.files = part.files
    }
    return payload
  }

  if (type === "subtask") {
    copyPartString(part, payload, "description")
    copyPartString(part, payload, "agent")
    copyPartString(part, payload, "prompt")
    return payload
  }

  if (type === "agent") {
    copyPartString(part, payload, "name")
    return payload
  }

  if (type === "snapshot" || type === "step-start") {
    copyPartString(part, payload, "snapshot")
    return payload
  }

  if (type === "step-finish") {
    copyPartString(part, payload, "reason")
    if (typeof part.cost === "number") {
      payload.cost = part.cost
    }
    const tokens = recordPart(part.tokens)
    if (tokens) {
      payload.tokens = tokens
    }
    copyPartString(part, payload, "snapshot")
    return payload
  }

  if (type === "retry") {
    if (typeof part.attempt === "number") {
      payload.attempt = part.attempt
    }
    const error = recordPart(part.error)
    if (error) {
      payload.error = error
    }
    return payload
  }

  if (type === "compaction") {
    if (typeof part.auto === "boolean") {
      payload.auto = part.auto
    }
    if (typeof part.overflow === "boolean") {
      payload.overflow = part.overflow
    }
    copyPartString(part, payload, "tail_start_id")
    return payload
  }

  return payload
}

function projectToolInput(tool: string | null, input: Record<string, unknown> | null) {
  if (!input) {
    return null
  }
  if (tool === "bash") {
    return projectPartObject(input, ["command", "description", "workdir"])
  }
  if (tool === "read") {
    return projectPartObject(input, ["filePath", "path"])
  }
  if (tool === "grep" || tool === "glob") {
    return projectPartObject(input, ["pattern", "path"])
  }
  if (tool === "webfetch") {
    return projectPartObject(input, ["url"])
  }
  if (tool === "websearch") {
    return projectPartObject(input, ["query"])
  }
  if (tool === "task") {
    return projectPartObject(input, ["description", "subagent_type"])
  }
  if (tool === "edit") {
    return projectPartObject(input, ["filePath"])
  }
  if (tool === "write") {
    return projectPartObject(input, ["content", "filePath"])
  }
  if (tool === "apply_patch") {
    return projectPartObject(input, ["filePath"])
  }
  if (tool === "todowrite") {
    return projectPartObject(input, ["todos"])
  }
  if (tool === "question") {
    return projectPartObject(input, ["questions"])
  }
  if (tool === "skill") {
    return projectPartObject(input, ["name"])
  }
  const projected: Record<string, unknown> = {}
  for (const key of Object.keys(input).sort()) {
    const value = input[key]
    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      projected[key] = value
    }
  }
  return Object.keys(projected).length > 0 ? projected : null
}

function projectToolMetadata(
  tool: string | null,
  metadata: Record<string, unknown> | null,
  state: Record<string, unknown>,
) {
  const projected: Record<string, unknown> = {}
  if (tool === "bash") {
    const output =
      typeof metadata?.output === "string" ? metadata.output : typeof state.output === "string" ? state.output : null
    if (output) {
      projected.output = output
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  if (tool === "read") {
    if (Array.isArray(metadata?.loaded)) {
      projected.loaded = metadata.loaded
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  if (tool === "grep") {
    if (metadata?.matches !== undefined) {
      projected.matches = metadata.matches
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  if (tool === "glob") {
    if (metadata?.count !== undefined) {
      projected.count = metadata.count
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  if (tool === "websearch") {
    if (metadata?.numResults !== undefined) {
      projected.numResults = metadata.numResults
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  if (tool === "task") {
    if (typeof metadata?.sessionId === "string") {
      projected.sessionId = metadata.sessionId
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  if (tool === "edit" || tool === "write" || tool === "apply_patch") {
    const filediff = recordPart(metadata?.filediff)
    if (filediff) {
      projected.filediff = filediff
    }
    if (Array.isArray(metadata?.files)) {
      projected.files = metadata.files
    }
    if (metadata?.diff !== undefined) {
      projected.diff = metadata.diff
    }
    const diagnostics = recordPart(metadata?.diagnostics)
    if (diagnostics) {
      projected.diagnostics = diagnostics
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  if (tool === "todowrite") {
    if (Array.isArray(metadata?.todos)) {
      projected.todos = metadata.todos
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  if (tool === "question") {
    if (Array.isArray(metadata?.answers)) {
      projected.answers = metadata.answers
    }
    return Object.keys(projected).length > 0 ? projected : null
  }
  return null
}

function projectPartObject(source: Record<string, unknown>, keys: string[]) {
  const projected: Record<string, unknown> = {}
  for (const key of keys) {
    if (source[key] !== undefined) {
      projected[key] = source[key]
    }
  }
  return Object.keys(projected).length > 0 ? projected : null
}

function copyPartString(source: Record<string, unknown>, target: Record<string, unknown>, key: string) {
  if (typeof source[key] === "string") {
    target[key] = source[key]
  }
}

function recordPart(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function goalResponse(goal: StoredThreadGoal | RemoteRuntimeGoalResponse | null): RemoteRuntimeGoalResponse {
  if (goal && isGoalResponse(goal)) {
    return goal
  }
  return {
    completionBudgetReport: null,
    goal: goal ? toThreadGoal(goal) : null,
    remainingTokens:
      goal?.tokenBudget === null || goal?.tokenBudget === undefined
        ? null
        : Math.max(0, goal.tokenBudget - goal.tokensUsed),
  }
}

function toThreadGoal(goal: StoredThreadGoal): ThreadGoal {
  return {
    createdAt: goal.createdAt,
    objective: goal.objective,
    status: goal.status,
    threadId: goal.threadId,
    timeUsedSeconds: goal.timeUsedSeconds,
    tokenBudget: goal.tokenBudget,
    tokensUsed: goal.tokensUsed,
    updatedAt: goal.updatedAt,
  }
}

type RemoteRuntimeGoalCursor = {
  readonly threadId: string
  readonly updatedAt: number
}

export function encodeRemoteRuntimeGoalCursor(goal: Pick<ThreadGoal, "threadId" | "updatedAt">): string {
  return Buffer.from(JSON.stringify({ threadId: goal.threadId, updatedAt: goal.updatedAt }), "utf8").toString("base64url")
}

export function decodeRemoteRuntimeGoalCursor(cursor: string): RemoteRuntimeGoalCursor {
  try {
    const parsed: RemoteRuntimeJsonValue = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    const record = recordPart(parsed)
    if (
      record &&
      typeof record.threadId === "string" &&
      record.threadId.length > 0 &&
      typeof record.updatedAt === "number" &&
      Number.isSafeInteger(record.updatedAt)
    ) {
      return { threadId: record.threadId, updatedAt: record.updatedAt }
    }
  } catch {
    // Fall through to the explicit validation error below.
  }
  throw new Error("Goal cursor is not valid.")
}

function compareStoredGoalsDescending(left: StoredThreadGoal, right: StoredThreadGoal): number {
  if (left.updatedAt !== right.updatedAt) return right.updatedAt - left.updatedAt
  return right.threadId.localeCompare(left.threadId)
}

function compareGoalToCursor(goal: StoredThreadGoal, cursor: RemoteRuntimeGoalCursor): number {
  if (goal.updatedAt !== cursor.updatedAt) return cursor.updatedAt - goal.updatedAt
  return cursor.threadId.localeCompare(goal.threadId)
}

function toPromptAlias(alias: RemoteRuntimePromptAlias): RemoteRuntimePromptAlias {
  return {
    alias: alias.alias,
    prompt: alias.prompt,
    updatedAt: alias.updatedAt,
  }
}

function toPromptAliasOrNull(alias: RemoteRuntimePromptAlias | null): RemoteRuntimePromptAlias | null {
  return alias ? toPromptAlias(alias) : null
}

function withoutGoalProjection(
  chat: RemoteRuntimeActiveChatMetadataProjection,
): RemoteRuntimeActiveChatMetadataProjection {
  const { goal: _goal, ...rest } = chat
  return rest
}

function isGoalResponse(value: unknown): value is RemoteRuntimeGoalResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "goal" in value &&
    "remainingTokens" in value &&
    "completionBudgetReport" in value
  )
}

function compactRemoteRuntimeEventEnvelope(
  input: {
    activeChat: RemoteRuntimeActiveChatMetadataProjection | null
    event: RemoteRuntimeEventInput
    eventType: RuntimeWebSocketEventType
    gatewayRuntimeAttachmentId: string | null
    payload: Awaited<ReturnType<typeof remoteRuntimeEventPayload>>
    resource: RemoteRuntimeRealtimeResourceRef
    runtimeInstallationId: string
    sequence: number
    sessionId: string
    timestamp: string
  },
  log?: (message: string) => void,
): RuntimeWebSocketServerEnvelope {
  const envelope = remoteRuntimeEventEnvelope(input, input.payload)
  if (jsonByteLength(envelope) <= remoteRuntimeEventFrameMaxBytes) {
    return envelope
  }
  log?.(
    `Compacted remote runtime event sequence=${input.sequence} eventType=${input.eventType} sessionId=${input.sessionId} because payload exceeded ${remoteRuntimeEventFrameMaxBytes} bytes.`,
  )
  return remoteRuntimeEventEnvelope(input, {
    activeChat: null,
    projectedMessage: null,
    projectedPart: null,
    textDelta: null,
    truncated: true,
  })
}

function remoteRuntimeEventEnvelope(
  input: {
    eventType: RuntimeWebSocketEventType
    gatewayRuntimeAttachmentId: string | null
    resource: RemoteRuntimeRealtimeResourceRef
    runtimeInstallationId: string
    sequence: number
    sessionId: string
    timestamp: string
  },
  payload: Awaited<ReturnType<typeof remoteRuntimeEventPayload>>,
): RuntimeWebSocketServerEnvelope {
  const event = {
    eventType: input.eventType,
    gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
    payload,
    resource: input.resource,
    runtimeInstallationId: input.runtimeInstallationId,
    sequence: input.sequence,
    sessionId: input.sessionId,
    timestamp: input.timestamp,
  }
  return {
    event,
    type: "event",
  }
}

function jsonByteLength(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

function errorMessage(error: unknown) {
  return redactRemoteRuntimeDiagnosticString(error instanceof Error ? error.message : String(error))
}

function errorDiagnostic(error: unknown) {
  return redactRemoteRuntimeDiagnosticString(error instanceof Error ? (error.stack ?? error.message) : String(error))
}

function isMissingConversationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }
  return /missing conversation|not found/i.test(error.message)
}

function isRuntimeAttachmentReattachSignal(error: unknown): error is { remoteRuntimeRecovery: "reattach" } {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { remoteRuntimeRecovery?: unknown }).remoteRuntimeRecovery === "reattach"
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
