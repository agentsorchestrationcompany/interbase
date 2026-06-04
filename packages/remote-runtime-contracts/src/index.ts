export {
  isRemoteRuntimeAttachmentCapability,
  isRemoteRuntimeCapability,
  remoteRuntimeAttachmentCapabilityValues,
  remoteRuntimeCapabilityValues,
  remoteRuntimeConnectorMetadataCapabilities,
} from "./capabilities.js"
export type { RemoteRuntimeAttachmentCapability, RemoteRuntimeCapability } from "./capabilities.js"
export { isRuntimeAttachmentRoutable } from "./runtime-attachment.js"
export { runtimeOwnerForRemoteRuntimeAttachment } from "./runtime-owner.js"
import {
  isRemoteRuntimeAttachmentCapability,
  isRemoteRuntimeCapability,
  remoteRuntimeConnectorMetadataCapabilities,
} from "./capabilities.js"
import type { RemoteRuntimeAttachmentCapability, RemoteRuntimeCapability } from "./capabilities.js"
import { runtimeOwnerForRemoteRuntimeAttachment } from "./runtime-owner.js"
import type { RuntimeWebSocketAllowedDirectory } from "./remote-runtime-protocol.js"

export type RemoteRuntimeMode = "disabled" | "localDirect" | "custom"

export type RemoteRuntimeJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly RemoteRuntimeJsonValue[]
  | { readonly [key: string]: RemoteRuntimeJsonValue }

export function requiredRemoteRuntimeApiString(
  record: { readonly [key: string]: unknown },
  field: string,
  label: string,
): string {
  const value = record[field]
  if (typeof value === "string" && value.trim()) {
    return value
  }
  throw new Error(`Remote runtime setup did not receive ${field} from ${label}.`)
}

export const runtimeConnectionCandidateKindValues = [
  "direct",
  "cloudflareTunnel",
  "zrokPublicHttp",
  "interbaseRelay",
] as const

export type RuntimeConnectionCandidateKind = (typeof runtimeConnectionCandidateKindValues)[number]

export const runtimeConnectionCandidateEnvironmentValues = [
  "simulator",
  "physicalDevice",
  "lan",
  "tunnel",
  "gateway",
] as const

export type RuntimeConnectionCandidateEnvironment = (typeof runtimeConnectionCandidateEnvironmentValues)[number]

export const runtimeConnectionCandidateHostReachabilityValues = ["loopback", "lan", "public"] as const

export type RuntimeConnectionCandidateHostReachability =
  (typeof runtimeConnectionCandidateHostReachabilityValues)[number]

export const remoteRuntimeStatusSnapshotStateValues = [
  "online",
  "degraded",
  "offline",
  "revoked",
  "unavailable",
] as const

export type RemoteRuntimeStatusSnapshotState = (typeof remoteRuntimeStatusSnapshotStateValues)[number]

export const remoteRuntimeRealtimeEventTypeValues = [
  "runtime.status.changed",
  "activeChats.changed",
  "chat.changed",
  "chatMessages.changed",
  "goals.changed",
  "aliases.changed",
  "chat.stream.delta",
  "chat.stream.part",
  "operation.completed",
  "operation.failed",
] as const

export type RemoteRuntimeRealtimeEventType = (typeof remoteRuntimeRealtimeEventTypeValues)[number]

export const remoteRuntimeRealtimeResourceKindValues = [
  "runtime",
  "activeChats",
  "chat",
  "chatMessages",
  "goals",
  "aliases",
  "providers",
] as const

export type RemoteRuntimeRealtimeResourceKind = (typeof remoteRuntimeRealtimeResourceKindValues)[number]

export const remoteRuntimeTransportMessageTypeValues = [
  "gatewayRuntime.attach",
  "client.attach",
  "runtime.operation",
  "runtime.response",
  "runtime.status",
  "attachment.revoked",
  "runtime.unavailable",
  "authorization.failed",
  "idempotency.conflict",
  "pairing.invalid",
  "runtime.command.failed",
  "heartbeat",
  "protocol.mismatch",
] as const

export type RemoteRuntimeTransportMessageType = (typeof remoteRuntimeTransportMessageTypeValues)[number]

export const remoteRuntimeOperationClassValues = [
  "metadataRead",
  "sensitiveRead",
  "mutation",
  "privilegedExecution",
  "credential",
  "shutdown",
] as const

export type RemoteRuntimeOperationClass = (typeof remoteRuntimeOperationClassValues)[number]

export const remoteRuntimeResponseSensitivityValues = ["none", "metadata", "sensitive", "credential"] as const

export type RemoteRuntimeResponseSensitivity = (typeof remoteRuntimeResponseSensitivityValues)[number]

export const remoteRuntimeClientTrustLevelValues = ["untrusted", "paired", "trusted"] as const

export type RemoteRuntimeClientTrustLevel = (typeof remoteRuntimeClientTrustLevelValues)[number]

export const remoteRuntimeTransportProtocolVersion = "2026-05-08"
export const supportedRemoteRuntimeTransportProtocolVersions = [remoteRuntimeTransportProtocolVersion] as const

export const remoteRuntimeHttpContractVersion = "2026-05-14" as const
export const remoteRuntimeWebSocketContractVersion = "2026-05-14" as const
export const previousRemoteRuntimeHttpContractVersion = "2026-05-08" as const
export const supportedRemoteRuntimeHttpContractVersions = [
  previousRemoteRuntimeHttpContractVersion,
  remoteRuntimeHttpContractVersion,
] as const
export const runtimeWebSocketRemoteRuntimeProtocolVersion = "0.1.6" as const
export const previousRuntimeWebSocketRemoteRuntimeProtocolVersion = "0.1.5" as const
export const supportedRuntimeWebSocketRemoteRuntimeProtocolVersions = [
  previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
  runtimeWebSocketRemoteRuntimeProtocolVersion,
] as const
export const remoteRuntimeHttpVersionHeaderName = "Interbase-Remote-Runtime-HTTP-Version" as const
export const remoteRuntimeWebSocketVersionHeaderName = "Interbase-Remote-Runtime-WebSocket-Version" as const
export const remoteRuntimeHttpRequestSigningKeyIdHeaderName = "Interbase-Remote-Runtime-Key-Id" as const
export const remoteRuntimeHttpRequestSignatureAlgorithmHeaderName =
  "Interbase-Remote-Runtime-Signature-Algorithm" as const
export const remoteRuntimeHttpRequestSignatureTimestampHeaderName =
  "Interbase-Remote-Runtime-Signature-Timestamp" as const
export const remoteRuntimeHttpRequestSignatureNonceHeaderName = "Interbase-Remote-Runtime-Signature-Nonce" as const
export const remoteRuntimeHttpRequestBodySha256HeaderName = "Interbase-Remote-Runtime-Body-SHA256" as const
export const remoteRuntimeHttpRequestSignatureHeaderName = "Interbase-Remote-Runtime-Signature" as const
export const remoteRuntimeHttpResponseSigningKeyIdHeaderName = "Interbase-Runtime-Response-Key-Id" as const
export const remoteRuntimeHttpResponseSignatureAlgorithmHeaderName =
  "Interbase-Runtime-Response-Signature-Algorithm" as const
export const remoteRuntimeHttpResponseSignatureTimestampHeaderName =
  "Interbase-Runtime-Response-Signature-Timestamp" as const
export const remoteRuntimeHttpResponseSignatureNonceHeaderName = "Interbase-Runtime-Response-Signature-Nonce" as const
export const remoteRuntimeHttpResponseBodySha256HeaderName = "Interbase-Runtime-Response-Body-SHA256" as const
export const remoteRuntimeHttpResponseSignatureHeaderName = "Interbase-Runtime-Response-Signature" as const
export const remoteRuntimeWebSocketPublicKeyHeaderName = "Interbase-Remote-Runtime-Public-Key" as const
export const localRuntimeAccessTokenHeaderName = "Interbase-Local-Runtime-Access-Token" as const
export const localRuntimeAccessTokenIdHeaderName = "Interbase-Local-Runtime-Access-Token-Id" as const
export const localRemoteRuntimeRequestIdHeaderName = "Interbase-Remote-Runtime-Request-Id" as const

export const remoteRuntimeHttpRequestSignatureHeaderNames = [
  remoteRuntimeHttpRequestSigningKeyIdHeaderName,
  remoteRuntimeHttpRequestSignatureAlgorithmHeaderName,
  remoteRuntimeHttpRequestSignatureTimestampHeaderName,
  remoteRuntimeHttpRequestSignatureNonceHeaderName,
  remoteRuntimeHttpRequestBodySha256HeaderName,
  remoteRuntimeHttpRequestSignatureHeaderName,
] as const

