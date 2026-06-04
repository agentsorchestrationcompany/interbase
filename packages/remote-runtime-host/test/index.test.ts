import { describe, expect, test } from "bun:test"
import { execFile } from "node:child_process"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import remoteRuntimeTransportSchemaJson from "../schema/remote-runtime-transport.schema.json" with { type: "json" }
import {
  currentRemoteRuntimeSupportedVersions,
  remoteRuntimeHttpContractVersion,
  remoteRuntimeTransportProtocolVersion,
  previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
  runtimeOperationFrameReplyTarget,
  runtimeWebSocketRemoteRuntimeProtocolVersion,
  runtimeOwnerForRemoteRuntimeAttachment,
  supportedRemoteRuntimeTransportProtocolVersions,
  supportedRuntimeWebSocketRemoteRuntimeProtocolVersions,
  type GatewayRuntimeAttachment,
  type RemoteRuntimeJsonValue,
} from "@interbase/remote-runtime-contracts"
import { allowAllRemoteRuntimeEntitlementProvider } from "@interbase/remote-runtime-entitlements"
import { runtimeWebSocketProtocolVersion, type RuntimeWebSocketServerEnvelope } from "@interbase/runtime-protocol"
import {
  composeRemoteRuntimeHost,
  addRemoteRuntimeDirectoryAllowlistEntryToStore,
  buildRemoteRuntimeLaunchAgent,
  buildRemoteRuntimeDirectoryExplorerTree,
  canonicalRemoteRuntimeQuery,
  classifyRemoteRuntimeEnvelopeDeliveryFailure,
  createRemoteRuntimeClientAttachmentTracker,
  createRemoteRuntimeDirectoryAllowlistStore,
  createInMemoryRemoteRuntimeNonceReplayStore,
  createInMemoryRemoteRuntimeCommandIdempotencyStore,
  createRemoteRuntimeCommandFingerprint,
  createRemoteRuntimeCommandRegistry,
  createRemoteRuntimeRouteRegistry,
  createRemoteRuntimeHostEventMirror,
  createRemoteRuntimeSessionActivityMirror,
  createRemoteRuntimePollingIterable,
  createRemoteRuntimeRequestQueue,
  createRemoteRuntimeHostResolver,
  createRemoteRuntimeHostClient,
  createLocalGitStatusReader,
  createRemoteRuntimeSocketMessageQueue,
  createRemoteRuntimeCommandErrorEnvelope,
  createRemoteRuntimeSubscription,
  dispatchRemoteRuntimeRoute,
  defaultRemoteRuntimeFeatureConfig,
  authorizeRemoteRuntimeCommandWithPolicy,
  detachAllRemoteRuntimeClientAttachments,
  detachRemoteRuntimeClientAttachment,
  enqueueRemoteRuntimeRequest,
  hasRemoteRuntimeClientAttachment,
  installRemoteRuntimeLaunchAgent,
  isRemoteRuntimeHeartbeatMessage,
  isRemoteRuntimeProtocolMismatchCandidate,
  isRemoteRuntimeSessionActivityMirrorInput,
  remoteRuntimeGatewayRuntimeAttachmentSocketUrl,
  remoteRuntimeHeaderValue,
  remoteRuntimeReadSnapshotPath,
  remoteRuntimeEnvelopeRequestId,
  remoteRuntimeErrorEnvelopeFromTransportFailure,
  remoteRuntimeFeatureSet,
  remoteRuntimeOperationPolicies,
  remoteRuntimeOperationPolicyForCommand,
  remoteRuntimeReceivedApiVersions,
  remoteRuntimeTransportOperationalPolicy,
  remoteRuntimeHostJsonRequest,
  remoteRuntimeHostGitStatusPath,
  remoteRuntimeHostPagePath,
  remoteRuntimeHostSelectorPath,
  remoteRuntimeTransportSchemaArtifact,
  remoteRuntimeRequestTimedOut,
  observeRemoteRuntimeClientAttachment,
  normalizedRemoteRuntimeHeaders,
  parseRemoteRuntimeHostEventStream,
  parseRemoteRuntimeSocketJsonMessage,
  parseRemoteRuntimeSocketJsonMessageResult,
  parseOptionalRemoteRuntimeSocketJsonMessageResult,
  parseRemoteRuntimeHostMirroredEvent,
  parseRemoteRuntimeDirectoryAllowlistEntry,
  parseRemoteRuntimeDirectoryAllowlistState,
  parseRemoteRuntimeHost,
  parseRemoteRuntimeHostState,
  parseRemoteRuntimeHostLifecycleRuntimeState,
  parseRemoteRuntimeLaunchAgentState,
  parseRemoteRuntimeHostSseData,
  pickRemoteRuntimeDirectoriesWithPrompt,
  projectRemoteRuntimeMessagePartPayload,
  removeRemoteRuntimeLaunchAgent,
  removeRemoteRuntimeDirectoryAllowlistEntryFromStore,
  recordRemoteRuntimeSubscriptionDeliveryFailure,
  recordRemoteRuntimeSubscriptionDeliverySuccess,
  redactRemoteRuntimeTransportLogValue,
  recordRuntimeAttachmentHeartbeat,
  recordRuntimeAttachmentTimeout,
  resolveRemoteRuntimeHostCommand,
  runRemoteRuntimeConnectorSession,
  runRemoteRuntimeConnectorWebSocketMessageSession,
  runtimeOperationFrameReplyTarget as runtimeOperationFrameReplyTargetFromHost,
  resolveRemoteRuntimeCapabilitySelection,
  respondToRemoteRuntimeRequest,
  runRemoteRuntimeCommandWithIdempotency,
  runRemoteRuntimeCommand,
  selectReusableRemoteRuntimeStatus,
  sleepRemoteRuntime,
  searchRemoteRuntimeDirectories,
  selectRemoteRuntimeSetupDirectories,
  setRemoteRuntimeDirectoryAllowlistEntryEnabledInStore,
  sanitizeRemoteRuntimeMessagePartPayload,
  startRemoteRuntimesOnHost,
  startRemoteRuntimeHeartbeatRunner,
  stopRemoteRuntimeOnHost,
  streamRemoteRuntimeHostEvents,
  timeoutRemoteRuntimeRequest,
  validateGatewayRuntimeAttachmentRegistrationRequest,
  validateEncryptedRuntimePayload,
  validateRemoteRuntimeActiveChatsSnapshot,
  validateRemoteRuntimeChatMessagesSnapshot,
  validateRemoteRuntimeChatSnapshot,
  validateRemoteRuntimeGoalsSnapshot,
  validateRemoteRuntimeGitStatusSnapshot,
  validateRemoteRuntimeAliasesSnapshot,
  validateRemoteRuntimeProvidersSnapshot,
  validateRemoteRuntimeSendChatMessageRequest,
  validateRemoteRuntimeSendChatMessageResponse,
  validateRemoteRuntimeStartChatResponse,
  validateRemoteRuntimeCapabilitiesSnapshot,
  validateRemoteRuntimeDirectoriesSnapshot,
  validateRemoteRuntimeStatusSnapshot,
  validateRemoteRuntimeRealtimeEventEnvelope,
  validateRemoteRuntimeStartChatRequest,
  validateRemoteRuntimeUpdateChatResponse,
  validateRemoteRuntimeUpdateChatRequest,
  validateRemoteRuntimeClientAttachmentRequest,
  validateRuntimeCommand,
  validateRuntimeConnectionCandidate,
  validateRuntimeConnectionCandidateBootstrap,
  validateRuntimeOperationFrame,
  validateRuntimeResponseFrame,
  validateRuntimeStatusFrame,
  withRemoteRuntimeSetupTimeout,
  formatRemoteRuntimeDirectoryAllowlistEntry,
  isRemoteRuntimeRealtimeResourceRef,
  listRemoteRuntimeDirectoryAllowlistEntries,
  remoteRuntimeOperationFrameFromGateway,
  remoteRuntimeSessionFramesFromGateway,
  type RemoteRuntimeDirectoryAllowlistState,
  type RemoteRuntimeConnectorSessionClient,
  type RemoteRuntimeConnectorRuntimeOperationTraceEvent,
  type RemoteRuntimeSessionFrame,
  type RemoteRuntimeAttachment,
  type RemoteRuntimeHostLifecycleDeps,
  type RemoteRuntimeNonceReplayStore,
  type RemoteRuntimeRequest,
  type RemoteRuntimeRouteRegistration,
  type RemoteRuntimeCommandRegistration,
  type RemoteRuntimeFeatureConfig,
  type RemoteRuntimeHostAdapter,
  type RemoteRuntimeGatewaySemanticState,
  type GatewayAuditEvent,
  type GatewayAttachmentResult,
  type GatewayRouteResult,
  type RuntimeStatusResult,
  type RuntimeResponseFrame,
  type RemoteRuntimeSocketBridgeOptions,
  type RemoteRuntimeSocketEndpoint,
  type SocketBridgeDeliveryResult,
  type SocketBridgePollResult,
  type LocalRuntimeConnectorOptions,
  type LocalRuntimeConnectorResult,
  type LocalRuntimeConnectorAuditEvent,
  type RemoteRuntimeRealtimeEventEnvelope,
  type RemoteRuntimeStatusSnapshot,
  type RemoteRuntimeStartChatRequest,
} from "../src/index.js"

function mockFetch(
  fetcher: (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => Promise<Response>,
): typeof fetch {
  return fetcher as typeof fetch
}

const versions = { remoteRuntimeHttp: "1", remoteRuntimeTransport: "1", runtimeWebSocket: "1" } as const

async function runGit(cwd: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    execFile(
      "git",
      args,
      {
        cwd,
        env: {
          ...process.env,
          GIT_AUTHOR_EMAIL: "test@example.com",
          GIT_AUTHOR_NAME: "Test",
          GIT_COMMITTER_EMAIL: "test@example.com",
          GIT_COMMITTER_NAME: "Test",
        },
      },
      (error) => {
        if (error) reject(error)
        else resolve()
      },
    )
  })
}
const localAdapter = { id: "local-direct", versions } as const

function createTestAdapterRegistry<TAdapter extends RemoteRuntimeHostAdapter>(adapters: readonly TAdapter[] = []) {
  const adaptersById = new Map(adapters.map((adapter) => [adapter.id, adapter]))
  return { get: (id: string) => adaptersById.get(id) }
}

type FakeDirent = { readonly name: string; isDirectory(): boolean }

function fakeDir(name: string): FakeDirent {
  return { name, isDirectory: () => true }
}

function fakeFile(name: string): FakeDirent {
  return { name, isDirectory: () => false }
}

class FakeRemoteRuntimeSocket {
  readonly listeners = new Map<string, Array<(event?: { data?: string }) => void>>()

  addEventListener(type: "open", listener: () => void): void
  addEventListener(type: "close" | "error", listener: () => void): void
  addEventListener(type: "message", listener: (event?: { data?: string }) => void): void
  addEventListener(type: "open" | "close" | "error" | "message", listener: (event?: { data?: string }) => void): void {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  emit(type: "open" | "close" | "error" | "message", event?: { data?: string }): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
  }
}

function parseSocketText(data: string | undefined) {
  if (data === undefined) return { ok: false, error: new Error("missing message") } as const
  return { ok: true, value: data } as const
}

