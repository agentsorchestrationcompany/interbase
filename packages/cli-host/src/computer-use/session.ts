import type { ActionResult, Observation } from "@interbase/computer-use-protocol"
import { createApprovalStore, type ApprovalScope } from "@/computer-use/approval-store"
import { createArtifactStore, type ArtifactReadResult } from "@/computer-use/artifact"
import { InstanceState } from "@/effect/instance-state"
import { Context, Effect, Layer } from "effect"

export type ComputerUseSessionState = {
  sessionId: string
  cancelled?: { reason: string; atMs: number }
  revokedApps: Set<string>
}

export type QueuedAction = {
  id: string
  sessionId: string
  appKey: string
  scope: ApprovalScope
  run: () => ActionResult | Promise<ActionResult>
}

export function createComputerUseSessionCoordinator() {
  const sessions = new Map<string, ComputerUseSessionState>()
  const approvals = createApprovalStore()
  const artifacts = createArtifactStore({ maxArtifactBytes: 5 * 1024 * 1024, maxSessionBytes: 5 * 1024 * 1024, maxGlobalBytes: 25 * 1024 * 1024 })
  let actionQueue = Promise.resolve()
  let screenshotObservationQueue = Promise.resolve()

  function ensureSession(sessionId: string) {
    let state = sessions.get(sessionId)
    if (!state) {
      state = { sessionId, revokedApps: new Set() }
      sessions.set(sessionId, state)
    }
    return state
  }

  function assertActive(action: Pick<QueuedAction, "sessionId" | "appKey">) {
    const state = ensureSession(action.sessionId)
    if (state.cancelled) throw new Error(`computer-use session cancelled: ${state.cancelled.reason}`)
    if (state.revokedApps.has(action.appKey)) throw new Error("computer-use app approval revoked")
  }

  return {
    ensureSession,
    approvals,
    artifacts,
    configureArtifactLimits(input: { maxArtifactBytes?: number; maxSessionBytes?: number; maxGlobalBytes?: number }) {
      artifacts.configure(input)
    },
    cancelSession(sessionId: string, reason: string, atMs: number) {
      const state = ensureSession(sessionId)
      state.cancelled = { reason, atMs }
      const revokedActions = approvals.revoke({ sessionId, reason, atMs })
      const deletedArtifacts = artifacts.revokeSession(sessionId, atMs)
      return { revokedActions, deletedArtifacts }
    },
    revokeApp(sessionId: string, appKey: string, reason: string, atMs: number) {
      const state = ensureSession(sessionId)
      state.revokedApps.add(appKey)
      const revokedActions = approvals.revoke({ sessionId, appKey, reason, atMs })
      const deletedArtifacts = artifacts.revokeSession(sessionId, atMs)
      return { revokedActions, deletedArtifacts }
    },
    cleanupAfterHelperCrash(reason: string, atMs: number) {
      const revokedActions = approvals.revoke({ reason, atMs })
      const deletedArtifacts = artifacts.listActive().map((artifact) => artifact.id)
      for (const artifactId of deletedArtifacts) artifacts.delete(artifactId, reason, atMs)
      for (const sessionId of sessions.keys()) {
        const state = ensureSession(sessionId)
        state.cancelled = { reason, atMs }
      }
      return { revokedActions, deletedArtifacts }
    },
    enqueueAction(action: QueuedAction) {
      approvals.add({ id: action.id, sessionId: action.sessionId, scope: action.scope, appKey: action.appKey, createdAtMs: Date.now() })
      const task = actionQueue.then(async () => {
        assertActive(action)
        const result = await action.run()
        assertActive(action)
        return result
      })
      actionQueue = task.then(
        () => undefined,
        () => undefined,
      )
      return task
    },
    enqueueObservation(input: { includeScreenshot: boolean; run: () => Observation | Promise<Observation> }) {
      if (!input.includeScreenshot) return Promise.resolve().then(input.run)
      const task = screenshotObservationQueue.then(input.run)
      screenshotObservationQueue = task.then(
        () => undefined,
        () => undefined,
      )
      return task
    },
    status(sessionId: string) {
      const state = ensureSession(sessionId)
      return {
        sessionId: state.sessionId,
        cancelled: state.cancelled,
        revokedApps: [...state.revokedApps],
        pendingActions: approvals.pending().filter((action) => action.sessionId === sessionId),
        activeArtifacts: artifacts.listActive(),
      }
    },
    readArtifact(id: string, input: { sessionId: string; nowMs: number }): ArtifactReadResult {
      return artifacts.read(id, input)
    },
  }
}

