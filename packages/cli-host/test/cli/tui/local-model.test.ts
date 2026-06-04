import { describe, expect, test } from "bun:test"
import {
  persistedSessionModelSelection,
  resolveCurrentModel,
  resolveSessionScopedModel,
  sameSessionModel,
  selectedModelVariant,
  toRecentModelSelection,
  toSessionModelSelection,
  type TuiModelSelection,
} from "../../../src/cli/cmd/tui/context/local-model"

const validModels = new Set(["openai/gpt-5.4", "anthropic/claude-sonnet-4", "google/gemini-3-pro"])

function isValid(model: TuiModelSelection) {
  return validModels.has(`${model.providerID}/${model.modelID}`)
}

describe("tui local model selection", () => {
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
})
