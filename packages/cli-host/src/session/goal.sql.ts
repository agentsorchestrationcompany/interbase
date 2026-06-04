import { integer, text, sqliteTable } from "drizzle-orm/sqlite-core"
import type { ThreadGoalStatus } from "@interbase/runtime-protocol"
import type { SessionID } from "./schema"
import { SessionTable } from "./session.sql"
import { Timestamps } from "../storage/schema.sql"

export const ThreadGoalTable = sqliteTable("thread_goal", {
  session_id: text()
    .$type<SessionID>()
    .primaryKey()
    .references(() => SessionTable.id, { onDelete: "cascade" }),
  goal_id: text().notNull(),
  objective: text().notNull(),
  status: text().$type<ThreadGoalStatus>().notNull(),
  token_budget: integer(),
  tokens_used: integer().notNull().default(0),
  time_used_seconds: integer().notNull().default(0),
  budget_limit_reported: integer({ mode: "boolean" }).notNull().default(false),
  ...Timestamps,
})