export interface Interface {
  readonly ensureSession: (sessionId: string) => Effect.Effect<ComputerUseSessionState>
  readonly cancelSession: (sessionId: string, reason: string, atMs: number) => Effect.Effect<{ revokedActions: string[]; deletedArtifacts: string[] }>
  readonly revokeApp: (sessionId: string, appKey: string, reason: string, atMs: number) => Effect.Effect<{ revokedActions: string[]; deletedArtifacts: string[] }>
  readonly cleanupAfterHelperCrash: (reason: string, atMs: number) => Effect.Effect<{ revokedActions: string[]; deletedArtifacts: string[] }>
  readonly enqueueAction: (action: QueuedAction) => Effect.Effect<ActionResult>
  readonly enqueueObservation: (input: { includeScreenshot: boolean; run: () => Observation | Promise<Observation> }) => Effect.Effect<Observation>
  readonly status: (sessionId: string) => Effect.Effect<ReturnType<ReturnType<typeof createComputerUseSessionCoordinator>["status"]>>
  readonly readArtifact: (id: string, input: { sessionId: string; nowMs: number }) => Effect.Effect<ArtifactReadResult>
  readonly configureArtifactLimits: (input: { maxArtifactBytes?: number; maxSessionBytes?: number; maxGlobalBytes?: number }) => Effect.Effect<void>
}

export class Service extends Context.Service<Service, Interface>()("@interbase/ComputerUse") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const state = yield* InstanceState.make(Effect.fn("ComputerUse.state")(function* () {
      return createComputerUseSessionCoordinator()
    }))

    const coordinator = Effect.fn("ComputerUse.coordinator")(function* () {
      return yield* InstanceState.get(state)
    })

    return {
      ensureSession: Effect.fn("ComputerUse.ensureSession")(function* (sessionId) {
        return (yield* coordinator()).ensureSession(sessionId)
      }),
      cancelSession: Effect.fn("ComputerUse.cancelSession")(function* (sessionId, reason, atMs) {
        return (yield* coordinator()).cancelSession(sessionId, reason, atMs)
      }),
      revokeApp: Effect.fn("ComputerUse.revokeApp")(function* (sessionId, appKey, reason, atMs) {
        return (yield* coordinator()).revokeApp(sessionId, appKey, reason, atMs)
      }),
      cleanupAfterHelperCrash: Effect.fn("ComputerUse.cleanupAfterHelperCrash")(function* (reason, atMs) {
        return (yield* coordinator()).cleanupAfterHelperCrash(reason, atMs)
      }),
      enqueueAction: Effect.fn("ComputerUse.enqueueAction")(function* (action) {
        const computerUse = yield* coordinator()
        return yield* Effect.promise(() => computerUse.enqueueAction(action))
      }),
      enqueueObservation: Effect.fn("ComputerUse.enqueueObservation")(function* (input) {
        const computerUse = yield* coordinator()
        return yield* Effect.promise(() => computerUse.enqueueObservation(input))
      }),
      status: Effect.fn("ComputerUse.status")(function* (sessionId) {
        return (yield* coordinator()).status(sessionId)
      }),
      readArtifact: Effect.fn("ComputerUse.readArtifact")(function* (id, input) {
        return (yield* coordinator()).readArtifact(id, input)
      }),
      configureArtifactLimits: Effect.fn("ComputerUse.configureArtifactLimits")(function* (input) {
        return (yield* coordinator()).configureArtifactLimits(input)
      }),
    }
  }),
)

export const defaultLayer = layer

export * as ComputerUse from "./session"
