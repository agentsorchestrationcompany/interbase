import { describe, expect, test } from "bun:test"
import { createApprovalStore } from "@/computer-use/approval-store"

describe("computer-use approval store", () => {
  test("adds pending actions and reports revocation", () => {
    const store = createApprovalStore()
    expect(store.add({ id: "a", sessionId: "ses_1", scope: "observe", appKey: "app", createdAtMs: 0 })).toBe("a")
    expect(store.isRevoked("a")).toBe(false)
    expect(store.isRevoked("missing")).toBe(false)
    expect(store.pending()).toEqual([{ id: "a", sessionId: "ses_1", scope: "observe", appKey: "app", createdAtMs: 0 }])
  })

  test("revokes by session, scope, and app key without double-counting", () => {
    const store = createApprovalStore()
    store.add({ id: "a", sessionId: "ses_1", scope: "observe", appKey: "app_1", createdAtMs: 0 })
    store.add({ id: "b", sessionId: "ses_1", scope: "click", appKey: "app_1", createdAtMs: 0 })
    store.add({ id: "c", sessionId: "ses_2", scope: "observe", appKey: "app_2", createdAtMs: 0 })
    expect(store.revoke({ sessionId: "ses_1", scope: "observe", appKey: "app_1", reason: "user", atMs: 1 })).toEqual(["a"])
    expect(store.isRevoked("a")).toBe(true)
    expect(store.revoke({ sessionId: "ses_1", scope: "observe", appKey: "app_1", reason: "user", atMs: 2 })).toEqual([])
    expect(store.pending().map((action) => action.id)).toEqual(["b", "c"])
  })

  test("revokes globally when filters are omitted", () => {
    const store = createApprovalStore()
    store.add({ id: "a", sessionId: "ses_1", scope: "observe", appKey: "app_1", createdAtMs: 0 })
    store.add({ id: "b", sessionId: "ses_2", scope: "click", appKey: "app_2", createdAtMs: 0 })
    expect(store.revoke({ reason: "kill-switch", atMs: 1 })).toEqual(["a", "b"])
    expect(store.pending()).toEqual([])
  })
})
