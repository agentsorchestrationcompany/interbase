import {
  createAuthorizationFailureEnvelope,
  createIdempotencyConflictEnvelope,
  createRemoteRuntimeCanonicalWebSocketActionSigningPayload,
  createRemoteRuntimeHttpVersionMismatchFailure,
  localRemoteRuntimeRequestIdHeaderName,
  localRuntimeAccessTokenHeaderName,
  localRuntimeAccessTokenIdHeaderName,
  remoteRuntimeTransportProtocolVersion,
  remoteRuntimeHttpRequestBodySha256HeaderName,
  remoteRuntimeHttpRequestSignatureAlgorithmHeaderName,
  remoteRuntimeHttpRequestSignatureHeaderName,
  remoteRuntimeHttpRequestSignatureNonceHeaderName,
  remoteRuntimeHttpRequestSignatureTimestampHeaderName,
  remoteRuntimeHttpRequestSigningKeyIdHeaderName,
  remoteRuntimeHttpVersionHeaderName,
  remoteRuntimeHttpResponseBodySha256HeaderName,
  remoteRuntimeHttpResponseSignatureAlgorithmHeaderName,
  remoteRuntimeHttpResponseSignatureHeaderName,
  remoteRuntimeHttpResponseSignatureNonceHeaderName,
  remoteRuntimeHttpResponseSignatureTimestampHeaderName,
  remoteRuntimeHttpResponseSigningKeyIdHeaderName,
  remoteRuntimeWebSocketContractVersion,
  remoteRuntimeWebSocketVersionHeaderName,
  normalizeRemoteRuntimeGitStatusInput,
  validateRemoteRuntimeHttpContractVersionHeader,
  validateSerializedRemoteRuntimeAsymmetricPublicKey,
  type RemoteRuntimeAsymmetricPublicKey,
  type RemoteRuntimeAsymmetricPrivateKeyReference,
  type RemoteRuntimeSerializedEncryptionKey as RemoteRuntimeSerializedEncryptionKey,
  type RemoteRuntimeActiveChatsListPayload,
  type RemoteRuntimeChatMessagesPayload,
  type RemoteRuntimeGoalListPayload,
  type RemoteRuntimeGitStatusInput,
  type RuntimeWebSocketChatStartPayload,
  type RemoteRuntimeWebSocketSignedAction,
  type RemoteRuntimeCanonicalHttpSigningPayloadInput,
  type RemoteRuntimeCanonicalWebSocketActionSigningPayloadInput,
  type RemoteRuntimeCanonicalWebSocketUpgradeSigningPayloadInput,
  type RemoteRuntimeHttpContractVersion,
  type RemoteRuntimeRequestSignatureProof,
  type RemoteRuntimeWebSocketSessionAccepted,
  type RemoteRuntimeTransportFailureEnvelope,
} from "@interbase/remote-runtime-contracts"
import type {
  RuntimeWebSocketSessionMessagePayload,
  RuntimeWebSocketSessionUpdatePayload,
} from "@interbase/runtime-protocol"
import {
  createInMemoryRemoteRuntimeNonceReplayStore,
  createInMemoryRemoteRuntimeCommandIdempotencyStore,
  createRemoteRuntimeCommandFingerprint,
  createRemoteRuntimeHttpResponseSignatureProof,
  canonicalRemoteRuntimeQuery,
  remoteRuntimeHeaderValue,
  remoteRuntimeReadSnapshotPath,
  normalizedRemoteRuntimeHeaders,
  runRemoteRuntimeCommandWithIdempotency,
  validateRemoteRuntimeWebSocketSignedAction,
  verifyRemoteRuntimeHttpRequestSignature,
  verifyRemoteRuntimeWebSocketActionSignature,
  verifyRemoteRuntimeWebSocketUpgradeSignature,
  type RemoteRuntimeCommandIdempotencyRecord,
  type RemoteRuntimeCommandIdempotencyScope,
  type RemoteRuntimeCommandIdempotencyStore,
  type RemoteRuntimeNonceReplayStore,
  type RemoteRuntimeReadSnapshotRoute,
} from "./index.js"
import { createHash } from "node:crypto"

export {
  createInMemoryRemoteRuntimeNonceReplayStore,
  localRemoteRuntimeRequestIdHeaderName,
  localRuntimeAccessTokenHeaderName,
  localRuntimeAccessTokenIdHeaderName,
  remoteRuntimeHttpRequestSignatureHeaderName,
  remoteRuntimeHttpRequestSigningKeyIdHeaderName,
  remoteRuntimeHttpVersionHeaderName,
  remoteRuntimeTransportProtocolVersion,
}

export interface LocalRemoteRuntimeHttpAdmissionInput {
  bodySha256: string
  canonicalPath: string
  canonicalQuery: string
  diagnostics?: LocalRemoteRuntimeGatewayDiagnosticsSink
  expectedLocalRuntimeAccessToken: string
  expectedLocalRuntimeAccessTokenId: string
  expectedRuntimeInstallationId: string
  idempotencyKey: string | null
  localRuntimeAccessToken: string
  localRuntimeAccessTokenId: string | null
  maxSignatureSkewMs?: number
  method: string
  remoteRuntimeHttpVersion: string | null
  nonceStore: RemoteRuntimeNonceReplayStore
  nowMs: number
  proof: RemoteRuntimeRequestSignatureProof
  publicKey: RemoteRuntimeAsymmetricPublicKey
  requestId: string | null
  runtimeInstallationId: string
  trustedRuntimeClientId: string
}

export type LocalRemoteRuntimeHttpAdmissionResult<T> =
  | { ok: true; response: T }
  | {
      error: RemoteRuntimeTransportFailureEnvelope | ReturnType<typeof createRemoteRuntimeHttpVersionMismatchFailure>
      ok: false
      status: 400 | 401 | 409 | 426
    }

export type LocalRemoteRuntimeCommandIdempotencyStore<TResponse> = RemoteRuntimeCommandIdempotencyStore<TResponse>

export type LocalRemoteRuntimeCommandIdempotencyRecord<TResponse> = RemoteRuntimeCommandIdempotencyRecord<TResponse>

export type LocalRemoteRuntimeCommandIdempotencyScope = RemoteRuntimeCommandIdempotencyScope

export interface RunLocalRemoteRuntimeCommandWithIdempotencyInput<TResponse> {
  execute: () => Promise<TResponse> | TResponse
  fingerprint: string
  idempotencyKey: string
  requestId: string | null
  runtimeInstallationId: string
  store: LocalRemoteRuntimeCommandIdempotencyStore<TResponse>
}

export interface LocalRemoteRuntimeCommandBodyAuthority {
  idempotencyKey: string
  runtimeInstallationId: string
}

export type LocalRemoteRuntimeValidatedCommandResult<TResponse> =
  | { ok: true; response: TResponse }
  | { error: { code: string; message: string }; ok: false; status: 400 | 401 | 409 | 426 }

export interface RunValidatedLocalRemoteRuntimeCommandRequestInput<TBody, TResponse> {
  bodyJson: Record<string, unknown> | null
  commandBodyAuthority: LocalRemoteRuntimeCommandBodyAuthority
  dispatch: (
    body: TBody,
    remoteRuntimeHttpVersion: string,
    runtimeInstallationId: string,
  ) => Promise<TResponse> | TResponse
  expectedSessionId?: string
  parseBody(input: unknown): TBody
  prepared: Pick<
    LocalRemoteRuntimeHttpAdmissionInput,
    "bodySha256" | "canonicalPath" | "method" | "remoteRuntimeHttpVersion" | "requestId"
  >
  store: LocalRemoteRuntimeCommandIdempotencyStore<TResponse>
}

export type LocalRemoteRuntimeReadSnapshotRoute = RemoteRuntimeReadSnapshotRoute

export interface LocalRemoteRuntimeReadSnapshotRequestInput extends LocalRemoteRuntimeHttpAdmissionInput {
  route: LocalRemoteRuntimeReadSnapshotRoute
}

export interface LocalRemoteRuntimeHttpHeader {
  name: string
  value: string
}

export interface LocalRemoteRuntimeHttpQueryEntry {
  name: string
  value: string
}

export interface LocalRemoteRuntimeWebSocketUpgradeAuthority {
  accountId: string
  runtimeInstallationId: string
  trustedRuntimeClientId: string
}

export interface LocalRemoteRuntimeReadSnapshotAuthority {
  expectedLocalRuntimeAccessToken: string
  localRuntimeAccessTokenId: string
  publicKey: RemoteRuntimeAsymmetricPublicKey
  runtimeInstallationId: string
  trustedRuntimeClientId: string
}

