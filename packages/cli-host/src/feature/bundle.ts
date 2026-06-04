import { Layer } from "effect"
import type { Hono } from "hono"
import type { UpgradeWebSocket } from "hono/ws"
import { ProviderAccountAuthority } from "@/account/authority"
import type { CliCommandModule, CliCommandRegistration } from "@/cli/command-registry"
import type { AppRuntimeLike } from "@/effect/app-runtime"

export type ProviderAccountAuthorityLayer = Layer.Layer<ProviderAccountAuthority.Service>
export type FeatureBundleLayer = Layer.Layer<never, never, never>
export type FeatureSeamLayerMap = {
  readonly "provider-account-authority": ProviderAccountAuthorityLayer
}
export type FeatureSeam = keyof FeatureSeamLayerMap
export type FeatureSeamLayer = {
  readonly [Seam in FeatureSeam]: {
    readonly seam: Seam
    readonly layer: FeatureSeamLayerMap[Seam]
  }
}[FeatureSeam]

export type CliCommandTreeExtension = {
  readonly root: string
  readonly commands: readonly CliCommandModule[]
}

export type GlobalRouteExtension = (input: {
  readonly runtime: AppRuntimeLike
  readonly upgradeWebSocket?: UpgradeWebSocket
}) => Hono

export type FeatureInvariant = (bundles: readonly FeatureBundle[]) => void

export type FeatureBundle = {
  readonly id: string
  readonly kind?: "public" | "hosted"
  readonly dependsOn?: readonly string[]
  readonly commands?: readonly CliCommandRegistration[]
  readonly commandTrees?: readonly CliCommandTreeExtension[]
  readonly globalRoutes?: readonly GlobalRouteExtension[]
  readonly routeGroups?: readonly string[]
  readonly authoritySeams?: readonly string[]
  readonly apiSurfaces?: readonly string[]
  readonly disabledCompatibility?: readonly string[]
  readonly invariants?: readonly FeatureInvariant[]
  readonly seamLayers?: readonly FeatureSeamLayer[]
  readonly layer?: FeatureBundleLayer
  readonly replaces?: readonly string[]
}

const defaultFeatureSeamLayers = {
  "provider-account-authority": ProviderAccountAuthority.defaultLayer,
} satisfies FeatureSeamLayerMap

export function resolveFeatureBundles(input: { readonly bundles: readonly FeatureBundle[] }): readonly FeatureBundle[] {
  if (input.bundles.length > 0) return validateFeatureBundles(input.bundles)
  return []
}

export function assembleFeatureBundles(input: {
  readonly publicBundles: readonly FeatureBundle[]
  readonly extensionBundles: readonly FeatureBundle[]
}): readonly FeatureBundle[] {
  return validateFeatureBundles([...input.publicBundles, ...input.extensionBundles])
}

function validateFeatureBundles(bundles: readonly FeatureBundle[]) {
  const ids = new Map<string, FeatureBundle>()
  for (const bundle of bundles) {
    const duplicate = ids.get(bundle.id)
    if (duplicate) {
      throw new Error(`Duplicate feature bundle id: ${bundle.id}`)
    }
    ids.set(bundle.id, bundle)
  }

  for (const bundle of bundles) {
    for (const dependency of bundle.dependsOn ?? []) {
      if (!ids.has(dependency)) {
        throw new Error(`Feature bundle ${bundle.id} depends on missing bundle ${dependency}`)
      }
    }
    for (const replacement of bundle.replaces ?? []) {
      if (!ids.has(replacement)) {
        throw new Error(`Feature bundle ${bundle.id} replaces missing bundle ${replacement}`)
      }
    }
  }

  const commandOwners = new Map<string, string>()
  for (const bundle of bundles) {
    for (const command of bundle.commands ?? []) {
      for (const name of commandRegistrationNames(command)) {
        const owner = commandOwners.get(name)
        if (!owner) {
          commandOwners.set(name, bundle.id)
          continue
        }
        if (bundle.replaces?.includes(owner)) {
          commandOwners.set(name, bundle.id)
          continue
        }
        throw new Error(`Feature bundle ${bundle.id} conflicts on command name ${name} with ${owner}`)
      }
    }
  }

  validateOwnedKeys(bundles, "route group", (bundle) => bundle.routeGroups ?? [])
  validateOwnedKeys(bundles, "authority seam", (bundle) => bundle.authoritySeams ?? [])
  validateOwnedKeys(bundles, "api surface", (bundle) => bundle.apiSurfaces ?? [])
  validateOwnedKeys(bundles, "layer seam", (bundle) => (bundle.seamLayers ?? []).map((entry) => entry.seam))

  for (const bundle of bundles) {
    for (const invariant of bundle.invariants ?? []) {
      invariant(bundles)
    }
  }

  return bundles
}