describe("remote runtime host composition", () => {
  test("defaults OSS mode to local-direct with allow-all entitlements", () => {
    expect(defaultRemoteRuntimeFeatureConfig()).toEqual({
      enabled: true,
      mode: "localDirect",
      adapter: "local-direct",
      entitlements: "allowAll",
    })
    expect(resolveRemoteRuntimeCapabilitySelection(defaultRemoteRuntimeFeatureConfig())).toEqual({
      enabled: true,
      mode: "localDirect",
      adapterId: "local-direct",
      entitlementProviderId: "allowAll",
    })
  })

  test("disabled config selects no adapter", async () => {
    const composition = composeRemoteRuntimeHost({
      config: { enabled: false, mode: "localDirect" },
      adapters: createTestAdapterRegistry([localAdapter]),
    })
    expect(composition.selection).toEqual({ enabled: false, mode: "disabled", entitlementProviderId: "disabled" })
    expect(composition.adapter).toBeUndefined()
    await expect(
      composition.entitlements.isAllowed("command", { environment: "oss", mode: "disabled" }),
    ).resolves.toMatchObject({ allowed: false, code: "REMOTE_RUNTIME_DISABLED" })
  })

  test("composes a local-direct adapter without branded mode names", () => {
    const composition = composeRemoteRuntimeHost({
      config: defaultRemoteRuntimeFeatureConfig(),
      adapters: createTestAdapterRegistry([localAdapter]),
    })
    expect(composition.selection.mode).toBe("localDirect")
    expect(composition.selection.adapterId).toBe("local-direct")
    expect(composition.adapter).toBe(localAdapter)
    expect(composition.entitlements).toBe(allowAllRemoteRuntimeEntitlementProvider)
  })

  test("custom mode requires an adapter id and registered adapter", () => {
    expect(() => resolveRemoteRuntimeCapabilitySelection({ enabled: true, mode: "custom" })).toThrow(
      "Remote runtime custom mode requires an adapter id.",
    )
    expect(() =>
      composeRemoteRuntimeHost({
        config: { enabled: true, mode: "custom", adapter: "private-hosted", entitlements: "allowAll" },
        adapters: createTestAdapterRegistry(),
      }),
    ).toThrow("Remote runtime adapter is not registered: private-hosted")
  })

  test("custom entitlements are resolved through registration only", async () => {
    const config: RemoteRuntimeFeatureConfig = {
      enabled: true,
      mode: "custom",
      adapter: "local-direct",
      entitlements: "custom",
    }
    expect(() => composeRemoteRuntimeHost({ config, adapters: createTestAdapterRegistry([localAdapter]) })).toThrow(
      "Remote runtime entitlement provider is not registered: custom",
    )
    const composition = composeRemoteRuntimeHost({
      config,
      adapters: createTestAdapterRegistry([localAdapter]),
      entitlements: { get: (id: string) => (id === "custom" ? allowAllRemoteRuntimeEntitlementProvider : undefined) },
    })
    await expect(
      composition.entitlements.isAllowed("runtimeUse", { environment: "interbase", mode: "custom" }),
    ).resolves.toEqual({ allowed: true })
  })

  test("maps remote runtime transport failures to runtime error envelopes", () => {
    expect(
      remoteRuntimeErrorEnvelopeFromTransportFailure({
        code: "RUNTIME_UNAVAILABLE",
        message: "Runtime is offline.",
        pairingAction: "retry",
        protocolVersion: "1",
        requestId: "request-1",
        terminal: false,
        type: "runtime.unavailable",
      }),
    ).toMatchObject({
      error: { code: "RUNTIME_UNAVAILABLE", recoverable: true },
      requestId: "request-1",
      success: false,
      type: "error",
    })
    expect(
      remoteRuntimeErrorEnvelopeFromTransportFailure({
        code: "AUTHORIZATION_FAILED",
        message: "Denied.",
        pairingAction: "keep",
        protocolVersion: "1",
        requestId: "request-2",
        terminal: false,
        type: "authorization.failed",
      }),
    ).toMatchObject({ error: { code: "POLICY_UNAVAILABLE" } })
    expect(
      remoteRuntimeErrorEnvelopeFromTransportFailure({
        code: "VALIDATION_FAILED",
        message: "Malformed.",
        pairingAction: "re_pair",
        protocolVersion: "1",
        requestId: "request-3",
        terminal: false,
        type: "pairing.invalid",
      }),
    ).toMatchObject({ error: { code: "POLICY_UNAVAILABLE", recoverable: false } })
    expect(
      remoteRuntimeErrorEnvelopeFromTransportFailure({
        code: "PAYLOAD_TOO_LARGE",
        message: "Too large.",
        pairingAction: "keep",
        protocolVersion: "1",
        requestId: "request-4",
        terminal: true,
        type: "runtime.command.failed",
      }),
    ).toMatchObject({ error: { code: "PROTOCOL_ERROR", recoverable: false } })
  })

  test("builds runtime command protocol error helpers", () => {
    expect(remoteRuntimeFeatureSet()).toEqual({
      activeChatProjection: true,
      commandEncryption: true,
      commandEncryptionStatus: true,
      trustedFrameAuthorization: true,
      liveRuntimeEvents: true,
      version: 6,
    })
    expect(
      createRemoteRuntimeCommandErrorEnvelope({
        code: "PROTOCOL_ERROR",
        message: "Runtime command envelope is malformed.",
        recoverable: false,
      }),
    ).toEqual({
      error: {
        code: "PROTOCOL_ERROR",
        message: "Runtime command envelope is malformed.",
        recoverable: false,
      },
      requestId: undefined,
      success: false,
      type: "error",
    })
    expect(
      createRemoteRuntimeCommandErrorEnvelope({
        code: "CAPABILITY_UNAVAILABLE",
        message: "Runtime method is not implemented.",
        recoverable: false,
        requestId: "request-1",
      }),
    ).toMatchObject({ error: { code: "CAPABILITY_UNAVAILABLE" }, requestId: "request-1" })
    expect(isRemoteRuntimeProtocolMismatchCandidate({ protocolVersion: "unsupported-version" })).toBe(true)
    expect(isRemoteRuntimeProtocolMismatchCandidate({ protocolVersion: "" })).toBe(false)
    expect(
      remoteRuntimeReceivedApiVersions({
        clientName: "mobile",
        clientVersion: "1.0.0",
        supportedRuntimeApiVersion: "1",
      }),
    ).toBe("1")
    expect(
      remoteRuntimeReceivedApiVersions({
        clientName: "mobile",
        clientVersion: "1.0.0",
        supportedRuntimeApiVersion: "1",
        supportedRuntimeApiVersions: ["1", "2"],
      }),
    ).toBe("1, 2")
  })

  test("owns remote runtime operation policy authorization", () => {
    const statusSnapshot: RemoteRuntimeStatusSnapshot = {
      allowedDirectories: [{ directoryId: "directory_1", path: "/workspace" }],
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      gatewayRuntimeAttachmentId: "attachment_1",
      lastHeartbeatAt: null,
      remoteRuntimeHttpVersion: "2026-05-14",
      runtimeInstallationId: "runtime_1",
      state: "online",
    }
    const startRequest: RemoteRuntimeStartChatRequest = {
      directoryId: "directory_1",
      idempotencyKey: "idem_1",
      model: null,
      providerId: null,
      requestId: "request_start",
      runtimeInstallationId: "runtime_1",
      title: null,
    }
    const realtimeEnvelope: RemoteRuntimeRealtimeEventEnvelope<"runtime.status.changed"> = {
      event: {
        eventType: "runtime.status.changed",
        gatewayRuntimeAttachmentId: "attachment_1",
        payload: {},
        resource: { kind: "runtime", runtimeInstallationId: "runtime_1" },
        runtimeInstallationId: "runtime_1",
        sequence: 1,
        timestamp: "2026-05-24T00:00:00.000Z",
      },
      protocolVersion: "1",
      type: "event",
    }
    const gatewayState: RemoteRuntimeGatewaySemanticState = {
      clientAttachments: [],
      runtimeAttachments: [],
      runtimeStatuses: [],
    }
    const auditEvent: GatewayAuditEvent = {
      action: "remoteRuntime.operation.routed",
      requestId: "request_audit",
      runtimeInstallationId: "runtime_1",
      timestamp: "2026-05-24T00:00:00.000Z",
    }
    const attachmentResult: GatewayAttachmentResult<{ readonly id: string }> = {
      attachment: { id: "attachment_1" },
      ok: true,
    }
    const routeResult: GatewayRouteResult = {
      error: {
        code: "RUNTIME_UNAVAILABLE",
        message: "offline",
        pairingAction: "retry",
        protocolVersion: "1",
        requestId: "request_route",
        terminal: false,
        type: "runtime.unavailable",
      },
      ok: false,
    }
    const runtimeStatusResult: RuntimeStatusResult = { error: routeResult.error, ok: false }
    const socketEndpoint: RemoteRuntimeSocketEndpoint<string> = { send: () => undefined }
    const socketOptions: RemoteRuntimeSocketBridgeOptions<{ readonly id: string }> = { router: { id: "router_1" } }
    const socketDelivery: SocketBridgeDeliveryResult = { ok: true }
    const socketPoll: SocketBridgePollResult = { frames: [], ok: true }
    const connectorAuditEvent: LocalRuntimeConnectorAuditEvent = {
      action: "runtime.command.forwarded",
      encrypted: false,
      gatewayRuntimeAttachmentId: "attachment_1",
      idempotencyKeyPresent: false,
      method: "directory.list",
      clientAttachmentId: "mobile_1",
      operationClass: "metadataRead",
      outerRequestId: "outer_1",
      requestId: "request_connector",
      subcommand: null,
    }
    const connectorOptions: LocalRuntimeConnectorOptions = {
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      gatewayRuntimeAttachmentId: "attachment_1",
      now: () => "2026-05-24T00:00:00.000Z",
      runtimeApiVersion: "1",
      sendRuntimeCommand: async () => ({
        payload: {},
        requestId: "request_connector",
        success: true,
        type: "response",
      }),
    }
    const connectorResult: LocalRuntimeConnectorResult = {
      envelope: { payload: {}, requestId: "request_connector", success: true, type: "response" },
      ok: true,
    }
    expect(statusSnapshot.state).toBe("online")
    expect(startRequest.idempotencyKey).toBe("idem_1")
    expect(realtimeEnvelope.event.eventType).toBe("runtime.status.changed")
    expect(gatewayState.runtimeStatuses).toEqual([])
    expect(auditEvent.action).toBe("remoteRuntime.operation.routed")
    expect(attachmentResult.ok).toBe(true)
    expect(routeResult.ok).toBe(false)
    expect(runtimeStatusResult.ok).toBe(false)
    expect(socketEndpoint.send("message")).toBeUndefined()
    expect(socketOptions.router.id).toBe("router_1")
    expect(socketDelivery.ok).toBe(true)
    expect(socketPoll.frames).toEqual([])
    expect(connectorAuditEvent.method).toBe("directory.list")
    expect(connectorResult.ok).toBe(true)
    expect(remoteRuntimeTransportOperationalPolicy).toMatchObject({
      auditRetentionDays: 90,
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
    })
    expect(remoteRuntimeTransportSchemaArtifact()).toMatchObject({
      contractFields: {
        remoteRuntimeStartChatRequest: [
          "requestId",
          "runtimeInstallationId",
          "directoryId",
          "providerId",
          "model",
          "title",
          "idempotencyKey",
        ],
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
      },
      localRuntimeConnectorAuditActions: ["runtime.command.denied", "runtime.command.forwarded"],
      remoteRuntimeReplaySubscriptionTarget: "providerThreadRef",
      operationalPolicy: remoteRuntimeTransportOperationalPolicy,
      previousRuntimeWebSocketRemoteRuntimeProtocolVersion,
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      runtimeWebSocketRemoteRuntimeProtocolVersion,
      currentRemoteRuntimeSupportedVersions: {
        remoteRuntimeHttp: [...currentRemoteRuntimeSupportedVersions.remoteRuntimeHttp],
        remoteRuntimeTransport: [...currentRemoteRuntimeSupportedVersions.remoteRuntimeTransport],
        runtimeWebSocket: [...currentRemoteRuntimeSupportedVersions.runtimeWebSocket],
      },
      supportedRemoteRuntimeTransportProtocolVersions: [...supportedRemoteRuntimeTransportProtocolVersions],
      supportedRuntimeWebSocketRemoteRuntimeProtocolVersions: [
        ...supportedRuntimeWebSocketRemoteRuntimeProtocolVersions,
      ],
    })
    expect(remoteRuntimeTransportSchemaJson as unknown).toEqual(remoteRuntimeTransportSchemaArtifact())
    const metadataCommand = {
      method: "directory.list",
      payload: {},
      protocolVersion: "1",
      requestId: "request_metadata",
    } as const
    const mutationCommand = {
      method: "chat.start",
      payload: { directoryId: "directory_1" },
      protocolVersion: "1",
      requestId: "request_mutation",
    } as const
    const providerCommand = {
      method: "providerModel.command",
      payload: { command: { type: "model.set", model: "model_1" }, prompt: "Prompt", sessionId: "session_1" },
      protocolVersion: "1",
      requestId: "request_provider",
    } as const
    const resumeCommand = {
      method: "resume",
      payload: { clientId: "client_1", threadRef: { providerId: "provider_1", threadId: "thread_1" } },
      protocolVersion: "1",
      requestId: "request_resume",
    } as const
    const invalidResumeCommand = {
      method: "resume",
      payload: { clientId: "client_1", sessionId: "session_1" },
      protocolVersion: "1",
      requestId: "request_resume_invalid",
    } as const
    const trustedMutationContext = {
      attachmentCapabilities: ["runtime.mutate"],
      deviceTrustLevel: "trusted" as const,
      encrypted: true,
      idempotencyKey: "idem_1",
      metadataSliceOnly: false,
      operationClass: "mutation" as const,
      runtimeAttachmentAuthorized: true,
    } as const

    expect(
      remoteRuntimeOperationPolicies().some(
        (policy) => policy.method === "providerModel.command" && policy.subcommand === "model.set",
      ),
    ).toBe(true)
    expect(remoteRuntimeOperationPolicyForCommand(metadataCommand)).toMatchObject({
      class: "metadataRead",
      subcommand: null,
    })
    expect(remoteRuntimeOperationPolicyForCommand(providerCommand)).toMatchObject({
      class: "mutation",
      subcommand: "model.set",
    })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(metadataCommand, {
        attachmentCapabilities: ["runtime.metadata"],
        deviceTrustLevel: "paired",
        encrypted: false,
        metadataSliceOnly: true,
        operationClass: "metadataRead",
        runtimeAttachmentAuthorized: true,
      }),
    ).toMatchObject({ ok: true, policy: { method: "directory.list" } })
    expect(authorizeRemoteRuntimeCommandWithPolicy(mutationCommand, trustedMutationContext)).toMatchObject({ ok: true })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(resumeCommand, {
        attachmentCapabilities: ["runtime.sensitiveRead"],
        deviceTrustLevel: "trusted",
        encrypted: true,
        metadataSliceOnly: false,
        operationClass: "sensitiveRead",
        runtimeAttachmentAuthorized: true,
      }),
    ).toMatchObject({ ok: true })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(mutationCommand, {
        ...trustedMutationContext,
        runtimeAttachmentAuthorized: false,
      }),
    ).toMatchObject({
      error: { code: "AUTHORIZATION_FAILED", message: "Runtime attachment is not authorized." },
      ok: false,
    })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(mutationCommand, {
        ...trustedMutationContext,
        operationClass: "metadataRead",
      }),
    ).toMatchObject({ error: { message: "Operation class does not match policy." }, ok: false })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(mutationCommand, {
        ...trustedMutationContext,
        deviceTrustLevel: "paired",
      }),
    ).toMatchObject({ error: { message: "Runtime client trust is insufficient." }, ok: false })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(mutationCommand, { ...trustedMutationContext, encrypted: false }),
    ).toMatchObject({ error: { message: "Runtime operation requires encryption." }, ok: false })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(mutationCommand, { ...trustedMutationContext, metadataSliceOnly: true }),
    ).toMatchObject({ error: { message: "Runtime operation is outside the metadata slice." }, ok: false })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(mutationCommand, {
        ...trustedMutationContext,
        attachmentCapabilities: [],
      }),
    ).toMatchObject({ error: { message: "Runtime attachment lacks required capability." }, ok: false })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(mutationCommand, { ...trustedMutationContext, idempotencyKey: null }),
    ).toMatchObject({ error: { message: "Runtime operation requires an idempotency key." }, ok: false })
    expect(
      authorizeRemoteRuntimeCommandWithPolicy(invalidResumeCommand, {
        attachmentCapabilities: ["runtime.sensitiveRead"],
        deviceTrustLevel: "trusted",
        encrypted: true,
        metadataSliceOnly: false,
        operationClass: "sensitiveRead",
        runtimeAttachmentAuthorized: true,
      }),
    ).toMatchObject({
      error: { message: "Remote runtime replay commands require a provider-thread subscription target." },
      ok: false,
    })
  })

  test("validates runtime commands and encrypted payloads", () => {
    const validCommand = {
      method: "directory.list",
      payload: {},
      protocolVersion: "0.1.6",
      requestId: "request_command",
    } as const
    const encryptedPayload = {
      algorithm: "aes-256-gcm",
      ciphertext: "ciphertext",
      contentType: "runtimeWebSocketClientCommand",
      keyId: "key_1",
      nonce: "nonce",
    } as const

    expect(validateRuntimeCommand(validCommand)).toMatchObject({ ok: true, value: validCommand })
    expect(validateRuntimeCommand(null)).toMatchObject({
      error: { message: "Runtime command must be an object." },
      ok: false,
    })
    expect(validateRuntimeCommand({})).toMatchObject({
      error: { message: "Runtime command requestId is required." },
      ok: false,
    })
    expect(validateRuntimeCommand({ ...validCommand, protocolVersion: "future" })).toMatchObject({
      error: { code: "PROTOCOL_MISMATCH" },
      ok: false,
    })
    expect(validateRuntimeCommand({ ...validCommand, method: "unknown" })).toMatchObject({
      error: { message: "Runtime command method is unknown: received unknown." },
      ok: false,
    })

    expect(validateEncryptedRuntimePayload(encryptedPayload)).toMatchObject({ ok: true, value: encryptedPayload })
    expect(validateEncryptedRuntimePayload(null)).toMatchObject({
      error: { message: "Encrypted runtime payload must be an object." },
      ok: false,
    })
    expect(validateEncryptedRuntimePayload({ ...encryptedPayload, algorithm: "unsupported" })).toMatchObject({
      error: { message: "Encrypted runtime payload algorithm is unsupported." },
      ok: false,
    })
    expect(validateEncryptedRuntimePayload({ ...encryptedPayload, contentType: "unsupported" })).toMatchObject({
      error: { message: "Encrypted runtime payload content type is unsupported." },
      ok: false,
    })
    expect(validateEncryptedRuntimePayload({ ...encryptedPayload, keyId: "" })).toMatchObject({
      error: { message: "Encrypted runtime payload key id is required." },
      ok: false,
    })
    expect(validateEncryptedRuntimePayload({ ...encryptedPayload, nonce: "" })).toMatchObject({
      error: { message: "Encrypted runtime payload nonce is required." },
      ok: false,
    })
    expect(validateEncryptedRuntimePayload({ ...encryptedPayload, ciphertext: "" })).toMatchObject({
      error: { message: "Encrypted runtime payload ciphertext is required." },
      ok: false,
    })
  })

  test("validates runtime transport frames", () => {
    const command = {
      method: "directory.list",
      payload: {},
      protocolVersion: "0.1.6",
      requestId: "request_command",
    } as const
    const encryptedPayload = {
      algorithm: "aes-256-gcm",
      ciphertext: "ciphertext",
      contentType: "runtimeWebSocketClientCommand",
      keyId: "key_1",
      nonce: "nonce",
    } as const
    const operationFrame = {
      gatewayRuntimeAttachmentId: "gateway_1",
      clientAttachmentId: "mobile_1",
      operationClass: "metadataRead",
      payload: command,
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "request_frame",
      type: "runtime.operation",
    } as const
    const encryptedOperationFrame = {
      encryptedPayload,
      gatewayRuntimeAttachmentId: "gateway_1",
      clientAttachmentId: "mobile_1",
      operationClass: "metadataRead",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "request_frame",
      type: "runtime.operation",
    } as const
    const statusFrame = {
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      gatewayRuntimeAttachmentId: "gateway_1",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      replay: "supported",
      requestId: "request_status",
      runtimeApiVersion: "1",
      sequence: 1,
      status: "online",
      type: "runtime.status",
    } as const
    const responseFrame = {
      envelope: { payload: {}, requestId: "request_response", success: true, type: "response" },
      gatewayRuntimeAttachmentId: "gateway_1",
      clientAttachmentId: "mobile_1",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "request_response",
      type: "runtime.response",
    } as const

    const validOperation = validateRuntimeOperationFrame(operationFrame)
    expect(validOperation).toMatchObject({ ok: true })
    if (validOperation.ok)
      expect(runtimeOperationFrameReplyTargetFromHost(validOperation.value)).toEqual({
        kind: "remoteRuntimeAttachment",
        remoteRuntimeAttachmentId: "mobile_1",
      })
    expect(validateRuntimeOperationFrame(encryptedOperationFrame)).toMatchObject({ ok: true })
    expect(validateRuntimeOperationFrame(null)).toMatchObject({
      error: { message: "Runtime operation frame must be an object." },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, type: "runtime.status" })).toMatchObject({
      error: { message: "Unexpected remote runtime transport frame type." },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, protocolVersion: "future" })).toMatchObject({
      error: { code: "PROTOCOL_MISMATCH" },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, requestId: "" })).toMatchObject({
      error: { message: "Runtime operation requestId is required." },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, gatewayRuntimeAttachmentId: "" })).toMatchObject({
      error: { message: "Gateway runtime attachment id is required." },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, clientAttachmentId: "" })).toMatchObject({
      error: { message: "Runtime client attachment id is required." },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, operationClass: "invalid" })).toMatchObject({
      error: { message: "Runtime operation class is invalid." },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, deviceTrustLevel: "invalid" })).toMatchObject({
      error: { message: "Runtime operation device trust level is invalid." },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, idempotencyKey: "" })).toMatchObject({
      error: { message: "Runtime operation idempotency key is invalid." },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, trustedGatewayHttpRequest: false })).toMatchObject({
      error: { message: "Runtime operation trusted gateway HTTP marker is invalid." },
      ok: false,
    })
    expect(
      validateRuntimeOperationFrame({
        ...operationFrame,
        replyTarget: { gatewayHttpRequestId: "mobile_1", kind: "gatewayHttpRequest" },
        trustedGatewayHttpRequest: true,
      }),
    ).toMatchObject({ ok: true })
    expect(
      validateRuntimeOperationFrame({ ...operationFrame, replyTarget: { kind: "gatewayHttpRequest" } }),
    ).toMatchObject({ ok: false })
    expect(validateRuntimeOperationFrame(operationFrame, 8)).toMatchObject({
      error: { code: "PAYLOAD_TOO_LARGE" },
      ok: false,
    })
    expect(validateRuntimeOperationFrame({ ...operationFrame, encryptedPayload })).toMatchObject({
      error: { message: "Runtime operation frame cannot include both clear and encrypted payloads." },
      ok: false,
    })
    expect(
      validateRuntimeOperationFrame({
        ...encryptedOperationFrame,
        encryptedPayload: { ...encryptedPayload, nonce: "" },
      }),
    ).toMatchObject({ error: { message: "Encrypted runtime payload nonce is required." }, ok: false })
    expect(
      validateRuntimeOperationFrame({ ...operationFrame, payload: { ...command, method: "unknown" } }),
    ).toMatchObject({ error: { message: "Runtime command method is unknown: received unknown." }, ok: false })

    expect(validateRuntimeStatusFrame(statusFrame)).toMatchObject({ ok: true, value: statusFrame })
    expect(validateRuntimeStatusFrame(null)).toMatchObject({
      error: { message: "Runtime status frame must be an object." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, type: "runtime.operation" })).toMatchObject({
      error: { message: "Unexpected runtime status frame type." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, protocolVersion: "future" })).toMatchObject({
      error: { code: "PROTOCOL_MISMATCH" },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, requestId: "" })).toMatchObject({
      error: { message: "Runtime status requestId is required." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, gatewayRuntimeAttachmentId: "" })).toMatchObject({
      error: { message: "Gateway runtime attachment id is required." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, connectorVersion: "" })).toMatchObject({
      error: { message: "Runtime status connector version is required." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, runtimeApiVersion: "" })).toMatchObject({
      error: { message: "Runtime API version is required." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, attachmentCapabilities: [""] })).toMatchObject({
      error: { message: "Runtime status attachment capabilities are invalid." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, featureCapabilities: ["runtime.metadata"] })).toMatchObject({
      error: { message: "Runtime status feature capabilities are invalid." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, featureCapabilities: "remoteRuntime.http.activeChats" })).toMatchObject({
      error: { message: "Runtime status feature capabilities are invalid." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, featureCapabilities: null })).toMatchObject({
      error: { message: "Runtime status feature capabilities are invalid." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, replay: "invalid" })).toMatchObject({
      error: { message: "Runtime replay status is invalid." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, status: "invalid" })).toMatchObject({
      error: { message: "Runtime attachment status is invalid." },
      ok: false,
    })
    expect(validateRuntimeStatusFrame({ ...statusFrame, sequence: 0 })).toMatchObject({
      error: { message: "Runtime status sequence is invalid." },
      ok: false,
    })

    expect(validateRuntimeResponseFrame(responseFrame)).toMatchObject({ ok: true, value: responseFrame })
    expect(validateRuntimeResponseFrame(null)).toMatchObject({
      error: { message: "Runtime response frame must be an object." },
      ok: false,
    })
    expect(validateRuntimeResponseFrame({ ...responseFrame, type: "runtime.operation" })).toMatchObject({
      error: { message: "Unexpected runtime response frame type." },
      ok: false,
    })
    expect(validateRuntimeResponseFrame({ ...responseFrame, protocolVersion: "future" })).toMatchObject({
      error: { code: "PROTOCOL_MISMATCH" },
      ok: false,
    })
    expect(validateRuntimeResponseFrame({ ...responseFrame, requestId: "" })).toMatchObject({
      error: { message: "Runtime response requestId is required." },
      ok: false,
    })
    expect(validateRuntimeResponseFrame({ ...responseFrame, gatewayRuntimeAttachmentId: "" })).toMatchObject({
      error: { message: "Gateway runtime attachment id is required." },
      ok: false,
    })
    expect(validateRuntimeResponseFrame({ ...responseFrame, clientAttachmentId: "" })).toMatchObject({
      error: { message: "Runtime client attachment id is required." },
      ok: false,
    })
    expect(validateRuntimeResponseFrame({ ...responseFrame, envelope: {} })).toMatchObject({
      error: { message: "Runtime response envelope is malformed." },
      ok: false,
    })
  })

  test("validates remote runtime chat request envelopes", () => {
    const start = {
      directoryId: "directory_1",
      idempotencyKey: "idem_start",
      model: null,
      providerId: null,
      requestId: "request_start",
      runtimeInstallationId: "runtime_1",
      title: "Title",
    } as const
    const send = {
      idempotencyKey: "idem_send",
      input: { content: "hello", mode: "default" },
      requestId: "request_send",
      runtimeInstallationId: "runtime_1",
      sessionId: "session_1",
    } as const
    const update = {
      idempotencyKey: "idem_update",
      input: { model: "model_1", providerId: "provider_1" },
      requestId: "request_update",
      runtimeInstallationId: "runtime_1",
      sessionId: "session_1",
    } as const

    expect(validateRemoteRuntimeStartChatRequest(start)).toMatchObject({ ok: true, value: start })
    expect(validateRemoteRuntimeStartChatRequest(null)).toMatchObject({
      error: { message: "Remote runtime start chat request must be an object." },
      ok: false,
    })
    expect(validateRemoteRuntimeStartChatRequest({ ...start, requestId: "" })).toMatchObject({
      error: { message: "Remote runtime start chat requestId is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeStartChatRequest({ ...start, runtimeInstallationId: "" })).toMatchObject({
      error: { message: "Runtime installation id is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeStartChatRequest({ ...start, directoryId: "" })).toMatchObject({
      error: { message: "Remote runtime start chat directory id is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeStartChatRequest({ ...start, providerId: 42 })).toMatchObject({
      error: { message: "Remote runtime start chat provider id is invalid." },
      ok: false,
    })
    expect(validateRemoteRuntimeStartChatRequest({ ...start, model: 42 })).toMatchObject({
      error: { message: "Remote runtime start chat model is invalid." },
      ok: false,
    })
    expect(validateRemoteRuntimeStartChatRequest({ ...start, title: 42 })).toMatchObject({
      error: { message: "Remote runtime start chat title is invalid." },
      ok: false,
    })
    expect(validateRemoteRuntimeStartChatRequest({ ...start, idempotencyKey: "" })).toMatchObject({
      error: { message: "Remote runtime start chat idempotency key is required." },
      ok: false,
    })

    expect(validateRemoteRuntimeSendChatMessageRequest(send)).toMatchObject({ ok: true, value: send })
    expect(validateRemoteRuntimeSendChatMessageRequest(null)).toMatchObject({
      error: { message: "Remote runtime send chat message request must be an object." },
      ok: false,
    })
    expect(validateRemoteRuntimeSendChatMessageRequest({ ...send, requestId: "" })).toMatchObject({
      error: { message: "Remote runtime send chat message requestId is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeSendChatMessageRequest({ ...send, runtimeInstallationId: "" })).toMatchObject({
      error: { message: "Runtime installation id is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeSendChatMessageRequest({ ...send, sessionId: "" })).toMatchObject({
      error: { message: "Remote runtime send chat message session id is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeSendChatMessageRequest({ ...send, input: null })).toMatchObject({
      error: { message: "Remote runtime send chat message input is required." },
      ok: false,
    })
    expect(
      validateRemoteRuntimeSendChatMessageRequest({ ...send, input: { content: "", mode: "default" } }),
    ).toMatchObject({ error: { message: "Remote runtime send chat message content is required." }, ok: false })
    expect(
      validateRemoteRuntimeSendChatMessageRequest({ ...send, input: { content: "hello", mode: "bad" } }),
    ).toMatchObject({ error: { message: "Remote runtime send chat message mode is invalid." }, ok: false })
    expect(validateRemoteRuntimeSendChatMessageRequest({ ...send, idempotencyKey: "" })).toMatchObject({
      error: { message: "Remote runtime send chat message idempotency key is required." },
      ok: false,
    })

    expect(validateRemoteRuntimeUpdateChatRequest(update)).toMatchObject({ ok: true, value: update })
    expect(validateRemoteRuntimeUpdateChatRequest(null)).toMatchObject({
      error: { message: "Remote runtime update chat request must be an object." },
      ok: false,
    })
    expect(validateRemoteRuntimeUpdateChatRequest({ ...update, requestId: "" })).toMatchObject({
      error: { message: "Remote runtime update chat requestId is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeUpdateChatRequest({ ...update, runtimeInstallationId: "" })).toMatchObject({
      error: { message: "Runtime installation id is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeUpdateChatRequest({ ...update, sessionId: "" })).toMatchObject({
      error: { message: "Remote runtime update chat session id is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeUpdateChatRequest({ ...update, input: null })).toMatchObject({
      error: { message: "Remote runtime update chat input is required." },
      ok: false,
    })
    expect(
      validateRemoteRuntimeUpdateChatRequest({ ...update, input: { model: "model_1", providerId: "" } }),
    ).toMatchObject({ error: { message: "Remote runtime update chat provider id is required." }, ok: false })
    expect(
      validateRemoteRuntimeUpdateChatRequest({ ...update, input: { model: "", providerId: "provider_1" } }),
    ).toMatchObject({ error: { message: "Remote runtime update chat model is required." }, ok: false })
    expect(validateRemoteRuntimeUpdateChatRequest({ ...update, idempotencyKey: "" })).toMatchObject({
      error: { message: "Remote runtime update chat idempotency key is required." },
      ok: false,
    })
  })

  test("validates remote runtime snapshot envelopes", () => {
    const statusSnapshot = {
      allowedDirectories: [{ directoryId: "directory_1", displayName: null, path: "/tmp/project" }],
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      gatewayRuntimeAttachmentId: "gateway_1",
      lastHeartbeatAt: null,
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      runtimeInstallationId: "runtime_1",
      state: "online",
    } as const
    const directoriesSnapshot = {
      activeDirectoryAttachments: [
        { directoryId: "directory_1", gatewayRuntimeAttachmentId: "gateway_1", path: "/tmp/project", status: "online" },
      ],
      allowedDirectories: [{ directoryId: "directory_1", displayName: null, path: "/tmp/project" }],
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      runtimeInstallationId: "runtime_1",
    } as const
    const capabilitiesSnapshot = {
      attachmentCapabilities: ["runtime.metadata"],
      featureCapabilities: ["remoteRuntime.http.runtimeStatus", "remoteRuntime.http.runtimeDirectories"],
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      runtimeInstallationId: "runtime_1",
      supportedMethods: ["initialize", "ping", "session.list", "activeChats.list"],
    } as const

    expect(validateRemoteRuntimeStatusSnapshot(statusSnapshot)).toMatchObject({ ok: true, value: statusSnapshot })
    expect(validateRemoteRuntimeStatusSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime status snapshot is malformed.", requestId: "unknown" },
      ok: false,
    })
    expect(validateRemoteRuntimeStatusSnapshot({ event: { runtimeInstallationId: "runtime_event" } })).toMatchObject({
      error: { requestId: "runtime_event" },
      ok: false,
    })
    expect(validateRemoteRuntimeStatusSnapshot({ ...statusSnapshot, runtimeInstallationId: "" })).toMatchObject({
      error: { message: "Remote runtime status snapshot is malformed.", requestId: "unknown" },
      ok: false,
    })
    expect(validateRemoteRuntimeStatusSnapshot({ ...statusSnapshot, gatewayRuntimeAttachmentId: 42 })).toMatchObject({
      error: { message: "Remote runtime status snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeStatusSnapshot({ ...statusSnapshot, state: "bad" })).toMatchObject({
      error: { message: "Remote runtime status snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeStatusSnapshot({ ...statusSnapshot, allowedDirectories: 42 })).toMatchObject({
      error: { message: "Remote runtime status snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeStatusSnapshot({ ...statusSnapshot, connectorVersion: 42 })).toMatchObject({
      error: { message: "Remote runtime status snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeStatusSnapshot({ ...statusSnapshot, lastHeartbeatAt: 42 })).toMatchObject({
      error: { message: "Remote runtime status snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeStatusSnapshot({ ...statusSnapshot, attachmentCapabilities: [""] })).toMatchObject({
      error: { message: "Remote runtime status snapshot is malformed." },
      ok: false,
    })

    expect(validateRemoteRuntimeDirectoriesSnapshot(directoriesSnapshot)).toMatchObject({
      ok: true,
      value: directoriesSnapshot,
    })
    expect(validateRemoteRuntimeDirectoriesSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime directories snapshot is malformed." },
      ok: false,
    })
    expect(
      validateRemoteRuntimeDirectoriesSnapshot({ ...directoriesSnapshot, runtimeInstallationId: "" }),
    ).toMatchObject({ error: { message: "Remote runtime directories snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeDirectoriesSnapshot({
        ...directoriesSnapshot,
        activeDirectoryAttachments: [
          { directoryId: "", gatewayRuntimeAttachmentId: "gateway_1", path: "/tmp/project", status: "online" },
        ],
      }),
    ).toMatchObject({ error: { message: "Remote runtime directories snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeDirectoriesSnapshot({
        ...directoriesSnapshot,
        activeDirectoryAttachments: [
          { directoryId: "directory_1", gatewayRuntimeAttachmentId: "", path: "/tmp/project", status: "online" },
        ],
      }),
    ).toMatchObject({ error: { message: "Remote runtime directories snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeDirectoriesSnapshot({
        ...directoriesSnapshot,
        activeDirectoryAttachments: [
          { directoryId: "directory_1", gatewayRuntimeAttachmentId: "gateway_1", path: "", status: "online" },
        ],
      }),
    ).toMatchObject({ error: { message: "Remote runtime directories snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeDirectoriesSnapshot({
        ...directoriesSnapshot,
        activeDirectoryAttachments: [
          { directoryId: "directory_1", gatewayRuntimeAttachmentId: "gateway_1", path: "/tmp/project", status: "bad" },
        ],
      }),
    ).toMatchObject({ error: { message: "Remote runtime directories snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeDirectoriesSnapshot({
        ...directoriesSnapshot,
        allowedDirectories: [{ directoryId: "", displayName: null, path: "/tmp/project" }],
      }),
    ).toMatchObject({ error: { message: "Remote runtime directories snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeDirectoriesSnapshot({
        ...directoriesSnapshot,
        allowedDirectories: [{ directoryId: "directory_1", displayName: "", path: "/tmp/project" }],
      }),
    ).toMatchObject({ error: { message: "Remote runtime directories snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeDirectoriesSnapshot({
        ...directoriesSnapshot,
        allowedDirectories: [{ directoryId: "directory_1", displayName: null, path: "" }],
      }),
    ).toMatchObject({ error: { message: "Remote runtime directories snapshot is malformed." }, ok: false })

    expect(validateRemoteRuntimeCapabilitiesSnapshot(capabilitiesSnapshot)).toMatchObject({
      ok: true,
      value: capabilitiesSnapshot,
    })
    expect(validateRemoteRuntimeCapabilitiesSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime capabilities snapshot is malformed." },
      ok: false,
    })
    expect(
      validateRemoteRuntimeCapabilitiesSnapshot({ ...capabilitiesSnapshot, runtimeInstallationId: "" }),
    ).toMatchObject({ error: { message: "Remote runtime capabilities snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeCapabilitiesSnapshot({ ...capabilitiesSnapshot, featureCapabilities: ["bad"] }),
    ).toMatchObject({ error: { message: "Remote runtime capabilities snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeCapabilitiesSnapshot({ ...capabilitiesSnapshot, attachmentCapabilities: ["bad"] }),
    ).toMatchObject({ error: { message: "Remote runtime capabilities snapshot is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeCapabilitiesSnapshot({ ...capabilitiesSnapshot, supportedMethods: ["bad"] }),
    ).toMatchObject({ error: { message: "Remote runtime capabilities snapshot is malformed." }, ok: false })
  })

  test("validates remote runtime realtime event envelopes", () => {
    const chatResource = { kind: "chat", runtimeInstallationId: "runtime_1", sessionId: "session_1" } as const
    const activeChatsResource = { kind: "activeChats", runtimeInstallationId: "runtime_1" } as const
    const runtimeResource = { kind: "runtime", runtimeInstallationId: "runtime_1" } as const
    const event = {
      event: {
        eventType: "runtime.status.changed",
        gatewayRuntimeAttachmentId: null,
        payload: {},
        resource: runtimeResource,
        runtimeInstallationId: "runtime_1",
        sequence: 1,
        timestamp: "2026-05-26T00:00:00.000Z",
      },
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      type: "event",
    } as const

    expect(isRemoteRuntimeRealtimeResourceRef(chatResource)).toBe(true)
    expect(isRemoteRuntimeRealtimeResourceRef(activeChatsResource)).toBe(true)
    expect(isRemoteRuntimeRealtimeResourceRef(runtimeResource)).toBe(true)
    expect(isRemoteRuntimeRealtimeResourceRef(null)).toBe(false)
    expect(isRemoteRuntimeRealtimeResourceRef({ ...runtimeResource, kind: "bad" })).toBe(false)
    expect(isRemoteRuntimeRealtimeResourceRef({ ...runtimeResource, runtimeInstallationId: "" })).toBe(false)
    expect(isRemoteRuntimeRealtimeResourceRef({ kind: "chat", runtimeInstallationId: "runtime_1" })).toBe(false)
    expect(isRemoteRuntimeRealtimeResourceRef({ ...runtimeResource, sessionId: "session_1" })).toBe(false)

    expect(validateRemoteRuntimeRealtimeEventEnvelope(event)).toMatchObject({ ok: true, value: event })
    expect(
      validateRemoteRuntimeRealtimeEventEnvelope({ ...event, event: { ...event.event, resource: null } }),
    ).toMatchObject({ ok: true })
    expect(validateRemoteRuntimeRealtimeEventEnvelope(null)).toMatchObject({
      error: { message: "Remote runtime realtime event envelope is malformed.", requestId: "unknown" },
      ok: false,
    })
    expect(validateRemoteRuntimeRealtimeEventEnvelope({ ...event, protocolVersion: "future" })).toMatchObject({
      error: { message: "Remote runtime realtime event envelope is malformed.", requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRemoteRuntimeRealtimeEventEnvelope({ ...event, type: "bad" })).toMatchObject({
      error: { message: "Remote runtime realtime event envelope is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeRealtimeEventEnvelope({ ...event, event: null })).toMatchObject({
      error: { message: "Remote runtime realtime event envelope is malformed." },
      ok: false,
    })
    expect(
      validateRemoteRuntimeRealtimeEventEnvelope({ ...event, event: { ...event.event, eventType: "bad" } }),
    ).toMatchObject({ error: { message: "Remote runtime realtime event envelope is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeRealtimeEventEnvelope({ ...event, event: { ...event.event, sequence: -1 } }),
    ).toMatchObject({ error: { message: "Remote runtime realtime event envelope is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeRealtimeEventEnvelope({ ...event, event: { ...event.event, timestamp: "" } }),
    ).toMatchObject({ error: { message: "Remote runtime realtime event envelope is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeRealtimeEventEnvelope({ ...event, event: { ...event.event, runtimeInstallationId: "" } }),
    ).toMatchObject({ error: { message: "Remote runtime realtime event envelope is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeRealtimeEventEnvelope({
        ...event,
        event: { ...event.event, gatewayRuntimeAttachmentId: 42 },
      }),
    ).toMatchObject({ error: { message: "Remote runtime realtime event envelope is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeRealtimeEventEnvelope({
        ...event,
        event: { ...event.event, resource: { kind: "chat", runtimeInstallationId: "runtime_1" } },
      }),
    ).toMatchObject({ error: { message: "Remote runtime realtime event envelope is malformed." }, ok: false })
    expect(
      validateRemoteRuntimeRealtimeEventEnvelope({ ...event, event: { ...event.event, payload: null } }),
    ).toMatchObject({ error: { message: "Remote runtime realtime event envelope is malformed." }, ok: false })
  })

  test("validates runtime connection candidates", () => {
    const signingKey = {
      algorithm: "ed25519",
      createdAt: "2026-05-26T00:00:00.000Z",
      encoding: "base64url",
      keyId: "key_1",
      publicKey: "public_key",
      purpose: "runtimeResponseSigning",
    } as const
    const candidate = {
      baseHttpUrl: "http://127.0.0.1:4096",
      candidateId: "candidate_1",
      edgeAccess: {
        clientId: "client_1",
        clientIdHeaderName: "CF-Access-Client-Id",
        clientSecret: "secret_1",
        clientSecretHeaderName: "CF-Access-Client-Secret",
        provider: "cloudflareAccess",
      },
      environment: "simulator",
      expiresAt: "2026-05-26T01:00:00.000Z",
      hostReachability: "loopback",
      kind: "direct",
      localRuntimeAccessToken: "token_1",
      localRuntimeAccessTokenId: "token_id_1",
      remoteRuntimeRequestSigningKeyId: "mobile_key_1",
      priority: 0,
      runtimeInstallationId: "runtime_1",
      runtimeResponseSigningPublicKey: signingKey,
      trustedRuntimeClientId: "device_1",
      webSocketUrl: "ws://127.0.0.1:4096/mobile",
    } as const
    const bootstrap = {
      baseHttpUrl: candidate.baseHttpUrl,
      candidateId: candidate.candidateId,
      edgeAccess: null,
      expiresAt: candidate.expiresAt,
      kind: candidate.kind,
      localRuntimeAccessToken: candidate.localRuntimeAccessToken,
      localRuntimeAccessTokenId: candidate.localRuntimeAccessTokenId,
      priority: candidate.priority,
      runtimeInstallationId: candidate.runtimeInstallationId,
      runtimeResponseSigningPublicKey: signingKey,
      webSocketUrl: candidate.webSocketUrl,
    } as const

    expect(validateRuntimeConnectionCandidate(candidate)).toMatchObject({ ok: true, value: candidate })
    expect(validateRuntimeConnectionCandidate({ ...candidate, edgeAccess: null })).toMatchObject({ ok: true })
    expect(validateRuntimeConnectionCandidate(null)).toMatchObject({
      error: { message: "Runtime connection candidate is malformed.", requestId: "unknown" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, runtimeInstallationId: "" })).toMatchObject({
      error: { message: "Runtime connection candidate is malformed.", requestId: "unknown" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, baseHttpUrl: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, candidateId: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(
      validateRuntimeConnectionCandidate({ ...candidate, edgeAccess: { ...candidate.edgeAccess, provider: "bad" } }),
    ).toMatchObject({ error: { requestId: "runtime_1" }, ok: false })
    expect(validateRuntimeConnectionCandidate({ ...candidate, environment: "bad" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, expiresAt: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, hostReachability: "bad" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, kind: "bad" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, localRuntimeAccessToken: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, localRuntimeAccessTokenId: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, remoteRuntimeRequestSigningKeyId: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(
      validateRuntimeConnectionCandidate({
        ...candidate,
        clientRequestSigningKeyId: candidate.remoteRuntimeRequestSigningKeyId,
      }),
    ).toMatchObject({ ok: true })
    expect(
      validateRuntimeConnectionCandidate({ ...candidate, clientRequestSigningKeyId: "mismatched_key" }),
    ).toMatchObject({ error: { requestId: "runtime_1" }, ok: false })
    expect(validateRuntimeConnectionCandidate({ ...candidate, priority: -1 })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(
      validateRuntimeConnectionCandidate({
        ...candidate,
        runtimeResponseSigningPublicKey: { ...signingKey, purpose: "remoteRuntimeRequestSigning" },
      }),
    ).toMatchObject({ error: { requestId: "runtime_1" }, ok: false })
    expect(validateRuntimeConnectionCandidate({ ...candidate, trustedRuntimeClientId: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidate({ ...candidate, webSocketUrl: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })

    expect(validateRuntimeConnectionCandidateBootstrap(bootstrap)).toMatchObject({ ok: true, value: bootstrap })
    expect(validateRuntimeConnectionCandidateBootstrap(null)).toMatchObject({
      error: { message: "Runtime connection candidate bootstrap is malformed." },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidateBootstrap({ ...bootstrap, runtimeInstallationId: "" })).toMatchObject({
      error: { requestId: "unknown" },
      ok: false,
    })
    expect(validateRuntimeConnectionCandidateBootstrap({ ...bootstrap, baseHttpUrl: "" })).toMatchObject({
      error: { requestId: "runtime_1" },
      ok: false,
    })
    expect(
      validateRuntimeConnectionCandidateBootstrap({
        ...bootstrap,
        runtimeResponseSigningPublicKey: { ...signingKey, purpose: "remoteRuntimeRequestSigning" },
      }),
    ).toMatchObject({ error: { requestId: "runtime_1" }, ok: false })
  })

  test("validates remote runtime chat snapshots and responses", () => {
    const pageInfo = { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null } as const
    const chat = {
      agent: null,
      createdAt: "2026-05-26T00:00:00.000Z",
      hasActiveTurn: null,
      lastText: null,
      messageCount: 0,
      model: null,
      path: null,
      projectId: "project_1",
      providerId: null,
      providerName: null,
      sessionId: "session_1",
      status: "idle",
      title: "Chat",
      updatedAt: "2026-05-26T00:00:00.000Z",
    } as const
    const part = {
      id: null,
      kind: "text",
      messageId: null,
      rawPart: null,
      status: null,
      text: null,
      title: null,
    } as const
    const rawParts = [
      { metadata: {}, synthetic: false, text: "hello", type: "text" },
      { metadata: {}, synthetic: false, text: "thinking", type: "reasoning" },
      { input: {}, metadata: {}, state: {}, tool: "tool", type: "tool" },
      { filename: "file.txt", mime: "text/plain", source: {}, type: "file", url: "file://file.txt" },
      { files: [], type: "patch" },
      { snapshot: "snap", type: "snapshot" },
      { snapshot: "snap", type: "step-start" },
      { cost: 1, reason: "done", tokens: {}, type: "step-finish" },
      { agent: "agent", description: "desc", prompt: "prompt", type: "subtask" },
      { name: "agent", type: "agent" },
      { attempt: 1, error: {}, type: "retry" },
      {
        auto: true,
        overflow: false,
        phase: "preTurn",
        reason: "contextLimit",
        tail_start_id: "tail_1",
        type: "compaction",
      },
    ] as const
    const message = {
      agent: null,
      completedAt: null,
      createdAt: "2026-05-26T00:00:00.000Z",
      errorMessage: null,
      errorName: null,
      finishReason: null,
      id: "message_1",
      model: null,
      parentId: null,
      parts: [part, ...rawParts.map((rawPart) => ({ ...part, rawPart }))],
      role: "assistant",
      sessionId: "session_1",
    } as const
    const providers = {
      all: [
        {
          id: "provider_1",
          models: { model_1: { id: "model_1", name: "Model", status: "available" } },
          name: "Provider",
        },
      ],
      connected: ["provider_1"],
      default: { provider_1: "model_1" },
    } as const
    const activeChats = {
      activeChats: [chat],
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      pageInfo,
      resourceVersion: null,
      runtimeInstallationId: "runtime_1",
      snapshotId: null,
    } as const
    const chatSnapshot = {
      chat,
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      resourceVersion: null,
      runtimeInstallationId: "runtime_1",
    } as const
    const messagesSnapshot = {
      messages: [message],
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      pageInfo,
      resourceVersion: null,
      runtimeInstallationId: "runtime_1",
      sessionId: "session_1",
    } as const
    const goalsSnapshot = {
      goals: [
        {
          createdAt: 1,
          objective: "Ship parity",
          status: "active",
          threadId: "session_1",
          timeUsedSeconds: 0,
          tokenBudget: null,
          tokensUsed: 0,
          updatedAt: 1,
        },
      ],
      pageInfo: { hasOlder: false, olderCursor: null },
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      resourceVersion: null,
      runtimeInstallationId: "runtime_1",
    } as const
    const aliasesSnapshot = {
      aliases: [{ alias: "ship", prompt: "Ship the diff", updatedAt: 1 }],
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      resourceVersion: null,
      runtimeInstallationId: "runtime_1",
    } as const
    const providersSnapshot = {
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      providers,
      resourceVersion: null,
      runtimeInstallationId: "runtime_1",
    } as const
    const gitStatusSnapshot = {
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      repositories: [
        {
          ahead: 0,
          behind: 0,
          branch: "main",
          diffTruncated: false,
          directoryId: "dir_1",
          error: null,
          files: [
            {
              conflicted: false,
              path: "src/index.ts",
              renamedFrom: null,
              staged: "M",
              submodule: false,
              untracked: false,
              unstaged: null,
            },
          ],
          head: "abc123",
          isRepository: true,
          path: "/repo",
          repositoryRoot: "/repo",
          stagedDiff: null,
          unstagedDiff: null,
          upstream: "origin/main",
        },
      ],
      resourceVersion: null,
      runtimeInstallationId: "runtime_1",
    } as const
    const startResponse = {
      chat,
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      runtimeInstallationId: "runtime_1",
    } as const
    const sendResponse = {
      acceptedAt: "2026-05-26T00:00:00.000Z",
      message,
      remoteRuntimeHttpVersion: remoteRuntimeHttpContractVersion,
      runtimeInstallationId: "runtime_1",
      sessionId: "session_1",
    } as const

    expect(validateRemoteRuntimeActiveChatsSnapshot(activeChats)).toMatchObject({ ok: true, value: activeChats })
    expect(validateRemoteRuntimeChatSnapshot(chatSnapshot)).toMatchObject({ ok: true, value: chatSnapshot })
    expect(validateRemoteRuntimeChatMessagesSnapshot(messagesSnapshot)).toMatchObject({
      ok: true,
      value: messagesSnapshot,
    })
    expect(validateRemoteRuntimeGoalsSnapshot(goalsSnapshot)).toMatchObject({ ok: true, value: goalsSnapshot })
    expect(validateRemoteRuntimeAliasesSnapshot(aliasesSnapshot)).toMatchObject({ ok: true, value: aliasesSnapshot })
    expect(validateRemoteRuntimeProvidersSnapshot(providersSnapshot)).toMatchObject({
      ok: true,
      value: providersSnapshot,
    })
    expect(validateRemoteRuntimeGitStatusSnapshot(gitStatusSnapshot)).toMatchObject({
      ok: true,
      value: gitStatusSnapshot,
    })
    expect(
      validateRemoteRuntimeGitStatusSnapshot({ ...gitStatusSnapshot, repositories: [{ directoryId: "dir_1" }] }),
    ).toMatchObject({
      ok: false,
    })
    expect(
      validateRemoteRuntimeActiveChatsSnapshot({
        ...activeChats,
        activeChats: [
          {
            ...chat,
            goal: {
              createdAt: 1,
              objective: 42,
              status: "active",
              threadId: "session_1",
              timeUsedSeconds: 0,
              tokenBudget: null,
              tokensUsed: 0,
              updatedAt: 1,
            },
          },
        ],
      }),
    ).toMatchObject({ ok: false })
    expect(
      validateRemoteRuntimeChatSnapshot({
        ...chatSnapshot,
        chat: {
          ...chat,
          goal: {
            createdAt: 1,
            objective: 42,
            status: "active",
            threadId: "session_1",
            timeUsedSeconds: 0,
            tokenBudget: null,
            tokensUsed: 0,
            updatedAt: 1,
          },
        },
      }),
    ).toMatchObject({ ok: false })
    expect(validateRemoteRuntimeStartChatResponse(startResponse)).toMatchObject({ ok: true, value: startResponse })
    expect(validateRemoteRuntimeSendChatMessageResponse(sendResponse)).toMatchObject({ ok: true, value: sendResponse })
    expect(validateRemoteRuntimeUpdateChatResponse(startResponse)).toMatchObject({ ok: true, value: startResponse })
    expect(validateRemoteRuntimeActiveChatsSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime active chats snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeChatSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime chat snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeChatMessagesSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime chat messages snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeGoalsSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime goals snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeAliasesSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime aliases snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeProvidersSnapshot(null)).toMatchObject({
      error: { message: "Remote runtime providers snapshot is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeStartChatResponse(null)).toMatchObject({
      error: { message: "Remote runtime start chat response is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeSendChatMessageResponse(null)).toMatchObject({
      error: { message: "Remote runtime send chat message response is malformed." },
      ok: false,
    })
    expect(validateRemoteRuntimeUpdateChatResponse(null)).toMatchObject({
      error: { message: "Remote runtime update chat response is malformed." },
      ok: false,
    })
    expect(
      validateRemoteRuntimeChatMessagesSnapshot({
        ...messagesSnapshot,
        messages: [{ ...message, parts: [{ ...part, rawPart: { type: "future" } }] }],
      }),
    ).toMatchObject({ ok: false })
  })

  test("projects and sanitizes remote runtime message part payloads", () => {
    expect(projectRemoteRuntimeMessagePartPayload({})).toBeNull()
    expect(projectRemoteRuntimeMessagePartPayload({ type: "unknown" })).toBeNull()
    expect(
      projectRemoteRuntimeMessagePartPayload({
        id: "part-1",
        messageID: "message-1",
        metadata: { kind: "plain", ignored: Symbol("ignored") },
        synthetic: true,
        text: "Hello",
        type: "text",
      }),
    ).toEqual({
      id: "part-1",
      messageID: "message-1",
      metadata: { kind: "plain" },
      synthetic: true,
      text: "Hello",
      type: "text",
    })
    expect(
      projectRemoteRuntimeMessagePartPayload({ metadata: { ignored: true }, text: "No metadata", type: "text" }),
    ).toEqual({
      text: "No metadata",
      type: "text",
    })
    expect(projectRemoteRuntimeMessagePartPayload({ text: "Thinking", type: "reasoning" })).toEqual({
      text: "Thinking",
      type: "reasoning",
    })
    expect(
      projectRemoteRuntimeMessagePartPayload({
        filename: "app.ts",
        mime: "text/typescript",
        source: { path: "/repo/app.ts", skip: Symbol("ignored") },
        type: "file",
        url: "file:///repo/app.ts",
      }),
    ).toEqual({
      filename: "app.ts",
      mime: "text/typescript",
      source: { path: "/repo/app.ts" },
      type: "file",
      url: "file:///repo/app.ts",
    })
    expect(
      projectRemoteRuntimeMessagePartPayload({ files: [{ path: "app.ts" }, Symbol("ignored")], type: "patch" }),
    ).toEqual({
      files: [{ path: "app.ts" }],
      type: "patch",
    })
    expect(
      projectRemoteRuntimeMessagePartPayload({
        agent: "agent",
        description: "Do it",
        prompt: "Prompt",
        type: "subtask",
      }),
    ).toEqual({
      agent: "agent",
      description: "Do it",
      prompt: "Prompt",
      type: "subtask",
    })
    expect(projectRemoteRuntimeMessagePartPayload({ name: "worker", type: "agent" })).toEqual({
      name: "worker",
      type: "agent",
    })
    expect(projectRemoteRuntimeMessagePartPayload({ snapshot: "snapshot-1", type: "snapshot" })).toEqual({
      snapshot: "snapshot-1",
      type: "snapshot",
    })
    expect(projectRemoteRuntimeMessagePartPayload({ snapshot: "snapshot-2", type: "step-start" })).toEqual({
      snapshot: "snapshot-2",
      type: "step-start",
    })
    expect(
      projectRemoteRuntimeMessagePartPayload({
        cost: "0.01",
        reason: "stop",
        snapshot: "snapshot-3",
        tokens: { input: 1, invalid: Symbol("ignored") },
        type: "step-finish",
      }),
    ).toMatchObject({
      cost: "0.01",
      reason: "stop",
      tokens: { input: 1 },
      type: "step-finish",
    })
    expect(
      projectRemoteRuntimeMessagePartPayload({
        attempt: 2,
        error: { message: "failed", invalid: Symbol("ignored") },
        type: "retry",
      }),
    ).toEqual({
      attempt: 2,
      type: "retry",
    })
    expect(
      projectRemoteRuntimeMessagePartPayload({
        auto: true,
        overflow: true,
        phase: "manual",
        reason: "contextLimit",
        tail_start_id: "tail-1",
        type: "compaction",
      }),
    ).toEqual({
      auto: true,
      overflow: true,
      phase: "manual",
      reason: "contextLimit",
      tail_start_id: "tail-1",
      type: "compaction",
    })

    const toolInputs = [
      { input: { command: "ls", description: "List", workdir: "/repo" }, metadata: { output: "listed" }, tool: "bash" },
      { input: { filePath: "/repo/app.ts", path: "/repo/app.ts" }, metadata: { loaded: ["app.ts"] }, tool: "read" },
      { input: { path: "/repo", pattern: "needle" }, metadata: { matches: [{ path: "app.ts" }] }, tool: "grep" },
      { input: { path: "/repo", pattern: "*.ts" }, metadata: { count: 2 }, tool: "glob" },
      { input: { url: "https://example.test" }, metadata: {}, tool: "webfetch" },
      { input: { query: "docs" }, metadata: { numResults: 3 }, tool: "websearch" },
      {
        input: { description: "Delegate", subagent_type: "general" },
        metadata: { sessionId: "session-1" },
        tool: "task",
      },
      {
        input: { filePath: "/repo/app.ts" },
        metadata: { diff: "@@", filediff: { path: "app.ts" }, files: ["app.ts"] },
        tool: "edit",
      },
      { input: { content: "text", filePath: "/repo/app.ts" }, metadata: { diagnostics: { count: 0 } }, tool: "write" },
      { input: { filePath: "/repo/app.ts" }, metadata: { files: ["app.ts"] }, tool: "apply_patch" },
      { input: { todos: [{ content: "done" }] }, metadata: { todos: [{ content: "done" }] }, tool: "todowrite" },
      { input: { questions: ["Continue?"] }, metadata: { answers: ["Yes"] }, tool: "question" },
      { input: { name: "agents-sdk" }, metadata: {}, tool: "skill" },
      { input: { flag: true, nested: { ignored: true }, value: 1 }, metadata: {}, tool: "custom" },
    ] as const
    for (const item of toolInputs) {
      expect(
        projectRemoteRuntimeMessagePartPayload({
          state: {
            input: item.input,
            output: "ok",
            status: "completed",
            time: { compacted: false },
            title: `${item.tool} title`,
          },
          metadata: item.metadata,
          tool: item.tool,
          type: "tool",
        }),
      ).toMatchObject({
        state: { input: expect.any(Object), status: "completed" },
        tool: item.tool,
        type: "tool",
      })
    }
    expect(
      projectRemoteRuntimeMessagePartPayload({
        state: { error: "boom", status: "error" },
        tool: "bash",
        type: "tool",
      }),
    ).toMatchObject({
      state: { error: "boom", status: "error" },
      type: "tool",
    })
    expect(projectRemoteRuntimeMessagePartPayload({ state: {}, tool: "bash", type: "tool" })).toEqual({
      tool: "bash",
      type: "tool",
    })
    expect(projectRemoteRuntimeMessagePartPayload({ tool: "bash", type: "tool" })).toEqual({
      tool: "bash",
      type: "tool",
    })

    expect(sanitizeRemoteRuntimeMessagePartPayload({ type: "not-supported" })).toBeNull()
    expect(
      sanitizeRemoteRuntimeMessagePartPayload({
        error: { message: "failed" },
        type: "retry",
      }),
    ).toEqual({
      error: { message: "failed" },
      type: "retry",
    })
    expect(
      sanitizeRemoteRuntimeMessagePartPayload({
        error: [{ nested: true }, Symbol("ignored")],
        type: "retry",
      }),
    ).toEqual({
      type: "retry",
    })
  })

  test("validates attachment registration requests", () => {
    const runtimeRequest = {
      accountId: "account_1",
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      directoryId: "directory_1",
      directoryPath: "/tmp/project",
      featureCapabilities: ["remoteRuntime.http.activeChats"],
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "request_runtime_attachment",
      runtimeInstallationId: "runtime_1",
      ticket: "ticket_1",
    } as const
    const mobileRequest = {
      accountId: "account_1",
      deviceTrustLevel: "paired",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "request_mobile_attachment",
      runtimeInstallationId: "runtime_1",
      ticket: "ticket_1",
      trustedRuntimeClientId: "device_1",
    } as const
    const mobileRequestWithoutTrustLevel = {
      accountId: mobileRequest.accountId,
      protocolVersion: mobileRequest.protocolVersion,
      requestId: mobileRequest.requestId,
      runtimeInstallationId: mobileRequest.runtimeInstallationId,
      ticket: mobileRequest.ticket,
      trustedRuntimeClientId: mobileRequest.trustedRuntimeClientId,
    } as const

    expect(validateGatewayRuntimeAttachmentRegistrationRequest(runtimeRequest)).toMatchObject({
      ok: true,
      value: runtimeRequest,
    })
    expect(
      validateGatewayRuntimeAttachmentRegistrationRequest({
        ...runtimeRequest,
        allowedDirectories: [
          { directoryId: "dir_1", displayName: "project", path: "/Users/riley/project" },
          { directoryId: "dir_2", displayName: "other", path: "/Users/riley/other" },
        ],
      }),
    ).toMatchObject({
      ok: true,
      value: {
        allowedDirectories: [
          { directoryId: "dir_1", displayName: "project", path: "/Users/riley/project" },
          { directoryId: "dir_2", displayName: "other", path: "/Users/riley/other" },
        ],
      },
    })
    expect(validateGatewayRuntimeAttachmentRegistrationRequest(null)).toMatchObject({
      error: { message: "Runtime attachment request must be an object." },
      ok: false,
    })
    expect(
      validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, protocolVersion: "future" }),
    ).toMatchObject({ error: { code: "PROTOCOL_MISMATCH" }, ok: false })
    expect(validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, requestId: "" })).toMatchObject({
      error: { message: "Runtime attachment requestId is required." },
      ok: false,
    })
    expect(validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, accountId: "" })).toMatchObject({
      error: { message: "Runtime attachment account id is required." },
      ok: false,
    })
    expect(validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, directoryId: "" })).toMatchObject({
      error: { message: "Runtime attachment directory id is required." },
      ok: false,
    })
    expect(validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, directoryPath: "" })).toMatchObject(
      { error: { message: "Runtime attachment directory path is required." }, ok: false },
    )
    expect(
      validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, runtimeInstallationId: "" }),
    ).toMatchObject({ error: { message: "Runtime installation id is required." }, ok: false })
    expect(
      validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, connectorVersion: "" }),
    ).toMatchObject({ error: { message: "Runtime attachment connector version is required." }, ok: false })
    expect(
      validateGatewayRuntimeAttachmentRegistrationRequest({
        ...runtimeRequest,
        allowedDirectories: [{ directoryId: "", path: "/repo" }],
      }),
    ).toMatchObject({ error: { message: "Runtime attachment allowed directories are invalid." }, ok: false })
    expect(
      validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, attachmentCapabilities: [""] }),
    ).toMatchObject({ error: { message: "Runtime attachment capabilities are invalid." }, ok: false })
    expect(
      validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, featureCapabilities: [""] }),
    ).toMatchObject({ error: { message: "Runtime attachment feature capabilities are invalid." }, ok: false })
    expect(validateGatewayRuntimeAttachmentRegistrationRequest({ ...runtimeRequest, ticket: "" })).toMatchObject({
      error: { message: "Runtime attachment ticket is required." },
      ok: false,
    })

    expect(validateRemoteRuntimeClientAttachmentRequest(mobileRequest)).toMatchObject({
      ok: true,
      value: mobileRequest,
    })
    expect(validateRemoteRuntimeClientAttachmentRequest(mobileRequestWithoutTrustLevel)).toMatchObject({ ok: true })
    expect(validateRemoteRuntimeClientAttachmentRequest(null)).toMatchObject({
      error: { message: "Remote runtime attachment request must be an object." },
      ok: false,
    })
    expect(validateRemoteRuntimeClientAttachmentRequest({ ...mobileRequest, protocolVersion: "future" })).toMatchObject(
      { error: { code: "PROTOCOL_MISMATCH" }, ok: false },
    )
    expect(validateRemoteRuntimeClientAttachmentRequest({ ...mobileRequest, requestId: "" })).toMatchObject({
      error: { message: "Remote runtime attachment requestId is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeClientAttachmentRequest({ ...mobileRequest, accountId: "" })).toMatchObject({
      error: { message: "Remote runtime attachment account id is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeClientAttachmentRequest({ ...mobileRequest, runtimeInstallationId: "" })).toMatchObject(
      { error: { message: "Runtime installation id is required." }, ok: false },
    )
    expect(
      validateRemoteRuntimeClientAttachmentRequest({ ...mobileRequest, trustedRuntimeClientId: "" }),
    ).toMatchObject({ error: { message: "Trusted runtime client id is required." }, ok: false })
    expect(validateRemoteRuntimeClientAttachmentRequest({ ...mobileRequest, deviceTrustLevel: "bad" })).toMatchObject({
      error: { message: "Runtime client trust level is invalid." },
      ok: false,
    })
    expect(validateRemoteRuntimeClientAttachmentRequest({ ...mobileRequest, ticket: "" })).toMatchObject({
      error: { message: "Remote runtime attachment ticket is required." },
      ok: false,
    })
    expect(validateRemoteRuntimeClientAttachmentRequest(mobileRequest)).toMatchObject({
      ok: true,
      value: mobileRequest,
    })
  })

  test("redacts sensitive remote runtime transport log values", () => {
    expect(redactRemoteRuntimeTransportLogValue("plain")).toBe("plain")
    expect(redactRemoteRuntimeTransportLogValue(null)).toBeNull()
    expect(
      redactRemoteRuntimeTransportLogValue([{ payload: { content: "secret" }, safe: "visible" }, "plain"]),
    ).toEqual([{ payload: "[REDACTED]", safe: "visible" }, "plain"])
    expect(
      redactRemoteRuntimeTransportLogValue({
        nested: {
          command: "rm -rf",
          visible: "ok",
        },
        token: "secret",
      }),
    ).toEqual({
      nested: {
        command: "[REDACTED]",
        visible: "ok",
      },
      token: "[REDACTED]",
    })
  })

  test("tracks remote runtime nonce replay reservations", () => {
    const store: RemoteRuntimeNonceReplayStore = createInMemoryRemoteRuntimeNonceReplayStore({
      maxEntries: 2,
      pruneIntervalMs: 10,
    })
    expect(store.reserve({ expiresAtMs: 50, keyId: "key_1", nonce: "nonce_1", nowMs: 0 })).toBe(true)
    expect(store.reserve({ expiresAtMs: 50, keyId: "key_1", nonce: "nonce_1", nowMs: 1 })).toBe(false)
    expect(store.reserve({ expiresAtMs: 50, keyId: "key_1", nonce: "nonce_2", nowMs: 2 })).toBe(true)
    expect(store.reserve({ expiresAtMs: 50, keyId: "key_1", nonce: "nonce_3", nowMs: 3 })).toBe(false)
    expect(store.reserve({ expiresAtMs: 80, keyId: "key_1", nonce: "nonce_3", nowMs: 60 })).toBe(true)
    expect(store.reserve({ keyId: "key_1", nonce: "nonce_4" })).toBe(true)
    expect(store.reserve({ expiresAtMs: Number.NaN, keyId: "key_2", nonce: "nonce_1", nowMs: Number.NaN })).toBe(false)
    expect(() => createInMemoryRemoteRuntimeNonceReplayStore({ maxEntries: 0 })).toThrow(
      "Remote runtime nonce replay store maxEntries must be a positive safe integer.",
    )
    expect(() => createInMemoryRemoteRuntimeNonceReplayStore({ pruneIntervalMs: -1 })).toThrow(
      "Remote runtime nonce replay store pruneIntervalMs must be a non-negative number.",
    )
  })
})

describe("remote runtime lifecycle authority", () => {
  test("parses runtime host and launchd state records", () => {
    expect(parseRemoteRuntimeHost({ password: "secret", pid: 123, url: "http://127.0.0.1:4096" })).toEqual({
      password: "secret",
      pid: 123,
      url: "http://127.0.0.1:4096",
    })
    expect(parseRemoteRuntimeHost({ url: "http://127.0.0.1:4096" })).toEqual({ url: "http://127.0.0.1:4096" })
    expect(() => parseRemoteRuntimeHost({ pid: 123 })).toThrow("invalid schema")

    expect(
      parseRemoteRuntimeLaunchAgentState({
        intervalSeconds: 5,
        label: "company.interbase.remote-runtime",
        plistPath: "/tmp/runtime-client.plist",
        runtimeInstallationId: "runtime-1",
      }),
    ).toEqual({
      intervalSeconds: 5,
      label: "company.interbase.remote-runtime",
      plistPath: "/tmp/runtime-client.plist",
      runtimeInstallationId: "runtime-1",
    })
    expect(() =>
      parseRemoteRuntimeLaunchAgentState({
        intervalSeconds: "5",
        label: "company.interbase.remote-runtime",
        plistPath: "/tmp/runtime-client.plist",
        runtimeInstallationId: "runtime-1",
      }),
    ).toThrow("invalid schema")
  })

  test("parses runtime lifecycle state records with nested parser authority", () => {
    expect(
      parseRemoteRuntimeHostLifecycleRuntimeState(
        {
          accountId: "account-1",
          allowedDirectories: [
            { directoryId: "directory-1", path: "/repo" },
            { directoryId: "directory-2", path: "/other-repo" },
          ],
          apiBaseUrl: "https://api.example.test",
          directory: "/repo",
          directoryId: "directory-1",
          gatewayRuntimeAttachmentId: "gateway-attachment-1",
          localGatewayAuthority: { trustedRuntimeClientId: "device-1" },
          runtimeEncryptionKey: { keyId: "runtime-key-1" },
          runtimeInstallationId: "runtime-1",
          startedAt: "2026-05-25T00:00:00.000Z",
          state: "online",
        },
        {
          parseLocalGatewayAuthority: (input) => ({ trustedRuntimeClientId: String(input.trustedRuntimeClientId) }),
          parseRuntimeEncryptionKey: (input) => ({ keyId: String(input.keyId) }),
        },
      ),
    ).toEqual({
      accountId: "account-1",
      allowedDirectories: [
        { directoryId: "directory-1", path: "/repo" },
        { directoryId: "directory-2", path: "/other-repo" },
      ],
      apiBaseUrl: "https://api.example.test",
      directory: "/repo",
      directoryId: "directory-1",
      gatewayRuntimeAttachmentId: "gateway-attachment-1",
      localGatewayAuthority: { trustedRuntimeClientId: "device-1" },
      runtimeEncryptionKey: { keyId: "runtime-key-1" },
      runtimeInstallationId: "runtime-1",
      startedAt: "2026-05-25T00:00:00.000Z",
      state: "online",
    })
    expect(
      parseRemoteRuntimeHostLifecycleRuntimeState({
        accountId: "account-1",
        apiBaseUrl: "https://api.example.test",
        directory: "/repo",
        directoryId: "directory-1",
        runtimeInstallationId: "runtime-1",
      }),
    ).toEqual({
      accountId: "account-1",
      apiBaseUrl: "https://api.example.test",
      directory: "/repo",
      directoryId: "directory-1",
      runtimeInstallationId: "runtime-1",
    })
    expect(() => parseRemoteRuntimeHostLifecycleRuntimeState({ accountId: "account-1" })).toThrow("invalid schema")
  })

  test("parses persisted runtime host state", () => {
    expect(
      parseRemoteRuntimeHostState(
        {
          host: { url: "http://127.0.0.1:4096" },
          launchd: {
            intervalSeconds: 30,
            label: "company.interbase.remote-runtime",
            plistPath: "/tmp/runtime-client.plist",
            runtimeInstallationId: "runtime-1",
          },
          localRuntimeIdentityId: "identity-1",
          runtime: {
            accountId: "account-1",
            apiBaseUrl: "https://api.example.test",
            directory: "/repo",
            directoryId: "directory-1",
            localGatewayAuthority: { trustedRuntimeClientId: "device-1" },
            runtimeEncryptionKey: { keyId: "runtime-key-1" },
            runtimeInstallationId: "runtime-1",
          },
        },
        {
          parseLocalGatewayAuthority: (input) => ({ trustedRuntimeClientId: String(input.trustedRuntimeClientId) }),
          parseRuntimeEncryptionKey: (input) => ({ keyId: String(input.keyId) }),
        },
      ),
    ).toEqual({
      host: { url: "http://127.0.0.1:4096" },
      launchd: {
        intervalSeconds: 30,
        label: "company.interbase.remote-runtime",
        plistPath: "/tmp/runtime-client.plist",
        runtimeInstallationId: "runtime-1",
      },
      localRuntimeIdentityId: "identity-1",
      runtime: {
        accountId: "account-1",
        apiBaseUrl: "https://api.example.test",
        directory: "/repo",
        directoryId: "directory-1",
        localGatewayAuthority: { trustedRuntimeClientId: "device-1" },
        runtimeEncryptionKey: { keyId: "runtime-key-1" },
        runtimeInstallationId: "runtime-1",
      },
    })
    expect(parseRemoteRuntimeHostState({})).toEqual({})
    expect(() => parseRemoteRuntimeHostState(null)).toThrow("invalid schema")
  })

  test("parses remote runtime directory allowlist state", () => {
    expect(
      parseRemoteRuntimeDirectoryAllowlistEntry({
        addedAt: "2026-05-25T00:00:00.000Z",
        directoryId: "directory-1",
        displayName: "Repo",
        enabled: true,
        path: "/repo",
        updatedAt: "2026-05-25T00:00:00.000Z",
      }),
    ).toEqual({
      addedAt: "2026-05-25T00:00:00.000Z",
      directoryId: "directory-1",
      displayName: "Repo",
      enabled: true,
      path: "/repo",
      updatedAt: "2026-05-25T00:00:00.000Z",
    })
    expect(
      parseRemoteRuntimeDirectoryAllowlistState({
        directories: [
          {
            addedAt: "2026-05-25T00:00:00.000Z",
            directoryId: "directory-1",
            enabled: false,
            path: "/repo",
            updatedAt: "2026-05-25T00:00:00.000Z",
          },
        ],
        version: 1,
      }),
    ).toEqual({
      directories: [
        {
          addedAt: "2026-05-25T00:00:00.000Z",
          directoryId: "directory-1",
          enabled: false,
          path: "/repo",
          updatedAt: "2026-05-25T00:00:00.000Z",
        },
      ],
      version: 1,
    })
    expect(() => parseRemoteRuntimeDirectoryAllowlistEntry({ directoryId: "directory-1" })).toThrow("invalid schema")
    expect(() => parseRemoteRuntimeDirectoryAllowlistState({ directories: [], version: 2 })).toThrow("invalid schema")
  })

  test("manages remote runtime directory allowlist state through public store helpers", async () => {
    let state: RemoteRuntimeDirectoryAllowlistState = { directories: [], version: 1 }
    let uuid = 0
    let timestamp = "2026-05-25T00:00:00.000Z"
    const store = createRemoteRuntimeDirectoryAllowlistStore({
      cwd: () => "/workspace/current",
      isAbsolute: (filePath) => filePath.startsWith("/"),
      now: () => timestamp,
      randomUUID: () => `uuid_${++uuid}`,
      resolve: (filePath) => (filePath.startsWith("/") ? filePath : `/workspace/current/${filePath}`),
      stateStore: {
        async read() {
          return state
        },
        async update(updater) {
          state = await updater(state)
          return state
        },
      },
    })

    await expect(store.select({})).resolves.toEqual({})
    timestamp = "2026-05-25T00:00:01.000Z"
    await expect(addRemoteRuntimeDirectoryAllowlistEntryToStore(store, { directory: "" })).resolves.toMatchObject({
      addedAt: "2026-05-25T00:00:01.000Z",
      directoryId: "dir_uuid_1",
      enabled: true,
      path: "/workspace/current",
    })

    const entry = await addRemoteRuntimeDirectoryAllowlistEntryToStore(store, {
      directory: "repo",
      displayName: "Repo",
      enabled: false,
    })
    expect(formatRemoteRuntimeDirectoryAllowlistEntry(entry)).toBe("disabled dir_uuid_2 /workspace/current/repo")
    await expect(store.select({ directory: "dir_uuid_2" })).resolves.toEqual({
      directory: "/workspace/current/repo",
      directoryId: "dir_uuid_2",
    })
    await expect(store.select({ directory: " /workspace/current/repo " })).resolves.toEqual({
      directory: "/workspace/current/repo",
      directoryId: "dir_uuid_2",
    })
    await expect(store.select({ directory: "/workspace/current/new-repo" })).resolves.toEqual({
      directory: "/workspace/current/new-repo",
    })
    await expect(store.select({ directory: "missing-id" })).rejects.toThrow(
      "Remote runtime directory missing-id is not allowlisted.",
    )

    timestamp = "2026-05-25T00:00:02.000Z"
    const enabled = await setRemoteRuntimeDirectoryAllowlistEntryEnabledInStore(store, "dir_uuid_2", true)
    expect(formatRemoteRuntimeDirectoryAllowlistEntry(enabled.entry!)).toBe(
      "enabled  dir_uuid_2 /workspace/current/repo",
    )
    expect(enabled.entry?.updatedAt).toBe("2026-05-25T00:00:02.000Z")

    timestamp = "2026-05-25T00:00:03.000Z"
    await expect(
      addRemoteRuntimeDirectoryAllowlistEntryToStore(store, { directory: "repo", displayName: "Renamed" }),
    ).resolves.toMatchObject({
      directoryId: "dir_uuid_2",
      displayName: "Renamed",
      enabled: true,
      updatedAt: "2026-05-25T00:00:03.000Z",
    })
    await expect(listRemoteRuntimeDirectoryAllowlistEntries(store)).resolves.toHaveLength(2)

    await expect(removeRemoteRuntimeDirectoryAllowlistEntryFromStore(store, " ")).rejects.toThrow(
      "Remote runtime directory selector is required.",
    )
    await expect(setRemoteRuntimeDirectoryAllowlistEntryEnabledInStore(store, undefined, true)).rejects.toThrow(
      "Remote runtime directory selector is required.",
    )
    await expect(setRemoteRuntimeDirectoryAllowlistEntryEnabledInStore(store, "missing-id", true)).rejects.toThrow(
      "Remote runtime directory missing-id is not allowlisted.",
    )

    await expect(
      removeRemoteRuntimeDirectoryAllowlistEntryFromStore(store, " /workspace/current/repo "),
    ).resolves.toEqual({
      selector: "/workspace/current/repo",
    })
    await expect(listRemoteRuntimeDirectoryAllowlistEntries(store)).resolves.toEqual([
      expect.objectContaining({
        directoryId: "dir_uuid_1",
      }),
    ])
  })

  test("provides local-gateway route, header, and query preparation helpers", () => {
    expect(remoteRuntimeReadSnapshotPath({ kind: "activeChats" })).toBe("/remote-runtime/chats")
    expect(remoteRuntimeReadSnapshotPath({ kind: "chat", sessionId: "session/one" })).toBe(
      "/remote-runtime/chats/session%2Fone",
    )
    expect(remoteRuntimeReadSnapshotPath({ kind: "chatMessages", sessionId: "session/one" })).toBe(
      "/remote-runtime/chats/session%2Fone/messages",
    )
    expect(remoteRuntimeReadSnapshotPath({ kind: "gitStatus" })).toBe("/remote-runtime/git/status")
    expect(remoteRuntimeReadSnapshotPath({ kind: "goals" })).toBe("/remote-runtime/goals")
    expect(remoteRuntimeReadSnapshotPath({ kind: "aliases" })).toBe("/remote-runtime/aliases")
    expect(remoteRuntimeReadSnapshotPath({ kind: "providers" })).toBe("/remote-runtime/providers")
    expect(remoteRuntimeReadSnapshotPath({ kind: "runtimeCapabilities" })).toBe("/remote-runtime/runtime/capabilities")
    expect(remoteRuntimeReadSnapshotPath({ kind: "runtimeDirectories" })).toBe("/remote-runtime/runtime/directories")
    expect(remoteRuntimeReadSnapshotPath({ kind: "runtimeStatus" })).toBe("/remote-runtime/runtime/status")

    const headers = normalizedRemoteRuntimeHeaders([
      { name: "X-Mobile-Request-Id", value: "request-1", source: "test" },
      { name: "Authorization", value: "Bearer token", source: "test" },
    ])
    expect(headers).toEqual([
      { name: "x-mobile-request-id", value: "request-1", source: "test" },
      { name: "authorization", value: "Bearer token", source: "test" },
    ])
    expect(remoteRuntimeHeaderValue(headers, "X-Mobile-Request-Id")).toBe("request-1")
    expect(remoteRuntimeHeaderValue(headers, "missing")).toBe("")
    expect(
      canonicalRemoteRuntimeQuery([
        { name: "b", value: "2" },
        { name: "a", value: "z z" },
        { name: "a", value: "1" },
        { name: "auth_token", value: "host-basic-token" },
      ]),
    ).toBe("a=1&a=z%20z&b=2")
  })

  test("request timeout only changes request-plane state", () => {
    const request: RemoteRuntimeRequest = {
      requestId: "request-1",
      replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "http-1" }),
      status: "pending",
    }
    const attachment: RemoteRuntimeAttachment = {
      runtimeGatewayAttachmentId: "runtime-attachment-1",
      health: "online",
      consecutiveTimeouts: 0,
    }
    expect(remoteRuntimeRequestTimedOut(request)).toEqual({ ...request, status: "timedOut" })
    expect(attachment).toEqual({
      runtimeGatewayAttachmentId: "runtime-attachment-1",
      health: "online",
      consecutiveTimeouts: 0,
    })
  })

  test("bounded request queue rejects overflow deterministically", () => {
    const request: RemoteRuntimeRequest = {
      requestId: "request-1",
      replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "http-1" }),
      status: "pending",
    }
    const queue = createRemoteRuntimeRequestQueue(1)
    expect(() => createRemoteRuntimeRequestQueue(0)).toThrow(
      "Remote runtime request queue capacity must be a positive integer.",
    )
    const enqueued = enqueueRemoteRuntimeRequest(queue, request)
    expect(enqueued).toEqual({ accepted: true, queue: { capacity: 1, pending: [request] } })
    expect(enqueueRemoteRuntimeRequest(enqueued.queue, { ...request, requestId: "request-2" })).toEqual({
      accepted: false,
      reason: "queueFull",
      queue: enqueued.queue,
    })
  })

  test("request response validation uses typed reply target authority", () => {
    const request: RemoteRuntimeRequest = {
      requestId: "request-1",
      replyTarget: runtimeOperationFrameReplyTarget({ clientAttachmentId: "mobile-attachment-1" }),
      status: "pending",
    }
    const enqueued = enqueueRemoteRuntimeRequest(createRemoteRuntimeRequestQueue(2), request)
    if (!enqueued.accepted) throw new Error("Expected request to enqueue")
    expect(
      respondToRemoteRuntimeRequest(enqueued.queue, {
        requestId: "request-1",
        replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "request-1" }),
      }),
    ).toEqual({ accepted: false, reason: "replyTargetMismatch", queue: enqueued.queue })
    expect(
      respondToRemoteRuntimeRequest(enqueued.queue, {
        requestId: "missing",
        replyTarget: runtimeOperationFrameReplyTarget({ clientAttachmentId: "mobile-attachment-1" }),
      }),
    ).toEqual({ accepted: false, reason: "requestNotPending", queue: enqueued.queue })
    expect(
      respondToRemoteRuntimeRequest(enqueued.queue, {
        requestId: "request-1",
        replyTarget: runtimeOperationFrameReplyTarget({ clientAttachmentId: "mobile-attachment-1" }),
      }),
    ).toEqual({
      accepted: true,
      request: { ...request, status: "responded" },
      queue: { capacity: 2, pending: [] },
    })

    const gatewayRequest: RemoteRuntimeRequest = {
      requestId: "request-2",
      replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "http-2" }),
      status: "pending",
    }
    const gatewayEnqueued = enqueueRemoteRuntimeRequest(createRemoteRuntimeRequestQueue(1), gatewayRequest)
    if (!gatewayEnqueued.accepted) throw new Error("Expected gateway request to enqueue")
    expect(
      respondToRemoteRuntimeRequest(gatewayEnqueued.queue, {
        requestId: "request-2",
        replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "http-2" }),
      }),
    ).toEqual({
      accepted: true,
      request: { ...gatewayRequest, status: "responded" },
      queue: { capacity: 1, pending: [] },
    })
  })

  test("request timeout cleanup does not recreate late response state", () => {
    const request: RemoteRuntimeRequest = {
      requestId: "request-1",
      replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "http-1" }),
      status: "pending",
    }
    const enqueued = enqueueRemoteRuntimeRequest(createRemoteRuntimeRequestQueue(1), request)
    if (!enqueued.accepted) throw new Error("Expected request to enqueue")
    const timedOut = timeoutRemoteRuntimeRequest(enqueued.queue, "request-1")
    expect(timedOut).toEqual({
      timedOut: true,
      request: { ...request, status: "timedOut" },
      queue: { capacity: 1, pending: [] },
    })
    if (!timedOut.timedOut) throw new Error("Expected request to time out")
    expect(timeoutRemoteRuntimeRequest(timedOut.queue, "request-1")).toEqual({
      timedOut: false,
      reason: "requestNotPending",
      queue: timedOut.queue,
    })
    expect(
      respondToRemoteRuntimeRequest(timedOut.queue, {
        requestId: "request-1",
        replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "http-1" }),
      }),
    ).toEqual({ accepted: false, reason: "requestNotPending", queue: timedOut.queue })
  })

  test("delivery failure classification ignores late gateway HTTP responses only", () => {
    class GatewayAttachmentUnavailableError extends Error {
      constructor() {
        super("gateway attachment unavailable")
        this.name = "GatewayAttachmentUnavailableError"
      }
    }
    const gatewayError = new GatewayAttachmentUnavailableError()
    const deliveryError = new Error("delivery failed")
    const isGatewayAttachmentUnavailable = (error: Error) => error instanceof GatewayAttachmentUnavailableError
    expect(
      classifyRemoteRuntimeEnvelopeDeliveryFailure({
        error: gatewayError,
        isGatewayAttachmentUnavailable,
        replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "http-1" }),
      }),
    ).toEqual({ errorName: "GatewayAttachmentUnavailableError", stage: "lateGatewayHttpResponseIgnored" })
    expect(
      classifyRemoteRuntimeEnvelopeDeliveryFailure({
        error: gatewayError,
        isGatewayAttachmentUnavailable,
        replyTarget: runtimeOperationFrameReplyTarget({ clientAttachmentId: "mobile-attachment-1" }),
      }),
    ).toEqual({ error: gatewayError, errorName: "GatewayAttachmentUnavailableError", stage: "responseDeliveryFailed" })
    expect(
      classifyRemoteRuntimeEnvelopeDeliveryFailure({
        error: deliveryError,
        isGatewayAttachmentUnavailable,
        replyTarget: runtimeOperationFrameReplyTarget({ gatewayHttpRequestId: "http-1" }),
      }),
    ).toEqual({ error: deliveryError, errorName: "Error", stage: "responseDeliveryFailed" })
  })

  test("repeated attachment timeouts degrade before unavailable and heartbeat restores online", () => {
    const attachment: RemoteRuntimeAttachment = {
      runtimeGatewayAttachmentId: "runtime-attachment-1",
      health: "online",
      consecutiveTimeouts: 0,
    }
    const first = recordRuntimeAttachmentTimeout(attachment)
    const degraded = recordRuntimeAttachmentTimeout(first)
    const stillDegraded = recordRuntimeAttachmentTimeout(degraded)
    const unavailable = recordRuntimeAttachmentTimeout(stillDegraded)
    expect(first).toEqual({ ...attachment, consecutiveTimeouts: 1 })
    expect(degraded).toEqual({ ...attachment, consecutiveTimeouts: 2, health: "degraded" })
    expect(stillDegraded).toEqual({ ...attachment, consecutiveTimeouts: 3, health: "degraded" })
    expect(unavailable).toEqual({ ...attachment, consecutiveTimeouts: 4, health: "unavailable" })
    expect(recordRuntimeAttachmentHeartbeat(unavailable)).toEqual({
      ...attachment,
      consecutiveTimeouts: 0,
      health: "online",
    })
  })

  test("subscription lifecycle is owned by real remote runtime attachment authority", () => {
    const subscription = createRemoteRuntimeSubscription({
      subscriptionId: "subscription-1",
      owner: runtimeOwnerForRemoteRuntimeAttachment("mobile-attachment-1"),
    })
    const firstFailure = recordRemoteRuntimeSubscriptionDeliveryFailure(subscription, 2)
    const detached = recordRemoteRuntimeSubscriptionDeliveryFailure(firstFailure, 2)
    expect(subscription).toEqual({
      subscriptionId: "subscription-1",
      owner: { kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId: "mobile-attachment-1" },
      consecutiveDeliveryFailures: 0,
      state: "active",
    })
    expect(firstFailure).toEqual({ ...subscription, consecutiveDeliveryFailures: 1 })
    expect(detached).toEqual({ ...subscription, consecutiveDeliveryFailures: 2, state: "detached" })
    expect(recordRemoteRuntimeSubscriptionDeliverySuccess(firstFailure)).toEqual({
      ...subscription,
      consecutiveDeliveryFailures: 0,
    })
  })

  test("tracks observed remote runtime client attachments without duplicate or heuristic authority", () => {
    const tracker = createRemoteRuntimeClientAttachmentTracker(["mobile-attachment-1", "mobile-attachment-1"])
    expect(tracker).toEqual({ remoteRuntimeClientAttachmentIds: ["mobile-attachment-1"] })
    expect(hasRemoteRuntimeClientAttachment(tracker, "mobile-attachment-1")).toBe(true)
    expect(observeRemoteRuntimeClientAttachment(tracker, "mobile-attachment-1")).toEqual({ observed: false, tracker })
    const observed = observeRemoteRuntimeClientAttachment(tracker, "mobile-attachment-2")
    expect(observed).toEqual({
      observed: true,
      tracker: { remoteRuntimeClientAttachmentIds: ["mobile-attachment-1", "mobile-attachment-2"] },
    })
    expect(detachRemoteRuntimeClientAttachment(observed.tracker, "missing")).toEqual({
      detached: false,
      tracker: observed.tracker,
    })
    const detached = detachRemoteRuntimeClientAttachment(observed.tracker, "mobile-attachment-1")
    expect(detached).toEqual({
      detached: true,
      tracker: { remoteRuntimeClientAttachmentIds: ["mobile-attachment-2"] },
    })
    expect(detachAllRemoteRuntimeClientAttachments(observed.tracker)).toEqual({
      detachedRemoteRuntimeClientAttachmentIds: ["mobile-attachment-1", "mobile-attachment-2"],
      tracker: { remoteRuntimeClientAttachmentIds: [] },
    })
  })

  test("runs runtime heartbeats on an injected interval and isolates transient failures", async () => {
    const sleeps: number[] = []
    let heartbeats = 0
    const abort = new AbortController()
    let resolveDone: () => void = () => {}
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve
    })
    const runner = startRemoteRuntimeHeartbeatRunner({
      intervalMs: 25,
      async onHeartbeat() {
        heartbeats += 1
        if (heartbeats === 2) {
          abort.abort("done")
          resolveDone()
        }
        if (heartbeats === 1) throw new Error("temporary heartbeat failure")
      },
      signal: abort.signal,
      async sleep(milliseconds) {
        sleeps.push(milliseconds)
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      },
    })
    await done
    await runner.stop()
    expect(sleeps).toEqual([25, 25])
    expect(heartbeats).toBe(2)
  })

  test("stops runtime heartbeat runner on aborts and disabled intervals", async () => {
    let disabledHeartbeats = 0
    const disabled = startRemoteRuntimeHeartbeatRunner({
      intervalMs: 0,
      onHeartbeat() {
        disabledHeartbeats += 1
      },
      async sleep() {
        throw new Error("disabled heartbeat should not sleep")
      },
    })
    await disabled.stop()
    expect(disabledHeartbeats).toBe(0)

    const externalAbort = new AbortController()
    let abortedHeartbeats = 0
    const aborted = startRemoteRuntimeHeartbeatRunner({
      intervalMs: 1,
      onHeartbeat(signal) {
        abortedHeartbeats += 1
        externalAbort.abort(signal.reason)
      },
      signal: externalAbort.signal,
      async sleep(_milliseconds, signal) {
        if (abortedHeartbeats === 0) return
        await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))
      },
    })
    await aborted.stop()
    expect(abortedHeartbeats).toBeLessThanOrEqual(1)

    const defaultSleepRunner = startRemoteRuntimeHeartbeatRunner({
      intervalMs: 1_000,
      onHeartbeat() {
        throw new Error("stopped runner should not heartbeat")
      },
    })
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    await defaultSleepRunner.stop()
  })

  test("queues runtime socket messages across open, wait, close, and abort lifecycles", async () => {
    const socket = new FakeRemoteRuntimeSocket()
    const abort = new AbortController()
    const queue = createRemoteRuntimeSocketMessageQueue({ parseMessage: parseSocketText, signal: abort.signal, socket })
    const waiting = queue.next()
    socket.emit("open")
    await expect(queue.opened).resolves.toBeUndefined()
    socket.emit("message", { data: "first" })
    await expect(waiting).resolves.toEqual({ done: false, value: "first" })
    socket.emit("message", { data: "second" })
    await expect(queue.next()).resolves.toEqual({ done: false, value: "second" })
    const closeWaiter = queue.next()
    socket.emit("close")
    await expect(closeWaiter).resolves.toEqual({ done: true })
    await expect(queue.next()).resolves.toEqual({ done: true })

    const abortedSocket = new FakeRemoteRuntimeSocket()
    const aborted = new AbortController()
    const abortedQueue = createRemoteRuntimeSocketMessageQueue({
      parseMessage: parseSocketText,
      signal: aborted.signal,
      socket: abortedSocket,
    })
    aborted.abort("done")
    await expect(abortedQueue.opened).rejects.toThrow("Remote runtime websocket aborted before opening.")
    await expect(abortedQueue.next()).resolves.toEqual({ done: true })
  })

  test("runtime socket queue reports parse and pre-open close failures", async () => {
    const parseFailureSocket = new FakeRemoteRuntimeSocket()
    const parseFailureQueue = createRemoteRuntimeSocketMessageQueue({
      parseMessage: parseSocketText,
      socket: parseFailureSocket,
    })
    const waiting = parseFailureQueue.next()
    parseFailureSocket.emit("message")
    await expect(parseFailureQueue.opened).rejects.toThrow("missing message")
    await expect(waiting).rejects.toThrow("missing message")
    await expect(parseFailureQueue.next()).rejects.toThrow("missing message")
    parseFailureSocket.emit("message")

    const closeSocket = new FakeRemoteRuntimeSocket()
    const closeQueue = createRemoteRuntimeSocketMessageQueue({ parseMessage: parseSocketText, socket: closeSocket })
    closeSocket.emit("close")
    await expect(closeQueue.opened).rejects.toThrow("Remote runtime websocket closed before opening.")
    await expect(closeQueue.next()).resolves.toEqual({ done: true })

    const errorSocket = new FakeRemoteRuntimeSocket()
    const errorQueue = createRemoteRuntimeSocketMessageQueue({ parseMessage: parseSocketText, socket: errorSocket })
    errorSocket.emit("error")
    await expect(errorQueue.opened).rejects.toThrow("Remote runtime websocket errored before opening.")
  })

  test("setup timeout resolves completed work and rejects slow setup", async () => {
    await expect(
      withRemoteRuntimeSetupTimeout({
        message: "setup timed out",
        promise: Promise.resolve("accepted"),
        timeoutMs: 1_000,
      }),
    ).resolves.toBe("accepted")

    await expect(
      withRemoteRuntimeSetupTimeout({
        message: "setup timed out",
        promise: new Promise<string>(() => {}),
        timeoutMs: 0,
      }),
    ).rejects.toThrow("setup timed out")
  })

  test("builds gateway runtime attachment websocket URLs from explicit authority", () => {
    expect(
      remoteRuntimeGatewayRuntimeAttachmentSocketUrl({
        apiBaseUrl: "https://api.interbase.test/base",
        runtimeInstallationId: "runtime-1",
      }),
    ).toBe(
      "wss://api.interbase.test/api/remote-runtime/gateway/runtime-attachments/socket?runtimeInstallationId=runtime-1",
    )
    expect(
      remoteRuntimeGatewayRuntimeAttachmentSocketUrl({
        apiBaseUrl: "http://127.0.0.1:4000",
        runtimeInstallationId: "runtime/with spaces",
      }),
    ).toBe(
      "ws://127.0.0.1:4000/api/remote-runtime/gateway/runtime-attachments/socket?runtimeInstallationId=runtime%2Fwith+spaces",
    )
  })

  test("builds remote runtime host selector and page paths", () => {
    const host = { url: "http://127.0.0.1:4096/base" }
    expect(
      remoteRuntimeHostSelectorPath(host, "/global/remote-runtime/runtime/status", {
        directory: "/repo with space",
        directoryId: "dir-1",
        runtimeInstallationId: "runtime-1",
      }),
    ).toBe(
      "/global/remote-runtime/runtime/status?directoryId=dir-1&directory=%2Frepo+with+space&runtimeInstallationId=runtime-1",
    )
    expect(remoteRuntimeHostSelectorPath(host, "/global/remote-runtime/runtime/status?existing=1", {})).toBe(
      "/global/remote-runtime/runtime/status?existing=1",
    )
    expect(
      remoteRuntimeHostPagePath(host, "/global/remote-runtime/chats/session-1/messages", {
        cursor: "cursor-1",
        directoryId: "dir-1",
        limit: 25,
      }),
    ).toBe("/global/remote-runtime/chats/session-1/messages?directoryId=dir-1&cursor=cursor-1&limit=25")
    expect(
      remoteRuntimeHostPagePath(host, "/global/remote-runtime/chats/session-1/messages", {
        cursor: null,
        runtimeInstallationId: "runtime-1",
        limit: null,
      }),
    ).toBe("/global/remote-runtime/chats/session-1/messages?runtimeInstallationId=runtime-1")
    expect(
      remoteRuntimeHostGitStatusPath(host, "/global/remote-runtime/git/status", {
        directoryId: "dir-1",
        includeDiff: true,
        maxDiffBytes: 1024,
      }),
    ).toBe("/global/remote-runtime/git/status?directoryId=dir-1&includeDiff=true&maxDiffBytes=1024")
  })

  test("builds remote runtime launch agent definitions", () => {
    const launchAgent = buildRemoteRuntimeLaunchAgent({
      accountId: "account-1",
      apiBaseUrl: "https://api.example.test",
      directory: "/Users/rk/project & more",
      executable: "/usr/local/bin/interbase",
      executableArgs: ["--from-test", null as never],
      intervalSeconds: 300,
      label: "Interbase <Runtime Client> & Server",
      logPath: "/tmp/remote-runtime.log",
      plistPath: "/Users/rk/Library/LaunchAgents/Interbase Runtime Client Server.plist",
      pollIntervalMs: 250,
      runtimeInstallationId: "runtime-1",
    })
    expect(launchAgent.programArguments).toEqual([
      "/usr/local/bin/interbase",
      "--from-test",
      null,
      "remote",
      "start",
      "--account-id",
      "account-1",
      "--api-url",
      "https://api.example.test",
      "--runtime-installation-id",
      "runtime-1",
      "--poll-interval-ms",
      "250",
    ])
    expect(launchAgent.plistPath).toBe("/Users/rk/Library/LaunchAgents/Interbase Runtime Client Server.plist")
    expect(launchAgent.plist).toContain("<key>INTERBASE_RUNTIME_CLIENT_LAUNCHD_CHILD</key>")
    expect(launchAgent.plist).toContain("<false/>")
    expect(launchAgent.plist).toContain("<string></string>")
    expect(launchAgent.plist).toContain("Interbase &lt;Runtime Client&gt; &amp; Server")
    expect(launchAgent.plist).toContain("/Users/rk/project &amp; more")

    expect(
      buildRemoteRuntimeLaunchAgent({
        accountId: "account-1",
        apiBaseUrl: "https://api.example.test",
        directory: "/repo",
        executable: "interbase",
        intervalSeconds: 300,
        label: "Interbase Runtime Client Server",
        logPath: "/tmp/remote-runtime.log",
        plistPath: "/tmp/runtime-client.plist",
        runtimeInstallationId: "runtime-1",
      }).programArguments.at(-1),
    ).toBe("1000")
  })

  test("performs remote runtime host JSON requests with merged auth headers", async () => {
    const requests: Array<{
      readonly url: string
      readonly headers: Record<string, string>
      readonly method?: string
    }> = []
    const fetch = mockFetch(async (url, init) => {
      requests.push({
        url: String(url),
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        method: init?.method,
      })
      return Response.json({ accepted: true })
    })

    await expect(
      remoteRuntimeHostJsonRequest<{ readonly accepted: true }>({
        deps: {
          fetch,
          serverAuthHeaders: ({ password }): HeadersInit => {
            if (password) return { authorization: `Bearer ${password}` }
            return new Headers()
          },
        },
        host: { password: "host-secret", url: "http://127.0.0.1:4096/base" },
        init: {
          headers: { "content-type": "application/json" },
          method: "POST",
        },
        path: "/global/remote-runtime/runtime/start",
      }),
    ).resolves.toEqual({ accepted: true })

    expect(requests).toEqual([
      {
        headers: {
          authorization: "Bearer host-secret",
          "content-type": "application/json",
        },
        method: "POST",
        url: "http://127.0.0.1:4096/global/remote-runtime/runtime/start",
      },
    ])

    await expect(
      remoteRuntimeHostJsonRequest<{ readonly accepted: true }>({
        deps: {
          fetch: mockFetch(async () => new Response("bad request", { status: 400 })),
          serverAuthHeaders: () => ({}),
        },
        host: { url: "http://127.0.0.1:4096" },
        path: "/global/remote-runtime/runtime/start",
      }),
    ).rejects.toThrow("Remote runtime host request failed: 400: bad request")
  })

  test("creates typed remote runtime host clients over public host routes", async () => {
    const requests: Array<{
      readonly body?: string
      readonly method?: string
      readonly url: string
    }> = []
    const client = createRemoteRuntimeHostClient(
      { password: "host-secret", url: "http://127.0.0.1:4096/base" },
      {
        fetch: mockFetch(async (url, init) => {
          requests.push({
            body: typeof init?.body === "string" ? init.body : undefined,
            method: init?.method,
            url: String(url),
          })
          return Response.json({ accepted: true, route: new URL(String(url)).pathname })
        }),
        serverAuthHeaders: ({ password }) => ({ authorization: `Bearer ${password}` }),
      },
    )

    await client.configureEncryption({ runtimeInstallationId: "rti_1", setupToken: "setup_1" })
    await client.logs({ all: true })
    await client.listRemoteRuntimeActiveChats({ cursor: "cur_1", directoryId: "dir_1", limit: 5 })
    await client.readRemoteRuntimeChat({ directoryId: "dir_1", sessionId: "ses 1" })
    await client.listRemoteRuntimeChatMessages({ cursor: "cur_2", directoryId: "dir_1", limit: 5, sessionId: "ses 1" })
    await client.listRemoteRuntimeProviders({ directoryId: "dir_1" })
    await client.readRemoteRuntimeGitStatus({ directoryId: "dir_1", includeDiff: true, maxDiffBytes: 1024 })
    await client.listRemoteRuntimeGoals({ cursor: "goal_cur_1", directoryId: "dir_1", limit: 20 })
    await client.listRemoteRuntimeAliases({ directoryId: "dir_1" })
    await client.startRemoteRuntimeChat({ directoryId: "dir_1", idempotencyKey: "idem_1", requestId: "req_1" })
    await client.sendRemoteRuntimeChatMessage({
      directoryId: "dir_1",
      idempotencyKey: "idem_2",
      input: { content: "hello" },
      requestId: "req_2",
      sessionId: "ses 1",
    })
    await client.updateRemoteRuntimeChat({
      directoryId: "dir_1",
      idempotencyKey: "idem_3",
      input: { model: "sonnet", providerId: "anthropic" },
      requestId: "req_3",
      sessionId: "ses 1",
    })
    await client.start({
      accountId: "acct_1",
      apiBaseUrl: "https://api.example.test",
      authorizationToken: "token_1",
      directory: "/repo",
      directoryId: "dir_1",
      runtimeInstallationId: "rti_1",
    })
    await client.publishSessionActivity({
      directory: "/repo",
      event: { properties: { sessionID: "ses_1" }, type: "session.updated" },
    })
    await client.status({ runtimeInstallationId: "rti_1" })
    await client.stop({ runtimeInstallationId: "rti_1" })
    await client.shutdownHost({ expectedPid: 123 })

    expect(
      requests.map(
        (request) => `${request.method ?? "GET"} ${new URL(request.url).pathname}${new URL(request.url).search}`,
      ),
    ).toEqual([
      "POST /global/remote-runtime/runtime/encryption",
      "GET /global/remote-runtime/runtime/logs?all=true",
      "GET /global/remote-runtime/chats?directoryId=dir_1&cursor=cur_1&limit=5",
      "GET /global/remote-runtime/chats/ses%201?directoryId=dir_1",
      "GET /global/remote-runtime/chats/ses%201/messages?directoryId=dir_1&cursor=cur_2&limit=5",
      "GET /global/remote-runtime/providers?directoryId=dir_1",
      "GET /global/remote-runtime/git/status?directoryId=dir_1&includeDiff=true&maxDiffBytes=1024",
      "GET /global/remote-runtime/goals?directoryId=dir_1&cursor=goal_cur_1&limit=20",
      "GET /global/remote-runtime/aliases?directoryId=dir_1",
      "POST /global/remote-runtime/runtime/chats",
      "POST /global/remote-runtime/runtime/chats/ses%201/messages",
      "PATCH /global/remote-runtime/runtime/chats/ses%201",
      "POST /global/remote-runtime/runtime/start",
      "POST /global/remote-runtime/runtime/session-activity",
      "GET /global/remote-runtime/runtime/status?runtimeInstallationId=rti_1",
      "POST /global/remote-runtime/runtime/stop",
      "POST /global/remote-runtime/runtime/host/stop",
    ])
    expect(JSON.parse(requests[0]!.body ?? "{}")).toMatchObject({ setupToken: "setup_1" })
    expect(JSON.parse(requests.at(-1)!.body ?? "{}")).toEqual({ expectedPid: 123 })
  })

  test("installs and removes remote runtime launch agents", async () => {
    type LaunchdTestState = {
      readonly host?: { readonly url: string }
      readonly launchd?: {
        readonly intervalSeconds: number
        readonly label: string
        readonly plistPath: string
        readonly runtimeInstallationId: string
      }
    }
    let state: LaunchdTestState = {
      host: { url: "http://127.0.0.1:4096" },
      launchd: {
        intervalSeconds: 120,
        label: "Old Runtime Client Server",
        plistPath: "/Users/rk/Library/LaunchAgents/Old Runtime Client Server.plist",
        runtimeInstallationId: "old-runtime",
      },
    }
    const launchctlCalls: Array<{ readonly args: readonly string[]; readonly tolerateFailure?: boolean }> = []
    const removedFiles: string[] = []
    const directories: string[] = []
    const writtenFiles: Array<{ readonly data: string; readonly mode: number; readonly path: string }> = []
    const deps = {
      dirname: (path: string) => path.slice(0, path.lastIndexOf("/")),
      hostCommand: () => ({ args: ["--from-test"], executable: "/usr/local/bin/interbase" }),
      launchAgentLabel: () => "Interbase Runtime Client Server",
      launchAgentsDir: () => "/Users/rk/Library/LaunchAgents/",
      launchctl: (args: readonly string[], options?: { readonly tolerateFailure?: boolean }) => {
        launchctlCalls.push({ args, tolerateFailure: options?.tolerateFailure })
      },
      launchctlGuiDomain: () => "gui/501",
      logPath: () => "/Users/rk/Library/Logs/interbase/remote-runtime.log",
      mkdir: async (path: string) => {
        directories.push(path)
      },
      readState: async () => state,
      removeFile: async (path: string) => {
        removedFiles.push(path)
      },
      shouldManage: () => true,
      writeFile: async (path: string, data: string, options: { readonly mode: number }) => {
        writtenFiles.push({ data, mode: options.mode, path })
      },
      writeState: async (nextState: LaunchdTestState) => {
        state = nextState
      },
    }

    await expect(
      installRemoteRuntimeLaunchAgent(deps, {
        accountId: "account-1",
        apiBaseUrl: "https://api.example.test",
        directory: "/repo",
        pollIntervalMs: 250,
        runtimeInstallationId: "runtime-1",
        startIntervalSeconds: 30,
      }),
    ).resolves.toEqual({
      intervalSeconds: 60,
      label: "Interbase Runtime Client Server",
      plistPath: "/Users/rk/Library/LaunchAgents/Interbase Runtime Client Server.plist",
      runtimeInstallationId: "runtime-1",
    })

    expect(removedFiles).toEqual(["/Users/rk/Library/LaunchAgents/Old Runtime Client Server.plist"])
    expect(directories).toEqual(["/Users/rk/Library/LaunchAgents", "/Users/rk/Library/Logs/interbase"])
    expect(writtenFiles).toHaveLength(1)
    expect(writtenFiles[0]?.mode).toBe(0o644)
    expect(writtenFiles[0]?.data).toContain("--from-test")
    expect(launchctlCalls).toEqual([
      {
        args: ["bootout", "gui/501", "/Users/rk/Library/LaunchAgents/Old Runtime Client Server.plist"],
        tolerateFailure: true,
      },
      {
        args: ["bootout", "gui/501", "/Users/rk/Library/LaunchAgents/Interbase Runtime Client Server.plist"],
        tolerateFailure: true,
      },
      {
        args: ["bootstrap", "gui/501", "/Users/rk/Library/LaunchAgents/Interbase Runtime Client Server.plist"],
        tolerateFailure: undefined,
      },
      { args: ["enable", "gui/501/Interbase Runtime Client Server"], tolerateFailure: true },
      { args: ["kickstart", "-k", "gui/501/Interbase Runtime Client Server"], tolerateFailure: true },
    ])

    state = {
      host: { url: "http://127.0.0.1:4096" },
      launchd: {
        intervalSeconds: 60,
        label: "Interbase Runtime Client Server",
        plistPath: "/Users/rk/Library/LaunchAgents/Interbase Runtime Client Server.plist",
        runtimeInstallationId: "runtime-1",
      },
    }
    await expect(removeRemoteRuntimeLaunchAgent(deps, { runtimeInstallationId: "other-runtime" })).resolves.toEqual(
      state.launchd,
    )
    await expect(removeRemoteRuntimeLaunchAgent(deps, { runtimeInstallationId: "runtime-1" })).resolves.toBeUndefined()
    expect(state).toEqual({ host: { url: "http://127.0.0.1:4096" }, launchd: undefined })

    await expect(
      installRemoteRuntimeLaunchAgent(
        { ...deps, shouldManage: () => false },
        {
          accountId: "account-1",
          apiBaseUrl: "https://api.example.test",
          directory: "/repo",
          runtimeInstallationId: "runtime-1",
        },
      ),
    ).resolves.toBeUndefined()
    await expect(
      removeRemoteRuntimeLaunchAgent(
        { ...deps, readState: async () => ({ host: state.host, launchd: undefined }) },
        {
          runtimeInstallationId: "runtime-1",
        },
      ),
    ).resolves.toBeUndefined()
  })

  test("resolves remote runtime host commands", () => {
    const executableBasename = (executable: string) => executable.split("/").at(-1) ?? executable
    expect(
      resolveRemoteRuntimeHostCommand({
        args: ["remote", "start"],
        binPath: " /opt/interbase/bin/interbase ",
        execPath: "/usr/local/bin/node",
        executableBasename,
        scriptPath: "/repo/bin/interbase",
      }),
    ).toEqual({ args: ["remote", "start"], executable: "/opt/interbase/bin/interbase" })
    expect(
      resolveRemoteRuntimeHostCommand({
        args: ["remote", "start"],
        execPath: "/Users/rk/.bun/bin/bun",
        executableBasename,
        scriptPath: " /repo/packages/cli/bin/interbase ",
      }),
    ).toEqual({ args: ["/repo/packages/cli/bin/interbase", "remote", "start"], executable: "/Users/rk/.bun/bin/bun" })
    expect(
      resolveRemoteRuntimeHostCommand({
        args: ["remote", "start"],
        execPath: "/usr/local/bin/node",
        executableBasename,
        scriptPath: "/repo/packages/cli/bin/interbase",
      }),
    ).toEqual({ args: ["remote", "start"], executable: "/usr/local/bin/node" })
  })

  test("resolves and launches remote runtime hosts through injected process authority", async () => {
    type ResolverTestState = {
      readonly host?: { readonly password?: string; readonly pid?: number; readonly url: string }
      readonly marker?: string
    }
    let state: ResolverTestState = { marker: "keep" }
    const spawns: Array<{
      readonly args: readonly string[]
      readonly envPassword?: string
      readonly executable: string
    }> = []
    const stopped: string[] = []
    const resolver = createRemoteRuntimeHostResolver({
      environment: {
        INTERBASE_SERVER_PASSWORD: "server_pw",
      },
      freePort: async () => 4555,
      hostCommand: (args) => ({ args: ["--from-test", ...args], executable: "/usr/local/bin/interbase" }),
      isHostCompatible: async (host) => host.url === "http://127.0.0.1:4555",
      isPortOccupiedByIncompatibleHost: async (port) => port === 4096,
      randomUUID: () => "generated_pw",
      readState: async () => state,
      spawnDetached: (executable, args, options) => {
        spawns.push({ args, envPassword: options.env.INTERBASE_SERVER_PASSWORD, executable })
        return { pid: 1234, unref: () => undefined }
      },
      stopHost: async (host) => {
        stopped.push(host.url)
        throw new Error("stop failure ignored")
      },
      waitForHost: async (host) => {
        expect(host.url).toBe("http://127.0.0.1:4555")
      },
      writeState: async (nextState) => {
        state = nextState
      },
    })

    await expect(resolver.ensure()).resolves.toEqual({
      password: "server_pw",
      pid: 1234,
      url: "http://127.0.0.1:4555",
    })
    expect(state.marker).toBe("keep")
    expect(spawns).toEqual([
      {
        args: ["--from-test", "serve", "--hostname", "127.0.0.1", "--port", "4555"],
        envPassword: "server_pw",
        executable: "/usr/local/bin/interbase",
      },
    ])
    await expect(resolver.read()).resolves.toEqual({
      password: "server_pw",
      pid: 1234,
      url: "http://127.0.0.1:4555",
    })
    await expect(resolver.ensure()).resolves.toEqual({
      password: "server_pw",
      pid: 1234,
      url: "http://127.0.0.1:4555",
    })
    expect(spawns).toHaveLength(1)
    expect(stopped).toEqual([])

    state = { host: { url: "http://127.0.0.1:4000" }, marker: "keep" }
    await expect(resolver.ensure()).resolves.toEqual({
      password: "server_pw",
      pid: 1234,
      url: "http://127.0.0.1:4555",
    })
    expect(stopped).toEqual(["http://127.0.0.1:4000"])

    const configuredResolver = createRemoteRuntimeHostResolver({
      environment: {
        INTERBASE_RUNTIME_CLIENT_HOST_PASSWORD: "configured_pw",
        INTERBASE_RUNTIME_CLIENT_HOST_URL: " http://127.0.0.1:7777 ",
      },
      freePort: async () => 4555,
      hostCommand: () => ({ args: [], executable: "interbase" }),
      isHostCompatible: async () => false,
      isPortOccupiedByIncompatibleHost: async () => false,
      randomUUID: () => "generated_pw",
      readState: async () => ({ host: undefined, marker: "unused" }),
      spawnDetached: () => {
        throw new Error("configured host should not spawn")
      },
      waitForHost: async () => undefined,
      writeState: async () => undefined,
    })
    await expect(configuredResolver.ensure()).resolves.toEqual({
      password: "configured_pw",
      url: "http://127.0.0.1:7777",
    })
    await expect(configuredResolver.read()).resolves.toEqual({
      password: "configured_pw",
      url: "http://127.0.0.1:7777",
    })

    let failureState: ResolverTestState = { marker: "failure" }
    const failingResolver = createRemoteRuntimeHostResolver({
      environment: {},
      freePort: async () => 4555,
      hostCommand: (args) => ({ args, executable: "interbase" }),
      isHostCompatible: async () => false,
      isPortOccupiedByIncompatibleHost: async () => false,
      randomUUID: () => "generated_pw",
      readState: async () => failureState,
      spawnDetached: () => ({ pid: 2345, unref: () => undefined }),
      stopHost: async (host) => {
        stopped.push(`failed:${host.url}`)
        throw new Error("stop failure ignored")
      },
      waitForHost: async () => {
        throw new Error("host did not start")
      },
      writeState: async (nextState) => {
        failureState = nextState
      },
    })
    await expect(failingResolver.ensure()).rejects.toThrow("host did not start")
    expect(failureState).toEqual({ marker: "failure", host: undefined })
    expect(stopped).toContain("failed:http://127.0.0.1:4096")
  })

  test("starts and stops remote runtimes on runtime hosts", async () => {
    type LocalAuthority = { readonly trustedRuntimeClientId: string }
    type RuntimeKey = { readonly keyId: string }
    type LifecycleState = {
      readonly marker?: string
      readonly host?: { readonly password?: string; readonly pid?: number; readonly url: string }
      readonly launchd?: {
        readonly intervalSeconds: number
        readonly label: string
        readonly plistPath: string
        readonly runtimeInstallationId: string
      }
      readonly runtime?: {
        readonly accountId: string
        readonly allowedDirectories?: readonly {
          readonly directoryId: string
          readonly displayName?: string | null
          readonly path: string
        }[]
        readonly apiBaseUrl: string
        readonly directoryId: string
        readonly directory: string
        readonly gatewayRuntimeAttachmentId?: string
        readonly localGatewayAuthority?: LocalAuthority
        readonly runtimeEncryptionKey?: RuntimeKey
        readonly runtimeInstallationId: string
        readonly startedAt?: string
        readonly state?: string
      }
    }
    const host = { password: "pw_1", pid: 1234, url: "http://127.0.0.1:4096" }
    let state: LifecycleState = {
      marker: "keep",
      runtime: {
        accountId: "account-1",
        apiBaseUrl: "https://old.example.test",
        directoryId: "old-directory",
        directory: "/old",
        localGatewayAuthority: { trustedRuntimeClientId: "trusted-old" },
        runtimeInstallationId: "runtime-1",
        state: "online",
      },
    }
    const starts: Array<{
      readonly directory: string
      readonly localAuthority?: LocalAuthority
      readonly key?: RuntimeKey
    }> = []
    const stops: Array<{ readonly directoryId?: string; readonly runtimeInstallationId?: string }> = []
    const shutdowns: string[] = []
    const deps: RemoteRuntimeHostLifecycleDeps<LifecycleState, LocalAuthority, RuntimeKey> = {
      ensureHost: async () => host,
      hostClient: () => ({
        start: async (input) => {
          starts.push({
            directory: input.directory,
            localAuthority: input.localGatewayAuthority,
            key: input.runtimeEncryptionKey,
          })
          return {
            accountId: input.accountId,
            apiBaseUrl: input.apiBaseUrl,
            directory: input.directory,
            gatewayRuntimeAttachmentId: "gateway-runtime-1",
            runtimeInstallationId: input.runtimeInstallationId,
            startedAt: "2026-05-25T00:00:00.000Z",
            state: "online",
          }
        },
        status: async () => [],
        stop: async (input) => {
          stops.push({ directoryId: input.directoryId, runtimeInstallationId: input.runtimeInstallationId })
          return [
            {
              accountId: "account-1",
              apiBaseUrl: "https://api.example.test",
              directory: "/repo",
              runtimeInstallationId: "runtime-1",
              state: "stopped",
            },
          ]
        },
      }),
      installLaunchAgent: async () => ({
        intervalSeconds: 300,
        label: "Interbase Runtime Client Server",
        plistPath: "/Users/rk/Library/LaunchAgents/Interbase Runtime Client Server.plist",
        runtimeInstallationId: "runtime-1",
      }),
      readHost: async () => host,
      readState: async () => state,
      shutdownHost: async (inputHost) => {
        shutdowns.push(inputHost.url)
      },
      writeState: async (nextState) => {
        state = nextState
      },
    }

    await expect(
      startRemoteRuntimesOnHost(deps, {
        accountId: "account-1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "token-1",
        directories: [{ directoryId: "directory-1", enabled: true, path: "/repo" }],
        pollIntervalMs: 250,
        runtimeEncryptionKey: { keyId: "key-1" },
        runtimeInstallationId: "runtime-1",
      }),
    ).resolves.toMatchObject([{ state: "online" }])
    expect(starts).toEqual([{ directory: "/repo", key: { keyId: "key-1" }, localAuthority: undefined }])
    expect(state).toMatchObject({
      marker: "keep",
      host,
      launchd: { intervalSeconds: 300 },
      runtime: {
        directoryId: "directory-1",
        gatewayRuntimeAttachmentId: "gateway-runtime-1",
        localGatewayAuthority: { trustedRuntimeClientId: "trusted-old" },
        runtimeEncryptionKey: { keyId: "key-1" },
      },
    })

    await expect(
      startRemoteRuntimesOnHost(deps, {
        accountId: "account-1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "token-1",
        directories: [
          { directoryId: "disabled", enabled: false, path: "/disabled" },
          { directoryId: "enabled", enabled: true, path: "/enabled" },
        ],
        launchd: { enabled: false },
        localGatewayAuthority: { trustedRuntimeClientId: "trusted-new" },
        runtimeInstallationId: "runtime-2",
      }),
    ).resolves.toHaveLength(1)
    expect(state.runtime?.allowedDirectories).toEqual([
      { directoryId: "enabled", displayName: "enabled", path: "/enabled" },
    ])
    expect(starts.at(-1)).toEqual({
      directory: "/enabled",
      key: undefined,
      localAuthority: { trustedRuntimeClientId: "trusted-new" },
    })
    await expect(
      startRemoteRuntimesOnHost(deps, {
        accountId: "account-1",
        apiBaseUrl: "https://api.example.test",
        authorizationToken: "token-1",
        directories: [{ directoryId: "disabled", enabled: false, path: "/disabled" }],
        runtimeInstallationId: "runtime-3",
      }),
    ).resolves.toEqual([])

    await expect(stopRemoteRuntimeOnHost(deps, { directoryId: "enabled" })).resolves.toHaveLength(1)
    expect(stops).toEqual([{ directoryId: "enabled", runtimeInstallationId: undefined }])
    expect(shutdowns).toEqual(["http://127.0.0.1:4096"])
    expect(state.runtime?.state).toBe("stopped")
    expect(state.runtime?.gatewayRuntimeAttachmentId).toBeUndefined()
    expect(state.runtime?.startedAt).toBeUndefined()

    await expect(stopRemoteRuntimeOnHost({ ...deps, readHost: async () => undefined }, { all: true })).resolves.toEqual([])
    await expect(
      stopRemoteRuntimeOnHost(
        {
          ...deps,
          hostClient: () => ({
            start: deps.hostClient(host).start,
            status: async () => [
              {
                accountId: "account-1",
                apiBaseUrl: "https://api.example.test",
                directory: "/repo",
                runtimeInstallationId: "runtime-1",
                state: "online",
              },
            ],
            stop: deps.hostClient(host).stop,
          }),
        },
        { runtimeInstallationId: "runtime-1" },
      ),
    ).resolves.toHaveLength(1)
    await expect(
      stopRemoteRuntimeOnHost(
        {
          ...deps,
          hostClient: () => ({
            start: deps.hostClient(host).start,
            status: async () => {
              throw new Error("status unavailable")
            },
            stop: deps.hostClient(host).stop,
          }),
        },
        { runtimeInstallationId: "runtime-1" },
      ),
    ).resolves.toHaveLength(1)
  })

  test("mirrors supported session activity to the runtime host", async () => {
    const seen: Array<{
      readonly body: {
        readonly directory: string
        readonly event: { readonly properties: { readonly sessionID?: string }; readonly type: string }
      }
      readonly headers: Record<string, string>
      readonly url: string
    }> = []
    let readStateCalls = 0
    const mirror = createRemoteRuntimeSessionActivityMirror({
      fetch: mockFetch(async (url, init) => {
        seen.push({
          body: JSON.parse(String(init?.body)) as {
            readonly directory: string
            readonly event: { readonly properties: { readonly sessionID?: string }; readonly type: string }
          },
          headers: Object.fromEntries(new Headers(init?.headers).entries()),
          url: String(url),
        })
        return Response.json({ accepted: true })
      }),
      now: (() => {
        let value = 0
        return () => ++value
      })(),
      readHostState: async () => {
        readStateCalls += 1
        return { host: { password: "pw_1", url: "http://127.0.0.1:4096" } }
      },
      serverAuthHeaders: ({ password }) => ({ authorization: `Basic ${password ?? ""}` }),
    })

    expect(isRemoteRuntimeSessionActivityMirrorInput(null)).toBe(false)
    expect(
      isRemoteRuntimeSessionActivityMirrorInput({ directory: "", event: { properties: {}, type: "session.updated" } }),
    ).toBe(false)
    expect(isRemoteRuntimeSessionActivityMirrorInput({ directory: "/repo", event: "session.updated" })).toBe(false)
    expect(
      isRemoteRuntimeSessionActivityMirrorInput({
        directory: "/repo",
        event: { properties: [], type: "session.updated" },
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeSessionActivityMirrorInput({
        directory: "/repo",
        event: { properties: {}, type: "session.updated" },
      }),
    ).toBe(true)

    await mirror.publishGlobalEvent({
      directory: "/repo",
      event: { properties: { sessionID: "session-1" }, type: "session.status" },
    })
    await mirror.publishGlobalEvent({
      directory: "/repo",
      event: { properties: { sessionID: "session-1" }, type: "message.part.delta" },
    })
    await mirror.publishGlobalEvent({
      directory: "/repo",
      event: { properties: { sessionID: "session-1" }, type: "message.updated" },
    })

    expect(readStateCalls).toBe(1)
    expect(seen).toEqual([
      {
        body: { directory: "/repo", event: { properties: { sessionID: "session-1" }, type: "session.status" } },
        headers: { authorization: "Basic pw_1", "content-type": "application/json" },
        url: "http://127.0.0.1:4096/global/remote-runtime/runtime/session-activity",
      },
      {
        body: { directory: "/repo", event: { properties: { sessionID: "session-1" }, type: "message.updated" } },
        headers: { authorization: "Basic pw_1", "content-type": "application/json" },
        url: "http://127.0.0.1:4096/global/remote-runtime/runtime/session-activity",
      },
    ])

    const missingHostMirror = createRemoteRuntimeSessionActivityMirror({
      fetch: mockFetch(async () => {
        throw new Error("should not publish without host")
      }),
      now: (() => {
        let value = 0
        return () => ++value
      })(),
      readHostState: async () => {
        throw new Error("state unavailable")
      },
      serverAuthHeaders: () => ({}),
    })
    await missingHostMirror.publishGlobalEvent({
      directory: "/repo",
      event: { properties: {}, type: "session.updated" },
    })
    await missingHostMirror.publishGlobalEvent({
      directory: "/repo",
      event: { properties: {}, type: "session.updated" },
    })
  })

  test("selects and explores remote runtime setup directories", async () => {
    const selected = await pickRemoteRuntimeDirectoriesWithPrompt(
      { basePath: "/repo" },
      {
        directorySelector: async (config) => {
          expect(config).toMatchObject({
            allowCancel: true,
            basePath: "/repo",
            multiple: true,
            pageSize: 24,
            search: true,
          })
          return [{ name: "repo", path: "/repo" }]
        },
      },
    )
    expect(selected).toEqual(["/repo"])
    await expect(
      pickRemoteRuntimeDirectoriesWithPrompt({ basePath: "/repo" }, { directorySelector: async () => null }),
    ).resolves.toBeNull()

    const added: string[] = []
    const enabledEntry = {
      addedAt: "now",
      directoryId: "dir-enabled",
      enabled: true,
      path: "/enabled",
      updatedAt: "now",
    }
    const store = {
      add: async ({ directory }: { readonly directory: string }) => {
        added.push(directory)
        return { addedAt: "now", directoryId: `dir-${added.length}`, enabled: true, path: directory, updatedAt: "now" }
      },
      read: async () => ({
        directories: [
          enabledEntry,
          { ...enabledEntry, directoryId: "dir-disabled", enabled: false, path: "/disabled" },
        ],
        version: 1 as const,
      }),
    }

    await expect(
      selectRemoteRuntimeSetupDirectories({
        cwd: () => "/repo",
        isInteractive: () => false,
        pickDirectories: async () => null,
        store,
      }),
    ).resolves.toEqual([enabledEntry])
    await expect(
      selectRemoteRuntimeSetupDirectories({
        cwd: () => "/repo",
        isInteractive: () => false,
        pickDirectories: async () => null,
        store: { ...store, read: async () => ({ directories: [], version: 1 as const }) },
      }),
    ).resolves.toEqual([{ addedAt: "now", directoryId: "dir-1", enabled: true, path: "/repo", updatedAt: "now" }])
    await expect(
      selectRemoteRuntimeSetupDirectories(
        {
          cwd: () => "/repo",
          isInteractive: () => false,
          pickDirectories: async () => null,
          store: { ...store, read: async () => ({ directories: [], version: 1 as const }) },
        },
        { defaultToCurrentDirectory: false },
      ),
    ).resolves.toEqual([])
    await expect(
      selectRemoteRuntimeSetupDirectories(
        {
          cwd: () => "/repo",
          isInteractive: () => false,
          pickDirectories: async () => null,
          store,
        },
        { directory: ["/explicit", "/another"] },
      ),
    ).resolves.toMatchObject([{ path: "/explicit" }, { path: "/another" }])
    await expect(
      selectRemoteRuntimeSetupDirectories(
        {
          cwd: () => "/repo",
          isInteractive: () => false,
          pickDirectories: async () => null,
          store,
        },
        { directory: "/single" },
      ),
    ).resolves.toMatchObject([{ path: "/single" }])
    await expect(
      selectRemoteRuntimeSetupDirectories({
        cwd: () => "/repo",
        isInteractive: () => true,
        pickDirectories: async () => ["/repo", "/repo", "/other"],
        store,
        confirmDirectories: async ({ directories }) => directories.length === 2,
      }),
    ).resolves.toMatchObject([{ path: "/repo" }, { path: "/other" }])
    await expect(
      selectRemoteRuntimeSetupDirectories({
        cwd: () => "/repo",
        isInteractive: () => true,
        pickDirectories: async () => ["/rejected"],
        store,
        confirmDirectories: async () => false,
      }),
    ).resolves.toEqual([])
    await expect(
      selectRemoteRuntimeSetupDirectories({
        cwd: () => "/repo",
        isInteractive: () => true,
        pickDirectories: async () => null,
        store,
      }),
    ).resolves.toEqual([])
    await expect(
      selectRemoteRuntimeSetupDirectories({
        cwd: () => "/repo",
        isInteractive: () => true,
        pickDirectories: async () => [],
        store,
        confirmDirectories: async () => false,
      }),
    ).resolves.toEqual([enabledEntry])
    await expect(
      selectRemoteRuntimeSetupDirectories(
        {
          cwd: () => "/repo",
          isInteractive: () => true,
          pickDirectories: async () => [],
          store: { ...store, read: async () => ({ directories: [], version: 1 as const }) },
        },
        { defaultToCurrentDirectory: false },
      ),
    ).resolves.toEqual([])
    await expect(
      selectRemoteRuntimeSetupDirectories({
        cwd: () => "/repo",
        isInteractive: () => true,
        pickDirectories: async () => [],
        store: { ...store, read: async () => ({ directories: [], version: 1 as const }) },
      }),
    ).resolves.toMatchObject([{ path: "/repo" }])

    const tree = new Map<string, readonly FakeDirent[]>([
      ["/home", [fakeDir("work"), fakeDir(".hidden"), fakeFile("README.md")]],
      ["/home/work", [fakeDir("project"), fakeDir("zeta")]],
      ["/home/work/project", [fakeDir(".git"), fakeDir("ignored")]],
    ])
    const deps = {
      basename: (value: string) => value.split("/").filter(Boolean).at(-1) ?? "",
      join: (...segments: string[]) => segments.join("/").replaceAll(/\/+/g, "/"),
      readdir: async (directory: string) => tree.get(directory) ?? [],
      resolve: (value: string) => value,
    }
    await expect(
      buildRemoteRuntimeDirectoryExplorerTree(deps, {
        currentDirectory: "/home/work/project",
        homeDirectory: "/home",
      }),
    ).resolves.toMatchObject([
      { depth: 0, isRepositoryRoot: false, path: "/home" },
      { depth: 1, isRepositoryRoot: false, path: "/home/work" },
      {
        depth: 2,
        hint: "selected by default",
        isCurrentDirectory: true,
        isRepositoryRoot: true,
        path: "/home/work/project",
      },
      { depth: 2, isCurrentDirectory: false, isRepositoryRoot: false, path: "/home/work/zeta" },
    ])
    await expect(
      buildRemoteRuntimeDirectoryExplorerTree(
        {
          ...deps,
          readdir: async () => {
            throw new Error("unreadable")
          },
        },
        {
          currentDirectory: "/outside",
          homeDirectory: "/home",
        },
      ),
    ).resolves.toEqual([
      { depth: 0, hint: undefined, isCurrentDirectory: false, isRepositoryRoot: false, label: "/home", path: "/home" },
    ])
    await expect(
      buildRemoteRuntimeDirectoryExplorerTree(deps, {
        currentDirectory: "/home",
        homeDirectory: "/home",
      }),
    ).resolves.toContainEqual({
      depth: 0,
      hint: "selected by default",
      isCurrentDirectory: true,
      isRepositoryRoot: false,
      label: "home (Current directory)",
      path: "/home",
    })
    await expect(
      buildRemoteRuntimeDirectoryExplorerTree(
        { ...deps, basename: () => "" },
        {
          currentDirectory: "/",
          homeDirectory: "/",
        },
      ),
    ).resolves.toContainEqual({
      depth: 0,
      hint: "selected by default",
      isCurrentDirectory: true,
      isRepositoryRoot: false,
      label: "/ (Current directory)",
      path: "/",
    })
    await expect(
      buildRemoteRuntimeDirectoryExplorerTree(
        {
          ...deps,
          resolve: (value: string) => (value === "/home/work/zeta" ? "/home/work/project" : value),
        },
        {
          currentDirectory: "/home/work/project",
          homeDirectory: "/home",
        },
      ),
    ).resolves.toHaveLength(3)
  })

  test("parses remote runtime socket JSON messages", () => {
    const encoder = new TextEncoder()
    const view = encoder.encode(JSON.stringify({ typed: true }))
    const buffer = encoder.encode(JSON.stringify({ buffer: true })).buffer

    expect(parseRemoteRuntimeSocketJsonMessage(JSON.stringify({ ok: true }))).toEqual({ ok: true })
    expect(parseRemoteRuntimeSocketJsonMessage(view)).toEqual({ typed: true })
    expect(parseRemoteRuntimeSocketJsonMessage(buffer)).toEqual({ buffer: true })
    expect(parseRemoteRuntimeSocketJsonMessageResult("not-json")).toEqual({
      error: expect.objectContaining({ message: "Remote runtime websocket message must be valid JSON text." }),
      ok: false,
    })
    expect(() => parseRemoteRuntimeSocketJsonMessage("not-json")).toThrow("valid JSON text")
    expect(parseOptionalRemoteRuntimeSocketJsonMessageResult(undefined)).toEqual({
      error: expect.objectContaining({ message: "Remote runtime websocket message must be JSON text." }),
      ok: false,
    })
    expect(parseOptionalRemoteRuntimeSocketJsonMessageResult(JSON.stringify(["value"]))).toEqual({
      ok: true,
      value: ["value"],
    })
  })

  test("searches remote runtime directories", async () => {
    const tree = new Map<string, readonly FakeDirent[]>([
      ["/repo", [fakeDir("apps"), fakeDir(".cache"), fakeFile("README.md")]],
      ["/repo/apps", [fakeDir("mobile-app"), fakeDir("web")]],
      ["/repo/apps/mobile-app", [fakeDir("src")]],
      ["/repo/apps/web", [fakeDir(".git"), fakeDir("ignored-mobile")]],
    ])
    const deps = {
      join: (...segments: string[]) => segments.join("/").replaceAll(/\/+/g, "/"),
      readdir: async (directory: string) => {
        if (directory === "/repo/missing") throw new Error("missing")
        return tree.get(directory) ?? []
      },
      resolve: (value: string) => value,
    }
    await expect(
      searchRemoteRuntimeDirectories(deps, { root: "/repo", term: " mobile ", maxResults: 1 }),
    ).resolves.toEqual([{ path: "/repo/apps/mobile-app" }])
    await expect(searchRemoteRuntimeDirectories(deps, { root: "/repo", term: "web" })).resolves.toEqual([
      { path: "/repo/apps/web" },
    ])
    await expect(searchRemoteRuntimeDirectories(deps, { root: "/repo", term: "" })).resolves.toEqual([])
    await expect(searchRemoteRuntimeDirectories(deps, { root: "/repo/missing", term: "mobile" })).resolves.toEqual([])
  })

  test("derives runtime envelope request ids from structured envelopes", () => {
    const responseEnvelope = {
      payload: { ok: true },
      requestId: "request-1",
      success: true,
      type: "response",
    } as const satisfies RuntimeWebSocketServerEnvelope<{ readonly ok: true }>
    const eventEnvelope = {
      event: {
        eventType: "session.updated",
        payload: { sessionId: "session-1" },
        sequence: 7,
        sessionId: "session-1",
        timestamp: "2026-05-25T00:00:00.000Z",
      },
      type: "event",
    } as const satisfies RuntimeWebSocketServerEnvelope<{ readonly sessionId: "session-1" }>
    const heartbeatEnvelope = {
      timestamp: "2026-05-25T00:00:00.000Z",
      type: "heartbeat",
    } as const satisfies RuntimeWebSocketServerEnvelope
    expect(remoteRuntimeEnvelopeRequestId({ envelope: responseEnvelope, fallbackRequestId: () => "fallback" })).toBe(
      "request-1",
    )
    expect(remoteRuntimeEnvelopeRequestId({ envelope: eventEnvelope, fallbackRequestId: () => "fallback" })).toBe(
      "event_session-1_7",
    )
    expect(remoteRuntimeEnvelopeRequestId({ envelope: heartbeatEnvelope, fallbackRequestId: () => "fallback" })).toBe(
      "fallback",
    )
  })

  test("sleeps with abort and zero-duration semantics", async () => {
    await expect(sleepRemoteRuntime({ milliseconds: 0 })).resolves.toBeUndefined()
    await expect(sleepRemoteRuntime({ milliseconds: 1 })).resolves.toBeUndefined()
    await expect(sleepRemoteRuntime({ milliseconds: 1, signal: AbortSignal.abort("done") })).resolves.toBeUndefined()
    const abort = new AbortController()
    const sleeping = sleepRemoteRuntime({ milliseconds: 1_000, signal: abort.signal })
    abort.abort("done")
    await expect(sleeping).resolves.toBeUndefined()
  })

  test("selects reusable online runtime status from explicit attachment authority", () => {
    const reusable = {
      accountId: "account-1",
      apiBaseUrl: "https://api.interbase.test",
      gatewayRuntimeAttachmentId: "gateway-1",
      runtimeInstallationId: "runtime-1",
      state: "online",
    }
    expect(
      selectReusableRemoteRuntimeStatus({
        accountId: "account-1",
        apiBaseUrl: "https://api.interbase.test",
        statuses: [
          { ...reusable, gatewayRuntimeAttachmentId: " ", runtimeInstallationId: "runtime-blank-gateway" },
          { ...reusable, state: "starting" },
          { ...reusable, accountId: "other-account" },
          { ...reusable, apiBaseUrl: "https://other-api.interbase.test" },
          { ...reusable, runtimeInstallationId: " " },
          reusable,
        ],
      }),
    ).toBe(reusable)
    expect(
      selectReusableRemoteRuntimeStatus({
        accountId: "account-1",
        apiBaseUrl: "https://api.interbase.test",
        statuses: [{ ...reusable, gatewayRuntimeAttachmentId: undefined }],
      }),
    ).toBeUndefined()
  })

  test("polling iterable yields frames, resets empty polls, sleeps between empty results, and stops at max empties", async () => {
    const sleeps: number[] = []
    const pollResults = [["frame-1"], [], ["frame-2", "frame-3"], [], []]
    const polledLimits: number[] = []
    let pollSuccesses = 0
    const frames: string[] = []
    for await (const frame of createRemoteRuntimePollingIterable({
      limit: 3,
      maxEmptyPolls: 2,
      onPollSuccess() {
        pollSuccesses += 1
      },
      async poll({ limit }) {
        polledLimits.push(limit)
        return pollResults.shift() ?? []
      },
      pollIntervalMs: 25,
      async sleep(milliseconds) {
        sleeps.push(milliseconds)
      },
    })) {
      frames.push(frame)
    }
    expect(frames).toEqual(["frame-1", "frame-2", "frame-3"])
    expect(polledLimits).toEqual([3, 3, 3, 3, 3])
    expect(sleeps).toEqual([25, 25])
    expect(pollSuccesses).toBe(5)
  })

  test("polling iterable stops on abort before yielding stale frames", async () => {
    const abort = new AbortController()
    const frames: string[] = []
    for await (const frame of createRemoteRuntimePollingIterable({
      async poll() {
        abort.abort("done")
        return ["stale-frame"]
      },
      signal: abort.signal,
    })) {
      frames.push(frame)
    }
    expect(frames).toEqual([])

    const defaultSleepFrames: string[] = []
    for await (const frame of createRemoteRuntimePollingIterable({
      maxEmptyPolls: 2,
      async poll() {
        return []
      },
      pollIntervalMs: 0,
    })) {
      defaultSleepFrames.push(frame)
    }
    expect(defaultSleepFrames).toEqual([])
  })

  test("classifies websocket heartbeat messages by structured payload", () => {
    expect(isRemoteRuntimeHeartbeatMessage({ type: "heartbeat" })).toBe(true)
    expect(isRemoteRuntimeHeartbeatMessage({ type: "runtime.operation" })).toBe(false)
    expect(isRemoteRuntimeHeartbeatMessage(["heartbeat"])).toBe(false)
    expect(isRemoteRuntimeHeartbeatMessage(null)).toBe(false)
  })
})

describe("remote runtime host registration surfaces", () => {
  test("reads local git status with default status-only output and explicit diffs", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-git-status-"))
    try {
      await runGit(root, ["init"])
      await runGit(root, ["checkout", "-b", "main"])
      await writeFile(path.join(root, "tracked.txt"), "original\n")
      await runGit(root, ["add", "tracked.txt"])
      await runGit(root, ["commit", "-m", "initial"])
      await writeFile(path.join(root, "tracked.txt"), "changed 😄\n")
      await writeFile(path.join(root, "staged.txt"), "staged\n")
      await runGit(root, ["add", "staged.txt"])
      await writeFile(path.join(root, "new file\nwith newline.txt"), "untracked\n")

      const readGitStatus = createLocalGitStatusReader()
      const statusOnly = await readGitStatus({
        directories: [{ directoryId: "dir_1", path: root }],
        includeDiff: false,
        maxDiffBytes: 262144,
      })
      expect(statusOnly.repositories[0]).toMatchObject({
        branch: "main",
        directoryId: "dir_1",
        error: null,
        isRepository: true,
        stagedDiff: null,
        unstagedDiff: null,
      })
      expect(statusOnly.repositories[0]!.files).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: "tracked.txt", staged: null, unstaged: "M" }),
          expect.objectContaining({ path: "staged.txt", staged: "A", unstaged: null }),
          expect.objectContaining({ path: "new file\nwith newline.txt", staged: "?", untracked: true, unstaged: "?" }),
        ]),
      )

      const withDiff = await readGitStatus({
        directories: [{ directoryId: "dir_1", path: root }],
        includeDiff: true,
        maxDiffBytes: 20,
      })
      expect(withDiff.repositories[0]!.stagedDiff).toContain("diff --git")
      expect(withDiff.repositories[0]!.unstagedDiff).toContain("diff --git")
      expect(withDiff.repositories[0]!.diffTruncated).toBe(true)
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  test("reads local git status for non-git directories and renames", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-git-rename-"))
    const nonGit = await mkdtemp(path.join(tmpdir(), "interbase-not-git-"))
    try {
      await runGit(root, ["init"])
      await writeFile(path.join(root, "old.txt"), "content\n")
      await runGit(root, ["add", "old.txt"])
      await runGit(root, ["commit", "-m", "initial"])
      await runGit(root, ["mv", "old.txt", "new.txt"])
      const readGitStatus = createLocalGitStatusReader()
      const status = await readGitStatus({
        directories: [
          { directoryId: "dir_repo", path: root },
          { directoryId: "dir_plain", path: nonGit },
        ],
        includeDiff: false,
        maxDiffBytes: 262144,
      })
      expect(status.repositories).toEqual([
        expect.objectContaining({
          directoryId: "dir_repo",
          files: [expect.objectContaining({ path: "new.txt", renamedFrom: "old.txt", staged: "R" })],
          isRepository: true,
        }),
        expect.objectContaining({ directoryId: "dir_plain", error: null, isRepository: false }),
      ])
    } finally {
      await rm(root, { force: true, recursive: true })
      await rm(nonGit, { force: true, recursive: true })
    }
  })

  test("scopes local git status to each selected directory", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-git-status-scope-"))
    try {
      const app = path.join(root, "app")
      const docs = path.join(root, "docs")
      await mkdir(app)
      await mkdir(docs)
      await runGit(root, ["init"])
      await writeFile(path.join(app, "tracked.txt"), "app\n")
      await writeFile(path.join(docs, "tracked.txt"), "docs\n")
      await runGit(root, ["add", "."])
      await runGit(root, ["commit", "-m", "initial"])
      await writeFile(path.join(app, "tracked.txt"), "app changed\n")
      await writeFile(path.join(docs, "tracked.txt"), "docs changed\n")

      const readGitStatus = createLocalGitStatusReader()
      const status = await readGitStatus({
        directories: [
          { directoryId: "dir_app", path: app },
          { directoryId: "dir_docs", path: docs },
        ],
        includeDiff: true,
        maxDiffBytes: 262144,
      })

      expect(status.repositories).toEqual([
        expect.objectContaining({
          directoryId: "dir_app",
          files: [expect.objectContaining({ path: "app/tracked.txt", unstaged: "M" })],
          unstagedDiff: expect.stringContaining("app/tracked.txt"),
        }),
        expect.objectContaining({
          directoryId: "dir_docs",
          files: [expect.objectContaining({ path: "docs/tracked.txt", unstaged: "M" })],
          unstagedDiff: expect.stringContaining("docs/tracked.txt"),
        }),
      ])
      expect(status.repositories[0]!.files).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "docs/tracked.txt" })]),
      )
      expect(status.repositories[0]!.unstagedDiff).not.toContain("docs/tracked.txt")
      expect(status.repositories[1]!.files).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ path: "app/tracked.txt" })]),
      )
      expect(status.repositories[1]!.unstagedDiff).not.toContain("app/tracked.txt")
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  test("registers remote runtime routes by explicit id", async () => {
    const route: RemoteRuntimeRouteRegistration = {
      id: "runtime.status",
      method: "GET",
      path: "/remote-runtime/runtime/status",
      handler(request) {
        return {
          status: 200,
          headers: [{ name: "content-type", value: "application/json" }],
          body: JSON.stringify({ method: request.method, path: request.path }),
        }
      },
    }
    const registry = createRemoteRuntimeRouteRegistry([route])
    expect(registry.get("runtime.status")).toBe(route)
    expect(registry.list()).toEqual([route])
    await expect(
      Promise.resolve(
        registry.get("runtime.status")?.handler({
          method: "GET",
          path: "/remote-runtime/runtime/status",
          query: [],
          headers: [],
          body: null,
        }),
      ),
    ).resolves.toEqual({
      status: 200,
      headers: [{ name: "content-type", value: "application/json" }],
      body: JSON.stringify({ method: "GET", path: "/remote-runtime/runtime/status" }),
    })
  })

  test("dispatches registered routes by method and path with deterministic not-found response", async () => {
    const registry = createRemoteRuntimeRouteRegistry([
      {
        id: "runtime.status",
        method: "GET",
        path: "/remote-runtime/runtime/status",
        async handler() {
          return { status: 200, headers: [], body: "online" }
        },
      },
    ])
    await expect(
      dispatchRemoteRuntimeRoute(registry, {
        method: "GET",
        path: "/remote-runtime/runtime/status",
        query: [],
        headers: [],
        body: null,
      }),
    ).resolves.toEqual({ status: 200, headers: [], body: "online" })
    await expect(
      dispatchRemoteRuntimeRoute(registry, {
        method: "POST",
        path: "/remote-runtime/runtime/status",
        query: [],
        headers: [],
        body: null,
      }),
    ).resolves.toEqual({ status: 404, headers: [], body: "Remote runtime route not found" })
  })

  test("rejects duplicate route ids", () => {
    const route: RemoteRuntimeRouteRegistration = {
      id: "runtime.status",
      method: "GET",
      path: "/remote-runtime/runtime/status",
      handler() {
        return { status: 204, headers: [], body: "" }
      },
    }
    expect(() => createRemoteRuntimeRouteRegistry([route, route])).toThrow(
      "Remote runtime route already registered: runtime.status",
    )
  })

  test("registers remote runtime commands by public command name", async () => {
    let called = false
    const command: RemoteRuntimeCommandRegistration = {
      name: "status",
      description: "Show status",
      handler() {
        called = true
      },
    }
    const registry = createRemoteRuntimeCommandRegistry([command])
    expect(registry.get("status")).toBe(command)
    expect(registry.list()).toEqual([command])
    await registry.get("status")?.handler()
    expect(called).toBe(true)
  })

  test("runs registered commands and reports missing commands without throwing", async () => {
    let calls = 0
    const registry = createRemoteRuntimeCommandRegistry([
      {
        name: "status",
        description: "Show status",
        async handler() {
          calls += 1
        },
      },
    ])
    await expect(runRemoteRuntimeCommand(registry, "status")).resolves.toBe(true)
    await expect(runRemoteRuntimeCommand(registry, "missing")).resolves.toBe(false)
    expect(calls).toBe(1)
  })

  test("rejects duplicate command names", () => {
    const command: RemoteRuntimeCommandRegistration = {
      name: "status",
      description: "Show status",
      handler() {},
    }
    expect(() => createRemoteRuntimeCommandRegistry([command, command])).toThrow(
      "Remote runtime command already registered: status",
    )
  })
})

