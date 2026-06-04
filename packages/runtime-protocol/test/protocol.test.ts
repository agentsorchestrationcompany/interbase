import assert from "node:assert/strict"
import test from "node:test"
import {
  providerIdValues,
  createSupportedCapabilityState,
  createDefaultProviderAdapterBoundary,
  createUnavailableCapabilityState,
  providerAdapterExecutionHostValues,
  providerCapabilityKeyValues,
  providerCapabilityStatusValues,
  providerCredentialSourceValues,
  providerUnsupportedReasonCodeValues,
  createRuntimeErrorPayload,
  resolveProviderModelCapabilityState,
  resolvePreferredReasoningEffort,
  runtimeErrorCategoryValues,
  runtimeErrorCodeValues,
  runtimeWebSocketProtocolVersion,
  supportedRuntimeWebSocketProtocolVersions,
  createRuntimeWebSocketProtocolVersionMismatch,
  isRuntimeWebSocketProtocolVersionSupported,
  selectRuntimeWebSocketProtocolVersion,
  isRuntimeWebSocketClientCommand,
  isRuntimeWebSocketClientMethod,
  isRuntimeWebSocketServerEnvelope,
  isRuntimeWebSocketEventType,
  runtimeWebSocketClientMethodValues,
  runtimeWebSocketEventTypeValues,
  runtimeWebSocketResponsePayloadKindValues,
  runtimeWebSocketResponseSchemaForMethod,
  runtimeWebSocketResponseSchemas,
  isRuntimeWebSocketServerEnvelopeForMethod,
  runtimeWebSocketProviderModelCommandTypeValues,
  runtimeWebSocketServerMessageTypeValues,
  managedToolEventRuntimePhase,
  runtimeEventEnvelopeToWebSocketEventFrame,
  createRuntimeWebSocketReplayPayload,
  isRuntimeWebSocketProviderThreadSubscriptionPayload,
  RuntimeProtocolError,
  normalizedResponseEventTypeValues,
  type RuntimeWebSocketClientCommand,
  type RuntimeWebSocketInitializeResponse,
  type RuntimeWebSocketPingResponse,
  type RuntimeWebSocketReplayUnavailablePayload,
  type RuntimeWebSocketServerEnvelope,
} from "../src/index.js"

test("runtime protocol exposes the expected provider identifiers", () => {
  assert.deepEqual(providerIdValues, ["openai", "anthropic", "openrouter", "ollama"])
  assert.match(runtimeErrorCodeValues.join(","), /PROVIDER_FAILED/)
  assert.match(runtimeErrorCodeValues.join(","), /CAPABILITY_UNAVAILABLE/)
  assert.match(runtimeErrorCodeValues.join(","), /MCP_TOOL_FAILED/)
  assert.match(runtimeErrorCodeValues.join(","), /SHELL_EXECUTION_FAILED/)
  assert.match(runtimeErrorCodeValues.join(","), /DAEMON_INTERNAL/)
  assert.match(runtimeErrorCodeValues.join(","), /PROTOCOL_ERROR/)
  assert.deepEqual(runtimeErrorCategoryValues, [
    "session",
    "provider",
    "mcp",
    "shell",
    "approval",
    "policy",
    "capability",
    "daemon",
    "protocol",
  ])
})

test("runtime protocol normalizes runtime error payloads", () => {
  assert.deepEqual(
    createRuntimeErrorPayload({
      category: "shell",
      code: "SHELL_EXECUTION_FAILED",
      details: { exitCode: 1 },
      message: "Command failed.",
      recoverable: true,
    }),
    {
      category: "shell",
      code: "SHELL_EXECUTION_FAILED",
      details: { exitCode: 1 },
      message: "Command failed.",
      recoverable: true,
    },
  )

  assert.deepEqual(
    createRuntimeErrorPayload({
      category: "protocol",
      code: "PROTOCOL_ERROR",
      message: "Malformed frame.",
    }),
    {
      category: "protocol",
      code: "PROTOCOL_ERROR",
      details: null,
      message: "Malformed frame.",
      recoverable: false,
    },
  )
})

test("runtime protocol exposes concrete protocol errors", () => {
  const error = new RuntimeProtocolError("PROTOCOL_ERROR", "Bad frame.", {
    frameType: "binary",
  })

  assert.equal(error.name, "RuntimeProtocolError")
  assert.equal(error.message, "Bad frame.")
  assert.equal(error.code, "PROTOCOL_ERROR")
  assert.deepEqual(error.details, { frameType: "binary" })
})

test("runtime protocol serializes provider capability states and reason codes", () => {
  assert.ok(providerCapabilityKeyValues.includes("turn.steer"))
  assert.ok(providerCapabilityKeyValues.includes("appServer.turnStart"))
  assert.ok(providerCapabilityKeyValues.includes("appServer.providerChildRequests"))
  assert.ok(providerCapabilityKeyValues.includes("appServer.replay"))
  assert.ok(providerCapabilityKeyValues.includes("appServer.reconnect"))
  assert.ok(providerCapabilityKeyValues.includes("appServer.resume"))
  assert.ok(providerCapabilityKeyValues.includes("pty.input.escape"))
  assert.ok(providerCapabilityKeyValues.includes("pty.input.ctrlC"))
  assert.ok(providerCapabilityKeyValues.includes("pty.input.enter"))
  assert.ok(providerCapabilityKeyValues.includes("pty.input.shiftEnter"))
  assert.ok(providerCapabilityKeyValues.includes("shell.nativeTty"))
  assert.ok(providerCapabilityStatusValues.includes("unsupportedByModel"))
  assert.ok(providerUnsupportedReasonCodeValues.includes("steering_not_supported"))
  assert.ok(providerUnsupportedReasonCodeValues.includes("native_tty_not_supported"))
  assert.ok(providerUnsupportedReasonCodeValues.includes("provider_child_requests_not_supported"))
  assert.ok(providerUnsupportedReasonCodeValues.includes("replay_not_supported"))
  assert.ok(providerUnsupportedReasonCodeValues.includes("reconnect_not_supported"))
  assert.ok(providerUnsupportedReasonCodeValues.includes("pty_input_ctrl_c_not_supported"))

  const supported = createSupportedCapabilityState("0.1.0")
  assert.deepEqual(JSON.parse(JSON.stringify(supported)), {
    since: "0.1.0",
    status: "supported",
  })

  const unavailable = createUnavailableCapabilityState({
    message: "Selected model does not support steering.",
    reasonCode: "steering_not_supported",
    status: "unsupportedByModel",
  })
  assert.deepEqual(JSON.parse(JSON.stringify(unavailable)), {
    message: "Selected model does not support steering.",
    reasonCode: "steering_not_supported",
    since: null,
    status: "unsupportedByModel",
  })

  assert.deepEqual(
    createRuntimeErrorPayload({
      category: "capability",
      code: "CAPABILITY_UNAVAILABLE",
      details: {
        capability: "turn.steer",
        reasonCode: unavailable.reasonCode,
      },
      message: "Capability is unavailable.",
    }),
    {
      category: "capability",
      code: "CAPABILITY_UNAVAILABLE",
      details: {
        capability: "turn.steer",
        reasonCode: "steering_not_supported",
      },
      message: "Capability is unavailable.",
      recoverable: false,
    },
  )
})

