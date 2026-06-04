// @ts-nocheck
import { describe, expect, mock, test } from "bun:test"
import {
  createClaudeAdapter,
  createCodexAdapter,
  createInterbaseRuntimeAdapter,
  createLocalAgentBackendRegistry,
  createLocalAgentBackendRouter,
  createMemoryRoutingMetadataStore,
} from "../../cli-agent-backends/src/index.ts"
import {
  runtimeWebSocketProtocolVersion,
  type RuntimeWebSocketSessionMessagePayload,
  type RuntimeWebSocketServerEnvelope,
} from "@interbase/runtime-protocol"
import type {
  RemoteRuntimeActiveChatsListPayload,
  RemoteRuntimeProtocolClientCommand,
  RemoteRuntimeProtocolClientMethod,
} from "@interbase/remote-runtime-contracts"
import { remoteRuntimeTransportProtocolVersion } from "@interbase/remote-runtime-contracts"
import { encryptRuntimeCommand, generateRemoteRuntimeAsymmetricKeyPair } from "../src/index.js"
import { createHash } from "node:crypto"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import {
  createRemoteRuntimeCommandAdapter,
  createRemoteRuntimeManager,
  decodeRemoteRuntimeGoalCursor,
  encodeRemoteRuntimeGoalCursor,
  remoteRuntimeDefaultAttachmentCapabilities,
  remoteRuntimeDefaultFeatureCapabilities,
  type RemoteRuntimeCommandHandler,
  type RemoteRuntimeConnectorSessionInput,
  type RemoteRuntimeEventInput,
} from "../src/remote-runtime-manager.js"
import { JsonFileGoalStore, ThreadGoalManager } from "../../cli-goal-plugin/src/index.js"
import { JsonFilePromptAliasesStore, PromptAliasesManager } from "../src/prompt-aliases.js"