export interface LocalRemoteRuntimeGatewayTrustedDeviceAuthorityInput {
  publicKey: string
  trustedRuntimeClientId: string
}

export interface LocalRemoteRuntimeGatewayTrustedDeviceAuthorityState {
  publicKeyText: string
  trustedRuntimeClientId: string
}

export interface LocalRemoteRuntimeGatewayAuthorityState {
  expectedLocalRuntimeAccessToken: string
  localRuntimeAccessTokenId: string
  runtimeInstallationId: string
  runtimeResponseSigningPrivateKey?: RemoteRuntimeAsymmetricPrivateKeyReference
  trustedRuntimeClientAuthorities: readonly LocalRemoteRuntimeGatewayTrustedDeviceAuthorityState[]
}

export interface RemoteRuntimeStartInput {
  accountId: string
  apiBaseUrl: string
  allowedDirectories?: readonly { readonly directoryId: string; readonly displayName?: string; readonly path: string }[]
  authorizationToken: string
  directoryId: string
  directory: string
  pollIntervalMs?: number
  runtimeEncryptionKey?: RemoteRuntimeSerializedEncryptionKey
  runtimeInstallationId: string
}

export type RemoteRuntimeAllSelector = {
  all: true
  directory?: never
  directoryId?: never
  runtimeInstallationId?: never
}

export type RemoteRuntimeInstallationSelector = {
  all?: never
  directory?: never
  directoryId?: never
  runtimeInstallationId: string
}

export type RemoteRuntimeDirectorySelector =
  | {
      all?: never
      directory?: never
      directoryId: string
      runtimeInstallationId?: string
    }
  | {
      all?: never
      directory: string
      directoryId?: never
      runtimeInstallationId?: string
    }

export type RemoteRuntimeProjectionSelector = RemoteRuntimeInstallationSelector | RemoteRuntimeDirectorySelector

export type RemoteRuntimeStopSelector =
  | RemoteRuntimeAllSelector
  | RemoteRuntimeInstallationSelector
  | RemoteRuntimeDirectorySelector

export type RemoteRuntimeStatusSelector = RemoteRuntimeAllSelector | RemoteRuntimeInstallationSelector

/** @deprecated Use an intent-specific strict selector. */
export type LegacyRemoteRuntimeSelector = {
  directory?: string
  directoryId?: string
  runtimeInstallationId?: string
}

/** @deprecated Use an intent-specific strict selector. */
export type RemoteRuntimeSelector = LegacyRemoteRuntimeSelector

export type RemoteRuntimeActiveChatsReadInput = RemoteRuntimeProjectionSelector & RemoteRuntimeActiveChatsListPayload

export type RemoteRuntimeChatReadInput = RemoteRuntimeDirectorySelector & {
  sessionId: string
}

export type RemoteRuntimeChatMessagesReadInput = RemoteRuntimeDirectorySelector & RemoteRuntimeChatMessagesPayload

export type RemoteRuntimeGoalsReadInput = RemoteRuntimeProjectionSelector & RemoteRuntimeGoalListPayload

export type RemoteRuntimeGitStatusReadInput = RemoteRuntimeProjectionSelector & RemoteRuntimeGitStatusInput

export type RemoteRuntimeProviderReadInput = RemoteRuntimeDirectorySelector

export interface RemoteRuntimeCommandAuthority {
  idempotencyKey: string
  requestId: string
}

export type RemoteRuntimeStartChatInput = RemoteRuntimeDirectorySelector &
  RuntimeWebSocketChatStartPayload &
  RemoteRuntimeCommandAuthority

export type RemoteRuntimeUpdateChatInput = RemoteRuntimeDirectorySelector &
  RuntimeWebSocketSessionUpdatePayload &
  RemoteRuntimeCommandAuthority

export type RemoteRuntimeSendChatMessageInput = RemoteRuntimeDirectorySelector &
  RuntimeWebSocketSessionMessagePayload &
  RemoteRuntimeCommandAuthority

export type RemoteRuntimeEncryptionInput = RemoteRuntimeInstallationSelector & {
  setupToken: string
}

export type RemoteRuntimePageQuery = RemoteRuntimeProjectionSelector & {
  cursor?: string
  limit?: number
}

export interface RemoteRuntimeStartRequestInput extends RemoteRuntimeStartInput {
  localGatewayAuthority?: LocalRemoteRuntimeGatewayAuthorityState
}

export interface RemoteRuntimeHostStopInput {
  expectedPid?: number
}

export interface LocalRemoteRuntimeGatewayAuthorityEnvironment {
  readonly [key: string]: string | undefined
  INTERBASE_RUNTIME_CLIENT_LOCAL_RUNTIME_ACCESS_TOKEN?: string
  INTERBASE_RUNTIME_CLIENT_LOCAL_RUNTIME_ACCESS_TOKEN_ID?: string
  INTERBASE_RUNTIME_CLIENT_RUNTIME_INSTALLATION_ID?: string
  INTERBASE_RUNTIME_CLIENT_TRUSTED_CLIENT_ID?: string
  INTERBASE_RUNTIME_CLIENT_TRUSTED_CLIENT_PUBLIC_KEY?: string
}

export interface ResolveLocalRemoteRuntimeGatewayAuthorityInput {
  activeAuthority?: LocalRemoteRuntimeGatewayAuthorityState
  environment?: LocalRemoteRuntimeGatewayAuthorityEnvironment
  requestSigningKeyId?: string | null
}

export interface LocalRemoteRuntimeGatewayResolvedAuthority extends LocalRemoteRuntimeReadSnapshotAuthority {
  runtimeResponseSigningPrivateKey?: RemoteRuntimeAsymmetricPrivateKeyReference
}

export interface LocalRemoteRuntimeJsonResponseInput {
  authority: LocalRemoteRuntimeGatewayResolvedAuthority
  body: unknown
  now(): string
  randomUUID(): string
  request: {
    canonicalPath: string
    canonicalQuery: string
    localRuntimeAccessTokenId: string | null
    method: string
    remoteRuntimeHttpVersion: string | null
    requestId: string | null
    runtimeInstallationId: string
    trustedRuntimeClientId: string
  }
  status: 200 | 201 | 202
}

export interface LocalRemoteRuntimeJsonResponse {
  bodyText: string
  headers: Record<string, string>
  status: 200 | 201 | 202
}

export interface PrepareLocalRemoteRuntimeReadSnapshotAdmissionInput {
  authority: LocalRemoteRuntimeReadSnapshotAuthority
  bodySha256: string
  canonicalPath: string
  diagnostics?: LocalRemoteRuntimeGatewayDiagnosticsSink
  headers: readonly LocalRemoteRuntimeHttpHeader[]
  method: string
  nonceStore: RemoteRuntimeNonceReplayStore
  nowMs: number
  query: readonly LocalRemoteRuntimeHttpQueryEntry[]
  route: LocalRemoteRuntimeReadSnapshotRoute
  runtimeInstallationId: string
}

export interface PrepareLocalRemoteRuntimeHttpAdmissionInput {
  authority: LocalRemoteRuntimeReadSnapshotAuthority
  bodySha256: string
  canonicalPath: string
  diagnostics?: LocalRemoteRuntimeGatewayDiagnosticsSink
  headers: readonly LocalRemoteRuntimeHttpHeader[]
  idempotencyKey: string | null
  method: string
  nonceStore: RemoteRuntimeNonceReplayStore
  nowMs: number
  query: readonly LocalRemoteRuntimeHttpQueryEntry[]
  runtimeInstallationId: string
}

export interface LocalRemoteRuntimeWebSocketAdmissionInput {
  accountId: string
  authority: LocalRemoteRuntimeReadSnapshotAuthority
  canonicalPath: string
  diagnostics?: LocalRemoteRuntimeGatewayDiagnosticsSink
  headers: readonly LocalRemoteRuntimeHttpHeader[]
  nonceStore: RemoteRuntimeNonceReplayStore
  nowMs: number
  query: readonly LocalRemoteRuntimeHttpQueryEntry[]
  runtimeInstallationId: string
}

export type LocalRemoteRuntimeWebSocketAdmissionResult =
  | { ok: true; response: RemoteRuntimeWebSocketSessionAccepted }
  | { error: RemoteRuntimeTransportFailureEnvelope; ok: false; status: 401 }

export interface LocalRemoteRuntimeWebSocketActionValidationInput {
  action: Parameters<typeof validateRemoteRuntimeWebSocketSignedAction>[0]
  authority: LocalRemoteRuntimeReadSnapshotAuthority
  diagnostics?: LocalRemoteRuntimeGatewayDiagnosticsSink
  nextSequence: number
  nonceStore: RemoteRuntimeNonceReplayStore
  nowMs: number
  runtimeInstallationId: string
  sessionNonce: string
}

