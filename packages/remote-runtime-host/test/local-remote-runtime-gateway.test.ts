import { describe, expect, test } from "bun:test"
import {
  createRemoteRuntimeCanonicalHttpSigningPayload,
  createRemoteRuntimeCanonicalWebSocketActionSigningPayload,
  createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload,
  remoteRuntimeHttpRequestBodySha256HeaderName,
  remoteRuntimeHttpRequestSignatureAlgorithmHeaderName,
  remoteRuntimeHttpRequestSignatureHeaderName,
  remoteRuntimeHttpRequestSignatureNonceHeaderName,
  remoteRuntimeHttpRequestSignatureTimestampHeaderName,
  remoteRuntimeHttpRequestSigningKeyIdHeaderName,
  remoteRuntimeHttpContractVersion,
  remoteRuntimeHttpResponseBodySha256HeaderName,
  remoteRuntimeHttpResponseSignatureHeaderName,
  remoteRuntimeHttpResponseSigningKeyIdHeaderName,
  remoteRuntimeHttpVersionHeaderName,
  remoteRuntimeTransportProtocolVersion,
  remoteRuntimeWebSocketContractVersion,
  remoteRuntimeWebSocketVersionHeaderName,
  serializeRemoteRuntimeAsymmetricPublicKey,
  type RemoteRuntimeAsymmetricPublicKey,
  type RemoteRuntimeCanonicalHttpSigningPayloadInput,
  type RemoteRuntimeCanonicalWebSocketActionSigningPayloadInput,
  type RemoteRuntimeCanonicalWebSocketUpgradeSigningPayloadInput,
  type RemoteRuntimeRequestSignatureProof,
} from "@interbase/remote-runtime-contracts"
import type { RemoteRuntimeNonceReplayStore } from "../src/index.js"
import {
  createInMemoryRemoteRuntimeNonceReplayStore,
  createInMemoryLocalRemoteRuntimeCommandIdempotencyStore,
  createLocalRemoteRuntimeInvalidWebSocketJsonActionEnvelope,
  createLocalRemoteRuntimeCommandFingerprint,
  createLocalRemoteRuntimeJsonResponse,
  dispatchLocalRemoteRuntimeHttpRequest,
  dispatchLocalRemoteRuntimeReadSnapshotRequest,
  isLocalRemoteRuntimeGatewayPath,
  isUnsignedRemoteRuntimeHostReadRequest,
  isSignedLocalRemoteRuntimeGatewayRequest,
  localRemoteRuntimeCommandBodyAuthority,
  localRemoteRuntimeCommandBodyJson,
  localRemoteRuntimeReadSnapshotCanonicalPath,
  localRemoteRuntimeInstallationIdFromQuery,
  localRemoteRuntimeRequestIdHeaderName,
  localRuntimeAccessTokenHeaderName,
  localRuntimeAccessTokenIdHeaderName,
  normalizeLocalRemoteRuntimeGatewayTrustedDeviceAuthorities,
  normalizeInstallationSelector,
  parseLocalRemoteRuntimeWebSocketUpgradeAuthority,
  parseRemoteRuntimeDirectorySelectorQuery,
  parseRemoteRuntimeEncryptionRequest,
  parseRemoteRuntimeGitStatusQuery,
  parseRemoteRuntimeHostStopRequest,
  parseRemoteRuntimeInstallationSelectorQuery,
  parseRemoteRuntimePageQuery,
  parseRemoteRuntimeProjectionSelectorQuery,
  parseRemoteRuntimeSelectorQuery,
  parseRemoteRuntimeSendMessageRequest,
  parseRemoteRuntimeStartChatRequest,
  parseRemoteRuntimeStartRequest,
  parseRemoteRuntimeStopRequest,
  parseRemoteRuntimeStopSelectorQuery,
  parseRemoteRuntimeStatusSelectorQuery,
  parseRemoteRuntimeUpdateChatRequest,
  prepareLocalRemoteRuntimeHttpAdmission,
  prepareLocalRemoteRuntimeReadSnapshotAdmission,
  prepareLocalRemoteRuntimeWebSocketAdmission,
  resolveLocalRemoteRuntimeGatewayAuthority,
  runLocalRemoteRuntimeCommandWithIdempotency,
  runValidatedLocalRemoteRuntimeCommandRequest,
  validateLocalRemoteRuntimeWebSocketAction,
  type LocalRemoteRuntimeGatewayDiagnostic,
  type LocalRemoteRuntimeHttpAdmissionInput,
} from "@interbase/remote-runtime-host/local-remote-runtime-gateway"

