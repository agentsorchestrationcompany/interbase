import type { ArtifactHandle } from "@interbase/computer-use-protocol"

export type ArtifactRecord = ArtifactHandle & {
  sessionId: string
  createdAtMs: number
  expiresAtMs: number
  bytes: number
  data?: Uint8Array
  deleted?: { reason: string; atMs: number }
}

export type ArtifactReadResult =
  | { ok: true; id: string; kind: ArtifactRecord["kind"]; mimeType: ArtifactRecord["mimeType"]; data: Uint8Array; expiresAt: string }
  | { ok: false; reason: "not_found" | "session_mismatch" | "expired" | "deleted" | "bytes_unavailable" }

export type ArtifactStoreOptions = {
  maxArtifactBytes: number
  maxSessionBytes: number
  maxGlobalBytes: number
}

export type CreateArtifactInput = {
  id: string
  sessionId: string
  kind: "screenshot"
  mimeType: "image/png"
  createdAtMs: number
  ttlMs: number
  bytes: number
  data?: Uint8Array
}

export function createArtifactStore(options: ArtifactStoreOptions) {
  const records = new Map<string, ArtifactRecord>()
  let limits = options

  function active() {
    return [...records.values()].filter((record) => record.deleted === undefined)
  }

  function activeBytes(predicate: (record: ArtifactRecord) => boolean) {
    return active().filter(predicate).reduce((sum, record) => sum + record.bytes, 0)
  }

  return {
    create(input: CreateArtifactInput) {
      if (input.data && input.data.byteLength !== input.bytes) {
        throw new Error("computer-use artifact byte length mismatch")
      }
      if (input.bytes > limits.maxArtifactBytes) {
        throw new Error("computer-use artifact size quota exceeded")
      }
      const sessionBytes = activeBytes((record) => record.sessionId === input.sessionId)
      const globalBytes = activeBytes(() => true)
      if (sessionBytes + input.bytes > limits.maxSessionBytes) {
        throw new Error("computer-use artifact session quota exceeded")
      }
      if (globalBytes + input.bytes > limits.maxGlobalBytes) {
        throw new Error("computer-use artifact global quota exceeded")
      }
      const record: ArtifactRecord = {
        id: input.id,
        kind: input.kind,
        mimeType: input.mimeType,
        sessionId: input.sessionId,
        createdAtMs: input.createdAtMs,
        expiresAtMs: input.createdAtMs + input.ttlMs,
        expiresAt: new Date(input.createdAtMs + input.ttlMs).toISOString(),
        bytes: input.bytes,
        data: input.data ? new Uint8Array(input.data) : undefined,
      }
      records.set(input.id, record)
      return toHandle(record)
    },
    configure(next: Partial<ArtifactStoreOptions>) {
      limits = { ...limits, ...next }
    },
    delete(id: string, reason: string, atMs: number) {
      const record = records.get(id)
      if (!record || record.deleted) return false
      record.deleted = { reason, atMs }
      return true
    },
    cleanupExpired(nowMs: number) {
      const deleted: string[] = []
      for (const record of active()) {
        if (record.expiresAtMs <= nowMs && this.delete(record.id, "expired", nowMs)) deleted.push(record.id)
      }
      return deleted
    },
    revokeSession(sessionId: string, atMs: number) {
      const deleted: string[] = []
      for (const record of active()) {
        if (record.sessionId === sessionId && this.delete(record.id, "revoked", atMs)) deleted.push(record.id)
      }
      return deleted
    },
    listActive() {
      return active().map(toHandle)
    },
    get(id: string) {
      const record = records.get(id)
      return record && !record.deleted ? toHandle(record) : undefined
    },
    read(id: string, input: { sessionId: string; nowMs: number }): ArtifactReadResult {
      const record = records.get(id)
      if (!record) return { ok: false, reason: "not_found" }
      if (record.deleted) return { ok: false, reason: "deleted" }
      if (record.sessionId !== input.sessionId) return { ok: false, reason: "session_mismatch" }
      if (record.expiresAtMs <= input.nowMs) return { ok: false, reason: "expired" }
      if (!record.data) return { ok: false, reason: "bytes_unavailable" }
      return { ok: true, id: record.id, kind: record.kind, mimeType: record.mimeType, data: new Uint8Array(record.data), expiresAt: record.expiresAt }
    },
  }
}

export function artifactReadResponse(result: ArtifactReadResult): Response {
  if (result.ok) {
    const body = result.data.buffer.slice(result.data.byteOffset, result.data.byteOffset + result.data.byteLength) as ArrayBuffer
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": result.mimeType,
        "cache-control": "private, no-store",
        "x-interbase-artifact-id": result.id,
        "x-interbase-artifact-kind": result.kind,
        "x-interbase-artifact-expires-at": result.expiresAt,
      },
    })
  }
  const status = result.reason === "session_mismatch" ? 403 : result.reason === "expired" || result.reason === "deleted" ? 410 : result.reason === "bytes_unavailable" ? 404 : 404
  return Response.json({ error: result.reason }, { status, headers: { "cache-control": "no-store" } })
}

function toHandle(record: ArtifactRecord): ArtifactHandle {
  return {
    id: record.id,
    kind: record.kind,
    mimeType: record.mimeType,
    expiresAt: record.expiresAt,
  }
}