export type LocalRemoteRuntimeWebSocketActionValidationResult =
  | { nextSequence: number; ok: true; response: RemoteRuntimeWebSocketSignedAction }
  | { error: RemoteRuntimeTransportFailureEnvelope; ok: false; status: 400 | 401 | 426 }

export type LocalRemoteRuntimeGatewayDiagnosticOutcome = "accepted" | "notChecked" | "rejected"

export interface LocalRemoteRuntimeGatewayDiagnostic {
  authOutcome: LocalRemoteRuntimeGatewayDiagnosticOutcome
  canonicalSigningPayloadSha256?: string
  expectedPayloadSha256?: string
  failureCode: string | null
  nonceReplayOutcome: LocalRemoteRuntimeGatewayDiagnosticOutcome
  requestSigningKeyId: string | null
  requestId?: string | null
  route: string
  runtimeInstallationId: string
  sequence?: number | null
  sessionNonceSha256?: string
  signatureValidationOutcome: LocalRemoteRuntimeGatewayDiagnosticOutcome
  trustedRuntimeClientId: string
}

export type LocalRemoteRuntimeGatewayDiagnosticsSink = (diagnostic: LocalRemoteRuntimeGatewayDiagnostic) => void

export interface LocalRemoteRuntimeGatewayHeaderReader {
  has(name: string): boolean
}

export function isSignedLocalRemoteRuntimeGatewayRequest(input: {
  headers: LocalRemoteRuntimeGatewayHeaderReader
  method: string
  path: string
}): boolean {
  if (!isLocalRemoteRuntimeGatewayPath(input.method, input.path)) return false
  if (!input.headers.has(remoteRuntimeHttpRequestSignatureHeaderName)) return false
  if (input.method === "GET" && isLocalRemoteRuntimeWebSocketGatewayPath(input.path)) {
    return input.headers.has(remoteRuntimeWebSocketVersionHeaderName)
  }
  return input.headers.has(remoteRuntimeHttpVersionHeaderName)
}

export function isUnsignedRemoteRuntimeHostReadRequest(input: {
  headers: LocalRemoteRuntimeGatewayHeaderReader
}): boolean {
  return (
    !input.headers.has(remoteRuntimeHttpVersionHeaderName) &&
    !input.headers.has(localRuntimeAccessTokenHeaderName) &&
    !input.headers.has(localRuntimeAccessTokenIdHeaderName) &&
    !input.headers.has(remoteRuntimeHttpRequestSignatureHeaderName)
  )
}

export function localRemoteRuntimeReadSnapshotCanonicalPath(route: LocalRemoteRuntimeReadSnapshotRoute): string {
  return remoteRuntimeReadSnapshotPath(route)
}

export function createLocalRemoteRuntimeInvalidWebSocketJsonActionEnvelope(
  input: {
    requestId?: string | null
  } = {},
) {
  return {
    code: "VALIDATION_FAILED",
    message: "Remote runtime WebSocket action must be valid JSON.",
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: input.requestId ?? "unknown",
    type: "authorization.failed",
  } as const
}

export function localRemoteRuntimeInstallationIdFromQuery(
  query: readonly LocalRemoteRuntimeHttpQueryEntry[],
): string | undefined {
  const value = query.find((entry) => entry.name === "runtimeInstallationId")?.value.trim()
  return value || undefined
}

function legacySelectorFields(input: Record<string, unknown>): LegacyRemoteRuntimeSelector {
  return {
    ...optionalRuntimeString(input, "directory"),
    ...optionalRuntimeString(input, "directoryId"),
    ...optionalRuntimeString(input, "runtimeInstallationId"),
  }
}

function isAllSelectorInput(input: Record<string, unknown>): boolean {
  return optionalRuntimeBoolean(input, "all", { coerce: true }).all === true
}

function rejectAllSelectorFields(input: LegacyRemoteRuntimeSelector) {
  if (input.directory || input.directoryId || input.runtimeInstallationId) {
    throw new Error("Remote runtime all selector cannot include runtime or directory fields.")
  }
}

function rejectDualDirectorySelector(input: LegacyRemoteRuntimeSelector) {
  if (input.directory && input.directoryId) {
    throw new Error("Remote runtime selector cannot include both directoryId and directory.")
  }
}

export function normalizeInstallationSelector(input: LegacyRemoteRuntimeSelector): RemoteRuntimeInstallationSelector {
  rejectDualDirectorySelector(input)
  if (input.directory || input.directoryId || !input.runtimeInstallationId) {
    throw new Error("Remote runtime installation selector is required.")
  }
  return { runtimeInstallationId: input.runtimeInstallationId }
}

export function normalizeDirectorySelector(input: LegacyRemoteRuntimeSelector): RemoteRuntimeDirectorySelector {
  rejectDualDirectorySelector(input)
  if (input.directoryId) {
    return {
      directoryId: input.directoryId,
      ...(input.runtimeInstallationId ? { runtimeInstallationId: input.runtimeInstallationId } : {}),
    }
  }
  if (input.directory) {
    return {
      directory: input.directory,
      ...(input.runtimeInstallationId ? { runtimeInstallationId: input.runtimeInstallationId } : {}),
    }
  }
  throw new Error("Remote runtime directory selector is required.")
}

export function normalizeProjectionSelector(input: LegacyRemoteRuntimeSelector): RemoteRuntimeProjectionSelector {
  rejectDualDirectorySelector(input)
  return input.directory || input.directoryId ? normalizeDirectorySelector(input) : normalizeInstallationSelector(input)
}

export function normalizeStatusSelector(input: LegacyRemoteRuntimeSelector & { all?: true }): RemoteRuntimeStatusSelector {
  if (input.all) {
    rejectAllSelectorFields(input)
    return { all: true }
  }
  return normalizeInstallationSelector(input)
}

export function normalizeStopSelector(input: LegacyRemoteRuntimeSelector & { all?: true }): RemoteRuntimeStopSelector {
  if (input.all) {
    rejectAllSelectorFields(input)
    return { all: true }
  }
  return normalizeProjectionSelector(input)
}

/** @deprecated Use an intent-specific selector parser. */
export function parseRemoteRuntimeSelectorQuery(input: unknown): RemoteRuntimeSelector {
  const value = remoteRuntimeRecord(input, "Remote runtime selector")
  return legacySelectorFields(value)
}

export function parseRemoteRuntimeInstallationSelectorQuery(input: unknown): RemoteRuntimeInstallationSelector {
  return normalizeInstallationSelector(parseRemoteRuntimeSelectorQuery(input))
}

export function parseRemoteRuntimeDirectorySelectorQuery(input: unknown): RemoteRuntimeDirectorySelector {
  return normalizeDirectorySelector(parseRemoteRuntimeSelectorQuery(input))
}

export function parseRemoteRuntimeProjectionSelectorQuery(input: unknown): RemoteRuntimeProjectionSelector {
  return normalizeProjectionSelector(parseRemoteRuntimeSelectorQuery(input))
}

export function parseRemoteRuntimeStatusSelectorQuery(input: unknown): RemoteRuntimeStatusSelector {
  const value = remoteRuntimeRecord(input ?? {}, "Remote runtime status selector")
  return normalizeStatusSelector({ ...legacySelectorFields(value), ...(isAllSelectorInput(value) ? { all: true as const } : {}) })
}

export function parseRemoteRuntimeStopSelectorQuery(input: unknown): RemoteRuntimeStopSelector {
  const value = remoteRuntimeRecord(input ?? {}, "Remote runtime stop selector")
  return normalizeStopSelector({ ...legacySelectorFields(value), ...(isAllSelectorInput(value) ? { all: true as const } : {}) })
}

export function parseRemoteRuntimePageQuery(input: unknown): RemoteRuntimePageQuery {
  const value = remoteRuntimeRecord(input, "Remote runtime page query")
  return {
    ...parseRemoteRuntimeProjectionSelectorQuery(value),
    ...optionalRuntimeString(value, "cursor"),
    ...optionalRuntimePositiveInteger(value, "limit", { coerce: true }),
  }
}

export function parseRemoteRuntimeGitStatusQuery(input: unknown): RemoteRuntimeGitStatusReadInput {
  const value = remoteRuntimeRecord(input ?? {}, "Remote runtime git status query")
  const includeDiff = optionalRuntimeBoolean(value, "includeDiff", { coerce: true }).includeDiff
  const maxDiffBytes = optionalRuntimePositiveInteger(value, "maxDiffBytes", { coerce: true }).maxDiffBytes
  const normalized = normalizeRemoteRuntimeGitStatusInput({ includeDiff, maxDiffBytes })
  return {
    ...parseRemoteRuntimeProjectionSelectorQuery(value),
    includeDiff: normalized.includeDiff,
    maxDiffBytes: normalized.maxDiffBytes,
  }
}