test("runtime protocol resolves model capability overrides before provider support", () => {
  const providerCapabilities = {
    "turn.steer": createSupportedCapabilityState(),
    "tools.calls": createSupportedCapabilityState(),
  }
  const modelCapabilities = {
    "turn.steer": createUnavailableCapabilityState({
      message: "This model cannot be steered.",
      reasonCode: "steering_not_supported",
      status: "unsupportedByModel",
    }),
  }

  assert.deepEqual(
    resolveProviderModelCapabilityState({
      capability: "turn.steer",
      modelCapabilities,
      providerCapabilities,
    }),
    modelCapabilities["turn.steer"],
  )
  assert.deepEqual(
    resolveProviderModelCapabilityState({
      capability: "tools.calls",
      modelCapabilities,
      providerCapabilities,
    }),
    providerCapabilities["tools.calls"],
  )
  assert.deepEqual(
    resolveProviderModelCapabilityState({
      capability: "shell.pty",
      providerCapabilities,
    }),
    {
      message: "Capability shell.pty is not reported by the selected provider or model.",
      reasonCode: "model_capability_unavailable",
      since: null,
      status: "unsupported",
    },
  )
})

test("runtime protocol defines the provider adapter boundary for Rust migration", () => {
  assert.deepEqual(providerAdapterExecutionHostValues, ["external", "rustNative"])
  assert.deepEqual(providerCredentialSourceValues, ["environment", "runtimeConfig", "externalProcess"])

  const boundary = createDefaultProviderAdapterBoundary("codex")
  assert.equal(boundary.providerId, "codex")
  assert.equal(boundary.executionHost, "external")
  assert.equal(boundary.rustOwns.sessionLifecycle, true)
  assert.equal(boundary.rustOwns.turnLifecycle, true)
  assert.equal(boundary.rustOwns.eventSequencing, true)
  assert.equal(boundary.rustOwns.toolLifecycle, false)
  assert.equal(boundary.rustOwns.shellExecution, false)
  assert.equal(boundary.externalOwns.credentialStorage, true)
  assert.equal(boundary.externalOwns.providerApiTransport, true)
  assert.deepEqual(boundary.normalizedErrorCodes, [
    "CAPABILITY_UNAVAILABLE",
    "PROVIDER_UNAVAILABLE",
    "PROVIDER_FAILED",
    "INVALID_REQUEST",
  ])
})

test("runtime protocol classifies managed tool lifecycle phases", () => {
  assert.equal(managedToolEventRuntimePhase("requested"), "requested")
  assert.equal(managedToolEventRuntimePhase("pending"), "requested")
  assert.equal(managedToolEventRuntimePhase("completed"), "completed")

  for (const phase of ["aborted", "error", "input_delta", "started", "updated"] as const) {
    assert.equal(managedToolEventRuntimePhase(phase), "updated")
  }
})

test("runtime protocol resolves preferred reasoning effort conservatively", () => {
  assert.equal(
    resolvePreferredReasoningEffort({
      reasoningEfforts: null,
    }),
    null,
  )

  assert.equal(
    resolvePreferredReasoningEffort({
      currentReasoningEffort: "high",
      reasoningEfforts: [
        { id: "low", label: "low" },
        { id: "high", label: "high" },
      ],
    }),
    "high",
  )

  assert.equal(
    resolvePreferredReasoningEffort({
      reasoningEfforts: [
        { id: "xhigh", label: "xhigh" },
        { id: "minimal", label: "minimal" },
        { id: "medium", label: "medium" },
      ],
    }),
    "minimal",
  )

  assert.equal(
    resolvePreferredReasoningEffort({
      reasoningEfforts: [
        { id: "custom-a", label: "custom-a" },
        { id: "custom-b", label: "custom-b" },
      ],
    }),
    "custom-a",
  )
})

