import {
  type RemoteRuntimeJsonValue,
  parseRemoteRuntimeAsymmetricPrivateKeyReference,
  parseRemoteRuntimeResponseSigningPublicKey,
  validateSerializedRemoteRuntimeAsymmetricPublicKey,
  type RuntimeConnectionCandidate,
  type RemoteRuntimeAsymmetricPrivateKeyReference,
  type RemoteRuntimeAcceptedVersions,
  type RemoteRuntimeAsymmetricPublicKey,
  type RemoteRuntimeMode,
  type RuntimeConnectionCandidateBootstrap,
  type RuntimeConnectionCandidateEnvironment,
  type RuntimeConnectionCandidateHostReachability,
  type RuntimeConnectionCandidateKind,
  type RuntimeTunnelEdgeAccess,
  type RuntimeWebSocketAllowedDirectory,
} from "@interbase/remote-runtime-contracts"
import { type RemoteRuntimeHostState } from "@interbase/remote-runtime-host"

export type RemoteRuntimeAdapterId = string

export type RemoteRuntimeAdapterCapability = {
  readonly supportsProviderAuthority: boolean
  readonly supportsLocalDirect: boolean
  readonly supportsRemoteCandidates: boolean
  readonly supportsQrBootstrap: boolean
}

export type RemoteRuntimeConnectionContext = {
  readonly runtimeInstallationId?: string
  readonly trustedRuntimeClientId?: string
  readonly accountId?: string
  readonly environment: "oss" | "interbase" | "dev" | "test"
}

export type RemoteRuntimeCandidateRef = {
  readonly candidateId: string
  readonly kind: "local" | "lan" | "tunnel" | "relay" | "hostedGateway"
  readonly priority: number
}

export type RemoteRuntimeResolvedCandidate = {
  readonly ref: RemoteRuntimeCandidateRef
  readonly baseHttpUrl: string
  readonly webSocketUrl?: string
  readonly expiresAt?: string
  readonly metadata: {
    readonly hostReachability: "loopback" | "lan" | "remote"
    readonly environment: "simulator" | "device" | "desktop"
  }
}

export type RemoteRuntimePairingIntent = {
  readonly mode: "qr" | "manual" | "resume"
  readonly requestedCapabilities: readonly string[]
}

export type RemoteRuntimePairingResult = {
  readonly runtimeInstallationId: string
  readonly trustedRuntimeClientId?: string
  readonly candidates: readonly RemoteRuntimeResolvedCandidate[]
  readonly acceptedContractVersions: RemoteRuntimeAcceptedVersions
}

export type RemoteRuntimeAttachmentBootstrap = {
  readonly candidate: RemoteRuntimeResolvedCandidate
  readonly localRuntimeAccessToken?: string
  readonly localRuntimeAccessTokenId?: string
  readonly requestHeaders?: Readonly<Record<string, string>>
}

export type RemoteRuntimeConnectorRequestHeadersInput = {
  readonly authorizationToken?: string | null
}

export type RemoteRuntimeSetupPairingURLInput = {
  readonly apiBaseUrl: string
  readonly runtimeConnectionCandidateBootstraps?: readonly RuntimeConnectionCandidateBootstrap[]
  readonly runtimeInstallationId: string
  readonly setupToken: string
  readonly trustedRuntimeClientId?: string | null
}

export type DirectLocalRuntimeConnectionCandidateBootstrapInput = {
  readonly expiresAt: string
  readonly hostReachability?: RuntimeConnectionCandidateBootstrap["hostReachability"]
  readonly host: {
    readonly password?: string
    readonly url: string
  }
  readonly priority?: number
  readonly runtime: {
    readonly localRuntimeAccessToken: string
    readonly localRuntimeAccessTokenId: string
    readonly runtimeInstallationId: string
    readonly runtimeResponseSigningPublicKey: RemoteRuntimeAsymmetricPublicKey
  }
}

export type RuntimeTunnelConnectionCandidateRuntimeAuthority = {
  readonly localRuntimeAccessToken: string
  readonly localRuntimeAccessTokenId: string
  readonly runtimeInstallationId: string
  readonly runtimeResponseSigningPublicKey: RemoteRuntimeAsymmetricPublicKey
}

export interface CloudflareTunnelRuntimeConnectionCandidateBootstrapInput {
  readonly edgeAccess?: RuntimeTunnelEdgeAccess | null
  readonly expiresAt: string
  readonly publicBaseHttpUrl: string
  readonly publicWebSocketUrl?: string | null
  readonly priority?: number
  readonly runtime: RuntimeTunnelConnectionCandidateRuntimeAuthority
  readonly tunnelId: string
}

export interface ZrokRuntimeConnectionCandidateBootstrapInput {
  readonly expiresAt: string
  readonly priority?: number
  readonly publicBaseHttpUrl: string
  readonly publicWebSocketUrl?: string | null
  readonly runtime: RuntimeTunnelConnectionCandidateRuntimeAuthority
  readonly shareId: string
}

export type RemoteRuntimeConnectionCandidateBaseUrlOptions = {
  readonly preserveBasePath?: boolean
  readonly preserveSearch?: boolean
}

export type RemoteRuntimeConnectionCandidateOrderKey = {
  readonly candidateId: string
  readonly priority: number
}

export type RemoteRuntimeConnectionCandidateBootstrapDefinition<
  TEdgeAccess,
  TSigningPublicKey,
  TKind extends string,
  TEnvironment extends string,
  THostReachability extends string,
> = {
  readonly baseHttpUrl: string
  readonly candidateId: string
  readonly edgeAccess?: TEdgeAccess | null
  readonly environment?: TEnvironment
  readonly expiresAt: string
  readonly hostReachability?: THostReachability
  readonly kind: TKind
  readonly localRuntimeAccessToken: string
  readonly localRuntimeAccessTokenId: string
  readonly priority: number
  readonly runtimeInstallationId: string
  readonly runtimeResponseSigningPublicKey: TSigningPublicKey
  readonly webSocketUrl?: string | null
}

export type RuntimeConnectionCandidateBootstrapDefinition = RemoteRuntimeConnectionCandidateBootstrapDefinition<
  RuntimeTunnelEdgeAccess,
  RemoteRuntimeAsymmetricPublicKey,
  RuntimeConnectionCandidateKind,
  RuntimeConnectionCandidateEnvironment,
  RuntimeConnectionCandidateHostReachability
>

export type RuntimeTunnelProviderCandidateResult = {
  readonly candidates: readonly RuntimeConnectionCandidateBootstrapDefinition[]
  readonly provider: RuntimeConnectionCandidateKind
}

export type RuntimeTunnelProvider = {
  discoverCandidates(input: {
    readonly expiresAt: string
    readonly runtime: RuntimeTunnelConnectionCandidateRuntimeAuthority
  }): Promise<RuntimeTunnelProviderCandidateResult>
}

export interface CloudflareRuntimeTunnelProviderInput {
  readonly edgeAccess?: RuntimeTunnelEdgeAccess | null
  readonly priority?: number
  readonly publicBaseHttpUrl: string
  readonly publicWebSocketUrl?: string | null
  readonly tunnelId: string
}

export interface ZrokRuntimeTunnelProviderInput {
  readonly priority?: number
  readonly publicBaseHttpUrl: string
  readonly publicWebSocketUrl?: string | null
  readonly shareId: string
}

export const remoteRuntimeSetupPairingUrl = "interbase://remote-runtime/pairing" as const

export interface RemoteRuntimeTunnelProviderEnvironment {
  readonly [key: string]: string | undefined
  readonly INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID?: string
  readonly INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID_HEADER?: string
  readonly INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET?: string
  readonly INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET_HEADER?: string
  readonly INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL?: string
  readonly INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID?: string
  readonly INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_WEBSOCKET_URL?: string
  readonly INTERBASE_REMOTE_RUNTIME_ZROK_BASE_URL?: string
  readonly INTERBASE_REMOTE_RUNTIME_ZROK_SHARE_ID?: string
  readonly INTERBASE_REMOTE_RUNTIME_ZROK_WEBSOCKET_URL?: string
}

export type RuntimeConnectionCandidateDiscoveryInput = {
  readonly direct?: DirectLocalRuntimeConnectionCandidateBootstrapInput | null
  readonly expiresAt: string
  readonly runtime: RuntimeTunnelConnectionCandidateRuntimeAuthority
  readonly tunnelProviders?: readonly RuntimeTunnelProvider[]
}