describe("local remote runtime gateway admission", () => {
  test("resolves local gateway authority from active state or environment", () => {
    const mobilePublicKey = serializeRemoteRuntimeAsymmetricPublicKey({
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "mk_mobile_1",
      publicKey: "AbCdEf0123_-",
      purpose: "remoteRuntimeRequestSigning",
    })
    const secondMobilePublicKey = serializeRemoteRuntimeAsymmetricPublicKey({
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "mk_mobile_2",
      publicKey: "BcDeFg1234_-",
      purpose: "remoteRuntimeRequestSigning",
    })
    const runtimePublicKey = serializeRemoteRuntimeAsymmetricPublicKey({
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "mk_runtime_1",
      publicKey: "CdEfGh2345_-",
      purpose: "runtimeResponseSigning",
    })
    const trustedRuntimeClientAuthorities = normalizeLocalRemoteRuntimeGatewayTrustedDeviceAuthorities({
      trustedRuntimeClientAuthorities: [
        { publicKey: " ", trustedRuntimeClientId: "blank_public_key" },
        { publicKey: runtimePublicKey, trustedRuntimeClientId: "runtime_key_filtered" },
        { publicKey: secondMobilePublicKey, trustedRuntimeClientId: "tmd_2" },
        { publicKey: "duplicate_ignored", trustedRuntimeClientId: "tmd_2" },
      ],
      trustedRuntimeClientId: "tmd_1",
      trustedRuntimeClientPublicKey: mobilePublicKey,
    })
    expect(trustedRuntimeClientAuthorities).toEqual([
      { publicKeyText: runtimePublicKey, trustedRuntimeClientId: "runtime_key_filtered" },
      { publicKeyText: secondMobilePublicKey, trustedRuntimeClientId: "tmd_2" },
      { publicKeyText: mobilePublicKey, trustedRuntimeClientId: "tmd_1" },
    ])

    const activeAuthority = {
      expectedLocalRuntimeAccessToken: " lrt_secret_1 ",
      localRuntimeAccessTokenId: " lrtid_1 ",
      runtimeInstallationId: " rti_1 ",
      runtimeResponseSigningPrivateKey: {
        algorithm: "ed25519" as const,
        encoding: "pkcs8-base64url" as const,
        keyId: "mk_runtime_private_1",
        privateKey: "private_key_1",
        purpose: "runtimeResponseSigning" as const,
      },
      trustedRuntimeClientAuthorities: trustedRuntimeClientAuthorities,
    }
    expect(
      resolveLocalRemoteRuntimeGatewayAuthority({
        activeAuthority,
        requestSigningKeyId: "mk_mobile_1",
      }),
    ).toMatchObject({
      expectedLocalRuntimeAccessToken: "lrt_secret_1",
      localRuntimeAccessTokenId: "lrtid_1",
      publicKey: { keyId: "mk_mobile_1", purpose: "remoteRuntimeRequestSigning" },
      runtimeInstallationId: "rti_1",
      runtimeResponseSigningPrivateKey: { keyId: "mk_runtime_private_1" },
      trustedRuntimeClientId: "tmd_1",
    })
    expect(resolveLocalRemoteRuntimeGatewayAuthority({ activeAuthority })).toBeUndefined()
    expect(
      resolveLocalRemoteRuntimeGatewayAuthority({
        activeAuthority,
        requestSigningKeyId: "mk_missing",
      }),
    ).toBeUndefined()
    expect(resolveLocalRemoteRuntimeGatewayAuthority({ environment: {} })).toBeUndefined()
    expect(
      resolveLocalRemoteRuntimeGatewayAuthority({
        environment: {
          INTERBASE_RUNTIME_CLIENT_LOCAL_RUNTIME_ACCESS_TOKEN: " env_secret ",
          INTERBASE_RUNTIME_CLIENT_LOCAL_RUNTIME_ACCESS_TOKEN_ID: " env_lrtid ",
          INTERBASE_RUNTIME_CLIENT_RUNTIME_INSTALLATION_ID: " env_rti ",
          INTERBASE_RUNTIME_CLIENT_TRUSTED_CLIENT_ID: " env_tmd ",
          INTERBASE_RUNTIME_CLIENT_TRUSTED_CLIENT_PUBLIC_KEY: mobilePublicKey,
        },
      }),
    ).toMatchObject({
      expectedLocalRuntimeAccessToken: "env_secret",
      localRuntimeAccessTokenId: "env_lrtid",
      publicKey: { keyId: "mk_mobile_1" },
      runtimeInstallationId: "env_rti",
      trustedRuntimeClientId: "env_tmd",
    })
  })

  test("creates signed local remote runtime JSON responses through package authority", async () => {
    const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
    const publicKey: RemoteRuntimeAsymmetricPublicKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "mk_mobile_1",
      publicKey: Buffer.from(await crypto.subtle.exportKey("raw", keyPair.publicKey)).toString("base64url"),
      purpose: "remoteRuntimeRequestSigning",
    }
    const response = await createLocalRemoteRuntimeJsonResponse({
      authority: {
        expectedLocalRuntimeAccessToken: "lrt_secret_1",
        localRuntimeAccessTokenId: "lrtid_1",
        publicKey,
        runtimeInstallationId: "rti_1",
        runtimeResponseSigningPrivateKey: {
          algorithm: "ed25519",
          encoding: "pkcs8-base64url",
          keyId: "mk_runtime_1",
          privateKey: Buffer.from(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)).toString("base64url"),
          purpose: "runtimeResponseSigning",
        },
        trustedRuntimeClientId: "tmd_1",
      },
      body: { accepted: true },
      now: () => "2026-05-14T00:00:00.000Z",
      randomUUID: () => "uuid_1",
      request: {
        canonicalPath: "/remote-runtime/chats",
        canonicalQuery: "runtimeInstallationId=rti_1",
        localRuntimeAccessTokenId: "lrtid_1",
        method: "GET",
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        requestId: "req_1",
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_1",
      },
      status: 202,
    })
    expect(response.bodyText).toBe(JSON.stringify({ accepted: true }))
    expect(response.status).toBe(202)
    expect(response.headers[remoteRuntimeHttpVersionHeaderName]).toBe(remoteRuntimeHttpContractVersion)
    expect(response.headers[remoteRuntimeHttpResponseBodySha256HeaderName]).toBeTruthy()
    expect(response.headers[remoteRuntimeHttpResponseSignatureHeaderName]).toBeTruthy()
    expect(response.headers[remoteRuntimeHttpResponseSigningKeyIdHeaderName]).toBe("mk_runtime_1")

    const unsigned = await createLocalRemoteRuntimeJsonResponse({
      authority: {
        expectedLocalRuntimeAccessToken: "lrt_secret_1",
        localRuntimeAccessTokenId: "lrtid_1",
        publicKey,
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_1",
      },
      body: { ok: true },
      now: () => {
        throw new Error("unsigned responses should not request signing time")
      },
      randomUUID: () => {
        throw new Error("unsigned responses should not request nonce uuid")
      },
      request: {
        canonicalPath: "/remote-runtime/chats",
        canonicalQuery: "",
        localRuntimeAccessTokenId: "lrtid_1",
        method: "GET",
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        requestId: "req_1",
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_1",
      },
      status: 200,
    })
    expect(unsigned.headers[remoteRuntimeHttpResponseSignatureHeaderName]).toBeUndefined()
    expect(unsigned.bodyText).toBe(JSON.stringify({ ok: true }))
  })

  test("classifies signed local remote runtime gateway requests by package-owned path policy", () => {
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/remote-runtime/socket")).toBe(true)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/remote-runtime/chats/ses_1/messages")).toBe(true)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/remote-runtime/git/status")).toBe(true)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/remote-runtime/goals")).toBe(true)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/remote-runtime/aliases")).toBe(true)
    expect(isLocalRemoteRuntimeGatewayPath("POST", "/global/remote-runtime/chats/ses_1/messages")).toBe(true)
    expect(isLocalRemoteRuntimeGatewayPath("PATCH", "/global/remote-runtime/chats/ses_1")).toBe(true)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/mobile/socket")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/mobile/chats/ses_1/messages")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/mobile/runtime/status")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/mobile/runtime/directories")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/mobile/runtime/capabilities")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/mobile/chats")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/mobile/chats/ses_1")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/mobile/providers")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("POST", "/global/mobile/chats")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("POST", "/global/mobile/chats/ses_1/messages")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("PATCH", "/global/mobile/chats/ses_1")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("PUT", "/global/mobile/chats/ses_1")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("DELETE", "/global/mobile/chats/ses_1")).toBe(false)
    expect(isLocalRemoteRuntimeGatewayPath("GET", "/global/config")).toBe(false)

    expect(
      isSignedLocalRemoteRuntimeGatewayRequest({
        headers: new Headers([
          [remoteRuntimeHttpRequestSignatureHeaderName, "sig_1"],
          [remoteRuntimeHttpVersionHeaderName, remoteRuntimeHttpContractVersion],
        ]),
        method: "POST",
        path: "/global/remote-runtime/chats",
      }),
    ).toBe(true)
    expect(
      isSignedLocalRemoteRuntimeGatewayRequest({
        headers: new Headers([[remoteRuntimeHttpVersionHeaderName, remoteRuntimeHttpContractVersion]]),
        method: "POST",
        path: "/global/remote-runtime/chats",
      }),
    ).toBe(false)
    expect(
      isSignedLocalRemoteRuntimeGatewayRequest({
        headers: new Headers([
          [remoteRuntimeHttpRequestSignatureHeaderName, "sig_1"],
          [remoteRuntimeHttpVersionHeaderName, remoteRuntimeHttpContractVersion],
        ]),
        method: "GET",
        path: "/global/remote-runtime/socket",
      }),
    ).toBe(false)
    expect(
      isSignedLocalRemoteRuntimeGatewayRequest({
        headers: new Headers([
          [remoteRuntimeHttpRequestSignatureHeaderName, "sig_1"],
          [remoteRuntimeWebSocketVersionHeaderName, remoteRuntimeWebSocketContractVersion],
        ]),
        method: "GET",
        path: "/global/remote-runtime/socket",
      }),
    ).toBe(true)
    expect(
      isSignedLocalRemoteRuntimeGatewayRequest({
        headers: new Headers([
          [remoteRuntimeHttpRequestSignatureHeaderName, "sig_1"],
          [remoteRuntimeWebSocketVersionHeaderName, remoteRuntimeWebSocketContractVersion],
        ]),
        method: "GET",
        path: "/global/mobile/socket",
      }),
    ).toBe(false)

    expect(isUnsignedRemoteRuntimeHostReadRequest({ headers: new Headers() })).toBe(true)
    expect(
      isUnsignedRemoteRuntimeHostReadRequest({
        headers: new Headers([[remoteRuntimeHttpVersionHeaderName, remoteRuntimeHttpContractVersion]]),
      }),
    ).toBe(false)
    expect(localRemoteRuntimeReadSnapshotCanonicalPath({ kind: "chatMessages", sessionId: "ses 1" })).toBe(
      "/remote-runtime/chats/ses%201/messages",
    )
    const socketQuery = [
      { name: "runtimeInstallationId", value: " rti_1 " },
      { name: "accountId", value: " acct_1 " },
      { name: "trustedRuntimeClientId", value: " tmd_1 " },
    ]
    expect(localRemoteRuntimeInstallationIdFromQuery(socketQuery)).toBe("rti_1")
    expect(
      parseLocalRemoteRuntimeWebSocketUpgradeAuthority({
        expectedTrustedRuntimeClientId: "tmd_1",
        query: socketQuery,
      }),
    ).toEqual({
      accountId: "acct_1",
      runtimeInstallationId: "rti_1",
      trustedRuntimeClientId: "tmd_1",
    })
    expect(localRemoteRuntimeInstallationIdFromQuery([{ name: "runtimeInstallationId", value: " " }])).toBeUndefined()
    expect(() =>
      parseLocalRemoteRuntimeWebSocketUpgradeAuthority({
        expectedTrustedRuntimeClientId: "tmd_other",
        query: socketQuery,
      }),
    ).toThrow("WebSocket authority")
    expect(createLocalRemoteRuntimeInvalidWebSocketJsonActionEnvelope()).toEqual({
      code: "VALIDATION_FAILED",
      message: "Remote runtime WebSocket action must be valid JSON.",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "unknown",
      type: "authorization.failed",
    })
  })

  test("parses remote runtime route inputs through public validators", () => {
    const publicKey = serializeRemoteRuntimeAsymmetricPublicKey({
      algorithm: "ed25519",
      createdAt: "2026-05-14T00:00:00.000Z",
      encoding: "base64url",
      keyId: "mk_route_1",
      publicKey: "AbCdEf0123_-",
      purpose: "remoteRuntimeRequestSigning",
    })
    const start = parseRemoteRuntimeStartRequest({
      accountId: "acct_1",
      apiBaseUrl: "https://api.example.test",
      allowedDirectories: [
        { directoryId: "dir_1", displayName: "repo", path: "/repo" },
        { directoryId: "dir_2", path: "/other" },
      ],
      authorizationToken: "token_1",
      directory: "/repo",
      directoryId: "dir_1",
      localGatewayAuthority: {
        expectedLocalRuntimeAccessToken: "lrt_1",
        localRuntimeAccessTokenId: "lrtid_1",
        runtimeResponseSigningPrivateKey: {
          algorithm: "ed25519",
          encoding: "pkcs8-base64url",
          keyId: "mk_runtime_1",
          privateKey: "private_1",
          purpose: "runtimeResponseSigning",
        },
        trustedRuntimeClientAuthorities: [{ publicKey, trustedRuntimeClientId: "tmd_1" }],
        trustedRuntimeClientId: "tmd_2",
        trustedRuntimeClientPublicKey: publicKey,
      },
      pollIntervalMs: 250,
      runtimeEncryptionKey: { keyBase64: "a2V5", keyId: "enc_1" },
      runtimeInstallationId: "rti_1",
    })
    expect(start).toMatchObject({
      accountId: "acct_1",
      allowedDirectories: [
        { directoryId: "dir_1", displayName: "repo", path: "/repo" },
        { directoryId: "dir_2", path: "/other" },
      ],
      localGatewayAuthority: {
        runtimeInstallationId: "rti_1",
        runtimeResponseSigningPrivateKey: { keyId: "mk_runtime_1" },
      },
      runtimeEncryptionKey: { keyId: "enc_1" },
    })
    expect(start.localGatewayAuthority?.trustedRuntimeClientAuthorities).toEqual([
      { publicKeyText: publicKey, trustedRuntimeClientId: "tmd_1" },
      { publicKeyText: publicKey, trustedRuntimeClientId: "tmd_2" },
    ])
    expect(parseRemoteRuntimeSelectorQuery({ directory: "/repo", directoryId: "dir_1" })).toEqual({
      directory: "/repo",
      directoryId: "dir_1",
    })
    expect(parseRemoteRuntimeInstallationSelectorQuery({ runtimeInstallationId: "rti_1" })).toEqual({
      runtimeInstallationId: "rti_1",
    })
    expect(parseRemoteRuntimeDirectorySelectorQuery({ directory: "/repo", runtimeInstallationId: "rti_1" })).toEqual({
      directory: "/repo",
      runtimeInstallationId: "rti_1",
    })
    expect(parseRemoteRuntimeProjectionSelectorQuery({ directoryId: "dir_1" })).toEqual({ directoryId: "dir_1" })
    expect(parseRemoteRuntimeStatusSelectorQuery({ all: "true" })).toEqual({ all: true })
    expect(parseRemoteRuntimeStatusSelectorQuery({ runtimeInstallationId: "rti_1" })).toEqual({
      runtimeInstallationId: "rti_1",
    })
    expect(parseRemoteRuntimeStopSelectorQuery({ all: true })).toEqual({ all: true })
    expect(parseRemoteRuntimeStopSelectorQuery({ directory: "/repo" })).toEqual({ directory: "/repo" })
    expect(parseRemoteRuntimePageQuery({ cursor: "cur_1", limit: "25", runtimeInstallationId: "rti_1" })).toEqual({
      cursor: "cur_1",
      limit: 25,
      runtimeInstallationId: "rti_1",
    })
    expect(parseRemoteRuntimeGitStatusQuery({ directoryId: "dir_1", includeDiff: "true", maxDiffBytes: "1024" })).toEqual({
      directoryId: "dir_1",
      includeDiff: true,
      maxDiffBytes: 1024,
    })
    expect(parseRemoteRuntimeGitStatusQuery({ runtimeInstallationId: "rti_1" })).toEqual({
      includeDiff: false,
      maxDiffBytes: 262144,
      runtimeInstallationId: "rti_1",
    })
    expect(parseRemoteRuntimeEncryptionRequest({ runtimeInstallationId: "rti_1", setupToken: "setup_1" })).toEqual({
      runtimeInstallationId: "rti_1",
      setupToken: "setup_1",
    })
    expect(parseRemoteRuntimeStopRequest(undefined)).toEqual({ all: true })
    expect(parseRemoteRuntimeHostStopRequest({ expectedPid: 123 })).toEqual({ expectedPid: 123 })
    expect(
      parseRemoteRuntimeStartChatRequest({
        directoryId: "dir_1",
        idempotencyKey: "idem_1",
        model: null,
        requestId: "req_1",
        title: "New chat",
      }),
    ).toMatchObject({ directoryId: "dir_1", model: null, title: "New chat" })
    expect(
      parseRemoteRuntimeSendMessageRequest({
        directoryId: "dir_1",
        idempotencyKey: "idem_2",
        input: { content: "hello", mode: "default" },
        requestId: "req_2",
        sessionId: "ses_1",
      }),
    ).toMatchObject({ input: { content: "hello", mode: "default" }, sessionId: "ses_1" })
    expect(
      parseRemoteRuntimeUpdateChatRequest({
        directoryId: "dir_1",
        idempotencyKey: "idem_3",
        input: { model: "sonnet", providerId: "anthropic" },
        requestId: "req_3",
        sessionId: "ses_1",
      }),
    ).toMatchObject({ input: { model: "sonnet", providerId: "anthropic" } })
    expect(() => parseRemoteRuntimeStartRequest({})).toThrow("accountId")
    expect(() => normalizeInstallationSelector({})).toThrow("installation selector")
    expect(() => parseRemoteRuntimeDirectorySelectorQuery({ runtimeInstallationId: "rti_1" })).toThrow(
      "directory selector",
    )
    expect(() => parseRemoteRuntimeProjectionSelectorQuery({ directory: "/repo", directoryId: "dir_1" })).toThrow(
      "cannot include both",
    )
    expect(() => parseRemoteRuntimeStatusSelectorQuery({ all: true, runtimeInstallationId: "rti_1" })).toThrow(
      "all selector",
    )
    expect(() => parseRemoteRuntimeStopSelectorQuery({ all: true, directoryId: "dir_1" })).toThrow("all selector")
    expect(() =>
      parseRemoteRuntimeStartRequest({
        accountId: "acct_1",
        apiBaseUrl: "not a url",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        runtimeInstallationId: "rti_1",
      }),
    ).toThrow("apiBaseUrl")
    expect(() => parseRemoteRuntimeSelectorQuery(null)).toThrow("Remote runtime selector is invalid.")
    expect(() => parseRemoteRuntimeSelectorQuery({ directory: "" })).toThrow("directory")
    expect(() =>
      parseRemoteRuntimeStartChatRequest({
        directoryId: "dir_1",
        idempotencyKey: "idem_1",
        model: "",
        requestId: "req_1",
      }),
    ).toThrow("model")
    expect(() =>
      parseRemoteRuntimeStartRequest({
        accountId: "acct_1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        pollIntervalMs: "250",
        runtimeInstallationId: "rti_1",
      }),
    ).toThrow("pollIntervalMs")
    expect(() =>
      parseRemoteRuntimeStartRequest({
        accountId: "acct_1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        localGatewayAuthority: {
          expectedLocalRuntimeAccessToken: "lrt_1",
          localRuntimeAccessTokenId: "lrtid_1",
          runtimeResponseSigningPrivateKey: {
            algorithm: "rsa",
            encoding: "pkcs8-base64url",
            keyId: "mk_runtime_1",
            privateKey: "private_1",
            purpose: "runtimeResponseSigning",
          },
          trustedRuntimeClientAuthorities: [],
          trustedRuntimeClientId: "tmd_2",
          trustedRuntimeClientPublicKey: publicKey,
        },
        runtimeInstallationId: "rti_1",
      }),
    ).toThrow("algorithm")
    expect(() =>
      parseRemoteRuntimeStartRequest({
        accountId: "acct_1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        localGatewayAuthority: {
          expectedLocalRuntimeAccessToken: "lrt_1",
          localRuntimeAccessTokenId: "lrtid_1",
          trustedRuntimeClientAuthorities: "not-array",
          trustedRuntimeClientId: "tmd_2",
          trustedRuntimeClientPublicKey: publicKey,
        },
        runtimeInstallationId: "rti_1",
      }),
    ).toThrow("trusted device")
    expect(() => parseRemoteRuntimePageQuery({ limit: "0", runtimeInstallationId: "rti_1" })).toThrow("limit")
    expect(() => parseRemoteRuntimeGitStatusQuery({ includeDiff: "yes" })).toThrow("includeDiff")
    expect(() => parseRemoteRuntimeGitStatusQuery({ maxDiffBytes: "0" })).toThrow("maxDiffBytes")
    expect(() => parseRemoteRuntimeGitStatusQuery({ maxDiffBytes: "1048577" })).toThrow(
      "Remote runtime git status input is invalid.",
    )
    expect(() =>
      parseRemoteRuntimeSendMessageRequest({
        idempotencyKey: "idem_bad",
        input: { content: "hello", mode: "fast" },
        requestId: "req_bad",
        sessionId: "ses_bad",
      }),
    ).toThrow("mode")
  })

  test("dispatches only after version, token, signature, and nonce admission", async () => {
    const signed = await signedAdmissionInput()
    let dispatches = 0
    const accepted = await dispatchLocalRemoteRuntimeHttpRequest(signed.input, () => {
      dispatches += 1
      return { activeChats: [] }
    })
    const replay = await dispatchLocalRemoteRuntimeHttpRequest(signed.input, () => {
      dispatches += 1
      return { activeChats: [] }
    })
    const badToken = await dispatchLocalRemoteRuntimeHttpRequest(
      {
        ...signed.input,
        localRuntimeAccessToken: "copied_token",
        nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      },
      () => {
        dispatches += 1
        return { activeChats: [] }
      },
    )
    const badTokenId = await dispatchLocalRemoteRuntimeHttpRequest(
      {
        ...signed.input,
        localRuntimeAccessTokenId: "copied_token_id",
        nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      },
      () => {
        dispatches += 1
        return { activeChats: [] }
      },
    )
    const badPath = await dispatchLocalRemoteRuntimeHttpRequest(
      {
        ...signed.input,
        canonicalPath: "/remote-runtime/providers",
        nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      },
      () => {
        dispatches += 1
        return { activeChats: [] }
      },
    )
    const missingVersion = await dispatchLocalRemoteRuntimeHttpRequest(
      {
        ...signed.input,
        remoteRuntimeHttpVersion: null,
        nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      },
      () => {
        dispatches += 1
        return { activeChats: [] }
      },
    )
    const tokenReplayStore = createInMemoryRemoteRuntimeNonceReplayStore()
    const badTokenConsumesNonce = await dispatchLocalRemoteRuntimeHttpRequest(
      {
        ...signed.input,
        localRuntimeAccessToken: "copied_token",
        nonceStore: tokenReplayStore,
      },
      () => {
        dispatches += 1
        return { activeChats: [] }
      },
    )
    const replayAfterBadToken = await dispatchLocalRemoteRuntimeHttpRequest(
      {
        ...signed.input,
        nonceStore: tokenReplayStore,
      },
      () => {
        dispatches += 1
        return { activeChats: [] }
      },
    )

    expect(accepted.ok).toBe(true)
    expect(replay.ok).toBe(false)
    expect(badToken.ok).toBe(false)
    expect(badTokenId.ok).toBe(false)
    expect(badPath.ok).toBe(false)
    expect(missingVersion.ok).toBe(false)
    expect(badTokenConsumesNonce.ok).toBe(false)
    expect(replayAfterBadToken.ok).toBe(false)
    expect(dispatches).toBe(1)
  })

  test("read snapshot dispatcher binds signed requests to exact route metadata", async () => {
    const signed = await signedAdmissionInput()
    let dispatches = 0
    const accepted = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      {
        ...signed.input,
        route: { kind: "activeChats" },
      },
      () => {
        dispatches += 1
        return { activeChats: [] }
      },
    )
    const wrongRoute = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      {
        ...signed.input,
        nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
        route: { kind: "providers" },
      },
      () => {
        dispatches += 1
        return { providers: [] }
      },
    )
    const wrongMethod = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      {
        ...signed.input,
        method: "POST",
        nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
        route: { kind: "activeChats" },
      },
      () => {
        dispatches += 1
        return { activeChats: [] }
      },
    )

    expect(accepted.ok).toBe(true)
    expect(wrongRoute.ok).toBe(false)
    expect(wrongMethod.ok).toBe(false)
    expect(dispatches).toBe(1)
  })

  test("read snapshot dispatcher admits runtime status, capabilities, goals, and aliases route metadata", async () => {
    const status = await signedAdmissionInput({ canonicalPath: "/remote-runtime/runtime/status" })
    const capabilities = await signedAdmissionInput({
      canonicalPath: "/remote-runtime/runtime/capabilities",
      nonce: "nonce_2",
    })
    const goals = await signedAdmissionInput({ canonicalPath: "/remote-runtime/goals", nonce: "nonce_goals" })
    const gitStatus = await signedAdmissionInput({ canonicalPath: "/remote-runtime/git/status", nonce: "nonce_git" })
    const aliases = await signedAdmissionInput({ canonicalPath: "/remote-runtime/aliases", nonce: "nonce_aliases" })
    let dispatches = 0
    const statusResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      {
        ...status.input,
        route: { kind: "runtimeStatus" },
      },
      () => {
        dispatches += 1
        return { state: "online" }
      },
    )
    const capabilitiesResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      {
        ...capabilities.input,
        route: { kind: "runtimeCapabilities" },
      },
      () => {
        dispatches += 1
        return { attachmentCapabilities: [], featureCapabilities: [], supportedMethods: [] }
      },
    )
    const goalsResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      {
        ...goals.input,
        route: { kind: "goals" },
      },
      () => {
        dispatches += 1
        return {
          goals: [],
          remoteRuntimeHttpVersion: "2026-05-14",
          resourceVersion: null,
          runtimeInstallationId: "runtime_1",
        }
      },
    )
    const gitStatusResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      {
        ...gitStatus.input,
        route: { kind: "gitStatus" },
      },
      () => {
        dispatches += 1
        return {
          remoteRuntimeHttpVersion: "2026-05-14",
          repositories: [],
          resourceVersion: null,
          runtimeInstallationId: "runtime_1",
        }
      },
    )
    const aliasesResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      {
        ...aliases.input,
        route: { kind: "aliases" },
      },
      () => {
        dispatches += 1
        return {
          aliases: [],
          remoteRuntimeHttpVersion: "2026-05-14",
          resourceVersion: null,
          runtimeInstallationId: "runtime_1",
        }
      },
    )

    expect(statusResult.ok).toBe(true)
    expect(capabilitiesResult.ok).toBe(true)
    expect(goalsResult.ok).toBe(true)
    expect(gitStatusResult.ok).toBe(true)
    expect(aliasesResult.ok).toBe(true)
    expect(dispatches).toBe(5)
  })

  test("read snapshot dispatcher admits chat, messages, provider, and runtime directory route metadata", async () => {
    const chat = await signedAdmissionInput({ canonicalPath: "/remote-runtime/chats/ses_1", nonce: "nonce_chat" })
    const messages = await signedAdmissionInput({
      canonicalPath: "/remote-runtime/chats/ses_1/messages",
      nonce: "nonce_messages",
    })
    const providers = await signedAdmissionInput({
      canonicalPath: "/remote-runtime/providers",
      nonce: "nonce_providers",
    })
    const directories = await signedAdmissionInput({
      canonicalPath: "/remote-runtime/runtime/directories",
      nonce: "nonce_directories",
    })
    let dispatches = 0

    const chatResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      { ...chat.input, route: { kind: "chat", sessionId: "ses_1" } },
      () => {
        dispatches += 1
        return { chat: { sessionId: "ses_1" } }
      },
    )
    const messagesResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      { ...messages.input, route: { kind: "chatMessages", sessionId: "ses_1" } },
      () => {
        dispatches += 1
        return { messages: [] }
      },
    )
    const providersResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      { ...providers.input, route: { kind: "providers" } },
      () => {
        dispatches += 1
        return { providers: [] }
      },
    )
    const directoriesResult = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
      { ...directories.input, route: { kind: "runtimeDirectories" } },
      () => {
        dispatches += 1
        return { allowedDirectories: [] }
      },
    )

    expect(chatResult.ok).toBe(true)
    expect(messagesResult.ok).toBe(true)
    expect(providersResult.ok).toBe(true)
    expect(directoriesResult.ok).toBe(true)
    expect(dispatches).toBe(4)
  })

  test("read snapshot dispatcher rejects legacy mobile route paths at the boundary", async () => {
    const activeChats = await signedAdmissionInput({ canonicalPath: "/mobile/chats", nonce: "legacy_active" })
    const chat = await signedAdmissionInput({ canonicalPath: "/mobile/chats/ses_1", nonce: "legacy_chat" })
    const messages = await signedAdmissionInput({
      canonicalPath: "/mobile/chats/ses_1/messages",
      nonce: "legacy_messages",
    })
    const providers = await signedAdmissionInput({ canonicalPath: "/mobile/providers", nonce: "legacy_providers" })
    const capabilities = await signedAdmissionInput({
      canonicalPath: "/mobile/runtime/capabilities",
      nonce: "legacy_capabilities",
    })
    const directories = await signedAdmissionInput({
      canonicalPath: "/mobile/runtime/directories",
      nonce: "legacy_directories",
    })
    const status = await signedAdmissionInput({ canonicalPath: "/mobile/runtime/status", nonce: "legacy_status" })
    const inputs = [
      { input: activeChats.input, route: { kind: "activeChats" } as const },
      { input: chat.input, route: { kind: "chat", sessionId: "ses_1" } as const },
      { input: messages.input, route: { kind: "chatMessages", sessionId: "ses_1" } as const },
      { input: providers.input, route: { kind: "providers" } as const },
      { input: capabilities.input, route: { kind: "runtimeCapabilities" } as const },
      { input: directories.input, route: { kind: "runtimeDirectories" } as const },
      { input: status.input, route: { kind: "runtimeStatus" } as const },
    ]

    for (const entry of inputs) {
      const result = await dispatchLocalRemoteRuntimeReadSnapshotRequest(
        { ...entry.input, route: entry.route },
        () => ({ ok: true }),
      )
      expect(result.ok).toBe(false)
    }
  })

  test("prepares read snapshot admission from explicit headers and query entries", async () => {
    const signed = await signedAdmissionInput()
    const prepared = prepareLocalRemoteRuntimeReadSnapshotAdmission({
      authority: {
        expectedLocalRuntimeAccessToken: signed.input.expectedLocalRuntimeAccessToken,
        localRuntimeAccessTokenId: signed.input.localRuntimeAccessTokenId ?? "",
        publicKey: signed.input.publicKey,
        runtimeInstallationId: signed.input.runtimeInstallationId,
        trustedRuntimeClientId: signed.input.trustedRuntimeClientId,
      },
      bodySha256: signed.input.bodySha256,
      canonicalPath: signed.input.canonicalPath,
      headers: [
        { name: remoteRuntimeHttpVersionHeaderName, value: signed.input.remoteRuntimeHttpVersion ?? "" },
        { name: remoteRuntimeHttpRequestSigningKeyIdHeaderName, value: signed.input.proof.keyId },
        { name: remoteRuntimeHttpRequestSignatureAlgorithmHeaderName, value: signed.input.proof.algorithm },
        { name: remoteRuntimeHttpRequestSignatureTimestampHeaderName, value: signed.input.proof.timestamp },
        { name: remoteRuntimeHttpRequestSignatureNonceHeaderName, value: signed.input.proof.nonce },
        { name: remoteRuntimeHttpRequestBodySha256HeaderName, value: signed.input.proof.bodySha256 },
        { name: remoteRuntimeHttpRequestSignatureHeaderName, value: signed.input.proof.signature },
        { name: localRemoteRuntimeRequestIdHeaderName, value: signed.input.requestId ?? "" },
        { name: localRuntimeAccessTokenHeaderName, value: signed.input.localRuntimeAccessToken },
      ],
      method: signed.input.method,
      nonceStore: signed.input.nonceStore,
      nowMs: signed.input.nowMs,
      query: [{ name: "runtimeInstallationId", value: "rti_1" }],
      route: { kind: "activeChats" },
      runtimeInstallationId: signed.input.runtimeInstallationId,
    })
    const missingSignature = prepareLocalRemoteRuntimeReadSnapshotAdmission({
      authority: {
        expectedLocalRuntimeAccessToken: signed.input.expectedLocalRuntimeAccessToken,
        localRuntimeAccessTokenId: signed.input.localRuntimeAccessTokenId ?? "",
        publicKey: signed.input.publicKey,
        runtimeInstallationId: signed.input.runtimeInstallationId,
        trustedRuntimeClientId: signed.input.trustedRuntimeClientId,
      },
      bodySha256: signed.input.bodySha256,
      canonicalPath: signed.input.canonicalPath,
      headers: [
        { name: remoteRuntimeHttpVersionHeaderName, value: signed.input.remoteRuntimeHttpVersion ?? "" },
        { name: localRuntimeAccessTokenHeaderName, value: signed.input.localRuntimeAccessToken },
      ],
      method: signed.input.method,
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: signed.input.nowMs,
      query: [],
      route: { kind: "activeChats" },
      runtimeInstallationId: signed.input.runtimeInstallationId,
    })
    const missingVersion = prepareLocalRemoteRuntimeReadSnapshotAdmission({
      authority: {
        expectedLocalRuntimeAccessToken: signed.input.expectedLocalRuntimeAccessToken,
        localRuntimeAccessTokenId: signed.input.localRuntimeAccessTokenId ?? "",
        publicKey: signed.input.publicKey,
        runtimeInstallationId: signed.input.runtimeInstallationId,
        trustedRuntimeClientId: signed.input.trustedRuntimeClientId,
      },
      bodySha256: signed.input.bodySha256,
      canonicalPath: signed.input.canonicalPath,
      headers: [{ name: localRuntimeAccessTokenHeaderName, value: signed.input.localRuntimeAccessToken }],
      method: signed.input.method,
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: signed.input.nowMs,
      query: [],
      route: { kind: "activeChats" },
      runtimeInstallationId: signed.input.runtimeInstallationId,
    })

    expect(prepared.ok).toBe(true)
    expect(prepared.ok && prepared.response.canonicalQuery).toBe("runtimeInstallationId=rti_1")
    expect(prepared.ok && prepared.response.route).toEqual({ kind: "activeChats" })
    expect(missingSignature.ok).toBe(false)
    expect(missingVersion.ok).toBe(false)
    expect(!missingVersion.ok && missingVersion.status).toBe(400)
    expect(!missingVersion.ok && missingVersion.error.code).toBe("REMOTE_RUNTIME_HTTP_VERSION_MISMATCH")
  })

  test("prepares command admission with idempotency in the signed payload", async () => {
    const signed = await signedAdmissionInput({
      bodySha256: "command_body_hash_1",
      idempotencyKey: "idem_1",
      method: "POST",
    })
    const prepared = prepareLocalRemoteRuntimeHttpAdmission({
      authority: {
        expectedLocalRuntimeAccessToken: signed.input.expectedLocalRuntimeAccessToken,
        localRuntimeAccessTokenId: signed.input.localRuntimeAccessTokenId ?? "",
        publicKey: signed.input.publicKey,
        runtimeInstallationId: signed.input.runtimeInstallationId,
        trustedRuntimeClientId: signed.input.trustedRuntimeClientId,
      },
      bodySha256: signed.input.bodySha256,
      canonicalPath: signed.input.canonicalPath,
      headers: admissionHeaders(signed.input),
      idempotencyKey: "idem_1",
      method: "POST",
      nonceStore: signed.input.nonceStore,
      nowMs: signed.input.nowMs,
      query: [],
      runtimeInstallationId: signed.input.runtimeInstallationId,
    })
    let dispatches = 0
    const accepted = prepared.ok
      ? await dispatchLocalRemoteRuntimeHttpRequest(prepared.response, () => {
          dispatches += 1
          return { accepted: true }
        })
      : prepared

    expect(prepared.ok).toBe(true)
    expect(prepared.ok && prepared.response.idempotencyKey).toBe("idem_1")
    expect(accepted.ok).toBe(true)
    expect(dispatches).toBe(1)
  })

  test("rejects prepared local HTTP admission with missing required proof or token fields", async () => {
    const signed = await signedAdmissionInput()
    const baseInput = {
      authority: {
        expectedLocalRuntimeAccessToken: signed.input.expectedLocalRuntimeAccessToken,
        localRuntimeAccessTokenId: signed.input.localRuntimeAccessTokenId ?? "",
        publicKey: signed.input.publicKey,
        runtimeInstallationId: signed.input.runtimeInstallationId,
        trustedRuntimeClientId: signed.input.trustedRuntimeClientId,
      },
      bodySha256: signed.input.bodySha256,
      canonicalPath: signed.input.canonicalPath,
      idempotencyKey: null,
      method: signed.input.method,
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: signed.input.nowMs,
      query: [],
      runtimeInstallationId: signed.input.runtimeInstallationId,
    }
    const wrongBody = prepareLocalRemoteRuntimeHttpAdmission({
      ...baseInput,
      headers: admissionHeaders({ ...signed.input, proof: { ...signed.input.proof, bodySha256: "wrong_body_hash" } }),
    })
    const missingKeyId = prepareLocalRemoteRuntimeHttpAdmission({
      ...baseInput,
      headers: admissionHeaders({ ...signed.input, proof: { ...signed.input.proof, keyId: "" } }),
    })
    const missingNonce = prepareLocalRemoteRuntimeHttpAdmission({
      ...baseInput,
      headers: admissionHeaders({ ...signed.input, proof: { ...signed.input.proof, nonce: "" } }),
    })
    const missingSignature = prepareLocalRemoteRuntimeHttpAdmission({
      ...baseInput,
      headers: admissionHeaders({ ...signed.input, proof: { ...signed.input.proof, signature: "" } }),
    })
    const missingTimestamp = prepareLocalRemoteRuntimeHttpAdmission({
      ...baseInput,
      headers: admissionHeaders({ ...signed.input, proof: { ...signed.input.proof, timestamp: "" } }),
    })
    const missingToken = prepareLocalRemoteRuntimeHttpAdmission({
      ...baseInput,
      headers: admissionHeaders({ ...signed.input, localRuntimeAccessToken: "" }),
    })

    for (const result of [wrongBody, missingKeyId, missingNonce, missingSignature, missingTimestamp, missingToken]) {
      expect(result.ok).toBe(false)
      expect(result.ok || result.status).toBe(401)
    }
  })

  test("reports local HTTP gateway diagnostics without sensitive signature material", async () => {
    const signed = await signedAdmissionInput()
    const diagnostics: LocalRemoteRuntimeGatewayDiagnostic[] = []
    const accepted = await dispatchLocalRemoteRuntimeHttpRequest(
      {
        ...signed.input,
        diagnostics: (diagnostic) => diagnostics.push(diagnostic),
      },
      () => ({ activeChats: [] }),
    )
    const replay = await dispatchLocalRemoteRuntimeHttpRequest(
      {
        ...signed.input,
        diagnostics: (diagnostic) => diagnostics.push(diagnostic),
      },
      () => ({ activeChats: [] }),
    )

    expect(accepted.ok).toBe(true)
    expect(replay.ok).toBe(false)
    expect(diagnostics).toEqual([
      {
        authOutcome: "accepted",
        failureCode: null,
        nonceReplayOutcome: "accepted",
        requestSigningKeyId: "mk_1",
        route: "/remote-runtime/chats",
        runtimeInstallationId: "rti_1",
        signatureValidationOutcome: "accepted",
        trustedRuntimeClientId: "tmd_1",
      },
      {
        authOutcome: "notChecked",
        failureCode: "AUTHORIZATION_FAILED",
        nonceReplayOutcome: "rejected",
        requestSigningKeyId: "mk_1",
        route: "/remote-runtime/chats",
        runtimeInstallationId: "rti_1",
        signatureValidationOutcome: "rejected",
        trustedRuntimeClientId: "tmd_1",
      },
    ])
    expect(JSON.stringify(diagnostics)).not.toContain(signed.input.proof.signature)
    expect(JSON.stringify(diagnostics)).not.toContain(signed.input.proof.nonce)
    expect(JSON.stringify(diagnostics)).not.toContain(signed.input.localRuntimeAccessToken)
  })

  test("replays local command results for matching idempotency keys without redispatching", async () => {
    const store = createInMemoryLocalRemoteRuntimeCommandIdempotencyStore<{ chatId: string }>()
    let dispatches = 0
    const first = await runLocalRemoteRuntimeCommandWithIdempotency({
      execute: () => {
        dispatches += 1
        return { chatId: "ses_1" }
      },
      fingerprint: createLocalRemoteRuntimeCommandFingerprint({
        bodySha256: "body_hash_1",
        canonicalPath: "/remote-runtime/chats",
        method: "POST",
      }),
      idempotencyKey: "idem_1",
      requestId: "req_1",
      runtimeInstallationId: "rti_1",
      store,
    })
    const replay = await runLocalRemoteRuntimeCommandWithIdempotency({
      execute: () => {
        dispatches += 1
        return { chatId: "ses_2" }
      },
      fingerprint: createLocalRemoteRuntimeCommandFingerprint({
        bodySha256: "body_hash_1",
        canonicalPath: "/remote-runtime/chats",
        method: "POST",
      }),
      idempotencyKey: "idem_1",
      requestId: "req_2",
      runtimeInstallationId: "rti_1",
      store,
    })
    const conflict = await runLocalRemoteRuntimeCommandWithIdempotency({
      execute: () => {
        dispatches += 1
        return { chatId: "ses_3" }
      },
      fingerprint: createLocalRemoteRuntimeCommandFingerprint({
        bodySha256: "different_body_hash",
        canonicalPath: "/remote-runtime/chats",
        method: "POST",
      }),
      idempotencyKey: "idem_1",
      requestId: "req_3",
      runtimeInstallationId: "rti_1",
      store,
    })

    expect(first).toEqual({ ok: true, response: { chatId: "ses_1" } })
    expect(replay).toEqual({ ok: true, response: { chatId: "ses_1" } })
    expect(conflict.ok).toBe(false)
    expect(conflict.ok || conflict.status).toBe(409)
    expect(dispatches).toBe(1)
  })

  test("validates local remote runtime command bodies before idempotent dispatch", async () => {
    const store = createInMemoryLocalRemoteRuntimeCommandIdempotencyStore<object>()
    const bodyJson = localRemoteRuntimeCommandBodyJson(
      JSON.stringify({
        directoryId: "dir_1",
        idempotencyKey: "idem_validated",
        requestId: "req_validated",
        runtimeInstallationId: "rti_1",
      }),
    )
    expect(bodyJson).not.toBeNull()
    expect(localRemoteRuntimeCommandBodyJson("not-json")).toBeNull()
    expect(localRemoteRuntimeCommandBodyAuthority(bodyJson)).toEqual({
      idempotencyKey: "idem_validated",
      runtimeInstallationId: "rti_1",
    })
    expect(localRemoteRuntimeCommandBodyAuthority(null)).toEqual({ idempotencyKey: "", runtimeInstallationId: "" })

    let dispatches = 0
    const accepted = await runValidatedLocalRemoteRuntimeCommandRequest({
      bodyJson,
      commandBodyAuthority: localRemoteRuntimeCommandBodyAuthority(bodyJson),
      dispatch: (body, remoteRuntimeHttpVersion, runtimeInstallationId) => {
        dispatches += 1
        return { body, remoteRuntimeHttpVersion, runtimeInstallationId }
      },
      parseBody: parseTestStartChatBody,
      prepared: {
        bodySha256: "body_hash_validated",
        canonicalPath: "/remote-runtime/chats",
        method: "POST",
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        requestId: "req_validated",
      },
      store,
    })
    expect(accepted.ok && accepted.response).toMatchObject({
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      runtimeInstallationId: "rti_1",
    })
    const replayConflict = await runValidatedLocalRemoteRuntimeCommandRequest({
      bodyJson,
      commandBodyAuthority: localRemoteRuntimeCommandBodyAuthority(bodyJson),
      dispatch: () => {
        dispatches += 1
        return { ignored: true }
      },
      parseBody: parseTestStartChatBody,
      prepared: {
        bodySha256: "different_body_hash",
        canonicalPath: "/remote-runtime/chats",
        method: "POST",
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        requestId: "req_conflict",
      },
      store,
    })
    const invalid = await runValidatedLocalRemoteRuntimeCommandRequest({
      bodyJson: null,
      commandBodyAuthority: { idempotencyKey: "", runtimeInstallationId: "" },
      dispatch: () => ({ unreachable: true }),
      parseBody: parseTestStartChatBody,
      prepared: {
        bodySha256: "invalid_body_hash",
        canonicalPath: "/remote-runtime/chats",
        method: "POST",
        remoteRuntimeHttpVersion: null,
        requestId: "req_invalid",
      },
      store,
    })
    const mismatch = await runValidatedLocalRemoteRuntimeCommandRequest({
      bodyJson: localRemoteRuntimeCommandBodyJson(
        JSON.stringify({
          idempotencyKey: "idem_mismatch",
          input: { content: "hello" },
          requestId: "req_mismatch",
          runtimeInstallationId: "rti_1",
          sessionId: "ses_body",
        }),
      ),
      commandBodyAuthority: { idempotencyKey: "idem_mismatch", runtimeInstallationId: "rti_1" },
      dispatch: () => ({ unreachable: true }),
      expectedSessionId: "ses_path",
      parseBody: parseTestSendMessageBody,
      prepared: {
        bodySha256: "mismatch_body_hash",
        canonicalPath: "/remote-runtime/chats/ses_path/messages",
        method: "POST",
        remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
        requestId: "req_mismatch",
      },
      store,
    })

    expect(replayConflict.ok || replayConflict.status).toBe(409)
    expect(invalid).toEqual({
      error: { code: "VALIDATION_FAILED", message: "Remote runtime command request body is invalid." },
      ok: false,
      status: 400,
    })
    expect(mismatch).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Remote runtime command path and body session identifiers must match.",
      },
      ok: false,
      status: 400,
    })
    expect(dispatches).toBe(1)
  })

  test("clears idempotency records after command execution failure", async () => {
    const store = createInMemoryLocalRemoteRuntimeCommandIdempotencyStore<{ chatId: string }>()
    let dispatches = 0
    await expect(
      runLocalRemoteRuntimeCommandWithIdempotency({
        execute: async () => {
          dispatches += 1
          throw new Error("command failed")
        },
        fingerprint: createLocalRemoteRuntimeCommandFingerprint({
          bodySha256: "body_hash_1",
          canonicalPath: "/remote-runtime/chats",
          method: "POST",
        }),
        idempotencyKey: "idem_retry",
        requestId: "req_failed",
        runtimeInstallationId: "rti_1",
        store,
      }),
    ).rejects.toThrow("command failed")

    const retry = await runLocalRemoteRuntimeCommandWithIdempotency({
      execute: () => {
        dispatches += 1
        return { chatId: "ses_retry" }
      },
      fingerprint: createLocalRemoteRuntimeCommandFingerprint({
        bodySha256: "body_hash_1",
        canonicalPath: "/remote-runtime/chats",
        method: "POST",
      }),
      idempotencyKey: "idem_retry",
      requestId: "req_retry",
      runtimeInstallationId: "rti_1",
      store,
    })

    expect(retry).toEqual({ ok: true, response: { chatId: "ses_retry" } })
    expect(dispatches).toBe(2)
  })

  test("prepares signed local websocket admission before accepting a session", async () => {
    const signed = await signedWebSocketAdmissionInput()
    const accepted = await prepareLocalRemoteRuntimeWebSocketAdmission(signed.input)
    const replay = await prepareLocalRemoteRuntimeWebSocketAdmission(signed.input)
    const badToken = await prepareLocalRemoteRuntimeWebSocketAdmission({
      ...signed.input,
      headers: signed.input.headers.map((header) =>
        header.name === localRuntimeAccessTokenHeaderName ? { ...header, value: "copied_token" } : header,
      ),
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    })
    const badTokenId = await prepareLocalRemoteRuntimeWebSocketAdmission({
      ...signed.input,
      headers: signed.input.headers.map((header) =>
        header.name === localRuntimeAccessTokenIdHeaderName ? { ...header, value: "copied_token_id" } : header,
      ),
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    })
    const badPath = await prepareLocalRemoteRuntimeWebSocketAdmission({
      ...signed.input,
      canonicalPath: "/mobile/other-socket",
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    })
    const tokenReplayStore = createInMemoryRemoteRuntimeNonceReplayStore()
    const badTokenConsumesNonce = await prepareLocalRemoteRuntimeWebSocketAdmission({
      ...signed.input,
      headers: signed.input.headers.map((header) =>
        header.name === localRuntimeAccessTokenHeaderName ? { ...header, value: "copied_token" } : header,
      ),
      nonceStore: tokenReplayStore,
    })
    const replayAfterBadToken = await prepareLocalRemoteRuntimeWebSocketAdmission({
      ...signed.input,
      nonceStore: tokenReplayStore,
    })

    expect(accepted.ok).toBe(true)
    expect(accepted.ok && accepted.response.protocolVersion).toBe(remoteRuntimeTransportProtocolVersion)
    expect(accepted.ok && accepted.response.type).toBe("remoteRuntime.websocket.session.accepted")
    expect(replay.ok).toBe(false)
    expect(badToken.ok).toBe(false)
    expect(badTokenId.ok).toBe(false)
    expect(badPath.ok).toBe(false)
    expect(badTokenConsumesNonce.ok).toBe(false)
    expect(replayAfterBadToken.ok).toBe(false)
  })

  test("rejects local websocket admission with invalid version or missing signature headers", async () => {
    const signed = await signedWebSocketAdmissionInput()
    const badVersion = await prepareLocalRemoteRuntimeWebSocketAdmission({
      ...signed.input,
      headers: signed.input.headers.map((header) =>
        header.name === remoteRuntimeWebSocketVersionHeaderName ? { ...header, value: "2099-01-01" } : header,
      ),
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    })
    const missingSignature = await prepareLocalRemoteRuntimeWebSocketAdmission({
      ...signed.input,
      headers: signed.input.headers.filter((header) => header.name !== remoteRuntimeHttpRequestSignatureHeaderName),
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    })

    expect(badVersion.ok).toBe(false)
    expect(badVersion.ok || badVersion.status).toBe(401)
    expect(missingSignature.ok).toBe(false)
    expect(missingSignature.ok || missingSignature.status).toBe(401)
  })

  test("validates signed local websocket actions and advances sequence", async () => {
    const signed = await signedWebSocketActionInput()
    const accepted = await validateLocalRemoteRuntimeWebSocketAction(signed.input)
    const next = await signedWebSocketActionInput({
      keyPair: signed.keyPair,
      nonce: "ws_action_nonce_2",
      publicKey: signed.publicKey,
      sequence: 2,
    })
    const acceptedNext = accepted.ok
      ? await validateLocalRemoteRuntimeWebSocketAction({
          ...next.input,
          nextSequence: accepted.nextSequence,
          nonceStore: signed.input.nonceStore,
        })
      : accepted

    expect(accepted.ok).toBe(true)
    expect(accepted.ok && accepted.nextSequence).toBe(2)
    expect(accepted.ok && accepted.response.payload).toEqual({ requestId: "req_action_1", type: "mobile.attach" })
    expect(acceptedNext.ok).toBe(true)
    expect(acceptedNext.ok && acceptedNext.nextSequence).toBe(3)
  })

  test("reports local WebSocket gateway diagnostics for upgrades and signed actions", async () => {
    const upgrade = await signedWebSocketAdmissionInput()
    const action = await signedWebSocketActionInput()
    const diagnostics: LocalRemoteRuntimeGatewayDiagnostic[] = []
    const acceptedUpgrade = await prepareLocalRemoteRuntimeWebSocketAdmission({
      ...upgrade.input,
      diagnostics: (diagnostic) => diagnostics.push(diagnostic),
    })
    const acceptedAction = await validateLocalRemoteRuntimeWebSocketAction({
      ...action.input,
      diagnostics: (diagnostic) => diagnostics.push(diagnostic),
    })

    expect(acceptedUpgrade.ok).toBe(true)
    expect(acceptedAction.ok).toBe(true)
    expect(diagnostics).toEqual([
      {
        authOutcome: "accepted",
        failureCode: null,
        nonceReplayOutcome: "accepted",
        requestSigningKeyId: "mk_1",
        route: "/remote-runtime/socket",
        runtimeInstallationId: "rti_1",
        signatureValidationOutcome: "accepted",
        trustedRuntimeClientId: "tmd_1",
      },
      expect.objectContaining({
        authOutcome: "accepted",
        canonicalSigningPayloadSha256: expect.any(String),
        expectedPayloadSha256: expect.any(String),
        failureCode: null,
        nonceReplayOutcome: "accepted",
        requestId: "req_action_1",
        requestSigningKeyId: "mk_1",
        route: "websocket.action",
        runtimeInstallationId: "rti_1",
        sequence: 1,
        sessionNonceSha256: expect.any(String),
        signatureValidationOutcome: "accepted",
        trustedRuntimeClientId: "tmd_1",
      }),
    ])
    expect(JSON.stringify(diagnostics)).not.toContain("ws_nonce_1")
    expect(JSON.stringify(diagnostics)).not.toContain("ws_action_nonce_1")
    expect(JSON.stringify(diagnostics)).not.toContain("lrt_secret_1")
  })

  test("rejects local websocket action nonce replay", async () => {
    const signed = await signedWebSocketActionInput()
    const accepted = await validateLocalRemoteRuntimeWebSocketAction(signed.input)
    const replay = await validateLocalRemoteRuntimeWebSocketAction({
      ...signed.input,
      nextSequence: 1,
    })

    expect(accepted.ok).toBe(true)
    expect(replay.ok).toBe(false)
    expect(replay.ok || replay.status).toBe(401)
  })

  test("rejects local websocket actions with the wrong sequence", async () => {
    const signed = await signedWebSocketActionInput({ sequence: 2 })
    const rejected = await validateLocalRemoteRuntimeWebSocketAction(signed.input)

    expect(rejected.ok).toBe(false)
    expect(rejected.ok || rejected.status).toBe(401)
  })

  test("rejects local websocket actions with tampered payloads", async () => {
    const signed = await signedWebSocketActionInput()
    const rejected = await validateLocalRemoteRuntimeWebSocketAction({
      ...signed.input,
      action: {
        ...signed.input.action,
        payload: { requestId: "req_action_1", type: "mobile.tampered" },
      },
    })

    expect(rejected.ok).toBe(false)
    expect(rejected.ok || rejected.status).toBe(401)
  })
})