describe("remote runtime manager", () => {
  function injectedBackendRouterOptions(localBackends: any[]) {
    return {
      createBackendRouter: ({ localBackends: providedLocalBackends, routingMetadata, runtimeBridge }: any) =>
        createLocalAgentBackendRouter({
          registry: createLocalAgentBackendRegistry({
            backends: [createInterbaseRuntimeAdapter(runtimeBridge), ...providedLocalBackends],
            routingMetadata,
          }),
          routingMetadata,
        }),
      createLocalBackends: () => localBackends,
    }
  }

  test("uses default clock uuid and sleep dependencies when not overridden", async () => {
    let attachmentRequestId = ""
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          attachmentRequestId = input.attachmentInput.requestId
          await new Promise((resolve) => setTimeout(resolve, 1))
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    const status = await manager.start(startInput())

    expect(status.state).toBe("online")
    expect(status.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(attachmentRequestId).not.toBe("")
    expect(attachmentRequestId).not.toBe("req_uuid")
    await manager.stop()
  })

  test("uses injected backend router and routing metadata factories", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const routingMetadata = {
      get: async () => null,
      list: async () => [],
      put: async () => undefined,
    }
    const created: Array<{ localBackends: unknown[]; routingMetadata: unknown }> = []
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      createLocalBackends: () => [],
      createRoutingMetadataStore: () => routingMetadata,
      createBackendRouter: ({ localBackends, routingMetadata: providedRoutingMetadata }) => {
        created.push({ localBackends, routingMetadata: providedRoutingMetadata })
        return {
          createConversation: async () => {
            throw new Error("not used")
          },
          listAgents: async () => ({
            agents: [
              {
                agentId: "custom",
                available: true,
                capabilities: {
                  image: false,
                  model_selection: false,
                  native_execution: false,
                  tools: false,
                },
                displayName: "Custom",
                models: [],
                unavailableReason: null,
              },
            ],
          }),
          listConversations: async () => [],
          listModels: async () => [],
          readConversation: async () => {
            throw new Error("not used")
          },
          sendMessage: async () => {
            throw new Error("not used")
          },
          updateConversationModel: async () => {
            throw new Error("not used")
          },
        }
      },
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await manager.start(startInput())
    await expect(
      handlers["agent.list"]?.({
        method: "agent.list",
        payload: {},
        protocolVersion: runtimeWebSocketProtocolVersion,
        requestId: "req_agents",
      } as RemoteRuntimeProtocolClientCommand),
    ).resolves.toEqual({
      agents: [
        {
          agentId: "custom",
          available: true,
          capabilities: {
            image: false,
            model_selection: false,
            native_execution: false,
            tools: false,
          },
          displayName: "Custom",
          models: [],
          unavailableReason: null,
        },
      ],
    })
    expect(created).toHaveLength(1)
    expect(created[0]).toEqual({ localBackends: [], routingMetadata })
    await manager.stop()
  })

  test("rejects injected local backends without an injected backend router", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      createLocalBackends: () => [{ backendId: "codex" } as any],
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
      sleep: async () => undefined,
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(runHandler(handlers["agent.list"], command("agent.list", {}))).rejects.toThrow(
      "Remote runtime manager requires createBackendRouter when local backends are injected.",
    )
    await manager.stop()
  })

  test("falls back to in-memory routing metadata when no store is injected", async () => {
    let createdRoutingMetadata: any
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      createBackendRouter: ({ routingMetadata }) => {
        createdRoutingMetadata = routingMetadata
        return {
          createConversation: async () => {
            throw new Error("not used")
          },
          listAgents: async () => ({ agents: [] }),
          listConversations: async () => [],
          listModels: async () => [],
          readConversation: async () => {
            throw new Error("not used")
          },
          sendMessage: async () => {
            throw new Error("not used")
          },
          updateConversationModel: async () => {
            throw new Error("not used")
          },
        }
      },
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
      sleep: async () => undefined,
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(runHandler(handlers["agent.list"], command("agent.list", {}))).resolves.toEqual({ agents: [] })
    expect(typeof createdRoutingMetadata?.get).toBe("function")
    expect(typeof createdRoutingMetadata?.list).toBe("function")
    expect(typeof createdRoutingMetadata?.put).toBe("function")
    await createdRoutingMetadata.put({
      backendConversationId: "backend-1",
      backendId: "interbaseRuntime",
      conversationId: "session-1",
      createdAt: "2026-05-10T00:00:00.000Z",
      directory: "/repo",
      title: "Session",
      updatedAt: "2026-05-10T00:00:00.000Z",
    })
    await expect(
      createdRoutingMetadata.get({ conversationId: "session-1", directory: "/repo" }),
    ).resolves.toMatchObject({ backendId: "interbaseRuntime" })
    await expect(createdRoutingMetadata.list({ directory: "/repo" })).resolves.toHaveLength(1)
    await manager.stop()
  })

  test("uses the default host-only backend router when no backend factories are injected", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        listProviders: async () => ({
          all: [
            {
              id: "anthropic",
              models: { "claude-sonnet-4.5": { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", status: "active" } },
              name: "Anthropic",
            },
          ],
          connected: ["anthropic"],
          default: { anthropic: "claude-sonnet-4.5" },
        }),
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
      sleep: async () => undefined,
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(runHandler(handlers["agent.list"], command("agent.list", {}))).resolves.toMatchObject({
      agents: [expect.objectContaining({ agentId: "interbaseRuntime", available: false, displayName: "Interbase" })],
    })
    await manager.stop()
  })

  test("falls back to backend router session read when host runtime has no chat projection", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      createBackendRouter: () => ({
        createConversation: async () => {
          throw new Error("not used")
        },
        listAgents: async () => ({ agents: [] }),
        listConversations: async () => [],
        listModels: async () => [],
        readConversation: async () => ({
          backendConversationId: "backend-ses_fallback",
          backendId: "codex",
          capabilities: {
            approvals: true,
            attachments: true,
            conversationHistoryReadable: true,
            images: false,
            modelSelection: true,
            nativeExecution: true,
            resume: true,
            sessionContinuation: true,
            streaming: true,
            toolUse: true,
          },
          continuation: null,
          createdAt: "2026-05-10T00:00:00.000Z",
          id: "ses_fallback",
          messages: [],
          model: "codex",
          providerId: "codex",
          providerName: "Codex",
          status: "idle",
          title: "Fallback chat",
          updatedAt: "2026-05-10T00:00:00.000Z",
        }),
        sendMessage: async () => {
          throw new Error("not used")
        },
        updateConversationModel: async () => {
          throw new Error("not used")
        },
      }),
      deps: testDeps({
        listActiveChats: async () => [],
        projectActiveChat: async () => null,
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
      sleep: async () => undefined,
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(
      runHandler(
        handlers["session.read"],
        command("session.read", {
          sessionId: "ses_fallback",
        }),
      ),
    ).resolves.toMatchObject({
      chat: { agent: "Codex", sessionId: "ses_fallback", title: "Fallback chat" },
    })
    await manager.stop()
  })

  test("starts without waiting for project context and reports structured allowed directories", async () => {
    const contextReady = deferred<{ directory: string }>()
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: {
        ...testDeps({
          runConnectorRuntimeSession: async (input) => {
            handlers = input.runtimeCommandHandlers
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
        }),
        loadContext: async () => await contextReady.promise,
      },
      sleep: async () => undefined,
    })

    await expect(
      manager.start({
        ...startInput(),
        allowedDirectories: [
          { directoryId: "dir_1", displayName: "repo", path: "/repo" },
          { directoryId: "dir_2", displayName: "other", path: "/other" },
        ],
      }),
    ).resolves.toMatchObject({ state: "online" })
    expect(manager.runtimeDirectoriesSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({
      allowedDirectories: [
        { directoryId: "dir_1", path: "/repo" },
        { directoryId: "dir_2", path: "/other" },
      ],
    })
    expect(await runHandler(handlers["directory.list"], command("directory.list", {}))).toMatchObject({
      allowedDirectories: [
        { directoryId: "dir_1", path: "/repo" },
        { directoryId: "dir_2", path: "/other" },
      ],
    })

    contextReady.resolve({ directory: "/repo" })
    await expect(runHandler(handlers["provider.list"], command("provider.list", {}))).resolves.toMatchObject({
      all: [],
    })
    await manager.stop()
  })

  test("owns runtime lifecycle, directory projections, command dispatch, events, and logs", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    let sessionInput: RemoteRuntimeConnectorSessionInput | undefined
    let startChatPayload: unknown
    let updateSessionPayload: unknown
    let listActiveChatsCalls = 0
    let listProvidersCalls = 0
    const disposed: Array<{ directory: string }> = []
    const publishedActivity: Array<{
      directory: string
      event: RemoteRuntimeEventInput
      origin: { kind: string }
    }> = []
    const manager = createRemoteRuntimeManager({
      codexHome: path.join(tmpdir(), "interbase-empty-codex"),
      connectorVersion: "1.2.3",
      ...injectedBackendRouterOptions([
        createCodexAdapter({
          codexHome: path.join(tmpdir(), "interbase-empty-codex"),
          createClient: () => ({
            resumeThread: () => ({
              run: async () => ({ finalResponse: "", id: "unused", items: [] }),
              runStreamed: async () => ({ events: (async function* () {})() }),
              threadId: "unused",
            }),
            startThread: () => ({
              run: async () => ({}),
              runStreamed: async () => ({ events: (async function* () {})() }),
              threadId: "unused",
            }),
          }),
          now: () => "2026-05-10T00:00:00.000Z",
        }),
        createClaudeAdapter({
          createClient: async () => {
            throw new Error("Anthropic SDK unavailable")
          },
          now: () => "2026-05-10T00:00:00.000Z",
          stateDirectory: path.join(tmpdir(), "interbase-empty-claude"),
        }),
      ]),
      now: () => "2026-05-10T00:00:00.000Z",
      randomUUID: () => "req_uuid",
      sleep: async () => undefined,
      deps: {
        issueRuntimeAttachmentTicket: async (input) => {
          expect(input).toMatchObject({
            apiBaseUrl: "https://api.interbase.test",
            authorizationToken: "token_1",
            runtimeInstallationId: "rti_1",
          })
          return { ticket: "ticket_1" }
        },
        async runConnectorRuntimeSession(input) {
          sessionInput = input
          handlers = input.runtimeCommandHandlers
          const attachment = {
            accountId: input.attachmentInput.accountId,
            attachmentCapabilities: [...(input.attachmentInput.attachmentCapabilities ?? [])],
            connectorVersion: input.attachmentInput.connectorVersion,
            deviceTrustLevel: "trusted",
            directoryId: input.attachmentInput.directoryId,
            directoryPath: input.attachmentInput.directoryPath,
            gatewayRuntimeAttachmentId: "gra_1",
            protocolVersion: "0.1.0",
            requestId: input.attachmentInput.requestId,
            runtimeInstallationId: input.attachmentInput.runtimeInstallationId,
            status: "online",
          } as const
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
            },
            clientAttachmentId: "mda_1",
          })
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
            },
            clientAttachmentId: "mda_1",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        loadContext: async (input) => ({ directory: input.directory }),
        disposeContext: async (context) => {
          disposed.push(context)
        },
        listActiveChats: async (_context, payload) => {
          listActiveChatsCalls += 1
          return pagedActiveChats(
            [
              {
                agent: null,
                createdAt: "2026-05-10T00:00:00.000Z",
                hasActiveTurn: false,
                model: null,
                path: "/repo",
                projectId: "project_1",
                providerId: null,
                providerName: null,
                sessionId: "ses_1",
                status: "idle",
                title: "Existing chat",
                updatedAt: "2026-05-10T00:00:00.000Z",
              },
              {
                agent: null,
                createdAt: "2026-05-09T00:00:00.000Z",
                hasActiveTurn: false,
                model: null,
                path: "/repo",
                projectId: "project_1",
                providerId: null,
                providerName: null,
                sessionId: "ses_old",
                status: "closed",
                title: "Older chat",
                updatedAt: "2026-05-09T00:00:00.000Z",
              },
            ],
            payload,
          )
        },
        projectActiveChat: async (_context, sessionId) => ({
          agent: null,
          createdAt: "2026-05-10T00:00:00.000Z",
          hasActiveTurn: false,
          model: null,
          path: "/repo",
          projectId: "project_1",
          providerId: null,
          providerName: null,
          sessionId,
          status: "running",
          title: sessionId === "ses_huge" ? "x".repeat(600 * 1024) : "Updated chat",
          updatedAt: "2026-05-10T00:01:00.000Z",
        }),
        projectSessionMessage: async (_context, sessionId, messageId) => ({
          agent: null,
          completedAt: "2026-05-10T00:02:00.000Z",
          createdAt: "2026-05-10T00:01:30.000Z",
          errorMessage: null,
          errorName: null,
          finishReason: null,
          id: messageId,
          model: null,
          parentId: null,
          parts: [
            {
              id: "part_completed",
              kind: "text",
              messageId,
              rawPart: { id: "part_completed", messageID: messageId, text: "completed", type: "text" },
              status: null,
              text: "completed",
              title: null,
            },
          ],
          role: "assistant",
          sessionId,
        }),
        listProviders: async () => {
          listProvidersCalls += 1
          return {
            all: [
              {
                id: "anthropic",
                models: {
                  "claude-sonnet-4.5": {
                    id: "claude-sonnet-4.5",
                    name: "Claude Sonnet 4.5",
                    status: "active",
                  },
                },
                name: "Anthropic",
              },
            ],
            connected: ["anthropic"],
            default: { anthropic: "claude-sonnet-4.5" },
          }
        },
        listSessionMessages: async (_context, payload) => ({
          messages: [
            {
              agent: null,
              completedAt: null,
              createdAt: "2026-05-10T00:00:00.000Z",
              errorMessage: null,
              errorName: null,
              finishReason: null,
              id: "msg_listed",
              model: null,
              parentId: null,
              parts: [
                {
                  id: "part_listed",
                  kind: "tool",
                  messageId: "msg_listed",
                  rawPart: {
                    id: "part_listed",
                    messageID: "msg_listed",
                    state: {
                      input: { command: "npm test" },
                      output: "ok",
                      status: "completed",
                      title: "Run tests",
                    },
                    tool: "bash",
                    type: "tool",
                  },
                  status: "completed",
                  text: "ok",
                  title: "Run tests",
                },
              ],
              role: "assistant",
              sessionId: payload.sessionId,
            },
          ],
          pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
          sessionId: payload.sessionId,
        }),
        sendSessionMessage: async (_context, payload) => ({
          message: {
            agent: null,
            completedAt: null,
            createdAt: "2026-05-10T00:00:00.000Z",
            errorMessage: null,
            errorName: null,
            finishReason: null,
            id: "msg_1",
            model: null,
            parentId: null,
            parts: [
              {
                id: "part_1",
                kind: "text",
                messageId: "msg_1",
                rawPart: { id: "part_1", messageID: "msg_1", text: "hello", type: "text" },
                status: null,
                text: "hello",
                title: null,
              },
            ],
            role: "user",
            sessionId: payload.sessionId,
          },
          sessionId: payload.sessionId,
        }),
        startChat: async (_context, payload) => {
          startChatPayload = payload
          return {
            chat: {
              agent: null,
              createdAt: "2026-05-10T00:00:00.000Z",
              model: payload.model ?? null,
              path: "/repo",
              projectId: "project_1",
              providerId: payload.providerId ?? null,
              providerName: null,
              sessionId: "ses_new",
              status: "idle",
              title: payload.title ?? null,
              updatedAt: "2026-05-10T00:00:00.000Z",
            },
          }
        },
        updateSession: async (_context, payload) => {
          updateSessionPayload = payload
          return {
            chat: {
              agent: null,
              createdAt: "2026-05-10T00:00:00.000Z",
              model: payload.input.model ?? null,
              path: "/repo",
              projectId: "project_1",
              providerId: payload.input.providerId ?? null,
              providerName: null,
              sessionId: payload.sessionId,
              status: "idle",
              title: "Updated chat",
              updatedAt: "2026-05-10T00:00:00.000Z",
            },
          }
        },
        publishSessionActivity: async (_context, input) => {
          publishedActivity.push(input)
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => {
            eventHandler = undefined
          }
        },
      },
    })

    await expect(
      manager.start({
        accountId: "acct_1",
        apiBaseUrl: "https://api.interbase.test",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        runtimeInstallationId: "rti_1",
      }),
    ).resolves.toMatchObject({
      commandEncryptionConfigured: false,
      gatewayRuntimeAttachmentId: "gra_1",
      state: "online",
    })
    expect(sessionInput?.attachmentInput).toMatchObject({
      accountId: "acct_1",
      attachmentCapabilities: [...remoteRuntimeDefaultAttachmentCapabilities],
      connectorVersion: "1.2.3",
      directoryId: "dir_1",
      featureCapabilities: expect.arrayContaining(["remoteRuntime.http.activeChats"]),
      requestId: "req_uuid",
      ticket: "ticket_1",
    })

    await manager.publishSessionActivity({
      directory: "/repo",
      event: {
        properties: {
          sessionID: "ses_1",
          status: { type: "busy" },
        },
        type: "session.status",
      },
      sourceRunId: "run_remote",
    })

    await expect(
      runHandler(handlers.initialize, {
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
      activeChats: [],
      activeDirectoryAttachments: [{ directoryId: "dir_1", gatewayRuntimeAttachmentId: "gra_1" }],
      attachmentCapabilities: expect.arrayContaining(["runtime.metadata"]),
      allowedDirectories: [{ directoryId: "dir_1", path: "/repo" }],
      featureCapabilities: expect.arrayContaining(["remoteRuntime.http.activeChats"]),
      supportedMethods: expect.arrayContaining(["initialize", "session.list", "activeChats.list"]),
    })
    expect(listActiveChatsCalls).toBe(0)
    await expect(runHandler(handlers["session.list"], command("session.list", { limit: 1 }))).resolves.toMatchObject({
      activeChats: [{ hasActiveTurn: false, sessionId: "ses_1", status: "running" }],
      pageInfo: { hasNewer: false, hasOlder: true, newerCursor: null, olderCursor: expect.any(String) },
    })
    expect(listActiveChatsCalls).toBe(1)
    const firstPage = await runHandler(handlers["activeChats.list"], command("activeChats.list", { limit: 1 }))
    expect(listActiveChatsCalls).toBe(2)
    const olderCursor = firstPage.pageInfo.olderCursor
    const decodedOlderCursor = JSON.parse(Buffer.from(String(olderCursor), "base64url").toString("utf8"))
    expect(firstPage).toMatchObject({
      activeChats: [{ hasActiveTurn: false, sessionId: "ses_1", status: "running" }],
      pageInfo: { hasNewer: false, hasOlder: true, newerCursor: null, olderCursor: expect.any(String) },
    })
    expect(decodedOlderCursor).toMatchObject({ offset: 1, sessionId: "ses_1" })
    expect(String(olderCursor).length).toBeLessThan(240)
    await expect(
      runHandler(
        handlers["activeChats.list"],
        command("activeChats.list", {
          cursor: olderCursor,
          limit: 1,
        }),
      ),
    ).resolves.toMatchObject({
      activeChats: [{ sessionId: "ses_old", status: "closed" }],
      pageInfo: { hasNewer: true, hasOlder: false, newerCursor: expect.any(String), olderCursor: null },
    })
    expect(listActiveChatsCalls).toBe(3)
    await expect(
      manager.listRemoteRuntimeActiveChats({
        directoryId: "dir_1",
        limit: 1,
      }),
    ).resolves.toMatchObject({
      activeChats: [{ hasActiveTurn: false, sessionId: "ses_1", status: "running" }],
      pageInfo: { hasNewer: false, hasOlder: true, newerCursor: null, olderCursor: expect.any(String) },
    })
    expect(listActiveChatsCalls).toBe(4)
    await expect(
      manager.listRemoteRuntimeActiveChatsSnapshot({
        directoryId: "dir_1",
        limit: 1,
      }),
    ).resolves.toMatchObject({
      activeChats: [{ hasActiveTurn: false, sessionId: "ses_1", status: "running" }],
      remoteRuntimeHttpVersion: "2026-05-14",
      runtimeInstallationId: "rti_1",
      snapshotId: null,
    })
    await expect(
      runHandler(
        handlers["session.read"],
        command("session.read", {
          sessionId: "ses_1",
        }),
      ),
    ).resolves.toMatchObject({
      chat: { sessionId: "ses_1", status: "running", title: "Updated chat" },
    })
    await expect(
      manager.readRemoteRuntimeChat({
        directoryId: "dir_1",
        sessionId: "ses_1",
      }),
    ).resolves.toMatchObject({
      sessionId: "ses_1",
      status: "running",
      title: "Updated chat",
    })
    await expect(
      manager.readRemoteRuntimeChatSnapshot({
        directoryId: "dir_1",
        sessionId: "ses_1",
      }),
    ).resolves.toMatchObject({
      chat: { sessionId: "ses_1", status: "running", title: "Updated chat" },
      remoteRuntimeHttpVersion: "2026-05-14",
      runtimeInstallationId: "rti_1",
    })

    expect(await runHandler(handlers["directory.list"], command("directory.list", {}))).toMatchObject({
      activeDirectoryAttachments: [{ directoryId: "dir_1" }],
      allowedDirectories: [{ displayName: "repo" }],
    })
    expect(manager.runtimeStatusSnapshot({ directoryId: "dir_1" })).toMatchObject({
      allowedDirectories: [{ directoryId: "dir_1", path: "/repo" }],
      remoteRuntimeHttpVersion: "2026-05-14",
      runtimeInstallationId: "rti_1",
      state: "online",
    })
    expect(manager.status({ directoryId: "dir_1" })).toMatchObject([{
      allowedDirectories: [{ directoryId: "dir_1", path: "/repo" }],
    }])
    expect(manager.runtimeDirectoriesSnapshot({ directoryId: "dir_1" })).toMatchObject({
      activeDirectoryAttachments: [{ directoryId: "dir_1" }],
      allowedDirectories: [{ displayName: "repo" }],
      remoteRuntimeHttpVersion: "2026-05-14",
      runtimeInstallationId: "rti_1",
    })
    expect(manager.runtimeCapabilitiesSnapshot({ directoryId: "dir_1" })).toMatchObject({
      attachmentCapabilities: expect.arrayContaining(["runtime.metadata"]),
      featureCapabilities: expect.arrayContaining(["remoteRuntime.http.activeChats"]),
      remoteRuntimeHttpVersion: "2026-05-14",
      runtimeInstallationId: "rti_1",
      supportedMethods: expect.arrayContaining(["initialize", "activeChats.list"]),
    })

    const multiDirectoryChatCalls: string[] = []
    let multiDirectoryHandlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const multiDirectoryManager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        listActiveChats: async (context) => {
          multiDirectoryChatCalls.push(context.directory)
          return [activeChatFixture(`ses_${context.directory.replaceAll("/", "_")}`, context.directory)]
        },
        runConnectorRuntimeSession: async (input) => {
          multiDirectoryHandlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })
    try {
      await multiDirectoryManager.start({
        ...startInput(),
        allowedDirectories: [
          { directoryId: "dir_1", path: "/repo" },
          { directoryId: "dir_2", path: "/other" },
        ],
      })
      await expect(
        runHandler(multiDirectoryHandlers["activeChats.list"], command("activeChats.list", { limit: 10 })),
      ).resolves.toMatchObject({
        activeChats: expect.arrayContaining([
          expect.objectContaining({ path: "/repo", sessionId: "ses__repo" }),
          expect.objectContaining({ path: "/other", sessionId: "ses__other" }),
        ]),
      })
      expect(multiDirectoryChatCalls.sort()).toEqual(["/other", "/repo"])
      multiDirectoryChatCalls.length = 0
      await expect(
        multiDirectoryManager.listRemoteRuntimeActiveChatsSnapshot({ runtimeInstallationId: "rti_1", limit: 10 }),
      ).resolves.toMatchObject({
        activeChats: expect.arrayContaining([
          expect.objectContaining({ path: "/repo", sessionId: "ses__repo" }),
          expect.objectContaining({ path: "/other", sessionId: "ses__other" }),
        ]),
      })
      await expect(
        multiDirectoryManager.listRemoteRuntimeActiveChatsSnapshot({ runtimeInstallationId: "rti_1", limit: 10 }),
      ).resolves.toMatchObject({
        activeChats: expect.arrayContaining([
          expect.objectContaining({ path: "/repo", sessionId: "ses__repo" }),
          expect.objectContaining({ path: "/other", sessionId: "ses__other" }),
        ]),
      })
      expect(multiDirectoryChatCalls.sort()).toEqual(["/other", "/other", "/repo", "/repo"])
      multiDirectoryChatCalls.length = 0
      await expect(
        multiDirectoryManager.listRemoteRuntimeActiveChats({ directoryId: "dir_2", runtimeInstallationId: "rti_1", limit: 10 }),
      ).resolves.toMatchObject({
        activeChats: [expect.objectContaining({ path: "/other", sessionId: "ses__other" })],
      })
      expect(multiDirectoryChatCalls).toEqual(["/other"])
      expect(multiDirectoryManager.runtimeDirectoriesSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({
        allowedDirectories: [
          { directoryId: "dir_1", path: "/repo" },
          { directoryId: "dir_2", path: "/other" },
        ],
        runtimeInstallationId: "rti_1",
      })
      expect(multiDirectoryManager.runtimeStatusSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({
        allowedDirectories: [
          { directoryId: "dir_1", path: "/repo" },
          { directoryId: "dir_2", path: "/other" },
        ],
        runtimeInstallationId: "rti_1",
      })
      expect(multiDirectoryManager.runtimeCapabilitiesSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({
        runtimeInstallationId: "rti_1",
      })
      expect(multiDirectoryManager.status({ runtimeInstallationId: "rti_1" })).toMatchObject([
        {
          allowedDirectories: [
            { directoryId: "dir_1", path: "/repo" },
            { directoryId: "dir_2", path: "/other" },
          ],
          runtimeInstallationId: "rti_1",
        },
      ])
      expect(
        multiDirectoryManager.attachLocalRemoteRuntimeWebSocket({
          accountId: "acct_1",
          action: signedAttachAction({ requestId: "req_attach_multi_directory" }),
          deliverRuntimeEnvelope: async () => undefined,
          runtimeInstallationId: "rti_1",
          trustedRuntimeClientId: "tmd_1",
        }),
      ).toMatchObject({ ok: true, response: { runtimeInstallationId: "rti_1", status: "attached" } })
    } finally {
      await multiDirectoryManager.stop()
    }

    const goalListCalls: Array<{
      cursor?: string | null
      directories: readonly string[]
      limit?: number | null
      status?: string | null
    }> = []
    const goalListManager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        listGoals: async (input) => {
          goalListCalls.push(input)
          return {
            goals: [
              {
                createdAt: 100,
                objective: "Ship sqlite goals",
                status: "active",
                threadId: "ses_goal_1",
                timeUsedSeconds: 2,
                tokenBudget: null,
                tokensUsed: 1,
                updatedAt: 200,
              },
            ],
            pageInfo: { hasOlder: true, olderCursor: "cursor_2" },
          }
        },
        runConnectorRuntimeSession: async (input) => {
          multiDirectoryHandlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })
    try {
      await goalListManager.start({
        ...startInput(),
        allowedDirectories: [
          { directoryId: "dir_1", path: "/repo" },
          { directoryId: "dir_2", path: "/other" },
        ],
      })
      await expect(
        runHandler(multiDirectoryHandlers["goal.list"], command("goal.list", { cursor: "cursor_1", limit: 7, status: "active" })),
      ).resolves.toMatchObject({
        goals: [expect.objectContaining({ objective: "Ship sqlite goals" })],
        pageInfo: { hasOlder: true, olderCursor: "cursor_2" },
      })
      expect(goalListCalls).toEqual([
        {
          cursor: "cursor_1",
          directories: ["/repo", "/other"],
          limit: 7,
          status: "active",
        },
      ])
      goalListCalls.length = 0
      await expect(goalListManager.listRemoteRuntimeGoals({ directoryId: "dir_2", runtimeInstallationId: "rti_1" })).resolves.toMatchObject({
        goals: [expect.objectContaining({ objective: "Ship sqlite goals" })],
      })
      expect(goalListCalls).toEqual([{ directories: ["/other"] }])
    } finally {
      await goalListManager.stop()
    }

    const fallbackGoalManager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })
    try {
      await fallbackGoalManager.start({
        ...startInput(),
        allowedDirectories: [
          { directoryId: "dir_1", path: "/repo" },
          { directoryId: "dir_2", path: "/other" },
        ],
      })
      await expect(fallbackGoalManager.listRemoteRuntimeGoals({ runtimeInstallationId: "rti_1" })).rejects.toThrow(
        "Remote runtime goal aggregation requires a goal list reader.",
      )
    } finally {
      await fallbackGoalManager.stop()
    }

    const gitStatusCalls: Array<{
      directories: readonly { directoryId: string; path: string }[]
      includeDiff: boolean
      maxDiffBytes: number
    }> = []
    const gitStatusManager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        readGitStatus: async (input) => {
          gitStatusCalls.push(input)
          return {
            repositories: input.directories.map((directory) => ({
              ahead: null,
              behind: null,
              branch: null,
              diffTruncated: false,
              directoryId: directory.directoryId,
              error: null,
              files: [],
              head: null,
              isRepository: false,
              path: directory.path,
              repositoryRoot: null,
              stagedDiff: null,
              unstagedDiff: null,
              upstream: null,
            })),
          }
        },
        runConnectorRuntimeSession: async (input) => {
          multiDirectoryHandlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })
    try {
      await gitStatusManager.start({
        ...startInput(),
        allowedDirectories: [
          { directoryId: "dir_1", path: "/repo" },
          { directoryId: "dir_2", path: "/repo/sub" },
        ],
      })
      await expect(runHandler(multiDirectoryHandlers["git.status"], command("git.status", {}))).resolves.toMatchObject({
        repositories: [{ directoryId: "dir_1" }, { directoryId: "dir_2" }],
      })
      await expect(
        gitStatusManager.readRemoteRuntimeGitStatusSnapshot({ directoryId: "dir_2", includeDiff: true, maxDiffBytes: 1024 }),
      ).resolves.toMatchObject({ repositories: [{ directoryId: "dir_2" }] })
      await expect(gitStatusManager.readRemoteRuntimeGitStatus({ directory: "/repo" })).resolves.toMatchObject({
        repositories: [{ directoryId: "dir_1" }],
      })
      await expect(
        runHandler(multiDirectoryHandlers["git.status"], command("git.status", { directoryId: "missing" } as never)),
      ).rejects.toThrow("No matching authorized remote runtime directory")
      expect(gitStatusManager.listRemoteRuntimeAliases({ directoryId: "dir_1", runtimeInstallationId: "rti_1" })).toEqual({
        aliases: [],
      })
      expect(gitStatusCalls).toEqual([
        {
          directories: [
            { directoryId: "dir_1", path: "/repo" },
            { directoryId: "dir_2", path: "/repo/sub" },
          ],
          includeDiff: false,
          maxDiffBytes: 262144,
        },
        {
          directories: [{ directoryId: "dir_2", path: "/repo/sub" }],
          includeDiff: true,
          maxDiffBytes: 1024,
        },
        {
          directories: [{ directoryId: "dir_1", path: "/repo" }],
          includeDiff: false,
          maxDiffBytes: 262144,
        },
      ])
    } finally {
      await gitStatusManager.stop()
    }

    const ambiguousGitStatusManager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        readGitStatus: async () => ({ repositories: [] }),
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })
    try {
      await ambiguousGitStatusManager.start({
        ...startInput(),
        allowedDirectories: [{ directoryId: "shared", path: "/shared" }],
        apiBaseUrl: "https://api-one.example.test",
        runtimeInstallationId: "rti_shared_1",
      })
      await ambiguousGitStatusManager.start({
        ...startInput(),
        accountId: "acct_2",
        allowedDirectories: [{ directoryId: "shared", path: "/shared" }],
        apiBaseUrl: "https://api-two.example.test",
        runtimeInstallationId: "rti_shared_2",
      })
      await expect(ambiguousGitStatusManager.readRemoteRuntimeGitStatus({ directoryId: "shared" })).rejects.toThrow(
        "Remote runtime selector matched multiple online runtimes",
      )
    } finally {
      await ambiguousGitStatusManager.stop()
    }

    const missingGitReaderManager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          multiDirectoryHandlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })
    try {
      await missingGitReaderManager.start(startInput())
      await expect(missingGitReaderManager.readRemoteRuntimeGitStatus({ runtimeInstallationId: "rti_1" })).resolves.toMatchObject({
        repositories: [{ directoryId: "dir_1", error: "Git status reader is unavailable.", isRepository: false }],
      })
      await expect(runHandler(multiDirectoryHandlers["git.status"], command("git.status", {}))).resolves.toMatchObject({
        repositories: [{ directoryId: "dir_1", error: "Git status reader is unavailable.", isRepository: false }],
      })
    } finally {
      await missingGitReaderManager.stop()
    }

    expect(
      await runHandler(handlers["directory.select"], command("directory.select", { directoryId: "dir_1" })),
    ).toMatchObject({
      attachment: { directoryId: "dir_1" },
      directory: { path: "/repo" },
    })
    await expect(runHandler(handlers["agent.list"], command("agent.list", {}))).resolves.toMatchObject({
      agents: expect.arrayContaining([
        expect.objectContaining({ agentId: "interbaseRuntime", available: true, displayName: "Interbase" }),
        expect.objectContaining({ agentId: "codex", available: true, displayName: "Codex" }),
        expect.objectContaining({
          agentId: "claude",
          available: false,
          displayName: "Claude",
        }),
      ]),
    })
    await expect(runHandler(handlers.ping, command("ping", { message: "mobile" }))).resolves.toMatchObject({
      message: "pong:mobile",
      timestamp: "2026-05-10T00:00:00.000Z",
    })
    const providerList = await runHandler(handlers["provider.list"], command("provider.list", {}))
    expect(providerList).toMatchObject({
      connected: expect.arrayContaining(["anthropic", "codex"]),
      default: expect.objectContaining({ anthropic: "claude-sonnet-4.5", codex: "codex" }),
    })
    expect(providerList).toMatchObject({
      all: expect.arrayContaining([
        expect.objectContaining({
          id: "anthropic",
          models: expect.objectContaining({
            "claude-sonnet-4.5": {
              id: "claude-sonnet-4.5",
              name: "Claude Sonnet 4.5",
              status: "active",
            },
          }),
          name: "Anthropic",
        }),
        expect.objectContaining({ id: "codex" }),
      ]),
    })
    expect(listProvidersCalls).toBe(2)
    await expect(manager.listRemoteRuntimeProviders({ directoryId: "dir_1" })).resolves.toMatchObject({
      connected: expect.arrayContaining(["anthropic", "codex"]),
      default: expect.objectContaining({ anthropic: "claude-sonnet-4.5", codex: "codex" }),
    })
    expect(listProvidersCalls).toBe(3)
    await expect(manager.listRemoteRuntimeProvidersSnapshot({ directoryId: "dir_1" })).resolves.toMatchObject({
      remoteRuntimeHttpVersion: "2026-05-14",
      providers: {
        connected: expect.arrayContaining(["anthropic", "codex"]),
      },
      runtimeInstallationId: "rti_1",
    })
    await expect(
      runHandler(handlers["directory.select"], command("directory.select", { directoryId: "dir_missing" })),
    ).rejects.toThrow("Remote runtime directory is not allowlisted")
    await expect(
      runHandler(
        handlers["chat.start"],
        command("chat.start", {
          directoryId: "dir_missing",
          title: "Wrong directory",
        }),
      ),
    ).rejects.toThrow("Remote runtime directory is not allowlisted")
    await expect(
      manager.startRemoteRuntimeChat({
        directoryId: "dir_1",
        idempotencyKey: "idem_helper_start",
        model: "gpt-4.1",
        providerId: "openai",
        requestId: "req_helper_start",
        runtimeInstallationId: "rti_1",
        title: "Helper chat",
      }),
    ).resolves.toMatchObject({
      chat: { model: "gpt-4.1", sessionId: "ses_new", title: "Helper chat" },
    })
    expect(startChatPayload).toEqual({
      directoryId: "dir_1",
      model: "gpt-4.1",
      providerId: "openai",
      title: "Helper chat",
    })
    await expect(
      runHandler(
        handlers["chat.start"],
        command("chat.start", {
          directoryId: "dir_1",
          model: "gpt-5.4",
          providerId: "openai",
          title: "New chat",
        }),
      ),
    ).resolves.toMatchObject({
      chat: { model: "gpt-5.4", sessionId: "ses_new", title: "New chat" },
    })
    expect(
      delivered.find(
        (entry) =>
          entry.type === "event" && entry.event.eventType === "session.created" && entry.event.sessionId === "ses_new",
      ),
    ).toMatchObject({
      event: {
        payload: {
          activeChat: expect.objectContaining({ sessionId: "ses_new" }),
        },
      },
    })
    expect(
      publishedActivity.find(
        (entry) =>
          entry.directory === "/repo" &&
          entry.origin.kind === "remoteRuntimeCommand" &&
          entry.event.origin?.kind === "remoteRuntimeCommand" &&
          entry.event.type === "session.updated" &&
          entry.event.properties?.sessionID === "ses_new" &&
          isRecord(entry.event.properties.info) &&
          entry.event.properties.info.title === "New chat",
      ),
    ).toMatchObject({
      event: {
        properties: {
          info: expect.objectContaining({ id: "ses_new", title: "New chat" }),
        },
      },
    })
    expect(startChatPayload).toEqual({
      directoryId: "dir_1",
      model: "gpt-5.4",
      providerId: "openai",
      title: "New chat",
    })
    await expect(
      runHandler(
        handlers["session.update"],
        command("session.update", {
          input: {
            model: "claude-sonnet-4.5",
            providerId: "anthropic",
          },
          sessionId: "ses_1",
        }),
      ),
    ).resolves.toMatchObject({
      chat: { model: "claude-sonnet-4.5", providerId: "anthropic", sessionId: "ses_1" },
    })
    await expect(
      manager.updateRemoteRuntimeChat({
        directoryId: "dir_1",
        idempotencyKey: "idem_helper_update_1",
        input: {
          model: "claude-opus-4.1",
          providerId: "anthropic",
        },
        requestId: "req_helper_update_1",
        sessionId: "ses_1",
      }),
    ).resolves.toMatchObject({
      chat: { model: "claude-opus-4.1", providerId: "anthropic", sessionId: "ses_1" },
    })
    expect(updateSessionPayload).toEqual({
      input: {
        model: "claude-opus-4.1",
        providerId: "anthropic",
      },
      sessionId: "ses_1",
    })
    await expect(
      manager.updateRemoteRuntimeChat({
        directoryId: "dir_1",
        idempotencyKey: "idem_helper_update_2",
        input: {
          model: "claude-sonnet-4.5",
          providerId: "anthropic",
        },
        requestId: "req_helper_update_2",
        sessionId: "ses_1",
      }),
    ).resolves.toMatchObject({
      chat: { model: "claude-sonnet-4.5", providerId: "anthropic", sessionId: "ses_1" },
    })
    expect(
      delivered.find(
        (entry) =>
          entry.type === "event" &&
          entry.event.eventType === "session.updated" &&
          entry.event.sessionId === "ses_1" &&
          entry.event.payload.activeChat?.model === "claude-sonnet-4.5",
      ),
    ).toMatchObject({
      event: {
        payload: {
          activeChat: expect.objectContaining({ sessionId: "ses_1" }),
        },
      },
    })
    expect(
      publishedActivity.find(
        (entry) =>
          entry.event.type === "session.updated" &&
          entry.event.properties?.sessionID === "ses_1" &&
          isRecord(entry.event.properties.info) &&
          isRecord(entry.event.properties.info.model) &&
          entry.event.properties.info.model.id === "claude-sonnet-4.5" &&
          entry.event.properties.info.model.providerID === "anthropic",
      ),
    ).toMatchObject({ origin: { kind: "remoteRuntimeCommand" } })
    await expect(
      runHandler(
        handlers["session.messages"],
        command("session.messages", {
          sessionId: "ses_1",
        }),
      ),
    ).resolves.toEqual({
      messages: [
        {
          agent: null,
          completedAt: null,
          createdAt: "2026-05-10T00:00:00.000Z",
          errorMessage: null,
          errorName: null,
          finishReason: null,
          id: "msg_listed",
          model: null,
          parentId: null,
          parts: [
            {
              id: "part_listed",
              kind: "tool",
              messageId: "msg_listed",
              rawPart: {
                id: "part_listed",
                messageID: "msg_listed",
                state: {
                  input: { command: "npm test" },
                  output: "ok",
                  status: "completed",
                  title: "Run tests",
                },
                tool: "bash",
                type: "tool",
              },
              status: "completed",
              text: "ok",
              title: "Run tests",
            },
          ],
          role: "assistant",
          sessionId: "ses_1",
        },
      ],
      pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
      sessionId: "ses_1",
    })
    await expect(
      manager.listRemoteRuntimeChatMessages({
        directoryId: "dir_1",
        sessionId: "ses_1",
      }),
    ).resolves.toMatchObject({
      messages: [{ id: "msg_listed", sessionId: "ses_1" }],
      pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
      sessionId: "ses_1",
    })
    await expect(
      manager.listRemoteRuntimeChatMessagesSnapshot({
        directoryId: "dir_1",
        sessionId: "ses_1",
      }),
    ).resolves.toMatchObject({
      messages: [{ id: "msg_listed", sessionId: "ses_1" }],
      remoteRuntimeHttpVersion: "2026-05-14",
      runtimeInstallationId: "rti_1",
      sessionId: "ses_1",
    })
    await expect(
      manager.sendRemoteRuntimeChatMessage({
        directoryId: "dir_1",
        idempotencyKey: "idem_helper_send",
        input: { content: "helper hello" },
        requestId: "req_helper_send",
        sessionId: "ses_1",
      }),
    ).resolves.toMatchObject({
      message: { id: "msg_1" },
      sessionId: "ses_1",
    })
    await expect(
      runHandler(
        handlers["session.message"],
        command("session.message", {
          input: { content: "hello" },
          sessionId: "ses_1",
        }),
      ),
    ).resolves.toMatchObject({
      message: { id: "msg_1" },
      sessionId: "ses_1",
    })
    expect(
      delivered.find(
        (entry) =>
          entry.type === "event" &&
          entry.event.eventType === "session.message.completed" &&
          entry.event.sessionId === "ses_1" &&
          entry.event.payload.projectedMessage?.id === "msg_1",
      ),
    ).toMatchObject({
      event: {
        payload: {
          projectedMessage: expect.objectContaining({ id: "msg_1", sessionId: "ses_1" }),
        },
      },
    })
    expect(
      publishedActivity.find(
        (entry) =>
          entry.event.type === "message.updated" &&
          entry.event.properties?.sessionID === "ses_1" &&
          isRecord(entry.event.properties.info) &&
          entry.event.properties.info.id === "msg_1",
      ),
    ).toMatchObject({ event: { origin: { kind: "remoteRuntimeCommand" } } })
    expect(
      publishedActivity.find(
        (entry) =>
          entry.event.type === "message.part.updated" &&
          entry.event.properties?.sessionID === "ses_1" &&
          isRecord(entry.event.properties.part) &&
          entry.event.properties.part.id === "part_1",
      ),
    ).toMatchObject({ origin: { kind: "remoteRuntimeCommand" } })

    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.created" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.status" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.deleted" })
    eventHandler?.({
      properties: {
        info: {
          id: "msg_live",
          role: "assistant",
        },
        sessionID: "ses_1",
      },
      type: "message.updated",
    })
    eventHandler?.({
      properties: {
        part: {
          id: "part_live",
          messageID: "msg_live",
          state: {
            input: { command: "npm run build" },
            output: "built",
            status: "completed",
            title: "Build",
          },
          tool: "bash",
          type: "tool",
        },
        sessionID: "ses_1",
      },
      type: "message.part.updated",
    })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "message.part.delta" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "message.removed" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "message.part.removed" })
    eventHandler?.({ properties: {}, type: "session.created" })
    eventHandler?.({ properties: null as never, type: "session.created" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "ignored.event" })
    await manager.publishSessionActivity({
      directory: "/repo",
      event: {
        properties: {
          sessionID: "ses_1",
          status: { type: "idle" },
        },
        type: "session.status",
      },
      sourceRunId: "run_remote",
    })
    await waitFor(
      () =>
        delivered.some((entry) => entry.type === "event" && entry.event.eventType === "session.created") &&
        delivered.some((entry) => entry.type === "event" && entry.event.eventType === "session.closed") &&
        delivered.some((entry) => entry.type === "event" && entry.event.eventType === "session.message.completed") &&
        delivered.some((entry) => entry.type === "event" && entry.event.eventType === "session.output.delta"),
    )
    expect(
      delivered.find(
        (entry) =>
          entry.type === "event" && entry.event.eventType === "session.created" && entry.event.sessionId === "ses_1",
      ),
    ).toMatchObject({
      event: {
        payload: {
          activeChat: expect.objectContaining({
            sessionId: "ses_1",
          }),
        },
      },
    })
    expect(
      delivered.find(
        (entry) =>
          entry.type === "event" &&
          entry.event.eventType === "session.output.delta" &&
          entry.event.payload.projectedPart,
      ),
    ).toMatchObject({
      event: {
        payload: {
          projectedPart: {
            id: "part_live",
            messageID: "msg_live",
            state: {
              input: { command: "npm run build" },
              output: "built",
              status: "completed",
              title: "Build",
            },
            tool: "bash",
            type: "tool",
          },
        },
      },
    })
    expect(
      delivered.find(
        (entry) =>
          entry.type === "event" &&
          entry.event.eventType === "session.message.completed" &&
          entry.event.payload.projectedMessage?.id === "msg_live",
      ),
    ).toMatchObject({
      event: {
        payload: {
          projectedMessage: {
            id: "msg_live",
            sessionId: "ses_1",
          },
        },
      },
    })
    expect(
      delivered.find(
        (entry) =>
          entry.type === "event" &&
          entry.event.eventType === "session.updated" &&
          entry.event.payload.activeChat?.status === "idle",
      ),
    ).toMatchObject({
      event: {
        eventType: "session.updated",
        payload: {
          activeChat: expect.objectContaining({
            sessionId: "ses_1",
            status: "idle",
          }),
        },
      },
    })

    eventHandler?.({
      properties: {
        part: {
          id: "part_huge",
          messageID: "msg_live",
          state: {
            output: "x".repeat(129 * 1024),
            status: "completed",
          },
          tool: "bash",
          type: "tool",
        },
        sessionID: "ses_1",
      },
      type: "message.part.updated",
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(delivered.at(-1)).toMatchObject({
      event: {
        payload: {
          projectedPart: null,
        },
      },
    })
    expect(JSON.stringify(delivered.at(-1)).length).toBeLessThan(512 * 1024)

    eventHandler?.({
      properties: {
        delta: "x".repeat(129 * 1024),
        field: "text",
        messageID: "msg_live",
        partID: "part_live",
        sessionID: "ses_1",
      },
      type: "message.part.delta",
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(delivered.at(-1)).toMatchObject({
      event: {
        payload: {
          textDelta: null,
        },
      },
    })
    expect(JSON.stringify(delivered.at(-1)).length).toBeLessThan(512 * 1024)

    const beforeHugeEventDeliveryCount = delivered.length
    eventHandler?.({
      properties: {
        sessionID: "ses_huge",
      },
      type: "session.updated",
    })
    await waitFor(() => delivered.length > beforeHugeEventDeliveryCount)
    expect(delivered.at(-1)).toMatchObject({ event: { payload: { activeChat: null, truncated: true } } })
    expect(
      manager.logs({ directory: "/repo" }).some((entry) => entry.message.includes("Compacted remote runtime event")),
    ).toBe(true)

    await manager.startRemoteRuntimeChat({
      directoryId: "dir_1",
      idempotencyKey: "idem_huge_chat",
      input: null,
      model: null,
      providerId: null,
      requestId: "req_huge_chat",
      runtimeInstallationId: "rti_1",
      title: "x".repeat(600 * 1024),
    })
    expect(delivered.at(-1)).toMatchObject({ event: { payload: { activeChat: null, truncated: true } } })

    await expect(sessionInput?.decryptRuntimeCommand({} as never, {} as never)).rejects.toThrow(
      "Remote runtime encryption is not configured.",
    )

    await expect(
      manager.configureEncryption({
        runtimeInstallationId: "rti_1",
        setupToken: "setup_token_1",
      }),
    ).resolves.toMatchObject([{ commandEncryptionConfigured: true }])
    await expect(sessionInput?.decryptRuntimeCommand({} as never, {} as never)).rejects.toThrow()
    const encryptedCommand = await encryptRuntimeCommand(command("ping", { message: "secret" }), {
      key: createHash("sha256").update("setup_token_1").digest(),
      keyId: "client_setup_token:v1",
      nonce: new Uint8Array(12),
    })
    await expect(sessionInput?.decryptRuntimeCommand(encryptedCommand, {} as never)).resolves.toMatchObject({
      method: "ping",
      payload: { message: "secret" },
    })
    await expect(
      manager.start({
        accountId: "acct_1",
        apiBaseUrl: "https://api.interbase.test",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        runtimeInstallationId: "rti_1",
      }),
    ).resolves.toMatchObject({
      gatewayRuntimeAttachmentId: "gra_1",
      state: "online",
    })
    expect(manager.features()).toMatchObject({ version: 6, liveRuntimeEvents: true })
    expect(manager.status({ directory: "/repo" })).toMatchObject([
      { allowedDirectories: [{ directoryId: "dir_1", path: "/repo" }] },
    ])
    expect(manager.runtimeStatusSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({ runtimeInstallationId: "rti_1" })
    expect(manager.runtimeDirectoriesSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({
      runtimeInstallationId: "rti_1",
    })
    expect(manager.runtimeCapabilitiesSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({
      runtimeInstallationId: "rti_1",
    })
    await expect(manager.listRemoteRuntimeProviders({ directoryId: "dir_1" })).resolves.toMatchObject({
      connected: expect.arrayContaining(["anthropic"]),
    })
    await expect(manager.listRemoteRuntimeProvidersSnapshot({ directoryId: "dir_1" })).resolves.toMatchObject({
      runtimeInstallationId: "rti_1",
    })
    expect(manager.status({ directoryId: "dir_missing" })).toEqual([])
    expect(manager.status({ runtimeInstallationId: "rti_missing" })).toEqual([])
    expect(manager.logs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Starting remote runtime connector." }),
        expect.objectContaining({ message: "Configured remote runtime encryption." }),
      ]),
    )
    await expect(manager.stop({ runtimeInstallationId: "rti_1" })).resolves.toMatchObject([{ state: "stopped" }])
    if (!sessionInput) throw new Error("Expected connector session input")
    await sessionInput.onRemoteRuntimeClientAttachment({
      attachment: testAttachment(sessionInput),
      deliverRuntimeEnvelope: async () => undefined,
      clientAttachmentId: "mda_after_stop",
    })
    await expect(
      runHandler(
        handlers["chat.start"],
        command("chat.start", {
          directoryId: "dir_1",
        }),
      ),
    ).rejects.toThrow("Remote runtime is not connected to a project instance.")
    await expect(
      runHandler(
        handlers["session.messages"],
        command("session.messages", {
          sessionId: "ses_1",
        }),
      ),
    ).rejects.toThrow("Remote runtime is not connected to a project instance.")
    await expect(
      runHandler(
        handlers["session.message"],
        command("session.message", {
          input: { content: "hello" },
          sessionId: "ses_1",
        }),
      ),
    ).rejects.toThrow("Remote runtime is not connected to a project instance.")
    await expect(runHandler(handlers["provider.list"], command("provider.list", {}))).rejects.toThrow(
      "Remote runtime is not connected to a project instance.",
    )
    await expect(runHandler(handlers["agent.list"], command("agent.list", {}))).rejects.toThrow(
      "Remote runtime is not connected to a project instance.",
    )
    await expect(
      runHandler(
        handlers["session.read"],
        command("session.read", {
          sessionId: "ses_1",
        }),
      ),
    ).rejects.toThrow("Remote runtime is not connected to a project instance.")
    await expect(
      runHandler(
        handlers["session.update"],
        command("session.update", {
          input: { model: "claude-sonnet-4.5", providerId: "anthropic" },
          sessionId: "ses_1",
        }),
      ),
    ).rejects.toThrow("Remote runtime is not connected to a project instance.")
    expect(disposed).toEqual([{ directory: "/repo" }, { directory: "/repo" }])
  }, 30_000)

  test("attaches a signed local remote runtime websocket session to runtime events", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    const runtimeResponseSigningKeyPair = await generateRemoteRuntimeAsymmetricKeyPair({
      createdAt: "2026-05-10T00:00:00.000Z",
      keyId: "rrk_1",
      purpose: "runtimeResponseSigning",
    })
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      codexHome: path.join(tmpdir(), "interbase-empty-codex"),
      connectorVersion: "1.2.3",
      now: () => "2026-05-10T00:00:00.000Z",
      randomUUID: () => "local_uuid",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          input.onAttachment(testAttachment(input))
          return await new Promise<ReturnType<typeof testAttachment>>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(testAttachment(input)), { once: true })
          })
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => {
            eventHandler = undefined
          }
        },
      }),
    })

    await expect(
      manager.start({
        accountId: "acct_1",
        apiBaseUrl: "https://api.interbase.test",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        runtimeInstallationId: "rti_1",
      }),
    ).resolves.toMatchObject({ state: "online" })

    const attachment = manager.attachLocalRemoteRuntimeWebSocket({
      accountId: "acct_1",
      action: {
        payload: {
          accountId: "acct_1",
          deviceTrustLevel: "trusted",
          protocolVersion: remoteRuntimeTransportProtocolVersion,
          requestId: "req_attach_local_1",
          runtimeInstallationId: "rti_1",
          ticket: "ticket_1",
          trustedRuntimeClientId: "tmd_1",
        },
        proof: {
          algorithm: "ed25519",
          keyId: "mk_1",
          nonce: "nonce_1",
          payloadSha256: "payload_hash_1",
          signature: "sig_1",
          timestamp: "2026-05-10T00:00:00.000Z",
        },
        protocolVersion: remoteRuntimeTransportProtocolVersion,
        sequence: 1,
        sessionNonce: "session_nonce_1",
        type: "remoteRuntime.websocket.action",
      },
      deliverRuntimeEnvelope: async (envelope) => {
        delivered.push(envelope)
      },
      runtimeResponseSigningPrivateKey: runtimeResponseSigningKeyPair.privateKey,
      runtimeInstallationId: "rti_1",
      trustedRuntimeClientId: "tmd_1",
    })

    expect(attachment).toMatchObject({
      ok: true,
      response: {
        accountId: "acct_1",
        deviceTrustLevel: "trusted",
        gatewayRuntimeAttachmentId: "gra_1",
        clientAttachmentId: "lmda_local_uuid",
        runtimeInstallationId: "rti_1",
        status: "attached",
        trustedRuntimeClientId: "tmd_1",
      },
    })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.created" })
    await waitFor(() =>
      delivered.some((entry) => entry.type === "event" && entry.event.eventType === "session.created"),
    )
    expect(delivered.at(-1)).toMatchObject({
      event: {
        gatewayRuntimeAttachmentId: "gra_1",
        runtimeInstallationId: "rti_1",
      },
      signature: {
        algorithm: "ed25519",
        keyId: "rrk_1",
      },
      type: "event",
    })

    expect(
      manager.attachLocalRemoteRuntimeWebSocket({
        accountId: "acct_1",
        action: signedAttachAction({ requestId: "req_attach_local_bad_trust", trustedRuntimeClientId: "tmd_other" }),
        deliverRuntimeEnvelope: async () => undefined,
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_1",
      }),
    ).toMatchObject({ error: { code: "AUTHORIZATION_FAILED" }, ok: false })

    expect(
      manager.attachLocalRemoteRuntimeWebSocket({
        accountId: "acct_other",
        action: signedAttachAction({ accountId: "acct_other", requestId: "req_attach_local_bad_account" }),
        deliverRuntimeEnvelope: async () => undefined,
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_1",
      }),
    ).toMatchObject({ error: { code: "AUTHORIZATION_FAILED" }, ok: false })
    await manager.stop()

    expect(
      manager.attachLocalRemoteRuntimeWebSocket({
        accountId: "acct_1",
        action: signedAttachAction({ requestId: "req_attach_local_runtime_unavailable" }),
        deliverRuntimeEnvelope: async () => undefined,
        runtimeInstallationId: "rti_1",
        trustedRuntimeClientId: "tmd_1",
      }),
    ).toMatchObject({
      error: {
        code: "RUNTIME_UNAVAILABLE",
        requestId: "req_attach_local_runtime_unavailable",
        type: "runtime.unavailable",
      },
      ok: false,
    })
  })

  test("runtime command adapter rejects malformed, mismatched, disabled, missing, and failing handlers", async () => {
    const adapter = createRemoteRuntimeCommandAdapter({
      handlers: {
        ping: (input) => {
          if ((input.payload as { message?: string }).message === "throw") {
            throw new Error("handler failed")
          }
          return { message: "pong", timestamp: "2026-05-10T00:00:00.000Z" }
        },
      },
      supportedMethods: ["ping"],
    })

    await expect(adapter.handleRuntimeCommand({ protocolVersion: "2099-01-01" })).resolves.toMatchObject({
      type: "protocolVersionMismatch",
    })
    await expect(adapter.handleRuntimeCommand({ method: "ping" })).resolves.toMatchObject({
      error: { code: "PROTOCOL_ERROR", recoverable: false },
      success: false,
      type: "error",
    })
    await expect(
      adapter.handleRuntimeCommand(
        command("initialize", {
          clientName: "Interbase iOS",
          clientVersion: "0.1.0",
          supportedRuntimeApiVersion: "2099-01-01",
        }),
      ),
    ).resolves.toMatchObject({ type: "protocolVersionMismatch" })
    await expect(
      adapter.handleRuntimeCommand(
        command("initialize", {
          clientName: "Interbase iOS",
          clientVersion: "0.1.0",
          supportedRuntimeApiVersions: ["2099-01-01"],
        }),
      ),
    ).resolves.toMatchObject({ type: "error", error: { code: "PROTOCOL_ERROR" } })
    await expect(
      adapter.handleRuntimeCommand(
        command("initialize", {
          clientName: "Interbase iOS",
          clientVersion: "0.1.0",
          supportedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
        }),
      ),
    ).resolves.toMatchObject({
      error: { code: "CAPABILITY_UNAVAILABLE", message: "Runtime method initialize is not enabled for this adapter." },
      success: false,
      type: "error",
    })

    const missingHandlerAdapter = createRemoteRuntimeCommandAdapter({ handlers: {}, supportedMethods: ["ping"] })
    await expect(missingHandlerAdapter.handleRuntimeCommand(command("ping", { message: "hi" }))).resolves.toMatchObject(
      {
        error: { code: "CAPABILITY_UNAVAILABLE", message: "Runtime method ping is not implemented by this adapter." },
        success: false,
        type: "error",
      },
    )
    await expect(adapter.handleRuntimeCommand(command("ping", { message: "throw" }))).resolves.toMatchObject({
      error: { code: "DAEMON_INTERNAL", message: "handler failed", recoverable: true },
      requestId: "req_ping",
      success: false,
      type: "error",
    })
  })

  test("validates paging cursors and runtime selector ambiguity", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const nextSnapshotId = (() => {
      let index = 0
      return () => `snapshot_${(index += 1)}`
    })()
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      randomUUID: nextSnapshotId,
      sleep: async () => undefined,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_1"), activeChatFixture("ses_2")],
        runConnectorRuntimeSession: async (input) => {
          if (input.attachmentInput.directoryId === "dir_1") {
            handlers = input.runtimeCommandHandlers
          }
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(
      manager.start({
        ...startInput(),
        accountId: "acct_2",
        directory: "/repo-2",
        directoryId: "dir_2",
        runtimeInstallationId: "rti_2",
      }),
    ).resolves.toMatchObject({ state: "online" })

    expect(() => manager.listRemoteRuntimeProviders({})).toThrow(
      "Remote runtime selector matched multiple online runtimes",
    )
    expect(() => manager.runtimeStatusSnapshot({})).toThrow("Remote runtime selector matched multiple runtimes")
    await expect(manager.stop({ directoryId: "dir_2" })).resolves.toMatchObject([{ state: "stopped" }])
    expect(() => manager.readRemoteRuntimeChat({ directoryId: "dir_missing", sessionId: "ses_1" })).toThrow(
      "No matching online remote runtime is running.",
    )
    expect(() => manager.runtimeStatusSnapshot({ directoryId: "dir_missing" })).toThrow(
      "No matching remote runtime is running.",
    )

    await expect(
      runHandler(handlers["activeChats.list"], command("activeChats.list", { cursor: "not-base64" })),
    ).rejects.toThrow("Active chat cursor is not valid.")
    await manager.stop()
    await expect(runHandler(handlers["activeChats.list"], command("activeChats.list", {}))).rejects.toThrow(
      "Remote runtime is not connected to a project instance.",
    )
  })

  test("filters active chats to allowed runtime directories", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      randomUUID: () => "snapshot_directory_filter",
      sleep: async () => undefined,
      deps: testDeps({
        listActiveChats: async (context) =>
          context.directory === "/repo"
            ? [activeChatFixture("ses_allowed", "/repo"), activeChatFixture("ses_unlisted", "/unlisted")]
            : [activeChatFixture("ses_other", "/other-authorized-repo")],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(
      manager.start({
        ...startInput(),
        apiBaseUrl: "https://api-2.interbase.test",
        directory: "/other-authorized-repo",
        directoryId: "dir_2",
      }),
    ).resolves.toMatchObject({ state: "online" })
    await expect(runHandler(handlers["activeChats.list"], command("activeChats.list", {}))).resolves.toMatchObject({
      activeChats: [{ sessionId: "ses_allowed" }, { sessionId: "ses_other" }],
      pageInfo: { hasOlder: false },
    })
    await manager.stop()
  })

  test("loads older active chat pages from the host", async () => {
    const codexHome = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-empty-codex-"))
    const runtimeDirectory = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-snapshot-repo-"))
    try {
      let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
      const manager = createRemoteRuntimeManager<{ directory: string }>({
        codexHome,
        connectorVersion: "1.2.3",
        randomUUID: (() => {
          let index = 0
          return () => `snapshot_${(index += 1)}`
        })(),
        sleep: async () => undefined,
        deps: testDeps({
          listActiveChats: async () => [
            activeChatFixture("ses_1", runtimeDirectory),
            activeChatFixture("ses_2", runtimeDirectory),
          ],
          runConnectorRuntimeSession: async (input) => {
            handlers = input.runtimeCommandHandlers
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
        }),
      })

      await expect(manager.start({ ...startInput(), directory: runtimeDirectory })).resolves.toMatchObject({
        state: "online",
      })
      for (let index = 0; index < 9; index += 1) {
        await expect(
          runHandler(handlers["activeChats.list"], command("activeChats.list", { limit: 1 })),
        ).resolves.toMatchObject({
          pageInfo: { hasOlder: true },
        })
      }
      await expect(
        runHandler(
          handlers["activeChats.list"],
          command("activeChats.list", {
            cursor: Buffer.from(
              JSON.stringify({
                offset: 1,
                seenSessionIds: ["ses_1"],
                sessionId: "ses_1",
                snapshotId: "missing_snapshot",
                updatedAt: "2026-05-10T00:00:00.000Z",
              }),
            ).toString("base64url"),
            limit: 1,
          }),
        ),
      ).resolves.toMatchObject({
        activeChats: [{ sessionId: "ses_2" }],
        pageInfo: { hasNewer: true, hasOlder: false, olderCursor: null },
      })
      await manager.stop()
    } finally {
      await rm(codexHome, { force: true, recursive: true })
      await rm(runtimeDirectory, { force: true, recursive: true })
    }
  })

  test("keeps active chat pagination cursors compact for full pages", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    let listActiveChatsCalls = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      randomUUID: () => "snapshot_large",
      sleep: async () => undefined,
      deps: testDeps({
        listActiveChats: async (_context, payload) => {
          listActiveChatsCalls += 1
          return pagedActiveChats(
            Array.from({ length: 150 }, (_, index) => activeChatFixture(`ses_${index}`)),
            payload,
          )
        },
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    const firstPage = await runHandler(handlers["activeChats.list"], command("activeChats.list", { limit: 100 }))

    expect(firstPage.activeChats).toHaveLength(100)
    expect(firstPage.pageInfo.hasOlder).toBe(true)
    expect(String(firstPage.pageInfo.olderCursor).length).toBeLessThan(220)
    await expect(
      runHandler(
        handlers["activeChats.list"],
        command("activeChats.list", {
          cursor: firstPage.pageInfo.olderCursor,
          limit: 100,
        }),
      ),
    ).resolves.toMatchObject({
      activeChats: Array.from({ length: 50 }, (_, index) => ({ sessionId: `ses_${index + 100}` })),
      pageInfo: { hasNewer: true, hasOlder: false, olderCursor: null },
    })
    expect(listActiveChatsCalls).toBe(4)
    await manager.stop()
  })

  test("reads host active chat fallback when no projected chat authority is available", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      codexHome: path.join(tmpdir(), "interbase-empty-codex"),
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_host")],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(
      runHandler(
        handlers["session.read"],
        command("session.read", {
          sessionId: "ses_host",
        }),
      ),
    ).resolves.toMatchObject({
      chat: { sessionId: "ses_host", title: "Chat ses_host" },
    })
    await manager.stop()
  })

  test("surfaces routed Interbase session message failures without local backend fallback", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      codexHome: path.join(tmpdir(), "interbase-empty-codex"),
      connectorVersion: "1.2.3",
      routingMetadataStore: createMemoryRoutingMetadataStore([
        {
          backendConversationId: "ses_interbase",
          backendId: "interbaseRuntime",
          conversationId: "ses_interbase",
          createdAt: "2026-05-10T00:00:00.000Z",
          directory: "/repo",
          title: null,
          updatedAt: "2026-05-10T00:00:00.000Z",
        },
      ]),
      sleep: async () => undefined,
      deps: testDeps({
        listSessionMessages: async () => {
          throw new Error("interbase list failed")
        },
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(
      runHandler(
        handlers["session.messages"],
        command("session.messages", {
          sessionId: "ses_interbase",
        }),
      ),
    ).rejects.toThrow("interbase list failed")
    expect(manager.logs({ directory: "/repo" }).some((entry) => entry.message.includes("interbase list failed"))).toBe(
      true,
    )
    await manager.stop()
  })

  test("reports runtime snapshot states for stopped, errored, and starting runtimes", async () => {
    const completed = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return attachment
        },
      }),
    })
    await expect(completed.start(startInput())).resolves.toMatchObject({ state: "stopped" })
    expect(completed.runtimeStatusSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({ state: "offline" })

    let rejectRun: ((error: Error) => void) | undefined
    const errored = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((_resolve, reject) => {
            rejectRun = reject
          })
        },
      }),
    })
    await expect(errored.start(startInput())).resolves.toMatchObject({ state: "online" })
    rejectRun?.(new Error("connector failed"))
    await flushQueuedEvents()
    expect(errored.runtimeStatusSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({ state: "unavailable" })

    const starting = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async () => await new Promise<ReturnType<typeof testAttachment>>(() => undefined),
      }),
    })
    await expect(starting.start(startInput())).rejects.toThrow("Remote runtime connector did not attach")
    expect(starting.runtimeStatusSnapshot({ runtimeInstallationId: "rti_1" })).toMatchObject({ state: "unavailable" })
  })

  test("projects representative runtime event part variants into compact realtime envelopes", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      now: () => "2026-05-10T00:00:00.000Z",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          input.onRemoteRuntimeClientDetached?.({ attachment, clientAttachmentId: "mda_missing" })
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
            },
            clientAttachmentId: "mda_1",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => {
            eventHandler = undefined
          }
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    const parts: Record<string, unknown>[] = [
      { id: "text_1", messageID: "msg_1", metadata: { kind: "summary" }, synthetic: true, text: "hello", type: "text" },
      { id: "reasoning_1", messageID: "msg_1", text: "thinking", type: "reasoning" },
      {
        id: "tool_read",
        messageID: "msg_1",
        state: {
          input: { filePath: "/repo/a.ts", ignored: "x" },
          metadata: { loaded: ["/repo/a.ts"] },
          status: "completed",
        },
        tool: "read",
        type: "tool",
      },
      {
        id: "tool_grep",
        messageID: "msg_1",
        state: { input: { pattern: "TODO", path: "/repo" }, metadata: { matches: 2 } },
        tool: "grep",
        type: "tool",
      },
      {
        id: "tool_glob",
        messageID: "msg_1",
        state: { input: { pattern: "**/*.ts", path: "/repo" }, metadata: { count: 3 } },
        tool: "glob",
        type: "tool",
      },
      {
        id: "tool_webfetch",
        messageID: "msg_1",
        state: { input: { url: "https://example.test" } },
        tool: "webfetch",
        type: "tool",
      },
      {
        id: "tool_websearch",
        messageID: "msg_1",
        state: { input: { query: "interbase" }, metadata: { numResults: 4 } },
        tool: "websearch",
        type: "tool",
      },
      {
        id: "tool_task",
        messageID: "msg_1",
        state: { input: { description: "check", subagent_type: "general" }, metadata: { sessionId: "ses_sub" } },
        tool: "task",
        type: "tool",
      },
      {
        id: "tool_edit",
        messageID: "msg_1",
        state: {
          input: { filePath: "/repo/a.ts" },
          metadata: {
            diagnostics: { errors: 0 },
            diff: "diff",
            filediff: { path: "/repo/a.ts" },
            files: ["/repo/a.ts"],
          },
        },
        tool: "edit",
        type: "tool",
      },
      {
        id: "tool_write",
        messageID: "msg_1",
        state: { input: { content: "contents", filePath: "/repo/b.ts" }, metadata: { files: ["/repo/b.ts"] } },
        tool: "write",
        type: "tool",
      },
      {
        id: "tool_patch",
        messageID: "msg_1",
        state: { input: { filePath: "/repo/c.ts" }, metadata: { diff: "patch" } },
        tool: "apply_patch",
        type: "tool",
      },
      {
        id: "tool_todo",
        messageID: "msg_1",
        state: {
          input: { todos: [{ content: "ship", status: "pending" }] },
          metadata: { todos: [{ content: "ship", status: "pending" }] },
        },
        tool: "todowrite",
        type: "tool",
      },
      {
        id: "tool_question",
        messageID: "msg_1",
        state: { input: { questions: [{ header: "Choice" }] }, metadata: { answers: ["yes"] } },
        tool: "question",
        type: "tool",
      },
      {
        id: "tool_skill",
        messageID: "msg_1",
        state: { error: "failed", input: { name: "ai-sdk" }, time: { compacted: false } },
        tool: "skill",
        type: "tool",
      },
      { id: "tool_no_input", messageID: "msg_1", state: { status: "pending" }, tool: "bash", type: "tool" },
      {
        id: "tool_unknown",
        messageID: "msg_1",
        state: { input: { bool: true, nested: { nope: true }, number: 1, text: "ok" } },
        tool: "custom",
        type: "tool",
      },
      {
        filename: "a.png",
        id: "file_1",
        messageID: "msg_1",
        mime: "image/png",
        source: { path: "/repo/a.png" },
        type: "file",
        url: "file:///repo/a.png",
      },
      { files: ["a.ts"], id: "patch_1", messageID: "msg_1", type: "patch" },
      { agent: "general", description: "sub", id: "subtask_1", messageID: "msg_1", prompt: "do it", type: "subtask" },
      { id: "agent_1", messageID: "msg_1", name: "general", type: "agent" },
      { id: "snapshot_1", messageID: "msg_1", snapshot: "snap", type: "snapshot" },
      { id: "step_start_1", messageID: "msg_1", snapshot: "snap-start", type: "step-start" },
      {
        cost: 0.01,
        id: "step_finish_1",
        messageID: "msg_1",
        reason: "done",
        snapshot: "snap-finish",
        tokens: { input: 1, output: 2 },
        type: "step-finish",
      },
      { attempt: 2, error: { message: "retry" }, id: "retry_1", messageID: "msg_1", type: "retry" },
      {
        auto: true,
        id: "compaction_1",
        messageID: "msg_1",
        overflow: false,
        tail_start_id: "msg_tail",
        type: "compaction",
      },
      { id: "unknown_1", messageID: "msg_1", type: "custom-part" },
      { id: "objectless_part", messageID: "msg_1", part: null, type: "message.part.updated" },
      { id: "missing_type", messageID: "msg_1" },
    ]

    for (const part of parts) {
      eventHandler?.({ properties: { part, sessionID: "ses_1" }, type: "message.part.updated" })
    }
    eventHandler?.({ properties: { part: null, sessionID: "ses_1" }, type: "message.part.updated" })
    await waitFor(() => delivered.length === parts.length + 1)

    expect(delivered.map((entry) => entry.type)).toEqual([...parts, null].map(() => "event"))
    expect(
      delivered.find((entry) => entry.type === "event" && entry.event.payload.projectedPart?.type === "file"),
    ).toMatchObject({
      event: {
        payload: {
          projectedPart: {
            filename: "a.png",
            mime: "image/png",
            source: { path: "/repo/a.png" },
            url: "file:///repo/a.png",
          },
        },
      },
    })
    expect(
      delivered.find((entry) => entry.type === "event" && entry.event.payload.projectedPart?.id === "tool_skill"),
    ).toMatchObject({
      event: {
        payload: {
          projectedPart: { state: { error: "failed", input: { name: "ai-sdk" }, time: { compacted: true } } },
        },
      },
    })
    expect(delivered.at(-2)).toMatchObject({ event: { payload: { projectedPart: null, truncated: true } } })
    expect(delivered.at(-1)).toMatchObject({ event: { payload: { projectedPart: null, truncated: false } } })
    await manager.stop()
  })

  test("isolates runtime event projection failures and missing mirrored activity targets", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: {
        ...testDeps({
          runConnectorRuntimeSession: async (input) => {
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            await input.onRemoteRuntimeClientAttachment({
              attachment,
              deliverRuntimeEnvelope: async (envelope) => {
                delivered.push(envelope)
              },
              clientAttachmentId: "mda_1",
            })
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
          subscribeEvents: (_context, handler) => {
            eventHandler = handler
            return () => {
              eventHandler = undefined
            }
          },
        }),
        projectSessionMessage: async () => {
          throw new Error("projection failed")
        },
      },
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    eventHandler?.({ properties: { info: { id: "msg_1" }, sessionID: "ses_1" }, type: "message.updated" })
    await flushQueuedEvents()
    expect(delivered).toEqual([])
    expect(manager.logs({ directory: "/repo" }).some((entry) => entry.message.includes("projection failed"))).toBe(true)
    await expect(
      manager.publishSessionActivity({
        directory: "/missing-repo",
        event: { properties: { sessionID: "ses_1" }, type: "session.status" },
      }),
    ).resolves.toBeUndefined()
    await manager.stop()
  })

  test("ignores stale queued runtime event deliveries after subscription cleanup", async () => {
    const releaseDelivery = deferred<void>()
    let deliveryAttempts = 0
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async () => {
              deliveryAttempts += 1
              await releaseDelivery.promise
              throw new Error("late delivery failed")
            },
            clientAttachmentId: "mda_1",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => undefined
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.created" })
    await waitFor(() => deliveryAttempts === 1)
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    const stop = manager.stop()
    await flushQueuedEvents()
    releaseDelivery.resolve()
    await stop
    await flushQueuedEvents()

    expect(deliveryAttempts).toBe(1)
    const logs = manager.logs({ runtimeInstallationId: "rti_1" }).map((entry) => entry.message)
    expect(logs.some((message) => message.includes("late delivery failed"))).toBe(true)
    expect(logs.some((message) => message.includes("project context was missing"))).toBe(true)
  })

  test("projects local backend chats for runtime events with backend authority", async () => {
    const codexHome = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-event-codex-"))
    const runtimeDirectory = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-event-repo-"))
    try {
      await Bun.write(
        path.join(codexHome, "sessions", "2026", "05", "13", "thread.jsonl"),
        [
          JSON.stringify({
            payload: {
              cwd: runtimeDirectory,
              id: "codex_thread_1",
              timestamp: "2026-05-13T04:49:43.537Z",
            },
            timestamp: "2026-05-13T04:49:46.424Z",
            type: "session_meta",
          }),
          JSON.stringify({
            payload: {
              content: [{ text: "Build with Codex", type: "input_text" }],
              role: "user",
              type: "message",
            },
            timestamp: "2026-05-13T04:49:47.028Z",
            type: "response_item",
          }),
        ].join("\n"),
      )
      const delivered: RuntimeWebSocketServerEnvelope[] = []
      let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
      const manager = createRemoteRuntimeManager<{ directory: string }>({
        codexHome,
        connectorVersion: "1.2.3",
        ...injectedBackendRouterOptions([createCodexAdapter({ codexHome })]),
        sleep: async () => undefined,
        deps: testDeps({
          runConnectorRuntimeSession: async (input) => {
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            await input.onRemoteRuntimeClientAttachment({
              attachment,
              deliverRuntimeEnvelope: async (envelope) => {
                delivered.push(envelope)
              },
              clientAttachmentId: "mda_1",
            })
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
          subscribeEvents: (_context, handler) => {
            eventHandler = handler
            return () => {
              eventHandler = undefined
            }
          },
        }),
      })

      await expect(manager.start({ ...startInput(), directory: runtimeDirectory })).resolves.toMatchObject({
        state: "online",
      })
      eventHandler?.({ properties: { backendID: "codex", sessionID: "codex_thread_1" }, type: "session.updated" })
      await waitFor(() => delivered.length === 1)
      expect(delivered.at(-1)).toMatchObject({
        event: {
          payload: {
            activeChat: { agent: "Codex", sessionId: "codex_thread_1", title: "Build with Codex" },
          },
        },
      })
      await manager.stop()
    } finally {
      await rm(codexHome, { force: true, recursive: true })
      await rm(runtimeDirectory, { force: true, recursive: true })
    }
  })

  test("compacts oversized runtime event envelopes after projection", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      now: () => "2026-05-10T00:00:00.000Z",
      sleep: async () => undefined,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_1")],
        projectActiveChat: async () => ({
          ...activeChatFixture("ses_1"),
          title: "x".repeat(520 * 1024),
        }),
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
            },
            clientAttachmentId: "mda_1",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => {
            eventHandler = undefined
          }
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.created" })
    await waitFor(() => delivered.length === 1)
    expect(delivered.at(-1)).toMatchObject({
      event: {
        payload: {
          activeChat: null,
          projectedMessage: null,
          projectedPart: null,
          textDelta: null,
          truncated: true,
        },
      },
    })
    await manager.stop()
  })

  test("fails clearly for missing tickets and empty encryption selectors", async () => {
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: {
        issueRuntimeAttachmentTicket: async () => ({}),
        runConnectorRuntimeSession: async () => {
          throw new Error("unexpected connector start")
        },
        loadContext: async (input) => ({ directory: input.directory }),
        disposeContext: async () => undefined,
        listActiveChats: async () => [],
        listSessionMessages: async () => ({
          messages: [],
          pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
          sessionId: "ses_1",
        }),
        sendSessionMessage: async () => {
          throw new Error("not used")
        },
        startChat: async () => {
          throw new Error("not used")
        },
        subscribeEvents: () => () => undefined,
      },
    })

    await expect(
      manager.start({
        accountId: "acct_1",
        apiBaseUrl: "https://api.interbase.test",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        runtimeInstallationId: "rti_1",
      }),
    ).rejects.toThrow("Remote runtime setup did not receive ticket")
    await expect(manager.configureEncryption({ setupToken: "setup_token_1" })).rejects.toThrow(
      "No matching remote runtime is running.",
    )
  })

  test("forwards part updates and text deltas without waiting on chat projections", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    let projectActiveChatCalls = 0
    let projectSessionMessageCalls = 0
    const blockProjection = deferred<RuntimeWebSocketServerEnvelope | null>()
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: {
        issueRuntimeAttachmentTicket: async () => ({ ticket: "ticket_1" }),
        async runConnectorRuntimeSession(input) {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
            },
            clientAttachmentId: "mda_1",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        loadContext: async (input) => ({ directory: input.directory }),
        disposeContext: async () => undefined,
        listActiveChats: async () => [],
        listProviders: async () => ({ all: [], connected: [], default: {} }),
        projectActiveChat: async () => {
          projectActiveChatCalls += 1
          await blockProjection.promise
          return null
        },
        projectSessionMessage: async () => {
          projectSessionMessageCalls += 1
          return null
        },
        listSessionMessages: async () => ({
          messages: [],
          pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
          sessionId: "ses_1",
        }),
        sendSessionMessage: async () => {
          throw new Error("not used")
        },
        startChat: async () => {
          throw new Error("not used")
        },
        updateSession: async () => {
          throw new Error("not used")
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => {
            eventHandler = undefined
          }
        },
      },
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })

    eventHandler?.({
      properties: {
        part: {
          id: "part_live",
          messageID: "msg_live",
          text: "Hel",
          type: "text",
        },
        sessionID: "ses_1",
      },
      type: "message.part.updated",
    })
    eventHandler?.({
      properties: {
        delta: "lo",
        field: "text",
        messageID: "msg_live",
        partID: "part_live",
        sessionID: "ses_1",
      },
      type: "message.part.delta",
    })

    await flushQueuedEvents()

    expect(projectActiveChatCalls).toBe(0)
    expect(projectSessionMessageCalls).toBe(1)
    expect(delivered).toMatchObject([
      {
        event: {
          eventType: "session.output.delta",
          payload: {
            activeChat: null,
            projectedMessage: null,
            projectedPart: {
              id: "part_live",
              messageID: "msg_live",
              text: "Hel",
              type: "text",
            },
            textDelta: null,
          },
        },
        type: "event",
      },
      {
        event: {
          eventType: "session.output.delta",
          payload: {
            activeChat: null,
            projectedMessage: null,
            projectedPart: null,
            textDelta: {
              delta: "lo",
              field: "text",
              messageID: "msg_live",
              partID: "part_live",
              sessionID: "ses_1",
            },
          },
        },
        type: "event",
      },
    ])

    blockProjection.resolve(null)
    await manager.stop()
  })

  test("marks oversized projected message realtime events as truncated", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: {
        ...testDeps({
          runConnectorRuntimeSession: async (input) => {
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            await input.onRemoteRuntimeClientAttachment({
              attachment,
              deliverRuntimeEnvelope: async (envelope) => {
                delivered.push(envelope)
              },
              clientAttachmentId: "mda_1",
            })
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
          subscribeEvents: (_context, handler) => {
            eventHandler = handler
            return () => {
              eventHandler = undefined
            }
          },
        }),
        projectSessionMessage: async (_context, sessionId, messageId) => ({
          agent: null,
          completedAt: null,
          createdAt: "2026-05-10T00:01:30.000Z",
          errorMessage: null,
          errorName: null,
          finishReason: null,
          id: messageId,
          model: null,
          parentId: null,
          parts: [
            {
              id: "part_large",
              kind: "text",
              messageId,
              rawPart: { id: "part_large", messageID: messageId, text: "x".repeat(520 * 1024), type: "text" },
              status: null,
              text: "x".repeat(520 * 1024),
              title: null,
            },
          ],
          role: "assistant",
          sessionId,
        }),
      },
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    eventHandler?.({
      properties: {
        info: { id: "msg_large" },
        sessionID: "ses_1",
      },
      type: "message.updated",
    })
    await flushQueuedEvents()

    expect(delivered).toMatchObject([
      {
        event: {
          payload: {
            projectedMessage: null,
            truncated: true,
          },
          resource: {
            kind: "chatMessages",
            runtimeInstallationId: "rti_1",
            sessionId: "ses_1",
          },
        },
        type: "event",
      },
    ])
    await manager.stop()
  })

  test("routes remote runtime Anthropic chats through the local Claude adapter", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-claude-"))
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    let constructedAuth: unknown
    let clientCreations = 0
    const messageInputs: unknown[] = []
    const claudeClient = (auth: unknown) => {
      clientCreations += 1
      constructedAuth = auth
      return {
        messages: {
          async create(input: Record<string, unknown>) {
            messageInputs.push(input)
            const messages = Array.isArray(input.messages) ? input.messages : []
            const last = messages.at(-1)
            const text = isRecord(last) && typeof last.content === "string" ? last.content : ""
            return {
              content: [{ text: `Claude mobile response to ${text}`, type: "text" }],
              id: `claude_msg_mobile_${messageInputs.length}`,
              model: input.model,
              role: "assistant",
              stop_reason: "end_turn",
              type: "message",
            }
          },
        },
        models: {
          async list() {
            return { data: [{ display_name: "Claude Sonnet", id: "claude-sonnet-4.5" }] }
          },
          async retrieve(modelId: string) {
            return { display_name: "Claude Sonnet", id: modelId }
          },
        },
      }
    }
    const manager = createRemoteRuntimeManager({
      codexHome: path.join(tmpdir(), "interbase-empty-codex"),
      connectorVersion: "1.2.3",
      ...injectedBackendRouterOptions([
        createClaudeAdapter({
          createClient: async () => claudeClient({ apiKey: "anthropic-key" }),
          now: () => "2026-05-10T00:00:00.000Z",
          stateDirectory: path.join(root, ".interbase", "remote-runtime-claude"),
        }),
      ]),
      now: () => "2026-05-10T00:00:00.000Z",
      randomUUID: () => "req_uuid",
      sleep: async () => undefined,
      deps: {
        issueRuntimeAttachmentTicket: async () => ({ ticket: "ticket_1" }),
        async runConnectorRuntimeSession(input) {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async () => undefined,
            clientAttachmentId: "mda_1",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        loadContext: async (input) => ({ directory: input.directory }),
        disposeContext: async () => undefined,
        listActiveChats: async () => [],
        getAnthropicAuth: async () => ({ apiKey: "anthropic-key" }),
        listProviders: async () => ({
          all: [
            {
              id: "anthropic",
              models: { "claude-sonnet-4.5": { id: "claude-sonnet-4.5", name: "Claude Sonnet 4.5", status: "active" } },
              name: "Anthropic",
            },
          ],
          connected: ["anthropic"],
          default: { anthropic: "claude-sonnet-4.5" },
        }),
        listSessionMessages: async () => ({
          messages: [],
          pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
          sessionId: "unused",
        }),
        sendSessionMessage: async () => {
          throw new Error("Interbase sendSessionMessage should not handle Claude remote runtime chats")
        },
        startChat: async () => {
          throw new Error("Interbase startChat should not handle Claude remote runtime chats")
        },
        updateSession: async () => {
          throw new Error("Interbase updateSession should not handle Claude remote runtime chats")
        },
        subscribeEvents: () => () => undefined,
      },
    })

    await expect(manager.start({ ...startInput(), directory: root })).resolves.toMatchObject({ state: "online" })
    await expect(runHandler(handlers["provider.list"], command("provider.list", {}))).resolves.toMatchObject({
      all: expect.arrayContaining([
        expect.objectContaining({
          id: "anthropic",
          models: expect.objectContaining({
            "claude-sonnet-4.5": { id: "claude-sonnet-4.5", name: "Claude Sonnet", status: "active" },
          }),
        }),
      ]),
      connected: expect.arrayContaining(["anthropic"]),
      default: expect.objectContaining({ anthropic: "claude-sonnet-4.5" }),
    })
    const started = await runHandler(
      handlers["chat.start"],
      command("chat.start", {
        directoryId: "dir_1",
        model: "claude-sonnet-4.5",
        providerId: "anthropic",
        title: "Claude remote runtime chat",
      }),
    )
    expect(started).toMatchObject({ chat: { agent: "Anthropic", model: "claude-sonnet-4.5", providerId: "anthropic" } })
    const sessionId =
      isRecord(started) && isRecord(started.chat) && typeof started.chat.sessionId === "string"
        ? started.chat.sessionId
        : ""
    expect(sessionId).toStartWith("claude_")

    await expect(
      runHandler(
        handlers["session.update"],
        command("session.update", {
          input: { model: "claude-sonnet-4.5", providerId: "anthropic" },
          sessionId,
        }),
      ),
    ).resolves.toMatchObject({
      chat: { model: "claude-sonnet-4.5", providerId: "anthropic", sessionId },
    })

    await expect(
      runHandler(
        handlers["session.message"],
        command("session.message", {
          input: { content: "hello from mobile" },
          sessionId,
        }),
      ),
    ).resolves.toMatchObject({
      message: {
        agent: "Anthropic",
        id: "claude_msg_mobile_1",
        parts: [{ text: "Claude mobile response to hello from mobile" }],
        role: "assistant",
        sessionId,
      },
      sessionId,
    })
    await rm(path.join(root, ".interbase", "remote-runtime-agent-backends", "routes.json"), { force: true })
    await expect(
      runHandler(
        handlers["session.read"],
        command("session.read", {
          sessionId,
        }),
      ),
    ).resolves.toMatchObject({
      chat: { agent: "Anthropic", sessionId, title: "Claude remote runtime chat" },
    })
    await expect(
      runHandler(
        handlers["session.update"],
        command("session.update", {
          input: { model: "claude-opus-test", providerId: "anthropic" },
          sessionId,
        }),
      ),
    ).resolves.toMatchObject({
      chat: { model: "claude-opus-test", providerId: "anthropic", sessionId },
    })
    await expect(
      runHandler(
        handlers["session.message"],
        command("session.message", {
          input: { content: "second mobile message" },
          sessionId,
        }),
      ),
    ).resolves.toMatchObject({
      message: {
        agent: "Anthropic",
        id: "claude_msg_mobile_2",
        parts: [{ text: "Claude mobile response to second mobile message" }],
        role: "assistant",
        sessionId,
      },
      sessionId,
    })
    const latestPage = await runHandler(
      handlers["session.messages"],
      command("session.messages", {
        limit: 2,
        sessionId,
      }),
    )
    const olderCursor = Buffer.from(
      JSON.stringify({
        endExclusive: 2,
        pageSize: 2,
        sessionId,
      }),
    ).toString("base64url")
    expect(latestPage).toMatchObject({
      messages: [
        { agent: "Anthropic", parts: [{ text: "second mobile message" }], role: "user", sessionId },
        {
          agent: "Anthropic",
          id: "claude_msg_mobile_2",
          parts: [{ text: "Claude mobile response to second mobile message" }],
          role: "assistant",
          sessionId,
        },
      ],
      pageInfo: { hasOlder: true, olderCursor },
      sessionId,
    })
    await expect(
      runHandler(
        handlers["session.messages"],
        command("session.messages", {
          cursor: olderCursor,
          limit: 2,
          sessionId,
        }),
      ),
    ).resolves.toMatchObject({
      messages: [
        { agent: "Anthropic", parts: [{ text: "hello from mobile" }], role: "user", sessionId },
        {
          agent: "Anthropic",
          id: "claude_msg_mobile_1",
          parts: [{ text: "Claude mobile response to hello from mobile" }],
          role: "assistant",
          sessionId,
        },
      ],
      pageInfo: { hasNewer: true, newerCursor: expect.any(String), hasOlder: false, olderCursor: null },
      sessionId,
    })
    await expect(
      runHandler(
        handlers["session.messages"],
        command("session.messages", {
          cursor: Buffer.from(JSON.stringify({ endExclusive: 1, pageSize: 1, sessionId: "wrong_session" })).toString(
            "base64url",
          ),
          sessionId,
        }),
      ),
    ).rejects.toThrow("Chat message cursor does not match the requested session.")
    await expect(
      runHandler(
        handlers["session.messages"],
        command("session.messages", {
          cursor: "not-base64",
          sessionId,
        }),
      ),
    ).rejects.toThrow("Chat message cursor is not valid.")
    expect(constructedAuth).toEqual({ apiKey: "anthropic-key" })
    expect(clientCreations).toBe(1)
    expect(messageInputs).toEqual([
      expect.objectContaining({ model: "claude-sonnet-4.5" }),
      expect.objectContaining({ model: "claude-opus-test" }),
    ])

    await manager.stop()

    const unauthenticatedHandlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const unauthenticatedManager = createRemoteRuntimeManager({
      codexHome: path.join(tmpdir(), "interbase-empty-codex"),
      connectorVersion: "1.2.3",
      ...injectedBackendRouterOptions([
        createClaudeAdapter({
          createClient: async () => claudeClient(undefined),
          now: () => "2026-05-10T00:00:00.000Z",
          stateDirectory: path.join(root, ".interbase", "remote-runtime-claude"),
        }),
      ]),
      now: () => "2026-05-10T00:00:00.000Z",
      randomUUID: () => "req_uuid_unauthenticated",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          Object.assign(unauthenticatedHandlers, input.runtimeCommandHandlers)
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })
    await expect(
      unauthenticatedManager.start({ ...startInput(), directory: root, runtimeInstallationId: "rti_no_auth" }),
    ).resolves.toMatchObject({ state: "online" })
    await expect(
      runHandler(
        unauthenticatedHandlers["chat.start"],
        command("chat.start", {
          directoryId: "dir_1",
          model: "claude-sonnet-4.5",
          providerId: "anthropic",
          title: "Claude remote runtime chat without auth resolver",
        }),
      ),
    ).resolves.toMatchObject({ chat: { agent: "Anthropic", providerId: "anthropic" } })
    expect(constructedAuth).toBeUndefined()
    await unauthenticatedManager.stop()

    await rm(root, { force: true, recursive: true })
  })

  test("falls back to local conversation detail when Codex accepts a message without inline message authority", async () => {
    const codexHome = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-codex-fallback-"))
    const runtimeDirectory = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-codex-fallback-repo-"))
    try {
      await Bun.write(
        path.join(codexHome, "sessions", "2026", "05", "13", "thread.jsonl"),
        [
          JSON.stringify({
            payload: {
              cwd: runtimeDirectory,
              id: "codex_thread_fallback",
              timestamp: "2026-05-13T04:49:43.537Z",
            },
            timestamp: "2026-05-13T04:49:46.424Z",
            type: "session_meta",
          }),
          JSON.stringify({
            payload: {
              content: [{ text: "Readable detail response", type: "output_text" }],
              id: "codex_msg_from_detail",
              role: "assistant",
              type: "message",
            },
            timestamp: "2026-05-13T04:49:47.028Z",
            type: "response_item",
          }),
        ].join("\n"),
      )
      let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
      const manager = createRemoteRuntimeManager({
        codexHome,
        connectorVersion: "1.2.3",
        ...injectedBackendRouterOptions([
          createCodexAdapter({
            codexHome,
            createClient: () => ({
              resumeThread(threadId: string) {
                return {
                  async run(content: string) {
                    return {
                      finalResponse: "",
                      id: content === "missing" ? "codex_msg_missing" : "codex_msg_from_detail",
                      items: [],
                    }
                  },
                  async runStreamed() {
                    return { events: (async function* () {})() }
                  },
                  threadId,
                }
              },
              startThread() {
                return {
                  async run() {
                    return {}
                  },
                  async runStreamed() {
                    return { events: (async function* () {})() }
                  },
                  threadId: "codex_thread_fallback",
                }
              },
            }),
          }),
        ]),
        sleep: async () => undefined,
        deps: testDeps({
          runConnectorRuntimeSession: async (input) => {
            handlers = input.runtimeCommandHandlers
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
        }),
        routingMetadataStore: createMemoryRoutingMetadataStore([
          {
            backendConversationId: "codex_thread_fallback",
            backendId: "codex",
            conversationId: "codex_thread_fallback",
            createdAt: "2026-05-13T04:49:43.537Z",
            directory: runtimeDirectory,
            title: "Codex fallback",
            updatedAt: "2026-05-13T04:49:47.028Z",
          },
        ]),
      })

      await expect(manager.start({ ...startInput(), directory: runtimeDirectory })).resolves.toMatchObject({
        state: "online",
      })
      await expect(
        runHandler(
          handlers["session.message"],
          command("session.message", {
            input: { content: "continue" },
            sessionId: "codex_thread_fallback",
          }),
        ),
      ).resolves.toMatchObject({
        message: { id: "codex_msg_from_detail", parts: [{ text: "Readable detail response" }] },
        sessionId: "codex_thread_fallback",
      })
      await expect(
        runHandler(
          handlers["session.message"],
          command("session.message", {
            input: { content: "missing" },
            sessionId: "codex_thread_fallback",
          }),
        ),
      ).rejects.toThrow(
        "Local backend accepted the remote runtime message but did not return readable message authority.",
      )
      await manager.stop()
    } finally {
      await rm(codexHome, { force: true, recursive: true })
      await rm(runtimeDirectory, { force: true, recursive: true })
    }
  })

  test("lists Interbase runtime chats without scanning local backend conversations", async () => {
    const codexHome = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-codex-"))
    const runtimeDirectory = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-repo-"))
    try {
      await Bun.write(
        path.join(codexHome, "sessions", "2026", "05", "13", "thread.jsonl"),
        [
          JSON.stringify({
            payload: {
              cwd: runtimeDirectory,
              id: "codex_thread_1",
              timestamp: "2026-05-13T04:49:43.537Z",
            },
            timestamp: "2026-05-13T04:49:46.424Z",
            type: "session_meta",
          }),
          JSON.stringify({
            payload: {
              content: [{ text: "Build with Codex", type: "input_text" }],
              role: "user",
              type: "message",
            },
            timestamp: "2026-05-13T04:49:47.028Z",
            type: "response_item",
          }),
        ].join("\n"),
      )
      const manager = createRemoteRuntimeManager({
        codexHome,
        connectorVersion: "1.2.3",
        deps: testDeps({
          listActiveChats: async () => [
            {
              agent: null,
              createdAt: "2026-05-10T00:00:00.000Z",
              hasActiveTurn: false,
              model: null,
              path: runtimeDirectory,
              projectId: "project_1",
              providerId: null,
              providerName: null,
              sessionId: "ses_interbase",
              status: "idle",
              title: "Interbase chat",
              updatedAt: "2026-05-10T00:00:00.000Z",
            },
          ],
          runConnectorRuntimeSession: async (input) => {
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
        }),
        now: () => "2026-05-13T05:00:00.000Z",
        serverVersion: "1.2.3",
      })

      await expect(manager.start({ ...startInput(), directory: runtimeDirectory })).resolves.toMatchObject({
        state: "online",
      })
      await expect(manager.listRemoteRuntimeActiveChats({ directoryId: "dir_1", limit: 10 })).resolves.toMatchObject({
        activeChats: [{ agent: null, providerName: null, sessionId: "ses_interbase", title: "Interbase chat" }],
      })
      await manager.stop()
    } finally {
      await rm(codexHome, { force: true, recursive: true })
      await rm(runtimeDirectory, { force: true, recursive: true })
    }
  })

  test("serializes concurrent session messages per remote runtime chat session", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const releaseFirst = deferred<void>()
    const sent: string[] = []
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        sendSessionMessage: async (_context, payload) => {
          sent.push(payload.input.content)
          if (payload.input.content === "first") await releaseFirst.promise
          return {
            message: {
              agent: null,
              completedAt: null,
              createdAt: "2026-05-10T00:00:00.000Z",
              errorMessage: null,
              id: `msg_${payload.input.content}`,
              model: null,
              parts: [],
              role: "user",
              sessionId: payload.sessionId,
            },
            sessionId: payload.sessionId,
          }
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    const first = runHandler(
      handlers["session.message"],
      command("session.message", {
        input: { content: "first" },
        sessionId: "ses_1",
      }),
    )
    const second = runHandler(
      handlers["session.message"],
      command("session.message", {
        input: { content: "second" },
        sessionId: "ses_1",
      }),
    )

    await waitFor(() => sent.length === 1)
    expect(sent).toEqual(["first"])
    releaseFirst.resolve()
    await expect(first).resolves.toMatchObject({ message: { id: "msg_first" }, sessionId: "ses_1" })
    await expect(second).resolves.toMatchObject({ message: { id: "msg_second" }, sessionId: "ses_1" })
    expect(sent).toEqual(["first", "second"])
    await manager.stop()
  })

  test("reads default Interbase session messages directly with paging payload", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const listPayloads: RemoteRuntimeProtocolClientCommand["payload"][] = []
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        listSessionMessages: async (_context, payload) => {
          listPayloads.push(payload)
          return {
            messages: [
              {
                agent: null,
                completedAt: null,
                createdAt: "2026-05-10T00:00:00.000Z",
                errorMessage: null,
                errorName: null,
                finishReason: null,
                id: "msg_direct",
                model: null,
                parentId: null,
                parts: [],
                role: "assistant",
                sessionId: payload.sessionId,
              },
            ],
            pageInfo: { hasNewer: false, hasOlder: true, newerCursor: null, olderCursor: "cursor_next" },
            sessionId: payload.sessionId,
          }
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(
      runHandler(
        handlers["session.messages"],
        command("session.messages", {
          cursor: "cursor_older",
          limit: 20,
          sessionId: "ses_interbase",
        }),
      ),
    ).resolves.toMatchObject({
      messages: [{ id: "msg_direct", sessionId: "ses_interbase" }],
      pageInfo: { hasOlder: true, olderCursor: "cursor_next" },
      sessionId: "ses_interbase",
    })
    expect(listPayloads).toEqual([{ cursor: "cursor_older", limit: 20, sessionId: "ses_interbase" }])
    await manager.stop()
  })

  test("reports connector failures, bounded logs, serialized encryption keys, and delivery failures", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    let rejectRun: ((error: Error) => void) | undefined
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      maxLogEntries: 2,
      now: () => "2026-05-10T00:00:00.000Z",
      randomUUID: () => "req_uuid",
      sleep: async () => undefined,
      deps: {
        issueRuntimeAttachmentTicket: async () => ({ ticket: "ticket_1" }),
        async runConnectorRuntimeSession(input) {
          const attachment = {
            accountId: input.attachmentInput.accountId,
            attachmentCapabilities: [],
            connectorVersion: input.attachmentInput.connectorVersion,
            deviceTrustLevel: "trusted",
            directoryId: input.attachmentInput.directoryId,
            directoryPath: input.attachmentInput.directoryPath,
            gatewayRuntimeAttachmentId: "gra_1",
            protocolVersion: "0.1.0",
            requestId: input.attachmentInput.requestId,
            runtimeInstallationId: input.attachmentInput.runtimeInstallationId,
            status: "online",
          } as const
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
              throw new Error("delivery failed")
            },
            clientAttachmentId: "mda_1",
          })
          return await new Promise<typeof attachment>((_resolve, reject) => {
            rejectRun = reject
          })
        },
        loadContext: async (input) => ({ directory: input.directory }),
        disposeContext: async () => undefined,
        listActiveChats: async () => [],
        listSessionMessages: async () => ({
          messages: [],
          pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
          sessionId: "ses_1",
        }),
        sendSessionMessage: async () => {
          throw new Error("not used")
        },
        startChat: async () => {
          throw new Error("not used")
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => undefined
        },
      },
    })

    await expect(
      manager.start({
        accountId: "acct_1",
        apiBaseUrl: "https://api.interbase.test",
        authorizationToken: "token_1",
        directory: "/repo",
        directoryId: "dir_1",
        runtimeEncryptionKey: {
          keyBase64: Buffer.from("seed").toString("base64url"),
          keyId: "client_setup_token:v1",
        },
        runtimeInstallationId: "rti_1",
      }),
    ).resolves.toMatchObject({ commandEncryptionConfigured: true, state: "online" })
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.created" })
    await waitFor(() => delivered.length === 1)
    rejectRun?.(new Error("connector failed"))
    await flushQueuedEvents()
    expect(manager.status({ directory: "/repo" })).toMatchObject([{ lastError: "connector failed", state: "errored" }])
    expect(manager.logs({ directory: "/repo" }).length).toBeLessThanOrEqual(2)
  })

  test("redacts secrets from runtime connector status and logs", async () => {
    let rejectRun: ((error: Error) => void) | undefined
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      now: () => "2026-05-10T00:00:00.000Z",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((_resolve, reject) => {
            rejectRun = reject
          })
        },
      }),
    })

    await manager.start({
      accountId: "acct_1",
      apiBaseUrl: "https://api.interbase.test",
      authorizationToken: "runtime_auth_secret",
      directory: "/repo",
      directoryId: "dir_1",
      runtimeInstallationId: "rti_1",
    })
    const authorizationHeaderLabel = "authorization" + "To" + "ken"
    const privateKeyPem = [
      "-----BEGIN ",
      "PRIVATE KEY-----\nraw_private_key_secret\n-----END ",
      "PRIVATE KEY-----",
    ].join("")

    rejectRun?.(
      new Error(
        [
          "connector failed",
          "apiBearerToken=api_secret",
          `${authorizationHeaderLabel}: runtime_authorization_secret`,
          "bearerToken=Bearer bearer_secret",
          "localAccessToken=local_secret",
          "privateKey=private_key_secret",
          "Interbase-Client-Signature: client_signature_secret",
          "INTERBASE_CLIENT_PAIRING_CREDENTIAL=pairing_credential_secret",
          '{"signature":"json_signature_secret"}',
          privateKeyPem,
        ].join(" "),
      ),
    )
    await flushQueuedEvents()

    const [{ lastError }] = manager.status({ directory: "/repo" })
    const logText = manager
      .logs({ directory: "/repo" })
      .map((entry) => entry.message)
      .join("\n")

    expect(lastError).toContain("[REDACTED]")
    expect(logText).toContain("[REDACTED]")
    for (const leakedSecret of [
      "api_secret",
      "runtime_authorization_secret",
      "bearer_secret",
      "local_secret",
      "private_key_secret",
      "client_signature_secret",
      "pairing_credential_secret",
      "json_signature_secret",
      "raw_private_key_secret",
    ]) {
      expect(lastError).not.toContain(leakedSecret)
      expect(logText).not.toContain(leakedSecret)
    }
  })

  test("detaches mobile event subscriptions after repeated delivery failures", async () => {
    const deliveryOutcomes = ["fail", "success", "fail", "fail"] as const
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let deliveries = 0
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    let unsubscribeCalls = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      maxRemoteRuntimeEventDeliveryFailures: 2,
      now: () => "2026-05-10T00:00:00.000Z",
      randomUUID: () => "req_uuid",
      sleep: async () => undefined,
      deps: testDeps({
        listActiveChats: async () => [
          {
            agent: null,
            createdAt: "2026-05-10T00:00:00.000Z",
            hasActiveTurn: false,
            model: null,
            path: "/repo",
            projectId: "project_1",
            providerId: null,
            providerName: null,
            sessionId: "ses_1",
            status: "idle",
            title: "Existing chat",
            updatedAt: "2026-05-10T00:00:00.000Z",
          },
        ],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              const outcome = deliveryOutcomes[deliveries]
              deliveries += 1
              delivered.push(envelope)
              if (outcome === "fail") {
                throw new Error(`delivery failed ${deliveries}`)
              }
            },
            clientAttachmentId: "mda_1",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => {
            unsubscribeCalls += 1
          }
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })

    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.created" })
    await waitFor(() => deliveries === 1)
    expect(unsubscribeCalls).toBe(0)

    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    await waitFor(() => deliveries === 2)
    expect(unsubscribeCalls).toBe(0)

    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    await waitFor(() => deliveries === 3)
    expect(unsubscribeCalls).toBe(0)

    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    await waitFor(() => deliveries === 4 && unsubscribeCalls === 1)
    expect(
      manager
        .logs({ directory: "/repo" })
        .some((entry) => entry.message.includes("Detached remote runtime event subscription mda_1")),
    ).toBe(true)

    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    await flushQueuedEvents()
    expect(deliveries).toBe(4)
    expect(delivered).toHaveLength(4)
    await manager.stop()
  })

  test("detaches remote runtime event subscriptions when the remote runtime attachment closes", async () => {
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    let unsubscribeCalls = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      now: () => "2026-05-10T00:00:00.000Z",
      randomUUID: () => "req_uuid",
      sleep: async () => undefined,
      deps: testDeps({
        listActiveChats: async () => [],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
            },
            clientAttachmentId: "mda_1",
          })
          input.onRemoteRuntimeClientDetached?.({ attachment, clientAttachmentId: "mda_1" })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => {
            unsubscribeCalls += 1
          }
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await waitFor(() => unsubscribeCalls === 1)
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.created" })
    await flushQueuedEvents()
    expect(delivered).toEqual([])
    expect(
      manager
        .logs({ directory: "/repo" })
        .some((entry) => entry.message.includes("because the remote runtime attachment closed")),
    ).toBe(true)
    await manager.stop()
  })

  test("updates runtime heartbeat freshness from connector heartbeat activity", async () => {
    let currentTimestamp = "2026-05-10T00:00:00.000Z"
    let heartbeat: (() => void | Promise<void>) | undefined
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      now: () => currentTimestamp,
      randomUUID: () => "req_uuid",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          heartbeat = () => input.onRuntimeHeartbeat?.(attachment)
          currentTimestamp = "2026-05-10T00:00:01.000Z"
          await input.onRuntimeHeartbeat?.(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({
      lastHeartbeatAt: "2026-05-10T00:00:01.000Z",
      state: "online",
    })
    currentTimestamp = "2026-05-10T00:00:02.000Z"
    await heartbeat?.()
    expect(manager.status({ directory: "/repo" })).toMatchObject([{ lastHeartbeatAt: "2026-05-10T00:00:02.000Z" }])
    await manager.stop()
  })

  test("reattaches when the gateway loses the live runtime attachment", async () => {
    const attachmentIds: string[] = []
    const delays: number[] = []
    const tickets: string[] = []
    let runCount = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      random: () => 0.5,
      randomUUID: () => `req_${tickets.length + 1}`,
      sleep: async (milliseconds) => {
        if (milliseconds !== 25) {
          delays.push(milliseconds)
        }
      },
      deps: {
        issueRuntimeAttachmentTicket: async () => {
          const ticket = `ticket_${tickets.length + 1}`
          tickets.push(ticket)
          return { ticket }
        },
        runConnectorRuntimeSession: async (input) => {
          runCount += 1
          const attachment = {
            ...testAttachment(input),
            gatewayRuntimeAttachmentId: `gra_${runCount}`,
          }
          attachmentIds.push(attachment.gatewayRuntimeAttachmentId)
          if (runCount === 4) {
            input.onAttachment(attachment)
          } else {
            throw { remoteRuntimeRecovery: "reattach" as const }
          }
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        loadContext: async (input) => ({ directory: input.directory }),
        disposeContext: async () => undefined,
        listActiveChats: async () => [],
        listSessionMessages: async () => ({
          messages: [],
          pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
          sessionId: "ses_1",
        }),
        sendSessionMessage: async () => {
          throw new Error("not used")
        },
        startChat: async () => {
          throw new Error("not used")
        },
        subscribeEvents: () => () => undefined,
      },
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({
      gatewayRuntimeAttachmentId: "gra_4",
      state: "online",
    })
    for (let attempt = 0; attempt < 5 && attachmentIds.length < 4; attempt += 1) {
      await Promise.resolve()
    }

    expect(tickets).toEqual(["ticket_1", "ticket_2", "ticket_3", "ticket_4"])
    expect(delays).toEqual([1100, 2200, 4400])
    expect(attachmentIds).toEqual(["gra_1", "gra_2", "gra_3", "gra_4"])
    expect(manager.status()).toMatchObject([{ gatewayRuntimeAttachmentId: "gra_4", state: "online" }])
    expect(manager.logs().some((entry) => entry.message.includes("reattaching"))).toBe(true)
    await manager.stop()
  })

  test("resumes live event delivery after gateway reattach", async () => {
    const delivered: Array<{ clientAttachmentId: string; sequence: number; type: string }> = []
    const eventHandlers: Array<(event: RemoteRuntimeEventInput) => void> = []
    const unsubscribeCalls: string[] = []
    let rejectFirstRun: ((error: { remoteRuntimeRecovery: "reattach" }) => void) | undefined
    let runCount = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      random: () => 0,
      randomUUID: () => `req_${runCount}`,
      sleep: async () => undefined,
      deps: testDeps({
        listActiveChats: async () => [
          {
            agent: null,
            createdAt: "2026-05-10T00:00:00.000Z",
            hasActiveTurn: false,
            model: null,
            path: "/repo",
            projectId: "project_1",
            providerId: null,
            providerName: null,
            sessionId: "ses_1",
            status: "idle",
            title: "Existing chat",
            updatedAt: "2026-05-10T00:00:00.000Z",
          },
        ],
        runConnectorRuntimeSession: async (input) => {
          runCount += 1
          const attachment = {
            ...testAttachment(input),
            gatewayRuntimeAttachmentId: `gra_${runCount}`,
          }
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              if (envelope.type !== "event") {
                throw new Error("Expected live runtime event envelope.")
              }
              delivered.push({
                clientAttachmentId: `mda_${runCount}`,
                sequence: envelope.event.sequence,
                type: envelope.type,
              })
            },
            clientAttachmentId: `mda_${runCount}`,
          })
          return await new Promise<typeof attachment>((resolve, reject) => {
            if (runCount === 1) {
              rejectFirstRun = reject
            }
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        subscribeEvents: (_context, handler) => {
          const subscriptionId = `sub_${eventHandlers.length + 1}`
          eventHandlers.push(handler)
          return () => {
            unsubscribeCalls.push(subscriptionId)
          }
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({
      gatewayRuntimeAttachmentId: "gra_1",
      state: "online",
    })
    eventHandlers[0]?.({ properties: { sessionID: "ses_1" }, type: "session.created" })
    await waitFor(() => delivered.length === 1)

    rejectFirstRun?.({ remoteRuntimeRecovery: "reattach" })
    await waitFor(() => runCount === 2 && eventHandlers.length === 2)
    eventHandlers[0]?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    await flushQueuedEvents()
    eventHandlers[1]?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    await waitFor(() => delivered.length === 2)

    expect(unsubscribeCalls).toContain("sub_1")
    expect(delivered).toEqual([
      { clientAttachmentId: "mda_1", sequence: 1, type: "event" },
      { clientAttachmentId: "mda_2", sequence: 2, type: "event" },
    ])
    expect(manager.status()).toMatchObject([{ gatewayRuntimeAttachmentId: "gra_2", state: "online" }])
    await manager.stop()
  })

  test("resets runtime reattach backoff after a successful attachment", async () => {
    const delays: number[] = []
    let runCount = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      random: () => 0,
      sleep: async (milliseconds) => {
        if (milliseconds !== 25) {
          delays.push(milliseconds)
        }
      },
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          runCount += 1
          const attachment = {
            ...testAttachment(input),
            gatewayRuntimeAttachmentId: `gra_${runCount}`,
          }
          input.onAttachment(attachment)
          if (runCount < 3) {
            await new Promise((resolve) => setTimeout(resolve, 0))
            throw { remoteRuntimeRecovery: "reattach" as const }
          }
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
    await waitFor(() => runCount === 3)

    expect(delays).toEqual([1000, 1000])
    expect(manager.status()).toMatchObject([{ gatewayRuntimeAttachmentId: "gra_3", state: "online" }])
    await manager.stop()
  })

  test("returns an existing starting runtime snapshot for duplicate starts", async () => {
    let attach: ((input: ReturnType<typeof testAttachment>) => void) | undefined
    const waitSleep = deferred<void>()
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => await waitSleep.promise,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          attach = input.onAttachment
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    const firstStart = manager.start(startInput())
    await waitFor(() => attach !== undefined)
    expect(await manager.start(startInput())).toMatchObject({ state: "starting" })
    attach?.(
      testAttachment({
        attachmentInput: {
          accountId: "acct_1",
          connectorVersion: "1.2.3",
          directoryId: "dir_1",
          directoryPath: "/repo",
          requestId: "req_1",
          runtimeInstallationId: "rti_1",
          ticket: "ticket_1",
        },
      } as RemoteRuntimeConnectorSessionInput),
    )
    waitSleep.resolve()
    await expect(firstStart).resolves.toMatchObject({ state: "online" })
    await manager.stop()
  })

  test("handles connector completion, connector rejection before attach, and abort rejection", async () => {
    const completed = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return attachment
        },
      }),
    })
    await expect(completed.start(startInput())).resolves.toMatchObject({ state: "stopped" })
    expect(completed.status()).toEqual([])
    expect(completed.status({ runtimeInstallationId: "rti_1" })).toMatchObject([{ state: "stopped" }])

    const rejectedBeforeAttach = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async () => {
          throw new Error("connector failed before attach")
        },
      }),
    })
    await expect(rejectedBeforeAttach.start(startInput())).rejects.toThrow("connector failed before attach")

    const abortRejected = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((_resolve, reject) => {
            input.signal.addEventListener("abort", () => reject(new Error("aborted connector")), { once: true })
          })
        },
      }),
    })
    await expect(abortRejected.start(startInput())).resolves.toMatchObject({ state: "online" })
    await expect(abortRejected.stop()).resolves.toMatchObject([{ state: "stopped" }])

    const timedOut = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async () => await new Promise<ReturnType<typeof testAttachment>>(() => undefined),
      }),
    })
    await expect(timedOut.start(startInput())).rejects.toThrow(
      "Remote runtime connector did not attach before the local timeout.",
    )
  })

  test("refreshes an online runtime attachment when start is requested again", async () => {
    const abortedAttachments: string[] = []
    const startedAttachments: string[] = []
    let attachmentSequence = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          attachmentSequence += 1
          const attachment = {
            ...testAttachment(input),
            gatewayRuntimeAttachmentId: `gra_${attachmentSequence}`,
          } as const
          startedAttachments.push(attachment.gatewayRuntimeAttachmentId)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener(
              "abort",
              () => {
                abortedAttachments.push(attachment.gatewayRuntimeAttachmentId)
                resolve(attachment)
              },
              { once: true },
            )
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({
      gatewayRuntimeAttachmentId: "gra_1",
      state: "online",
    })
    await expect(manager.start(startInput())).resolves.toMatchObject({
      gatewayRuntimeAttachmentId: "gra_2",
      state: "online",
    })

    expect(startedAttachments).toEqual(["gra_1", "gra_2"])
    expect(abortedAttachments).toEqual(["gra_1"])
    expect(manager.status()).toMatchObject([
      {
        gatewayRuntimeAttachmentId: "gra_2",
        state: "online",
      },
    ])
    await manager.stop()
    expect(manager.status()).toEqual([])
    expect(manager.status({ runtimeInstallationId: "rti_1" })).toMatchObject([
      {
        gatewayRuntimeAttachmentId: "gra_2",
        state: "stopped",
      },
    ])
    await expect(manager.stop()).resolves.toEqual([])
  })

  test("expands prompt aliases for remote runtime session messages", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-aliases-"))
    const aliasesStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-aliases-state-"))
    const sentContents: string[] = []
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    try {
      const aliases = new PromptAliasesManager({
        store: new JsonFilePromptAliasesStore(path.join(aliasesStateDirectory, "prompt-aliases.json")),
        now: () => 1_765_000_000_000,
      })
      aliases.set("ship", "Ship the current diff")
      const manager = createRemoteRuntimeManager<{ directory: string }>({
        connectorVersion: "1.2.3",
        promptAliasesStateDirectory: aliasesStateDirectory,
        sleep: async () => undefined,
        deps: testDeps({
          runConnectorRuntimeSession: async (input) => {
            handlers = input.runtimeCommandHandlers
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
          listActiveChats: async () => [activeChatFixture("ses_1")],
          listSessionMessages: async (_context, payload) => ({
            messages: [
              {
                agent: null,
                completedAt: null,
                createdAt: "2026-05-10T00:00:00.000Z",
                errorMessage: null,
                errorName: null,
                finishReason: null,
                id: "msg_alias",
                model: null,
                parentId: null,
                parts: [
                  {
                    id: "part_alias",
                    kind: "text",
                    messageId: "msg_alias",
                    rawPart: { id: "part_alias", messageID: "msg_alias", text: "Ship the current diff", type: "text" },
                    status: null,
                    text: "Ship the current diff",
                    title: null,
                  },
                ],
                role: "user",
                sessionId: payload.sessionId,
              },
            ],
            pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
            sessionId: payload.sessionId,
          }),
          sendSessionMessage: async (_context, payload: RuntimeWebSocketSessionMessagePayload) => {
            sentContents.push(payload.input.content)
            return {
              message: {
                agent: null,
                completedAt: null,
                createdAt: "2026-05-10T00:00:00.000Z",
                errorMessage: null,
                errorName: null,
                finishReason: null,
                id: "msg_alias",
                model: null,
                parentId: null,
                parts: [
                  {
                    id: "part_alias",
                    kind: "text",
                    messageId: "msg_alias",
                    rawPart: { id: "part_alias", messageID: "msg_alias", text: payload.input.content, type: "text" },
                    status: null,
                    text: payload.input.content,
                    title: null,
                  },
                ],
                role: "user",
                sessionId: payload.sessionId,
              },
              sessionId: payload.sessionId,
            }
          },
        }),
      })

      await expect(
        manager.start({
          ...startInput(),
          directory,
        }),
      ).resolves.toMatchObject({ state: "online" })
      await expect(
        runHandler(
          handlers["session.message"],
          command("session.message", {
            input: { content: " ship " },
            sessionId: "ses_1",
          }),
        ),
      ).resolves.toMatchObject({
        message: { id: "msg_alias" },
        sessionId: "ses_1",
      })

      expect(sentContents).toEqual(["Ship the current diff"])
      await manager.stop()
    } finally {
      await rm(directory, { recursive: true, force: true })
      await rm(aliasesStateDirectory, { recursive: true, force: true })
    }
  })

  test("keeps only one active runtime per account", async () => {
    const abortedAttachments: string[] = []
    let attachmentSequence = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      sleep: async () => undefined,
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          attachmentSequence += 1
          const attachment = {
            ...testAttachment(input),
            gatewayRuntimeAttachmentId: `gra_${attachmentSequence}`,
          } as const
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener(
              "abort",
              () => {
                abortedAttachments.push(attachment.gatewayRuntimeAttachmentId)
                resolve(attachment)
              },
              { once: true },
            )
          })
        },
      }),
    })

    await expect(
      manager.start({
        ...startInput(),
        runtimeInstallationId: "rti_old",
      }),
    ).resolves.toMatchObject({
      gatewayRuntimeAttachmentId: "gra_1",
      runtimeInstallationId: "rti_old",
      state: "online",
    })
    await expect(
      manager.start({
        ...startInput(),
        directory: "/other-repo",
        directoryId: "dir_2",
        runtimeInstallationId: "rti_new",
      }),
    ).resolves.toMatchObject({
      allowedDirectories: [{ directoryId: "dir_2", path: "/other-repo" }],
      gatewayRuntimeAttachmentId: "gra_2",
      runtimeInstallationId: "rti_new",
      state: "online",
    })

    expect(abortedAttachments).toEqual(["gra_1"])
    expect(manager.status()).toMatchObject([
      {
        allowedDirectories: [{ directoryId: "dir_2", path: "/other-repo" }],
        gatewayRuntimeAttachmentId: "gra_2",
        runtimeInstallationId: "rti_new",
        state: "online",
      },
    ])
    expect(manager.status({ runtimeInstallationId: "rti_old" })).toMatchObject([
      {
        gatewayRuntimeAttachmentId: "gra_1",
        state: "stopped",
      },
    ])
    await manager.stop()
  })

  test("uses default timing dependencies while waiting for attachment", async () => {
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      deps: testDeps({
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          setTimeout(() => input.onAttachment(attachment), 0)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    await expect(manager.start(startInput())).resolves.toMatchObject({
      state: "online",
    })
    await manager.stop()
  })

  test("covers remote runtime selector and cursor edge paths", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    let eventHandler: ((event: RemoteRuntimeEventInput) => void) | undefined
    let deliveryAttempts = 0
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      maxRemoteRuntimeEventDeliveryFailures: 1,
      deps: testDeps({
        listActiveChats: async (context) => [activeChatFixture(`ses_${context.directory.replaceAll("/", "_")}`, context.directory)],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            clientAttachmentId: "mda_selector_edges",
            deliverRuntimeEnvelope: async () => {
              deliveryAttempts += 1
              throw new Error("delivery failed")
            },
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
        subscribeEvents: (_context, handler) => {
          eventHandler = handler
          return () => undefined
        },
      }),
    })

    await manager.start({
      ...startInput(),
      allowedDirectories: [
        { directoryId: "dir_1", path: "/repo" },
        { directoryId: "dir_2", path: "/repo" },
      ],
    })
    expect(manager.listRemoteRuntimeAliasesSnapshot({ directoryId: "dir_2", runtimeInstallationId: "rti_1" })).toMatchObject({
      runtimeInstallationId: "rti_1",
    })
    await expect(manager.listRemoteRuntimeActiveChats({ runtimeInstallationId: "rti_1" })).resolves.toMatchObject({
      activeChats: [expect.objectContaining({ path: "/repo", sessionId: "ses__repo" })],
    })
    await expect(
      runHandler(handlers["chat.start"], command("chat.start", { directoryId: "dir_2", title: "Duplicate path" })),
    ).rejects.toThrow("Remote runtime chat start must target this runtime attachment directory.")

    await waitFor(() => eventHandler !== undefined)
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    await waitFor(() => deliveryAttempts === 1)
    eventHandler?.({ properties: { sessionID: "ses_1" }, type: "session.updated" })
    await flushQueuedEvents()
    expect(deliveryAttempts).toBe(1)
    await manager.stop()

    expect(decodeRemoteRuntimeGoalCursor(encodeRemoteRuntimeGoalCursor({ threadId: "ses_goal_1", updatedAt: 200 }))).toEqual({
      threadId: "ses_goal_1",
      updatedAt: 200,
    })
    expect(() => decodeRemoteRuntimeGoalCursor("not-json")).toThrow("Goal cursor is not valid.")
  })

  test("supports remote runtime goal and alias parity flows", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-state-"))
    const aliasesStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-aliases-state-"))
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      goalStateDirectory,
      promptAliasesStateDirectory: aliasesStateDirectory,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_goal")],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
            },
            clientAttachmentId: "mda_goal_alias",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })

      await expect(
        manager.createRemoteRuntimeGoal({
          directoryId: "dir_1",
          input: { objective: "Ship parity", token_budget: 10 },
          sessionId: "ses_goal",
        }),
      ).resolves.toMatchObject({
        goal: { objective: "Ship parity", status: "active", threadId: "ses_goal", tokenBudget: 10, tokensUsed: 0 },
        remainingTokens: 10,
      })
      await expect(
        manager.getRemoteRuntimeGoal({ directoryId: "dir_1", sessionId: "ses_goal" }),
      ).resolves.toMatchObject({
        goal: { objective: "Ship parity", status: "active" },
      })
      await expect(manager.listRemoteRuntimeGoalsSnapshot({ directoryId: "dir_1" })).resolves.toMatchObject({
        goals: [expect.objectContaining({ objective: "Ship parity", status: "active" })],
        pageInfo: { hasOlder: false, olderCursor: null },
      })
      await expect(manager.listRemoteRuntimeGoals({ directoryId: "dir_1" })).resolves.toMatchObject({
        goals: [expect.objectContaining({ objective: "Ship parity", status: "active", threadId: "ses_goal" })],
        pageInfo: { hasOlder: false, olderCursor: null },
      })
      await expect(
        manager.pauseRemoteRuntimeGoal({ directoryId: "dir_1", sessionId: "ses_goal" }),
      ).resolves.toMatchObject({ goal: { status: "paused" } })
      await expect(
        manager.resumeRemoteRuntimeGoal({ directoryId: "dir_1", sessionId: "ses_goal" }),
      ).resolves.toMatchObject({ goal: { status: "active" } })
      await expect(
        manager.editRemoteRuntimeGoal({
          directoryId: "dir_1",
          input: { objective: "Ship stateful parity", token_budget: 12 },
          sessionId: "ses_goal",
        }),
      ).resolves.toMatchObject({
        goal: { objective: "Ship stateful parity", tokenBudget: 12 },
        remainingTokens: 12,
      })
      await expect(
        manager.updateRemoteRuntimeGoal({ directoryId: "dir_1", input: { status: "blocked" }, sessionId: "ses_goal" }),
      ).resolves.toMatchObject({ goal: { status: "blocked" } })
      await expect(manager.clearRemoteRuntimeGoal({ directoryId: "dir_1", sessionId: "ses_goal" })).resolves.toEqual({
        completionBudgetReport: null,
        goal: null,
        remainingTokens: null,
      })

      expect(manager.listRemoteRuntimeAliases({ directoryId: "dir_1" })).toEqual({ aliases: [] })
      expect(
        manager.setRemoteRuntimeAlias({ alias: "ship", directoryId: "dir_1", prompt: "Ship the diff" }),
      ).toMatchObject({ alias: { alias: "ship", prompt: "Ship the diff" } })
      expect(manager.listRemoteRuntimeAliasesSnapshot({ directoryId: "dir_1" })).toMatchObject({
        aliases: [expect.objectContaining({ alias: "ship", prompt: "Ship the diff" })],
      })
      expect(manager.getRemoteRuntimeAlias({ alias: "ship", directoryId: "dir_1" })).toMatchObject({
        alias: { alias: "ship", prompt: "Ship the diff" },
      })
      expect(manager.listRemoteRuntimeAliases({ directoryId: "dir_1" })).toMatchObject({
        aliases: [expect.objectContaining({ alias: "ship" })],
      })
      const directAliasEventCount = delivered.filter(
        (envelope) => envelope.type === "event" && envelope.event.eventType === "aliases.changed",
      ).length
      expect(manager.deleteRemoteRuntimeAlias({ alias: "ship", directoryId: "dir_1" })).toEqual({ deleted: true })
      await waitFor(
        () =>
          delivered.filter((envelope) => envelope.type === "event" && envelope.event.eventType === "aliases.changed")
            .length > directAliasEventCount,
      )
      expect(
        delivered
          .filter((envelope) => envelope.type === "event" && envelope.event.eventType === "aliases.changed")
          .at(-1),
      ).toMatchObject({
        event: {
          payload: {
            alias: null,
            invalidates: [{ kind: "aliases", runtimeInstallationId: "rti_1" }],
          },
        },
      })

      await expect(
        runHandler(
          handlers["goal.create"],
          command("goal.create", { input: { objective: "Finish review" }, sessionId: "ses_goal" }),
        ),
      ).resolves.toMatchObject({ goal: { objective: "Finish review", status: "active" } })
      await expect(
        runHandler(handlers["goal.get"], command("goal.get", { sessionId: "ses_goal" })),
      ).resolves.toMatchObject({ goal: { objective: "Finish review" } })
      await expect(runHandler(handlers["goal.list"], command("goal.list", {}))).resolves.toMatchObject({
        goals: [expect.objectContaining({ objective: "Finish review" })],
      })
      await expect(
        runHandler(handlers["goal.pause"], command("goal.pause", { sessionId: "ses_goal" })),
      ).resolves.toMatchObject({ goal: { status: "paused" } })
      await expect(
        runHandler(handlers["goal.resume"], command("goal.resume", { sessionId: "ses_goal" })),
      ).resolves.toMatchObject({ goal: { status: "active" } })
      await expect(
        runHandler(
          handlers["goal.edit"],
          command("goal.edit", {
            input: { objective: "Finish remote review", token_budget: 15 },
            sessionId: "ses_goal",
          }),
        ),
      ).resolves.toMatchObject({ goal: { objective: "Finish remote review", tokenBudget: 15 } })
      await expect(
        runHandler(
          handlers["goal.update"],
          command("goal.update", { input: { status: "complete" }, sessionId: "ses_goal" }),
        ),
      ).resolves.toMatchObject({ goal: { status: "complete" } })
      await expect(
        runHandler(
          handlers["goal.update"],
          command("goal.update", { input: { status: "blocked" }, sessionId: "ses_goal" }),
        ),
      ).resolves.toMatchObject({ goal: { status: "blocked" } })
      await expect(
        runHandler(handlers["goal.clear"], command("goal.clear", { sessionId: "ses_goal" })),
      ).resolves.toEqual({ completionBudgetReport: null, goal: null, remainingTokens: null })

      await expect(runHandler(handlers["alias.list"], command("alias.list", {}))).resolves.toEqual({ aliases: [] })
      await expect(
        runHandler(handlers["alias.set"], command("alias.set", { alias: "ship", prompt: "Ship the current diff" })),
      ).resolves.toMatchObject({ alias: { alias: "ship", prompt: "Ship the current diff" } })
      await expect(runHandler(handlers["alias.get"], command("alias.get", { alias: "ship" }))).resolves.toMatchObject({
        alias: { alias: "ship", prompt: "Ship the current diff" },
      })
      await expect(runHandler(handlers["alias.delete"], command("alias.delete", { alias: "ship" }))).resolves.toEqual({
        deleted: true,
      })

      expect(
        delivered.some(
          (envelope) =>
            envelope.type === "event" && (envelope.event as { eventType?: string }).eventType === "goals.changed",
        ),
      ).toBe(true)
      expect(
        delivered.some(
          (envelope) =>
            envelope.type === "event" && (envelope.event as { eventType?: string }).eventType === "aliases.changed",
        ),
      ).toBe(true)
      const goalChanged = delivered.find(
        (envelope) =>
          envelope.type === "event" && (envelope.event as { eventType?: string }).eventType === "goals.changed",
      )
      expect(goalChanged).toBeDefined()
      expect(goalChanged && goalChanged.type === "event" && goalChanged.event.payload).toMatchObject({
        invalidates: expect.arrayContaining([
          { kind: "goals", runtimeInstallationId: "rti_1" },
          { kind: "activeChats", runtimeInstallationId: "rti_1" },
          { kind: "chat", runtimeInstallationId: "rti_1", sessionId: "ses_goal" },
        ]),
      })
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { recursive: true, force: true })
      await rm(aliasesStateDirectory, { recursive: true, force: true })
    }
  })

  test("returns a clear error when a remote runtime chat projection cannot be found", async () => {
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      createBackendRouter: () => ({
        createConversation: async () => {
          throw new Error("not used")
        },
        listAgents: async () => ({ agents: [] }),
        listConversations: async () => [],
        listModels: async () => [],
        readConversation: async () => {
          throw new Error("missing conversation")
        },
        sendMessage: async () => ({ message: null, messageId: null }),
        updateConversationModel: async () => {
          throw new Error("not used")
        },
      }),
      deps: testDeps({
        listActiveChats: async () => [],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(manager.readRemoteRuntimeChat({ directoryId: "dir_1", sessionId: "ses_missing" })).rejects.toThrow(
        "Remote runtime chat ses_missing was not found.",
      )
    } finally {
      await manager.stop()
    }
  })

  test("preserves backend read failures instead of collapsing them into not found", async () => {
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      createBackendRouter: () => ({
        createConversation: async () => {
          throw new Error("not used")
        },
        listAgents: async () => ({ agents: [] }),
        listConversations: async () => [activeChatFixture("ses_broken")],
        listModels: async () => [],
        readConversation: async () => {
          throw new Error("backend exploded")
        },
        sendMessage: async () => ({ message: null, messageId: null }),
        updateConversationModel: async () => {
          throw new Error("not used")
        },
      }),
      deps: testDeps({
        listActiveChats: async () => [],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(manager.readRemoteRuntimeChat({ directoryId: "dir_1", sessionId: "ses_broken" })).rejects.toThrow(
        "backend exploded",
      )
    } finally {
      await manager.stop()
    }
  })

  test("pages remote runtime goals with opaque older cursors", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-page-state-"))
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      goalStateDirectory,
      deps: testDeps({
        listActiveChats: async () => [
          activeChatFixture("ses_goal_c"),
          activeChatFixture("ses_goal_b"),
          activeChatFixture("ses_goal_a"),
        ],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      for (const sessionId of ["ses_goal_a", "ses_goal_b", "ses_goal_c"]) {
        await manager.createRemoteRuntimeGoal({
          directoryId: "dir_1",
          input: { objective: `Goal ${sessionId}` },
          sessionId,
        })
      }

      const firstPage = await manager.listRemoteRuntimeGoalsSnapshot({ directoryId: "dir_1", limit: 2 })
      expect(firstPage.goals).toHaveLength(2)
      expect(firstPage.pageInfo.hasOlder).toBe(true)
      expect(firstPage.pageInfo.olderCursor).toBeTruthy()

      const secondPage = await manager.listRemoteRuntimeGoalsSnapshot({
        cursor: firstPage.pageInfo.olderCursor,
        directoryId: "dir_1",
        limit: 2,
      })
      expect(secondPage.goals).toHaveLength(1)
      expect(secondPage.goals.map((goal) => goal.threadId)).not.toContain(firstPage.goals[0]?.threadId)
      expect(secondPage.goals.map((goal) => goal.threadId)).not.toContain(firstPage.goals[1]?.threadId)
      expect(secondPage.pageInfo).toEqual({ hasOlder: false, olderCursor: null })
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { force: true, recursive: true })
    }
  })

  test("rejects orphan remote runtime goal creation for unknown sessions", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-orphan-state-"))
    const aliasesStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-aliases-orphan-state-"))
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      goalStateDirectory,
      promptAliasesStateDirectory: aliasesStateDirectory,
      deps: testDeps({
        listActiveChats: async () => [],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(
        manager.createRemoteRuntimeGoal({
          directoryId: "dir_1",
          input: { objective: "orphan" },
          sessionId: "ses_missing",
        }),
      ).rejects.toThrow("Remote runtime chat ses_missing was not found.")
      await expect(manager.clearRemoteRuntimeGoal({ directoryId: "dir_1", sessionId: "ses_missing" })).rejects.toThrow(
        "Remote runtime chat ses_missing was not found.",
      )
      await expect(
        runHandler(
          handlers["goal.create"],
          command("goal.create", { input: { objective: "orphan" }, sessionId: "ses_missing" }),
        ),
      ).rejects.toThrow("Remote runtime chat ses_missing was not found.")
      await expect(
        runHandler(handlers["goal.clear"], command("goal.clear", { sessionId: "ses_missing" })),
      ).rejects.toThrow("Remote runtime chat ses_missing was not found.")
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { recursive: true, force: true })
      await rm(aliasesStateDirectory, { recursive: true, force: true })
    }
  })

  test("accepts goal creation when routing metadata proves session authority", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-route-state-"))
    const routingMetadata = createMemoryRoutingMetadataStore()
    await routingMetadata.put({
      backendConversationId: "backend_goal",
      backendId: "codex",
      conversationId: "ses_routed",
      createdAt: "2026-05-10T00:00:00.000Z",
      directory: "/repo",
      title: "Routed",
      updatedAt: "2026-05-10T00:00:00.000Z",
    })
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      goalStateDirectory,
      routingMetadataStore: routingMetadata,
      deps: testDeps({
        listActiveChats: async () => [],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(
        manager.createRemoteRuntimeGoal({
          directoryId: "dir_1",
          input: { objective: "Routed goal" },
          sessionId: "ses_routed",
        }),
      ).resolves.toMatchObject({ goal: { objective: "Routed goal" } })
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { recursive: true, force: true })
    }
  })

  test("treats stale non-interbase routing metadata without a live conversation as not found", async () => {
    const routingMetadata = createMemoryRoutingMetadataStore()
    await routingMetadata.put({
      backendConversationId: "backend_stale",
      backendId: "codex",
      conversationId: "ses_stale",
      createdAt: "2026-05-10T00:00:00.000Z",
      directory: "/repo",
      title: "Stale",
      updatedAt: "2026-05-10T00:00:00.000Z",
    })
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      routingMetadataStore: routingMetadata,
      createBackendRouter: () => ({
        createConversation: async () => {
          throw new Error("not used")
        },
        listAgents: async () => ({ agents: [] }),
        listConversations: async () => [],
        listModels: async () => [],
        readConversation: async () => {
          throw new Error("should not read stale route")
        },
        sendMessage: async () => ({ message: null, messageId: null }),
        updateConversationModel: async () => {
          throw new Error("not used")
        },
      }),
      deps: testDeps({
        listActiveChats: async () => [],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(manager.readRemoteRuntimeChat({ directoryId: "dir_1", sessionId: "ses_stale" })).rejects.toThrow(
        "Remote runtime chat ses_stale was not found.",
      )
    } finally {
      await manager.stop()
    }
  })

  test("propagates non-Error missing conversation failures", async () => {
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      createBackendRouter: () => ({
        createConversation: async () => {
          throw new Error("not used")
        },
        listAgents: async () => ({ agents: [] }),
        listConversations: async () => [],
        listModels: async () => [],
        readConversation: async () => {
          throw "string failure"
        },
        sendMessage: async () => ({ message: null, messageId: null }),
        updateConversationModel: async () => {
          throw new Error("not used")
        },
      }),
      deps: testDeps({
        listActiveChats: async () => [],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(manager.readRemoteRuntimeChat({ directoryId: "dir_1", sessionId: "ses_string" })).rejects.toBe(
        "string failure",
      )
    } finally {
      await manager.stop()
    }
  })

  test("fails goal creation clearly when the remote runtime project context is missing", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-no-context-state-"))
    const manager = createRemoteRuntimeManager<undefined>({
      connectorVersion: "1.2.3",
      goalStateDirectory,
      deps: {
        ...testDeps({
          listActiveChats: async () => [],
          runConnectorRuntimeSession: async (input) => {
            const attachment = testAttachment(input)
            input.onAttachment(attachment)
            return await new Promise<typeof attachment>((resolve) => {
              input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
            })
          },
        }),
        loadContext: async () => undefined,
      },
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(
        manager.createRemoteRuntimeGoal({
          directoryId: "dir_1",
          input: { objective: "no context" },
          sessionId: "ses_missing",
        }),
      ).rejects.toThrow("Remote runtime is not connected to a project instance.")
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { recursive: true, force: true })
    }
  })

  test("aligns supported methods and execution with reduced goal and alias feature capabilities", async () => {
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      featureCapabilities: [
        "remoteRuntime.http.activeChats",
        "remoteRuntime.http.chatDetail",
        "remoteRuntime.http.chatMessages",
        "remoteRuntime.http.providers",
        "remoteRuntime.http.runtimeDirectories",
        "remoteRuntime.http.runtimeStatus",
        "remoteRuntime.http.startChat",
        "remoteRuntime.http.sendMessage",
        "remoteRuntime.http.updateChat",
        "remoteRuntime.alias.list",
        "remoteRuntime.alias.read",
        "remoteRuntime.websocket.realtimeEvents",
        "remoteRuntime.websocket.streamDeltas",
      ],
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_feature")],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      expect(manager.runtimeCapabilitiesSnapshot({ directoryId: "dir_1" })).toMatchObject({
        featureCapabilities: expect.not.arrayContaining(["remoteRuntime.goal.read", "remoteRuntime.alias.mutate"]),
        supportedMethods: expect.not.arrayContaining(["goal.get", "goal.create", "alias.set", "alias.delete"]),
      })
      await expect(
        runHandler(handlers.initialize, {
          method: "initialize",
          payload: {
            clientName: "Interbase iOS",
            clientVersion: "0.1.0",
            supportedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
          },
          protocolVersion: runtimeWebSocketProtocolVersion,
          requestId: "req_initialize_feature",
        } as RemoteRuntimeProtocolClientCommand),
      ).resolves.toMatchObject({
        featureCapabilities: expect.not.arrayContaining(["remoteRuntime.goal.read", "remoteRuntime.alias.mutate"]),
        supportedMethods: expect.not.arrayContaining(["goal.get", "goal.create", "alias.set", "alias.delete"]),
      })
      expect(handlers["goal.get"]).toBeUndefined()
      expect(handlers["alias.set"]).toBeUndefined()
      await expect(manager.getRemoteRuntimeGoal({ directoryId: "dir_1", sessionId: "ses_feature" })).rejects.toThrow(
        "Remote runtime capability remoteRuntime.goal.read is not enabled.",
      )
      expect(() =>
        manager.setRemoteRuntimeAlias({ alias: "ship", directoryId: "dir_1", prompt: "Ship the diff" }),
      ).toThrow("Remote runtime capability remoteRuntime.alias.mutate is not enabled.")
    } finally {
      await manager.stop()
    }
  })

  test("does not embed goal state in chat/session projections when goal read and list capabilities are disabled", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-hidden-state-"))
    const goalStore = new JsonFileGoalStore(path.join(goalStateDirectory, "goals.json"))
    goalStore.set({
      budgetLimitReported: false,
      createdAt: 1,
      goalId: "goal_hidden",
      objective: "Hidden goal",
      status: "active",
      threadId: "ses_hidden",
      timeUsedSeconds: 0,
      tokenBudget: null,
      tokensUsed: 0,
      updatedAt: 1,
    })
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      featureCapabilities: [
        "remoteRuntime.http.activeChats",
        "remoteRuntime.http.chatDetail",
        "remoteRuntime.http.chatMessages",
        "remoteRuntime.http.providers",
        "remoteRuntime.http.runtimeDirectories",
        "remoteRuntime.http.runtimeStatus",
        "remoteRuntime.http.startChat",
        "remoteRuntime.http.sendMessage",
        "remoteRuntime.http.updateChat",
        "remoteRuntime.websocket.realtimeEvents",
        "remoteRuntime.websocket.streamDeltas",
      ],
      goalStateDirectory,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_hidden")],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(runHandler(handlers["activeChats.list"], command("activeChats.list", {}))).resolves.toMatchObject({
        activeChats: [expect.not.objectContaining({ goal: expect.anything() })],
      })
      await expect(
        runHandler(handlers["session.read"], command("session.read", { sessionId: "ses_hidden" })),
      ).resolves.toMatchObject({
        chat: expect.not.objectContaining({ goal: expect.anything() }),
      })
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { recursive: true, force: true })
    }
  })

  test("embeds goal state in chat/session projections when goal read and list capabilities are enabled", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-visible-state-"))
    const goalStore = new JsonFileGoalStore(path.join(goalStateDirectory, "goals.json"))
    goalStore.set({
      budgetLimitReported: false,
      createdAt: 1,
      goalId: "goal_visible",
      objective: "Visible goal",
      status: "active",
      threadId: "ses_visible",
      timeUsedSeconds: 0,
      tokenBudget: 25,
      tokensUsed: 5,
      updatedAt: 1,
    })
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      goalStateDirectory,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_visible")],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(runHandler(handlers["activeChats.list"], command("activeChats.list", {}))).resolves.toMatchObject({
        activeChats: [
          expect.objectContaining({
            goal: expect.objectContaining({
              objective: "Visible goal",
              status: "active",
              tokenBudget: 25,
              tokensUsed: 5,
            }),
          }),
        ],
      })
      await expect(
        runHandler(handlers["session.read"], command("session.read", { sessionId: "ses_visible" })),
      ).resolves.toMatchObject({
        chat: expect.objectContaining({
          goal: expect.objectContaining({
            objective: "Visible goal",
            status: "active",
            tokenBudget: 25,
            tokensUsed: 5,
          }),
        }),
      })
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { recursive: true, force: true })
    }
  })

  test("publishes goal and alias standalone events for host-local state changes", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-host-local-state-"))
    const aliasesStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-aliases-host-local-state-"))
    const delivered: RuntimeWebSocketServerEnvelope[] = []
    const localGoals = new ThreadGoalManager({
      id: () => "goal_local",
      now: () => 1_000,
      store: new JsonFileGoalStore(path.join(goalStateDirectory, "goals.json")),
    })
    const localAliases = new PromptAliasesManager({
      now: () => 1_000,
      store: new JsonFilePromptAliasesStore(path.join(aliasesStateDirectory, "prompt-aliases.json")),
    })
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      goalStateDirectory,
      promptAliasesStateDirectory: aliasesStateDirectory,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_host_local")],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          await input.onRemoteRuntimeClientAttachment({
            attachment,
            deliverRuntimeEnvelope: async (envelope) => {
              delivered.push(envelope)
            },
            clientAttachmentId: "mda_host_local",
          })
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })

      localGoals.createGoal("ses_host_local", "Mirror host-local goal", 9)
      await waitFor(() =>
        delivered.some((envelope) => envelope.type === "event" && envelope.event.eventType === "goals.changed"),
      )
      expect(
        delivered.find((envelope) => envelope.type === "event" && envelope.event.eventType === "goals.changed"),
      ).toMatchObject({
        event: {
          payload: {
            goal: expect.objectContaining({ objective: "Mirror host-local goal", status: "active", tokenBudget: 9 }),
            invalidates: expect.arrayContaining([
              { kind: "goals", runtimeInstallationId: "rti_1" },
              { kind: "activeChats", runtimeInstallationId: "rti_1" },
              { kind: "chat", runtimeInstallationId: "rti_1", sessionId: "ses_host_local" },
            ]),
            sessionId: "ses_host_local",
          },
        },
      })
      expect(
        delivered.some(
          (envelope) =>
            envelope.type === "event" &&
            envelope.event.eventType === "session.updated" &&
            envelope.event.payload.activeChat?.goal?.objective === "Mirror host-local goal",
        ),
      ).toBe(true)

      localAliases.set("ShipReview", "Review the host-local alias")
      await waitFor(() =>
        delivered.some((envelope) => envelope.type === "event" && envelope.event.eventType === "aliases.changed"),
      )
      expect(
        delivered.find((envelope) => envelope.type === "event" && envelope.event.eventType === "aliases.changed"),
      ).toMatchObject({
        event: {
          payload: {
            alias: expect.objectContaining({ alias: "ShipReview", prompt: "Review the host-local alias" }),
          },
        },
      })

      const aliasChangedCount = delivered.filter(
        (envelope) => envelope.type === "event" && envelope.event.eventType === "aliases.changed",
      ).length
      localAliases.set("ShipReview", "Review the updated host-local alias")
      await waitFor(
        () =>
          delivered.filter((envelope) => envelope.type === "event" && envelope.event.eventType === "aliases.changed")
            .length > aliasChangedCount,
      )
      expect(
        delivered
          .filter((envelope) => envelope.type === "event" && envelope.event.eventType === "aliases.changed")
          .at(-1),
      ).toMatchObject({
        event: {
          payload: {
            alias: expect.objectContaining({ alias: "ShipReview", prompt: "Review the updated host-local alias" }),
          },
        },
      })
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { recursive: true, force: true })
      await rm(aliasesStateDirectory, { recursive: true, force: true })
    }
  })

  test("preserves local alias validation and casing through the remote runtime alias surface", async () => {
    const aliasesStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-aliases-shared-authority-state-"))
    let handlers: Partial<Record<RemoteRuntimeProtocolClientMethod, RemoteRuntimeCommandHandler>> = {}
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      promptAliasesStateDirectory: aliasesStateDirectory,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_aliases")],
        runConnectorRuntimeSession: async (input) => {
          handlers = input.runtimeCommandHandlers
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      expect(
        manager.setRemoteRuntimeAlias({ alias: "ShipReview", directoryId: "dir_1", prompt: "Review the staged diff" }),
      ).toMatchObject({
        alias: { alias: "ShipReview", prompt: "Review the staged diff" },
      })
      expect(() =>
        manager.setRemoteRuntimeAlias({ alias: "ship review", directoryId: "dir_1", prompt: "Bad alias" }),
      ).toThrow("Alias cannot contain spaces.")
      expect(() =>
        manager.setRemoteRuntimeAlias({ alias: "/ship", directoryId: "dir_1", prompt: "Bad alias" }),
      ).toThrow("Alias cannot start with /.")
      await expect(
        runHandler(handlers["alias.get"], command("alias.get", { alias: "ShipReview" })),
      ).resolves.toMatchObject({
        alias: { alias: "ShipReview", prompt: "Review the staged diff" },
      })
      await expect(
        runHandler(handlers["alias.set"], command("alias.set", { alias: "ship review", prompt: "Bad alias" })),
      ).rejects.toThrow("Alias cannot contain spaces.")
    } finally {
      await manager.stop()
      await rm(aliasesStateDirectory, { recursive: true, force: true })
    }
  })

  test("permits goal and alias mutations when no remote runtime subscribers are attached", async () => {
    const goalStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-goals-empty-state-"))
    const aliasesStateDirectory = await mkdtemp(path.join(tmpdir(), "interbase-mobile-aliases-empty-state-"))
    const manager = createRemoteRuntimeManager<{ directory: string }>({
      connectorVersion: "1.2.3",
      goalStateDirectory,
      promptAliasesStateDirectory: aliasesStateDirectory,
      deps: testDeps({
        listActiveChats: async () => [activeChatFixture("ses_solo")],
        runConnectorRuntimeSession: async (input) => {
          const attachment = testAttachment(input)
          input.onAttachment(attachment)
          return await new Promise<typeof attachment>((resolve) => {
            input.signal.addEventListener("abort", () => resolve(attachment), { once: true })
          })
        },
      }),
    })

    try {
      await expect(manager.start(startInput())).resolves.toMatchObject({ state: "online" })
      await expect(
        manager.createRemoteRuntimeGoal({
          directoryId: "dir_1",
          input: { objective: "Solo goal" },
          sessionId: "ses_solo",
        }),
      ).resolves.toMatchObject({ goal: { objective: "Solo goal" } })
      expect(
        manager.setRemoteRuntimeAlias({ alias: "solo", directoryId: "dir_1", prompt: "Solo alias" }),
      ).toMatchObject({ alias: { alias: "solo", prompt: "Solo alias" } })
    } finally {
      await manager.stop()
      await rm(goalStateDirectory, { recursive: true, force: true })
      await rm(aliasesStateDirectory, { recursive: true, force: true })
    }
  })
})