export type RuntimeConnectionCandidateBootstrapAuthorityInput<
  TPrivateKey,
  TPublicKey extends RemoteRuntimeAsymmetricPublicKey,
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
> = {
  readonly host?: DirectLocalRuntimeConnectionCandidateBootstrapInput["host"]
  readonly now?: () => number
  readonly runtimeInstallationId: string
  readonly runtimeLocalGatewayAuthority?: TAuthority
  readonly tunnelProviders?: readonly RuntimeTunnelProvider[]
}

export type RuntimeConnectionCandidatePublicationClient = {
  listSetupAuditEvents(): Promise<readonly RemoteRuntimeTrustedDeviceSetupAuditEventAuthority[]>
  replaceRuntimeConnectionCandidates(input: {
    readonly candidates: readonly RuntimeConnectionCandidate[]
    readonly runtimeInstallationId: string
    readonly trustedRuntimeClientId: string
  }): Promise<void>
}

export type RuntimeConnectionCandidatePublicationInput<
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithTrustedDevices,
> = {
  readonly client: RuntimeConnectionCandidatePublicationClient
  readonly runtimeConnectionCandidateBootstraps: readonly RuntimeConnectionCandidateBootstrap[]
  readonly runtimeInstallationId: string
  readonly runtimeLocalGatewayAuthority?: TAuthority
  readonly trustedRuntimeClientAuthorities?: readonly RemoteRuntimeTrustedDeviceAuthority[]
}

export type RuntimeConnectionCandidateTrustedDevicePublisherClient<
  TTrustedDevice extends RemoteRuntimeTrustedDeviceRecordAuthority,
> = Pick<RuntimeConnectionCandidatePublicationClient, "replaceRuntimeConnectionCandidates"> & {
  listTrustedDevices(): Promise<readonly TTrustedDevice[]>
}

export type RemoteRuntimeSetupAttachedEventAuthority = {
  readonly details?: {
    readonly gatewayRuntimeAttachmentId?: string | null
    readonly clientAttachmentId?: string | null
    readonly publicKey?: string | null
  } | null
  readonly trustedRuntimeClientId?: string | null
}

export type RemoteRuntimeSetupRuntimeRestartInput<
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
  TPrivateKey,
  TPublicKey,
  TRuntimeEncryptionKey,
> = {
  readonly accountId: string
  readonly allowedDirectories: readonly RuntimeWebSocketAllowedDirectory[]
  readonly apiBaseUrl: string
  readonly authorizationToken: string
  readonly directoryId?: string
  readonly directory: string
  readonly localGatewayAuthority:
    | TAuthority
    | RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>
  readonly pollIntervalMs?: number
  readonly runtimeEncryptionKey?: TRuntimeEncryptionKey
  readonly runtimeInstallationId: string
}

export type RemoteRuntimeSetupRuntimeHostState<
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
  TPrivateKey,
  TPublicKey,
  TRuntimeEncryptionKey,
> = {
  readonly host?: { readonly password?: string; readonly url: string }
  readonly runtime?: {
    readonly accountId: string
    readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
    readonly apiBaseUrl: string
    readonly directoryId?: string
    readonly directory: string
    readonly localGatewayAuthority?: TAuthority
    readonly runtimeEncryptionKey?: TRuntimeEncryptionKey
    readonly runtimeInstallationId: string
  }
}

export type CompleteRemoteRuntimeSetupAttachmentInput<
  TPrivateKey,
  TPublicKey extends RemoteRuntimeAsymmetricPublicKey,
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
  TRuntimeEncryptionKey,
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
> = {
  readonly authorizationToken: string
  readonly client: Pick<RuntimeConnectionCandidatePublicationClient, "replaceRuntimeConnectionCandidates">
  readonly event: RemoteRuntimeSetupAttachedEventAuthority
  readonly events: readonly TEvent[]
  readonly localRuntimeCredential?: RemoteRuntimeSetupLocalRuntimeCredentialAuthority
  readonly pollIntervalMs?: number
  restartRuntime(
    input: RemoteRuntimeSetupRuntimeRestartInput<TAuthority, TPrivateKey, TPublicKey, TRuntimeEncryptionKey>,
  ): Promise<void>
  readonly runtimeConnectionCandidateBootstraps: readonly RuntimeConnectionCandidateBootstrap[]
  readonly runtimeHostState: RemoteRuntimeSetupRuntimeHostState<
    TAuthority,
    TPrivateKey,
    TPublicKey,
    TRuntimeEncryptionKey
  >
  readonly runtimeInstallationId: string
  readonly runtimeResponseSigningPrivateKey?: TPrivateKey
  readonly runtimeResponseSigningPublicKey?: TPublicKey
}

export type CompleteRemoteRuntimeSetupAttachmentResult = {
  readonly clientAttachmentId?: string
  readonly trustedRuntimeClientId?: string
}

export type MonitorAndCompleteRemoteRuntimeSetupAttachmentInput<
  TPrivateKey,
  TPublicKey extends RemoteRuntimeAsymmetricPublicKey,
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
  TRuntimeEncryptionKey,
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
> = {
  readonly authorizationToken: string
  readonly client: {
    listAuditEvents(): Promise<readonly TEvent[]>
    replaceRuntimeConnectionCandidates(input: {
      readonly candidates: readonly RuntimeConnectionCandidate[]
      readonly runtimeInstallationId: string
      readonly trustedRuntimeClientId: string
    }): Promise<void>
  }
  readonly gatewayRuntimeAttachmentId: string
  readonly localRuntimeCredential?: RemoteRuntimeSetupLocalRuntimeCredentialAuthority
  readonly minCreatedAt?: string
  readonly pollIntervalMs?: number
  readonly runtimeConnectionCandidateBootstraps: readonly RuntimeConnectionCandidateBootstrap[]
  readonly runtimeInstallationId: string
  readonly runtimeResponseSigningPrivateKey?: TPrivateKey
  readonly runtimeResponseSigningPublicKey?: TPublicKey
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  readonly trustedRuntimeClientId?: string | null
}

export type MonitorAndCompleteRemoteRuntimeSetupAttachmentDeps<
  TPrivateKey,
  TPublicKey extends RemoteRuntimeAsymmetricPublicKey,
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
  TRuntimeEncryptionKey,
> = {
  readRuntimeHostState(): Promise<
    RemoteRuntimeSetupRuntimeHostState<TAuthority, TPrivateKey, TPublicKey, TRuntimeEncryptionKey>
  >
  restartRuntime(
    input: RemoteRuntimeSetupRuntimeRestartInput<TAuthority, TPrivateKey, TPublicKey, TRuntimeEncryptionKey>,
  ): Promise<void>
}

export type RemoteRuntimeConnectionCandidateBootstrap<
  TEdgeAccess,
  TSigningPublicKey,
  TKind extends string,
  TEnvironment extends string,
  THostReachability extends string,
> = {
  readonly baseHttpUrl: string
  readonly candidateId: string
  readonly edgeAccess: TEdgeAccess | null
  readonly environment?: TEnvironment
  readonly expiresAt: string
  readonly hostReachability?: THostReachability
  readonly kind: TKind
  readonly localRuntimeAccessToken: string
  readonly localRuntimeAccessTokenId: string
  readonly priority: number
  readonly runtimeInstallationId: string
  readonly runtimeResponseSigningPublicKey: TSigningPublicKey
  readonly webSocketUrl: string
}

export type RemoteRuntimeConnectionCandidateBootstrapOptions = {
  readonly preserveBasePath?: boolean
  readonly preserveSearch?: boolean
}

export type RemoteRuntimeConnectionCandidateCompletionInput<
  TBootstrap extends RemoteRuntimeConnectionCandidateOrderKey,
> = {
  readonly bootstraps: readonly TBootstrap[]
  readonly remoteRuntimeRequestSigningKeyId: string
  readonly trustedRuntimeClientId: string
}

export type RemoteRuntimeTrustedDeviceAuthority = {
  readonly publicKey: string
  readonly trustedRuntimeClientId: string
}

