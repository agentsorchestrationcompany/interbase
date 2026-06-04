import type {
  RuntimeApprovalPolicy,
  RuntimeExecutionMode,
  RuntimeProviderSessionState,
  RuntimeRequestKind,
  RuntimeSandboxMode,
} from "./session.js"
import type { NormalizedResponseEvent } from "./normalized-response-events.js"
import type { RuntimeOutputChannel } from "./events.js"

export const providerIdValues = ["openai", "anthropic", "openrouter", "ollama"] as const

export type ProviderId = string

export const runtimeProviderModelInfoFields = ["id", "name", "status"] as const

export const runtimeProviderInfoFields = ["id", "models", "name"] as const

export const runtimeProviderListResponseFields = ["all", "connected", "default"] as const

export interface RuntimeProviderModelInfo {
  id: string
  name: string
  status: string
}

export interface RuntimeProviderInfo {
  id: string
  models: Record<string, RuntimeProviderModelInfo>
  name: string
}

export interface RuntimeProviderListResponse {
  all: RuntimeProviderInfo[]
  connected: string[]
  default: Record<string, string>
}

export type ProviderModelSelectionGroup = "featured" | "standard"
export type ProviderConfigStatus = "configured" | "misconfigured" | "unauthenticated" | "unavailable"

export const providerCapabilityStatusValues = [
  "supported",
  "unsupported",
  "unsupportedByProvider",
  "unsupportedByModel",
  "disabledByConfig",
  "requiresAuth",
  "requiresMcp",
  "requiresNativeBinary",
  "requiresPlatform",
  "experimental",
  "legacyDebugOnly",
] as const

export type ProviderCapabilityStatus = (typeof providerCapabilityStatusValues)[number]

export const providerUnsupportedReasonCodeValues = [
  "provider_not_registered",
  "provider_unavailable",
  "model_not_found",
  "model_capability_unavailable",
  "auth_required",
  "login_not_supported",
  "logout_not_supported",
  "account_status_not_supported",
  "rate_limit_status_not_supported",
  "dynamic_model_discovery_not_supported",
  "warmup_not_supported",
  "session_continuation_not_supported",
  "transcript_history_not_supported",
  "streaming_not_supported",
  "structured_output_not_supported",
  "reasoning_effort_not_supported",
  "system_instruction_not_supported",
  "tool_calls_not_supported",
  "mcp_not_supported",
  "mcp_oauth_not_supported",
  "approval_not_supported",
  "shell_not_supported",
  "native_execution_not_supported",
  "native_tty_not_supported",
  "pty_not_supported",
  "sandbox_not_supported",
  "file_read_not_supported",
  "file_write_not_supported",
  "patch_not_supported",
  "image_input_not_supported",
  "attachments_not_supported",
  "resume_not_supported",
  "fork_not_supported",
  "rollback_not_supported",
  "compact_not_supported",
  "review_not_supported",
  "interrupt_not_supported",
  "steering_not_supported",
  "cancellation_not_supported",
  "background_terminal_not_supported",
  "app_server_turn_lifecycle_not_supported",
  "provider_child_requests_not_supported",
  "replay_not_supported",
  "reconnect_not_supported",
  "pty_input_escape_not_supported",
  "pty_input_ctrl_c_not_supported",
  "pty_input_enter_not_supported",
  "pty_input_shift_enter_not_supported",
  "plugin_skill_not_supported",
  "config_read_not_supported",
  "config_write_not_supported",
  "safety_policy_not_supported",
  "usage_reporting_not_supported",
  "error_normalization_not_supported",
  "offline_mode_not_supported",
  "native_binary_missing",
  "platform_not_supported",
  "disabled_by_config",
  "legacy_debug_only",
] as const

export type ProviderUnsupportedReasonCode = (typeof providerUnsupportedReasonCodeValues)[number]

