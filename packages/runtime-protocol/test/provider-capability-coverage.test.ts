import assert from "node:assert/strict"
import test from "node:test"
import {
  createProviderDescriptor,
  createProviderModelOption,
  createUnavailableCapabilityState,
  providerCapabilityKeyValues,
  type ProviderCapabilities,
} from "../src/index.js"

test("createUnavailableCapabilityState normalizes absent messages", () => {
  assert.deepEqual(
    createUnavailableCapabilityState({
      reasonCode: "provider_unavailable",
      status: "unsupportedByProvider",
    }),
    {
      message: null,
      reasonCode: "provider_unavailable",
      since: null,
      status: "unsupportedByProvider",
    },
  )
})

function capabilities(overrides: Partial<ProviderCapabilities> = {}): ProviderCapabilities {
  return {
    approvalPolicy: false,
    attachments: false,
    cancellation: false,
    fallbackLifecycle: false,
    fastMode: false,
    managedTurns: false,
    modelDiscovery: false,
    models: [],
    nativeInteractive: false,
    nonStreaming: false,
    persistence: false,
    sandboxMode: false,
    sessionContinuity: false,
    structuredToolEvents: false,
    streaming: false,
    supportsMcpProxy: false,
    systemPrompt: false,
    toolUse: false,
    ...overrides,
  }
}

test("createProviderDescriptor builds explicit provider capability states", () => {
  const descriptor = createProviderDescriptor({
    available: true,
    capabilities: capabilities({
      approvalPolicy: true,
      attachments: true,
      cancellation: true,
      fallbackLifecycle: true,
      managedTurns: true,
      modelDiscovery: true,
      models: [
        {
          capabilities: {
            cancellation: true,
            nonStreaming: true,
            sessionContinuity: true,
            streaming: true,
            systemPrompt: true,
            toolUse: true,
          },
          id: "model-a",
          isDefault: true,
          label: "Model A",
          model: "model-a",
          reasoningEfforts: [
            {
              id: "medium",
              label: "Medium",
            },
          ],
        },
      ],
      nativeInteractive: true,
      nonStreaming: true,
      persistence: true,
      sandboxMode: true,
      sessionContinuity: true,
      structuredToolEvents: true,
      streaming: true,
      supportsMcpProxy: true,
      systemPrompt: true,
      toolUse: true,
    }),
    command: "provider",
    defaultModel: "model-a",
    defaults: {
      approvalPolicy: "on-request",
      executionMode: "managed",
      permissionPresetId: "default",
      sandboxMode: "workspace-write",
    },
    id: "openai",
    label: "OpenAI",
  })

  assert.equal(descriptor.configState.status, "configured")
  assert.equal(descriptor.defaults.executionMode, "managed")
  assert.equal(descriptor.capabilities.models[0]?.providerId, "openai")
  for (const capability of providerCapabilityKeyValues) {
    assert.ok(descriptor.capabilities.capabilityStates?.[capability])
  }
  assert.equal(descriptor.capabilities.capabilityStates?.["tools.calls"]?.status, "supported")
  assert.equal(descriptor.capabilities.models[0]?.capabilityStates?.["turn.cancel"]?.status, "supported")
})

