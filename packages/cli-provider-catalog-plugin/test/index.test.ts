import { describe, expect, test } from "bun:test"
import path from "node:path"
import { Duration } from "effect"
import {
  DEFAULT_PROVIDER_CATALOG_CACHE_FILE,
  DEFAULT_PROVIDER_CATALOG_SOURCE,
  DEFAULT_PROVIDER_CATALOG_TTL,
  createProviderCatalogTuiPlugin,
  isProviderCatalogCacheFresh,
  providerCatalogApiUrl,
  createProviderConnectCommand,
  hasConnectedProvider,
  PROVIDER_CATALOG_TUI_PLUGIN_ID,
  PROVIDER_CATALOG_SERVER_PLUGIN_ID,
  providerSidebarCopy,
  providerCatalogServerPlugin,
  providerCatalogTuiPlugin,
  PROVIDER_AUTH_TIP,
  PROVIDER_LEGACY_ALIAS,
  PROVIDER_NO_MODELS_TIP,
  PROVIDER_SESSION_WELCOME_COPY,
  PROVIDER_SLASH_COMMAND,
  PROVIDER_ZEN_TIP,
  resolvePluginProviderContributions,
  resolveProviderCatalogAuthority,
} from "../src/index"

function hookWithAuth(provider: string) {
  return {
    auth: {
      provider,
    },
  }
}

function hookWithoutAuth() {
  return {}
}

describe("Interbase provider catalog authority", () => {
  test("resolves default models.dev cache and read authority", () => {
    const authority = resolveProviderCatalogAuthority({ cacheDir: "/tmp/interbase-cache" })

    expect(authority).toEqual({
      cacheFilePath: path.join("/tmp/interbase-cache", DEFAULT_PROVIDER_CATALOG_CACHE_FILE),
      disableFetch: false,
      lockKey: `models-dev:${path.join("/tmp/interbase-cache", DEFAULT_PROVIDER_CATALOG_CACHE_FILE)}`,
      readPath: path.join("/tmp/interbase-cache", DEFAULT_PROVIDER_CATALOG_CACHE_FILE),
      source: DEFAULT_PROVIDER_CATALOG_SOURCE,
      ttl: DEFAULT_PROVIDER_CATALOG_TTL,
    })
  })

  test("resolves custom source, explicit read path, disabled fetch, and custom TTL", () => {
    const authority = resolveProviderCatalogAuthority({
      cacheDir: "/tmp/interbase-cache",
      disableFetch: true,
      modelsPath: "/tmp/models-fixture.json",
      modelsUrl: "https://catalog.example.com/base",
      ttl: Duration.seconds(30),
    })

    expect(authority.cacheFilePath).toStartWith(path.join("/tmp/interbase-cache", "models-"))
    expect(authority.cacheFilePath).toEndWith(".json")
    expect(authority.disableFetch).toBeTrue()
    expect(authority.lockKey).toBe(`models-dev:${authority.cacheFilePath}`)
    expect(authority.readPath).toBe("/tmp/models-fixture.json")
    expect(authority.source).toBe("https://catalog.example.com/base")
    expect(Duration.toMillis(authority.ttl)).toBe(30_000)
  })

  test("builds the catalog API URL from structured source authority", () => {
    expect(providerCatalogApiUrl("https://models.dev")).toBe("https://models.dev/api.json")
    expect(providerCatalogApiUrl("https://catalog.example.com/base")).toBe("https://catalog.example.com/base/api.json")
  })

  test("evaluates cache freshness from explicit mtime, clock, and TTL authority", () => {
    const now = Date.parse("2026-05-10T00:05:00.000Z")

    expect(isProviderCatalogCacheFresh({ now, ttl: Duration.minutes(5) })).toBeFalse()
    expect(
      isProviderCatalogCacheFresh({
        now,
        ttl: Duration.minutes(5),
        mtime: new Date(now - 60_000),
      }),
    ).toBeTrue()
    expect(
      isProviderCatalogCacheFresh({
        now,
        ttl: Duration.minutes(5),
        mtime: new Date(now - 10 * 60_000),
      }),
    ).toBeFalse()
  })

  test("creates canonical provider command policy with connect alias", () => {
    let opened = 0
    const disconnected = createProviderConnectCommand({
      connected: false,
      openProviderDialog: () => {
        opened++
      },
    })

    expect(disconnected.title).toBe("Connect provider")
    expect(disconnected.value).toBe("provider.connect")
    expect(disconnected.category).toBe("Provider")
    expect(disconnected.suggested).toBeTrue()
    expect(disconnected.slash).toEqual({ name: "provider", aliases: ["connect"] })
    disconnected.onSelect()
    expect(opened).toBe(1)

    const connected = createProviderConnectCommand({
      connected: true,
      openProviderDialog: () => {
        opened++
      },
    })
    expect(connected.suggested).toBeFalse()
    connected.onSelect()
    expect(opened).toBe(2)
  })

  test("exports provider guidance copy from one package authority", () => {
    expect(PROVIDER_SLASH_COMMAND).toBe("/provider")
    expect(PROVIDER_LEGACY_ALIAS).toBe("/connect")
    expect(PROVIDER_NO_MODELS_TIP).toBe("Run {highlight}/provider{/highlight} to add an AI provider and start coding")
    expect(PROVIDER_AUTH_TIP).toBe(
      "Run {highlight}/provider{/highlight} to add API keys for 75+ supported LLM providers",
    )
    expect(PROVIDER_ZEN_TIP).toBe("Use {highlight}/provider{/highlight} with Interbase Zen for curated, tested models")
    expect(PROVIDER_SESSION_WELCOME_COPY).toBe("Get started")
    expect(providerSidebarCopy()).toEqual({
      freeModels: "Interbase includes free models so you can start immediately.",
      connect: "Connect from 75+ providers to use other models, including Claude, GPT, Gemini etc",
      commandTitle: "Connect provider",
      slashCommand: "/provider",
    })
  })
})

