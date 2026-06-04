import { describe, expect, test } from "bun:test"
import { runtimeWebSocketProtocolVersion } from "@interbase/runtime-protocol"
import type { RemoteRuntimeJsonValue, RemoteRuntimeProtocolClientCommand } from "@interbase/remote-runtime-contracts"
import {
  createRemoteRuntimeMetadataCommandHandlers,
  createRemoteRuntimeCommandAdapter,
  remoteRuntimeMetadataSupportedMethods,
  remoteRuntimeDefaultAttachmentCapabilities,
  remoteRuntimeDefaultFeatureCapabilities,
  remoteRuntimeSupportedMethods,
  validateRuntimeCommand,
} from "../src/index.js"

const pingCommand: RemoteRuntimeProtocolClientCommand = {
  method: "ping",
  payload: { message: "hello" },
  protocolVersion: runtimeWebSocketProtocolVersion,
  requestId: "req_ping",
}

describe("remote runtime command adapter", () => {
  test("declares default capabilities and supported command windows", () => {
    expect(remoteRuntimeDefaultAttachmentCapabilities).toContain("runtime.metadata")
    expect(remoteRuntimeDefaultAttachmentCapabilities).toContain("runtime.sensitiveRead")
    expect(remoteRuntimeDefaultAttachmentCapabilities).toContain("runtime.mutate")
    expect(remoteRuntimeDefaultFeatureCapabilities).toContain("remoteRuntime.http.runtimeStatus")
    expect(remoteRuntimeMetadataSupportedMethods).toEqual(["initialize", "ping"])
    expect(remoteRuntimeSupportedMethods).toContain("session.message")
  })

  test("dispatches validated runtime websocket commands by exact method", async () => {
    const seen: RemoteRuntimeProtocolClientCommand[] = []
    const adapter = createRemoteRuntimeCommandAdapter({
      handlers: {
        ping: (command) => {
          seen.push(command)
          return { message: (command.payload as { message: string }).message }
        },
      },
    })

    const envelope = await adapter.handleRuntimeCommand(pingCommand)

    expect(envelope).toEqual({
      payload: { message: "hello" },
      requestId: "req_ping",
      success: true,
      type: "response",
    })
    expect(seen).toEqual([pingCommand])
  })

  test("rejects malformed and mismatched protocol commands before dispatch", async () => {
    const seen: RemoteRuntimeProtocolClientCommand[] = []
    const adapter = createRemoteRuntimeCommandAdapter({
      handlers: {
        ping: (command) => {
          seen.push(command)
          return {}
        },
      },
    })

    await expect(adapter.handleRuntimeCommand(null)).resolves.toMatchObject({
      error: { code: "PROTOCOL_ERROR" },
      success: false,
      type: "error",
    })
    await expect(
      adapter.handleRuntimeCommand({
        ...pingCommand,
        protocolVersion: "0.0.0",
      }),
    ).resolves.toEqual({
      expectedVersion: runtimeWebSocketProtocolVersion,
      message: `Runtime WebSocket protocol version mismatch: expected ${runtimeWebSocketProtocolVersion}, got 0.0.0. Supported versions: 0.1.5, ${runtimeWebSocketProtocolVersion}. Update the CLI/runtime or update the client so their supported protocol windows overlap.`,
      receivedVersion: "0.0.0",
      type: "protocolVersionMismatch",
    })
    expect(seen).toEqual([])
  })

  test("reports received and supported versions for command validation mismatches", () => {
    const command = {
      method: "ping",
      payload: { message: "hello" },
      protocolVersion: "0.0.0",
      requestId: "req_ping",
    } satisfies RemoteRuntimeJsonValue

    expect(validateRuntimeCommand(command)).toEqual({
      error: {
        code: "PROTOCOL_MISMATCH",
        message:
          "Runtime command protocol version is unsupported: received 0.0.0; supported versions: 0.1.5, 0.1.6. Update the CLI/runtime or update the mobile app so their supported protocol windows overlap.",
        pairingAction: "upgrade_app",
        protocolVersion: "2026-05-08",
        requestId: "req_ping",
        terminal: true,
        type: "protocol.mismatch",
      },
      ok: false,
    })
  })

  test("denies methods without registered handlers", async () => {
    const adapter = createRemoteRuntimeCommandAdapter({
      handlers: {
        initialize: () => ({ ok: true }),
      },
    })

    await expect(adapter.handleRuntimeCommand(pingCommand)).resolves.toMatchObject({
      error: {
        code: "CAPABILITY_UNAVAILABLE",
        message: "Runtime method ping is not implemented by this adapter.",
      },
      requestId: "req_ping",
      success: false,
      type: "error",
    })

    await expect(
      createRemoteRuntimeCommandAdapter({ handlers: {} }).handleRuntimeCommand(pingCommand),
    ).resolves.toMatchObject({
      error: {
        code: "CAPABILITY_UNAVAILABLE",
        message: "Runtime method ping is not implemented by this adapter.",
      },
      requestId: "req_ping",
      success: false,
      type: "error",
    })
  })

  test("converts handler failures, disabled methods, and multi-version initialize mismatches", async () => {
    const adapter = createRemoteRuntimeCommandAdapter({
      handlers: {
        ping: () => {
          throw new Error("boom")
        },
      },
      supportedMethods: ["initialize"],
    })

    await expect(adapter.handleRuntimeCommand(pingCommand)).resolves.toMatchObject({
      error: {
        code: "CAPABILITY_UNAVAILABLE",
        message: "Runtime method ping is not enabled for this adapter.",
      },
      requestId: "req_ping",
      success: false,
      type: "error",
    })

    const failingAdapter = createRemoteRuntimeCommandAdapter({
      handlers: {
        ping: () => {
          throw new Error("boom")
        },
      },
    })
    await expect(failingAdapter.handleRuntimeCommand(pingCommand)).resolves.toMatchObject({
      error: {
        code: "DAEMON_INTERNAL",
        message: "boom",
        recoverable: true,
      },
      requestId: "req_ping",
      success: false,
      type: "error",
    })
    await expect(
      failingAdapter.handleRuntimeCommand({
        method: "initialize",
        payload: {
          clientName: "Interbase iOS",
          clientVersion: "0.1.0",
          supportedRuntimeApiVersion: "0.0.1",
          supportedRuntimeApiVersions: ["0.0.1", "0.0.2"],
        },
        protocolVersion: runtimeWebSocketProtocolVersion,
        requestId: "req_initialize",
      }),
    ).resolves.toMatchObject({
      receivedVersion: "0.0.1, 0.0.2",
      type: "protocolVersionMismatch",
    })
  })

  test("provides default metadata initialize and ping handlers", async () => {
    const adapter = createRemoteRuntimeCommandAdapter({
      handlers: createRemoteRuntimeMetadataCommandHandlers({
        activeDirectoryAttachments: [
          {
            directoryId: "dir_1",
            gatewayRuntimeAttachmentId: "gra_1",
            path: "/repo",
            status: "online",
          },
        ],
        allowedDirectories: [{ directoryId: "dir_1", displayName: "repo", path: "/repo" }],
        attachmentCapabilities: ["runtime.metadata"],
        featureCapabilities: ["remoteRuntime.http.runtimeStatus"],
        now: () => "2026-05-08T20:00:00.000Z",
        serverName: "custom-remote-runtime",
        serverVersion: "1.0.0",
        supportedMethods: remoteRuntimeSupportedMethods,
      }),
    })

    await expect(
      adapter.handleRuntimeCommand({
        method: "initialize",
        payload: {
          clientName: "Interbase iOS",
          clientVersion: "0.1.0",
          supportedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
        },
        protocolVersion: runtimeWebSocketProtocolVersion,
        requestId: "req_initialize",
      }),
    ).resolves.toMatchObject({
      payload: {
        activeDirectoryAttachments: [{ directoryId: "dir_1" }],
        allowedDirectories: [{ directoryId: "dir_1" }],
        attachmentCapabilities: ["runtime.metadata"],
        featureCapabilities: ["remoteRuntime.http.runtimeStatus"],
        serverName: "custom-remote-runtime",
        supportedMethods: remoteRuntimeSupportedMethods,
      },
      success: true,
      type: "response",
    })
    await expect(adapter.handleRuntimeCommand(pingCommand)).resolves.toEqual({
      payload: {
        message: "pong:hello",
        timestamp: "2026-05-08T20:00:00.000Z",
      },
      requestId: "req_ping",
      success: true,
      type: "response",
    })
  })

  test("uses the default runtime server name for metadata initialize", async () => {
    const adapter = createRemoteRuntimeCommandAdapter({
      handlers: createRemoteRuntimeMetadataCommandHandlers({
        attachmentCapabilities: ["runtime.metadata"],
        featureCapabilities: ["remoteRuntime.http.runtimeStatus"],
        now: () => "2026-05-08T20:00:00.000Z",
        serverVersion: "1.0.0",
        supportedMethods: remoteRuntimeSupportedMethods,
      }),
    })

    await expect(
      adapter.handleRuntimeCommand({
        method: "initialize",
        payload: {
          clientName: "Interbase iOS",
          clientVersion: "0.1.0",
          supportedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
        },
        protocolVersion: runtimeWebSocketProtocolVersion,
        requestId: "req_initialize",
      }),
    ).resolves.toMatchObject({
      payload: {
        serverName: "interbase-remote-runtime",
      },
      success: true,
      type: "response",
    })
  })
})
