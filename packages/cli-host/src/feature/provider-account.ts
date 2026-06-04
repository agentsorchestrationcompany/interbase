import type { CliCommandRegistration } from "@/cli/command-registry"
import type { FeatureBundle, ProviderAccountAuthorityLayer } from "./bundle"

export type ProviderAccountFeatureBundleInput = {
  readonly id?: string
  readonly commands?: readonly CliCommandRegistration[]
  readonly authorityLayer: ProviderAccountAuthorityLayer
}

export function createProviderAccountFeatureBundle(input: ProviderAccountFeatureBundleInput): FeatureBundle {
  return {
    id: input.id ?? "provider-account",
    kind: "hosted",
    replaces: ["public-account-authority"],
    commands: input.commands,
    seamLayers: [{ seam: "provider-account-authority", layer: input.authorityLayer }],
  }
}

export * as ProviderAccountFeature from "./provider-account"
