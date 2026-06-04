import { effectCmd } from "../effect-cmd"
import { runDebugInfoEffect } from "./debug/index"
import { createLegacyCompatCommands, type LegacyEffectCommandFactory } from "@interbase/cli-compat"
import { CliTelemetryEvent } from "@interbase/cli-telemetry"
import { emitCliBehaviorTelemetry } from "@/cli/telemetry"

const legacyCompatCommands = createLegacyCompatCommands({
  effectCmd: effectCmd as LegacyEffectCommandFactory,
  runDoctorEffect: () => {
    emitCliBehaviorTelemetry(CliTelemetryEvent.DoctorRun)
    return runDebugInfoEffect()
  },
})

export const LegacyDoctorCommand = legacyCompatCommands.LegacyDoctorCommand