export function parseRemoteRuntimeStartRequest(input: unknown): RemoteRuntimeStartRequestInput {
  const value = remoteRuntimeRecord(input, "Remote runtime start request")
  return {
    accountId: requiredRuntimeString(value, "accountId"),
    ...(Array.isArray(value.allowedDirectories)
      ? {
          allowedDirectories: value.allowedDirectories.map((entry) => {
            const directory = remoteRuntimeRecord(entry, "Remote runtime allowed directory")
            return {
              directoryId: requiredRuntimeString(directory, "directoryId"),
              ...optionalRuntimeString(directory, "displayName"),
              path: requiredRuntimeString(directory, "path"),
            }
          }),
        }
      : {}),
    apiBaseUrl: requiredRuntimeUrl(value, "apiBaseUrl"),
    authorizationToken: requiredRuntimeString(value, "authorizationToken"),
    directory: requiredRuntimeString(value, "directory"),
    directoryId: requiredRuntimeString(value, "directoryId"),
    ...optionalLocalRemoteRuntimeGatewayAuthority(value),
    ...optionalRuntimeNumber(value, "pollIntervalMs"),
    ...optionalRuntimeEncryptionKey(value),
    runtimeInstallationId: requiredRuntimeString(value, "runtimeInstallationId"),
  }
}

export function parseRemoteRuntimeEncryptionRequest(input: unknown): RemoteRuntimeEncryptionInput {
  const value = remoteRuntimeRecord(input, "Remote runtime encryption request")
  return {
    ...parseRemoteRuntimeInstallationSelectorQuery(value),
    setupToken: requiredRuntimeString(value, "setupToken"),
  }
}

export function parseRemoteRuntimeStopRequest(input: unknown): RemoteRuntimeStopSelector {
  const value = remoteRuntimeRecord(input ?? {}, "Remote runtime stop request")
  if (Object.keys(value).length === 0) return { all: true }
  return parseRemoteRuntimeStopSelectorQuery(value)
}

export function parseRemoteRuntimeHostStopRequest(input: unknown): RemoteRuntimeHostStopInput {
  const value = remoteRuntimeRecord(input ?? {}, "Remote runtime host stop request")
  return {
    ...optionalRuntimePositiveInteger(value, "expectedPid"),
  }
}

export function parseRemoteRuntimeStartChatRequest(input: unknown): RemoteRuntimeStartChatInput {
  const value = remoteRuntimeRecord(input, "Remote runtime start chat request")
  return {
    directoryId: requiredRuntimeString(value, "directoryId"),
    ...optionalRuntimeString(value, "runtimeInstallationId"),
    idempotencyKey: requiredRuntimeString(value, "idempotencyKey"),
    requestId: requiredRuntimeString(value, "requestId"),
    ...optionalNullableRuntimeString(value, "model"),
    ...optionalNullableRuntimeString(value, "providerId"),
    ...optionalNullableRuntimeString(value, "title"),
  }
}

export function parseRemoteRuntimeSendMessageRequest(input: unknown): RemoteRuntimeSendChatMessageInput {
  const value = remoteRuntimeRecord(input, "Remote runtime send message request")
  const messageInput = remoteRuntimeRecord(value.input, "Remote runtime send message input")
  const mode = messageInput.mode
  if (mode !== undefined && mode !== "default") {
    throw new Error("Remote runtime send message input mode is invalid.")
  }
  return {
    ...normalizeDirectorySelector(legacySelectorFields(value)),
    idempotencyKey: requiredRuntimeString(value, "idempotencyKey"),
    input: {
      content: requiredRuntimeString(messageInput, "content"),
      ...(mode === "default" ? { mode } : {}),
    },
    requestId: requiredRuntimeString(value, "requestId"),
    sessionId: requiredRuntimeString(value, "sessionId"),
  }
}

export function parseRemoteRuntimeUpdateChatRequest(input: unknown): RemoteRuntimeUpdateChatInput {
  const value = remoteRuntimeRecord(input, "Remote runtime update chat request")
  const updateInput = remoteRuntimeRecord(value.input, "Remote runtime update chat input")
  return {
    ...normalizeDirectorySelector(legacySelectorFields(value)),
    idempotencyKey: requiredRuntimeString(value, "idempotencyKey"),
    input: {
      model: requiredRuntimeString(updateInput, "model"),
      providerId: requiredRuntimeString(updateInput, "providerId"),
    },
    requestId: requiredRuntimeString(value, "requestId"),
    sessionId: requiredRuntimeString(value, "sessionId"),
  }
}

export function parseLocalRemoteRuntimeWebSocketUpgradeAuthority(input: {
  expectedTrustedRuntimeClientId: string
  query: readonly LocalRemoteRuntimeHttpQueryEntry[]
}): LocalRemoteRuntimeWebSocketUpgradeAuthority {
  const runtimeInstallationId = localRemoteRuntimeInstallationIdFromQuery(input.query)
  const accountId = queryValue(input.query, "accountId")?.trim()
  const trustedRuntimeClientId = queryValue(input.query, "trustedRuntimeClientId")?.trim()
  if (
    !runtimeInstallationId ||
    !accountId ||
    !trustedRuntimeClientId ||
    trustedRuntimeClientId !== input.expectedTrustedRuntimeClientId
  ) {
    throw new Error("Remote runtime WebSocket authority is invalid.")
  }
  return { accountId, runtimeInstallationId, trustedRuntimeClientId }
}

export function isLocalRemoteRuntimeGatewayPath(method: string, path: string): boolean {
  if (method === "GET") {
    return (
      isLocalRemoteRuntimeWebSocketGatewayPath(path) ||
      path === "/global/remote-runtime/runtime/status" ||
      path === "/global/remote-runtime/runtime/directories" ||
      path === "/global/remote-runtime/runtime/capabilities" ||
      path === "/global/remote-runtime/chats" ||
      path === "/global/remote-runtime/git/status" ||
      path === "/global/remote-runtime/goals" ||
      path === "/global/remote-runtime/aliases" ||
      path === "/global/remote-runtime/providers" ||
      /^\/global\/remote-runtime\/chats\/[^/]+$/.test(path) ||
      /^\/global\/remote-runtime\/chats\/[^/]+\/messages$/.test(path)
    )
  }
  if (method === "POST") {
    return path === "/global/remote-runtime/chats" || /^\/global\/remote-runtime\/chats\/[^/]+\/messages$/.test(path)
  }
  if (method === "PATCH") {
    return /^\/global\/remote-runtime\/chats\/[^/]+$/.test(path)
  }
  return false
}

export function normalizeLocalRemoteRuntimeGatewayTrustedDeviceAuthorities(input: {
  trustedRuntimeClientAuthorities: readonly LocalRemoteRuntimeGatewayTrustedDeviceAuthorityInput[]
  trustedRuntimeClientId: string
  trustedRuntimeClientPublicKey: string
}): LocalRemoteRuntimeGatewayTrustedDeviceAuthorityState[] {
  const seenTrustedRuntimeClientIds = new Set<string>()
  return [
    ...input.trustedRuntimeClientAuthorities.map((authority) => ({
      publicKeyText: authority.publicKey,
      trustedRuntimeClientId: authority.trustedRuntimeClientId,
    })),
    {
      publicKeyText: input.trustedRuntimeClientPublicKey,
      trustedRuntimeClientId: input.trustedRuntimeClientId,
    },
  ].flatMap((authority) => {
    const trustedRuntimeClientId = authority.trustedRuntimeClientId.trim()
    const publicKeyText = authority.publicKeyText.trim()
    if (!trustedRuntimeClientId || !publicKeyText || seenTrustedRuntimeClientIds.has(trustedRuntimeClientId)) {
      return []
    }
    seenTrustedRuntimeClientIds.add(trustedRuntimeClientId)
    return [{ publicKeyText, trustedRuntimeClientId }]
  })
}

