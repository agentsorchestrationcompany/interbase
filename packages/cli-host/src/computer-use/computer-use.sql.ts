import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { SessionTable } from "@/session/session.sql"
import { Timestamps } from "@/storage/schema.sql"
import type { ArtifactHandle } from "@interbase/computer-use-protocol"
import type { AuditEvent } from "@/computer-use/audit"

export const ComputerUseArtifactTable = sqliteTable(
  "computer_use_artifact",
  {
    id: text().primaryKey(),
    session_id: text()
      .notNull()
      .references(() => SessionTable.id, { onDelete: "cascade" }),
    kind: text().$type<ArtifactHandle["kind"]>().notNull(),
    mime_type: text().$type<ArtifactHandle["mimeType"]>().notNull(),
    bytes: integer().notNull(),
    expires_at: integer().notNull(),
    deleted_at: integer(),
    delete_reason: text(),
    handle: text({ mode: "json" }).$type<ArtifactHandle>().notNull(),
    ...Timestamps,
  },
  (table) => [
    index("computer_use_artifact_session_idx").on(table.session_id),
    index("computer_use_artifact_expires_at_idx").on(table.expires_at),
    index("computer_use_artifact_deleted_at_idx").on(table.deleted_at),
  ],
)

export const ComputerUseAuditTable = sqliteTable(
  "computer_use_audit",
  {
    id: text().primaryKey(),
    session_id: text().references(() => SessionTable.id, { onDelete: "cascade" }),
    trace_id: text().notNull(),
    type: text().$type<AuditEvent["type"]>().notNull(),
    event: text({ mode: "json" }).$type<AuditEvent>().notNull(),
    ...Timestamps,
  },
  (table) => [
    index("computer_use_audit_session_idx").on(table.session_id),
    index("computer_use_audit_trace_idx").on(table.trace_id),
    index("computer_use_audit_type_idx").on(table.type),
  ],
)
