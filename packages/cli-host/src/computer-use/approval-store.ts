export type ApprovalScope = "observe" | "click" | "type" | "clipboard" | "menu" | "fileDialog" | "semanticAction" | "modelAttachment"

export type PendingAction = {
  id: string
  sessionId: string
  scope: ApprovalScope
  appKey: string
  createdAtMs: number
  revoked?: { reason: string; atMs: number }
}

export function createApprovalStore() {
  const pending = new Map<string, PendingAction>()

  return {
    add(action: Omit<PendingAction, "revoked">) {
      pending.set(action.id, { ...action })
      return action.id
    },
    revoke(input: { sessionId?: string; scope?: ApprovalScope; appKey?: string; reason: string; atMs: number }) {
      const revoked: string[] = []
      for (const action of pending.values()) {
        if (action.revoked) continue
        if (input.sessionId !== undefined && action.sessionId !== input.sessionId) continue
        if (input.scope !== undefined && action.scope !== input.scope) continue
        if (input.appKey !== undefined && action.appKey !== input.appKey) continue
        action.revoked = { reason: input.reason, atMs: input.atMs }
        revoked.push(action.id)
      }
      return revoked
    },
    isRevoked(id: string) {
      return pending.get(id)?.revoked !== undefined
    },
    pending() {
      return [...pending.values()].filter((action) => !action.revoked).map((action) => ({ ...action }))
    },
  }
}
