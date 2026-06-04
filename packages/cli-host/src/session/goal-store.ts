import type { GoalStore, StoredThreadGoal } from "@interbase/cli-goal-plugin"
import * as Database from "@/storage/db"
import { eq } from "@/storage/db"
import { ThreadGoalTable } from "./goal.sql"
import type { SessionID } from "./schema"

export type GoalCommandTurnState = {
  goalStatus?: StoredThreadGoal["status"] | null
}

type GoalRow = typeof ThreadGoalTable.$inferSelect

function pathForSession(sessionId: string): string {
  return Database.resolveSessionPath(sessionId) ?? Database.Path
}

function asSessionID(sessionId: string): SessionID {
  return sessionId as SessionID
}

function fromRow(row: GoalRow): StoredThreadGoal {
  return {
    threadId: row.session_id,
    goalId: row.goal_id,
    objective: row.objective,
    status: row.status,
    tokenBudget: row.token_budget,
    tokensUsed: row.tokens_used,
    timeUsedSeconds: row.time_used_seconds,
    budgetLimitReported: row.budget_limit_reported,
    createdAt: Math.trunc(row.time_created / 1000),
    updatedAt: Math.trunc(row.time_updated / 1000),
  }
}

function toRow(goal: StoredThreadGoal) {
  return {
    session_id: asSessionID(goal.threadId),
    goal_id: goal.goalId,
    objective: goal.objective,
    status: goal.status,
    token_budget: goal.tokenBudget,
    tokens_used: goal.tokensUsed,
    time_used_seconds: goal.timeUsedSeconds,
    budget_limit_reported: goal.budgetLimitReported,
    time_created: goal.createdAt * 1000,
    time_updated: goal.updatedAt * 1000,
  }
}

export class MainDbGoalStore implements GoalStore {
  get(sessionId: string): StoredThreadGoal | null {
    const row = Database.usePath(pathForSession(sessionId), (db) =>
      db
        .select()
        .from(ThreadGoalTable)
        .where(eq(ThreadGoalTable.session_id, asSessionID(sessionId)))
        .get(),
    )
    return row ? fromRow(row) : null
  }

  list(): StoredThreadGoal[] {
    return Database.listPaths().flatMap((dbPath) =>
      Database.usePath(dbPath, (db) => db.select().from(ThreadGoalTable).all().map(fromRow)),
    )
  }

  set(goal: StoredThreadGoal): void {
    Database.transactionPath(pathForSession(goal.threadId), (db) => {
      db.insert(ThreadGoalTable)
        .values(toRow(goal))
        .onConflictDoUpdate({
          target: ThreadGoalTable.session_id,
          set: {
            goal_id: goal.goalId,
            objective: goal.objective,
            status: goal.status,
            token_budget: goal.tokenBudget,
            tokens_used: goal.tokensUsed,
            time_used_seconds: goal.timeUsedSeconds,
            budget_limit_reported: goal.budgetLimitReported,
            time_created: goal.createdAt * 1000,
            time_updated: goal.updatedAt * 1000,
          },
        })
        .run()
    })
  }

  delete(sessionId: string): boolean {
    return Database.transactionPath(
      pathForSession(sessionId),
      (db) => {
        const existing = db
          .select({ session_id: ThreadGoalTable.session_id })
          .from(ThreadGoalTable)
          .where(eq(ThreadGoalTable.session_id, asSessionID(sessionId)))
          .get()
        if (!existing) return false
        db.delete(ThreadGoalTable)
          .where(eq(ThreadGoalTable.session_id, asSessionID(sessionId)))
          .run()
        return true
      },
      { behavior: "immediate" },
    )
  }

  update(
    sessionId: string,
    mutate: (goal: StoredThreadGoal | null) => StoredThreadGoal | null,
  ): StoredThreadGoal | null {
    return Database.transactionPath(
      pathForSession(sessionId),
      (db) => {
        const existing = db
          .select()
          .from(ThreadGoalTable)
          .where(eq(ThreadGoalTable.session_id, asSessionID(sessionId)))
          .get()
        const next = mutate(existing ? fromRow(existing) : null)
        if (!next) {
          if (existing)
            db.delete(ThreadGoalTable)
              .where(eq(ThreadGoalTable.session_id, asSessionID(sessionId)))
              .run()
          return null
        }
        db.insert(ThreadGoalTable)
          .values(toRow(next))
          .onConflictDoUpdate({
            target: ThreadGoalTable.session_id,
            set: {
              goal_id: next.goalId,
              objective: next.objective,
              status: next.status,
              token_budget: next.tokenBudget,
              tokens_used: next.tokensUsed,
              time_used_seconds: next.timeUsedSeconds,
              budget_limit_reported: next.budgetLimitReported,
              time_created: next.createdAt * 1000,
              time_updated: next.updatedAt * 1000,
            },
          })
          .run()
        return next
      },
      { behavior: "immediate" },
    )
  }
}

export function createMainDbGoalStore(): GoalStore {
  return new MainDbGoalStore()
}

export function readGoalCommandTurnState(input: { sessionID?: string }): GoalCommandTurnState {
  if (!input.sessionID) return {}
  return { goalStatus: createMainDbGoalStore().get(input.sessionID)?.status ?? null }
}
