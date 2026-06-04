import type { RuntimeAttachmentHealth } from "./index.js"

export function isRuntimeAttachmentRoutable(health: RuntimeAttachmentHealth): boolean {
  return health === "starting" || health === "online" || health === "degraded"
}