export function parseRemoteRuntimeTrustedDeviceAuthority(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeTrustedDeviceAuthority {
  const trustedRuntimeClientId = remoteRuntimeTrustedClientIdFromAuthority(input)
  if (!isRemoteRuntimeAdapterJsonObject(input) || typeof input.publicKey !== "string" || !trustedRuntimeClientId) {
    throw new Error("invalid schema")
  }
  return {
    publicKey: input.publicKey,
    trustedRuntimeClientId,
  }
}

function remoteRuntimeTrustedClientIdFromAuthority(input: RemoteRuntimeJsonValue): string | undefined {
  if (!isRemoteRuntimeAdapterJsonObject(input)) return undefined
  if (typeof input.trustedRuntimeClientId === "string") return input.trustedRuntimeClientId
  if (typeof input.trustedMobileDeviceId === "string") return input.trustedMobileDeviceId
  return undefined
}

function remoteRuntimeTrustedClientPublicKeyFromAuthority(input: RemoteRuntimeJsonValue): string | undefined {
  if (!isRemoteRuntimeAdapterJsonObject(input)) return undefined
  if (typeof input.trustedRuntimeClientPublicKey === "string") return input.trustedRuntimeClientPublicKey
  if (typeof input.trustedMobileDevicePublicKey === "string") return input.trustedMobileDevicePublicKey
  return undefined
}

export type RemoteRuntimeLocalGatewayTrustedDeviceAuthority = {
  readonly publicKey: string
  readonly trustedRuntimeClientId: string
}

export type RemoteRuntimeLocalGatewayAuthorityWithTrustedDevices = {
  readonly trustedRuntimeClientAuthorities?: readonly RemoteRuntimeLocalGatewayTrustedDeviceAuthority[]
  readonly trustedRuntimeClientId: string
  readonly trustedRuntimeClientPublicKey: string
}

export type RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey> =
  RemoteRuntimeLocalGatewayAuthorityWithTrustedDevices & {
    readonly expectedLocalRuntimeAccessToken: string
    readonly localRuntimeAccessTokenId: string
    readonly runtimeResponseSigningPrivateKey?: TPrivateKey
    readonly runtimeResponseSigningPublicKey?: TPublicKey
  }

export function parseRemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<
  RemoteRuntimeAsymmetricPrivateKeyReference,
  RemoteRuntimeAsymmetricPublicKey
> {
  const trustedRuntimeClientId = remoteRuntimeTrustedClientIdFromAuthority(input)
  const trustedRuntimeClientPublicKey = remoteRuntimeTrustedClientPublicKeyFromAuthority(input)
  if (
    !isRemoteRuntimeAdapterJsonObject(input) ||
    typeof input.expectedLocalRuntimeAccessToken !== "string" ||
    typeof input.localRuntimeAccessTokenId !== "string" ||
    !trustedRuntimeClientId ||
    !trustedRuntimeClientPublicKey
  ) {
    throw new Error("invalid schema")
  }
  const trustedRuntimeClientAuthorityInput = Array.isArray(input.trustedRuntimeClientAuthorities)
    ? input.trustedRuntimeClientAuthorities
    : Array.isArray(input.trustedMobileDeviceAuthorities)
      ? input.trustedMobileDeviceAuthorities
      : []
  const trustedRuntimeClientAuthorities = trustedRuntimeClientAuthorityInput.map(
    parseRemoteRuntimeTrustedDeviceAuthority,
  )
  return {
    expectedLocalRuntimeAccessToken: input.expectedLocalRuntimeAccessToken,
    localRuntimeAccessTokenId: input.localRuntimeAccessTokenId,
    ...(isRemoteRuntimeAdapterJsonObject(input.runtimeResponseSigningPrivateKey)
      ? {
          runtimeResponseSigningPrivateKey: parseRemoteRuntimeAsymmetricPrivateKeyReference(
            input.runtimeResponseSigningPrivateKey,
          ),
        }
      : {}),
    ...(isRemoteRuntimeAdapterJsonObject(input.runtimeResponseSigningPublicKey)
      ? {
          runtimeResponseSigningPublicKey: parseRemoteRuntimeResponseSigningPublicKey(
            input.runtimeResponseSigningPublicKey,
          ),
        }
      : {}),
    ...(trustedRuntimeClientAuthorities.length > 0 ? { trustedRuntimeClientAuthorities } : {}),
    trustedRuntimeClientId,
    trustedRuntimeClientPublicKey,
  }
}

export type RemoteRuntimeSetupLocalRuntimeCredentialAuthority = {
  readonly localRuntimeAccessToken: string
  readonly localRuntimeAccessTokenId: string
}

export type RemoteRuntimeSetupRuntimeConnectionBootstrapLocalGatewayAuthority = {
  readonly expectedLocalRuntimeAccessToken: string
  readonly localRuntimeAccessTokenId: string
  readonly runtimeResponseSigningPublicKey?: RemoteRuntimeAsymmetricPublicKey | null
}

export type RemoteRuntimeSetupRuntimeConnectionBootstrapInput<
  TLocalGatewayAuthority extends
    RemoteRuntimeSetupRuntimeConnectionBootstrapLocalGatewayAuthority = RemoteRuntimeSetupRuntimeConnectionBootstrapLocalGatewayAuthority,
> = {
  readonly localRuntimeCredential?: RemoteRuntimeSetupLocalRuntimeCredentialAuthority
  readonly now?: () => number
  readonly runtimeHostState: RemoteRuntimeHostState<TLocalGatewayAuthority>
  readonly runtimeInstallationId: string
  readonly runtimeResponseSigningPublicKey?: RemoteRuntimeAsymmetricPublicKey
  readonly tunnelProviders?: readonly RuntimeTunnelProvider[]
}

export type RemoteRuntimeSetupLocalGatewayAuthorityInput<TAuthority, TPrivateKey, TPublicKey> = {
  readonly existingLocalGatewayAuthority?: TAuthority
  readonly localRuntimeCredential?: RemoteRuntimeSetupLocalRuntimeCredentialAuthority
  readonly runtimeResponseSigningPrivateKey?: TPrivateKey
  readonly runtimeResponseSigningPublicKey?: TPublicKey
  readonly trustedRuntimeClientId: string
  readonly trustedRuntimeClientPublicKey: string
}

export type RemoteRuntimeTrustedDeviceRecordAuthority = {
  readonly publicKey: string | null
  readonly runtimeInstallationId: string
  readonly state: string
  readonly trustedRuntimeClientId: string
}

export type RemoteRuntimeTrustedDeviceRecordAuthorityInput<TDevice extends RemoteRuntimeTrustedDeviceRecordAuthority> =
  {
    readonly devices: readonly TDevice[]
    readonly runtimeInstallationId: string
  }

export type RemoteRuntimeTrustedDeviceSetupAuditEventDetailsAuthority = {
  readonly gatewayRuntimeAttachmentId?: string | null
  readonly publicKey?: string | null
}

export type RemoteRuntimeTrustedDeviceSetupAuditEventAuthority = {
  readonly action?: string | null
  readonly createdAt?: string | null
  readonly details?: RemoteRuntimeTrustedDeviceSetupAuditEventDetailsAuthority | null
  readonly runtimeInstallationId?: string | null
  readonly trustedRuntimeClientId?: string | null
}

export type RemoteRuntimeTrustedDeviceSetupAuditEventAuthorityInput<
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
> = {
  readonly events: readonly TEvent[]
  readonly runtimeInstallationId: string
}

export type RemoteRuntimeSetupAttachmentMonitorOptions<
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
> = {
  readonly gatewayRuntimeAttachmentId: string
  readonly listAuditEvents: () => Promise<readonly TEvent[]>
  readonly minCreatedAt?: string
  readonly onAttached: (event: TEvent, events: readonly TEvent[]) => Promise<void> | void
  readonly pollIntervalMs?: number
  readonly runtimeInstallationId: string
  readonly signal?: AbortSignal
  readonly sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>
  readonly trustedRuntimeClientId?: string | null
}

export const remoteRuntimePairingAcceptedAuditEventAction = "remoteRuntime.pairing.accepted" as const
export const clientPairingAcceptedAuditEventAction = "client.pairing.accepted" as const
export const mobilePairingAcceptedAuditEventAction = "mobile.pairing.accepted" as const

export function isRemoteRuntimePairingAcceptedAuditEventAction(action: string): boolean {
  return (
    action === remoteRuntimePairingAcceptedAuditEventAction ||
    action === clientPairingAcceptedAuditEventAction ||
    action === mobilePairingAcceptedAuditEventAction
  )
}

export const remoteRuntimeDeviceRevokedAuditEventAction = "remoteRuntime.device.revoked" as const

const remoteRuntimeClientAttachedAuditEventAction = "remoteRuntime.client.attached" as const

export interface RemoteRuntimeAdapter {
  readonly id: RemoteRuntimeAdapterId
  readonly mode: RemoteRuntimeMode
  capabilities(): RemoteRuntimeAdapterCapability
  beginPairing(
    context: RemoteRuntimeConnectionContext,
    intent: RemoteRuntimePairingIntent,
  ): Promise<RemoteRuntimePairingResult>
  refreshCandidates(context: RemoteRuntimeConnectionContext): Promise<readonly RemoteRuntimeResolvedCandidate[]>
  resolveAttachmentBootstrap(
    context: RemoteRuntimeConnectionContext,
    candidate: RemoteRuntimeCandidateRef,
  ): Promise<RemoteRuntimeAttachmentBootstrap>
  handleAttachmentAccepted?(
    context: RemoteRuntimeConnectionContext,
    input: {
      readonly candidate: RemoteRuntimeCandidateRef
      readonly attachmentId: string
      readonly acceptedVersions: RemoteRuntimeAcceptedVersions
    },
  ): Promise<void>
  handleAttachmentClosed?(
    context: RemoteRuntimeConnectionContext,
    input: {
      readonly attachmentId: string
      readonly reason: "closed" | "revoked" | "expired" | "unavailable"
      readonly recoverable: boolean
    },
  ): Promise<void>
}

export function createRemoteRuntimeAdapterRegistry(initial: readonly RemoteRuntimeAdapter[] = []) {
  const adapters = new Map<string, RemoteRuntimeAdapter>()
  for (const adapter of initial) register(adapter)
  function register(adapter: RemoteRuntimeAdapter): void {
    if (adapters.has(adapter.id)) throw new Error(`Remote runtime adapter already registered: ${adapter.id}`)
    adapters.set(adapter.id, adapter)
  }
  return {
    register,
    get(id: string): RemoteRuntimeAdapter | undefined {
      return adapters.get(id)
    },
    list(): readonly RemoteRuntimeAdapter[] {
      return [...adapters.values()]
    },
  }
}

export function createLocalDirectRemoteRuntimeAdapter(input: {
  readonly baseHttpUrl: string
  readonly webSocketUrl?: string
  readonly acceptedContractVersions: RemoteRuntimeAcceptedVersions
  readonly runtimeInstallationId: string
}): RemoteRuntimeAdapter {
  const candidate = {
    ref: { candidateId: "local-direct", kind: "local", priority: 0 },
    baseHttpUrl: input.baseHttpUrl,
    webSocketUrl: input.webSocketUrl,
    metadata: { hostReachability: "loopback", environment: "desktop" },
  } satisfies RemoteRuntimeResolvedCandidate
  return {
    id: "local-direct",
    mode: "localDirect",
    capabilities() {
      return {
        supportsProviderAuthority: false,
        supportsLocalDirect: true,
        supportsRemoteCandidates: false,
        supportsQrBootstrap: true,
      }
    },
    async beginPairing() {
      return {
        runtimeInstallationId: input.runtimeInstallationId,
        candidates: [candidate],
        acceptedContractVersions: input.acceptedContractVersions,
      }
    },
    async refreshCandidates() {
      return [candidate]
    },
    async resolveAttachmentBootstrap() {
      return { candidate }
    },
  }
}

export function buildRemoteRuntimeSetupPairingURL(input: RemoteRuntimeSetupPairingURLInput): string {
  const url = new URL(remoteRuntimeSetupPairingUrl)
  url.searchParams.set("a", new URL(input.apiBaseUrl).origin)
  url.searchParams.set("t", input.setupToken)
  url.searchParams.set("r", input.runtimeInstallationId)
  if (input.runtimeConnectionCandidateBootstraps?.length) {
    url.searchParams.set("c", remoteRuntimeBase64UrlEncode(JSON.stringify(input.runtimeConnectionCandidateBootstraps)))
  }
  if (input.trustedRuntimeClientId?.trim()) {
    url.searchParams.set("d", input.trustedRuntimeClientId)
  }
  return String(url)
}

export function buildRemoteRuntimeConnectorRequestHeaders(
  options: RemoteRuntimeConnectorRequestHeadersInput,
  additionalHeaders: Readonly<Record<string, string>> = {},
): Record<string, string> {
  return {
    ...additionalHeaders,
    ...(options.authorizationToken?.trim() ? { authorization: `Bearer ${options.authorizationToken.trim()}` } : {}),
  }
}

function remoteRuntimeBase64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

export function normalizeRemoteRuntimeConnectionCandidateBaseUrl(
  value: string,
  options: RemoteRuntimeConnectionCandidateBaseUrlOptions = {},
): URL {
  const url = new URL(value)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Runtime connection candidate base URL must use HTTP or HTTPS.")
  }
  if (!options.preserveBasePath) url.pathname = ""
  if (!options.preserveSearch) url.search = ""
  url.hash = ""
  return url
}