describe("remote runtime command idempotency", () => {
  test("replays matching command results without executing twice", async () => {
    let calls = 0
    const store = createInMemoryRemoteRuntimeCommandIdempotencyStore<string>()
    const input = {
      execute() {
        calls += 1
        return "created"
      },
      fingerprint: createRemoteRuntimeCommandFingerprint({
        method: "post",
        canonicalPath: "/remote-runtime/session/message",
        bodySha256: "hash-1",
      }),
      idempotencyKey: "key-1",
      requestId: "request-1",
      runtimeInstallationId: "runtime-1",
      store,
    }
    await expect(runRemoteRuntimeCommandWithIdempotency(input)).resolves.toEqual({ ok: true, response: "created" })
    await expect(runRemoteRuntimeCommandWithIdempotency({ ...input, execute: () => "duplicate" })).resolves.toEqual({
      ok: true,
      response: "created",
    })
    expect(calls).toBe(1)
  })

  test("rejects reused idempotency keys with different fingerprints", async () => {
    const store = createInMemoryRemoteRuntimeCommandIdempotencyStore<string>()
    await runRemoteRuntimeCommandWithIdempotency({
      execute: () => "created",
      fingerprint: "fingerprint-1",
      idempotencyKey: "key-1",
      requestId: null,
      runtimeInstallationId: "runtime-1",
      store,
    })
    await expect(
      runRemoteRuntimeCommandWithIdempotency({
        execute: () => "changed",
        fingerprint: "fingerprint-2",
        idempotencyKey: "key-1",
        requestId: null,
        runtimeInstallationId: "runtime-1",
        store,
      }),
    ).resolves.toEqual({ ok: false, reason: "idempotencyConflict", requestId: "unknown" })
  })

  test("cleans failed executions so commands can be retried", async () => {
    const store = createInMemoryRemoteRuntimeCommandIdempotencyStore<string>()
    let calls = 0
    const input = {
      execute() {
        calls += 1
        if (calls === 1) throw new Error("temporary failure")
        return "created"
      },
      fingerprint: "fingerprint-1",
      idempotencyKey: "key-1",
      requestId: "request-1",
      runtimeInstallationId: "runtime-1",
      store,
    }
    await expect(runRemoteRuntimeCommandWithIdempotency(input)).rejects.toThrow("temporary failure")
    await expect(runRemoteRuntimeCommandWithIdempotency(input)).resolves.toEqual({ ok: true, response: "created" })
    expect(calls).toBe(2)
  })

  test("scopes idempotency records by runtime installation", async () => {
    const store = createInMemoryRemoteRuntimeCommandIdempotencyStore<string>()
    await runRemoteRuntimeCommandWithIdempotency({
      execute: () => "runtime-1",
      fingerprint: "fingerprint-1",
      idempotencyKey: "key-1",
      requestId: "request-1",
      runtimeInstallationId: "runtime-1",
      store,
    })
    await expect(
      runRemoteRuntimeCommandWithIdempotency({
        execute: () => "runtime-2",
        fingerprint: "fingerprint-2",
        idempotencyKey: "key-1",
        requestId: "request-2",
        runtimeInstallationId: "runtime-2",
        store,
      }),
    ).resolves.toEqual({ ok: true, response: "runtime-2" })
  })
})

