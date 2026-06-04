import assert from "node:assert/strict"
import { test } from "bun:test"
import {
  createRuntimeWebSocketEventSignaturePayload,
  type RuntimeWebSocketEventSignaturePayloadInput,
} from "@interbase/remote-runtime-contracts"
import {
  createRemoteRuntimeCanonicalHttpSigningPayload,
  createRemoteRuntimeCanonicalWebSocketActionSigningPayload,
  createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload,
  remoteRuntimeHttpContractVersion,
  remoteRuntimeTransportProtocolVersion,
  type RemoteRuntimeAsymmetricPublicKey,
} from "@interbase/remote-runtime-contracts"
import {
  createInMemoryRemoteRuntimeNonceReplayStore,
  createRemoteRuntimeHttpResponseSignatureProof,
  createRuntimeWebSocketEventSignatureProof,
  generateRemoteRuntimeAsymmetricKeyPair,
  verifyRemoteRuntimeHttpRequestSignature,
  verifyRemoteRuntimeHttpResponseSignature,
  verifyRemoteRuntimeWebSocketActionSignature,
  verifyRemoteRuntimeWebSocketUpgradeSignature,
  verifyRuntimeWebSocketEventSignature,
  validateRemoteRuntimeWebSocketSignedAction,
} from "../src/index.js"

const textEncoder = new TextEncoder()

function base64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url")
}

async function mobileRequestKey() {
  const keyPair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"])
  const publicKey: RemoteRuntimeAsymmetricPublicKey = {
    algorithm: "ed25519",
    createdAt: "2026-05-14T00:00:00.000Z",
    encoding: "base64url",
    keyId: "mk_1",
    publicKey: base64Url(await crypto.subtle.exportKey("raw", keyPair.publicKey)),
    purpose: "remoteRuntimeRequestSigning",
  }
  return { keyPair, publicKey }
}

