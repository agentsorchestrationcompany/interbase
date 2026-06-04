import assert from "node:assert/strict"
import { test } from "bun:test"
import { runtimeWebSocketProtocolVersion, type RuntimeWebSocketServerEnvelope } from "@interbase/runtime-protocol"
import {
  createRuntimeStatusFrame,
  parseRemoteRuntimeClientAttachment,
  remoteRuntimeTransportProtocolVersion,
  type RemoteRuntimeTransportFailureEnvelope,
  type GatewayRuntimeAttachmentRegistrationRequest,
  type RemoteRuntimeClientAttachmentRequest,
  type RemoteRuntimeJsonValue,
} from "@interbase/remote-runtime-contracts"
import {
  createRemoteRuntimeGatewayRouter,
  createRemoteRuntimeSocketBridge,
  validateGatewayRuntimeAttachmentRegistrationRequest,
  validateRemoteRuntimeClientAttachmentRequest,
  type GatewayAuditEvent,
  type RuntimeOperationFrame,
} from "../src/index.js"

const runtimeRequest: GatewayRuntimeAttachmentRegistrationRequest = {
  accountId: "acct_1",
  attachmentCapabilities: ["runtime.metadata"],
  connectorVersion: "0.1.0",
  directoryId: "dir_1",
  directoryPath: "/Users/rk/project",
  protocolVersion: remoteRuntimeTransportProtocolVersion,
  requestId: "req_runtime_attach",
  runtimeInstallationId: "rti_1",
  ticket: "runtime_ticket",
}

const mobileRequest: RemoteRuntimeClientAttachmentRequest = {
  accountId: "acct_1",
  protocolVersion: remoteRuntimeTransportProtocolVersion,
  requestId: "req_mobile_attach",
  runtimeInstallationId: "rti_1",
  ticket: "mobile_ticket",
  trustedRuntimeClientId: "tmd_1",
}