export const providerCapabilityKeyValues = [
  "identity.provider",
  "identity.displayName",
  "models.list",
  "models.dynamicDiscovery",
  "auth.status",
  "auth.login",
  "auth.logout",
  "account.status",
  "account.rateLimit",
  "warmup",
  "conversation.sessionContinuation",
  "conversation.transcriptHistory",
  "conversation.responseEvents",
  "conversation.nonStreamingText",
  "conversation.streamingText",
  "conversation.toolCallEvents",
  "conversation.reasoningEvents",
  "conversation.usageEvents",
  "conversation.structuredOutput",
  "conversation.reasoningEffort",
  "conversation.modelSelection",
  "instructions.systemDeveloper",
  "tools.calls",
  "tools.mcp",
  "tools.mcpStatus",
  "tools.mcpOauth",
  "appServer.turnStart",
  "appServer.turnInterrupt",
  "appServer.turnSteer",
  "appServer.approvals",
  "appServer.providerChildRequests",
  "appServer.replay",
  "appServer.reconnect",
  "appServer.resume",
  "approvals.requests",
  "approvals.decisions",
  "shell.command",
  "shell.nativeExecution",
  "shell.nativeTty",
  "shell.pty",
  "pty.input.escape",
  "pty.input.ctrlC",
  "pty.input.enter",
  "pty.input.shiftEnter",
  "sandbox.policy",
  "files.read",
  "files.write",
  "files.patch",
  "files.diff",
  "input.images",
  "input.attachments",
  "thread.resume",
  "thread.fork",
  "thread.rollback",
  "thread.compact",
  "review.start",
  "turn.interrupt",
  "turn.steer",
  "turn.cancel",
  "terminal.background",
  "plugins.skills",
  "config.read",
  "config.write",
  "config.warnings",
  "policy.safetyHooks",
  "usage.reporting",
  "errors.normalization",
  "offline.degradedBehavior",
] as const

export type ProviderCapabilityKey = (typeof providerCapabilityKeyValues)[number]

export interface ProviderCapabilityState {
  message?: string | null
  reasonCode?: ProviderUnsupportedReasonCode | null
  since?: string | null
  status: ProviderCapabilityStatus
}

export type ProviderCapabilityMap = Partial<Record<ProviderCapabilityKey, ProviderCapabilityState>>

export interface ProviderModelCapabilityReport {
  capabilities: ProviderCapabilityMap
  model: string
  providerId?: ProviderId
}

export interface ProviderCapabilityReport {
  capabilities: ProviderCapabilityMap
  models?: ProviderModelCapabilityReport[]
  providerId: ProviderId
}

export interface ProviderReasoningEffortOption {
  description?: string | null
  id: string
  isDefault?: boolean
  label: string
}

export interface ModelCapabilities {
  cancellation: boolean
  nonStreaming: boolean
  sessionContinuity: boolean
  streaming: boolean
  systemPrompt: boolean
  toolUse: boolean
}

export interface ProviderModelExecution {
  apiBaseUrl?: string | null
  apiModelId: string
  env: string[]
  package: string
}

export interface ProviderModelOption {
  capabilityStates?: ProviderCapabilityMap
  capabilities?: ModelCapabilities
  description?: string | null
  execution?: ProviderModelExecution | null
  reasoningEfforts?: ProviderReasoningEffortOption[]
  group?: ProviderModelSelectionGroup
  id: string
  isDefault?: boolean
  label: string
  model: string
  providerId?: ProviderId
}

export interface ProviderCapabilities extends ModelCapabilities {
  approvalPolicy: boolean
  attachments: boolean
  capabilityStates?: ProviderCapabilityMap
  fallbackLifecycle: boolean
  fastMode: boolean
  managedTurns: boolean
  modelDiscovery: boolean
  models: ProviderModelOption[]
  nativeInteractive: boolean
  persistence: boolean
  sandboxMode: boolean
  structuredToolEvents: boolean
  supportsMcpProxy: boolean
}

export interface ProviderConfigState {
  authenticated: boolean
  available: boolean
  configured: boolean
  reason?: string | null
  status: ProviderConfigStatus
}