export function resolveLocalRemoteRuntimeGatewayAuthority(
  input: ResolveLocalRemoteRuntimeGatewayAuthorityInput,
): LocalRemoteRuntimeGatewayResolvedAuthority | undefined {
  const environment = input.environment ?? {}
  const expectedLocalRuntimeAccessToken =
    input.activeAuthority?.expectedLocalRuntimeAccessToken.trim() ||
    environment.INTERBASE_RUNTIME_CLIENT_LOCAL_RUNTIME_ACCESS_TOKEN?.trim()
  const localRuntimeAccessTokenId =
    input.activeAuthority?.localRuntimeAccessTokenId.trim() ||
    environment.INTERBASE_RUNTIME_CLIENT_LOCAL_RUNTIME_ACCESS_TOKEN_ID?.trim()
  const runtimeInstallationId =
    input.activeAuthority?.runtimeInstallationId.trim() ||
    environment.INTERBASE_RUNTIME_CLIENT_RUNTIME_INSTALLATION_ID?.trim()
  const envTrustedRuntimeClientId = environment.INTERBASE_RUNTIME_CLIENT_TRUSTED_CLIENT_ID?.trim()
  const envTrustedRuntimeClientPublicKey = environment.INTERBASE_RUNTIME_CLIENT_TRUSTED_CLIENT_PUBLIC_KEY?.trim()
  const trustedRuntimeClientAuthorities =
    input.activeAuthority?.trustedRuntimeClientAuthorities ??
    (envTrustedRuntimeClientId && envTrustedRuntimeClientPublicKey
      ? [
          {
            publicKeyText: envTrustedRuntimeClientPublicKey,
            trustedRuntimeClientId: envTrustedRuntimeClientId,
          },
        ]
      : [])
  if (
    !expectedLocalRuntimeAccessToken ||
    !localRuntimeAccessTokenId ||
    !runtimeInstallationId ||
    trustedRuntimeClientAuthorities.length === 0
  ) {
    return undefined
  }
  const validatedAuthorities = trustedRuntimeClientAuthorities.flatMap((authority) => {
    const publicKey = validateSerializedRemoteRuntimeAsymmetricPublicKey(authority.publicKeyText)
    if (!publicKey.ok || publicKey.value.purpose !== "remoteRuntimeRequestSigning") return []
    return [
      {
        publicKey: publicKey.value,
        trustedRuntimeClientId: authority.trustedRuntimeClientId,
      },
    ]
  })
  const trimmedRequestSigningKeyId = input.requestSigningKeyId?.trim()
  const matchingAuthorities = trimmedRequestSigningKeyId
    ? validatedAuthorities.filter((authority) => authority.publicKey.keyId === trimmedRequestSigningKeyId)
    : validatedAuthorities
  if (matchingAuthorities.length !== 1) return undefined
  const selectedAuthority = matchingAuthorities[0]!
  return {
    expectedLocalRuntimeAccessToken,
    localRuntimeAccessTokenId,
    publicKey: selectedAuthority.publicKey,
    ...(input.activeAuthority?.runtimeResponseSigningPrivateKey
      ? { runtimeResponseSigningPrivateKey: input.activeAuthority.runtimeResponseSigningPrivateKey }
      : {}),
    runtimeInstallationId,
    trustedRuntimeClientId: selectedAuthority.trustedRuntimeClientId,
  }
}

export async function createLocalRemoteRuntimeJsonResponse(
  input: LocalRemoteRuntimeJsonResponseInput,
): Promise<LocalRemoteRuntimeJsonResponse> {
  const bodyText = JSON.stringify(input.body)
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=UTF-8",
    [remoteRuntimeHttpVersionHeaderName]: input.request.remoteRuntimeHttpVersion ?? "",
  }
  if (input.authority.runtimeResponseSigningPrivateKey && input.request.remoteRuntimeHttpVersion) {
    const proof = await createRemoteRuntimeHttpResponseSignatureProof({
      payload: {
        bodySha256: createHash("sha256").update(bodyText).digest("base64url"),
        canonicalPath: input.request.canonicalPath,
        canonicalQuery: input.request.canonicalQuery,
        keyId: input.authority.runtimeResponseSigningPrivateKey.keyId,
        localRuntimeAccessTokenId: input.request.localRuntimeAccessTokenId,
        method: input.request.method,
        remoteRuntimeHttpVersion: input.request.remoteRuntimeHttpVersion as RemoteRuntimeHttpContractVersion,
        nonce: `response_${input.randomUUID()}`,
        requestId: input.request.requestId,
        runtimeInstallationId: input.request.runtimeInstallationId,
        status: input.status,
        timestamp: input.now(),
        trustedRuntimeClientId: input.request.trustedRuntimeClientId,
      },
      privateKey: input.authority.runtimeResponseSigningPrivateKey,
    })
    headers[remoteRuntimeHttpResponseBodySha256HeaderName] = proof.bodySha256
    headers[remoteRuntimeHttpResponseSignatureAlgorithmHeaderName] = proof.algorithm
    headers[remoteRuntimeHttpResponseSignatureHeaderName] = proof.signature
    headers[remoteRuntimeHttpResponseSignatureNonceHeaderName] = proof.nonce
    headers[remoteRuntimeHttpResponseSignatureTimestampHeaderName] = proof.timestamp
    headers[remoteRuntimeHttpResponseSigningKeyIdHeaderName] = proof.keyId
  }
  return { bodyText, headers, status: input.status }
}

export async function dispatchLocalRemoteRuntimeHttpRequest<T>(
  input: LocalRemoteRuntimeHttpAdmissionInput,
  dispatch: () => Promise<T> | T,
): Promise<LocalRemoteRuntimeHttpAdmissionResult<T>> {
  const version = validateRemoteRuntimeHttpContractVersionHeader(input.remoteRuntimeHttpVersion, input.requestId)
  if (!version.ok) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: version.error.code,
      nonceReplayOutcome: "notChecked",
      requestSigningKeyId: input.proof.keyId || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "notChecked",
      trustedRuntimeClientId: input.trustedRuntimeClientId,
    })
    return { error: version.error, ok: false, status: version.status }
  }
  let nonceReplayOutcome: LocalRemoteRuntimeGatewayDiagnosticOutcome = "notChecked"
  const signature = await verifyRemoteRuntimeHttpRequestSignature({
    maxSkewMs: input.maxSignatureSkewMs,
    nonceStore: diagnosticNonceReplayStore(input.nonceStore, (outcome) => {
      nonceReplayOutcome = outcome
    }),
    nowMs: input.nowMs,
    payloadInput: remoteRuntimeHttpSigningPayloadInput(input, version.version),
    proof: input.proof,
    publicKey: input.publicKey,
  })
  if (!signature.ok) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: signature.error.code,
      nonceReplayOutcome,
      requestSigningKeyId: input.proof.keyId || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "rejected",
      trustedRuntimeClientId: input.trustedRuntimeClientId,
    })
    return { error: signature.error, ok: false, status: 401 }
  }
  if (
    input.localRuntimeAccessToken !== input.expectedLocalRuntimeAccessToken ||
    input.localRuntimeAccessTokenId !== input.expectedLocalRuntimeAccessTokenId ||
    input.runtimeInstallationId !== input.expectedRuntimeInstallationId
  ) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "rejected",
      failureCode: "AUTHORIZATION_FAILED",
      nonceReplayOutcome,
      requestSigningKeyId: input.proof.keyId || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "accepted",
      trustedRuntimeClientId: input.trustedRuntimeClientId,
    })
    return {
      error: createAuthorizationFailureEnvelope(
        input.requestId ?? "unknown",
        "Remote runtime request authorization is invalid.",
      ),
      ok: false,
      status: 401,
    }
  }
  emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
    authOutcome: "accepted",
    failureCode: null,
    nonceReplayOutcome,
    requestSigningKeyId: input.proof.keyId || null,
    route: input.canonicalPath,
    runtimeInstallationId: input.runtimeInstallationId,
    signatureValidationOutcome: "accepted",
    trustedRuntimeClientId: input.trustedRuntimeClientId,
  })
  return { ok: true, response: await dispatch() }
}

export async function runLocalRemoteRuntimeCommandWithIdempotency<TResponse>(
  input: RunLocalRemoteRuntimeCommandWithIdempotencyInput<TResponse>,
): Promise<LocalRemoteRuntimeHttpAdmissionResult<TResponse>> {
  const result = await runRemoteRuntimeCommandWithIdempotency(input)
  if (result.ok) return { ok: true, response: result.response }
  return {
    error: createIdempotencyConflictEnvelope(
      result.requestId,
      "Remote runtime command idempotency key was already used with a different payload.",
    ),
    ok: false,
    status: 409,
  }
}

export function createInMemoryLocalRemoteRuntimeCommandIdempotencyStore<
  TResponse,
>(): LocalRemoteRuntimeCommandIdempotencyStore<TResponse> {
  return createInMemoryRemoteRuntimeCommandIdempotencyStore()
}

export function createLocalRemoteRuntimeCommandFingerprint(input: {
  bodySha256: string
  canonicalPath: string
  method: string
}) {
  return createRemoteRuntimeCommandFingerprint(input)
}