function command(method: RemoteRuntimeProtocolClientMethod, payload: unknown): RemoteRuntimeProtocolClientCommand {
  return {
    method,
    payload,
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: `req_${method}`,
  } as RemoteRuntimeProtocolClientCommand
}

async function runHandler(handler: RemoteRuntimeCommandHandler | undefined, input: RemoteRuntimeProtocolClientCommand) {
  if (!handler) throw new Error(`Missing handler for ${input.method}`)
  return await handler(input)
}

function startInput() {
  return {
    accountId: "acct_1",
    apiBaseUrl: "https://api.interbase.test",
    authorizationToken: "token_1",
    directory: "/repo",
    directoryId: "dir_1",
    runtimeInstallationId: "rti_1",
  }
}

function activeChatFixture(sessionId: string, directory = "/repo") {
  return {
    agent: null,
    createdAt: "2026-05-10T00:00:00.000Z",
    hasActiveTurn: false,
    model: null,
    path: directory,
    projectId: "project_1",
    providerId: null,
    providerName: null,
    sessionId,
    status: "idle" as const,
    title: `Chat ${sessionId}`,
    updatedAt: "2026-05-10T00:00:00.000Z",
  }
}

function pagedActiveChats(
  activeChats: ReturnType<typeof activeChatFixture>[],
  payload?: RemoteRuntimeActiveChatsListPayload,
) {
  const cursor = payload?.cursor ? JSON.parse(Buffer.from(payload.cursor, "base64url").toString("utf8")) : null
  const offset =
    isRecord(cursor) && typeof cursor.offset === "number" && Number.isSafeInteger(cursor.offset) && cursor.offset >= 0
      ? cursor.offset
      : 0
  const limit = Math.min(Math.max(payload?.limit ?? 25, 1), 100)
  return activeChats.slice(offset, offset + limit + 1)
}