describe("remote runtime host event mirror", () => {
  test("parses SSE data chunks and mirrored events", async () => {
    expect(parseRemoteRuntimeHostSseData("event: message\ndata: first\ndata: second")).toBe("first\nsecond")
    expect(parseRemoteRuntimeHostSseData("event: message")).toBeNull()
    expect(parseRemoteRuntimeHostMirroredEvent("not-json")).toBeNull()
    expect(parseRemoteRuntimeHostMirroredEvent(JSON.stringify({ directory: "/repo" }))).toBeNull()
    expect(parseRemoteRuntimeHostMirroredEvent(JSON.stringify({ payload: { type: "server.connected" } }))).toBeNull()
    expect(
      parseRemoteRuntimeHostMirroredEvent(JSON.stringify({ directory: "/repo", payload: { type: "message.updated" } })),
    ).toEqual({
      directory: "/repo",
      payload: { type: "message.updated" },
    })
    expect(
      parseRemoteRuntimeHostMirroredEvent(JSON.stringify({ directory: "/repo", payload: ["message.updated"] })),
    ).toEqual({
      directory: "/repo",
      payload: ["message.updated"],
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("data: one\n\n"))
        controller.enqueue(encoder.encode("data: two"))
        controller.enqueue(encoder.encode("\n\n"))
        controller.close()
      },
    })
    const parsed: string[] = []
    for await (const item of parseRemoteRuntimeHostEventStream(stream, new AbortController().signal)) parsed.push(item)
    expect(parsed).toEqual(["one", "two"])
  })

  test("streams valid mirrored host events and ignores invalid payloads", async () => {
    const events: Array<{ directory: string }> = []
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"payload":{"type":"server.connected"}}\n\n'))
        controller.enqueue(
          encoder.encode(
            'data: {"directory":"/repo","project":"project-1","workspace":"workspace-1","payload":{"type":"message.updated"}}\n\n',
          ),
        )
        controller.close()
      },
    })
    await streamRemoteRuntimeHostEvents(
      { url: "http://127.0.0.1:4096", password: "pw-1" },
      {
        fetch: mockFetch(async (url, init) => {
          expect(String(url)).toBe("http://127.0.0.1:4096/global/event")
          expect(init?.headers).toEqual({ authorization: "Basic pw-1" })
          return new Response(stream, { status: 200 })
        }),
        onEvent(event) {
          events.push({ directory: event.directory })
          expect(event).toEqual({
            directory: "/repo",
            payload: { type: "message.updated" },
            project: "project-1",
          })
        },
        serverAuthHeaders: ({ password }) => ({ authorization: `Basic ${password ?? ""}` }),
      },
      new AbortController().signal,
    )
    expect(events).toEqual([{ directory: "/repo" }])

    await streamRemoteRuntimeHostEvents(
      { url: "http://127.0.0.1:4096" },
      {
        fetch: mockFetch(async () => new Response(null, { status: 503 })),
        onEvent() {
          throw new Error("non-ok responses should not emit events")
        },
        serverAuthHeaders: () => ({}),
      },
      new AbortController().signal,
    )
  })

  test("mirrors host events through injected host state and stops cleanly", async () => {
    const abort = new AbortController()
    const events: Array<{ directory: string }> = []
    let mirror: ReturnType<typeof createRemoteRuntimeHostEventMirror> | undefined
    const received = new Promise<void>((resolve) => {
      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"directory":"/repo","payload":{"type":"message.updated"}}\n\n'))
        },
      })
      mirror = createRemoteRuntimeHostEventMirror(
        {
          fetch: mockFetch(async () => new Response(stream, { status: 200 })),
          onEvent(event) {
            events.push({ directory: event.directory })
            abort.abort("done")
            resolve()
          },
          readHostState: async () => ({ host: { url: "http://127.0.0.1:4096" } }),
          serverAuthHeaders: () => ({}),
          sleep: async () => undefined,
        },
        { signal: abort.signal },
      )
    })
    await received
    mirror?.stop()
    await mirror?.closed
    expect(events).toEqual([{ directory: "/repo" }])

    const closedMirror = createRemoteRuntimeHostEventMirror(
      {
        fetch: mockFetch(async () => {
          throw new Error("aborted mirrors should not fetch")
        }),
        onEvent() {},
        readHostState: async () => ({ host: { url: "http://127.0.0.1:4096" } }),
        serverAuthHeaders: () => ({}),
      },
      { signal: AbortSignal.abort("already aborted") },
    )
    await closedMirror.closed
  })

  test("mirror tolerates missing state, state errors, stream errors, and default sleep abort", async () => {
    const missingStateAbort = new AbortController()
    const missingStateMirror = createRemoteRuntimeHostEventMirror(
      {
        fetch: mockFetch(async () => {
          throw new Error("missing host should not fetch")
        }),
        onEvent() {},
        readHostState: async () => ({}),
        serverAuthHeaders: () => ({}),
        sleep: async (_milliseconds, signal) => missingStateAbort.abort(signal.reason),
      },
      { signal: missingStateAbort.signal },
    )
    await missingStateMirror.closed

    const externalAbort = new AbortController()
    let externalAbortStarted: () => void = () => {}
    const externalAbortReady = new Promise<void>((resolve) => {
      externalAbortStarted = resolve
    })
    const externalAbortMirror = createRemoteRuntimeHostEventMirror(
      {
        fetch: mockFetch(async () => {
          throw new Error("missing host should not fetch")
        }),
        onEvent() {},
        readHostState: async () => ({}),
        serverAuthHeaders: () => ({}),
        sleep: async (_milliseconds, signal) => {
          externalAbortStarted()
          await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }))
        },
      },
      { signal: externalAbort.signal },
    )
    await externalAbortReady
    externalAbort.abort("external")
    await externalAbortMirror.closed

    const streamErrorAbort = new AbortController()
    const streamErrorMirror = createRemoteRuntimeHostEventMirror(
      {
        fetch: mockFetch(async () => {
          streamErrorAbort.abort("stream failed")
          throw new Error("stream failed")
        }),
        onEvent() {},
        readHostState: async () => ({ host: { url: "http://127.0.0.1:4096" } }),
        serverAuthHeaders: () => ({}),
        sleep: async () => streamErrorAbort.abort("done"),
      },
      { signal: streamErrorAbort.signal },
    )
    await streamErrorMirror.closed

    const stateErrorAbort = new AbortController()
    const stateErrorMirror = createRemoteRuntimeHostEventMirror(
      {
        fetch: mockFetch(async () => {
          throw new Error("state errors should hide host state")
        }),
        onEvent() {},
        readHostState: async () => {
          throw new Error("state unavailable")
        },
        serverAuthHeaders: () => ({}),
        sleep: async () => stateErrorAbort.abort("done"),
      },
      { signal: stateErrorAbort.signal },
    )
    await stateErrorMirror.closed

    let defaultSleepStarted: () => void = () => {}
    const defaultSleepReady = new Promise<void>((resolve) => {
      defaultSleepStarted = resolve
    })
    const defaultSleepMirror = createRemoteRuntimeHostEventMirror({
      fetch: mockFetch(async () => {
        throw new Error("missing host should not fetch")
      }),
      onEvent() {},
      readHostState: async () => {
        defaultSleepStarted()
        return {}
      },
      serverAuthHeaders: () => ({}),
    })
    await defaultSleepReady
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    defaultSleepMirror.stop()
    await defaultSleepMirror.closed

    const defaultSleepResolveAbort = new AbortController()
    let defaultSleepReads = 0
    const defaultSleepResolveMirror = createRemoteRuntimeHostEventMirror(
      {
        fetch: mockFetch(async () => {
          throw new Error("missing host should not fetch")
        }),
        onEvent() {},
        pollIntervalMs: 0,
        readHostState: async () => {
          defaultSleepReads += 1
          if (defaultSleepReads === 2) defaultSleepResolveAbort.abort("done")
          return {}
        },
        serverAuthHeaders: () => ({}),
      },
      { signal: defaultSleepResolveAbort.signal },
    )
    await defaultSleepResolveMirror.closed
    expect(defaultSleepReads).toBe(2)
  })
})

