import { Cause, Effect, Exit, Schema } from "effect"
import { Config } from "@/config/config"
import { ConfigComputerUse } from "@/config/computer-use"
import * as Tool from "@/tool/tool"
import { classifyActionRisk, decideForegroundInvariant, decideModelAttachment, decideObserve, decideRateLimit, normalizeObserveWindowId, type ComputerUseAction } from "@interbase/computer-use-policy"
import { createAuditBuffer } from "@/computer-use/audit"
import { desktopAvailabilityMessage, detectHostDesktopAvailability } from "@/computer-use/desktop-availability"
import type { ComputerUseDriver } from "@/computer-use/driver"
import { createDefaultNativeHelperDriver, type NativeHelperDriverFactoryResult } from "@/computer-use/native-helper-driver"
import { detectModalState } from "@/computer-use/modal"
import { actionPermissionPattern, appPermissionPattern, computerUsePermission } from "@/computer-use/permission"
import { createComputerUseSessionCoordinator } from "@/computer-use/session"
import { classifyComputerUseModel } from "@/computer-use/model-locality"
import { formatComputerUsePermissionPrompt } from "@/computer-use/permission-prompt"
import { ComputerUseProtocolError, assertTrustedDriver, resolveSemanticActionTarget, type ActionRequest } from "@interbase/computer-use-protocol"

const DESCRIPTION = [
  "Perform one guarded computer action through Interbase's computer-use boundary.",
  "Mock mode is portable and CI-safe; native mode launches the verified macOS helper when available.",
  "Each call performs at most one action, revalidates driver status and app policy, blocks sensitive actions, and records metadata-only audit events.",
].join("\n")

const App = Schema.Struct({
  name: Schema.String,
  bundleId: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
})

const ElementSelector = Schema.Struct({
  elementId: Schema.optional(Schema.String),
  role: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
  text: Schema.optional(Schema.String),
})

export const Parameters = Schema.Struct({
  actionId: Schema.String,
  observationId: Schema.String,
  app: App,
  windowId: Schema.optional(Schema.String),
  action: Schema.Union([
    Schema.Struct({
      type: Schema.Literal("click"),
      elementId: Schema.optional(Schema.String),
      point: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number, space: Schema.Literals(["desktopLogical", "windowLogical", "screenshotPixel"]) })),
    }),
    Schema.Struct({
      type: Schema.Literal("doubleClick"),
      elementId: Schema.optional(Schema.String),
      point: Schema.optional(Schema.Struct({ x: Schema.Number, y: Schema.Number, space: Schema.Literals(["desktopLogical", "windowLogical", "screenshotPixel"]) })),
    }),
    Schema.Struct({ type: Schema.Literal("movePointer"), point: Schema.Struct({ x: Schema.Number, y: Schema.Number, space: Schema.Literals(["desktopLogical", "windowLogical", "screenshotPixel"]) }) }),
    Schema.Struct({
      type: Schema.Literal("drag"),
      from: Schema.Struct({ x: Schema.Number, y: Schema.Number, space: Schema.Literals(["desktopLogical", "windowLogical", "screenshotPixel"]) }),
      to: Schema.Struct({ x: Schema.Number, y: Schema.Number, space: Schema.Literals(["desktopLogical", "windowLogical", "screenshotPixel"]) }),
    }),
    Schema.Struct({ type: Schema.Literal("scroll"), deltaX: Schema.optional(Schema.Number), deltaY: Schema.Number }),
    Schema.Struct({ type: Schema.Literal("typeText"), text: Schema.String, secureField: Schema.optional(Schema.Boolean) }),
    Schema.Struct({ type: Schema.Literal("keyChord"), keys: Schema.mutable(Schema.Array(Schema.String)) }),
    Schema.Struct({ type: Schema.Literal("clickElement"), selector: ElementSelector }),
    Schema.Struct({ type: Schema.Literal("focusElement"), selector: ElementSelector }),
    Schema.Struct({ type: Schema.Literal("setElementValue"), selector: ElementSelector, value: Schema.String, secureField: Schema.optional(Schema.Boolean) }),
    Schema.Struct({ type: Schema.Literal("focusWindow"), windowId: Schema.String }),
    Schema.Struct({ type: Schema.Literal("focusApp") }),
    Schema.Struct({ type: Schema.Literal("launchApp") }),
    Schema.Struct({ type: Schema.Literal("selectMenuItem"), selector: ElementSelector }),
    Schema.Struct({ type: Schema.Literal("openContextMenu"), selector: ElementSelector }),
    Schema.Struct({ type: Schema.Literal("fileDialog"), operation: Schema.Literals(["selectFile", "saveFile"]), artifactId: Schema.optional(Schema.String) }),
  ]),
})