export function remoteRuntimeConnectionCandidateBaseHttpUrl(baseUrl: URL): string {
  if (baseUrl.pathname === "/") return baseUrl.origin
  const serialized = String(baseUrl)
  return serialized.endsWith("/") ? serialized.slice(0, -1) : serialized
}

export function defaultRemoteRuntimeConnectionCandidateWebSocketUrl(baseUrl: URL): string {
  const url = new URL(baseUrl)
  const basePath = baseUrl.pathname.endsWith("/") ? baseUrl.pathname.slice(0, -1) : baseUrl.pathname
  url.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = `${basePath === "/" ? "" : basePath}/remote-runtime/socket`
  url.search = ""
  url.hash = ""
  return String(url)
}

export function directLocalRemoteRuntimeConnectionCandidateBaseHttpUrl(value: string): string {
  const url = normalizeRemoteRuntimeConnectionCandidateBaseUrl(value, { preserveBasePath: true })
  url.pathname = "/global"
  return remoteRuntimeConnectionCandidateBaseHttpUrl(url)
}

function directLocalRemoteRuntimeConnectionCandidateAuthenticatedBaseUrl(value: string, password?: string): string {
  const url = normalizeRemoteRuntimeConnectionCandidateBaseUrl(value, { preserveBasePath: true })
  url.pathname = "/global"
  url.search = ""
  const trimmedPassword = password?.trim()
  if (trimmedPassword) {
    url.searchParams.set("auth_token", Buffer.from(`interbase:${trimmedPassword}`, "utf8").toString("base64"))
  }
  return remoteRuntimeConnectionCandidateBaseHttpUrl(url)
}

function directLocalRemoteRuntimeConnectionCandidateWebSocketUrl(value: string, password?: string): string {
  const url = new URL(directLocalRemoteRuntimeConnectionCandidateAuthenticatedBaseUrl(value, password))
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.pathname = "/global/remote-runtime/socket"
  return String(url)
}

export function buildDirectLocalRuntimeConnectionCandidateBootstrap(
  input: DirectLocalRuntimeConnectionCandidateBootstrapInput,
): RuntimeConnectionCandidateBootstrap {
  return buildRemoteRuntimeConnectionCandidateBootstrap(
    {
      baseHttpUrl: directLocalRemoteRuntimeConnectionCandidateAuthenticatedBaseUrl(input.host.url, input.host.password),
      candidateId: `direct:${input.runtime.runtimeInstallationId}:${input.runtime.localRuntimeAccessTokenId}`,
      edgeAccess: null,
      environment: "simulator",
      expiresAt: input.expiresAt,
      hostReachability: input.hostReachability ?? "loopback",
      kind: "direct",
      localRuntimeAccessToken: input.runtime.localRuntimeAccessToken,
      localRuntimeAccessTokenId: input.runtime.localRuntimeAccessTokenId,
      priority: input.priority ?? 0,
      runtimeInstallationId: input.runtime.runtimeInstallationId,
      runtimeResponseSigningPublicKey: input.runtime.runtimeResponseSigningPublicKey,
      webSocketUrl: directLocalRemoteRuntimeConnectionCandidateWebSocketUrl(input.host.url, input.host.password),
    },
    {
      preserveBasePath: true,
      preserveSearch: true,
    },
  )
}

export function buildCloudflareTunnelRuntimeConnectionCandidateBootstrap(
  input: CloudflareTunnelRuntimeConnectionCandidateBootstrapInput,
): RuntimeConnectionCandidateBootstrap {
  return buildRemoteRuntimeConnectionCandidateBootstrap({
    baseHttpUrl: input.publicBaseHttpUrl,
    candidateId: `cloudflare:${input.runtime.runtimeInstallationId}:${input.tunnelId}:${input.runtime.localRuntimeAccessTokenId}`,
    edgeAccess: input.edgeAccess ?? null,
    environment: "tunnel",
    expiresAt: input.expiresAt,
    hostReachability: "public",
    kind: "cloudflareTunnel",
    localRuntimeAccessToken: input.runtime.localRuntimeAccessToken,
    localRuntimeAccessTokenId: input.runtime.localRuntimeAccessTokenId,
    priority: input.priority ?? 10,
    runtimeInstallationId: input.runtime.runtimeInstallationId,
    runtimeResponseSigningPublicKey: input.runtime.runtimeResponseSigningPublicKey,
    webSocketUrl: input.publicWebSocketUrl,
  })
}