test("runtime protocol exposes typed websocket client commands", () => {
  assert.deepEqual(runtimeWebSocketClientMethodValues.slice(0, 13), [
    "initialize",
    "ping",
    "agent.list",
    "provider.list",
    "provider.models",
    "providerModel.command",
    "config/bootstrapCodexHome",
    "account.read",
    "account.login.start",
    "account.login.cancel",
    "account.rateLimits.read",
    "approval.resolve",
    "providerChild.serverRequest.respond",
  ])
  assert.ok(runtimeWebSocketClientMethodValues.includes("subscribe"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("unsubscribe"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("resume"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("thread.rollback"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("thread.shellCommand"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("thread.backgroundTerminals.clean"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("account.read"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("account.login.start"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("account.login.cancel"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("account.rateLimits.read"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("agent.list"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("approval.resolve"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("providerChild.serverRequest.respond"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("skills.list"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("plugin.list"))
  assert.ok(runtimeWebSocketClientMethodValues.includes("mcpServerStatus/list"))

  const providerCommand: RuntimeWebSocketClientCommand = {
    method: "provider.models",
    payload: {
      providerId: "codex",
    },
    protocolVersion: "0.1.5",
    requestId: "req_provider_models",
  }

  const providerModelCommand: RuntimeWebSocketClientCommand = {
    method: "providerModel.command",
    payload: {
      command: { type: "provider.current" },
      prompt: "/provider",
      sessionId: "ses_123",
    },
    protocolVersion: "0.1.5",
    requestId: "req_provider_model_command",
  }

  const configBootstrapCommand: RuntimeWebSocketClientCommand = {
    method: "config/bootstrapCodexHome",
    payload: {
      interbase_home: "/tmp/interbase/codex-home",
      workspace_root: "/tmp/interbase",
    },
    protocolVersion: "0.1.5",
    requestId: "req_config_bootstrap",
  }

  const command: RuntimeWebSocketClientCommand = {
    method: "turn.start",
    payload: {
      input: ["hello"],
      threadId: "thr_123",
    },
    protocolVersion: "0.1.5",
    requestId: "req_123",
  }

  const rollbackCommand: RuntimeWebSocketClientCommand = {
    method: "thread.rollback",
    payload: {
      numTurns: 1,
      threadId: "thr_123",
    },
    protocolVersion: "0.1.5",
    requestId: "req_rollback",
  }

  const shellCommand: RuntimeWebSocketClientCommand = {
    method: "thread.shellCommand",
    payload: {
      args: ["hello"],
      command: "printf",
      cwd: "/tmp",
      environment: {
        INTERBASE_TEST: "1",
      },
      threadId: "thr_123",
      turnId: "turn_123",
    },
    protocolVersion: "0.1.5",
    requestId: "req_shell",
  }

  const cleanBackgroundTerminals: RuntimeWebSocketClientCommand = {
    method: "thread.backgroundTerminals.clean",
    payload: {
      threadId: "thr_123",
    },
    protocolVersion: "0.1.5",
    requestId: "req_bg_clean",
  }

  const accountRead: RuntimeWebSocketClientCommand = {
    method: "account.read",
    payload: {
      interbaseHome: "/tmp/interbase/codex-home",
    },
    protocolVersion: "0.1.5",
    requestId: "req_account_read",
  }

  const accountLogin: RuntimeWebSocketClientCommand = {
    method: "account.login.start",
    payload: {
      apiKey: "sk-test",
      interbaseHome: "/tmp/interbase/codex-home",
      type: "apiKey",
    },
    protocolVersion: "0.1.5",
    requestId: "req_account_login",
  }

  const skillsList: RuntimeWebSocketClientCommand = {
    method: "skills.list",
    payload: {
      cwds: ["/tmp/interbase"],
    },
    protocolVersion: "0.1.5",
    requestId: "req_skills",
  }

  const providerChildServerRequestRespond: RuntimeWebSocketClientCommand = {
    method: "providerChild.serverRequest.respond",
    payload: {
      requestId: "req_provider_child",
      response: {
        jsonrpc: "2.0",
        id: "req_provider_child",
        result: { decision: "approved" },
      },
    },
    protocolVersion: "0.1.5",
    requestId: "req_provider_child_response",
  }

  const mcpServerStatusList: RuntimeWebSocketClientCommand = {
    method: "mcpServerStatus/list",
    payload: {
      detail: "toolsAndAuthOnly",
      limit: 100,
    },
    protocolVersion: "0.1.5",
    requestId: "req_mcp_status",
  }

  assert.equal(providerCommand.method, "provider.models")
  assert.equal(JSON.parse(JSON.stringify(providerCommand)).payload.providerId, "codex")
  assert.equal(providerModelCommand.method, "providerModel.command")
  assert.equal(JSON.parse(JSON.stringify(providerModelCommand)).payload.command.type, "provider.current")
  assert.equal(configBootstrapCommand.method, "config/bootstrapCodexHome")
  assert.equal(JSON.parse(JSON.stringify(configBootstrapCommand)).payload.interbase_home, "/tmp/interbase/codex-home")
  assert.equal(command.method, "turn.start")
  assert.equal(accountRead.method, "account.read")
  assert.equal(JSON.parse(JSON.stringify(accountRead)).payload.interbaseHome, "/tmp/interbase/codex-home")
  assert.equal(accountLogin.method, "account.login.start")
  assert.equal(JSON.parse(JSON.stringify(accountLogin)).payload.type, "apiKey")
  assert.equal(skillsList.method, "skills.list")
  assert.equal(providerChildServerRequestRespond.method, "providerChild.serverRequest.respond")
  assert.equal(
    JSON.parse(JSON.stringify(providerChildServerRequestRespond)).payload.response.result.decision,
    "approved",
  )
  assert.equal(mcpServerStatusList.method, "mcpServerStatus/list")
  assert.equal(JSON.parse(JSON.stringify(mcpServerStatusList)).payload.detail, "toolsAndAuthOnly")
  assert.equal(JSON.parse(JSON.stringify(command)).payload.threadId, "thr_123")
  assert.equal(rollbackCommand.method, "thread.rollback")
  assert.equal(JSON.parse(JSON.stringify(rollbackCommand)).payload.numTurns, 1)
  assert.equal(shellCommand.method, "thread.shellCommand")
  assert.equal(JSON.parse(JSON.stringify(shellCommand)).payload.command, "printf")
  assert.equal(cleanBackgroundTerminals.method, "thread.backgroundTerminals.clean")
  assert.equal(JSON.parse(JSON.stringify(cleanBackgroundTerminals)).payload.threadId, "thr_123")
})

test("runtime protocol rejects unknown websocket client methods", () => {
  assert.equal(isRuntimeWebSocketClientMethod("session.create"), true)
  assert.equal(isRuntimeWebSocketClientMethod("session.list"), false)
  assert.equal(isRuntimeWebSocketClientMethod("session.messages"), false)
  assert.equal(isRuntimeWebSocketClientMethod("provider.models"), true)
  assert.equal(isRuntimeWebSocketClientMethod("agent.list"), true)
  assert.equal(isRuntimeWebSocketClientMethod("thread.rollback"), true)
  assert.equal(isRuntimeWebSocketClientMethod("thread.shellCommand"), true)
  assert.equal(isRuntimeWebSocketClientMethod("thread.backgroundTerminals.clean"), true)
  assert.equal(isRuntimeWebSocketClientMethod("mcpServerStatus/list"), true)
  assert.equal(isRuntimeWebSocketClientMethod("unknown.method"), false)
})

test("runtime protocol validates websocket client command envelopes for runtime ingress", () => {
  const validCommand: RuntimeWebSocketClientCommand = {
    method: "ping",
    payload: { message: "hello" },
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: "req_ping",
  }
  assert.equal(isRuntimeWebSocketClientCommand(validCommand), true)
  assert.equal(isRuntimeWebSocketClientCommand(null), false)
  assert.equal(isRuntimeWebSocketClientCommand({ ...validCommand, requestId: "" }), false)
  assert.equal(isRuntimeWebSocketClientCommand({ ...validCommand, protocolVersion: "0.0.0" }), false)
  assert.equal(isRuntimeWebSocketClientCommand({ ...validCommand, method: "future.method" }), false)
  assert.equal(isRuntimeWebSocketClientCommand({ ...validCommand, payload: null }), false)
  assert.equal(isRuntimeWebSocketClientCommand({ ...validCommand, payload: {} }), false)
  assert.equal(
    isRuntimeWebSocketClientCommand({
      method: "initialize",
      payload: {
        clientName: "ios",
        clientVersion: "1.0.0",
        supportedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
        supportedRuntimeApiVersions: [runtimeWebSocketProtocolVersion],
      },
      protocolVersion: runtimeWebSocketProtocolVersion,
      requestId: "req_initialize",
    }),
    true,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      method: "initialize",
      payload: {
        clientName: "ios",
        clientVersion: "",
        supportedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
      },
      protocolVersion: runtimeWebSocketProtocolVersion,
      requestId: "req_initialize",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      method: "provider.list",
      payload: {},
      protocolVersion: runtimeWebSocketProtocolVersion,
      requestId: "req_provider_list",
    }),
    true,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      method: "agent.list",
      payload: {},
      protocolVersion: runtimeWebSocketProtocolVersion,
      requestId: "req_agent_list",
    }),
    true,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      ...validCommand,
      method: "providerModel.command",
      payload: {
        command: { type: "model.current" },
        prompt: "",
        sessionId: "ses_1",
      },
    }),
    true,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      ...validCommand,
      method: "providerModel.command",
      payload: {
        command: { type: "future.subcommand" },
        prompt: "",
        sessionId: "ses_1",
      },
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      ...validCommand,
      method: "provider.models",
      payload: {},
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      ...validCommand,
      method: "session.create",
      payload: {
        providerId: "openai",
      },
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      ...validCommand,
      method: "session.message",
      payload: {
        input: { content: "hello", mode: "sideways" },
        sessionId: "ses_1",
      },
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      ...validCommand,
      method: "thread.shellCommand",
      payload: {
        args: ["hello"],
        command: "printf",
        environment: { INTERBASE_TEST: 1 },
        threadId: "thr_1",
      },
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      ...validCommand,
      method: "turn.start",
      payload: {
        input: "hello",
        threadId: "thr_1",
      },
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketClientCommand({
      ...validCommand,
      method: "subscribe",
      payload: {
        afterSequence: 1,
        threadId: "",
      },
    }),
    false,
  )
})

test("runtime protocol validates method-specific websocket client payloads", () => {
  const command = (method: RuntimeWebSocketClientCommand["method"], payload: Record<string, unknown>) => ({
    method,
    payload,
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: `req_${method.replaceAll(/[/.]/g, "_")}`,
  })

  const threadOptions = {
    approvalPolicy: "on-request",
    cwd: "/tmp/project",
    model: "gpt-5.4",
    modelProvider: "openai",
    sandbox: "workspace-write",
    sandboxPolicy: "workspace-write",
  }
  const createSessionInput = {
    approvalPolicy: "on-request",
    executionMode: "managed",
    fastMode: false,
    model: "gpt-5.4",
    permissionPresetId: "preset_1",
    providerId: "openai",
    reasoningEffort: "medium",
    sandboxMode: "workspace-write",
    title: "Session",
    trustModel: true,
    workspaceRoot: "/tmp/project",
  }
  const updateSessionInput = {
    approvalPolicy: "never",
    fastMode: true,
    model: "gpt-5.4",
    permissionPresetId: "preset_1",
    providerId: "openai",
    reasoningEffort: "high",
    sandboxMode: "read-only",
    title: "Updated",
  }

  for (const input of [
    command("provider.models", { providerId: "openai" }),
    command("providerModel.command", {
      command: { model: "gpt-5.4", type: "model.set" },
      prompt: "",
      sessionId: "ses_1",
    }),
    command("providerModel.command", {
      command: { providerId: "anthropic", type: "provider.set" },
      prompt: "",
      sessionId: "ses_1",
    }),
    command("config/bootstrapCodexHome", {
      interbase_home: "/tmp/interbase-home",
      workspace_root: "/tmp/project",
    }),
    command("account.read", { interbaseHome: null }),
    command("account.login.start", {
      apiKey: null,
      interbaseHome: "/tmp/interbase-home",
      providerId: "openai",
      type: "apiKey",
    }),
    command("account.login.cancel", { loginId: "login_1" }),
    command("approval.resolve", {
      approvalId: "approval_1",
      decision: "Rejected",
    }),
    command("providerChild.serverRequest.respond", {
      requestId: "srv_1",
      response: null,
    }),
    command("skills.list", { cwds: ["/tmp/project"] }),
    command("mcpServerStatus/list", {
      cursor: null,
      detail: "full",
      limit: 50,
    }),
    command("session.create", createSessionInput),
    command("session.read", { sessionId: "ses_1" }),
    command("session.update", {
      input: updateSessionInput,
      sessionId: "ses_1",
    }),
    command("session.message", {
      input: { content: "hello", mode: "interrupt" },
      sessionId: "ses_1",
    }),
    command("session.close", { sessionId: "ses_1" }),
    command("nativeShell.prepare", {
      input: { initialInput: "pwd" },
      sessionId: "ses_1",
    }),
    command("thread.start", threadOptions),
    command("thread.read", { includeTurns: true, threadId: "thr_1" }),
    command("thread.resume", {
      ...threadOptions,
      persistExtendedHistory: true,
      threadId: "thr_1",
    }),
    command("thread.fork", {
      ...threadOptions,
      ephemeral: true,
      path: null,
      threadId: "thr_1",
    }),
    command("thread.rollback", { numTurns: 1, threadId: "thr_1" }),
    command("thread.shellCommand", {
      approvalPolicy: null,
      args: ["hello"],
      command: "printf",
      cwd: "/tmp/project",
      environment: { INTERBASE_TEST: "1" },
      sandboxPolicy: "workspace-write",
      sessionId: "ses_1",
      threadId: "thr_1",
      turnId: "turn_1",
    }),
    command("thread.backgroundTerminals.clean", { threadId: "thr_1" }),
    command("turn.start", {
      ...threadOptions,
      effort: null,
      input: ["hello"],
      personality: "concise",
      summary: "summary",
      threadId: "thr_1",
    }),
    command("turn.interrupt", { threadId: "thr_1", turnId: "turn_1" }),
    command("turn.steer", {
      expectedTurnId: "turn_1",
      input: ["steer"],
      threadId: "thr_1",
    }),
    command("unsubscribe", { afterSequence: 1, threadId: "thr_1" }),
    command("resume", {
      afterSequence: 1,
      clientId: "client_1",
      threadRef: { providerId: "openai", threadId: "thr_1" },
    }),
  ]) {
    assert.equal(isRuntimeWebSocketClientCommand(input), true, input.method)
  }

  for (const input of [
    command("provider.models", { providerId: "" }),
    command("providerModel.command", {
      command: { type: "model.set" },
      prompt: "",
      sessionId: "ses_1",
    }),
    command("providerModel.command", {
      command: { type: "provider.set" },
      prompt: "",
      sessionId: "ses_1",
    }),
    command("providerModel.command", {
      command: { type: "model.current" },
      prompt: 1,
      sessionId: "ses_1",
    }),
    command("config/bootstrapCodexHome", {
      interbase_home: "",
      workspace_root: "/tmp/project",
    }),
    command("account.read", { interbaseHome: 1 }),
    command("account.login.start", {
      apiKey: 1,
      interbaseHome: "/tmp/interbase-home",
      providerId: "openai",
      type: "apiKey",
    }),
    command("account.login.cancel", { loginId: 1 }),
    command("approval.resolve", {
      approvalId: "approval_1",
      decision: "Maybe",
    }),
    command("providerChild.serverRequest.respond", { requestId: "" }),
    command("skills.list", { cwds: [1] }),
    command("mcpServerStatus/list", {
      cursor: null,
      detail: "unknown",
      limit: 50,
    }),
    command("mcpServerStatus/list", {
      cursor: null,
      detail: "full",
      limit: -1,
    }),
    command("session.create", {
      ...createSessionInput,
      executionMode: "sideways",
    }),
    command("session.create", {
      ...createSessionInput,
      sandboxMode: "danger",
    }),
    command("session.create", {
      ...createSessionInput,
      approvalPolicy: "always",
    }),
    command("session.create", {
      ...createSessionInput,
      trustModel: null,
    }),
    command("session.update", {
      input: { ...updateSessionInput, fastMode: "yes" },
      sessionId: "ses_1",
    }),
    command("session.message", {
      input: { content: "hello", mode: "sideways" },
      sessionId: "ses_1",
    }),
    command("nativeShell.prepare", {
      input: { initialInput: 1 },
      sessionId: "ses_1",
    }),
    command("thread.start", { approvalPolicy: 1 }),
    command("thread.read", { includeTurns: "yes", threadId: "thr_1" }),
    command("thread.resume", {
      ...threadOptions,
      persistExtendedHistory: "yes",
      threadId: "thr_1",
    }),
    command("thread.fork", {
      ...threadOptions,
      ephemeral: "yes",
      threadId: "thr_1",
    }),
    command("thread.fork", {
      ...threadOptions,
      path: 1,
      threadId: "thr_1",
    }),
    command("thread.rollback", { numTurns: -1, threadId: "thr_1" }),
    command("thread.shellCommand", {
      args: ["hello"],
      command: "printf",
      environment: { INTERBASE_TEST: 1 },
      threadId: "thr_1",
    }),
    command("thread.backgroundTerminals.clean", { threadId: "" }),
    command("turn.start", {
      input: ["hello"],
      personality: 1,
      threadId: "thr_1",
    }),
    command("turn.interrupt", { threadId: "thr_1", turnId: "" }),
    command("turn.steer", {
      expectedTurnId: "turn_1",
      input: "steer",
      threadId: "thr_1",
    }),
    command("subscribe", { afterSequence: 1 }),
    command("unsubscribe", { afterSequence: "1", threadId: "thr_1" }),
    command("resume", {
      afterSequence: 1,
      clientId: 1,
      threadRef: { providerId: "openai", threadId: "thr_1" },
    }),
  ]) {
    assert.equal(isRuntimeWebSocketClientCommand(input), false, input.method)
  }
})

test("runtime protocol exposes provider-model command discriminants", () => {
  assert.deepEqual(runtimeWebSocketProviderModelCommandTypeValues, [
    "model.current",
    "model.list",
    "model.set",
    "provider.current",
    "provider.list",
    "provider.set",
  ])
})

test("runtime protocol exposes typed websocket server envelopes", () => {
  assert.deepEqual(runtimeWebSocketServerMessageTypeValues, [
    "response",
    "error",
    "event",
    "delivery",
    "serverRequest",
    "heartbeat",
    "protocolVersionMismatch",
  ])

  const envelope: RuntimeWebSocketServerEnvelope<{ echoed: string }> = {
    payload: {
      echoed: "hello",
    },
    requestId: "req_123",
    success: true,
    type: "response",
  }

  assert.equal(envelope.type, "response")
  assert.equal(envelope.success, true)
  assert.equal(JSON.parse(JSON.stringify(envelope)).payload.echoed, "hello")

  const unavailable: RuntimeWebSocketServerEnvelope<RuntimeWebSocketReplayUnavailablePayload> = {
    payload: {
      afterSequence: 99,
      reason: "event log has been compacted",
      recoverable: false,
      subscription: {
        afterSequence: 99,
        threadRef: {
          providerId: "codex",
          threadId: "thr_123",
        },
      },
    },
    requestId: "req_replay",
    success: false,
    type: "response",
  }
  assert.equal(unavailable.success, false)
  assert.equal(unavailable.payload.recoverable, false)

  const error: RuntimeWebSocketServerEnvelope = {
    error: {
      code: "PROTOCOL_ERROR",
      message: "Invalid request.",
      recoverable: false,
    },
    requestId: "req_bad",
    success: false,
    type: "error",
  }
  assert.equal(error.error.code, "PROTOCOL_ERROR")

  const delivery: RuntimeWebSocketServerEnvelope = {
    delivery: {
      id: "delivery_1",
      mode: "liveOnly",
      origin: {
        kind: "providerChild",
        providerId: "openai",
        providerRunId: "run_1",
      },
      payload: {
        kind: "notification",
        notification: {
          method: "item/agentMessage/delta",
          params: {
            delta: "hello",
            itemId: "item_1",
            threadId: "thr_1",
            turnId: "turn_1",
          },
        },
      },
      threadId: "thr_1",
      turnId: "turn_1",
    },
    type: "delivery",
  }
  assert.equal(delivery.type, "delivery")
  assert.equal(JSON.parse(JSON.stringify(delivery)).delivery.mode, "liveOnly")
  assert.equal(JSON.parse(JSON.stringify(delivery)).delivery.origin.kind, "providerChild")

  const bridgeDelivery: RuntimeWebSocketServerEnvelope = {
    delivery: {
      id: "event:thr_1:7:bridgeNotification:codex",
      mode: "liveOnly",
      origin: {
        kind: "providerChild",
        providerId: "openai",
        providerRunId: "run_1",
      },
      payload: {
        kind: "bridgeNotification",
        method: "configWarning",
        params: {
          summary: "deprecated flag",
        },
      },
      threadId: "thr_1",
      turnId: "turn_1",
    },
    type: "delivery",
  }
  assert.equal(JSON.parse(JSON.stringify(bridgeDelivery)).delivery.payload.kind, "bridgeNotification")
  assert.equal(JSON.parse(JSON.stringify(bridgeDelivery)).delivery.payload.method, "configWarning")
})

test("runtime protocol owns method-keyed websocket response schemas", () => {
  assert.deepEqual(runtimeWebSocketResponsePayloadKindValues, [
    "acknowledgement",
    "account",
    "credential",
    "metadata",
    "provider",
    "session",
    "thread",
    "turn",
    "replay",
    "shell",
    "unknown",
  ])
  assert.equal(runtimeWebSocketResponseSchemas.length, runtimeWebSocketClientMethodValues.length)
  assert.deepEqual(
    runtimeWebSocketResponseSchemas.map((schema) => schema.method),
    runtimeWebSocketClientMethodValues,
  )
  assert.deepEqual(runtimeWebSocketResponseSchemaForMethod("ping"), {
    method: "ping",
    payloadKind: "acknowledgement",
    serverMessageTypes: ["response", "error", "heartbeat", "protocolVersionMismatch"],
  })
  assert.equal(runtimeWebSocketResponseSchemaForMethod("thread.read").payloadKind, "thread")
  assert.equal(runtimeWebSocketResponseSchemaForMethod("resume").payloadKind, "replay")
})

test("runtime protocol validates method-keyed websocket metadata response payloads", () => {
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "ping",
      {
        payload: {
          message: "pong",
          timestamp: "2026-05-08T20:00:00.000Z",
        },
        requestId: "req_ping",
        success: true,
        type: "response",
      },
      "req_ping",
    ),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "ping",
      {
        payload: { echoed: "req_ping" },
        requestId: "req_ping",
        success: true,
        type: "response",
      },
      "req_ping",
    ),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "initialize",
      {
        payload: {
          acceptedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
          capabilities: ["runtime.metadata"],
          protocolVersion: runtimeWebSocketProtocolVersion,
          serverName: "interbase-remote-runtime",
          serverVersion: "0.1.0",
        },
        requestId: "req_initialize",
        success: true,
        type: "response",
      },
      "req_initialize",
    ),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "ping",
      {
        error: {
          code: "PROTOCOL_ERROR",
          message: "bad",
          recoverable: false,
        },
        requestId: "req_ping",
        success: false,
        type: "error",
      },
      "req_ping",
    ),
    true,
  )
  assert.equal(isRuntimeWebSocketServerEnvelopeForMethod("ping", null, "req_ping"), false)
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "ping",
      {
        payload: "pong",
        requestId: "req_ping",
        success: true,
        type: "response",
      },
      "req_ping",
    ),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "thread.read",
      {
        payload: { threadId: "thr_1" },
        requestId: "req_thread_read",
        success: true,
        type: "response",
      },
      "req_thread_read",
    ),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "subscribe",
      {
        payload: {
          events: [
            {
              eventType: "session.recovery",
              payload: { type: "session.recovery" },
              sequence: 1,
              sessionId: "ses_1",
              timestamp: "2026-05-08T20:00:00.000Z",
            },
          ],
          nextSequence: 2,
          replayedCount: 1,
        },
        requestId: "req_subscribe",
        success: true,
        type: "response",
      },
      "req_subscribe",
    ),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "resume",
      {
        payload: {
          afterSequence: 4,
          reason: "Replay store is unavailable.",
          recoverable: false,
          subscription: {
            afterSequence: 4,
            threadRef: {
              providerId: "openai",
              threadId: "thr_1",
            },
          },
        },
        requestId: "req_resume",
        success: true,
        type: "response",
      },
      "req_resume",
    ),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "subscribe",
      {
        payload: {
          events: [{ eventType: "session.recovery" }],
          nextSequence: 2,
          replayedCount: 1,
        },
        requestId: "req_subscribe",
        success: true,
        type: "response",
      },
      "req_subscribe",
    ),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelopeForMethod(
      "resume",
      {
        payload: {
          afterSequence: 4,
          reason: "Replay store is unavailable.",
          recoverable: true,
          subscription: {
            threadId: "thr_unscoped",
          },
        },
        requestId: "req_resume",
        success: true,
        type: "response",
      },
      "req_resume",
    ),
    false,
  )
})

