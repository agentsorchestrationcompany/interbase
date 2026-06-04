import { expect, test } from "bun:test"
import { readFileSync } from "fs"
import { join } from "path"
import { ACTIVE_INTERBASE_CLI_COMMANDS, selectCliCommands } from "../../src/cli/command-registry"

test("CLI registers commands through the command registry seam", () => {
  const source = readFileSync(join(import.meta.dir, "../../src/index.ts"), "utf8")

  expect(ACTIVE_INTERBASE_CLI_COMMANDS.length).toBeGreaterThan(0)
  expect(source).toContain(
    'import { ACTIVE_INTERBASE_CLI_COMMANDS, registerCliCommands, selectCliCommands } from "./cli/command-registry"',
  )
  expect(source).toContain("registerCliCommands(cli, selectCliCommands(args, ACTIVE_INTERBASE_CLI_COMMANDS))")
  expect(ACTIVE_INTERBASE_CLI_COMMANDS.some((entry) => entry.command === "remote")).toBe(true)
  expect(selectCliCommandNames(["remote"])).toEqual(["remote"])
  expect(selectCliCommandNames(["mobile"])).toEqual(["remote"])
})

function selectCliCommandNames(args: readonly string[]) {
  return selectCliCommands(args, ACTIVE_INTERBASE_CLI_COMMANDS).map((entry) => entry.command)
}
