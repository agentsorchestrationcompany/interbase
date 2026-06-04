import { describe, expect, test } from "vitest"
import {
  persistedSessionModelSelection,
  preservesProviderArtifacts,
  replayCompatibility,
  resolveCurrentModel,
  resolveSessionScopedModel,
  sameSessionModel,
  selectedModelVariant,
  targetIdentity,
  toRecentModelSelection,
  toSessionModelSelection,
  type CliModelSelection,
} from "../src/index.js"

const validModels = new Set(["openai/gpt-5.4", "anthropic/claude-sonnet-4", "google/gemini-3-pro"])

function isValid(model: CliModelSelection) {
  return validModels.has(`${model.providerID}/${model.modelID}`)
}

describe("cli model switching", () => {
  test("maps persisted session model authority to prompt model selection shape", () => {
    expect(
      persistedSessionModelSelection({
        providerID: "openai",
        id: "gpt-5.4",
        variant: "high",
      }),
    ).toEqual({
      providerID: "openai",
      modelID: "gpt-5.4",
      variant: "high",
    })
    expect(persistedSessionModelSelection(undefined)).toBeUndefined()
  })

  test("compares and projects model selection without leaking variant into recents", () => {
    expect(
      sameSessionModel(
        { providerID: "openai", modelID: "gpt-5.4", variant: "high" },
        { providerID: "openai", modelID: "gpt-5.4", variant: "high" },
      ),
    ).toBe(true)
    expect(
      sameSessionModel(
        { providerID: "openai", modelID: "gpt-5.4", variant: "high" },
        { providerID: "openai", modelID: "gpt-5.4" },
      ),
    ).toBe(false)
    expect(sameSessionModel(undefined, { providerID: "openai", modelID: "gpt-5.4" })).toBe(false)
    expect(toSessionModelSelection({ providerID: "openai", modelID: "gpt-5.4", variant: "high" })).toEqual({
      providerID: "openai",
      modelID: "gpt-5.4",
      variant: "high",
    })
    expect(toSessionModelSelection({ providerID: "openai", modelID: "gpt-5.4" })).toEqual({
      providerID: "openai",
      modelID: "gpt-5.4",
    })
    expect(toRecentModelSelection({ providerID: "openai", modelID: "gpt-5.4" })).toEqual({
      providerID: "openai",
      modelID: "gpt-5.4",
    })
  })

  test("prefers session-scoped model authority over global agent selection", () => {
    const sessionScopedModel = resolveSessionScopedModel(
      {
        persistedSessionModel: { providerID: "anthropic", modelID: "claude-sonnet-4" },
        lastUserModel: { providerID: "google", modelID: "gemini-3-pro" },
      },
      isValid,
    )

    expect(
      resolveCurrentModel(
        {
          sessionScopedModel,
          agentSelectedModel: { providerID: "openai", modelID: "gpt-5.4" },
          fallbackModel: { providerID: "google", modelID: "gemini-3-pro" },
        },
        isValid,
      ),
    ).toEqual({ providerID: "anthropic", modelID: "claude-sonnet-4" })
  })

  test("falls back to last user message when persisted session model is absent", () => {
    expect(
      resolveSessionScopedModel(
        {
          lastUserModel: { providerID: "google", modelID: "gemini-3-pro" },
        },
        isValid,
      ),
    ).toEqual({ providerID: "google", modelID: "gemini-3-pro" })
  })

  test("ignores invalid session candidates and reports no model when no fallback is valid", () => {
    expect(
      resolveSessionScopedModel(
        {
          sessionOverride: { providerID: "missing", modelID: "nope" },
          persistedSessionModel: { providerID: "also-missing", modelID: "nope" },
        },
        isValid,
      ),
    ).toBeUndefined()

    expect(
      resolveCurrentModel(
        {
          sessionScopedModel: { providerID: "missing", modelID: "nope" },
          agentSelectedModel: { providerID: "also-missing", modelID: "nope" },
          fallbackModel: { providerID: "still-missing", modelID: "nope" },
        },
        isValid,
      ),
    ).toBeUndefined()
  })

  test("does not let a global variant bleed into a session-scoped model", () => {
    expect(
      selectedModelVariant({
        currentModel: { providerID: "openai", modelID: "gpt-5.4" },
        sessionScopedModel: { providerID: "openai", modelID: "gpt-5.4" },
        storedVariant: "high",
      }),
    ).toBeUndefined()
    expect(
      selectedModelVariant({
        currentModel: { providerID: "openai", modelID: "gpt-5.4" },
        sessionScopedModel: { providerID: "anthropic", modelID: "claude-sonnet-4" },
        storedVariant: "high",
      }),
    ).toBe("high")
  })

  test("preserves provider artifacts only for exact provider api model variant target", () => {
    const target = targetIdentity({
      apiID: "responses",
      apiPackage: "@ai-sdk/openai",
      modelID: "gpt-5.4",
      providerID: "openai",
      variant: "high",
    })

    expect(
      replayCompatibility({
        origin: {
          apiID: "responses",
          apiPackage: "@ai-sdk/openai",
          modelID: "gpt-5.4",
          providerID: "openai",
          variant: "high",
        },
        target,
      }),
    ).toBe("same-target")
    expect(
      preservesProviderArtifacts({
        origin: {
          apiID: "responses",
          apiPackage: "@ai-sdk/openai",
          modelID: "gpt-5.4",
          providerID: "openai",
          variant: "high",
        },
        target,
      }),
    ).toBe(true)
    expect(
      replayCompatibility({
        origin: {
          apiID: "chat-completions",
          apiPackage: "@ai-sdk/openai",
          modelID: "gpt-5.4",
          providerID: "openai",
          variant: "high",
        },
        target,
      }),
    ).toBe("foreign-target")
    expect(
      replayCompatibility({
        origin: {
          apiID: "responses",
          apiPackage: "@ai-sdk/openai",
          modelID: "gpt-5.4",
          providerID: "openai",
        },
        target,
      }),
    ).toBe("foreign-target")
  })

  test("classifies every exact-target mismatch as foreign", () => {
    const target = targetIdentity({
      apiID: "messages",
      apiPackage: "@ai-sdk/anthropic",
      modelID: "claude-sonnet-4",
      providerID: "anthropic",
    })

    expect(target).toEqual({
      apiID: "messages",
      apiPackage: "@ai-sdk/anthropic",
      modelID: "claude-sonnet-4",
      providerID: "anthropic",
    })
    expect(
      replayCompatibility({
        origin: {
          apiID: "messages",
          apiPackage: "@ai-sdk/anthropic",
          modelID: "claude-sonnet-4",
          providerID: "openrouter",
        },
        target,
      }),
    ).toBe("foreign-target")
    expect(
      replayCompatibility({
        origin: {
          apiID: "messages",
          apiPackage: "@ai-sdk/anthropic",
          modelID: "claude-opus-4",
          providerID: "anthropic",
        },
        target,
      }),
    ).toBe("foreign-target")
    expect(
      replayCompatibility({
        origin: {
          apiID: "messages",
          apiPackage: "@ai-sdk/anthropic",
          modelID: "claude-sonnet-4",
          providerID: "anthropic",
          variant: "high",
        },
        target,
      }),
    ).toBe("foreign-target")
    expect(
      replayCompatibility({
        origin: {
          apiID: "messages",
          apiPackage: "@ai-sdk/google-vertex/anthropic",
          modelID: "claude-sonnet-4",
          providerID: "anthropic",
        },
        target,
      }),
    ).toBe("foreign-target")
  })
})
