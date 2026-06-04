import type { ProviderDescriptor, ProviderId, ProviderModelOption } from "./provider.js"
import type {
  CloseSessionResponse,
  CreateSessionResponse,
  RuntimeSessionDetail,
  RuntimeSessionSummary,
  SendSessionMessageResponse,
  UpdateSessionResponse,
} from "./session.js"
import type { WaitForEventsResponse } from "./events.js"

export const runtimeApiVersion = "0.1.6"

export interface RuntimeTransportInfo {
  baseUrl: string
  host: string
  port: number
}

export type RuntimeLaunchMode = "direct" | "launchd"
export type RuntimeNativeShellTransport = "direct_handoff" | "pty_proxy"
export type RuntimeNativeShellEscapeSequence = "ctrl+]"

export interface RuntimeLaunchInfo {
  mode: RuntimeLaunchMode
  serviceLabel?: string | null
}

export interface RuntimeNativeShellControl {
  escapeSequence: RuntimeNativeShellEscapeSequence | null
  localCommandPrefix: string
  returnToShellSupported: boolean
}

export interface RuntimeNativeShellLaunchSpec {
  args: string[]
  command: string
  control: RuntimeNativeShellControl
  cwd: string
  env: Record<string, string>
  sessionId: string
  transport: RuntimeNativeShellTransport
}

export interface RuntimeControlRecord {
  authToken?: string | null
  dataDir: string
  host: string
  launch?: RuntimeLaunchInfo
  pid: number
  port: number
  startedAt: string
  version: string
  websocketUrl?: string | null
}

export interface RuntimeStatusResponse {
  activeSessionCount: number
  dataDir: string
  launch: RuntimeLaunchInfo
  ok: true
  pid: number
  startedAt: string
  transport: RuntimeTransportInfo
  version: string
}

export interface ListProvidersResponse {
  providers: ProviderDescriptor[]
}

export interface ListProviderModelsResponse {
  models: ProviderModelOption[]
  providerId: ProviderId
}

export interface ListSessionsResponse {
  sessions: RuntimeSessionSummary[]
}

export interface GetSessionResponse {
  session: RuntimeSessionDetail
}

export interface PrepareNativeShellInput {
  initialInput?: string
}

export type RuntimeCreateSessionResponse = CreateSessionResponse
export type RuntimeSendSessionMessageResponse = SendSessionMessageResponse
export type RuntimeCloseSessionResponse = CloseSessionResponse
export type RuntimeUpdateSessionResponse = UpdateSessionResponse
export type RuntimeWaitForEventsResponse = WaitForEventsResponse
export interface RuntimePrepareNativeShellResponse {
  launch: RuntimeNativeShellLaunchSpec | null
}
