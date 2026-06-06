import { and, eq, isNull, lte } from "drizzle-orm"
import type { ArtifactHandle } from "@interbase/computer-use-protocol"
import type { AuditEvent } from "@/computer-use/audit"
import { sanitizeAuditEvent } from "@/computer-use/audit"
import type { ArtifactRecord } from "@/computer-use/artifact"
import { ComputerUseArtifactTable, ComputerUseAuditTable } from "@/computer-use/computer-use.sql"
import type { TxOrDb } from "@/storage/db"

export type PersistAuditInput = {
  id: string
  sessionId?: string
  event: AuditEvent
  atMs: number
}

export type ComputerUseRepository = ReturnType<typeof createComputerUseRepository>

export function createComputerUseRepository(db: TxOrDb) {
  return {
    createArtifact(record: ArtifactRecord) {
      return persistArtifact(db, record)
    },
    markArtifactDeleted(input: { id: string; reason: string; atMs: number }) {
      return markArtifactDeleted(db, input.id, input.reason, input.atMs)
    },
    listActiveArtifacts(sessionId?: string) {
      return listActiveArtifactHandles(db, sessionId)
    },
    appendAudit(input: PersistAuditInput) {
      return persistAuditEvent(db, input)
    },
    listAudit(input: { traceId: string }) {
      return listAuditEvents(db, input.traceId)
    },
  }
}

export function persistArtifact(db: TxOrDb, record: ArtifactRecord) {
  const handle = artifactHandle(record)
  db.insert(ComputerUseArtifactTable)
    .values({
      id: record.id,
      session_id: record.sessionId,
      kind: record.kind,
      mime_type: record.mimeType,
      bytes: record.bytes,
      expires_at: record.expiresAtMs,
      deleted_at: record.deleted?.atMs,
      delete_reason: record.deleted?.reason,
      handle,
      time_created: record.createdAtMs,
      time_updated: record.deleted?.atMs ?? record.createdAtMs,
    })
    .onConflictDoUpdate({
      target: ComputerUseArtifactTable.id,
      set: {
        session_id: record.sessionId,
        kind: record.kind,
        mime_type: record.mimeType,
        bytes: record.bytes,
        expires_at: record.expiresAtMs,
        deleted_at: record.deleted?.atMs,
        delete_reason: record.deleted?.reason,
        handle,
        time_updated: record.deleted?.atMs ?? record.createdAtMs,
      },
    })
    .run()
  return handle
}

export function markArtifactDeleted(db: TxOrDb, id: string, reason: string, atMs: number) {
  const row = db
    .select({ id: ComputerUseArtifactTable.id })
    .from(ComputerUseArtifactTable)
    .where(and(eq(ComputerUseArtifactTable.id, id), isNull(ComputerUseArtifactTable.deleted_at)))
    .get()
  if (!row) return false
  db
    .update(ComputerUseArtifactTable)
    .set({ deleted_at: atMs, delete_reason: reason, time_updated: atMs })
    .where(and(eq(ComputerUseArtifactTable.id, id), isNull(ComputerUseArtifactTable.deleted_at)))
    .run()
  return true
}

export function cleanupExpiredArtifacts(db: TxOrDb, nowMs: number) {
  const rows = db
    .select({ id: ComputerUseArtifactTable.id })
    .from(ComputerUseArtifactTable)
    .where(and(isNull(ComputerUseArtifactTable.deleted_at), lte(ComputerUseArtifactTable.expires_at, nowMs)))
    .all()
  for (const row of rows) markArtifactDeleted(db, row.id, "expired", nowMs)
  return rows.map((row) => row.id)
}

export function listActiveArtifactHandles(db: TxOrDb, sessionId?: string) {
  const filters = [isNull(ComputerUseArtifactTable.deleted_at)]
  if (sessionId) filters.push(eq(ComputerUseArtifactTable.session_id, sessionId))
  return db
    .select({ handle: ComputerUseArtifactTable.handle })
    .from(ComputerUseArtifactTable)
    .where(and(...filters))
    .all()
    .map((row) => row.handle)
}

export function persistAuditEvent(db: TxOrDb, input: PersistAuditInput) {
  const event = sanitizeAuditEvent(input.event)
  db.insert(ComputerUseAuditTable)
    .values({
      id: input.id,
      session_id: input.sessionId,
      trace_id: event.traceId,
      type: event.type,
      event,
      time_created: input.atMs,
      time_updated: input.atMs,
    })
    .run()
  return event
}

export function listAuditEvents(db: TxOrDb, traceId: string) {
  return db.select({ event: ComputerUseAuditTable.event }).from(ComputerUseAuditTable).where(eq(ComputerUseAuditTable.trace_id, traceId)).all().map((row) => row.event)
}

function artifactHandle(record: ArtifactRecord): ArtifactHandle {
  return {
    id: record.id,
    kind: record.kind,
    mimeType: record.mimeType,
    expiresAt: record.expiresAt,
  }
}
