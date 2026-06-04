export const runtimeErrorCodeValues = [
  "RUNTIME_UNAVAILABLE",
  "SESSION_NOT_FOUND",
  "SESSION_BUSY",
  "INVALID_REQUEST",
  "CAPABILITY_UNAVAILABLE",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_FAILED",
  "MCP_UNAVAILABLE",
  "MCP_TOOL_FAILED",
  "SHELL_SPAWN_FAILED",
  "SHELL_EXECUTION_FAILED",
  "APPROVAL_DENIED",
  "POLICY_UNAVAILABLE",
  "DAEMON_INTERNAL",
  "PROTOCOL_ERROR",
] as const

export type RuntimeErrorCode = (typeof runtimeErrorCodeValues)[number]

export const runtimeErrorCategoryValues = [
  "session",
  "provider",
  "mcp",
  "shell",
  "approval",
  "policy",
  "capability",
  "daemon",
  "protocol",
] as const

export type RuntimeErrorCategory = (typeof runtimeErrorCategoryValues)[number]

export interface RuntimeErrorPayload {
  code: RuntimeErrorCode
  category?: RuntimeErrorCategory
  message: string
  details?: Record<string, unknown> | null
  recoverable?: boolean
}

export interface CreateRuntimeErrorPayloadInput {
  category: RuntimeErrorCategory
  code: RuntimeErrorCode
  details?: Record<string, unknown> | null
  message: string
  recoverable?: boolean
}

export function createRuntimeErrorPayload(input: CreateRuntimeErrorPayloadInput): RuntimeErrorPayload {
  return {
    category: input.category,
    code: input.code,
    details: input.details ?? null,
    message: input.message,
    recoverable: input.recoverable ?? false,
  }
}

export class RuntimeProtocolError extends Error {
  constructor(
    public readonly code: RuntimeErrorCode,
    message: string,
    public readonly details: Record<string, unknown> | null = null,
  ) {
    super(message)
    this.name = "RuntimeProtocolError"
  }
}
