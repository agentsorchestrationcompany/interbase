import { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { describe, expect, mock, test } from "bun:test"
import { LocalStateError } from "@interbase/cli-local-state"
import {
  createClaudeAdapter,
  createCodexAdapter,
  createInterbaseRuntimeAdapter,
  createLocalAgentBackendRegistry,
  createLocalAgentBackendRouter,
  createMemoryRoutingMetadataStore,
  createJsonRoutingMetadataStore,
  isLocalBackendId,
  localConversationDetailToRuntimeMessages,
  localConversationToRuntimeChat,
  localEventToRemoteRuntimeEvent,
  listCodexConversations,
  localModelsToRuntimeProviderList,
  mergeRuntimeProviderLists,
  readCodexThreadMessages,
  runtimeChatToLocalConversation,
  type ClaudeSdkClient,
  type CodexSdkClient,
} from "../src/index.js"
import { authContentAnthropicEntry, authInfoToClaudeAuth } from "../scripts/claude-live-smoke.ts"

describe("local agent backend authority", () => {
  test("routes through explicit metadata and rejects unknown backend ids", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-codex-"))
    const routingMetadata = createMemoryRoutingMetadataStore()
    const interbase = testInterbaseAdapter()
    const timestamps = [
      "2026-05-12T00:00:00.000Z",
      "2026-05-12T00:00:01.000Z",
      "2026-05-12T00:00:02.000Z",
      "2026-05-12T00:00:03.000Z",
    ]
    const codex = createCodexAdapter({
      codexHome: root,
      createClient: () => testCodexClient(),
      now: () => timestamps.shift() ?? "2026-05-12T00:00:04.000Z",
    })
    const registry = createLocalAgentBackendRegistry({
      backends: [interbase, codex, createClaudeAdapter({ createClient: () => testClaudeClient() })],
      routingMetadata,
    })
    const router = createLocalAgentBackendRouter({ registry, routingMetadata })

    await expect(() => registry.get("missing" as never)).toThrow("Unknown local agent backend")
    await expect(
      router.createConversation({
        context: { directory: "/repo" },
        directory: "/repo",
        model: "codex",
        providerId: "codex",
        title: "Codex task",
      }),
    ).resolves.toMatchObject({ backendId: "codex", id: "codex_thread_1" })
    await expect(routingMetadata.get({ conversationId: "codex_thread_1", directory: "/repo" })).resolves.toMatchObject({
      backendId: "codex",
      backendConversationId: "codex_thread_1",
    })
    await expect(
      router.sendMessage({
        context: { directory: "/repo" },
        content: "Implement it",
        conversationId: "codex_thread_1",
        directory: "/repo",
      }),
    ).resolves.toMatchObject({
      message: { parts: [{ text: "done" }], role: "assistant" },
      messageId: "codex_thread_1:latest",
    })
    await expect(routingMetadata.get({ conversationId: "codex_thread_1", directory: "/repo" })).resolves.toMatchObject({
      createdAt: "2026-05-12T00:00:00.000Z",
      updatedAt: "2026-05-12T00:00:02.000Z",
    })
    await expect(router.listConversations({ context: { directory: "/repo" }, directory: "/repo" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backendId: "codex", id: "codex_thread_1" }),
        expect.objectContaining({ backendId: "interbaseRuntime", id: "ses_interbase" }),
      ]),
    )
    await expect(router.listModels({ context: { directory: "/repo" }, directory: "/repo" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backendId: "codex" }),
        expect.objectContaining({ backendId: "interbaseRuntime" }),
      ]),
    )
    await expect(router.listAgents({ context: { directory: "/repo" }, directory: "/repo" })).resolves.toMatchObject({
      agents: expect.arrayContaining([
        expect.objectContaining({ agentId: "interbaseRuntime", available: true, displayName: "Interbase" }),
        expect.objectContaining({ agentId: "codex", available: true, displayName: "Codex" }),
      ]),
    })
    await expect(
      router.readConversation({
        context: { directory: "/repo" },
        conversationId: "ses_interbase",
        directory: "/repo",
      }),
    ).resolves.toMatchObject({ backendId: "interbaseRuntime", id: "ses_interbase" })
    await rm(root, { force: true, recursive: true })
  })

  test("interbase adapter preserves existing runtime projection behavior", async () => {
    const adapter = testInterbaseAdapter()

    await expect(adapter.listConversations({ context: { directory: "/repo" }, directory: "/repo" })).resolves.toEqual([
      expect.objectContaining({ backendId: "interbaseRuntime", id: "ses_interbase" }),
    ])
    await expect(
      adapter.createConversation({
        context: { directory: "/repo" },
        directory: "/repo",
        directoryId: "dir_1",
        model: "claude-sonnet-4.5",
        providerId: "anthropic",
        title: "New chat",
      }),
    ).resolves.toMatchObject({ id: "ses_new", model: "claude-sonnet-4.5" })
    await expect(
      adapter.readConversation({
        context: { directory: "/repo" },
        conversationId: "ses_interbase",
        directory: "/repo",
      }),
    ).resolves.toMatchObject({
      messages: [expect.objectContaining({ id: "msg_interbase", role: "assistant" })],
    })
    await expect(
      adapter.sendMessage({
        context: { directory: "/repo" },
        content: "hello",
        conversationId: "ses_interbase",
        directory: "/repo",
      }),
    ).resolves.toMatchObject({ message: { id: "msg_sent" }, messageId: "msg_sent" })
    await expect(
      adapter.updateConversationModel?.({
        context: { directory: "/repo" },
        conversationId: "ses_interbase",
        directory: "/repo",
        model: "gpt-5.4",
        providerId: "openai",
      }),
    ).resolves.toMatchObject({ id: "ses_interbase", model: "gpt-5.4" })
    await expect(adapter.listModels({ directory: "/repo" })).rejects.toThrow(
      "interbaseRuntime does not support provider model listing without runtime context",
    )
    await expect(
      adapter
        .streamConversation({
          context: { directory: "/repo" },
          conversationId: "ses_interbase",
          directory: "/repo",
        })
        .next(),
    ).rejects.toThrow(
      "interbaseRuntime does not support direct backend streaming; remote runtime event subscriptions provide live updates",
    )
  })

  test("normalizes provider lists, conversations, messages, and codex stream events", async () => {
    const codex = createCodexAdapter({ createClient: () => testCodexClient(), now: () => "2026-05-12T00:00:00.000Z" })
    const stream: unknown[] = []
    for await (const event of codex.streamConversation({
      context: {},
      conversationId: "codex_thread_1",
      directory: "/repo",
    })) {
      stream.push(event)
    }

    expect(stream).toEqual([
      expect.objectContaining({ textDelta: "Hi", type: "message.delta" }),
      expect.objectContaining({ type: "message.completed" }),
      expect.objectContaining({ type: "turn.completed" }),
    ])
    const defaultEvents: unknown[] = []
    for await (const event of createCodexAdapter({
      createClient: () => ({
        resumeThread: () => ({
          async run() {
            return {}
          },
          async runStreamed() {
            return {
              events: (async function* () {
                yield { type: "other" }
              })(),
            }
          },
          threadId: "codex_thread_1",
        }),
        startThread: () => testCodexClient().startThread(),
      }),
    }).streamConversation({ context: {}, conversationId: "codex_thread_1", directory: "/repo" })) {
      defaultEvents.push(event)
    }
    expect(defaultEvents).toEqual([expect.objectContaining({ type: "conversation.updated" })])
    expect(
      localConversationToRuntimeChat(
        {
          backendConversationId: "codex_thread_1",
          backendId: "codex",
          createdAt: "2026-05-12T00:00:00.000Z",
          hasActiveTurn: false,
          id: "codex_thread_1",
          model: "codex",
          providerId: "codex",
          providerName: "Codex",
          status: "running",
          title: "Codex",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
        "/repo",
      ),
    ).toMatchObject({ agent: "Codex", hasActiveTurn: false, sessionId: "codex_thread_1" })
    expect(
      localConversationToRuntimeChat(
        {
          backendConversationId: "codex_thread_2",
          backendId: "codex",
          createdAt: "2026-05-12T00:00:00.000Z",
          id: "codex_thread_2",
          model: "codex",
          providerId: "codex",
          providerName: "Codex",
          status: "running",
          title: "Running without active turn authority",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
        "/repo",
      ),
    ).toMatchObject({ hasActiveTurn: null, sessionId: "codex_thread_2", status: "running" })
    expect(
      localConversationToRuntimeChat(
        runtimeChatToLocalConversation({
          agent: null,
          createdAt: "2026-05-12T00:00:00.000Z",
          hasActiveTurn: false,
          lastText: null,
          messageCount: null,
          model: "gpt-5.4",
          path: "/repo",
          projectId: "/repo",
          providerId: "openai",
          providerName: "OpenAI",
          sessionId: "ses_running",
          status: "running",
          title: "Running but idle turn",
          updatedAt: "2026-05-12T00:00:01.000Z",
        }),
        "/repo",
      ),
    ).toMatchObject({ hasActiveTurn: false, sessionId: "ses_running", status: "running" })
    expect(
      localConversationDetailToRuntimeMessages({
        backendConversationId: "codex_thread_1",
        backendId: "codex",
        capabilities: await codex.capabilities({ directory: "/repo" }),
        createdAt: "2026-05-12T00:00:00.000Z",
        id: "codex_thread_1",
        messages: [
          {
            createdAt: "2026-05-12T00:00:00.000Z",
            id: "msg_1",
            parts: [{ id: "part_1", kind: "text", text: "Hello" }],
            role: "assistant",
          },
        ],
        model: "codex",
        providerId: "codex",
        providerName: "Codex",
        status: "idle",
        title: "Codex",
        updatedAt: "2026-05-12T00:00:00.000Z",
      }),
    ).toMatchObject([{ agent: "Codex", id: "msg_1", parts: [{ rawPart: null, text: "Hello" }] }])
    expect(
      mergeRuntimeProviderLists(
        { all: [], connected: [], default: {} },
        localModelsToRuntimeProviderList(await codex.listModels({ directory: "/repo" })),
      ),
    ).toMatchObject({
      connected: ["codex"],
      default: { codex: "codex" },
    })
    expect(
      mergeRuntimeProviderLists(
        {
          all: [{ id: "codex", models: { old: { id: "old", name: "Old", status: "active" } }, name: "Codex" }],
          connected: ["codex"],
          default: { codex: "old" },
        },
        localModelsToRuntimeProviderList(await codex.listModels({ directory: "/repo" })),
      ),
    ).toMatchObject({ all: [{ models: { codex: expect.any(Object), old: expect.any(Object) } }] })
    expect(
      mergeRuntimeProviderLists(
        {
          all: [
            {
              id: "anthropic",
              models: {
                "claude-sonnet-4-5-20250929": {
                  id: "claude-sonnet-4-5-20250929",
                  name: "Claude Sonnet",
                  status: "active",
                },
              },
              name: "Anthropic",
            },
          ],
          connected: ["anthropic"],
          default: { anthropic: "claude-sonnet-4-5-20250929" },
        },
        localModelsToRuntimeProviderList([
          {
            available: false,
            backendId: "claude",
            capabilities: await codex.capabilities({ directory: "/repo" }),
            displayName: "Claude",
            id: "claude-sonnet-4-5-20250929",
            providerId: "anthropic",
            providerName: "Anthropic",
            unavailableReason: "Anthropic SDK unavailable",
          },
        ]),
      ),
    ).toMatchObject({
      all: [{ models: { "claude-sonnet-4-5-20250929": { name: "Claude Sonnet", status: "active" } } }],
      connected: ["anthropic"],
      default: { anthropic: "claude-sonnet-4-5-20250929" },
    })
    expect(
      localEventToRemoteRuntimeEvent({
        backendId: "codex",
        conversationId: "c1",
        timestamp: "now",
        type: "conversation.created",
      }),
    ).toEqual({
      properties: { backendID: "codex", messageID: undefined, partID: undefined, sessionID: "c1" },
      type: "session.created",
    })
    expect(
      localEventToRemoteRuntimeEvent({
        backendId: "codex",
        conversationId: "c1",
        timestamp: "now",
        type: "conversation.updated",
      }),
    ).toEqual({
      properties: { backendID: "codex", messageID: undefined, partID: undefined, sessionID: "c1" },
      type: "session.updated",
    })
    expect(
      localEventToRemoteRuntimeEvent({
        backendId: "codex",
        conversationId: "c1",
        timestamp: "now",
        type: "turn.completed",
      }),
    ).toEqual({
      properties: { backendID: "codex", messageID: undefined, partID: undefined, sessionID: "c1" },
      type: "session.updated",
    })
    expect(
      localEventToRemoteRuntimeEvent({
        backendId: "codex",
        conversationId: "c1",
        messageId: "m1",
        partId: "p1",
        textDelta: "d",
        timestamp: "now",
        type: "message.delta",
      }),
    ).toEqual({
      properties: { backendID: "codex", delta: "d", field: "text", messageID: "m1", partID: "p1", sessionID: "c1" },
      type: "message.part.delta",
    })
    expect(
      localEventToRemoteRuntimeEvent({
        backendId: "codex",
        conversationId: "c1",
        messageId: "m1",
        timestamp: "now",
        type: "message.completed",
      }),
    ).toEqual({
      properties: { backendID: "codex", info: { id: "m1" }, messageID: "m1", partID: undefined, sessionID: "c1" },
      type: "message.updated",
    })
    expect(
      localEventToRemoteRuntimeEvent({ backendId: "codex", conversationId: "c1", timestamp: "now", type: "error" }),
    ).toEqual({
      properties: { backendID: "codex", messageID: undefined, partID: undefined, sessionID: "c1" },
      type: "session.updated",
    })
  })

  test("reports Codex unavailable until the local SDK client is usable", async () => {
    const codex = createCodexAdapter({
      createClient: () => {
        throw new Error("Codex CLI unavailable")
      },
    })
    const registry = createLocalAgentBackendRegistry({ backends: [testInterbaseAdapter(), codex] })
    const router = createLocalAgentBackendRouter({ registry })

    await expect(codex.listModels({ directory: "/repo" })).resolves.toEqual([
      expect.objectContaining({ available: false, providerId: "codex", unavailableReason: "Codex CLI unavailable" }),
    ])
    expect(localModelsToRuntimeProviderList(await codex.listModels({ directory: "/repo" }))).toMatchObject({
      all: [{ models: { codex: { status: "unavailable" } } }],
      connected: [],
      default: {},
    })
    await expect(router.listAgents({ context: { directory: "/repo" }, directory: "/repo" })).resolves.toMatchObject({
      agents: expect.arrayContaining([
        expect.objectContaining({ agentId: "codex", available: false, unavailableReason: "Codex CLI unavailable" }),
      ]),
    })
    await expect(
      router.createConversation({
        context: { directory: "/repo" },
        directory: "/repo",
        model: "codex",
        providerId: "codex",
      }),
    ).rejects.toThrow("Codex is unavailable: Codex CLI unavailable")
  })

  test("reads Codex history from local session files without creating transcript mirrors", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-codex-"))
    await Bun.write(
      path.join(root, "sessions", "2026", "thread.jsonl"),
      [
        JSON.stringify({
          content: "Hi",
          createdAt: "2026-05-12T00:00:00.000Z",
          id: "msg_1",
          role: "user",
          thread: "codex_thread_1",
        }),
        JSON.stringify({
          content: "Hello",
          createdAt: "2026-05-12T00:00:01.000Z",
          id: "msg_2",
          role: "assistant",
          thread: "codex_thread_1",
        }),
      ].join("\n"),
    )
    const store = createJsonRoutingMetadataStore({ stateDirectory: path.join(root, "routes") })
    await store.put({
      backendConversationId: "codex_thread_1",
      backendId: "codex",
      conversationId: "codex_thread_1",
      createdAt: "2026-05-12T00:00:00.000Z",
      directory: "/repo",
      title: "Codex",
      updatedAt: "2026-05-12T00:00:01.000Z",
    })

    await expect(readCodexThreadMessages({ codexHome: root, threadId: "codex_thread_1" })).resolves.toMatchObject([
      { id: "msg_1", parts: [{ text: "Hi" }], role: "user" },
      { id: "msg_2", parts: [{ text: "Hello" }], role: "assistant" },
    ])
    await expect(
      createCodexAdapter({ codexHome: root }).listConversations({
        context: {},
        directory: "/repo",
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: "codex_thread_1",
        lastText: "Hello",
        messageCount: 2,
        title: "Hi",
        updatedAt: "2026-05-12T00:00:01.000Z",
      }),
    ])
    await expect(createCodexAdapter({ codexHome: root }).capabilities()).resolves.toMatchObject({
      conversationHistoryReadable: true,
      streaming: true,
    })
    await expect(
      createCodexAdapter({ codexHome: root }).listConversations({
        context: {},
        directory: null,
      }),
    ).resolves.toEqual([expect.objectContaining({ id: "codex_thread_1" })])
    await expect(listCodexConversations({ codexHome: root })).resolves.toEqual([
      expect.objectContaining({ id: "codex_thread_1" }),
    ])
    await expect(
      createCodexAdapter({ codexHome: root }).readConversation({
        context: {},
        conversationId: "codex_thread_1",
        directory: "/repo",
      }),
    ).resolves.toMatchObject({
      createdAt: "2026-05-12T00:00:00.000Z",
      messages: [{ id: "msg_1" }, { id: "msg_2" }],
      updatedAt: "2026-05-12T00:00:01.000Z",
    })
    await store.put({
      backendConversationId: "codex_thread_1",
      backendId: "codex",
      conversationId: "codex_thread_1",
      createdAt: "2026-05-12T00:00:00.000Z",
      directory: "/repo",
      title: "Codex renamed",
      updatedAt: "2026-05-12T00:00:02.000Z",
    })
    await expect(store.get({ conversationId: "codex_thread_1", directory: "/repo" })).resolves.toMatchObject({
      title: "Codex renamed",
    })
    await expect(store.list({ directory: "/repo" })).resolves.toHaveLength(1)
    expect(JSON.parse(await readFile(path.join(root, "routes", "routes.json"), "utf8"))).toEqual({
      records: [expect.not.objectContaining({ messages: expect.anything() })],
      version: 1,
    })

    const emptyStore = createJsonRoutingMetadataStore({ stateDirectory: path.join(root, "empty-routes") })
    await Bun.write(path.join(root, "empty-routes", "routes.json"), "")
    await expect(emptyStore.get({ conversationId: "missing", directory: "/repo" })).resolves.toBeNull()
    await emptyStore.put({
      backendConversationId: "codex_thread_empty",
      backendId: "codex",
      conversationId: "codex_thread_empty",
      createdAt: "2026-05-12T00:00:00.000Z",
      directory: "/repo",
      title: "Recovered",
      updatedAt: "2026-05-12T00:00:00.000Z",
    })
    await expect(emptyStore.get({ conversationId: "codex_thread_empty", directory: "/repo" })).resolves.toMatchObject({
      backendId: "codex",
    })

    const nulStore = createJsonRoutingMetadataStore({ stateDirectory: path.join(root, "nul-routes") })
    await Bun.write(path.join(root, "nul-routes", "routes.json"), "\u0000\u0000")
    await expect(nulStore.list({ directory: "/repo" })).resolves.toEqual([])
    await rm(root, { force: true, recursive: true })
  })

  test("routing metadata preserves concurrent updates and keeps readers on valid JSON", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-routes-"))
    const store = createJsonRoutingMetadataStore({ stateDirectory: root })
    const readerFailures: Error[] = []
    let reading = true
    const reader = (async () => {
      while (reading) {
        try {
          await store.list({ directory: "/repo" })
        } catch (error) {
          readerFailures.push(error instanceof Error ? error : new Error("Non-error thrown"))
        }
        await new Promise((resolve) => setTimeout(resolve, 1))
      }
    })()

    await Promise.all(
      Array.from({ length: 25 }, (_value, index) =>
        store.put({
          backendConversationId: `codex_thread_${index}`,
          backendId: "codex",
          conversationId: `conversation_${index}`,
          createdAt: "2026-05-12T00:00:00.000Z",
          directory: "/repo",
          title: `Conversation ${index}`,
          updatedAt: "2026-05-12T00:00:00.000Z",
        }),
      ),
    )
    reading = false
    await reader

    expect(readerFailures).toEqual([])
    expect(await store.list({ directory: "/repo" })).toHaveLength(25)
    await rm(root, { force: true, recursive: true })
  })

  test("routing metadata reports path and kind for malformed state", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-routes-"))
    const file = path.join(root, "routes.json")
    await writeFile(file, JSON.stringify({ records: "not records", version: 1 }))
    const store = createJsonRoutingMetadataStore({ stateDirectory: root })

    const recovered = await store.list({ directory: "/repo" })
    expect(recovered).toEqual([])
    expect((await readdir(root)).some((entry) => entry.startsWith("routes.json.corrupt."))).toBe(true)

    await writeFile(file, "{")
    const nextRecovered = await store.list({ directory: "/repo" })
    expect(nextRecovered).toEqual([])
    expect((await readdir(root)).filter((entry) => entry.startsWith("routes.json.corrupt."))).toHaveLength(2)
    await rm(root, { force: true, recursive: true })
  })

  test("routing metadata state errors include stable operation details when writes fail", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-routes-"))
    const blocked = path.join(root, "routes.json")
    await mkdir(blocked, { recursive: true })
    const store = createJsonRoutingMetadataStore({ stateDirectory: root })

    const error = await store
      .put({
        backendConversationId: "codex_thread_1",
        backendId: "codex",
        conversationId: "conversation_1",
        createdAt: "2026-05-12T00:00:00.000Z",
        directory: "/repo",
        title: "Conversation 1",
        updatedAt: "2026-05-12T00:00:00.000Z",
      })
      .catch((caught) => caught)

    expect(error).toBeInstanceOf(LocalStateError)
    expect(error).toMatchObject({
      kind: "mobile backend routing metadata",
      operation: "read",
      path: blocked,
      reason: "io",
    })
    await rm(root, { force: true, recursive: true })
  })

  test("discovers current Codex session files from structured session metadata", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-codex-"))
    await Bun.write(
      path.join(root, "sessions", "2026", "05", "13", "thread.jsonl"),
      [
        JSON.stringify({
          payload: {
            cwd: "/repo",
            id: "019e1fab-5871-7842-8ba7-a037c1163a49",
            timestamp: "2026-05-13T04:49:43.537Z",
          },
          timestamp: "2026-05-13T04:49:46.424Z",
          type: "session_meta",
        }),
        JSON.stringify({
          payload: {
            content: [{ text: "Build the thing", type: "input_text" }],
            role: "user",
            type: "message",
          },
          timestamp: "2026-05-13T04:49:47.028Z",
          type: "response_item",
        }),
        JSON.stringify({
          payload: {
            content: [{ text: "Built.", type: "output_text" }],
            role: "assistant",
            type: "message",
          },
          timestamp: "2026-05-13T04:49:48.592Z",
          type: "response_item",
        }),
      ].join("\n"),
    )
    const adapter = createCodexAdapter({ codexHome: root })

    await expect(adapter.listConversations({ context: {}, directory: "/repo" })).resolves.toEqual([
      expect.objectContaining({
        backendId: "codex",
        createdAt: "2026-05-13T04:49:43.537Z",
        id: "019e1fab-5871-7842-8ba7-a037c1163a49",
        lastText: "Built.",
        messageCount: 2,
        title: "Build the thing",
        updatedAt: "2026-05-13T04:49:48.592Z",
      }),
    ])
    await expect(adapter.listConversations({ context: {}, directory: "/other" })).resolves.toEqual([])
    await expect(
      adapter.readConversation({
        context: {},
        conversationId: "019e1fab-5871-7842-8ba7-a037c1163a49",
        directory: "/repo",
      }),
    ).resolves.toMatchObject({
      messages: [
        { parts: [{ text: "Build the thing" }], role: "user" },
        { parts: [{ text: "Built." }], role: "assistant" },
      ],
    })

    await rm(root, { force: true, recursive: true })
  })

  test("uses Codex user_message events as user-turn authority when present", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-codex-"))
    await Bun.write(
      path.join(root, "sessions", "2026", "05", "13", "event-thread.jsonl"),
      [
        JSON.stringify({
          payload: { cwd: "/repo", id: "019e220e-4c89-71c3-9d08-d3784d232744", timestamp: "2026-05-13T15:57:02.985Z" },
          timestamp: "2026-05-13T15:57:06.086Z",
          type: "session_meta",
        }),
        JSON.stringify({
          payload: {
            content: [{ text: "# AGENTS.md instructions for /repo", type: "input_text" }],
            role: "user",
            type: "message",
          },
          timestamp: "2026-05-13T15:57:06.299Z",
          type: "response_item",
        }),
        JSON.stringify({
          payload: { content: [{ text: "testing", type: "input_text" }], role: "user", type: "message" },
          timestamp: "2026-05-13T15:57:06.301Z",
          type: "response_item",
        }),
        JSON.stringify({
          payload: { images: [], local_images: [], message: "testing", text_elements: [], type: "user_message" },
          timestamp: "2026-05-13T15:57:06.302Z",
          type: "event_msg",
        }),
        JSON.stringify({
          payload: { content: [{ text: "Ready.", type: "output_text" }], role: "assistant", type: "message" },
          timestamp: "2026-05-13T15:57:07.656Z",
          type: "response_item",
        }),
      ].join("\n"),
    )
    const adapter = createCodexAdapter({ codexHome: root })

    await expect(adapter.listConversations({ context: {}, directory: "/repo" })).resolves.toEqual([
      expect.objectContaining({
        id: "019e220e-4c89-71c3-9d08-d3784d232744",
        lastText: "Ready.",
        messageCount: 2,
        title: "testing",
      }),
    ])
    await expect(
      adapter.readConversation({
        context: {},
        conversationId: "019e220e-4c89-71c3-9d08-d3784d232744",
        directory: "/repo",
      }),
    ).resolves.toMatchObject({
      messages: [
        { parts: [{ text: "testing" }], role: "user" },
        { parts: [{ text: "Ready." }], role: "assistant" },
      ],
    })

    await rm(root, { force: true, recursive: true })
  })

  test("filters Codex history records to the requested thread", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-codex-"))
    await Bun.write(
      path.join(root, "sessions", "2026", "thread.jsonl"),
      [
        JSON.stringify({
          content: "Hi",
          createdAt: "2026-05-12T00:00:00.000Z",
          id: "msg_1",
          role: "user",
          thread: "codex_thread_1",
        }),
        JSON.stringify({
          content: "Ignore me",
          createdAt: "2026-05-12T00:00:01.000Z",
          id: "msg_other",
          role: "assistant",
          thread: "codex_thread_2",
        }),
        JSON.stringify({
          content: "Hello",
          createdAt: "2026-05-12T00:00:02.000Z",
          id: "msg_2",
          role: "assistant",
          threadId: "codex_thread_1",
        }),
        JSON.stringify({
          content: "No authority",
          createdAt: "2026-05-12T00:00:03.000Z",
          id: "msg_unknown",
          role: "assistant",
        }),
      ].join("\n"),
    )

    await expect(readCodexThreadMessages({ codexHome: root, threadId: "codex_thread_1" })).resolves.toMatchObject([
      { id: "msg_1", parts: [{ text: "Hi" }], role: "user" },
      { id: "msg_2", parts: [{ text: "Hello" }], role: "assistant" },
    ])
    await expect(readCodexThreadMessages({ codexHome: root, threadId: "codex_thread_1" })).resolves.toHaveLength(2)

    await rm(root, { force: true, recursive: true })
  })

  test("routes Claude through the Anthropic SDK and local continuity store", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-"))
    const timestamps = [
      "2026-05-12T00:00:00.000Z",
      "2026-05-12T00:00:01.000Z",
      "2026-05-12T00:00:02.000Z",
      "2026-05-12T00:00:03.000Z",
      "2026-05-12T00:00:04.000Z",
    ]
    let clientCreations = 0
    let modelListCalls = 0
    const claude = createClaudeAdapter({
      createClient: () => {
        clientCreations += 1
        return testClaudeClient(undefined, {}, { onList: () => (modelListCalls += 1) })
      },
      now: () => timestamps.shift() ?? "2026-05-12T00:00:05.000Z",
      stateDirectory: root,
    })

    await expect(claude.capabilities({ directory: "/repo" })).resolves.toMatchObject({
      conversationHistoryReadable: true,
      resume: true,
      sessionContinuation: true,
      streaming: true,
    })
    await expect(claude.listModels({ directory: "/repo" })).resolves.toMatchObject([
      { available: true, id: "claude-test-model", providerId: "anthropic" },
    ])
    const created = await claude.createConversation({
      context: {},
      directory: "/repo",
      model: "claude-test-model",
      providerId: "anthropic",
    })
    await expect(
      claude.sendMessage({ context: {}, content: "hello", conversationId: created.id, directory: "/repo" }),
    ).resolves.toMatchObject({
      message: { parts: [{ text: "Claude response to hello" }], role: "assistant" },
      messageId: "claude_msg_1",
    })
    await expect(claude.listConversations({ context: {}, directory: "/repo" })).resolves.toEqual([
      expect.objectContaining({
        backendId: "claude",
        id: created.id,
        lastText: "Claude response to hello",
        messageCount: 2,
        title: "hello",
      }),
    ])
    await expect(
      claude.readConversation({ context: {}, conversationId: created.id, directory: "/repo" }),
    ).resolves.toMatchObject({
      messages: [
        { parts: [{ text: "hello" }], role: "user" },
        { id: "claude_msg_1", parts: [{ text: "Claude response to hello" }], role: "assistant" },
      ],
    })
    expect(clientCreations).toBe(1)
    expect(modelListCalls).toBe(1)
    await expect(claude.listConversations({ context: {}, directory: "/other" })).resolves.toEqual([])
    await expect(
      claude.findConversation?.({ context: {}, conversationId: created.id, directory: "/repo" }),
    ).resolves.toMatchObject({ id: created.id, title: "hello" })
    await rm(root, { force: true, recursive: true })
  })

  test("prefers available local Claude over Interbase for Anthropic model starts", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-route-"))
    const routingMetadata = createMemoryRoutingMetadataStore()
    const claude = createClaudeAdapter({
      createClient: () => testClaudeClient([{ display_name: "Claude Sonnet", id: "claude-sonnet-4.5" }]),
      now: () => "2026-05-12T00:00:00.000Z",
      stateDirectory: root,
    })
    const router = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({
        backends: [testInterbaseAdapter(), claude],
        routingMetadata,
      }),
      routingMetadata,
    })

    const conversation = await router.createConversation({
      context: { directory: "/repo" },
      directory: "/repo",
      model: "claude-sonnet-4.5",
      providerId: "anthropic",
      title: "Claude local chat",
    })

    expect(conversation).toMatchObject({ backendId: "claude", model: "claude-sonnet-4.5", providerId: "anthropic" })
    await expect(routingMetadata.get({ conversationId: conversation.id, directory: "/repo" })).resolves.toMatchObject({
      backendId: "claude",
      backendConversationId: conversation.id,
    })
    await expect(
      router.sendMessage({
        context: { directory: "/repo" },
        content: "hello",
        conversationId: conversation.id,
        directory: "/repo",
      }),
    ).resolves.toMatchObject({ message: { parts: [{ text: "Claude response to hello" }], role: "assistant" } })
    await rm(root, { force: true, recursive: true })
  })

  test("routes catalog Anthropic model ids to Claude when the SDK can retrieve them", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-retrieve-route-"))
    const routingMetadata = createMemoryRoutingMetadataStore()
    const claude = createClaudeAdapter({
      createClient: () =>
        testClaudeClient([{ display_name: "Claude Current", id: "claude-current" }], {
          "claude-catalog-id": { display_name: "Claude Catalog", id: "claude-resolved-id" },
        }),
      now: () => "2026-05-12T00:00:00.000Z",
      stateDirectory: root,
    })
    const router = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({
        backends: [testInterbaseAdapter(), claude],
        routingMetadata,
      }),
      routingMetadata,
    })

    const conversation = await router.createConversation({
      context: { directory: "/repo" },
      directory: "/repo",
      model: "claude-catalog-id",
      providerId: "anthropic",
    })

    expect(conversation).toMatchObject({ backendId: "claude", model: "claude-resolved-id", providerId: "anthropic" })
    await expect(routingMetadata.get({ conversationId: conversation.id, directory: "/repo" })).resolves.toMatchObject({
      backendId: "claude",
    })
    await expect(
      router.updateConversationModel({
        context: { directory: "/repo" },
        conversationId: conversation.id,
        directory: "/repo",
        model: "claude-current",
        providerId: "anthropic",
      }),
    ).resolves.toMatchObject({ model: "claude-current", providerId: "anthropic" })
    await expect(
      router.updateConversationModel({
        context: { directory: "/repo" },
        conversationId: conversation.id,
        directory: "/repo",
        model: "gpt-5",
        providerId: "openai",
      }),
    ).rejects.toThrow("Claude only supports Anthropic models")
    await expect(
      router.updateConversationModel({
        context: { directory: "/repo" },
        conversationId: conversation.id,
        directory: "/repo",
        model: "claude-missing-model",
        providerId: "anthropic",
      }),
    ).rejects.toThrow("Anthropic model is unavailable: model not found")
    await rm(root, { force: true, recursive: true })
  })

  test("prefers Claude over Interbase for active Anthropic provider models", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-prefer-anthropic-"))
    const routingMetadata = createMemoryRoutingMetadataStore()
    const router = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({
        backends: [
          testInterbaseAdapter(),
          createClaudeAdapter({
            createClient: () =>
              testClaudeClient([{ display_name: "Claude Current", id: "claude-current" }], {
                "claude-sonnet-4.5": { display_name: "Claude Sonnet", id: "claude-sonnet-4.5" },
              }),
            now: () => "2026-05-12T00:00:00.000Z",
            stateDirectory: root,
          }),
        ],
        routingMetadata,
      }),
      routingMetadata,
    })

    const conversation = await router.createConversation({
      context: { directory: "/repo" },
      directory: "/repo",
      model: "claude-sonnet-4.5",
      providerId: "anthropic",
    })

    expect(conversation).toMatchObject({ backendId: "claude", model: "claude-sonnet-4.5", providerId: "anthropic" })
    await expect(routingMetadata.get({ conversationId: conversation.id, directory: "/repo" })).resolves.toMatchObject({
      backendId: "claude",
    })
    await expect(
      router.createConversation({
        context: { directory: "/repo" },
        directory: "/repo",
        model: "claude-missing-model",
        providerId: "anthropic",
      }),
    ).rejects.toThrow("Anthropic model is unavailable: model not found")
    await rm(root, { force: true, recursive: true })
  })

  test("does not route Anthropic starts to unavailable local Claude", async () => {
    const unavailableClaude = createClaudeAdapter({
      createClient: () => {
        throw new Error("Anthropic SDK unavailable")
      },
    })
    await expect(unavailableClaude.createConversation({ context: {}, directory: "/repo" })).rejects.toThrow(
      "Anthropic is unavailable: Anthropic SDK unavailable",
    )
    const withInterbase = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({ backends: [testInterbaseAdapter(), unavailableClaude] }),
    })

    await expect(
      withInterbase.createConversation({
        context: { directory: "/repo" },
        directory: "/repo",
        model: "claude-sonnet-4.5",
        providerId: "anthropic",
        title: "Interbase fallback",
      }),
    ).resolves.toMatchObject({ backendId: "interbaseRuntime", id: "ses_new" })

    const claudeOnly = createLocalAgentBackendRouter({
      defaultBackendId: "claude",
      registry: createLocalAgentBackendRegistry({ backends: [unavailableClaude], defaultBackendId: "claude" }),
    })
    await expect(
      claudeOnly.createConversation({
        context: {},
        directory: "/repo",
        model: "claude-sonnet-4-5-20250929",
        providerId: "anthropic",
      }),
    ).rejects.toThrow("Anthropic is unavailable: Anthropic SDK unavailable")

    let attempts = 0
    const recoveringClaude = createClaudeAdapter({
      createClient: () => {
        attempts += 1
        if (attempts === 1) throw new Error("temporary auth failure")
        return testClaudeClient()
      },
    })
    await expect(recoveringClaude.listModels({ directory: "/repo" })).resolves.toMatchObject([
      { available: false, unavailableReason: "temporary auth failure" },
    ])
    await expect(recoveringClaude.listModels({ directory: "/repo" })).resolves.toMatchObject([
      { available: true, id: "claude-test-model" },
    ])
  })

  test("does not synthesize Claude chat summaries from routing metadata without store authority", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-route-only-"))
    const routingMetadata = createMemoryRoutingMetadataStore([
      {
        backendConversationId: "claude_missing",
        backendId: "claude",
        conversationId: "claude_missing",
        createdAt: "2026-05-12T00:00:00.000Z",
        directory: "/repo",
        title: "Missing Claude chat",
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
    ])
    const router = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({
        backends: [
          testInterbaseAdapter(),
          createClaudeAdapter({ createClient: () => testClaudeClient(), stateDirectory: root }),
        ],
        routingMetadata,
      }),
      routingMetadata,
    })

    await expect(
      router.listConversations({ context: { directory: "/repo" }, directory: "/repo" }),
    ).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ backendId: "claude", id: "claude_missing" })]),
    )
    await expect(
      router.readConversation({
        context: { directory: "/repo" },
        conversationId: "claude_missing",
        directory: "/repo",
      }),
    ).rejects.toThrow("Claude conversation not found")
    await rm(root, { force: true, recursive: true })
  })

  test("resolves existing Claude store conversations without route metadata", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-existing-store-"))
    const claude = createClaudeAdapter({
      createClient: () => testClaudeClient(),
      now: () => "2026-05-12T00:00:00.000Z",
      stateDirectory: root,
    })
    const created = await claude.createConversation({ context: {}, directory: "/repo", title: "Stored Claude chat" })
    await claude.sendMessage({ context: {}, content: "from store", conversationId: created.id, directory: "/repo" })
    const listedOnly = await claude.createConversation({ context: {}, directory: "/repo", title: "Listed Claude chat" })
    await claude.sendMessage({ context: {}, content: "from list", conversationId: listedOnly.id, directory: "/repo" })
    let routeWrites = 0
    const memoryRoutingMetadata = createMemoryRoutingMetadataStore()
    const routingMetadata = {
      get: memoryRoutingMetadata.get,
      list: memoryRoutingMetadata.list,
      async put(record) {
        routeWrites += 1
        return await memoryRoutingMetadata.put(record)
      },
    }
    const router = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({
        backends: [
          testInterbaseAdapter(),
          createClaudeAdapter({ createClient: () => testClaudeClient(), stateDirectory: root }),
        ],
        routingMetadata,
      }),
      routingMetadata,
    })

    await expect(
      router.readConversation({ context: { directory: "/repo" }, conversationId: created.id, directory: "/repo" }),
    ).resolves.toMatchObject({ backendId: "claude" })
    expect(routeWrites).toBe(1)
    await expect(router.listConversations({ context: { directory: "/repo" }, directory: "/repo" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backendId: "claude", id: created.id, lastText: "Claude response to from store" }),
        expect.objectContaining({ backendId: "claude", id: listedOnly.id, lastText: "Claude response to from list" }),
      ]),
    )
    expect(routeWrites).toBe(2)
    await expect(
      router.readConversation({ context: { directory: "/repo" }, conversationId: created.id, directory: "/repo" }),
    ).resolves.toMatchObject({
      backendId: "claude",
      messages: [
        { parts: [{ text: "from store" }], role: "user" },
        { parts: [{ text: "Claude response to from store" }], role: "assistant" },
      ],
    })
    expect(routeWrites).toBe(2)
    await expect(router.listConversations({ context: { directory: "/repo" }, directory: "/repo" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backendId: "claude", id: created.id, lastText: "Claude response to from store" }),
      ]),
    )
    expect(routeWrites).toBe(2)
    await expect(router.listConversations({ context: { directory: "/repo" }, directory: "/repo" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backendId: "claude", id: created.id, lastText: "Claude response to from store" }),
      ]),
    )
    expect(routeWrites).toBe(2)
    await expect(
      router.sendMessage({
        context: { directory: "/repo" },
        content: "again",
        conversationId: created.id,
        directory: "/repo",
      }),
    ).resolves.toMatchObject({ message: { parts: [{ text: "Claude response to again" }] } })
    await expect(routingMetadata.get({ conversationId: created.id, directory: "/repo" })).resolves.toMatchObject({
      backendId: "claude",
    })
    await rm(root, { force: true, recursive: true })
  })

  test("preserves concurrent Claude conversation writes in the shared continuity store", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-concurrent-"))
    const first = createClaudeAdapter({ createClient: () => testClaudeClient(), stateDirectory: root })
    const second = createClaudeAdapter({ createClient: () => testClaudeClient(), stateDirectory: root })

    const [firstConversation, secondConversation] = await Promise.all([
      first.createConversation({ context: {}, directory: "/repo", title: "First Claude chat" }),
      second.createConversation({ context: {}, directory: "/repo", title: "Second Claude chat" }),
    ])

    await expect(first.listConversations({ context: {}, directory: "/repo" })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: firstConversation.id, title: "First Claude chat" }),
        expect.objectContaining({ id: secondConversation.id, title: "Second Claude chat" }),
      ]),
    )
    await rm(root, { force: true, recursive: true })
  })

  test("recovers stale Claude continuity store locks", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-stale-lock-"))
    await mkdir(path.join(root, "conversations.json.lock"), { recursive: true })
    const stale = new Date(Date.now() - 10_000)
    await utimes(path.join(root, "conversations.json.lock"), stale, stale)
    const claude = createClaudeAdapter({ createClient: () => testClaudeClient(), stateDirectory: root })

    await expect(
      claude.createConversation({ context: {}, directory: "/repo", title: "Recovered lock" }),
    ).resolves.toMatchObject({
      backendId: "claude",
      title: "Recovered lock",
    })
    await expect(claude.listConversations({ context: {}, directory: "/repo" })).resolves.toEqual([
      expect.objectContaining({ title: "Recovered lock" }),
    ])
    await rm(root, { force: true, recursive: true })
  })

  test("persists Claude streaming output from Anthropic SDK deltas", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-claude-stream-"))
    const claude = createClaudeAdapter({
      createClient: () => testClaudeClient(),
      now: () => "2026-05-12T00:00:00.000Z",
      stateDirectory: root,
    })
    const created = await claude.createConversation({
      context: {},
      directory: "/repo",
      model: "claude-test-model",
      providerId: "anthropic",
    })
    const events: unknown[] = []

    for await (const event of claude.streamConversation({
      context: {},
      conversationId: created.id,
      directory: "/repo",
    })) {
      events.push(event)
    }

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ textDelta: "Claude ", type: "message.delta" }),
        expect.objectContaining({ textDelta: "stream", type: "message.delta" }),
        expect.objectContaining({ type: "message.completed" }),
        expect.objectContaining({ type: "turn.completed" }),
      ]),
    )
    expect(events.filter((event) => isRecord(event) && event.type === "message.completed")).toHaveLength(1)
    expect(events.filter((event) => isRecord(event) && event.type === "turn.completed")).toHaveLength(1)
    await expect(
      claude.readConversation({ context: {}, conversationId: created.id, directory: "/repo" }),
    ).resolves.toMatchObject({
      status: "idle",
      messages: [{ model: "claude-test-model", parts: [{ text: "Claude stream" }], role: "assistant" }],
    })
    await rm(root, { force: true, recursive: true })
  })

  test("persists Claude stream failure and abort status", async () => {
    const failingRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-stream-fail-"))
    const failingClaude = createClaudeAdapter({
      createClient: () => ({
        messages: {
          async create() {
            throw new Error("stream failed")
          },
        },
        models: {
          async list() {
            return { data: [{ display_name: "Claude Test", id: "claude-test-model" }] }
          },
        },
      }),
      now: () => "2026-05-12T00:00:00.000Z",
      stateDirectory: failingRoot,
    })
    const failingConversation = await failingClaude.createConversation({ context: {}, directory: "/repo" })

    await expect(async () => {
      for await (const _event of failingClaude.streamConversation({
        context: {},
        conversationId: failingConversation.id,
        directory: "/repo",
      })) {
      }
    }).toThrow("stream failed")
    await expect(
      failingClaude.readConversation({ context: {}, conversationId: failingConversation.id, directory: "/repo" }),
    ).resolves.toMatchObject({
      status: "error",
    })

    const malformedRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-stream-malformed-"))
    const malformedClaude = createClaudeAdapter({
      createClient: () => ({
        messages: {
          async create(input) {
            return input.stream ? { invalid: true } : []
          },
        },
        models: {
          async list() {
            return { data: [{ display_name: "Claude Test", id: "claude-test-model" }] }
          },
        },
      }),
      stateDirectory: malformedRoot,
    })
    const malformedConversation = await malformedClaude.createConversation({ context: {}, directory: "/repo" })
    await expect(
      malformedClaude.sendMessage({
        context: {},
        content: "bad response",
        conversationId: malformedConversation.id,
        directory: "/repo",
      }),
    ).rejects.toThrow("Anthropic SDK returned an invalid message response")
    await expect(async () => {
      for await (const _event of malformedClaude.streamConversation({
        context: {},
        conversationId: malformedConversation.id,
        directory: "/repo",
      })) {
      }
    }).toThrow("Anthropic SDK returned an invalid streaming response")

    const emptyRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-empty-content-"))
    const emptyClaude = createClaudeAdapter({
      createClient: () => ({
        messages: {
          async create(input) {
            return input.stream
              ? (async function* () {
                  yield { type: "message_stop" }
                })()
              : { content: [], id: "claude_empty", type: "message" }
          },
        },
        models: {
          async list() {
            return { data: [{ display_name: "Claude Test", id: "claude-test-model" }] }
          },
        },
      }),
      stateDirectory: emptyRoot,
    })
    const emptyConversation = await emptyClaude.createConversation({ context: {}, directory: "/repo" })
    await expect(
      emptyClaude.sendMessage({
        context: {},
        content: "empty response",
        conversationId: emptyConversation.id,
        directory: "/repo",
      }),
    ).rejects.toThrow("Anthropic SDK returned a message response without text content")
    await expect(async () => {
      for await (const _event of emptyClaude.streamConversation({
        context: {},
        conversationId: emptyConversation.id,
        directory: "/repo",
      })) {
      }
    }).toThrow("Anthropic SDK streaming response completed without text content")

    const abortRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-stream-abort-"))
    const abortClaude = createClaudeAdapter({
      createClient: () => ({
        messages: {
          async create() {
            return (async function* () {
              yield { delta: { text: "Partial", type: "text_delta" }, type: "content_block_delta" }
              yield { delta: { text: " ignored", type: "text_delta" }, type: "content_block_delta" }
            })()
          },
        },
        models: {
          async list() {
            return { data: [{ display_name: "Claude Test", id: "claude-test-model" }] }
          },
        },
      }),
      now: () => "2026-05-12T00:00:00.000Z",
      stateDirectory: abortRoot,
    })
    const abortConversation = await abortClaude.createConversation({ context: {}, directory: "/repo" })
    const abortController = new AbortController()
    const abortEvents: unknown[] = []

    for await (const event of abortClaude.streamConversation({
      context: {},
      conversationId: abortConversation.id,
      directory: "/repo",
      signal: abortController.signal,
    })) {
      abortEvents.push(event)
      if (isRecord(event) && event.type === "message.delta") abortController.abort()
    }

    expect(abortEvents).toEqual(
      expect.arrayContaining([expect.objectContaining({ textDelta: "Partial", type: "message.delta" })]),
    )
    await expect(
      abortClaude.readConversation({ context: {}, conversationId: abortConversation.id, directory: "/repo" }),
    ).resolves.toMatchObject({
      messages: [],
      status: "interrupted",
    })
    const preAbortRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-stream-preabort-"))
    const preAbortClaude = createClaudeAdapter({
      createClient: () => testClaudeClient(),
      now: () => "2026-05-12T00:00:00.000Z",
      stateDirectory: preAbortRoot,
    })
    const preAbortConversation = await preAbortClaude.createConversation({ context: {}, directory: "/repo" })
    const preAbortController = new AbortController()
    preAbortController.abort()
    const preAbortEvents: unknown[] = []

    for await (const event of preAbortClaude.streamConversation({
      context: {},
      conversationId: preAbortConversation.id,
      directory: "/repo",
      signal: preAbortController.signal,
    })) {
      preAbortEvents.push(event)
    }

    expect(preAbortEvents).toEqual([])
    await expect(
      preAbortClaude.readConversation({ context: {}, conversationId: preAbortConversation.id, directory: "/repo" }),
    ).resolves.toMatchObject({
      messages: [],
      status: "interrupted",
    })
    await rm(failingRoot, { force: true, recursive: true })
    await rm(malformedRoot, { force: true, recursive: true })
    await rm(emptyRoot, { force: true, recursive: true })
    await rm(abortRoot, { force: true, recursive: true })
    await rm(preAbortRoot, { force: true, recursive: true })
  })

  test("covers unavailable, malformed, and fallback paths explicitly", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "interbase-backends-extra-"))
    const store = createJsonRoutingMetadataStore({ stateDirectory: path.join(root, "routes") })
    await Bun.write(
      path.join(root, "routes", "routes.json"),
      JSON.stringify({ records: [{ backendId: "made-up" }], version: 1 }),
    )
    await expect(store.list({ directory: "/repo" })).resolves.toEqual([])
    await Bun.write(path.join(root, "routes", "routes.json"), "{")
    await expect(store.list({ directory: "/repo" })).resolves.toEqual([])
    expect(isLocalBackendId("codex")).toBe(true)
    expect(isLocalBackendId("nope")).toBe(false)

    await expect(readCodexThreadMessages({ codexHome: path.join(root, "missing"), threadId: "none" })).resolves.toEqual(
      [],
    )
    await Bun.write(path.join(root, "sessions", "bad.jsonl"), "not-json thread\n{}\n")
    await expect(readCodexThreadMessages({ codexHome: root, threadId: "thread" })).resolves.toEqual([])
    await Bun.write(path.join(root, "not-a-directory"), "")
    await expect(
      readCodexThreadMessages({ codexHome: path.join(root, "not-a-directory"), threadId: "thread" }),
    ).rejects.toThrow()

    const noId = createCodexAdapter({
      createClient: () => ({
        resumeThread: () => testCodexClient().resumeThread("codex_thread_1"),
        startThread: () => ({
          async run() {
            return {}
          },
          async runStreamed() {
            return { events: (async function* () {})() }
          },
        }),
      }),
    })
    await expect(noId.createConversation({ context: {}, directory: "/repo" })).rejects.toThrow("persisted thread id")

    const abort = new AbortController()
    abort.abort()
    const streamed: unknown[] = []
    for await (const event of createCodexAdapter({ createClient: () => testCodexClient() }).streamConversation({
      context: {},
      conversationId: "codex_thread_1",
      directory: "/repo",
      signal: abort.signal,
    })) {
      streamed.push(event)
    }
    expect(streamed).toEqual([])

    let listActiveChatsCalls = 0
    const interbase = createInterbaseRuntimeAdapter({
      ...testInterbaseBridge(),
      async listActiveChats() {
        listActiveChatsCalls += 1
        return []
      },
      async updateSession() {
        return { ignored: true }
      },
    })
    await expect(interbase.capabilities({ directory: "/repo" })).resolves.toMatchObject({ resume: true })
    await expect(
      interbase.readConversation({ context: { directory: "/repo" }, conversationId: "missing", directory: "/repo" }),
    ).resolves.toMatchObject({
      id: "missing",
      messages: [expect.objectContaining({ id: "msg_interbase" })],
      title: "missing",
    })
    expect(listActiveChatsCalls).toBe(0)
    await expect(
      interbase.updateConversationModel?.({
        context: { directory: "/repo" },
        conversationId: "missing",
        directory: "/repo",
        model: "model",
        providerId: "provider",
      }),
    ).resolves.toMatchObject({ id: "missing" })
    await expect(
      interbase
        .streamConversation({
          context: { directory: "/repo" },
          conversationId: "missing",
          directory: "/repo",
        })
        .next(),
    ).rejects.toThrow("interbaseRuntime does not support direct backend streaming")

    const memory = createMemoryRoutingMetadataStore([
      {
        backendConversationId: "old",
        backendId: "codex",
        conversationId: "c1",
        createdAt: "old",
        directory: "/repo",
        title: null,
        updatedAt: "old",
      },
    ])
    await memory.put({
      backendConversationId: "new",
      backendId: "codex",
      conversationId: "c1",
      createdAt: "new",
      directory: "/repo",
      title: null,
      updatedAt: "new",
    })
    await expect(memory.get({ conversationId: "c1", directory: "/repo" })).resolves.toMatchObject({
      backendConversationId: "new",
    })

    const throwingLookupBackend = {
      ...testInterbaseAdapter(),
      backendId: "codex" as const,
      async findConversation() {
        throw new Error("lookup exploded")
      },
    }
    const throwingLookupRouter = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({ backends: [testInterbaseAdapter(), throwingLookupBackend] }),
    })
    await expect(
      throwingLookupRouter.readConversation({
        context: { directory: "/repo" },
        conversationId: "missing",
        directory: "/repo",
      }),
    ).rejects.toThrow("lookup exploded")

    const codexRouteStore = createMemoryRoutingMetadataStore([
      {
        backendConversationId: "codex_thread_1",
        backendId: "codex",
        conversationId: "codex_thread_1",
        createdAt: "2026-05-12T00:00:00.000Z",
        directory: "/repo",
        title: "Codex",
        updatedAt: "2026-05-12T00:00:00.000Z",
      },
    ])
    const codexUpdateRouter = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({
        backends: [testInterbaseAdapter(), createCodexAdapter({ createClient: () => testCodexClient() })],
        routingMetadata: codexRouteStore,
      }),
      routingMetadata: codexRouteStore,
    })
    await expect(
      codexUpdateRouter.updateConversationModel({
        context: { directory: "/repo" },
        conversationId: "codex_thread_1",
        directory: "/repo",
        model: "codex",
        providerId: "codex",
      }),
    ).rejects.toThrow("codex does not support conversation model updates")

    const router = createLocalAgentBackendRouter({
      registry: createLocalAgentBackendRegistry({
        backends: [createClaudeAdapter({ createClient: () => testClaudeClient() })],
        defaultBackendId: "claude",
      }),
    })
    await expect(
      router.updateConversationModel({
        context: {},
        conversationId: "claude_1",
        directory: "/repo",
        model: "model",
        providerId: "provider",
      }),
    ).rejects.toThrow("Claude conversation not found")

    await expect(
      createClaudeAdapter({
        createClient: () => ({
          messages: testClaudeClient().messages,
          models: {
            list() {
              return (async function* () {
                yield { display_name: "Claude Page 1", id: "claude-page-1" }
                yield { display_name: "Claude Page 2", id: "claude-page-2" }
              })()
            },
          },
        }),
      }).listModels({ directory: "/repo" }),
    ).resolves.toMatchObject([{ id: "claude-page-1" }, { id: "claude-page-2" }])

    const malformedClaudeRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-malformed-"))
    await mkdir(malformedClaudeRoot, { recursive: true })
    await writeFile(
      path.join(malformedClaudeRoot, "conversations.json"),
      JSON.stringify({ conversations: [], version: 2 }),
    )
    await expect(
      createClaudeAdapter({
        createClient: () => testClaudeClient(),
        stateDirectory: malformedClaudeRoot,
      }).listConversations({ context: {}, directory: "/repo" }),
    ).rejects.toThrow("invalid schema")

    await expect(
      createClaudeAdapter({
        createClient: () => ({
          messages: testClaudeClient().messages,
          models: {
            async list() {
              throw new Error("models unavailable")
            },
          },
        }),
      }).listModels({ directory: "/repo" }),
    ).resolves.toEqual([
      expect.objectContaining({
        available: false,
        unavailableReason: "models unavailable",
      }),
    ])

    const projectedRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-projected-"))
    const projectedClaude = createClaudeAdapter({
      createClient: () => ({
        messages: {
          async create() {
            return {
              content: [{ text: "projected", type: "text" }],
              model: "claude-test-model",
              stop_reason: "end_turn",
              type: "message",
            }
          },
        },
        models: testClaudeClient().models,
      }),
      now: () => "2026-05-12T00:00:00.000Z",
      stateDirectory: projectedRoot,
    })
    const projectedConversation = await projectedClaude.createConversation({ context: {}, directory: "/repo" })
    await expect(
      projectedClaude.sendMessage({
        context: {},
        content: "needs projected id",
        conversationId: projectedConversation.id,
        directory: "/repo",
      }),
    ).resolves.toMatchObject({
      message: {
        backendMetadata: { claudeMessageId: null },
        id: expect.stringContaining(`${projectedConversation.id}:2026-05-12T00:00:00.000Z:`),
      },
    })

    const originalArraySome = Array.prototype.some
    Array.prototype.some = function throwingSome() {
      throw new Error("model cache inspection failed")
    }
    try {
      await expect(
        createClaudeAdapter({
          createClient: () => testClaudeClient(),
        }).listModels({ directory: "/repo" }),
      ).rejects.toThrow("model cache inspection failed")
    } finally {
      Array.prototype.some = originalArraySome
    }
    await rm(root, { force: true, recursive: true })
    await rm(malformedClaudeRoot, { force: true, recursive: true })
    await rm(projectedRoot, { force: true, recursive: true })
  })

  test("maps structured Claude live smoke auth without provider-name heuristics", () => {
    expect(authInfoToClaudeAuth({ key: "api-key", type: "api" })).toEqual({ apiKey: "api-key" })
    expect(authInfoToClaudeAuth({ access: "oauth-token", type: "oauth" })).toEqual({ authToken: "oauth-token" })
    expect(authInfoToClaudeAuth({ key: "wellknown-key", token: "ignored", type: "wellknown" })).toEqual({
      apiKey: "wellknown-key",
    })
    expect(authInfoToClaudeAuth({ key: "ignored", type: "unknown" })).toBeUndefined()
    expect(
      authContentAnthropicEntry(
        JSON.stringify({ anthropic: { key: "api-key", type: "api" }, openai: { key: "nope", type: "api" } }),
      ),
    ).toEqual({ key: "api-key", type: "api" })
    expect(authContentAnthropicEntry(JSON.stringify({ claude: { key: "nope", type: "api" } }))).toBeUndefined()
  })

  test("covers Claude SDK constructor and stored conversation edge cases", async () => {
    await expect(
      createClaudeAdapter({
        createClient: () => ({
          messages: testClaudeClient().messages,
          models: {
            async list() {
              return { data: [{ id: "claude-named-model", name: "Claude Named Model" }] }
            },
            async retrieve(modelId: string) {
              return { id: modelId, name: "Claude Retrieved By Name" }
            },
          },
        }),
      }).listModels({ directory: "/repo" }),
    ).resolves.toEqual([expect.objectContaining({ displayName: "Claude Named Model", id: "claude-named-model" })])

    const retrievedRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-retrieved-name-"))
    const retrievedClaude = createClaudeAdapter({
      createClient: () => ({
        messages: testClaudeClient().messages,
        models: {
          async list() {
            return { data: [{ display_name: "Claude Current", id: "claude-current" }] }
          },
          async retrieve(modelId: string) {
            return { id: modelId, name: "Claude Retrieved By Name" }
          },
        },
      }),
      stateDirectory: retrievedRoot,
    })
    await expect(
      retrievedClaude.createConversation({ context: {}, directory: "/repo", model: "claude-by-name" }),
    ).resolves.toMatchObject({ model: "claude-by-name", providerId: "anthropic" })

    const storedRoot = await mkdtemp(path.join(tmpdir(), "interbase-claude-stored-parts-"))
    await writeFile(
      path.join(storedRoot, "conversations.json"),
      JSON.stringify({
        conversations: [
          {
            backendId: "claude",
            createdAt: "2026-05-12T00:00:00.000Z",
            directory: "/repo",
            id: "claude_stored_parts",
            messages: [
              {
                createdAt: "2026-05-12T00:00:00.000Z",
                id: "msg_stored_parts",
                parts: ["not-a-part", { id: "part_1", text: "kept" }],
                role: "assistant",
              },
            ],
            title: "Stored parts",
            updatedAt: "2026-05-12T00:00:00.000Z",
          },
        ],
        version: 1,
      }),
    )
    await expect(
      createClaudeAdapter({ createClient: () => testClaudeClient(), stateDirectory: storedRoot }).readConversation({
        context: {},
        conversationId: "claude_stored_parts",
        directory: "/repo",
      }),
    ).resolves.toMatchObject({ messages: [{ parts: [{ id: "part_1", text: "kept" }] }] })

    const originalFind = Array.prototype.find
    Array.prototype.find = function missingPersistedConversation(callback, thisArg) {
      if (this.some((item) => isRecord(item) && item.backendId === "claude")) return undefined
      return originalFind.call(this, callback, thisArg)
    }
    try {
      await expect(
        createClaudeAdapter({
          createClient: () => testClaudeClient(),
          stateDirectory: await mkdtemp(path.join(tmpdir(), "interbase-claude-missing-write-")),
        }).createConversation({
          context: {},
          directory: "/repo",
        }),
      ).rejects.toThrow("Claude conversation not found after persistence")
    } finally {
      Array.prototype.find = originalFind
    }

    await rm(retrievedRoot, { force: true, recursive: true })
    await rm(storedRoot, { force: true, recursive: true })
  })

  test("uses the mandated Codex SDK import seam when no test factory is injected", async () => {
    mock.module("@openai/codex-sdk", () => ({
      Codex: class {
        startThread() {
          return testCodexClient().startThread()
        }
        resumeThread(threadId: string) {
          return testCodexClient().resumeThread(threadId)
        }
      },
    }))

    await expect(
      createCodexAdapter({ now: () => "2026-05-12T00:00:00.000Z" }).createConversation({
        context: {},
        directory: "/repo",
      }),
    ).resolves.toMatchObject({ backendId: "codex", id: "codex_thread_1" })
  })

  test("passes structured Anthropic auth into the mandated Claude SDK import seam", async () => {
    let constructedAuth: unknown
    mock.module("@anthropic-ai/sdk", () => ({
      default: class {
        messages = {
          async create() {
            return { content: [{ text: "ok", type: "text" }], id: "claude_msg_auth", type: "message" }
          },
        }
        models = {
          async list() {
            return { data: [{ display_name: "Claude Auth", id: "claude-auth-model" }] }
          },
        }
        constructor(auth: unknown) {
          constructedAuth = auth
        }
      },
    }))

    await expect(
      createClaudeAdapter({
        resolveAuth: () => ({ apiKey: "anthropic-key", authToken: null }),
      }).listModels({ directory: "/repo" }),
    ).resolves.toEqual([expect.objectContaining({ available: true, id: "claude-auth-model", providerId: "anthropic" })])
    expect(constructedAuth).toEqual({ apiKey: "anthropic-key" })

    constructedAuth = "unchanged"
    await expect(
      createClaudeAdapter({
        resolveAuth: () => ({ apiKey: null, authToken: "anthropic-oauth-token" }),
      }).listModels({ directory: "/repo" }),
    ).resolves.toEqual([expect.objectContaining({ available: true, id: "claude-auth-model", providerId: "anthropic" })])
    expect(constructedAuth).toEqual({ authToken: "anthropic-oauth-token" })

    constructedAuth = "unchanged"
    await expect(
      createClaudeAdapter({
        resolveAuth: () => ({ apiKey: null, authToken: null }),
      }).listModels({ directory: "/repo" }),
    ).resolves.toEqual([expect.objectContaining({ available: true, id: "claude-auth-model", providerId: "anthropic" })])
    expect(constructedAuth).toBeUndefined()
  })
})