type Metadata = {
  decision: "allowed" | "denied"
  reason: string
  risk?: ReturnType<typeof classifyActionRisk>
  permissionPrompt?: ReturnType<typeof formatComputerUsePermissionPrompt>
  auditEvents: ReturnType<ReturnType<typeof createAuditBuffer>["list"]>
  truncated?: boolean
}

export const Testing = {
  driver: undefined as ComputerUseDriver | undefined,
  coordinator: undefined as ReturnType<typeof createComputerUseSessionCoordinator> | undefined,
  nowMs: undefined as number | undefined,
  desktopAvailability: undefined as ReturnType<typeof detectHostDesktopAvailability> | undefined,
  nativeDriver: undefined as NativeHelperDriverFactoryResult | undefined,
}

function denied(
  reason: string,
  risk: Metadata["risk"],
  auditEvents: Metadata["auditEvents"],
  output: string,
  permissionPrompt?: Metadata["permissionPrompt"],
): Tool.ExecuteResult<Metadata> {
  return {
    title: "Computer action denied",
    output,
    metadata: { decision: "denied", reason, risk, permissionPrompt, auditEvents, truncated: false },
  }
}

function nativeDriver(input: { availability?: ReturnType<typeof detectHostDesktopAvailability> }): NativeHelperDriverFactoryResult {
  return Testing.nativeDriver ?? createDefaultNativeHelperDriver(input.availability ? { availability: input.availability } : {})
}

type DriverResolution = { available: true; driver: ComputerUseDriver } | Extract<NativeHelperDriverFactoryResult, { available: false }>

function nativeUnavailableMessage(reason: string, availability: ReturnType<typeof detectHostDesktopAvailability> | undefined) {
  if (availability && !availability.available && availability.reason === reason) return desktopAvailabilityMessage(availability)
  return `Native computer.act helper unavailable: ${reason}.`
}

function resolveDriver(input: { availability?: ReturnType<typeof detectHostDesktopAvailability> }): DriverResolution {
  if (Testing.driver) return { available: true, driver: Testing.driver }
  return nativeDriver(input)
}

