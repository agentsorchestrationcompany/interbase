import assert from "node:assert/strict"
import { test } from "bun:test"
import { runtimeWebSocketProtocolVersion } from "@interbase/runtime-protocol"
import type { RemoteRuntimeProtocolClientCommand } from "@interbase/remote-runtime-contracts"
import {
  createRemoteRuntimeKeyPossessionProofAuthority,
  createRemoteRuntimeKeyPossessionProofPayload,
  remoteRuntimeTransportProtocolVersion,
  serializeRemoteRuntimeAsymmetricPublicKey,
  validateSerializedRemoteRuntimeAsymmetricPublicKey,
  type RemoteRuntimeJsonValue,
} from "@interbase/remote-runtime-contracts"
import {
  createLocalRuntimeConnector,
  createRemoteRuntimeKeyPossessionProof,
  decryptRuntimeCommandPayload,
  encryptRuntimeCommand,
  generateRemoteRuntimeAsymmetricKeyPair,
  verifyRemoteRuntimeKeyPossessionProof,
  verifyRemoteRuntimeSetupKeyProofAuthority,
} from "../src/index.js"

const frame = {
  gatewayRuntimeAttachmentId: "gra_1",
  clientAttachmentId: "mda_1",
  operationClass: "metadataRead",
  payload: {
    method: "ping",
    payload: { message: "hello" },
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: "req_ping",
  },
  protocolVersion: remoteRuntimeTransportProtocolVersion,
  requestId: "req_outer",
  type: "runtime.operation",
} as const satisfies RemoteRuntimeJsonValue

function connector() {
  return createLocalRuntimeConnector({
    attachmentCapabilities: ["runtime.metadata"],
    connectorVersion: "0.1.0",
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    now: () => "2026-05-08T20:00:00.000Z",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: (command) => ({
      payload: { message: `pong:${command.requestId}`, timestamp: "2026-05-08T20:00:00.000Z" },
      requestId: command.requestId,
      success: true,
      type: "response",
    }),
  })
}

test("local connector reports status and forwards authorized runtime frames", async () => {
  const local = connector()
  assert.deepEqual(local.status(), {
    attachmentCapabilities: ["runtime.metadata"],
    connectorVersion: "0.1.0",
    gatewayRuntimeAttachmentId: "gra_1",
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    replay: "unsupported",
    requestId: "status_1",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sequence: 1,
    status: "online",
    type: "runtime.status",
  })
  assert.equal(local.status().sequence, 2)
  const result = await local.handleRuntimeOperation(frame)
  assert.equal(result.ok, true)
  assert.deepEqual(result.ok && result.envelope, {
    payload: { message: "pong:req_ping", timestamp: "2026-05-08T20:00:00.000Z" },
    requestId: "req_ping",
    success: true,
    type: "response",
  })
})

