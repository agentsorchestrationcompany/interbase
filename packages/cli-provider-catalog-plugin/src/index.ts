import { createHash } from "node:crypto"
import path from "node:path"
import { Duration } from "effect"
import type { Plugin, Hooks } from "@interbase/plugin"
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@interbase/plugin/tui"

export type ProviderCatalogConfig = {
  cacheDir: string
  disableFetch?: boolean
  modelsPath?: string
  modelsUrl?: string
  ttl?: Duration.Duration
}

export type ProviderCatalogAuthority = {
  cacheFilePath: string
  disableFetch: boolean
  lockKey: string
  readPath: string
  source: string
  ttl: Duration.Duration
}

export const DEFAULT_PROVIDER_CATALOG_SOURCE = "https://models.dev"
export const DEFAULT_PROVIDER_CATALOG_CACHE_FILE = "models.json"
export const DEFAULT_PROVIDER_CATALOG_TTL = Duration.minutes(5)

function hashProviderCatalogSource(source: string): string {
  return createHash("sha1").update(source).digest("hex")
}

export function resolveProviderCatalogAuthority(config: ProviderCatalogConfig): ProviderCatalogAuthority {
  const source = config.modelsUrl || DEFAULT_PROVIDER_CATALOG_SOURCE
  const cacheFileName =
    source === DEFAULT_PROVIDER_CATALOG_SOURCE
      ? DEFAULT_PROVIDER_CATALOG_CACHE_FILE
      : `models-${hashProviderCatalogSource(source)}.json`
  const cacheFilePath = path.join(config.cacheDir, cacheFileName)
  const readPath = config.modelsPath ?? cacheFilePath

  return {
    cacheFilePath,
    disableFetch: config.disableFetch === true,
    lockKey: `models-dev:${cacheFilePath}`,
    readPath,
    source,
    ttl: config.ttl ?? DEFAULT_PROVIDER_CATALOG_TTL,
  }
}

export function providerCatalogApiUrl(source: string) {
  return `${source}/api.json`
}

export function isProviderCatalogCacheFresh(input: { mtime?: Date; now: number; ttl: Duration.Duration }) {
  if (!input.mtime) return false
  return input.now - input.mtime.getTime() < Duration.toMillis(input.ttl)
}

export type ProviderAuthContribution = {
  auth?: {
    provider: string
  }
}

export function resolvePluginProviderContributions(input: {
  hooks: ProviderAuthContribution[]
  existingProviders: Record<string, unknown>
  disabled: Set<string>
  enabled?: Set<string>
  providerNames: Record<string, string | undefined>
}): Array<{ id: string; name: string }> {
  const seen = new Set<string>()
  const result: Array<{ id: string; name: string }> = []

  for (const hook of input.hooks) {
    if (!hook.auth) continue
    const id = hook.auth.provider
    if (seen.has(id)) continue
    seen.add(id)
    if (Object.hasOwn(input.existingProviders, id)) continue
    if (input.disabled.has(id)) continue
    if (input.enabled && !input.enabled.has(id)) continue
    result.push({
      id,
      name: input.providerNames[id] ?? id,
    })
  }

  return result
}

export type ProviderCommandOption = {
  category: "Provider"
  onSelect: () => void
  slash: {
    aliases: ["connect"]
    name: "provider"
  }
  suggested: boolean
  title: "Connect provider"
  value: "provider.connect"
}

export function createProviderConnectCommand(input: {
  connected: boolean
  openProviderDialog: () => void
}): ProviderCommandOption {
  return {
    title: "Connect provider",
    value: "provider.connect",
    suggested: !input.connected,
    slash: {
      name: "provider",
      aliases: ["connect"],
    },
    onSelect: input.openProviderDialog,
    category: "Provider",
  }
}

export type ProviderConnectionCandidate = {
  id: string
  models?: Record<string, { cost?: { input?: number } | undefined } | undefined>
}

export function hasConnectedProvider(providers: ReadonlyArray<ProviderConnectionCandidate>) {
  return providers.some((provider) => {
    if (provider.id !== "interbase") return true
    return Object.values(provider.models ?? {}).some((model) => model?.cost?.input !== 0)
  })
}

export const PROVIDER_CATALOG_TUI_PLUGIN_ID = "internal:provider-catalog"
export const PROVIDER_CATALOG_SERVER_PLUGIN_ID = "interbase-provider-catalog"
export type ProviderCatalogTuiPluginModule = TuiPluginModule & { id: typeof PROVIDER_CATALOG_TUI_PLUGIN_ID }

export const providerCatalogServerPlugin: Plugin = async (): Promise<Hooks> => ({})

export const providerCatalogTuiPlugin: TuiPlugin = async (api: TuiPluginApi) => {
  api.command.register(() => [
    createProviderConnectCommand({
      connected: hasConnectedProvider(api.state.provider),
      openProviderDialog: api.ui.openProviderDialog,
    }),
  ])
}

export function createProviderCatalogTuiPlugin(): ProviderCatalogTuiPluginModule {
  return {
    id: PROVIDER_CATALOG_TUI_PLUGIN_ID,
    tui: providerCatalogTuiPlugin,
  }
}

export const PROVIDER_SLASH_COMMAND = "/provider"
export const PROVIDER_LEGACY_ALIAS = "/connect"
export const PROVIDER_COUNT_LABEL = "75+"
export const PROVIDER_COMMAND_TITLE = "Connect provider"
export const PROVIDER_NO_MODELS_TIP = `Run {highlight}${PROVIDER_SLASH_COMMAND}{/highlight} to add an AI provider and start coding`
export const PROVIDER_AUTH_TIP = `Run {highlight}${PROVIDER_SLASH_COMMAND}{/highlight} to add API keys for ${PROVIDER_COUNT_LABEL} supported LLM providers`
export const PROVIDER_ZEN_TIP = `Use {highlight}${PROVIDER_SLASH_COMMAND}{/highlight} with Interbase Zen for curated, tested models`
export const PROVIDER_SIDEBAR_FREE_MODELS_COPY = "Interbase includes free models so you can start immediately."
export const PROVIDER_SIDEBAR_CONNECT_COPY = `Connect from ${PROVIDER_COUNT_LABEL} providers to use other models, including Claude, GPT, Gemini etc`
export const PROVIDER_SESSION_WELCOME_COPY = "Get started"

export function providerSidebarCopy() {
  return {
    freeModels: PROVIDER_SIDEBAR_FREE_MODELS_COPY,
    connect: PROVIDER_SIDEBAR_CONNECT_COPY,
    commandTitle: PROVIDER_COMMAND_TITLE,
    slashCommand: PROVIDER_SLASH_COMMAND,
  }
}
