import type {
  GatewayRuntimeAttachment,
  GatewayRuntimeAttachmentRegistrationRequest,
  GenerateRemoteRuntimeAsymmetricKeyPairInput,
  RemoteRuntimeAsymmetricKeyPair,
  RemoteRuntimeAsymmetricPublicKey,
  RemoteRuntimeAsymmetricPrivateKeyReference,
  RemoteRuntimeCanonicalHttpResponseSigningPayload,
  RemoteRuntimeCanonicalHttpResponseSigningPayloadInput,
  RemoteRuntimeCanonicalHttpSigningPayload,
  RemoteRuntimeCanonicalHttpSigningPayloadInput,
  RemoteRuntimeCanonicalWebSocketActionSigningPayload,
  RemoteRuntimeCanonicalWebSocketActionSigningPayloadInput,
  RemoteRuntimeCanonicalWebSocketUpgradeSigningPayload,
  RemoteRuntimeCanonicalWebSocketUpgradeSigningPayloadInput,
  RemoteRuntimeClientAttachment,
  RemoteRuntimeClientAttachmentRequest,
  RemoteRuntimeEncryptedPayload,
  RemoteRuntimeGitRepositoryStatus,
  RemoteRuntimeGitStatusInput,
  RemoteRuntimeJsonValue,
  RemoteRuntimeKeyPossessionProof,
  RemoteRuntimeKeyPossessionProofAuthority,
  RemoteRuntimeKeyPossessionProofPayloadInput,
  RemoteRuntimeAttachmentCapability,
  RemoteRuntimeMode,
  RemoteRuntimeClientTrustLevel,
  RemoteRuntimeHttpContractVersion,
  RemoteRuntimeHttpResponseSignatureProof,
  RemoteRuntimeRealtimeEventType,
  RemoteRuntimeRequestSignatureProof,
  RemoteRuntimeSerializedEncryptionKey,
  RemoteRuntimeCapability,
  RemoteRuntimeOperationClass,
  RemoteRuntimeStatusSnapshotState,
  RemoteRuntimeResponseSensitivity,
  RemoteRuntimeTransportFailureEnvelope,
  RemoteRuntimeWebSocketActionSignatureProof,
  RemoteRuntimeWebSocketSignedAction,
  RuntimeAttachmentHealth,
  RuntimeConnectionCandidate,
  RuntimeConnectionCandidateBootstrap,
  RuntimeOperationReplyTarget,
  RuntimeStatusFrame,
  RuntimeOwner,
  RuntimeTunnelEdgeAccess,
} from "@interbase/remote-runtime-contracts"
import {
  serializeRemoteRuntimeAsymmetricPublicKey,
  createAttachmentRevokedEnvelope,
  createAuthorizationFailureEnvelope,
  createRemoteRuntimeCanonicalHttpResponseSigningPayload,
  createRemoteRuntimeCanonicalHttpSigningPayload,
  createRemoteRuntimeCanonicalWebSocketActionSigningPayload,
  createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload,
  createPreviousClientKeyPossessionProofPayload,
  createRemoteRuntimeKeyPossessionProofAuthority,
  createRemoteRuntimeTransportFailureEnvelope,
  createRemoteRuntimeKeyPossessionProofPayload,
  createRuntimeStatusFrame,
  createRuntimeUnavailableEnvelope,
  isRemoteRuntimeClientTrustLevel,
  isRemoteRuntimeEncryptedPayloadAlgorithm,
  isRemoteRuntimeEncryptedPayloadContentType,
  isRemoteRuntimeHttpContractVersionSupported,
  isRemoteRuntimeAttachmentCapability,
  isRemoteRuntimePublicKeyPurpose,
  isRemoteRuntimeRealtimeEventType,
  isRemoteRuntimeRealtimeResourceKind,
  isRemoteRuntimeCapability,
  isRemoteRuntimeGitStatusResponse,
  isRemoteRuntimeStatusSnapshotState,
  isRemoteRuntimeOperationClass,
  isRemoteRuntimeTransportFailureEnvelope,
  isRuntimeConnectionCandidateEnvironment,
  isRuntimeConnectionCandidateHostReachability,
  isRuntimeConnectionCandidateKind,
  normalizeRemoteRuntimeGitStatusInput,
  localRemoteRuntimeRequestIdHeaderName,
  localRuntimeAccessTokenHeaderName,
  localRuntimeAccessTokenIdHeaderName,
  remoteRuntimeClientTrustLevelValues,
  remoteRuntimeEncryptedPayloadAlgorithmValues,
  remoteRuntimeEncryptedPayloadContentTypeValues,
  remoteRuntimeHttpContractVersion,
  remoteRuntimeHttpFailureCodeValues,
  remoteRuntimeHttpRequestSignatureHeaderNames,
  remoteRuntimeHttpResponseSignatureHeaderNames,
  remoteRuntimeHttpVersionHeaderName,
  remoteRuntimePublicKeyAlgorithmValues,
  remoteRuntimePublicKeyEncodingValues,
  remoteRuntimePublicKeyPurposeValues,
  remoteRuntimeRealtimeEventTypeValues,
  remoteRuntimeRealtimeResourceKindValues,
  remoteRuntimeRequestSignatureAlgorithmValues,
  remoteRuntimeCapabilityValues,
  remoteRuntimeOperationClassValues,
  remoteRuntimeResponseSensitivityValues,
  remoteRuntimeStatusSnapshotStateValues,
  remoteRuntimeTransportFailureCodeValues,
  remoteRuntimeTransportMessageTypeValues,
  remoteRuntimeTransportPairingActionValues,
  remoteRuntimeTransportProtocolVersion,
  remoteRuntimeWebSocketActionType,
  runtimeWebSocketRemoteRuntimeProtocolVersion,
  remoteRuntimeWebSocketContractVersion,
  remoteRuntimeWebSocketPublicKeyHeaderName,
  remoteRuntimeWebSocketVersionHeaderName,
  previousRemoteRuntimeHttpContractVersion,
  previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
  createAttachmentStatusSequencer,
  runtimeConnectionCandidateEnvironmentValues,
  runtimeConnectionCandidateHostReachabilityValues,
  runtimeConnectionCandidateKindValues,
  runtimeOperationReplyTargetFromFrameAuthority,
  currentRemoteRuntimeSupportedVersions,
  supportedRemoteRuntimeHttpContractVersions,
  supportedRemoteRuntimeTransportProtocolVersions,
  supportedRuntimeWebSocketRemoteRuntimeProtocolVersions,
  remoteRuntimeHttpSigningPayloadScope,
  remoteRuntimeKeyPossessionPayloadScope,
  remoteRuntimeWebSocketActionSigningPayloadScope,
  remoteRuntimeWebSocketUpgradeSigningPayloadScope,
  validateRemoteRuntimeAsymmetricPublicKey,
  validateRuntimeOperationReplyTargetFromFrameAuthority,
} from "@interbase/remote-runtime-contracts"
import {
  allowAllRemoteRuntimeEntitlementProvider,
  disabledRemoteRuntimeEntitlementProvider,
  type RemoteRuntimeEntitlementProvider,
} from "@interbase/remote-runtime-entitlements"
import {
  createRuntimeWebSocketProtocolVersionMismatch,
  isThreadGoalStatus,
  isRuntimeWebSocketProviderThreadSubscriptionPayload,
  isRuntimeWebSocketProtocolVersionSupported,
  isRuntimeWebSocketServerEnvelope,
  runtimeWebSocketProviderModelCommandTypeValues,
  runtimeWebSocketProtocolVersion,
  selectRuntimeWebSocketProtocolVersion,
  supportedRuntimeWebSocketProtocolVersions,
  type RuntimeErrorCode,
  type RuntimeProviderListResponse,
  type ThreadGoal,
  type RuntimeWebSocketProviderModelCommandType,
  type RuntimeWebSocketInitializePayload,
  type RuntimeWebSocketPingResponse,
  type RuntimeWebSocketServerEnvelope,
} from "@interbase/runtime-protocol"
import type {
  RemoteRuntimeProtocolClientCommand,
  RemoteRuntimeProtocolClientMethod,
  RemoteRuntimeActiveChatMetadataProjection,
  RemoteRuntimeActiveChatsListPayload,
  RemoteRuntimeActiveChatsResponse,
  RemoteRuntimeActiveChatsPageInfo,
  RemoteRuntimeChatMessageProjection,
  RemoteRuntimeChatMessagesPayload,
  RemoteRuntimeChatMessagesResponse,
  RemoteRuntimeChatMessagePartJSONValue,
  RemoteRuntimeChatMessagePartPayload,
  RemoteRuntimeChatMessagePartProjection,
  RemoteRuntimeChatMessagesPageInfo,
  RemoteRuntimeGoalsPageInfo,
  RemoteRuntimePromptAlias,
  RemoteRuntimeSendMessageResponse,
  RuntimeWebSocketChatStartResponse,
  RuntimeWebSocketEventResourceRef,
  RuntimeWebSocketAllowedDirectory,
  RuntimeWebSocketDirectoryAttachment,
  RuntimeWebSocketInitializeResponse,
  RuntimeWebSocketEventSignaturePayload,
  RuntimeWebSocketEventSignaturePayloadInput,
  RuntimeWebSocketEventSignatureProof,
} from "@interbase/remote-runtime-contracts"
import {
  createRuntimeWebSocketEventSignaturePayload,
  isRemoteRuntimeProtocolClientCommand,
  isRemoteRuntimeProtocolClientMethod,
  isRemoteRuntimeProtocolServerEnvelopeForMethod,
  remoteRuntimeProtocolClientMethodValues,
  remoteRuntimeProtocolResponseSchemaForMethod,
  remoteRuntimeProtocolResponseSchemas,
  remoteRuntimeThreadStatusValues,
} from "@interbase/remote-runtime-contracts"
import type {
  RemoteRuntimeActiveChatsReadInput,
  RemoteRuntimeChatMessagesReadInput,
  RemoteRuntimeChatReadInput,
  RemoteRuntimeGoalsReadInput,
  RemoteRuntimeGitStatusReadInput,
  RemoteRuntimeProjectionSelector,
  RemoteRuntimeProviderReadInput,
  RemoteRuntimeSendChatMessageInput,
  RemoteRuntimeStartChatInput,
  RemoteRuntimeStatusSelector,
  RemoteRuntimeStopSelector,
  RemoteRuntimeUpdateChatInput,
} from "./local-remote-runtime-gateway.js"
import path from "node:path"
import { setTimeout as sleepTimeout } from "node:timers/promises"

export { createLocalGitStatusReader } from "./local-git-status-reader.js"
export type { LocalGitStatusReaderInput } from "./local-git-status-reader.js"

export type RemoteRuntimeFeatureConfig = {
  readonly enabled: boolean
  readonly mode: RemoteRuntimeMode
  readonly adapter?: string
  readonly entitlements?: "disabled" | "allowAll" | "custom"
}

export const remoteRuntimeDefaultAttachmentCapabilities = [
  "runtime.metadata",
  "runtime.sensitiveRead",
  "runtime.mutate",
] as const

export const remoteRuntimeDefaultFeatureCapabilities = [...remoteRuntimeCapabilityValues] as const

export type RemoteRuntimeCommandHandler = (command: RemoteRuntimeProtocolClientCommand) => Promise<unknown> | unknown

export const remoteRuntimeMetadataSupportedMethods = [
  "initialize",
  "ping",
] as const satisfies readonly RemoteRuntimeProtocolClientMethod[]

export const remoteRuntimeSupportedMethods = [
  ...remoteRuntimeMetadataSupportedMethods,
  "directory.list",
  "directory.select",
  "session.list",
  "activeChats.list",
  "agent.list",
  "chat.start",
  "provider.list",
  "session.read",
  "session.messages",
  "session.update",
  "session.message",
  "git.status",
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
] as const satisfies readonly RemoteRuntimeProtocolClientMethod[]

export type RemoteRuntimeMetadataSupportedMethod = (typeof remoteRuntimeMetadataSupportedMethods)[number]

export type RemoteRuntimeSupportedMethod = (typeof remoteRuntimeSupportedMethods)[number]

export type RemoteRuntimeCommandHandlers<
  Method extends RemoteRuntimeProtocolClientMethod = RemoteRuntimeProtocolClientMethod,
> = Pick<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>, Method>

export type RemoteRuntimeMetadataCommandHandlers = RemoteRuntimeCommandHandlers<RemoteRuntimeMetadataSupportedMethod>

export type RemoteRuntimeSupportedCommandHandlers = RemoteRuntimeCommandHandlers<RemoteRuntimeSupportedMethod>

export function defineRemoteRuntimeCommandHandlers<const Methods extends readonly RemoteRuntimeProtocolClientMethod[]>(
  _supportedMethods: Methods,
  handlers: RemoteRuntimeCommandHandlers<Methods[number]>,
): RemoteRuntimeCommandHandlers<Methods[number]> {
  return handlers
}

export interface RemoteRuntimeCommandAdapterOptions<
  Handlers extends Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = Partial<
    Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>
  >,
> {
  handlers: Handlers
  supportedMethods?: readonly RemoteRuntimeProtocolClientMethod[]
}

export interface RemoteRuntimeMetadataCommandHandlersOptions {
  activeDirectoryAttachments?: readonly RuntimeWebSocketDirectoryAttachment[]
  allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
  attachmentCapabilities: readonly RemoteRuntimeAttachmentCapability[]
  featureCapabilities: readonly RemoteRuntimeCapability[]
  now(): string
  serverName?: string
  serverVersion: string
  supportedMethods: readonly RemoteRuntimeProtocolClientMethod[]
}

export type RemoteRuntimeCapabilitySelection = {
  readonly enabled: boolean
  readonly mode: RemoteRuntimeMode
  readonly adapterId?: string
  readonly entitlementProviderId: string
}

export type RemoteRuntimeHostComposition = {
  readonly selection: RemoteRuntimeCapabilitySelection
  readonly adapter?: RemoteRuntimeHostAdapter
  readonly entitlements: RemoteRuntimeEntitlementProvider
}

export type RemoteRuntimeHostAdapter = {
  readonly id: string
}

export type RemoteRuntimeAdapterResolver<TAdapter extends RemoteRuntimeHostAdapter = RemoteRuntimeHostAdapter> = {
  get(id: string): TAdapter | undefined
}

export type RemoteRuntimeEntitlementResolver = {
  get(id: string): RemoteRuntimeEntitlementProvider | undefined
}

export type RemoteRuntimeHeader = {
  readonly name: string
  readonly value: string
}

export type RemoteRuntimeQueryEntry = {
  readonly name: string
  readonly value: string
}

export type RemoteRuntimeReadSnapshotRoute =
  | { readonly kind: "activeChats" }
  | { readonly kind: "aliases" }
  | { readonly kind: "chat"; readonly sessionId: string }
  | { readonly kind: "chatMessages"; readonly sessionId: string }
  | { readonly kind: "gitStatus" }
  | { readonly kind: "goals" }
  | { readonly kind: "providers" }
  | { readonly kind: "runtimeCapabilities" }
  | { readonly kind: "runtimeDirectories" }
  | { readonly kind: "runtimeStatus" }

export type RemoteRuntimeRouteRequest = {
  readonly method: "GET" | "POST" | "PATCH" | "DELETE"
  readonly path: string
  readonly query: readonly RemoteRuntimeQueryEntry[]
  readonly headers: readonly RemoteRuntimeHeader[]
  readonly body: string | null
}

export type RemoteRuntimeRouteResponse = {
  readonly status: number
  readonly headers: readonly RemoteRuntimeHeader[]
  readonly body: string
}

export type RemoteRuntimeRouteHandler = (
  request: RemoteRuntimeRouteRequest,
) => Promise<RemoteRuntimeRouteResponse> | RemoteRuntimeRouteResponse

export type RemoteRuntimeRouteRegistration = {
  readonly id: string
  readonly method: RemoteRuntimeRouteRequest["method"]
  readonly path: string
  readonly handler: RemoteRuntimeRouteHandler
}

export type RemoteRuntimeRouteRegistry = ReturnType<typeof createRemoteRuntimeRouteRegistry>

export type RemoteRuntimeCliCommandHandler = () => Promise<void> | void

export type RemoteRuntimeCommandRegistration = {
  readonly name: string
  readonly description: string
  readonly handler: RemoteRuntimeCliCommandHandler
}

export type RemoteRuntimeCommandRegistry = ReturnType<typeof createRemoteRuntimeCommandRegistry>

export type RemoteRuntimeHost = {
  readonly password?: string
  readonly pid?: number
  readonly url: string
}

export type RemoteRuntimeHostSelector = {
  readonly directory?: string
  readonly directoryId?: string
  readonly runtimeInstallationId?: string
}

export type RemoteRuntimeHostStatusSelector = RemoteRuntimeStatusSelector

export type RemoteRuntimeHostStopSelector = RemoteRuntimeStopSelector

export type RemoteRuntimeHostPageSelector = RemoteRuntimeProjectionSelector & {
  readonly cursor?: string | null
  readonly limit?: number | null
}

export type RemoteRuntimeHostGitStatusSelector = RemoteRuntimeGitStatusReadInput

export type RemoteRuntimeLaunchAgentInput = {
  readonly accountId: string
  readonly apiBaseUrl: string
  readonly directory: string
  readonly executable: string
  readonly executableArgs?: readonly (string | null | undefined)[]
  readonly intervalSeconds: number
  readonly label: string
  readonly logPath: string
  readonly plistPath: string
  readonly pollIntervalMs?: number
  readonly runtimeInstallationId: string
}

export type RemoteRuntimeLaunchAgentDefinition = {
  readonly label: string
  readonly plist: string
  readonly plistPath: string
  readonly programArguments: readonly (string | null | undefined)[]
}

export type RemoteRuntimeLaunchAgentState = {
  readonly intervalSeconds: number
  readonly label: string
  readonly plistPath: string
  readonly runtimeInstallationId: string
}

export type InstallRemoteRuntimeLaunchAgentInput = {
  readonly accountId: string
  readonly apiBaseUrl: string
  readonly directory: string
  readonly pollIntervalMs?: number
  readonly runtimeInstallationId: string
  readonly startIntervalSeconds?: number
}

export type RemoteRuntimeLaunchdState = {
  readonly launchd?: RemoteRuntimeLaunchAgentState
}

export function parseRemoteRuntimeHost(input: RemoteRuntimeJsonValue): RemoteRuntimeHost {
  if (!isRemoteRuntimeJsonObject(input) || typeof input.url !== "string") throw new Error("invalid schema")
  return {
    ...(typeof input.password === "string" ? { password: input.password } : {}),
    ...(typeof input.pid === "number" ? { pid: input.pid } : {}),
    url: input.url,
  }
}

export function parseRemoteRuntimeLaunchAgentState(input: RemoteRuntimeJsonValue): RemoteRuntimeLaunchAgentState {
  if (
    !isRemoteRuntimeJsonObject(input) ||
    typeof input.intervalSeconds !== "number" ||
    typeof input.label !== "string" ||
    typeof input.plistPath !== "string" ||
    typeof input.runtimeInstallationId !== "string"
  ) {
    throw new Error("invalid schema")
  }
  return {
    intervalSeconds: input.intervalSeconds,
    label: input.label,
    plistPath: input.plistPath,
    runtimeInstallationId: input.runtimeInstallationId,
  }
}

export type RemoteRuntimeLaunchdManagerDeps<TState extends RemoteRuntimeLaunchdState = RemoteRuntimeLaunchdState> = {
  dirname(path: string): string
  hostCommand(): { readonly args: readonly (string | null | undefined)[]; readonly executable: string }
  launchAgentLabel(): string
  launchAgentsDir(): string
  launchctl(args: readonly string[], options?: { readonly tolerateFailure?: boolean }): void
  launchctlGuiDomain(): string
  logPath(): string
  mkdir(path: string, options: { readonly recursive: true }): Promise<void>
  readState(): Promise<TState>
  removeFile(path: string, options: { readonly force: true }): Promise<void>
  shouldManage(): boolean
  writeFile(path: string, data: string, options: { readonly mode: number }): Promise<void>
  writeState(state: Omit<TState, "launchd"> & RemoteRuntimeLaunchdState): Promise<void>
}

export type RemoteRuntimeHostCommandInput = {
  readonly args: readonly string[]
  readonly binPath?: string | null
  readonly execPath: string
  executableBasename(executable: string): string
  readonly scriptPath?: string | null
}

export type RemoteRuntimeHostCommand = {
  readonly args: readonly string[]
  readonly executable: string
}

export type RemoteRuntimeHostProcess = {
  readonly pid?: number
  unref(): void
}

export type RemoteRuntimeHostResolverEnvironment = {
  readonly [name: string]: string | undefined
  readonly INTERBASE_BIN_PATH?: string
  readonly INTERBASE_RUNTIME_CLIENT_HOST_PASSWORD?: string
  readonly INTERBASE_RUNTIME_CLIENT_HOST_PORT?: string
  readonly INTERBASE_RUNTIME_CLIENT_HOST_URL?: string
  readonly INTERBASE_SERVER_PASSWORD?: string
}

export type RemoteRuntimeHostResolverState = {
  readonly host?: RemoteRuntimeHost
}

export type RemoteRuntimeHostResolverDeps<
  TState extends RemoteRuntimeHostResolverState = RemoteRuntimeHostResolverState,
> = {
  readonly defaultPort?: number
  readonly environment: RemoteRuntimeHostResolverEnvironment
  freePort(): Promise<number>
  hostCommand(args: readonly string[]): RemoteRuntimeHostCommand
  isHostCompatible(host: RemoteRuntimeHost): Promise<boolean>
  isPortOccupiedByIncompatibleHost(port: number): Promise<boolean>
  randomUUID(): string
  readState(): Promise<TState>
  spawnDetached(
    executable: string,
    args: readonly string[],
    options: {
      readonly detached: true
      readonly env: RemoteRuntimeHostResolverEnvironment
      readonly stdio: "ignore"
    },
  ): RemoteRuntimeHostProcess
  stopHost?(host: RemoteRuntimeHost): Promise<void>
  waitForHost(host: RemoteRuntimeHost): Promise<void>
  writeState(state: Omit<TState, "host"> & RemoteRuntimeHostResolverState): Promise<void>
}

export type RemoteRuntimeHostResolver = {
  ensure(): Promise<RemoteRuntimeHost>
  read(): Promise<RemoteRuntimeHost | undefined>
}

export type RemoteRuntimeServerStatus = {
  readonly accountId: string
  readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
  readonly apiBaseUrl: string
  readonly commandEncryptionConfigured?: boolean
  readonly gatewayRuntimeAttachmentId?: string
  readonly lastError?: string
  readonly lastHeartbeatAt?: string
  readonly runtimeInstallationId: string
  readonly startedAt?: string
  readonly state: string
}

export type RemoteRuntimeState = "errored" | "online" | "starting" | "stopped" | "stopping"

export type RemoteRuntimeStatus = {
  readonly accountId: string
  readonly allowedDirectories: readonly RuntimeWebSocketAllowedDirectory[]
  readonly apiBaseUrl: string
  readonly commandEncryptionConfigured: boolean
  readonly gatewayRuntimeAttachmentId?: string
  readonly lastError?: string
  readonly lastHeartbeatAt?: string
  readonly runtimeInstallationId: string
  readonly startedAt?: string
  readonly state: RemoteRuntimeState
}

export type RemoteRuntimeLogEntry = {
  readonly level: "error" | "info"
  readonly message: string
  readonly timestamp: string
}

export type RemoteRuntimeServerLogEntry = {
  readonly level: string
  readonly message: string
  readonly timestamp: string
}

export type RemoteRuntimeHostShutdownInput = {
  readonly expectedPid?: number
}

export type RemoteRuntimeFeatureSet = {
  readonly activeChatProjection: true
  readonly commandEncryption: true
  readonly commandEncryptionStatus: true
  readonly trustedFrameAuthorization: true
  readonly liveRuntimeEvents: true
  readonly version: 6
}

export function remoteRuntimeFeatureSet(): RemoteRuntimeFeatureSet {
  return {
    activeChatProjection: true,
    commandEncryption: true,
    commandEncryptionStatus: true,
    trustedFrameAuthorization: true,
    liveRuntimeEvents: true,
    version: 6,
  }
}

export function remoteRuntimeOperationPolicies(): RemoteRuntimeOperationPolicy[] {
  const policies: RemoteRuntimeOperationPolicy[] = []
  for (const method of remoteRuntimeProtocolClientMethodValues) {
    if (method !== "providerModel.command") {
      policies.push({ ...remoteRuntimeMethodPolicy[method], method, subcommand: null })
      continue
    }

    for (const subcommand of runtimeWebSocketProviderModelCommandTypeValues) {
      policies.push({
        ...remoteRuntimeProviderModelSubcommandPolicy[subcommand],
        method,
        subcommand,
      })
    }
  }
  return policies
}

export function remoteRuntimeOperationPolicyForCommand(
  command: RemoteRuntimeProtocolClientCommand,
): RemoteRuntimeOperationPolicy {
  if (command.method !== "providerModel.command") {
    return { ...remoteRuntimeMethodPolicy[command.method], method: command.method, subcommand: null }
  }

  const subcommand = command.payload.command.type
  return {
    ...remoteRuntimeProviderModelSubcommandPolicy[subcommand],
    method: command.method,
    subcommand,
  }
}

export function authorizeRemoteRuntimeCommandWithPolicy(
  command: RemoteRuntimeProtocolClientCommand,
  context: RemoteRuntimeAuthorizationContext,
): RemoteRuntimeAuthorizationResult {
  const policy = remoteRuntimeOperationPolicyForCommand(command)
  if (!context.runtimeAttachmentAuthorized) {
    return remoteRuntimeAuthorizationFailure(command.requestId, "Runtime attachment is not authorized.")
  }
  if (context.operationClass !== policy.class) {
    return remoteRuntimeAuthorizationFailure(command.requestId, "Operation class does not match policy.")
  }
  if (!remoteRuntimeTrustLevelSatisfies(context.deviceTrustLevel, policy.requiredDeviceTrustLevel)) {
    return remoteRuntimeAuthorizationFailure(command.requestId, "Runtime client trust is insufficient.")
  }
  if (policy.encryptionRequired && !context.encrypted) {
    return remoteRuntimeAuthorizationFailure(command.requestId, "Runtime operation requires encryption.")
  }
  if (context.metadataSliceOnly && !policy.metadataSliceAllowed) {
    return remoteRuntimeAuthorizationFailure(command.requestId, "Runtime operation is outside the metadata slice.")
  }
  if (
    policy.requiredAttachmentCapability &&
    !context.attachmentCapabilities.includes(policy.requiredAttachmentCapability)
  ) {
    return remoteRuntimeAuthorizationFailure(command.requestId, "Runtime attachment lacks required capability.")
  }
  if (policy.idempotencyRequired && !isNonEmptyRemoteRuntimeString(context.idempotencyKey)) {
    return remoteRuntimeAuthorizationFailure(command.requestId, "Runtime operation requires an idempotency key.")
  }
  if (
    remoteRuntimeMethodRequiresProviderThreadReplayTarget(command.method) &&
    !isRuntimeWebSocketProviderThreadSubscriptionPayload(command.payload)
  ) {
    return remoteRuntimeAuthorizationFailure(
      command.requestId,
      "Remote runtime replay commands require a provider-thread subscription target.",
    )
  }
  return { ok: true, policy }
}

export function validateRuntimeCommand(
  input: RemoteRuntimeJsonValue,
  fallbackRequestId = "unknown",
): RemoteRuntimeValidationResult<RemoteRuntimeProtocolClientCommand> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", fallbackRequestId, "Runtime command must be an object.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      fallbackRequestId,
      "Runtime command requestId is required.",
    )
  }
  if (typeof input.protocolVersion !== "string" || !isRuntimeWebSocketProtocolVersionSupported(input.protocolVersion)) {
    const receivedVersion = typeof input.protocolVersion === "string" ? input.protocolVersion : "missing"
    return remoteRuntimeValidationFailure(
      "PROTOCOL_MISMATCH",
      input.requestId,
      `Runtime command protocol version is unsupported: received ${receivedVersion}; supported versions: ${supportedRuntimeWebSocketProtocolVersions.join(", ")}. Update the CLI/runtime or update the mobile app so their supported protocol windows overlap.`,
    )
  }
  if (!isRemoteRuntimeProtocolClientCommand(input)) {
    const receivedMethod = typeof input.method === "string" && input.method.length > 0 ? input.method : "missing"
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      `Runtime command method is unknown: received ${receivedMethod}.`,
    )
  }
  return { ok: true, value: input }
}

export function validateEncryptedRuntimePayload(
  input: RemoteRuntimeJsonValue,
  requestId = "unknown",
): RemoteRuntimeValidationResult<RemoteRuntimeEncryptedPayload> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      requestId,
      "Encrypted runtime payload must be an object.",
    )
  }
  if (!isRemoteRuntimeEncryptedPayloadAlgorithm(input.algorithm)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      requestId,
      "Encrypted runtime payload algorithm is unsupported.",
    )
  }
  if (!isRemoteRuntimeEncryptedPayloadContentType(input.contentType)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      requestId,
      "Encrypted runtime payload content type is unsupported.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.keyId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      requestId,
      "Encrypted runtime payload key id is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.nonce)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      requestId,
      "Encrypted runtime payload nonce is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.ciphertext)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      requestId,
      "Encrypted runtime payload ciphertext is required.",
    )
  }
  return { ok: true, value: input as RemoteRuntimeEncryptedPayload }
}

export async function encryptRuntimeCommand(
  command: RemoteRuntimeProtocolClientCommand,
  options: EncryptRuntimeCommandOptions,
): Promise<RemoteRuntimeEncryptedPayload> {
  const validation = validateRuntimeCommand(command as unknown as RemoteRuntimeJsonValue, command.requestId)
  if (!validation.ok) throw new Error(validation.error.message)
  if (!isNonEmptyRemoteRuntimeString(options.keyId)) {
    throw new Error("Encrypted runtime key id is required.")
  }

  const key = await importRemoteRuntimeAesGcmKey(options.key, ["encrypt"])
  const nonce =
    options.nonce === undefined
      ? remoteRuntimeRandomBytes(12)
      : requireRemoteRuntimeByteLength(options.nonce, 12, "Encrypted runtime nonce")
  const payload: RemoteRuntimeEncryptedPayload = {
    algorithm: "aes-256-gcm",
    ciphertext: "",
    contentType: "runtimeWebSocketClientCommand",
    keyId: options.keyId,
    nonce: remoteRuntimeBase64UrlEncode(nonce),
  }
  const plaintext = remoteRuntimeTextEncoder.encode(JSON.stringify(command))
  const encrypted = await crypto.subtle.encrypt(
    {
      additionalData: remoteRuntimeBufferSource(encryptedRuntimePayloadAssociatedData(payload)),
      iv: remoteRuntimeBufferSource(nonce),
      name: "AES-GCM",
    },
    key,
    remoteRuntimeBufferSource(plaintext),
  )
  return { ...payload, ciphertext: remoteRuntimeBase64UrlEncode(new Uint8Array(encrypted)) }
}

export async function decryptRuntimeCommandPayload(
  payload: RemoteRuntimeJsonValue,
  key: RemoteRuntimeEncryptionKey,
): Promise<RemoteRuntimeValidationResult<RemoteRuntimeProtocolClientCommand>> {
  const validation = validateEncryptedRuntimePayload(payload)
  if (!validation.ok) return validation
  const encrypted = validation.value
  if (encrypted.keyId !== key.keyId) {
    return remoteRuntimeValidationFailure("AUTHORIZATION_FAILED", "unknown", "Encrypted runtime key id does not match.")
  }

  try {
    const cryptoKey = await importRemoteRuntimeAesGcmKey(key.key, ["decrypt"])
    const nonce = remoteRuntimeBase64UrlDecode(encrypted.nonce)
    const ciphertext = remoteRuntimeBase64UrlDecode(encrypted.ciphertext)
    const decrypted = await crypto.subtle.decrypt(
      {
        additionalData: remoteRuntimeBufferSource(encryptedRuntimePayloadAssociatedData(encrypted)),
        iv: remoteRuntimeBufferSource(nonce),
        name: "AES-GCM",
      },
      cryptoKey,
      remoteRuntimeBufferSource(ciphertext),
    )
    const command = JSON.parse(remoteRuntimeTextDecoder.decode(decrypted)) as RemoteRuntimeJsonValue
    return validateRuntimeCommand(command)
  } catch {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      "unknown",
      "Encrypted runtime payload could not be decrypted.",
    )
  }
}

export async function generateRemoteRuntimeAsymmetricKeyPair(
  input: GenerateRemoteRuntimeAsymmetricKeyPairInput,
): Promise<RemoteRuntimeAsymmetricKeyPair> {
  if (!isNonEmptyRemoteRuntimeString(input.keyId)) {
    throw new Error("Remote runtime asymmetric key id is required.")
  }
  if (!isRemoteRuntimePublicKeyPurpose(input.purpose)) {
    throw new Error("Remote runtime asymmetric key purpose is unsupported.")
  }
  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
  return {
    privateKey: {
      algorithm: "ed25519",
      encoding: "pkcs8-base64url",
      keyId: input.keyId,
      privateKey: remoteRuntimeBase64UrlEncode(
        new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)),
      ),
      purpose: input.purpose,
    },
    publicKey: {
      algorithm: "ed25519",
      createdAt: input.createdAt,
      encoding: "base64url",
      keyId: input.keyId,
      publicKey: remoteRuntimeBase64UrlEncode(new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey))),
      purpose: input.purpose,
    },
  }
}

export async function createRemoteRuntimeKeyPossessionProof(input: {
  readonly payload: RemoteRuntimeKeyPossessionProofPayloadInput
  readonly privateKey: RemoteRuntimeAsymmetricPrivateKeyReference
  readonly payloadCompatibility?: "previousClient"
}): Promise<RemoteRuntimeKeyPossessionProof> {
  if (input.privateKey.keyId !== input.payload.keyId || input.privateKey.purpose !== input.payload.purpose) {
    throw new Error("Remote runtime key possession proof key does not match payload authority.")
  }
  const payload =
    input.payloadCompatibility === "previousClient"
      ? createPreviousClientKeyPossessionProofPayload(input.payload)
      : createRemoteRuntimeKeyPossessionProofPayload(input.payload)
  return {
    algorithm: "ed25519",
    keyId: input.privateKey.keyId,
    nonce: input.payload.nonce,
    signature: remoteRuntimeBase64UrlEncode(
      new Uint8Array(
        await crypto.subtle.sign(
          { name: "Ed25519" },
          await crypto.subtle.importKey(
            "pkcs8",
            remoteRuntimeBufferSource(remoteRuntimeBase64UrlDecode(input.privateKey.privateKey)),
            { name: "Ed25519" },
            false,
            ["sign"],
          ),
          remoteRuntimeBufferSource(remoteRuntimeTextEncoder.encode(payload)),
        ),
      ),
    ),
    timestamp: input.payload.timestamp,
  }
}

export type RemoteRuntimeSetupKeyPurpose = "remoteRuntimeRequestSigning" | "runtimeResponseSigning"

export type RemoteRuntimeSetupRuntimeKeyPair = RemoteRuntimeAsymmetricKeyPair & {
  readonly serializedPublicKey: string
}

export type RemoteRuntimeSetupKeyMaterialDeps = {
  now(): string
  randomUUID(): string
}

export type RemoteRuntimeSetupLocalRuntimeCredential = {
  readonly localRuntimeAccessToken: string
  readonly localRuntimeAccessTokenId: string
}

export type RemoteRuntimeSetupKeyProofInput = {
  readonly challengeId: string | null
  readonly connectorVersion: string | null
  readonly deviceName: string | null
  readonly keyPair: RemoteRuntimeSetupRuntimeKeyPair
  readonly runtimeInstallationId: string | null
}

export async function createRemoteRuntimeSetupRuntimeKeyPair(
  purpose: RemoteRuntimeSetupKeyPurpose,
  deps: RemoteRuntimeSetupKeyMaterialDeps,
): Promise<RemoteRuntimeSetupRuntimeKeyPair> {
  const keyPair = await generateRemoteRuntimeAsymmetricKeyPair({
    createdAt: deps.now(),
    keyId: `mk_${deps.randomUUID()}`,
    purpose,
  })
  return {
    ...keyPair,
    serializedPublicKey: serializeRemoteRuntimeAsymmetricPublicKey(keyPair.publicKey),
  }
}

export async function createRemoteRuntimeSetupKeyProof(
  input: RemoteRuntimeSetupKeyProofInput,
  deps: RemoteRuntimeSetupKeyMaterialDeps,
): Promise<RemoteRuntimeKeyPossessionProof> {
  return await createRemoteRuntimeKeyPossessionProof({
    payload: {
      challengeId: input.challengeId,
      connectorVersion: input.connectorVersion,
      deviceName: input.deviceName,
      keyId: input.keyPair.publicKey.keyId,
      nonce: `nonce_${deps.randomUUID()}`,
      publicKey: input.keyPair.serializedPublicKey,
      purpose: input.keyPair.publicKey.purpose,
      runtimeInstallationId: input.runtimeInstallationId,
      timestamp: deps.now(),
    },
    privateKey: input.keyPair.privateKey,
  })
}

export async function createRemoteRuntimeSetupKeyProofAuthority(
  input: RemoteRuntimeSetupKeyProofInput,
  deps: RemoteRuntimeSetupKeyMaterialDeps,
): Promise<RemoteRuntimeKeyPossessionProofAuthority> {
  return createRemoteRuntimeKeyPossessionProofAuthority({
    keyProof: await createRemoteRuntimeSetupKeyProof(input, deps),
    publicKey: input.keyPair.serializedPublicKey,
  })
}

export function createRemoteRuntimeSetupLocalRuntimeCredential(
  deps: Pick<RemoteRuntimeSetupKeyMaterialDeps, "randomUUID">,
): RemoteRuntimeSetupLocalRuntimeCredential {
  return {
    localRuntimeAccessToken: `lrt_${deps.randomUUID()}`,
    localRuntimeAccessTokenId: `lrtid_${deps.randomUUID()}`,
  }
}

export async function remoteRuntimeSetupRuntimeEncryptionKey(
  setupToken: string,
): Promise<RemoteRuntimeSerializedEncryptionKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(setupToken))
  return {
    keyBase64: Buffer.from(digest).toString("base64url"),
    keyId: "client_setup_token:v1",
  }
}

export async function verifyRemoteRuntimeKeyPossessionProof(input: {
  readonly maxSkewMs?: number
  readonly nowMs: number
  readonly payload: RemoteRuntimeKeyPossessionProofPayloadInput
  readonly proof: RemoteRuntimeKeyPossessionProof
  readonly publicKey: RemoteRuntimeAsymmetricPublicKey
}): Promise<boolean> {
  if (
    input.proof.algorithm !== "ed25519" ||
    input.proof.keyId !== input.publicKey.keyId ||
    input.proof.keyId !== input.payload.keyId ||
    input.proof.nonce !== input.payload.nonce ||
    input.proof.timestamp !== input.payload.timestamp ||
    input.publicKey.purpose !== input.payload.purpose
  ) {
    return false
  }
  const timestampMs = Date.parse(input.proof.timestamp)
  if (!Number.isFinite(timestampMs) || Math.abs(input.nowMs - timestampMs) > (input.maxSkewMs ?? 5 * 60 * 1000)) {
    return false
  }
  return (
    (await verifyRemoteRuntimeEd25519Signature({
      payload: createRemoteRuntimeKeyPossessionProofPayload(input.payload),
      publicKey: input.publicKey.publicKey,
      signature: input.proof.signature,
    })) ||
    (await verifyRemoteRuntimeEd25519Signature({
      payload: createPreviousClientKeyPossessionProofPayload(input.payload),
      publicKey: input.publicKey.publicKey,
      signature: input.proof.signature,
    }))
  )
}

export async function verifyRemoteRuntimeSetupKeyProofAuthority(input: {
  readonly authority: RemoteRuntimeKeyPossessionProofAuthority
  readonly challengeId: string | null
  readonly connectorVersion: string | null
  readonly deviceName: string | null
  readonly nowMs: number
  readonly publicKey: RemoteRuntimeAsymmetricPublicKey
  readonly runtimeInstallationId: string | null
}): Promise<boolean> {
  return await verifyRemoteRuntimeKeyPossessionProof({
    nowMs: input.nowMs,
    payload: {
      challengeId: input.challengeId,
      connectorVersion: input.connectorVersion,
      deviceName: input.deviceName,
      keyId: input.publicKey.keyId,
      nonce: input.authority.keyProof.nonce,
      publicKey: input.authority.publicKey,
      purpose: input.publicKey.purpose,
      runtimeInstallationId: input.runtimeInstallationId,
      timestamp: input.authority.keyProof.timestamp,
    },
    proof: input.authority.keyProof,
    publicKey: input.publicKey,
  })
}

export async function createRemoteRuntimeHttpResponseSignatureProof(input: {
  readonly payload: RemoteRuntimeCanonicalHttpResponseSigningPayloadInput
  readonly privateKey: RemoteRuntimeAsymmetricPrivateKeyReference
}): Promise<RemoteRuntimeHttpResponseSignatureProof> {
  if (input.privateKey.keyId !== input.payload.keyId || input.privateKey.purpose !== "runtimeResponseSigning") {
    throw new Error("Remote runtime HTTP response signature key does not match runtime response authority.")
  }
  return {
    algorithm: "ed25519",
    bodySha256: input.payload.bodySha256,
    keyId: input.privateKey.keyId,
    nonce: input.payload.nonce,
    signature: await signRemoteRuntimeEd25519Payload({
      payload: createRemoteRuntimeCanonicalHttpResponseSigningPayload(input.payload).payload,
      privateKey: input.privateKey.privateKey,
    }),
    timestamp: input.payload.timestamp,
  }
}

export async function verifyRemoteRuntimeHttpResponseSignature(
  input: RemoteRuntimeHttpResponseSignatureVerificationInput,
): Promise<RemoteRuntimeValidationResult<RemoteRuntimeCanonicalHttpResponseSigningPayload>> {
  const publicKeyValidation = validateRemoteRuntimeAsymmetricPublicKey(input.publicKey)
  if (!publicKeyValidation.ok) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      input.payloadInput.requestId ?? "unknown",
      "Remote runtime HTTP response signature is invalid.",
    )
  }
  if (
    input.publicKey.purpose !== "runtimeResponseSigning" ||
    input.publicKey.keyId !== input.proof.keyId ||
    input.proof.keyId !== input.payloadInput.keyId ||
    input.proof.algorithm !== "ed25519" ||
    input.proof.algorithm !== input.publicKey.algorithm ||
    input.proof.bodySha256 !== input.payloadInput.bodySha256 ||
    input.proof.nonce !== input.payloadInput.nonce ||
    input.proof.timestamp !== input.payloadInput.timestamp
  ) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      input.payloadInput.requestId ?? "unknown",
      "Remote runtime HTTP response signature is invalid.",
    )
  }
  const timestampMs = Date.parse(input.proof.timestamp)
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(input.nowMs - timestampMs) > (input.maxSkewMs ?? defaultRemoteRuntimeSignatureSkewMs)
  ) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      input.payloadInput.requestId ?? "unknown",
      "Remote runtime HTTP response signature is invalid.",
    )
  }

  const signingPayload = createRemoteRuntimeCanonicalHttpResponseSigningPayload(input.payloadInput)
  const verified = await verifyRemoteRuntimeEd25519Signature({
    payload: signingPayload.payload,
    publicKey: input.publicKey.publicKey,
    signature: input.proof.signature,
  })
  if (!verified) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      input.payloadInput.requestId ?? "unknown",
      "Remote runtime HTTP response signature is invalid.",
    )
  }
  return { ok: true, value: signingPayload }
}

export async function createRuntimeWebSocketEventSignatureProof(input: {
  readonly eventPayload: string
  readonly payload: RuntimeWebSocketEventSignaturePayloadInput
  readonly privateKey: RemoteRuntimeAsymmetricPrivateKeyReference
}): Promise<RuntimeWebSocketEventSignatureProof> {
  if (input.privateKey.keyId !== input.payload.keyId || input.privateKey.purpose !== "runtimeResponseSigning") {
    throw new Error("Runtime WebSocket event signature key does not match runtime response authority.")
  }
  return {
    algorithm: "ed25519",
    eventPayload: input.eventPayload,
    eventPayloadSha256: input.payload.eventPayloadSha256,
    keyId: input.privateKey.keyId,
    signature: await signRemoteRuntimeEd25519Payload({
      payload: createRuntimeWebSocketEventSignaturePayload(input.payload).payload,
      privateKey: input.privateKey.privateKey,
    }),
    timestamp: input.payload.timestamp,
  }
}

export async function verifyRuntimeWebSocketEventSignature(
  input: RuntimeWebSocketEventSignatureVerificationInput,
): Promise<RemoteRuntimeValidationResult<RuntimeWebSocketEventSignaturePayload>> {
  const publicKeyValidation = validateRemoteRuntimeAsymmetricPublicKey(input.publicKey)
  if (!publicKeyValidation.ok) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      "unknown",
      "Runtime WebSocket event signature is invalid.",
    )
  }
  if (
    input.publicKey.purpose !== "runtimeResponseSigning" ||
    input.publicKey.keyId !== input.proof.keyId ||
    input.proof.keyId !== input.payloadInput.keyId ||
    input.proof.algorithm !== "ed25519" ||
    input.proof.algorithm !== input.publicKey.algorithm ||
    input.proof.eventPayloadSha256 !== input.payloadInput.eventPayloadSha256 ||
    input.proof.timestamp !== input.payloadInput.timestamp
  ) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      "unknown",
      "Runtime WebSocket event signature is invalid.",
    )
  }
  const timestampMs = Date.parse(input.proof.timestamp)
  if (
    !Number.isFinite(timestampMs) ||
    Math.abs(input.nowMs - timestampMs) > (input.maxSkewMs ?? defaultRemoteRuntimeSignatureSkewMs)
  ) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      "unknown",
      "Runtime WebSocket event signature is invalid.",
    )
  }
  const signingPayload = createRuntimeWebSocketEventSignaturePayload(input.payloadInput)
  const verified = await verifyRemoteRuntimeEd25519Signature({
    payload: signingPayload.payload,
    publicKey: input.publicKey.publicKey,
    signature: input.proof.signature,
  })
  if (!verified) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      "unknown",
      "Runtime WebSocket event signature is invalid.",
    )
  }
  return { ok: true, value: signingPayload }
}

export async function verifyRemoteRuntimeHttpRequestSignature(
  input: RemoteRuntimeRequestSignatureVerificationInput,
): Promise<RemoteRuntimeValidationResult<RemoteRuntimeCanonicalHttpSigningPayload>> {
  const basic = validateRemoteRuntimeSignedRequestAuthority(input, "Remote runtime request signature is invalid.")
  if (!basic.ok) return basic
  if (input.proof.bodySha256 !== input.payloadInput.bodySha256) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      input.payloadInput.requestId ?? "unknown",
      "Remote runtime request signature is invalid.",
    )
  }
  const signingPayload = createRemoteRuntimeCanonicalHttpSigningPayload(input.payloadInput)
  return verifyRemoteRuntimeSignedRequestPayload(
    input,
    signingPayload,
    [signingPayload.payload],
    "Remote runtime request signature is invalid.",
  )
}

export async function verifyRemoteRuntimeWebSocketUpgradeSignature(
  input: RemoteRuntimeWebSocketUpgradeSignatureVerificationInput,
): Promise<RemoteRuntimeValidationResult<RemoteRuntimeCanonicalWebSocketUpgradeSigningPayload>> {
  const basic = validateRemoteRuntimeSignedRequestAuthority(input, "Remote runtime WebSocket signature is invalid.")
  if (!basic.ok) return basic
  const signingPayload = createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload(input.payloadInput)
  return verifyRemoteRuntimeSignedRequestPayload(
    input,
    signingPayload,
    [signingPayload.payload],
    "Remote runtime WebSocket signature is invalid.",
  )
}

export async function verifyRemoteRuntimeWebSocketActionSignature(
  input: RemoteRuntimeWebSocketActionSignatureVerificationInput,
): Promise<RemoteRuntimeValidationResult<RemoteRuntimeCanonicalWebSocketActionSigningPayload>> {
  const basic = validateRemoteRuntimeSignedRequestAuthority(
    input,
    "Remote runtime WebSocket action signature is invalid.",
  )
  if (!basic.ok) return basic
  if (input.proof.payloadSha256 !== input.payloadInput.payloadSha256) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      input.payloadInput.requestId ?? "unknown",
      "Remote runtime WebSocket action signature is invalid.",
    )
  }
  const signingPayload = createRemoteRuntimeCanonicalWebSocketActionSigningPayload(input.payloadInput)
  return verifyRemoteRuntimeSignedRequestPayload(
    input,
    signingPayload,
    [signingPayload.payload],
    "Remote runtime WebSocket action signature is invalid.",
  )
}

export function validateRuntimeOperationFrame(
  input: RuntimeOperationFrameInput,
  maxPayloadBytes = remoteRuntimeTransportOperationalPolicy.limits.maxRuntimeOperationPayloadBytes,
): RemoteRuntimeValidationResult<RuntimeOperationFrame> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", "unknown", "Runtime operation frame must be an object.")
  }
  if (input.type !== "runtime.operation") {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Unexpected remote runtime transport frame type.",
    )
  }
  if (input.protocolVersion !== remoteRuntimeTransportProtocolVersion) {
    return remoteRuntimeProtocolMismatch(
      remoteRuntimeStringOrUnknown(input.requestId),
      remoteRuntimeStringOrUnknown(input.protocolVersion),
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", "unknown", "Runtime operation requestId is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.gatewayRuntimeAttachmentId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Gateway runtime attachment id is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.clientAttachmentId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime client attachment id is required.",
    )
  }
  if (!isRemoteRuntimeOperationClass(input.operationClass)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime operation class is invalid.")
  }
  if (input.deviceTrustLevel !== undefined && !isRemoteRuntimeClientTrustLevel(input.deviceTrustLevel)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime operation device trust level is invalid.",
    )
  }
  if (input.idempotencyKey !== undefined && !isNonEmptyRemoteRuntimeString(input.idempotencyKey)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime operation idempotency key is invalid.",
    )
  }
  if (input.trustedGatewayHttpRequest !== undefined && input.trustedGatewayHttpRequest !== true) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime operation trusted gateway HTTP marker is invalid.",
    )
  }
  const replyTarget = validateRuntimeOperationReplyTargetFromFrameAuthority(
    {
      clientAttachmentId: input.clientAttachmentId,
      ...(input.replyTarget === undefined ? {} : { replyTarget: input.replyTarget }),
      ...(input.trustedGatewayHttpRequest === true ? { trustedGatewayHttpRequest: true } : {}),
    },
    input.requestId,
  )
  if (!replyTarget.ok) return replyTarget
  if (remoteRuntimeJsonByteLength(input) > maxPayloadBytes) {
    return remoteRuntimeValidationFailure(
      "PAYLOAD_TOO_LARGE",
      input.requestId,
      "Runtime operation frame exceeds the payload limit.",
    )
  }
  if (input.encryptedPayload !== undefined && input.payload !== undefined) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime operation frame cannot include both clear and encrypted payloads.",
    )
  }
  if (input.encryptedPayload !== undefined) {
    const encryptedPayload = validateEncryptedRuntimePayload(input.encryptedPayload, input.requestId)
    if (!encryptedPayload.ok) return encryptedPayload
    return {
      ok: true,
      value: {
        encryptedPayload: encryptedPayload.value,
        gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
        clientAttachmentId: input.clientAttachmentId,
        operationClass: input.operationClass,
        protocolVersion: input.protocolVersion,
        replyTarget: replyTarget.value,
        requestId: input.requestId,
        type: "runtime.operation",
        ...(input.deviceTrustLevel === undefined ? {} : { deviceTrustLevel: input.deviceTrustLevel }),
        ...(input.idempotencyKey === undefined ? {} : { idempotencyKey: input.idempotencyKey }),
        ...(input.trustedGatewayHttpRequest === undefined
          ? {}
          : { trustedGatewayHttpRequest: input.trustedGatewayHttpRequest }),
      },
    }
  }
  const command = validateRuntimeCommand(input.payload, input.requestId)
  if (!command.ok) return command
  return {
    ok: true,
    value: {
      gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
      clientAttachmentId: input.clientAttachmentId,
      operationClass: input.operationClass,
      payload: command.value,
      protocolVersion: input.protocolVersion,
      replyTarget: replyTarget.value,
      requestId: input.requestId,
      type: "runtime.operation",
      ...(input.deviceTrustLevel === undefined ? {} : { deviceTrustLevel: input.deviceTrustLevel }),
      ...(input.idempotencyKey === undefined ? {} : { idempotencyKey: input.idempotencyKey }),
      ...(input.trustedGatewayHttpRequest === undefined
        ? {}
        : { trustedGatewayHttpRequest: input.trustedGatewayHttpRequest }),
    },
  }
}

export function runtimeOperationFrameReplyTarget(frame: RuntimeOperationFrame): RuntimeOperationReplyTarget {
  return runtimeOperationReplyTargetFromFrameAuthority(frame)
}

export function validateRuntimeStatusFrame(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RuntimeStatusFrame> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", "unknown", "Runtime status frame must be an object.")
  }
  if (input.type !== "runtime.status") {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Unexpected runtime status frame type.",
    )
  }
  if (input.protocolVersion !== remoteRuntimeTransportProtocolVersion) {
    return remoteRuntimeProtocolMismatch(
      remoteRuntimeStringOrUnknown(input.requestId),
      remoteRuntimeStringOrUnknown(input.protocolVersion),
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", "unknown", "Runtime status requestId is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.gatewayRuntimeAttachmentId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Gateway runtime attachment id is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.connectorVersion)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime status connector version is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.runtimeApiVersion)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime API version is required.")
  }
  if (
    !Array.isArray(input.attachmentCapabilities) ||
    !input.attachmentCapabilities.every(isRemoteRuntimeAttachmentCapability)
  ) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime status attachment capabilities are invalid.",
    )
  }
  if (input.featureCapabilities !== undefined && !Array.isArray(input.featureCapabilities)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime status feature capabilities are invalid.",
    )
  }
  const featureCapabilities = input.featureCapabilities ?? []
  if (!featureCapabilities.every(isRemoteRuntimeCapability)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime status feature capabilities are invalid.",
    )
  }
  if (!isRuntimeReplayStatus(input.replay)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime replay status is invalid.")
  }
  if (!isRuntimeAttachmentStatus(input.status)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime attachment status is invalid.")
  }
  if (typeof input.sequence !== "number" || !Number.isSafeInteger(input.sequence) || input.sequence < 1) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime status sequence is invalid.")
  }
  return {
    ok: true,
    value: {
      attachmentCapabilities: input.attachmentCapabilities,
      connectorVersion: input.connectorVersion,
      ...(featureCapabilities.length > 0 ? { featureCapabilities } : {}),
      gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
      protocolVersion: input.protocolVersion,
      replay: input.replay,
      requestId: input.requestId,
      runtimeApiVersion: input.runtimeApiVersion,
      sequence: input.sequence,
      status: input.status,
      type: "runtime.status",
    },
  }
}

export function validateRuntimeResponseFrame(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RuntimeResponseFrame> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", "unknown", "Runtime response frame must be an object.")
  }
  if (input.type !== "runtime.response") {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Unexpected runtime response frame type.",
    )
  }
  if (input.protocolVersion !== remoteRuntimeTransportProtocolVersion) {
    return remoteRuntimeProtocolMismatch(
      remoteRuntimeStringOrUnknown(input.requestId),
      remoteRuntimeStringOrUnknown(input.protocolVersion),
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", "unknown", "Runtime response requestId is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.gatewayRuntimeAttachmentId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Gateway runtime attachment id is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.clientAttachmentId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime client attachment id is required.",
    )
  }
  if (!isRuntimeWebSocketServerEnvelope(input.envelope)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime response envelope is malformed.",
    )
  }
  return {
    ok: true,
    value: {
      envelope: input.envelope,
      gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
      clientAttachmentId: input.clientAttachmentId,
      protocolVersion: input.protocolVersion,
      requestId: input.requestId,
      type: "runtime.response",
    },
  }
}

export function validateRemoteRuntimeWebSocketSignedAction(
  input: RemoteRuntimeJsonValue,
  session: { readonly nextSequence: number; readonly sessionNonce: string },
): RemoteRuntimeValidationResult<RemoteRuntimeWebSocketSignedAction> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime WebSocket action must be an object.",
    )
  }
  if (input.type !== remoteRuntimeWebSocketActionType) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Remote runtime WebSocket action is not signed for this session.",
    )
  }
  if (input.protocolVersion !== remoteRuntimeTransportProtocolVersion) {
    return remoteRuntimeValidationFailure(
      "PROTOCOL_MISMATCH",
      remoteRuntimeStringOrUnknown(input.requestId),
      `Remote runtime transport protocol version ${remoteRuntimeStringOrUnknown(input.protocolVersion)} is unsupported.`,
    )
  }
  if (input.sessionNonce !== session.sessionNonce) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Remote runtime WebSocket action is not signed for this session.",
    )
  }
  if (
    typeof input.sequence !== "number" ||
    !Number.isSafeInteger(input.sequence) ||
    input.sequence !== session.nextSequence
  ) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Remote runtime WebSocket action sequence is invalid.",
    )
  }
  if (!("payload" in input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Remote runtime WebSocket action payload is required.",
    )
  }
  if (!isRemoteRuntimeHostRecord(input.proof)) {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Remote runtime WebSocket action signature is required.",
    )
  }
  if (input.proof.algorithm !== "ed25519") {
    return remoteRuntimeValidationFailure(
      "AUTHORIZATION_FAILED",
      remoteRuntimeStringOrUnknown(input.requestId),
      "Remote runtime WebSocket action signature is invalid.",
    )
  }
  for (const key of ["keyId", "nonce", "payloadSha256", "signature", "timestamp"] as const) {
    if (!isNonEmptyRemoteRuntimeString(input.proof[key])) {
      return remoteRuntimeValidationFailure(
        "AUTHORIZATION_FAILED",
        remoteRuntimeStringOrUnknown(input.requestId),
        "Remote runtime WebSocket action signature is invalid.",
      )
    }
  }
  return {
    ok: true,
    value: { ...(input as RemoteRuntimeWebSocketSignedAction), type: remoteRuntimeWebSocketActionType },
  }
}

export function createRemoteRuntimeActiveChatPage(
  activeChats: readonly RemoteRuntimeActiveChatMetadataProjection[],
  payload: RemoteRuntimeActiveChatsListPayload,
): RemoteRuntimeActiveChatsResponse {
  const limit = Math.min(Math.max(payload.limit ?? 25, 1), 100)
  const cursor = payload.cursor ? decodeRemoteRuntimeActiveChatCursor(payload.cursor) : null
  const seenSessionIds = new Set(cursor?.seenSessionIds ?? [])
  const startOffset = cursor?.offset ?? 0
  const remainingChats = activeChats.filter((chat) => !seenSessionIds.has(chat.sessionId))
  const page = remainingChats.slice(0, limit)
  const last = page.at(-1)
  const hasOlder = remainingChats.length > limit
  const nextOffset = startOffset + page.length
  return {
    activeChats: page,
    pageInfo: {
      hasNewer: startOffset > 0 || seenSessionIds.size > 0,
      hasOlder,
      newerCursor:
        (startOffset > 0 || seenSessionIds.size > 0) && page[0]
          ? encodeRemoteRuntimeActiveChatCursor(page[0], Math.max(0, startOffset - limit))
          : null,
      olderCursor: hasOlder && last ? encodeRemoteRuntimeActiveChatCursor(last, nextOffset, [last.sessionId]) : null,
    },
  }
}

export function applyRemoteRuntimeMirroredStatus(
  activeChat: RemoteRuntimeActiveChatMetadataProjection,
  status: RemoteRuntimeActiveChatMetadataProjection["status"] | undefined,
): RemoteRuntimeActiveChatMetadataProjection {
  if (!status || status === activeChat.status) return activeChat
  return { ...activeChat, status }
}

export function applyRemoteRuntimeMirroredStatuses(
  activeChats: readonly RemoteRuntimeActiveChatMetadataProjection[],
  statuses: ReadonlyMap<string, RemoteRuntimeActiveChatMetadataProjection["status"]>,
): RemoteRuntimeActiveChatMetadataProjection[] {
  return activeChats.map((activeChat) =>
    applyRemoteRuntimeMirroredStatus(activeChat, statuses.get(activeChat.sessionId)),
  )
}

export function remoteRuntimeActiveChatSummary(activeChat: RemoteRuntimeActiveChatMetadataProjection | null): string {
  if (!activeChat) return "<none>"
  return [
    `sessionId=${activeChat.sessionId}`,
    `status=${activeChat.status}`,
    `agent=${activeChat.agent ?? "<none>"}`,
    `messageCount=${activeChat.messageCount ?? 0}`,
    `title=${activeChat.title}`,
  ].join(" ")
}

export function remoteRuntimeDirectoryDisplayName(directory: string): string {
  return directory.split(/[\\/]/u).filter(Boolean).at(-1) ?? directory
}

export function redactRemoteRuntimeDiagnosticString(value: string): string {
  let redacted = value
  for (const rule of remoteRuntimeDiagnosticRedactionRules) {
    redacted = redacted.replace(rule.pattern, rule.replacement)
  }
  return redacted
}

export function remoteRuntimeReattachDelayMs(attempt: number, random: () => number): number {
  const baseDelayMs = Math.min(30_000, 1000 * 2 ** Math.max(0, Math.min(attempt, 5)))
  const jitterMs = Math.floor(baseDelayMs * 0.2 * Math.max(0, Math.min(random(), 1)))
  return Math.min(30_000, baseDelayMs + jitterMs)
}

export function remoteRuntimeMirroredSessionStatus(
  event: RemoteRuntimeEventInput,
): RemoteRuntimeMirroredSessionStatus | null {
  if (
    event.type !== "session.status" ||
    !isRemoteRuntimeHostRecord(event.properties) ||
    typeof event.properties.sessionID !== "string"
  ) {
    return null
  }
  const status =
    isRemoteRuntimeHostRecord(event.properties.status) && typeof event.properties.status.type === "string"
      ? event.properties.status.type
      : undefined
  if (status === "busy" || status === "retry") return { sessionId: event.properties.sessionID, status: "running" }
  if (status === "idle") return { sessionId: event.properties.sessionID, status: "idle" }
  return null
}

export function applyRemoteRuntimeMirroredSessionEvent(
  statuses: Map<string, RemoteRuntimeActiveChatMetadataProjection["status"]>,
  event: RemoteRuntimeEventInput,
): void {
  const mirrored = remoteRuntimeMirroredSessionStatus(event)
  if (mirrored) {
    statuses.set(mirrored.sessionId, mirrored.status)
    return
  }
  if (
    event.type === "session.deleted" &&
    isRemoteRuntimeHostRecord(event.properties) &&
    typeof event.properties.sessionID === "string"
  ) {
    statuses.delete(event.properties.sessionID)
  }
}

export function createRemoteRuntimeChatMessagesPage(
  sessionId: string,
  messages: readonly RemoteRuntimeChatMessageProjection[],
  payload: RemoteRuntimeChatMessagesPayload,
): RemoteRuntimeChatMessagesResponse {
  const requestedLimit = Math.min(Math.max(payload.limit ?? 50, 1), 100)
  const cursor = payload.cursor
    ? decodeRemoteRuntimeChatMessageCursor(payload.cursor)
    : { endExclusive: messages.length, pageSize: requestedLimit, sessionId }
  if (cursor.sessionId !== sessionId) {
    throw new Error("Chat message cursor does not match the requested session.")
  }
  const pageSize = Math.min(Math.max(cursor.pageSize, 1), 100)
  const endExclusive = Math.min(Math.max(cursor.endExclusive, 0), messages.length)
  const start = Math.max(0, endExclusive - pageSize)
  const pagedMessages = messages.slice(start, endExclusive)
  const hasOlder = start > 0
  const hasNewer = endExclusive < messages.length
  return {
    messages: pagedMessages,
    pageInfo: {
      hasNewer,
      hasOlder,
      newerCursor: hasNewer
        ? encodeRemoteRuntimeChatMessageCursor({
            endExclusive: Math.min(messages.length, endExclusive + pageSize),
            pageSize,
            sessionId,
          })
        : null,
      olderCursor: hasOlder ? encodeRemoteRuntimeChatMessageCursor({ endExclusive: start, pageSize, sessionId }) : null,
    },
    sessionId,
  }
}

export function encodeRemoteRuntimeActiveChatCursor(
  chat: RemoteRuntimeActiveChatMetadataProjection,
  offset = 0,
  seenSessionIds: readonly string[] = [],
): string {
  return remoteRuntimeEncodeJson({ offset, seenSessionIds, sessionId: chat.sessionId, updatedAt: chat.updatedAt })
}

export function decodeRemoteRuntimeActiveChatCursor(cursor: string): RemoteRuntimeActiveChatCursor {
  const value = remoteRuntimeDecodeCursor(cursor, "Active chat cursor is not valid.")
  if (isRemoteRuntimeHostRecord(value) && typeof value.sessionId === "string" && typeof value.updatedAt === "string") {
    const seenSessionIds = Array.isArray(value.seenSessionIds)
      ? value.seenSessionIds.filter((sessionId): sessionId is string => typeof sessionId === "string")
      : [value.sessionId]
    return {
      ...(typeof value.offset === "number" && Number.isSafeInteger(value.offset) && value.offset >= 0
        ? { offset: value.offset }
        : {}),
      seenSessionIds,
      sessionId: value.sessionId,
      ...(typeof value.snapshotId === "string" ? { snapshotId: value.snapshotId } : {}),
      updatedAt: value.updatedAt,
    }
  }
  throw new Error("Active chat cursor is not valid.")
}

export function encodeRemoteRuntimeChatMessageCursor(cursor: RemoteRuntimeChatMessageCursor): string {
  return remoteRuntimeEncodeJson(cursor)
}

export function decodeRemoteRuntimeChatMessageCursor(cursor: string): RemoteRuntimeChatMessageCursor {
  const value = remoteRuntimeDecodeCursor(cursor, "Chat message cursor is not valid.")
  if (
    isRemoteRuntimeHostRecord(value) &&
    typeof value.endExclusive === "number" &&
    Number.isSafeInteger(value.endExclusive) &&
    value.endExclusive >= 0 &&
    typeof value.pageSize === "number" &&
    Number.isSafeInteger(value.pageSize) &&
    value.pageSize > 0 &&
    typeof value.sessionId === "string" &&
    value.sessionId.length > 0
  ) {
    return { endExclusive: value.endExclusive, pageSize: value.pageSize, sessionId: value.sessionId }
  }
  throw new Error("Chat message cursor is not valid.")
}

export function validateRemoteRuntimeStartChatRequest(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeStartChatRequest> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime start chat request must be an object.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime start chat requestId is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.runtimeInstallationId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime installation id is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.directoryId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime start chat directory id is required.",
    )
  }
  if (!isNullableRemoteRuntimeString(input.providerId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime start chat provider id is invalid.",
    )
  }
  if (!isNullableRemoteRuntimeString(input.model)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime start chat model is invalid.",
    )
  }
  if (!isNullableRemoteRuntimeString(input.title)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime start chat title is invalid.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.idempotencyKey)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime start chat idempotency key is required.",
    )
  }
  return {
    ok: true,
    value: {
      directoryId: input.directoryId,
      idempotencyKey: input.idempotencyKey,
      model: input.model,
      providerId: input.providerId,
      requestId: input.requestId,
      runtimeInstallationId: input.runtimeInstallationId,
      title: input.title,
    },
  }
}

export function validateRemoteRuntimeSendChatMessageRequest(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeSendChatMessageRequest> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime send chat message request must be an object.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime send chat message requestId is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.runtimeInstallationId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime installation id is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.sessionId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime send chat message session id is required.",
    )
  }
  if (!isRemoteRuntimeHostRecord(input.input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime send chat message input is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.input.content)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime send chat message content is required.",
    )
  }
  if (input.input.mode !== "default") {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime send chat message mode is invalid.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.idempotencyKey)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime send chat message idempotency key is required.",
    )
  }
  return {
    ok: true,
    value: {
      idempotencyKey: input.idempotencyKey,
      input: { content: input.input.content, mode: "default" },
      requestId: input.requestId,
      runtimeInstallationId: input.runtimeInstallationId,
      sessionId: input.sessionId,
    },
  }
}

export function validateRemoteRuntimeUpdateChatRequest(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeUpdateChatRequest> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime update chat request must be an object.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime update chat requestId is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.runtimeInstallationId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime installation id is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.sessionId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime update chat session id is required.",
    )
  }
  if (!isRemoteRuntimeHostRecord(input.input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime update chat input is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.input.providerId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime update chat provider id is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.input.model)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime update chat model is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.idempotencyKey)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime update chat idempotency key is required.",
    )
  }
  return {
    ok: true,
    value: {
      idempotencyKey: input.idempotencyKey,
      input: { model: input.input.model, providerId: input.input.providerId },
      requestId: input.requestId,
      runtimeInstallationId: input.runtimeInstallationId,
      sessionId: input.sessionId,
    },
  }
}

export function validateRemoteRuntimeStatusSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeStatusSnapshot> {
  if (!isRemoteRuntimeStatusSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime status snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeDirectoriesSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeDirectoriesSnapshot> {
  if (!isRemoteRuntimeDirectoriesSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime directories snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeCapabilitiesSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeCapabilitiesSnapshot> {
  if (!isRemoteRuntimeCapabilitiesSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime capabilities snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeRealtimeEventEnvelope(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeRealtimeEventEnvelope> {
  if (!isRemoteRuntimeRealtimeEventEnvelopeValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime realtime event envelope is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRuntimeConnectionCandidate(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RuntimeConnectionCandidate> {
  if (!isRuntimeConnectionCandidateValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Runtime connection candidate is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRuntimeConnectionCandidateBootstrap(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RuntimeConnectionCandidateBootstrap> {
  if (!isRuntimeConnectionCandidateBootstrapValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Runtime connection candidate bootstrap is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeActiveChatsSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeActiveChatsSnapshot> {
  if (!isRemoteRuntimeActiveChatsSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime active chats snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeChatSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeChatSnapshot> {
  if (!isRemoteRuntimeChatSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime chat snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeChatMessagesSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeChatMessagesSnapshot> {
  if (!isRemoteRuntimeChatMessagesSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime chat messages snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeProvidersSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeProvidersSnapshot> {
  if (!isRemoteRuntimeProvidersSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime providers snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeGoalsSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeGoalsSnapshot> {
  if (!isRemoteRuntimeGoalsSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime goals snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeGitStatusSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeGitStatusSnapshot> {
  if (!isRemoteRuntimeGitStatusSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime git status snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeAliasesSnapshot(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeAliasesSnapshot> {
  if (!isRemoteRuntimeAliasesSnapshotValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime aliases snapshot is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeStartChatResponse(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeStartChatResponse> {
  if (!isRemoteRuntimeStartChatResponseValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime start chat response is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeSendChatMessageResponse(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeSendChatMessageResponse> {
  if (!isRemoteRuntimeSendChatMessageResponseValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime send chat message response is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateRemoteRuntimeUpdateChatResponse(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeUpdateChatResponse> {
  if (!isRemoteRuntimeUpdateChatResponseValue(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      remoteRuntimeValidationRequestId(input),
      "Remote runtime update chat response is malformed.",
    )
  }
  return { ok: true, value: input }
}

export function validateGatewayRuntimeAttachmentRegistrationRequest(
  input: RemoteRuntimeJsonValue | GatewayRuntimeAttachmentRegistrationRequest,
): RemoteRuntimeValidationResult<GatewayRuntimeAttachmentRegistrationRequest> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Runtime attachment request must be an object.",
    )
  }
  if (input.protocolVersion !== remoteRuntimeTransportProtocolVersion) {
    return remoteRuntimeProtocolMismatch(
      remoteRuntimeStringOrUnknown(input.requestId),
      remoteRuntimeStringOrUnknown(input.protocolVersion),
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", "unknown", "Runtime attachment requestId is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.accountId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime attachment account id is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.directoryId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime attachment directory id is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.directoryPath)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime attachment directory path is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.runtimeInstallationId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime installation id is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.connectorVersion)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime attachment connector version is required.",
    )
  }
  if (
    input.allowedDirectories !== undefined &&
    (!Array.isArray(input.allowedDirectories) || !input.allowedDirectories.every(isRuntimeWebSocketAllowedDirectoryValue))
  ) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime attachment allowed directories are invalid.",
    )
  }
  if (
    !Array.isArray(input.attachmentCapabilities) ||
    !input.attachmentCapabilities.every(isRemoteRuntimeAttachmentCapability)
  ) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime attachment capabilities are invalid.",
    )
  }
  if (
    input.featureCapabilities !== undefined &&
    (!Array.isArray(input.featureCapabilities) || !input.featureCapabilities.every(isRemoteRuntimeCapability))
  ) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime attachment feature capabilities are invalid.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.ticket)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime attachment ticket is required.",
    )
  }
  return {
    ok: true,
    value: {
      accountId: input.accountId,
      ...(input.allowedDirectories ? { allowedDirectories: [...input.allowedDirectories] } : {}),
      attachmentCapabilities: input.attachmentCapabilities,
      connectorVersion: input.connectorVersion,
      directoryId: input.directoryId,
      directoryPath: input.directoryPath,
      ...(input.featureCapabilities ? { featureCapabilities: input.featureCapabilities } : {}),
      protocolVersion: input.protocolVersion,
      requestId: input.requestId,
      runtimeInstallationId: input.runtimeInstallationId,
      ticket: input.ticket,
    },
  }
}

export function validateRemoteRuntimeClientAttachmentRequest(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeValidationResult<RemoteRuntimeClientAttachmentRequest> {
  if (!isRemoteRuntimeHostRecord(input)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime attachment request must be an object.",
    )
  }
  if (input.protocolVersion !== remoteRuntimeTransportProtocolVersion) {
    return remoteRuntimeProtocolMismatch(
      remoteRuntimeStringOrUnknown(input.requestId),
      remoteRuntimeStringOrUnknown(input.protocolVersion),
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.requestId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      "unknown",
      "Remote runtime attachment requestId is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.accountId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime attachment account id is required.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.runtimeInstallationId)) {
    return remoteRuntimeValidationFailure("VALIDATION_FAILED", input.requestId, "Runtime installation id is required.")
  }
  if (!isNonEmptyRemoteRuntimeString(input.trustedRuntimeClientId)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Trusted runtime client id is required.",
    )
  }
  if (input.deviceTrustLevel !== undefined && !isRemoteRuntimeClientTrustLevel(input.deviceTrustLevel)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Runtime client trust level is invalid.",
    )
  }
  if (!isNonEmptyRemoteRuntimeString(input.ticket)) {
    return remoteRuntimeValidationFailure(
      "VALIDATION_FAILED",
      input.requestId,
      "Remote runtime attachment ticket is required.",
    )
  }
  return {
    ok: true,
    value: {
      accountId: input.accountId,
      protocolVersion: input.protocolVersion,
      requestId: input.requestId,
      runtimeInstallationId: input.runtimeInstallationId,
      ticket: input.ticket,
      trustedRuntimeClientId: input.trustedRuntimeClientId,
      ...(input.deviceTrustLevel === undefined ? {} : { deviceTrustLevel: input.deviceTrustLevel }),
    },
  }
}

export function redactRemoteRuntimeTransportLogValue(value: RemoteRuntimeJsonValue): RemoteRuntimeJsonValue {
  if (Array.isArray(value)) {
    return value.map(redactRemoteRuntimeTransportLogValue)
  }
  if (!isRemoteRuntimeHostRecord(value)) {
    return value
  }

  const redacted: { [key: string]: RemoteRuntimeJsonValue } = {}
  for (const [key, entry] of Object.entries(value)) {
    redacted[key] = redactedRemoteRuntimeTransportLogFieldNames.has(key)
      ? "[REDACTED]"
      : redactRemoteRuntimeTransportLogValue(entry)
  }
  return redacted
}

export function remoteRuntimeTransportSchemaArtifact() {
  return {
    encryptedRuntimePayloadAlgorithms: [...remoteRuntimeEncryptedPayloadAlgorithmValues],
    encryptedRuntimePayloadContentTypes: [...remoteRuntimeEncryptedPayloadContentTypeValues],
    failureCodes: [...remoteRuntimeTransportFailureCodeValues],
    localRemoteRuntimeRequestIdHeaderName,
    localRuntimeAccessTokenHeaderName,
    localRuntimeAccessTokenIdHeaderName,
    remoteRuntimeHttpContractVersion,
    remoteRuntimeHttpFailureCodes: [...remoteRuntimeHttpFailureCodeValues],
    remoteRuntimeHttpRequestSignatureHeaderNames: [...remoteRuntimeHttpRequestSignatureHeaderNames],
    remoteRuntimeHttpResponseSignatureHeaderNames: [...remoteRuntimeHttpResponseSignatureHeaderNames],
    remoteRuntimeHttpVersionHeaderName,
    runtimeConnectionCandidateEnvironments: [...runtimeConnectionCandidateEnvironmentValues],
    runtimeConnectionCandidateHostReachabilities: [...runtimeConnectionCandidateHostReachabilityValues],
    remoteRuntimeTransportPairingActions: [...remoteRuntimeTransportPairingActionValues],
    remoteRuntimeWebSocketContractVersion,
    remoteRuntimeWebSocketPublicKeyHeaderName,
    remoteRuntimeWebSocketVersionHeaderName,
    remoteRuntimePublicKeyAlgorithms: [...remoteRuntimePublicKeyAlgorithmValues],
    remoteRuntimePublicKeyEncodings: [...remoteRuntimePublicKeyEncodingValues],
    remoteRuntimePublicKeyPurposes: [...remoteRuntimePublicKeyPurposeValues],
    remoteRuntimeRealtimeEventTypes: [...remoteRuntimeRealtimeEventTypeValues],
    remoteRuntimeRealtimeResourceKinds: [...remoteRuntimeRealtimeResourceKindValues],
    remoteRuntimeRequestSignatureAlgorithms: [...remoteRuntimeRequestSignatureAlgorithmValues],
    remoteRuntimeCapabilities: [...remoteRuntimeCapabilityValues],
    remoteRuntimeStatusSnapshotStates: [...remoteRuntimeStatusSnapshotStateValues],
    previousRemoteRuntimeHttpContractVersion,
    previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
    currentRemoteRuntimeSupportedVersions: {
      remoteRuntimeHttp: [...currentRemoteRuntimeSupportedVersions.remoteRuntimeHttp],
      remoteRuntimeTransport: [...currentRemoteRuntimeSupportedVersions.remoteRuntimeTransport],
      runtimeWebSocket: [...currentRemoteRuntimeSupportedVersions.runtimeWebSocket],
    },
    runtimeConnectionCandidateKinds: [...runtimeConnectionCandidateKindValues],
    supportedRemoteRuntimeHttpContractVersions: [...supportedRemoteRuntimeHttpContractVersions],
    supportedRemoteRuntimeTransportProtocolVersions: [...supportedRemoteRuntimeTransportProtocolVersions],
    supportedRuntimeWebSocketRemoteRuntimeProtocolVersions: [...supportedRuntimeWebSocketRemoteRuntimeProtocolVersions],
    contractFields: remoteRuntimeTransportSchemaContractFields,
    localRuntimeConnectorAuditActions: ["runtime.command.denied", "runtime.command.forwarded"],
    messageTypes: [...remoteRuntimeTransportMessageTypeValues],
    remoteRuntimeReplaySubscriptionTarget: "providerThreadRef",
    operationalPolicy: remoteRuntimeTransportOperationalPolicy,
    operationClasses: [...remoteRuntimeOperationClassValues],
    operationPolicies: remoteRuntimeOperationPolicies(),
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    responseSensitivities: [...remoteRuntimeResponseSensitivityValues],
    runtimeWebSocketRemoteRuntimeProtocolVersion,
    runtimeMethods: [...remoteRuntimeProtocolClientMethodValues],
    runtimeProviderModelCommandTypes: [...runtimeWebSocketProviderModelCommandTypeValues],
    runtimeResponseSchemas: remoteRuntimeProtocolResponseSchemas,
    trustLevels: [...remoteRuntimeClientTrustLevelValues],
  }
}

export function createInMemoryRemoteRuntimeNonceReplayStore(
  options: InMemoryRemoteRuntimeNonceReplayStoreOptions = {},
): RemoteRuntimeNonceReplayStore {
  const maxEntries = options.maxEntries ?? defaultRemoteRuntimeNonceReplayStoreMaxEntries
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
    throw new Error("Remote runtime nonce replay store maxEntries must be a positive safe integer.")
  }
  const pruneIntervalMs = options.pruneIntervalMs ?? defaultRemoteRuntimeNonceReplayStorePruneIntervalMs
  if (!Number.isFinite(pruneIntervalMs) || pruneIntervalMs < 0) {
    throw new Error("Remote runtime nonce replay store pruneIntervalMs must be a non-negative number.")
  }

  const seen = new Map<string, number>()
  let lastPrunedAtMs = Number.NEGATIVE_INFINITY

  return {
    reserve(input) {
      if (
        typeof input.nowMs === "number" &&
        Number.isFinite(input.nowMs) &&
        (seen.size >= maxEntries || input.nowMs - lastPrunedAtMs >= pruneIntervalMs)
      ) {
        lastPrunedAtMs = input.nowMs
        for (const [key, expiresAtMs] of seen) {
          if (expiresAtMs <= input.nowMs) {
            seen.delete(key)
          }
        }
      }

      const key = `${input.keyId}:${input.nonce}`
      if (seen.has(key)) {
        return false
      }
      const expiresAtMs =
        typeof input.expiresAtMs === "number" && Number.isFinite(input.expiresAtMs)
          ? input.expiresAtMs
          : Number.POSITIVE_INFINITY
      if (seen.size >= maxEntries) {
        return false
      }
      seen.set(key, expiresAtMs)
      return true
    },
  }
}

export function isRemoteRuntimeRealtimeResourceRef(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeRealtimeResourceRef {
  if (
    !isRemoteRuntimeHostRecord(value) ||
    !isRemoteRuntimeRealtimeResourceKind(value.kind) ||
    !isNonEmptyRemoteRuntimeString(value.runtimeInstallationId)
  ) {
    return false
  }
  switch (value.kind) {
    case "chat":
    case "chatMessages":
      return isNonEmptyRemoteRuntimeString(value.sessionId)
    case "activeChats":
    case "aliases":
    case "goals":
    case "providers":
    case "runtime":
      return value.sessionId === undefined
  }
}

type RemoteRuntimeHostStartInput<TLocalGatewayAuthority = never, TRuntimeEncryptionKey = never> = {
  readonly accountId: string
  readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
  readonly apiBaseUrl: string
  readonly authorizationToken: string
  readonly directoryId: string
  readonly directory: string
  readonly localGatewayAuthority?: TLocalGatewayAuthority
  readonly pollIntervalMs?: number
  readonly runtimeEncryptionKey?: TRuntimeEncryptionKey
  readonly runtimeInstallationId: string
}

export type RemoteRuntimeHostLifecycleDirectory = {
  readonly directoryId: string
  readonly enabled: boolean
  readonly path: string
}

export type RemoteRuntimeHostLifecycleStartManyInput<TLocalGatewayAuthority = never, TRuntimeEncryptionKey = never> = {
  readonly accountId: string
  readonly apiBaseUrl: string
  readonly authorizationToken: string
  readonly directories: readonly RemoteRuntimeHostLifecycleDirectory[]
  readonly launchd?: {
    readonly enabled?: boolean
    readonly intervalSeconds?: number
  }
  readonly localGatewayAuthority?: TLocalGatewayAuthority
  readonly pollIntervalMs?: number
  readonly runtimeEncryptionKey?: TRuntimeEncryptionKey
  readonly runtimeInstallationId: string
}

export type RemoteRuntimeHostLifecycleRuntimeState<
  TLocalGatewayAuthority = unknown,
  TRuntimeEncryptionKey = unknown,
> = {
  readonly accountId: string
  readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
  readonly apiBaseUrl: string
  readonly directoryId: string
  readonly directory: string
  readonly gatewayRuntimeAttachmentId?: string
  readonly localGatewayAuthority?: TLocalGatewayAuthority
  readonly runtimeEncryptionKey?: TRuntimeEncryptionKey
  readonly runtimeInstallationId: string
  readonly startedAt?: string
  readonly state?: string
}

export type RemoteRuntimeHostLifecycleRuntimeStateParserOptions<TLocalGatewayAuthority, TRuntimeEncryptionKey> = {
  parseLocalGatewayAuthority?(input: { readonly [key: string]: RemoteRuntimeJsonValue }): TLocalGatewayAuthority
  parseRuntimeEncryptionKey?(input: { readonly [key: string]: RemoteRuntimeJsonValue }): TRuntimeEncryptionKey
}

export function parseRemoteRuntimeHostLifecycleRuntimeState<
  TLocalGatewayAuthority = unknown,
  TRuntimeEncryptionKey = unknown,
>(
  input: RemoteRuntimeJsonValue,
  options: RemoteRuntimeHostLifecycleRuntimeStateParserOptions<TLocalGatewayAuthority, TRuntimeEncryptionKey> = {},
): RemoteRuntimeHostLifecycleRuntimeState<TLocalGatewayAuthority, TRuntimeEncryptionKey> {
  if (
    !isRemoteRuntimeJsonObject(input) ||
    typeof input.accountId !== "string" ||
    typeof input.apiBaseUrl !== "string" ||
    typeof input.directoryId !== "string" ||
    typeof input.directory !== "string" ||
    typeof input.runtimeInstallationId !== "string"
  ) {
    throw new Error("invalid schema")
  }
  return {
    accountId: input.accountId,
    ...(Array.isArray(input.allowedDirectories) &&
    input.allowedDirectories.every(isRuntimeWebSocketAllowedDirectoryValue)
      ? { allowedDirectories: input.allowedDirectories }
      : {}),
    apiBaseUrl: input.apiBaseUrl,
    directory: input.directory,
    directoryId: input.directoryId,
    ...(typeof input.gatewayRuntimeAttachmentId === "string"
      ? { gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId }
      : {}),
    ...(isRemoteRuntimeJsonObject(input.localGatewayAuthority) && options.parseLocalGatewayAuthority
      ? { localGatewayAuthority: options.parseLocalGatewayAuthority(input.localGatewayAuthority) }
      : {}),
    ...(isRemoteRuntimeJsonObject(input.runtimeEncryptionKey) && options.parseRuntimeEncryptionKey
      ? { runtimeEncryptionKey: options.parseRuntimeEncryptionKey(input.runtimeEncryptionKey) }
      : {}),
    runtimeInstallationId: input.runtimeInstallationId,
    ...(typeof input.startedAt === "string" ? { startedAt: input.startedAt } : {}),
    ...(typeof input.state === "string" ? { state: input.state } : {}),
  }
}

export type RemoteRuntimeHostLifecycleState<TLocalGatewayAuthority = unknown, TRuntimeEncryptionKey = unknown> = {
  readonly host?: RemoteRuntimeHost
  readonly launchd?: RemoteRuntimeLaunchAgentState
  readonly runtime?: RemoteRuntimeHostLifecycleRuntimeState<TLocalGatewayAuthority, TRuntimeEncryptionKey>
}

export type RemoteRuntimeHostLifecycleClient<TLocalGatewayAuthority = unknown, TRuntimeEncryptionKey = unknown> = {
  start(
    input: RemoteRuntimeHostStartInput<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  ): Promise<RemoteRuntimeServerStatus>
  status(input?: RemoteRuntimeHostStatusSelector): Promise<readonly RemoteRuntimeServerStatus[]>
  stop(input: RemoteRuntimeHostStopSelector): Promise<readonly RemoteRuntimeServerStatus[]>
}

export type RemoteRuntimeHostLifecycleDeps<
  TState extends RemoteRuntimeHostLifecycleState<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  TLocalGatewayAuthority = unknown,
  TRuntimeEncryptionKey = unknown,
> = {
  ensureHost(): Promise<RemoteRuntimeHost>
  hostClient(host: RemoteRuntimeHost): RemoteRuntimeHostLifecycleClient<TLocalGatewayAuthority, TRuntimeEncryptionKey>
  installLaunchAgent(input: InstallRemoteRuntimeLaunchAgentInput): Promise<RemoteRuntimeLaunchAgentState | undefined>
  readHost(): Promise<RemoteRuntimeHost | undefined>
  readState(): Promise<TState>
  shutdownHost(host: RemoteRuntimeHost): Promise<void>
  writeState(
    state: Omit<TState, "host" | "launchd" | "runtime"> &
      RemoteRuntimeHostLifecycleState<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  ): Promise<void>
}

export type RemoteRuntimeHostEncryptionDeps<
  TState extends RemoteRuntimeHostState<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  TLocalGatewayAuthority = unknown,
  TRuntimeEncryptionKey = unknown,
> = {
  ensureHost(): Promise<RemoteRuntimeHost>
  hostClient(host: RemoteRuntimeHost): Pick<ReturnType<typeof createRemoteRuntimeHostClient>, "configureEncryption">
  readState(): Promise<TState>
  writeState(
    state: Omit<TState, "runtime"> & RemoteRuntimeHostState<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  ): Promise<void>
}

export type RemoteRuntimeSetupRuntimeLaunchAgentDeps<TState extends RemoteRuntimeHostState = RemoteRuntimeHostState> = {
  installLaunchAgent(input: InstallRemoteRuntimeLaunchAgentInput): Promise<RemoteRuntimeLaunchAgentState | undefined>
  readState(): Promise<TState>
  writeState(state: TState): Promise<void>
}

export type RemoteRuntimeSetupRuntimeLaunchAgentInput = InstallRemoteRuntimeLaunchAgentInput & {
  readonly enabled?: boolean
}

type RemoteRuntimeLaunchAgentPlistValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly RemoteRuntimeLaunchAgentPlistValue[]
  | { readonly [key: string]: RemoteRuntimeLaunchAgentPlistValue }

export type RemoteRuntimeHostState<TLocalGatewayAuthority = unknown, TRuntimeEncryptionKey = unknown> = {
  readonly host?: RemoteRuntimeHost
  readonly launchd?: RemoteRuntimeLaunchAgentState
  readonly localRuntimeIdentityId?: string
  readonly runtime?: RemoteRuntimeHostLifecycleRuntimeState<TLocalGatewayAuthority, TRuntimeEncryptionKey>
}

export type RemoteRuntimeSetupLocalRuntimeIdentityResult<
  TState extends RemoteRuntimeHostState = RemoteRuntimeHostState,
> = {
  readonly localRuntimeIdentityId: string
  readonly shouldWriteState: boolean
  readonly state: TState
}

export interface RemoteRuntimeStartConfigurationInput<
  TDirectory extends { readonly path: string } = RemoteRuntimeDirectoryAllowlistEntry,
  TLocalGatewayAuthority = unknown,
  TRuntimeEncryptionKey = unknown,
> {
  readonly accountId: string
  readonly apiBaseUrl: string
  readonly authorizationToken?: string | null
  readonly directories: readonly TDirectory[]
  readonly requestedRuntimeInstallationId?: string | null
  readonly state: RemoteRuntimeHostState<TLocalGatewayAuthority, TRuntimeEncryptionKey>
}

export interface RemoteRuntimeStartConfigurationResult<
  TDirectory extends { readonly path: string } = RemoteRuntimeDirectoryAllowlistEntry,
  TLocalGatewayAuthority = unknown,
  TRuntimeEncryptionKey = unknown,
> {
  readonly accountId: string
  readonly apiBaseUrl: string
  readonly authorizationToken: string
  readonly directories: readonly TDirectory[]
  readonly localGatewayAuthority?: TLocalGatewayAuthority
  readonly runtimeEncryptionKey: TRuntimeEncryptionKey
  readonly runtimeInstallationId: string
}

export type RemoteRuntimeSetupRuntimeStatusMatchInput<
  TDirectory extends { readonly directoryId: string; readonly enabled: boolean; readonly path: string },
  TStatus extends {
    readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
    readonly directory?: string
    readonly directoryId?: string
  },
> = {
  readonly directories: readonly TDirectory[]
  readonly statuses: readonly TStatus[]
}

export type RemoteRuntimeHostStateParserOptions<TLocalGatewayAuthority, TRuntimeEncryptionKey> =
  RemoteRuntimeHostLifecycleRuntimeStateParserOptions<TLocalGatewayAuthority, TRuntimeEncryptionKey>

export function parseRemoteRuntimeHostState<TLocalGatewayAuthority = unknown, TRuntimeEncryptionKey = unknown>(
  input: RemoteRuntimeJsonValue,
  options: RemoteRuntimeHostStateParserOptions<TLocalGatewayAuthority, TRuntimeEncryptionKey> = {},
): RemoteRuntimeHostState<TLocalGatewayAuthority, TRuntimeEncryptionKey> {
  if (!isRemoteRuntimeJsonObject(input)) throw new Error("invalid schema")
  return {
    ...(input.host === undefined ? {} : { host: parseRemoteRuntimeHost(input.host) }),
    ...(input.launchd === undefined ? {} : { launchd: parseRemoteRuntimeLaunchAgentState(input.launchd) }),
    ...(typeof input.localRuntimeIdentityId === "string"
      ? { localRuntimeIdentityId: input.localRuntimeIdentityId }
      : {}),
    ...(input.runtime === undefined
      ? {}
      : { runtime: parseRemoteRuntimeHostLifecycleRuntimeState(input.runtime, options) }),
  }
}

export function remoteRuntimeSetupMatchingRuntimeStatuses<
  TDirectory extends { readonly directoryId: string; readonly enabled: boolean; readonly path: string },
  TStatus extends {
    readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
    readonly directory?: string
    readonly directoryId?: string
  },
>(input: RemoteRuntimeSetupRuntimeStatusMatchInput<TDirectory, TStatus>): TStatus[] {
  return input.statuses.filter((status) =>
    input.directories.some(
      (directory) =>
        directory.enabled &&
        (status.directoryId === directory.directoryId ||
          status.directory === directory.path ||
          status.allowedDirectories?.some(
            (allowed) => allowed.directoryId === directory.directoryId || allowed.path === directory.path,
          )),
    ),
  )
}

export function resolveRemoteRuntimeSetupLocalRuntimeIdentity<TState extends RemoteRuntimeHostState>(input: {
  readonly randomUUID: () => string
  readonly state: TState
}): RemoteRuntimeSetupLocalRuntimeIdentityResult<TState> {
  const localRuntimeIdentityId = input.state.localRuntimeIdentityId ?? `lri_${input.randomUUID()}`
  if (input.state.localRuntimeIdentityId) {
    return {
      localRuntimeIdentityId,
      shouldWriteState: false,
      state: input.state,
    }
  }
  return {
    localRuntimeIdentityId,
    shouldWriteState: true,
    state: {
      ...input.state,
      localRuntimeIdentityId,
    },
  }
}

export function resolveRemoteRuntimeStartConfiguration<
  TDirectory extends { readonly path: string },
  TLocalGatewayAuthority,
  TRuntimeEncryptionKey,
>(
  input: RemoteRuntimeStartConfigurationInput<TDirectory, TLocalGatewayAuthority, TRuntimeEncryptionKey>,
): RemoteRuntimeStartConfigurationResult<TDirectory, TLocalGatewayAuthority, TRuntimeEncryptionKey> {
  if (!input.authorizationToken) {
    throw new Error("Remote runtime start requires an active Interbase CLI login. Run `interbase login` first.")
  }
  const runtimeState = input.state.runtime
  const matchingRuntimeState =
    runtimeState?.accountId === input.accountId && runtimeState.apiBaseUrl === input.apiBaseUrl
  const runtimeInstallationId =
    input.requestedRuntimeInstallationId?.trim() ||
    (matchingRuntimeState ? runtimeState.runtimeInstallationId : undefined)
  if (!runtimeInstallationId) {
    throw new Error("Remote runtime start requires --runtime-installation-id. Run runtime client setup first.")
  }
  const runtimeEncryptionKey =
    matchingRuntimeState && runtimeState.runtimeInstallationId === runtimeInstallationId
      ? runtimeState.runtimeEncryptionKey
      : undefined
  const localGatewayAuthority =
    matchingRuntimeState && runtimeState.runtimeInstallationId === runtimeInstallationId
      ? runtimeState.localGatewayAuthority
      : undefined
  if (!runtimeEncryptionKey) {
    throw new Error("Remote runtime start requires encrypted chat pairing state. Run runtime client setup again.")
  }
  return {
    accountId: input.accountId,
    apiBaseUrl: input.apiBaseUrl,
    authorizationToken: input.authorizationToken,
    directories: input.directories,
    ...(localGatewayAuthority ? { localGatewayAuthority } : {}),
    runtimeEncryptionKey,
    runtimeInstallationId,
  }
}

export type RemoteRuntimeHostClientDeps = {
  readonly fetch: typeof fetch
  serverAuthHeaders(input: { readonly password?: string }): HeadersInit
}

export type RemoteRuntimeHostQueryDeps = {
  hostClient(host: RemoteRuntimeHost): Pick<ReturnType<typeof createRemoteRuntimeHostClient>, "logs" | "status">
  readHost(): Promise<RemoteRuntimeHost | undefined>
}

export type RemoteRuntimeHostJsonRequestInput = {
  readonly host: RemoteRuntimeHost
  readonly deps: RemoteRuntimeHostClientDeps
  readonly path: string
  readonly init?: RequestInit
}

export type RemoteRuntimeHostMirroredEvent = {
  readonly directory: string
  readonly payload: RemoteRuntimeJsonValue
  readonly project?: string
}

export type RemoteRuntimeHostEventMirrorDeps = RemoteRuntimeHostClientDeps & {
  onEvent(event: RemoteRuntimeHostMirroredEvent): Promise<void> | void
  readonly pollIntervalMs?: number
  readHostState(): Promise<RemoteRuntimeHostState>
  sleep?(milliseconds: number, signal: AbortSignal): Promise<void>
}

export type RemoteRuntimeHostEventMirrorOptions = {
  readonly signal?: AbortSignal
}

export type RemoteRuntimeHostEventMirror = {
  readonly closed: Promise<void>
  stop(): void
}

export type RemoteRuntimeEventOriginKind =
  | "desktopCli"
  | "remoteRuntimeCommand"
  | "remoteRuntimeHost"
  | "remoteRuntimeClientCommand"

export type RemoteRuntimeEventOrigin = {
  readonly kind: RemoteRuntimeEventOriginKind
}

export type RemoteRuntimeEventInput = {
  readonly origin?: RemoteRuntimeEventOrigin
  readonly properties?: { readonly [key: string]: RemoteRuntimeJsonValue }
  readonly type?: string
}

export type RemoteRuntimeSessionActivityPublication = {
  readonly directory: string
  readonly event: RemoteRuntimeEventInput
  readonly origin: RemoteRuntimeEventOrigin
}

export type RemoteRuntimeConnectorAttachmentInput = {
  readonly accountId: string
  readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
  readonly attachmentCapabilities?: readonly RemoteRuntimeAttachmentCapability[]
  readonly connectorVersion: string
  readonly directoryId: string
  readonly directoryPath: string
  readonly featureCapabilities?: readonly RemoteRuntimeCapability[]
  readonly requestId: string
  readonly runtimeInstallationId: string
  readonly ticket: string
}

export type RemoteRuntimeClientAttachmentInput = {
  readonly attachment: GatewayRuntimeAttachment
  deliverRuntimeEnvelope(envelope: RuntimeWebSocketServerEnvelope): Promise<void>
  readonly clientAttachmentId: string
}

export type RemoteRuntimeClientDetachedInput = {
  readonly attachment: GatewayRuntimeAttachment
  readonly clientAttachmentId: string
}

export type RemoteRuntimeConnectorSessionInput<TRuntimeCommandHandlers, TRuntimeOperationFrame> = {
  readonly apiBaseUrl: string
  readonly attachmentInput: RemoteRuntimeConnectorAttachmentInput
  readonly authorizationToken: string
  decryptRuntimeCommand(
    payload: RemoteRuntimeEncryptedPayload,
    frame: TRuntimeOperationFrame,
  ): Promise<RemoteRuntimeProtocolClientCommand>
  onAttachment(attachment: GatewayRuntimeAttachment): Promise<void> | void
  onRemoteRuntimeClientAttachment?(input: RemoteRuntimeClientAttachmentInput): Promise<void> | void
  onRemoteRuntimeClientDetached?(input: RemoteRuntimeClientDetachedInput): Promise<void> | void
  onRuntimeHeartbeat?(attachment: GatewayRuntimeAttachment): Promise<void> | void
  readonly pollIntervalMs?: number
  readonly pollRuntimeOperations: true
  readonly runtimeCommandHandlers: TRuntimeCommandHandlers
  readonly signal: AbortSignal
}

export type RemoteRuntimeSessionFrame = RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope

export type RemoteRuntimeConnectorSessionClient = {
  deliverRuntimeEnvelope(input: {
    readonly envelope: RuntimeWebSocketServerEnvelope
    readonly clientAttachmentId: string
    readonly runtimeInstallationId: string
    readonly signal?: AbortSignal
  }): Promise<void>
  pollRuntimeOperations(input: {
    readonly gatewayRuntimeAttachmentId: string
    readonly limit?: number
    readonly runtimeInstallationId: string
    readonly signal?: AbortSignal
  }): Promise<readonly RemoteRuntimeSessionFrame[]>
  postRuntimeStatus(input: {
    readonly runtimeInstallationId: string
    readonly signal?: AbortSignal
    readonly status: RuntimeStatusFrame
  }): Promise<void>
  registerRuntimeAttachment(request: GatewayRuntimeAttachmentRegistrationRequest): Promise<GatewayRuntimeAttachment>
  revokeRuntimeAttachment(input: {
    readonly gatewayRuntimeAttachmentId: string
    readonly signal?: AbortSignal
  }): Promise<void>
}

export type RemoteRuntimeConnectorRuntimeOperationTraceStage =
  | "received"
  | "remoteRuntimeAttachmentObserved"
  | "handled"
  | "responseDelivered"
  | "lateGatewayHttpResponseIgnored"
  | "responseDeliveryFailed"
  | "webSocketResponseSent"

export interface RemoteRuntimeConnectorRuntimeOperationTraceEvent {
  readonly errorName?: string
  readonly gatewayRuntimeAttachmentId: string
  readonly method?: RemoteRuntimeProtocolClientMethod
  readonly clientAttachmentId: string
  readonly replyTargetKind: "gatewayHttpRequest" | "remoteRuntimeAttachment"
  readonly requestId: string
  readonly runtimeCommandRequestId?: string
  readonly runtimeInstallationId: string
  readonly stage: RemoteRuntimeConnectorRuntimeOperationTraceStage
}

export interface RemoteRuntimeConnectorSessionOptions {
  readonly attachmentRequest: GatewayRuntimeAttachmentRegistrationRequest
  readonly client: RemoteRuntimeConnectorSessionClient
  readonly decryptRuntimeCommand?: LocalRuntimeConnectorOptions["decryptRuntimeCommand"]
  readonly frames?: AsyncIterable<RemoteRuntimeSessionFrame> | Iterable<RemoteRuntimeSessionFrame>
  readonly isGatewayAttachmentUnavailable?: (error: Error) => boolean
  readonly maxEmptyPolls?: number
  readonly clientAttachmentId?: string
  readonly onAttachment?: (attachment: GatewayRuntimeAttachment) => Promise<void> | void
  readonly onRemoteRuntimeClientAttachment?: (input: RemoteRuntimeClientAttachmentInput) => Promise<void> | void
  readonly onRemoteRuntimeClientDetached?: (input: RemoteRuntimeClientDetachedInput) => Promise<void> | void
  readonly onRuntimeHeartbeat?: (attachment: GatewayRuntimeAttachment) => Promise<void> | void
  readonly onRuntimeOperationTrace?: (event: RemoteRuntimeConnectorRuntimeOperationTraceEvent) => Promise<void> | void
  readonly pollIntervalMs?: number
  readonly pollRuntimeOperations?: boolean
  readonly pollRuntimeOperationsLimit?: number
  readonly runtimeCommandHandlers?: RemoteRuntimeCommandAdapterOptions["handlers"]
  readonly sendRuntimeCommand?: LocalRuntimeConnectorOptions["sendRuntimeCommand"]
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  readonly statusHeartbeatIntervalMs?: number
  readonly supportedRuntimeMethods?: RemoteRuntimeCommandAdapterOptions["supportedMethods"]
}

type RuntimeEnvelopeDeliveryTraceResult = {
  readonly error?: Error
  readonly errorName?: string
  readonly stage: "lateGatewayHttpResponseIgnored" | "responseDelivered" | "responseDeliveryFailed"
}

export interface RemoteRuntimeConnectorWebSocketMessageSessionOptions {
  readonly attachment: GatewayRuntimeAttachment
  readonly client: Pick<RemoteRuntimeConnectorSessionClient, "postRuntimeStatus" | "revokeRuntimeAttachment">
  readonly decryptRuntimeCommand?: LocalRuntimeConnectorOptions["decryptRuntimeCommand"]
  readonly featureCapabilities?: readonly RemoteRuntimeCapability[]
  readonly messages: RemoteRuntimeSocketMessageQueue<RemoteRuntimeJsonValue>
  readonly clientAttachmentId?: string
  readonly onAttachment?: (attachment: GatewayRuntimeAttachment) => Promise<void> | void
  readonly onDisconnected?: () => Error
  readonly onRemoteRuntimeClientAttachment?: (input: RemoteRuntimeClientAttachmentInput) => Promise<void> | void
  readonly onRemoteRuntimeClientDetached?: (input: RemoteRuntimeClientDetachedInput) => Promise<void> | void
  readonly onRuntimeHeartbeat?: (attachment: GatewayRuntimeAttachment) => Promise<void> | void
  readonly onRuntimeOperationTrace?: (event: RemoteRuntimeConnectorRuntimeOperationTraceEvent) => Promise<void> | void
  readonly randomUUID?: () => string
  readonly runtimeCommandHandlers?: RemoteRuntimeCommandAdapterOptions["handlers"]
  readonly sendRuntimeResponseFrame: (frame: RuntimeResponseFrame) => Promise<void> | void
  readonly sendRuntimeCommand?: LocalRuntimeConnectorOptions["sendRuntimeCommand"]
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  readonly statusHeartbeatIntervalMs?: number
  readonly supportedRuntimeMethods?: RemoteRuntimeCommandAdapterOptions["supportedMethods"]
}

const defaultRemoteRuntimeStatusHeartbeatIntervalMs = 30_000

export async function runRemoteRuntimeConnectorSession(
  options: RemoteRuntimeConnectorSessionOptions,
): Promise<GatewayRuntimeAttachment> {
  const attachment = await options.client.registerRuntimeAttachment(options.attachmentRequest)
  const connectedAt = new Date()
  const runtimeCommandAdapter = createRuntimeCommandAdapterForAttachment(attachment, connectedAt, options)
  const connectorOptions = localConnectorOptions(attachment, connectedAt, options, runtimeCommandAdapter)
  const gatewayHttpConnector = createLocalRuntimeConnector(connectorOptions)
  const connector = createLocalRuntimeConnector({
    ...connectorOptions,
    clientAttachmentId: options.clientAttachmentId ?? "__pending_client_attachment__",
  })
  const connectorsByClientAttachmentId = new Map<string, ReturnType<typeof createLocalRuntimeConnector>>()
  let attachedRemoteRuntimeClientAttachments = createRemoteRuntimeClientAttachmentTracker()

  await options.client.postRuntimeStatus({
    runtimeInstallationId: attachment.runtimeInstallationId,
    signal: options.signal,
    status: connector.status(),
  })
  await options.onRuntimeHeartbeat?.(attachment)
  await options.onAttachment?.(attachment)
  const statusHeartbeat = startRuntimeStatusHeartbeat(options.client, attachment, connector, options)

  const frames =
    options.frames ??
    (options.pollRuntimeOperations
      ? pollRuntimeOperationFrames(options.client, {
          gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
          limit: options.pollRuntimeOperationsLimit,
          maxEmptyPolls: options.maxEmptyPolls,
          onPollSuccess: () => options.onRuntimeHeartbeat?.(attachment),
          pollIntervalMs: options.pollIntervalMs,
          runtimeInstallationId: attachment.runtimeInstallationId,
          signal: options.signal,
          sleep: options.sleep,
        })
      : [])

  try {
    for await (const rawFrame of frames) {
      const revocation = await handleRemoteRuntimeAttachmentRevocationNotice(
        rawFrame,
        attachment,
        attachedRemoteRuntimeClientAttachments,
        options,
      )
      if (revocation.handled) {
        attachedRemoteRuntimeClientAttachments = revocation.tracker
        continue
      }
      const frame = remoteRuntimeOperationFrameFromGateway(rawFrame)
      const replyTarget = runtimeOperationFrameReplyTarget(frame)
      emitRuntimeOperationTrace(options, attachment.runtimeInstallationId, frame, "received")
      if (replyTarget.kind === "remoteRuntimeAttachment") {
        attachedRemoteRuntimeClientAttachments = observeRemoteRuntimeClientAttachment(
          attachedRemoteRuntimeClientAttachments,
          frame.clientAttachmentId,
        ).tracker
        emitRuntimeOperationTrace(options, attachment.runtimeInstallationId, frame, "remoteRuntimeAttachmentObserved")
        await notifyRemoteRuntimeClientAttachment(options, {
          attachment,
          deliverRuntimeEnvelope: (envelope) =>
            options.client.deliverRuntimeEnvelope({
              envelope,
              clientAttachmentId: frame.clientAttachmentId,
              runtimeInstallationId: attachment.runtimeInstallationId,
              signal: options.signal,
            }),
          clientAttachmentId: frame.clientAttachmentId,
        })
      }
      const runtimeConnector = options.clientAttachmentId
        ? connector
        : replyTarget.kind === "gatewayHttpRequest"
          ? gatewayHttpConnector
          : connectorForClientAttachment(frame.clientAttachmentId)
      const result = await runtimeConnector.handleRuntimeOperation(frame)
      emitRuntimeOperationTrace(options, attachment.runtimeInstallationId, frame, "handled")
      const delivery = await deliverRuntimeEnvelopeForFrame(
        options.client,
        frame,
        attachment.runtimeInstallationId,
        result.ok ? result.envelope : remoteRuntimeErrorEnvelopeFromTransportFailure(result.error),
        options,
      )
      emitRuntimeOperationTrace(options, attachment.runtimeInstallationId, frame, delivery.stage, delivery.errorName)
      if (delivery.error) throw delivery.error
    }

    return attachment
  } finally {
    await statusHeartbeat.stop()
    attachedRemoteRuntimeClientAttachments = await detachRemoteRuntimeClientAttachmentsForSession(
      attachment,
      attachedRemoteRuntimeClientAttachments,
      options,
    )
    await options.client
      .revokeRuntimeAttachment({
        gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
        signal: options.signal,
      })
      .catch(() => undefined)
  }

  function connectorForClientAttachment(clientAttachmentId: string) {
    const existing = connectorsByClientAttachmentId.get(clientAttachmentId)
    if (existing) return existing
    const created = createLocalRuntimeConnector({
      ...connectorOptions,
      clientAttachmentId,
    })
    connectorsByClientAttachmentId.set(clientAttachmentId, created)
    return created
  }
}

export function remoteRuntimeSessionFramesFromGateway(input: RemoteRuntimeJsonValue): RemoteRuntimeSessionFrame[] {
  if (!Array.isArray(input)) {
    throw new Error("Remote runtime operation poll returned a malformed frame list.")
  }
  return input.map((frame) =>
    isRemoteRuntimeTransportFailureEnvelope(frame) ? frame : remoteRuntimeOperationFrameFromGateway(frame),
  )
}

export function remoteRuntimeOperationFrameFromGateway(
  input: RemoteRuntimeJsonValue | RuntimeOperationFrame,
): RuntimeOperationFrame {
  const validation = validateRuntimeOperationFrame(input)
  if (!validation.ok) throw new Error(validation.error.message)
  return validation.value
}

export async function runRemoteRuntimeConnectorWebSocketMessageSession(
  options: RemoteRuntimeConnectorWebSocketMessageSessionOptions,
): Promise<GatewayRuntimeAttachment> {
  const attachment = options.attachment
  const pendingClientAttachmentId = options.clientAttachmentId ?? "__pending_client_attachment__"
  const randomUUID = options.randomUUID ?? (() => globalThis.crypto.randomUUID())
  const connectedAt = new Date()
  const runtimeCommandAdapter = createRuntimeCommandAdapterForAttachment(attachment, connectedAt, options)
  const connectorOptions = localConnectorOptions(attachment, connectedAt, options, runtimeCommandAdapter)
  const gatewayHttpConnector = createLocalRuntimeConnector(connectorOptions)
  const statusConnector = createLocalRuntimeConnector({
    ...connectorOptions,
    clientAttachmentId: pendingClientAttachmentId,
  })
  const connectorsByClientAttachmentId = new Map<string, ReturnType<typeof createLocalRuntimeConnector>>()
  let attachedRemoteRuntimeClientAttachments = createRemoteRuntimeClientAttachmentTracker()

  await options.client.postRuntimeStatus({
    runtimeInstallationId: attachment.runtimeInstallationId,
    signal: options.signal,
    status: statusConnector.status(),
  })
  await options.onRuntimeHeartbeat?.(attachment)
  await options.onAttachment?.(attachment)
  const statusHeartbeat = startRuntimeStatusHeartbeat(options.client, attachment, statusConnector, options)

  try {
    let message = await options.messages.next()
    while (!message.done) {
      if (isRemoteRuntimeHeartbeatMessage(message.value)) {
        await options.sendRuntimeResponseFrame({
          envelope: {
            timestamp: new Date().toISOString(),
            type: "heartbeat",
          },
          gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
          clientAttachmentId: pendingClientAttachmentId,
          protocolVersion: remoteRuntimeTransportProtocolVersion,
          requestId: randomUUID(),
          type: "runtime.response",
        })
        await options.onRuntimeHeartbeat?.(attachment)
        message = await options.messages.next()
        continue
      }
      const revocation = await handleRemoteRuntimeAttachmentRevocationNotice(
        message.value,
        attachment,
        attachedRemoteRuntimeClientAttachments,
        options,
      )
      if (revocation.handled) {
        attachedRemoteRuntimeClientAttachments = revocation.tracker
        message = await options.messages.next()
        continue
      }
      if (isRemoteRuntimeOutboundFrameEcho(message.value, attachment.gatewayRuntimeAttachmentId)) {
        await options.onRuntimeHeartbeat?.(attachment)
        message = await options.messages.next()
        continue
      }
      const frameResult = validateRuntimeOperationFrame(message.value)
      if (!frameResult.ok) {
        const responseTarget = runtimeOperationFailureResponseTarget(
          message.value,
          attachment.gatewayRuntimeAttachmentId,
        )
        if (!responseTarget) throw new Error(frameResult.error.message)
        await options.sendRuntimeResponseFrame({
          envelope: remoteRuntimeErrorEnvelopeFromTransportFailure(frameResult.error),
          gatewayRuntimeAttachmentId: responseTarget.gatewayRuntimeAttachmentId,
          clientAttachmentId: responseTarget.clientAttachmentId,
          protocolVersion: remoteRuntimeTransportProtocolVersion,
          requestId: responseTarget.requestId,
          type: "runtime.response",
        })
        message = await options.messages.next()
        continue
      }
      const frame = frameResult.value
      const replyTarget = runtimeOperationFrameReplyTarget(frame)
      emitRuntimeOperationTrace(options, attachment.runtimeInstallationId, frame, "received")
      if (replyTarget.kind === "remoteRuntimeAttachment") {
        attachedRemoteRuntimeClientAttachments = observeRemoteRuntimeClientAttachment(
          attachedRemoteRuntimeClientAttachments,
          frame.clientAttachmentId,
        ).tracker
        emitRuntimeOperationTrace(options, attachment.runtimeInstallationId, frame, "remoteRuntimeAttachmentObserved")
        await notifyRemoteRuntimeClientAttachment(options, {
          attachment,
          deliverRuntimeEnvelope: async (envelope) => {
            await options.sendRuntimeResponseFrame({
              envelope,
              gatewayRuntimeAttachmentId: frame.gatewayRuntimeAttachmentId,
              clientAttachmentId: frame.clientAttachmentId,
              protocolVersion: remoteRuntimeTransportProtocolVersion,
              requestId: remoteRuntimeEnvelopeRequestId({ envelope, fallbackRequestId: randomUUID }),
              type: "runtime.response",
            })
          },
          clientAttachmentId: frame.clientAttachmentId,
        })
      }
      const runtimeConnector =
        replyTarget.kind === "gatewayHttpRequest"
          ? gatewayHttpConnector
          : connectorForClientAttachment(frame.clientAttachmentId)
      const result = await runtimeConnector.handleRuntimeOperation(frame)
      emitRuntimeOperationTrace(options, attachment.runtimeInstallationId, frame, "handled")
      await options.sendRuntimeResponseFrame({
        envelope: result.ok ? result.envelope : remoteRuntimeErrorEnvelopeFromTransportFailure(result.error),
        gatewayRuntimeAttachmentId: frame.gatewayRuntimeAttachmentId,
        clientAttachmentId: frame.clientAttachmentId,
        protocolVersion: remoteRuntimeTransportProtocolVersion,
        requestId: frame.requestId,
        type: "runtime.response",
      })
      emitRuntimeOperationTrace(options, attachment.runtimeInstallationId, frame, "webSocketResponseSent")
      message = await options.messages.next()
    }
    if (options.signal?.aborted) return attachment
    throw options.onDisconnected?.() ?? new Error("Remote runtime websocket disconnected.")
  } finally {
    await statusHeartbeat.stop()
    attachedRemoteRuntimeClientAttachments = await detachRemoteRuntimeClientAttachmentsForSession(
      attachment,
      attachedRemoteRuntimeClientAttachments,
      options,
    )
    await options.client
      .revokeRuntimeAttachment({
        gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
        signal: options.signal,
      })
      .catch(() => undefined)
  }

  function connectorForClientAttachment(clientAttachmentId: string) {
    const existing = connectorsByClientAttachmentId.get(clientAttachmentId)
    if (existing) return existing
    const created = createLocalRuntimeConnector({
      ...connectorOptions,
      clientAttachmentId,
    })
    connectorsByClientAttachmentId.set(clientAttachmentId, created)
    return created
  }
}

function isRemoteRuntimeOutboundFrameEcho(value: RemoteRuntimeJsonValue, gatewayRuntimeAttachmentId: string): boolean {
  if (!isRemoteRuntimeJsonObject(value)) return false
  if (value.gatewayRuntimeAttachmentId !== gatewayRuntimeAttachmentId) return false
  return value.type === "runtime.response" || value.type === "runtime.status"
}

function runtimeOperationFailureResponseTarget(
  value: RemoteRuntimeJsonValue,
  fallbackGatewayRuntimeAttachmentId: string,
): {
  readonly clientAttachmentId: string
  readonly gatewayRuntimeAttachmentId: string
  readonly requestId: string
} | null {
  if (!isRemoteRuntimeJsonObject(value)) return null
  if (value.type !== "runtime.operation") return null
  if (typeof value.clientAttachmentId !== "string" || value.clientAttachmentId.length === 0) return null
  if (typeof value.requestId !== "string" || value.requestId.length === 0) return null
  return {
    clientAttachmentId: value.clientAttachmentId,
    gatewayRuntimeAttachmentId:
      typeof value.gatewayRuntimeAttachmentId === "string" && value.gatewayRuntimeAttachmentId.length > 0
        ? value.gatewayRuntimeAttachmentId
        : fallbackGatewayRuntimeAttachmentId,
    requestId: value.requestId,
  }
}

function startRuntimeStatusHeartbeat(
  client: Pick<RemoteRuntimeConnectorSessionClient, "postRuntimeStatus">,
  attachment: GatewayRuntimeAttachment,
  connector: ReturnType<typeof createLocalRuntimeConnector>,
  options: Pick<
    RemoteRuntimeConnectorSessionOptions,
    "onRuntimeHeartbeat" | "signal" | "sleep" | "statusHeartbeatIntervalMs"
  >,
) {
  return startRemoteRuntimeHeartbeatRunner({
    intervalMs: options.statusHeartbeatIntervalMs ?? defaultRemoteRuntimeStatusHeartbeatIntervalMs,
    async onHeartbeat(signal) {
      await client.postRuntimeStatus({
        runtimeInstallationId: attachment.runtimeInstallationId,
        signal,
        status: connector.status(),
      })
      await options.onRuntimeHeartbeat?.(attachment)
    },
    signal: options.signal,
    sleep: options.sleep ?? remoteRuntimeConnectorSleep,
  })
}

async function detachRemoteRuntimeClientAttachmentsForSession(
  attachment: GatewayRuntimeAttachment,
  tracker: RemoteRuntimeClientAttachmentTracker,
  options: Pick<RemoteRuntimeConnectorSessionOptions, "onRemoteRuntimeClientDetached">,
) {
  const detached = detachAllRemoteRuntimeClientAttachments(tracker)
  for (const clientAttachmentId of detached.detachedRemoteRuntimeClientAttachmentIds) {
    await notifyRemoteRuntimeClientDetached(options, { attachment, clientAttachmentId })
  }
  return detached.tracker
}

async function detachRemoteRuntimeClientAttachmentForSession(
  attachment: GatewayRuntimeAttachment,
  clientAttachmentId: string,
  tracker: RemoteRuntimeClientAttachmentTracker,
  options: Pick<RemoteRuntimeConnectorSessionOptions, "onRemoteRuntimeClientDetached">,
) {
  const detached = detachRemoteRuntimeClientAttachment(tracker, clientAttachmentId)
  if (!detached.detached) return tracker
  await notifyRemoteRuntimeClientDetached(options, { attachment, clientAttachmentId })
  return detached.tracker
}

async function notifyRemoteRuntimeClientAttachment(
  options: Pick<RemoteRuntimeConnectorSessionOptions, "onRemoteRuntimeClientAttachment">,
  input: RemoteRuntimeClientAttachmentInput,
) {
  await options.onRemoteRuntimeClientAttachment?.(input)
}

async function notifyRemoteRuntimeClientDetached(
  options: Pick<RemoteRuntimeConnectorSessionOptions, "onRemoteRuntimeClientDetached">,
  input: RemoteRuntimeClientDetachedInput,
) {
  await options.onRemoteRuntimeClientDetached?.(input)
}

async function handleRemoteRuntimeAttachmentRevocationNotice(
  value: unknown,
  attachment: GatewayRuntimeAttachment,
  tracker: RemoteRuntimeClientAttachmentTracker,
  options: Pick<RemoteRuntimeConnectorSessionOptions, "onRemoteRuntimeClientDetached">,
): Promise<
  | { readonly handled: false; readonly tracker: RemoteRuntimeClientAttachmentTracker }
  | { readonly handled: true; readonly tracker: RemoteRuntimeClientAttachmentTracker }
> {
  if (!isAttachmentRevokedNotice(value)) return { handled: false, tracker }
  if (value.requestId === attachment.gatewayRuntimeAttachmentId) {
    throw createRemoteRuntimeAttachmentReattachSignal()
  }
  if (!hasRemoteRuntimeClientAttachment(tracker, value.requestId)) {
    return { handled: true, tracker }
  }
  return {
    handled: true,
    tracker: await detachRemoteRuntimeClientAttachmentForSession(attachment, value.requestId, tracker, options),
  }
}

function isAttachmentRevokedNotice(value: unknown): value is RemoteRuntimeTransportFailureEnvelope {
  const envelope = value as RemoteRuntimeJsonValue
  return (
    isRemoteRuntimeTransportFailureEnvelope(envelope) &&
    envelope.code === "ATTACHMENT_REVOKED" &&
    envelope.type === "attachment.revoked"
  )
}

function createRemoteRuntimeAttachmentReattachSignal() {
  return { remoteRuntimeRecovery: "reattach" as const }
}

async function deliverRuntimeEnvelopeForFrame(
  client: RemoteRuntimeConnectorSessionClient,
  frame: RuntimeOperationFrame,
  runtimeInstallationId: string,
  envelope: RuntimeWebSocketServerEnvelope,
  options: Pick<RemoteRuntimeConnectorSessionOptions, "isGatewayAttachmentUnavailable" | "signal">,
): Promise<RuntimeEnvelopeDeliveryTraceResult> {
  try {
    await client.deliverRuntimeEnvelope({
      envelope,
      clientAttachmentId: frame.clientAttachmentId,
      runtimeInstallationId,
      signal: options.signal,
    })
    return { stage: "responseDelivered" }
  } catch (error) {
    const deliveryError = error instanceof Error ? error : new Error(String(error))
    return classifyRemoteRuntimeEnvelopeDeliveryFailure({
      error: deliveryError,
      isGatewayAttachmentUnavailable: options.isGatewayAttachmentUnavailable ?? (() => false),
      replyTarget: runtimeOperationFrameReplyTarget(frame),
    })
  }
}

function emitRuntimeOperationTrace(
  options: Pick<RemoteRuntimeConnectorSessionOptions, "onRuntimeOperationTrace">,
  runtimeInstallationId: string,
  frame: RuntimeOperationFrame,
  stage: RemoteRuntimeConnectorRuntimeOperationTraceStage,
  errorName?: string,
) {
  const method = frame.payload?.method
  const requestId = frame.payload?.requestId
  const event: RemoteRuntimeConnectorRuntimeOperationTraceEvent = {
    ...(errorName ? { errorName } : {}),
    gatewayRuntimeAttachmentId: frame.gatewayRuntimeAttachmentId,
    ...(method ? { method } : {}),
    clientAttachmentId: frame.clientAttachmentId,
    replyTargetKind: runtimeOperationFrameReplyTarget(frame).kind,
    requestId: frame.requestId,
    ...(requestId ? { runtimeCommandRequestId: requestId } : {}),
    runtimeInstallationId,
    stage,
  }
  try {
    void Promise.resolve(options.onRuntimeOperationTrace?.(event)).catch(() => undefined)
  } catch {
    // Tracing is diagnostic only and must not break runtime command delivery.
  }
}

function createRuntimeCommandAdapterForAttachment(
  attachment: GatewayRuntimeAttachment,
  connectedAt: Date,
  options: Pick<RemoteRuntimeConnectorSessionOptions, "runtimeCommandHandlers" | "supportedRuntimeMethods">,
) {
  return createRemoteRuntimeCommandAdapter({
    handlers: {
      ...createRemoteRuntimeMetadataCommandHandlers({
        activeDirectoryAttachments: [
          {
            directoryId: attachment.directoryId,
            gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
            path: attachment.directoryPath,
            status: attachment.status === "online" ? "online" : "revoked",
          },
        ],
        allowedDirectories: [
          {
            directoryId: attachment.directoryId,
            displayName: remoteRuntimeDirectoryDisplayName(attachment.directoryPath),
            path: attachment.directoryPath,
          },
        ],
        attachmentCapabilities: attachment.attachmentCapabilities,
        featureCapabilities: [...remoteRuntimeDefaultFeatureCapabilities],
        now: connectedAt.toISOString.bind(connectedAt),
        serverVersion: attachment.connectorVersion,
        supportedMethods: options.supportedRuntimeMethods ?? remoteRuntimeSupportedMethods,
      }),
      ...options.runtimeCommandHandlers,
    },
    supportedMethods: options.supportedRuntimeMethods,
  })
}

function localConnectorOptions(
  attachment: GatewayRuntimeAttachment,
  connectedAt: Date,
  options: Pick<RemoteRuntimeConnectorSessionOptions, "decryptRuntimeCommand" | "sendRuntimeCommand"> & {
    readonly attachmentRequest?: Pick<GatewayRuntimeAttachmentRegistrationRequest, "featureCapabilities">
    readonly featureCapabilities?: readonly RemoteRuntimeCapability[]
  },
  runtimeCommandAdapter: ReturnType<typeof createRemoteRuntimeCommandAdapter>,
) {
  return {
    attachmentCapabilities: attachment.attachmentCapabilities,
    connectorVersion: attachment.connectorVersion,
    deviceTrustLevel: attachment.deviceTrustLevel,
    decryptRuntimeCommand: options.decryptRuntimeCommand,
    featureCapabilities: [...(options.attachmentRequest?.featureCapabilities ?? options.featureCapabilities ?? [])],
    gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
    now: connectedAt.toISOString.bind(connectedAt),
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: options.sendRuntimeCommand ?? runtimeCommandAdapter.handleRuntimeCommand,
  }
}

function pollRuntimeOperationFrames(
  client: RemoteRuntimeConnectorSessionClient,
  input: {
    readonly gatewayRuntimeAttachmentId: string
    readonly limit?: number
    readonly maxEmptyPolls?: number
    readonly onPollSuccess?: () => Promise<void> | void
    readonly pollIntervalMs?: number
    readonly runtimeInstallationId: string
    readonly signal?: AbortSignal
    readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  },
): AsyncIterable<RemoteRuntimeSessionFrame> {
  return createRemoteRuntimePollingIterable({
    limit: input.limit,
    maxEmptyPolls: input.maxEmptyPolls,
    onPollSuccess: input.onPollSuccess,
    poll: (pollInput) =>
      client.pollRuntimeOperations({
        gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
        limit: pollInput.limit,
        runtimeInstallationId: input.runtimeInstallationId,
        signal: pollInput.signal,
      }),
    pollIntervalMs: input.pollIntervalMs,
    signal: input.signal,
    sleep: input.sleep ?? remoteRuntimeConnectorSleep,
  })
}

function remoteRuntimeConnectorSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return sleepRemoteRuntime({ milliseconds, signal })
}

export type LocalRemoteRuntimeWebSocketAttachmentInput<TRemoteRuntimeWebSocketSignedAction> = {
  readonly accountId: string
  readonly action: TRemoteRuntimeWebSocketSignedAction
  deliverRuntimeEnvelope(envelope: RuntimeWebSocketServerEnvelope): Promise<void>
  readonly runtimeResponseSigningPrivateKey?: RemoteRuntimeAsymmetricPrivateKeyReference
  readonly runtimeInstallationId: string
  readonly trustedRuntimeClientId: string
}

export type LocalRemoteRuntimeWebSocketAttachmentResult =
  | { readonly ok: true; readonly response: RemoteRuntimeClientAttachment }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export type RemoteRuntimeNonceReplayStore = {
  reserve(input: {
    readonly expiresAtMs?: number
    readonly keyId: string
    readonly nonce: string
    readonly nowMs?: number
    readonly timestamp?: string
  }): Promise<boolean> | boolean
}

export type InMemoryRemoteRuntimeNonceReplayStoreOptions = {
  readonly maxEntries?: number
  readonly pruneIntervalMs?: number
}

export interface RemoteRuntimeRequestSignatureVerificationInput {
  readonly maxSkewMs?: number
  readonly nonceStore: RemoteRuntimeNonceReplayStore
  readonly nowMs: number
  readonly payloadInput: RemoteRuntimeCanonicalHttpSigningPayloadInput
  readonly proof: RemoteRuntimeRequestSignatureProof
  readonly publicKey: RemoteRuntimeAsymmetricPublicKey
}

export interface RemoteRuntimeHttpResponseSignatureVerificationInput {
  readonly maxSkewMs?: number
  readonly nowMs: number
  readonly payloadInput: RemoteRuntimeCanonicalHttpResponseSigningPayloadInput
  readonly proof: RemoteRuntimeHttpResponseSignatureProof
  readonly publicKey: RemoteRuntimeAsymmetricPublicKey
}

export interface RuntimeWebSocketEventSignatureVerificationInput {
  readonly maxSkewMs?: number
  readonly nowMs: number
  readonly payloadInput: RuntimeWebSocketEventSignaturePayloadInput
  readonly proof: RuntimeWebSocketEventSignatureProof
  readonly publicKey: RemoteRuntimeAsymmetricPublicKey
}

export interface RemoteRuntimeWebSocketUpgradeSignatureVerificationInput {
  readonly maxSkewMs?: number
  readonly nonceStore: RemoteRuntimeNonceReplayStore
  readonly nowMs: number
  readonly payloadInput: RemoteRuntimeCanonicalWebSocketUpgradeSigningPayloadInput
  readonly proof: Omit<RemoteRuntimeRequestSignatureProof, "bodySha256">
  readonly publicKey: RemoteRuntimeAsymmetricPublicKey
}

export interface RemoteRuntimeWebSocketActionSignatureVerificationInput {
  readonly maxSkewMs?: number
  readonly nonceStore: RemoteRuntimeNonceReplayStore
  readonly nowMs: number
  readonly payloadInput: RemoteRuntimeCanonicalWebSocketActionSigningPayloadInput
  readonly proof: RemoteRuntimeWebSocketActionSignatureProof
  readonly publicKey: RemoteRuntimeAsymmetricPublicKey
}

export type RemoteRuntimeActiveChatCursor = {
  readonly offset?: number
  readonly seenSessionIds: readonly string[]
  readonly sessionId: string
  readonly snapshotId?: string
  readonly updatedAt: string
}

export type RemoteRuntimeChatMessageCursor = {
  readonly endExclusive: number
  readonly pageSize: number
  readonly sessionId: string
}

export type RemoteRuntimeMirroredSessionStatus = {
  readonly sessionId: string
  readonly status: RemoteRuntimeActiveChatMetadataProjection["status"]
}

export const remoteRuntimeTransportOperationalPolicy = {
  auditRetentionDays: 90,
  background: {
    backgroundRefreshCadenceMinutes: 15,
    correctnessRequiresBackgroundSocket: false,
    foregroundConnectionModel: "webSocket",
    notificationHintCategories: ["runtime.available", "runtime.revoked", "coordination.changed"],
    notificationHintTransport: "apnsOrBackgroundRefresh",
    privilegedContinuationAllowed: false,
  },
  limits: {
    maxRemoteRuntimeClientAttachmentsPerRuntime: 8,
    maxOperationsPerRemoteRuntimeClientAttachment: 120,
    maxQueuedRuntimeOperationsPerRuntime: 120,
    maxRuntimeOperationPayloadBytes: 64 * 1024,
  },
  replay: {
    compatibilitySessionReplayAuthority: false,
    durableThreadReplayTarget: "providerThreadRef",
  },
} as const

export type RemoteRuntimeEncryptionKey = {
  readonly key: ArrayBuffer | ArrayBufferView
  readonly keyId: string
}

export type EncryptRuntimeCommandOptions = RemoteRuntimeEncryptionKey & {
  readonly nonce?: ArrayBuffer | ArrayBufferView
}

export type RuntimeOperationFrame = {
  readonly deviceTrustLevel?: RemoteRuntimeClientTrustLevel
  readonly encryptedPayload?: RemoteRuntimeEncryptedPayload
  readonly gatewayRuntimeAttachmentId: string
  readonly idempotencyKey?: string
  readonly clientAttachmentId: string
  readonly operationClass: RemoteRuntimeOperationClass
  readonly payload?: RemoteRuntimeProtocolClientCommand
  readonly protocolVersion: string
  readonly replyTarget?: RuntimeOperationReplyTarget
  readonly requestId: string
  readonly trustedGatewayHttpRequest?: true
  readonly type: "runtime.operation"
}

export type RuntimeOperationFrameInput = RemoteRuntimeJsonValue | RuntimeOperationFrame

export type RuntimeResponseFrame = {
  readonly envelope: RuntimeWebSocketServerEnvelope
  readonly gatewayRuntimeAttachmentId: string
  readonly clientAttachmentId: string
  readonly protocolVersion: string
  readonly requestId: string
  readonly type: "runtime.response"
}

export type RemoteRuntimeValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export type RemoteRuntimeStatusSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly allowedDirectories: readonly RuntimeWebSocketAllowedDirectory[]
  readonly gatewayRuntimeAttachmentId: string | null
  readonly state: RemoteRuntimeStatusSnapshotState
  readonly connectorVersion: string | null
  readonly lastHeartbeatAt: string | null
  readonly attachmentCapabilities: readonly RemoteRuntimeAttachmentCapability[]
}

export type RemoteRuntimeDirectoriesSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly activeDirectoryAttachments: readonly RuntimeWebSocketDirectoryAttachment[]
  readonly allowedDirectories: readonly RuntimeWebSocketAllowedDirectory[]
}

export type RemoteRuntimeCapabilitiesSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly attachmentCapabilities: readonly RemoteRuntimeAttachmentCapability[]
  readonly featureCapabilities: readonly RemoteRuntimeCapability[]
  readonly supportedMethods: readonly RemoteRuntimeProtocolClientMethod[]
}

export type RemoteRuntimeActiveChatsSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly activeChats: readonly RemoteRuntimeActiveChatMetadataProjection[]
  readonly pageInfo: RemoteRuntimeActiveChatsPageInfo
  readonly snapshotId: string | null
  readonly resourceVersion: string | null
}

export type RemoteRuntimeChatSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly chat: RemoteRuntimeActiveChatMetadataProjection
  readonly resourceVersion: string | null
}

export type RemoteRuntimeChatMessagesSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly sessionId: string
  readonly messages: readonly RemoteRuntimeChatMessageProjection[]
  readonly pageInfo: RemoteRuntimeChatMessagesPageInfo
  readonly resourceVersion: string | null
}

export type RemoteRuntimeProvidersSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly providers: RuntimeProviderListResponse
  readonly resourceVersion: string | null
}

export type RemoteRuntimeGoalsSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly goals: readonly ThreadGoal[]
  readonly pageInfo: RemoteRuntimeGoalsPageInfo
  readonly resourceVersion: string | null
}

export type RemoteRuntimeGitStatusSnapshot = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly repositories: readonly RemoteRuntimeGitRepositoryStatus[]
  readonly resourceVersion: string | null
}

export type RemoteRuntimeAliasesSnapshot = {
  readonly aliases: readonly RemoteRuntimePromptAlias[]
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly resourceVersion: string | null
}

export type RemoteRuntimeStartChatRequest = {
  readonly requestId: string
  readonly runtimeInstallationId: string
  readonly directoryId: string
  readonly providerId: string | null
  readonly model: string | null
  readonly title: string | null
  readonly idempotencyKey: string
}

export type RemoteRuntimeStartChatResponse = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly chat: RemoteRuntimeActiveChatMetadataProjection
}

export type RemoteRuntimeSendChatMessageRequest = {
  readonly requestId: string
  readonly runtimeInstallationId: string
  readonly sessionId: string
  readonly input: {
    readonly content: string
    readonly mode: "default"
  }
  readonly idempotencyKey: string
}

export type RemoteRuntimeSendChatMessageResponse = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly sessionId: string
  readonly message: RemoteRuntimeChatMessageProjection
  readonly acceptedAt: string
}

export type RemoteRuntimeUpdateChatRequest = {
  readonly requestId: string
  readonly runtimeInstallationId: string
  readonly sessionId: string
  readonly input: {
    readonly providerId: string
    readonly model: string
  }
  readonly idempotencyKey: string
}

export type RemoteRuntimeUpdateChatResponse = {
  readonly remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion
  readonly runtimeInstallationId: string
  readonly chat: RemoteRuntimeActiveChatMetadataProjection
}

export type RemoteRuntimeRealtimeResourceRef = RuntimeWebSocketEventResourceRef

export type RemoteRuntimeRealtimeEventEnvelope<
  TType extends RemoteRuntimeRealtimeEventType = RemoteRuntimeRealtimeEventType,
  TPayload = { readonly [key: string]: never },
> = {
  readonly protocolVersion: string
  readonly type: "event"
  readonly event: {
    readonly eventType: TType
    readonly sequence: number
    readonly timestamp: string
    readonly runtimeInstallationId: string
    readonly gatewayRuntimeAttachmentId: string | null
    readonly resource: RemoteRuntimeRealtimeResourceRef | null
    readonly payload: TPayload
  }
}

export type RuntimeStatusChangedPayload = {
  readonly status: RemoteRuntimeStatusSnapshot
}

export type ActiveChatsChangedPayload = {
  readonly reason: "created" | "updated" | "closed" | "messageAccepted" | "statusChanged" | "unknown"
  readonly chat: RemoteRuntimeActiveChatMetadataProjection | null
  readonly invalidates: readonly RemoteRuntimeRealtimeResourceRef[]
}

export type ChatChangedPayload = {
  readonly sessionId: string
  readonly chat: RemoteRuntimeActiveChatMetadataProjection | null
  readonly invalidatesMessages: boolean
}

export type ChatMessagesChangedPayload = {
  readonly sessionId: string
  readonly reason: "messageAdded" | "messageUpdated" | "messageRemoved" | "historyChanged" | "unknown"
  readonly message: RemoteRuntimeChatMessageProjection | null
  readonly invalidates: readonly RemoteRuntimeRealtimeResourceRef[]
}

export type GoalsChangedPayload = {
  readonly goal: ThreadGoal | null
  readonly invalidates: readonly RemoteRuntimeRealtimeResourceRef[]
  readonly sessionId: string | null
}

export type AliasesChangedPayload = {
  readonly alias: RemoteRuntimePromptAlias | null
  readonly invalidates: readonly RemoteRuntimeRealtimeResourceRef[]
}

export type ChatStreamDeltaPayload = {
  readonly sessionId: string
  readonly messageId: string | null
  readonly partId: string | null
  readonly field: string | null
  readonly delta: string
}

export type ChatStreamPartPayload = {
  readonly sessionId: string
  readonly messageId: string | null
  readonly partId: string | null
  readonly part: RemoteRuntimeChatMessagePartProjection | null
  readonly truncated: boolean
}

export type RemoteRuntimeOperationCompletedPayload = {
  readonly requestId: string
  readonly idempotencyKey: string | null
  readonly resource: RemoteRuntimeRealtimeResourceRef | null
}

export type RemoteRuntimeOperationFailedPayload = {
  readonly requestId: string
  readonly idempotencyKey: string | null
  readonly error: {
    readonly code: string
    readonly message: string
  }
  readonly resource: RemoteRuntimeRealtimeResourceRef | null
}

export type RemoteRuntimeGatewaySemanticState = {
  readonly clientAttachments: readonly {
    readonly accountId: string
    readonly deviceTrustLevel: RemoteRuntimeClientTrustLevel
    readonly gatewayRuntimeAttachmentId: string
    readonly clientAttachmentId: string
    readonly runtimeInstallationId: string
    readonly status: RemoteRuntimeClientAttachment["status"]
    readonly trustedRuntimeClientId: string
  }[]
  readonly runtimeAttachments: readonly {
    readonly accountId: string
    readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
    readonly attachmentCapabilities: readonly RemoteRuntimeAttachmentCapability[]
    readonly connectorVersion: string
    readonly deviceTrustLevel: RemoteRuntimeClientTrustLevel | null
    readonly directoryId: string
    readonly directoryPath: string
    readonly gatewayRuntimeAttachmentId: string
    readonly runtimeInstallationId: string
    readonly status: GatewayRuntimeAttachment["status"]
  }[]
  readonly runtimeStatuses: readonly RuntimeStatusFrame[]
}

export type GatewayAuditEvent = {
  readonly accountId?: string
  readonly action:
    | "remoteRuntime.attached"
    | "remoteRuntime.client.attached"
    | "remoteRuntime.operation.routed"
    | "remoteRuntime.http.request.queued"
    | "remoteRuntime.http.request.timeout"
    | "remoteRuntime.http.queue.full"
    | "remoteRuntime.http.response.delivered"
    | "remoteRuntime.http.response.late"
    | "remoteRuntime.authorization.denied"
    | "remoteRuntime.client.revoked"
    | "remoteRuntime.revoked"
  readonly gatewayRuntimeAttachmentId?: string
  readonly clientAttachmentId?: string
  readonly requestId: string
  readonly runtimeInstallationId: string | null
  readonly timestamp: string
  readonly trustedRuntimeClientId?: string
}

export type RemoteRuntimeGatewayRouterOptions = {
  audit?(event: GatewayAuditEvent): Promise<void> | void
  authorizeRemoteRuntimeClientAttachment(request: RemoteRuntimeClientAttachmentRequest): boolean
  authorizeRuntimeAttachment(request: GatewayRuntimeAttachmentRegistrationRequest): boolean
  createAttachmentId?(prefix: "gra" | "mda"): string
  readonly maxRemoteRuntimeClientAttachmentsPerRuntime?: number
  readonly maxOperationsPerRemoteRuntimeClientAttachment?: number
  now(): string
}

export type GatewayAttachmentResult<T> =
  | { readonly attachment: T; readonly ok: true }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export type GatewayRouteResult =
  | {
      readonly destination: GatewayRuntimeAttachment
      readonly frame: RuntimeOperationFrame
      readonly ok: true
    }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export type RuntimeStatusResult =
  | { readonly ok: true; readonly status: RuntimeStatusFrame }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export type RemoteRuntimeGatewayRouter = ReturnType<typeof createRemoteRuntimeGatewayRouter>

export function createRemoteRuntimeGatewayRouter(options: RemoteRuntimeGatewayRouterOptions) {
  const runtimeAttachments = new Map<string, GatewayRuntimeAttachment>()
  const latestRuntimeAttachmentByInstallation = new Map<string, string>()
  const runtimeStatuses = new Map<string, RuntimeStatusFrame>()
  const clientAttachmentsById = new Map<string, RemoteRuntimeClientAttachment>()
  const operationCounts = new Map<string, number>()
  const routedIdempotencyKeys = new Set<string>()
  const statusSequencer = createAttachmentStatusSequencer()
  const maxRemoteRuntimeClientAttachmentsPerRuntime =
    options.maxRemoteRuntimeClientAttachmentsPerRuntime ??
    remoteRuntimeTransportOperationalPolicy.limits.maxRemoteRuntimeClientAttachmentsPerRuntime
  const maxOperationsPerRemoteRuntimeClientAttachment =
    options.maxOperationsPerRemoteRuntimeClientAttachment ??
    remoteRuntimeTransportOperationalPolicy.limits.maxOperationsPerRemoteRuntimeClientAttachment
  const createAttachmentId = options.createAttachmentId ?? createRemoteRuntimeGatewayRandomAttachmentId

  const audit = (event: Omit<GatewayAuditEvent, "timestamp">) => {
    options.audit?.({ ...event, timestamp: options.now() })
  }

  return {
    attachRuntime(
      request: GatewayRuntimeAttachmentRegistrationRequest,
    ): GatewayAttachmentResult<GatewayRuntimeAttachment> {
      const validation = validateGatewayRuntimeAttachmentRegistrationRequest(request)
      if (!validation.ok) return validation
      const validatedRequest = validation.value
      if (!options.authorizeRuntimeAttachment(validatedRequest)) {
        return remoteRuntimeGatewayFailure(
          "AUTHORIZATION_FAILED",
          validatedRequest.requestId,
          "Runtime attachment ticket is invalid, expired, already consumed, or does not match this runtime installation.",
        )
      }

      const attachment: GatewayRuntimeAttachment = {
        accountId: validatedRequest.accountId,
        ...(validatedRequest.allowedDirectories ? { allowedDirectories: [...validatedRequest.allowedDirectories] } : {}),
        attachmentCapabilities: [...validatedRequest.attachmentCapabilities],
        connectorVersion: validatedRequest.connectorVersion,
        directoryId: validatedRequest.directoryId,
        directoryPath: validatedRequest.directoryPath,
        featureCapabilities: [...(validatedRequest.featureCapabilities ?? [])],
        gatewayRuntimeAttachmentId: createAttachmentId("gra"),
        runtimeInstallationId: validatedRequest.runtimeInstallationId,
        status: "online",
      }
      runtimeAttachments.set(attachment.gatewayRuntimeAttachmentId, attachment)
      latestRuntimeAttachmentByInstallation.set(attachment.runtimeInstallationId, attachment.gatewayRuntimeAttachmentId)
      audit({
        action: "remoteRuntime.attached",
        accountId: attachment.accountId,
        gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
        requestId: validatedRequest.requestId,
        runtimeInstallationId: attachment.runtimeInstallationId,
      })
      return { attachment, ok: true }
    },

    attachRemoteRuntimeClient(
      request: RemoteRuntimeClientAttachmentRequest,
    ): GatewayAttachmentResult<RemoteRuntimeClientAttachment> {
      const validation = validateRemoteRuntimeClientAttachmentRequest(request)
      if (!validation.ok) return validation
      const validatedRequest = validation.value
      const gatewayRuntimeAttachmentId = latestRuntimeAttachmentByInstallation.get(
        validatedRequest.runtimeInstallationId,
      )
      if (!gatewayRuntimeAttachmentId) {
        return remoteRuntimeGatewayFailure(
          "RUNTIME_UNAVAILABLE",
          validatedRequest.requestId,
          "No live runtime attachment is registered for this runtime installation.",
        )
      }
      const runtime = runtimeAttachments.get(gatewayRuntimeAttachmentId)!
      if (!remoteRuntimeGatewayRuntimeAttachmentCanRoute(runtime)) {
        return remoteRuntimeGatewayFailure(
          "RUNTIME_UNAVAILABLE",
          validatedRequest.requestId,
          `The latest runtime attachment is ${runtime.status}, not online.`,
        )
      }
      if (runtime.accountId !== validatedRequest.accountId) {
        return remoteRuntimeGatewayFailure(
          "AUTHORIZATION_FAILED",
          validatedRequest.requestId,
          "Remote runtime attachment account does not match the live runtime attachment account.",
        )
      }
      if (runtime.runtimeInstallationId !== validatedRequest.runtimeInstallationId) {
        return remoteRuntimeGatewayFailure(
          "AUTHORIZATION_FAILED",
          validatedRequest.requestId,
          "Remote runtime attachment runtime installation does not match the live runtime attachment.",
        )
      }
      if (!options.authorizeRemoteRuntimeClientAttachment(validatedRequest)) {
        return remoteRuntimeGatewayFailure(
          "AUTHORIZATION_FAILED",
          validatedRequest.requestId,
          "Remote runtime attachment ticket is invalid, expired, already consumed, or does not match this trusted device.",
        )
      }
      revokeExistingRemoteRuntimeClientAttachmentsForTrustedDevice(
        runtime.gatewayRuntimeAttachmentId,
        validatedRequest.trustedRuntimeClientId,
      )
      if (
        remoteRuntimeClientAttachmentCount(runtime.gatewayRuntimeAttachmentId) >=
        maxRemoteRuntimeClientAttachmentsPerRuntime
      ) {
        return remoteRuntimeGatewayFailure(
          "AUTHORIZATION_FAILED",
          validatedRequest.requestId,
          "The live runtime attachment has reached its remote runtime attachment limit.",
        )
      }

      const attachment: RemoteRuntimeClientAttachment = {
        accountId: validatedRequest.accountId,
        deviceTrustLevel: validatedRequest.deviceTrustLevel ?? "paired",
        gatewayRuntimeAttachmentId: runtime.gatewayRuntimeAttachmentId,
        clientAttachmentId: createAttachmentId("mda"),
        runtimeInstallationId: validatedRequest.runtimeInstallationId,
        status: "attached",
        trustedRuntimeClientId: validatedRequest.trustedRuntimeClientId,
      }
      clientAttachmentsById.set(attachment.clientAttachmentId, attachment)
      audit({
        action: "remoteRuntime.client.attached",
        accountId: attachment.accountId,
        gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
        clientAttachmentId: attachment.clientAttachmentId,
        requestId: validatedRequest.requestId,
        runtimeInstallationId: attachment.runtimeInstallationId,
        trustedRuntimeClientId: attachment.trustedRuntimeClientId,
      })
      return { attachment, ok: true }
    },

    routeRuntimeOperation(input: RuntimeOperationFrameInput): GatewayRouteResult {
      const frameResult = validateRuntimeOperationFrame(input)
      if (!frameResult.ok) return frameResult
      const frame = frameResult.value
      if (runtimeOperationFrameReplyTarget(frame).kind === "gatewayHttpRequest") {
        return remoteRuntimeGatewayFailure(
          "AUTHORIZATION_FAILED",
          frame.requestId,
          "Gateway-trusted HTTP runtime operations cannot be submitted by runtime clients.",
        )
      }

      const clientAttachment = clientAttachmentsById.get(frame.clientAttachmentId)
      const runtime = runtimeAttachments.get(frame.gatewayRuntimeAttachmentId)
      if (
        !clientAttachment ||
        !runtime ||
        clientAttachment.status !== "attached" ||
        !remoteRuntimeGatewayRuntimeAttachmentCanRoute(runtime) ||
        clientAttachment.gatewayRuntimeAttachmentId !== runtime.gatewayRuntimeAttachmentId
      ) {
        return denied(frame.requestId, clientAttachment, runtime)
      }
      if (
        latestRuntimeAttachmentByInstallation.get(runtime.runtimeInstallationId) !== runtime.gatewayRuntimeAttachmentId
      ) {
        return createRemoteRuntimeGatewayRuntimeUnavailableResult(frame.requestId)
      }

      const used = operationCounts.get(clientAttachment.clientAttachmentId) ?? 0
      if (used >= maxOperationsPerRemoteRuntimeClientAttachment)
        return denied(frame.requestId, clientAttachment, runtime)
      if (remoteRuntimeGatewayOperationClassRequiresIdempotency(frame.operationClass)) {
        const idempotency = authorizeFrameIdempotency(frame, clientAttachment.clientAttachmentId)
        if (!idempotency.ok) return idempotency
      }

      const authorizedFrame: RuntimeOperationFrame = { ...frame, deviceTrustLevel: clientAttachment.deviceTrustLevel }
      if (authorizedFrame.payload) {
        const authorization = authorizeRemoteRuntimeCommandWithPolicy(authorizedFrame.payload, {
          attachmentCapabilities: runtime.attachmentCapabilities,
          deviceTrustLevel: clientAttachment.deviceTrustLevel,
          encrypted: false,
          idempotencyKey: authorizedFrame.idempotencyKey ?? null,
          metadataSliceOnly: true,
          operationClass: authorizedFrame.operationClass,
          runtimeAttachmentAuthorized: true,
        })
        if (!authorization.ok) {
          audit({
            action: "remoteRuntime.authorization.denied",
            accountId: runtime.accountId,
            gatewayRuntimeAttachmentId: runtime.gatewayRuntimeAttachmentId,
            clientAttachmentId: clientAttachment.clientAttachmentId,
            requestId: authorizedFrame.requestId,
            runtimeInstallationId: runtime.runtimeInstallationId,
            trustedRuntimeClientId: clientAttachment.trustedRuntimeClientId,
          })
          return authorization
        }
      }

      operationCounts.set(clientAttachment.clientAttachmentId, used + 1)
      if (authorizedFrame.idempotencyKey) {
        routedIdempotencyKeys.add(
          remoteRuntimeGatewayIdempotencyScope(clientAttachment.clientAttachmentId, authorizedFrame.idempotencyKey),
        )
      }
      audit({
        action: "remoteRuntime.operation.routed",
        accountId: runtime.accountId,
        gatewayRuntimeAttachmentId: runtime.gatewayRuntimeAttachmentId,
        clientAttachmentId: clientAttachment.clientAttachmentId,
        requestId: authorizedFrame.requestId,
        runtimeInstallationId: runtime.runtimeInstallationId,
        trustedRuntimeClientId: clientAttachment.trustedRuntimeClientId,
      })
      return { destination: runtime, frame: authorizedFrame, ok: true }
    },

    recordRuntimeStatus(input: RemoteRuntimeJsonValue): RuntimeStatusResult {
      const statusResult = validateRuntimeStatusFrame(input)
      if (!statusResult.ok) return statusResult
      const status = statusResult.value
      const runtime = runtimeAttachments.get(status.gatewayRuntimeAttachmentId)
      if (!runtime || runtime.status === "revoked")
        return createRemoteRuntimeGatewayRuntimeUnavailableResult(status.requestId)
      if (!statusSequencer.accept(status)) {
        return remoteRuntimeGatewayFailure(
          "VALIDATION_FAILED",
          status.requestId,
          "Runtime status sequence is out of order.",
        )
      }
      runtimeStatuses.set(status.gatewayRuntimeAttachmentId, status)
      return { ok: true, status }
    },

    runtimeAttachmentStatus(gatewayRuntimeAttachmentId: string, runtimeInstallationId?: string): RuntimeStatusResult {
      const runtime = runtimeAttachments.get(gatewayRuntimeAttachmentId)
      const status = runtimeStatuses.get(gatewayRuntimeAttachmentId)
      if (!runtime || runtime.status === "revoked" || !status)
        return createRemoteRuntimeGatewayRuntimeUnavailableResult(gatewayRuntimeAttachmentId)
      if (runtimeInstallationId !== undefined && runtime.runtimeInstallationId !== runtimeInstallationId) {
        return remoteRuntimeGatewayFailure(
          "AUTHORIZATION_FAILED",
          gatewayRuntimeAttachmentId,
          "Runtime installation query authority does not match.",
        )
      }
      return { ok: true, status }
    },

    markRuntimeAttachmentOnline(gatewayRuntimeAttachmentId: string): GatewayRuntimeAttachment | null {
      return markRuntimeAttachmentStatus(gatewayRuntimeAttachmentId, "online")
    },

    markRuntimeAttachmentDegraded(gatewayRuntimeAttachmentId: string): GatewayRuntimeAttachment | null {
      return markRuntimeAttachmentStatus(gatewayRuntimeAttachmentId, "degraded")
    },

    markRuntimeAttachmentUnavailable(gatewayRuntimeAttachmentId: string): GatewayRuntimeAttachment | null {
      return markRuntimeAttachmentStatus(gatewayRuntimeAttachmentId, "unavailable")
    },

    latestRuntimeAttachmentForInstallation(runtimeInstallationId: string): GatewayRuntimeAttachment | null {
      const gatewayRuntimeAttachmentId = latestRuntimeAttachmentByInstallation.get(runtimeInstallationId)
      if (!gatewayRuntimeAttachmentId) return null
      return runtimeAttachments.get(gatewayRuntimeAttachmentId) ?? null
    },

    revokeTrustedRuntimeClient(trustedRuntimeClientId: string): RemoteRuntimeTransportFailureEnvelope[] {
      const envelopes: RemoteRuntimeTransportFailureEnvelope[] = []
      for (const attachment of clientAttachmentsById.values()) {
        if (attachment.trustedRuntimeClientId === trustedRuntimeClientId && attachment.status === "attached") {
          attachment.status = "revoked"
          envelopes.push(createAttachmentRevokedEnvelope(attachment.clientAttachmentId))
          audit({
            action: "remoteRuntime.client.revoked",
            accountId: attachment.accountId,
            gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
            clientAttachmentId: attachment.clientAttachmentId,
            requestId: attachment.clientAttachmentId,
            runtimeInstallationId: attachment.runtimeInstallationId,
            trustedRuntimeClientId: attachment.trustedRuntimeClientId,
          })
        }
      }
      return envelopes
    },

    revokeRemoteRuntimeClientAttachment(clientAttachmentId: string): RemoteRuntimeTransportFailureEnvelope[] {
      const attachment = clientAttachmentsById.get(clientAttachmentId)
      if (!attachment || attachment.status !== "attached") return []
      attachment.status = "revoked"
      audit({
        action: "remoteRuntime.client.revoked",
        accountId: attachment.accountId,
        gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
        clientAttachmentId: attachment.clientAttachmentId,
        requestId: attachment.clientAttachmentId,
        runtimeInstallationId: attachment.runtimeInstallationId,
        trustedRuntimeClientId: attachment.trustedRuntimeClientId,
      })
      return [createAttachmentRevokedEnvelope(attachment.clientAttachmentId)]
    },
    revokeRuntimeAttachment(gatewayRuntimeAttachmentId: string): RemoteRuntimeTransportFailureEnvelope[] {
      return revokeRuntimeAttachmentById(gatewayRuntimeAttachmentId)
    },

    revokeRuntimeInstallation(runtimeInstallationId: string): RemoteRuntimeTransportFailureEnvelope[] {
      const envelopes: RemoteRuntimeTransportFailureEnvelope[] = []
      for (const runtime of runtimeAttachments.values()) {
        if (runtime.runtimeInstallationId === runtimeInstallationId && runtime.status !== "revoked") {
          envelopes.push(...revokeRuntimeAttachmentById(runtime.gatewayRuntimeAttachmentId))
        }
      }
      latestRuntimeAttachmentByInstallation.delete(runtimeInstallationId)
      return envelopes
    },

    runtimeSemanticState(): RemoteRuntimeGatewaySemanticState {
      const clientAttachments = [...clientAttachmentsById.values()]
        .map((attachment) => ({
          accountId: attachment.accountId,
          deviceTrustLevel: attachment.deviceTrustLevel,
          gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
          clientAttachmentId: attachment.clientAttachmentId,
          runtimeInstallationId: attachment.runtimeInstallationId,
          status: attachment.status,
          trustedRuntimeClientId: attachment.trustedRuntimeClientId,
        }))
        .sort((left, right) => left.clientAttachmentId.localeCompare(right.clientAttachmentId))
      return {
        clientAttachments,
        runtimeAttachments: [...runtimeAttachments.values()]
          .map((attachment) => ({
            accountId: attachment.accountId,
            ...(attachment.allowedDirectories ? { allowedDirectories: [...attachment.allowedDirectories] } : {}),
            attachmentCapabilities: [...attachment.attachmentCapabilities],
            connectorVersion: attachment.connectorVersion,
            deviceTrustLevel: attachment.deviceTrustLevel ?? null,
            directoryId: attachment.directoryId,
            directoryPath: attachment.directoryPath,
            gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
            runtimeInstallationId: attachment.runtimeInstallationId,
            status: attachment.status,
          }))
          .sort((left, right) => left.gatewayRuntimeAttachmentId.localeCompare(right.gatewayRuntimeAttachmentId)),
        runtimeStatuses: [...runtimeStatuses.values()]
          .map((status) => ({ ...status, attachmentCapabilities: [...status.attachmentCapabilities] }))
          .sort((left, right) => left.gatewayRuntimeAttachmentId.localeCompare(right.gatewayRuntimeAttachmentId)),
      }
    },
  }

  function revokeRuntimeAttachmentById(gatewayRuntimeAttachmentId: string): RemoteRuntimeTransportFailureEnvelope[] {
    const runtime = runtimeAttachments.get(gatewayRuntimeAttachmentId)
    if (!runtime || runtime.status === "revoked") return []

    runtime.status = "revoked"
    if (latestRuntimeAttachmentByInstallation.get(runtime.runtimeInstallationId) === gatewayRuntimeAttachmentId) {
      latestRuntimeAttachmentByInstallation.delete(runtime.runtimeInstallationId)
    }
    runtimeStatuses.delete(gatewayRuntimeAttachmentId)
    const envelopes = [createAttachmentRevokedEnvelope(gatewayRuntimeAttachmentId)]
    for (const attachment of clientAttachmentsById.values()) {
      if (attachment.gatewayRuntimeAttachmentId === gatewayRuntimeAttachmentId && attachment.status === "attached") {
        attachment.status = "revoked"
        envelopes.push(createAttachmentRevokedEnvelope(attachment.clientAttachmentId))
        audit({
          action: "remoteRuntime.client.revoked",
          accountId: attachment.accountId,
          gatewayRuntimeAttachmentId,
          clientAttachmentId: attachment.clientAttachmentId,
          requestId: attachment.clientAttachmentId,
          runtimeInstallationId: attachment.runtimeInstallationId,
          trustedRuntimeClientId: attachment.trustedRuntimeClientId,
        })
      }
    }
    audit({
      action: "remoteRuntime.revoked",
      accountId: runtime.accountId,
      gatewayRuntimeAttachmentId,
      requestId: gatewayRuntimeAttachmentId,
      runtimeInstallationId: runtime.runtimeInstallationId,
    })
    return envelopes
  }

  function markRuntimeAttachmentStatus(
    gatewayRuntimeAttachmentId: string,
    status: GatewayRuntimeAttachment["status"],
  ): GatewayRuntimeAttachment | null {
    const runtime = runtimeAttachments.get(gatewayRuntimeAttachmentId)
    if (!runtime || runtime.status === "revoked") return null
    runtime.status = status
    return { ...runtime, attachmentCapabilities: [...runtime.attachmentCapabilities] }
  }

  function remoteRuntimeClientAttachmentCount(gatewayRuntimeAttachmentId: string) {
    let count = 0
    for (const attachment of clientAttachmentsById.values()) {
      if (attachment.gatewayRuntimeAttachmentId === gatewayRuntimeAttachmentId && attachment.status === "attached")
        count += 1
    }
    return count
  }

  function revokeExistingRemoteRuntimeClientAttachmentsForTrustedDevice(
    gatewayRuntimeAttachmentId: string,
    trustedRuntimeClientId: string,
  ) {
    for (const attachment of clientAttachmentsById.values()) {
      if (
        attachment.gatewayRuntimeAttachmentId === gatewayRuntimeAttachmentId &&
        attachment.trustedRuntimeClientId === trustedRuntimeClientId &&
        attachment.status === "attached"
      ) {
        attachment.status = "revoked"
        audit({
          action: "remoteRuntime.client.revoked",
          accountId: attachment.accountId,
          gatewayRuntimeAttachmentId: attachment.gatewayRuntimeAttachmentId,
          clientAttachmentId: attachment.clientAttachmentId,
          requestId: attachment.clientAttachmentId,
          runtimeInstallationId: attachment.runtimeInstallationId,
          trustedRuntimeClientId: attachment.trustedRuntimeClientId,
        })
      }
    }
  }

  function authorizeFrameIdempotency(
    frame: RuntimeOperationFrame,
    clientAttachmentId: string,
  ): GatewayRouteResult | { readonly ok: true } {
    if (!isNonEmptyRemoteRuntimeString(frame.idempotencyKey)) {
      return remoteRuntimeGatewayFailure(
        "AUTHORIZATION_FAILED",
        frame.requestId,
        "Runtime operation requires an idempotency key.",
      )
    }
    if (routedIdempotencyKeys.has(remoteRuntimeGatewayIdempotencyScope(clientAttachmentId, frame.idempotencyKey))) {
      return remoteRuntimeGatewayFailure(
        "AUTHORIZATION_FAILED",
        frame.requestId,
        "Runtime operation idempotency key has already been used.",
      )
    }
    return { ok: true }
  }

  function denied(
    requestId: string,
    clientAttachment: RemoteRuntimeClientAttachment | undefined,
    runtime: GatewayRuntimeAttachment | undefined,
  ): GatewayRouteResult {
    audit({
      action: "remoteRuntime.authorization.denied",
      accountId: runtime?.accountId ?? clientAttachment?.accountId,
      gatewayRuntimeAttachmentId: runtime?.gatewayRuntimeAttachmentId,
      clientAttachmentId: clientAttachment?.clientAttachmentId,
      requestId,
      runtimeInstallationId: runtime?.runtimeInstallationId ?? clientAttachment?.runtimeInstallationId ?? null,
      trustedRuntimeClientId: clientAttachment?.trustedRuntimeClientId,
    })
    return remoteRuntimeGatewayFailure("AUTHORIZATION_FAILED", requestId, "Runtime operation is not authorized.")
  }
}

export type RemoteRuntimeSocketEndpoint<TMessage = RemoteRuntimeJsonValue> = {
  send(message: TMessage): Promise<void> | void
}

export type RemoteRuntimeSocketBridgeOptions<TRouter = RemoteRuntimeGatewayRouter> = {
  readonly maxQueuedRuntimeOperationsPerRuntime?: number
  readonly queueRuntimeOperationsWhenDisconnected?: boolean
  readonly router: TRouter
}

export type SocketBridgeDeliveryResult =
  | { readonly ok: true }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export type SocketBridgePollResult =
  | { readonly frames: readonly (RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope)[]; readonly ok: true }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export function createRemoteRuntimeSocketBridge(options: RemoteRuntimeSocketBridgeOptions<RemoteRuntimeGatewayRouter>) {
  const runtimeEndpoints = new Map<
    string,
    RemoteRuntimeSocketEndpoint<RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope>
  >()
  const clientEndpoints = new Map<
    string,
    RemoteRuntimeSocketEndpoint<RuntimeWebSocketServerEnvelope | RemoteRuntimeTransportFailureEnvelope>
  >()
  const queuedRuntimeOperations = new Map<
    string,
    Array<RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope>
  >()
  const attachedRuntimeIds = new Set<string>()
  const attachedRuntimeInstallationIds = new Map<string, string>()
  const maxQueuedRuntimeOperationsPerRuntime =
    options.maxQueuedRuntimeOperationsPerRuntime ??
    remoteRuntimeTransportOperationalPolicy.limits.maxQueuedRuntimeOperationsPerRuntime

  return {
    attachRuntime(
      request: GatewayRuntimeAttachmentRegistrationRequest,
      endpoint?: RemoteRuntimeSocketEndpoint<RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope>,
    ): GatewayAttachmentResult<GatewayRuntimeAttachment> {
      const result = options.router.attachRuntime(request)
      if (result.ok) {
        attachedRuntimeIds.add(result.attachment.gatewayRuntimeAttachmentId)
        attachedRuntimeInstallationIds.set(
          result.attachment.gatewayRuntimeAttachmentId,
          result.attachment.runtimeInstallationId,
        )
        if (endpoint) runtimeEndpoints.set(result.attachment.gatewayRuntimeAttachmentId, endpoint)
      }
      return result
    },

    attachRemoteRuntimeClient(
      request: RemoteRuntimeClientAttachmentRequest,
      endpoint: RemoteRuntimeSocketEndpoint<RuntimeWebSocketServerEnvelope | RemoteRuntimeTransportFailureEnvelope>,
    ): GatewayAttachmentResult<RemoteRuntimeClientAttachment> {
      const result = options.router.attachRemoteRuntimeClient(request)
      if (result.ok) clientEndpoints.set(result.attachment.clientAttachmentId, endpoint)
      return result
    },
    async routeRuntimeOperation(input: RuntimeOperationFrameInput): Promise<GatewayRouteResult> {
      const routed = options.router.routeRuntimeOperation(input)
      if (!routed.ok) return routed

      const endpoint = runtimeEndpoints.get(routed.destination.gatewayRuntimeAttachmentId)
      if (!endpoint) {
        const queued = queueRuntimeOperationIfAllowed(routed.destination.gatewayRuntimeAttachmentId, routed.frame)
        return queued.ok ? routed : queued
      }
      try {
        await endpoint.send(routed.frame)
      } catch {
        runtimeEndpoints.delete(routed.destination.gatewayRuntimeAttachmentId)
        const queued = queueRuntimeOperationIfAllowed(routed.destination.gatewayRuntimeAttachmentId, routed.frame)
        return queued.ok ? routed : queued
      }
      return routed
    },

    pollRuntimeOperations(
      gatewayRuntimeAttachmentId: string,
      limit = 10,
      runtimeInstallationId?: string,
    ): SocketBridgePollResult {
      if (!attachedRuntimeIds.has(gatewayRuntimeAttachmentId)) {
        return { error: createRuntimeUnavailableEnvelope(gatewayRuntimeAttachmentId), ok: false }
      }
      if (
        runtimeInstallationId !== undefined &&
        runtimeInstallationId !== attachedRuntimeInstallationIds.get(gatewayRuntimeAttachmentId)
      ) {
        return {
          error: createAuthorizationFailureEnvelope(
            gatewayRuntimeAttachmentId,
            "Runtime installation does not match attachment.",
          ),
          ok: false,
        }
      }
      const queue = queuedRuntimeOperations.get(gatewayRuntimeAttachmentId) ?? []
      const count = Math.max(0, Math.min(limit, queue.length))
      const frames = queue.splice(0, count)
      if (queue.length === 0) queuedRuntimeOperations.delete(gatewayRuntimeAttachmentId)
      return { frames, ok: true }
    },

    async deliverRuntimeEnvelope(
      clientAttachmentId: string,
      envelope: RemoteRuntimeJsonValue,
    ): Promise<SocketBridgeDeliveryResult> {
      if (!isRuntimeWebSocketServerEnvelope(envelope)) {
        return remoteRuntimeGatewayFailure(
          "VALIDATION_FAILED",
          clientAttachmentId,
          "Runtime response envelope is malformed.",
        )
      }
      const endpoint = clientEndpoints.get(clientAttachmentId)
      if (!endpoint) {
        return {
          error: createRuntimeUnavailableEnvelope(clientAttachmentId, "Remote runtime attachment is unavailable."),
          ok: false,
        }
      }
      try {
        await endpoint.send(envelope)
      } catch {
        clientEndpoints.delete(clientAttachmentId)
        return {
          error: createRuntimeUnavailableEnvelope(clientAttachmentId, "Remote runtime attachment is unavailable."),
          ok: false,
        }
      }
      return { ok: true }
    },

    async deliverRuntimeResponseFrame(input: RemoteRuntimeJsonValue): Promise<SocketBridgeDeliveryResult> {
      const frame = validateRuntimeResponseFrame(input)
      if (!frame.ok) return frame
      return this.deliverRuntimeEnvelope(
        frame.value.clientAttachmentId,
        frame.value.envelope as unknown as RemoteRuntimeJsonValue,
      )
    },

    async revokeTrustedRuntimeClient(trustedRuntimeClientId: string): Promise<RemoteRuntimeTransportFailureEnvelope[]> {
      const envelopes = options.router.revokeTrustedRuntimeClient(trustedRuntimeClientId)
      for (const envelope of envelopes) {
        const endpoint = clientEndpoints.get(envelope.requestId)
        if (endpoint) {
          await endpoint.send(envelope)
          clientEndpoints.delete(envelope.requestId)
        }
      }
      return envelopes
    },

    async revokeRemoteRuntimeClientAttachment(
      clientAttachmentId: string,
      revokeOptions?: { readonly notifyEndpoint?: boolean; readonly notifyRuntimeEndpoint?: boolean },
    ): Promise<RemoteRuntimeTransportFailureEnvelope[]> {
      const attachment = options.router
        .runtimeSemanticState()
        .clientAttachments.find((candidate) => candidate.clientAttachmentId === clientAttachmentId)
      const envelopes = options.router.revokeRemoteRuntimeClientAttachment(clientAttachmentId)
      for (const envelope of envelopes) {
        const endpoint = clientEndpoints.get(envelope.requestId)
        if (endpoint && revokeOptions?.notifyEndpoint !== false) await endpoint.send(envelope)
        clientEndpoints.delete(envelope.requestId)
      }
      if (attachment && revokeOptions?.notifyRuntimeEndpoint !== false) {
        const runtimeEndpoint = runtimeEndpoints.get(attachment.gatewayRuntimeAttachmentId)
        for (const envelope of envelopes) {
          if (runtimeEndpoint) {
            await runtimeEndpoint.send(envelope)
            continue
          }
          if (options.queueRuntimeOperationsWhenDisconnected) {
            const queue = queuedRuntimeOperations.get(attachment.gatewayRuntimeAttachmentId) ?? []
            if (queue.length < maxQueuedRuntimeOperationsPerRuntime) {
              queue.push(envelope)
              queuedRuntimeOperations.set(attachment.gatewayRuntimeAttachmentId, queue)
            }
          }
        }
      }
      return envelopes
    },
    async revokeRuntimeAttachment(
      gatewayRuntimeAttachmentId: string,
      revokeOptions?: { readonly notifyRuntimeEndpoint?: boolean },
    ): Promise<RemoteRuntimeTransportFailureEnvelope[]> {
      const envelopes = options.router.revokeRuntimeAttachment(gatewayRuntimeAttachmentId)
      await notifyRevokedEndpoints(gatewayRuntimeAttachmentId, envelopes, revokeOptions)
      return envelopes
    },

    async revokeRuntimeInstallation(runtimeInstallationId: string): Promise<RemoteRuntimeTransportFailureEnvelope[]> {
      const gatewayRuntimeAttachmentIds = [...attachedRuntimeInstallationIds]
        .filter(([, attachedRuntimeInstallationId]) => attachedRuntimeInstallationId === runtimeInstallationId)
        .map(([gatewayRuntimeAttachmentId]) => gatewayRuntimeAttachmentId)
      const envelopes = options.router.revokeRuntimeInstallation(runtimeInstallationId)
      for (const gatewayRuntimeAttachmentId of gatewayRuntimeAttachmentIds) {
        await notifyRevokedEndpoints(gatewayRuntimeAttachmentId, envelopes)
      }
      return envelopes
    },

    runtimeSemanticState(): RemoteRuntimeGatewaySemanticState {
      return options.router.runtimeSemanticState()
    },
  }

  function queueRuntimeOperationIfAllowed(
    gatewayRuntimeAttachmentId: string,
    frame: RuntimeOperationFrame,
  ): GatewayRouteResult | { readonly ok: true } {
    if (!options.queueRuntimeOperationsWhenDisconnected) {
      return { error: createRuntimeUnavailableEnvelope(frame.requestId), ok: false }
    }
    const queue = queuedRuntimeOperations.get(gatewayRuntimeAttachmentId) ?? []
    if (queue.length >= maxQueuedRuntimeOperationsPerRuntime) {
      return { error: createRuntimeUnavailableEnvelope(frame.requestId, "Runtime operation queue is full."), ok: false }
    }
    queue.push(frame)
    queuedRuntimeOperations.set(gatewayRuntimeAttachmentId, queue)
    return { ok: true }
  }

  async function notifyRevokedEndpoints(
    gatewayRuntimeAttachmentId: string,
    envelopes: readonly RemoteRuntimeTransportFailureEnvelope[],
    revokeOptions?: { readonly notifyRuntimeEndpoint?: boolean },
  ) {
    for (const envelope of envelopes) {
      if (envelope.requestId === gatewayRuntimeAttachmentId) {
        const endpoint = runtimeEndpoints.get(gatewayRuntimeAttachmentId)
        if (endpoint && revokeOptions?.notifyRuntimeEndpoint !== false) await endpoint.send(envelope)
        runtimeEndpoints.delete(gatewayRuntimeAttachmentId)
        attachedRuntimeIds.delete(gatewayRuntimeAttachmentId)
        attachedRuntimeInstallationIds.delete(gatewayRuntimeAttachmentId)
        queuedRuntimeOperations.delete(gatewayRuntimeAttachmentId)
        continue
      }

      const endpoint = clientEndpoints.get(envelope.requestId)
      if (endpoint) {
        await endpoint.send(envelope)
        clientEndpoints.delete(envelope.requestId)
      }
    }
  }
}

export type LocalRuntimeConnectorOptions = {
  readonly attachmentCapabilities: readonly RemoteRuntimeAttachmentCapability[]
  audit?(event: LocalRuntimeConnectorAuditEvent): Promise<void> | void
  readonly connectorVersion: string
  readonly deviceTrustLevel?: RemoteRuntimeClientTrustLevel
  readonly featureCapabilities?: readonly RemoteRuntimeCapability[]
  readonly gatewayRuntimeAttachmentId: string
  readonly clientAttachmentId?: string
  now(): string
  readonly runtimeApiVersion: string
  decryptRuntimeCommand?(
    payload: RemoteRuntimeEncryptedPayload,
    frame: RuntimeOperationFrame,
  ): Promise<RemoteRuntimeProtocolClientCommand> | RemoteRuntimeProtocolClientCommand
  sendRuntimeCommand(
    command: RemoteRuntimeProtocolClientCommand,
  ): Promise<RuntimeWebSocketServerEnvelope> | RuntimeWebSocketServerEnvelope
}

export type LocalRuntimeConnectorResult =
  | { readonly envelope: RuntimeWebSocketServerEnvelope; readonly ok: true }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export function createLocalRuntimeConnector(options: LocalRuntimeConnectorOptions) {
  let connected = true
  let revoked = false
  let sequence = 0
  const executedIdempotencyKeys = new Set<string>()

  return {
    async handleRuntimeOperation(
      input: RuntimeOperationFrameInput,
      maxPayloadBytes?: number,
    ): Promise<LocalRuntimeConnectorResult> {
      if (revoked) return { error: createAttachmentRevokedEnvelope("revoked"), ok: false }
      if (!connected) return { error: createRuntimeUnavailableEnvelope("disconnected"), ok: false }

      const frame = validateRuntimeOperationFrame(input, maxPayloadBytes)
      if (!frame.ok) return frame
      if (
        frame.value.gatewayRuntimeAttachmentId !== options.gatewayRuntimeAttachmentId ||
        (options.clientAttachmentId !== undefined && frame.value.clientAttachmentId !== options.clientAttachmentId)
      ) {
        return { error: createAuthorizationFailureEnvelope(frame.value.requestId), ok: false }
      }

      const command = await commandForFrame(frame.value)
      if (!command.ok) return command

      const gatewayTrustedHttpRequest = runtimeOperationFrameReplyTarget(frame.value).kind === "gatewayHttpRequest"
      const authorization = authorizeRemoteRuntimeCommandWithPolicy(command.command, {
        attachmentCapabilities: options.attachmentCapabilities,
        deviceTrustLevel: frame.value.deviceTrustLevel ?? options.deviceTrustLevel ?? "paired",
        encrypted: command.encrypted || gatewayTrustedHttpRequest,
        idempotencyKey: frame.value.idempotencyKey ?? null,
        metadataSliceOnly: !command.encrypted && !gatewayTrustedHttpRequest,
        operationClass: frame.value.operationClass,
        runtimeAttachmentAuthorized: true,
      })
      if (!authorization.ok) {
        await auditCommand("runtime.command.denied", frame.value, command, authorization.error.message)
        return authorization
      }
      if (authorization.policy.idempotencyRequired) {
        const scope = remoteRuntimeGatewayIdempotencyScope(frame.value.clientAttachmentId, frame.value.idempotencyKey!)
        if (executedIdempotencyKeys.has(scope)) {
          await auditCommand(
            "runtime.command.denied",
            frame.value,
            command,
            "Runtime operation idempotency key has already been used.",
          )
          return {
            error: createAuthorizationFailureEnvelope(
              frame.value.requestId,
              "Runtime operation idempotency key has already been used.",
            ),
            ok: false,
          }
        }
        executedIdempotencyKeys.add(scope)
      }

      await auditCommand("runtime.command.forwarded", frame.value, command)
      const response = await options.sendRuntimeCommand(command.command)
      if (
        !isRemoteRuntimeProtocolServerEnvelopeForMethod(command.command.method, response, command.command.requestId)
      ) {
        return {
          error: remoteRuntimeGatewayFailure(
            "VALIDATION_FAILED",
            command.command.requestId,
            "Runtime response envelope is malformed.",
          ).error,
          ok: false,
        }
      }
      const responseSchema = remoteRuntimeProtocolResponseSchemaForMethod(command.command.method)
      if (!responseSchema.serverMessageTypes.includes(response.type)) {
        return {
          error: remoteRuntimeGatewayFailure(
            "VALIDATION_FAILED",
            command.command.requestId,
            "Runtime response envelope is not allowed for command method.",
          ).error,
          ok: false,
        }
      }
      return { envelope: response, ok: true }
    },

    disconnectGateway() {
      connected = false
    },

    reconnectGateway() {
      if (!revoked) connected = true
    },

    revoke() {
      revoked = true
      connected = false
      return createAttachmentRevokedEnvelope(options.gatewayRuntimeAttachmentId)
    },

    status(): RuntimeStatusFrame {
      sequence += 1
      return createRuntimeStatusFrame({
        attachmentCapabilities: [...options.attachmentCapabilities],
        connectorVersion: options.connectorVersion,
        ...((options.featureCapabilities?.length ?? 0) > 0
          ? { featureCapabilities: [...(options.featureCapabilities ?? [])] }
          : {}),
        gatewayRuntimeAttachmentId: options.gatewayRuntimeAttachmentId,
        replay: "unsupported",
        requestId: `status_${sequence}`,
        runtimeApiVersion: options.runtimeApiVersion,
        sequence,
        status: revoked ? "revoked" : connected ? "online" : "unavailable",
      })
    },
  }

  async function auditCommand(
    action: LocalRuntimeConnectorAuditEvent["action"],
    frame: RuntimeOperationFrame,
    command: { readonly command: RemoteRuntimeProtocolClientCommand; readonly encrypted: boolean },
    reason?: string,
  ) {
    await options.audit?.({
      action,
      encrypted: command.encrypted,
      gatewayRuntimeAttachmentId: frame.gatewayRuntimeAttachmentId,
      idempotencyKeyPresent: isNonEmptyRemoteRuntimeString(frame.idempotencyKey),
      method: command.command.method,
      clientAttachmentId: frame.clientAttachmentId,
      operationClass: frame.operationClass,
      outerRequestId: frame.requestId,
      ...(reason ? { reason } : {}),
      requestId: command.command.requestId,
      subcommand: command.command.method === "providerModel.command" ? command.command.payload.command.type : null,
    })
  }

  async function commandForFrame(
    frame: RuntimeOperationFrame,
  ): Promise<
    | { readonly command: RemoteRuntimeProtocolClientCommand; readonly encrypted: boolean; readonly ok: true }
    | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }
  > {
    if (frame.payload) return { command: frame.payload, encrypted: false, ok: true }
    if (!frame.encryptedPayload || !options.decryptRuntimeCommand) {
      return {
        error: createAuthorizationFailureEnvelope(frame.requestId, "Encrypted runtime operation cannot be decrypted."),
        ok: false,
      }
    }

    let decrypted: RemoteRuntimeProtocolClientCommand
    try {
      decrypted = await options.decryptRuntimeCommand(frame.encryptedPayload, frame)
    } catch {
      return {
        error: createAuthorizationFailureEnvelope(frame.requestId, "Encrypted runtime operation cannot be decrypted."),
        ok: false,
      }
    }
    const command = validateRuntimeCommand(decrypted as unknown as RemoteRuntimeJsonValue, frame.requestId)
    if (!command.ok) return command
    return { command: command.value, encrypted: true, ok: true }
  }
}

export type LocalRuntimeConnectorAuditEvent = {
  readonly action: "runtime.command.denied" | "runtime.command.forwarded"
  readonly encrypted: boolean
  readonly gatewayRuntimeAttachmentId: string
  readonly idempotencyKeyPresent: boolean
  readonly method: RemoteRuntimeProtocolClientMethod
  readonly clientAttachmentId: string
  readonly operationClass: RemoteRuntimeOperationClass
  readonly outerRequestId: string
  readonly reason?: string
  readonly requestId: string
  readonly subcommand: RuntimeWebSocketProviderModelCommandType | null
}

export type RemoteRuntimeOperationPolicy = {
  readonly auditRequired: boolean
  readonly class: RemoteRuntimeOperationClass
  readonly encryptionRequired: boolean
  readonly idempotencyRequired: boolean
  readonly localApprovalPolicyRequired: boolean
  readonly metadataSliceAllowed: boolean
  readonly method: RemoteRuntimeProtocolClientMethod
  readonly requiredAttachmentCapability: RemoteRuntimeAttachmentCapability | null
  readonly requiredDeviceTrustLevel: RemoteRuntimeClientTrustLevel
  readonly responseSensitivity: RemoteRuntimeResponseSensitivity
  readonly subcommand: RuntimeWebSocketProviderModelCommandType | null
}

export type RemoteRuntimeAuthorizationContext = {
  readonly attachmentCapabilities: readonly RemoteRuntimeAttachmentCapability[]
  readonly deviceTrustLevel: RemoteRuntimeClientTrustLevel
  readonly encrypted: boolean
  readonly idempotencyKey?: string | null
  readonly metadataSliceOnly: boolean
  readonly operationClass: RemoteRuntimeOperationClass
  readonly runtimeAttachmentAuthorized: boolean
}

export type RemoteRuntimeAuthorizationResult =
  | { readonly ok: true; readonly policy: RemoteRuntimeOperationPolicy }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

type RemoteRuntimePolicyTemplate = Omit<RemoteRuntimeOperationPolicy, "method" | "subcommand">

const remoteRuntimeMetadataPolicy = {
  auditRequired: false,
  class: "metadataRead",
  encryptionRequired: false,
  idempotencyRequired: false,
  localApprovalPolicyRequired: false,
  metadataSliceAllowed: true,
  requiredAttachmentCapability: "runtime.metadata",
  requiredDeviceTrustLevel: "paired",
  responseSensitivity: "metadata",
} satisfies RemoteRuntimePolicyTemplate

const remoteRuntimeSensitiveReadPolicy = {
  auditRequired: true,
  class: "sensitiveRead",
  encryptionRequired: true,
  idempotencyRequired: false,
  localApprovalPolicyRequired: false,
  metadataSliceAllowed: false,
  requiredAttachmentCapability: "runtime.sensitiveRead",
  requiredDeviceTrustLevel: "trusted",
  responseSensitivity: "sensitive",
} satisfies RemoteRuntimePolicyTemplate

const remoteRuntimeMutationPolicy = {
  auditRequired: true,
  class: "mutation",
  encryptionRequired: true,
  idempotencyRequired: true,
  localApprovalPolicyRequired: true,
  metadataSliceAllowed: false,
  requiredAttachmentCapability: "runtime.mutate",
  requiredDeviceTrustLevel: "trusted",
  responseSensitivity: "sensitive",
} satisfies RemoteRuntimePolicyTemplate

const remoteRuntimePrivilegedPolicy = {
  auditRequired: true,
  class: "privilegedExecution",
  encryptionRequired: true,
  idempotencyRequired: true,
  localApprovalPolicyRequired: true,
  metadataSliceAllowed: false,
  requiredAttachmentCapability: "runtime.privilegedExecution",
  requiredDeviceTrustLevel: "trusted",
  responseSensitivity: "sensitive",
} satisfies RemoteRuntimePolicyTemplate

const remoteRuntimeCredentialPolicy = {
  auditRequired: true,
  class: "credential",
  encryptionRequired: true,
  idempotencyRequired: true,
  localApprovalPolicyRequired: true,
  metadataSliceAllowed: false,
  requiredAttachmentCapability: "runtime.credential",
  requiredDeviceTrustLevel: "trusted",
  responseSensitivity: "credential",
} satisfies RemoteRuntimePolicyTemplate

const remoteRuntimeShutdownPolicy = {
  auditRequired: true,
  class: "shutdown",
  encryptionRequired: true,
  idempotencyRequired: true,
  localApprovalPolicyRequired: true,
  metadataSliceAllowed: false,
  requiredAttachmentCapability: "runtime.shutdown",
  requiredDeviceTrustLevel: "trusted",
  responseSensitivity: "none",
} satisfies RemoteRuntimePolicyTemplate

const remoteRuntimeMethodPolicy = {
  initialize: remoteRuntimeMetadataPolicy,
  ping: remoteRuntimeMetadataPolicy,
  "directory.list": remoteRuntimeMetadataPolicy,
  "directory.select": remoteRuntimeMetadataPolicy,
  "agent.list": remoteRuntimeSensitiveReadPolicy,
  "chat.start": remoteRuntimeMutationPolicy,
  "session.list": remoteRuntimeSensitiveReadPolicy,
  "activeChats.list": remoteRuntimeSensitiveReadPolicy,
  "provider.list": remoteRuntimeSensitiveReadPolicy,
  "provider.models": remoteRuntimeSensitiveReadPolicy,
  "providerModel.command": remoteRuntimeSensitiveReadPolicy,
  "config/bootstrapCodexHome": remoteRuntimeCredentialPolicy,
  "account.read": remoteRuntimeCredentialPolicy,
  "account.login.start": remoteRuntimeCredentialPolicy,
  "account.login.cancel": remoteRuntimeCredentialPolicy,
  "account.rateLimits.read": remoteRuntimeSensitiveReadPolicy,
  "approval.resolve": remoteRuntimePrivilegedPolicy,
  "providerChild.serverRequest.respond": remoteRuntimePrivilegedPolicy,
  "skills.list": remoteRuntimeSensitiveReadPolicy,
  "plugin.list": remoteRuntimeSensitiveReadPolicy,
  "mcpServerStatus/list": remoteRuntimeSensitiveReadPolicy,
  "session.create": remoteRuntimeMutationPolicy,
  "session.read": remoteRuntimeSensitiveReadPolicy,
  "session.messages": remoteRuntimeSensitiveReadPolicy,
  "git.status": remoteRuntimeSensitiveReadPolicy,
  "session.update": remoteRuntimeMutationPolicy,
  "session.message": remoteRuntimeMutationPolicy,
  "goal.get": remoteRuntimeSensitiveReadPolicy,
  "goal.list": remoteRuntimeSensitiveReadPolicy,
  "goal.create": remoteRuntimeMutationPolicy,
  "goal.edit": remoteRuntimeMutationPolicy,
  "goal.update": remoteRuntimeMutationPolicy,
  "goal.clear": remoteRuntimeMutationPolicy,
  "goal.pause": remoteRuntimeMutationPolicy,
  "goal.resume": remoteRuntimeMutationPolicy,
  "alias.list": remoteRuntimeSensitiveReadPolicy,
  "alias.get": remoteRuntimeSensitiveReadPolicy,
  "alias.set": remoteRuntimeMutationPolicy,
  "alias.delete": remoteRuntimeMutationPolicy,
  "session.close": remoteRuntimeMutationPolicy,
  "nativeShell.prepare": remoteRuntimePrivilegedPolicy,
  "thread.start": remoteRuntimeMutationPolicy,
  "thread.read": remoteRuntimeSensitiveReadPolicy,
  "thread.resume": remoteRuntimeMutationPolicy,
  "thread.fork": remoteRuntimeMutationPolicy,
  "thread.rollback": remoteRuntimeMutationPolicy,
  "thread.shellCommand": remoteRuntimePrivilegedPolicy,
  "thread.backgroundTerminals.clean": remoteRuntimeMutationPolicy,
  "thread.list": remoteRuntimeSensitiveReadPolicy,
  "turn.start": remoteRuntimePrivilegedPolicy,
  "turn.interrupt": remoteRuntimeMutationPolicy,
  "turn.steer": remoteRuntimePrivilegedPolicy,
  shutdown: remoteRuntimeShutdownPolicy,
  subscribe: remoteRuntimeSensitiveReadPolicy,
  unsubscribe: remoteRuntimeMutationPolicy,
  resume: remoteRuntimeSensitiveReadPolicy,
} satisfies Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimePolicyTemplate>

const remoteRuntimeProviderModelSubcommandPolicy = {
  "model.current": remoteRuntimeSensitiveReadPolicy,
  "model.list": remoteRuntimeSensitiveReadPolicy,
  "model.set": remoteRuntimeMutationPolicy,
  "provider.current": remoteRuntimeSensitiveReadPolicy,
  "provider.list": remoteRuntimeSensitiveReadPolicy,
  "provider.set": remoteRuntimeMutationPolicy,
} satisfies Record<RuntimeWebSocketProviderModelCommandType, RemoteRuntimePolicyTemplate>

export type RemoteRuntimeSessionActivityEvent = {
  readonly properties: { readonly [key: string]: RemoteRuntimeJsonValue }
  readonly type: string
}

export type RemoteRuntimeSessionActivityMirrorInput = {
  readonly directory: string
  readonly event: RemoteRuntimeSessionActivityEvent
  readonly projectId?: string | null
  readonly sourceRunId?: string | null
  readonly workspaceId?: string | null
}

export type RemoteRuntimeSessionActivityMirrorDeps = RemoteRuntimeHostClientDeps & {
  now?(): number
  readHostState(): Promise<RemoteRuntimeHostState>
}

export type RemoteRuntimeSessionActivityMirror = {
  publishGlobalEvent(input: RemoteRuntimeSessionActivityMirrorInput): Promise<void>
}

export type RemoteRuntimeDirectoryAllowlistEntry = {
  readonly addedAt: string
  readonly directoryId: string
  readonly displayName?: string
  readonly enabled: boolean
  readonly path: string
  readonly updatedAt: string
}

export type RemoteRuntimeDirectoryAllowlistState = {
  readonly directories: readonly RemoteRuntimeDirectoryAllowlistEntry[]
  readonly version: 1
}

export function parseRemoteRuntimeDirectoryAllowlistEntry(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeDirectoryAllowlistEntry {
  if (
    !isRemoteRuntimeJsonObject(input) ||
    typeof input.addedAt !== "string" ||
    typeof input.directoryId !== "string" ||
    typeof input.enabled !== "boolean" ||
    typeof input.path !== "string" ||
    typeof input.updatedAt !== "string"
  ) {
    throw new Error("invalid schema")
  }
  return {
    addedAt: input.addedAt,
    directoryId: input.directoryId,
    ...(typeof input.displayName === "string" ? { displayName: input.displayName } : {}),
    enabled: input.enabled,
    path: input.path,
    updatedAt: input.updatedAt,
  }
}

export function parseRemoteRuntimeDirectoryAllowlistState(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeDirectoryAllowlistState {
  if (!isRemoteRuntimeJsonObject(input) || input.version !== 1 || !Array.isArray(input.directories))
    throw new Error("invalid schema")
  return { directories: input.directories.map(parseRemoteRuntimeDirectoryAllowlistEntry), version: 1 }
}

export type RemoteRuntimeDirectoryAllowlistStore = {
  add(input: {
    readonly directory: string
    readonly displayName?: string
    readonly enabled?: boolean
    readonly now?: string
  }): Promise<RemoteRuntimeDirectoryAllowlistEntry>
  read(): Promise<RemoteRuntimeDirectoryAllowlistState>
}

export type RemoteRuntimeDirectoryAllowlistMutableStateStore = {
  read(): Promise<RemoteRuntimeDirectoryAllowlistState>
  update(
    updater: (
      current: RemoteRuntimeDirectoryAllowlistState,
    ) => RemoteRuntimeDirectoryAllowlistState | Promise<RemoteRuntimeDirectoryAllowlistState>,
  ): Promise<RemoteRuntimeDirectoryAllowlistState>
}

export type RemoteRuntimeDirectoryAllowlistPathDeps = {
  cwd(): string
  isAbsolute(filePath: string): boolean
  now(): string
  randomUUID(): string
  resolve(path: string): string
}

export type RemoteRuntimeDirectoryAllowlistManagementStore = RemoteRuntimeDirectoryAllowlistStore & {
  remove(selector: string): Promise<void>
  select(input: {
    readonly directory?: string
  }): Promise<{ readonly directory?: string; readonly directoryId?: string }>
  setEnabled(selector: string, enabled: boolean): Promise<RemoteRuntimeDirectoryAllowlistEntry>
}

export type RemoteRuntimeDirectoryAllowlistStoreInput = RemoteRuntimeDirectoryAllowlistPathDeps & {
  readonly stateStore: RemoteRuntimeDirectoryAllowlistMutableStateStore
}

export type RemoteRuntimeDirectoryAllowlistMutationResult = {
  readonly entry?: RemoteRuntimeDirectoryAllowlistEntry
  readonly selector: string
}

export function createRemoteRuntimeDirectoryAllowlistStore(
  input: RemoteRuntimeDirectoryAllowlistStoreInput,
): RemoteRuntimeDirectoryAllowlistManagementStore {
  return {
    async add(entryInput) {
      const directory = canonicalRemoteRuntimeDirectory(input, entryInput.directory)
      const now = entryInput.now ?? input.now()
      const updated = await input.stateStore.update((state) => {
        const existing = state.directories.find((entry) => entry.path === directory)
        if (existing) {
          return {
            directories: state.directories.map((entry) =>
              entry.path === directory
                ? {
                    ...entry,
                    displayName: entryInput.displayName ?? entry.displayName,
                    enabled: entryInput.enabled ?? entry.enabled,
                    updatedAt: now,
                  }
                : entry,
            ),
            version: 1,
          }
        }
        return {
          directories: [
            ...state.directories,
            {
              addedAt: now,
              directoryId: `dir_${input.randomUUID()}`,
              displayName: entryInput.displayName,
              enabled: entryInput.enabled ?? true,
              path: directory,
              updatedAt: now,
            },
          ],
          version: 1,
        }
      })
      return updated.directories.find((entry) => entry.path === directory)!
    },
    read() {
      return input.stateStore.read()
    },
    async remove(selector) {
      await updateRemoteRuntimeDirectoryAllowlistStateEntry(input, selector, () => null)
    },
    async select(selectionInput) {
      const selector = selectionInput.directory?.trim()
      if (!selector) return {}
      const state = await input.stateStore.read()
      const canonical = input.isAbsolute(selector) ? canonicalRemoteRuntimeDirectory(input, selector) : null
      const entry = state.directories.find(
        (candidate) => candidate.directoryId === selector || (canonical !== null && candidate.path === canonical),
      )
      if (entry) return { directory: entry.path, directoryId: entry.directoryId }
      if (canonical !== null) return { directory: canonical }
      throw new Error(`Remote runtime directory ${selector} is not allowlisted.`)
    },
    setEnabled(selector, enabled) {
      return updateRemoteRuntimeDirectoryAllowlistStateEntry(input, selector, (entry) => ({ ...entry, enabled }))
    },
  }
}

export function formatRemoteRuntimeDirectoryAllowlistEntry(entry: RemoteRuntimeDirectoryAllowlistEntry): string {
  return `${entry.enabled ? "enabled " : "disabled"} ${entry.directoryId} ${entry.path}`
}

export function requireRemoteRuntimeDirectoryAllowlistSelector(selector?: string | null): string {
  const trimmed = selector?.trim()
  if (!trimmed) {
    throw new Error("Remote runtime directory selector is required.")
  }
  return trimmed
}

export async function listRemoteRuntimeDirectoryAllowlistEntries(
  store: Pick<RemoteRuntimeDirectoryAllowlistStore, "read">,
): Promise<RemoteRuntimeDirectoryAllowlistEntry[]> {
  return [...(await store.read()).directories]
}

export async function addRemoteRuntimeDirectoryAllowlistEntryToStore(
  store: Pick<RemoteRuntimeDirectoryAllowlistStore, "add">,
  input: {
    readonly directory: string
    readonly displayName?: string
    readonly enabled?: boolean
  },
): Promise<RemoteRuntimeDirectoryAllowlistEntry> {
  return await store.add(input)
}

export async function removeRemoteRuntimeDirectoryAllowlistEntryFromStore(
  store: Pick<RemoteRuntimeDirectoryAllowlistManagementStore, "remove">,
  selector?: string | null,
): Promise<RemoteRuntimeDirectoryAllowlistMutationResult> {
  const requiredSelector = requireRemoteRuntimeDirectoryAllowlistSelector(selector)
  await store.remove(requiredSelector)
  return { selector: requiredSelector }
}

export async function setRemoteRuntimeDirectoryAllowlistEntryEnabledInStore(
  store: Pick<RemoteRuntimeDirectoryAllowlistManagementStore, "setEnabled">,
  selector: string | null | undefined,
  enabled: boolean,
): Promise<RemoteRuntimeDirectoryAllowlistMutationResult> {
  const requiredSelector = requireRemoteRuntimeDirectoryAllowlistSelector(selector)
  const entry = await store.setEnabled(requiredSelector, enabled)
  return { entry, selector: requiredSelector }
}

function canonicalRemoteRuntimeDirectory(
  deps: Pick<RemoteRuntimeDirectoryAllowlistPathDeps, "cwd" | "resolve">,
  input: string,
): string {
  return deps.resolve(input || deps.cwd())
}

async function updateRemoteRuntimeDirectoryAllowlistStateEntry(
  input: RemoteRuntimeDirectoryAllowlistStoreInput,
  selector: string,
  update: (entry: RemoteRuntimeDirectoryAllowlistEntry) => RemoteRuntimeDirectoryAllowlistEntry | null,
): Promise<RemoteRuntimeDirectoryAllowlistEntry> {
  let updatedEntry: RemoteRuntimeDirectoryAllowlistEntry | null = null
  await input.stateStore.update((state) => {
    const canonical = input.isAbsolute(selector) ? canonicalRemoteRuntimeDirectory(input, selector) : null
    const index = state.directories.findIndex(
      (entry) => entry.directoryId === selector || (canonical !== null && entry.path === canonical),
    )
    if (index === -1) throw new Error(`Remote runtime directory ${selector} is not allowlisted.`)
    const next = update(state.directories[index]!)
    if (next === null) {
      updatedEntry = state.directories[index]!
      return { directories: state.directories.filter((_entry, entryIndex) => entryIndex !== index), version: 1 }
    }
    updatedEntry = { ...next, updatedAt: input.now() }
    return {
      directories: state.directories.map((entry, entryIndex) => (entryIndex === index ? updatedEntry! : entry)),
      version: 1,
    }
  })
  return updatedEntry!
}

export type RemoteRuntimeDirectoryPickerInput = {
  readonly basePath: string
  readonly message?: string
  readonly pageSize?: number
}

export type RemoteRuntimeDirectoryPicker = (
  input: RemoteRuntimeDirectoryPickerInput,
) => Promise<readonly string[] | null>

export type RemoteRuntimeDirectorySelectorItem = {
  readonly name: string
  readonly path: string
}

export type RemoteRuntimeDirectorySelectorConfig = {
  readonly allowCancel: true
  readonly basePath: string
  readonly hideGitChildren: true
  readonly initialSelectedPaths: readonly string[]
  readonly message: string
  readonly multiple: true
  readonly pageSize: number
  readonly search: true
}

export type RemoteRuntimeDirectoryPromptPickerDeps = {
  directorySelector(
    config: RemoteRuntimeDirectorySelectorConfig,
  ): Promise<readonly RemoteRuntimeDirectorySelectorItem[] | null>
}

export type RemoteRuntimeDirectorySearchDirent = {
  readonly name: string
  isDirectory(): boolean
}

export type RemoteRuntimeDirectorySearchDeps = {
  join(...segments: string[]): string
  readdir(
    path: string,
    options: { readonly withFileTypes: true },
  ): Promise<readonly RemoteRuntimeDirectorySearchDirent[]>
  resolve(path: string): string
}

export type RemoteRuntimeDirectorySearchResult = {
  readonly path: string
}

export type RemoteRuntimeDirectoryExplorerDirent = {
  readonly name: string
  isDirectory(): boolean
}

export type RemoteRuntimeDirectoryExplorerTreeDeps = {
  basename(path: string): string
  join(...segments: string[]): string
  readdir(
    path: string,
    options: { readonly withFileTypes: true },
  ): Promise<readonly RemoteRuntimeDirectoryExplorerDirent[]>
  resolve(path: string): string
}

export type RemoteRuntimeDirectoryExplorerTreeItem = {
  readonly depth: number
  readonly hint?: string
  readonly isCurrentDirectory: boolean
  readonly isRepositoryRoot: boolean
  readonly label: string
  readonly path: string
}

export type RemoteRuntimeSetupDirectorySelectionDeps = {
  confirmDirectories?(input: { readonly directories: readonly string[] }): Promise<boolean>
  cwd(): string
  isInteractive(): boolean
  pickDirectories: RemoteRuntimeDirectoryPicker
  readonly store: RemoteRuntimeDirectoryAllowlistStore
}

export type RemoteRuntimeCommandIdempotencyScope = {
  readonly runtimeInstallationId: string
  readonly idempotencyKey: string
}

export type RemoteRuntimeCommandIdempotencyRecord<TResponse> = {
  readonly fingerprint: string
  readonly result: Promise<TResponse>
}

export type RemoteRuntimeCommandIdempotencyStore<TResponse> = {
  delete(scope: RemoteRuntimeCommandIdempotencyScope): void
  get(scope: RemoteRuntimeCommandIdempotencyScope): RemoteRuntimeCommandIdempotencyRecord<TResponse> | undefined
  set(scope: RemoteRuntimeCommandIdempotencyScope, record: RemoteRuntimeCommandIdempotencyRecord<TResponse>): void
}

export type RunRemoteRuntimeCommandWithIdempotencyInput<TResponse> = {
  readonly execute: () => Promise<TResponse> | TResponse
  readonly fingerprint: string
  readonly idempotencyKey: string
  readonly requestId: string | null
  readonly runtimeInstallationId: string
  readonly store: RemoteRuntimeCommandIdempotencyStore<TResponse>
}

export type RemoteRuntimeCommandIdempotencyResult<TResponse> =
  | { readonly ok: true; readonly response: TResponse }
  | { readonly ok: false; readonly reason: "idempotencyConflict"; readonly requestId: string }

export type RemoteRuntimeAttachment = {
  readonly runtimeGatewayAttachmentId: string
  readonly health: RuntimeAttachmentHealth
  readonly consecutiveTimeouts: number
}

export type RemoteRuntimeRequestStatus = "pending" | "responded" | "timedOut" | "failed"

export type RemoteRuntimeRequest = {
  readonly requestId: string
  readonly replyTarget: RuntimeOperationReplyTarget
  readonly status: RemoteRuntimeRequestStatus
}

export type RemoteRuntimeRequestQueue = {
  readonly capacity: number
  readonly pending: readonly RemoteRuntimeRequest[]
}

export type RemoteRuntimeRequestQueueEnqueueResult =
  | { readonly accepted: true; readonly queue: RemoteRuntimeRequestQueue }
  | { readonly accepted: false; readonly reason: "queueFull"; readonly queue: RemoteRuntimeRequestQueue }

export type RemoteRuntimeRequestQueueResponseResult =
  | { readonly accepted: true; readonly request: RemoteRuntimeRequest; readonly queue: RemoteRuntimeRequestQueue }
  | {
      readonly accepted: false
      readonly reason: "requestNotPending" | "replyTargetMismatch"
      readonly queue: RemoteRuntimeRequestQueue
    }

export type RemoteRuntimeRequestQueueTimeoutResult =
  | { readonly timedOut: true; readonly request: RemoteRuntimeRequest; readonly queue: RemoteRuntimeRequestQueue }
  | { readonly timedOut: false; readonly reason: "requestNotPending"; readonly queue: RemoteRuntimeRequestQueue }

export type RemoteRuntimeEnvelopeDeliveryFailureClassification =
  | { readonly stage: "lateGatewayHttpResponseIgnored"; readonly errorName: string }
  | { readonly stage: "responseDeliveryFailed"; readonly error: Error; readonly errorName: string }

export type RemoteRuntimeSubscription = {
  readonly subscriptionId: string
  readonly owner: RuntimeOwner
  readonly consecutiveDeliveryFailures: number
  readonly state: "active" | "detached"
}

export type RemoteRuntimeClientAttachmentTracker = {
  readonly remoteRuntimeClientAttachmentIds: readonly string[]
}

export type RemoteRuntimeClientAttachmentObservationResult = {
  readonly observed: boolean
  readonly tracker: RemoteRuntimeClientAttachmentTracker
}

export type RemoteRuntimeClientAttachmentDetachResult = {
  readonly detached: boolean
  readonly tracker: RemoteRuntimeClientAttachmentTracker
}

export type RemoteRuntimeHeartbeatRunner = {
  stop(): Promise<void>
}

export type RemoteRuntimeHeartbeatRunnerOptions = {
  readonly intervalMs: number
  readonly onHeartbeat: (signal: AbortSignal) => Promise<void> | void
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>
}

export type RemoteRuntimeSocketMessage<TMessage> =
  | { readonly done: true }
  | { readonly done: false; readonly value: TMessage }

export type RemoteRuntimeSocketMessageResult<TMessage> =
  | { readonly ok: true; readonly value: TMessage }
  | { readonly ok: false; readonly error: Error }

export type RemoteRuntimeSocketMessageData = ArrayBuffer | ArrayBufferView | string

export type RemoteRuntimeSocketMessageEvent<TData> = {
  readonly data?: TData
}

export type RemoteRuntimeSocket<TData> = {
  addEventListener(type: "open", listener: () => void): void
  addEventListener(type: "close" | "error", listener: () => void): void
  addEventListener(type: "message", listener: (event?: RemoteRuntimeSocketMessageEvent<TData>) => void): void
}

export type RemoteRuntimeSocketMessageQueue<TMessage> = {
  readonly opened: Promise<void>
  next(): Promise<RemoteRuntimeSocketMessage<TMessage>>
}

export type RemoteRuntimeSetupTimeoutInput<T> = {
  readonly message: string
  readonly promise: Promise<T>
  readonly timeoutMs: number
}

export type RemoteRuntimeGatewayRuntimeAttachmentSocketUrlInput = {
  readonly apiBaseUrl: string
  readonly runtimeInstallationId: string
}

export type RemoteRuntimeEnvelopeRequestIdInput<TPayload> = {
  readonly envelope: RuntimeWebSocketServerEnvelope<TPayload>
  readonly fallbackRequestId: () => string
}

export type RemoteRuntimePollingIterableInput<TFrame> = {
  readonly limit?: number
  readonly maxEmptyPolls?: number
  readonly onPollSuccess?: () => Promise<void> | void
  readonly poll: (input: { readonly limit: number; readonly signal?: AbortSignal }) => Promise<readonly TFrame[]>
  readonly pollIntervalMs?: number
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
}

export type RemoteRuntimeSleepInput = {
  readonly milliseconds: number
  readonly signal?: AbortSignal
}

export type RemoteReusableRuntimeStatus = {
  readonly accountId: string
  readonly apiBaseUrl: string
  readonly gatewayRuntimeAttachmentId?: string
  readonly runtimeInstallationId: string
  readonly state: string
}

export type RemoteReusableRuntimeSelectionInput<TStatus extends RemoteReusableRuntimeStatus> = {
  readonly accountId: string
  readonly apiBaseUrl: string
  readonly statuses: readonly TStatus[]
}

export type RemoteRuntimeHeartbeatMessage = {
  readonly type: "heartbeat"
}

export type RemoteRuntimeHealthPolicy = {
  readonly degradedTimeouts: number
  readonly unavailableTimeouts: number
}

export const defaultRemoteRuntimeHealthPolicy = {
  degradedTimeouts: 2,
  unavailableTimeouts: 4,
} as const satisfies RemoteRuntimeHealthPolicy

export function createRemoteRuntimeRouteRegistry(initial: readonly RemoteRuntimeRouteRegistration[] = []) {
  const routes = new Map<string, RemoteRuntimeRouteRegistration>()
  for (const route of initial) register(route)
  function register(route: RemoteRuntimeRouteRegistration): void {
    if (routes.has(route.id)) throw new Error(`Remote runtime route already registered: ${route.id}`)
    routes.set(route.id, route)
  }
  return {
    register,
    get(id: string): RemoteRuntimeRouteRegistration | undefined {
      return routes.get(id)
    },
    list(): readonly RemoteRuntimeRouteRegistration[] {
      return [...routes.values()]
    },
  }
}

export async function dispatchRemoteRuntimeRoute(
  registry: RemoteRuntimeRouteRegistry,
  request: RemoteRuntimeRouteRequest,
): Promise<RemoteRuntimeRouteResponse> {
  const route = registry.list().find((item) => item.method === request.method && item.path === request.path)
  if (!route) return { status: 404, headers: [], body: "Remote runtime route not found" }
  return await route.handler(request)
}

export function createRemoteRuntimeCommandRegistry(initial: readonly RemoteRuntimeCommandRegistration[] = []) {
  const commands = new Map<string, RemoteRuntimeCommandRegistration>()
  for (const command of initial) register(command)
  function register(command: RemoteRuntimeCommandRegistration): void {
    if (commands.has(command.name)) throw new Error(`Remote runtime command already registered: ${command.name}`)
    commands.set(command.name, command)
  }
  return {
    register,
    get(name: string): RemoteRuntimeCommandRegistration | undefined {
      return commands.get(name)
    },
    list(): readonly RemoteRuntimeCommandRegistration[] {
      return [...commands.values()]
    },
  }
}

export async function runRemoteRuntimeCommand(registry: RemoteRuntimeCommandRegistry, name: string): Promise<boolean> {
  const command = registry.get(name)
  if (!command) return false
  await command.handler()
  return true
}

export async function runRemoteRuntimeCommandWithIdempotency<TResponse>(
  input: RunRemoteRuntimeCommandWithIdempotencyInput<TResponse>,
): Promise<RemoteRuntimeCommandIdempotencyResult<TResponse>> {
  const scope = { runtimeInstallationId: input.runtimeInstallationId, idempotencyKey: input.idempotencyKey }
  const existing = input.store.get(scope)
  if (existing) {
    if (existing.fingerprint !== input.fingerprint) {
      return { ok: false, reason: "idempotencyConflict", requestId: input.requestId ?? "unknown" }
    }
    return { ok: true, response: await existing.result }
  }
  const result = Promise.resolve()
    .then(() => input.execute())
    .catch((error) => {
      input.store.delete(scope)
      throw error
    })
  input.store.set(scope, { fingerprint: input.fingerprint, result })
  return { ok: true, response: await result }
}

export function createInMemoryRemoteRuntimeCommandIdempotencyStore<
  TResponse,
>(): RemoteRuntimeCommandIdempotencyStore<TResponse> {
  const records = new Map<string, Map<string, RemoteRuntimeCommandIdempotencyRecord<TResponse>>>()
  return {
    delete(scope) {
      records.get(scope.runtimeInstallationId)?.delete(scope.idempotencyKey)
    },
    get(scope) {
      return records.get(scope.runtimeInstallationId)?.get(scope.idempotencyKey)
    },
    set(scope, record) {
      const runtimeRecords =
        records.get(scope.runtimeInstallationId) ?? new Map<string, RemoteRuntimeCommandIdempotencyRecord<TResponse>>()
      runtimeRecords.set(scope.idempotencyKey, record)
      records.set(scope.runtimeInstallationId, runtimeRecords)
    },
  }
}

export function createRemoteRuntimeCommandFingerprint(input: {
  readonly bodySha256: string
  readonly canonicalPath: string
  readonly method: string
}): string {
  return [input.method.toUpperCase(), input.canonicalPath, input.bodySha256].join("\n")
}

export function remoteRuntimeReadSnapshotPath(route: RemoteRuntimeReadSnapshotRoute): string {
  switch (route.kind) {
    case "activeChats":
      return "/remote-runtime/chats"
    case "chat":
      return `/remote-runtime/chats/${encodeURIComponent(route.sessionId)}`
    case "chatMessages":
      return `/remote-runtime/chats/${encodeURIComponent(route.sessionId)}/messages`
    case "gitStatus":
      return "/remote-runtime/git/status"
    case "goals":
      return "/remote-runtime/goals"
    case "aliases":
      return "/remote-runtime/aliases"
    case "providers":
      return "/remote-runtime/providers"
    case "runtimeCapabilities":
      return "/remote-runtime/runtime/capabilities"
    case "runtimeDirectories":
      return "/remote-runtime/runtime/directories"
    case "runtimeStatus":
      return "/remote-runtime/runtime/status"
  }
}

export function normalizedRemoteRuntimeHeaders<THeader extends RemoteRuntimeHeader>(
  headers: readonly THeader[],
): THeader[] {
  return headers.map((header) => ({ ...header, name: header.name.toLowerCase() }))
}

export function remoteRuntimeHeaderValue(headers: readonly RemoteRuntimeHeader[], name: string): string {
  return headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? ""
}

export function canonicalRemoteRuntimeQuery(query: readonly RemoteRuntimeQueryEntry[]): string {
  return query
    .filter((entry) => entry.name !== "auth_token")
    .map((entry) => ({ name: entry.name, value: entry.value }))
    .sort((left, right) =>
      left.name === right.name ? left.value.localeCompare(right.value) : left.name.localeCompare(right.name),
    )
    .map((entry) => `${encodeURIComponent(entry.name)}=${encodeURIComponent(entry.value)}`)
    .join("&")
}

export function createRemoteRuntimeHostEventMirror(
  deps: RemoteRuntimeHostEventMirrorDeps,
  options: RemoteRuntimeHostEventMirrorOptions = {},
): RemoteRuntimeHostEventMirror {
  const abort = new AbortController()
  const signal = options.signal ? AbortSignal.any([abort.signal, options.signal]) : abort.signal
  const closed = runRemoteRuntimeHostEventMirror(deps, signal)
  return {
    closed,
    stop() {
      abort.abort()
    },
  }
}

export async function streamRemoteRuntimeHostEvents(
  host: RemoteRuntimeHost,
  deps: Omit<RemoteRuntimeHostEventMirrorDeps, "readHostState" | "sleep">,
  signal: AbortSignal,
): Promise<void> {
  const url = new URL("/global/event", host.url)
  const response = await deps.fetch(url, {
    headers: deps.serverAuthHeaders({ password: host.password }),
    signal,
  })
  if (!response.ok || !response.body) return
  for await (const payload of parseRemoteRuntimeHostEventStream(response.body, signal)) {
    const event = parseRemoteRuntimeHostMirroredEvent(payload)
    if (event) await deps.onEvent(event)
  }
}

export async function* parseRemoteRuntimeHostEventStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    while (!signal.aborted) {
      const read = await reader.read()
      if (read.done) return
      buffer += decoder.decode(read.value, { stream: true })
      let boundary = buffer.indexOf("\n\n")
      while (boundary >= 0) {
        const chunk = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const data = parseRemoteRuntimeHostSseData(chunk)
        if (data) yield data
        boundary = buffer.indexOf("\n\n")
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export function parseRemoteRuntimeHostSseData(chunk: string): string | null {
  const data = chunk
    .split("\n")
    .map((line) => line.trimEnd())
    .flatMap((line) => (line.startsWith("data:") ? [line.slice(5).trimStart()] : []))
  return data.length ? data.join("\n") : null
}

export function parseRemoteRuntimeHostMirroredEvent(payload: string): RemoteRuntimeHostMirroredEvent | null {
  const parsed = parseRemoteRuntimeJsonValue(payload)
  if (
    !isRemoteRuntimeJsonObject(parsed) ||
    typeof parsed.directory !== "string" ||
    !isRemoteRuntimeJsonValue(parsed.payload)
  )
    return null
  return {
    directory: parsed.directory,
    payload: parsed.payload,
    project: typeof parsed.project === "string" ? parsed.project : undefined,
  }
}

export function defaultRemoteRuntimeFeatureConfig(): RemoteRuntimeFeatureConfig {
  return { enabled: true, mode: "localDirect", adapter: "local-direct", entitlements: "allowAll" }
}

export function resolveRemoteRuntimeCapabilitySelection(
  config: RemoteRuntimeFeatureConfig,
): RemoteRuntimeCapabilitySelection {
  if (!config.enabled || config.mode === "disabled") {
    return { enabled: false, mode: "disabled", entitlementProviderId: "disabled" }
  }
  const entitlementProviderId = config.entitlements ?? "allowAll"
  if (config.mode === "localDirect") {
    return { enabled: true, mode: "localDirect", adapterId: config.adapter ?? "local-direct", entitlementProviderId }
  }
  if (!config.adapter) throw new Error("Remote runtime custom mode requires an adapter id.")
  return { enabled: true, mode: "custom", adapterId: config.adapter, entitlementProviderId }
}

export function composeRemoteRuntimeHost<TAdapter extends RemoteRuntimeHostAdapter>(input: {
  readonly config: RemoteRuntimeFeatureConfig
  readonly adapters: RemoteRuntimeAdapterResolver<TAdapter>
  readonly entitlements?: RemoteRuntimeEntitlementResolver
}): RemoteRuntimeHostComposition & { readonly adapter?: TAdapter } {
  const selection = resolveRemoteRuntimeCapabilitySelection(input.config)
  const entitlements = entitlementProvider(selection.entitlementProviderId, input.entitlements)
  if (!selection.enabled) return { selection, entitlements }
  const adapter = selection.adapterId ? input.adapters.get(selection.adapterId) : undefined
  if (!adapter) throw new Error(`Remote runtime adapter is not registered: ${selection.adapterId}`)
  return { selection, adapter, entitlements }
}

export function remoteRuntimeErrorEnvelopeFromTransportFailure(
  failure: RemoteRuntimeTransportFailureEnvelope,
): RuntimeWebSocketServerEnvelope {
  return {
    error: {
      code: runtimeErrorCodeFromRemoteRuntimeTransportFailure(failure),
      details: {
        transportCode: failure.code,
        transportType: failure.type,
      },
      message: failure.message,
      recoverable: failure.terminal !== true && failure.code !== "VALIDATION_FAILED",
    },
    requestId: failure.requestId,
    success: false,
    type: "error",
  }
}

export function createRemoteRuntimeCommandErrorEnvelope(input: {
  readonly code: RuntimeErrorCode
  readonly message: string
  readonly recoverable: boolean
  readonly requestId?: string
}): RuntimeWebSocketServerEnvelope {
  return {
    error: {
      code: input.code,
      message: input.message,
      recoverable: input.recoverable,
    },
    requestId: input.requestId,
    success: false,
    type: "error",
  }
}

export function isRemoteRuntimeProtocolMismatchCandidate(
  input: RemoteRuntimeJsonValue,
): input is { readonly protocolVersion: string } {
  return (
    isRemoteRuntimeJsonObject(input) &&
    typeof input.protocolVersion === "string" &&
    input.protocolVersion.length > 0 &&
    !isRuntimeWebSocketProtocolVersionSupported(input.protocolVersion)
  )
}

export function remoteRuntimeReceivedApiVersions(payload: RuntimeWebSocketInitializePayload): string {
  return payload.supportedRuntimeApiVersions?.join(", ") || payload.supportedRuntimeApiVersion
}

export function createRemoteRuntimeMetadataCommandHandlers(
  options: RemoteRuntimeMetadataCommandHandlersOptions,
): RemoteRuntimeMetadataCommandHandlers {
  return defineRemoteRuntimeCommandHandlers(remoteRuntimeMetadataSupportedMethods, {
    initialize: (command): RuntimeWebSocketInitializeResponse => {
      const acceptedRuntimeApiVersion =
        selectRuntimeWebSocketProtocolVersion(command.payload as RuntimeWebSocketInitializePayload) ??
        runtimeWebSocketProtocolVersion
      return {
        acceptedRuntimeApiVersion,
        activeChats: [],
        activeDirectoryAttachments: [...(options.activeDirectoryAttachments ?? [])],
        allowedDirectories: [...(options.allowedDirectories ?? [])],
        attachmentCapabilities: [...options.attachmentCapabilities],
        featureCapabilities: [...options.featureCapabilities],
        protocolVersion: acceptedRuntimeApiVersion,
        serverName: options.serverName ?? "interbase-remote-runtime",
        serverVersion: options.serverVersion,
        supportedMethods: [...options.supportedMethods],
      }
    },
    ping: (command): RuntimeWebSocketPingResponse => ({
      message: `pong:${(command.payload as { message: string }).message}`,
      timestamp: options.now(),
    }),
  })
}

export function createRemoteRuntimeCommandAdapter<
  Handlers extends Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>>,
>(options: RemoteRuntimeCommandAdapterOptions<Handlers>) {
  return {
    async handleRuntimeCommand(input: unknown): Promise<RuntimeWebSocketServerEnvelope> {
      const protocolMismatchInput = input as RemoteRuntimeJsonValue
      if (isRemoteRuntimeProtocolMismatchCandidate(protocolMismatchInput)) {
        return createRuntimeWebSocketProtocolVersionMismatch({
          receivedVersion: protocolMismatchInput.protocolVersion,
        })
      }
      if (!isRemoteRuntimeProtocolClientCommand(input)) {
        return createRemoteRuntimeCommandErrorEnvelope({
          code: "PROTOCOL_ERROR",
          message: "Runtime command envelope is malformed.",
          recoverable: false,
        })
      }
      if (
        input.method === "initialize" &&
        selectRuntimeWebSocketProtocolVersion(input.payload as unknown as RuntimeWebSocketInitializePayload) === null
      ) {
        return createRuntimeWebSocketProtocolVersionMismatch({
          receivedVersion: remoteRuntimeReceivedApiVersions(
            input.payload as unknown as RuntimeWebSocketInitializePayload,
          ),
        })
      }
      if (options.supportedMethods && !options.supportedMethods.includes(input.method)) {
        return createRemoteRuntimeCommandErrorEnvelope({
          code: "CAPABILITY_UNAVAILABLE",
          message: `Runtime method ${input.method} is not enabled for this adapter.`,
          recoverable: false,
          requestId: input.requestId,
        })
      }
      const handler = options.handlers[input.method]
      if (!handler) {
        return createRemoteRuntimeCommandErrorEnvelope({
          code: "CAPABILITY_UNAVAILABLE",
          message: `Runtime method ${input.method} is not implemented by this adapter.`,
          recoverable: false,
          requestId: input.requestId,
        })
      }

      try {
        return {
          payload: await handler(input),
          requestId: input.requestId,
          success: true,
          type: "response",
        }
      } catch (error) {
        return createRemoteRuntimeCommandErrorEnvelope({
          code: "DAEMON_INTERNAL",
          message: error instanceof Error ? error.message : "Runtime command handler failed.",
          recoverable: true,
          requestId: input.requestId,
        })
      }
    },
  }
}

function runtimeErrorCodeFromRemoteRuntimeTransportFailure(
  failure: RemoteRuntimeTransportFailureEnvelope,
): RuntimeErrorCode {
  if (failure.code === "RUNTIME_UNAVAILABLE") return "RUNTIME_UNAVAILABLE"
  if (failure.pairingAction === "re_pair") return "POLICY_UNAVAILABLE"
  if (failure.code === "AUTHORIZATION_FAILED") return "POLICY_UNAVAILABLE"
  return "PROTOCOL_ERROR"
}

function remoteRuntimeMethodRequiresProviderThreadReplayTarget(method: RemoteRuntimeProtocolClientMethod): boolean {
  return method === "subscribe" || method === "unsubscribe" || method === "resume"
}

function remoteRuntimeTrustLevelSatisfies(
  actual: RemoteRuntimeClientTrustLevel,
  required: RemoteRuntimeClientTrustLevel,
): boolean {
  return remoteRuntimeClientTrustLevelValues.indexOf(actual) >= remoteRuntimeClientTrustLevelValues.indexOf(required)
}

function isNonEmptyRemoteRuntimeString(value: RemoteRuntimeJsonValue | undefined): value is string {
  return typeof value === "string" && value.length > 0
}

function isNullableRemoteRuntimeString(value: RemoteRuntimeJsonValue | undefined): value is string | null {
  return value === null || typeof value === "string"
}

function isRemoteRuntimeHostRecord(
  value: RemoteRuntimeJsonValue | object | undefined,
): value is { readonly [key: string]: RemoteRuntimeJsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isRuntimeReplayStatus(value: RemoteRuntimeJsonValue | undefined): value is RuntimeStatusFrame["replay"] {
  return value === "supported" || value === "unsupported" || value === "unavailable"
}

function isRuntimeAttachmentStatus(value: RemoteRuntimeJsonValue | undefined): value is RuntimeStatusFrame["status"] {
  return value === "online" || value === "offline" || value === "revoked" || value === "unavailable"
}

function isRemoteRuntimeHttpContractVersionValue(
  value: RemoteRuntimeJsonValue | undefined,
): value is RemoteRuntimeHttpContractVersion {
  return typeof value === "string" && isRemoteRuntimeHttpContractVersionSupported(value)
}

function hasCompatibleRemoteRuntimeHttpVersion(value: { readonly [key: string]: RemoteRuntimeJsonValue }): boolean {
  return isRemoteRuntimeHttpContractVersionValue(value.remoteRuntimeHttpVersion)
}

function isRemoteRuntimeStatusSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeStatusSnapshot,
): value is RemoteRuntimeStatusSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    Array.isArray(value.allowedDirectories) &&
    value.allowedDirectories.every(isRuntimeWebSocketAllowedDirectoryValue) &&
    isNullableRemoteRuntimeString(value.gatewayRuntimeAttachmentId) &&
    isRemoteRuntimeStatusSnapshotState(value.state) &&
    isNullableRemoteRuntimeString(value.connectorVersion) &&
    isNullableRemoteRuntimeString(value.lastHeartbeatAt) &&
    Array.isArray(value.attachmentCapabilities) &&
    value.attachmentCapabilities.every(isRemoteRuntimeAttachmentCapability)
  )
}

function isRemoteRuntimeDirectoriesSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeDirectoriesSnapshot,
): value is RemoteRuntimeDirectoriesSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    Array.isArray(value.activeDirectoryAttachments) &&
    value.activeDirectoryAttachments.every(isRuntimeWebSocketDirectoryAttachmentValue) &&
    Array.isArray(value.allowedDirectories) &&
    value.allowedDirectories.every(isRuntimeWebSocketAllowedDirectoryValue)
  )
}

function isRemoteRuntimeCapabilitiesSnapshotValue(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeCapabilitiesSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    Array.isArray(value.attachmentCapabilities) &&
    value.attachmentCapabilities.every(isRemoteRuntimeAttachmentCapability) &&
    Array.isArray(value.featureCapabilities) &&
    value.featureCapabilities.every(isRemoteRuntimeCapability) &&
    Array.isArray(value.supportedMethods) &&
    value.supportedMethods.every(isRemoteRuntimeProtocolClientMethod)
  )
}

function isRemoteRuntimeRealtimeEventEnvelopeValue(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeRealtimeEventEnvelope {
  if (
    !isRemoteRuntimeHostRecord(value) ||
    value.protocolVersion !== remoteRuntimeTransportProtocolVersion ||
    value.type !== "event"
  ) {
    return false
  }
  const event = value.event
  return (
    isRemoteRuntimeHostRecord(event) &&
    isRemoteRuntimeRealtimeEventType(event.eventType) &&
    isSafeNonNegativeRemoteRuntimeInteger(event.sequence) &&
    isNonEmptyRemoteRuntimeString(event.timestamp) &&
    isNonEmptyRemoteRuntimeString(event.runtimeInstallationId) &&
    isNullableRemoteRuntimeString(event.gatewayRuntimeAttachmentId) &&
    (event.resource === null || isRemoteRuntimeRealtimeResourceRef(event.resource)) &&
    isRemoteRuntimeHostRecord(event.payload)
  )
}

function isRuntimeConnectionCandidateValue(value: RemoteRuntimeJsonValue): value is RuntimeConnectionCandidate {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNonEmptyRemoteRuntimeString(value.baseHttpUrl) &&
    isNonEmptyRemoteRuntimeString(value.candidateId) &&
    isRuntimeTunnelEdgeAccessOrNullValue(value.edgeAccess) &&
    isOptionalRuntimeConnectionCandidateEnvironmentValue(value.environment) &&
    isNonEmptyRemoteRuntimeString(value.expiresAt) &&
    isOptionalRuntimeConnectionCandidateHostReachabilityValue(value.hostReachability) &&
    isRuntimeConnectionCandidateKind(value.kind) &&
    isNonEmptyRemoteRuntimeString(value.localRuntimeAccessToken) &&
    isNonEmptyRemoteRuntimeString(value.localRuntimeAccessTokenId) &&
    isNonEmptyRemoteRuntimeString(value.remoteRuntimeRequestSigningKeyId) &&
    (value.clientRequestSigningKeyId === undefined ||
      value.clientRequestSigningKeyId === value.remoteRuntimeRequestSigningKeyId) &&
    isSafeNonNegativeRemoteRuntimeInteger(value.priority) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isRemoteRuntimeAsymmetricPublicKeyValue(value.runtimeResponseSigningPublicKey) &&
    value.runtimeResponseSigningPublicKey.purpose === "runtimeResponseSigning" &&
    isNonEmptyRemoteRuntimeString(value.trustedRuntimeClientId) &&
    isNonEmptyRemoteRuntimeString(value.webSocketUrl)
  )
}

function isRuntimeConnectionCandidateBootstrapValue(
  value: RemoteRuntimeJsonValue,
): value is RuntimeConnectionCandidateBootstrap {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNonEmptyRemoteRuntimeString(value.baseHttpUrl) &&
    isNonEmptyRemoteRuntimeString(value.candidateId) &&
    isRuntimeTunnelEdgeAccessOrNullValue(value.edgeAccess) &&
    isOptionalRuntimeConnectionCandidateEnvironmentValue(value.environment) &&
    isNonEmptyRemoteRuntimeString(value.expiresAt) &&
    isOptionalRuntimeConnectionCandidateHostReachabilityValue(value.hostReachability) &&
    isRuntimeConnectionCandidateKind(value.kind) &&
    isNonEmptyRemoteRuntimeString(value.localRuntimeAccessToken) &&
    isNonEmptyRemoteRuntimeString(value.localRuntimeAccessTokenId) &&
    isSafeNonNegativeRemoteRuntimeInteger(value.priority) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isRemoteRuntimeAsymmetricPublicKeyValue(value.runtimeResponseSigningPublicKey) &&
    value.runtimeResponseSigningPublicKey.purpose === "runtimeResponseSigning" &&
    isNonEmptyRemoteRuntimeString(value.webSocketUrl)
  )
}

function isRuntimeTunnelEdgeAccessOrNullValue(
  value: RemoteRuntimeJsonValue | undefined,
): value is RuntimeTunnelEdgeAccess | null {
  return (
    value === null ||
    (isRemoteRuntimeHostRecord(value) &&
      isNonEmptyRemoteRuntimeString(value.clientId) &&
      isNonEmptyRemoteRuntimeString(value.clientIdHeaderName) &&
      isNonEmptyRemoteRuntimeString(value.clientSecret) &&
      isNonEmptyRemoteRuntimeString(value.clientSecretHeaderName) &&
      value.provider === "cloudflareAccess")
  )
}

function isOptionalRuntimeConnectionCandidateEnvironmentValue(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || isRuntimeConnectionCandidateEnvironment(value)
}

function isOptionalRuntimeConnectionCandidateHostReachabilityValue(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || isRuntimeConnectionCandidateHostReachability(value)
}

function isRemoteRuntimeAsymmetricPublicKeyValue(
  value: RemoteRuntimeJsonValue | undefined,
): value is RemoteRuntimeAsymmetricPublicKey {
  return value !== undefined && validateRemoteRuntimeAsymmetricPublicKey(value).ok
}

function isRemoteRuntimeActiveChatsSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeActiveChatsSnapshot,
): value is RemoteRuntimeActiveChatsSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    Array.isArray(value.activeChats) &&
    value.activeChats.every(isRemoteRuntimeActiveChatMetadataProjectionValue) &&
    isRemoteRuntimeActiveChatsPageInfoValue(value.pageInfo) &&
    isNullableRemoteRuntimeString(value.snapshotId) &&
    isNullableRemoteRuntimeString(value.resourceVersion)
  )
}

function isRemoteRuntimeChatSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeChatSnapshot,
): value is RemoteRuntimeChatSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isRemoteRuntimeActiveChatMetadataProjectionValue(value.chat) &&
    isNullableRemoteRuntimeString(value.resourceVersion)
  )
}

function isRemoteRuntimeChatMessagesSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeChatMessagesSnapshot,
): value is RemoteRuntimeChatMessagesSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isNonEmptyRemoteRuntimeString(value.sessionId) &&
    Array.isArray(value.messages) &&
    value.messages.every(isRemoteRuntimeChatMessageProjectionValue) &&
    isRemoteRuntimeChatMessagesPageInfoValue(value.pageInfo) &&
    isNullableRemoteRuntimeString(value.resourceVersion)
  )
}

function isRemoteRuntimeProvidersSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeProvidersSnapshot,
): value is RemoteRuntimeProvidersSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isRuntimeProviderListResponseValue(value.providers) &&
    isNullableRemoteRuntimeString(value.resourceVersion)
  )
}

function isRemoteRuntimeGoalsSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeGoalsSnapshot,
): value is RemoteRuntimeGoalsSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    Array.isArray(value.goals) &&
    value.goals.every(isThreadGoalValue) &&
    isRemoteRuntimeGoalsPageInfoValue(value.pageInfo) &&
    isNullableRemoteRuntimeString(value.resourceVersion)
  )
}

function isRemoteRuntimeGitStatusSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeGitStatusSnapshot,
): value is RemoteRuntimeGitStatusSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isRemoteRuntimeGitStatusResponse({ repositories: value.repositories }) &&
    isNullableRemoteRuntimeString(value.resourceVersion)
  )
}

function isRemoteRuntimeAliasesSnapshotValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeAliasesSnapshot,
): value is RemoteRuntimeAliasesSnapshot {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    Array.isArray(value.aliases) &&
    value.aliases.every(isRemoteRuntimePromptAliasValue) &&
    isNullableRemoteRuntimeString(value.resourceVersion)
  )
}

function isRemoteRuntimeStartChatResponseValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeStartChatResponse,
): value is RemoteRuntimeStartChatResponse {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isRemoteRuntimeActiveChatMetadataProjectionValue(value.chat)
  )
}

function isRemoteRuntimeSendChatMessageResponseValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeSendChatMessageResponse,
): value is RemoteRuntimeSendChatMessageResponse {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isNonEmptyRemoteRuntimeString(value.sessionId) &&
    isRemoteRuntimeChatMessageProjectionValue(value.message) &&
    isNonEmptyRemoteRuntimeString(value.acceptedAt)
  )
}

function isThreadGoalValue(value: RemoteRuntimeJsonValue | ThreadGoal | undefined): value is ThreadGoal {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNonEmptyRemoteRuntimeString(value.threadId) &&
    typeof value.objective === "string" &&
    isThreadGoalStatusValue(value.status) &&
    (value.tokenBudget === null || (typeof value.tokenBudget === "number" && Number.isFinite(value.tokenBudget))) &&
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

function isRemoteRuntimePromptAliasValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimePromptAlias | undefined,
): value is RemoteRuntimePromptAlias {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNonEmptyRemoteRuntimeString(value.alias) &&
    isNonEmptyRemoteRuntimeString(value.prompt) &&
    typeof value.updatedAt === "number" &&
    Number.isFinite(value.updatedAt)
  )
}

function isThreadGoalStatusValue(value: RemoteRuntimeJsonValue | undefined): value is ThreadGoal["status"] {
  return typeof value === "string" && isThreadGoalStatus(value)
}

function isRemoteRuntimeUpdateChatResponseValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeUpdateChatResponse,
): value is RemoteRuntimeUpdateChatResponse {
  return (
    isRemoteRuntimeHostRecord(value) &&
    hasCompatibleRemoteRuntimeHttpVersion(value) &&
    isNonEmptyRemoteRuntimeString(value.runtimeInstallationId) &&
    isRemoteRuntimeActiveChatMetadataProjectionValue(value.chat)
  )
}

function isRuntimeProviderListResponseValue(
  value: RemoteRuntimeJsonValue | RuntimeProviderListResponse | undefined,
): value is RuntimeProviderListResponse {
  return (
    isRemoteRuntimeHostRecord(value) &&
    Array.isArray(value.all) &&
    value.all.every(isRuntimeProviderInfoValue) &&
    Array.isArray(value.connected) &&
    value.connected.every(isNonEmptyRemoteRuntimeString) &&
    isRemoteRuntimeHostRecord(value.default) &&
    Object.values(value.default).every(isNonEmptyRemoteRuntimeString)
  )
}

function isRuntimeProviderInfoValue(value: RemoteRuntimeJsonValue): boolean {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNonEmptyRemoteRuntimeString(value.id) &&
    isRemoteRuntimeHostRecord(value.models) &&
    Object.values(value.models).every(isRuntimeProviderModelInfoValue) &&
    isNonEmptyRemoteRuntimeString(value.name)
  )
}

function isRuntimeProviderModelInfoValue(value: RemoteRuntimeJsonValue): boolean {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNonEmptyRemoteRuntimeString(value.id) &&
    isNonEmptyRemoteRuntimeString(value.name) &&
    isNonEmptyRemoteRuntimeString(value.status)
  )
}

function isRemoteRuntimeActiveChatMetadataProjectionValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeActiveChatMetadataProjection | undefined,
): value is RemoteRuntimeActiveChatMetadataProjection {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNullableRemoteRuntimeString(value.agent) &&
    isNonEmptyRemoteRuntimeString(value.createdAt) &&
    (value.goal === undefined || value.goal === null || isThreadGoalValue(value.goal)) &&
    isOptionalRemoteRuntimeBooleanOrNull(value.hasActiveTurn) &&
    isOptionalRemoteRuntimeStringOrNull(value.lastText) &&
    isOptionalSafeNonNegativeRemoteRuntimeIntegerOrNull(value.messageCount) &&
    isNullableRemoteRuntimeString(value.model) &&
    isNullableRemoteRuntimeString(value.path) &&
    isNonEmptyRemoteRuntimeString(value.projectId) &&
    isOptionalRemoteRuntimeStringOrNull(value.providerId) &&
    isOptionalRemoteRuntimeStringOrNull(value.providerName) &&
    isNonEmptyRemoteRuntimeString(value.sessionId) &&
    typeof value.status === "string" &&
    remoteRuntimeThreadStatusValues.includes(value.status as (typeof remoteRuntimeThreadStatusValues)[number]) &&
    isNonEmptyRemoteRuntimeString(value.title) &&
    isNonEmptyRemoteRuntimeString(value.updatedAt)
  )
}

function isRemoteRuntimeChatMessageProjectionValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeChatMessageProjection | undefined,
): value is RemoteRuntimeChatMessageProjection {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNullableRemoteRuntimeString(value.agent) &&
    isNullableRemoteRuntimeString(value.completedAt) &&
    isNonEmptyRemoteRuntimeString(value.createdAt) &&
    isNullableRemoteRuntimeString(value.errorMessage) &&
    isNullableRemoteRuntimeString(value.errorName) &&
    isNullableRemoteRuntimeString(value.finishReason) &&
    isNonEmptyRemoteRuntimeString(value.id) &&
    isNullableRemoteRuntimeString(value.model) &&
    isNullableRemoteRuntimeString(value.parentId) &&
    Array.isArray(value.parts) &&
    value.parts.every(isRemoteRuntimeChatMessagePartProjectionValue) &&
    isRemoteRuntimeMessageRoleValue(value.role) &&
    isNonEmptyRemoteRuntimeString(value.sessionId)
  )
}

function isRemoteRuntimeChatMessagePartProjectionValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeChatMessagePartProjection,
): value is RemoteRuntimeChatMessagePartProjection {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNullableRemoteRuntimeString(value.id) &&
    isNonEmptyRemoteRuntimeString(value.kind) &&
    isNullableRemoteRuntimeString(value.messageId) &&
    (value.rawPart === null || isRemoteRuntimeChatMessagePartPayloadValue(value.rawPart)) &&
    isNullableRemoteRuntimeString(value.status) &&
    isNullableRemoteRuntimeString(value.text) &&
    isNullableRemoteRuntimeString(value.title)
  )
}

function isRemoteRuntimeChatMessagePartPayloadValue(value: RemoteRuntimeJsonValue): boolean {
  if (!isRemoteRuntimeHostRecord(value) || !isNonEmptyRemoteRuntimeString(value.type)) return false
  if (!isOptionalRemoteRuntimeString(value.id) || !isOptionalRemoteRuntimeString(value.messageID)) return false
  switch (value.type) {
    case "text":
    case "reasoning":
      return (
        isOptionalRemoteRuntimeString(value.text) &&
        isOptionalRemoteRuntimeBoolean(value.synthetic) &&
        isOptionalRemoteRuntimeJsonObject(value.metadata)
      )
    case "tool":
      return (
        isOptionalRemoteRuntimeString(value.tool) &&
        isOptionalRemoteRuntimeJsonObject(value.input) &&
        isOptionalRemoteRuntimeJsonObject(value.metadata) &&
        isOptionalRemoteRuntimeJsonObject(value.state)
      )
    case "file":
      return (
        isOptionalRemoteRuntimeString(value.filename) &&
        isOptionalRemoteRuntimeString(value.mime) &&
        isOptionalRemoteRuntimeJsonObject(value.source) &&
        isOptionalRemoteRuntimeString(value.url)
      )
    case "patch":
      return isOptionalRemoteRuntimeJsonArray(value.files)
    case "snapshot":
    case "step-start":
      return isOptionalRemoteRuntimeString(value.snapshot)
    case "step-finish":
      return (
        isOptionalRemoteRuntimeStringOrNumber(value.cost) &&
        isOptionalRemoteRuntimeString(value.reason) &&
        isOptionalRemoteRuntimeJsonObject(value.tokens)
      )
    case "subtask":
      return (
        isOptionalRemoteRuntimeString(value.agent) &&
        isOptionalRemoteRuntimeString(value.description) &&
        isOptionalRemoteRuntimeString(value.prompt)
      )
    case "agent":
      return isOptionalRemoteRuntimeString(value.name)
    case "retry":
      return (
        isOptionalSafeNonNegativeRemoteRuntimeInteger(value.attempt) && isOptionalRemoteRuntimeJsonValue(value.error)
      )
    case "compaction":
      return (
        isOptionalRemoteRuntimeBoolean(value.auto) &&
        isOptionalRemoteRuntimeBoolean(value.overflow) &&
        isOptionalRemoteRuntimeString(value.phase) &&
        isOptionalRemoteRuntimeString(value.reason) &&
        isOptionalRemoteRuntimeString(value.tail_start_id)
      )
    default:
      return false
  }
}

function isRemoteRuntimeActiveChatsPageInfoValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeActiveChatsPageInfo | undefined,
): value is RemoteRuntimeActiveChatsPageInfo {
  return isRemoteRuntimePageInfoValue(value)
}

function isRemoteRuntimeChatMessagesPageInfoValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeChatMessagesPageInfo | undefined,
): value is RemoteRuntimeChatMessagesPageInfo {
  return isRemoteRuntimePageInfoValue(value)
}

function isRemoteRuntimeGoalsPageInfoValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeGoalsPageInfo | undefined,
): value is RemoteRuntimeGoalsPageInfo {
  return (
    isRemoteRuntimeHostRecord(value) &&
    typeof value.hasOlder === "boolean" &&
    isNullableRemoteRuntimeString(value.olderCursor)
  )
}

function isRemoteRuntimePageInfoValue(
  value: RemoteRuntimeJsonValue | RemoteRuntimeActiveChatsPageInfo | RemoteRuntimeChatMessagesPageInfo | undefined,
): boolean {
  return (
    isRemoteRuntimeHostRecord(value) &&
    typeof value.hasNewer === "boolean" &&
    typeof value.hasOlder === "boolean" &&
    isNullableRemoteRuntimeString(value.newerCursor) &&
    isNullableRemoteRuntimeString(value.olderCursor)
  )
}

function isRemoteRuntimeMessageRoleValue(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === "assistant" || value === "system" || value === "user"
}

function isOptionalSafeNonNegativeRemoteRuntimeIntegerOrNull(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || value === null || isSafeNonNegativeRemoteRuntimeInteger(value)
}

function isOptionalSafeNonNegativeRemoteRuntimeInteger(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || isSafeNonNegativeRemoteRuntimeInteger(value)
}

function isOptionalRemoteRuntimeBooleanOrNull(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || value === null || typeof value === "boolean"
}

function isOptionalRemoteRuntimeBoolean(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || typeof value === "boolean"
}

function isOptionalRemoteRuntimeStringOrNull(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || value === null || typeof value === "string"
}

function isOptionalRemoteRuntimeString(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || typeof value === "string"
}

function isOptionalRemoteRuntimeStringOrNumber(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || typeof value === "string" || typeof value === "number"
}

function isOptionalRemoteRuntimeJsonValue(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || isRemoteRuntimeJsonValue(value)
}

function isOptionalRemoteRuntimeJsonArray(value: RemoteRuntimeJsonValue | undefined): boolean {
  return value === undefined || (Array.isArray(value) && value.every(isRemoteRuntimeJsonValue))
}

function isOptionalRemoteRuntimeJsonObject(value: RemoteRuntimeJsonValue | undefined): boolean {
  return (
    value === undefined || (isRemoteRuntimeHostRecord(value) && Object.values(value).every(isRemoteRuntimeJsonValue))
  )
}

function isRemoteRuntimeJsonValue(value: RemoteRuntimeJsonValue): boolean {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string" ||
    (Array.isArray(value) && value.every(isRemoteRuntimeJsonValue)) ||
    (isRemoteRuntimeHostRecord(value) && Object.values(value).every(isRemoteRuntimeJsonValue))
  )
}

function isRuntimeWebSocketAllowedDirectoryValue(
  value: RemoteRuntimeJsonValue | RuntimeWebSocketAllowedDirectory,
): value is RuntimeWebSocketAllowedDirectory {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNonEmptyRemoteRuntimeString(value.directoryId) &&
    (value.displayName === undefined ||
      value.displayName === null ||
      isNonEmptyRemoteRuntimeString(value.displayName)) &&
    isNonEmptyRemoteRuntimeString(value.path)
  )
}

function isRuntimeWebSocketDirectoryAttachmentValue(
  value: RemoteRuntimeJsonValue | RuntimeWebSocketDirectoryAttachment,
): value is RuntimeWebSocketDirectoryAttachment {
  return (
    isRemoteRuntimeHostRecord(value) &&
    isNonEmptyRemoteRuntimeString(value.directoryId) &&
    isNonEmptyRemoteRuntimeString(value.gatewayRuntimeAttachmentId) &&
    isNonEmptyRemoteRuntimeString(value.path) &&
    isRemoteRuntimeStatusSnapshotState(value.status)
  )
}

function remoteRuntimeStringOrUnknown(value: RemoteRuntimeJsonValue | undefined): string {
  return isNonEmptyRemoteRuntimeString(value) ? value : "unknown"
}

function remoteRuntimeValidationRequestId(input: RemoteRuntimeJsonValue): string {
  if (!isRemoteRuntimeHostRecord(input)) return "unknown"
  if (isNonEmptyRemoteRuntimeString(input.requestId)) return input.requestId
  if (isNonEmptyRemoteRuntimeString(input.runtimeInstallationId)) return input.runtimeInstallationId
  if (isRemoteRuntimeHostRecord(input.event) && isNonEmptyRemoteRuntimeString(input.event.runtimeInstallationId)) {
    return input.event.runtimeInstallationId
  }
  return "unknown"
}

function remoteRuntimeJsonByteLength(value: RemoteRuntimeJsonValue): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

function isSafeNonNegativeRemoteRuntimeInteger(value: RemoteRuntimeJsonValue | undefined): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

function remoteRuntimeAuthorizationFailure(
  requestId: string,
  message: string,
): { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false } {
  return {
    error: createAuthorizationFailureEnvelope(requestId, message),
    ok: false,
  }
}

function remoteRuntimeValidationFailure(
  code: RemoteRuntimeTransportFailureEnvelope["code"],
  requestId: string,
  message: string,
): { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false } {
  return {
    error: createRemoteRuntimeTransportFailureEnvelope({ code, message, requestId }),
    ok: false,
  }
}

function remoteRuntimeProtocolMismatch(
  requestId: string,
  receivedVersion: string,
): { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false } {
  return remoteRuntimeValidationFailure(
    "PROTOCOL_MISMATCH",
    requestId,
    `Remote runtime transport protocol version ${receivedVersion} is unsupported.`,
  )
}

const redactedRemoteRuntimeTransportLogFieldNames = new Set([
  "apiKey",
  "args",
  "authorization",
  "bearer",
  "ciphertext",
  "command",
  "content",
  "cwd",
  "encryptedPayload",
  "environment",
  "fileContent",
  "filePath",
  "gatewayRuntimeAttachmentId",
  "input",
  "keyId",
  "localProviderToken",
  "clientAttachmentId",
  "nonce",
  "path",
  "payload",
  "prompt",
  "providerOutput",
  "shellOutput",
  "signature",
  "ticket",
  "token",
  "trustedRuntimeClientId",
  "workspaceRoot",
  "workspace_root",
])

const defaultRemoteRuntimeNonceReplayStoreMaxEntries = 100_000
const defaultRemoteRuntimeNonceReplayStorePruneIntervalMs = 30 * 1000
const defaultRemoteRuntimeSignatureSkewMs = 5 * 60 * 1000
const remoteRuntimeDiagnosticRedactionRules = [
  {
    pattern: /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gu,
    replacement: "[REDACTED_PRIVATE_KEY]",
  },
  {
    pattern: /\bBearer\s+[^\s,;]+/giu,
    replacement: "Bearer [REDACTED]",
  },
  {
    pattern:
      /("(?:apiBearerToken|authorizationToken|bearerToken|localAccessToken|privateKey|privateSigningKey|signature)"\s*:\s*")[^"]*(")/giu,
    replacement: "$1[REDACTED]$2",
  },
  {
    pattern:
      /\b(apiBearerToken|authorizationToken|bearerToken|localAccessToken|privateKey|privateSigningKey|signature|Interbase-Client-Signature|Interbase-Runtime-Response-Signature|INTERBASE_CLIENT_PAIRING_CREDENTIAL)(\s*[:=]\s*)[^\s,;]+/giu,
    replacement: "$1$2[REDACTED]",
  },
] as const
const remoteRuntimeTextEncoder = new TextEncoder()
const remoteRuntimeTextDecoder = new TextDecoder()

type RemoteRuntimeSignedRequestVerificationInput =
  | RemoteRuntimeRequestSignatureVerificationInput
  | RemoteRuntimeWebSocketUpgradeSignatureVerificationInput
  | RemoteRuntimeWebSocketActionSignatureVerificationInput

type RemoteRuntimeSignedRequestPayload =
  | RemoteRuntimeCanonicalHttpSigningPayload
  | RemoteRuntimeCanonicalWebSocketUpgradeSigningPayload
  | RemoteRuntimeCanonicalWebSocketActionSigningPayload

const remoteRuntimeTransportSchemaContractFields = {
  activeChatsChangedPayload: ["reason", "chat", "invalidates"],
  chatChangedPayload: ["sessionId", "chat", "invalidatesMessages"],
  chatMessagesChangedPayload: ["sessionId", "reason", "message", "invalidates"],
  goalsChangedPayload: ["goal", "invalidates", "sessionId"],
  aliasesChangedPayload: ["alias", "invalidates"],
  chatStreamDeltaPayload: ["sessionId", "messageId", "partId", "field", "delta"],
  chatStreamPartPayload: ["sessionId", "messageId", "partId", "part", "truncated"],
  gatewayRuntimeAttachment: [
    "accountId",
    "attachmentCapabilities",
    "connectorVersion",
    "deviceTrustLevel",
    "directoryId",
    "directoryPath",
    "gatewayRuntimeAttachmentId",
    "runtimeInstallationId",
    "status",
  ],
  gatewayRuntimeAttachmentRegistrationRequest: [
    "accountId",
    "attachmentCapabilities",
    "connectorVersion",
    "directoryId",
    "directoryPath",
    "protocolVersion",
    "requestId",
    "runtimeInstallationId",
    "ticket",
  ],
  remoteRuntimeActiveChatsSnapshot: [
    "remoteRuntimeHttpVersion",
    "runtimeInstallationId",
    "activeChats",
    "pageInfo",
    "snapshotId",
    "resourceVersion",
  ],
  runtimeClientAsymmetricPublicKey: ["algorithm", "createdAt", "encoding", "keyId", "publicKey", "purpose"],
  remoteRuntimeCanonicalHttpSigningPayload: ["algorithm", "payload"],
  remoteRuntimeCanonicalHttpSigningPayloadInput: [
    "bodySha256",
    "canonicalPath",
    "canonicalQuery",
    "idempotencyKey",
    "keyId",
    "localRuntimeAccessTokenId",
    "method",
    "remoteRuntimeHttpVersion",
    "nonce",
    "requestId",
    "runtimeInstallationId",
    "timestamp",
    "trustedRuntimeClientId",
  ],
  remoteRuntimeCanonicalWebSocketActionSigningPayload: ["algorithm", "payload"],
  remoteRuntimeCanonicalWebSocketActionSigningPayloadInput: [
    "keyId",
    "nonce",
    "payloadSha256",
    "requestId",
    "runtimeInstallationId",
    "sequence",
    "sessionNonce",
    "timestamp",
    "trustedRuntimeClientId",
  ],
  remoteRuntimeWebSocketActionSignatureProof: [
    "algorithm",
    "keyId",
    "nonce",
    "payloadSha256",
    "signature",
    "timestamp",
  ],
  remoteRuntimeWebSocketSessionAccepted: ["protocolVersion", "sessionNonce", "type"],
  remoteRuntimeWebSocketSignedAction: ["payload", "proof", "protocolVersion", "sequence", "sessionNonce", "type"],
  remoteRuntimeChatMessagesSnapshot: [
    "remoteRuntimeHttpVersion",
    "runtimeInstallationId",
    "sessionId",
    "messages",
    "pageInfo",
    "resourceVersion",
  ],
  remoteRuntimeChatSnapshot: ["remoteRuntimeHttpVersion", "runtimeInstallationId", "chat", "resourceVersion"],
  remoteRuntimeGoalsSnapshot: [
    "remoteRuntimeHttpVersion",
    "runtimeInstallationId",
    "goals",
    "pageInfo",
    "resourceVersion",
  ],
  remoteRuntimeGitStatusSnapshot: [
    "remoteRuntimeHttpVersion",
    "runtimeInstallationId",
    "repositories",
    "resourceVersion",
  ],
  remoteRuntimeAliasesSnapshot: ["remoteRuntimeHttpVersion", "runtimeInstallationId", "aliases", "resourceVersion"],
  remoteRuntimeProvidersSnapshot: ["remoteRuntimeHttpVersion", "runtimeInstallationId", "providers", "resourceVersion"],
  remoteRuntimeHttpRequestSignatureProof: ["algorithm", "bodySha256", "keyId", "nonce", "signature", "timestamp"],
  clientAttachment: [
    "accountId",
    "deviceTrustLevel",
    "gatewayRuntimeAttachmentId",
    "clientAttachmentId",
    "runtimeInstallationId",
    "status",
    "trustedRuntimeClientId",
  ],
  clientAttachmentRequest: [
    "accountId",
    "deviceTrustLevel",
    "protocolVersion",
    "requestId",
    "runtimeInstallationId",
    "ticket",
    "trustedRuntimeClientId",
  ],
  remoteRuntimeTransportFailureEnvelope: [
    "code",
    "message",
    "pairingAction",
    "protocolVersion",
    "requestId",
    "replacementRuntimeInstallationId",
    "runtimeInstallationId",
    "terminal",
    "type",
  ],
  remoteRuntimeEncryptedPayload: ["algorithm", "ciphertext", "contentType", "keyId", "nonce"],
  remoteRuntimeHttpVersionMismatchFailure: ["code", "message", "receivedVersion", "supportedVersions", "requestId"],
  remoteRuntimeOperationCompletedPayload: ["requestId", "idempotencyKey", "resource"],
  remoteRuntimeOperationFailedPayload: ["requestId", "idempotencyKey", "error", "resource"],
  remoteRuntimeRealtimeEventEnvelope: ["protocolVersion", "type", "event"],
  remoteRuntimeRealtimeResourceRef: ["kind", "runtimeInstallationId", "sessionId"],
  remoteRuntimeCapabilitiesSnapshot: [
    "remoteRuntimeHttpVersion",
    "runtimeInstallationId",
    "attachmentCapabilities",
    "featureCapabilities",
    "supportedMethods",
  ],
  remoteRuntimeDirectoriesSnapshot: [
    "remoteRuntimeHttpVersion",
    "runtimeInstallationId",
    "activeDirectoryAttachments",
    "allowedDirectories",
  ],
  remoteRuntimeStatusSnapshot: [
    "remoteRuntimeHttpVersion",
    "runtimeInstallationId",
    "allowedDirectories",
    "gatewayRuntimeAttachmentId",
    "state",
    "connectorVersion",
    "lastHeartbeatAt",
    "attachmentCapabilities",
  ],
  remoteRuntimeSendChatMessageRequest: ["requestId", "runtimeInstallationId", "sessionId", "input", "idempotencyKey"],
  remoteRuntimeSendChatMessageResponse: [
    "remoteRuntimeHttpVersion",
    "runtimeInstallationId",
    "sessionId",
    "message",
    "acceptedAt",
  ],
  remoteRuntimeStartChatRequest: [
    "requestId",
    "runtimeInstallationId",
    "directoryId",
    "providerId",
    "model",
    "title",
    "idempotencyKey",
  ],
  remoteRuntimeStartChatResponse: ["remoteRuntimeHttpVersion", "runtimeInstallationId", "chat"],
  remoteRuntimeUpdateChatRequest: ["requestId", "runtimeInstallationId", "sessionId", "input", "idempotencyKey"],
  remoteRuntimeUpdateChatResponse: ["remoteRuntimeHttpVersion", "runtimeInstallationId", "chat"],
  runtimeStatusChangedPayload: ["status"],
  runtimeOperationFrame: [
    "deviceTrustLevel",
    "encryptedPayload",
    "gatewayRuntimeAttachmentId",
    "idempotencyKey",
    "clientAttachmentId",
    "operationClass",
    "payload",
    "protocolVersion",
    "replyTarget",
    "requestId",
    "trustedGatewayHttpRequest",
    "type",
  ],
  runtimeStatusFrame: [
    "attachmentCapabilities",
    "connectorVersion",
    "gatewayRuntimeAttachmentId",
    "protocolVersion",
    "replay",
    "requestId",
    "runtimeApiVersion",
    "sequence",
    "status",
    "type",
  ],
  runtimeResponseFrame: [
    "envelope",
    "gatewayRuntimeAttachmentId",
    "clientAttachmentId",
    "protocolVersion",
    "requestId",
    "type",
  ],
  runtimeConnectionCandidate: [
    "baseHttpUrl",
    "candidateId",
    "edgeAccess",
    "environment",
    "expiresAt",
    "hostReachability",
    "kind",
    "localRuntimeAccessToken",
    "localRuntimeAccessTokenId",
    "remoteRuntimeRequestSigningKeyId",
    "priority",
    "runtimeInstallationId",
    "runtimeResponseSigningPublicKey",
    "trustedRuntimeClientId",
    "webSocketUrl",
  ],
  runtimeConnectionCandidateBootstrap: [
    "baseHttpUrl",
    "candidateId",
    "edgeAccess",
    "environment",
    "expiresAt",
    "hostReachability",
    "kind",
    "localRuntimeAccessToken",
    "localRuntimeAccessTokenId",
    "priority",
    "runtimeInstallationId",
    "runtimeResponseSigningPublicKey",
    "webSocketUrl",
  ],
  localRuntimeConnectorAuditEvent: [
    "action",
    "encrypted",
    "gatewayRuntimeAttachmentId",
    "idempotencyKeyPresent",
    "method",
    "clientAttachmentId",
    "operationClass",
    "outerRequestId",
    "reason",
    "requestId",
    "subcommand",
  ],
}

function remoteRuntimeGatewayFailure(
  code: RemoteRuntimeTransportFailureEnvelope["code"],
  requestId: string,
  message: string,
): { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false } {
  return {
    error: createRemoteRuntimeTransportFailureEnvelope({ code, message, requestId }),
    ok: false,
  }
}

function createRemoteRuntimeGatewayRuntimeUnavailableResult(requestId: string): {
  readonly error: RemoteRuntimeTransportFailureEnvelope
  readonly ok: false
} {
  return {
    error: createRuntimeUnavailableEnvelope(requestId),
    ok: false,
  }
}

function createRemoteRuntimeGatewayRandomAttachmentId(prefix: "gra" | "mda") {
  return `${prefix}_${globalThis.crypto.randomUUID()}`
}

function remoteRuntimeGatewayRuntimeAttachmentCanRoute(runtime: GatewayRuntimeAttachment) {
  return runtime.status === "online" || runtime.status === "degraded"
}

function remoteRuntimeGatewayOperationClassRequiresIdempotency(operationClass: RemoteRuntimeOperationClass): boolean {
  return (
    operationClass === "mutation" ||
    operationClass === "privilegedExecution" ||
    operationClass === "credential" ||
    operationClass === "shutdown"
  )
}

function remoteRuntimeGatewayIdempotencyScope(attachmentId: string, idempotencyKey: string): string {
  return `${attachmentId}:${idempotencyKey}`
}

function encryptedRuntimePayloadAssociatedData(
  payload: Pick<RemoteRuntimeEncryptedPayload, "algorithm" | "contentType" | "keyId">,
): Uint8Array {
  return remoteRuntimeTextEncoder.encode(
    JSON.stringify({
      algorithm: payload.algorithm,
      contentType: payload.contentType,
      keyId: payload.keyId,
      protocolVersion: remoteRuntimeTransportProtocolVersion,
    }),
  )
}

async function importRemoteRuntimeAesGcmKey(
  key: ArrayBuffer | ArrayBufferView,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const bytes = requireRemoteRuntimeByteLength(key, 32, "Encrypted runtime key")
  return crypto.subtle.importKey(
    "raw",
    remoteRuntimeBufferSource(bytes),
    { length: 256, name: "AES-GCM" },
    false,
    usages,
  )
}

function requireRemoteRuntimeByteLength(
  input: ArrayBuffer | ArrayBufferView,
  byteLength: number,
  label: string,
): Uint8Array {
  const bytes = remoteRuntimeToUint8Array(input)
  if (bytes.byteLength !== byteLength) {
    throw new Error(`${label} must be ${byteLength} bytes.`)
  }
  return bytes
}

function remoteRuntimeBufferSource(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy.buffer as ArrayBuffer
}

function remoteRuntimeRandomBytes(byteLength: number): Uint8Array {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytes
}

function remoteRuntimeToUint8Array(input: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
}

function remoteRuntimeBase64UrlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
}

function remoteRuntimeBase64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+={0,2}$/u.test(value)) throw new Error("Invalid base64url value.")
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=")
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function remoteRuntimeEncodeJson(value: RemoteRuntimeJsonValue): string {
  return remoteRuntimeBase64UrlEncode(remoteRuntimeTextEncoder.encode(JSON.stringify(value)))
}

function remoteRuntimeDecodeCursor(cursor: string, message: string): RemoteRuntimeJsonValue {
  try {
    return JSON.parse(remoteRuntimeTextDecoder.decode(remoteRuntimeBase64UrlDecode(cursor))) as RemoteRuntimeJsonValue
  } catch {
    throw new Error(message)
  }
}

async function verifyRemoteRuntimeEd25519Signature(input: {
  readonly payload: string
  readonly publicKey: string
  readonly signature: string
}): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      await crypto.subtle.importKey(
        "raw",
        remoteRuntimeBufferSource(remoteRuntimeBase64UrlDecode(input.publicKey)),
        { name: "Ed25519" },
        false,
        ["verify"],
      ),
      remoteRuntimeBufferSource(remoteRuntimeBase64UrlDecode(input.signature)),
      remoteRuntimeBufferSource(remoteRuntimeTextEncoder.encode(input.payload)),
    )
  } catch {
    return false
  }
}

async function signRemoteRuntimeEd25519Payload(input: {
  readonly payload: string
  readonly privateKey: string
}): Promise<string> {
  return remoteRuntimeBase64UrlEncode(
    new Uint8Array(
      await crypto.subtle.sign(
        { name: "Ed25519" },
        await crypto.subtle.importKey(
          "pkcs8",
          remoteRuntimeBufferSource(remoteRuntimeBase64UrlDecode(input.privateKey)),
          { name: "Ed25519" },
          false,
          ["sign"],
        ),
        remoteRuntimeBufferSource(remoteRuntimeTextEncoder.encode(input.payload)),
      ),
    ),
  )
}

function validateRemoteRuntimeSignedRequestAuthority(
  input: RemoteRuntimeSignedRequestVerificationInput,
  message: string,
): RemoteRuntimeValidationResult<{ readonly maxSkewMs: number; readonly timestampMs: number }> {
  const requestId = input.payloadInput.requestId ?? "unknown"
  const publicKeyValidation = validateRemoteRuntimeAsymmetricPublicKey(input.publicKey)
  if (!publicKeyValidation.ok) {
    return remoteRuntimeValidationFailure("AUTHORIZATION_FAILED", requestId, message)
  }
  if (
    input.publicKey.purpose !== "remoteRuntimeRequestSigning" ||
    input.publicKey.keyId !== input.proof.keyId ||
    input.proof.keyId !== input.payloadInput.keyId ||
    input.proof.algorithm !== "ed25519" ||
    input.proof.algorithm !== input.publicKey.algorithm ||
    input.proof.nonce !== input.payloadInput.nonce ||
    input.proof.timestamp !== input.payloadInput.timestamp
  ) {
    return remoteRuntimeValidationFailure("AUTHORIZATION_FAILED", requestId, message)
  }
  const timestampMs = Date.parse(input.proof.timestamp)
  if (!Number.isFinite(timestampMs)) {
    return remoteRuntimeValidationFailure("AUTHORIZATION_FAILED", requestId, message)
  }
  const maxSkewMs = input.maxSkewMs ?? defaultRemoteRuntimeSignatureSkewMs
  if (Math.abs(input.nowMs - timestampMs) > maxSkewMs) {
    return remoteRuntimeValidationFailure("AUTHORIZATION_FAILED", requestId, message)
  }
  return { ok: true, value: { maxSkewMs, timestampMs } }
}

async function verifyRemoteRuntimeSignedRequestPayload<TPayload extends RemoteRuntimeSignedRequestPayload>(
  input: RemoteRuntimeSignedRequestVerificationInput,
  signingPayload: TPayload,
  compatiblePayloads: readonly string[],
  message: string,
): Promise<RemoteRuntimeValidationResult<TPayload>> {
  const verified = await Promise.any(
    compatiblePayloads.map((payload) =>
      verifyRemoteRuntimeEd25519Signature({
        payload,
        publicKey: input.publicKey.publicKey,
        signature: input.proof.signature,
      }).then((ok) => {
        if (!ok) throw new Error("signature mismatch")
        return true
      }),
    ),
  ).then(
    () => true,
    () => false,
  )
  if (!verified) {
    return remoteRuntimeValidationFailure("AUTHORIZATION_FAILED", input.payloadInput.requestId ?? "unknown", message)
  }
  const maxSkewMs = input.maxSkewMs ?? defaultRemoteRuntimeSignatureSkewMs
  const timestampMs = Date.parse(input.proof.timestamp)
  if (
    !(await input.nonceStore.reserve({
      keyId: input.proof.keyId,
      nonce: input.proof.nonce,
      nowMs: input.nowMs,
      expiresAtMs: timestampMs + maxSkewMs,
      timestamp: input.proof.timestamp,
    }))
  ) {
    return remoteRuntimeValidationFailure("AUTHORIZATION_FAILED", input.payloadInput.requestId ?? "unknown", message)
  }
  return { ok: true, value: signingPayload }
}

export function remoteRuntimeRequestTimedOut(request: RemoteRuntimeRequest): RemoteRuntimeRequest {
  return { ...request, status: "timedOut" }
}

export function createRemoteRuntimeRequestQueue(capacity: number): RemoteRuntimeRequestQueue {
  if (!Number.isInteger(capacity) || capacity < 1)
    throw new Error("Remote runtime request queue capacity must be a positive integer.")
  return { capacity, pending: [] }
}

export function enqueueRemoteRuntimeRequest(
  queue: RemoteRuntimeRequestQueue,
  request: RemoteRuntimeRequest,
): RemoteRuntimeRequestQueueEnqueueResult {
  if (queue.pending.length >= queue.capacity) return { accepted: false, reason: "queueFull", queue }
  return { accepted: true, queue: { ...queue, pending: [...queue.pending, request] } }
}

export function respondToRemoteRuntimeRequest(
  queue: RemoteRuntimeRequestQueue,
  input: { readonly requestId: string; readonly replyTarget: RuntimeOperationReplyTarget },
): RemoteRuntimeRequestQueueResponseResult {
  const request = queue.pending.find((item) => item.requestId === input.requestId)
  if (!request) return { accepted: false, reason: "requestNotPending", queue }
  if (!sameRuntimeOperationReplyTarget(request.replyTarget, input.replyTarget)) {
    return { accepted: false, reason: "replyTargetMismatch", queue }
  }
  return {
    accepted: true,
    request: { ...request, status: "responded" },
    queue: { ...queue, pending: queue.pending.filter((item) => item.requestId !== input.requestId) },
  }
}

export function timeoutRemoteRuntimeRequest(
  queue: RemoteRuntimeRequestQueue,
  requestId: string,
): RemoteRuntimeRequestQueueTimeoutResult {
  const request = queue.pending.find((item) => item.requestId === requestId)
  if (!request) return { timedOut: false, reason: "requestNotPending", queue }
  return {
    timedOut: true,
    request: remoteRuntimeRequestTimedOut(request),
    queue: { ...queue, pending: queue.pending.filter((item) => item.requestId !== requestId) },
  }
}

export function classifyRemoteRuntimeEnvelopeDeliveryFailure(input: {
  readonly error: Error
  readonly isGatewayAttachmentUnavailable: (error: Error) => boolean
  readonly replyTarget: RuntimeOperationReplyTarget
}): RemoteRuntimeEnvelopeDeliveryFailureClassification {
  if (input.replyTarget.kind === "gatewayHttpRequest" && input.isGatewayAttachmentUnavailable(input.error)) {
    return { errorName: input.error.name, stage: "lateGatewayHttpResponseIgnored" }
  }
  return { error: input.error, errorName: input.error.name, stage: "responseDeliveryFailed" }
}

export function recordRuntimeAttachmentTimeout(
  attachment: RemoteRuntimeAttachment,
  policy: RemoteRuntimeHealthPolicy = defaultRemoteRuntimeHealthPolicy,
): RemoteRuntimeAttachment {
  const consecutiveTimeouts = attachment.consecutiveTimeouts + 1
  if (consecutiveTimeouts >= policy.unavailableTimeouts)
    return { ...attachment, consecutiveTimeouts, health: "unavailable" }
  if (consecutiveTimeouts >= policy.degradedTimeouts) return { ...attachment, consecutiveTimeouts, health: "degraded" }
  return { ...attachment, consecutiveTimeouts }
}

export function recordRuntimeAttachmentHeartbeat(attachment: RemoteRuntimeAttachment): RemoteRuntimeAttachment {
  return { ...attachment, consecutiveTimeouts: 0, health: "online" }
}

export function createRemoteRuntimeSubscription(input: {
  readonly subscriptionId: string
  readonly owner: RuntimeOwner
}): RemoteRuntimeSubscription {
  return { subscriptionId: input.subscriptionId, owner: input.owner, consecutiveDeliveryFailures: 0, state: "active" }
}

export function createRemoteRuntimeClientAttachmentTracker(
  remoteRuntimeClientAttachmentIds: readonly string[] = [],
): RemoteRuntimeClientAttachmentTracker {
  return { remoteRuntimeClientAttachmentIds: [...new Set(remoteRuntimeClientAttachmentIds)] }
}

export function observeRemoteRuntimeClientAttachment(
  tracker: RemoteRuntimeClientAttachmentTracker,
  clientAttachmentId: string,
): RemoteRuntimeClientAttachmentObservationResult {
  if (tracker.remoteRuntimeClientAttachmentIds.includes(clientAttachmentId)) return { observed: false, tracker }
  return {
    observed: true,
    tracker: {
      remoteRuntimeClientAttachmentIds: [...tracker.remoteRuntimeClientAttachmentIds, clientAttachmentId],
    },
  }
}

export function detachRemoteRuntimeClientAttachment(
  tracker: RemoteRuntimeClientAttachmentTracker,
  clientAttachmentId: string,
): RemoteRuntimeClientAttachmentDetachResult {
  if (!tracker.remoteRuntimeClientAttachmentIds.includes(clientAttachmentId)) return { detached: false, tracker }
  return {
    detached: true,
    tracker: {
      remoteRuntimeClientAttachmentIds: tracker.remoteRuntimeClientAttachmentIds.filter(
        (id) => id !== clientAttachmentId,
      ),
    },
  }
}

export function detachAllRemoteRuntimeClientAttachments(tracker: RemoteRuntimeClientAttachmentTracker): {
  readonly detachedRemoteRuntimeClientAttachmentIds: readonly string[]
  readonly tracker: RemoteRuntimeClientAttachmentTracker
} {
  return {
    detachedRemoteRuntimeClientAttachmentIds: tracker.remoteRuntimeClientAttachmentIds,
    tracker: createRemoteRuntimeClientAttachmentTracker(),
  }
}

export function hasRemoteRuntimeClientAttachment(
  tracker: RemoteRuntimeClientAttachmentTracker,
  clientAttachmentId: string,
): boolean {
  return tracker.remoteRuntimeClientAttachmentIds.includes(clientAttachmentId)
}

export function startRemoteRuntimeHeartbeatRunner(
  options: RemoteRuntimeHeartbeatRunnerOptions,
): RemoteRuntimeHeartbeatRunner {
  const abort = new AbortController()
  const signal = options.signal ? AbortSignal.any([abort.signal, options.signal]) : abort.signal
  const intervalMs = Math.max(0, options.intervalMs)
  const sleep = options.sleep ?? defaultRemoteRuntimeHostEventMirrorSleep
  const run = (async () => {
    while (intervalMs > 0 && !signal.aborted) {
      await sleep(intervalMs, signal)
      if (signal.aborted) return
      try {
        await options.onHeartbeat(signal)
      } catch {
        if (signal.aborted) return
      }
    }
  })()
  return {
    async stop() {
      abort.abort()
      await run.catch(() => undefined)
    },
  }
}

export function createRemoteRuntimeSocketMessageQueue<TData, TMessage>(input: {
  readonly parseMessage: (data: TData | undefined) => RemoteRuntimeSocketMessageResult<TMessage>
  readonly signal?: AbortSignal
  readonly socket: RemoteRuntimeSocket<TData>
}): RemoteRuntimeSocketMessageQueue<TMessage> {
  type Waiter = {
    reject: (error: Error) => void
    resolve: (message: RemoteRuntimeSocketMessage<TMessage>) => void
  }
  const messages: TMessage[] = []
  const waiters: Waiter[] = []
  let closed = false
  let didOpen = false
  let failure: Error | null = null
  let open!: () => void
  let failOpen!: (error: Error) => void
  const opened = new Promise<void>((resolve, reject) => {
    open = resolve
    failOpen = reject
  })

  input.socket.addEventListener("open", () => {
    didOpen = true
    open()
  })
  input.socket.addEventListener("message", (event) => {
    const parsed = input.parseMessage(event?.data)
    if (!parsed.ok) {
      failQueue(parsed.error)
      return
    }
    const waiter = waiters.shift()
    if (waiter) {
      waiter.resolve({ done: false, value: parsed.value })
      return
    }
    messages.push(parsed.value)
  })
  input.socket.addEventListener("close", () => closeQueue("Remote runtime websocket closed before opening."))
  input.socket.addEventListener("error", () => closeQueue("Remote runtime websocket errored before opening."))
  input.signal?.addEventListener("abort", () => closeQueue("Remote runtime websocket aborted before opening."), {
    once: true,
  })

  return {
    opened,
    next(): Promise<RemoteRuntimeSocketMessage<TMessage>> {
      const value = messages.shift()
      if (value !== undefined) return Promise.resolve({ done: false, value })
      if (failure) return Promise.reject(failure)
      if (closed) return Promise.resolve({ done: true })
      return new Promise((resolve, reject) => {
        waiters.push({ reject, resolve })
      })
    },
  }

  function closeQueue(openErrorMessage: string): void {
    if (closed) return
    closed = true
    if (!didOpen) failOpen(new Error(openErrorMessage))
    for (const waiter of waiters.splice(0)) {
      waiter.resolve({ done: true })
    }
  }

  function failQueue(error: Error): void {
    if (failure) return
    failure = error
    closed = true
    if (!didOpen) failOpen(error)
    for (const waiter of waiters.splice(0)) {
      waiter.reject(error)
    }
  }
}

export function parseRemoteRuntimeSocketJsonMessage(data: RemoteRuntimeSocketMessageData): RemoteRuntimeJsonValue {
  const result = parseRemoteRuntimeSocketJsonMessageResult(data)
  if (result.ok) return result.value
  throw result.error
}

export function parseRemoteRuntimeSocketJsonMessageResult(
  data: RemoteRuntimeSocketMessageData,
): RemoteRuntimeSocketMessageResult<RemoteRuntimeJsonValue> {
  if (typeof data === "string") {
    return parseRemoteRuntimeSocketJsonTextResult(data)
  }

  if (data instanceof ArrayBuffer) {
    return parseRemoteRuntimeSocketJsonTextResult(new TextDecoder().decode(data))
  }

  return parseRemoteRuntimeSocketJsonTextResult(
    new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)),
  )
}

export function parseOptionalRemoteRuntimeSocketJsonMessageResult(
  data: RemoteRuntimeSocketMessageData | undefined,
): RemoteRuntimeSocketMessageResult<RemoteRuntimeJsonValue> {
  if (data !== undefined) return parseRemoteRuntimeSocketJsonMessageResult(data)
  return {
    error: new Error("Remote runtime websocket message must be JSON text."),
    ok: false,
  }
}

function parseRemoteRuntimeSocketJsonTextResult(
  text: string,
): RemoteRuntimeSocketMessageResult<RemoteRuntimeJsonValue> {
  try {
    return {
      ok: true,
      value: JSON.parse(text) as RemoteRuntimeJsonValue,
    }
  } catch {
    return {
      error: new Error("Remote runtime websocket message must be valid JSON text."),
      ok: false,
    }
  }
}

export function withRemoteRuntimeSetupTimeout<T>(input: RemoteRuntimeSetupTimeoutInput<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    input.promise,
    new Promise<T>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(input.message)), input.timeoutMs)
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout)
  })
}

export function remoteRuntimeGatewayRuntimeAttachmentSocketUrl(
  input: RemoteRuntimeGatewayRuntimeAttachmentSocketUrlInput,
): string {
  const url = new URL("/api/remote-runtime/gateway/runtime-attachments/socket", input.apiBaseUrl)
  url.protocol = url.protocol === "http:" ? "ws:" : "wss:"
  url.searchParams.set("runtimeInstallationId", input.runtimeInstallationId)
  return String(url)
}

export function remoteRuntimeHostSelectorPath(
  host: RemoteRuntimeHost,
  requestPath: string,
  input: RemoteRuntimeHostSelector | RemoteRuntimeHostStatusSelector,
): string {
  const url = new URL(requestPath, host.url)
  appendRemoteRuntimeHostSelector(url, input)
  return `${url.pathname}${url.search}`
}

export function remoteRuntimeHostPagePath(
  host: RemoteRuntimeHost,
  requestPath: string,
  input: RemoteRuntimeHostPageSelector,
): string {
  const url = new URL(requestPath, host.url)
  appendRemoteRuntimeHostSelector(url, input)
  if (input.cursor) url.searchParams.set("cursor", input.cursor)
  if (input.limit !== undefined && input.limit !== null) url.searchParams.set("limit", String(input.limit))
  return `${url.pathname}${url.search}`
}

export function remoteRuntimeHostGitStatusPath(
  host: RemoteRuntimeHost,
  requestPath: string,
  input: RemoteRuntimeHostGitStatusSelector,
): string {
  const url = new URL(requestPath, host.url)
  appendRemoteRuntimeHostSelector(url, input)
  if (input.includeDiff !== undefined && input.includeDiff !== null) {
    url.searchParams.set("includeDiff", String(input.includeDiff))
  }
  if (input.maxDiffBytes !== undefined && input.maxDiffBytes !== null) {
    url.searchParams.set("maxDiffBytes", String(input.maxDiffBytes))
  }
  return `${url.pathname}${url.search}`
}

export async function remoteRuntimeHostJsonRequest<TResponse>(
  input: RemoteRuntimeHostJsonRequestInput,
): Promise<TResponse> {
  const response = await input.deps.fetch(new URL(input.path, input.host.url), {
    ...input.init,
    headers: {
      ...Object.fromEntries(new Headers(input.deps.serverAuthHeaders({ password: input.host.password })).entries()),
      ...(input.init?.headers ? Object.fromEntries(new Headers(input.init.headers).entries()) : {}),
    },
  })
  if (!response.ok) {
    const body = await response.text()
    const statusText = response.statusText.trim()
    throw new Error(
      `Remote runtime host request failed: ${response.status}${statusText ? ` ${statusText}` : ""}${body ? `: ${body}` : ""}`,
    )
  }
  return (await response.json()) as TResponse
}

export function createRemoteRuntimeHostClient(host: RemoteRuntimeHost, deps: RemoteRuntimeHostClientDeps) {
  return {
    configureEncryption(input: { runtimeInstallationId: string; setupToken: string }): Promise<RemoteRuntimeServerStatus[]> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: "/global/remote-runtime/runtime/encryption",
        init: jsonPost(input),
      })
    },
    logs(input: RemoteRuntimeHostStatusSelector = { all: true }): Promise<RemoteRuntimeServerLogEntry[]> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostSelectorPath(host, "/global/remote-runtime/runtime/logs", input),
      })
    },
    listRemoteRuntimeActiveChats(input: RemoteRuntimeActiveChatsReadInput): Promise<RemoteRuntimeActiveChatsSnapshot> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostPagePath(host, "/global/remote-runtime/chats", input),
      })
    },
    readRemoteRuntimeChat(input: RemoteRuntimeChatReadInput): Promise<RemoteRuntimeChatSnapshot> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostSelectorPath(
          host,
          `/global/remote-runtime/chats/${encodeURIComponent(input.sessionId)}`,
          input,
        ),
      })
    },
    listRemoteRuntimeChatMessages(
      input: RemoteRuntimeChatMessagesReadInput,
    ): Promise<RemoteRuntimeChatMessagesSnapshot> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostPagePath(
          host,
          `/global/remote-runtime/chats/${encodeURIComponent(input.sessionId)}/messages`,
          input,
        ),
      })
    },
    listRemoteRuntimeProviders(input: RemoteRuntimeProviderReadInput): Promise<RemoteRuntimeProvidersSnapshot> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostSelectorPath(host, "/global/remote-runtime/providers", input),
      })
    },
    readRemoteRuntimeGitStatus(input: RemoteRuntimeHostGitStatusSelector): Promise<RemoteRuntimeGitStatusSnapshot> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostGitStatusPath(host, "/global/remote-runtime/git/status", input),
      })
    },
    listRemoteRuntimeGoals(input: RemoteRuntimeGoalsReadInput): Promise<RemoteRuntimeGoalsSnapshot> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostPagePath(host, "/global/remote-runtime/goals", input),
      })
    },
    listRemoteRuntimeAliases(input: RemoteRuntimeProviderReadInput): Promise<RemoteRuntimeAliasesSnapshot> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostSelectorPath(host, "/global/remote-runtime/aliases", input),
      })
    },
    startRemoteRuntimeChat(input: RemoteRuntimeStartChatInput): Promise<RuntimeWebSocketChatStartResponse> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: "/global/remote-runtime/runtime/chats",
        init: jsonPost(input),
      })
    },
    sendRemoteRuntimeChatMessage(input: RemoteRuntimeSendChatMessageInput): Promise<RemoteRuntimeSendMessageResponse> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: `/global/remote-runtime/runtime/chats/${encodeURIComponent(input.sessionId)}/messages`,
        init: jsonPost(input),
      })
    },
    updateRemoteRuntimeChat(input: RemoteRuntimeUpdateChatInput): Promise<RuntimeWebSocketChatStartResponse> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: `/global/remote-runtime/runtime/chats/${encodeURIComponent(input.sessionId)}`,
        init: { ...jsonPost(input), method: "PATCH" },
      })
    },
    start(input: RemoteRuntimeHostStartInput): Promise<RemoteRuntimeServerStatus> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: "/global/remote-runtime/runtime/start",
        init: jsonPost(input),
      })
    },
    publishSessionActivity(input: RemoteRuntimeSessionActivityMirrorInput): Promise<{ accepted: true }> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: "/global/remote-runtime/runtime/session-activity",
        init: jsonPost(input),
      })
    },
    status(input: RemoteRuntimeHostStatusSelector = { all: true }): Promise<RemoteRuntimeServerStatus[]> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: remoteRuntimeHostSelectorPath(host, "/global/remote-runtime/runtime/status", input),
      })
    },
    stop(input: RemoteRuntimeHostStopSelector = { all: true }): Promise<RemoteRuntimeServerStatus[]> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: "/global/remote-runtime/runtime/stop",
        init: jsonPost(input),
      })
    },
    shutdownHost(input: RemoteRuntimeHostShutdownInput = {}): Promise<{ shuttingDown: true }> {
      return remoteRuntimeHostJsonRequest({
        deps,
        host,
        path: "/global/remote-runtime/runtime/host/stop",
        init: jsonPost(input),
      })
    },
  }
}

export async function readRemoteRuntimeStatusFromHost(
  deps: RemoteRuntimeHostQueryDeps,
  input: RemoteRuntimeHostStatusSelector = { all: true },
): Promise<RemoteRuntimeServerStatus[]> {
  const host = await deps.readHost()
  if (!host) return []
  return deps.hostClient(host).status(input)
}

export async function readRemoteRuntimeLogsFromHost(
  deps: RemoteRuntimeHostQueryDeps,
  input: RemoteRuntimeHostStatusSelector = { all: true },
): Promise<RemoteRuntimeServerLogEntry[]> {
  const host = await deps.readHost()
  if (!host) return []
  return deps.hostClient(host).logs(input)
}

export function buildRemoteRuntimeLaunchAgent(
  input: RemoteRuntimeLaunchAgentInput,
): RemoteRuntimeLaunchAgentDefinition {
  const programArguments = [
    input.executable,
    ...(input.executableArgs ?? []),
    "remote",
    "start",
    "--account-id",
    input.accountId,
    "--api-url",
    input.apiBaseUrl,
    "--runtime-installation-id",
    input.runtimeInstallationId,
    "--poll-interval-ms",
    String(input.pollIntervalMs ?? 1000),
  ]
  const plist = remoteRuntimeLaunchAgentPlistDocument({
    EnvironmentVariables: {
      INTERBASE_RUNTIME_CLIENT_LAUNCHD_CHILD: "1",
    },
    KeepAlive: false,
    Label: input.label,
    ProgramArguments: programArguments,
    RunAtLoad: true,
    StandardErrorPath: input.logPath,
    StandardOutPath: input.logPath,
    StartInterval: input.intervalSeconds,
    WorkingDirectory: input.directory,
  })
  return {
    label: input.label,
    plist,
    plistPath: input.plistPath,
    programArguments,
  }
}

export async function installRemoteRuntimeLaunchAgent<TState extends RemoteRuntimeLaunchdState>(
  deps: RemoteRuntimeLaunchdManagerDeps<TState>,
  input: InstallRemoteRuntimeLaunchAgentInput,
): Promise<RemoteRuntimeLaunchAgentState | undefined> {
  if (!deps.shouldManage()) return undefined

  const intervalSeconds = Math.max(60, Math.floor(input.startIntervalSeconds ?? 300))
  const label = deps.launchAgentLabel()
  const plistPath = remoteRuntimeHostJoinPath(deps.launchAgentsDir(), `${label}.plist`)
  const logPath = deps.logPath()
  const command = deps.hostCommand()
  const state = await deps.readState()
  if (state.launchd && state.launchd.plistPath !== plistPath) {
    deps.launchctl(["bootout", deps.launchctlGuiDomain(), state.launchd.plistPath], { tolerateFailure: true })
    await deps.removeFile(state.launchd.plistPath, { force: true })
  }
  const definition = buildRemoteRuntimeLaunchAgent({
    accountId: input.accountId,
    apiBaseUrl: input.apiBaseUrl,
    directory: input.directory,
    executable: command.executable,
    executableArgs: command.args,
    intervalSeconds,
    label,
    logPath,
    plistPath,
    pollIntervalMs: input.pollIntervalMs,
    runtimeInstallationId: input.runtimeInstallationId,
  })

  await deps.mkdir(deps.dirname(plistPath), { recursive: true })
  await deps.mkdir(deps.dirname(logPath), { recursive: true })
  await deps.writeFile(plistPath, definition.plist, { mode: 0o644 })
  deps.launchctl(["bootout", deps.launchctlGuiDomain(), plistPath], { tolerateFailure: true })
  deps.launchctl(["bootstrap", deps.launchctlGuiDomain(), plistPath])
  deps.launchctl(["enable", `${deps.launchctlGuiDomain()}/${label}`], { tolerateFailure: true })
  deps.launchctl(["kickstart", "-k", `${deps.launchctlGuiDomain()}/${label}`], { tolerateFailure: true })

  return {
    intervalSeconds,
    label,
    plistPath,
    runtimeInstallationId: input.runtimeInstallationId,
  }
}

export async function removeRemoteRuntimeLaunchAgent<TState extends RemoteRuntimeLaunchdState>(
  deps: RemoteRuntimeLaunchdManagerDeps<TState>,
  input: { readonly runtimeInstallationId?: string },
): Promise<RemoteRuntimeLaunchAgentState | undefined> {
  const state = await deps.readState()
  const launchd = state.launchd
  if (!launchd) return undefined
  if (input.runtimeInstallationId && launchd.runtimeInstallationId !== input.runtimeInstallationId) {
    return launchd
  }

  if (deps.shouldManage()) {
    deps.launchctl(["bootout", deps.launchctlGuiDomain(), launchd.plistPath], { tolerateFailure: true })
  }
  await deps.removeFile(launchd.plistPath, { force: true })
  await deps.writeState({ ...state, launchd: undefined })
  return undefined
}

export async function startRemoteRuntimesOnHost<
  TState extends RemoteRuntimeHostLifecycleState<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  TLocalGatewayAuthority = never,
  TRuntimeEncryptionKey = never,
>(
  deps: RemoteRuntimeHostLifecycleDeps<TState, TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  input: RemoteRuntimeHostLifecycleStartManyInput<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
): Promise<readonly RemoteRuntimeServerStatus[]> {
  const directory = input.directories.find((entry) => entry.enabled)
  if (!directory) return []
  const allowedDirectories = input.directories
    .filter((entry) => entry.enabled)
    .map((entry) => ({
      directoryId: entry.directoryId,
      displayName: remoteRuntimeDirectoryDisplayName(entry.path),
      path: entry.path,
    }))
  const host = await deps.ensureHost()
  const status = await deps.hostClient(host).start({
    accountId: input.accountId,
    allowedDirectories,
    apiBaseUrl: input.apiBaseUrl,
    authorizationToken: input.authorizationToken,
    directoryId: directory.directoryId,
    directory: directory.path,
    localGatewayAuthority: input.localGatewayAuthority,
    pollIntervalMs: input.pollIntervalMs,
    runtimeEncryptionKey: input.runtimeEncryptionKey,
    runtimeInstallationId: input.runtimeInstallationId,
  })
  const state = await deps.readState()
  const launchd =
    input.launchd?.enabled === false
      ? state.launchd
      : ((await deps.installLaunchAgent({
          accountId: status.accountId,
          apiBaseUrl: status.apiBaseUrl,
          directory: directory.path,
          pollIntervalMs: input.pollIntervalMs,
          runtimeInstallationId: status.runtimeInstallationId,
          startIntervalSeconds: input.launchd?.intervalSeconds,
        })) ?? state.launchd)
  await deps.writeState({
    ...state,
    host: { ...state.host, ...host },
    launchd,
    runtime: {
      accountId: status.accountId,
      allowedDirectories: status.allowedDirectories ?? allowedDirectories,
      apiBaseUrl: status.apiBaseUrl,
      directoryId: directory.directoryId,
      directory: directory.path,
      gatewayRuntimeAttachmentId: status.gatewayRuntimeAttachmentId,
      localGatewayAuthority:
        input.localGatewayAuthority ??
        (state.runtime?.runtimeInstallationId === status.runtimeInstallationId
          ? state.runtime.localGatewayAuthority
          : undefined),
      runtimeEncryptionKey: input.runtimeEncryptionKey,
      runtimeInstallationId: status.runtimeInstallationId,
      startedAt: status.startedAt,
      state: status.state,
    },
  })
  return [status]
}

export async function stopRemoteRuntimeOnHost<
  TState extends RemoteRuntimeHostLifecycleState<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  TLocalGatewayAuthority = never,
  TRuntimeEncryptionKey = never,
>(
  deps: RemoteRuntimeHostLifecycleDeps<TState, TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  input: RemoteRuntimeHostStopSelector,
): Promise<readonly RemoteRuntimeServerStatus[]> {
  const host = await deps.readHost()
  if (!host) return []
  const client = deps.hostClient(host)
  const stopped = await client.stop(input)
  const shouldStopHost =
    "all" in input && input.all
      ? true
      : (await client.status().catch(() => [])).length === 0
  if (shouldStopHost && host.pid) {
    await deps.shutdownHost(host)
    const state = await deps.readState()
    await deps.writeState({
      ...state,
      host: undefined,
      runtime: state.runtime
        ? {
            ...state.runtime,
            gatewayRuntimeAttachmentId: undefined,
            startedAt: undefined,
            state: "stopped",
          }
        : undefined,
    })
  }
  return stopped
}

export async function configureRemoteRuntimeSetupRuntimeEncryptionOnHost<
  TState extends RemoteRuntimeHostState<TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  TLocalGatewayAuthority = never,
  TRuntimeEncryptionKey = unknown,
>(
  deps: RemoteRuntimeHostEncryptionDeps<TState, TLocalGatewayAuthority, TRuntimeEncryptionKey>,
  input: {
    readonly runtimeInstallationId: string
    readonly setupToken: string
  },
): Promise<readonly RemoteRuntimeServerStatus[]> {
  const host = await deps.ensureHost()
  const statuses = await deps.hostClient(host).configureEncryption(input)
  const state = await deps.readState()
  if (state.runtime?.runtimeInstallationId === input.runtimeInstallationId) {
    await deps.writeState({
      ...state,
      runtime: {
        ...state.runtime,
        runtimeEncryptionKey: (await remoteRuntimeSetupRuntimeEncryptionKey(input.setupToken)) as TRuntimeEncryptionKey,
      },
    })
  }
  return statuses
}

export async function installRemoteRuntimeSetupRuntimeLaunchAgent<
  TState extends RemoteRuntimeHostState = RemoteRuntimeHostState,
>(
  deps: RemoteRuntimeSetupRuntimeLaunchAgentDeps<TState>,
  input: RemoteRuntimeSetupRuntimeLaunchAgentInput,
): Promise<RemoteRuntimeLaunchAgentState | undefined> {
  if (input.enabled === false) {
    return undefined
  }
  const launchd = await deps.installLaunchAgent({
    accountId: input.accountId,
    apiBaseUrl: input.apiBaseUrl,
    directory: input.directory,
    pollIntervalMs: input.pollIntervalMs,
    runtimeInstallationId: input.runtimeInstallationId,
    startIntervalSeconds: input.startIntervalSeconds,
  })
  if (launchd) {
    const state = await deps.readState()
    await deps.writeState({ ...state, launchd })
  }
  return launchd
}

export function createRemoteRuntimeSessionActivityMirror(
  deps: RemoteRuntimeSessionActivityMirrorDeps,
): RemoteRuntimeSessionActivityMirror {
  let cachedHost: RemoteRuntimeHost | null | undefined
  let cachedAt = 0
  const now = deps.now ?? Date.now

  return {
    async publishGlobalEvent(input) {
      if (!isRemoteRuntimeSessionActivityMirrorInput(input) || !shouldMirrorSessionActivityEvent(input.event.type)) {
        return
      }
      const host = await cachedRemoteRuntimeHost()
      if (!host) {
        return
      }
      await remoteRuntimeHostJsonRequest({
        deps,
        host,
        init: {
          body: JSON.stringify(input),
          headers: { "content-type": "application/json" },
          method: "POST",
        },
        path: "/global/remote-runtime/runtime/session-activity",
      })
    },
  }

  async function cachedRemoteRuntimeHost() {
    const timestamp = now()
    if (cachedHost !== undefined && timestamp - cachedAt < 1000) {
      return cachedHost ?? undefined
    }
    const state = await deps.readHostState().catch((): RemoteRuntimeHostState => ({}))
    cachedHost = state.host ?? null
    cachedAt = timestamp
    return cachedHost ?? undefined
  }
}

export async function pickRemoteRuntimeDirectoriesWithPrompt(
  input: RemoteRuntimeDirectoryPickerInput,
  deps: RemoteRuntimeDirectoryPromptPickerDeps,
): Promise<readonly string[] | null> {
  const selection = await deps.directorySelector({
    allowCancel: true,
    basePath: input.basePath,
    hideGitChildren: true,
    initialSelectedPaths: [input.basePath],
    message: input.message ?? "Which directories should remote runtime clients be allowed to use agents in?",
    multiple: true,
    pageSize: input.pageSize ?? 24,
    search: true,
  })
  if (selection === null) {
    return null
  }
  return selection.map((item) => item.path)
}

export async function searchRemoteRuntimeDirectories(
  deps: RemoteRuntimeDirectorySearchDeps,
  input: {
    readonly maxDepth?: number
    readonly maxResults?: number
    readonly root: string
    readonly term: string
  },
): Promise<RemoteRuntimeDirectorySearchResult[]> {
  const term = input.term.trim().toLowerCase()
  if (!term) {
    return []
  }
  const maxDepth = input.maxDepth ?? 5
  const maxResults = input.maxResults ?? 50
  const root = deps.resolve(input.root)
  const results: RemoteRuntimeDirectorySearchResult[] = []
  const seen = new Set<string>()

  async function visit(directory: string, depth: number): Promise<void> {
    if (results.length >= maxResults || depth > maxDepth || seen.has(directory)) {
      return
    }
    seen.add(directory)
    let entries: readonly RemoteRuntimeDirectorySearchDirent[]
    try {
      entries = await deps.readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    if (entries.some((entry) => entry.name === ".git" && entry.isDirectory())) {
      return
    }
    for (const entry of entries) {
      if (results.length >= maxResults) {
        return
      }
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue
      }
      const child = deps.join(directory, entry.name)
      if (entry.name.toLowerCase().includes(term) || child.toLowerCase().includes(term)) {
        results.push({ path: child })
      }
      await visit(child, depth + 1)
    }
  }

  await visit(root, 0)
  return results
}

export async function buildRemoteRuntimeDirectoryExplorerTree(
  deps: RemoteRuntimeDirectoryExplorerTreeDeps,
  input: {
    readonly currentDirectory: string
    readonly homeDirectory: string
  },
): Promise<RemoteRuntimeDirectoryExplorerTreeItem[]> {
  const home = deps.resolve(input.homeDirectory)
  const current = deps.resolve(input.currentDirectory)
  const expanded = remoteRuntimeDirectoryExpandedPath(home, current, deps)
  const expandedSet = new Set(expanded)
  const rows: RemoteRuntimeDirectoryExplorerTreeItem[] = []
  const seen = new Set<string>()

  async function append(directory: string, depth: number, isCurrentDirectory: boolean): Promise<void> {
    const resolved = deps.resolve(directory)
    if (seen.has(resolved)) {
      return
    }
    seen.add(resolved)
    const entries = await safeReadRemoteRuntimeDirectoryExplorerEntries(deps, resolved)
    const isRepositoryRoot = entries.some((entry) => entry.name === ".git" && entry.isDirectory())
    rows.push({
      depth,
      hint: isCurrentDirectory ? "selected by default" : undefined,
      isCurrentDirectory,
      isRepositoryRoot,
      label: isCurrentDirectory
        ? `${deps.basename(resolved) || resolved} (Current directory)`
        : depth === 0
          ? resolved
          : deps.basename(resolved),
      path: resolved,
    })
    if (isRepositoryRoot || !expandedSet.has(resolved)) {
      return
    }
    const children = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => deps.join(resolved, entry.name))
      .sort((left, right) => deps.basename(left).localeCompare(deps.basename(right)))
    for (const child of children) {
      await append(child, depth + 1, deps.resolve(child) === current)
    }
  }

  await append(home, 0, home === current)
  return rows
}

export async function selectRemoteRuntimeSetupDirectories(
  deps: RemoteRuntimeSetupDirectorySelectionDeps,
  input: {
    readonly directory?: string | readonly string[]
    readonly defaultToCurrentDirectory?: boolean
  } = {},
): Promise<RemoteRuntimeDirectoryAllowlistEntry[]> {
  const explicitDirectories = typeof input.directory === "string" ? [input.directory] : [...(input.directory ?? [])]
  if (explicitDirectories.length > 0) {
    return await Promise.all(explicitDirectories.map((directory) => deps.store.add({ directory, enabled: true })))
  }

  const state = await deps.store.read()
  if (!deps.isInteractive()) {
    const enabled = state.directories.filter((entry) => entry.enabled)
    if (enabled.length > 0) {
      return enabled
    }
    if (input.defaultToCurrentDirectory === false) {
      return []
    }
    return [await deps.store.add({ directory: deps.cwd(), enabled: true })]
  }

  const picked = await deps.pickDirectories({
    basePath: deps.cwd(),
    message: "Which directories should remote runtime clients be allowed to use agents in?",
  })
  if (picked === null) {
    return []
  }
  if (picked.length > 0) {
    const unique = uniqueRemoteRuntimeDirectorySelections(picked)
    if (deps.confirmDirectories && !(await deps.confirmDirectories({ directories: unique }))) {
      return []
    }
    return await addSelectedClientDirectories(deps.store, unique)
  }
  if (state.directories.length > 0) {
    return state.directories.filter((entry) => entry.enabled)
  }
  if (input.defaultToCurrentDirectory === false) {
    return []
  }
  return [await deps.store.add({ directory: deps.cwd(), enabled: true })]
}

async function addSelectedClientDirectories(
  store: RemoteRuntimeDirectoryAllowlistStore,
  selected: readonly string[],
): Promise<RemoteRuntimeDirectoryAllowlistEntry[]> {
  const unique = uniqueRemoteRuntimeDirectorySelections(selected)
  return await Promise.all(unique.map((directory) => store.add({ directory, enabled: true })))
}

function uniqueRemoteRuntimeDirectorySelections(selected: readonly string[]): string[] {
  return [...new Set(selected)]
}

export function projectRemoteRuntimeMessagePartPayload(
  part: Record<string, unknown>,
): RemoteRuntimeChatMessagePartPayload | null {
  const type = remoteRuntimePartStringValue(part.type)
  if (!type) {
    return null
  }

  const payload: Record<string, unknown> = { type }
  remoteRuntimePartCopyStringField(part, payload, "id")
  remoteRuntimePartCopyStringField(part, payload, "messageID")

  if (type === "text") {
    remoteRuntimePartCopyStringField(part, payload, "text")
    if (typeof part.synthetic === "boolean") {
      payload.synthetic = part.synthetic
    }
    const metadata = remoteRuntimePartTextMetadata(remoteRuntimePartRecordValue(part.metadata))
    if (metadata) {
      payload.metadata = metadata
    }
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "reasoning") {
    remoteRuntimePartCopyStringField(part, payload, "text")
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "tool") {
    remoteRuntimePartCopyStringField(part, payload, "tool")
    const state = remoteRuntimePartToolState(
      remoteRuntimePartStringValue(part.tool),
      remoteRuntimePartRecordValue(part.state),
    )
    if (state) {
      payload.state = state
    }
    const metadata = remoteRuntimePartToolMetadata(
      remoteRuntimePartStringValue(part.tool),
      remoteRuntimePartRecordValue(part.metadata),
      remoteRuntimePartRecordValue(part.state),
    )
    if (metadata) {
      payload.metadata = metadata
    }
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "file") {
    remoteRuntimePartCopyStringField(part, payload, "filename")
    remoteRuntimePartCopyStringField(part, payload, "mime")
    remoteRuntimePartCopyStringField(part, payload, "url")
    const source = remoteRuntimePartRecordValue(part.source)
    if (source) {
      payload.source = source
    }
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "patch") {
    if (Array.isArray(part.files)) {
      payload.files = part.files
    }
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "subtask") {
    remoteRuntimePartCopyStringField(part, payload, "description")
    remoteRuntimePartCopyStringField(part, payload, "agent")
    remoteRuntimePartCopyStringField(part, payload, "prompt")
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "agent") {
    remoteRuntimePartCopyStringField(part, payload, "name")
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "snapshot" || type === "step-start") {
    remoteRuntimePartCopyStringField(part, payload, "snapshot")
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "step-finish") {
    remoteRuntimePartCopyStringField(part, payload, "reason")
    if (typeof part.cost === "number" || typeof part.cost === "string") {
      payload.cost = part.cost
    }
    const tokens = remoteRuntimePartRecordValue(part.tokens)
    if (tokens) {
      payload.tokens = tokens
    }
    remoteRuntimePartCopyStringField(part, payload, "snapshot")
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "retry") {
    if (typeof part.attempt === "number") {
      payload.attempt = part.attempt
    }
    const error = remoteRuntimePartRecordValue(part.error)
    if (error) {
      payload.error = error
    }
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  if (type === "compaction") {
    if (typeof part.auto === "boolean") {
      payload.auto = part.auto
    }
    if (typeof part.overflow === "boolean") {
      payload.overflow = part.overflow
    }
    if (part.phase === "manual" || part.phase === "preTurn" || part.phase === "midTurn") {
      payload.phase = part.phase
    }
    if (
      part.reason === "contextLimit" ||
      part.reason === "modelDownshift" ||
      part.reason === "userRequested" ||
      part.reason === "overflow"
    ) {
      payload.reason = part.reason
    }
    remoteRuntimePartCopyStringField(part, payload, "tail_start_id")
    return sanitizeRemoteRuntimeMessagePartPayload(payload)
  }

  return null
}

export function sanitizeRemoteRuntimeMessagePartPayload(
  payload: Record<string, unknown>,
): RemoteRuntimeChatMessagePartPayload | null {
  const type = remoteRuntimePartStringValue(payload.type)
  const base = {
    ...(typeof payload.id === "string" ? { id: payload.id } : {}),
    ...(typeof payload.messageID === "string" ? { messageID: payload.messageID } : {}),
  }
  switch (type) {
    case "text":
    case "reasoning": {
      const metadata = remoteRuntimePartJsonObjectValue(payload.metadata)
      return {
        ...base,
        ...(metadata ? { metadata } : {}),
        ...(typeof payload.synthetic === "boolean" ? { synthetic: payload.synthetic } : {}),
        ...(typeof payload.text === "string" ? { text: payload.text } : {}),
        type,
      }
    }
    case "tool": {
      const input = remoteRuntimePartJsonObjectValue(payload.input)
      const metadata = remoteRuntimePartJsonObjectValue(payload.metadata)
      const state = remoteRuntimePartJsonObjectValue(payload.state)
      return {
        ...base,
        ...(input ? { input } : {}),
        ...(metadata ? { metadata } : {}),
        ...(state ? { state } : {}),
        ...(typeof payload.tool === "string" ? { tool: payload.tool } : {}),
        type,
      }
    }
    case "file": {
      const source = remoteRuntimePartJsonObjectValue(payload.source)
      return {
        ...base,
        ...(typeof payload.filename === "string" ? { filename: payload.filename } : {}),
        ...(typeof payload.mime === "string" ? { mime: payload.mime } : {}),
        ...(source ? { source } : {}),
        ...(typeof payload.url === "string" ? { url: payload.url } : {}),
        type,
      }
    }
    case "patch": {
      const files = remoteRuntimePartJsonArrayValue(payload.files)
      return { ...base, ...(files ? { files } : {}), type }
    }
    case "snapshot":
    case "step-start":
      return { ...base, ...(typeof payload.snapshot === "string" ? { snapshot: payload.snapshot } : {}), type }
    case "step-finish": {
      const tokens = remoteRuntimePartJsonObjectValue(payload.tokens)
      return {
        ...base,
        ...(typeof payload.cost === "number" || typeof payload.cost === "string" ? { cost: payload.cost } : {}),
        ...(typeof payload.reason === "string" ? { reason: payload.reason } : {}),
        ...(typeof payload.snapshot === "string" ? { snapshot: payload.snapshot } : {}),
        ...(tokens ? { tokens } : {}),
        type,
      }
    }
    case "subtask":
      return {
        ...base,
        ...(typeof payload.agent === "string" ? { agent: payload.agent } : {}),
        ...(typeof payload.description === "string" ? { description: payload.description } : {}),
        ...(typeof payload.prompt === "string" ? { prompt: payload.prompt } : {}),
        type,
      }
    case "agent":
      return { ...base, ...(typeof payload.name === "string" ? { name: payload.name } : {}), type }
    case "retry":
      return {
        ...base,
        ...(typeof payload.attempt === "number" ? { attempt: payload.attempt } : {}),
        ...(remoteRuntimePartIsJsonValue(payload.error) ? { error: payload.error } : {}),
        type,
      }
    case "compaction":
      return {
        ...base,
        ...(typeof payload.auto === "boolean" ? { auto: payload.auto } : {}),
        ...(typeof payload.overflow === "boolean" ? { overflow: payload.overflow } : {}),
        ...(payload.phase === "manual" || payload.phase === "preTurn" || payload.phase === "midTurn"
          ? { phase: payload.phase }
          : {}),
        ...(payload.reason === "contextLimit" ||
        payload.reason === "modelDownshift" ||
        payload.reason === "userRequested" ||
        payload.reason === "overflow"
          ? { reason: payload.reason }
          : {}),
        ...(typeof payload.tail_start_id === "string" ? { tail_start_id: payload.tail_start_id } : {}),
        type,
      }
    default:
      return null
  }
}

function remoteRuntimePartTextMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || typeof metadata.kind !== "string") {
    return null
  }
  return { kind: metadata.kind }
}

function remoteRuntimePartToolState(tool: string | null, state: Record<string, unknown> | null) {
  if (!state) {
    return null
  }
  const status = remoteRuntimePartStringValue(state?.status)
  if (!status) {
    return null
  }

  const payload: Record<string, unknown> = { status }
  remoteRuntimePartCopyStringField(state, payload, "title")

  const input = remoteRuntimePartToolInput(tool, remoteRuntimePartRecordValue(state?.input))
  if (input) {
    payload.input = input
  }

  if (status === "completed" && typeof state?.output === "string") {
    payload.output = state.output
  }
  if (status === "error" && typeof state?.error === "string") {
    payload.error = state.error
  }

  const metadata = remoteRuntimePartToolMetadata(tool, remoteRuntimePartRecordValue(state?.metadata), state)
  if (metadata) {
    payload.metadata = metadata
  }

  const compacted = remoteRuntimePartRecordValue(state?.time)?.compacted
  if (compacted !== undefined) {
    payload.time = { compacted: true }
  }

  return payload
}

function remoteRuntimePartToolInput(tool: string | null, input: Record<string, unknown> | null) {
  if (!input) {
    return null
  }

  if (tool === "bash") {
    return remoteRuntimePartObject(input, ["command", "description", "workdir"])
  }
  if (tool === "read") {
    return remoteRuntimePartObject(input, ["filePath", "path"])
  }
  if (tool === "grep" || tool === "glob") {
    return remoteRuntimePartObject(input, ["pattern", "path"])
  }
  if (tool === "webfetch") {
    return remoteRuntimePartObject(input, ["url"])
  }
  if (tool === "websearch") {
    return remoteRuntimePartObject(input, ["query"])
  }
  if (tool === "task") {
    return remoteRuntimePartObject(input, ["description", "subagent_type"])
  }
  if (tool === "edit") {
    return remoteRuntimePartObject(input, ["filePath"])
  }
  if (tool === "write") {
    return remoteRuntimePartObject(input, ["content", "filePath"])
  }
  if (tool === "apply_patch") {
    return remoteRuntimePartObject(input, ["filePath"])
  }
  if (tool === "todowrite") {
    return remoteRuntimePartObject(input, ["todos"])
  }
  if (tool === "question") {
    return remoteRuntimePartObject(input, ["questions"])
  }
  if (tool === "skill") {
    return remoteRuntimePartObject(input, ["name"])
  }
  return remoteRuntimePartScalarObject(input)
}

function remoteRuntimePartToolMetadata(
  tool: string | null,
  metadata: Record<string, unknown> | null,
  state: Record<string, unknown> | null,
) {
  const payload: Record<string, unknown> = {}

  if (tool === "bash") {
    const output = remoteRuntimePartStringValue(metadata?.output) ?? remoteRuntimePartStringValue(state?.output)
    if (output) {
      payload.output = output
    }
    return remoteRuntimePartObjectOrNull(payload)
  }
  if (tool === "read") {
    remoteRuntimePartCopyArrayField(metadata, payload, "loaded")
    return remoteRuntimePartObjectOrNull(payload)
  }
  if (tool === "grep") {
    remoteRuntimePartCopyField(metadata, payload, "matches")
    return remoteRuntimePartObjectOrNull(payload)
  }
  if (tool === "glob") {
    remoteRuntimePartCopyField(metadata, payload, "count")
    return remoteRuntimePartObjectOrNull(payload)
  }
  if (tool === "websearch") {
    remoteRuntimePartCopyField(metadata, payload, "numResults")
    return remoteRuntimePartObjectOrNull(payload)
  }
  if (tool === "task") {
    remoteRuntimePartCopyObjectField(metadata, payload, "sessionId")
    remoteRuntimePartCopyField(metadata, payload, "sessionId")
    return remoteRuntimePartObjectOrNull(payload)
  }
  if (tool === "edit" || tool === "write" || tool === "apply_patch") {
    remoteRuntimePartCopyObjectField(metadata, payload, "filediff")
    remoteRuntimePartCopyArrayField(metadata, payload, "files")
    remoteRuntimePartCopyField(metadata, payload, "diff")
    remoteRuntimePartCopyObjectField(metadata, payload, "diagnostics")
    return remoteRuntimePartObjectOrNull(payload)
  }
  if (tool === "todowrite") {
    remoteRuntimePartCopyArrayField(metadata, payload, "todos")
    return remoteRuntimePartObjectOrNull(payload)
  }
  if (tool === "question") {
    remoteRuntimePartCopyArrayField(metadata, payload, "answers")
    return remoteRuntimePartObjectOrNull(payload)
  }

  return null
}

function remoteRuntimePartObject(source: Record<string, unknown>, keys: readonly string[]) {
  const payload: Record<string, unknown> = {}
  for (const key of keys) {
    remoteRuntimePartCopyField(source, payload, key)
  }
  return remoteRuntimePartObjectOrNull(payload)
}

function remoteRuntimePartScalarObject(source: Record<string, unknown>) {
  const payload: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) {
    const value = source[key]
    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      payload[key] = value
    }
  }
  return remoteRuntimePartObjectOrNull(payload)
}

function remoteRuntimePartCopyField(
  source: Record<string, unknown> | null | undefined,
  target: Record<string, unknown>,
  key: string,
) {
  if (!source) {
    return
  }
  const value = source[key]
  if (value !== undefined) {
    target[key] = value
  }
}

function remoteRuntimePartCopyStringField(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  key: string,
) {
  const value = source[key]
  if (typeof value === "string") {
    target[key] = value
  }
}

function remoteRuntimePartCopyArrayField(
  source: Record<string, unknown> | null | undefined,
  target: Record<string, unknown>,
  key: string,
) {
  if (!source) {
    return
  }
  const value = source[key]
  if (Array.isArray(value)) {
    target[key] = value
  }
}

function remoteRuntimePartCopyObjectField(
  source: Record<string, unknown> | null | undefined,
  target: Record<string, unknown>,
  key: string,
) {
  const value = remoteRuntimePartRecordValue(source?.[key])
  if (value) {
    target[key] = value
  }
}

function remoteRuntimePartObjectOrNull(value: Record<string, unknown>) {
  return Object.keys(value).length > 0 ? value : null
}

function remoteRuntimePartRecordValue(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function remoteRuntimePartStringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null
}

function remoteRuntimePartJsonObjectValue(
  value: unknown,
): { [key: string]: RemoteRuntimeChatMessagePartJSONValue } | null {
  const record = remoteRuntimePartRecordValue(value)
  if (!record) return null
  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [string, RemoteRuntimeChatMessagePartJSONValue] =>
      remoteRuntimePartIsJsonValue(entry[1]),
    ),
  )
}

function remoteRuntimePartJsonArrayValue(value: unknown): RemoteRuntimeChatMessagePartJSONValue[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(remoteRuntimePartIsJsonValue)
}

function remoteRuntimePartIsJsonValue(value: unknown): value is RemoteRuntimeChatMessagePartJSONValue {
  const record = remoteRuntimePartRecordValue(value)
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string" ||
    (Array.isArray(value) && value.every(remoteRuntimePartIsJsonValue)) ||
    (record !== null && Object.values(record).every(remoteRuntimePartIsJsonValue))
  )
}

function remoteRuntimeDirectoryExpandedPath(
  homeDirectory: string,
  currentDirectory: string,
  deps: Pick<RemoteRuntimeDirectoryExplorerTreeDeps, "basename" | "join" | "resolve">,
): string[] {
  const home = deps.resolve(homeDirectory)
  const current = deps.resolve(currentDirectory)
  if (home === current) {
    return [home]
  }
  const relative = path.relative(home, current)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return [home]
  }
  const expanded = [home]
  let next = home
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    next = deps.resolve(deps.join(next, segment))
    expanded.push(next)
  }
  return expanded
}

async function safeReadRemoteRuntimeDirectoryExplorerEntries(
  deps: Pick<RemoteRuntimeDirectoryExplorerTreeDeps, "readdir">,
  directory: string,
): Promise<readonly RemoteRuntimeDirectoryExplorerDirent[]> {
  try {
    return await deps.readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

function shouldMirrorSessionActivityEvent(type: string): boolean {
  return (
    type === "session.created" ||
    type === "session.updated" ||
    type === "session.deleted" ||
    type === "session.status" ||
    type === "message.updated" ||
    type === "message.removed" ||
    type === "message.part.removed"
  )
}

export function isRemoteRuntimeSessionActivityMirrorInput(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeJsonValue & RemoteRuntimeSessionActivityMirrorInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  const record = value as { readonly [key: string]: RemoteRuntimeJsonValue }
  if (typeof record.directory !== "string" || record.directory.length === 0) {
    return false
  }
  if (typeof record.event !== "object" || record.event === null || Array.isArray(record.event)) {
    return false
  }
  const event = record.event as { readonly [key: string]: RemoteRuntimeJsonValue }
  return (
    typeof event.type === "string" &&
    event.type.length > 0 &&
    typeof event.properties === "object" &&
    event.properties !== null &&
    !Array.isArray(event.properties)
  )
}

export function resolveRemoteRuntimeHostCommand(input: RemoteRuntimeHostCommandInput): RemoteRuntimeHostCommand {
  const configuredBinPath = input.binPath?.trim()
  if (configuredBinPath) {
    return {
      args: input.args,
      executable: configuredBinPath,
    }
  }
  const executable = input.execPath
  const executableName = input.executableBasename(executable).toLowerCase()
  const script = input.scriptPath?.trim()
  if (executableName === "bun" && script) {
    return {
      args: [script, ...input.args],
      executable,
    }
  }
  return {
    args: input.args,
    executable,
  }
}

export function createRemoteRuntimeHostResolver<TState extends RemoteRuntimeHostResolverState>(
  deps: RemoteRuntimeHostResolverDeps<TState>,
): RemoteRuntimeHostResolver {
  return {
    async ensure(): Promise<RemoteRuntimeHost> {
      const configured = configuredRemoteRuntimeHost(deps.environment)
      if (configured) return configured

      const state = await deps.readState()
      if (state.host && (await deps.isHostCompatible(state.host))) {
        return state.host
      }
      if (state.host) {
        await deps.stopHost?.(state.host).catch(() => undefined)
        await deps.writeState({ ...state, host: undefined })
      }

      const configuredPort = deps.environment.INTERBASE_RUNTIME_CLIENT_HOST_PORT?.trim()
      let port = Number(configuredPort || deps.defaultPort || 4096)
      if (!configuredPort && (await deps.isPortOccupiedByIncompatibleHost(port))) {
        port = await deps.freePort()
      }
      const password = deps.environment.INTERBASE_SERVER_PASSWORD?.trim() || deps.randomUUID()
      const url = `http://127.0.0.1:${port}`
      const command = deps.hostCommand(["serve", "--hostname", "127.0.0.1", "--port", String(port)])
      const child = deps.spawnDetached(command.executable, command.args, {
        detached: true,
        env: {
          ...deps.environment,
          INTERBASE_SERVER_PASSWORD: password,
        },
        stdio: "ignore",
      })
      child.unref()

      const host = { password, pid: child.pid, url }
      await deps.writeState({ ...state, host })
      try {
        await deps.waitForHost(host)
      } catch (error) {
        await deps.stopHost?.(host).catch(() => undefined)
        await deps.writeState({ ...state, host: undefined })
        throw error
      }
      return host
    },
    async read(): Promise<RemoteRuntimeHost | undefined> {
      const configured = configuredRemoteRuntimeHost(deps.environment)
      if (configured) return configured
      const state = await deps.readState()
      if (state.host && (await deps.isHostCompatible(state.host))) return state.host
      return undefined
    },
  }
}

function configuredRemoteRuntimeHost(environment: RemoteRuntimeHostResolverEnvironment): RemoteRuntimeHost | undefined {
  const configuredURL = environment.INTERBASE_RUNTIME_CLIENT_HOST_URL?.trim()
  if (!configuredURL) return undefined
  return {
    password: environment.INTERBASE_RUNTIME_CLIENT_HOST_PASSWORD?.trim() || undefined,
    url: configuredURL,
  }
}

function remoteRuntimeHostJoinPath(base: string, name: string): string {
  return base.endsWith("/") ? `${base}${name}` : `${base}/${name}`
}

function remoteRuntimeLaunchAgentPlistDocument(value: {
  readonly [key: string]: RemoteRuntimeLaunchAgentPlistValue
}): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    remoteRuntimeLaunchAgentPlistValue(value),
    "</plist>",
    "",
  ].join("\n")
}

function remoteRuntimeLaunchAgentPlistValue(value: RemoteRuntimeLaunchAgentPlistValue): string {
  if (typeof value === "string") return `<string>${remoteRuntimeLaunchAgentPlistEscape(value)}</string>`
  if (typeof value === "number") return `<integer>${value}</integer>`
  if (typeof value === "boolean") return value ? "<true/>" : "<false/>"
  if (Array.isArray(value)) {
    return `<array>${value.map((item) => `\n${remoteRuntimeLaunchAgentPlistValue(item)}`).join("")}\n</array>`
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).filter(([, item]) => item !== undefined)
    return `<dict>${entries.map(([key, item]) => `\n<key>${remoteRuntimeLaunchAgentPlistEscape(key)}</key>\n${remoteRuntimeLaunchAgentPlistValue(item)}`).join("")}\n</dict>`
  }
  return "<string></string>"
}

function remoteRuntimeLaunchAgentPlistEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function appendRemoteRuntimeHostSelector(url: URL, input: RemoteRuntimeHostSelector | RemoteRuntimeHostStatusSelector): void {
  if ("all" in input && input.all) {
    url.searchParams.set("all", "true")
    return
  }
  if (input.directoryId) url.searchParams.set("directoryId", input.directoryId)
  if (input.directory) url.searchParams.set("directory", input.directory)
  if (input.runtimeInstallationId) url.searchParams.set("runtimeInstallationId", input.runtimeInstallationId)
}

export function remoteRuntimeEnvelopeRequestId<TPayload>(input: RemoteRuntimeEnvelopeRequestIdInput<TPayload>): string {
  const envelope = input.envelope
  if ("requestId" in envelope && typeof envelope.requestId === "string" && envelope.requestId.length > 0) {
    return envelope.requestId
  }
  if (envelope.type === "event") {
    return `event_${envelope.event.sessionId}_${envelope.event.sequence}`
  }
  return input.fallbackRequestId()
}

export function sleepRemoteRuntime(input: RemoteRuntimeSleepInput): Promise<void> {
  if (input.signal?.aborted || input.milliseconds <= 0) return Promise.resolve()
  return sleepTimeout(input.milliseconds, undefined, { signal: input.signal }).then(
    () => undefined,
    () => undefined,
  )
}

export function selectReusableRemoteRuntimeStatus<TStatus extends RemoteReusableRuntimeStatus>(
  input: RemoteReusableRuntimeSelectionInput<TStatus>,
): TStatus | undefined {
  return input.statuses.find(
    (status) =>
      status.accountId === input.accountId &&
      status.apiBaseUrl === input.apiBaseUrl &&
      status.state === "online" &&
      typeof status.gatewayRuntimeAttachmentId === "string" &&
      status.gatewayRuntimeAttachmentId.trim().length > 0 &&
      typeof status.runtimeInstallationId === "string" &&
      status.runtimeInstallationId.trim().length > 0,
  )
}

export async function* createRemoteRuntimePollingIterable<TFrame>(
  input: RemoteRuntimePollingIterableInput<TFrame>,
): AsyncIterable<TFrame> {
  let emptyPolls = 0
  const maxEmptyPolls = input.maxEmptyPolls ?? Number.POSITIVE_INFINITY
  const pollIntervalMs = Math.max(0, input.pollIntervalMs ?? 1_000)
  const sleep = input.sleep ?? defaultRemoteRuntimePollingSleep
  while (emptyPolls < maxEmptyPolls && !input.signal?.aborted) {
    const frames = await input.poll({ limit: input.limit ?? 10, signal: input.signal })
    if (input.signal?.aborted) return
    await input.onPollSuccess?.()
    if (frames.length === 0) {
      emptyPolls += 1
      if (emptyPolls < maxEmptyPolls) await sleep(pollIntervalMs, input.signal)
      continue
    }
    emptyPolls = 0
    for (const frame of frames) {
      yield frame
    }
  }
}

export function isRemoteRuntimeHeartbeatMessage(value: RemoteRuntimeJsonValue): value is RemoteRuntimeHeartbeatMessage {
  return isRemoteRuntimeJsonObject(value) && value.type === "heartbeat"
}

export function recordRemoteRuntimeSubscriptionDeliveryFailure(
  subscription: RemoteRuntimeSubscription,
  detachAfterFailures: number,
): RemoteRuntimeSubscription {
  const consecutiveDeliveryFailures = subscription.consecutiveDeliveryFailures + 1
  if (consecutiveDeliveryFailures >= detachAfterFailures) {
    return { ...subscription, consecutiveDeliveryFailures, state: "detached" }
  }
  return { ...subscription, consecutiveDeliveryFailures }
}

export function recordRemoteRuntimeSubscriptionDeliverySuccess(
  subscription: RemoteRuntimeSubscription,
): RemoteRuntimeSubscription {
  return { ...subscription, consecutiveDeliveryFailures: 0 }
}

function entitlementProvider(
  id: string,
  resolver?: RemoteRuntimeEntitlementResolver,
): RemoteRuntimeEntitlementProvider {
  if (id === "disabled") return disabledRemoteRuntimeEntitlementProvider()
  if (id === "allowAll") return allowAllRemoteRuntimeEntitlementProvider
  const provider = resolver?.get(id)
  if (!provider) throw new Error(`Remote runtime entitlement provider is not registered: ${id}`)
  return provider
}

async function runRemoteRuntimeHostEventMirror(
  deps: RemoteRuntimeHostEventMirrorDeps,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    const state: RemoteRuntimeHostState = await deps.readHostState().catch(() => ({}))
    if (state.host) await streamRemoteRuntimeHostEvents(state.host, deps, signal).catch(() => undefined)
    await remoteRuntimeHostEventMirrorSleep(deps, signal)
  }
}

async function remoteRuntimeHostEventMirrorSleep(
  deps: RemoteRuntimeHostEventMirrorDeps,
  signal: AbortSignal,
): Promise<void> {
  await (deps.sleep ?? defaultRemoteRuntimeHostEventMirrorSleep)(deps.pollIntervalMs ?? 1_000, signal).catch(
    () => undefined,
  )
}

function defaultRemoteRuntimePollingSleep(milliseconds: number): Promise<void> {
  return sleepTimeout(milliseconds)
}

function jsonPost(input: unknown): RequestInit {
  return {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "POST",
  }
}

function defaultRemoteRuntimeHostEventMirrorSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return sleepTimeout(milliseconds, undefined, { signal })
}

function parseRemoteRuntimeJsonValue(value: string): RemoteRuntimeJsonValue | undefined {
  try {
    const parsed = JSON.parse(value)
    return isParsedRemoteRuntimeJsonValue(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function isParsedRemoteRuntimeJsonValue(value: RemoteRuntimeJsonValue | undefined): value is RemoteRuntimeJsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return true
  if (Array.isArray(value)) return value.every((item) => isParsedRemoteRuntimeJsonValue(item))
  return isRemoteRuntimeJsonObject(value) && Object.values(value).every((item) => isParsedRemoteRuntimeJsonValue(item))
}

function isRemoteRuntimeJsonObject(
  value: RemoteRuntimeJsonValue | undefined,
): value is { readonly [key: string]: RemoteRuntimeJsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function sameRuntimeOperationReplyTarget(
  left: RuntimeOperationReplyTarget,
  right: RuntimeOperationReplyTarget,
): boolean {
  if (left.kind === "gatewayHttpRequest" && right.kind === "gatewayHttpRequest") {
    return left.gatewayHttpRequestId === right.gatewayHttpRequestId
  }
  if (left.kind === "remoteRuntimeAttachment" && right.kind === "remoteRuntimeAttachment") {
    return left.remoteRuntimeAttachmentId === right.remoteRuntimeAttachmentId
  }
  return false
}