test("local connector authorizes decrypted commands and enforces idempotency", async () => {
  const auditEvents: unknown[] = []
  const shellCommand: RemoteRuntimeProtocolClientCommand = {
    method: "thread.shellCommand",
    payload: { args: [], command: "pwd", threadId: "thr_1" },
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: "req_shell",
  }
  const local = createLocalRuntimeConnector({
    attachmentCapabilities: ["runtime.metadata", "runtime.privilegedExecution"],
    audit: (event) => {
      auditEvents.push(event)
    },
    connectorVersion: "0.1.0",
    decryptRuntimeCommand: () => shellCommand,
    deviceTrustLevel: "trusted",
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    now: () => "2026-05-08T20:00:00.000Z",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: (command) => ({
      payload: { executed: command.requestId },
      requestId: command.requestId,
      success: true,
      type: "response",
    }),
  })
  const encryptedFrame = {
    encryptedPayload: {
      algorithm: "aes-256-gcm",
      ciphertext: "ciphertext",
      contentType: "runtimeWebSocketClientCommand",
      keyId: "key_1",
      nonce: "nonce",
    },
    gatewayRuntimeAttachmentId: "gra_1",
    idempotencyKey: "idem_shell_1",
    clientAttachmentId: "mda_1",
    operationClass: "privilegedExecution",
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: "req_outer_encrypted",
    type: "runtime.operation",
  } as const satisfies RemoteRuntimeJsonValue
  const result = await local.handleRuntimeOperation(encryptedFrame)
  const duplicate = await local.handleRuntimeOperation({ ...encryptedFrame, requestId: "req_outer_encrypted_retry" })
  assert.equal(result.ok, true)
  assert.deepEqual(result.ok && result.envelope, {
    payload: { executed: "req_shell" },
    requestId: "req_shell",
    success: true,
    type: "response",
  })
  assert.equal(duplicate.ok, false)
  assert.equal(!duplicate.ok && duplicate.error.type, "authorization.failed")
  assert.deepEqual(auditEvents, [
    {
      action: "runtime.command.forwarded",
      encrypted: true,
      gatewayRuntimeAttachmentId: "gra_1",
      idempotencyKeyPresent: true,
      method: "thread.shellCommand",
      clientAttachmentId: "mda_1",
      operationClass: "privilegedExecution",
      outerRequestId: "req_outer_encrypted",
      requestId: "req_shell",
      subcommand: null,
    },
    {
      action: "runtime.command.denied",
      encrypted: true,
      gatewayRuntimeAttachmentId: "gra_1",
      idempotencyKeyPresent: true,
      method: "thread.shellCommand",
      clientAttachmentId: "mda_1",
      operationClass: "privilegedExecution",
      outerRequestId: "req_outer_encrypted_retry",
      reason: "Runtime operation idempotency key has already been used.",
      requestId: "req_shell",
      subcommand: null,
    },
  ])
})

test("local connector applies gateway-stamped trust and structured subcommand audits", async () => {
  const sensitiveCommand: RemoteRuntimeProtocolClientCommand = {
    method: "session.messages",
    payload: { limit: 50, sessionId: "ses_1" },
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: "req_messages",
  }
  const sensitive = createLocalRuntimeConnector({
    attachmentCapabilities: ["runtime.sensitiveRead"],
    connectorVersion: "0.1.0",
    decryptRuntimeCommand: () => sensitiveCommand,
    deviceTrustLevel: "paired",
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    now: () => "2026-05-08T20:00:00.000Z",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: () => ({
      payload: {
        messages: [],
        pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
        sessionId: "ses_1",
      },
      requestId: "req_messages",
      success: true,
      type: "response",
    }),
  })
  assert.equal(
    await sensitive
      .handleRuntimeOperation({
        deviceTrustLevel: "trusted",
        encryptedPayload: {
          algorithm: "aes-256-gcm",
          ciphertext: "ciphertext",
          contentType: "runtimeWebSocketClientCommand",
          keyId: "key_1",
          nonce: "nonce",
        },
        gatewayRuntimeAttachmentId: "gra_1",
        clientAttachmentId: "mda_1",
        operationClass: "sensitiveRead",
        protocolVersion: remoteRuntimeTransportProtocolVersion,
        requestId: "req_outer_messages",
        type: "runtime.operation",
      })
      .then((response) => response.ok),
    true,
  )

  const auditEvents: unknown[] = []
  const provider = createLocalRuntimeConnector({
    attachmentCapabilities: ["runtime.mutate"],
    audit: (event) => {
      auditEvents.push(event)
    },
    connectorVersion: "0.1.0",
    decryptRuntimeCommand: () => ({
      method: "providerModel.command",
      payload: { command: { model: "gpt-5.4", type: "model.set" }, prompt: "", sessionId: "ses_1" },
      protocolVersion: runtimeWebSocketProtocolVersion,
      requestId: "req_model_set",
    }),
    deviceTrustLevel: "trusted",
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    now: () => "2026-05-08T20:00:00.000Z",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: (command) => ({
      payload: { updated: true },
      requestId: command.requestId,
      success: true,
      type: "response",
    }),
  })
  assert.equal(
    await provider
      .handleRuntimeOperation({
        encryptedPayload: {
          algorithm: "aes-256-gcm",
          ciphertext: "ciphertext",
          contentType: "runtimeWebSocketClientCommand",
          keyId: "key_1",
          nonce: "nonce",
        },
        gatewayRuntimeAttachmentId: "gra_1",
        idempotencyKey: "idem_model_set",
        clientAttachmentId: "mda_1",
        operationClass: "mutation",
        protocolVersion: remoteRuntimeTransportProtocolVersion,
        requestId: "req_outer_model_set",
        type: "runtime.operation",
      })
      .then((response) => response.ok),
    true,
  )
  assert.deepEqual(auditEvents, [
    {
      action: "runtime.command.forwarded",
      encrypted: true,
      gatewayRuntimeAttachmentId: "gra_1",
      idempotencyKeyPresent: true,
      method: "providerModel.command",
      clientAttachmentId: "mda_1",
      operationClass: "mutation",
      outerRequestId: "req_outer_model_set",
      requestId: "req_model_set",
      subcommand: "model.set",
    },
  ])
})