export const remoteRuntimeHttpResponseSignatureHeaderNames = [
  remoteRuntimeHttpResponseSigningKeyIdHeaderName,
  remoteRuntimeHttpResponseSignatureAlgorithmHeaderName,
  remoteRuntimeHttpResponseSignatureTimestampHeaderName,
  remoteRuntimeHttpResponseSignatureNonceHeaderName,
  remoteRuntimeHttpResponseBodySha256HeaderName,
  remoteRuntimeHttpResponseSignatureHeaderName,
] as const

export type RemoteRuntimeHttpContractVersion = (typeof supportedRemoteRuntimeHttpContractVersions)[number]

export const remoteRuntimeHttpFailureCodeValues = ["REMOTE_RUNTIME_HTTP_VERSION_MISMATCH"] as const
export const remoteRuntimePublicKeyPurposeValues = ["remoteRuntimeRequestSigning", "runtimeResponseSigning"] as const

export type RemoteRuntimePublicKeyPurpose = (typeof remoteRuntimePublicKeyPurposeValues)[number]

export const remoteRuntimePublicKeyAlgorithmValues = ["ed25519"] as const

export type RemoteRuntimePublicKeyAlgorithm = (typeof remoteRuntimePublicKeyAlgorithmValues)[number]

export const remoteRuntimePublicKeyEncodingValues = ["base64url"] as const

export type RemoteRuntimePublicKeyEncoding = (typeof remoteRuntimePublicKeyEncodingValues)[number]

export const remoteRuntimeRequestSignatureAlgorithmValues = ["ed25519"] as const

export type RemoteRuntimeRequestSignatureAlgorithm = (typeof remoteRuntimeRequestSignatureAlgorithmValues)[number]

export const remoteRuntimeEncryptedPayloadAlgorithmValues = ["aes-256-gcm"] as const

export type RemoteRuntimeEncryptedPayloadAlgorithm = (typeof remoteRuntimeEncryptedPayloadAlgorithmValues)[number]

export const remoteRuntimeEncryptedPayloadContentTypeValues = ["runtimeWebSocketClientCommand"] as const

export type RemoteRuntimeEncryptedPayloadContentType = (typeof remoteRuntimeEncryptedPayloadContentTypeValues)[number]

export type RemoteRuntimeEncryptedPayload = {
  readonly algorithm: RemoteRuntimeEncryptedPayloadAlgorithm
  readonly ciphertext: string
  readonly contentType: RemoteRuntimeEncryptedPayloadContentType
  readonly keyId: string
  readonly nonce: string
}

export type RuntimeTunnelEdgeAccess = {
  readonly clientId: string
  readonly clientIdHeaderName: string
  readonly clientSecret: string
  readonly clientSecretHeaderName: string
  readonly provider: "cloudflareAccess"
}

export type RuntimeConnectionCandidate = {
  readonly baseHttpUrl: string
  readonly candidateId: string
  readonly edgeAccess: RuntimeTunnelEdgeAccess | null
  readonly environment?: RuntimeConnectionCandidateEnvironment
  readonly expiresAt: string
  readonly hostReachability?: RuntimeConnectionCandidateHostReachability
  readonly kind: RuntimeConnectionCandidateKind
  readonly localRuntimeAccessToken: string
  readonly localRuntimeAccessTokenId: string
  readonly remoteRuntimeRequestSigningKeyId: string
  readonly priority: number
  readonly runtimeInstallationId: string
  readonly runtimeResponseSigningPublicKey: RemoteRuntimeAsymmetricPublicKey
  readonly trustedRuntimeClientId: string
  readonly webSocketUrl: string
}

export type RuntimeConnectionCandidateBootstrap = {
  readonly baseHttpUrl: string
  readonly candidateId: string
  readonly edgeAccess: RuntimeTunnelEdgeAccess | null
  readonly environment?: RuntimeConnectionCandidateEnvironment
  readonly expiresAt: string
  readonly hostReachability?: RuntimeConnectionCandidateHostReachability
  readonly kind: RuntimeConnectionCandidateKind
  readonly localRuntimeAccessToken: string
  readonly localRuntimeAccessTokenId: string
  readonly priority: number
  readonly runtimeInstallationId: string
  readonly runtimeResponseSigningPublicKey: RemoteRuntimeAsymmetricPublicKey
  readonly webSocketUrl: string
}

export type GatewayRuntimeAttachmentRegistrationRequest = {
  readonly accountId: string
  readonly allowedDirectories?: readonly RuntimeWebSocketAllowedDirectory[]
  readonly attachmentCapabilities: readonly RemoteRuntimeAttachmentCapability[]
  readonly connectorVersion: string
  readonly directoryId: string
  readonly directoryPath: string
  readonly featureCapabilities?: readonly RemoteRuntimeCapability[]
  readonly protocolVersion: string
  readonly requestId: string
  readonly runtimeInstallationId: string
  readonly ticket: string
}

export type GatewayRuntimeAttachmentRegistrationInput = Omit<
  GatewayRuntimeAttachmentRegistrationRequest,
  "attachmentCapabilities" | "protocolVersion"
> & {
  readonly attachmentCapabilities?: readonly RemoteRuntimeAttachmentCapability[]
  readonly featureCapabilities?: readonly RemoteRuntimeCapability[]
}

export type GatewayRuntimeAttachment = {
  accountId: string
  allowedDirectories?: RuntimeWebSocketAllowedDirectory[]
  attachmentCapabilities: RemoteRuntimeAttachmentCapability[]
  connectorVersion: string
  deviceTrustLevel?: RemoteRuntimeClientTrustLevel
  directoryId: string
  directoryPath: string
  featureCapabilities: RemoteRuntimeCapability[]
  gatewayRuntimeAttachmentId: string
  runtimeInstallationId: string
  status: "degraded" | "online" | "revoked" | "unavailable"
}

export type RemoteRuntimeClientAttachmentRequest = {
  accountId: string
  deviceTrustLevel?: RemoteRuntimeClientTrustLevel
  protocolVersion: string
  requestId: string
  runtimeInstallationId: string
  ticket: string
  trustedRuntimeClientId: string
}

export type RemoteRuntimeClientAttachment = {
  accountId: string
  deviceTrustLevel: RemoteRuntimeClientTrustLevel
  gatewayRuntimeAttachmentId: string
  clientAttachmentId: string
  runtimeInstallationId: string
  status: "attached" | "revoked"
  trustedRuntimeClientId: string
}

export const remoteRuntimeTransportFailureCodeValues = [
  "ATTACHMENT_REVOKED",
  "AUTHORIZATION_FAILED",
  "DEVICE_REVOKED",
  "IDEMPOTENCY_CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "PAIRING_EXPIRED",
  "PAIRING_KEY_REJECTED",
  "PAIRING_SUPERSEDED",
  "PROTOCOL_MISMATCH",
  "RUNTIME_COMMAND_FAILED",
  "RUNTIME_REVOKED",
  "RUNTIME_UNAVAILABLE",
  "VALIDATION_FAILED",
] as const

export type RemoteRuntimeTransportFailureCode = (typeof remoteRuntimeTransportFailureCodeValues)[number]

export const remoteRuntimeTransportPairingActionValues = [
  "keep",
  "re_pair",
  "retry",
  "upgrade_app",
  "upgrade_cli",
] as const

export type RemoteRuntimeTransportPairingAction = (typeof remoteRuntimeTransportPairingActionValues)[number]

export type RemoteRuntimeTransportFailureEnvelopeType =
  | "attachment.revoked"
  | "authorization.failed"
  | "idempotency.conflict"
  | "pairing.invalid"
  | "runtime.command.failed"
  | "runtime.unavailable"
  | "protocol.mismatch"

export type RemoteRuntimeTransportFailureEnvelope = {
  readonly code: RemoteRuntimeTransportFailureCode
  readonly message: string
  readonly pairingAction: RemoteRuntimeTransportPairingAction
  readonly protocolVersion: string
  readonly requestId: string
  readonly replacementRuntimeInstallationId?: string | null
  readonly runtimeInstallationId?: string | null
  readonly terminal: boolean
  readonly type: RemoteRuntimeTransportFailureEnvelopeType
}

export type RemoteRuntimeTransportFailureMetadata = {
  readonly replacementRuntimeInstallationId?: string | null
  readonly runtimeInstallationId?: string | null
}

export type RuntimeStatusFrame = {
  readonly attachmentCapabilities: readonly RemoteRuntimeAttachmentCapability[]
  readonly connectorVersion: string
  readonly featureCapabilities?: readonly RemoteRuntimeCapability[]
  readonly gatewayRuntimeAttachmentId: string
  readonly protocolVersion: string
  readonly replay: "supported" | "unsupported" | "unavailable"
  readonly requestId: string
  readonly runtimeApiVersion: string
  readonly sequence: number
  readonly status: "online" | "offline" | "revoked" | "unavailable"
  readonly type: "runtime.status"
}