test("runtime protocol owns metadata initialize and ping response shapes", () => {
  const initialize: RuntimeWebSocketInitializeResponse = {
    acceptedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
    capabilities: ["runtime.metadata"],
    protocolVersion: runtimeWebSocketProtocolVersion,
    serverName: "interbase-remote-runtime",
    serverVersion: "1.0.0",
  }
  const ping: RuntimeWebSocketPingResponse = {
    message: "pong:hello",
    timestamp: "2026-05-08T20:00:00.000Z",
  }

  assert.deepEqual(JSON.parse(JSON.stringify(initialize)), {
    acceptedRuntimeApiVersion: runtimeWebSocketProtocolVersion,
    capabilities: ["runtime.metadata"],
    protocolVersion: runtimeWebSocketProtocolVersion,
    serverName: "interbase-remote-runtime",
    serverVersion: "1.0.0",
  })
  assert.deepEqual(JSON.parse(JSON.stringify(ping)), {
    message: "pong:hello",
    timestamp: "2026-05-08T20:00:00.000Z",
  })
})

test("runtime protocol validates websocket server envelopes for gateway ingress", () => {
  assert.equal(
    isRuntimeWebSocketServerEnvelope(
      {
        payload: { pong: true },
        requestId: "req_ping",
        success: true,
        type: "response",
      },
      "req_ping",
    ),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope(
      {
        error: { code: "PROTOCOL_ERROR", message: "bad", recoverable: false },
        requestId: "req_bad",
        success: false,
        type: "error",
      },
      "req_bad",
    ),
    true,
  )
  assert.equal(isRuntimeWebSocketServerEnvelope(null), false)
  assert.equal(
    isRuntimeWebSocketServerEnvelope(
      {
        payload: {},
        requestId: "wrong",
        success: true,
        type: "response",
      },
      "req_ping",
    ),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      error: null,
      requestId: "req_bad",
      success: false,
      type: "error",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      event: {
        eventType: "session.created",
        payload: {},
        sequence: 1,
        sessionId: "ses_1",
        timestamp: "2026-05-08T20:00:00.000Z",
      },
      type: "event",
    }),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      event: {
        eventType: "future.event",
        payload: {},
        sequence: 1,
        sessionId: "ses_1",
        timestamp: "2026-05-08T20:00:00.000Z",
      },
      type: "event",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      event: {
        eventType: "session.created",
        payload: {},
        sequence: -1,
        sessionId: "ses_1",
        timestamp: "2026-05-08T20:00:00.000Z",
      },
      type: "event",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      event: {
        eventType: "session.created",
        payload: {},
        sequence: 1,
        sessionId: "",
        timestamp: "2026-05-08T20:00:00.000Z",
      },
      type: "event",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      delivery: {
        id: "delivery_1",
        mode: "liveOnly",
        origin: { kind: "runtime" },
        payload: { kind: "notification", notification: {} },
      },
      type: "delivery",
    }),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      delivery: {
        id: "",
        mode: "liveOnly",
        origin: { kind: "runtime" },
        payload: { kind: "notification", notification: {} },
      },
      type: "delivery",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      delivery: {
        id: "delivery_1",
        mode: "future",
        origin: { kind: "runtime" },
        payload: { kind: "notification", notification: {} },
      },
      type: "delivery",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      delivery: {
        id: "delivery_1",
        mode: "liveOnly",
        origin: { kind: "future" },
        payload: { kind: "notification", notification: {} },
      },
      type: "delivery",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      delivery: {
        id: "delivery_1",
        mode: "liveOnly",
        origin: { kind: "runtime" },
        payload: { kind: "future" },
      },
      type: "delivery",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      payload: {},
      requestId: "srv_1",
      type: "serverRequest",
    }),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      timestamp: "2026-05-08T20:00:00.000Z",
      type: "heartbeat",
    }),
    true,
  )
  assert.equal(
    isRuntimeWebSocketServerEnvelope({
      expectedVersion: runtimeWebSocketProtocolVersion,
      message: "Mismatch",
      receivedVersion: "future",
      type: "protocolVersionMismatch",
    }),
    true,
  )
  assert.equal(isRuntimeWebSocketServerEnvelope({ type: "future" }), false)
})