test("local connector rejects encrypted frames without decryption or valid policy", async () => {
  const encryptedFrame = {
    encryptedPayload: {
      algorithm: "aes-256-gcm",
      ciphertext: "ciphertext",
      contentType: "runtimeWebSocketClientCommand",
      keyId: "key_1",
      nonce: "nonce_1",
    },
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    operationClass: "metadataRead",
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: "req_outer_encrypted",
    type: "runtime.operation",
  } as const satisfies RemoteRuntimeJsonValue
  assert.equal((await connector().handleRuntimeOperation(encryptedFrame)).ok, false)
  const denied = createLocalRuntimeConnector({
    attachmentCapabilities: ["runtime.metadata", "runtime.privilegedExecution"],
    connectorVersion: "0.1.0",
    decryptRuntimeCommand: () => ({
      method: "thread.shellCommand",
      payload: { args: [], command: "pwd", threadId: "thr_1" },
      protocolVersion: runtimeWebSocketProtocolVersion,
      requestId: "req_shell",
    }),
    deviceTrustLevel: "trusted",
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    now: () => "2026-05-08T20:00:00.000Z",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: () => {
      throw new Error("unauthorized encrypted command should not execute")
    },
  })
  assert.equal((await denied.handleRuntimeOperation(encryptedFrame)).ok, false)
  const invalidDecryption = createLocalRuntimeConnector({
    attachmentCapabilities: ["runtime.metadata"],
    connectorVersion: "0.1.0",
    decryptRuntimeCommand: () => ({ method: "ping" }) as never,
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    now: () => "2026-05-08T20:00:00.000Z",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: () => {
      throw new Error("invalid decrypted command should not execute")
    },
  })
  assert.equal((await invalidDecryption.handleRuntimeOperation(encryptedFrame)).ok, false)
  const throwingDecryption = createLocalRuntimeConnector({
    attachmentCapabilities: ["runtime.metadata"],
    connectorVersion: "0.1.0",
    decryptRuntimeCommand: () => {
      throw new Error("decrypt failed")
    },
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    now: () => "2026-05-08T20:00:00.000Z",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: () => {
      throw new Error("throwing decrypted command should not execute")
    },
  })
  assert.equal((await throwingDecryption.handleRuntimeOperation(encryptedFrame)).ok, false)
})

test("local connector rejects malformed, mismatched, oversized, and unauthorized frames", async () => {
  const local = connector()
  assert.equal((await local.handleRuntimeOperation({ type: "heartbeat" })).ok, false)
  assert.equal((await local.handleRuntimeOperation({ ...frame, protocolVersion: "future" })).ok, false)
  assert.equal((await local.handleRuntimeOperation({ ...frame, requestId: "tiny" }, 8)).ok, false)
  assert.equal((await local.handleRuntimeOperation({ ...frame, gatewayRuntimeAttachmentId: "gra_other" })).ok, false)
  assert.equal((await local.handleRuntimeOperation({ ...frame, clientAttachmentId: "mda_other" })).ok, false)
  const denied = await local.handleRuntimeOperation({
    ...frame,
    operationClass: "metadataRead",
    payload: {
      method: "thread.shellCommand",
      payload: { args: [], command: "pwd", threadId: "thr_1" },
      protocolVersion: runtimeWebSocketProtocolVersion,
      requestId: "req_shell",
    },
    requestId: "req_shell_outer",
  })
  assert.equal(denied.ok, false)
  assert.equal(!denied.ok && denied.error.type, "authorization.failed")
})