export const ComputerActTool = Tool.define(
  "computer_act",
  Effect.gen(function* () {
    const config = yield* Config.Service
    const coordinator = Testing.coordinator ?? createComputerUseSessionCoordinator()
    let rate = { windowStartedAtMs: Testing.nowMs ?? 0, count: 0 }

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context<Metadata>) =>
        Effect.gen(function* () {
          const audit = createAuditBuffer()
          const windowId = normalizeObserveWindowId(params.windowId)
          const traceId = ctx.callID || `${ctx.sessionID}:${ctx.messageID}`
          audit.record({ type: "computer.action.requested", traceId, actionId: params.actionId, actionType: params.action.type, target: params })
          if (ctx.abort.aborted) {
            recordSessionCancellation(coordinator, ctx.sessionID, traceId, audit, "aborted")
            audit.record({ type: "computer.action.denied", traceId, actionId: params.actionId, reason: "aborted" })
            return denied("aborted", undefined, audit.list(), "computer.act was cancelled before execution.")
          }
          const info = yield* config.get()
          const effectiveConfig = ConfigComputerUse.effectiveConfig(info.computer_use)
          const risk = classifyActionRisk(toPolicyAction(params.action))
          const attachment = decideModelAttachment({
            config: effectiveConfig,
            app: params.app,
            model: classifyComputerUseModel({ providerID: ctx.providerID, modelID: ctx.modelID }),
            hasScreenshot: false,
            hasAxText: false,
          })
          const permissionPrompt = formatComputerUsePermissionPrompt({
            app: params.app,
            requestedAction: params.action.type,
            requestedScopes: risk.requiredScopes,
            risk,
            duration: "once",
            attachment,
          })

          const driver = resolveDriver({ availability: Testing.desktopAvailability })
          if (!driver.available) {
            audit.record({ type: "computer.action.denied", traceId, actionId: params.actionId, reason: driver.reason })
            return denied(driver.reason, risk, audit.list(), nativeUnavailableMessage(driver.reason, Testing.desktopAvailability))
          }
          const status = yield* Effect.promise(() => Promise.resolve(driver.driver.status()))
          audit.record({ type: "computer.driver.status", traceId, status })
          if (status.crashed) audit.record({ type: "computer.driver.crashed", traceId })
          const appDecision = decideObserve(effectiveConfig, params.app)
          audit.record({ type: "computer.policy.decision", traceId, decision: { allowed: appDecision.allowed, reason: appDecision.allowed ? undefined : appDecision.reason, app: params.app, actionType: params.action.type } })
          if (!appDecision.allowed) {
            audit.record({ type: "computer.action.denied", traceId, actionId: params.actionId, reason: appDecision.reason })
            return denied(
              appDecision.reason,
              risk,
              audit.list(),
              `computer.act denied by app policy for ${params.app.name}.`,
              formatComputerUsePermissionPrompt({
                app: params.app,
                requestedAction: params.action.type,
                requestedScopes: risk.requiredScopes,
                risk,
                attachment,
                blockReason: "app denied by computer-use policy",
              }),
            )
          }
          if (risk.level === "blocked") {
            audit.record({ type: "computer.policy.decision", traceId, decision: { allowed: false, reason: "blocked_risk", app: params.app, actionType: params.action.type } })
            audit.record({ type: "computer.action.denied", traceId, actionId: params.actionId, reason: "blocked_risk" })
            return denied("blocked_risk", risk, audit.list(), risk.reasons.join("; "))
          }
          const nowMs = Testing.nowMs ?? Date.now()
          const rateDecision = decideRateLimit({ nowMs, windowStartedAtMs: rate.windowStartedAtMs, count: rate.count }, { maxActions: 1, windowMs: 250 })
          if (!rateDecision.allowed) {
            audit.record({ type: "computer.policy.decision", traceId, decision: { allowed: false, reason: rateDecision.reason, app: params.app, actionType: params.action.type } })
            audit.record({ type: "computer.action.denied", traceId, actionId: params.actionId, reason: rateDecision.reason })
            return denied(rateDecision.reason, risk, audit.list(), "computer.act is rate limited.")
          }
          const actionPermission = computerUsePermission(actionPermissionKind(params.action))
          audit.record({ type: "computer.approval.prompted", traceId, permissionRequestId: `${traceId}:action`, permission: actionPermission, risk: risk.level })
          yield* ctx.ask({
            permission: actionPermission,
            patterns: [actionPermissionPattern({ app: params.app, windowId, action: params.action.type })],
            always: [appPermissionPattern(params.app)],
            metadata: { app: params.app, windowId, action: params.action.type, risk, permissionPrompt },
          })
          audit.record({ type: "computer.approval.responded", traceId, permissionRequestId: `${traceId}:action`, reply: "once" })
          rate = { windowStartedAtMs: rateDecision.resetAtMs - 250, count: rateDecision.count }

          const cancelOnAbort = () => {
            recordSessionCancellation(coordinator, ctx.sessionID, traceId, audit, "aborted")
          }
          ctx.abort.addEventListener("abort", cancelOnAbort, { once: true })
          const exit = yield* Effect.promise(() =>
              coordinator.enqueueAction({
                id: params.actionId,
                sessionId: ctx.sessionID,
                appKey: appKey(params.app),
                scope: actionScope(params.action),
                run: async () => {
                  const preActionStatus = await driver.driver.status()
                  if (preActionStatus.crashed) audit.record({ type: "computer.driver.crashed", traceId })
                  assertTrustedDriver(preActionStatus)
                  const preActionObservation = await driver.driver.observe({ target: { app: params.app, windowId }, includeScreenshot: false }, effectiveConfig)
                  const foreground = decideForegroundInvariant({
                    config: effectiveConfig,
                    expectedApp: params.app,
                    expectedWindowId: windowId,
                    observed: preActionObservation,
                  })
                  if (!foreground.allowed) throw new Error(`computer-use foreground invariant failed: ${foreground.reason}`)
                  const modal = detectModalState({ observation: preActionObservation, expectedWindowId: windowId })
                  if (modal.blocked) throw new Error(`computer-use modal guard failed: ${modal.reason}`)
                  return driver.driver.act(resolveSemanticActionTarget(toActionRequest(params, windowId, preActionObservation.window?.id), preActionObservation))
                },
              }),
            ).pipe(Effect.exit)
          ctx.abort.removeEventListener("abort", cancelOnAbort)
          if (Exit.isFailure(exit)) {
            const error = Cause.squash(exit.cause)
            const reason = actionErrorReason(error)
            audit.record({ type: "computer.action.denied", traceId, actionId: params.actionId, reason })
            return denied(reason, risk, audit.list(), error instanceof Error ? error.message : "computer.act failed")
          }
          const result = exit.value

          audit.record({ type: "computer.action.allowed", traceId, actionId: params.actionId })
          const metadata: Metadata = { decision: "allowed", reason: "allowed", risk, permissionPrompt, auditEvents: audit.list(), truncated: false }
          yield* ctx.metadata({ title: `Performed ${params.action.type}`, metadata })
          return {
            title: `Performed ${params.action.type}`,
            output: JSON.stringify(result, null, 2),
            metadata,
          }
        }),
    }
  }),
)