describe("Interbase plugin provider contribution policy", () => {
  test("returns plugin providers not in models.dev", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithAuth("portkey")],
      existingProviders: {},
      disabled: new Set(),
      providerNames: {},
    })
    expect(result).toEqual([{ id: "portkey", name: "portkey" }])
  })

  test("skips providers already in models.dev", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithAuth("anthropic")],
      existingProviders: { anthropic: {} },
      disabled: new Set(),
      providerNames: {},
    })
    expect(result).toEqual([])
  })

  test("deduplicates across plugins", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithAuth("portkey"), hookWithAuth("portkey")],
      existingProviders: {},
      disabled: new Set(),
      providerNames: {},
    })
    expect(result).toEqual([{ id: "portkey", name: "portkey" }])
  })

  test("respects disabled_providers", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithAuth("portkey")],
      existingProviders: {},
      disabled: new Set(["portkey"]),
      providerNames: {},
    })
    expect(result).toEqual([])
  })

  test("respects enabled_providers when provider is absent", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithAuth("portkey")],
      existingProviders: {},
      disabled: new Set(),
      enabled: new Set(["anthropic"]),
      providerNames: {},
    })
    expect(result).toEqual([])
  })

  test("includes provider when in enabled set", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithAuth("portkey")],
      existingProviders: {},
      disabled: new Set(),
      enabled: new Set(["portkey"]),
      providerNames: {},
    })
    expect(result).toEqual([{ id: "portkey", name: "portkey" }])
  })

  test("resolves name from providerNames", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithAuth("portkey")],
      existingProviders: {},
      disabled: new Set(),
      providerNames: { portkey: "Portkey AI" },
    })
    expect(result).toEqual([{ id: "portkey", name: "Portkey AI" }])
  })

  test("falls back to id when no name configured", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithAuth("portkey")],
      existingProviders: {},
      disabled: new Set(),
      providerNames: {},
    })
    expect(result).toEqual([{ id: "portkey", name: "portkey" }])
  })

  test("skips hooks without auth", () => {
    const result = resolvePluginProviderContributions({
      hooks: [hookWithoutAuth(), hookWithAuth("portkey"), hookWithoutAuth()],
      existingProviders: {},
      disabled: new Set(),
      providerNames: {},
    })
    expect(result).toEqual([{ id: "portkey", name: "portkey" }])
  })

  test("returns empty for no hooks", () => {
    const result = resolvePluginProviderContributions({
      hooks: [],
      existingProviders: {},
      disabled: new Set(),
      providerNames: {},
    })
    expect(result).toEqual([])
  })
})

describe("Interbase provider catalog TUI plugin", () => {
  test("creates a required server plugin hook module", async () => {
    expect(PROVIDER_CATALOG_SERVER_PLUGIN_ID).toBe("interbase-provider-catalog")
    await expect(providerCatalogServerPlugin({} as never)).resolves.toEqual({})
  })

  test("detects connected providers from structured provider state", () => {
    expect(hasConnectedProvider([])).toBeFalse()
    expect(hasConnectedProvider([{ id: "interbase", models: {} }])).toBeFalse()
    expect(hasConnectedProvider([{ id: "interbase", models: { free: { cost: { input: 0 } } } }])).toBeFalse()
    expect(hasConnectedProvider([{ id: "interbase", models: { paid: { cost: { input: 1 } } } }])).toBeTrue()
    expect(hasConnectedProvider([{ id: "anthropic", models: {} }])).toBeTrue()
  })

  test("registers provider command through the TUI plugin API", async () => {
    let registered: (() => ReturnType<typeof createProviderConnectCommand>[]) | undefined
    let opened = 0
    const api = {
      command: {
        register(cb: () => ReturnType<typeof createProviderConnectCommand>[]) {
          registered = cb
          return () => {
            registered = undefined
          }
        },
      },
      state: {
        provider: [],
      },
      ui: {
        openProviderDialog() {
          opened++
        },
      },
    }

    await providerCatalogTuiPlugin(api as never, undefined, {
      id: PROVIDER_CATALOG_TUI_PLUGIN_ID,
      source: "internal",
      spec: PROVIDER_CATALOG_TUI_PLUGIN_ID,
      target: PROVIDER_CATALOG_TUI_PLUGIN_ID,
      state: "same",
      first_time: 0,
      last_time: 0,
      time_changed: 0,
      load_count: 1,
      fingerprint: PROVIDER_CATALOG_TUI_PLUGIN_ID,
    })

    const command = registered?.()[0]
    expect(command).toMatchObject({
      title: "Connect provider",
      value: "provider.connect",
      suggested: true,
      slash: { name: "provider", aliases: ["connect"] },
      category: "Provider",
    })
    command?.onSelect()
    expect(opened).toBe(1)
  })

  test("creates an internal TUI plugin module", () => {
    expect(createProviderCatalogTuiPlugin()).toMatchObject({
      id: PROVIDER_CATALOG_TUI_PLUGIN_ID,
      tui: providerCatalogTuiPlugin,
    })
  })
})