export type AttachmentStatusSequencer = {
  accept(frame: RuntimeStatusFrame): boolean
  lastSequence(gatewayRuntimeAttachmentId: string): number
}

export type RemoteRuntimeAsymmetricPublicKey = {
  readonly algorithm: RemoteRuntimePublicKeyAlgorithm
  readonly createdAt: string
  readonly encoding: RemoteRuntimePublicKeyEncoding
  readonly keyId: string
  readonly publicKey: string
  readonly purpose: RemoteRuntimePublicKeyPurpose
}

export type RemoteRuntimeAsymmetricPrivateKeyReference = {
  readonly algorithm: RemoteRuntimePublicKeyAlgorithm
  readonly encoding: "pkcs8-base64url"
  readonly keyId: string
  readonly privateKey: string
  readonly purpose: RemoteRuntimePublicKeyPurpose
}

export type RemoteRuntimeAsymmetricKeyPair = {
  readonly privateKey: RemoteRuntimeAsymmetricPrivateKeyReference
  readonly publicKey: RemoteRuntimeAsymmetricPublicKey
}

export type GenerateRemoteRuntimeAsymmetricKeyPairInput = {
  readonly createdAt: string
  readonly keyId: string
  readonly purpose: RemoteRuntimePublicKeyPurpose
}

export type RemoteRuntimeSerializedEncryptionKey = {
  readonly keyBase64: string
  readonly keyId: string
}

export type RemoteRuntimeAsymmetricPublicKeyValidationFailure = {
  readonly message: string
}

export type RemoteRuntimeAsymmetricPublicKeyValidationResult =
  | { readonly ok: true; readonly value: RemoteRuntimeAsymmetricPublicKey }
  | { readonly error: RemoteRuntimeAsymmetricPublicKeyValidationFailure; readonly ok: false }

export type RemoteRuntimeKeyPossessionProofPayloadInput = {
  readonly challengeId: string | null
  readonly connectorVersion: string | null
  readonly deviceName: string | null
  readonly keyId: string
  readonly nonce: string
  readonly publicKey: string
  readonly purpose: RemoteRuntimePublicKeyPurpose
  readonly runtimeInstallationId: string | null
  readonly timestamp: string
}

export type RemoteRuntimeKeyPossessionProof = {
  readonly algorithm: RemoteRuntimeRequestSignatureAlgorithm
  readonly keyId: string
  readonly nonce: string
  readonly signature: string
  readonly timestamp: string
}

const remoteRuntimeKeyPossessionProofAuthorityBrand = Symbol("RemoteRuntimeKeyPossessionProofAuthority")

export type RemoteRuntimeKeyPossessionProofAuthority = {
  readonly keyProof: RemoteRuntimeKeyPossessionProof
  readonly publicKey: string
  readonly [remoteRuntimeKeyPossessionProofAuthorityBrand]: true
}

export type RemoteRuntimeRequestSignatureProof = {
  readonly algorithm: RemoteRuntimeRequestSignatureAlgorithm
  readonly bodySha256: string
  readonly keyId: string
  readonly nonce: string
  readonly signature: string
  readonly timestamp: string
}

export type RemoteRuntimeHttpResponseSignatureProof = {
  readonly algorithm: RemoteRuntimeRequestSignatureAlgorithm
  readonly bodySha256: string
  readonly keyId: string
  readonly nonce: string
  readonly signature: string
  readonly timestamp: string
}

export type RemoteRuntimeWebSocketActionSignatureProof = {
  readonly algorithm: RemoteRuntimeRequestSignatureAlgorithm
  readonly keyId: string
  readonly nonce: string
  readonly payloadSha256: string
  readonly signature: string
  readonly timestamp: string
}

export const remoteRuntimeWebSocketSessionAcceptedType = "remoteRuntime.websocket.session.accepted" as const

export const remoteRuntimeWebSocketActionType = "remoteRuntime.websocket.action" as const

export const remoteRuntimeKeyPossessionPayloadScope = "interbase-remote-runtime-key-possession-v1" as const

export const previousClientKeyPossessionPayloadScope = "interbase-client-key-possession-v1" as const

export const remoteRuntimeHttpSigningPayloadScope = "interbase-remote-runtime-http-signature-v1" as const

export const remoteRuntimeWebSocketUpgradeSigningPayloadScope =
  "interbase-remote-runtime-websocket-upgrade-signature-v1" as const

export const remoteRuntimeWebSocketActionSigningPayloadScope =
  "interbase-remote-runtime-websocket-action-signature-v1" as const

export type RemoteRuntimeWebSocketSessionAccepted = {
  readonly protocolVersion: typeof remoteRuntimeTransportProtocolVersion
  readonly sessionNonce: string
  readonly type: typeof remoteRuntimeWebSocketSessionAcceptedType
}

export type RemoteRuntimeWebSocketSignedAction<TPayload = RemoteRuntimeJsonValue> = {
  readonly payload: TPayload
  readonly proof: RemoteRuntimeWebSocketActionSignatureProof
  readonly protocolVersion: typeof remoteRuntimeTransportProtocolVersion
  readonly sequence: number
  readonly sessionNonce: string
  readonly type: typeof remoteRuntimeWebSocketActionType
}

export type RemoteRuntimeCanonicalHttpSigningPayloadInput = {
  readonly bodySha256: string
  readonly canonicalPath: string
  readonly canonicalQuery: string
  readonly idempotencyKey: string | null
  readonly keyId: string
  readonly localRuntimeAccessTokenId: string | null
  readonly method: string
  readonly remoteRuntimeHttpVersion?: RemoteRuntimeHttpContractVersion
  readonly nonce: string
  readonly requestId: string | null
  readonly runtimeInstallationId: string
  readonly timestamp: string
  readonly trustedRuntimeClientId: string
}

export type RemoteRuntimeCanonicalHttpResponseSigningPayloadInput = {
  readonly bodySha256: string
  readonly canonicalPath: string
  readonly canonicalQuery: string
  readonly keyId: string
  readonly localRuntimeAccessTokenId: string | null
  readonly method: string
  readonly remoteRuntimeHttpVersion?: RemoteRuntimeHttpContractVersion
  readonly nonce: string
  readonly requestId: string | null
  readonly runtimeInstallationId: string
  readonly status: number
  readonly timestamp: string
  readonly trustedRuntimeClientId: string
}

export type RemoteRuntimeCanonicalHttpSigningPayload = {
  readonly algorithm: RemoteRuntimeRequestSignatureAlgorithm
  readonly payload: string
}

export type RemoteRuntimeCanonicalHttpResponseSigningPayload = {
  readonly algorithm: RemoteRuntimeRequestSignatureAlgorithm
  readonly payload: string
}

export type RemoteRuntimeCanonicalWebSocketUpgradeSigningPayloadInput = {
  readonly accountId: string
  readonly canonicalPath: string
  readonly canonicalQuery: string
  readonly keyId: string
  readonly localRuntimeAccessTokenId: string | null
  readonly nonce: string
  readonly requestId: string | null
  readonly runtimeInstallationId: string
  readonly timestamp: string
  readonly trustedRuntimeClientId: string
  readonly webSocketVersion: typeof remoteRuntimeWebSocketContractVersion
}

export type RemoteRuntimeCanonicalWebSocketUpgradeSigningPayload = {
  readonly algorithm: RemoteRuntimeRequestSignatureAlgorithm
  readonly payload: string
}

export type RemoteRuntimeCanonicalWebSocketActionSigningPayloadInput = {
  readonly keyId: string
  readonly nonce: string
  readonly payloadSha256: string
  readonly requestId: string | null
  readonly runtimeInstallationId: string
  readonly sequence: number
  readonly sessionNonce: string
  readonly timestamp: string
  readonly trustedRuntimeClientId: string
}

export type RemoteRuntimeCanonicalWebSocketActionSigningPayload = {
  readonly algorithm: RemoteRuntimeRequestSignatureAlgorithm
  readonly payload: string
}

export type RemoteRuntimeHttpFailureCode = (typeof remoteRuntimeHttpFailureCodeValues)[number]

export type RemoteRuntimeHttpVersionMismatchFailure = {
  readonly code: "REMOTE_RUNTIME_HTTP_VERSION_MISMATCH"
  readonly message: string
  readonly receivedVersion: string | null
  readonly supportedVersions: string[]
  readonly requestId: string | null
}

export type RemoteRuntimeHttpVersionValidationResult =
  | { readonly ok: true; readonly version: RemoteRuntimeHttpContractVersion }
  | { readonly error: RemoteRuntimeHttpVersionMismatchFailure; readonly ok: false; readonly status: 400 | 426 }

export type RuntimeOperationReplyTarget =
  | { readonly kind: "remoteRuntimeAttachment"; readonly remoteRuntimeAttachmentId: string }
  | { readonly kind: "gatewayHttpRequest"; readonly gatewayHttpRequestId: string }

