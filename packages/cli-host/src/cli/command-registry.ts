import {
  ACTIVE_FEATURE_ASSEMBLY,
  activeFeatureBundleCommandsByKind,
  type FeatureAssemblyState,
} from "@/feature/assembly"
import { createPublicRemoteRuntimeCommandRegistration } from "@/feature/public-remote-runtime"
import { CliTelemetryEntrypoint } from "@interbase/cli-telemetry"

export type CliCommandModule = {
  command?: string | readonly string[]
  aliases?: string | readonly string[]
  describe?: string | false
  builder?: unknown
  handler?: unknown
}

export type CliCommandRegistration = {
  command: string
  names?: readonly string[]
  load: () => Promise<CliCommandModule>
}

export type CliCommandRegistry<Self> = {
  command(command: unknown): Self
}

export const UPSTREAM_CLI_COMMANDS: readonly CliCommandRegistration[] = [
  { command: "acp", load: async () => (await import("./cmd/acp")).AcpCommand },
  { command: "mcp", load: async () => (await import("./cmd/mcp")).McpCommand },
  { command: "$0 [project]", names: ["$0"], load: async () => (await import("./cmd/tui/thread")).TuiThreadCommand },
  { command: "attach [sessionID]", load: async () => (await import("./cmd/tui/attach")).AttachCommand },
  { command: "run [message..]", load: async () => (await import("./cmd/run")).RunCommand },
  { command: "generate", load: async () => (await import("./cmd/generate")).GenerateCommand },
  { command: "debug", load: async () => (await import("./cmd/debug")).DebugCommand },
  {
    command: "provider",
    names: ["provider", "providers", "auth"],
    load: async () => (await import("./cmd/providers")).ProvidersCommand,
  },
  { command: "agent", load: async () => (await import("./cmd/agent")).AgentCommand },
  { command: "upgrade", load: async () => (await import("./cmd/upgrade")).UpgradeCommand },
  { command: "uninstall", load: async () => (await import("./cmd/uninstall")).UninstallCommand },
  { command: "serve", load: async () => (await import("./cmd/serve")).ServeCommand },
  { command: "models", load: async () => (await import("./cmd/models")).ModelsCommand },
  { command: "stats", load: async () => (await import("./cmd/stats")).StatsCommand },
  { command: "export", load: async () => (await import("./cmd/export")).ExportCommand },
  { command: "import", load: async () => (await import("./cmd/import")).ImportCommand },
  { command: "pr", load: async () => (await import("./cmd/pr")).PrCommand },
  { command: "session", load: async () => (await import("./cmd/session")).SessionCommand },
  { command: "plugin", names: ["plugin", "plug"], load: async () => (await import("./cmd/plug")).PluginCommand },
  { command: "db", load: async () => (await import("./cmd/db")).DbCommand },
]

export const INTERBASE_COMPAT_CLI_COMMANDS: readonly CliCommandRegistration[] = [
  { command: "analytics", load: async () => (await import("./cmd/analytics")).AnalyticsCommand },
  { command: "doctor", load: async () => (await import("./cmd/compat")).LegacyDoctorCommand },
]

export const INTERBASE_CLI_COMMANDS: readonly CliCommandRegistration[] = [
  ...UPSTREAM_CLI_COMMANDS.slice(0, 2),
  ...activeFeatureBundleCommandsByKind("public"),
  ...INTERBASE_COMPAT_CLI_COMMANDS,
  ...UPSTREAM_CLI_COMMANDS.slice(2),
]

const VALUE_GLOBAL_OPTIONS = new Set(["--log-level"])
const VALUE_GLOBAL_OPTION_PREFIXES = ["--log-level="]

function commandNames(command: CliCommandRegistration) {
  if (command.names) return command.names
  return [command.command.split(/\s+/, 1)[0]].filter((name): name is string => Boolean(name))
}

export function composeCliCommands(
  baseCommands: readonly CliCommandRegistration[],
  extensionCommands: readonly CliCommandRegistration[],
) {
  const extensionNames = new Set(extensionCommands.flatMap((command) => commandNames(command)))
  return [
    ...baseCommands.filter((command) => commandNames(command).every((name) => !extensionNames.has(name))),
    ...extensionCommands,
  ] satisfies readonly CliCommandRegistration[]
}

export function createActiveInterbaseCliCommands(assembly: FeatureAssemblyState = ACTIVE_FEATURE_ASSEMBLY) {
  const publicCommands = assembly.commandsByKind("public")
  const remoteCommandTree = assembly.commandTree("remote")
  const base = [
    ...UPSTREAM_CLI_COMMANDS.slice(0, 2),
    createPublicRemoteRuntimeCommandRegistration(remoteCommandTree),
    ...publicCommands.filter((command) => command.command !== "remote"),
    ...INTERBASE_COMPAT_CLI_COMMANDS,
    ...UPSTREAM_CLI_COMMANDS.slice(2),
  ] satisfies readonly CliCommandRegistration[]
  return composeCliCommands(base, assembly.commandsByKind("hosted"))
}

export const ACTIVE_INTERBASE_CLI_COMMANDS = createActiveInterbaseCliCommands()

function firstCommandArg(args: readonly string[]) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg) continue
    if (arg === "--") return undefined
    if (VALUE_GLOBAL_OPTIONS.has(arg)) {
      i++
      continue
    }
    if (VALUE_GLOBAL_OPTION_PREFIXES.some((option) => arg.startsWith(option))) continue
    if (arg.startsWith("-")) continue
    return arg
  }
  return undefined
}

export function shouldEmitCliStartupTelemetry(args: readonly string[]) {
  return firstCommandArg(args) !== "analytics"
}

export function resolveCliTelemetryEntrypoint(args: readonly string[]) {
  const command = firstCommandArg(args)
  if (!command) return CliTelemetryEntrypoint.Tui
  if (command === "serve") return CliTelemetryEntrypoint.Server
  return CliTelemetryEntrypoint.Command
}

export function selectCliCommands(args: readonly string[], commands: readonly CliCommandRegistration[]) {
  const command = firstCommandArg(args)
  if (command === "completion") return commands
  const fallback = commands.find((item) => commandNames(item).includes("$0"))
  if (!command) {
    if (args.includes("--help") || args.includes("-h")) return commands
    if (args.includes("--version") || args.includes("-v")) return []
    return fallback ? [fallback] : []
  }

  return [commands.find((item) => commandNames(item).includes(command)) ?? fallback].filter(
    (item): item is CliCommandRegistration => Boolean(item),
  )
}

export async function registerCliCommands<Cli extends CliCommandRegistry<Cli>>(
  cli: Cli,
  commands: readonly CliCommandRegistration[],
) {
  let next = cli
  for (const command of commands) {
    next = next.command(await command.load())
  }
  return next
}
