import { Effect } from "effect"
import {
  CliTelemetryEvent,
  runCliAnalyticsOff,
  runCliAnalyticsOn,
  runCliAnalyticsStatus,
  telemetryStateFilePath,
} from "@interbase/cli-telemetry"
import { interbaseRuntimeContext } from "@/interbase-runtime-context"
import { effectCmd, fail } from "../effect-cmd"
import { emitCliBehaviorTelemetry } from "@/cli/telemetry"

export const AnalyticsCommand = effectCmd<{ command?: string }, void>({
  command: "analytics <command>",
  describe: "manage Interbase CLI analytics",
  instance: false,
  builder: (yargs) => yargs
    .positional("command", {
      choices: ["status", "off", "on"],
      describe: "analytics command to run",
      type: "string",
    })
    .demandOption("command", "Specify analytics status, off, or on."),
  handler: Effect.fn("Cli.analytics")(function* (args: { command?: string }) {
    const input = {
      accessPolicy: interbaseRuntimeContext.accessPolicy,
      environment: {
        DO_NOT_TRACK: process.env.DO_NOT_TRACK,
        INTERBASE_TELEMETRY_DISABLED: process.env.INTERBASE_TELEMETRY_DISABLED,
      },
      path: telemetryStateFilePath(interbaseRuntimeContext.paths),
      write: (text: string) => console.log(text),
    }
    if (args.command === "status") {
      emitCliBehaviorTelemetry(CliTelemetryEvent.AnalyticsStatusViewed)
      yield* Effect.promise(() => runCliAnalyticsStatus(input))
      return
    }
    if (args.command === "off") {
      emitCliBehaviorTelemetry(CliTelemetryEvent.AnalyticsDisabled)
      yield* Effect.promise(() => runCliAnalyticsOff(input))
      return
    }
    if (args.command === "on") {
      yield* Effect.promise(() => runCliAnalyticsOn(input))
      emitCliBehaviorTelemetry(CliTelemetryEvent.AnalyticsEnabled)
      return
    }
    yield* fail("Specify analytics status, off, or on.")
  }),
})