function validateOwnedKeys(
  bundles: readonly FeatureBundle[],
  kind: string,
  select: (bundle: FeatureBundle) => readonly string[],
) {
  const owners = new Map<string, string>()
  for (const bundle of bundles) {
    for (const key of select(bundle)) {
      const owner = owners.get(key)
      if (!owner) {
        owners.set(key, bundle.id)
        continue
      }
      if (bundle.replaces?.includes(owner)) {
        owners.set(key, bundle.id)
        continue
      }
      throw new Error(`Feature bundle ${bundle.id} conflicts on ${kind} ${key} with ${owner}`)
    }
  }
}

function commandRegistrationNames(command: CliCommandRegistration) {
  if (command.names) return command.names
  return [command.command.split(/\s+/, 1)[0]].filter((name): name is string => Boolean(name))
}

export function featureBundleCommands(bundles: readonly FeatureBundle[]): readonly CliCommandRegistration[] {
  return bundles.flatMap((bundle) => bundle.commands ?? [])
}

export function featureBundleCommandsByKind(
  bundles: readonly FeatureBundle[],
  kind: "public" | "hosted",
): readonly CliCommandRegistration[] {
  return bundles.flatMap((bundle) => (bundle.kind === kind ? (bundle.commands ?? []) : []))
}

export function featureBundleCommandTrees(
  bundles: readonly FeatureBundle[],
  root: string,
): readonly CliCommandModule[] {
  return bundles.flatMap((bundle) =>
    (bundle.commandTrees ?? []).flatMap((tree) => (tree.root === root ? tree.commands : [])),
  )
}

export function featureBundlesOwnRouteGroup(bundles: readonly FeatureBundle[], routeGroup: string) {
  return bundles.some((bundle) => (bundle.routeGroups ?? []).includes(routeGroup))
}

export function featureBundlesOwnApiSurface(bundles: readonly FeatureBundle[], apiSurface: string) {
  return bundles.some((bundle) => (bundle.apiSurfaces ?? []).includes(apiSurface))
}

export function featureBundlesOwnAuthoritySeam(bundles: readonly FeatureBundle[], authoritySeam: string) {
  return bundles.some((bundle) => (bundle.authoritySeams ?? []).includes(authoritySeam))
}

export function featureBundleOwnedLayer(
  bundles: readonly FeatureBundle[],
  seam: FeatureSeam,
  fallback: FeatureSeamLayerMap[typeof seam] = defaultFeatureSeamLayers[seam],
) {
  for (let i = bundles.length - 1; i >= 0; i--) {
    const match = bundles[i].seamLayers?.find((entry) => entry.seam === seam)
    if (match) return match.layer
  }
  return fallback
}

export function featureBundleLayer(bundles: readonly FeatureBundle[]) {
  return bundles.reduce<FeatureBundleLayer>((layer, bundle) => {
    if (!bundle.layer) return layer
    return Layer.merge(layer, bundle.layer)
  }, Layer.empty)
}

export * as FeatureBundle from "./bundle"