export function localRemoteRuntimeCommandBodyJson(bodyText: string): Record<string, unknown> | null {
  try {
    const body = JSON.parse(bodyText) as unknown
    if (!isLocalRemoteRuntimeRecord(body)) return null
    return body
  } catch {
    return null
  }
}

export function localRemoteRuntimeCommandBodyAuthority(
  body: Record<string, unknown> | null,
): LocalRemoteRuntimeCommandBodyAuthority {
  return {
    idempotencyKey: typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "",
    runtimeInstallationId: typeof body?.runtimeInstallationId === "string" ? body.runtimeInstallationId : "",
  }
}

export async function runValidatedLocalRemoteRuntimeCommandRequest<TBody, TResponse>(
  input: RunValidatedLocalRemoteRuntimeCommandRequestInput<TBody, TResponse>,
): Promise<LocalRemoteRuntimeValidatedCommandResult<TResponse>> {
  let body: TBody
  try {
    body = input.parseBody(input.bodyJson)
  } catch {
    return {
      error: { code: "VALIDATION_FAILED", message: "Remote runtime command request body is invalid." },
      ok: false,
      status: 400,
    }
  }
  const bodyData = body as TBody & { sessionId?: string }
  if (input.expectedSessionId !== undefined && bodyData.sessionId !== input.expectedSessionId) {
    return {
      error: {
        code: "VALIDATION_FAILED",
        message: "Remote runtime command path and body session identifiers must match.",
      },
      ok: false,
      status: 400,
    }
  }
  return await runLocalRemoteRuntimeCommandWithIdempotency({
    execute: async () =>
      await input.dispatch(
        body,
        input.prepared.remoteRuntimeHttpVersion ?? "",
        input.commandBodyAuthority.runtimeInstallationId,
      ),
    fingerprint: createLocalRemoteRuntimeCommandFingerprint({
      bodySha256: input.prepared.bodySha256,
      canonicalPath: input.prepared.canonicalPath,
      method: input.prepared.method,
    }),
    idempotencyKey: input.commandBodyAuthority.idempotencyKey,
    requestId: input.prepared.requestId,
    runtimeInstallationId: input.commandBodyAuthority.runtimeInstallationId,
    store: input.store,
  })
}

export async function prepareLocalRemoteRuntimeWebSocketAdmission(
  input: LocalRemoteRuntimeWebSocketAdmissionInput,
): Promise<LocalRemoteRuntimeWebSocketAdmissionResult> {
  const requestId = headerValue(input.headers, localRemoteRuntimeRequestIdHeaderName)
  const webSocketVersion = headerValue(input.headers, remoteRuntimeWebSocketVersionHeaderName)
  if (webSocketVersion !== remoteRuntimeWebSocketContractVersion) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: "AUTHORIZATION_FAILED",
      nonceReplayOutcome: "notChecked",
      requestSigningKeyId: headerValue(input.headers, remoteRuntimeHttpRequestSigningKeyIdHeaderName) || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "notChecked",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return {
      error: createAuthorizationFailureEnvelope(
        requestId ?? "unknown",
        "Remote runtime WebSocket contract version is invalid.",
      ),
      ok: false,
      status: 401,
    }
  }
  const keyId = headerValue(input.headers, remoteRuntimeHttpRequestSigningKeyIdHeaderName)
  const algorithm = headerValue(input.headers, remoteRuntimeHttpRequestSignatureAlgorithmHeaderName)
  const timestamp = headerValue(input.headers, remoteRuntimeHttpRequestSignatureTimestampHeaderName)
  const nonce = headerValue(input.headers, remoteRuntimeHttpRequestSignatureNonceHeaderName)
  const signature = headerValue(input.headers, remoteRuntimeHttpRequestSignatureHeaderName)
  const localRuntimeAccessToken = headerValue(input.headers, localRuntimeAccessTokenHeaderName)
  const localRuntimeAccessTokenId = headerValue(input.headers, localRuntimeAccessTokenIdHeaderName)
  if (!keyId || algorithm !== "ed25519" || !timestamp || !nonce || !signature) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: "AUTHORIZATION_FAILED",
      nonceReplayOutcome: "notChecked",
      requestSigningKeyId: keyId || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "notChecked",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return {
      error: createAuthorizationFailureEnvelope(
        requestId ?? "unknown",
        "Remote runtime WebSocket signature is invalid.",
      ),
      ok: false,
      status: 401,
    }
  }
  let nonceReplayOutcome: LocalRemoteRuntimeGatewayDiagnosticOutcome = "notChecked"
  const signatureVerification = await verifyRemoteRuntimeWebSocketUpgradeSignature({
    nonceStore: diagnosticNonceReplayStore(input.nonceStore, (outcome) => {
      nonceReplayOutcome = outcome
    }),
    nowMs: input.nowMs,
    payloadInput: remoteRuntimeWebSocketSigningPayloadInput(input, {
      keyId,
      nonce,
      requestId,
      timestamp,
    }),
    proof: {
      algorithm: "ed25519",
      keyId,
      nonce,
      signature,
      timestamp,
    },
    publicKey: input.authority.publicKey,
  })
  if (!signatureVerification.ok) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: signatureVerification.error.code,
      nonceReplayOutcome,
      requestSigningKeyId: keyId,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "rejected",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return { error: signatureVerification.error, ok: false, status: 401 }
  }
  if (
    localRuntimeAccessToken !== input.authority.expectedLocalRuntimeAccessToken ||
    localRuntimeAccessTokenId !== input.authority.localRuntimeAccessTokenId ||
    input.runtimeInstallationId !== input.authority.runtimeInstallationId
  ) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "rejected",
      failureCode: "AUTHORIZATION_FAILED",
      nonceReplayOutcome,
      requestSigningKeyId: keyId,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "accepted",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return {
      error: createAuthorizationFailureEnvelope(
        requestId ?? "unknown",
        "Remote runtime WebSocket authorization is invalid.",
      ),
      ok: false,
      status: 401,
    }
  }
  emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
    authOutcome: "accepted",
    failureCode: null,
    nonceReplayOutcome,
    requestSigningKeyId: keyId,
    route: input.canonicalPath,
    runtimeInstallationId: input.runtimeInstallationId,
    signatureValidationOutcome: "accepted",
    trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
  })
  return {
    ok: true,
    response: createLocalRemoteRuntimeWebSocketSessionAccepted(),
  }
}

export function createLocalRemoteRuntimeWebSocketSessionAccepted(): RemoteRuntimeWebSocketSessionAccepted {
  return {
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    sessionNonce: crypto.randomUUID(),
    type: "remoteRuntime.websocket.session.accepted",
  }
}

export async function validateLocalRemoteRuntimeWebSocketAction(
  input: LocalRemoteRuntimeWebSocketActionValidationInput,
): Promise<LocalRemoteRuntimeWebSocketActionValidationResult> {
  const action = validateRemoteRuntimeWebSocketSignedAction(input.action, {
    nextSequence: input.nextSequence,
    sessionNonce: input.sessionNonce,
  })
  if (!action.ok) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: action.error.code,
      nonceReplayOutcome: "notChecked",
      requestSigningKeyId: null,
      route: "websocket.action",
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "notChecked",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return {
      error: action.error,
      ok: false,
      status: localWebSocketActionFailureStatus(action.error),
    }
  }
  const payloadText = JSON.stringify(action.value.payload)
  let nonceReplayOutcome: LocalRemoteRuntimeGatewayDiagnosticOutcome = "notChecked"
  const payloadInput: RemoteRuntimeCanonicalWebSocketActionSigningPayloadInput = {
    keyId: action.value.proof.keyId,
    nonce: action.value.proof.nonce,
    payloadSha256: createHash("sha256").update(payloadText).digest("base64url"),
    requestId: remoteRuntimeWebSocketActionRequestId(action.value.payload),
    runtimeInstallationId: input.runtimeInstallationId,
    sequence: action.value.sequence,
    sessionNonce: action.value.sessionNonce,
    timestamp: action.value.proof.timestamp,
    trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
  }
  const canonicalSigningPayloadSha256 = createHash("sha256")
    .update(createRemoteRuntimeCanonicalWebSocketActionSigningPayload(payloadInput).payload)
    .digest("base64url")
  const sessionNonceSha256 = createHash("sha256").update(action.value.sessionNonce).digest("base64url")
  const signature = await verifyRemoteRuntimeWebSocketActionSignature({
    nonceStore: diagnosticNonceReplayStore(input.nonceStore, (outcome) => {
      nonceReplayOutcome = outcome
    }),
    nowMs: input.nowMs,
    payloadInput,
    proof: action.value.proof,
    publicKey: input.authority.publicKey,
  })
  if (!signature.ok) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      canonicalSigningPayloadSha256,
      expectedPayloadSha256: payloadInput.payloadSha256,
      failureCode: signature.error.code,
      nonceReplayOutcome,
      requestSigningKeyId: action.value.proof.keyId || null,
      requestId: payloadInput.requestId,
      route: "websocket.action",
      runtimeInstallationId: input.runtimeInstallationId,
      sequence: action.value.sequence,
      sessionNonceSha256,
      signatureValidationOutcome: "rejected",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return { error: signature.error, ok: false, status: 401 }
  }
  emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
    authOutcome: "accepted",
    canonicalSigningPayloadSha256,
    expectedPayloadSha256: payloadInput.payloadSha256,
    failureCode: null,
    nonceReplayOutcome,
    requestSigningKeyId: action.value.proof.keyId || null,
    requestId: payloadInput.requestId,
    route: "websocket.action",
    runtimeInstallationId: input.runtimeInstallationId,
    sequence: action.value.sequence,
    sessionNonceSha256,
    signatureValidationOutcome: "accepted",
    trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
  })
  return {
    nextSequence: input.nextSequence + 1,
    ok: true,
    response: action.value,
  }
}

