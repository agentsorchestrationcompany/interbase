import { CLI_EXTENSION_FEATURE_BUNDLES } from "@/cli/cli-extensions"
import {
  assembleFeatureBundles,
  featureBundleCommandTrees,
  featureBundleCommands,
  featureBundleCommandsByKind,
  featureBundleLayer,
  featureBundleOwnedLayer,
  featureBundlesOwnApiSurface,
  featureBundlesOwnAuthoritySeam,
  featureBundlesOwnRouteGroup,
} from "./bundle"
import { PUBLIC_ACCOUNT_FEATURE_BUNDLE } from "./public-account"
import { PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE } from "./public-remote-runtime"
import type { FeatureBundle, FeatureSeam, FeatureSeamLayerMap } from "./bundle"

export const PUBLIC_FEATURE_BUNDLES = [PUBLIC_ACCOUNT_FEATURE_BUNDLE, PUBLIC_REMOTE_RUNTIME_FEATURE_BUNDLE] as const

export type FeatureAssemblyState = {
  readonly bundles: readonly FeatureBundle[]
  commands(): ReturnType<typeof featureBundleCommands>
  commandsByKind(kind: "public" | "hosted"): ReturnType<typeof featureBundleCommandsByKind>
  layer(): ReturnType<typeof featureBundleLayer>
  commandTree(root: string): ReturnType<typeof featureBundleCommandTrees>
  ownedLayer<Seam extends FeatureSeam>(seam: Seam, fallback?: FeatureSeamLayerMap[Seam]): FeatureSeamLayerMap[Seam]
  ownsRouteGroup(routeGroup: string): boolean
  ownsApiSurface(apiSurface: string): boolean
  ownsAuthoritySeam(authoritySeam: string): boolean
}

export function createFeatureAssembly(
  input: {
    readonly publicBundles?: readonly FeatureBundle[]
    readonly extensionBundles?: readonly FeatureBundle[]
  } = {},
): FeatureAssemblyState {
  const bundles = assembleFeatureBundles({
    publicBundles: input.publicBundles ?? PUBLIC_FEATURE_BUNDLES,
    extensionBundles: input.extensionBundles ?? CLI_EXTENSION_FEATURE_BUNDLES,
  })
  return {
    bundles,
    commands: () => featureBundleCommands(bundles),
    commandsByKind: (kind) => featureBundleCommandsByKind(bundles, kind),
    layer: () => featureBundleLayer(bundles),
    commandTree: (root) => featureBundleCommandTrees(bundles, root),
    ownedLayer: (seam, fallback) => featureBundleOwnedLayer(bundles, seam, fallback),
    ownsRouteGroup: (routeGroup) => featureBundlesOwnRouteGroup(bundles, routeGroup),
    ownsApiSurface: (apiSurface) => featureBundlesOwnApiSurface(bundles, apiSurface),
    ownsAuthoritySeam: (authoritySeam) => featureBundlesOwnAuthoritySeam(bundles, authoritySeam),
  }
}

export const ACTIVE_FEATURE_ASSEMBLY = createFeatureAssembly()
export const ACTIVE_FEATURE_BUNDLES = ACTIVE_FEATURE_ASSEMBLY.bundles

export function activeFeatureBundleCommands(bundles = ACTIVE_FEATURE_BUNDLES) {
  return featureBundleCommands(bundles)
}

export function activeFeatureBundleCommandsByKind(kind: "public" | "hosted", bundles = ACTIVE_FEATURE_BUNDLES) {
  return featureBundleCommandsByKind(bundles, kind)
}

export function activeFeatureBundleLayer(bundles = ACTIVE_FEATURE_BUNDLES) {
  return featureBundleLayer(bundles)
}

export function activeFeatureCommandTree(root: string, bundles = ACTIVE_FEATURE_BUNDLES) {
  return featureBundleCommandTrees(bundles, root)
}

export function activeFeatureOwnedLayer(
  seam: FeatureSeam,
  fallback?: FeatureSeamLayerMap[typeof seam],
  bundles = ACTIVE_FEATURE_BUNDLES,
) {
  return featureBundleOwnedLayer(bundles, seam, fallback)
}

export function activeFeatureOwnsRouteGroup(routeGroup: string, bundles = ACTIVE_FEATURE_BUNDLES) {
  return featureBundlesOwnRouteGroup(bundles, routeGroup)
}

export function activeFeatureOwnsApiSurface(apiSurface: string, bundles = ACTIVE_FEATURE_BUNDLES) {
  return featureBundlesOwnApiSurface(bundles, apiSurface)
}

export function activeFeatureOwnsAuthoritySeam(authoritySeam: string, bundles = ACTIVE_FEATURE_BUNDLES) {
  return featureBundlesOwnAuthoritySeam(bundles, authoritySeam)
}

export * as FeatureAssembly from "./assembly"