async function signedAdmissionInput(
  options: {
    bodySha256?: string
    canonicalPath?: string
    idempotencyKey?: string | null
    method?: string
    nonce?: string
  } = {},
): Promise<{ input: LocalRemoteRuntimeHttpAdmissionInput; nonceStore: RemoteRuntimeNonceReplayStore }> {
  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
  const publicKey: RemoteRuntimeAsymmetricPublicKey = {
    algorithm: "ed25519",
    createdAt: "2026-05-14T00:00:00.000Z",
    encoding: "base64url",
    keyId: "mk_1",
    publicKey: Buffer.from(await crypto.subtle.exportKey("raw", keyPair.publicKey)).toString("base64url"),
    purpose: "remoteRuntimeRequestSigning",
  }
  const payloadInput: RemoteRuntimeCanonicalHttpSigningPayloadInput = {
    bodySha256: options.bodySha256 ?? "body_hash_1",
    canonicalPath: options.canonicalPath ?? "/remote-runtime/chats",
    canonicalQuery: options.method === "POST" ? "" : "runtimeInstallationId=rti_1",
    idempotencyKey: options.idempotencyKey ?? null,
    keyId: publicKey.keyId,
    localRuntimeAccessTokenId: "lrt_id_1",
    method: options.method ?? "GET",
    remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
    nonce: options.nonce ?? "nonce_1",
    requestId: "req_1",
    runtimeInstallationId: "rti_1",
    timestamp: "2026-05-14T00:00:00.000Z",
    trustedRuntimeClientId: "tmd_1",
  }
  const proof: RemoteRuntimeRequestSignatureProof = {
    algorithm: "ed25519",
    bodySha256: payloadInput.bodySha256,
    keyId: payloadInput.keyId,
    nonce: payloadInput.nonce,
    signature: Buffer.from(
      await crypto.subtle.sign(
        { name: "Ed25519" },
        keyPair.privateKey,
        new TextEncoder().encode(createRemoteRuntimeCanonicalHttpSigningPayload(payloadInput).payload),
      ),
    ).toString("base64url"),
    timestamp: payloadInput.timestamp,
  }
  const nonceStore = createInMemoryRemoteRuntimeNonceReplayStore()
  return {
    input: {
      bodySha256: payloadInput.bodySha256,
      canonicalPath: payloadInput.canonicalPath,
      canonicalQuery: payloadInput.canonicalQuery,
      expectedLocalRuntimeAccessToken: "lrt_secret_1",
      expectedLocalRuntimeAccessTokenId: payloadInput.localRuntimeAccessTokenId ?? "",
      expectedRuntimeInstallationId: payloadInput.runtimeInstallationId,
      idempotencyKey: payloadInput.idempotencyKey,
      localRuntimeAccessToken: "lrt_secret_1",
      localRuntimeAccessTokenId: payloadInput.localRuntimeAccessTokenId,
      method: payloadInput.method,
      remoteRuntimeHttpVersion: payloadInput.remoteRuntimeHttpVersion ?? null,
      nonceStore,
      nowMs: Date.parse(payloadInput.timestamp),
      proof,
      publicKey,
      requestId: payloadInput.requestId,
      runtimeInstallationId: payloadInput.runtimeInstallationId,
      trustedRuntimeClientId: payloadInput.trustedRuntimeClientId,
    },
    nonceStore,
  }
}

