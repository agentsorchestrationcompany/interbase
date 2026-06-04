import { describe, expect, test } from "bun:test"
import {
  currentRemoteRuntimeSupportedVersions,
  currentRemoteRuntimeAcceptedVersions,
  buildGatewayRuntimeAttachmentRegistrationRequest,
  createRemoteRuntimeCanonicalHttpResponseSigningPayload,
  createRemoteRuntimeCanonicalHttpSigningPayload,
  createRemoteRuntimeCanonicalWebSocketActionSigningPayload,
  createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload,
  createAttachmentRevokedEnvelope,
  createAuthorizationFailureEnvelope,
  createDeviceRevokedEnvelope,
  createRemoteRuntimeHttpVersionMismatchFailure,
  createRemoteRuntimeKeyPossessionProofAuthority,
  createRemoteRuntimeKeyPossessionProofPayload,
  createPreviousClientKeyPossessionProofPayload,
  createRemoteRuntimeTransportFailureEnvelope,
  createAttachmentStatusSequencer,
  createIdempotencyConflictEnvelope,
  createPairingSupersededEnvelope,
  createRuntimeCommandFailedEnvelope,
  createRuntimeStatusFrame,
  createRuntimeRevokedEnvelope,
  createRuntimeUnavailableEnvelope,
  isRuntimeAttachmentRoutable,
  isRemoteRuntimePublicKeyAlgorithm,
  isRemoteRuntimePublicKeyEncoding,
  isRemoteRuntimePublicKeyPurpose,
  isRemoteRuntimeRequestSignatureAlgorithm,
  isRemoteRuntimeHttpContractVersionSupported,
  isRemoteRuntimeClientTrustLevel,
  isRemoteRuntimeEncryptedPayloadAlgorithm,
  isRemoteRuntimeEncryptedPayloadContentType,
  isRemoteRuntimeRealtimeEventType,
  isRemoteRuntimeRealtimeResourceKind,
  isRemoteRuntimeOperationClass,
  isRemoteRuntimeAttachmentCapability,
  isRemoteRuntimeCapability,
  isRemoteRuntimeResponseSensitivity,
  isRemoteRuntimeStatusSnapshotState,
  isRemoteRuntimeTransportFailureEnvelope,
  isRemoteRuntimeTransportMessageType,
  isRuntimeConnectionCandidateEnvironment,
  isRuntimeConnectionCandidateHostReachability,
  isRuntimeConnectionCandidateKind,
  localRemoteRuntimeRequestIdHeaderName,
  localRuntimeAccessTokenHeaderName,
  localRuntimeAccessTokenIdHeaderName,
  remoteRuntimeHttpContractVersion,
  remoteRuntimeHttpFailureCodeValues,
  remoteRuntimeHttpRequestBodySha256HeaderName,
  remoteRuntimeHttpRequestSignatureAlgorithmHeaderName,
  remoteRuntimeHttpRequestSignatureHeaderName,
  remoteRuntimeHttpRequestSignatureHeaderNames,
  remoteRuntimeHttpRequestSignatureNonceHeaderName,
  remoteRuntimeHttpRequestSignatureTimestampHeaderName,
  remoteRuntimeHttpRequestSigningKeyIdHeaderName,
  remoteRuntimeHttpResponseBodySha256HeaderName,
  remoteRuntimeHttpResponseSignatureAlgorithmHeaderName,
  remoteRuntimeHttpResponseSignatureHeaderName,
  remoteRuntimeHttpResponseSignatureHeaderNames,
  remoteRuntimeHttpResponseSignatureNonceHeaderName,
  remoteRuntimeHttpResponseSignatureTimestampHeaderName,
  remoteRuntimeHttpResponseSigningKeyIdHeaderName,
  remoteRuntimeHttpVersionHeaderName,
  remoteRuntimeClientTrustLevelValues,
  remoteRuntimeConnectorMetadataCapabilities,
  remoteRuntimeEncryptedPayloadAlgorithmValues,
  remoteRuntimeEncryptedPayloadContentTypeValues,
  remoteRuntimePublicKeyAlgorithmValues,
  remoteRuntimePublicKeyEncodingValues,
  remoteRuntimePublicKeyPurposeValues,
  remoteRuntimeRequestSignatureAlgorithmValues,
  remoteRuntimeRealtimeEventTypeValues,
  remoteRuntimeRealtimeResourceKindValues,
  remoteRuntimeAttachmentCapabilityValues,
  remoteRuntimeCapabilityValues,
  remoteRuntimeOperationClassValues,
  remoteRuntimeResponseSensitivityValues,
  remoteRuntimeStatusSnapshotStateValues,
  remoteRuntimeTransportMessageTypeValues,
  remoteRuntimeTransportProtocolVersion,
  remoteRuntimeTransportFailureCodeValues,
  remoteRuntimeTransportPairingActionValues,
  remoteRuntimeWebSocketContractVersion,
  remoteRuntimeWebSocketPublicKeyHeaderName,
  remoteRuntimeWebSocketVersionHeaderName,
  negotiateAdvertisedRemoteRuntimeVersions,
  negotiateRemoteRuntimeVersions,
  parseRemoteRuntimeAsymmetricPrivateKeyReference,
  parseRemoteRuntimeResponseSigningPublicKey,
  parseRemoteRuntimeSerializedEncryptionKey,
  parseGatewayRuntimeAttachment,
  parseMobileGatewayWebSocketAttachmentHandshake,
  parseRemoteRuntimeClientAttachment,
  previousRemoteRuntimeHttpContractVersion,
  previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
  requiredRemoteRuntimeApiString,
  remoteRuntimeProtocolClientMethodValues,
  remoteRuntimeWebSocketResponseSchemaForMethod,
  remoteRuntimeThreadMetadataProjectionFields,
  runtimeWebSocketRemoteRuntimeProtocolVersion,
  runtimeConnectionCandidateEnvironmentValues,
  runtimeConnectionCandidateHostReachabilityValues,
  runtimeConnectionCandidateKindValues,
  runtimeOperationFrameReplyTarget,
  runtimeOperationReplyTargetFromFrameAuthority,
  serializeRemoteRuntimeAsymmetricPublicKey,
  runtimeOwnerForRemoteRuntimeAttachment,
  supportedRemoteRuntimeHttpContractVersions,
  supportedRemoteRuntimeTransportProtocolVersions,
  supportedRuntimeWebSocketRemoteRuntimeProtocolVersions,
  validateRemoteRuntimeAsymmetricPublicKey,
  validateRemoteRuntimeHttpContractVersionHeader,
  validateRuntimeOperationReplyTargetFromFrameAuthority,
  validateSerializedRemoteRuntimeAsymmetricPublicKey,
  type GatewayRuntimeAttachment,
  type RemoteRuntimeClientAttachment,
  type RemoteRuntimeClientAttachmentRequest,
  type RemoteRuntimeEncryptedPayload,
  type RemoteRuntimeJsonValue,
  type RuntimeConnectionCandidate,
  type RuntimeConnectionCandidateBootstrap,
  type RuntimeTunnelEdgeAccess,
  type RuntimeAttachmentHealth,
} from "../src/index.js"

