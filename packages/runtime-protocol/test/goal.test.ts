import { describe, expect, test } from "vitest"
import {
  GOAL_CONTEXT_END_MARKER,
  GOAL_CONTEXT_START_MARKER,
  MAX_THREAD_GOAL_OBJECTIVE_CHARS,
  isThreadGoalStatus,
  remainingThreadGoalTokens,
  threadGoalStatusValues,
  threadGoalTokenDelta,
  validateThreadGoalBudget,
  validateThreadGoalObjective,
  type ThreadGoal,
  type EditGoalInput,
  type ThreadGoalToolResponse,
} from "../src/goal.js"

describe("thread goal protocol authority", () => {
  test("exports canonical markers, status values, and types", () => {
    expect(GOAL_CONTEXT_START_MARKER).toBe("<goal_context>")
    expect(GOAL_CONTEXT_END_MARKER).toBe("</goal_context>")
    expect(threadGoalStatusValues).toEqual(["active", "paused", "blocked", "budgetLimited", "usageLimited", "complete"])
    expect(isThreadGoalStatus("active")).toBe(true)
    expect(isThreadGoalStatus("budgetLimited")).toBe(true)
    expect(isThreadGoalStatus("usageLimited")).toBe(true)
    expect(isThreadGoalStatus("blocked")).toBe(true)
    expect(isThreadGoalStatus("budget_limited")).toBe(false)
    const goal: ThreadGoal = {
      threadId: "ses",
      objective: "Ship it",
      status: "active",
      tokenBudget: null,
      tokensUsed: 0,
      timeUsedSeconds: 0,
      createdAt: 1,
      updatedAt: 1,
    }
    const response: ThreadGoalToolResponse = { goal, remainingTokens: null, completionBudgetReport: null }
    const edit: EditGoalInput = { objective: "Ship edited goal", token_budget: null }
    expect(response.goal?.objective).toBe("Ship it")
    expect(edit.objective).toBe("Ship edited goal")
  })

  test("validates goal objectives", () => {
    expect(MAX_THREAD_GOAL_OBJECTIVE_CHARS).toBe(4_000)
    expect(validateThreadGoalObjective(" ship ")).toBeNull()
    expect(validateThreadGoalObjective("")).toBe("Goal objective must not be empty.")
    expect(validateThreadGoalObjective(" ".repeat(3))).toBe("Goal objective must not be empty.")
    expect(validateThreadGoalObjective("x".repeat(4_001))).toBe("goal objective must be at most 4000 characters")
  })

  test("validates budgets and computes remaining tokens", () => {
    expect(validateThreadGoalBudget(undefined)).toBeNull()
    expect(validateThreadGoalBudget(null)).toBeNull()
    expect(validateThreadGoalBudget(1)).toBeNull()
    expect(validateThreadGoalBudget(0)).toBe("goal budgets must be positive when provided")
    expect(validateThreadGoalBudget(1.5)).toBe("goal budgets must be positive when provided")
    expect(remainingThreadGoalTokens({ tokenBudget: null, tokensUsed: 5 })).toBeNull()
    expect(remainingThreadGoalTokens({ tokenBudget: 10, tokensUsed: 3 })).toBe(7)
    expect(remainingThreadGoalTokens({ tokenBudget: 10, tokensUsed: 12 })).toBe(0)
  })

  test("computes Codex-equivalent token deltas", () => {
    expect(threadGoalTokenDelta({ inputTokens: 900, cachedInputTokens: 400, outputTokens: 80 })).toBe(580)
    expect(threadGoalTokenDelta({ inputTokens: 100, cachedInputTokens: 200, outputTokens: -10 })).toBe(0)
  })
})