export interface ProviderRuntimeDefaults {
  approvalPolicy: RuntimeApprovalPolicy | null
  executionMode: RuntimeExecutionMode
  permissionPresetId: string | null
  sandboxMode: RuntimeSandboxMode | null
}

export interface ProviderDescriptor {
  available: boolean
  capabilities: ProviderCapabilities
  command: string
  configState: ProviderConfigState
  defaultModel: string | null
  defaults: ProviderRuntimeDefaults
  id: ProviderId
  label: string
  unavailableReason?: string | null
}

export type RuntimeProviderEnvironment = Record<string, string | undefined>

export interface ProviderWarmupContext {
  approvalPolicy: RuntimeApprovalPolicy | null
  environment?: RuntimeProviderEnvironment
  fastMode: boolean
  model: string | null
  permissionPresetId?: string | null
  reasoningEffort: string | null
  sandboxMode: RuntimeSandboxMode | null
  sessionId: string
  workspaceRoot: string
}

export interface ProviderRunContext {
  approvalPolicy: RuntimeApprovalPolicy | null
  environment?: RuntimeProviderEnvironment
  fastMode: boolean
  model: string | null
  permissionPresetId?: string | null
  providerSession?: RuntimeProviderSessionState | null
  reasoningEffort: string | null
  onNormalizedResponseEvent?: (event: Omit<NormalizedResponseEvent, "sequence">) => void
  onOutput: (channel: RuntimeOutputChannel, chunk: string) => void
  onProviderSessionState?: (state: RuntimeProviderSessionState) => void
  prompt: string
  runId: string
  sandboxMode: RuntimeSandboxMode | null
  sessionId: string
  signal: AbortSignal
  workspaceRoot: string
}

export interface ManagedToolAuthority {
  itemId: string
  runId: string
  threadId: string | null
}

export interface ManagedToolEventBase {
  detail: string
  itemId: string
  phase: "aborted" | "completed" | "error" | "input_delta" | "pending" | "requested" | "started" | "updated"
  result?: unknown
  server?: string
  tool?: string
  type:
    | "command_execution"
    | "file_change"
    | "file_read"
    | "mcp_tool_call"
    | "reasoning"
    | "search"
    | "todo_list"
    | "web_search"
}

export interface ManagedToolEvent extends ManagedToolEventBase {
  authority: ManagedToolAuthority
}

export type ManagedToolRuntimePhase = "completed" | "requested" | "updated"

export function managedToolEventRuntimePhase(phase: ManagedToolEventBase["phase"]): ManagedToolRuntimePhase {
  if (phase === "requested" || phase === "pending") {
    return "requested"
  }
  if (phase === "completed") {
    return "completed"
  }
  return "updated"
}

export interface ProviderManagedRunContext extends ProviderRunContext {
  gatewayPrompt: string
  onAssistantMessage: (message: string) => void
  onToolEvent: (event: ManagedToolEvent) => Promise<void> | void
  requestKind: RuntimeRequestKind
}

export interface ProviderRunResult {
  exitCode: number | null
  success: boolean
}

export interface ProviderAdapter {
  readonly id: ProviderDescriptor["id"]
  describe(): ProviderDescriptor | Promise<ProviderDescriptor>
  listModels?(): Promise<ProviderModelOption[]>
  warmup?(context: ProviderWarmupContext): Promise<void>
  execute(context: ProviderRunContext): Promise<ProviderRunResult>
  executeManaged?(context: ProviderManagedRunContext): Promise<ProviderRunResult>
}

export const providerAdapterExecutionHostValues = ["external", "rustNative"] as const
export type ProviderAdapterExecutionHost = (typeof providerAdapterExecutionHostValues)[number]

export const providerCredentialSourceValues = ["environment", "runtimeConfig", "externalProcess"] as const
export type ProviderCredentialSource = (typeof providerCredentialSourceValues)[number]

export interface ProviderAdapterRustOwnership {
  eventSequencing: boolean
  sessionLifecycle: boolean
  shellExecution: boolean
  toolLifecycle: boolean
  turnLifecycle: boolean
}

