import { describe, expect, test } from "bun:test"
import {
  INTERBASE_CLI_COMMANDS,
  INTERBASE_COMPAT_CLI_COMMANDS,
  createActiveInterbaseCliCommands,
  composeCliCommands,
  registerCliCommands,
  resolveCliTelemetryEntrypoint,
  selectCliCommands,
  shouldEmitCliStartupTelemetry,
  UPSTREAM_CLI_COMMANDS,
  type CliCommandRegistration,
  type CliCommandRegistry,
  type CliCommandModule,
} from "../../src/cli/command-registry"
import { createFeatureAssembly } from "../../src/feature/assembly"
import { createProviderRemoteRuntimeFeatureBundle } from "../../src/feature/provider-remote-runtime"
import { CliTelemetryEntrypoint } from "@interbase/cli-telemetry"
import yargs from "yargs"

interface TestCli extends CliCommandRegistry<TestCli> {
  command(command: CliCommandModule): TestCli
}

describe("CLI command registry", () => {
  test("registers upstream commands with Interbase compatibility commands after remote", () => {
    expect(UPSTREAM_CLI_COMMANDS.map((command) => command.command).slice(0, 4)).toEqual([
      "acp",
      "mcp",
      "$0 [project]",
      "attach [sessionID]",
    ])
    expect(INTERBASE_COMPAT_CLI_COMMANDS.map((command) => command.command)).toEqual(["analytics", "doctor"])
    expect(INTERBASE_CLI_COMMANDS.map((command) => command.command).slice(0, 6)).toEqual([
      "acp",
      "mcp",
      "remote",
      "analytics",
      "doctor",
      "$0 [project]",
    ])
  })

  test("uses command registry authority for startup telemetry entrypoints and exclusions", () => {
    expect(shouldEmitCliStartupTelemetry(["analytics", "off"])).toBe(false)
    expect(shouldEmitCliStartupTelemetry(["run", "hello"])).toBe(true)
    expect(resolveCliTelemetryEntrypoint([])).toBe(CliTelemetryEntrypoint.Tui)
    expect(resolveCliTelemetryEntrypoint(["serve"])).toBe(CliTelemetryEntrypoint.Server)
    expect(resolveCliTelemetryEntrypoint(["run", "hello"])).toBe(CliTelemetryEntrypoint.Command)
  })

  test("applies command modules through yargs-compatible registry seam", async () => {
    const registered: CliCommandModule[] = []
    const cli: TestCli = {
      command(command: CliCommandModule) {
        registered.push(command)
        return this
      },
    }
    const commands = [
      { command: "one", load: async () => ({ command: "one", describe: "one", handler() {} }) },
      { command: "two", load: async () => ({ command: "two", describe: "two", handler() {} }) },
    ] satisfies CliCommandRegistration[]

    expect(await registerCliCommands(cli, commands)).toBe(cli)
    expect(registered.map((command) => command.command)).toEqual(["one", "two"])
  })

  test("extension commands replace public commands by canonical name and alias", () => {
    const commands = composeCliCommands(INTERBASE_CLI_COMMANDS, [
      {
        command: "remote",
        names: ["remote", "mobile"],
        load: async () => ({ command: "remote", describe: "private remote", handler() {} }),
      },
    ])

    expect(commands.filter((command) => command.command === "remote")).toHaveLength(1)
    expect(selectCliCommands(["remote"], commands).map((command) => command.command)).toEqual(["remote"])
    expect(selectCliCommands(["mobile"], commands).map((command) => command.command)).toEqual(["remote"])
  })

  test("selects only the requested command before parsing", () => {
    expect(selectCliCommands(["debug", "startup"], INTERBASE_CLI_COMMANDS).map((command) => command.command)).toEqual([
      "debug",
    ])
    expect(
      selectCliCommands(["--print-logs", "debug", "startup"], INTERBASE_CLI_COMMANDS).map((command) => command.command),
    ).toEqual(["debug"])
    expect(
      selectCliCommands(["--log-level", "DEBUG", "provider", "list"], INTERBASE_CLI_COMMANDS).map(
        (command) => command.command,
      ),
    ).toEqual(["provider"])
  })

  test("builds active CLI commands from an explicit feature assembly", () => {
    const commands = createActiveInterbaseCliCommands(
      createFeatureAssembly({
        publicBundles: [],
        extensionBundles: [
          {
            id: "provider-extra",
            kind: "hosted",
            commands: [{ command: "provider-extra", load: async () => ({ command: "provider-extra", handler() {} }) }],
          },
        ],
      }),
    )

    expect(selectCliCommands(["provider-extra"], commands).map((command) => command.command)).toEqual([
      "provider-extra",
    ])
  })

  test("threads hosted remote subtree commands through explicit active CLI command assembly", async () => {
    let called = false
    const commands = createActiveInterbaseCliCommands(
      createFeatureAssembly({
        extensionBundles: [
          createProviderRemoteRuntimeFeatureBundle({
            remoteCommandTree: [
              {
                command: "setup",
                describe: "setup",
                handler() {
                  called = true
                },
              },
            ],
          }),
        ],
      }),
    )

    const cli = yargs([]).exitProcess(false)
    await registerCliCommands(cli, selectCliCommands(["remote", "setup"], commands))
    await cli.parseAsync(["remote", "setup"])

    expect(called).toBe(true)
  })

  test("preserves default, alias, help, and version command selection", () => {
    expect(selectCliCommands([], INTERBASE_CLI_COMMANDS).map((command) => command.command)).toEqual(["$0 [project]"])
    expect(selectCliCommands(["auth", "login"], INTERBASE_CLI_COMMANDS).map((command) => command.command)).toEqual([
      "provider",
    ])
    expect(selectCliCommands(["plug", "list"], INTERBASE_CLI_COMMANDS).map((command) => command.command)).toEqual([
      "plugin",
    ])
    expect(selectCliCommands(["--help"], INTERBASE_CLI_COMMANDS)).toHaveLength(INTERBASE_CLI_COMMANDS.length)
    expect(selectCliCommands(["provider", "--help"], INTERBASE_CLI_COMMANDS).map((command) => command.command)).toEqual(
      ["provider"],
    )
    expect(selectCliCommands(["--version"], INTERBASE_CLI_COMMANDS)).toEqual([])
  })
})
