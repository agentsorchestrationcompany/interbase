import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, test } from "bun:test"
import { interbaseRuntimeContext } from "../../src/interbase-runtime-context"
import { ProjectTable } from "../../src/project/project.sql"
import type { ProjectID } from "../../src/project/schema"
import { MainDbGoalStore, readGoalCommandTurnState } from "../../src/session/goal-store"
import { SessionTable } from "../../src/session/session.sql"
import type { SessionID } from "../../src/session/schema"
import * as Database from "../../src/storage/db"
import { eq } from "../../src/storage/db"

function seedSession(sessionID: string) {
  const projectID = `project-${sessionID}` as ProjectID
  const now = Date.now()
  Database.transaction((db) => {
    db.insert(ProjectTable)
      .values({
        id: projectID,
        worktree: "/tmp",
        sandboxes: [],
        time_created: now,
        time_updated: now,
      })
      .run()
    db.insert(SessionTable)
      .values({
        id: sessionID as SessionID,
        project_id: projectID,
        slug: `slug-${sessionID}`,
        directory: "/tmp",
        title: `title-${sessionID}`,
        version: "test",
        time_created: now,
        time_updated: now,
      })
      .run()
  })
}

describe("MainDbGoalStore", () => {
  test("supports create get update delete without legacy goal sqlite state", () => {
    const sessionID = "session-goal-store" as SessionID
    seedSession(sessionID)
    const store = new MainDbGoalStore()

    store.set({
      threadId: sessionID,
      goalId: `goal-${sessionID}`,
      objective: "Move persistence",
      status: "active",
      tokenBudget: 100,
      tokensUsed: 5,
      timeUsedSeconds: 7,
      createdAt: 10,
      updatedAt: 10,
      budgetLimitReported: false,
    })

    expect(store.get(sessionID)).toMatchObject({
      objective: "Move persistence",
      status: "active",
      tokenBudget: 100,
      tokensUsed: 5,
    })

    const updated = store.update(sessionID, (goal) => ({
      ...goal!,
      status: "paused",
      tokensUsed: goal!.tokensUsed + 3,
      updatedAt: 11,
    }))
    expect(updated).toMatchObject({ status: "paused", tokensUsed: 8 })
    expect(readGoalCommandTurnState({ sessionID })).toEqual({ goalStatus: "paused" })

    expect(store.delete(sessionID)).toBe(true)
    expect(store.get(sessionID)).toBeNull()
    expect(store.delete(sessionID)).toBe(false)
    expect(existsSync(path.join(interbaseRuntimeContext.paths.state, ["goals", "sqlite"].join(".")))).toBe(false)
  })

  test("thread_goal rows are removed when the session row is deleted", () => {
    const sessionID = "session-goal-cascade" as SessionID
    seedSession(sessionID)
    const store = new MainDbGoalStore()

    store.set({
      threadId: sessionID,
      goalId: `goal-${sessionID}`,
      objective: "Cascade cleanup",
      status: "active",
      tokenBudget: null,
      tokensUsed: 0,
      timeUsedSeconds: 0,
      createdAt: 1,
      updatedAt: 1,
      budgetLimitReported: false,
    })

    expect(store.get(sessionID)?.objective).toBe("Cascade cleanup")
    Database.use((db) => db.delete(SessionTable).where(eq(SessionTable.id, sessionID)).run())
    expect(store.get(sessionID)).toBeNull()
  })
})
