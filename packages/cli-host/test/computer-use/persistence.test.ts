import { afterEach, describe, expect, test } from "bun:test"
import { ProjectTable } from "@/project/project.sql"
import { SessionTable } from "@/session/session.sql"
import { Database } from "@/storage/db"
import type { ProjectID } from "@/project/schema"
import type { SessionID } from "@/session/schema"
import type { ArtifactRecord } from "@/computer-use/artifact"
import {
  cleanupExpiredArtifacts,
  createComputerUseRepository,
  listActiveArtifactHandles,
  listAuditEvents,
  markArtifactDeleted,
  persistArtifact,
  persistAuditEvent,
} from "@/computer-use/persistence"

const dbPath = ":memory:"

afterEach(() => Database.close(dbPath))

describe("computer-use persistence", () => {
  test("persists artifact metadata, active handles, deletion, and expiry cleanup", () => {
    const db = seededDb()
    const first = artifact({ id: "art_1", sessionId: "ses_1", bytes: 3, expiresAtMs: 10 })
    expect(persistArtifact(db, first)).toEqual({ id: "art_1", kind: "screenshot", mimeType: "image/png", expiresAt: "1970-01-01T00:00:00.010Z" })
    expect(listActiveArtifactHandles(db)).toEqual([{ id: "art_1", kind: "screenshot", mimeType: "image/png", expiresAt: "1970-01-01T00:00:00.010Z" }])
    expect(listActiveArtifactHandles(db, "ses_2")).toEqual([])

    persistArtifact(db, { ...first, bytes: 4, expiresAtMs: 20, expiresAt: "1970-01-01T00:00:00.020Z" })
    expect(listActiveArtifactHandles(db, "ses_1")).toEqual([{ id: "art_1", kind: "screenshot", mimeType: "image/png", expiresAt: "1970-01-01T00:00:00.020Z" }])
    expect(markArtifactDeleted(db, "art_1", "revoked", 5)).toBe(true)
    expect(markArtifactDeleted(db, "art_1", "revoked", 6)).toBe(false)
    expect(listActiveArtifactHandles(db)).toEqual([])

    persistArtifact(db, artifact({ id: "old", sessionId: "ses_1", expiresAtMs: 10 }))
    persistArtifact(db, artifact({ id: "new", sessionId: "ses_1", expiresAtMs: 30 }))
    expect(cleanupExpiredArtifacts(db, 10)).toEqual(["old"])
    expect(cleanupExpiredArtifacts(db, 10)).toEqual([])
    expect(listActiveArtifactHandles(db).map((item) => item.id)).toEqual(["new"])
  })

  test("persists sanitized audit events without raw target content", () => {
    const db = seededDb()
    const event = persistAuditEvent(db, {
      id: "audit_1",
      sessionId: "ses_1",
      atMs: 1,
      event: {
        type: "computer.observe.requested",
        traceId: "trace_1",
        sessionId: "ses_1",
        target: { app: { name: "Finder", bundleId: "com.apple.finder", path: "/System/Finder.app", pid: 123 }, secret: "drop" },
      },
    })
    expect(event).toEqual({
      type: "computer.observe.requested",
      traceId: "trace_1",
      sessionId: "ses_1",
      target: { app: { name: "Finder", bundleId: "com.apple.finder", path: "/System/Finder.app" }, windowId: undefined },
      rawContentStored: false,
    })
    expect(listAuditEvents(db, "trace_1")).toEqual([event])
    expect(listAuditEvents(db, "missing")).toEqual([])
  })

  test("exposes repository API for metadata-only artifact and audit persistence", () => {
    const db = seededDb()
    const repository = createComputerUseRepository(db)
    expect(repository.createArtifact(artifact({ id: "repo_art", sessionId: "ses_1", expiresAtMs: 10 }))).toMatchObject({ id: "repo_art" })
    expect(repository.listActiveArtifacts("ses_1")).toEqual([{ id: "repo_art", kind: "screenshot", mimeType: "image/png", expiresAt: "1970-01-01T00:00:00.010Z" }])
    expect(repository.markArtifactDeleted({ id: "repo_art", reason: "revoked", atMs: 5 })).toBe(true)
    const event = repository.appendAudit({
      id: "repo_audit",
      sessionId: "ses_1",
      atMs: 1,
      event: { type: "computer.action.allowed", traceId: "repo_trace", actionId: "act_1" },
    })
    expect(repository.listAudit({ traceId: "repo_trace" })).toEqual([event])
  })
})

function seededDb() {
  const db = Database.Client(dbPath)
  db.insert(ProjectTable)
    .values({ id: "proj_1" as ProjectID, worktree: "/tmp/project", sandboxes: [], time_created: 0, time_updated: 0 })
    .onConflictDoNothing()
    .run()
  db.insert(SessionTable)
    .values({ id: "ses_1" as SessionID, project_id: "proj_1" as ProjectID, slug: "session", directory: "/tmp/project", title: "Session", version: "0.0.0", time_created: 0, time_updated: 0 })
    .onConflictDoNothing()
    .run()
  return db
}

function artifact(input: { id: string; sessionId: string; bytes?: number; expiresAtMs: number }): ArtifactRecord {
  return {
    id: input.id,
    kind: "screenshot",
    mimeType: "image/png",
    sessionId: input.sessionId,
    createdAtMs: 0,
    expiresAtMs: input.expiresAtMs,
    expiresAt: new Date(input.expiresAtMs).toISOString(),
    bytes: input.bytes ?? 1,
  }
}