export interface ProviderAdapterExternalOwnership {
  credentialStorage: boolean
  modelDiscovery: boolean
  providerApiTransport: boolean
}

export interface ProviderAdapterBoundary {
  credentialSources: ProviderCredentialSource[]
  executionHost: ProviderAdapterExecutionHost
  externalOwns: ProviderAdapterExternalOwnership
  normalizedErrorCodes: string[]
  providerId: ProviderId
  rustOwns: ProviderAdapterRustOwnership
}

export function createDefaultProviderAdapterBoundary(providerId: ProviderId): ProviderAdapterBoundary {
  return {
    credentialSources: ["environment", "runtimeConfig", "externalProcess"],
    executionHost: "external",
    externalOwns: {
      credentialStorage: true,
      modelDiscovery: true,
      providerApiTransport: true,
    },
    normalizedErrorCodes: ["CAPABILITY_UNAVAILABLE", "PROVIDER_UNAVAILABLE", "PROVIDER_FAILED", "INVALID_REQUEST"],
    providerId,
    rustOwns: {
      eventSequencing: true,
      sessionLifecycle: true,
      shellExecution: false,
      toolLifecycle: false,
      turnLifecycle: true,
    },
  }
}

export function createSupportedCapabilityState(since?: string | null): ProviderCapabilityState {
  return {
    since: since ?? null,
    status: "supported",
  }
}

export function createUnavailableCapabilityState(input: {
  message?: string | null
  reasonCode: ProviderUnsupportedReasonCode
  since?: string | null
  status: Exclude<ProviderCapabilityStatus, "supported">
}): ProviderCapabilityState {
  return {
    message: input.message ?? null,
    reasonCode: input.reasonCode,
    since: input.since ?? null,
    status: input.status,
  }
}

function createProviderUnavailableCapabilityState(input: {
  id: ProviderDescriptor["id"]
  reason?: string | null
  status?: ProviderDescriptor["configState"]["status"]
}): ProviderCapabilityState {
  if (input.status === "unauthenticated") {
    return createUnavailableCapabilityState({
      message: input.reason ?? "Provider authentication is required.",
      reasonCode: "auth_required",
      status: "requiresAuth",
    })
  }

  return createUnavailableCapabilityState({
    message: input.reason ?? "Provider is unavailable.",
    reasonCode: "provider_unavailable",
    status: "unsupportedByProvider",
  })
}

function createProviderBooleanCapabilityState(input: {
  available: boolean
  id: ProviderDescriptor["id"]
  reason?: string | null
  status?: ProviderDescriptor["configState"]["status"]
  supported: boolean
  unsupportedMessage: string
  unsupportedReasonCode: NonNullable<ProviderCapabilityState["reasonCode"]>
}): ProviderCapabilityState {
  if (input.supported && input.available) {
    return createSupportedCapabilityState()
  }

  if (input.supported) {
    return createProviderUnavailableCapabilityState(input)
  }

  return createUnavailableCapabilityState({
    message: input.unsupportedMessage,
    reasonCode: input.unsupportedReasonCode,
    status: "unsupportedByProvider",
  })
}

