import { describe, expect, test } from "bun:test"
import { artifactReadResponse, createArtifactStore } from "@/computer-use/artifact"

const quota = { maxArtifactBytes: 100, maxSessionBytes: 100, maxGlobalBytes: 100 }

describe("computer-use artifact store", () => {
  test("creates handles, reads active records, and deletes once", () => {
    const store = createArtifactStore(quota)
    const handle = store.create({
      id: "art_1",
      sessionId: "ses_1",
      kind: "screenshot",
      mimeType: "image/png",
      createdAtMs: 0,
      ttlMs: 1000,
      bytes: 10,
    })
    expect(handle).toEqual({ id: "art_1", kind: "screenshot", mimeType: "image/png", expiresAt: "1970-01-01T00:00:01.000Z" })
    expect(store.get("art_1")).toEqual(handle)
    expect(store.listActive()).toEqual([handle])
    expect(store.delete("art_1", "test", 1)).toBe(true)
    expect(store.delete("art_1", "test", 2)).toBe(false)
    expect(store.delete("missing", "test", 2)).toBe(false)
    expect(store.get("art_1")).toBeUndefined()
    expect(store.listActive()).toEqual([])
  })

  test("enforces session and global quotas", () => {
    const sessionStore = createArtifactStore({ maxArtifactBytes: 100, maxSessionBytes: 10, maxGlobalBytes: 100 })
    sessionStore.create({ id: "art_1", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 1, bytes: 10 })
    expect(() =>
      sessionStore.create({ id: "art_2", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 1, bytes: 1 }),
    ).toThrow("session quota")

    const globalStore = createArtifactStore({ maxArtifactBytes: 100, maxSessionBytes: 100, maxGlobalBytes: 10 })
    globalStore.create({ id: "art_1", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 1, bytes: 10 })
    expect(() =>
      globalStore.create({ id: "art_2", sessionId: "ses_2", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 1, bytes: 1 }),
    ).toThrow("global quota")
  })

  test("enforces per-artifact screenshot size quota", () => {
    const store = createArtifactStore({ maxArtifactBytes: 10, maxSessionBytes: 100, maxGlobalBytes: 100 })
    expect(() =>
      store.create({ id: "oversized", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 1, bytes: 11 }),
    ).toThrow("size quota")
  })

  test("updates active artifact quotas from host configuration", () => {
    const store = createArtifactStore(quota)
    store.configure({ maxArtifactBytes: 2 })
    expect(() =>
      store.create({ id: "oversized", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 1, bytes: 3 }),
    ).toThrow("size quota")
    store.configure({ maxArtifactBytes: 3 })
    expect(store.create({ id: "allowed", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 1, bytes: 3 })).toMatchObject({ id: "allowed" })
  })

  test("cleans up expired artifacts", () => {
    const store = createArtifactStore(quota)
    store.create({ id: "old", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 10, bytes: 1 })
    store.create({ id: "new", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 20, ttlMs: 10, bytes: 1 })
    expect(store.cleanupExpired(10)).toEqual(["old"])
    expect(store.cleanupExpired(10)).toEqual([])
    expect(store.listActive().map((item) => item.id)).toEqual(["new"])
  })

  test("revokes all artifacts for one session", () => {
    const store = createArtifactStore(quota)
    store.create({ id: "a", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 10, bytes: 1 })
    store.create({ id: "b", sessionId: "ses_2", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 10, bytes: 1 })
    expect(store.revokeSession("ses_1", 1)).toEqual(["a"])
    expect(store.revokeSession("ses_1", 2)).toEqual([])
    expect(store.listActive().map((item) => item.id)).toEqual(["b"])
  })

  test("reads artifact bytes without exposing raw storage paths", () => {
    const store = createArtifactStore(quota)
    const data = new Uint8Array([1, 2, 3])
    store.create({ id: "bytes", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 10, bytes: 3, data })
    data[0] = 9

    const first = store.read("bytes", { sessionId: "ses_1", nowMs: 9 })
    expect(first).toMatchObject({ ok: true, id: "bytes", kind: "screenshot", mimeType: "image/png", expiresAt: "1970-01-01T00:00:00.010Z" })
    if (first.ok) {
      expect([...first.data]).toEqual([1, 2, 3])
      first.data[0] = 8
    }
    const second = store.read("bytes", { sessionId: "ses_1", nowMs: 9 })
    expect(second.ok ? [...second.data] : []).toEqual([1, 2, 3])
  })

  test("denies artifact reads when ownership, lifecycle, or bytes are invalid", () => {
    const store = createArtifactStore(quota)
    store.create({ id: "empty", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 10, bytes: 0 })
    store.create({ id: "deleted", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 10, bytes: 1, data: new Uint8Array([1]) })
    expect(store.delete("deleted", "test", 1)).toBe(true)

    expect(store.read("missing", { sessionId: "ses_1", nowMs: 1 })).toEqual({ ok: false, reason: "not_found" })
    expect(store.read("deleted", { sessionId: "ses_1", nowMs: 1 })).toEqual({ ok: false, reason: "deleted" })
    expect(store.read("empty", { sessionId: "ses_2", nowMs: 1 })).toEqual({ ok: false, reason: "session_mismatch" })
    expect(store.read("empty", { sessionId: "ses_1", nowMs: 10 })).toEqual({ ok: false, reason: "expired" })
    expect(store.read("empty", { sessionId: "ses_1", nowMs: 1 })).toEqual({ ok: false, reason: "bytes_unavailable" })
  })

  test("rejects inconsistent byte metadata", () => {
    const store = createArtifactStore(quota)
    expect(() => store.create({ id: "bad", sessionId: "ses_1", kind: "screenshot", mimeType: "image/png", createdAtMs: 0, ttlMs: 10, bytes: 2, data: new Uint8Array([1]) })).toThrow(
      "byte length mismatch",
    )
  })

  test("converts artifact reads into no-store responses", async () => {
    const ok = artifactReadResponse({ ok: true, id: "art", kind: "screenshot", mimeType: "image/png", data: new Uint8Array([1, 2]), expiresAt: "1970-01-01T00:00:01.000Z" })
    expect(ok.status).toBe(200)
    expect(ok.headers.get("content-type")).toBe("image/png")
    expect(ok.headers.get("cache-control")).toBe("private, no-store")
    expect(ok.headers.get("x-interbase-artifact-id")).toBe("art")
    expect(ok.headers.get("x-interbase-artifact-kind")).toBe("screenshot")
    expect(ok.headers.get("x-interbase-artifact-expires-at")).toBe("1970-01-01T00:00:01.000Z")
    expect([...new Uint8Array(await ok.arrayBuffer())]).toEqual([1, 2])

    const denied = [
      ["not_found", 404],
      ["session_mismatch", 403],
      ["expired", 410],
      ["deleted", 410],
      ["bytes_unavailable", 404],
    ] as const
    for (const [reason, status] of denied) {
      const response = artifactReadResponse({ ok: false, reason })
      expect(response.status).toBe(status)
      expect(response.headers.get("cache-control")).toBe("no-store")
      expect(await response.json()).toEqual({ error: reason })
    }
  })
})