export async function dispatchLocalRemoteRuntimeReadSnapshotRequest<T>(
  input: LocalRemoteRuntimeReadSnapshotRequestInput,
  dispatch: () => Promise<T> | T,
): Promise<LocalRemoteRuntimeHttpAdmissionResult<T>> {
  if (
    input.method.toUpperCase() !== "GET" ||
    !isRemoteRuntimeReadSnapshotCanonicalPath(input.canonicalPath, input.route)
  ) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "rejected",
      failureCode: "AUTHORIZATION_FAILED",
      nonceReplayOutcome: "notChecked",
      requestSigningKeyId: input.proof.keyId || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "notChecked",
      trustedRuntimeClientId: input.trustedRuntimeClientId,
    })
    return {
      error: createAuthorizationFailureEnvelope(
        input.requestId ?? "unknown",
        "Remote runtime request authorization is invalid.",
      ),
      ok: false,
      status: 401,
    }
  }
  return dispatchLocalRemoteRuntimeHttpRequest(input, dispatch)
}

export function prepareLocalRemoteRuntimeReadSnapshotAdmission(
  input: PrepareLocalRemoteRuntimeReadSnapshotAdmissionInput,
): LocalRemoteRuntimeHttpAdmissionResult<LocalRemoteRuntimeReadSnapshotRequestInput> {
  const prepared = prepareLocalRemoteRuntimeHttpAdmission({
    authority: input.authority,
    bodySha256: input.bodySha256,
    canonicalPath: input.canonicalPath,
    diagnostics: input.diagnostics,
    headers: input.headers,
    idempotencyKey: null,
    method: input.method,
    nonceStore: input.nonceStore,
    nowMs: input.nowMs,
    query: input.query,
    runtimeInstallationId: input.runtimeInstallationId,
  })
  if (!prepared.ok) return prepared
  return {
    ok: true,
    response: {
      ...prepared.response,
      route: input.route,
    },
  }
}

export function prepareLocalRemoteRuntimeHttpAdmission(
  input: PrepareLocalRemoteRuntimeHttpAdmissionInput,
): LocalRemoteRuntimeHttpAdmissionResult<LocalRemoteRuntimeHttpAdmissionInput> {
  const headers = normalizedRemoteRuntimeHeaders(input.headers)
  const requestId = headerValue(headers, localRemoteRuntimeRequestIdHeaderName) || "unknown"
  const version = validateRemoteRuntimeHttpContractVersionHeader(
    headerValue(headers, remoteRuntimeHttpVersionHeaderName) || null,
    requestId === "unknown" ? null : requestId,
  )
  if (!version.ok) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: version.error.code,
      nonceReplayOutcome: "notChecked",
      requestSigningKeyId: headerValue(headers, remoteRuntimeHttpRequestSigningKeyIdHeaderName) || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "notChecked",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return { error: version.error, ok: false, status: version.status }
  }
  if (headerValue(headers, remoteRuntimeHttpRequestSignatureAlgorithmHeaderName) !== "ed25519") {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: "AUTHORIZATION_FAILED",
      nonceReplayOutcome: "notChecked",
      requestSigningKeyId: headerValue(headers, remoteRuntimeHttpRequestSigningKeyIdHeaderName) || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "notChecked",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return {
      error: createAuthorizationFailureEnvelope(requestId, "Remote runtime request authorization is invalid."),
      ok: false,
      status: 401,
    }
  }
  const proof: RemoteRuntimeRequestSignatureProof = {
    algorithm: "ed25519",
    bodySha256: headerValue(headers, remoteRuntimeHttpRequestBodySha256HeaderName),
    keyId: headerValue(headers, remoteRuntimeHttpRequestSigningKeyIdHeaderName),
    nonce: headerValue(headers, remoteRuntimeHttpRequestSignatureNonceHeaderName),
    signature: headerValue(headers, remoteRuntimeHttpRequestSignatureHeaderName),
    timestamp: headerValue(headers, remoteRuntimeHttpRequestSignatureTimestampHeaderName),
  }
  if (
    proof.bodySha256 !== input.bodySha256 ||
    proof.keyId.length === 0 ||
    proof.nonce.length === 0 ||
    proof.signature.length === 0 ||
    proof.timestamp.length === 0 ||
    headerValue(headers, localRuntimeAccessTokenHeaderName).length === 0
  ) {
    emitLocalRemoteRuntimeGatewayDiagnostic(input.diagnostics, {
      authOutcome: "notChecked",
      failureCode: "AUTHORIZATION_FAILED",
      nonceReplayOutcome: "notChecked",
      requestSigningKeyId: proof.keyId || null,
      route: input.canonicalPath,
      runtimeInstallationId: input.runtimeInstallationId,
      signatureValidationOutcome: "notChecked",
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    })
    return {
      error: createAuthorizationFailureEnvelope(requestId, "Remote runtime request authorization is invalid."),
      ok: false,
      status: 401,
    }
  }
  return {
    ok: true,
    response: {
      bodySha256: input.bodySha256,
      canonicalPath: input.canonicalPath,
      canonicalQuery: canonicalRemoteRuntimeQuery(input.query),
      diagnostics: input.diagnostics,
      expectedLocalRuntimeAccessToken: input.authority.expectedLocalRuntimeAccessToken,
      expectedLocalRuntimeAccessTokenId: input.authority.localRuntimeAccessTokenId,
      expectedRuntimeInstallationId: input.authority.runtimeInstallationId,
      idempotencyKey: input.idempotencyKey,
      localRuntimeAccessToken: headerValue(headers, localRuntimeAccessTokenHeaderName),
      localRuntimeAccessTokenId: headerValue(headers, localRuntimeAccessTokenIdHeaderName) || null,
      method: input.method,
      remoteRuntimeHttpVersion: version.version,
      nonceStore: input.nonceStore,
      nowMs: input.nowMs,
      proof,
      publicKey: input.authority.publicKey,
      requestId: requestId === "unknown" ? null : requestId,
      runtimeInstallationId: input.runtimeInstallationId,
      trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    },
  }
}

function remoteRuntimeHttpSigningPayloadInput(
  input: LocalRemoteRuntimeHttpAdmissionInput,
  remoteRuntimeHttpVersion: RemoteRuntimeHttpContractVersion,
): RemoteRuntimeCanonicalHttpSigningPayloadInput {
  return {
    bodySha256: input.bodySha256,
    canonicalPath: input.canonicalPath,
    canonicalQuery: input.canonicalQuery,
    idempotencyKey: input.idempotencyKey,
    keyId: input.proof.keyId,
    localRuntimeAccessTokenId: input.localRuntimeAccessTokenId,
    method: input.method,
    remoteRuntimeHttpVersion,
    nonce: input.proof.nonce,
    requestId: input.requestId,
    runtimeInstallationId: input.runtimeInstallationId,
    timestamp: input.proof.timestamp,
    trustedRuntimeClientId: input.trustedRuntimeClientId,
  }
}

function remoteRuntimeRecord(input: unknown, label: string): Record<string, unknown> {
  if (!isLocalRemoteRuntimeRecord(input)) {
    throw new Error(`${label} is invalid.`)
  }
  return input
}

