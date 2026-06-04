import type { RuntimeErrorPayload } from "./errors.js"
import type { ProviderId } from "./provider.js"

export const sessionStatusValues = ["idle", "running", "error", "closed", "interrupted"] as const

export type SessionStatus = (typeof sessionStatusValues)[number]
export type RuntimeExecutionMode = "managed" | "native"
export type MessageRole = "assistant" | "system" | "user"
export const runtimeSandboxModeValues = ["read-only", "workspace-write", "danger-full-access"] as const
export const runtimeApprovalPolicyValues = ["untrusted", "on-request", "never"] as const

export type RuntimeSandboxMode = (typeof runtimeSandboxModeValues)[number]
export type RuntimeApprovalPolicy = (typeof runtimeApprovalPolicyValues)[number]
export const runtimeRequestKindValues = ["implementation", "plan", "question", "review", "unknown"] as const
export type RuntimeRequestKind = (typeof runtimeRequestKindValues)[number]

export interface RuntimeMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  runId: string | null
}

export interface RuntimeRunSummary {
  error?: RuntimeErrorPayload | null
  errorMessage?: string | null
  exitCode: number | null
  finishedAt: string | null
  id: string
  orchestrationId: string
  providerId: ProviderId
  prompt: string
  qualifying: boolean
  requestKind: RuntimeRequestKind
  settlementReason: string | null
  startedAt: string
  status: "cancelled" | "completed" | "failed" | "running"
}

export type RuntimeProviderSessionContinuationKind = "conversation" | "opaque" | "session"

export interface RuntimeProviderSessionState {
  continuationId: string
  continuationKind: RuntimeProviderSessionContinuationKind
  lastCompletedAt: string | null
  lastStartedAt: string | null
  metadata?: Record<string, boolean | number | string | null> | null
  model: string | null
  providerId: ProviderId
  reasoningEffort: string | null
}

export interface RuntimeSessionSummary {
  id: string
  title: string
  providerId: ProviderId
  executionMode: RuntimeExecutionMode
  model: string
  reasoningEffort: string | null
  fastMode: boolean
  sandboxMode: RuntimeSandboxMode | null
  approvalPolicy: RuntimeApprovalPolicy | null
  permissionPresetId?: string | null
  workspaceRoot: string
  createdAt: string
  updatedAt: string
  status: SessionStatus
  lastEventSequence: number
  lastRunId: string | null
  providerSession?: RuntimeProviderSessionState | null
}

export interface RuntimeSessionDetail extends RuntimeSessionSummary {
  messages: RuntimeMessage[]
  runs: RuntimeRunSummary[]
}

export interface CreateSessionInput {
  executionMode?: RuntimeExecutionMode | null
  model?: string
  trustModel?: boolean
  reasoningEffort?: string | null
  fastMode?: boolean | null
  sandboxMode?: RuntimeSandboxMode | null
  approvalPolicy?: RuntimeApprovalPolicy | null
  permissionPresetId?: string | null
  providerId: ProviderId
  title?: string
  workspaceRoot: string
}

export interface CreateSessionResponse {
  session: RuntimeSessionDetail
}

export interface UpdateSessionInput {
  title?: string | null
  providerId?: ProviderId
  model?: string | null
  reasoningEffort?: string | null
  fastMode?: boolean | null
  sandboxMode?: RuntimeSandboxMode | null
  approvalPolicy?: RuntimeApprovalPolicy | null
  permissionPresetId?: string | null
}

export interface UpdateSessionResponse {
  session: RuntimeSessionDetail
}

export interface SendSessionMessageInput {
  content: string
  mode?: "default" | "interrupt"
}

export interface SendSessionMessageResponse {
  runId: string
  session: RuntimeSessionDetail
}

export interface CloseSessionResponse {
  session: RuntimeSessionDetail
}
