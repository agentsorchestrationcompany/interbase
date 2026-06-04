import type { RemoteRuntimeJsonValue } from "@interbase/remote-runtime-contracts"
import {
  remainingThreadGoalTokens,
  type ThreadGoal,
  type ThreadGoalStatus,
  type ThreadGoalToolResponse,
  validateThreadGoalBudget,
  validateThreadGoalObjective,
} from "@interbase/runtime-protocol"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"

export type GoalStoreSnapshot = {
  version: 1
  sessions: Record<string, StoredThreadGoal>
}

export type StoredThreadGoal = ThreadGoal & {
  goalId: string
  budgetLimitReported: boolean
}

export interface GoalStore {
  get(sessionId: string): StoredThreadGoal | null
  list(): StoredThreadGoal[]
  set(goal: StoredThreadGoal): void
  delete(sessionId: string): boolean
  update(sessionId: string, mutate: (goal: StoredThreadGoal | null) => StoredThreadGoal | null): StoredThreadGoal | null
}

export interface GoalManagerOptions {
  id?: () => string
  now?: () => number
  store: GoalStore
}

export class JsonFileGoalStore implements GoalStore {
  constructor(private readonly filePath: string) {}

  get(sessionId: string): StoredThreadGoal | null {
    return this.read().sessions[sessionId] ?? null
  }

  list(): StoredThreadGoal[] {
    return Object.values(this.read().sessions)
  }

  set(goal: StoredThreadGoal): void {
    const snapshot = this.read()
    snapshot.sessions[goal.threadId] = structuredClone(goal)
    this.write(snapshot)
  }

  delete(sessionId: string): boolean {
    const snapshot = this.read()
    if (!snapshot.sessions[sessionId]) return false
    delete snapshot.sessions[sessionId]
    this.write(snapshot)
    return true
  }

  update(
    sessionId: string,
    mutate: (goal: StoredThreadGoal | null) => StoredThreadGoal | null,
  ): StoredThreadGoal | null {
    const snapshot = this.read()
    const next = mutate(snapshot.sessions[sessionId] ? structuredClone(snapshot.sessions[sessionId]) : null)
    if (next) snapshot.sessions[sessionId] = structuredClone(next)
    else delete snapshot.sessions[sessionId]
    this.write(snapshot)
    return next ? structuredClone(next) : null
  }

  private read(): GoalStoreSnapshot {
    if (!existsSync(this.filePath)) return emptyGoalSnapshot()
    const parsed: RemoteRuntimeJsonValue = JSON.parse(readFileSync(this.filePath, "utf8"))
    return parseGoalStoreSnapshot(parsed)
  }