function signedAttachAction(input: {
  accountId?: string
  requestId: string
  runtimeInstallationId?: string
  trustedRuntimeClientId?: string
}) {
  return {
    payload: {
      accountId: input.accountId ?? "acct_1",
      deviceTrustLevel: "trusted",
      protocolVersion: remoteRuntimeTransportProtocolVersion,
      requestId: input.requestId,
      runtimeInstallationId: input.runtimeInstallationId ?? "rti_1",
      ticket: "ticket_1",
      trustedRuntimeClientId: input.trustedRuntimeClientId ?? "tmd_1",
    },
    proof: {
      algorithm: "ed25519",
      keyId: "mk_1",
      nonce: "nonce_1",
      payloadSha256: "payload_hash_1",
      signature: "sig_1",
      timestamp: "2026-05-10T00:00:00.000Z",
    },
    protocolVersion: remoteRuntimeTransportProtocolVersion,
    sequence: 1,
    sessionNonce: "session_nonce_1",
    type: "remoteRuntime.websocket.action",
  } as const
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function testAttachment(input: RemoteRuntimeConnectorSessionInput) {
  return {
    accountId: input.attachmentInput.accountId,
    attachmentCapabilities: [],
    connectorVersion: input.attachmentInput.connectorVersion,
    deviceTrustLevel: "trusted",
    directoryId: input.attachmentInput.directoryId,
    directoryPath: input.attachmentInput.directoryPath,
    gatewayRuntimeAttachmentId: "gra_1",
    protocolVersion: "0.1.0",
    requestId: input.attachmentInput.requestId,
    runtimeInstallationId: input.attachmentInput.runtimeInstallationId,
    status: "online",
  } as const
}

function testDeps(
  overrides: Partial<{
    listActiveChats: NonNullable<
      Parameters<typeof createRemoteRuntimeManager<{ directory: string }>>[0]["deps"]["listActiveChats"]
    >
    listGoals: NonNullable<
      Parameters<typeof createRemoteRuntimeManager<{ directory: string }>>[0]["deps"]["listGoals"]
    >
    readGitStatus: NonNullable<
      Parameters<typeof createRemoteRuntimeManager<{ directory: string }>>[0]["deps"]["readGitStatus"]
    >
    listSessionMessages: NonNullable<
      Parameters<typeof createRemoteRuntimeManager<{ directory: string }>>[0]["deps"]["listSessionMessages"]
    >
    projectActiveChat: NonNullable<
      Parameters<typeof createRemoteRuntimeManager<{ directory: string }>>[0]["deps"]["projectActiveChat"]
    >
    runConnectorRuntimeSession(input: RemoteRuntimeConnectorSessionInput): Promise<ReturnType<typeof testAttachment>>
    sendSessionMessage: NonNullable<
      Parameters<typeof createRemoteRuntimeManager<{ directory: string }>>[0]["deps"]["sendSessionMessage"]
    >
    subscribeEvents: NonNullable<
      Parameters<typeof createRemoteRuntimeManager<{ directory: string }>>[0]["deps"]["subscribeEvents"]
    >
  }>,
) {
  return {
    issueRuntimeAttachmentTicket: async () => ({ ticket: "ticket_1" }),
    runConnectorRuntimeSession: overrides.runConnectorRuntimeSession ?? (async (input) => testAttachment(input)),
    loadContext: async (input: { directory: string }) => ({ directory: input.directory }),
    disposeContext: async () => undefined,
    listActiveChats: overrides.listActiveChats ?? (async () => []),
    ...(overrides.listGoals ? { listGoals: overrides.listGoals } : {}),
    ...(overrides.readGitStatus ? { readGitStatus: overrides.readGitStatus } : {}),
    listProviders: async () => ({ all: [], connected: [], default: {} }),
    ...(overrides.projectActiveChat ? { projectActiveChat: overrides.projectActiveChat } : {}),
    listSessionMessages:
      overrides.listSessionMessages ??
      (async () => ({
        messages: [],
        pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
        sessionId: "ses_1",
      })),
    sendSessionMessage:
      overrides.sendSessionMessage ??
      (async () => {
        throw new Error("not used")
      }),
    startChat: async () => {
      throw new Error("not used")
    },
    updateSession: async () => {
      throw new Error("not used")
    },
    subscribeEvents: overrides.subscribeEvents ?? (() => () => undefined),
  }
}

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, reject, resolve }
}

async function flushQueuedEvents() {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function waitFor(check: () => boolean, attempts = 20) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (check()) {
      return
    }
    await flushQueuedEvents()
  }
  throw new Error("Timed out waiting for queued events.")
}
