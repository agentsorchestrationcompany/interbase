import type { LocalBackendId } from "./types.js"

export class LocalBackendError extends Error {
  constructor(
    message: string,
    readonly code:
      | "BACKEND_UNAVAILABLE"
      | "CAPABILITY_UNAVAILABLE"
      | "CONVERSATION_NOT_FOUND"
      | "ROUTING_METADATA_INVALID",
    readonly backendId?: LocalBackendId,
  ) {
    super(message)
    this.name = "LocalBackendError"
  }
}

export function unsupportedBackendOperation(backendId: LocalBackendId, operation: string) {
  return new LocalBackendError(
    `${backendId} does not support ${operation} under the current local authority rules.`,
    "CAPABILITY_UNAVAILABLE",
    backendId,
  )
}