function createProviderCapabilityStates(input: {
  available: boolean
  capabilities: ProviderCapabilities
  configState?: Partial<ProviderDescriptor["configState"]>
  id: ProviderDescriptor["id"]
  unavailableReason?: string | null
}): ProviderCapabilityMap {
  const status = input.configState?.status
  const reason = input.configState?.reason ?? input.unavailableReason ?? null
  const capability = (
    supported: boolean,
    unsupportedReasonCode: NonNullable<ProviderCapabilityState["reasonCode"]>,
    unsupportedMessage: string,
  ) =>
    createProviderBooleanCapabilityState({
      available: input.available,
      id: input.id,
      reason,
      status,
      supported,
      unsupportedMessage,
      unsupportedReasonCode,
    })

  const modelSelectionSupported = input.capabilities.modelDiscovery || input.capabilities.models.length > 0
  const reasoningEffortSupported = input.capabilities.models.some((model) => (model.reasoningEfforts?.length ?? 0) > 0)
  const shellCommandSupported = input.capabilities.toolUse || input.capabilities.nativeInteractive
  const filesSupported = input.capabilities.toolUse

  return {
    "account.rateLimit": capability(
      false,
      "rate_limit_status_not_supported",
      "Provider rate-limit status is not exposed by this adapter.",
    ),
    "account.status": capability(
      false,
      "account_status_not_supported",
      "Provider account status is not exposed by this adapter.",
    ),
    "approvals.decisions": capability(
      input.capabilities.approvalPolicy,
      "approval_not_supported",
      "Provider approval decisions are not supported.",
    ),
    "approvals.requests": capability(
      input.capabilities.approvalPolicy,
      "approval_not_supported",
      "Provider approval requests are not supported.",
    ),
    "appServer.approvals": capability(
      false,
      "approval_not_supported",
      "Provider golden-boundary approval semantics are not proven.",
    ),
    "appServer.providerChildRequests": capability(
      false,
      "provider_child_requests_not_supported",
      "Provider golden-boundary child request semantics are not proven.",
    ),
    "appServer.reconnect": capability(
      false,
      "reconnect_not_supported",
      "Provider golden-boundary reconnect semantics are not proven.",
    ),
    "appServer.replay": capability(
      false,
      "replay_not_supported",
      "Provider golden-boundary replay semantics are not proven.",
    ),
    "appServer.resume": capability(
      false,
      "resume_not_supported",
      "Provider golden-boundary resume semantics are not proven.",
    ),
    "appServer.turnInterrupt": capability(
      false,
      "interrupt_not_supported",
      "Provider golden-boundary turn interrupt semantics are not proven.",
    ),
    "appServer.turnStart": capability(
      false,
      "app_server_turn_lifecycle_not_supported",
      "Provider golden-boundary turn start semantics are not proven.",
    ),
    "appServer.turnSteer": capability(
      false,
      "steering_not_supported",
      "Provider golden-boundary turn steering semantics are not proven.",
    ),
    "auth.login": capability(false, "login_not_supported", "Provider login is not exposed by this adapter."),
    "auth.logout": capability(false, "logout_not_supported", "Provider logout is not exposed by this adapter."),
    "auth.status": createSupportedCapabilityState(),
    "config.read": createSupportedCapabilityState(),
    "config.warnings": createSupportedCapabilityState(),
    "config.write": capability(
      false,
      "config_write_not_supported",
      "Provider config writes are not exposed by this adapter.",
    ),
    "conversation.modelSelection": capability(
      modelSelectionSupported,
      "model_capability_unavailable",
      "Provider model selection is unavailable.",
    ),
    "conversation.nonStreamingText": capability(
      input.capabilities.nonStreaming,
      "streaming_not_supported",
      "Provider non-streaming text output is not supported.",
    ),
    "conversation.reasoningEvents": capability(
      false,
      "reasoning_effort_not_supported",
      "Provider normalized reasoning events are not supported.",
    ),
    "conversation.reasoningEffort": capability(
      reasoningEffortSupported,
      "reasoning_effort_not_supported",
      "Provider does not expose reasoning effort controls.",
    ),
    "conversation.responseEvents": capability(
      input.capabilities.streaming || input.capabilities.nonStreaming,
      "streaming_not_supported",
      "Provider normalized response events are not supported.",
    ),
    "conversation.sessionContinuation": capability(
      input.capabilities.sessionContinuity,
      "session_continuation_not_supported",
      "Provider does not support session continuation.",
    ),
    "conversation.streamingText": capability(
      input.capabilities.streaming,
      "streaming_not_supported",
      "Provider does not support streaming text.",
    ),
    "conversation.structuredOutput": capability(
      false,
      "structured_output_not_supported",
      "Provider structured output is not supported.",
    ),
    "conversation.toolCallEvents": capability(
      input.capabilities.structuredToolEvents || input.capabilities.toolUse,
      "tool_calls_not_supported",
      "Provider normalized tool call events are not supported.",
    ),
    "conversation.transcriptHistory": capability(
      input.capabilities.persistence,
      "transcript_history_not_supported",
      "Provider transcript history is not supported.",
    ),
    "conversation.usageEvents": capability(
      false,
      "usage_reporting_not_supported",
      "Provider normalized usage events are not supported.",
    ),
    "errors.normalization": createSupportedCapabilityState(),
    "files.diff": capability(filesSupported, "patch_not_supported", "Provider file diff reporting is not supported."),
    "files.patch": capability(filesSupported, "patch_not_supported", "Provider patch application is not supported."),
    "files.read": capability(filesSupported, "file_read_not_supported", "Provider file reads are not supported."),
    "files.write": capability(filesSupported, "file_write_not_supported", "Provider file writes are not supported."),
    "identity.displayName": createSupportedCapabilityState(),
    "identity.provider": createSupportedCapabilityState(),
    "input.attachments": capability(
      input.capabilities.attachments,
      "attachments_not_supported",
      "Provider does not support attachments.",
    ),
    "input.images": capability(false, "image_input_not_supported", "Provider image input is not supported."),
    "instructions.systemDeveloper": capability(
      input.capabilities.systemPrompt,
      "system_instruction_not_supported",
      "Provider system/developer instructions are not supported.",
    ),
    "models.dynamicDiscovery": capability(
      input.capabilities.modelDiscovery,
      "dynamic_model_discovery_not_supported",
      "Provider dynamic model discovery is not supported.",
    ),
    "models.list": capability(modelSelectionSupported, "model_not_found", "Provider model listing is not available."),
    "offline.degradedBehavior": capability(
      false,
      "offline_mode_not_supported",
      "Provider degraded offline behavior is not supported.",
    ),
    "pty.input.ctrlC": capability(
      false,
      "pty_input_ctrl_c_not_supported",
      "Provider Ctrl+C PTY input semantics are not proven.",
    ),
    "pty.input.enter": capability(
      false,
      "pty_input_enter_not_supported",
      "Provider Enter PTY input semantics are not proven.",
    ),
    "pty.input.escape": capability(
      false,
      "pty_input_escape_not_supported",
      "Provider Esc PTY input semantics are not proven.",
    ),
    "pty.input.shiftEnter": capability(
      false,
      "pty_input_shift_enter_not_supported",
      "Provider Shift+Enter PTY input semantics are not proven.",
    ),
    "plugins.skills": capability(
      false,
      "plugin_skill_not_supported",
      "Provider plugin/skill execution is not supported.",
    ),
    "policy.safetyHooks": capability(
      input.capabilities.approvalPolicy || input.capabilities.sandboxMode,
      "safety_policy_not_supported",
      "Provider safety policy hooks are not supported.",
    ),
    "review.start": capability(
      input.capabilities.streaming && input.capabilities.persistence,
      "review_not_supported",
      "Provider review mode is not supported.",
    ),
    "sandbox.policy": capability(
      input.capabilities.sandboxMode,
      "sandbox_not_supported",
      "Provider sandbox policy is not supported.",
    ),
    "shell.command": capability(
      shellCommandSupported,
      "shell_not_supported",
      "Provider shell command execution is not supported.",
    ),
    "shell.nativeExecution": capability(
      input.capabilities.nativeInteractive,
      "native_execution_not_supported",
      "Provider native command execution is not supported.",
    ),
    "shell.nativeTty": capability(
      input.capabilities.nativeInteractive,
      "native_tty_not_supported",
      "Provider native TTY handoff is not supported.",
    ),
    "shell.pty": capability(false, "pty_not_supported", "Provider PTY mode is not supported."),
    "terminal.background": capability(
      false,
      "background_terminal_not_supported",
      "Provider background terminals are not supported.",
    ),
    "thread.compact": capability(false, "compact_not_supported", "Provider context compaction is not supported."),
    "thread.fork": capability(false, "fork_not_supported", "Provider thread fork is not supported."),
    "thread.resume": capability(
      input.capabilities.sessionContinuity,
      "resume_not_supported",
      "Provider thread resume is not supported.",
    ),
    "thread.rollback": capability(false, "rollback_not_supported", "Provider thread rollback is not supported."),
    "tools.calls": capability(
      input.capabilities.toolUse,
      "tool_calls_not_supported",
      "Provider tool calls are not supported.",
    ),
    "tools.mcp": capability(
      input.capabilities.supportsMcpProxy,
      "mcp_not_supported",
      "Provider MCP tool invocation is not supported.",
    ),
    "tools.mcpOauth": capability(false, "mcp_oauth_not_supported", "Provider does not expose MCP OAuth."),
    "tools.mcpStatus": capability(
      input.capabilities.supportsMcpProxy,
      "mcp_not_supported",
      "Provider MCP status is not supported.",
    ),
    "turn.cancel": capability(
      input.capabilities.cancellation,
      "cancellation_not_supported",
      "Provider cancellation is not supported.",
    ),
    "turn.interrupt": capability(
      input.capabilities.cancellation,
      "interrupt_not_supported",
      "Provider interrupt is not supported.",
    ),
    "turn.steer": capability(false, "steering_not_supported", "Provider steering is not supported."),
    "usage.reporting": capability(
      false,
      "usage_reporting_not_supported",
      "Provider token usage reporting is not supported.",
    ),
    warmup: capability(false, "warmup_not_supported", "Provider warmup is not supported."),
    ...input.capabilities.capabilityStates,
  } satisfies Record<ProviderCapabilityKey, ProviderCapabilityState>
}

