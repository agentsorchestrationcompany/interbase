import { describe, expect, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { JsonFileGoalStore } from "../src/goal-state.js"
import {
  assertValidPromptAlias,
  assertValidPromptAliasPrompt,
  emptyPromptAliasesSnapshot,
  JsonFilePromptAliasesStore,
  normalizePromptAlias,
  normalizePromptAliasPrompt,
  PromptAliasesManager,
  promptAliasPromptValidationError,
  promptAliasValidationError,
} from "../src/prompt-aliases.js"

describe("host-local remote runtime state stores", () => {
  test("writes goals through direct store set and reads them back", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-goal-state-"))
    try {
      const store = new JsonFileGoalStore(path.join(directory, "goals.json"))
      store.set({
        budgetLimitReported: false,
        createdAt: 1,
        goalId: "goal_1",
        objective: "Keep state covered",
        status: "active",
        threadId: "ses_1",
        timeUsedSeconds: 0,
        tokenBudget: null,
        tokensUsed: 0,
        updatedAt: 1,
      })

      expect(store.get("ses_1")).toMatchObject({ goalId: "goal_1", objective: "Keep state covered" })
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  test("resolves prompt aliases through the host-local manager", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "interbase-remote-runtime-alias-state-"))
    try {
      const manager = new PromptAliasesManager({
        now: () => 1_000,
        store: new JsonFilePromptAliasesStore(path.join(directory, "prompt-aliases.json")),
      })
      const defaultClockManager = new PromptAliasesManager({
        store: new JsonFilePromptAliasesStore(path.join(directory, "default-clock-aliases.json")),
      })
      manager.set("ship", "finish the remote runtime split")
      manager.set("ship", "finish the public split")
      manager.set("build", "exercise sorted aliases")
      expect(defaultClockManager.set("now", "use the default clock").updatedAt).toBeGreaterThan(0)

      expect(manager.resolve(" ship ")).toEqual({
        alias: "ship",
        prompt: "finish the public split",
        updatedAt: 1,
      })
      expect(manager.get("missing")).toBeNull()
      expect(manager.delete("missing")).toBe(false)
      expect(manager.delete("ship")).toBe(true)
      expect(manager.resolve("ship")).toBeNull()
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  })

  test("validates host-local prompt alias values", () => {
    expect(emptyPromptAliasesSnapshot()).toEqual({ version: 1, aliases: [] })
    expect(normalizePromptAlias(" ship ")).toBe("ship")
    expect(normalizePromptAliasPrompt(" finish ")).toBe("finish")
    expect(promptAliasValidationError("")).toBe("Alias cannot be empty.")
    expect(promptAliasValidationError("two words")).toBe("Alias cannot contain spaces.")
    expect(promptAliasValidationError("/ship")).toBe("Alias cannot start with /.")
    expect(promptAliasPromptValidationError("")).toBe("Alias prompt cannot be empty.")
    expect(() => assertValidPromptAlias("ship")).not.toThrow()
    expect(() => assertValidPromptAliasPrompt("finish")).not.toThrow()
  })
})