export function buildZrokRuntimeConnectionCandidateBootstrap(
  input: ZrokRuntimeConnectionCandidateBootstrapInput,
): RuntimeConnectionCandidateBootstrap {
  return buildRemoteRuntimeConnectionCandidateBootstrap({
    baseHttpUrl: input.publicBaseHttpUrl,
    candidateId: `zrok:${input.runtime.runtimeInstallationId}:${input.shareId}:${input.runtime.localRuntimeAccessTokenId}`,
    edgeAccess: null,
    environment: "tunnel",
    expiresAt: input.expiresAt,
    hostReachability: "public",
    kind: "zrokPublicHttp",
    localRuntimeAccessToken: input.runtime.localRuntimeAccessToken,
    localRuntimeAccessTokenId: input.runtime.localRuntimeAccessTokenId,
    priority: input.priority ?? 20,
    runtimeInstallationId: input.runtime.runtimeInstallationId,
    runtimeResponseSigningPublicKey: input.runtime.runtimeResponseSigningPublicKey,
    webSocketUrl: input.publicWebSocketUrl,
  })
}

export function createCloudflareRuntimeTunnelProvider(
  input: CloudflareRuntimeTunnelProviderInput,
): RuntimeTunnelProvider {
  return {
    async discoverCandidates(candidateInput) {
      return {
        candidates: [
          buildCloudflareTunnelRuntimeConnectionCandidateBootstrap({
            edgeAccess: input.edgeAccess ?? null,
            expiresAt: candidateInput.expiresAt,
            priority: input.priority,
            publicBaseHttpUrl: input.publicBaseHttpUrl,
            publicWebSocketUrl: input.publicWebSocketUrl,
            runtime: candidateInput.runtime,
            tunnelId: input.tunnelId,
          }),
        ],
        provider: "cloudflareTunnel",
      }
    },
  }
}

export function createZrokRuntimeTunnelProvider(input: ZrokRuntimeTunnelProviderInput): RuntimeTunnelProvider {
  return {
    async discoverCandidates(candidateInput) {
      return {
        candidates: [
          buildZrokRuntimeConnectionCandidateBootstrap({
            expiresAt: candidateInput.expiresAt,
            priority: input.priority,
            publicBaseHttpUrl: input.publicBaseHttpUrl,
            publicWebSocketUrl: input.publicWebSocketUrl,
            runtime: candidateInput.runtime,
            shareId: input.shareId,
          }),
        ],
        provider: "zrokPublicHttp",
      }
    },
  }
}

export function configuredRemoteRuntimeTunnelProviders(
  environment: RemoteRuntimeTunnelProviderEnvironment,
): RuntimeTunnelProvider[] {
  const cloudflareTunnelId = environment.INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID?.trim()
  const cloudflareBaseUrl = environment.INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL?.trim()
  const zrokShareId = environment.INTERBASE_REMOTE_RUNTIME_ZROK_SHARE_ID?.trim()
  const zrokBaseUrl = environment.INTERBASE_REMOTE_RUNTIME_ZROK_BASE_URL?.trim()
  return [
    ...(cloudflareTunnelId || cloudflareBaseUrl
      ? [
          createCloudflareRuntimeTunnelProvider({
            edgeAccess: configuredCloudflareAccess(environment),
            publicBaseHttpUrl: requiredPairedRemoteRuntimeTunnelEnvironmentValue({
              label: "INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL",
              peerLabel: "INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID",
              value: cloudflareBaseUrl,
            }),
            publicWebSocketUrl: environment.INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_WEBSOCKET_URL?.trim() || null,
            tunnelId: requiredPairedRemoteRuntimeTunnelEnvironmentValue({
              label: "INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_TUNNEL_ID",
              peerLabel: "INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_BASE_URL",
              value: cloudflareTunnelId,
            }),
          }),
        ]
      : []),
    ...(zrokShareId || zrokBaseUrl
      ? [
          createZrokRuntimeTunnelProvider({
            publicBaseHttpUrl: requiredPairedRemoteRuntimeTunnelEnvironmentValue({
              label: "INTERBASE_REMOTE_RUNTIME_ZROK_BASE_URL",
              peerLabel: "INTERBASE_REMOTE_RUNTIME_ZROK_SHARE_ID",
              value: zrokBaseUrl,
            }),
            publicWebSocketUrl: environment.INTERBASE_REMOTE_RUNTIME_ZROK_WEBSOCKET_URL?.trim() || null,
            shareId: requiredPairedRemoteRuntimeTunnelEnvironmentValue({
              label: "INTERBASE_REMOTE_RUNTIME_ZROK_SHARE_ID",
              peerLabel: "INTERBASE_REMOTE_RUNTIME_ZROK_BASE_URL",
              value: zrokShareId,
            }),
          }),
        ]
      : []),
  ]
}

function configuredCloudflareAccess(
  environment: RemoteRuntimeTunnelProviderEnvironment,
): RuntimeTunnelEdgeAccess | null {
  const clientId = environment.INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID?.trim()
  const clientSecret = environment.INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET?.trim()
  if (!clientId && !clientSecret) {
    return null
  }
  return {
    clientId: requiredPairedRemoteRuntimeTunnelEnvironmentValue({
      label: "INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID",
      peerLabel: "INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET",
      value: clientId,
    }),
    clientIdHeaderName:
      environment.INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID_HEADER?.trim() || "CF-Access-Client-Id",
    clientSecret: requiredPairedRemoteRuntimeTunnelEnvironmentValue({
      label: "INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET",
      peerLabel: "INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_ID",
      value: clientSecret,
    }),
    clientSecretHeaderName:
      environment.INTERBASE_REMOTE_RUNTIME_CLOUDFLARE_ACCESS_CLIENT_SECRET_HEADER?.trim() || "CF-Access-Client-Secret",
    provider: "cloudflareAccess",
  }
}

function requiredPairedRemoteRuntimeTunnelEnvironmentValue(input: {
  readonly label: string
  readonly peerLabel: string
  readonly value?: string
}): string {
  if (input.value) {
    return input.value
  }
  throw new Error(
    `${input.label} is required when ${input.peerLabel} is configured for remote runtime tunnel candidates.`,
  )
}

export async function discoverRuntimeConnectionCandidateBootstraps(
  input: RuntimeConnectionCandidateDiscoveryInput,
): Promise<RuntimeConnectionCandidateBootstrap[]> {
  const providerResults = await Promise.all(
    (input.tunnelProviders ?? []).map((provider) =>
      provider.discoverCandidates({
        expiresAt: input.expiresAt,
        runtime: input.runtime,
      }),
    ),
  )
  return buildRemoteRuntimeConnectionCandidateBootstraps([
    ...(input.direct ? [buildDirectLocalRuntimeConnectionCandidateBootstrap(input.direct)] : []),
    ...providerResults.flatMap((result) => result.candidates),
  ])
}

export function runtimeConnectionCandidateBootstrapsFromAuthority<
  TPrivateKey,
  TPublicKey extends RemoteRuntimeAsymmetricPublicKey,
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
>(
  input: RuntimeConnectionCandidateBootstrapAuthorityInput<TPrivateKey, TPublicKey, TAuthority>,
): Promise<RuntimeConnectionCandidateBootstrap[]> {
  const runtimeResponseSigningPublicKey = input.runtimeLocalGatewayAuthority?.runtimeResponseSigningPublicKey
  if (!runtimeResponseSigningPublicKey || !input.runtimeLocalGatewayAuthority) {
    return Promise.resolve([])
  }
  const runtimeConnectionCandidateExpiresAt = new Date((input.now ?? Date.now)() + 60 * 60 * 1000).toISOString()
  return discoverRuntimeConnectionCandidateBootstraps({
    direct: input.host
      ? {
          expiresAt: runtimeConnectionCandidateExpiresAt,
          host: input.host,
          runtime: {
            localRuntimeAccessToken: input.runtimeLocalGatewayAuthority.expectedLocalRuntimeAccessToken,
            localRuntimeAccessTokenId: input.runtimeLocalGatewayAuthority.localRuntimeAccessTokenId,
            runtimeInstallationId: input.runtimeInstallationId,
            runtimeResponseSigningPublicKey,
          },
        }
      : null,
    expiresAt: runtimeConnectionCandidateExpiresAt,
    runtime: {
      localRuntimeAccessToken: input.runtimeLocalGatewayAuthority.expectedLocalRuntimeAccessToken,
      localRuntimeAccessTokenId: input.runtimeLocalGatewayAuthority.localRuntimeAccessTokenId,
      runtimeInstallationId: input.runtimeInstallationId,
      runtimeResponseSigningPublicKey,
    },
    tunnelProviders: input.tunnelProviders,
  })
}