export type RuntimeOperationReplyTargetFrameAuthority = {
  readonly clientAttachmentId: string
  readonly replyTarget?: RemoteRuntimeJsonValue
  readonly trustedGatewayHttpRequest?: true
}

export type RuntimeOperationReplyTargetValidationResult =
  | { readonly ok: true; readonly value: RuntimeOperationReplyTarget }
  | { readonly error: RemoteRuntimeTransportFailureEnvelope; readonly ok: false }

export type RuntimeAttachmentHealth =
  | "starting"
  | "online"
  | "degraded"
  | "unavailable"
  | "revoking"
  | "revoked"
  | "expired"

export type RemoteRuntimeAttachmentKind = "realSocketAttachment"

export type RuntimeOwner = {
  readonly kind: "remoteRuntimeAttachment"
  readonly remoteRuntimeAttachmentId: string
}

export type RemoteRuntimeSupportedVersions = {
  readonly remoteRuntimeHttp: readonly string[]
  readonly remoteRuntimeTransport: readonly string[]
  readonly runtimeWebSocket: readonly string[]
}

export type RemoteRuntimeAcceptedVersions = {
  readonly remoteRuntimeHttp: string
  readonly remoteRuntimeTransport: string
  readonly runtimeWebSocket: string
}

export type RemoteRuntimeReceivedVersions = {
  readonly remoteRuntimeHttp?: string
  readonly remoteRuntimeTransport?: string
  readonly runtimeWebSocket?: string
}

export type RemoteRuntimeAdvertisedVersions = {
  readonly remoteRuntimeHttp: readonly string[]
  readonly remoteRuntimeTransport: readonly string[]
  readonly runtimeWebSocket: readonly string[]
}

export type RemoteRuntimeVersionNegotiationResult =
  | {
      readonly compatible: true
      readonly accepted: RemoteRuntimeAcceptedVersions
    }
  | {
      readonly compatible: false
      readonly received: RemoteRuntimeReceivedVersions
      readonly supported: RemoteRuntimeSupportedVersions
      readonly remediation: string
    }

export type RemoteRuntimeAdvertisedVersionNegotiationResult =
  | {
      readonly compatible: true
      readonly accepted: RemoteRuntimeAcceptedVersions
      readonly advertised: RemoteRuntimeAdvertisedVersions
    }
  | {
      readonly compatible: false
      readonly advertised: RemoteRuntimeAdvertisedVersions
      readonly supported: RemoteRuntimeSupportedVersions
      readonly remediation: string
    }

export const currentRemoteRuntimeSupportedVersions = {
  remoteRuntimeHttp: supportedRemoteRuntimeHttpContractVersions,
  remoteRuntimeTransport: supportedRemoteRuntimeTransportProtocolVersions,
  runtimeWebSocket: supportedRuntimeWebSocketRemoteRuntimeProtocolVersions,
} as const satisfies RemoteRuntimeSupportedVersions

export function currentRemoteRuntimeAcceptedVersions(): RemoteRuntimeAcceptedVersions {
  return {
    remoteRuntimeHttp:
      currentRemoteRuntimeSupportedVersions.remoteRuntimeHttp[
        currentRemoteRuntimeSupportedVersions.remoteRuntimeHttp.length - 1
      ],
    remoteRuntimeTransport:
      currentRemoteRuntimeSupportedVersions.remoteRuntimeTransport[
        currentRemoteRuntimeSupportedVersions.remoteRuntimeTransport.length - 1
      ],
    runtimeWebSocket:
      currentRemoteRuntimeSupportedVersions.runtimeWebSocket[
        currentRemoteRuntimeSupportedVersions.runtimeWebSocket.length - 1
      ],
  }
}

export function runtimeOperationFrameReplyTarget(
  input:
    | { readonly clientAttachmentId: string; readonly gatewayHttpRequestId?: never }
    | { readonly gatewayHttpRequestId: string; readonly clientAttachmentId?: never },
): RuntimeOperationReplyTarget {
  if (input.clientAttachmentId !== undefined) {
    return runtimeOwnerForRemoteRuntimeAttachment(input.clientAttachmentId)
  }
  return { kind: "gatewayHttpRequest", gatewayHttpRequestId: input.gatewayHttpRequestId }
}

export function runtimeOperationReplyTargetFromFrameAuthority(
  frame: RuntimeOperationReplyTargetFrameAuthority,
): RuntimeOperationReplyTarget {
  const validation = validatedRuntimeOperationReplyTargetFromFrameAuthority(frame, "unknown")
  if (validation.ok) return validation.value
  return frame.trustedGatewayHttpRequest === true
    ? { gatewayHttpRequestId: frame.clientAttachmentId, kind: "gatewayHttpRequest" }
    : runtimeOwnerForRemoteRuntimeAttachment(frame.clientAttachmentId)
}

export function isRemoteRuntimeHttpContractVersionSupported(
  receivedVersion: string,
): receivedVersion is RemoteRuntimeHttpContractVersion {
  return supportedRemoteRuntimeHttpContractVersions.includes(receivedVersion as RemoteRuntimeHttpContractVersion)
}

export function validateRemoteRuntimeHttpContractVersionHeader(
  receivedVersion: string | null,
  requestId: string | null = null,
): RemoteRuntimeHttpVersionValidationResult {
  if (receivedVersion === null || receivedVersion.trim().length === 0) {
    return {
      error: createRemoteRuntimeHttpVersionMismatchFailure({
        receivedVersion: receivedVersion === null ? null : receivedVersion,
        requestId,
      }),
      ok: false,
      status: 400,
    }
  }
  if (!isRemoteRuntimeHttpContractVersionSupported(receivedVersion)) {
    return {
      error: createRemoteRuntimeHttpVersionMismatchFailure({ receivedVersion, requestId }),
      ok: false,
      status: 426,
    }
  }
  return { ok: true, version: receivedVersion }
}

export function createRemoteRuntimeHttpVersionMismatchFailure(input: {
  readonly receivedVersion: string | null
  readonly requestId?: string | null
}): RemoteRuntimeHttpVersionMismatchFailure {
  const receivedLabel = input.receivedVersion ?? "missing"
  return {
    code: "REMOTE_RUNTIME_HTTP_VERSION_MISMATCH",
    message: `Remote runtime HTTP contract version ${receivedLabel} is unsupported. Supported versions: ${supportedRemoteRuntimeHttpContractVersions.join(", ")}. Update the remote runtime client, gateway, or CLI/runtime so their supported remote runtime HTTP contract windows overlap.`,
    receivedVersion: input.receivedVersion,
    requestId: input.requestId ?? null,
    supportedVersions: [...supportedRemoteRuntimeHttpContractVersions],
  }
}

export function isRemoteRuntimePublicKeyPurpose(value: RemoteRuntimeJsonValue): value is RemoteRuntimePublicKeyPurpose {
  return (
    typeof value === "string" && remoteRuntimePublicKeyPurposeValues.includes(value as RemoteRuntimePublicKeyPurpose)
  )
}

export function isRuntimeConnectionCandidateKind(
  value: RemoteRuntimeJsonValue,
): value is RuntimeConnectionCandidateKind {
  return (
    typeof value === "string" && runtimeConnectionCandidateKindValues.includes(value as RuntimeConnectionCandidateKind)
  )
}

export function isRuntimeConnectionCandidateEnvironment(
  value: RemoteRuntimeJsonValue,
): value is RuntimeConnectionCandidateEnvironment {
  return (
    typeof value === "string" &&
    runtimeConnectionCandidateEnvironmentValues.includes(value as RuntimeConnectionCandidateEnvironment)
  )
}

export function isRuntimeConnectionCandidateHostReachability(
  value: RemoteRuntimeJsonValue,
): value is RuntimeConnectionCandidateHostReachability {
  return (
    typeof value === "string" &&
    runtimeConnectionCandidateHostReachabilityValues.includes(value as RuntimeConnectionCandidateHostReachability)
  )
}