async function signedWebSocketAdmissionInput() {
  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
  const publicKey: RemoteRuntimeAsymmetricPublicKey = {
    algorithm: "ed25519",
    createdAt: "2026-05-14T00:00:00.000Z",
    encoding: "base64url",
    keyId: "mk_1",
    publicKey: Buffer.from(await crypto.subtle.exportKey("raw", keyPair.publicKey)).toString("base64url"),
    purpose: "remoteRuntimeRequestSigning",
  }
  const payloadInput: RemoteRuntimeCanonicalWebSocketUpgradeSigningPayloadInput = {
    accountId: "acct_1",
    canonicalPath: "/remote-runtime/socket",
    canonicalQuery: "accountId=acct_1&runtimeInstallationId=rti_1&trustedRuntimeClientId=tmd_1",
    keyId: publicKey.keyId,
    localRuntimeAccessTokenId: "lrt_id_1",
    nonce: "ws_nonce_1",
    requestId: "req_ws_1",
    runtimeInstallationId: "rti_1",
    timestamp: "2026-05-14T00:00:00.000Z",
    trustedRuntimeClientId: "tmd_1",
    webSocketVersion: remoteRuntimeWebSocketContractVersion,
  }
  const signature = Buffer.from(
    await crypto.subtle.sign(
      { name: "Ed25519" },
      keyPair.privateKey,
      new TextEncoder().encode(createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload(payloadInput).payload),
    ),
  ).toString("base64url")
  return {
    input: {
      accountId: payloadInput.accountId,
      authority: {
        expectedLocalRuntimeAccessToken: "lrt_secret_1",
        localRuntimeAccessTokenId: "lrt_id_1",
        publicKey,
        runtimeInstallationId: payloadInput.runtimeInstallationId,
        trustedRuntimeClientId: payloadInput.trustedRuntimeClientId,
      },
      canonicalPath: payloadInput.canonicalPath,
      headers: [
        { name: remoteRuntimeWebSocketVersionHeaderName, value: remoteRuntimeWebSocketContractVersion },
        { name: remoteRuntimeHttpRequestSigningKeyIdHeaderName, value: payloadInput.keyId },
        { name: remoteRuntimeHttpRequestSignatureAlgorithmHeaderName, value: "ed25519" },
        { name: remoteRuntimeHttpRequestSignatureTimestampHeaderName, value: payloadInput.timestamp },
        { name: remoteRuntimeHttpRequestSignatureNonceHeaderName, value: payloadInput.nonce },
        { name: remoteRuntimeHttpRequestSignatureHeaderName, value: signature },
        { name: localRemoteRuntimeRequestIdHeaderName, value: payloadInput.requestId ?? "" },
        { name: localRuntimeAccessTokenHeaderName, value: "lrt_secret_1" },
        { name: localRuntimeAccessTokenIdHeaderName, value: payloadInput.localRuntimeAccessTokenId ?? "" },
      ],
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: Date.parse(payloadInput.timestamp),
      query: [
        { name: "trustedRuntimeClientId", value: payloadInput.trustedRuntimeClientId },
        { name: "runtimeInstallationId", value: payloadInput.runtimeInstallationId },
        { name: "accountId", value: payloadInput.accountId },
      ],
      runtimeInstallationId: payloadInput.runtimeInstallationId,
    },
  }
}

