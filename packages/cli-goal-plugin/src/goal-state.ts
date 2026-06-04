import {
  createSyncJsonStateStore,
  stateFilePathFromAbsolute,
  type JsonStateSchema,
  type JsonValue,
  type RuntimeAccessPolicyInput,
  type StateFilePath,
  type SyncJsonStateStore,
} from "@interbase/cli-local-state"
import { isThreadGoalStatus, type ThreadGoal } from "../../runtime-protocol/src/index.js"
import type { GoalStoreSnapshot, StoredThreadGoal } from "./index.js"

export type { RuntimeAccessPolicyInput, StateFilePath } from "@interbase/cli-local-state"

export function createGoalSnapshotStateStore(
  filePath: string | StateFilePath,
  accessPolicy: RuntimeAccessPolicyInput = { kind: "production" },
): SyncJsonStateStore<GoalStoreSnapshot> {
  return createSyncJsonStateStore<GoalStoreSnapshot>({
    accessPolicy,
    concurrency: "multiProcess",
    defaultValue: emptyGoalSnapshot,
    kind: "thread goal state",
    path: typeof filePath === "string" ? stateFilePathFromAbsolute(filePath) : filePath,
    recoverability: "failClosed",
    schema: goalSnapshotSchema,
    version: 1,
  })
}

const goalSnapshotSchema: JsonStateSchema<GoalStoreSnapshot> = {
  parse(value) {
    if (!isJsonObject(value) || value.version !== 1 || !isJsonObject(value.sessions)) throw new Error("invalid schema")
    return {
      sessions: Object.fromEntries(
        Object.entries(value.sessions).map(([sessionId, goal]) => [sessionId, parseStoredThreadGoal(goal)]),
      ),
      version: 1,
    }
  },
}

function parseStoredThreadGoal(value: JsonValue): StoredThreadGoal {
  if (
    !isJsonObject(value) ||
    typeof value.budgetLimitReported !== "boolean" ||
    typeof value.createdAt !== "number" ||
    typeof value.goalId !== "string" ||
    typeof value.objective !== "string" ||
    !isThreadGoalStatusValue(value.status) ||
    (typeof value.tokenBudget !== "number" && value.tokenBudget !== null) ||
    typeof value.tokensUsed !== "number" ||
    typeof value.threadId !== "string" ||
    typeof value.timeUsedSeconds !== "number" ||
    typeof value.updatedAt !== "number"
  ) {
    throw new Error("invalid schema")
  }
  return {
    budgetLimitReported: value.budgetLimitReported,
    createdAt: value.createdAt,
    goalId: value.goalId,
    objective: value.objective,
    status: value.status,
    tokenBudget: value.tokenBudget,
    tokensUsed: value.tokensUsed,
    threadId: value.threadId,
    timeUsedSeconds: value.timeUsedSeconds,
    updatedAt: value.updatedAt,
  }
}

function emptyGoalSnapshot(): GoalStoreSnapshot {
  return { sessions: {}, version: 1 }
}

function isThreadGoalStatusValue(value: JsonValue): value is ThreadGoal["status"] {
  return typeof value === "string" && isThreadGoalStatus(value)
}

function isJsonObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