test("remote runtime HTTP response and event signatures bind runtime response authority", async () => {
  const keyPair = await generateRemoteRuntimeAsymmetricKeyPair({
    createdAt: "2026-05-14T00:00:00.000Z",
    keyId: "runtime_key_1",
    purpose: "runtimeResponseSigning",
  })
  const httpPayload = {
    bodySha256: "response_body_hash_1",
    canonicalPath: "/remote-runtime/chats",
    canonicalQuery: "runtimeInstallationId=rti_1",
    keyId: keyPair.publicKey.keyId,
    localRuntimeAccessTokenId: "lrt_1",
    method: "GET",
    remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
    nonce: "response_nonce_1",
    requestId: "req_1",
    runtimeInstallationId: "rti_1",
    status: 200,
    timestamp: "2026-05-14T00:00:00.000Z",
    trustedRuntimeClientId: "tmd_1",
  } as const
  const httpProof = await createRemoteRuntimeHttpResponseSignatureProof({
    payload: httpPayload,
    privateKey: keyPair.privateKey,
  })
  await assert.rejects(
    () =>
      createRemoteRuntimeHttpResponseSignatureProof({
        payload: { ...httpPayload, keyId: "runtime_key_other" },
        privateKey: keyPair.privateKey,
      }),
    /runtime response authority/,
  )
  await assert.rejects(
    () =>
      createRemoteRuntimeHttpResponseSignatureProof({
        payload: httpPayload,
        privateKey: { ...keyPair.privateKey, privateKey: "not*base64" },
      }),
    /Invalid base64url value/,
  )
  const validHttp = await verifyRemoteRuntimeHttpResponseSignature({
    nowMs: Date.parse(httpPayload.timestamp),
    payloadInput: httpPayload,
    proof: httpProof,
    publicKey: keyPair.publicKey,
  })
  const httpFailures = await Promise.all([
    verifyRemoteRuntimeHttpResponseSignature({
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: { ...httpPayload, status: 500 },
      proof: httpProof,
      publicKey: keyPair.publicKey,
    }),
    verifyRemoteRuntimeHttpResponseSignature({
      nowMs: Date.parse("2026-05-14T00:10:01.000Z"),
      payloadInput: httpPayload,
      proof: httpProof,
      publicKey: keyPair.publicKey,
    }),
    verifyRemoteRuntimeHttpResponseSignature({
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: { ...httpPayload, timestamp: "not-a-date" },
      proof: { ...httpProof, timestamp: "not-a-date" },
      publicKey: keyPair.publicKey,
    }),
    verifyRemoteRuntimeHttpResponseSignature({
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: httpPayload,
      proof: { ...httpProof, keyId: "runtime_key_other" },
      publicKey: keyPair.publicKey,
    }),
    verifyRemoteRuntimeHttpResponseSignature({
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: httpPayload,
      proof: { ...httpProof, signature: "not*base64" },
      publicKey: keyPair.publicKey,
    }),
    verifyRemoteRuntimeHttpResponseSignature({
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: httpPayload,
      proof: httpProof,
      publicKey: { ...keyPair.publicKey, publicKey: "not base64" },
    }),
  ])

  const eventPayload = Buffer.from(JSON.stringify({ eventType: "session.created", sequence: 1 })).toString("base64url")
  const eventInput: RuntimeWebSocketEventSignaturePayloadInput = {
    eventPayloadSha256: base64Url(await crypto.subtle.digest("SHA-256", Buffer.from(eventPayload))),
    gatewayRuntimeAttachmentId: "lgwa_1",
    keyId: keyPair.publicKey.keyId,
    runtimeInstallationId: "rti_1",
    timestamp: "2026-05-14T00:00:00.000Z",
    trustedRuntimeClientId: "tmd_1",
  }
  const eventProof = await createRuntimeWebSocketEventSignatureProof({
    eventPayload,
    payload: eventInput,
    privateKey: keyPair.privateKey,
  })
  await assert.rejects(
    () =>
      createRuntimeWebSocketEventSignatureProof({
        eventPayload,
        payload: { ...eventInput, keyId: "runtime_key_other" },
        privateKey: keyPair.privateKey,
      }),
    /runtime response authority/,
  )
  const validEvent = await verifyRuntimeWebSocketEventSignature({
    nowMs: Date.parse(eventInput.timestamp),
    payloadInput: eventInput,
    proof: eventProof,
    publicKey: keyPair.publicKey,
  })
  const eventFailures = await Promise.all([
    verifyRuntimeWebSocketEventSignature({
      nowMs: Date.parse(eventInput.timestamp),
      payloadInput: { ...eventInput, eventPayloadSha256: "wrong" },
      proof: eventProof,
      publicKey: keyPair.publicKey,
    }),
    verifyRuntimeWebSocketEventSignature({
      nowMs: Date.parse("2026-05-14T00:10:01.000Z"),
      payloadInput: eventInput,
      proof: eventProof,
      publicKey: keyPair.publicKey,
    }),
    verifyRuntimeWebSocketEventSignature({
      nowMs: Date.parse(eventInput.timestamp),
      payloadInput: { ...eventInput, timestamp: "not-a-date" },
      proof: { ...eventProof, timestamp: "not-a-date" },
      publicKey: keyPair.publicKey,
    }),
    verifyRuntimeWebSocketEventSignature({
      nowMs: Date.parse(eventInput.timestamp),
      payloadInput: eventInput,
      proof: { ...eventProof, keyId: "runtime_key_other" },
      publicKey: keyPair.publicKey,
    }),
    verifyRuntimeWebSocketEventSignature({
      nowMs: Date.parse(eventInput.timestamp),
      payloadInput: eventInput,
      proof: { ...eventProof, signature: "not*base64" },
      publicKey: keyPair.publicKey,
    }),
    verifyRuntimeWebSocketEventSignature({
      nowMs: Date.parse(eventInput.timestamp),
      payloadInput: eventInput,
      proof: eventProof,
      publicKey: { ...keyPair.publicKey, publicKey: "not base64" },
    }),
  ])

  assert.equal(validHttp.ok, true)
  assert.equal(
    httpFailures.every((result) => !result.ok),
    true,
  )
  assert.equal(validEvent.ok, true)
  assert.equal(
    eventFailures.every((result) => !result.ok),
    true,
  )
  assert.equal(
    createRuntimeWebSocketEventSignaturePayload({ ...eventInput, gatewayRuntimeAttachmentId: null }).payload.includes(
      "gatewayRuntimeAttachmentId:\nkeyId:",
    ),
    true,
  )
})