function toActionRequest(params: Schema.Schema.Type<typeof Parameters>, windowId?: string, observedWindowId?: string): ActionRequest {
  return {
    id: params.actionId,
    observationId: params.observationId,
    app: params.app,
    windowId,
    action: normalizeAction(params.action, observedWindowId),
  }
}

function normalizeAction(action: Schema.Schema.Type<typeof Parameters>["action"], observedWindowId?: string): Schema.Schema.Type<typeof Parameters>["action"] {
  if (action.type !== "focusWindow") return action
  return { ...action, windowId: normalizeObserveWindowId(action.windowId) ?? observedWindowId ?? action.windowId }
}

function toPolicyAction(action: Schema.Schema.Type<typeof Parameters>["action"]): ComputerUseAction {
  if (action.type === "typeText") return { type: "typeText", text: action.text, secureField: action.secureField }
  if (action.type === "setElementValue") return { type: "setElementValue", value: action.value, secureField: action.secureField }
  if (action.type === "fileDialog") return { type: "fileDialog", operation: action.operation }
  if (action.type === "keyChord") return { type: "keyChord", keys: action.keys }
  if (action.type === "scroll") return { type: "scroll" }
  if (action.type === "movePointer") return { type: "movePointer" }
  if (action.type === "drag") return { type: "drag" }
  return { type: action.type }
}

function actionScope(action: Schema.Schema.Type<typeof Parameters>["action"]) {
  if (action.type === "typeText") return "type" as const
  if (action.type === "fileDialog") return "fileDialog" as const
  if (action.type === "keyChord" || action.type === "clickElement" || action.type === "focusElement" || action.type === "setElementValue" || action.type === "focusWindow" || action.type === "focusApp" || action.type === "launchApp" || action.type === "selectMenuItem" || action.type === "openContextMenu") return "semanticAction" as const
  return "click" as const
}

function actionPermissionKind(action: Schema.Schema.Type<typeof Parameters>["action"]) {
  if (action.type === "typeText" || action.type === "setElementValue") return "type" as const
  if (action.type === "keyChord" || action.type === "focusWindow") return "key" as const
  if (action.type === "focusElement" || action.type === "focusApp" || action.type === "launchApp" || action.type === "selectMenuItem" || action.type === "openContextMenu") return "action" as const
  if (action.type === "scroll") return "scroll" as const
  if (action.type === "fileDialog") return "fileDialog" as const
  return "click" as const
}

function appKey(app: Schema.Schema.Type<typeof Parameters>["app"]) {
  return app.bundleId ?? app.path ?? app.name
}

function recordSessionCancellation(
  coordinator: ReturnType<typeof createComputerUseSessionCoordinator>,
  sessionId: string,
  traceId: string,
  audit: ReturnType<typeof createAuditBuffer>,
  reason: string,
) {
  const cancelled = coordinator.cancelSession(sessionId, reason, Date.now())
  if (cancelled.revokedActions.length > 0) {
    audit.record({ type: "computer.approval.revoked", traceId, scope: "session", revokedActions: cancelled.revokedActions.length })
  }
  for (const artifactId of cancelled.deletedArtifacts) {
    audit.record({ type: "computer.artifact.deleted", traceId, artifactId, reason })
  }
}

function actionErrorReason(error: unknown) {
  if (error instanceof ComputerUseProtocolError) return error.code
  if (error instanceof Error && error.message.includes("session cancelled")) return "session_cancelled"
  if (error instanceof Error && error.message.includes("approval revoked")) return "app_revoked"
  if (error instanceof Error && error.message.includes("frontmost_app_denied")) return "frontmost_app_denied"
  if (error instanceof Error && error.message.includes("target_app_changed")) return "target_app_changed"
  if (error instanceof Error && error.message.includes("target_window_changed")) return "target_window_changed"
  if (error instanceof Error && error.message.includes("target_window_hidden")) return "target_window_hidden"
  if (error instanceof Error && error.message.includes("modal_element_detected")) return "modal_element_detected"
  if (error instanceof Error && error.message.includes("modal_warning_detected")) return "modal_warning_detected"
  return "driver_error"
}