test("local connector validates runtime response envelopes", async () => {
  const malformedResponse = createLocalRuntimeConnector({
    attachmentCapabilities: ["runtime.metadata"],
    connectorVersion: "0.1.0",
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    now: () => "2026-05-08T20:00:00.000Z",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sendRuntimeCommand: () => ({ requestId: "req_ping", type: "response" }) as never,
  })
  assert.equal((await malformedResponse.handleRuntimeOperation(frame)).ok, false)
  for (const response of [
    null,
    { payload: {}, requestId: "wrong", success: true, type: "response" },
    { payload: { echoed: "req_ping" }, requestId: "req_ping", success: true, type: "response" },
    { payload: {}, requestId: "req_ping", success: "yes", type: "response" },
    {
      event: {
        eventType: "session.created",
        payload: {},
        sequence: 1,
        sessionId: "ses_1",
        timestamp: "2026-05-08T20:00:00.000Z",
      },
      type: "event",
    },
    {
      delivery: {
        id: "delivery_1",
        mode: "liveOnly",
        origin: { kind: "runtime" },
        payload: { kind: "notification", notification: {} },
      },
      type: "delivery",
    },
    { payload: {}, requestId: "srv_1", type: "serverRequest" },
    { error: null, requestId: "req_ping", success: false, type: "error" },
    { type: "future" },
  ]) {
    const invalid = createLocalRuntimeConnector({
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "0.1.0",
      gatewayRuntimeAttachmentId: "gra_1",
      clientAttachmentId: "mda_1",
      now: () => "2026-05-08T20:00:00.000Z",
      runtimeApiVersion: runtimeWebSocketProtocolVersion,
      sendRuntimeCommand: () => response as never,
    })
    assert.equal((await invalid.handleRuntimeOperation(frame)).ok, false)
  }
  for (const response of [
    {
      error: { code: "PROTOCOL_ERROR", message: "bad", recoverable: false },
      requestId: "req_ping",
      success: false,
      type: "error",
    },
    { timestamp: "2026-05-08T20:00:00.000Z", type: "heartbeat" },
    {
      expectedVersion: runtimeWebSocketProtocolVersion,
      message: "Mismatch",
      receivedVersion: "future",
      type: "protocolVersionMismatch",
    },
  ]) {
    const allowed = createLocalRuntimeConnector({
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "0.1.0",
      gatewayRuntimeAttachmentId: "gra_1",
      clientAttachmentId: "mda_1",
      now: () => "2026-05-08T20:00:00.000Z",
      runtimeApiVersion: runtimeWebSocketProtocolVersion,
      sendRuntimeCommand: () => response as never,
    })
    assert.equal((await allowed.handleRuntimeOperation(frame)).ok, true)
  }
})

test("local connector applies live revocation and gateway disconnect recovery", async () => {
  const local = connector()
  local.disconnectGateway()
  assert.equal((await local.handleRuntimeOperation(frame)).ok, false)
  assert.equal(local.status().status, "unavailable")
  local.reconnectGateway()
  assert.equal((await local.handleRuntimeOperation(frame)).ok, true)
  const revoked = local.revoke()
  assert.equal(revoked.type, "attachment.revoked")
  local.reconnectGateway()
  assert.equal((await local.handleRuntimeOperation(frame)).ok, false)
  assert.equal(local.status().status, "revoked")
})