test("createProviderDescriptor reports unavailable and unsupported capability causes", () => {
  const unauthenticated = createProviderDescriptor({
    available: false,
    capabilities: capabilities({
      fallbackLifecycle: true,
      managedTurns: true,
      models: [{ id: "m", label: "M", model: "m", reasoningEfforts: [] }],
      sessionContinuity: true,
    }),
    command: "anthropic",
    configState: {
      reason: "Missing API key.",
      status: "unauthenticated",
    },
    defaultModel: null,
    id: "anthropic",
    label: "Anthropic",
  })
  assert.equal(unauthenticated.configState.authenticated, false)
  assert.equal(unauthenticated.configState.configured, false)
  assert.equal(unauthenticated.capabilities.capabilityStates?.["thread.resume"]?.status, "requiresAuth")
  assert.equal(
    unauthenticated.capabilities.models[0]?.capabilityStates?.["conversation.reasoningEffort"]?.status,
    "unsupportedByModel",
  )

  const missingCodex = createProviderDescriptor({
    available: false,
    capabilities: capabilities({
      nativeInteractive: true,
    }),
    command: "codex",
    defaultModel: null,
    id: "codex",
    label: "Codex",
    unavailableReason: "Codex CLI is not installed.",
  })
  assert.equal(missingCodex.capabilities.capabilityStates?.["shell.nativeExecution"]?.status, "unsupportedByProvider")

  const defaultAuthReason = createProviderDescriptor({
    available: false,
    capabilities: capabilities({
      fallbackLifecycle: true,
      sessionContinuity: true,
    }),
    command: "anthropic",
    configState: {
      status: "unauthenticated",
    },
    defaultModel: null,
    id: "anthropic",
    label: "Anthropic",
  })
  assert.equal(
    defaultAuthReason.capabilities.capabilityStates?.["thread.resume"]?.message,
    "Provider authentication is required.",
  )

  const defaultCodexReason = createProviderDescriptor({
    available: false,
    capabilities: capabilities({
      nativeInteractive: true,
    }),
    command: "codex",
    defaultModel: null,
    id: "codex",
    label: "Codex",
  })
  assert.equal(
    defaultCodexReason.capabilities.capabilityStates?.["shell.nativeExecution"]?.message,
    "Provider is unavailable.",
  )

  const unavailableProvider = createProviderDescriptor({
    available: false,
    capabilities: capabilities({
      capabilityStates: {
        warmup: {
          reasonCode: "legacy_debug_only",
          status: "legacyDebugOnly",
        },
      },
      sessionContinuity: true,
    }),
    command: "openrouter",
    configState: {
      authenticated: true,
      configured: true,
      reason: null,
      status: "misconfigured",
    },
    defaultModel: null,
    id: "openrouter",
    label: "OpenRouter",
  })
  assert.equal(unavailableProvider.configState.authenticated, true)
  assert.equal(unavailableProvider.configState.configured, true)
  assert.equal(unavailableProvider.capabilities.capabilityStates?.["thread.resume"]?.status, "unsupportedByProvider")
  assert.equal(unavailableProvider.capabilities.capabilityStates?.["warmup"]?.status, "legacyDebugOnly")

  const modelWithoutReasoningMetadata = createProviderDescriptor({
    available: true,
    capabilities: capabilities({
      models: [{ id: "plain", label: "Plain", model: "plain" }],
    }),
    command: "openai",
    defaultModel: "plain",
    id: "openai",
    label: "OpenAI",
  })
  assert.equal(
    modelWithoutReasoningMetadata.capabilities.capabilityStates?.["conversation.reasoningEffort"]?.status,
    "unsupportedByProvider",
  )
})

test("createProviderModelOption preserves explicit model provider and overrides", () => {
  const option = createProviderModelOption({
    model: {
      capabilityStates: {
        "tools.calls": {
          reasonCode: "tool_calls_not_supported",
          status: "unsupportedByModel",
        },
      },
      id: "anthropic-model",
      label: "Anthropic Model",
      model: "anthropic-model",
      providerId: "anthropic",
    },
    providerId: "openai",
  })

  assert.equal(option.providerId, "anthropic")
  assert.equal(option.capabilityStates?.["conversation.modelSelection"]?.status, "supported")
  assert.equal(option.capabilityStates?.["tools.calls"]?.status, "unsupportedByModel")

  const inferredProvider = createProviderModelOption({
    model: {
      id: "openai-model",
      label: "OpenAI Model",
      model: "openai-model",
    },
    providerId: "openai",
  })
  assert.equal(inferredProvider.providerId, "openai")
})