test("runtime protocol catalogs required websocket event types", () => {
  assert.deepEqual(runtimeWebSocketEventTypeValues, [
    "session.created",
    "session.updated",
    "session.closed",
    "thread.started",
    "thread.updated",
    "thread.resumed",
    "thread.forked",
    "thread.rollback",
    "session.message.created",
    "session.run.started",
    "session.output.delta",
    "session.output.completed",
    "session.message.completed",
    "session.interbase.notification",
    "session.run.completed",
    "session.run.failed",
    "session.item.started",
    "session.recovery",
    "provider.child.serverRequest",
    "tool.call.started",
    "tool.call.progress",
    "tool.call.completed",
    "tool.call.failed",
    "approval.requested",
    "approval.resolved",
    "shell.command.started",
    "shell.command.output",
    "shell.command.completed",
    "shell.command.failed",
    "mcp.server.status.changed",
    "daemon.warning",
    "daemon.error",
    ...normalizedResponseEventTypeValues,
  ])
  assert.equal(isRuntimeWebSocketEventType("session.run.failed"), true)
  assert.equal(isRuntimeWebSocketEventType("unknown.event"), false)
})

test("runtime protocol negotiates websocket protocol versions explicitly", () => {
  assert.equal(runtimeWebSocketProtocolVersion, "0.1.6")
  assert.deepEqual([...supportedRuntimeWebSocketProtocolVersions], ["0.1.5", "0.1.6"])
  assert.equal(isRuntimeWebSocketProtocolVersionSupported("0.1.5"), true)
  assert.equal(isRuntimeWebSocketProtocolVersionSupported("0.1.6"), true)
  assert.equal(isRuntimeWebSocketProtocolVersionSupported("0.0.0"), false)
  assert.equal(
    selectRuntimeWebSocketProtocolVersion({
      clientName: "ios",
      clientVersion: "1.0.0",
      supportedRuntimeApiVersion: "0.1.5",
      supportedRuntimeApiVersions: ["0.1.5", "0.1.6"],
    }),
    "0.1.6",
  )
  assert.equal(
    selectRuntimeWebSocketProtocolVersion({
      clientName: "ios",
      clientVersion: "1.0.0",
      supportedRuntimeApiVersion: "0.1.5",
    }),
    "0.1.5",
  )
  assert.equal(
    selectRuntimeWebSocketProtocolVersion({
      clientName: "ios",
      clientVersion: "1.0.0",
      supportedRuntimeApiVersion: "0.0.1",
      supportedRuntimeApiVersions: ["0.0.1"],
    }),
    null,
  )

  const mismatch = createRuntimeWebSocketProtocolVersionMismatch({
    receivedVersion: "0.0.0",
  })

  assert.equal(mismatch.type, "protocolVersionMismatch")
  assert.equal(mismatch.expectedVersion, "0.1.6")
  assert.match(mismatch.message, /expected 0\.1\.6, got 0\.0\.0/)
  assert.match(mismatch.message, /Supported versions: 0\.1\.5, 0\.1\.6/)

  assert.deepEqual(
    createRuntimeWebSocketProtocolVersionMismatch({
      expectedVersion: "0.2.0",
      receivedVersion: "0.1.6",
    }),
    {
      expectedVersion: "0.2.0",
      message:
        "Runtime WebSocket protocol version mismatch: expected 0.2.0, got 0.1.6. Supported versions: 0.1.5, 0.1.6. Update the CLI/runtime or update the client so their supported protocol windows overlap.",
      receivedVersion: "0.1.6",
      type: "protocolVersionMismatch",
    },
  )
})