test("remote runtime encryption helpers round-trip commands without gateway-readable payloads", async () => {
  const key = new Uint8Array(32).fill(7)
  const command = frame.payload
  const encrypted = await encryptRuntimeCommand(command, { key, keyId: "key_1", nonce: new Uint8Array(12).fill(1) })
  const decrypted = await decryptRuntimeCommandPayload(encrypted, { key, keyId: "key_1" })
  const wrongKey = await decryptRuntimeCommandPayload(encrypted, { key: new Uint8Array(32).fill(8), keyId: "key_1" })
  const wrongId = await decryptRuntimeCommandPayload(encrypted, { key, keyId: "key_2" })
  const malformed = await decryptRuntimeCommandPayload({ ...encrypted, ciphertext: "*!" }, { key, keyId: "key_1" })
  const randomNonceEncrypted = await encryptRuntimeCommand(command, {
    key: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    keyId: "key_1",
  })
  const invalidPayload = await decryptRuntimeCommandPayload(
    { ...encrypted, algorithm: "none" },
    { key, keyId: "key_1" },
  )

  assert.equal(encrypted.algorithm, "aes-256-gcm")
  assert.equal(encrypted.contentType, "runtimeWebSocketClientCommand")
  assert.equal(encrypted.keyId, "key_1")
  assert.equal(encrypted.nonce.length > 0, true)
  assert.equal(encrypted.ciphertext.includes("hello"), false)
  assert.equal(decrypted.ok, true)
  assert.deepEqual(decrypted.ok && decrypted.value, command)
  assert.equal(wrongKey.ok, false)
  assert.equal(!wrongKey.ok && wrongKey.error.code, "AUTHORIZATION_FAILED")
  assert.equal(wrongId.ok, false)
  assert.equal(!wrongId.ok && wrongId.error.message, "Encrypted runtime key id does not match.")
  assert.equal(malformed.ok, false)
  assert.equal(randomNonceEncrypted.nonce.length > 0, true)
  assert.equal(invalidPayload.ok, false)
  await assert.rejects(() => encryptRuntimeCommand({ method: "ping" } as never, { key, keyId: "key_1" }), /requestId/)
  await assert.rejects(() => encryptRuntimeCommand(command, { key, keyId: "" }), /key id/)
  await assert.rejects(() => encryptRuntimeCommand(command, { key: new Uint8Array(16), keyId: "key_1" }), /32 bytes/)
})