function createModelBooleanCapabilityState(input: {
  supported: boolean
  unsupportedMessage: string
  unsupportedReasonCode: NonNullable<ProviderCapabilityState["reasonCode"]>
}): ProviderCapabilityState {
  if (input.supported) {
    return createSupportedCapabilityState()
  }

  return createUnavailableCapabilityState({
    message: input.unsupportedMessage,
    reasonCode: input.unsupportedReasonCode,
    status: "unsupportedByModel",
  })
}

function createProviderModelCapabilityStates(model: ProviderModelOption): ProviderCapabilityMap {
  const states: ProviderCapabilityMap = {
    "conversation.modelSelection": createSupportedCapabilityState(),
  }
  const capabilities = model.capabilities

  if (model.reasoningEfforts) {
    states["conversation.reasoningEffort"] = createModelBooleanCapabilityState({
      supported: model.reasoningEfforts.length > 0,
      unsupportedMessage: "Selected model does not support reasoning effort controls.",
      unsupportedReasonCode: "reasoning_effort_not_supported",
    })
  }

  if (capabilities) {
    states["conversation.sessionContinuation"] = createModelBooleanCapabilityState({
      supported: capabilities.sessionContinuity,
      unsupportedMessage: "Selected model does not support session continuation.",
      unsupportedReasonCode: "session_continuation_not_supported",
    })
    states["conversation.streamingText"] = createModelBooleanCapabilityState({
      supported: capabilities.streaming,
      unsupportedMessage: "Selected model does not support streaming output.",
      unsupportedReasonCode: "streaming_not_supported",
    })
    states["instructions.systemDeveloper"] = createModelBooleanCapabilityState({
      supported: capabilities.systemPrompt,
      unsupportedMessage: "Selected model does not support system/developer instructions.",
      unsupportedReasonCode: "system_instruction_not_supported",
    })
    states["tools.calls"] = createModelBooleanCapabilityState({
      supported: capabilities.toolUse,
      unsupportedMessage: "Selected model does not support tool calls.",
      unsupportedReasonCode: "tool_calls_not_supported",
    })
    states["turn.cancel"] = createModelBooleanCapabilityState({
      supported: capabilities.cancellation,
      unsupportedMessage: "Selected model does not support cancellation.",
      unsupportedReasonCode: "cancellation_not_supported",
    })
    states["turn.interrupt"] = createModelBooleanCapabilityState({
      supported: capabilities.cancellation,
      unsupportedMessage: "Selected model does not support interrupt.",
      unsupportedReasonCode: "interrupt_not_supported",
    })
  }

  return {
    ...states,
    ...model.capabilityStates,
  }
}