export function isRemoteRuntimeStatusSnapshotState(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeStatusSnapshotState {
  return (
    typeof value === "string" &&
    remoteRuntimeStatusSnapshotStateValues.includes(value as RemoteRuntimeStatusSnapshotState)
  )
}

export function isRemoteRuntimeRealtimeEventType(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeRealtimeEventType {
  return (
    typeof value === "string" && remoteRuntimeRealtimeEventTypeValues.includes(value as RemoteRuntimeRealtimeEventType)
  )
}

export function isRemoteRuntimeRealtimeResourceKind(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeRealtimeResourceKind {
  return (
    typeof value === "string" &&
    remoteRuntimeRealtimeResourceKindValues.includes(value as RemoteRuntimeRealtimeResourceKind)
  )
}

export function isRemoteRuntimeTransportMessageType(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeTransportMessageType {
  return (
    typeof value === "string" &&
    remoteRuntimeTransportMessageTypeValues.includes(value as RemoteRuntimeTransportMessageType)
  )
}

export function isRemoteRuntimeTransportFailureEnvelope(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeTransportFailureEnvelope {
  return (
    isRemoteRuntimeJsonObject(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string" &&
    typeof value.pairingAction === "string" &&
    typeof value.protocolVersion === "string" &&
    typeof value.requestId === "string" &&
    typeof value.terminal === "boolean" &&
    typeof value.type === "string"
  )
}

export function isRemoteRuntimeOperationClass(value: RemoteRuntimeJsonValue): value is RemoteRuntimeOperationClass {
  return typeof value === "string" && remoteRuntimeOperationClassValues.includes(value as RemoteRuntimeOperationClass)
}

export function isRemoteRuntimeResponseSensitivity(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeResponseSensitivity {
  return (
    typeof value === "string" &&
    remoteRuntimeResponseSensitivityValues.includes(value as RemoteRuntimeResponseSensitivity)
  )
}

export function isRemoteRuntimeClientTrustLevel(value: RemoteRuntimeJsonValue): value is RemoteRuntimeClientTrustLevel {
  return (
    typeof value === "string" && remoteRuntimeClientTrustLevelValues.includes(value as RemoteRuntimeClientTrustLevel)
  )
}

export function isRemoteRuntimePublicKeyAlgorithm(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimePublicKeyAlgorithm {
  return (
    typeof value === "string" &&
    remoteRuntimePublicKeyAlgorithmValues.includes(value as RemoteRuntimePublicKeyAlgorithm)
  )
}

export function isRemoteRuntimePublicKeyEncoding(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimePublicKeyEncoding {
  return (
    typeof value === "string" && remoteRuntimePublicKeyEncodingValues.includes(value as RemoteRuntimePublicKeyEncoding)
  )
}

export function isRemoteRuntimeRequestSignatureAlgorithm(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeRequestSignatureAlgorithm {
  return (
    typeof value === "string" &&
    remoteRuntimeRequestSignatureAlgorithmValues.includes(value as RemoteRuntimeRequestSignatureAlgorithm)
  )
}

export function isRemoteRuntimeEncryptedPayloadAlgorithm(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeEncryptedPayloadAlgorithm {
  return (
    typeof value === "string" &&
    remoteRuntimeEncryptedPayloadAlgorithmValues.includes(value as RemoteRuntimeEncryptedPayloadAlgorithm)
  )
}

export function isRemoteRuntimeEncryptedPayloadContentType(
  value: RemoteRuntimeJsonValue,
): value is RemoteRuntimeEncryptedPayloadContentType {
  return (
    typeof value === "string" &&
    remoteRuntimeEncryptedPayloadContentTypeValues.includes(value as RemoteRuntimeEncryptedPayloadContentType)
  )
}

export function validateRemoteRuntimeAsymmetricPublicKey(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeAsymmetricPublicKeyValidationResult {
  if (
    !isRemoteRuntimeJsonObject(input) ||
    !isRemoteRuntimePublicKeyAlgorithm(input.algorithm) ||
    !isNonEmptyRemoteRuntimeContractString(input.createdAt) ||
    !isRemoteRuntimePublicKeyEncoding(input.encoding) ||
    !isNonEmptyRemoteRuntimeContractString(input.keyId) ||
    !isBase64UrlRemoteRuntimeContractString(input.publicKey) ||
    isPlaceholderRuntimeClientPublicKey(input.publicKey) ||
    !isRemoteRuntimePublicKeyPurpose(input.purpose)
  ) {
    return { error: { message: "Runtime client asymmetric public key is malformed." }, ok: false }
  }
  return {
    ok: true,
    value: {
      algorithm: input.algorithm,
      createdAt: input.createdAt,
      encoding: input.encoding,
      keyId: input.keyId,
      publicKey: input.publicKey,
      purpose: input.purpose,
    },
  }
}

export function serializeRemoteRuntimeAsymmetricPublicKey(publicKey: RemoteRuntimeAsymmetricPublicKey): string {
  const validation = validateRemoteRuntimeAsymmetricPublicKey(publicKey)
  if (!validation.ok) {
    throw new Error(validation.error.message)
  }
  return JSON.stringify(validation.value)
}

export function validateSerializedRemoteRuntimeAsymmetricPublicKey(
  input: string | RemoteRuntimeJsonValue,
): RemoteRuntimeAsymmetricPublicKeyValidationResult {
  if (typeof input !== "string") {
    return validateRemoteRuntimeAsymmetricPublicKey(input)
  }
  try {
    const parsed = JSON.parse(input)
    return validateRemoteRuntimeAsymmetricPublicKey(parsed)
  } catch {
    return { error: { message: "Runtime client asymmetric public key is malformed." }, ok: false }
  }
}

export function parseRemoteRuntimeAsymmetricPrivateKeyReference(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeAsymmetricPrivateKeyReference {
  if (
    !isRemoteRuntimeJsonObject(input) ||
    input.algorithm !== "ed25519" ||
    input.encoding !== "pkcs8-base64url" ||
    typeof input.keyId !== "string" ||
    typeof input.privateKey !== "string" ||
    input.purpose !== "runtimeResponseSigning"
  ) {
    throw new Error("invalid schema")
  }
  return {
    algorithm: "ed25519",
    encoding: "pkcs8-base64url",
    keyId: input.keyId,
    privateKey: input.privateKey,
    purpose: "runtimeResponseSigning",
  }
}

export function parseRemoteRuntimeResponseSigningPublicKey(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeAsymmetricPublicKey {
  const validation = validateRemoteRuntimeAsymmetricPublicKey(input)
  if (!validation.ok || validation.value.purpose !== "runtimeResponseSigning") {
    throw new Error("invalid schema")
  }
  return validation.value
}

export function parseRemoteRuntimeSerializedEncryptionKey(
  input: RemoteRuntimeJsonValue,
): RemoteRuntimeSerializedEncryptionKey {
  if (!isRemoteRuntimeJsonObject(input) || typeof input.keyBase64 !== "string" || typeof input.keyId !== "string") {
    throw new Error("invalid schema")
  }
  return { keyBase64: input.keyBase64, keyId: input.keyId }
}

export function createRemoteRuntimeKeyPossessionProofPayload(
  input: RemoteRuntimeKeyPossessionProofPayloadInput,
): string {
  return createRemoteRuntimeKeyPossessionProofPayloadWithScope(input, remoteRuntimeKeyPossessionPayloadScope)
}

export function createPreviousClientKeyPossessionProofPayload(
  input: RemoteRuntimeKeyPossessionProofPayloadInput,
): string {
  return createRemoteRuntimeKeyPossessionProofPayloadWithScope(input, previousClientKeyPossessionPayloadScope)
}

function createRemoteRuntimeKeyPossessionProofPayloadWithScope(
  input: RemoteRuntimeKeyPossessionProofPayloadInput,
  scope: typeof previousClientKeyPossessionPayloadScope | typeof remoteRuntimeKeyPossessionPayloadScope,
): string {
  return [
    scope,
    `challengeId:${input.challengeId ?? ""}`,
    `connectorVersion:${input.connectorVersion ?? ""}`,
    `deviceName:${input.deviceName ?? ""}`,
    `keyId:${input.keyId}`,
    `nonce:${input.nonce}`,
    `publicKey:${input.publicKey}`,
    `purpose:${input.purpose}`,
    `runtimeInstallationId:${input.runtimeInstallationId ?? ""}`,
    `timestamp:${input.timestamp}`,
  ].join("\n")
}

export function createRemoteRuntimeKeyPossessionProofAuthority(input: {
  readonly keyProof: RemoteRuntimeKeyPossessionProof
  readonly publicKey: string
}): RemoteRuntimeKeyPossessionProofAuthority {
  return {
    keyProof: input.keyProof,
    publicKey: input.publicKey,
    [remoteRuntimeKeyPossessionProofAuthorityBrand]: true,
  }
}

export function createRemoteRuntimeTransportFailureEnvelope(input: {
  readonly code: RemoteRuntimeTransportFailureCode
  readonly message: string
  readonly metadata?: RemoteRuntimeTransportFailureMetadata
  readonly requestId: string
}): RemoteRuntimeTransportFailureEnvelope {
  const pairingInvalid =
    input.code === "DEVICE_REVOKED" ||
    input.code === "PAIRING_EXPIRED" ||
    input.code === "PAIRING_KEY_REJECTED" ||
    input.code === "PAIRING_SUPERSEDED" ||
    input.code === "RUNTIME_REVOKED"
  const terminal = pairingInvalid || input.code === "ATTACHMENT_REVOKED" || input.code === "PROTOCOL_MISMATCH"
  const type = remoteRuntimeTransportFailureEnvelopeType(input.code, pairingInvalid)
  return {
    code: input.code,
    message: input.message,
    pairingAction:
      pairingInvalid || input.code === "ATTACHMENT_REVOKED"
        ? "re_pair"
        : input.code === "PROTOCOL_MISMATCH"
          ? "upgrade_app"
          : "keep",
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: input.requestId,
    ...(input.metadata ?? {}),
    terminal,
    type,
  }
}

export function createRuntimeUnavailableEnvelope(
  requestId: string,
  message = "Runtime attachment is unavailable.",
): RemoteRuntimeTransportFailureEnvelope {
  return createRemoteRuntimeTransportFailureEnvelope({ code: "RUNTIME_UNAVAILABLE", message, requestId })
}

export function createPairingSupersededEnvelope(input: {
  readonly message?: string
  readonly replacementRuntimeInstallationId?: string | null
  readonly requestId: string
  readonly runtimeInstallationId: string
}): RemoteRuntimeTransportFailureEnvelope {
  return createRemoteRuntimeTransportFailureEnvelope({
    code: "PAIRING_SUPERSEDED",
    message: input.message ?? "Runtime client pairing was superseded by a newer runtime setup.",
    metadata: {
      replacementRuntimeInstallationId: input.replacementRuntimeInstallationId ?? null,
      runtimeInstallationId: input.runtimeInstallationId,
    },
    requestId: input.requestId,
  })
}

export function createRuntimeRevokedEnvelope(
  requestId: string,
  message = "Runtime installation was revoked.",
): RemoteRuntimeTransportFailureEnvelope {
  return createRemoteRuntimeTransportFailureEnvelope({ code: "RUNTIME_REVOKED", message, requestId })
}

export function createDeviceRevokedEnvelope(
  requestId: string,
  message = "Trusted runtime client was revoked.",
): RemoteRuntimeTransportFailureEnvelope {
  return createRemoteRuntimeTransportFailureEnvelope({ code: "DEVICE_REVOKED", message, requestId })
}

export function createAttachmentRevokedEnvelope(
  requestId: string,
  message = "Runtime or remote runtime attachment was revoked.",
): RemoteRuntimeTransportFailureEnvelope {
  return createRemoteRuntimeTransportFailureEnvelope({ code: "ATTACHMENT_REVOKED", message, requestId })
}

export function createAuthorizationFailureEnvelope(
  requestId: string,
  message = "Runtime operation is not authorized.",
): RemoteRuntimeTransportFailureEnvelope {
  return createRemoteRuntimeTransportFailureEnvelope({ code: "AUTHORIZATION_FAILED", message, requestId })
}

export function createIdempotencyConflictEnvelope(
  requestId: string,
  message = "Idempotency key was already used with a different payload.",
): RemoteRuntimeTransportFailureEnvelope {
  return createRemoteRuntimeTransportFailureEnvelope({ code: "IDEMPOTENCY_CONFLICT", message, requestId })
}

export function createRuntimeCommandFailedEnvelope(
  requestId: string,
  message = "Runtime command failed.",
): RemoteRuntimeTransportFailureEnvelope {
  return createRemoteRuntimeTransportFailureEnvelope({ code: "RUNTIME_COMMAND_FAILED", message, requestId })
}

export function buildGatewayRuntimeAttachmentRegistrationRequest(
  input: GatewayRuntimeAttachmentRegistrationInput,
): GatewayRuntimeAttachmentRegistrationRequest {
  const attachmentCapabilities = [...(input.attachmentCapabilities ?? remoteRuntimeConnectorMetadataCapabilities)]
  const featureCapabilities = [...(input.featureCapabilities ?? [])]
  return {
    accountId: input.accountId,
    ...(input.allowedDirectories ? { allowedDirectories: [...input.allowedDirectories] } : {}),
    attachmentCapabilities,
    connectorVersion: input.connectorVersion,
    directoryId: input.directoryId,
    directoryPath: input.directoryPath,
    featureCapabilities,
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: input.requestId,
    runtimeInstallationId: input.runtimeInstallationId,
    ticket: input.ticket,
  }
}

function isRuntimeWebSocketAllowedDirectoryValue(
  value: RemoteRuntimeJsonValue | RuntimeWebSocketAllowedDirectory,
): value is RuntimeWebSocketAllowedDirectory {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "directoryId" in value &&
    "path" in value &&
    typeof value.directoryId === "string" &&
    value.directoryId.length > 0 &&
    (value.displayName === undefined ||
      value.displayName === null ||
      (typeof value.displayName === "string" && value.displayName.length > 0)) &&
    typeof value.path === "string" &&
    value.path.length > 0
  )
}

export function parseGatewayRuntimeAttachment(input: RemoteRuntimeJsonValue): GatewayRuntimeAttachment {
  const allowedDirectories =
    isRemoteRuntimeJsonObject(input) && input.allowedDirectories === undefined
      ? undefined
      : isRemoteRuntimeJsonObject(input) &&
          Array.isArray(input.allowedDirectories) &&
          input.allowedDirectories.every(isRuntimeWebSocketAllowedDirectoryValue)
        ? input.allowedDirectories
        : null
  const attachmentCapabilities =
    isRemoteRuntimeJsonObject(input) && Array.isArray(input.attachmentCapabilities)
      ? input.attachmentCapabilities
      : null
  const featureCapabilities =
    isRemoteRuntimeJsonObject(input) && input.featureCapabilities === undefined
      ? []
      : isRemoteRuntimeJsonObject(input) && Array.isArray(input.featureCapabilities)
        ? input.featureCapabilities
        : null
  if (
    !isRemoteRuntimeJsonObject(input) ||
    typeof input.accountId !== "string" ||
    allowedDirectories === null ||
    !Array.isArray(attachmentCapabilities) ||
    !attachmentCapabilities.every(isRemoteRuntimeAttachmentCapability) ||
    !Array.isArray(featureCapabilities) ||
    !featureCapabilities.every(isRemoteRuntimeCapability) ||
    typeof input.connectorVersion !== "string" ||
    typeof input.directoryId !== "string" ||
    typeof input.directoryPath !== "string" ||
    typeof input.gatewayRuntimeAttachmentId !== "string" ||
    typeof input.runtimeInstallationId !== "string" ||
    (input.status !== "online" && input.status !== "revoked") ||
    !isOptionalRuntimeClientTrustLevel(input.deviceTrustLevel)
  ) {
    throw new Error("Remote runtime websocket attachment failed.")
  }
  return {
    accountId: input.accountId,
    ...(allowedDirectories ? { allowedDirectories: [...allowedDirectories] } : {}),
    attachmentCapabilities,
    connectorVersion: input.connectorVersion,
    directoryId: input.directoryId,
    directoryPath: input.directoryPath,
    featureCapabilities,
    ...(input.deviceTrustLevel === undefined ? {} : { deviceTrustLevel: input.deviceTrustLevel }),
    gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
    runtimeInstallationId: input.runtimeInstallationId,
    status: input.status,
  }
}

export function parseRemoteRuntimeClientAttachment(input: RemoteRuntimeJsonValue): RemoteRuntimeClientAttachment {
  if (
    !isRemoteRuntimeJsonObject(input) ||
    typeof input.accountId !== "string" ||
    !isOptionalRuntimeClientTrustLevel(input.deviceTrustLevel) ||
    typeof input.gatewayRuntimeAttachmentId !== "string" ||
    typeof input.clientAttachmentId !== "string" ||
    typeof input.runtimeInstallationId !== "string" ||
    (input.status !== "attached" && input.status !== "revoked") ||
    typeof input.trustedRuntimeClientId !== "string"
  ) {
    throw new Error("Remote runtime websocket client attachment failed.")
  }
  return {
    accountId: input.accountId,
    deviceTrustLevel: input.deviceTrustLevel ?? "paired",
    gatewayRuntimeAttachmentId: input.gatewayRuntimeAttachmentId,
    clientAttachmentId: input.clientAttachmentId,
    runtimeInstallationId: input.runtimeInstallationId,
    status: input.status,
    trustedRuntimeClientId: input.trustedRuntimeClientId,
  }
}

export const parseMobileGatewayWebSocketAttachmentHandshake = parseRemoteRuntimeClientAttachment

export function createRuntimeStatusFrame(
  input: Omit<RuntimeStatusFrame, "protocolVersion" | "type">,
): RuntimeStatusFrame {
  return {
    ...input,
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    type: "runtime.status",
  }
}

export function createAttachmentStatusSequencer(): AttachmentStatusSequencer {
  const lastByAttachment = new Map<string, number>()
  return {
    accept(frame: RuntimeStatusFrame): boolean {
      const last = lastByAttachment.get(frame.gatewayRuntimeAttachmentId) ?? 0
      if (frame.sequence !== last + 1) {
        return false
      }
      lastByAttachment.set(frame.gatewayRuntimeAttachmentId, frame.sequence)
      return true
    },
    lastSequence(gatewayRuntimeAttachmentId: string): number {
      return lastByAttachment.get(gatewayRuntimeAttachmentId) ?? 0
    },
  }
}

export function createRemoteRuntimeCanonicalHttpSigningPayload(
  input: RemoteRuntimeCanonicalHttpSigningPayloadInput,
): RemoteRuntimeCanonicalHttpSigningPayload {
  return {
    algorithm: "ed25519",
    payload: [
      remoteRuntimeHttpSigningPayloadScope,
      `method:${input.method.toUpperCase()}`,
      `path:${input.canonicalPath}`,
      `query:${input.canonicalQuery}`,
      `bodySha256:${input.bodySha256}`,
      `remoteRuntimeHttpVersion:${input.remoteRuntimeHttpVersion}`,
      `runtimeInstallationId:${input.runtimeInstallationId}`,
      `trustedRuntimeClientId:${input.trustedRuntimeClientId}`,
      `keyId:${input.keyId}`,
      `requestId:${input.requestId ?? ""}`,
      `idempotencyKey:${input.idempotencyKey ?? ""}`,
      `localRuntimeAccessTokenId:${input.localRuntimeAccessTokenId ?? ""}`,
      `timestamp:${input.timestamp}`,
      `nonce:${input.nonce}`,
    ].join("\n"),
  }
}

export function createRemoteRuntimeCanonicalHttpResponseSigningPayload(
  input: RemoteRuntimeCanonicalHttpResponseSigningPayloadInput,
): RemoteRuntimeCanonicalHttpResponseSigningPayload {
  return {
    algorithm: "ed25519",
    payload: [
      "interbase-runtime-http-response-signature-v1",
      `method:${input.method.toUpperCase()}`,
      `path:${input.canonicalPath}`,
      `query:${input.canonicalQuery}`,
      `status:${input.status}`,
      `bodySha256:${input.bodySha256}`,
      `remoteRuntimeHttpVersion:${input.remoteRuntimeHttpVersion}`,
      `runtimeInstallationId:${input.runtimeInstallationId}`,
      `trustedRuntimeClientId:${input.trustedRuntimeClientId}`,
      `keyId:${input.keyId}`,
      `requestId:${input.requestId ?? ""}`,
      `localRuntimeAccessTokenId:${input.localRuntimeAccessTokenId ?? ""}`,
      `timestamp:${input.timestamp}`,
      `nonce:${input.nonce}`,
    ].join("\n"),
  }
}

export function createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload(
  input: RemoteRuntimeCanonicalWebSocketUpgradeSigningPayloadInput,
): RemoteRuntimeCanonicalWebSocketUpgradeSigningPayload {
  return {
    algorithm: "ed25519",
    payload: [
      remoteRuntimeWebSocketUpgradeSigningPayloadScope,
      `accountId:${input.accountId}`,
      `path:${input.canonicalPath}`,
      `query:${input.canonicalQuery}`,
      `webSocketVersion:${input.webSocketVersion}`,
      `runtimeInstallationId:${input.runtimeInstallationId}`,
      `trustedRuntimeClientId:${input.trustedRuntimeClientId}`,
      `localRuntimeAccessTokenId:${input.localRuntimeAccessTokenId ?? ""}`,
      `keyId:${input.keyId}`,
      `requestId:${input.requestId ?? ""}`,
      `timestamp:${input.timestamp}`,
      `nonce:${input.nonce}`,
    ].join("\n"),
  }
}

export function createRemoteRuntimeCanonicalWebSocketActionSigningPayload(
  input: RemoteRuntimeCanonicalWebSocketActionSigningPayloadInput,
): RemoteRuntimeCanonicalWebSocketActionSigningPayload {
  return {
    algorithm: "ed25519",
    payload: [
      remoteRuntimeWebSocketActionSigningPayloadScope,
      `sessionNonce:${input.sessionNonce}`,
      `sequence:${input.sequence}`,
      `runtimeInstallationId:${input.runtimeInstallationId}`,
      `trustedRuntimeClientId:${input.trustedRuntimeClientId}`,
      `payloadSha256:${input.payloadSha256}`,
      `keyId:${input.keyId}`,
      `requestId:${input.requestId ?? ""}`,
      `timestamp:${input.timestamp}`,
      `nonce:${input.nonce}`,
    ].join("\n"),
  }
}

export function negotiateRemoteRuntimeVersions(input: {
  readonly received: RemoteRuntimeReceivedVersions
  readonly supported?: RemoteRuntimeSupportedVersions
}): RemoteRuntimeVersionNegotiationResult {
  const supported = input.supported ?? currentRemoteRuntimeSupportedVersions
  const received = input.received
  const remoteRuntimeHttp = selectVersion(received.remoteRuntimeHttp, supported.remoteRuntimeHttp)
  const remoteRuntimeTransport = selectVersion(received.remoteRuntimeTransport, supported.remoteRuntimeTransport)
  const runtimeWebSocket = selectVersion(received.runtimeWebSocket, supported.runtimeWebSocket)
  if (remoteRuntimeHttp && remoteRuntimeTransport && runtimeWebSocket) {
    return { compatible: true, accepted: { remoteRuntimeHttp, remoteRuntimeTransport, runtimeWebSocket } }
  }
  return {
    compatible: false,
    received,
    supported,
    remediation: "Update the remote runtime client or CLI/runtime so their remote runtime protocol versions overlap.",
  }
}

export function negotiateAdvertisedRemoteRuntimeVersions(input: {
  readonly advertised: RemoteRuntimeAdvertisedVersions
  readonly supported?: RemoteRuntimeSupportedVersions
}): RemoteRuntimeAdvertisedVersionNegotiationResult {
  const supported = input.supported ?? currentRemoteRuntimeSupportedVersions
  const advertised = input.advertised
  const remoteRuntimeHttp = selectAdvertisedVersion(advertised.remoteRuntimeHttp, supported.remoteRuntimeHttp)
  const remoteRuntimeTransport = selectAdvertisedVersion(
    advertised.remoteRuntimeTransport,
    supported.remoteRuntimeTransport,
  )
  const runtimeWebSocket = selectAdvertisedVersion(advertised.runtimeWebSocket, supported.runtimeWebSocket)
  if (remoteRuntimeHttp && remoteRuntimeTransport && runtimeWebSocket) {
    return { compatible: true, accepted: { remoteRuntimeHttp, remoteRuntimeTransport, runtimeWebSocket }, advertised }
  }
  return {
    compatible: false,
    advertised,
    supported,
    remediation: "Update the remote runtime client or CLI/runtime so their remote runtime protocol versions overlap.",
  }
}

function selectVersion(received: string | undefined, supported: readonly string[]): string | null {
  if (!received) return null
  if (!supported.includes(received)) return null
  return received
}

function selectAdvertisedVersion(advertised: readonly string[], supported: readonly string[]): string | null {
  for (let index = supported.length - 1; index >= 0; index -= 1) {
    const version = supported[index]
    if (advertised.includes(version)) return version
  }
  return null
}

function remoteRuntimeTransportFailureEnvelopeType(
  code: RemoteRuntimeTransportFailureCode,
  pairingInvalid: boolean,
): RemoteRuntimeTransportFailureEnvelopeType {
  if (code === "ATTACHMENT_REVOKED") return "attachment.revoked"
  if (pairingInvalid) return "pairing.invalid"
  if (code === "IDEMPOTENCY_CONFLICT") return "idempotency.conflict"
  if (code === "RUNTIME_COMMAND_FAILED") return "runtime.command.failed"
  if (code === "RUNTIME_UNAVAILABLE") return "runtime.unavailable"
  if (code === "PROTOCOL_MISMATCH") return "protocol.mismatch"
  return "authorization.failed"
}

function validatedRuntimeOperationReplyTargetFromFrameAuthority(
  frame: RuntimeOperationReplyTargetFrameAuthority,
  requestId: string,
): RuntimeOperationReplyTargetValidationResult {
  if (frame.replyTarget === undefined) {
    return {
      ok: true,
      value:
        frame.trustedGatewayHttpRequest === true
          ? { gatewayHttpRequestId: frame.clientAttachmentId, kind: "gatewayHttpRequest" }
          : runtimeOwnerForRemoteRuntimeAttachment(frame.clientAttachmentId),
    }
  }
  if (!isRemoteRuntimeJsonObject(frame.replyTarget)) {
    return {
      error: createRemoteRuntimeTransportFailureEnvelope({
        code: "VALIDATION_FAILED",
        message: "Runtime operation reply target must be an object.",
        requestId,
      }),
      ok: false,
    }
  }
  if (frame.replyTarget.kind === "remoteRuntimeAttachment") {
    const remoteRuntimeAttachmentId = frame.replyTarget.remoteRuntimeAttachmentId
    if (!isNonEmptyRemoteRuntimeContractString(remoteRuntimeAttachmentId)) {
      return {
        error: createRemoteRuntimeTransportFailureEnvelope({
          code: "VALIDATION_FAILED",
          message: "Runtime operation remote runtime attachment reply target id is required.",
          requestId,
        }),
        ok: false,
      }
    }
    if (frame.trustedGatewayHttpRequest === true) {
      return {
        error: createRemoteRuntimeTransportFailureEnvelope({
          code: "VALIDATION_FAILED",
          message: "Gateway-trusted HTTP runtime operations cannot target a remote runtime attachment.",
          requestId,
        }),
        ok: false,
      }
    }
    if (remoteRuntimeAttachmentId !== frame.clientAttachmentId) {
      return {
        error: createRemoteRuntimeTransportFailureEnvelope({
          code: "VALIDATION_FAILED",
          message: "Runtime operation remote runtime attachment reply target must match the frame attachment id.",
          requestId,
        }),
        ok: false,
      }
    }
    return { ok: true, value: runtimeOwnerForRemoteRuntimeAttachment(remoteRuntimeAttachmentId) }
  }
  if (frame.replyTarget.kind === "gatewayHttpRequest") {
    if (!isNonEmptyRemoteRuntimeContractString(frame.replyTarget.gatewayHttpRequestId)) {
      return {
        error: createRemoteRuntimeTransportFailureEnvelope({
          code: "VALIDATION_FAILED",
          message: "Runtime operation gateway HTTP reply target id is required.",
          requestId,
        }),
        ok: false,
      }
    }
    if (frame.replyTarget.gatewayHttpRequestId !== frame.clientAttachmentId) {
      return {
        error: createRemoteRuntimeTransportFailureEnvelope({
          code: "VALIDATION_FAILED",
          message: "Runtime operation gateway HTTP reply target must match the frame request id.",
          requestId,
        }),
        ok: false,
      }
    }
    return {
      ok: true,
      value: { gatewayHttpRequestId: frame.replyTarget.gatewayHttpRequestId, kind: "gatewayHttpRequest" },
    }
  }
  return {
    error: createRemoteRuntimeTransportFailureEnvelope({
      code: "VALIDATION_FAILED",
      message: "Runtime operation reply target kind is invalid.",
      requestId,
    }),
    ok: false,
  }
}

export { validatedRuntimeOperationReplyTargetFromFrameAuthority as validateRuntimeOperationReplyTargetFromFrameAuthority }

function isRemoteRuntimeJsonObject(
  value: RemoteRuntimeJsonValue,
): value is { readonly [key: string]: RemoteRuntimeJsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isOptionalRuntimeClientTrustLevel(
  value: RemoteRuntimeJsonValue | undefined,
): value is RemoteRuntimeClientTrustLevel | undefined {
  return value === undefined || isRemoteRuntimeClientTrustLevel(value)
}

function isNonEmptyRemoteRuntimeContractString(value: RemoteRuntimeJsonValue): value is string {
  return typeof value === "string" && value.length > 0
}

function isBase64UrlRemoteRuntimeContractString(value: RemoteRuntimeJsonValue): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]+$/.test(value)
}

function isPlaceholderRuntimeClientPublicKey(value: string): boolean {
  return value.startsWith("runtime_public_") || value.startsWith("client_public_")
}

export {
  createRemoteRuntimeThreadMetadataProjection,
  createRuntimeWebSocketEventSignaturePayload,
  isRemoteRuntimeGitFileStatus,
  isRemoteRuntimeGitRepositoryStatus,
  isRemoteRuntimeGitStatusInput,
  isRemoteRuntimeGitStatusResponse,
  isRemoteRuntimeProtocolClientCommand,
  isRemoteRuntimeProtocolClientMethod,
  isRemoteRuntimeProtocolServerEnvelopeForMethod,
  isRemoteRuntimeWebSocketClientMethod,
  normalizeRemoteRuntimeGitStatusInput,
  remoteRuntimeActiveChatMetadataProjectionFields,
  remoteRuntimeActiveChatMetadataProjectionSensitivity,
  remoteRuntimeChatMessagePartProjectionFields,
  remoteRuntimeChatMessageProjectionFields,
  remoteRuntimeProtocolClientMethodValues,
  remoteRuntimeProtocolResponseSchemaForMethod,
  remoteRuntimeProtocolResponseSchemas,
  remoteRuntimeThreadMetadataProjectionFields,
  remoteRuntimeThreadMetadataProjectionSensitivity,
  remoteRuntimeThreadStatusValues,
  remoteRuntimeGitStatusMaxDiffBytesDefault,
  remoteRuntimeGitStatusMaxDiffBytesLimit,
  remoteRuntimeWebSocketClientMethodValues,
  remoteRuntimeWebSocketResponsePayloadKindValues,
  remoteRuntimeWebSocketResponseSchemaForMethod,
  remoteRuntimeWebSocketResponseSchemas,
} from "./remote-runtime-protocol.js"

export type {
  RemoteRuntimeActiveChatMetadataProjection,
  RemoteRuntimeActiveChatsListPayload,
  RemoteRuntimeActiveChatsPageInfo,
  RemoteRuntimeActiveChatsResponse,
  RemoteRuntimeAliasDeletePayload,
  RemoteRuntimeAliasDeleteResponse,
  RemoteRuntimeAliasGetPayload,
  RemoteRuntimeAliasResponse,
  RemoteRuntimeAliasSetPayload,
  RemoteRuntimeAliasesListResponse,
  RemoteRuntimeChatMessageAgentPartPayload,
  RemoteRuntimeChatMessageCompactionPartPayload,
  RemoteRuntimeChatMessageFilePartPayload,
  RemoteRuntimeChatMessagePartJSONValue,
  RemoteRuntimeChatMessagePartPayload,
  RemoteRuntimeChatMessagePartProjection,
  RemoteRuntimeChatMessagePatchPartPayload,
  RemoteRuntimeChatMessageProjection,
  RemoteRuntimeChatMessageProjectionField,
  RemoteRuntimeChatMessageRetryPartPayload,
  RemoteRuntimeChatMessagesPageInfo,
  RemoteRuntimeChatMessagesPayload,
  RemoteRuntimeChatMessagesResponse,
  RemoteRuntimeChatMessageSnapshotPartPayload,
  RemoteRuntimeChatMessageStepFinishPartPayload,
  RemoteRuntimeChatMessageSubtaskPartPayload,
  RemoteRuntimeChatMessageTextPartPayload,
  RemoteRuntimeChatMessageToolPartPayload,
  RemoteRuntimeProjectionFieldSensitivity,
  RemoteRuntimeProtocolClientCommand,
  RemoteRuntimeProtocolClientEnvelope,
  RemoteRuntimeProtocolClientMethod,
  RemoteRuntimeProtocolMethodResponseSchema,
  RemoteRuntimeGoalClearPayload,
  RemoteRuntimeGoalCreatePayload,
  RemoteRuntimeGoalEditPayload,
  RemoteRuntimeGoalGetPayload,
  RemoteRuntimeGoalListPayload,
  RemoteRuntimeGoalPausePayload,
  RemoteRuntimeGoalResponse,
  RemoteRuntimeGoalResumePayload,
  RemoteRuntimeGoalsPageInfo,
  RemoteRuntimeGoalsListResponse,
  RemoteRuntimeGoalUpdatePayload,
  RemoteRuntimeGitFileStatus,
  RemoteRuntimeGitRepositoryStatus,
  RemoteRuntimeGitStatusInput,
  RemoteRuntimeGitStatusResponse,
  NormalizedRemoteRuntimeGitStatusInput,
  RemoteRuntimePromptAlias,
  RemoteRuntimeSendMessageResponse,
  RemoteRuntimeThreadMetadataProjection,
  RemoteRuntimeThreadMetadataProjectionField,
  RemoteRuntimeThreadStatus,
  RemoteRuntimeWebSocketClientMethod,
  RemoteRuntimeWebSocketMethodResponseSchema,
  RemoteRuntimeWebSocketResponsePayloadKind,
  RuntimeWebSocketAllowedDirectory,
  RuntimeWebSocketChatStartPayload,
  RuntimeWebSocketChatStartResponse,
  RuntimeWebSocketDirectoryAttachment,
  RuntimeWebSocketDirectoryListResponse,
  RuntimeWebSocketDirectorySelectPayload,
  RuntimeWebSocketDirectorySelectResponse,
  RuntimeWebSocketEventResourceRef,
  RuntimeWebSocketEventSignaturePayload,
  RuntimeWebSocketEventSignaturePayloadInput,
  RuntimeWebSocketEventSignatureProof,
  RuntimeWebSocketInitializeResponse,
  RuntimeWebSocketSessionMessagesPayload,
} from "./remote-runtime-protocol.js"