test("remote runtime request and WebSocket signatures verify payload authority and nonce replay", async () => {
  const { keyPair, publicKey } = await mobileRequestKey()
  const httpPayload = {
    bodySha256: "body_hash_1",
    canonicalPath: "/remote-runtime/chats",
    canonicalQuery: "runtimeInstallationId=rti_1",
    idempotencyKey: null,
    keyId: publicKey.keyId,
    localRuntimeAccessTokenId: "lrt_1",
    method: "GET",
    remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
    nonce: "nonce_1",
    requestId: "req_1",
    runtimeInstallationId: "rti_1",
    timestamp: "2026-05-14T00:00:00.000Z",
    trustedRuntimeClientId: "tmd_1",
  } as const
  const httpProof = {
    algorithm: "ed25519",
    bodySha256: httpPayload.bodySha256,
    keyId: httpPayload.keyId,
    nonce: httpPayload.nonce,
    signature: base64Url(
      await crypto.subtle.sign(
        { name: "Ed25519" },
        keyPair.privateKey,
        textEncoder.encode(createRemoteRuntimeCanonicalHttpSigningPayload(httpPayload).payload),
      ),
    ),
    timestamp: httpPayload.timestamp,
  } as const
  const validHttp = await verifyRemoteRuntimeHttpRequestSignature({
    nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    nowMs: Date.parse(httpPayload.timestamp),
    payloadInput: httpPayload,
    proof: httpProof,
    publicKey,
  })
  const replayStore = createInMemoryRemoteRuntimeNonceReplayStore()
  await verifyRemoteRuntimeHttpRequestSignature({
    nonceStore: replayStore,
    nowMs: Date.parse(httpPayload.timestamp),
    payloadInput: httpPayload,
    proof: httpProof,
    publicKey,
  })
  const httpFailures = await Promise.all([
    verifyRemoteRuntimeHttpRequestSignature({
      nonceStore: replayStore,
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: httpPayload,
      proof: httpProof,
      publicKey,
    }),
    verifyRemoteRuntimeHttpRequestSignature({
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: { ...httpPayload, bodySha256: "wrong" },
      proof: httpProof,
      publicKey,
    }),
    verifyRemoteRuntimeHttpRequestSignature({
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: Date.parse("2026-05-14T00:10:01.000Z"),
      payloadInput: httpPayload,
      proof: httpProof,
      publicKey,
    }),
    verifyRemoteRuntimeHttpRequestSignature({
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: { ...httpPayload, timestamp: "not-a-date" },
      proof: { ...httpProof, timestamp: "not-a-date" },
      publicKey,
    }),
    verifyRemoteRuntimeHttpRequestSignature({
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: httpPayload,
      proof: { ...httpProof, keyId: "mk_other" },
      publicKey,
    }),
    verifyRemoteRuntimeHttpRequestSignature({
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: httpPayload,
      proof: { ...httpProof, signature: "not*base64" },
      publicKey,
    }),
    verifyRemoteRuntimeHttpRequestSignature({
      nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
      nowMs: Date.parse(httpPayload.timestamp),
      payloadInput: httpPayload,
      proof: httpProof,
      publicKey: { ...publicKey, publicKey: "not base64" },
    }),
  ])

  const upgradePayload = {
    accountId: "acct_1",
    canonicalPath: "/remote-runtime/ws",
    canonicalQuery: "runtimeInstallationId=rti_1",
    keyId: publicKey.keyId,
    localRuntimeAccessTokenId: "lrt_1",
    nonce: "nonce_upgrade_1",
    requestId: "req_upgrade_1",
    runtimeInstallationId: "rti_1",
    timestamp: httpPayload.timestamp,
    trustedRuntimeClientId: "tmd_1",
    webSocketVersion: "2026-05-14",
  } as const
  const upgradeProof = {
    algorithm: "ed25519",
    keyId: upgradePayload.keyId,
    nonce: upgradePayload.nonce,
    signature: base64Url(
      await crypto.subtle.sign(
        { name: "Ed25519" },
        keyPair.privateKey,
        textEncoder.encode(createRemoteRuntimeCanonicalWebSocketUpgradeSigningPayload(upgradePayload).payload),
      ),
    ),
    timestamp: upgradePayload.timestamp,
  } as const
  const validUpgrade = await verifyRemoteRuntimeWebSocketUpgradeSignature({
    nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    nowMs: Date.parse(upgradePayload.timestamp),
    payloadInput: upgradePayload,
    proof: upgradeProof,
    publicKey,
  })
  const invalidUpgrade = await verifyRemoteRuntimeWebSocketUpgradeSignature({
    nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    nowMs: Date.parse(upgradePayload.timestamp),
    payloadInput: { ...upgradePayload, canonicalPath: "/wrong" },
    proof: upgradeProof,
    publicKey,
  })

  const actionPayload = {
    keyId: publicKey.keyId,
    nonce: "nonce_action_1",
    payloadSha256: "payload_hash_1",
    requestId: "req_action_1",
    runtimeInstallationId: "rti_1",
    sequence: 1,
    sessionNonce: "session_nonce_1",
    timestamp: httpPayload.timestamp,
    trustedRuntimeClientId: "tmd_1",
  } as const
  const actionProof = {
    algorithm: "ed25519",
    keyId: actionPayload.keyId,
    nonce: actionPayload.nonce,
    payloadSha256: actionPayload.payloadSha256,
    signature: base64Url(
      await crypto.subtle.sign(
        { name: "Ed25519" },
        keyPair.privateKey,
        textEncoder.encode(createRemoteRuntimeCanonicalWebSocketActionSigningPayload(actionPayload).payload),
      ),
    ),
    timestamp: actionPayload.timestamp,
  } as const
  const validAction = await verifyRemoteRuntimeWebSocketActionSignature({
    nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    nowMs: Date.parse(actionPayload.timestamp),
    payloadInput: actionPayload,
    proof: actionProof,
    publicKey,
  })
  const invalidAction = await verifyRemoteRuntimeWebSocketActionSignature({
    nonceStore: createInMemoryRemoteRuntimeNonceReplayStore(),
    nowMs: Date.parse(actionPayload.timestamp),
    payloadInput: { ...actionPayload, payloadSha256: "wrong" },
    proof: actionProof,
    publicKey,
  })

  assert.equal(validHttp.ok, true)
  assert.equal(
    httpFailures.every((result) => !result.ok),
    true,
  )
  assert.equal(validUpgrade.ok, true)
  assert.equal(invalidUpgrade.ok, false)
  assert.equal(validAction.ok, true)
  assert.equal(invalidAction.ok, false)
})