export function createProviderModelOption(input: {
  model: ProviderModelOption
  providerId: ProviderDescriptor["id"]
}): ProviderModelOption {
  return {
    ...input.model,
    capabilityStates: createProviderModelCapabilityStates(input.model),
    providerId: input.model.providerId ?? input.providerId,
  }
}

export function createProviderDescriptor(input: {
  available: boolean
  capabilities: ProviderDescriptor["capabilities"]
  command: string
  configState?: Partial<ProviderDescriptor["configState"]>
  defaultModel: string | null
  defaults?: Partial<ProviderDescriptor["defaults"]>
  id: ProviderDescriptor["id"]
  label: string
  unavailableReason?: string | null
}): ProviderDescriptor {
  const available = input.available
  const capabilityStates = createProviderCapabilityStates({
    available,
    capabilities: input.capabilities,
    configState: input.configState,
    id: input.id,
    unavailableReason: input.unavailableReason,
  })
  const capabilities = {
    ...input.capabilities,
    capabilityStates,
    models: input.capabilities.models.map((model) =>
      createProviderModelOption({
        model,
        providerId: input.id,
      }),
    ),
  }

  return {
    available,
    capabilities,
    command: input.command,
    configState: {
      authenticated: input.configState?.authenticated ?? available,
      available,
      configured: input.configState?.configured ?? available,
      reason: input.configState?.reason ?? input.unavailableReason ?? null,
      status: input.configState?.status ?? (available ? "configured" : "unavailable"),
    },
    defaultModel: input.defaultModel,
    defaults: {
      approvalPolicy: input.defaults?.approvalPolicy ?? null,
      executionMode: input.defaults?.executionMode ?? (input.capabilities.managedTurns ? "managed" : "native"),
      permissionPresetId: input.defaults?.permissionPresetId ?? null,
      sandboxMode: input.defaults?.sandboxMode ?? null,
    },
    id: input.id,
    label: input.label,
    unavailableReason: input.unavailableReason ?? null,
  }
}

