import type { AppRef } from "@interbase/computer-use-protocol"
import type { ActionRisk, ModelAttachmentDecision } from "@interbase/computer-use-policy"

export type ComputerUsePermissionDuration = "once" | "session" | "project" | "always"

export type ComputerUsePermissionPrompt = {
  app: {
    name: string
    bundleId?: string
    signingIdentity?: string
  }
  windowTitle?: string
  requestedAction: string
  requestedScopes: string[]
  riskReasons: string[]
  duration: ComputerUsePermissionDuration
  modelAttachment: {
    screenshot: ModelAttachmentDecision["screenshot"]
    axText: ModelAttachmentDecision["axText"]
    screenshotPreviewAllowed: boolean
    reasons: string[]
  }
  options: Array<"allow_once" | "allow_session" | "always_allow" | "deny">
  block?: {
    overridable: false
    reason: string
  }
}

export function formatComputerUsePermissionPrompt(input: {
  app: AppRef
  signingIdentity?: string
  windowTitle?: string
  requestedAction: string
  requestedScopes: string[]
  risk?: ActionRisk
  duration?: ComputerUsePermissionDuration
  attachment: ModelAttachmentDecision
  blockReason?: string
}): ComputerUsePermissionPrompt {
  return {
    app: {
      name: input.app.name,
      bundleId: input.app.bundleId,
      signingIdentity: input.signingIdentity ?? formatAppSigningIdentity(input.app),
    },
    windowTitle: input.windowTitle,
    requestedAction: input.requestedAction,
    requestedScopes: [...input.requestedScopes],
    riskReasons: input.risk?.reasons ?? [],
    duration: input.duration ?? "once",
    modelAttachment: {
      screenshot: input.attachment.screenshot,
      axText: input.attachment.axText,
      screenshotPreviewAllowed: input.attachment.screenshot === "allow" || input.attachment.screenshot === "confirm",
      reasons: [...input.attachment.reasons],
    },
    options: input.blockReason === undefined ? ["allow_once", "allow_session", "always_allow", "deny"] : ["deny"],
    block:
      input.blockReason === undefined
        ? undefined
        : {
            overridable: false,
            reason: input.blockReason,
          },
  }
}

function formatAppSigningIdentity(app: AppRef) {
  if (!app.signing) return undefined
  const parts = [app.signing.signingIdentifier, app.signing.teamId].filter((part): part is string => typeof part === "string" && part.length > 0)
  if (parts.length === 0 && app.signing.codeSignatureValid !== undefined) return app.signing.codeSignatureValid ? "valid signature" : "invalid signature"
  return parts.length > 0 ? parts.join(" / ") : undefined
}
