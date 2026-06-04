export const remoteRuntimeCapabilityValues = [
  "remoteRuntime.http.activeChats",
  "remoteRuntime.http.chatDetail",
  "remoteRuntime.http.chatMessages",
  "remoteRuntime.http.goals",
  "remoteRuntime.http.providers",
  "remoteRuntime.http.runtimeDirectories",
  "remoteRuntime.http.runtimeStatus",
  "remoteRuntime.http.startChat",
  "remoteRuntime.http.sendMessage",
  "remoteRuntime.http.updateChat",
  "remoteRuntime.git.read",
  "remoteRuntime.goal.read",
  "remoteRuntime.goal.list",
  "remoteRuntime.goal.mutate",
  "remoteRuntime.goal.events",
  "remoteRuntime.alias.read",
  "remoteRuntime.alias.list",
  "remoteRuntime.alias.mutate",
  "remoteRuntime.alias.events",
  "remoteRuntime.websocket.realtimeEvents",
  "remoteRuntime.websocket.streamDeltas",
] as const

export type RemoteRuntimeCapability = (typeof remoteRuntimeCapabilityValues)[number]

export const remoteRuntimeAttachmentCapabilityValues = [
  "runtime.metadata",
  "runtime.sensitiveRead",
  "runtime.mutate",
  "runtime.privilegedExecution",
  "runtime.credential",
  "runtime.shutdown",
] as const

export type RemoteRuntimeAttachmentCapability = (typeof remoteRuntimeAttachmentCapabilityValues)[number]

export const remoteRuntimeConnectorMetadataCapabilities = ["runtime.metadata"] as const

export function isRemoteRuntimeCapability(value: unknown): value is RemoteRuntimeCapability {
  return typeof value === "string" && remoteRuntimeCapabilityValues.includes(value as RemoteRuntimeCapability)
}

export function isRemoteRuntimeAttachmentCapability(value: unknown): value is RemoteRuntimeAttachmentCapability {
  return (
    typeof value === "string" &&
    remoteRuntimeAttachmentCapabilityValues.includes(value as RemoteRuntimeAttachmentCapability)
  )
}
