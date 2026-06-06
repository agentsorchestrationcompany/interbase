import type { AppRef } from "@interbase/computer-use-protocol"
import { normalizeObserveTarget, normalizeObserveWindowId, type ObserveTarget } from "@interbase/computer-use-policy"

export type ComputerUsePermissionKind = "observe" | "click" | "type" | "key" | "scroll" | "app" | "action" | "fileDialog" | "model_attachment"

export function computerUsePermission(kind: ComputerUsePermissionKind) {
  return `computer.${kind}`
}

export function appPermissionPattern(app: AppRef) {
  return app.bundleId ?? app.path ?? app.name
}

export function actionPermissionPattern(input: { app: AppRef; action: string; windowId?: string }) {
  return [appPermissionPattern(input.app), normalizeObserveWindowId(input.windowId) ?? "window", input.action].join(":")
}

export function observePermissionPattern(input: { target?: ObserveTarget }) {
  const target = normalizeObserveTarget(input.target)
  return [target?.app?.bundleId ?? target?.app?.path ?? target?.app?.name ?? "frontmost", target?.windowId ?? "window"].join(":")
}