const operationFrame = {
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

const authorizedOperationFrame = {
  ...operationFrame,
  deviceTrustLevel: "paired",
  replyTarget: { kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId: "mda_1" },
} satisfies RuntimeOperationFrame

function createAuditedRouter(overrides: Partial<Parameters<typeof createRemoteRuntimeGatewayRouter>[0]> = {}) {
  const auditEvents: GatewayAuditEvent[] = []
  const attachmentIds = { gra: 0, mda: 0 }
  const router = createRemoteRuntimeGatewayRouter({
    audit: (event) => {
      auditEvents.push(event)
    },
    authorizeRemoteRuntimeClientAttachment: (request) => request.ticket === "mobile_ticket",
    authorizeRuntimeAttachment: (request) => request.ticket === "runtime_ticket",
    createAttachmentId: (prefix) => {
      attachmentIds[prefix] += 1
      return `${prefix}_${attachmentIds[prefix]}`
    },
    maxOperationsPerRemoteRuntimeClientAttachment: 2,
    now: () => "2026-05-08T20:00:00.000Z",
    ...overrides,
  })
  return { auditEvents, router }
}

function expectRuntimeAttachment(gatewayRuntimeAttachmentId: string, status = "online") {
  return {
    accountId: runtimeRequest.accountId,
    attachmentCapabilities: runtimeRequest.attachmentCapabilities,
    connectorVersion: runtimeRequest.connectorVersion,
    deviceTrustLevel: null,
    directoryId: runtimeRequest.directoryId,
    directoryPath: runtimeRequest.directoryPath,
    gatewayRuntimeAttachmentId,
    runtimeInstallationId: runtimeRequest.runtimeInstallationId,
    status,
  }
}

function expectAttachment(clientAttachmentId: string, gatewayRuntimeAttachmentId: string) {
  return {
    accountId: mobileRequest.accountId,
    deviceTrustLevel: "paired",
    gatewayRuntimeAttachmentId,
    clientAttachmentId,
    runtimeInstallationId: mobileRequest.runtimeInstallationId,
    status: "attached",
    trustedRuntimeClientId: mobileRequest.trustedRuntimeClientId,
  }
}

test("gateway router generates unguessable attachment ids by default", () => {
  const router = createRemoteRuntimeGatewayRouter({
    authorizeRemoteRuntimeClientAttachment: (request) => request.ticket === "mobile_ticket",
    authorizeRuntimeAttachment: (request) => request.ticket === "runtime_ticket",
    now: () => "2026-05-08T20:00:00.000Z",
  })

  const runtime = router.attachRuntime(runtimeRequest)
  assert.equal(runtime.ok, true)
  assert.match(runtime.ok ? runtime.attachment.gatewayRuntimeAttachmentId : "", /^gra_[A-Za-z0-9_-]{20,}$/)
  assert.notEqual(runtime.ok && runtime.attachment.gatewayRuntimeAttachmentId, "gra_1")

  const mobile = router.attachRemoteRuntimeClient(mobileRequest)
  assert.equal(mobile.ok, true)
  assert.match(mobile.ok ? mobile.attachment.clientAttachmentId : "", /^mda_[A-Za-z0-9_-]{20,}$/)
  assert.notEqual(mobile.ok && mobile.attachment.clientAttachmentId, "mda_1")
})

test("gateway router accepts authenticated runtime and remote runtime attachments", () => {
  const { auditEvents, router } = createAuditedRouter()
  const runtime = router.attachRuntime(runtimeRequest)
  const mobile = router.attachRemoteRuntimeClient(mobileRequest)

  assert.equal(runtime.ok, true)
  assert.equal(runtime.ok && runtime.attachment.gatewayRuntimeAttachmentId, "gra_1")
  assert.equal(mobile.ok, true)
  assert.equal(mobile.ok && mobile.attachment.clientAttachmentId, "mda_1")
  assert.deepEqual(mobile.ok && parseRemoteRuntimeClientAttachment(mobile.attachment), mobile.ok && mobile.attachment)
  assert.deepEqual(
    auditEvents.map((event) => event.action),
    ["remoteRuntime.attached", "remoteRuntime.client.attached"],
  )
  assert.deepEqual(
    auditEvents.map((event) => ({
      accountId: event.accountId,
      runtimeInstallationId: event.runtimeInstallationId,
      trustedRuntimeClientId: event.trustedRuntimeClientId ?? null,
    })),
    [
      { accountId: "acct_1", runtimeInstallationId: "rti_1", trustedRuntimeClientId: null },
      { accountId: "acct_1", runtimeInstallationId: "rti_1", trustedRuntimeClientId: "tmd_1" },
    ],
  )
})

test("gateway router resolves remote runtime attachments through the latest live runtime installation attachment", () => {
  const { router } = createAuditedRouter()
  assert.equal(router.latestRuntimeAttachmentForInstallation("rti_1"), null)
  assert.equal(router.attachRuntime(runtimeRequest).ok, true)
  assert.equal(router.latestRuntimeAttachmentForInstallation("rti_1")?.gatewayRuntimeAttachmentId, "gra_1")
  assert.equal(router.attachRuntime({ ...runtimeRequest, requestId: "req_runtime_attach_2" }).ok, true)
  assert.equal(router.latestRuntimeAttachmentForInstallation("rti_1")?.gatewayRuntimeAttachmentId, "gra_2")
  const mobile = router.attachRemoteRuntimeClient(mobileRequest)
  assert.equal(mobile.ok, true)
  assert.equal(mobile.ok && mobile.attachment.gatewayRuntimeAttachmentId, "gra_2")
  router.revokeRuntimeAttachment("gra_1")
  assert.equal(router.latestRuntimeAttachmentForInstallation("rti_1")?.gatewayRuntimeAttachmentId, "gra_2")
  assert.equal(
    router.attachRemoteRuntimeClient({ ...mobileRequest, requestId: "req_mobile_attach_after_old_revoke" }).ok,
    true,
  )
  router.revokeRuntimeAttachment("gra_2")
  assert.equal(router.latestRuntimeAttachmentForInstallation("rti_1"), null)
  const unavailable = router.attachRemoteRuntimeClient({
    ...mobileRequest,
    requestId: "req_mobile_attach_after_revoke",
  })
  assert.equal(unavailable.ok, false)
  assert.equal(!unavailable.ok && unavailable.error.code, "RUNTIME_UNAVAILABLE")
})

test("gateway router rejects unauthorized and cross-runtime remote runtime attachment", () => {
  const { router } = createAuditedRouter()
  const unauthorizedRuntime = router.attachRuntime({ ...runtimeRequest, ticket: "bad" })
  assert.equal(unauthorizedRuntime.ok, false)
  assert.equal(
    !unauthorizedRuntime.ok && unauthorizedRuntime.error.message,
    "Runtime attachment ticket is invalid, expired, already consumed, or does not match this runtime installation.",
  )
  router.attachRuntime(runtimeRequest)
  const unauthorizedMobile = router.attachRemoteRuntimeClient({ ...mobileRequest, ticket: "bad" })
  assert.equal(unauthorizedMobile.ok, false)
  assert.equal(
    !unauthorizedMobile.ok && unauthorizedMobile.error.message,
    "Remote runtime attachment ticket is invalid, expired, already consumed, or does not match this trusted device.",
  )
  const wrongAccount = router.attachRemoteRuntimeClient({ ...mobileRequest, accountId: "acct_missing" })
  assert.equal(wrongAccount.ok, false)
  assert.equal(
    !wrongAccount.ok && wrongAccount.error.message,
    "Remote runtime attachment account does not match the live runtime attachment account.",
  )
  const missingRuntime = router.attachRemoteRuntimeClient({ ...mobileRequest, runtimeInstallationId: "rti_missing" })
  assert.equal(missingRuntime.ok, false)
  assert.equal(!missingRuntime.ok && missingRuntime.error.code, "RUNTIME_UNAVAILABLE")

  const limited = createAuditedRouter({ maxRemoteRuntimeClientAttachmentsPerRuntime: 1 }).router
  limited.attachRuntime(runtimeRequest)
  assert.equal(limited.attachRemoteRuntimeClient(mobileRequest).ok, true)
  const overLimit = limited.attachRemoteRuntimeClient({
    ...mobileRequest,
    requestId: "req_mobile_attach_2",
    trustedRuntimeClientId: "tmd_2",
  })
  assert.equal(overLimit.ok, false)
  assert.equal(
    !overLimit.ok && overLimit.error.message,
    "The live runtime attachment has reached its remote runtime attachment limit.",
  )

  const duplicateRuntimeAttachmentIdRouter = createAuditedRouter({
    createAttachmentId: (prefix) => (prefix === "gra" ? "gra_duplicate" : "mda_1"),
  }).router
  duplicateRuntimeAttachmentIdRouter.attachRuntime(runtimeRequest)
  duplicateRuntimeAttachmentIdRouter.attachRuntime({
    ...runtimeRequest,
    requestId: "req_runtime_attach_other",
    runtimeInstallationId: "rti_other",
  })
  const mismatchedRuntimeAttachment = duplicateRuntimeAttachmentIdRouter.attachRemoteRuntimeClient(mobileRequest)
  assert.equal(mismatchedRuntimeAttachment.ok, false)
  assert.equal(
    !mismatchedRuntimeAttachment.ok && mismatchedRuntimeAttachment.error.message,
    "Remote runtime attachment runtime installation does not match the live runtime attachment.",
  )

  const revokedDuplicateRuntimeRouter = createAuditedRouter({
    createAttachmentId: (prefix) => (prefix === "gra" ? "gra_duplicate" : "mda_1"),
  }).router
  revokedDuplicateRuntimeRouter.attachRuntime(runtimeRequest)
  revokedDuplicateRuntimeRouter.attachRuntime({
    ...runtimeRequest,
    requestId: "req_runtime_attach_revoked_other",
    runtimeInstallationId: "rti_other",
  })
  revokedDuplicateRuntimeRouter.revokeRuntimeAttachment("gra_duplicate")
  const revokedRuntimeAttachment = revokedDuplicateRuntimeRouter.attachRemoteRuntimeClient(mobileRequest)
  assert.equal(revokedRuntimeAttachment.ok, false)
  assert.equal(
    !revokedRuntimeAttachment.ok && revokedRuntimeAttachment.error.message,
    "The latest runtime attachment is revoked, not online.",
  )
})

test("gateway router handles mobile replacement, explicit revocation, and superseded runtimes", () => {
  const replacementRouter = createAuditedRouter({ maxRemoteRuntimeClientAttachmentsPerRuntime: 1 }).router
  replacementRouter.attachRuntime(runtimeRequest)
  const first = replacementRouter.attachRemoteRuntimeClient(mobileRequest)
  const replacement = replacementRouter.attachRemoteRuntimeClient({
    ...mobileRequest,
    requestId: "req_mobile_attach_reconnect",
  })
  assert.equal(first.ok, true)
  assert.equal(replacement.ok, true)
  assert.equal(replacementRouter.routeRuntimeOperation(operationFrame).ok, false)
  assert.equal(
    replacementRouter.routeRuntimeOperation({
      ...operationFrame,
      clientAttachmentId: "mda_2",
      requestId: "req_outer_replacement",
    }).ok,
    true,
  )

  const revokedRouter = createAuditedRouter({ maxRemoteRuntimeClientAttachmentsPerRuntime: 1 }).router
  revokedRouter.attachRuntime(runtimeRequest)
  assert.equal(revokedRouter.attachRemoteRuntimeClient(mobileRequest).ok, true)
  assert.equal(revokedRouter.revokeRemoteRuntimeClientAttachment("mda_1").length, 1)
  assert.deepEqual(revokedRouter.revokeRemoteRuntimeClientAttachment("mda_1"), [])
  assert.equal(
    revokedRouter.attachRemoteRuntimeClient({
      ...mobileRequest,
      requestId: "req_mobile_attach_2",
      trustedRuntimeClientId: "tmd_2",
    }).ok,
    true,
  )
  assert.deepEqual(revokedRouter.revokeRemoteRuntimeClientAttachment("mda_1"), [])

  const supersededRouter = createAuditedRouter().router
  supersededRouter.attachRuntime(runtimeRequest)
  supersededRouter.attachRemoteRuntimeClient(mobileRequest)
  supersededRouter.attachRuntime({ ...runtimeRequest, requestId: "req_runtime_attach_replacement" })
  const routed = supersededRouter.routeRuntimeOperation(operationFrame)
  assert.equal(routed.ok, false)
  assert.equal(!routed.ok && routed.error.code, "RUNTIME_UNAVAILABLE")
})

test("gateway router validates attachment protocols and request shapes before authorizing", () => {
  const { router } = createAuditedRouter()
  const runtime = router.attachRuntime({ ...runtimeRequest, protocolVersion: "2026-01-01" })
  assert.equal(runtime.ok, false)
  assert.equal(!runtime.ok && runtime.error.code, "PROTOCOL_MISMATCH")
  router.attachRuntime(runtimeRequest)
  const mobile = router.attachRemoteRuntimeClient({ ...mobileRequest, protocolVersion: "2026-01-01" })
  assert.equal(mobile.ok, false)
  assert.equal(!mobile.ok && mobile.error.code, "PROTOCOL_MISMATCH")

  const authorizationCalls: string[] = []
  const shapeRouter = createAuditedRouter({
    authorizeRemoteRuntimeClientAttachment: () => {
      authorizationCalls.push("mobile")
      return true
    },
    authorizeRuntimeAttachment: () => {
      authorizationCalls.push("runtime")
      return true
    },
  }).router
  assert.equal(shapeRouter.attachRuntime({ ...runtimeRequest, accountId: "" }).ok, false)
  shapeRouter.attachRuntime(runtimeRequest)
  assert.equal(shapeRouter.attachRemoteRuntimeClient({ ...mobileRequest, trustedRuntimeClientId: "" }).ok, false)
  assert.deepEqual(authorizationCalls, ["runtime"])

  const invalidRuntimeRequests: unknown[] = [
    null,
    { ...runtimeRequest, protocolVersion: "old" },
    { ...runtimeRequest, requestId: "" },
    { ...runtimeRequest, accountId: "" },
    { ...runtimeRequest, directoryId: "" },
    { ...runtimeRequest, directoryPath: "" },
    { ...runtimeRequest, runtimeInstallationId: "" },
    { ...runtimeRequest, connectorVersion: "" },
    { ...runtimeRequest, attachmentCapabilities: "runtime.metadata" },
    { ...runtimeRequest, attachmentCapabilities: [""] },
    { ...runtimeRequest, ticket: "" },
  ]
  for (const request of invalidRuntimeRequests)
    assert.equal(validateGatewayRuntimeAttachmentRegistrationRequest(request as RemoteRuntimeJsonValue).ok, false)
  assert.equal(validateGatewayRuntimeAttachmentRegistrationRequest(runtimeRequest).ok, true)

  const invalidMobileRequests: RemoteRuntimeJsonValue[] = [
    null,
    { ...mobileRequest, protocolVersion: "old" },
    { ...mobileRequest, requestId: "" },
    { ...mobileRequest, accountId: "" },
    { ...mobileRequest, runtimeInstallationId: "" },
    { ...mobileRequest, deviceTrustLevel: "owner" },
    { ...mobileRequest, trustedRuntimeClientId: "" },
    { ...mobileRequest, ticket: "" },
  ]
  for (const request of invalidMobileRequests)
    assert.equal(validateRemoteRuntimeClientAttachmentRequest(request).ok, false)
  assert.equal(validateRemoteRuntimeClientAttachmentRequest(mobileRequest).ok, true)
  assert.equal(validateRemoteRuntimeClientAttachmentRequest(mobileRequest).ok, true)
})

test("gateway router routes metadata and opaque idempotent runtime operations", () => {
  const { auditEvents, router } = createAuditedRouter()
  router.attachRuntime(runtimeRequest)
  router.attachRemoteRuntimeClient(mobileRequest)
  const routed = router.routeRuntimeOperation(operationFrame)
  assert.equal(routed.ok, true)
  assert.equal(routed.ok && routed.destination.gatewayRuntimeAttachmentId, "gra_1")
  assert.deepEqual(router.runtimeSemanticState(), {
    clientAttachments: [expectAttachment("mda_1", "gra_1")],
    runtimeAttachments: [expectRuntimeAttachment("gra_1")],
    runtimeStatuses: [],
  })
  assert.equal(auditEvents.at(-1)?.action, "remoteRuntime.operation.routed")

  const encryptedMutation = {
    encryptedPayload: {
      algorithm: "aes-256-gcm",
      ciphertext: "ciphertext",
      contentType: "runtimeWebSocketClientCommand",
      keyId: "key_1",
      nonce: "nonce_1",
    },
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    operationClass: "mutation",
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: "req_outer_mutation",
    type: "runtime.operation",
  } satisfies RemoteRuntimeJsonValue
  assert.equal(router.routeRuntimeOperation(encryptedMutation).ok, false)
  assert.equal(router.routeRuntimeOperation({ ...encryptedMutation, idempotencyKey: "idem_mutation_1" }).ok, true)

  const duplicateRouter = createAuditedRouter({ maxOperationsPerRemoteRuntimeClientAttachment: 3 }).router
  duplicateRouter.attachRuntime(runtimeRequest)
  duplicateRouter.attachRemoteRuntimeClient(mobileRequest)
  assert.equal(
    duplicateRouter.routeRuntimeOperation({ ...encryptedMutation, idempotencyKey: "idem_mutation_1" }).ok,
    true,
  )
  const duplicate = duplicateRouter.routeRuntimeOperation({
    ...encryptedMutation,
    idempotencyKey: "idem_mutation_1",
    requestId: "req_outer_mutation_retry",
  })
  assert.equal(duplicate.ok, false)
  assert.equal(!duplicate.ok && duplicate.error.message, "Runtime operation idempotency key has already been used.")
})

test("gateway router records ordered runtime status and health transitions", () => {
  const { router } = createAuditedRouter()
  router.attachRuntime(runtimeRequest)
  router.attachRemoteRuntimeClient(mobileRequest)
  const status = createRuntimeStatusFrame({
    attachmentCapabilities: ["runtime.metadata"],
    connectorVersion: "0.1.0",
    gatewayRuntimeAttachmentId: "gra_1",
    replay: "unsupported",
    requestId: "status_1",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sequence: 1,
    status: "online",
  })
  assert.equal(router.recordRuntimeStatus(status).ok, true)
  const readStatus = router.runtimeAttachmentStatus("gra_1")
  assert.deepEqual(readStatus.ok && readStatus.status, status)
  assert.equal(router.runtimeAttachmentStatus("gra_1", "rti_1").ok, true)
  const mismatchedRuntimeInstallation = router.runtimeAttachmentStatus("gra_1", "rti_other")
  assert.equal(mismatchedRuntimeInstallation.ok, false)
  assert.equal(!mismatchedRuntimeInstallation.ok && mismatchedRuntimeInstallation.error.code, "AUTHORIZATION_FAILED")
  assert.equal(router.recordRuntimeStatus({ ...status, requestId: "status_3", sequence: 3 }).ok, false)
  assert.equal(router.recordRuntimeStatus({ type: "heartbeat" }).ok, false)
  assert.equal(
    router.recordRuntimeStatus({ ...status, gatewayRuntimeAttachmentId: "gra_missing", requestId: "status_missing" })
      .ok,
    false,
  )
  assert.equal(router.runtimeAttachmentStatus("gra_missing").ok, false)

  assert.equal(router.markRuntimeAttachmentDegraded("gra_1")?.status, "degraded")
  assert.equal(router.attachRemoteRuntimeClient({ ...mobileRequest, requestId: "req_mobile_degraded" }).ok, true)
  assert.equal(router.routeRuntimeOperation({ ...operationFrame, clientAttachmentId: "mda_2" }).ok, true)
  assert.deepEqual(router.runtimeSemanticState().runtimeAttachments, [expectRuntimeAttachment("gra_1", "degraded")])
  assert.equal(router.markRuntimeAttachmentUnavailable("gra_1")?.status, "unavailable")
  assert.equal(router.attachRemoteRuntimeClient({ ...mobileRequest, requestId: "req_mobile_unavailable" }).ok, false)
  assert.equal(router.routeRuntimeOperation({ ...operationFrame, clientAttachmentId: "mda_2" }).ok, false)
  assert.equal(router.runtimeAttachmentStatus("gra_1").ok, true)
  assert.deepEqual(router.runtimeSemanticState().runtimeAttachments, [expectRuntimeAttachment("gra_1", "unavailable")])
  assert.equal(router.markRuntimeAttachmentOnline("gra_1")?.status, "online")
  router.revokeRuntimeAttachment("gra_1")
  assert.equal(router.markRuntimeAttachmentOnline("gra_1"), null)
})

test("gateway router returns sorted semantic snapshots and enforces operation authorization", () => {
  const { router } = createAuditedRouter()
  const firstRuntime = router.attachRuntime(runtimeRequest)
  const secondRuntime = router.attachRuntime({
    ...runtimeRequest,
    requestId: "req_runtime_attach_2",
    runtimeInstallationId: "rti_2",
  })
  const secondMobile = router.attachRemoteRuntimeClient({
    ...mobileRequest,
    requestId: "req_mobile_attach_2",
    runtimeInstallationId: "rti_2",
    trustedRuntimeClientId: "tmd_2",
  })
  const firstMobile = router.attachRemoteRuntimeClient(mobileRequest)
  assert.equal(firstRuntime.ok, true)
  assert.equal(secondRuntime.ok, true)
  assert.equal(firstMobile.ok, true)
  assert.equal(secondMobile.ok, true)

  const secondStatus = createRuntimeStatusFrame({
    attachmentCapabilities: ["runtime.metadata"],
    connectorVersion: "0.1.0",
    gatewayRuntimeAttachmentId: "gra_2",
    replay: "unsupported",
    requestId: "status_2",
    runtimeApiVersion: runtimeWebSocketProtocolVersion,
    sequence: 1,
    status: "online",
  })
  const firstStatus = createRuntimeStatusFrame({
    ...secondStatus,
    gatewayRuntimeAttachmentId: "gra_1",
    requestId: "status_1",
  })
  assert.equal(router.recordRuntimeStatus(secondStatus).ok, true)
  assert.equal(router.recordRuntimeStatus(firstStatus).ok, true)
  const state = router.runtimeSemanticState()
  assert.deepEqual(
    state.clientAttachments.map((attachment) => attachment.clientAttachmentId),
    ["mda_1", "mda_2"],
  )
  assert.deepEqual(
    state.clientAttachments.map((attachment) => attachment.clientAttachmentId),
    ["mda_1", "mda_2"],
  )
  assert.deepEqual(
    state.runtimeAttachments.map((attachment) => attachment.gatewayRuntimeAttachmentId),
    ["gra_1", "gra_2"],
  )
  assert.deepEqual(
    state.runtimeStatuses.map((statusEntry) => statusEntry.gatewayRuntimeAttachmentId),
    ["gra_1", "gra_2"],
  )

  const limited = createAuditedRouter().router
  limited.attachRuntime(runtimeRequest)
  limited.attachRemoteRuntimeClient(mobileRequest)
  assert.equal(limited.routeRuntimeOperation({ type: "heartbeat" }).ok, false)
  assert.equal(limited.routeRuntimeOperation({ ...operationFrame, trustedGatewayHttpRequest: true }).ok, false)
  assert.equal(
    limited.routeRuntimeOperation({
      ...operationFrame,
      replyTarget: { gatewayHttpRequestId: "mda_1", kind: "gatewayHttpRequest" },
    }).ok,
    false,
  )
  assert.equal(limited.routeRuntimeOperation(operationFrame).ok, true)
  assert.equal(limited.routeRuntimeOperation({ ...operationFrame, requestId: "req_outer_2" }).ok, true)
  assert.equal(limited.routeRuntimeOperation({ ...operationFrame, requestId: "req_outer_3" }).ok, false)
  assert.equal(
    limited.routeRuntimeOperation({
      ...operationFrame,
      clientAttachmentId: "mda_missing",
      requestId: "req_outer_missing",
    }).ok,
    false,
  )
  const denied = createAuditedRouter().router
  denied.attachRuntime(runtimeRequest)
  denied.attachRemoteRuntimeClient(mobileRequest)
  assert.equal(
    denied.routeRuntimeOperation({
      ...operationFrame,
      operationClass: "metadataRead",
      payload: {
        method: "providerModel.command",
        payload: { command: { model: "gpt-5.4", type: "model.set" }, prompt: "", sessionId: "ses_1" },
        protocolVersion: runtimeWebSocketProtocolVersion,
        requestId: "req_model_set",
      },
      requestId: "req_denied",
    }).ok,
    false,
  )
  assert.equal(
    limited.routeRuntimeOperation({
      ...operationFrame,
      gatewayRuntimeAttachmentId: "gra_missing",
      clientAttachmentId: "mda_missing",
      requestId: "req_missing_both",
    }).ok,
    false,
  )
})

test("gateway router revokes mobile devices and runtime installations", () => {
  const { auditEvents, router } = createAuditedRouter()
  router.attachRuntime(runtimeRequest)
  router.attachRemoteRuntimeClient(mobileRequest)
  const revokedMobile = router.revokeTrustedRuntimeClient("tmd_1")
  assert.equal(revokedMobile.length, 1)
  assert.equal(revokedMobile[0]?.type, "attachment.revoked")
  assert.equal(router.routeRuntimeOperation(operationFrame).ok, false)
  assert.deepEqual(router.revokeTrustedRuntimeClient("tmd_missing"), [])
  assert.deepEqual(router.revokeTrustedRuntimeClient("tmd_1"), [])
  router.attachRemoteRuntimeClient(mobileRequest)
  const revokedRuntime = router.revokeRuntimeAttachment("gra_1")
  assert.equal(revokedRuntime.length, 2)
  assert.equal(router.attachRemoteRuntimeClient(mobileRequest).ok, false)
  assert.deepEqual(router.revokeRuntimeAttachment("gra_1"), [])
  assert.deepEqual(router.revokeRuntimeAttachment("gra_missing"), [])

  const second = createAuditedRouter().router
  second.attachRuntime(runtimeRequest)
  second.attachRemoteRuntimeClient(mobileRequest)
  const revokedByInstallation = second.revokeRuntimeInstallation("rti_1")
  assert.equal(revokedByInstallation.length, 2)
  assert.equal(second.routeRuntimeOperation(operationFrame).ok, false)
  assert.deepEqual(second.revokeRuntimeInstallation("rti_missing"), [])
  assert.deepEqual(
    auditEvents.slice(-2).map((event) => event.action),
    ["remoteRuntime.client.revoked", "remoteRuntime.revoked"],
  )
})

test("socket bridge delivers runtime operations and responses without owning semantic state", async () => {
  const runtimeMessages: Array<RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope> = []
  const mobileMessages: Array<RuntimeWebSocketServerEnvelope | RemoteRuntimeTransportFailureEnvelope> = []
  const { auditEvents, router } = createAuditedRouter()
  const bridge = createRemoteRuntimeSocketBridge({ router })

  const runtime = bridge.attachRuntime(runtimeRequest, {
    send: (message) => {
      runtimeMessages.push(message)
    },
  })
  assert.equal(runtime.ok, true)
  const mobile = bridge.attachRemoteRuntimeClient(mobileRequest, {
    send: (message) => {
      mobileMessages.push(message)
    },
  })
  assert.equal(mobile.ok, true)
  const routed = await bridge.routeRuntimeOperation(operationFrame)
  assert.equal(routed.ok, true)
  assert.deepEqual(runtimeMessages, [authorizedOperationFrame])

  const delivered = await bridge.deliverRuntimeEnvelope("mda_1", {
    payload: { ok: true },
    requestId: "req_ping",
    success: true,
    type: "response",
  })
  const deliveredFrame = await bridge.deliverRuntimeResponseFrame({
    envelope: { payload: { ok: "framed" }, requestId: "req_ping_frame", success: true, type: "response" },
    gatewayRuntimeAttachmentId: "gra_1",
    clientAttachmentId: "mda_1",
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: "req_response_frame",
    type: "runtime.response",
  })
  assert.equal(delivered.ok, true)
  assert.equal(deliveredFrame.ok, true)
  assert.deepEqual(mobileMessages, [
    { payload: { ok: true }, requestId: "req_ping", success: true, type: "response" },
    { payload: { ok: "framed" }, requestId: "req_ping_frame", success: true, type: "response" },
  ])
  assert.deepEqual(bridge.runtimeSemanticState(), {
    clientAttachments: [expectAttachment("mda_1", "gra_1")],
    runtimeAttachments: [expectRuntimeAttachment("gra_1")],
    runtimeStatuses: [],
  })
  assert.equal(auditEvents.at(-1)?.action, "remoteRuntime.operation.routed")
})

test("socket bridge revokes live endpoints and blocks future delivery", async () => {
  const runtimeMessages: Array<RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope> = []
  const mobileMessages: Array<RuntimeWebSocketServerEnvelope | RemoteRuntimeTransportFailureEnvelope> = []
  const bridge = createRemoteRuntimeSocketBridge({ router: createAuditedRouter().router })
  bridge.attachRuntime(runtimeRequest, {
    send: (message) => {
      runtimeMessages.push(message)
    },
  })
  bridge.attachRemoteRuntimeClient(mobileRequest, {
    send: (message) => {
      mobileMessages.push(message)
    },
  })

  const mobileRevoked = await bridge.revokeTrustedRuntimeClient("tmd_1")
  assert.equal(mobileRevoked.length, 1)
  assert.equal(mobileMessages[0]?.type, "attachment.revoked")
  assert.equal((await bridge.routeRuntimeOperation(operationFrame)).ok, false)
  assert.equal(
    (
      await bridge.deliverRuntimeEnvelope("mda_1", {
        payload: {},
        requestId: "req_ping",
        success: true,
        type: "response",
      })
    ).ok,
    false,
  )

  bridge.attachRemoteRuntimeClient(mobileRequest, {
    send: (message) => {
      mobileMessages.push(message)
    },
  })
  const runtimeRevoked = await bridge.revokeRuntimeAttachment("gra_1")
  assert.equal(runtimeRevoked.length, 2)
  assert.equal(runtimeMessages[0]?.type, "attachment.revoked")
  assert.equal((await bridge.routeRuntimeOperation(operationFrame)).ok, false)
})

test("socket bridge reports missing endpoints and malformed runtime envelopes", async () => {
  const { router } = createAuditedRouter()
  const bridge = createRemoteRuntimeSocketBridge({ router })
  assert.equal(bridge.attachRuntime({ ...runtimeRequest, ticket: "bad" }, { send: () => undefined }).ok, false)
  assert.equal(bridge.attachRemoteRuntimeClient(mobileRequest, { send: () => undefined }).ok, false)

  router.attachRuntime(runtimeRequest)
  assert.equal(bridge.attachRemoteRuntimeClient(mobileRequest, { send: () => undefined }).ok, true)
  const missingRuntimeEndpoint = await bridge.routeRuntimeOperation(operationFrame)
  assert.equal(missingRuntimeEndpoint.ok, false)
  assert.equal(!missingRuntimeEndpoint.ok && missingRuntimeEndpoint.error.type, "runtime.unavailable")

  const malformed = await bridge.deliverRuntimeEnvelope("mda_1", { requestId: "req_ping", type: "response" })
  const malformedFrame = await bridge.deliverRuntimeResponseFrame({
    clientAttachmentId: "mda_1",
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    requestId: "req_response_bad",
    type: "runtime.response",
  })
  assert.equal(malformed.ok, false)
  assert.equal(!malformed.ok && malformed.error.code, "VALIDATION_FAILED")
  assert.equal(malformedFrame.ok, false)
  assert.equal(!malformedFrame.ok && malformedFrame.error.code, "VALIDATION_FAILED")
  const detached = await bridge.deliverRuntimeEnvelope("mda_missing", {
    payload: {},
    requestId: "req_ping",
    success: true,
    type: "response",
  })
  assert.equal(detached.ok, false)
  assert.equal(!detached.ok && detached.error.type, "runtime.unavailable")

  assert.equal((await bridge.revokeRuntimeAttachment("gra_1")).length, 2)
  assert.deepEqual(await bridge.revokeTrustedRuntimeClient("tmd_1"), [])
  const directRouter = createAuditedRouter().router
  const directBridge = createRemoteRuntimeSocketBridge({ router: directRouter })
  directRouter.attachRuntime(runtimeRequest)
  directRouter.attachRemoteRuntimeClient(mobileRequest)
  assert.equal((await directBridge.revokeTrustedRuntimeClient("tmd_1")).length, 1)
  const directRuntimeRouter = createAuditedRouter().router
  const directRuntimeBridge = createRemoteRuntimeSocketBridge({ router: directRuntimeRouter })
  directRuntimeRouter.attachRuntime(runtimeRequest)
  directRuntimeRouter.attachRemoteRuntimeClient(mobileRequest)
  assert.equal((await directRuntimeBridge.revokeRuntimeAttachment("gra_1")).length, 2)

  const installRuntimeMessages: Array<RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope> = []
  const installMobileMessages: Array<RuntimeWebSocketServerEnvelope | RemoteRuntimeTransportFailureEnvelope> = []
  const installBridge = createRemoteRuntimeSocketBridge({ router: createAuditedRouter().router })
  installBridge.attachRuntime(runtimeRequest, {
    send: (message) => {
      installRuntimeMessages.push(message)
    },
  })
  installBridge.attachRemoteRuntimeClient(mobileRequest, {
    send: (message) => {
      installMobileMessages.push(message)
    },
  })
  assert.equal((await installBridge.revokeRuntimeInstallation("rti_1")).length, 2)
  assert.equal(installRuntimeMessages[0]?.type, "attachment.revoked")
  assert.equal(installMobileMessages[0]?.type, "attachment.revoked")
})

test("socket bridge handles stale endpoints and explicit mobile revocation", async () => {
  const throwingBridge = createRemoteRuntimeSocketBridge({ router: createAuditedRouter().router })
  throwingBridge.attachRuntime(runtimeRequest)
  throwingBridge.attachRemoteRuntimeClient(mobileRequest, {
    send: () => {
      throw new Error("mobile socket closed")
    },
  })
  const staleDelivery = await throwingBridge.deliverRuntimeEnvelope("mda_1", {
    payload: {},
    requestId: "req_ping",
    success: true,
    type: "response",
  })
  const deliveryAfterDelete = await throwingBridge.deliverRuntimeEnvelope("mda_1", {
    payload: {},
    requestId: "req_ping_after_delete",
    success: true,
    type: "response",
  })
  assert.equal(staleDelivery.ok, false)
  assert.equal(!staleDelivery.ok && staleDelivery.error.message, "Remote runtime attachment is unavailable.")
  assert.equal(deliveryAfterDelete.ok, false)

  const silentMessages: Array<RuntimeWebSocketServerEnvelope | RemoteRuntimeTransportFailureEnvelope> = []
  const silentBridge = createRemoteRuntimeSocketBridge({
    queueRuntimeOperationsWhenDisconnected: true,
    router: createAuditedRouter().router,
  })
  silentBridge.attachRuntime(runtimeRequest)
  silentBridge.attachRemoteRuntimeClient(mobileRequest, {
    send: (message) => {
      silentMessages.push(message)
    },
  })
  const silentRevocation = await silentBridge.revokeRemoteRuntimeClientAttachment("mda_1", { notifyEndpoint: false })
  assert.equal(silentRevocation.length, 1)
  assert.deepEqual(silentMessages, [])
  const silentPoll = silentBridge.pollRuntimeOperations("gra_1", 10, "rti_1")
  assert.equal(silentPoll.ok, true)
  assert.equal(silentPoll.ok && silentPoll.frames[0]?.type, "attachment.revoked")
  assert.deepEqual(await silentBridge.revokeRemoteRuntimeClientAttachment("mda_1"), [])

  const notifiedMessages: Array<RuntimeWebSocketServerEnvelope | RemoteRuntimeTransportFailureEnvelope> = []
  const notifiedRuntimeMessages: Array<RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope> = []
  const notifiedBridge = createRemoteRuntimeSocketBridge({ router: createAuditedRouter().router })
  notifiedBridge.attachRuntime(runtimeRequest, {
    send: (message) => {
      notifiedRuntimeMessages.push(message)
    },
  })
  notifiedBridge.attachRemoteRuntimeClient(mobileRequest, {
    send: (message) => {
      notifiedMessages.push(message)
    },
  })
  assert.equal((await notifiedBridge.revokeRemoteRuntimeClientAttachment("mda_1")).length, 1)
  assert.equal(notifiedMessages[0]?.type, "attachment.revoked")
  assert.equal(notifiedRuntimeMessages[0]?.type, "attachment.revoked")

  const runtimeSilentMessages: Array<RuntimeOperationFrame | RemoteRuntimeTransportFailureEnvelope> = []
  const runtimeSilentBridge = createRemoteRuntimeSocketBridge({ router: createAuditedRouter().router })
  runtimeSilentBridge.attachRuntime(runtimeRequest, {
    send: (message) => {
      runtimeSilentMessages.push(message)
    },
  })
  runtimeSilentBridge.attachRemoteRuntimeClient(mobileRequest, { send: () => undefined })
  assert.equal(
    (await runtimeSilentBridge.revokeRemoteRuntimeClientAttachment("mda_1", { notifyRuntimeEndpoint: false })).length,
    1,
  )
  assert.deepEqual(runtimeSilentMessages, [])
})

test("socket bridge can queue routed runtime operations for outbound polling connectors", async () => {
  const { router } = createAuditedRouter()
  const bridge = createRemoteRuntimeSocketBridge({ queueRuntimeOperationsWhenDisconnected: true, router })
  bridge.attachRuntime(runtimeRequest)
  router.attachRemoteRuntimeClient(mobileRequest)
  const routed = await bridge.routeRuntimeOperation(operationFrame)
  const mismatchedPoll = bridge.pollRuntimeOperations("gra_1", 1, "rti_other")
  const firstPoll = bridge.pollRuntimeOperations("gra_1", 1, "rti_1")
  const secondPoll = bridge.pollRuntimeOperations("gra_1", 1, "rti_1")
  const missingPoll = bridge.pollRuntimeOperations("gra_missing", 1)
  assert.equal(routed.ok, true)
  assert.equal(mismatchedPoll.ok, false)
  assert.equal(!mismatchedPoll.ok && mismatchedPoll.error.type, "authorization.failed")
  assert.deepEqual(firstPoll, { frames: [authorizedOperationFrame], ok: true })
  assert.deepEqual(secondPoll, { frames: [], ok: true })
  assert.equal(missingPoll.ok, false)
  assert.equal(!missingPoll.ok && missingPoll.error.type, "runtime.unavailable")
})

test("socket bridge handles stale runtime websocket endpoint and queue backpressure", async () => {
  const { router } = createAuditedRouter()
  const bridge = createRemoteRuntimeSocketBridge({ queueRuntimeOperationsWhenDisconnected: true, router })
  bridge.attachRuntime(runtimeRequest, {
    send: () => {
      throw new Error("socket closed")
    },
  })
  router.attachRemoteRuntimeClient(mobileRequest)
  const routed = await bridge.routeRuntimeOperation(operationFrame)
  assert.equal(routed.ok, true)
  assert.deepEqual(bridge.pollRuntimeOperations("gra_1", 1, "rti_1"), { frames: [authorizedOperationFrame], ok: true })

  const noQueueBridge = createRemoteRuntimeSocketBridge({ router: createAuditedRouter().router })
  noQueueBridge.attachRuntime(runtimeRequest, {
    send: () => {
      throw new Error("socket closed")
    },
  })
  noQueueBridge.attachRemoteRuntimeClient(mobileRequest, { send: () => undefined })
  const noQueue = await noQueueBridge.routeRuntimeOperation(operationFrame)
  assert.equal(noQueue.ok, false)
  assert.equal(!noQueue.ok && noQueue.error.type, "runtime.unavailable")

  const backpressureRouter = createAuditedRouter({ maxOperationsPerRemoteRuntimeClientAttachment: 5 }).router
  const backpressureBridge = createRemoteRuntimeSocketBridge({
    maxQueuedRuntimeOperationsPerRuntime: 1,
    queueRuntimeOperationsWhenDisconnected: true,
    router: backpressureRouter,
  })
  backpressureBridge.attachRuntime(runtimeRequest)
  backpressureRouter.attachRemoteRuntimeClient(mobileRequest)
  assert.equal((await backpressureBridge.routeRuntimeOperation(operationFrame)).ok, true)
  const second = await backpressureBridge.routeRuntimeOperation({
    ...operationFrame,
    requestId: "req_outer_backpressure",
    payload: { ...operationFrame.payload, requestId: "req_ping_backpressure" },
  })
  assert.equal(second.ok, false)
  assert.equal(!second.ok && second.error.message, "Runtime operation queue is full.")
})