function requiredRuntimeString(input: Record<string, unknown>, key: string): string {
  const value = input[key]
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Remote runtime field ${key} is invalid.`)
  }
  return value
}

function requiredRuntimeUrl(input: Record<string, unknown>, key: string): string {
  const value = requiredRuntimeString(input, key)
  try {
    new URL(value)
  } catch {
    throw new Error(`Remote runtime field ${key} is invalid.`)
  }
  return value
}

function optionalRuntimeString<Key extends string>(
  input: Record<string, unknown>,
  key: Key,
): Partial<Record<Key, string>> {
  const value = input[key]
  if (value === undefined) return {}
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Remote runtime field ${key} is invalid.`)
  }
  return { [key]: value } as Partial<Record<Key, string>>
}

function optionalNullableRuntimeString<Key extends string>(
  input: Record<string, unknown>,
  key: Key,
): Partial<Record<Key, string | null>> {
  const value = input[key]
  if (value === undefined) return {}
  if (value === null) return { [key]: null } as Partial<Record<Key, string | null>>
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Remote runtime field ${key} is invalid.`)
  }
  return { [key]: value } as Partial<Record<Key, string | null>>
}

function optionalRuntimeNumber<Key extends string>(
  input: Record<string, unknown>,
  key: Key,
): Partial<Record<Key, number>> {
  const value = input[key]
  if (value === undefined) return {}
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Remote runtime field ${key} is invalid.`)
  }
  return { [key]: value } as Partial<Record<Key, number>>
}

function optionalRuntimePositiveInteger<Key extends string>(
  input: Record<string, unknown>,
  key: Key,
  options: { coerce?: boolean } = {},
): Partial<Record<Key, number>> {
  const value = input[key]
  if (value === undefined) return {}
  const parsed = options.coerce && typeof value === "string" ? Number(value) : value
  if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Remote runtime field ${key} is invalid.`)
  }
  return { [key]: parsed } as Partial<Record<Key, number>>
}

function optionalRuntimeBoolean<Key extends string>(
  input: Record<string, unknown>,
  key: Key,
  options: { coerce?: boolean } = {},
): Partial<Record<Key, boolean>> {
  const value = input[key]
  if (value === undefined) return {}
  const parsed = options.coerce && value === "true" ? true : options.coerce && value === "false" ? false : value
  if (typeof parsed !== "boolean") {
    throw new Error(`Remote runtime field ${key} is invalid.`)
  }
  return { [key]: parsed } as Partial<Record<Key, boolean>>
}

function optionalRuntimeEncryptionKey(input: Record<string, unknown>): {
  runtimeEncryptionKey?: RemoteRuntimeSerializedEncryptionKey
} {
  const value = input.runtimeEncryptionKey
  if (value === undefined) return {}
  const record = remoteRuntimeRecord(value, "Remote runtime encryption key")
  return {
    runtimeEncryptionKey: {
      keyBase64: requiredRuntimeString(record, "keyBase64"),
      keyId: requiredRuntimeString(record, "keyId"),
    },
  }
}

function optionalLocalRemoteRuntimeGatewayAuthority(input: Record<string, unknown>): {
  localGatewayAuthority?: LocalRemoteRuntimeGatewayAuthorityState
} {
  const value = input.localGatewayAuthority
  if (value === undefined) return {}
  const authority = remoteRuntimeRecord(value, "Remote runtime local gateway authority")
  const privateKey = optionalRuntimeResponseSigningPrivateKey(authority)
  return {
    localGatewayAuthority: {
      expectedLocalRuntimeAccessToken: requiredRuntimeString(authority, "expectedLocalRuntimeAccessToken"),
      localRuntimeAccessTokenId: requiredRuntimeString(authority, "localRuntimeAccessTokenId"),
      ...privateKey,
      runtimeInstallationId: requiredRuntimeString(input, "runtimeInstallationId"),
      trustedRuntimeClientAuthorities: normalizeLocalRemoteRuntimeGatewayTrustedDeviceAuthorities({
        trustedRuntimeClientAuthorities: optionalTrustedRuntimeClientAuthorities(authority),
        trustedRuntimeClientId: requiredRuntimeString(authority, "trustedRuntimeClientId"),
        trustedRuntimeClientPublicKey: requiredRuntimeString(authority, "trustedRuntimeClientPublicKey"),
      }),
    },
  }
}

function optionalRuntimeResponseSigningPrivateKey(input: Record<string, unknown>): {
  runtimeResponseSigningPrivateKey?: RemoteRuntimeAsymmetricPrivateKeyReference
} {
  const value = input.runtimeResponseSigningPrivateKey
  if (value === undefined) return {}
  const record = remoteRuntimeRecord(value, "Remote runtime response signing private key")
  const privateKey: RemoteRuntimeAsymmetricPrivateKeyReference = {
    algorithm: requiredRuntimeLiteral(record, "algorithm", "ed25519"),
    encoding: requiredRuntimeLiteral(record, "encoding", "pkcs8-base64url"),
    keyId: requiredRuntimeString(record, "keyId"),
    privateKey: requiredRuntimeString(record, "privateKey"),
    purpose: requiredRuntimeLiteral(record, "purpose", "runtimeResponseSigning"),
  }
  return { runtimeResponseSigningPrivateKey: privateKey }
}

function requiredRuntimeLiteral<Value extends string>(
  input: Record<string, unknown>,
  key: string,
  literal: Value,
): Value {
  if (input[key] !== literal) {
    throw new Error(`Remote runtime field ${key} is invalid.`)
  }
  return literal
}

function optionalTrustedRuntimeClientAuthorities(input: Record<string, unknown>): {
  publicKey: string
  trustedRuntimeClientId: string
}[] {
  const value = input.trustedRuntimeClientAuthorities
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error("Remote runtime trusted device authorities are invalid.")
  }
  return value.map((entry) => {
    const record = remoteRuntimeRecord(entry, "Remote runtime trusted device authority")
    return {
      publicKey: requiredRuntimeString(record, "publicKey"),
      trustedRuntimeClientId: requiredRuntimeString(record, "trustedRuntimeClientId"),
    }
  })
}

function remoteRuntimeWebSocketSigningPayloadInput(
  input: LocalRemoteRuntimeWebSocketAdmissionInput,
  proof: {
    keyId: string
    nonce: string
    requestId: string | null
    timestamp: string
  },
): RemoteRuntimeCanonicalWebSocketUpgradeSigningPayloadInput {
  return {
    accountId: input.accountId,
    canonicalPath: input.canonicalPath,
    canonicalQuery: canonicalRemoteRuntimeQuery(input.query),
    keyId: proof.keyId,
    localRuntimeAccessTokenId: input.authority.localRuntimeAccessTokenId,
    nonce: proof.nonce,
    requestId: proof.requestId,
    runtimeInstallationId: input.runtimeInstallationId,
    timestamp: proof.timestamp,
    trustedRuntimeClientId: input.authority.trustedRuntimeClientId,
    webSocketVersion: remoteRuntimeWebSocketContractVersion,
  }
}

function headerValue(headers: readonly LocalRemoteRuntimeHttpHeader[], name: string) {
  return remoteRuntimeHeaderValue(headers, name)
}

function isLocalRemoteRuntimeWebSocketGatewayPath(path: string): boolean {
  return path === "/global/remote-runtime/socket"
}

function isRemoteRuntimeReadSnapshotCanonicalPath(path: string, route: LocalRemoteRuntimeReadSnapshotRoute): boolean {
  return path === remoteRuntimeReadSnapshotPath(route)
}

function queryValue(query: readonly LocalRemoteRuntimeHttpQueryEntry[], name: string) {
  return query.find((entry) => entry.name === name)?.value
}

function remoteRuntimeWebSocketActionRequestId(payload: RemoteRuntimeWebSocketSignedAction["payload"]) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null
  const record = payload as { requestId?: string }
  return typeof record.requestId === "string" ? record.requestId : null
}

function isLocalRemoteRuntimeRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input)
}

function localWebSocketActionFailureStatus(error: RemoteRuntimeTransportFailureEnvelope): 400 | 401 | 426 {
  if (error.code === "PROTOCOL_MISMATCH") return 426
  if (error.code === "VALIDATION_FAILED") return 400
  return 401
}

function diagnosticNonceReplayStore(
  nonceStore: RemoteRuntimeNonceReplayStore,
  setOutcome: (outcome: LocalRemoteRuntimeGatewayDiagnosticOutcome) => void,
): RemoteRuntimeNonceReplayStore {
  return {
    async reserve(input) {
      const accepted = await nonceStore.reserve(input)
      setOutcome(accepted ? "accepted" : "rejected")
      return accepted
    },
  }
}

function emitLocalRemoteRuntimeGatewayDiagnostic(
  diagnostics: LocalRemoteRuntimeGatewayDiagnosticsSink | undefined,
  diagnostic: LocalRemoteRuntimeGatewayDiagnostic,
) {
  diagnostics?.(diagnostic)
}