describe("remote runtime connector session runner", () => {
  function sessionAttachment(): GatewayRuntimeAttachment {
    return {
      accountId: "usr_1",
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      directoryId: "dir_1",
      directoryPath: "/repo",
      deviceTrustLevel: "trusted",
      featureCapabilities: [],
      gatewayRuntimeAttachmentId: "gra_1",
      runtimeInstallationId: "rti_1",
      status: "online",
    }
  }

  function attachmentRequest() {
    return {
      accountId: "usr_1",
      attachmentCapabilities: ["runtime.metadata"],
      connectorVersion: "1.0.0",
      directoryId: "dir_1",
      directoryPath: "/repo",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "req_attach",
      runtimeInstallationId: "rti_1",
      ticket: "ticket_1",
    } as const
  }

  function runtimeOperation(
    input: {
      readonly clientAttachmentId?: string
      readonly replyTarget?: { readonly gatewayHttpRequestId: string; readonly kind: "gatewayHttpRequest" }
      readonly requestId?: string
    } = {},
  ) {
    return {
      gatewayRuntimeAttachmentId: "gra_1",
      clientAttachmentId: input.clientAttachmentId ?? "mda_1",
      operationClass: "metadataRead",
      payload: {
        method: "ping",
        payload: { message: "hello" },
        protocolVersion: runtimeWebSocketProtocolVersion,
        requestId: "req_ping",
      },
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      ...(input.replyTarget ? { replyTarget: input.replyTarget } : {}),
      requestId: input.requestId ?? "req_outer",
      type: "runtime.operation",
    } as const
  }

  function sessionClient(
    input: {
      readonly attachment?: ReturnType<typeof sessionAttachment>
      readonly deliverRuntimeEnvelope?: RemoteRuntimeConnectorSessionClient["deliverRuntimeEnvelope"]
      readonly frames?: readonly RemoteRuntimeSessionFrame[]
      readonly onPoll?: () => void
      readonly revokeRuntimeAttachment?: RemoteRuntimeConnectorSessionClient["revokeRuntimeAttachment"]
    } = {},
  ) {
    const attachment = input.attachment ?? sessionAttachment()
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    const polls: Array<{ readonly limit?: number; readonly signal?: AbortSignal }> = []
    const statusPosts: unknown[] = []
    const revoked: string[] = []
    let polled = false
    const client: RemoteRuntimeConnectorSessionClient = {
      deliverRuntimeEnvelope:
        input.deliverRuntimeEnvelope ??
        (async ({ envelope }) => {
          delivered.push(envelope)
        }),
      pollRuntimeOperations: async ({ limit, signal }) => {
        polls.push({ limit, signal })
        input.onPoll?.()
        if (polled) return []
        polled = true
        return input.frames ?? []
      },
      postRuntimeStatus: async ({ status }) => {
        statusPosts.push(status)
      },
      registerRuntimeAttachment: async () => attachment,
      revokeRuntimeAttachment:
        input.revokeRuntimeAttachment ??
        (async ({ gatewayRuntimeAttachmentId }) => {
          revoked.push(gatewayRuntimeAttachmentId)
        }),
    }
    return { attachment, client, delivered, polls, revoked, statusPosts }
  }

  function socketMessages(values: readonly RemoteRuntimeJsonValue[]) {
    const queue = [...values]
    return {
      opened: Promise.resolve(),
      next: async () => {
        const value = queue.shift()
        return value === undefined ? { done: true as const } : { done: false as const, value }
      },
    }
  }

  test("runs generic polling sessions through injected client and handlers", async () => {
    const frame = runtimeOperation()
    const harness = sessionClient({ frames: [frame] })
    const traceEvents: RemoteRuntimeConnectorRuntimeOperationTraceEvent[] = []
    const attached: string[] = []
    const detached: string[] = []
    const heartbeats: string[] = []

    const attachment = await runRemoteRuntimeConnectorSession({
      attachmentRequest: attachmentRequest(),
      client: harness.client,
      frames: [frame],
      onRemoteRuntimeClientAttachment: async ({ deliverRuntimeEnvelope, clientAttachmentId }) => {
        attached.push(clientAttachmentId)
        await deliverRuntimeEnvelope({
          payload: { ok: true },
          requestId: "req_callback",
          success: true,
          type: "response",
        })
      },
      onRemoteRuntimeClientDetached: ({ clientAttachmentId }) => {
        detached.push(clientAttachmentId)
      },
      onRuntimeHeartbeat: (item) => {
        heartbeats.push(item.gatewayRuntimeAttachmentId)
      },
      onRuntimeOperationTrace: (event) => {
        traceEvents.push(event)
      },
      runtimeCommandHandlers: {
        ping: () => ({ message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }),
      },
      statusHeartbeatIntervalMs: 0,
    })

    expect(attachment.gatewayRuntimeAttachmentId).toBe("gra_1")
    expect(attached).toEqual(["mda_1"])
    expect(detached).toEqual(["mda_1"])
    expect(heartbeats).toEqual(["gra_1"])
    expect(harness.statusPosts).toHaveLength(1)
    expect(harness.revoked).toEqual(["gra_1"])
    expect(harness.delivered).toEqual([
      { payload: { ok: true }, requestId: "req_callback", success: true, type: "response" },
      {
        payload: { message: "pong", timestamp: "2026-05-10T00:00:00.000Z" },
        requestId: "req_ping",
        success: true,
        type: "response",
      },
    ])
    expect(traceEvents.map((event) => event.stage)).toEqual([
      "received",
      "remoteRuntimeAttachmentObserved",
      "handled",
      "responseDelivered",
    ])
  })

  test("polls through the injected client and classifies late gateway HTTP delivery", async () => {
    class GatewayUnavailableError extends Error {
      constructor(message: string) {
        super(message)
        this.name = "GatewayUnavailableError"
      }
    }
    const frame = runtimeOperation({
      clientAttachmentId: "mobile_http_1",
      replyTarget: { gatewayHttpRequestId: "mobile_http_1", kind: "gatewayHttpRequest" },
    })
    const harness = sessionClient({
      deliverRuntimeEnvelope: async () => {
        throw new GatewayUnavailableError("late response")
      },
      frames: [frame],
    })
    const traceEvents: RemoteRuntimeConnectorRuntimeOperationTraceEvent[] = []
    const sleeps: number[] = []
    const heartbeats: string[] = []

    await runRemoteRuntimeConnectorSession({
      attachmentRequest: attachmentRequest(),
      client: harness.client,
      isGatewayAttachmentUnavailable: (error) => error instanceof GatewayUnavailableError,
      maxEmptyPolls: 2,
      onRuntimeHeartbeat: (attachment) => {
        heartbeats.push(attachment.gatewayRuntimeAttachmentId)
      },
      onRuntimeOperationTrace: (event) => {
        if (event.stage === "received") throw new Error("trace sink failed")
        traceEvents.push(event)
      },
      pollIntervalMs: 5,
      pollRuntimeOperations: true,
      pollRuntimeOperationsLimit: 3,
      runtimeCommandHandlers: {
        ping: () => ({ message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }),
      },
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds)
      },
      statusHeartbeatIntervalMs: 0,
    })

    expect(harness.polls.map((poll) => poll.limit)).toEqual([3, 3, 3])
    expect(sleeps).toEqual([5])
    expect(heartbeats).toEqual(["gra_1", "gra_1", "gra_1", "gra_1"])
    expect(traceEvents.map((event) => ({ errorName: event.errorName, stage: event.stage }))).toEqual([
      { errorName: undefined, stage: "handled" },
      { errorName: "GatewayUnavailableError", stage: "lateGatewayHttpResponseIgnored" },
    ])

    const defaultSleepHarness = sessionClient()
    await runRemoteRuntimeConnectorSession({
      attachmentRequest: attachmentRequest(),
      client: defaultSleepHarness.client,
      maxEmptyPolls: 2,
      pollIntervalMs: 0,
      pollRuntimeOperations: true,
      statusHeartbeatIntervalMs: 0,
    })
    expect(defaultSleepHarness.polls).toHaveLength(2)
  })

  test("posts periodic runtime status heartbeats through the public runner", async () => {
    const abort = new AbortController()
    const harness = sessionClient()
    const heartbeats: string[] = []

    async function* waitForAbort() {
      while (!abort.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }

    await runRemoteRuntimeConnectorSession({
      attachmentRequest: attachmentRequest(),
      client: harness.client,
      frames: waitForAbort(),
      onRuntimeHeartbeat: (attachment) => {
        heartbeats.push(attachment.gatewayRuntimeAttachmentId)
        if (heartbeats.length === 2) abort.abort()
      },
      signal: abort.signal,
      sleep: async () => undefined,
      statusHeartbeatIntervalMs: 1,
    })

    expect(heartbeats).toEqual(["gra_1", "gra_1"])
    expect(harness.statusPosts).toHaveLength(2)
  })

  test("detaches revoked remote runtime attachments and rethrows real delivery failures", async () => {
    const revokeNotice = {
      code: "ATTACHMENT_REVOKED",
      message: "revoked",
      pairingAction: "re_pair",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "mda_1",
      terminal: true,
      type: "attachment.revoked",
    } as const
    const detached: string[] = []
    const harness = sessionClient({ frames: [runtimeOperation(), revokeNotice] })
    await runRemoteRuntimeConnectorSession({
      attachmentRequest: attachmentRequest(),
      client: harness.client,
      maxEmptyPolls: 1,
      onRemoteRuntimeClientDetached: ({ clientAttachmentId }) => {
        detached.push(clientAttachmentId)
      },
      pollRuntimeOperations: true,
      runtimeCommandHandlers: {
        ping: () => ({ message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }),
      },
      statusHeartbeatIntervalMs: 0,
    })
    expect(detached).toEqual(["mda_1"])

    const failureHarness = sessionClient({
      deliverRuntimeEnvelope: async () => {
        throw new Error("delivery failed")
      },
      frames: [runtimeOperation()],
    })
    const traceEvents: RemoteRuntimeConnectorRuntimeOperationTraceEvent[] = []
    await expect(
      runRemoteRuntimeConnectorSession({
        attachmentRequest: attachmentRequest(),
        client: failureHarness.client,
        frames: [runtimeOperation()],
        onRuntimeOperationTrace: (event) => {
          traceEvents.push(event)
        },
        runtimeCommandHandlers: {
          ping: () => ({ message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }),
        },
        statusHeartbeatIntervalMs: 0,
      }),
    ).rejects.toThrow("delivery failed")
    expect(traceEvents.at(-1)).toMatchObject({ errorName: "Error", stage: "responseDeliveryFailed" })
    expect(failureHarness.revoked).toEqual(["gra_1"])

    const gatewayFailureHarness = sessionClient({
      deliverRuntimeEnvelope: async () => {
        throw new Error("gateway delivery failed")
      },
      frames: [
        runtimeOperation({
          clientAttachmentId: "mobile_http_1",
          replyTarget: { gatewayHttpRequestId: "mobile_http_1", kind: "gatewayHttpRequest" },
        }),
      ],
      revokeRuntimeAttachment: async () => {
        throw new Error("cleanup revoke failed")
      },
    })
    await expect(
      runRemoteRuntimeConnectorSession({
        attachmentRequest: attachmentRequest(),
        client: gatewayFailureHarness.client,
        onRuntimeOperationTrace: async () => {
          throw new Error("async trace sink failed")
        },
        pollRuntimeOperations: true,
        runtimeCommandHandlers: {
          ping: () => ({ message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }),
        },
        statusHeartbeatIntervalMs: 0,
      }),
    ).rejects.toThrow("gateway delivery failed")
  })

  test("parses session frame lists at the public boundary", () => {
    const frame = runtimeOperation()
    const failure = {
      code: "RUNTIME_UNAVAILABLE",
      message: "offline",
      pairingAction: "keep",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "req_fail",
      terminal: false,
      type: "runtime.unavailable",
    } as const

    expect(remoteRuntimeOperationFrameFromGateway(frame).requestId).toBe("req_outer")
    expect(remoteRuntimeSessionFramesFromGateway([frame, failure])).toEqual([
      {
        ...frame,
        replyTarget: { kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId: "mda_1" },
      },
      failure,
    ])
    expect(() => remoteRuntimeSessionFramesFromGateway({} as never)).toThrow("malformed frame list")
    expect(() => remoteRuntimeOperationFrameFromGateway({} as never)).toThrow(
      "Unexpected remote runtime transport frame type",
    )
  })

  test("runs generic websocket message sessions through public runtime authority", async () => {
    const frame = runtimeOperation()
    const harness = sessionClient()
    const sent: RuntimeResponseFrame[] = []
    const traceEvents: RemoteRuntimeConnectorRuntimeOperationTraceEvent[] = []
    const attached: string[] = []
    const detached: string[] = []
    const abort = new AbortController()
    const attachment = await runRemoteRuntimeConnectorWebSocketMessageSession({
      attachment: harness.attachment,
      client: harness.client,
      featureCapabilities: ["remoteRuntime.http.activeChats"],
      messages: socketMessages([
        { type: "heartbeat" },
        {
          attachmentCapabilities: ["runtime.metadata"],
          connectorVersion: "1.2.3",
          gatewayRuntimeAttachmentId: "gra_1",
          protocolVersion: remoteRuntimeTransportProtocolVersion,
          replay: { status: "idle" },
          requestId: "status_echo_1",
          runtimeApiVersion: remoteRuntimeHttpContractVersion,
          sequence: 1,
          status: "online",
          type: "runtime.status",
        },
        {
          clientAttachmentId: "__pending_client_attachment__",
          envelope: { timestamp: "2026-05-10T00:00:00.000Z", type: "heartbeat" },
          gatewayRuntimeAttachmentId: "gra_1",
          protocolVersion: remoteRuntimeTransportProtocolVersion,
          requestId: "response_echo_1",
          type: "runtime.response",
        },
        frame,
        {
          code: "ATTACHMENT_REVOKED",
          message: "revoked",
          pairingAction: "re_pair",
          protocolVersion: remoteRuntimeTransportProtocolVersion,
          requestId: "mda_1",
          terminal: true,
          type: "attachment.revoked",
        },
      ]),
      onDisconnected: () => new Error("socket closed"),
      onRemoteRuntimeClientAttachment: async ({ deliverRuntimeEnvelope, clientAttachmentId }) => {
        attached.push(clientAttachmentId)
        await deliverRuntimeEnvelope({
          payload: { callback: true },
          requestId: "req_callback",
          success: true,
          type: "response",
        })
      },
      onRemoteRuntimeClientDetached: ({ clientAttachmentId }) => {
        detached.push(clientAttachmentId)
        abort.abort()
      },
      onRuntimeOperationTrace: (event) => {
        traceEvents.push(event)
      },
      randomUUID: () => "uuid_1",
      runtimeCommandHandlers: {
        ping: () => ({ message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }),
      },
      sendRuntimeResponseFrame: (response) => {
        sent.push(response)
      },
      signal: abort.signal,
      statusHeartbeatIntervalMs: 0,
    })

    expect(attachment.gatewayRuntimeAttachmentId).toBe("gra_1")
    expect(attached).toEqual(["mda_1"])
    expect(detached).toEqual(["mda_1"])
    expect(harness.statusPosts).toHaveLength(1)
    expect(harness.statusPosts[0]).toMatchObject({
      featureCapabilities: ["remoteRuntime.http.activeChats"],
    })
    expect(harness.revoked).toEqual(["gra_1"])
    expect(sent.map((response) => response.requestId)).toEqual(["uuid_1", "req_callback", "req_outer"])
    expect(sent[0]).toMatchObject({
      envelope: { type: "heartbeat" },
      clientAttachmentId: "__pending_client_attachment__",
    })
    expect(traceEvents.map((event) => event.stage)).toEqual([
      "received",
      "remoteRuntimeAttachmentObserved",
      "handled",
      "webSocketResponseSent",
    ])
  })

  test("handles websocket gateway targets, disconnects, aborts, and cleanup failures", async () => {
    const invalidGatewayFrame = {
      ...runtimeOperation({
        clientAttachmentId: "mobile_http_invalid",
        replyTarget: { gatewayHttpRequestId: "mobile_http_invalid", kind: "gatewayHttpRequest" },
        requestId: "req_outer_invalid",
      }),
      payload: {
        method: "unknown",
        payload: {},
        protocolVersion: runtimeWebSocketProtocolVersion,
        requestId: "req_unknown",
      },
    } as const
    const gatewayFrame = runtimeOperation({
      clientAttachmentId: "mobile_http_1",
      replyTarget: { gatewayHttpRequestId: "mobile_http_1", kind: "gatewayHttpRequest" },
    })
    const harness = sessionClient({
      revokeRuntimeAttachment: async () => {
        throw new Error("cleanup failed")
      },
    })
    const sent: RuntimeResponseFrame[] = []
    await expect(
      runRemoteRuntimeConnectorWebSocketMessageSession({
        attachment: harness.attachment,
        client: harness.client,
        messages: socketMessages([invalidGatewayFrame, gatewayFrame]),
        onDisconnected: () => new Error("socket closed"),
        onRuntimeOperationTrace: async () => {
          throw new Error("trace failed")
        },
        runtimeCommandHandlers: {
          ping: () => ({ message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }),
        },
        sendRuntimeResponseFrame: (response) => {
          sent.push(response)
        },
        statusHeartbeatIntervalMs: 0,
      }),
    ).rejects.toThrow("socket closed")
    expect(sent).toHaveLength(2)
    expect(sent[0]).toMatchObject({
      clientAttachmentId: "mobile_http_invalid",
      envelope: {
        error: { message: "Runtime command method is unknown: received unknown." },
        success: false,
        type: "error",
      },
      requestId: "req_outer_invalid",
    })
    expect(sent[1]).toMatchObject({ clientAttachmentId: "mobile_http_1", requestId: "req_outer" })

    await expect(
      runRemoteRuntimeConnectorWebSocketMessageSession({
        attachment: sessionAttachment(),
        client: sessionClient().client,
        messages: socketMessages([{ type: "unexpected" }]),
        sendRuntimeResponseFrame: () => {
          throw new Error("unaddressable malformed frames should not send responses")
        },
        statusHeartbeatIntervalMs: 0,
      }),
    ).rejects.toThrow("Unexpected remote runtime transport frame type")

    const abort = new AbortController()
    abort.abort()
    await expect(
      runRemoteRuntimeConnectorWebSocketMessageSession({
        attachment: sessionAttachment(),
        client: sessionClient().client,
        messages: socketMessages([]),
        signal: abort.signal,
        sendRuntimeResponseFrame: () => {
          throw new Error("should not send")
        },
        statusHeartbeatIntervalMs: 0,
      }),
    ).resolves.toMatchObject({ gatewayRuntimeAttachmentId: "gra_1" })

    const defaultUuidAbort = new AbortController()
    const defaultUuidSent: RuntimeResponseFrame[] = []
    const defaultUuidHeartbeats: string[] = []
    await runRemoteRuntimeConnectorWebSocketMessageSession({
      attachment: sessionAttachment(),
      client: sessionClient().client,
      messages: socketMessages([{ type: "heartbeat" }]),
      onRuntimeHeartbeat: (attachment) => {
        defaultUuidHeartbeats.push(attachment.gatewayRuntimeAttachmentId)
        if (defaultUuidHeartbeats.length === 2) defaultUuidAbort.abort()
      },
      sendRuntimeResponseFrame: (response) => {
        defaultUuidSent.push(response)
      },
      signal: defaultUuidAbort.signal,
      statusHeartbeatIntervalMs: 0,
    })
    expect(defaultUuidSent[0]?.requestId).toMatch(/^[-0-9a-f]{36}$/)
  })

  test("handles websocket attachment revocations before operation validation", async () => {
    const unknownClientRevocation = {
      code: "ATTACHMENT_REVOKED",
      message: "client closed before sending an operation",
      pairingAction: "keep",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: "mda_unknown",
      terminal: true,
      type: "attachment.revoked",
    } as const
    const sent: RuntimeResponseFrame[] = []
    await expect(
      runRemoteRuntimeConnectorWebSocketMessageSession({
        attachment: sessionAttachment(),
        client: sessionClient().client,
        messages: socketMessages([unknownClientRevocation, runtimeOperation()]),
        onDisconnected: () => new Error("socket closed"),
        runtimeCommandHandlers: {
          ping: () => ({ message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }),
        },
        sendRuntimeResponseFrame: (response) => {
          sent.push(response)
        },
        statusHeartbeatIntervalMs: 0,
      }),
    ).rejects.toThrow("socket closed")
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ requestId: "req_outer", type: "runtime.response" })

    await expect(
      runRemoteRuntimeConnectorWebSocketMessageSession({
        attachment: sessionAttachment(),
        client: sessionClient().client,
        messages: socketMessages([
          {
            ...unknownClientRevocation,
            requestId: "gra_1",
          },
        ]),
        sendRuntimeResponseFrame: () => {
          throw new Error("should not send")
        },
        statusHeartbeatIntervalMs: 0,
      }),
    ).rejects.toMatchObject({ remoteRuntimeRecovery: "reattach" })
  })
})
