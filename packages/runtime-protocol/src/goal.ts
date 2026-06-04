export const threadGoalStatusValues = [
  "active",
  "paused",
  "blocked",
  "budgetLimited",
  "usageLimited",
  "complete",
] as const

export type ThreadGoalStatus = (typeof threadGoalStatusValues)[number]

export const MAX_THREAD_GOAL_OBJECTIVE_CHARS = 4_000

export interface ThreadGoal {
  threadId: string
  objective: string
  status: ThreadGoalStatus
  tokenBudget: number | null
  tokensUsed: number
  timeUsedSeconds: number
  createdAt: number
  updatedAt: number
}

export interface ThreadGoalToolResponse {
  goal: ThreadGoal | null
  remainingTokens: number | null
  completionBudgetReport: string | null
}

export interface CreateGoalInput {
  objective: string
  token_budget?: number
}

export interface UpdateGoalInput {
  status: "complete" | "blocked"
}

export interface EditGoalInput {
  objective: string
  token_budget?: number | null
}

export interface ThreadGoalUsageDelta {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
}

export interface ThreadGoalCommandResult {
  kind: "handled" | "passthrough"
  message?: string
  hint?: string
  prompt?: {
    title: string
    message: string
    confirmLabel: string
  }
}

export const GOAL_CONTEXT_START_MARKER = "<goal_context>"
export const GOAL_CONTEXT_END_MARKER = "</goal_context>"

export function isThreadGoalStatus(value: string): value is ThreadGoalStatus {
  return (threadGoalStatusValues as readonly string[]).includes(value)
}

export function validateThreadGoalObjective(objective: string): string | null {
  const trimmed = objective.trim()
  if (!trimmed) return "Goal objective must not be empty."
  if ([...trimmed].length > MAX_THREAD_GOAL_OBJECTIVE_CHARS) {
    return `goal objective must be at most ${MAX_THREAD_GOAL_OBJECTIVE_CHARS} characters`
  }
  return null
}

export function validateThreadGoalBudget(tokenBudget: number | null | undefined): string | null {
  if (tokenBudget === null || tokenBudget === undefined) return null
  if (!Number.isInteger(tokenBudget) || tokenBudget <= 0) {
    return "goal budgets must be positive when provided"
  }
  return null
}

export function remainingThreadGoalTokens(goal: Pick<ThreadGoal, "tokenBudget" | "tokensUsed">): number | null {
  if (goal.tokenBudget === null) return null
  return Math.max(0, goal.tokenBudget - goal.tokensUsed)
}

export function threadGoalTokenDelta(usage: ThreadGoalUsageDelta): number {
  return Math.max(0, usage.inputTokens - usage.cachedInputTokens) + Math.max(0, usage.outputTokens)
}