function testCodexClient(): CodexSdkClient {
  return {
    resumeThread: () => ({
      async run() {
        return { finalResponse: "done", items: [] }
      },
      async runStreamed() {
        return {
          events: (async function* () {
            yield { delta: "Hi" }
            yield { item: { id: "msg_1" }, type: "item.completed" }
            yield { type: "turn.completed", usage: {} }
          })(),
        }
      },
      threadId: "codex_thread_1",
    }),
    startThread: () => ({
      async run() {
        return { finalResponse: null, items: [] }
      },
      async runStreamed() {
        return { events: (async function* () {})() }
      },
      threadId: "codex_thread_1",
    }),
  }
}

function testClaudeClient(
  models = [{ display_name: "Claude Test", id: "claude-test-model" }],
  retrievedModels: Record<string, { display_name: string; id: string }> = {},
  hooks: { onList?(): void } = {},
): ClaudeSdkClient {
  return {
    messages: {
      async create(input) {
        if (input.stream) {
          return (async function* () {
            yield { delta: { text: "Claude ", type: "text_delta" }, type: "content_block_delta" }
            yield { delta: { text: "stream", type: "text_delta" }, type: "content_block_delta" }
            yield { type: "message_stop" }
          })()
        }
        const messages = Array.isArray(input.messages) ? input.messages : []
        const last = messages.at(-1)
        const text = typeof last?.content === "string" ? last.content : ""
        return {
          content: [{ text: `Claude response to ${text}`, type: "text" }],
          id: "claude_msg_1",
          model: input.model,
          role: "assistant",
          stop_reason: "end_turn",
          type: "message",
        }
      },
    },
    models: {
      async list() {
        hooks.onList?.()
        return { data: models }
      },
      async retrieve(modelId: string) {
        const model = retrievedModels[modelId]
        if (!model) throw new Error("model not found")
        return model
      },
    },
  }
}