test("remote runtime WebSocket signed action validation enforces session authority", () => {
  const action = {
    payload: { command: "ping" },
    proof: {
      algorithm: "ed25519",
      keyId: "mk_1",
      nonce: "nonce_1",
      payloadSha256: "payload_hash_1",
      signature: "sig_1",
      timestamp: "2026-05-14T00:00:00.000Z",
    },
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: "req_action_1",
    sequence: 7,
    sessionNonce: "session_nonce_1",
    type: "remoteRuntime.websocket.action",
  } as const
  const actionWithoutPayload = {
    proof: action.proof,
    protocolVersion: action.protocolVersion,
    requestId: action.requestId,
    sequence: action.sequence,
    sessionNonce: action.sessionNonce,
    type: action.type,
  } as const
  const session = { nextSequence: 7, sessionNonce: "session_nonce_1" }
  const failures = [
    validateRemoteRuntimeWebSocketSignedAction(null, session),
    validateRemoteRuntimeWebSocketSignedAction({ ...action, type: "wrong" }, session),
    validateRemoteRuntimeWebSocketSignedAction({ ...action, protocolVersion: "old" }, session),
    validateRemoteRuntimeWebSocketSignedAction({ ...action, sessionNonce: "other" }, session),
    validateRemoteRuntimeWebSocketSignedAction({ ...action, sequence: 8 }, session),
    validateRemoteRuntimeWebSocketSignedAction(actionWithoutPayload, session),
    validateRemoteRuntimeWebSocketSignedAction({ ...action, proof: null }, session),
    validateRemoteRuntimeWebSocketSignedAction({ ...action, proof: { ...action.proof, algorithm: "none" } }, session),
    validateRemoteRuntimeWebSocketSignedAction({ ...action, proof: { ...action.proof, signature: "" } }, session),
  ]

  assert.deepEqual(validateRemoteRuntimeWebSocketSignedAction(action, session), { ok: true, value: action })
  assert.equal(
    failures.every((result) => !result.ok),
    true,
  )
})