export async function publishRuntimeConnectionCandidatesForTrustedDevices<
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithTrustedDevices,
>(input: RuntimeConnectionCandidatePublicationInput<TAuthority>): Promise<void> {
  if (input.runtimeConnectionCandidateBootstraps.length === 0) return
  const trustedRuntimeClientAuthorities = input.trustedRuntimeClientAuthorities
    ? deduplicateRemoteRuntimeTrustedDeviceAuthorities(input.trustedRuntimeClientAuthorities)
    : deduplicateRemoteRuntimeTrustedDeviceAuthorities([
        ...remoteRuntimeTrustedDeviceAuthoritiesFromLocalGatewayAuthority(input.runtimeLocalGatewayAuthority),
        ...remoteRuntimeTrustedDeviceAuthoritiesFromSetupAuditEvents({
          events: await input.client.listSetupAuditEvents(),
          runtimeInstallationId: input.runtimeInstallationId,
        }),
      ])
  for (const authority of trustedRuntimeClientAuthorities) {
    const remoteRuntimeRequestSigningKeyId = remoteRuntimeRequestSigningKeyIdFromSerializedPublicKey(
      authority.publicKey,
    )
    if (!remoteRuntimeRequestSigningKeyId) continue
    await input.client.replaceRuntimeConnectionCandidates({
      candidates: completeRemoteRuntimeConnectionCandidates({
        bootstraps: input.runtimeConnectionCandidateBootstraps,
        remoteRuntimeRequestSigningKeyId: remoteRuntimeRequestSigningKeyId,
        trustedRuntimeClientId: authority.trustedRuntimeClientId,
      }),
      runtimeInstallationId: input.runtimeInstallationId,
      trustedRuntimeClientId: authority.trustedRuntimeClientId,
    })
  }
}

export async function completeRemoteRuntimeSetupAttachment<
  TPrivateKey,
  TPublicKey extends RemoteRuntimeAsymmetricPublicKey,
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
  TRuntimeEncryptionKey,
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
>(
  input: CompleteRemoteRuntimeSetupAttachmentInput<TPrivateKey, TPublicKey, TAuthority, TRuntimeEncryptionKey, TEvent>,
): Promise<CompleteRemoteRuntimeSetupAttachmentResult> {
  const trustedRuntimeClientId =
    typeof input.event.trustedRuntimeClientId === "string" ? input.event.trustedRuntimeClientId : undefined
  const trustedRuntimeClientPublicKey = trustedRuntimeClientId
    ? trustedRuntimeClientPublicKeyFromSetupEvents(input.events, {
        runtimeInstallationId: input.runtimeInstallationId,
        trustedRuntimeClientId,
      })
    : undefined
  if (trustedRuntimeClientId && trustedRuntimeClientPublicKey) {
    const localGatewayAuthority = remoteRuntimeSetupLocalGatewayAuthority({
      existingLocalGatewayAuthority: input.runtimeHostState.runtime?.localGatewayAuthority,
      localRuntimeCredential: input.localRuntimeCredential,
      runtimeResponseSigningPrivateKey: input.runtimeResponseSigningPrivateKey,
      runtimeResponseSigningPublicKey: input.runtimeResponseSigningPublicKey,
      trustedRuntimeClientId,
      trustedRuntimeClientPublicKey,
    })
    if (
      localGatewayAuthority &&
      input.runtimeHostState.runtime?.runtimeInstallationId === input.runtimeInstallationId &&
      input.runtimeHostState.host
    ) {
      const allowedDirectories = input.runtimeHostState.runtime.allowedDirectories
      if (!allowedDirectories || allowedDirectories.length === 0) {
        throw new Error("Remote runtime setup restart requires persisted allowed directory authority.")
      }
      await input.restartRuntime({
        accountId: input.runtimeHostState.runtime.accountId,
        allowedDirectories,
        apiBaseUrl: input.runtimeHostState.runtime.apiBaseUrl,
        authorizationToken: input.authorizationToken,
        directoryId: input.runtimeHostState.runtime.directoryId,
        directory: input.runtimeHostState.runtime.directory,
        localGatewayAuthority,
        pollIntervalMs: input.pollIntervalMs,
        runtimeEncryptionKey: input.runtimeHostState.runtime.runtimeEncryptionKey,
        runtimeInstallationId: input.runtimeInstallationId,
      })
    }
    const remoteRuntimeRequestSigningKeyId =
      remoteRuntimeRequestSigningKeyIdFromSerializedPublicKey(trustedRuntimeClientPublicKey)
    if (remoteRuntimeRequestSigningKeyId && input.runtimeConnectionCandidateBootstraps.length > 0) {
      await input.client.replaceRuntimeConnectionCandidates({
        candidates: completeRemoteRuntimeConnectionCandidates({
          bootstraps: input.runtimeConnectionCandidateBootstraps,
          remoteRuntimeRequestSigningKeyId: remoteRuntimeRequestSigningKeyId,
          trustedRuntimeClientId,
        }),
        runtimeInstallationId: input.runtimeInstallationId,
        trustedRuntimeClientId,
      })
    }
  }
  return {
    clientAttachmentId:
      typeof input.event.details?.clientAttachmentId === "string" ? input.event.details.clientAttachmentId : undefined,
    trustedRuntimeClientId,
  }
}

export async function monitorAndCompleteRemoteRuntimeSetupAttachment<
  TPrivateKey,
  TPublicKey extends RemoteRuntimeAsymmetricPublicKey,
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
  TRuntimeEncryptionKey,
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
>(
  input: MonitorAndCompleteRemoteRuntimeSetupAttachmentInput<
    TPrivateKey,
    TPublicKey,
    TAuthority,
    TRuntimeEncryptionKey,
    TEvent
  >,
  deps: MonitorAndCompleteRemoteRuntimeSetupAttachmentDeps<TPrivateKey, TPublicKey, TAuthority, TRuntimeEncryptionKey>,
): Promise<CompleteRemoteRuntimeSetupAttachmentResult | undefined> {
  let completion: CompleteRemoteRuntimeSetupAttachmentResult | undefined
  await monitorRemoteRuntimeSetupAttachment({
    gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
    listAuditEvents: () => input.client.listAuditEvents(),
    minCreatedAt: input.minCreatedAt,
    onAttached: async (event, events) => {
      completion = await completeRemoteRuntimeSetupAttachment({
        authorizationToken: input.authorizationToken,
        client: input.client,
        event,
        events,
        localRuntimeCredential: input.localRuntimeCredential,
        pollIntervalMs: input.pollIntervalMs,
        restartRuntime: deps.restartRuntime,
        runtimeConnectionCandidateBootstraps: input.runtimeConnectionCandidateBootstraps,
        runtimeHostState: await deps.readRuntimeHostState(),
        runtimeInstallationId: input.runtimeInstallationId,
        runtimeResponseSigningPrivateKey: input.runtimeResponseSigningPrivateKey,
        runtimeResponseSigningPublicKey: input.runtimeResponseSigningPublicKey,
      })
    },
    pollIntervalMs: input.pollIntervalMs,
    runtimeInstallationId: input.runtimeInstallationId,
    signal: input.signal,
    sleep: input.sleep,
    trustedRuntimeClientId: input.trustedRuntimeClientId,
  })
  return completion
}

export async function buildRemoteRuntimeSetupRuntimeConnectionCandidateBootstraps<
  TLocalGatewayAuthority extends
    RemoteRuntimeSetupRuntimeConnectionBootstrapLocalGatewayAuthority = RemoteRuntimeSetupRuntimeConnectionBootstrapLocalGatewayAuthority,
