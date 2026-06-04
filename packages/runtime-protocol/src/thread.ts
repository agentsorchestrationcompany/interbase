import type { RuntimeErrorPayload } from "./errors.js"
import type {
  RuntimeApprovalPolicy,
  RuntimeExecutionMode,
  RuntimeMessage,
  RuntimeProviderSessionState,
  RuntimeRunSummary,
  RuntimeSandboxMode,
} from "./session.js"
import type { ProviderId } from "./provider.js"

export type RepairState = "healthy" | "sidecarMissing" | "historyMissing" | "replayDegraded" | "mismatch" | "tombstoned"

export interface HistoryRunSummary {
  error?: RuntimeErrorPayload | null
  errorMessage?: string | null
  exitCode: number | null
  finishedAt: string | null
  id: string
  prompt: string
  providerId: ProviderId
  startedAt: string
  status: "cancelled" | "completed" | "failed" | "running"
}

export interface HistoryThreadSummary {
  createdAt: string
  forkedFrom: { providerId: ProviderId; threadId: string } | null
  lastEventSequence?: number
  lastMessageAt: string | null
  metadata: Record<string, boolean | number | string | null> | null
  model: string | null
  preview: string | null
  providerId: ProviderId
  threadId: string
  title: string | null
  updatedAt: string
  workspaceHint: string | null
}

export interface HistoryThreadDetail extends HistoryThreadSummary {
  historyRuns: HistoryRunSummary[]
  messages: RuntimeMessage[]
  providerMetadata: Record<string, boolean | number | string | null> | null
}

export interface RuntimeThreadState {
  approvalPolicy: RuntimeApprovalPolicy | null
  createdAt: string
  executionMode: RuntimeExecutionMode
  fastMode: boolean
  historyPresence: "present" | "missing" | "unknown"
  lastEventSequence?: number
  lastManagedModel: string | null
  lastRunId: string | null
  managedOwnership: boolean
  managedRuns: RuntimeRunSummary[]
  permissionPresetId: string | null
  providerContinuation: RuntimeProviderSessionState | null
  providerId: ProviderId
  reasoningEffort: string | null
  repairReason: string | null
  repairState: RepairState
  repairUpdatedAt: string | null
  replayPresence: "present" | "missing" | "degraded" | "unknown"
  sandboxMode: RuntimeSandboxMode | null
  threadId: string
  tombstonedAt: string | null
  updatedAt: string
  version: number
  workspaceRoot: string
}

export interface RuntimeThreadReplayState {
  corrupted: boolean
  lastAppendedAt: string | null
  lastDurableSequence: number
  providerId: ProviderId
  storageVersion: number
  threadId: string
}

export interface LiveThreadRecord {
  activeRunId: string | null
  attachmentCount: number
  lastEventSequence?: number
  managedOwnership: boolean
  providerId: ProviderId
  status: "idle" | "running" | "error" | "closed" | "interrupted"
  subscribedClientIds: string[]
  threadId: string
  updatedAt: string
}

export interface LiveClientAttachment {
  attachmentId: string
  attachedAt: string
  clientId: string
  lastDeliveredSequence: number
  providerId: ProviderId
  threadId: string
  updatedAt: string
}

export interface RuntimeThreadRecord {
  history: HistoryThreadDetail
  providerId: ProviderId
  runtimeState: RuntimeThreadState | null
  threadId: string
}

export interface RuntimeThreadRef {
  providerId: ProviderId
  threadId: string
}

export interface ThreadListQuery {
  cursor?: string | null
  limit?: number | null
  searchTerm?: string | null
  workspaceRoots?: string[] | null
}

export interface ReadThreadQuery {
  includeMessages: boolean
}

export interface CreateThreadQuery {
  approvalPolicy: RuntimeApprovalPolicy | null
  cwd: string
  fastMode: boolean
  model: string | null
  providerId: ProviderId
  reasoningEffort: string | null
  sandboxMode: RuntimeSandboxMode | null
  title: string | null
}

export interface ResumeThreadQuery {
  approvalPolicy: RuntimeApprovalPolicy | null
  cwd: string
  model: string | null
  reasoningEffort: string | null
  sandboxMode: RuntimeSandboxMode | null
}

export interface ForkThreadQuery extends ResumeThreadQuery {
  threadId: string
}

export interface ProviderTurnDelta {
  assistantMessage?: string | null
  finishedAt?: string | null
  prompt: string
  providerRunId: string
  startedAt: string
  status: "cancelled" | "completed" | "failed" | "running"
}

export interface ThreadHistoryStore {
  appendTurn?(threadId: string, turn: ProviderTurnDelta): Promise<void>
  createThread(input: CreateThreadQuery): Promise<HistoryThreadDetail>
  forkThread(threadId: string, input: ForkThreadQuery): Promise<HistoryThreadDetail>
  listThreads(input: ThreadListQuery): Promise<HistoryThreadSummary[]>
  readThread(threadId: string, input: ReadThreadQuery): Promise<HistoryThreadDetail>
  resumeThread(threadId: string, input: ResumeThreadQuery): Promise<HistoryThreadDetail>
}

export interface MutableThreadHistoryStore extends ThreadHistoryStore {
  saveThread(detail: HistoryThreadDetail): Promise<HistoryThreadDetail>
}

export interface ThreadRuntimeStateStore {
  delete(input: { expectedVersion: number; threadId: string }): Promise<void>
  get(threadId: string): Promise<RuntimeThreadState | null>
  listAll(): Promise<RuntimeThreadState[]>
  listByThreadIds(threadIds: string[]): Promise<Map<string, RuntimeThreadState>>
  put(input: { expectedVersion: number | null; state: RuntimeThreadState }): Promise<RuntimeThreadState>
  patch(input: {
    expectedVersion: number
    patch: Partial<RuntimeThreadState>
    threadId: string
  }): Promise<RuntimeThreadState>
}

export type ThreadBackendCapabilities = {
  forkableHistory: boolean
  nativeHistory: boolean
  resumableHistory: boolean
  searchableHistory: boolean
}

export interface ProviderThreadBackend {
  capabilities: ThreadBackendCapabilities
  history: ThreadHistoryStore
  providerId: ProviderId
  runtimeState: ThreadRuntimeStateStore
}

export interface ProviderThreadBackendRegistry {
  get(providerId: ProviderId): ProviderThreadBackend
  list(): ProviderThreadBackend[]
}

export interface ThreadRecordJoinResult {
  record: RuntimeThreadRecord
  summary: HistoryThreadSummary
}