test("runtime protocol maps runtime events to websocket event frames", () => {
  const normalizedFrame = runtimeEventEnvelopeToWebSocketEventFrame({
    event: {
      attempt: 1,
      causationId: null,
      correlationId: "corr_123",
      dedupeKey: "dedupe_123",
      eventId: "evt_123",
      eventType: "response.completed",
      itemId: null,
      model: "gpt-5.4",
      originResponseId: null,
      payload: {
        finishReason: "stop",
      },
      providerId: "openai",
      providerMetadataRef: null,
      responseId: "rsp_123",
      runId: "run_123",
      schemaVersion: 1,
      sequence: 6,
      sessionId: "ses_123",
      timestamp: "2026-04-18T21:59:00Z",
    },
    sequence: 6,
    sessionId: "ses_123",
    timestamp: "2026-04-18T21:59:00Z",
  })

  assert.equal(normalizedFrame.eventType, "response.completed")
  assert.deepEqual(normalizedFrame.payload, {
    attempt: 1,
    causationId: null,
    correlationId: "corr_123",
    dedupeKey: "dedupe_123",
    eventId: "evt_123",
    eventType: "response.completed",
    itemId: null,
    model: "gpt-5.4",
    originResponseId: null,
    payload: {
      finishReason: "stop",
    },
    providerId: "openai",
    providerMetadataRef: null,
    responseId: "rsp_123",
    runId: "run_123",
    schemaVersion: 1,
    sequence: 6,
    sessionId: "ses_123",
    timestamp: "2026-04-18T21:59:00Z",
  })

  const frame = runtimeEventEnvelopeToWebSocketEventFrame({
    event: {
      summary: "recovered",
      type: "session.recovery",
    },
    sequence: 7,
    sessionId: "ses_123",
    timestamp: "2026-04-18T22:00:00Z",
  })

  assert.deepEqual(frame, {
    eventType: "session.recovery",
    payload: {
      summary: "recovered",
      type: "session.recovery",
    },
    sequence: 7,
    sessionId: "ses_123",
    timestamp: "2026-04-18T22:00:00Z",
  })
})