describe("remote runtime contracts", () => {
  test("reads required remote runtime API strings", () => {
    expect(requiredRemoteRuntimeApiString({ ticket: " ticket-1 " }, "ticket", "ticket record")).toBe(" ticket-1 ")
    expect(() => requiredRemoteRuntimeApiString({}, "ticket", "ticket record")).toThrow(
      "Remote runtime setup did not receive ticket from ticket record.",
    )
    expect(() => requiredRemoteRuntimeApiString({ ticket: "   " }, "ticket", "ticket record")).toThrow(
      "Remote runtime setup did not receive ticket from ticket record.",
    )
  })

  test("builds typed reply target authority", () => {
    expect(runtimeOperationFrameReplyTarget({ clientAttachmentId: "mobile-1" })).toEqual({
      kind: "remoteRuntimeAttachment",
      remoteRuntimeAttachmentId: "mobile-1",
    })
    expect(runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "request-1" })).toEqual({
      kind: "gatewayHttpRequest",
      gatewayHttpRequestId: "request-1",
    })
  })

  test("validates runtime operation reply target frame authority", () => {
    expect(runtimeOperationReplyTargetFromFrameAuthority({ clientAttachmentId: "mda-1" })).toEqual({
      kind: "remoteRuntimeAttachment",
      remoteRuntimeAttachmentId: "mda-1",
    })
    expect(
      runtimeOperationReplyTargetFromFrameAuthority({
        clientAttachmentId: "mda-1",
        trustedGatewayHttpRequest: true,
      }),
    ).toEqual({
      gatewayHttpRequestId: "mda-1",
      kind: "gatewayHttpRequest",
    })
    expect(
      runtimeOperationReplyTargetFromFrameAuthority({
        clientAttachmentId: "mda-1",
        replyTarget: "invalid",
      }),
    ).toEqual({ kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId: "mda-1" })
    expect(
      runtimeOperationReplyTargetFromFrameAuthority({
        clientAttachmentId: "http-1",
        replyTarget: "invalid",
        trustedGatewayHttpRequest: true,
      }),
    ).toEqual({ gatewayHttpRequestId: "http-1", kind: "gatewayHttpRequest" })
    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        {
          clientAttachmentId: "mda-1",
          replyTarget: { kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId: "mda-1" },
        },
        "req-1",
      ),
    ).toEqual({ ok: true, value: { kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId: "mda-1" } })
    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        {
          clientAttachmentId: "http-1",
          replyTarget: { kind: "gatewayHttpRequest", gatewayHttpRequestId: "http-1" },
        },
        "req-2",
      ),
    ).toEqual({ ok: true, value: { gatewayHttpRequestId: "http-1", kind: "gatewayHttpRequest" } })

    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        { clientAttachmentId: "mda-1", replyTarget: "mda-1" },
        "req-3",
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED", message: "Runtime operation reply target must be an object." },
    })
    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        {
          clientAttachmentId: "mda-1",
          replyTarget: { kind: "remoteRuntimeAttachment" },
        },
        "req-4",
      ),
    ).toMatchObject({
      ok: false,
      error: { message: "Runtime operation remote runtime attachment reply target id is required." },
    })
    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        {
          clientAttachmentId: "mda-1",
          replyTarget: { kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId: "mda-1" },
          trustedGatewayHttpRequest: true,
        },
        "req-5",
      ),
    ).toMatchObject({
      ok: false,
      error: { message: "Gateway-trusted HTTP runtime operations cannot target a remote runtime attachment." },
    })
    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        {
          clientAttachmentId: "mda-1",
          replyTarget: { kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId: "mda-2" },
        },
        "req-6",
      ),
    ).toMatchObject({
      ok: false,
      error: {
        message: "Runtime operation remote runtime attachment reply target must match the frame attachment id.",
      },
    })
    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        {
          clientAttachmentId: "http-1",
          replyTarget: { kind: "gatewayHttpRequest" },
        },
        "req-7",
      ),
    ).toMatchObject({ ok: false, error: { message: "Runtime operation gateway HTTP reply target id is required." } })
    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        {
          clientAttachmentId: "http-1",
          replyTarget: { kind: "gatewayHttpRequest", gatewayHttpRequestId: "http-2" },
        },
        "req-8",
      ),
    ).toMatchObject({
      ok: false,
      error: { message: "Runtime operation gateway HTTP reply target must match the frame request id." },
    })
    expect(
      validateRuntimeOperationReplyTargetFromFrameAuthority(
        {
          clientAttachmentId: "mda-1",
          replyTarget: { kind: "other", clientAttachmentId: "mda-1" },
        },
        "req-9",
      ),
    ).toMatchObject({ ok: false, error: { message: "Runtime operation reply target kind is invalid." } })
  })

  test("limits subscriptions to real remote runtime attachment authority", () => {
    expect(runtimeOwnerForRemoteRuntimeAttachment("mobile-1")).toEqual({
      kind: "remoteRuntimeAttachment",
      remoteRuntimeAttachmentId: "mobile-1",
    })
  })

  test("keeps degraded attachments routable but unavailable attachments unroutable", () => {
    const routable: RuntimeAttachmentHealth[] = ["starting", "online", "degraded"]
    const unroutable: RuntimeAttachmentHealth[] = ["unavailable", "revoking", "revoked", "expired"]
    expect(isRuntimeAttachmentRoutable("starting")).toBe(true)
    expect(isRuntimeAttachmentRoutable("unavailable")).toBe(false)
    expect(routable.every(isRuntimeAttachmentRoutable)).toBe(true)
    expect(unroutable.some(isRuntimeAttachmentRoutable)).toBe(false)
  })

  test("owns remote runtime transport versions and header names", () => {
    expect(remoteRuntimeTransportProtocolVersion).toBe("2026-05-08")
    expect(supportedRemoteRuntimeTransportProtocolVersions).toEqual(["2026-05-08"])
    expect(remoteRuntimeHttpContractVersion).toBe("2026-05-14")
    expect(remoteRuntimeWebSocketContractVersion).toBe("2026-05-14")
    expect(previousRemoteRuntimeHttpContractVersion).toBe("2026-05-08")
    expect(supportedRemoteRuntimeHttpContractVersions).toEqual(["2026-05-08", "2026-05-14"])
    expect(runtimeWebSocketRemoteRuntimeProtocolVersion).toBe("0.1.6")
    expect(previousRuntimeWebSocketRemoteRuntimeProtocolVersion).toBe("0.1.5")
    expect(supportedRuntimeWebSocketRemoteRuntimeProtocolVersions).toEqual(["0.1.5", "0.1.6"])
    expect(remoteRuntimeHttpVersionHeaderName).toBe("Interbase-Remote-Runtime-HTTP-Version")
    expect(remoteRuntimeWebSocketVersionHeaderName).toBe("Interbase-Remote-Runtime-WebSocket-Version")
    expect(remoteRuntimeWebSocketPublicKeyHeaderName).toBe("Interbase-Remote-Runtime-Public-Key")
    expect(localRuntimeAccessTokenHeaderName).toBe("Interbase-Local-Runtime-Access-Token")
    expect(localRuntimeAccessTokenIdHeaderName).toBe("Interbase-Local-Runtime-Access-Token-Id")
    expect(localRemoteRuntimeRequestIdHeaderName).toBe("Interbase-Remote-Runtime-Request-Id")
    expect(remoteRuntimeHttpRequestSignatureHeaderNames).toEqual([
      remoteRuntimeHttpRequestSigningKeyIdHeaderName,
      remoteRuntimeHttpRequestSignatureAlgorithmHeaderName,
      remoteRuntimeHttpRequestSignatureTimestampHeaderName,
      remoteRuntimeHttpRequestSignatureNonceHeaderName,
      remoteRuntimeHttpRequestBodySha256HeaderName,
      remoteRuntimeHttpRequestSignatureHeaderName,
    ])
    expect(remoteRuntimeHttpResponseSignatureHeaderNames).toEqual([
      remoteRuntimeHttpResponseSigningKeyIdHeaderName,
      remoteRuntimeHttpResponseSignatureAlgorithmHeaderName,
      remoteRuntimeHttpResponseSignatureTimestampHeaderName,
      remoteRuntimeHttpResponseSignatureNonceHeaderName,
      remoteRuntimeHttpResponseBodySha256HeaderName,
      remoteRuntimeHttpResponseSignatureHeaderName,
    ])
    expect(remoteRuntimeHttpFailureCodeValues).toEqual(["REMOTE_RUNTIME_HTTP_VERSION_MISMATCH"])
  })

  test("exposes remote runtime protocol contract authority", () => {
    expect(remoteRuntimeThreadMetadataProjectionFields).toContain("threadId")
    expect(remoteRuntimeProtocolClientMethodValues).toContain("session.messages")
    expect(remoteRuntimeWebSocketResponseSchemaForMethod("chat.start")).toEqual({
      method: "chat.start",
      payloadKind: "session",
      serverMessageTypes: ["response", "error", "heartbeat", "protocolVersionMismatch"],
    })
  })

  test("validates remote runtime HTTP contract version headers with remediation", () => {
    expect(isRemoteRuntimeHttpContractVersionSupported(remoteRuntimeHttpContractVersion)).toBe(true)
    expect(isRemoteRuntimeHttpContractVersionSupported("2099-01-01")).toBe(false)
    expect(validateRemoteRuntimeHttpContractVersionHeader(remoteRuntimeHttpContractVersion, "req-current")).toEqual({
      ok: true,
      version: remoteRuntimeHttpContractVersion,
    })
    expect(
      validateRemoteRuntimeHttpContractVersionHeader(previousRemoteRuntimeHttpContractVersion, "req-previous"),
    ).toEqual({
      ok: true,
      version: previousRemoteRuntimeHttpContractVersion,
    })
    expect(validateRemoteRuntimeHttpContractVersionHeader(null, "req-missing")).toEqual({
      error: createRemoteRuntimeHttpVersionMismatchFailure({ receivedVersion: null, requestId: "req-missing" }),
      ok: false,
      status: 400,
    })
    expect(validateRemoteRuntimeHttpContractVersionHeader("", "req-blank")).toEqual({
      error: createRemoteRuntimeHttpVersionMismatchFailure({ receivedVersion: "", requestId: "req-blank" }),
      ok: false,
      status: 400,
    })
    expect(validateRemoteRuntimeHttpContractVersionHeader("2099-01-01", "req-future")).toEqual({
      error: {
        code: "REMOTE_RUNTIME_HTTP_VERSION_MISMATCH",
        message:
          "Remote runtime HTTP contract version 2099-01-01 is unsupported. Supported versions: 2026-05-08, 2026-05-14. Update the remote runtime client, gateway, or CLI/runtime so their supported remote runtime HTTP contract windows overlap.",
        receivedVersion: "2099-01-01",
        requestId: "req-future",
        supportedVersions: ["2026-05-08", "2026-05-14"],
      },
      ok: false,
      status: 426,
    })
    expect(createRemoteRuntimeHttpVersionMismatchFailure({ receivedVersion: null })).toMatchObject({ requestId: null })
  })

  test("owns asymmetric public-key contract validation", () => {
    const publicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "key_1",
      publicKey: "AbCdEf0123_-",
      purpose: "remoteRuntimeRequestSigning",
    } as const

    expect(remoteRuntimePublicKeyAlgorithmValues).toEqual(["ed25519"])
    expect(remoteRuntimePublicKeyEncodingValues).toEqual(["base64url"])
    expect(remoteRuntimePublicKeyPurposeValues).toEqual(["remoteRuntimeRequestSigning", "runtimeResponseSigning"])
    expect(remoteRuntimeRequestSignatureAlgorithmValues).toEqual(["ed25519"])
    expect(isRemoteRuntimePublicKeyAlgorithm("ed25519")).toBe(true)
    expect(isRemoteRuntimePublicKeyAlgorithm("rsa")).toBe(false)
    expect(isRemoteRuntimePublicKeyEncoding("base64url")).toBe(true)
    expect(isRemoteRuntimePublicKeyEncoding("pem")).toBe(false)
    expect(isRemoteRuntimePublicKeyPurpose("runtimeResponseSigning")).toBe(true)
    expect(isRemoteRuntimePublicKeyPurpose("other")).toBe(false)
    expect(isRemoteRuntimeRequestSignatureAlgorithm("ed25519")).toBe(true)
    expect(isRemoteRuntimeRequestSignatureAlgorithm("rsa")).toBe(false)
    expect(validateRemoteRuntimeAsymmetricPublicKey(publicKey)).toEqual({ ok: true, value: publicKey })
    expect(validateRemoteRuntimeAsymmetricPublicKey({ ...publicKey, purpose: "runtimeResponseSigning" })).toEqual({
      ok: true,
      value: { ...publicKey, purpose: "runtimeResponseSigning" },
    })
    expect(validateRemoteRuntimeAsymmetricPublicKey({ ...publicKey, publicKey: "client_public_placeholder" })).toEqual({
      error: { message: "Runtime client asymmetric public key is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeAsymmetricPublicKey({ ...publicKey, publicKey: "not base64" })).toMatchObject({
      ok: false,
    })
    expect(validateRemoteRuntimeAsymmetricPublicKey({ ...publicKey, keyId: "" })).toMatchObject({ ok: false })
    expect(validateRemoteRuntimeAsymmetricPublicKey(null)).toMatchObject({ ok: false })
    expect(
      validateSerializedRemoteRuntimeAsymmetricPublicKey(serializeRemoteRuntimeAsymmetricPublicKey(publicKey)),
    ).toEqual({
      ok: true,
      value: publicKey,
    })
    expect(validateSerializedRemoteRuntimeAsymmetricPublicKey(publicKey)).toEqual({
      ok: true,
      value: publicKey,
    })
    expect(validateSerializedRemoteRuntimeAsymmetricPublicKey("not-json")).toMatchObject({ ok: false })
    expect(() =>
      serializeRemoteRuntimeAsymmetricPublicKey({ ...publicKey, publicKey: "runtime_public_placeholder" }),
    ).toThrow("Runtime client asymmetric public key is malformed.")
    expect(
      parseRemoteRuntimeAsymmetricPrivateKeyReference({
        algorithm: "ed25519",
        encoding: "pkcs8-base64url",
        keyId: "private-key-1",
        privateKey: "private-key-material",
        purpose: "runtimeResponseSigning",
      }),
    ).toEqual({
      algorithm: "ed25519",
      encoding: "pkcs8-base64url",
      keyId: "private-key-1",
      privateKey: "private-key-material",
      purpose: "runtimeResponseSigning",
    })
    expect(() =>
      parseRemoteRuntimeAsymmetricPrivateKeyReference({
        algorithm: "ed25519",
        encoding: "pkcs8-base64url",
        keyId: "private-key-1",
        privateKey: "private-key-material",
        purpose: "remoteRuntimeRequestSigning",
      }),
    ).toThrow("invalid schema")
    expect(parseRemoteRuntimeResponseSigningPublicKey({ ...publicKey, purpose: "runtimeResponseSigning" })).toEqual({
      ...publicKey,
      purpose: "runtimeResponseSigning",
    })
    expect(() => parseRemoteRuntimeResponseSigningPublicKey(publicKey)).toThrow("invalid schema")
    expect(parseRemoteRuntimeSerializedEncryptionKey({ keyBase64: "a2V5", keyId: "client_setup_token:v1" })).toEqual({
      keyBase64: "a2V5",
      keyId: "client_setup_token:v1",
    })
    expect(() => parseRemoteRuntimeSerializedEncryptionKey({ keyBase64: "a2V5" })).toThrow("invalid schema")
  })

  test("owns remote runtime vocabulary", () => {
    const edgeAccess = {
      clientId: "client-id",
      clientIdHeaderName: "CF-Access-Client-Id",
      clientSecret: "client-secret",
      clientSecretHeaderName: "CF-Access-Client-Secret",
      provider: "cloudflareAccess",
    } satisfies RuntimeTunnelEdgeAccess
    const bootstrap = {
      baseHttpUrl: "https://runtime.example",
      candidateId: "candidate-1",
      edgeAccess,
      environment: "tunnel",
      expiresAt: "2026-05-14T00:00:00.000Z",
      hostReachability: "public",
      kind: "cloudflareTunnel",
      localRuntimeAccessToken: "runtime-token",
      localRuntimeAccessTokenId: "runtime-token-id",
      priority: 1,
      runtimeInstallationId: "runtime-1",
      runtimeResponseSigningPublicKey: {
        algorithm: "ed25519",
        createdAt: "2026-05-14T00:00:00.000Z",
        encoding: "base64url",
        keyId: "runtime-key-1",
        publicKey: "RuntimePublicKey0123_-",
        purpose: "runtimeResponseSigning",
      },
      webSocketUrl: "wss://runtime.example/mobile/socket",
    } satisfies RuntimeConnectionCandidateBootstrap
    const candidate = {
      ...bootstrap,
      remoteRuntimeRequestSigningKeyId: "mobile-key-1",
      trustedRuntimeClientId: "device-1",
    } satisfies RuntimeConnectionCandidate
    const encryptedPayload = {
      algorithm: "aes-256-gcm",
      ciphertext: "ciphertext",
      contentType: "runtimeWebSocketClientCommand",
      keyId: "runtime-key-1",
      nonce: "nonce",
    } satisfies RemoteRuntimeEncryptedPayload

    expect(candidate.edgeAccess).toBe(edgeAccess)
    expect(candidate.kind).toBe("cloudflareTunnel")
    expect(encryptedPayload.contentType).toBe("runtimeWebSocketClientCommand")
    expect(runtimeConnectionCandidateKindValues).toEqual([
      "direct",
      "cloudflareTunnel",
      "zrokPublicHttp",
      "interbaseRelay",
    ])
    expect(runtimeConnectionCandidateEnvironmentValues).toEqual([
      "simulator",
      "physicalDevice",
      "lan",
      "tunnel",
      "gateway",
    ])
    expect(runtimeConnectionCandidateHostReachabilityValues).toEqual(["loopback", "lan", "public"])
    expect(remoteRuntimeStatusSnapshotStateValues).toEqual(["online", "degraded", "offline", "revoked", "unavailable"])
    expect(remoteRuntimeCapabilityValues).toEqual([
      "remoteRuntime.http.activeChats",
      "remoteRuntime.http.chatDetail",
      "remoteRuntime.http.chatMessages",
      "remoteRuntime.http.goals",
      "remoteRuntime.http.providers",
      "remoteRuntime.http.runtimeDirectories",
      "remoteRuntime.http.runtimeStatus",
      "remoteRuntime.http.startChat",
      "remoteRuntime.http.sendMessage",
      "remoteRuntime.http.updateChat",
      "remoteRuntime.git.read",
      "remoteRuntime.goal.read",
      "remoteRuntime.goal.list",
      "remoteRuntime.goal.mutate",
      "remoteRuntime.goal.events",
      "remoteRuntime.alias.read",
      "remoteRuntime.alias.list",
      "remoteRuntime.alias.mutate",
      "remoteRuntime.alias.events",
      "remoteRuntime.websocket.realtimeEvents",
      "remoteRuntime.websocket.streamDeltas",
    ])
    expect(remoteRuntimeAttachmentCapabilityValues).toEqual([
      "runtime.metadata",
      "runtime.sensitiveRead",
      "runtime.mutate",
      "runtime.privilegedExecution",
      "runtime.credential",
      "runtime.shutdown",
    ])
    expect(remoteRuntimeConnectorMetadataCapabilities).toEqual(["runtime.metadata"])
    expect(remoteRuntimeRealtimeEventTypeValues).toEqual([
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
    ])
    expect(remoteRuntimeRealtimeResourceKindValues).toEqual([
      "runtime",
      "activeChats",
      "chat",
      "chatMessages",
      "goals",
      "aliases",
      "providers",
    ])
    expect(remoteRuntimeTransportMessageTypeValues).toEqual([
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
    ])
    expect(remoteRuntimeOperationClassValues).toEqual([
      "metadataRead",
      "sensitiveRead",
      "mutation",
      "privilegedExecution",
      "credential",
      "shutdown",
    ])
    expect(remoteRuntimeResponseSensitivityValues).toEqual(["none", "metadata", "sensitive", "credential"])
    expect(remoteRuntimeClientTrustLevelValues).toEqual(["untrusted", "paired", "trusted"])
    expect(remoteRuntimeEncryptedPayloadAlgorithmValues).toEqual(["aes-256-gcm"])
    expect(remoteRuntimeEncryptedPayloadContentTypeValues).toEqual(["runtimeWebSocketClientCommand"])
    expect(isRuntimeConnectionCandidateKind("direct")).toBe(true)
    expect(isRuntimeConnectionCandidateKind("hosted")).toBe(false)
    expect(isRuntimeConnectionCandidateEnvironment("physicalDevice")).toBe(true)
    expect(isRuntimeConnectionCandidateEnvironment("desktop")).toBe(false)
    expect(isRuntimeConnectionCandidateHostReachability("loopback")).toBe(true)
    expect(isRuntimeConnectionCandidateHostReachability("vpn")).toBe(false)
    expect(isRemoteRuntimeStatusSnapshotState("degraded")).toBe(true)
    expect(isRemoteRuntimeStatusSnapshotState("starting")).toBe(false)
    expect(isRemoteRuntimeCapability("remoteRuntime.http.runtimeStatus")).toBe(true)
    expect(isRemoteRuntimeCapability("remoteRuntime.http.unknown")).toBe(false)
    expect(isRemoteRuntimeAttachmentCapability("runtime.metadata")).toBe(true)
    expect(isRemoteRuntimeAttachmentCapability("remoteRuntime.http.runtimeStatus")).toBe(false)
    expect(isRemoteRuntimeRealtimeEventType("chat.stream.part")).toBe(true)
    expect(isRemoteRuntimeRealtimeEventType("chat.part")).toBe(false)
    expect(isRemoteRuntimeRealtimeResourceKind("providers")).toBe(true)
    expect(isRemoteRuntimeRealtimeResourceKind("provider")).toBe(false)
    expect(isRemoteRuntimeTransportMessageType("runtime.operation")).toBe(true)
    expect(isRemoteRuntimeTransportMessageType("runtime.unknown")).toBe(false)
    expect(
      isRemoteRuntimeTransportFailureEnvelope({
        code: "RUNTIME_UNAVAILABLE",
        message: "Runtime unavailable.",
        pairingAction: "retry",
        protocolVersion: remoteRuntimeTransportProtocolVersion,
        requestId: "request-1",
        terminal: false,
        type: "runtime.unavailable",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeTransportFailureEnvelope({
        code: "RUNTIME_UNAVAILABLE",
        message: "Runtime unavailable.",
        pairingAction: "retry",
        protocolVersion: remoteRuntimeTransportProtocolVersion,
        requestId: "request-1",
        terminal: "false",
        type: "runtime.unavailable",
      }),
    ).toBe(false)
    expect(isRemoteRuntimeOperationClass("mutation")).toBe(true)
    expect(isRemoteRuntimeOperationClass("read")).toBe(false)
    expect(isRemoteRuntimeResponseSensitivity("credential")).toBe(true)
    expect(isRemoteRuntimeResponseSensitivity("secret")).toBe(false)
    expect(isRemoteRuntimeClientTrustLevel("trusted")).toBe(true)
    expect(isRemoteRuntimeClientTrustLevel("owner")).toBe(false)
    expect(isRemoteRuntimeEncryptedPayloadAlgorithm("aes-256-gcm")).toBe(true)
    expect(isRemoteRuntimeEncryptedPayloadAlgorithm("chacha20-poly1305")).toBe(false)
    expect(isRemoteRuntimeEncryptedPayloadContentType("runtimeWebSocketClientCommand")).toBe(true)
    expect(isRemoteRuntimeEncryptedPayloadContentType("runtimeWebSocketServerEnvelope")).toBe(false)
  })

  test("builds gateway runtime attachment registration requests", () => {
    expect(
      buildGatewayRuntimeAttachmentRegistrationRequest({
        accountId: "account-1",
        allowedDirectories: [
          { directoryId: "dir-1", displayName: "repo", path: "/repo" },
          { directoryId: "dir-2", displayName: "other", path: "/other" },
        ],
        connectorVersion: "1.0.0",
        directoryId: "dir-1",
        directoryPath: "/repo",
        requestId: "request-1",
        runtimeInstallationId: "runtime-1",
        ticket: "ticket-1",
      }),
    ).toEqual({
      accountId: "account-1",
      allowedDirectories: [
        { directoryId: "dir-1", displayName: "repo", path: "/repo" },
        { directoryId: "dir-2", displayName: "other", path: "/other" },
      ],
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      directoryId: "dir-1",
      directoryPath: "/repo",
      featureCapabilities: [],
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "request-1",
      runtimeInstallationId: "runtime-1",
      ticket: "ticket-1",
    })
    expect(
      buildGatewayRuntimeAttachmentRegistrationRequest({
        accountId: "account-1",
        attachmentCapabilities: ["runtime.metadata", "runtime.mutate"],
        connectorVersion: "1.0.0",
        directoryId: "dir-1",
        directoryPath: "/repo",
        featureCapabilities: ["remoteRuntime.http.activeChats"],
        requestId: "request-1",
        runtimeInstallationId: "runtime-1",
        ticket: "ticket-1",
      }),
    ).toMatchObject({
      attachmentCapabilities: ["runtime.metadata", "runtime.mutate"],
      featureCapabilities: ["remoteRuntime.http.activeChats"],
    })
  })

  test("parses gateway runtime attachment acceptance payloads", () => {
    expect(
      parseGatewayRuntimeAttachment({
        accountId: "account-1",
        allowedDirectories: [
          { directoryId: "dir-1", path: "/repo" },
          { directoryId: "dir-2", displayName: null, path: "/other" },
          { directoryId: "dir-3", displayName: "third", path: "/third" },
        ],
        attachmentCapabilities: ["runtime.metadata"],
        connectorVersion: "1.0.0",
        deviceTrustLevel: "trusted",
        directoryId: "directory-1",
        directoryPath: "/repo",
        featureCapabilities: ["remoteRuntime.http.activeChats"],
        gatewayRuntimeAttachmentId: "gateway-attachment-1",
        runtimeInstallationId: "runtime-1",
        status: "online",
      }),
    ).toEqual({
      accountId: "account-1",
      allowedDirectories: [
        { directoryId: "dir-1", path: "/repo" },
        { directoryId: "dir-2", displayName: null, path: "/other" },
        { directoryId: "dir-3", displayName: "third", path: "/third" },
      ],
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      deviceTrustLevel: "trusted",
      directoryId: "directory-1",
      directoryPath: "/repo",
      featureCapabilities: ["remoteRuntime.http.activeChats"],
      gatewayRuntimeAttachmentId: "gateway-attachment-1",
      runtimeInstallationId: "runtime-1",
      status: "online",
    })
    expect(() =>
      parseGatewayRuntimeAttachment({
        accountId: "account-1",
        capabilities: ["runtime.metadata"],
        connectorVersion: "1.0.0",
        directoryId: "directory-1",
        directoryPath: "/repo",
        gatewayRuntimeAttachmentId: "gateway-attachment-1",
        runtimeInstallationId: "runtime-1",
        status: "online",
      }),
    ).toThrow("Remote runtime websocket attachment failed")
    expect(
      parseGatewayRuntimeAttachment({
        accountId: "account-1",
        attachmentCapabilities: [],
        connectorVersion: "1.0.0",
        directoryId: "directory-1",
        directoryPath: "/repo",
        gatewayRuntimeAttachmentId: "gateway-attachment-1",
        runtimeInstallationId: "runtime-1",
        status: "revoked",
      }),
    ).toEqual({
      accountId: "account-1",
      attachmentCapabilities: [],
      connectorVersion: "1.0.0",
      directoryId: "directory-1",
      directoryPath: "/repo",
      featureCapabilities: [],
      gatewayRuntimeAttachmentId: "gateway-attachment-1",
      runtimeInstallationId: "runtime-1",
      status: "revoked",
    })
    expect(() =>
      parseGatewayRuntimeAttachment({
        accountId: "account-1",
        attachmentCapabilities: ["runtime.metadata"],
        connectorVersion: "1.0.0",
        directoryId: "directory-1",
        directoryPath: "/repo",
        gatewayRuntimeAttachmentId: "gateway-attachment-1",
        runtimeInstallationId: "runtime-1",
        status: "degraded",
      }),
    ).toThrow("Remote runtime websocket attachment failed.")
    expect(() =>
      parseGatewayRuntimeAttachment({
        accountId: "account-1",
        attachmentCapabilities: [1],
        connectorVersion: "1.0.0",
        directoryId: "directory-1",
        directoryPath: "/repo",
        gatewayRuntimeAttachmentId: "gateway-attachment-1",
        runtimeInstallationId: "runtime-1",
        status: "online",
      }),
    ).toThrow("Remote runtime websocket attachment failed.")
  })

  test("parses remote runtime client attachment handshake payloads", () => {
    const payload = {
      accountId: "account-1",
      deviceTrustLevel: "trusted",
      gatewayRuntimeAttachmentId: "gateway-attachment-1",
      clientAttachmentId: "mobile-attachment-1",
      runtimeInstallationId: "runtime-1",
      status: "attached",
      trustedRuntimeClientId: "trusted-device-1",
    } satisfies RemoteRuntimeClientAttachment

    expect(parseRemoteRuntimeClientAttachment(payload)).toEqual(payload)
    expect(parseMobileGatewayWebSocketAttachmentHandshake(payload)).toEqual(payload)
    expect(
      parseRemoteRuntimeClientAttachment({
        ...payload,
        deviceTrustLevel: undefined,
      } as unknown as RemoteRuntimeJsonValue),
    ).toEqual({ ...payload, deviceTrustLevel: "paired" })
    expect(
      parseRemoteRuntimeClientAttachment({
        accountId: payload.accountId,
        gatewayRuntimeAttachmentId: payload.gatewayRuntimeAttachmentId,
        clientAttachmentId: payload.clientAttachmentId,
        runtimeInstallationId: payload.runtimeInstallationId,
        status: payload.status,
        trustedRuntimeClientId: payload.trustedRuntimeClientId,
      }),
    ).toEqual({ ...payload, deviceTrustLevel: "paired" })
    expect(() => parseGatewayRuntimeAttachment(payload)).toThrow("Remote runtime websocket attachment failed.")
    expect(() =>
      parseRemoteRuntimeClientAttachment({
        ...payload,
        status: "online",
      }),
    ).toThrow("Remote runtime websocket client attachment failed.")
    expect(() =>
      parseRemoteRuntimeClientAttachment({
        ...payload,
        clientAttachmentId: undefined,
      } as unknown as RemoteRuntimeJsonValue),
    ).toThrow("Remote runtime websocket client attachment failed.")
  })

  test("owns attachment lifecycle contract shapes", () => {
    expect(
      buildGatewayRuntimeAttachmentRegistrationRequest({
        accountId: "account-1",
        attachmentCapabilities: ["runtime.metadata"],
        connectorVersion: "1.0.0",
        directoryId: "dir-1",
        directoryPath: "/repo",
        requestId: "request-1",
        runtimeInstallationId: "runtime-1",
        ticket: "ticket-1",
      }),
    ).toMatchObject({
      attachmentCapabilities: ["runtime.metadata"],
    })
    const gatewayAttachment = {
      accountId: "account-1",
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      deviceTrustLevel: "paired",
      directoryId: "dir-1",
      directoryPath: "/repo",
      featureCapabilities: [],
      gatewayRuntimeAttachmentId: "gateway-attachment-1",
      runtimeInstallationId: "runtime-1",
      status: "online",
    } satisfies GatewayRuntimeAttachment
    const remoteRuntimeClientRequest = {
      accountId: "account-1",
      deviceTrustLevel: "trusted",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "request-1",
      runtimeInstallationId: "runtime-1",
      ticket: "ticket-1",
      trustedRuntimeClientId: "device-1",
    } satisfies RemoteRuntimeClientAttachmentRequest
    const remoteRuntimeClientAttachment = {
      accountId: "account-1",
      deviceTrustLevel: "trusted",
      gatewayRuntimeAttachmentId: "gateway-attachment-1",
      clientAttachmentId: "mobile-attachment-1",
      runtimeInstallationId: "runtime-1",
      status: "attached",
      trustedRuntimeClientId: "device-1",
    } satisfies RemoteRuntimeClientAttachment
    expect(gatewayAttachment.status).toBe("online")
    expect(remoteRuntimeClientRequest.protocolVersion).toBe(remoteRuntimeTransportProtocolVersion)
    expect(remoteRuntimeClientAttachment.status).toBe("attached")
  })

  test("builds canonical remote runtime signing payloads", () => {
    expect(
      createRemoteRuntimeCanonicalHttpSigningPayload({
        bodySha256: "body-sha",
        canonicalPath: "/mobile/chats",
        canonicalQuery: "b=2",
        idempotencyKey: "idem-1",
        keyId: "key-1",
        localRuntimeAccessTokenId: "lrt-1",
        method: "get",
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        nonce: "nonce-1",
        requestId: "request-1",
        runtimeInstallationId: "runtime-1",
        timestamp: "2026-05-14T00:00:00.000Z",
        trustedRuntimeClientId: "device-1",
      }),
    ).toEqual({
      algorithm: "ed25519",
      payload: [
        "interbase-remote-runtime-http-signature-v1",
        "method:GET",
        "path:/mobile/chats",
        "query:b=2",
        "bodySha256:body-sha",
        "remoteRuntimeHttpVersion:2026-05-14",
        "runtimeInstallationId:runtime-1",
        "trustedRuntimeClientId:device-1",
        "keyId:key-1",
        "requestId:request-1",
        "idempotencyKey:idem-1",
        "localRuntimeAccessTokenId:lrt-1",
        "timestamp:2026-05-14T00:00:00.000Z",
        "nonce:nonce-1",
      ].join("\n"),
    })
    expect(
      createRemoteRuntimeCanonicalHttpSigningPayload({
        bodySha256: "body-sha",
        canonicalPath: "/mobile/chats",
        canonicalQuery: "",
        idempotencyKey: null,
        keyId: "key-1",
        localRuntimeAccessTokenId: null,
        method: "post",
        remoteRuntimeHttpVersion: previousRemoteRuntimeHttpContractVersion,
        nonce: "nonce-1",
        requestId: null,
        runtimeInstallationId: "runtime-1",
        timestamp: "2026-05-14T00:00:00.000Z",
        trustedRuntimeClientId: "device-1",
      }).payload,
    ).toContain("requestId:\nidempotencyKey:\nlocalRuntimeAccessTokenId:")
    expect(
      createRemoteRuntimeCanonicalHttpResponseSigningPayload({
        bodySha256: "body-sha",
        canonicalPath: "/mobile/chats",
        canonicalQuery: "",
        keyId: "runtime-key-1",
        localRuntimeAccessTokenId: null,
        method: "get",
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        nonce: "nonce-1",
        requestId: null,
        runtimeInstallationId: "runtime-1",
        status: 200,
        timestamp: "2026-05-14T00:00:00.000Z",
        trustedRuntimeClientId: "device-1",
      }).payload,
    ).toBe(
      [
        "interbase-runtime-http-response-signature-v1",
        "method:GET",
        "path:/mobile/chats",
        "query:",
        "status:200",
        "bodySha256:body-sha",
        "remoteRuntimeHttpVersion:2026-05-14",
        "runtimeInstallationId:runtime-1",
        "trustedRuntimeClientId:device-1",
        "keyId:runtime-key-1",
        "requestId:",
        "localRuntimeAccessTokenId:",
        "timestamp:2026-05-14T00:00:00.000Z",
        "nonce:nonce-1",
      ].join("\n"),
    )
    expect(
      createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload({
        accountId: "account-1",
        canonicalPath: "/mobile/socket",
        canonicalQuery: "",
        keyId: "key-1",
        localRuntimeAccessTokenId: null,
        nonce: "nonce-1",
        requestId: null,
        runtimeInstallationId: "runtime-1",
        timestamp: "2026-05-14T00:00:00.000Z",
        trustedRuntimeClientId: "device-1",
        webSocketVersion: remoteRuntimeWebSocketContractVersion,
      }).payload,
    ).toContain("interbase-remote-runtime-websocket-upgrade-signature-v1\naccountId:account-1")
    expect(
      createRemoteRuntimeCanonicalWebSocketActionSigningPayload({
        keyId: "key-1",
        nonce: "nonce-1",
        payloadSha256: "payload-sha",
        requestId: null,
        runtimeInstallationId: "runtime-1",
        sequence: 7,
        sessionNonce: "session-nonce-1",
        timestamp: "2026-05-14T00:00:00.000Z",
        trustedRuntimeClientId: "device-1",
      }).payload,
    ).toBe(
      [
        "interbase-remote-runtime-websocket-action-signature-v1",
        "sessionNonce:session-nonce-1",
        "sequence:7",
        "runtimeInstallationId:runtime-1",
        "trustedRuntimeClientId:device-1",
        "payloadSha256:payload-sha",
        "keyId:key-1",
        "requestId:",
        "timestamp:2026-05-14T00:00:00.000Z",
        "nonce:nonce-1",
      ].join("\n"),
    )
  })

  test("builds remote runtime key possession proof payloads", () => {
    expect(
      createRemoteRuntimeKeyPossessionProofPayload({
        challengeId: "challenge-1",
        connectorVersion: "1.0.0",
        deviceName: "Riley's iPhone",
        keyId: "key-1",
        nonce: "nonce-1",
        publicKey: "serialized-key",
        purpose: "remoteRuntimeRequestSigning",
        runtimeInstallationId: "runtime-1",
        timestamp: "2026-05-14T00:00:00.000Z",
      }),
    ).toBe(
      [
        "interbase-remote-runtime-key-possession-v1",
        "challengeId:challenge-1",
        "connectorVersion:1.0.0",
        "deviceName:Riley's iPhone",
        "keyId:key-1",
        "nonce:nonce-1",
        "publicKey:serialized-key",
        "purpose:remoteRuntimeRequestSigning",
        "runtimeInstallationId:runtime-1",
        "timestamp:2026-05-14T00:00:00.000Z",
      ].join("\n"),
    )
    expect(
      createRemoteRuntimeKeyPossessionProofPayload({
        challengeId: null,
        connectorVersion: null,
        deviceName: null,
        keyId: "key-1",
        nonce: "nonce-1",
        publicKey: "serialized-key",
        purpose: "runtimeResponseSigning",
        runtimeInstallationId: null,
        timestamp: "2026-05-14T00:00:00.000Z",
      }),
    ).toContain("challengeId:\nconnectorVersion:\ndeviceName:")
    expect(
      createPreviousClientKeyPossessionProofPayload({
        challengeId: null,
        connectorVersion: null,
        deviceName: null,
        keyId: "key-1",
        nonce: "nonce-1",
        publicKey: "serialized-key",
        purpose: "runtimeResponseSigning",
        runtimeInstallationId: null,
        timestamp: "2026-05-14T00:00:00.000Z",
      }),
    ).toContain("interbase-client-key-possession-v1")
    expect(
      createRemoteRuntimeKeyPossessionProofAuthority({
        keyProof: {
          algorithm: "ed25519",
          keyId: "key-1",
          nonce: "nonce-1",
          signature: "signature-1",
          timestamp: "2026-05-14T00:00:00.000Z",
        },
        publicKey: "serialized-key",
      }),
    ).toMatchObject({
      keyProof: {
        keyId: "key-1",
      },
      publicKey: "serialized-key",
    })
  })

  test("owns remote runtime transport failure envelope mapping", () => {
    expect(remoteRuntimeTransportFailureCodeValues).toEqual([
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
    ])
    expect(remoteRuntimeTransportPairingActionValues).toEqual([
      "keep",
      "re_pair",
      "retry",
      "upgrade_app",
      "upgrade_cli",
    ])
    expect(createRuntimeUnavailableEnvelope("req-1")).toMatchObject({
      code: "RUNTIME_UNAVAILABLE",
      pairingAction: "keep",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "req-1",
      terminal: false,
      type: "runtime.unavailable",
    })
    expect(createAttachmentRevokedEnvelope("req-2")).toMatchObject({
      code: "ATTACHMENT_REVOKED",
      pairingAction: "re_pair",
      terminal: true,
      type: "attachment.revoked",
    })
    expect(createAuthorizationFailureEnvelope("req-3")).toMatchObject({ type: "authorization.failed" })
    expect(createIdempotencyConflictEnvelope("req-4")).toMatchObject({ type: "idempotency.conflict" })
    expect(createRuntimeCommandFailedEnvelope("req-5")).toMatchObject({ type: "runtime.command.failed" })
    expect(createRuntimeRevokedEnvelope("req-6")).toMatchObject({
      pairingAction: "re_pair",
      terminal: true,
      type: "pairing.invalid",
    })
    expect(createDeviceRevokedEnvelope("req-7")).toMatchObject({
      pairingAction: "re_pair",
      terminal: true,
      type: "pairing.invalid",
    })
    expect(
      createPairingSupersededEnvelope({
        replacementRuntimeInstallationId: "runtime-2",
        requestId: "req-8",
        runtimeInstallationId: "runtime-1",
      }),
    ).toMatchObject({
      pairingAction: "re_pair",
      replacementRuntimeInstallationId: "runtime-2",
      runtimeInstallationId: "runtime-1",
      terminal: true,
      type: "pairing.invalid",
    })
    expect(
      createRemoteRuntimeTransportFailureEnvelope({
        code: "PROTOCOL_MISMATCH",
        message: "Protocol mismatch.",
        requestId: "req-9",
      }),
    ).toMatchObject({ pairingAction: "upgrade_app", terminal: true, type: "protocol.mismatch" })
    expect(
      createRemoteRuntimeTransportFailureEnvelope({
        code: "PAYLOAD_TOO_LARGE",
        message: "Payload too large.",
        requestId: "req-10",
      }),
    ).toMatchObject({ pairingAction: "keep", terminal: false, type: "authorization.failed" })
  })

  test("builds runtime status frames and sequences attachment status", () => {
    const frame = createRuntimeStatusFrame({
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "0.1.0",
      gatewayRuntimeAttachmentId: "gra-1",
      replay: "unsupported",
      requestId: "status-1",
      runtimeApiVersion: "runtime-ws-1",
      sequence: 1,
      status: "online",
    })
    expect(frame).toEqual({
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "0.1.0",
      gatewayRuntimeAttachmentId: "gra-1",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      replay: "unsupported",
      requestId: "status-1",
      runtimeApiVersion: "runtime-ws-1",
      sequence: 1,
      status: "online",
      type: "runtime.status",
    })

    const sequencer = createAttachmentStatusSequencer()
    expect(sequencer.lastSequence("gra-1")).toBe(0)
    expect(sequencer.accept(frame)).toBe(true)
    expect(sequencer.accept({ ...frame, requestId: "status-3", sequence: 3 })).toBe(false)
    expect(sequencer.lastSequence("gra-1")).toBe(1)
    expect(sequencer.accept({ ...frame, requestId: "status-2", sequence: 2 })).toBe(true)
    expect(sequencer.lastSequence("gra-1")).toBe(2)
    expect(
      sequencer.accept({ ...frame, gatewayRuntimeAttachmentId: "gra-2", requestId: "status-other", sequence: 1 }),
    ).toBe(true)
    expect(sequencer.lastSequence("gra-2")).toBe(1)
  })

  test("accepts overlapping advertised versions", () => {
    expect(currentRemoteRuntimeAcceptedVersions()).toEqual({
      remoteRuntimeHttp: remoteRuntimeHttpContractVersion,
      remoteRuntimeTransport: remoteRuntimeTransportProtocolVersion,
      runtimeWebSocket: runtimeWebSocketRemoteRuntimeProtocolVersion,
    })
    expect(currentRemoteRuntimeSupportedVersions).toEqual({
      remoteRuntimeHttp: supportedRemoteRuntimeHttpContractVersions,
      remoteRuntimeTransport: supportedRemoteRuntimeTransportProtocolVersions,
      runtimeWebSocket: supportedRuntimeWebSocketRemoteRuntimeProtocolVersions,
    })
    expect(
      negotiateRemoteRuntimeVersions({
        received: {
          remoteRuntimeHttp: remoteRuntimeHttpContractVersion,
          remoteRuntimeTransport: remoteRuntimeTransportProtocolVersion,
          runtimeWebSocket: runtimeWebSocketRemoteRuntimeProtocolVersion,
        },
      }),
    ).toEqual({
      compatible: true,
      accepted: {
        remoteRuntimeHttp: remoteRuntimeHttpContractVersion,
        remoteRuntimeTransport: remoteRuntimeTransportProtocolVersion,
        runtimeWebSocket: runtimeWebSocketRemoteRuntimeProtocolVersion,
      },
    })
  })

  test("selects the newest runtime-supported version from client-advertised versions", () => {
    expect(
      negotiateAdvertisedRemoteRuntimeVersions({
        advertised: {
          remoteRuntimeHttp: ["1", "2"],
          remoteRuntimeTransport: ["1", "2"],
          runtimeWebSocket: ["1", "2"],
        },
        supported: {
          remoteRuntimeHttp: ["1", "2"],
          remoteRuntimeTransport: ["1", "2"],
          runtimeWebSocket: ["1", "2"],
        },
      }),
    ).toEqual({
      compatible: true,
      accepted: { remoteRuntimeHttp: "2", remoteRuntimeTransport: "2", runtimeWebSocket: "2" },
      advertised: {
        remoteRuntimeHttp: ["1", "2"],
        remoteRuntimeTransport: ["1", "2"],
        runtimeWebSocket: ["1", "2"],
      },
    })
  })

  test("accepts previous runtime websocket protocol during rollout window", () => {
    expect(
      negotiateAdvertisedRemoteRuntimeVersions({
        advertised: {
          remoteRuntimeHttp: [previousRemoteRuntimeHttpContractVersion],
          remoteRuntimeTransport: [remoteRuntimeTransportProtocolVersion],
          runtimeWebSocket: [previousRuntimeWebSocketRemoteRuntimeProtocolVersion],
        },
      }),
    ).toMatchObject({
      accepted: {
        runtimeWebSocket: previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
      },
      compatible: true,
    })
  })

  test("accepts new-client old-server rollout windows through advertised negotiation", () => {
    expect(
      negotiateAdvertisedRemoteRuntimeVersions({
        advertised: {
          remoteRuntimeHttp: [previousRemoteRuntimeHttpContractVersion, remoteRuntimeHttpContractVersion],
          remoteRuntimeTransport: [remoteRuntimeTransportProtocolVersion],
          runtimeWebSocket: [
            previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
            runtimeWebSocketRemoteRuntimeProtocolVersion,
          ],
        },
        supported: {
          remoteRuntimeHttp: [previousRemoteRuntimeHttpContractVersion],
          remoteRuntimeTransport: [remoteRuntimeTransportProtocolVersion],
          runtimeWebSocket: [previousRuntimeWebSocketRemoteRuntimeProtocolVersion],
        },
      }),
    ).toMatchObject({
      compatible: true,
      accepted: {
        remoteRuntimeHttp: previousRemoteRuntimeHttpContractVersion,
        remoteRuntimeTransport: remoteRuntimeTransportProtocolVersion,
        runtimeWebSocket: previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
      },
    })
  })

  test("rejects advertised versions with no complete overlap", () => {
    expect(
      negotiateAdvertisedRemoteRuntimeVersions({
        advertised: {
          remoteRuntimeHttp: ["1"],
          remoteRuntimeTransport: ["1"],
          runtimeWebSocket: ["0"],
        },
        supported: {
          remoteRuntimeHttp: ["1", "2"],
          remoteRuntimeTransport: ["1", "2"],
          runtimeWebSocket: ["1", "2"],
        },
      }),
    ).toEqual({
      compatible: false,
      advertised: {
        remoteRuntimeHttp: ["1"],
        remoteRuntimeTransport: ["1"],
        runtimeWebSocket: ["0"],
      },
      supported: {
        remoteRuntimeHttp: ["1", "2"],
        remoteRuntimeTransport: ["1", "2"],
        runtimeWebSocket: ["1", "2"],
      },
      remediation: "Update the remote runtime client or CLI/runtime so their remote runtime protocol versions overlap.",
    })
  })

  test("rejects missing and unsupported versions with remediation", () => {
    expect(
      negotiateRemoteRuntimeVersions({
        received: { remoteRuntimeHttp: "2", remoteRuntimeTransport: "1" },
        supported: currentRemoteRuntimeSupportedVersions,
      }),
    ).toEqual({
      compatible: false,
      received: { remoteRuntimeHttp: "2", remoteRuntimeTransport: "1", runtimeWebSocket: undefined },
      supported: currentRemoteRuntimeSupportedVersions,
      remediation: "Update the remote runtime client or CLI/runtime so their remote runtime protocol versions overlap.",
    })
  })
})