>(
  input: RemoteRuntimeSetupRuntimeConnectionBootstrapInput<TLocalGatewayAuthority>,
): Promise<RuntimeConnectionCandidateBootstrap[]> {
  const reusableLocalGatewayAuthority = input.runtimeHostState.runtime?.localGatewayAuthority
  const runtimeResponseSigningPublicKey =
    reusableLocalGatewayAuthority?.runtimeResponseSigningPublicKey ?? input.runtimeResponseSigningPublicKey
  if (!runtimeResponseSigningPublicKey || (!reusableLocalGatewayAuthority && !input.localRuntimeCredential)) {
    return []
  }

  const runtime = {
    localRuntimeAccessToken:
      reusableLocalGatewayAuthority?.expectedLocalRuntimeAccessToken ??
      input.localRuntimeCredential!.localRuntimeAccessToken,
    localRuntimeAccessTokenId:
      reusableLocalGatewayAuthority?.localRuntimeAccessTokenId ??
      input.localRuntimeCredential!.localRuntimeAccessTokenId,
    runtimeInstallationId: input.runtimeInstallationId,
    runtimeResponseSigningPublicKey,
  }
  const expiresAt = new Date((input.now ?? Date.now)() + 60 * 60 * 1000).toISOString()
  return await discoverRuntimeConnectionCandidateBootstraps({
    direct: input.runtimeHostState.host
      ? {
          expiresAt,
          host: input.runtimeHostState.host,
          runtime,
        }
      : null,
    expiresAt,
    runtime,
    tunnelProviders: input.tunnelProviders ?? [],
  })
}

export function remoteRuntimeRequestSigningKeyIdFromSerializedPublicKey(publicKey: string): string | undefined {
  const validation = validateSerializedRemoteRuntimeAsymmetricPublicKey(publicKey)
  return validation.ok && validation.value.purpose === "remoteRuntimeRequestSigning"
    ? validation.value.keyId
    : undefined
}

export function orderRemoteRuntimeConnectionCandidates<TCandidate extends RemoteRuntimeConnectionCandidateOrderKey>(
  candidates: readonly TCandidate[],
): TCandidate[] {
  return [...candidates].sort(
    (left, right) => left.priority - right.priority || left.candidateId.localeCompare(right.candidateId),
  )
}

export function buildRemoteRuntimeConnectionCandidateBootstrap<
  TEdgeAccess,
  TSigningPublicKey,
  TKind extends string,
  TEnvironment extends string,
  THostReachability extends string,
>(
  input: RemoteRuntimeConnectionCandidateBootstrapDefinition<
    TEdgeAccess,
    TSigningPublicKey,
    TKind,
    TEnvironment,
    THostReachability
  >,
  options: RemoteRuntimeConnectionCandidateBootstrapOptions = {},
): RemoteRuntimeConnectionCandidateBootstrap<TEdgeAccess, TSigningPublicKey, TKind, TEnvironment, THostReachability> {
  const baseUrl = normalizeRemoteRuntimeConnectionCandidateBaseUrl(input.baseHttpUrl, options)
  return {
    baseHttpUrl: remoteRuntimeConnectionCandidateBaseHttpUrl(baseUrl),
    candidateId: input.candidateId,
    edgeAccess: input.edgeAccess ?? null,
    ...(input.environment ? { environment: input.environment } : {}),
    expiresAt: input.expiresAt,
    ...(input.hostReachability ? { hostReachability: input.hostReachability } : {}),
    kind: input.kind,
    localRuntimeAccessToken: input.localRuntimeAccessToken,
    localRuntimeAccessTokenId: input.localRuntimeAccessTokenId,
    priority: input.priority,
    runtimeInstallationId: input.runtimeInstallationId,
    runtimeResponseSigningPublicKey: input.runtimeResponseSigningPublicKey,
    webSocketUrl: input.webSocketUrl?.trim()
      ? String(new URL(input.webSocketUrl))
      : defaultRemoteRuntimeConnectionCandidateWebSocketUrl(baseUrl),
  }
}

export function buildRemoteRuntimeConnectionCandidateBootstraps<
  TEdgeAccess,
  TSigningPublicKey,
  TKind extends string,
  TEnvironment extends string,
  THostReachability extends string,
>(
  candidates: readonly RemoteRuntimeConnectionCandidateBootstrapDefinition<
    TEdgeAccess,
    TSigningPublicKey,
    TKind,
    TEnvironment,
    THostReachability
  >[],
): Array<
  RemoteRuntimeConnectionCandidateBootstrap<TEdgeAccess, TSigningPublicKey, TKind, TEnvironment, THostReachability>
> {
  return orderRemoteRuntimeConnectionCandidates(
    candidates.map((candidate) =>
      buildRemoteRuntimeConnectionCandidateBootstrap(candidate, {
        preserveBasePath: candidate.kind === "direct",
        preserveSearch: candidate.kind === "direct",
      }),
    ),
  )
}

export function completeRemoteRuntimeConnectionCandidates<TBootstrap extends RemoteRuntimeConnectionCandidateOrderKey>(
  input: RemoteRuntimeConnectionCandidateCompletionInput<TBootstrap>,
): Array<
  TBootstrap & {
    readonly remoteRuntimeRequestSigningKeyId: string
    readonly trustedRuntimeClientId: string
  }
> {
  return orderRemoteRuntimeConnectionCandidates(
    input.bootstraps.map((bootstrap) => ({
      ...bootstrap,
      remoteRuntimeRequestSigningKeyId: input.remoteRuntimeRequestSigningKeyId,
      trustedRuntimeClientId: input.trustedRuntimeClientId,
    })),
  )
}

export function deduplicateRemoteRuntimeTrustedDeviceAuthorities<
  TAuthority extends RemoteRuntimeTrustedDeviceAuthority,
>(authorities: readonly TAuthority[]): TAuthority[] {
  const seenTrustedRuntimeClientIds = new Set<string>()
  return authorities.flatMap((authority) => {
    if (!authority.trustedRuntimeClientId.trim() || !authority.publicKey.trim()) return []
    if (seenTrustedRuntimeClientIds.has(authority.trustedRuntimeClientId)) return []
    seenTrustedRuntimeClientIds.add(authority.trustedRuntimeClientId)
    return [authority]
  })
}

export function mergeRemoteRuntimeLocalGatewayTrustedDeviceAuthorities<
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithTrustedDevices,
>(
  authority: TAuthority,
  additionalTrustedRuntimeClientAuthorities: readonly RemoteRuntimeLocalGatewayTrustedDeviceAuthority[],
): TAuthority & {
  readonly trustedRuntimeClientAuthorities: readonly RemoteRuntimeLocalGatewayTrustedDeviceAuthority[]
  readonly trustedRuntimeClientId: string
  readonly trustedRuntimeClientPublicKey: string
} {
  const trustedRuntimeClientAuthorities = deduplicateRemoteRuntimeTrustedDeviceAuthorities([
    ...additionalTrustedRuntimeClientAuthorities,
    ...(authority.trustedRuntimeClientAuthorities ?? []),
    {
      publicKey: authority.trustedRuntimeClientPublicKey,
      trustedRuntimeClientId: authority.trustedRuntimeClientId,
    },
  ])
  const primaryAuthority = trustedRuntimeClientAuthorities[0] ?? {
    publicKey: authority.trustedRuntimeClientPublicKey,
    trustedRuntimeClientId: authority.trustedRuntimeClientId,
  }
  return {
    ...authority,
    trustedRuntimeClientAuthorities,
    trustedRuntimeClientId: primaryAuthority.trustedRuntimeClientId,
    trustedRuntimeClientPublicKey: primaryAuthority.publicKey,
  }
}

export function remoteRuntimeSetupLocalGatewayAuthority<
  TAuthority extends RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey>,
  TPrivateKey,
  TPublicKey,
>(
  input: RemoteRuntimeSetupLocalGatewayAuthorityInput<TAuthority, TPrivateKey, TPublicKey>,
): RemoteRuntimeLocalGatewayAuthorityWithRuntimeCredential<TPrivateKey, TPublicKey> | TAuthority | undefined {
  const authority = input.localRuntimeCredential
    ? {
        expectedLocalRuntimeAccessToken: input.localRuntimeCredential.localRuntimeAccessToken,
        localRuntimeAccessTokenId: input.localRuntimeCredential.localRuntimeAccessTokenId,
        ...(input.runtimeResponseSigningPrivateKey
          ? { runtimeResponseSigningPrivateKey: input.runtimeResponseSigningPrivateKey }
          : {}),
        ...(input.runtimeResponseSigningPublicKey
          ? { runtimeResponseSigningPublicKey: input.runtimeResponseSigningPublicKey }
          : {}),
        trustedRuntimeClientId: input.trustedRuntimeClientId,
        trustedRuntimeClientPublicKey: input.trustedRuntimeClientPublicKey,
      }
    : input.existingLocalGatewayAuthority
      ? {
          ...input.existingLocalGatewayAuthority,
          trustedRuntimeClientId: input.trustedRuntimeClientId,
          trustedRuntimeClientPublicKey: input.trustedRuntimeClientPublicKey,
        }
      : undefined
  return authority
    ? mergeRemoteRuntimeLocalGatewayTrustedDeviceAuthorities(authority, [
        {
          publicKey: input.trustedRuntimeClientPublicKey,
          trustedRuntimeClientId: input.trustedRuntimeClientId,
        },
      ])
    : undefined
}

