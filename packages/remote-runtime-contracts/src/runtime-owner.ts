import type { RuntimeOwner } from "./index.js"

export function runtimeOwnerForRemoteRuntimeAttachment(remoteRuntimeAttachmentId: string): RuntimeOwner {
  return { kind: "remoteRuntimeAttachment", remoteRuntimeAttachmentId }
}
