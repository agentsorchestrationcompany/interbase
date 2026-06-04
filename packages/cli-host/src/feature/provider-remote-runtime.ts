import type { CliCommandModule, CliCommandRegistration } from "@/cli/command-registry"
import type { FeatureBundle, FeatureBundleLayer, GlobalRouteExtension } from "./bundle"

export type ProviderRemoteRuntimeFeatureBundleInput = {
  readonly id?: string
  readonly commands?: readonly CliCommandRegistration[]
  readonly remoteCommandTree?: readonly CliCommandModule[]
  readonly layer?: FeatureBundleLayer
  readonly globalRoutes?: readonly GlobalRouteExtension[]
}

export function createProviderRemoteRuntimeFeatureBundle(
  input: ProviderRemoteRuntimeFeatureBundleInput = {},
): FeatureBundle {
  const commands = input.commands ?? []
  return {
    id: input.id ?? "provider-remote-runtime",
    kind: "hosted",
    replaces: commands.length > 0 ? ["public-remote-runtime"] : undefined,
    commands,
    commandTrees: input.remoteCommandTree?.length ? [{ root: "remote", commands: input.remoteCommandTree }] : [],
    globalRoutes: input.globalRoutes,
    layer: input.layer,
  }
}

export * as ProviderRemoteRuntimeFeature from "./provider-remote-runtime"
