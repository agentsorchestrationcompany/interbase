export const runtimeThreadStatusValues = ["idle", "running", "error", "closed", "interrupted"] as const

export type RuntimeThreadStatus = (typeof runtimeThreadStatusValues)[number]

export interface RuntimeActiveChatMetadataProjection {
  agent: string | null
  createdAt: string
  hasActiveTurn?: boolean | null
  lastText?: string | null
  messageCount?: number | null
  model: string | null
  path: string | null
  projectId: string
  providerId: string | null
  providerName: string | null
  sessionId: string
  status: RuntimeThreadStatus
  title: string
  updatedAt: string
}

export interface RuntimeActiveChatsPayload {
  cursor?: string | null
  limit?: number | null
}

export interface RuntimeActiveChatsPageInfo {
  hasNewer: boolean
  hasOlder: boolean
  newerCursor: string | null
  olderCursor: string | null
}

export interface RuntimeActiveChatsResponse {
  activeChats: RuntimeActiveChatMetadataProjection[]
  pageInfo: RuntimeActiveChatsPageInfo
}