export function resolveProviderModelCapabilityState(input: {
  capability: ProviderCapabilityKey
  modelCapabilities?: ProviderCapabilityMap | null
  providerCapabilities: ProviderCapabilityMap
}): ProviderCapabilityState {
  const modelState = input.modelCapabilities?.[input.capability]
  if (modelState) {
    return modelState
  }

  const providerState = input.providerCapabilities[input.capability]
  if (providerState) {
    return providerState
  }

  return createUnavailableCapabilityState({
    message: `Capability ${input.capability} is not reported by the selected provider or model.`,
    reasonCode: "model_capability_unavailable",
    status: "unsupported",
  })
}

const providerReasoningEffortOrder = ["minimal", "low", "medium", "high", "max", "xhigh"] as const

function providerReasoningEffortRank(option: ProviderReasoningEffortOption) {
  const normalized = option.id.trim().toLowerCase()
  const knownIndex = providerReasoningEffortOrder.indexOf(normalized as (typeof providerReasoningEffortOrder)[number])

  return knownIndex === -1 ? Number.POSITIVE_INFINITY : knownIndex
}

export function resolvePreferredReasoningEffort(input: {
  currentReasoningEffort?: string | null
  reasoningEfforts?: ProviderReasoningEffortOption[] | null
}) {
  const reasoningEfforts = input.reasoningEfforts ?? []
  if (reasoningEfforts.length === 0) {
    return null
  }

  if (input.currentReasoningEffort && reasoningEfforts.some((option) => option.id === input.currentReasoningEffort)) {
    return input.currentReasoningEffort
  }

  let preferred = reasoningEfforts[0]
  let preferredRank = providerReasoningEffortRank(preferred)
  for (const option of reasoningEfforts.slice(1)) {
    const rank = providerReasoningEffortRank(option)
    if (rank < preferredRank) {
      preferred = option
      preferredRank = rank
    }
  }

  return preferred.id
}