test("runtime protocol describes websocket resume replay payloads", () => {
  const replay = createRuntimeWebSocketReplayPayload([
    {
      eventType: "session.recovery",
      payload: {
        summary: "recovered",
        type: "session.recovery",
      },
      sequence: 10,
      sessionId: "ses_123",
      timestamp: "2026-04-18T22:00:00Z",
    },
  ])

  assert.equal(replay.replayedCount, 1)
  assert.equal(replay.nextSequence, 11)
  assert.equal(replay.events[0]?.eventType, "session.recovery")

  assert.deepEqual(createRuntimeWebSocketReplayPayload([]), {
    events: [],
    nextSequence: 0,
    replayedCount: 0,
  })
})

test("runtime protocol identifies provider-thread websocket subscription payloads", () => {
  const providerThreadSubscription = {
    afterSequence: 7,
    threadRef: {
      providerId: "openai",
      threadId: "thr_123",
    },
  }

  const subscribe: RuntimeWebSocketClientCommand = {
    method: "subscribe",
    payload: providerThreadSubscription,
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: "req_subscribe",
  }
  const unsubscribe: RuntimeWebSocketClientCommand = {
    method: "unsubscribe",
    payload: providerThreadSubscription,
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: "req_unsubscribe",
  }
  const resume: RuntimeWebSocketClientCommand = {
    method: "resume",
    payload: {
      ...providerThreadSubscription,
      clientId: "client_1",
    },
    protocolVersion: runtimeWebSocketProtocolVersion,
    requestId: "req_resume",
  }

  assert.equal(isRuntimeWebSocketClientCommand(subscribe), true)
  assert.equal(isRuntimeWebSocketClientCommand(unsubscribe), true)
  assert.equal(isRuntimeWebSocketClientCommand(resume), true)
  assert.equal(isRuntimeWebSocketProviderThreadSubscriptionPayload(subscribe.payload), true)
  assert.equal(
    isRuntimeWebSocketProviderThreadSubscriptionPayload({
      afterSequence: 7,
      sessionId: "ses_legacy",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketProviderThreadSubscriptionPayload({
      afterSequence: 7,
      threadId: "thr_unscoped",
    }),
    false,
  )
  assert.equal(
    isRuntimeWebSocketProviderThreadSubscriptionPayload({
      afterSequence: -1,
      threadRef: {
        providerId: "openai",
        threadId: "thr_123",
      },
    }),
    false,
  )
})
