import { describe, expect, test } from "bun:test"
import { Effect } from "effect"
import { createLegacyCompatCommands, type CliCommandModule, type LegacyCompatDependencies } from "../src/index"

function createTestDependencies(overrides: Partial<LegacyCompatDependencies> = {}) {
  const deps: LegacyCompatDependencies = {
    effectCmd: (opts) =>
      ({ ...opts, command: Array.isArray(opts.command) ? opts.command[0]! : opts.command }) as CliCommandModule,
    runDoctorEffect: () => Effect.void,
    ...overrides,
  }

  return { deps }
}

describe("Interbase CLI compatibility commands", () => {
  test("creates the public legacy doctor command through injected runtime dependencies", async () => {
    const registered: string[] = []
    let doctorArgs: unknown

    const { deps } = createTestDependencies({
      effectCmd: (opts) => {
        const command = {
          ...opts,
          command: Array.isArray(opts.command) ? opts.command[0]! : opts.command,
        } as CliCommandModule
        registered.push(String(command.command))
        return command
      },
      runDoctorEffect: (args) =>
        Effect.sync(() => {
          doctorArgs = args
        }),
    })

    const commands = createLegacyCompatCommands(deps)
    expect(registered).toEqual(["doctor"])

    await Effect.runPromise(commands.LegacyDoctorCommand.handler({ json: true }))

    expect(doctorArgs).toEqual({ json: true })
  })
})