export function remoteRuntimeTrustedDeviceAuthoritiesFromLocalGatewayAuthority(
  authority?: RemoteRuntimeLocalGatewayAuthorityWithTrustedDevices,
): RemoteRuntimeLocalGatewayTrustedDeviceAuthority[] {
  if (!authority) return []
  return deduplicateRemoteRuntimeTrustedDeviceAuthorities([
    ...(authority.trustedRuntimeClientAuthorities ?? []),
    {
      publicKey: authority.trustedRuntimeClientPublicKey,
      trustedRuntimeClientId: authority.trustedRuntimeClientId,
    },
  ])
}

export function trustedRuntimeClientPublicKeyFromSetupEvents<
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
>(
  events: readonly TEvent[],
  input: {
    readonly runtimeInstallationId: string
    readonly trustedRuntimeClientId: string
  },
): string | undefined {
  return remoteRuntimeTrustedDeviceAuthoritiesFromSetupAuditEvents({
    events,
    runtimeInstallationId: input.runtimeInstallationId,
  }).find((authority) => authority.trustedRuntimeClientId === input.trustedRuntimeClientId)?.publicKey
}

export function remoteRuntimeTrustedDeviceAuthoritiesFromTrustedDeviceRecords<
  TDevice extends RemoteRuntimeTrustedDeviceRecordAuthority,
>(input: RemoteRuntimeTrustedDeviceRecordAuthorityInput<TDevice>): RemoteRuntimeTrustedDeviceAuthority[] {
  return deduplicateRemoteRuntimeTrustedDeviceAuthorities(
    input.devices.flatMap((device) => {
      if (
        device.runtimeInstallationId !== input.runtimeInstallationId ||
        device.state !== "trusted" ||
        !device.publicKey?.trim()
      ) {
        return []
      }
      return [
        {
          publicKey: device.publicKey,
          trustedRuntimeClientId: device.trustedRuntimeClientId,
        },
      ]
    }),
  )
}

export function remoteRuntimeTrustedDeviceAuthoritiesFromSetupAuditEvents<
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
>(input: RemoteRuntimeTrustedDeviceSetupAuditEventAuthorityInput<TEvent>): RemoteRuntimeTrustedDeviceAuthority[] {
  const seenTrustedDeviceIds = new Set<string>()
  const latestRevocationByTrustedDeviceId = new Map<string, string>()
  for (const event of input.events) {
    if (
      event.action !== remoteRuntimeDeviceRevokedAuditEventAction ||
      event.runtimeInstallationId !== input.runtimeInstallationId ||
      typeof event.trustedRuntimeClientId !== "string"
    ) {
      continue
    }
    const createdAt = typeof event.createdAt === "string" ? event.createdAt : ""
    const previousCreatedAt = latestRevocationByTrustedDeviceId.get(event.trustedRuntimeClientId) ?? ""
    if (createdAt >= previousCreatedAt) {
      latestRevocationByTrustedDeviceId.set(event.trustedRuntimeClientId, createdAt)
    }
  }
  return [...input.events]
    .filter(
      (event) =>
        typeof event.action === "string" &&
        isRemoteRuntimePairingAcceptedAuditEventAction(event.action) &&
        event.runtimeInstallationId === input.runtimeInstallationId &&
        typeof event.trustedRuntimeClientId === "string" &&
        event.trustedRuntimeClientId.trim().length > 0,
    )
    .sort((left, right) => {
      const leftCreatedAt = typeof left.createdAt === "string" ? left.createdAt : ""
      const rightCreatedAt = typeof right.createdAt === "string" ? right.createdAt : ""
      return rightCreatedAt.localeCompare(leftCreatedAt)
    })
    .flatMap((event) => {
      if (typeof event.trustedRuntimeClientId !== "string") return []
      const trustedRuntimeClientId = event.trustedRuntimeClientId
      if (seenTrustedDeviceIds.has(trustedRuntimeClientId)) return []
      const acceptedCreatedAt = typeof event.createdAt === "string" ? event.createdAt : ""
      const revokedCreatedAt = latestRevocationByTrustedDeviceId.get(trustedRuntimeClientId)
      if (revokedCreatedAt !== undefined && revokedCreatedAt >= acceptedCreatedAt) return []
      const publicKey =
        typeof event.details?.publicKey === "string" && event.details.publicKey.trim()
          ? event.details.publicKey
          : undefined
      if (!publicKey) return []
      seenTrustedDeviceIds.add(trustedRuntimeClientId)
      return [{ publicKey, trustedRuntimeClientId }]
    })
}

export async function monitorRemoteRuntimeSetupAttachment<
  TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority,
>(options: RemoteRuntimeSetupAttachmentMonitorOptions<TEvent>): Promise<void> {
  const pollIntervalMs = Math.max(0, options.pollIntervalMs ?? 1000)
  const sleep = options.sleep ?? sleepRemoteRuntimeAttachmentMonitor

  while (!options.signal?.aborted) {
    const events = await options.listAuditEvents()
    const event = findRemoteRuntimeSetupAttachmentEvent(events, {
      gatewayRuntimeAttachmentId: options.gatewayRuntimeAttachmentId,
      minCreatedAt: options.minCreatedAt,
      runtimeInstallationId: options.runtimeInstallationId,
      trustedRuntimeClientId: options.trustedRuntimeClientId,
    })
    if (event) {
      await options.onAttached(event, events)
      return
    }
    await sleep(pollIntervalMs, options.signal)
  }
}

function findRemoteRuntimeSetupAttachmentEvent<TEvent extends RemoteRuntimeTrustedDeviceSetupAuditEventAuthority>(
  events: readonly TEvent[],
  input: {
    readonly gatewayRuntimeAttachmentId: string
    readonly minCreatedAt?: string
    readonly runtimeInstallationId: string
    readonly trustedRuntimeClientId?: string | null
  },
): TEvent | undefined {
  const createdAfterSetupToken = (event: TEvent) => {
    if (!input.minCreatedAt) return true
    return typeof event.createdAt === "string" && event.createdAt >= input.minCreatedAt
  }

  const authoritativeTrustedRuntimeClientId =
    input.trustedRuntimeClientId ??
    events
      .filter(
        (event) =>
          typeof event.action === "string" &&
          isRemoteRuntimePairingAcceptedAuditEventAction(event.action) &&
          createdAfterSetupToken(event) &&
          event.runtimeInstallationId === input.runtimeInstallationId &&
          typeof event.trustedRuntimeClientId === "string" &&
          event.trustedRuntimeClientId.trim().length > 0,
      )
      .sort((left, right) => {
        const leftCreatedAt = typeof left.createdAt === "string" ? left.createdAt : ""
        const rightCreatedAt = typeof right.createdAt === "string" ? right.createdAt : ""
        return rightCreatedAt.localeCompare(leftCreatedAt)
      })[0]?.trustedRuntimeClientId

  if (!authoritativeTrustedRuntimeClientId) {
    return undefined
  }

  return (
    events.find((event) => {
      return (
        event.action === remoteRuntimeClientAttachedAuditEventAction &&
        createdAfterSetupToken(event) &&
        event.runtimeInstallationId === input.runtimeInstallationId &&
        event.trustedRuntimeClientId === authoritativeTrustedRuntimeClientId &&
        event.details?.gatewayRuntimeAttachmentId === input.gatewayRuntimeAttachmentId
      )
    }) ??
    events.find((event) => {
      return (
        event.action === remoteRuntimeClientAttachedAuditEventAction &&
        createdAfterSetupToken(event) &&
        event.runtimeInstallationId === input.runtimeInstallationId &&
        event.trustedRuntimeClientId === authoritativeTrustedRuntimeClientId
      )
    })
  )
}

function sleepRemoteRuntimeAttachmentMonitor(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("Aborted"))
      return
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, milliseconds)
    function onAbort() {
      clearTimeout(timeout)
      signal?.removeEventListener("abort", onAbort)
      reject(signal?.reason ?? new Error("Aborted"))
    }
    signal?.addEventListener("abort", onAbort, { once: true })
  }).catch((error) => {
    if (signal?.aborted) return
    throw error
  })
}

function isRemoteRuntimeAdapterJsonObject(
  value: RemoteRuntimeJsonValue,
): value is { readonly [key: string]: RemoteRuntimeJsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
