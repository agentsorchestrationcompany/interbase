import type { LocalBackendCapabilities, LocalBackendId } from "./types.js"

export const interbaseRuntimeCapabilities: LocalBackendCapabilities = {
  approvals: true,
  attachments: true,
  conversationHistoryReadable: true,
  images: true,
  modelSelection: true,
  nativeExecution: true,
  resume: true,
  sessionContinuation: true,
  streaming: true,
  toolUse: true,
}

export const codexCapabilities: LocalBackendCapabilities = {
  approvals: true,
  attachments: true,
  conversationHistoryReadable: true,
  images: true,
  modelSelection: true,
  nativeExecution: true,
  resume: true,
  sessionContinuation: true,
  streaming: true,
  toolUse: true,
}

export const claudeCapabilities: LocalBackendCapabilities = {
  approvals: false,
  attachments: false,
  conversationHistoryReadable: true,
  images: false,
  modelSelection: true,
  nativeExecution: false,
  resume: true,
  sessionContinuation: true,
  streaming: true,
  toolUse: false,
}

export function isLocalBackendId(value: unknown): value is LocalBackendId {
  return value === "interbaseRuntime" || value === "codex" || value === "claude"
}