function testInterbaseAdapter() {
  return createInterbaseRuntimeAdapter<{ directory: string }>(testInterbaseBridge())
}

function testInterbaseBridge() {
  return {
    async listActiveChats() {
      return [
        {
          agent: null,
          createdAt: "2026-05-12T00:00:00.000Z",
          model: "claude-sonnet-4.5",
          path: "/repo",
          projectId: "project_1",
          providerId: "anthropic",
          providerName: "Anthropic",
          sessionId: "ses_interbase",
          status: "idle",
          title: "Interbase chat",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      ]
    },
    async listProviders() {
      return {
        all: [
          {
            id: "anthropic",
            models: { "claude-sonnet-4.5": { id: "claude-sonnet-4.5", name: "Claude Sonnet", status: "active" } },
            name: "Anthropic",
          },
        ],
        connected: ["anthropic"],
        default: { anthropic: "claude-sonnet-4.5" },
      }
    },
    async readSession(_context, payload) {
      if (payload.sessionId !== "ses_interbase") {
        return null
      }
      return {
        agent: null,
        createdAt: "2026-05-12T00:00:00.000Z",
        model: "claude-sonnet-4.5",
        path: "/repo",
        projectId: "project_1",
        providerId: "anthropic",
        providerName: "Anthropic",
        sessionId: payload.sessionId,
        status: "idle",
        title: "Interbase chat",
        updatedAt: "2026-05-12T00:00:00.000Z",
      }
    },
    async listSessionMessages() {
      return {
        messages: [runtimeMessage("msg_interbase", "assistant", "Listed")],
        pageInfo: { hasNewer: false, hasOlder: false, newerCursor: null, olderCursor: null },
        sessionId: "ses_interbase",
      }
    },
    async sendSessionMessage() {
      return { message: runtimeMessage("msg_sent", "user", "hello"), sessionId: "ses_interbase" }
    },
    async startChat(_context, payload) {
      return {
        chat: {
          agent: null,
          createdAt: "2026-05-12T00:00:00.000Z",
          model: payload.model ?? null,
          path: "/repo",
          projectId: "project_1",
          providerId: payload.providerId ?? null,
          providerName: "Anthropic",
          sessionId: "ses_new",
          status: "idle",
          title: payload.title ?? "New chat",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      }
    },
    async updateSession(_context, payload) {
      return {
        chat: {
          agent: null,
          createdAt: "2026-05-12T00:00:00.000Z",
          model: payload.input.model ?? null,
          path: "/repo",
          projectId: "project_1",
          providerId: payload.input.providerId ?? null,
          providerName: "OpenAI",
          sessionId: payload.sessionId,
          status: "idle",
          title: "Updated chat",
          updatedAt: "2026-05-12T00:00:00.000Z",
        },
      }
    },
  }
}

function runtimeMessage(id: string, role: "assistant" | "user", text: string) {
  return {
    agent: null,
    completedAt: null,
    createdAt: "2026-05-12T00:00:00.000Z",
    errorMessage: null,
    errorName: null,
    finishReason: null,
    id,
    model: null,
    parentId: null,
    parts: [
      {
        id: `${id}_part`,
        kind: "text",
        messageId: id,
        rawPart: { text, type: "text" },
        status: null,
        text,
        title: null,
      },
    ],
    role,
    sessionId: "ses_interbase",
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