  private write(snapshot: GoalStoreSnapshot): void {
    mkdirSync(path.dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${process.pid}.tmp`
    writeFileSync(tempPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8")
    renameSync(tempPath, this.filePath)
  }
}

export class ThreadGoalManager {
  private readonly id: () => string
  private readonly now: () => number
  private readonly store: GoalStore

  constructor(options: GoalManagerOptions) {
    this.id = options.id ?? defaultId
    this.now = options.now ?? (() => Date.now())
    this.store = options.store
  }

  getGoal(sessionId: string): StoredThreadGoal | null {
    return this.store.get(sessionId)
  }

  listGoals(): StoredThreadGoal[] {
    return this.store.list()
  }

  createGoal(sessionId: string, objective: string, tokenBudget?: number): ThreadGoalToolResponse {
    const normalized = normalizeObjective(objective)
    assertValidObjective(normalized)
    assertValidBudget(tokenBudget ?? null)
    const now = Math.trunc(this.now() / 1000)
    const goal = newStoredGoal(sessionId, this.id(), normalized, tokenBudget ?? null, "active", now)
    this.store.update(sessionId, (existing) => {
      if (existing)
        throw new Error(
          "cannot create a new goal because this thread already has a goal; use update_goal only when the existing goal is complete",
        )
      return goal
    })
    return goalToolResponse(goal, false)
  }

  updateGoalComplete(sessionId: string): ThreadGoalToolResponse {
    const updated = this.updateExistingGoal(sessionId, { status: "complete" })
    return goalToolResponse(updated, true)
  }

  updateGoalBlocked(sessionId: string): ThreadGoalToolResponse {
    const updated = this.updateExistingGoal(sessionId, { status: "blocked" })
    return goalToolResponse(updated, false)
  }

  clearGoal(sessionId: string): boolean {
    return this.store.delete(sessionId)
  }

  setGoalStatus(sessionId: string, status: Extract<ThreadGoalStatus, "active" | "paused">): StoredThreadGoal {
    return this.updateExistingGoal(sessionId, { status })
  }

  editGoalObjective(
    sessionId: string,
    objective: string,
    tokenBudget?: number | null,
  ): { goal: StoredThreadGoal; objectiveChanged: boolean; steering: string | null } {
    const normalized = normalizeObjective(objective)
    assertValidObjective(normalized)
    assertValidBudget(tokenBudget ?? null)
    const existing = this.getGoal(sessionId)
    if (!existing) throw new Error(`cannot edit goal for thread ${sessionId}: no goal exists`)
    const update: Partial<Pick<StoredThreadGoal, "objective" | "status" | "tokenBudget">> = {
      objective: normalized,
      status: editedGoalStatus(existing.status),
    }
    if (tokenBudget !== undefined) update.tokenBudget = tokenBudget
    const updated = this.updateExistingGoal(sessionId, update)
    return {
      goal: updated,
      objectiveChanged: existing.objective !== updated.objective,
      steering: null,
    }
  }

  private updateExistingGoal(
    sessionId: string,
    update: Partial<
      Pick<
        StoredThreadGoal,
        "budgetLimitReported" | "objective" | "status" | "timeUsedSeconds" | "tokenBudget" | "tokensUsed"
      >
    >,
  ): StoredThreadGoal {
    const updated = this.store.update(sessionId, (goal) => {
      if (!goal) throw new Error(`cannot update goal for thread ${sessionId}: no goal exists`)
      const next: StoredThreadGoal = {
        ...goal,
        ...update,
        updatedAt: Math.trunc(this.now() / 1000),
      }
      next.status = statusAfterBudget(next.status, next.tokensUsed, next.tokenBudget)
      if (next.status !== "budgetLimited") next.budgetLimitReported = false
      return next
    })
    if (!updated) throw new Error(`cannot update goal for thread ${sessionId}: no goal exists`)
    return updated
  }
}

export function goalToolResponse(
  goal: ThreadGoal | null,
  includeCompletionBudgetReport: boolean,
): ThreadGoalToolResponse {
  return {
    goal,
    remainingTokens: goal ? remainingThreadGoalTokens(goal) : null,
    completionBudgetReport:
      includeCompletionBudgetReport && goal?.status === "complete" ? completionBudgetReport(goal) : null,
  }
}

function emptyGoalSnapshot(): GoalStoreSnapshot {
  return { version: 1, sessions: {} }
}

function assertValidObjective(objective: string): void {
  const error = validateThreadGoalObjective(objective)
  if (error) throw new Error(error)
}

function assertValidBudget(tokenBudget: number | null): void {
  const error = validateThreadGoalBudget(tokenBudget)
  if (error) throw new Error(error)
}

function completionBudgetReport(goal: ThreadGoal): string | null {
  const parts: string[] = []
  if (goal.tokenBudget !== null) parts.push(`tokens used: ${goal.tokensUsed} of ${goal.tokenBudget}`)
  if (goal.timeUsedSeconds > 0) parts.push(`time used: ${goal.timeUsedSeconds} seconds`)
  return parts.length ? `Goal achieved. Report final budget usage to the user: ${parts.join("; ")}.` : null
}

function defaultId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function newStoredGoal(
  sessionId: string,
  goalId: string,
  objective: string,
  tokenBudget: number | null,
  status: ThreadGoalStatus,
  now: number,
): StoredThreadGoal {
  return {
    threadId: sessionId,
    goalId,
    objective,
    status: statusAfterBudget(status, 0, tokenBudget),
    tokenBudget,
    tokensUsed: 0,
    timeUsedSeconds: 0,
    createdAt: now,
    updatedAt: now,
    budgetLimitReported: false,
  }
}

function editedGoalStatus(status: ThreadGoalStatus): ThreadGoalStatus {
  return status === "budgetLimited" || status === "complete" ? "active" : status
}

function normalizeObjective(objective: string): string {
  return objective.trim()
}

function statusAfterBudget(status: ThreadGoalStatus, tokensUsed: number, tokenBudget: number | null): ThreadGoalStatus {
  return status === "active" && tokenBudget !== null && tokensUsed >= tokenBudget ? "budgetLimited" : status
}

function parseGoalStoreSnapshot(value: RemoteRuntimeJsonValue): GoalStoreSnapshot {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.sessions)) throw new Error("Invalid goal state.")
  const sessions: Record<string, StoredThreadGoal> = {}
  for (const [sessionId, goal] of Object.entries(value.sessions)) {
    sessions[sessionId] = parseStoredThreadGoal(goal)
  }
  return { version: 1, sessions }
}

function parseStoredThreadGoal(value: RemoteRuntimeJsonValue): StoredThreadGoal {
  if (
    !isRecord(value) ||
    typeof value.threadId !== "string" ||
    typeof value.goalId !== "string" ||
    typeof value.objective !== "string" ||
    !isThreadGoalStatusValue(value.status) ||
    (typeof value.tokenBudget !== "number" && value.tokenBudget !== null) ||
    typeof value.tokensUsed !== "number" ||
    typeof value.timeUsedSeconds !== "number" ||
    typeof value.createdAt !== "number" ||
    typeof value.updatedAt !== "number" ||
    typeof value.budgetLimitReported !== "boolean"
  ) {
    throw new Error("Invalid goal state.")
  }
  return {
    threadId: value.threadId,
    goalId: value.goalId,
    objective: value.objective,
    status: value.status,
    tokenBudget: value.tokenBudget,
    tokensUsed: value.tokensUsed,
    timeUsedSeconds: value.timeUsedSeconds,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    budgetLimitReported: value.budgetLimitReported,
  }
}

function isThreadGoalStatusValue(value: RemoteRuntimeJsonValue): value is ThreadGoalStatus {
  return (
    value === "active" ||
    value === "paused" ||
    value === "blocked" ||
    value === "budgetLimited" ||
    value === "usageLimited" ||
    value === "complete"
  )
}

function isRecord(value: RemoteRuntimeJsonValue): value is { readonly [key: string]: RemoteRuntimeJsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