async function signedWebSocketActionInput(
  options: {
    keyPair?: CryptoKeyPair
    nonce?: string
    publicKey?: RemoteRuntimeAsymmetricPublicKey
    sequence?: number
  } = {},
) {
  const keyPair = options.keyPair ?? (await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]))
  const publicKey: RemoteRuntimeAsymmetricPublicKey = options.publicKey ?? {
    algorithm: "ed25519",
    createdAt: "2026-05-14T00:00:00.000Z",
    encoding: "base64url",
    keyId: "mk_1",
    publicKey: Buffer.from(await crypto.subtle.exportKey("raw", keyPair.publicKey)).toString("base64url"),
    purpose: "remoteRuntimeRequestSigning",
  }
  const payload = { requestId: "req_action_1", type: "mobile.attach" }
  const payloadSha256 = Buffer.from(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(payload))),
  ).toString("base64url")
  const payloadInput: RemoteRuntimeCanonicalWebSocketActionSigningPayloadInput = {
    keyId: publicKey.keyId,
    nonce: options.nonce ?? "ws_action_nonce_1",
    payloadSha256,
    requestId: payload.requestId,
    runtimeInstallationId: "rti_1",
    sequence: options.sequence ?? 1,
    sessionNonce: "session_nonce_1",
    timestamp: "2026-05-14T00:00:00.000Z",
    trustedRuntimeClientId: "tmd_1",
  }
  const signature = Buffer.from(
    await crypto.subtle.sign(
      { name: "Ed25519" },
      keyPair.privateKey,
      new TextEncoder().encode(createRemoteRuntimeCanonicalWebSocketActionSigningPayload(payloadInput).payload),
    ),
  ).toString("base64url")
  return {
    input: {
      action: {
        payload,
        proof: {
          algorithm: "ed25519" as const,
          keyId: payloadInput.keyId,
          nonce: payloadInput.nonce,
          payloadSha256,
          signature,
          timestamp: payloadInput.timestamp,
        },
        protocolVersion: remoteRuntimeTransportProtocolVersion,
        sequence: payloadInput.sequence,
        sessionNonce: payloadInput.sessionNonce,
        type: "remoteRuntime.websocket.action" as const,
      },
      authority: {
        expectedLocalRuntimeAccessToken: "lrt_secret_1",
        localRuntimeAccessTokenId: "lrt_id_1",
        publicKey,
        runtimeInstallationId: payloadInput.runtimeInstallationId,
        trustedRuntimeClientId: payloadInput.trustedRuntimeClientId,
      },
      nextSequence: 1,
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: Date.parse(payloadInput.timestamp),
      runtimeInstallationId: payloadInput.runtimeInstallationId,
      sessionNonce: payloadInput.sessionNonce,
    },
    keyPair,
    publicKey,
  }
}

