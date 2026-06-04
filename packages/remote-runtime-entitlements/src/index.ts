import type { RemoteRuntimeMode } from "@interbase/remote-runtime-contracts"

export type RuntimeAccessScope = {
  readonly environment: "oss" | "interbase" | "dev" | "test"
  readonly mode: RemoteRuntimeMode
  readonly accountId?: string
  readonly organizationId?: string
  readonly runtimeInstallationId?: string
  readonly trustedRuntimeClientId?: string
}

export type RemoteRuntimeEntitlementCheckpoint = "command" | "pairing" | "attachment" | "runtimeUse"

export type RemoteRuntimeEntitlementDenialCode =
  | "REMOTE_RUNTIME_DISABLED"
  | "REMOTE_RUNTIME_NOT_INCLUDED"
  | "PAIRING_NOT_ALLOWED"
  | "ATTACHMENT_NOT_ALLOWED"
  | "RUNTIME_USE_NOT_ALLOWED"

export type RemoteRuntimeEntitlementDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false
      readonly code: RemoteRuntimeEntitlementDenialCode
      readonly message: string
      readonly remediation?: string
    }

export interface RemoteRuntimeEntitlementProvider {
  isAllowed(
    checkpoint: RemoteRuntimeEntitlementCheckpoint,
    scope: RuntimeAccessScope,
  ): Promise<RemoteRuntimeEntitlementDecision>
}

export const allowAllRemoteRuntimeEntitlementProvider: RemoteRuntimeEntitlementProvider = {
  async isAllowed() {
    return { allowed: true }
  },
}

export function disabledRemoteRuntimeEntitlementProvider(
  message = "Remote runtime is disabled for this installation.",
): RemoteRuntimeEntitlementProvider {
  return {
    async isAllowed(checkpoint: RemoteRuntimeEntitlementCheckpoint): Promise<RemoteRuntimeEntitlementDecision> {
      return { allowed: false, code: denialCodeForCheckpoint(checkpoint), message }
    },
  } satisfies RemoteRuntimeEntitlementProvider
}

export function denialCodeForCheckpoint(
  checkpoint: RemoteRuntimeEntitlementCheckpoint,
): RemoteRuntimeEntitlementDenialCode {
  if (checkpoint === "command") return "REMOTE_RUNTIME_DISABLED"
  if (checkpoint === "pairing") return "PAIRING_NOT_ALLOWED"
  if (checkpoint === "attachment") return "ATTACHMENT_NOT_ALLOWED"
  return "RUNTIME_USE_NOT_ALLOWED"
}
