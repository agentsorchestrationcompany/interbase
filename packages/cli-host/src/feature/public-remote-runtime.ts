import type { CliCommandModule, CliCommandRegistration } from "@/cli/command-registry"
import type { FeatureBundle } from "./bundle"

export function createPublicRemoteRuntimeCommandRegistration(commandTree: readonly CliCommandModule[] = []) {
  return {
    command: "remote",
    names: ["remote", "mobile"],
    load: async () => (await import("@/cli/cmd/remote-runtime")).createRemoteRuntimeCommand(commandTree),
  } satisfies CliCommandRegistration
}

export const PUBLIC_REMOTE_RUNTIME_COMMAND = createPublicRemoteRuntimeCommandRegistration()

export const PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE = {
  id: "public-remote-runtime",
  kind: "public",
  commands: [PUBLIC_REMOTE_RUNTIME_COMMAND],
  apiSurfaces: ["remote-status"],
} satisfies FeatureBundle

export * as PublicRemoteRuntimeFeature from "./public-remote-runtime"
