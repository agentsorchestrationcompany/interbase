import manifest from "./manifest.json" with { type: "json" }

export type OverlayCommand = {
  readonly name: string
  readonly aliases: readonly string[]
  readonly required: boolean
  readonly surface: "top-level" | "tui-slash" | "tui-palette"
  readonly owner: "interbase"
}

export type OverlayPlugin = {
  readonly id: string
  readonly required: boolean
  readonly runtime: "server" | "tui"
  readonly owner: "interbase"
}

export type OverlayConfigTransform = {
  readonly id: string
  readonly required: boolean
  readonly owner: "interbase"
}

export type OverlayTheme = {
  readonly id: string
  readonly displayName: string
  readonly required: boolean
  readonly owner: "interbase"
}

export type OverlayKeybindDefaults = {
  readonly agent_cycle: "shift+tab"
  readonly agent_cycle_reverse: "none"
  readonly input_submit: "return,tab"
}

export type OverlayThemeScheme = "system" | "light" | "dark"

export type OverlayThemeSchemeCommand = {
  readonly scheme: OverlayThemeScheme
  readonly title: string
  readonly value: `theme.scheme.${OverlayThemeScheme}`
  readonly category: "System"
}

export type InterbaseOverlayManifest = {
  readonly brand: {
    readonly productName: "Interbase"
    readonly binaryName: "interbase"
    readonly configFileName: "interbase.json"
    readonly localConfigDir: ".interbase"
    readonly docsUrl: "https://interbase.ai/docs"
  }
  readonly release: {
    readonly npmPackage: "interbase"
    readonly githubRepository: "agentsorchestrationcompany/interbase"
    readonly homebrewTap: "agentsorchestrationcompany/homebrew-tap"
    readonly wrapperRoot: "packages/cli"
    readonly implementationRoot: "packages/cli-host"
  }
  readonly commands: readonly OverlayCommand[]
  readonly plugins: readonly OverlayPlugin[]
  readonly configTransforms: readonly OverlayConfigTransform[]
  readonly themes: readonly OverlayTheme[]
  readonly keybindDefaults: OverlayKeybindDefaults
  readonly themeScheme: {
    readonly storageKey: "theme_scheme"
    readonly legacyModeKey: "theme_mode"
    readonly legacyLockKey: "theme_mode_lock"
    readonly defaultScheme: "system"
    readonly values: readonly OverlayThemeScheme[]
    readonly commands: readonly OverlayThemeSchemeCommand[]
  }
}

export const InterbaseOverlay = manifest as InterbaseOverlayManifest

export const INTERBASE_KEYBIND_DEFAULTS = InterbaseOverlay.keybindDefaults
export const INTERBASE_THEME_SCHEME = InterbaseOverlay.themeScheme

export function requiredPlugins(runtime?: OverlayPlugin["runtime"]) {
  return InterbaseOverlay.plugins.filter((plugin) => plugin.required && (!runtime || plugin.runtime === runtime))
}

export function requiredCommands(surface?: OverlayCommand["surface"]) {
  return InterbaseOverlay.commands.filter((command) => command.required && (!surface || command.surface === surface))
}

export function findCommand(name: string) {
  return InterbaseOverlay.commands.find((command) => command.name === name || command.aliases.includes(name))
}

export function isRequiredPlugin(id: string) {
  return InterbaseOverlay.plugins.some((plugin) => plugin.id === id && plugin.required)
}
