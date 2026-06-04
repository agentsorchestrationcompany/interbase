import { describe, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import {
  createRuntimeWebSocketEventSignaturePayload,
  createRemoteRuntimeThreadMetadataProjection,
  isRemoteRuntimeProtocolClientCommand,
  isRemoteRuntimeProtocolClientMethod,
  isRemoteRuntimeWebSocketClientMethod,
  isRemoteRuntimeProtocolServerEnvelopeForMethod,
  normalizeRemoteRuntimeGitStatusInput,
  isRuntimeWebSocketClientCommand,
  isRuntimeWebSocketServerEnvelopeForMethod,
  remoteRuntimeProtocolClientMethodValues,
  remoteRuntimeProtocolResponseSchemaForMethod,
  remoteRuntimeProtocolResponseSchemas,
  remoteRuntimeActiveChatMetadataProjectionFields,
  remoteRuntimeChatMessageProjectionFields,
  remoteRuntimeThreadMetadataProjectionFields,
  remoteRuntimeThreadStatusValues,
  remoteRuntimeWebSocketClientMethodValues,
  remoteRuntimeWebSocketResponsePayloadKindValues,
  remoteRuntimeWebSocketResponseSchemas,
  remoteRuntimeWebSocketResponseSchemaForMethod,
  type RemoteRuntimeActiveChatsResponse,
  type RuntimeWebSocketAllowedDirectory,
} from "../src/remote-runtime-protocol.js"

const chat = {
  agent: null,
  createdAt: "2026-05-24T00:00:00.000Z",
  hasActiveTurn: false,
  lastText: null,
  messageCount: 0,
  model: null,
  path: "/workspace",
  projectId: "project_1",
  providerId: null,
  providerName: null,
  sessionId: "session_1",
  status: "idle",
  title: "Workspace",
  updatedAt: "2026-05-24T00:00:00.000Z",
} as const

const pageInfo = {
  hasNewer: false,
  hasOlder: false,
  newerCursor: null,
  olderCursor: null,
} as const

describe("remote runtime protocol authority", () => {
  test("exposes remote runtime projection and directory contracts", () => {
    expect(remoteRuntimeThreadStatusValues).toEqual(["idle", "running", "error", "closed", "interrupted"])
    expect(remoteRuntimeThreadMetadataProjectionFields).toContain("threadId")
    expect(remoteRuntimeActiveChatMetadataProjectionFields).toContain("sessionId")
    expect(remoteRuntimeChatMessageProjectionFields).toContain("parts")

    const page: RemoteRuntimeActiveChatsResponse = {
      activeChats: [],
      pageInfo: {
        hasNewer: false,
        hasOlder: false,
        newerCursor: null,
        olderCursor: null,
      },
    }
    const directory: RuntimeWebSocketAllowedDirectory = {
      directoryId: "dir_1",
      path: "/workspace",
    }

    expect(page.activeChats).toEqual([])
    expect(directory.directoryId).toBe("dir_1")
  })

  test("creates canonical runtime WebSocket event signature payloads", () => {
    expect(
      createRuntimeWebSocketEventSignaturePayload({
        eventPayloadSha256: "event_hash",
        gatewayRuntimeAttachmentId: "attachment_1",
        keyId: "key_1",
        runtimeInstallationId: "runtime_1",
        timestamp: "2026-05-24T00:00:00.000Z",
        trustedRuntimeClientId: "device_1",
      }),
    ).toEqual({
      algorithm: "ed25519",
      payload: [
        "interbase-runtime-websocket-event-signature-v1",
        "runtimeInstallationId:runtime_1",
        "trustedRuntimeClientId:device_1",
        "gatewayRuntimeAttachmentId:attachment_1",
        "keyId:key_1",
        "eventPayloadSha256:event_hash",
        "timestamp:2026-05-24T00:00:00.000Z",
      ].join("\n"),
    })

    expect(
      createRuntimeWebSocketEventSignaturePayload({
        eventPayloadSha256: "event_hash",
        gatewayRuntimeAttachmentId: null,
        keyId: "key_1",
        runtimeInstallationId: "runtime_1",
        timestamp: "2026-05-24T00:00:00.000Z",
        trustedRuntimeClientId: "device_1",
      }).payload,
    ).toContain("gatewayRuntimeAttachmentId:\n")
  })

  test("projects remote runtime thread metadata from runtime thread state", () => {
    const live = {
      activeRunId: null,
      attachmentCount: 1,
      lastEventSequence: 42,
      managedOwnership: true,
      providerId: "provider_1",
      status: "running" as const,
      subscribedClientIds: ["client_1"],
      threadId: "thread_1",
      updatedAt: "2026-05-24T00:00:00.000Z",
    }

    expect(
      createRemoteRuntimeThreadMetadataProjection({
        live,
        runtimeState: { lastManagedModel: "model_1", replayPresence: "present" },
      }),
    ).toEqual({
      lastEventSequence: 42,
      model: "model_1",
      providerId: "provider_1",
      replay: "supported",
      status: "running",
      threadId: "thread_1",
      updatedAt: "2026-05-24T00:00:00.000Z",
    })
    expect(
      createRemoteRuntimeThreadMetadataProjection({
        live: { ...live, lastEventSequence: undefined },
        runtimeState: { lastManagedModel: null, replayPresence: "missing" },
      }),
    ).toMatchObject({ lastEventSequence: null, model: null, replay: "unavailable" })
    expect(createRemoteRuntimeThreadMetadataProjection({ live, runtimeState: null })).toMatchObject({
      replay: "unavailable",
    })
  })

  test("owns remote runtime protocol extension method response schemas", () => {
    expect(remoteRuntimeWebSocketClientMethodValues).toEqual([
      "directory.list",
      "directory.select",
      "session.list",
      "activeChats.list",
      "chat.start",
      "session.messages",
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
      "git.status",
    ])
    expect(isRemoteRuntimeWebSocketClientMethod("chat.start")).toBe(true)
    expect(isRemoteRuntimeWebSocketClientMethod("session.list")).toBe(true)
    expect(isRemoteRuntimeWebSocketClientMethod("provider.list")).toBe(false)
    expect(remoteRuntimeWebSocketResponsePayloadKindValues).toEqual(["metadata", "session", "goal", "alias", "git"])
    expect(remoteRuntimeWebSocketResponseSchemaForMethod("chat.start")).toEqual({
      method: "chat.start",
      payloadKind: "session",
      serverMessageTypes: ["response", "error", "heartbeat", "protocolVersionMismatch"],
    })
  })

  test("validates remote runtime websocket client methods and commands", () => {
    expect(remoteRuntimeProtocolClientMethodValues).toContain("ping")
    expect(remoteRuntimeProtocolClientMethodValues).toContain("session.messages")
    expect(isRemoteRuntimeProtocolClientMethod("ping")).toBe(true)
    expect(isRemoteRuntimeProtocolClientMethod("session.messages")).toBe(true)
    expect(isRemoteRuntimeProtocolClientMethod("not.real")).toBe(false)
    expect(remoteRuntimeProtocolResponseSchemaForMethod("session.messages")).toEqual({
      method: "session.messages",
      payloadKind: "session",
      serverMessageTypes: ["response", "error", "heartbeat", "protocolVersionMismatch"],
    })
    expect(remoteRuntimeProtocolResponseSchemaForMethod("ping").method).toBe("ping")
  expect(remoteRuntimeProtocolResponseSchemas.some((schema) => schema.method === "session.messages")).toBe(true)
    expect(remoteRuntimeProtocolResponseSchemaForMethod("git.status")).toEqual({
      method: "git.status",
      payloadKind: "git",
      serverMessageTypes: ["response", "error", "heartbeat", "protocolVersionMismatch"],
    })

    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "ping",
        payload: { message: "hello" },
        protocolVersion: "0.1.5",
        requestId: "request_base",
      }),
    ).toBe(true)
    expect(isRemoteRuntimeProtocolClientCommand(null)).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "directory.list",
        payload: {},
        protocolVersion: "1",
        requestId: "request_1",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "directory.list",
        payload: { extra: true },
        protocolVersion: "1",
        requestId: "request_1",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "directory.select",
        payload: { directoryId: "dir_1" },
        protocolVersion: "1",
        requestId: "request_2",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "directory.select",
        payload: { directoryId: "" },
        protocolVersion: "1",
        requestId: "request_2",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "chat.start",
        payload: { directoryId: "dir_1", model: null, providerId: "provider_1", title: "Title" },
        protocolVersion: "1",
        requestId: "request_3",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "chat.start",
        payload: { directoryId: "dir_1", model: 1 },
        protocolVersion: "1",
        requestId: "request_3",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "session.list",
        payload: { cursor: null, limit: 25 },
        protocolVersion: "1",
        requestId: "request_legacy_active_chats",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "activeChats.list",
        payload: { cursor: null, limit: 25 },
        protocolVersion: "1",
        requestId: "request_4",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "activeChats.list",
        payload: { limit: 1.5 },
        protocolVersion: "1",
        requestId: "request_4",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "session.messages",
        payload: { cursor: null, limit: null, sessionId: "session_1" },
        protocolVersion: "1",
        requestId: "request_5",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "session.messages",
        payload: { sessionId: "" },
        protocolVersion: "1",
        requestId: "request_5",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "session.messages",
        payload: {},
        protocolVersion: "1",
        requestId: "",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "session.messages",
        payload: null,
        protocolVersion: "1",
        requestId: "request_5",
      }),
    ).toBe(false)
  })

  test("validates generic runtime websocket commands through remote runtime contract authority", () => {
    expect(
      isRuntimeWebSocketClientCommand({
        method: "initialize",
        payload: {
          clientName: "mobile-test",
          clientVersion: "1",
          supportedRuntimeApiVersion: "0.1.5",
          supportedRuntimeApiVersions: ["0.1.4", "0.1.5"],
        },
        protocolVersion: "0.1.5",
        requestId: "request_initialize",
      }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "initialize",
        payload: { clientName: "", clientVersion: "1", supportedRuntimeApiVersion: "0.1.5" },
        protocolVersion: "0.1.5",
        requestId: "request_initialize",
      }),
    ).toBe(false)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "providerModel.command",
        payload: { command: { model: "gpt-5", type: "model.set" }, prompt: "", sessionId: "" },
        protocolVersion: "0.1.5",
        requestId: "request_model",
      }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "providerModel.command",
        payload: { command: { providerId: "openai", type: "provider.set" }, prompt: "", sessionId: "" },
        protocolVersion: "0.1.5",
        requestId: "request_provider",
      }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "providerModel.command",
        payload: { command: { type: "provider.current" }, prompt: "", sessionId: "" },
        protocolVersion: "0.1.5",
        requestId: "request_current_provider",
      }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "providerModel.command",
        payload: { command: { type: "model.set" }, prompt: "", sessionId: "" },
        protocolVersion: "0.1.5",
        requestId: "request_bad_model",
      }),
    ).toBe(false)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "providerModel.command",
        payload: { command: { type: "unknown" }, prompt: "", sessionId: "" },
        protocolVersion: "0.1.5",
        requestId: "request_bad_provider_command",
      }),
    ).toBe(false)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "subscribe",
        payload: { afterSequence: 1, threadRef: { providerId: "openai", threadId: "thread_1" } },
        protocolVersion: "0.1.5",
        requestId: "request_subscribe",
      }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "resume",
        payload: { afterSequence: null, sessionId: "session_1" },
        protocolVersion: "0.1.5",
        requestId: "request_resume",
      }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketClientCommand({
        method: "unsubscribe",
        payload: { threadId: "thread_1" },
        protocolVersion: "0.1.5",
        requestId: "request_unsubscribe",
      }),
    ).toBe(true)
  })

  test("validates remote runtime websocket responses by method payload shape", () => {
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "chat.start",
        {
          payload: { chat },
          requestId: "request_1",
          success: true,
          type: "response",
        },
        "request_1",
      ),
    ).toBe(true)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "chat.start",
        {
          payload: { directoryId: "dir_1" },
          requestId: "request_1",
          success: true,
          type: "response",
        },
        "request_1",
      ),
    ).toBe(false)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "directory.list",
        {
          payload: {
            activeDirectoryAttachments: [],
            allowedDirectories: [{ directoryId: "dir_1", path: "/workspace" }],
          },
          requestId: "request_2",
          success: true,
          type: "response",
        },
        "request_2",
      ),
    ).toBe(true)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "directory.list",
        {
          payload: { allowedDirectories: [{ path: "/workspace" }] },
          requestId: "request_2",
          success: true,
          type: "response",
        },
        "request_2",
      ),
    ).toBe(false)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "activeChats.list",
        {
          payload: {
            activeChats: [chat],
            pageInfo: {
              hasNewer: false,
              hasOlder: false,
              newerCursor: null,
              olderCursor: null,
            },
          },
          requestId: "request_3",
          success: true,
          type: "response",
        },
        "request_3",
      ),
    ).toBe(true)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "activeChats.list",
        {
          payload: {
            activeChats: [{ ...chat, sessionId: "" }],
            pageInfo: {
              hasNewer: false,
              hasOlder: false,
              newerCursor: null,
              olderCursor: null,
            },
          },
          requestId: "request_3",
          success: true,
          type: "response",
        },
        "request_3",
      ),
    ).toBe(false)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "directory.select",
        {
          payload: {
            attachment: {
              directoryId: "dir_1",
              gatewayRuntimeAttachmentId: "attachment_1",
              path: "/workspace",
              status: "online",
            },
            directory: { directoryId: "dir_1", displayName: null, path: "/workspace" },
          },
          requestId: "request_5",
          success: true,
          type: "response",
        },
        "request_5",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "directory.select",
        {
          payload: {
            attachment: {
              directoryId: "dir_1",
              gatewayRuntimeAttachmentId: "attachment_1",
              path: "/workspace",
              status: "bad",
            },
            directory: { directoryId: "dir_1", path: "/workspace" },
          },
          requestId: "request_5",
          success: true,
          type: "response",
        },
        "request_5",
      ),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "session.messages",
        {
          payload: {
            messages: [
              {
                agent: null,
                completedAt: null,
                createdAt: "2026-05-24T00:00:00.000Z",
                errorMessage: null,
                errorName: null,
                finishReason: null,
                id: "message_1",
                model: null,
                parentId: null,
                parts: [
                  { id: null, kind: "text", messageId: null, rawPart: null, status: null, text: "Hi", title: null },
                ],
                role: "assistant",
                sessionId: "session_1",
              },
            ],
            pageInfo,
            sessionId: "session_1",
          },
          requestId: "request_6",
          success: true,
          type: "response",
        },
        "request_6",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "session.messages",
        {
          payload: {
            messages: [
              {
                agent: "agent_1",
                completedAt: "2026-05-24T00:00:01.000Z",
                createdAt: "2026-05-24T00:00:00.000Z",
                errorMessage: "",
                errorName: "",
                finishReason: "stop",
                id: "message_2",
                model: "model_1",
                parentId: "message_1",
                parts: [
                  {
                    id: "part_1",
                    kind: "tool",
                    messageId: "message_2",
                    rawPart: { type: "tool" },
                    status: "done",
                    text: null,
                    title: "Tool",
                  },
                ],
                role: "user",
                sessionId: "session_1",
              },
              {
                agent: null,
                completedAt: null,
                createdAt: "2026-05-24T00:00:00.000Z",
                errorMessage: null,
                errorName: null,
                finishReason: null,
                id: "message_3",
                model: null,
                parentId: null,
                parts: [],
                role: "system",
                sessionId: "session_1",
              },
            ],
            pageInfo,
            sessionId: "session_1",
          },
          requestId: "request_6b",
          success: true,
          type: "response",
        },
        "request_6b",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "session.messages",
        {
          payload: { messages: [{ id: "message_1" }], pageInfo, sessionId: "session_1" },
          requestId: "request_6",
          success: true,
          type: "response",
        },
        "request_6",
      ),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "session.messages",
        {
          payload: {
            messages: [
              {
                agent: null,
                completedAt: null,
                createdAt: "2026-05-24T00:00:00.000Z",
                errorMessage: null,
                errorName: null,
                finishReason: null,
                id: "message_4",
                model: null,
                parentId: null,
                parts: [
                  { id: null, kind: "text", messageId: null, rawPart: "bad", status: null, text: null, title: null },
                ],
                role: "assistant",
                sessionId: "session_1",
              },
            ],
            pageInfo,
            sessionId: "session_1",
          },
          requestId: "request_6c",
          success: true,
          type: "response",
        },
        "request_6c",
      ),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "session.messages",
        {
          payload: {
            messages: [
              {
                agent: null,
                completedAt: null,
                createdAt: "2026-05-24T00:00:00.000Z",
                errorMessage: null,
                errorName: null,
                finishReason: null,
                id: "message_5",
                model: null,
                parentId: null,
                parts: [],
                role: "bad",
                sessionId: "session_1",
              },
            ],
            pageInfo,
            sessionId: "session_1",
          },
          requestId: "request_6d",
          success: true,
          type: "response",
        },
        "request_6d",
      ),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "ping",
        {
          payload: { message: "pong", timestamp: "2026-05-24T00:00:00.000Z" },
          requestId: "request_7",
          success: true,
          type: "response",
        },
        "request_7",
      ),
    ).toBe(true)
    expect(isRemoteRuntimeProtocolServerEnvelopeForMethod("chat.start", null)).toBe(false)
    expect(isRemoteRuntimeProtocolServerEnvelopeForMethod("chat.start", { type: "unknown" })).toBe(false)
  })

  test("validates remote runtime websocket non-response envelope shapes", () => {
    expect(
      isRuntimeWebSocketServerEnvelopeForMethod(
        "initialize",
        {
          payload: {
            acceptedRuntimeApiVersion: "0.1.5",
            attachmentCapabilities: ["runtime.metadata"],
            featureCapabilities: ["remoteRuntime.http.runtimeStatus"],
            protocolVersion: "0.1.5",
            serverName: "runtime",
            serverVersion: "1",
            supportedMethods: ["initialize", "ping"],
          },
          requestId: "request_initialize",
          success: true,
          type: "response",
        },
        "request_initialize",
      ),
    ).toBe(true)
    expect(
      isRuntimeWebSocketServerEnvelopeForMethod(
        "initialize",
        {
          payload: { acceptedRuntimeApiVersion: "0.1.5" },
          requestId: "request_initialize",
          success: true,
          type: "response",
        },
        "request_initialize",
      ),
    ).toBe(false)
    expect(
      isRuntimeWebSocketServerEnvelopeForMethod(
        "ping",
        {
          payload: { message: "pong", timestamp: "2026-05-24T00:00:00.000Z" },
          requestId: "request_ping",
          success: true,
          type: "response",
        },
        "request_ping",
      ),
    ).toBe(true)
    expect(
      isRuntimeWebSocketServerEnvelopeForMethod(
        "ping",
        {
          error: { code: "PROTOCOL_ERROR", message: "Bad request", recoverable: true },
          requestId: "request_ping",
          success: false,
          type: "error",
        },
        "request_ping",
      ),
    ).toBe(true)
    expect(isRuntimeWebSocketServerEnvelopeForMethod("ping", { event: {}, type: "event" })).toBe(true)
    expect(isRuntimeWebSocketServerEnvelopeForMethod("ping", { delivery: {}, type: "delivery" })).toBe(true)
    expect(
      isRuntimeWebSocketServerEnvelopeForMethod("ping", {
        payload: {},
        requestId: "request_server",
        type: "serverRequest",
      }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketServerEnvelopeForMethod("ping", { timestamp: "2026-05-24T00:00:00.000Z", type: "heartbeat" }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketServerEnvelopeForMethod("ping", {
        expectedVersion: "0.1.5",
        message: "Upgrade required",
        receivedVersion: "0.1.3",
        type: "protocolVersionMismatch",
      }),
    ).toBe(true)
    expect(
      isRuntimeWebSocketServerEnvelopeForMethod(
        "ping",
        {
          payload: { message: "pong", timestamp: "2026-05-24T00:00:00.000Z" },
          requestId: "request_ping",
          success: true,
          type: "response",
        },
        "other_request",
      ),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod("chat.start", {
        timestamp: "2026-05-24T00:00:00.000Z",
        type: "heartbeat",
      }),
    ).toBe(true)

    expect(isRemoteRuntimeProtocolServerEnvelopeForMethod("chat.start", { type: "heartbeat" })).toBe(false)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod("chat.start", {
        expectedVersion: "0.1.5",
        message: "Unsupported protocol version.",
        receivedVersion: "0.1.0",
        type: "protocolVersionMismatch",
      }),
    ).toBe(true)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod("chat.start", {
        expectedVersion: "0.1.5",
        message: "Unsupported protocol version.",
        type: "protocolVersionMismatch",
      }),
    ).toBe(false)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "chat.start",
        {
          error: {
            code: "RUNTIME_UNAVAILABLE",
            message: "Runtime unavailable",
            recoverable: true,
          },
          requestId: "request_4",
          success: false,
          type: "error",
        },
        "request_4",
      ),
    ).toBe(true)

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "chat.start",
        {
          error: {
            code: "RUNTIME_UNAVAILABLE",
            message: "Runtime unavailable",
          },
          requestId: "request_4",
          success: false,
          type: "error",
        },
        "request_4",
      ),
    ).toBe(false)
  })

  test("validates goal and alias protocol commands and responses", () => {
    const goal = {
      createdAt: 1,
      objective: "Ship parity",
      status: "active",
      threadId: "session_1",
      timeUsedSeconds: 0,
      tokenBudget: 12,
      tokensUsed: 2,
      updatedAt: 2,
    } as const

    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.get",
        payload: { sessionId: "session_1" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_get",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.list",
        payload: { cursor: "cursor_1", limit: 20, status: "paused" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_list",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.create",
        payload: { input: { objective: "Ship parity", token_budget: 12 }, sessionId: "session_1" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_create",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.edit",
        payload: { input: { objective: "Ship remote parity", token_budget: null }, sessionId: "session_1" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_edit",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.update",
        payload: { input: { status: "blocked" }, sessionId: "session_1" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_update",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.pause",
        payload: { sessionId: "session_1" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_pause",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.resume",
        payload: { sessionId: "session_1" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_resume",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "alias.list",
        payload: {},
        protocolVersion: "0.1.5",
        requestId: "req_alias_list",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "alias.get",
        payload: { alias: "ship" },
        protocolVersion: "0.1.5",
        requestId: "req_alias_get",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "alias.set",
        payload: { alias: "ship", prompt: "Ship the diff" },
        protocolVersion: "0.1.5",
        requestId: "req_alias_set",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "alias.delete",
        payload: { alias: "ship" },
        protocolVersion: "0.1.5",
        requestId: "req_alias_delete",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "git.status",
        payload: {},
        protocolVersion: "0.1.5",
        requestId: "req_git_status",
      }),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "git.status",
        payload: { includeDiff: true, maxDiffBytes: 262_144 },
        protocolVersion: "0.1.5",
        requestId: "req_git_status_diff",
      }),
    ).toBe(true)
    expect(normalizeRemoteRuntimeGitStatusInput({})).toEqual({ includeDiff: false, maxDiffBytes: 262_144 })
    expect(() => normalizeRemoteRuntimeGitStatusInput({ maxDiffBytes: 0 })).toThrow(
      "Remote runtime git status input is invalid.",
    )

    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.list",
        payload: { status: "bad" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_list_bad",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "goal.update",
        payload: { input: { status: "active" }, sessionId: "session_1" },
        protocolVersion: "0.1.5",
        requestId: "req_goal_update_bad",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "alias.list",
        payload: { extra: true },
        protocolVersion: "0.1.5",
        requestId: "req_alias_list_bad",
      }),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolClientCommand({
        method: "alias.set",
        payload: { alias: "ship", prompt: "" },
        protocolVersion: "0.1.5",
        requestId: "req_alias_set_bad",
      }),
    ).toBe(false)
    for (const payload of [
      { extra: true },
      { includeDiff: "true" },
      { maxDiffBytes: 0 },
      { maxDiffBytes: -1 },
      { maxDiffBytes: 1.5 },
      { maxDiffBytes: 1_048_577 },
    ]) {
      expect(
        isRemoteRuntimeProtocolClientCommand({
          method: "git.status",
          payload,
          protocolVersion: "0.1.5",
          requestId: "req_git_status_bad",
        }),
      ).toBe(false)
    }

    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "goal.get",
        {
          payload: { completionBudgetReport: null, goal, remainingTokens: 10 },
          requestId: "req_goal_get",
          success: true,
          type: "response",
        },
        "req_goal_get",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "goal.list",
        {
          payload: { goals: [goal], pageInfo: { hasOlder: false, olderCursor: null } },
          requestId: "req_goal_list",
          success: true,
          type: "response",
        },
        "req_goal_list",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "goal.list",
        { payload: { goals: [goal] }, requestId: "req_goal_list_legacy", success: true, type: "response" },
        "req_goal_list_legacy",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "alias.list",
        {
          payload: { aliases: [{ alias: "ship", prompt: "Ship the diff", updatedAt: 1 }] },
          requestId: "req_alias_list",
          success: true,
          type: "response",
        },
        "req_alias_list",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "alias.get",
        {
          payload: { alias: { alias: "ship", prompt: "Ship the diff", updatedAt: 1 } },
          requestId: "req_alias_get",
          success: true,
          type: "response",
        },
        "req_alias_get",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "alias.delete",
        { payload: { deleted: true }, requestId: "req_alias_delete", success: true, type: "response" },
        "req_alias_delete",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "git.status",
        {
          payload: {
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
          },
          requestId: "req_git_status",
          success: true,
          type: "response",
        },
        "req_git_status",
      ),
    ).toBe(true)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "goal.get",
        { payload: { goal, remainingTokens: 10 }, requestId: "req_goal_get_bad", success: true, type: "response" },
        "req_goal_get_bad",
      ),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "alias.list",
        {
          payload: { aliases: [{ alias: "", prompt: "Ship the diff", updatedAt: 1 }] },
          requestId: "req_alias_list_bad",
          success: true,
          type: "response",
        },
        "req_alias_list_bad",
      ),
    ).toBe(false)
    expect(
      isRemoteRuntimeProtocolServerEnvelopeForMethod(
        "git.status",
        {
          payload: { repositories: [{ directoryId: "dir_1", path: "/repo" }] },
          requestId: "req_git_status_bad",
          success: true,
          type: "response",
        },
        "req_git_status_bad",
      ),
    ).toBe(false)
  })

  test("remote runtime protocol schema artifact matches the TypeScript authority", async () => {
    const artifact = JSON.parse(
      await readFile(new URL("../schema/remote-runtime-protocol.schema.json", import.meta.url), "utf8"),
    )

    expect(artifact.extensionClientMethods).toEqual([...remoteRuntimeWebSocketClientMethodValues])
    expect(artifact.responsePayloadKinds).toEqual([...remoteRuntimeWebSocketResponsePayloadKindValues])
    expect(artifact.responseSchemas).toEqual(remoteRuntimeWebSocketResponseSchemas)
    expect(artifact.remoteRuntimeThreadMetadataProjectionFields).toEqual([
      ...remoteRuntimeThreadMetadataProjectionFields,
    ])
    expect(artifact.remoteRuntimeActiveChatMetadataProjectionFields).toEqual([
      ...remoteRuntimeActiveChatMetadataProjectionFields,
    ])
    expect(artifact.remoteRuntimeChatMessageProjectionFields).toEqual([...remoteRuntimeChatMessageProjectionFields])
    expect(artifact.remoteRuntimeThreadStatuses).toEqual([...remoteRuntimeThreadStatusValues])
    expect(artifact.metadataResponseShapes.initialize.fields).toContain("activeChats")
  })
})