function admissionHeaders(input: LocalRemoteRuntimeHttpAdmissionInput) {
  return [
    { name: remoteRuntimeHttpVersionHeaderName, value: input.remoteRuntimeHttpVersion ?? "" },
    { name: remoteRuntimeHttpRequestSigningKeyIdHeaderName, value: input.proof.keyId },
    { name: remoteRuntimeHttpRequestSignatureAlgorithmHeaderName, value: input.proof.algorithm },
    { name: remoteRuntimeHttpRequestSignatureTimestampHeaderName, value: input.proof.timestamp },
    { name: remoteRuntimeHttpRequestSignatureNonceHeaderName, value: input.proof.nonce },
    { name: remoteRuntimeHttpRequestBodySha256HeaderName, value: input.proof.bodySha256 },
    { name: remoteRuntimeHttpRequestSignatureHeaderName, value: input.proof.signature },
    { name: localRemoteRuntimeRequestIdHeaderName, value: input.requestId ?? "" },
    { name: localRuntimeAccessTokenHeaderName, value: input.localRuntimeAccessToken },
    { name: localRuntimeAccessTokenIdHeaderName, value: input.localRuntimeAccessTokenId ?? "" },
  ]
}

function parseTestStartChatBody(input: unknown) {
  const body = testRecord(input)
  const directoryId = body.directoryId
  const idempotencyKey = body.idempotencyKey
  const requestId = body.requestId
  if (typeof directoryId !== "string" || typeof idempotencyKey !== "string" || typeof requestId !== "string") {
    throw new Error("invalid test start chat body")
  }
  return { directoryId, idempotencyKey, requestId }
}

function parseTestSendMessageBody(input: unknown) {
  const body = testRecord(input)
  const sessionId = body.sessionId
  if (typeof sessionId !== "string") {
    throw new Error("invalid test send message body")
  }
  return { sessionId }
}

function testRecord(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("invalid test body")
  }
  return input as Record<string, unknown>
}