test("remote runtime keypair and possession proof helpers verify generated key authority", async () => {
  await assert.rejects(
    () =>
      generateRemoteRuntimeAsymmetricKeyPair({
        createdAt: "2026-05-14T00:00:00.000Z",
        keyId: "",
        purpose: "remoteRuntimeRequestSigning",
      }),
    /key id/,
  )
  await assert.rejects(
    () =>
      generateRemoteRuntimeAsymmetricKeyPair({
        createdAt: "2026-05-14T00:00:00.000Z",
        keyId: "mk_bad",
        purpose: "owner" as never,
      }),
    /purpose/,
  )
  const generated = await generateRemoteRuntimeAsymmetricKeyPair({
    createdAt: "2026-05-14T00:00:00.000Z",
    keyId: "mk_proof_1",
    purpose: "remoteRuntimeRequestSigning",
  })
  const serialized = serializeRemoteRuntimeAsymmetricPublicKey(generated.publicKey)
  const parsed = validateSerializedRemoteRuntimeAsymmetricPublicKey(serialized)
  const payload = {
    challengeId: "mpc_1",
    connectorVersion: null,
    deviceName: "Riley's iPhone",
    keyId: generated.publicKey.keyId,
    nonce: "nonce_1",
    publicKey: serialized,
    purpose: generated.publicKey.purpose,
    runtimeInstallationId: "rti_1",
    timestamp: "2026-05-14T00:00:00.000Z",
  } as const
  const proof = await createRemoteRuntimeKeyPossessionProof({ payload, privateKey: generated.privateKey })
  const previousClientProof = await createRemoteRuntimeKeyPossessionProof({
    payload,
    payloadCompatibility: "previousClient",
    privateKey: generated.privateKey,
  })
  const authority = createRemoteRuntimeKeyPossessionProofAuthority({ keyProof: proof, publicKey: serialized })
  const previousClientAuthority = createRemoteRuntimeKeyPossessionProofAuthority({
    keyProof: previousClientProof,
    publicKey: serialized,
  })
  await assert.rejects(
    () =>
      createRemoteRuntimeKeyPossessionProof({
        payload: { ...payload, keyId: "mk_other" },
        privateKey: generated.privateKey,
      }),
    /key does not match/,
  )
  await assert.rejects(
    () =>
      createRemoteRuntimeKeyPossessionProof({
        payload,
        privateKey: { ...generated.privateKey, privateKey: "not*base64" },
      }),
    /Invalid base64url value/,
  )

  assert.equal(generated.privateKey.encoding, "pkcs8-base64url")
  assert.equal(parsed.ok, true)
  assert.equal(parsed.ok && parsed.value.keyId, "mk_proof_1")
  assert.equal(
    await verifyRemoteRuntimeKeyPossessionProof({
      nowMs: Date.parse(payload.timestamp),
      payload,
      proof,
      publicKey: generated.publicKey,
    }),
    true,
  )
  assert.equal(
    await verifyRemoteRuntimeSetupKeyProofAuthority({
      authority,
      challengeId: payload.challengeId,
      connectorVersion: payload.connectorVersion,
      deviceName: payload.deviceName,
      nowMs: Date.parse(payload.timestamp),
      publicKey: generated.publicKey,
      runtimeInstallationId: payload.runtimeInstallationId,
    }),
    true,
  )
  assert.equal(
    await verifyRemoteRuntimeSetupKeyProofAuthority({
      authority: previousClientAuthority,
      challengeId: payload.challengeId,
      connectorVersion: payload.connectorVersion,
      deviceName: payload.deviceName,
      nowMs: Date.parse(payload.timestamp),
      publicKey: generated.publicKey,
      runtimeInstallationId: payload.runtimeInstallationId,
    }),
    true,
  )
  assert.equal(
    await verifyRemoteRuntimeSetupKeyProofAuthority({
      authority,
      challengeId: "mpc_other",
      connectorVersion: payload.connectorVersion,
      deviceName: payload.deviceName,
      nowMs: Date.parse(payload.timestamp),
      publicKey: generated.publicKey,
      runtimeInstallationId: payload.runtimeInstallationId,
    }),
    false,
  )
  assert.equal(
    await verifyRemoteRuntimeKeyPossessionProof({
      nowMs: Date.parse(payload.timestamp),
      payload: { ...payload, challengeId: "mpc_other" },
      proof,
      publicKey: generated.publicKey,
    }),
    false,
  )
  assert.equal(
    await verifyRemoteRuntimeKeyPossessionProof({
      nowMs: Date.parse("2026-05-14T00:10:01.000Z"),
      payload,
      proof,
      publicKey: generated.publicKey,
    }),
    false,
  )
  assert.equal(
    await verifyRemoteRuntimeKeyPossessionProof({
      nowMs: Date.parse(payload.timestamp),
      payload: { ...payload, timestamp: "bad" },
      proof: { ...proof, timestamp: "bad" },
      publicKey: generated.publicKey,
    }),
    false,
  )
  assert.equal(
    await verifyRemoteRuntimeKeyPossessionProof({
      nowMs: Date.parse(payload.timestamp),
      payload: { ...payload, purpose: "runtimeResponseSigning" },
      proof,
      publicKey: generated.publicKey,
    }),
    false,
  )
  assert.equal(
    await verifyRemoteRuntimeKeyPossessionProof({
      nowMs: Date.parse(payload.timestamp),
      payload,
      proof: { ...proof, signature: "not*base64" },
      publicKey: generated.publicKey,
    }),
    false,
  )
  assert.equal(
    createRemoteRuntimeKeyPossessionProofPayload({
      challengeId: null,
      connectorVersion: null,
      deviceName: null,
      keyId: generated.publicKey.keyId,
      nonce: "nonce_2",
      publicKey: serialized,
      purpose: generated.publicKey.purpose,
      runtimeInstallationId: null,
      timestamp: payload.timestamp,
    }).includes("challengeId:"),
    true,
  )
})
