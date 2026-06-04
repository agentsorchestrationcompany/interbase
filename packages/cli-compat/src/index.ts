import { Effect } from "effect"

export type LegacyArgv<Args = unknown> = {
  positional(...args: readonly unknown[]): LegacyArgv<Args>
  option(...args: readonly unknown[]): LegacyArgv<Args>
  command(...args: readonly unknown[]): LegacyArgv<Args>
  demandCommand(...args: readonly unknown[]): LegacyArgv<Args>
}

export type CliCommandModule = {
  command?: string | readonly string[]
  aliases?: string | readonly string[]
  describe?: string | false
  builder?: unknown
  handler?: unknown
}

export type LegacyEffectCommandFactory = <Args, A>(opts: {
  command: string | readonly string[]
  aliases?: string | readonly string[]
  describe: string | false
  builder?: (yargs: LegacyArgv) => LegacyArgv<Args>
  instance?: boolean | ((args: Args) => boolean)
  directory?: (args: Args) => string
  handler: (args: Args) => Effect.Effect<A, unknown, unknown>
}) => CliCommandModule

export type LegacyCompatDependencies = {
  effectCmd: LegacyEffectCommandFactory
  runDoctorEffect(args: unknown): Effect.Effect<unknown, unknown, unknown>
}

export function createLegacyCompatCommands(deps: LegacyCompatDependencies) {
  const LegacyDoctorCommand = deps.effectCmd({
    command: "doctor",
    describe: "show Interbase diagnostic information",
    handler: deps.runDoctorEffect,
  })

  return {
    LegacyDoctorCommand,
  }
}
