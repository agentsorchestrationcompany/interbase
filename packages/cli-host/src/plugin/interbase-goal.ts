import type { Hooks, PluginInput } from "@interbase/plugin"
import {
  GoalTelemetryEvent,
  interbaseGoalPlugin as createInterbaseGoalPlugin,
  type GoalPluginOptions,
} from "@interbase/cli-goal-plugin"
import { interbaseRuntimeContext } from "@/interbase-runtime-context"
import { createMainDbGoalStore } from "@/session/goal-store"
import { emitCliBehaviorTelemetry } from "@/cli/telemetry"
import { CliTelemetryEvent } from "@interbase/cli-telemetry"

const telemetryByGoalEvent = {
  [GoalTelemetryEvent.Blocked]: CliTelemetryEvent.GoalBlocked,
  [GoalTelemetryEvent.BudgetLimited]: CliTelemetryEvent.GoalBudgetLimited,
  [GoalTelemetryEvent.Cleared]: CliTelemetryEvent.GoalCleared,
  [GoalTelemetryEvent.Completed]: CliTelemetryEvent.GoalCompleted,
  [GoalTelemetryEvent.ContinuationStarted]: CliTelemetryEvent.GoalContinuationStarted,
  [GoalTelemetryEvent.Created]: CliTelemetryEvent.GoalCreated,
  [GoalTelemetryEvent.Edited]: CliTelemetryEvent.GoalEdited,
  [GoalTelemetryEvent.Paused]: CliTelemetryEvent.GoalPaused,
  [GoalTelemetryEvent.Replaced]: CliTelemetryEvent.GoalReplaced,
  [GoalTelemetryEvent.ReplacementCancelled]: CliTelemetryEvent.GoalReplacementCancelled,
  [GoalTelemetryEvent.ResumePromptShown]: CliTelemetryEvent.GoalResumePromptShown,
  [GoalTelemetryEvent.Resumed]: CliTelemetryEvent.GoalResumed,
  [GoalTelemetryEvent.UsageLimited]: CliTelemetryEvent.GoalUsageLimited,
} satisfies Record<GoalTelemetryEvent, CliTelemetryEvent>

export function emitGoalTelemetry(payload: { event: GoalTelemetryEvent; properties?: Parameters<typeof emitCliBehaviorTelemetry>[2] }) {
  emitCliBehaviorTelemetry(telemetryByGoalEvent[payload.event], undefined, payload.properties)
}

export function interbaseGoalPlugin(input: PluginInput, options: GoalPluginOptions = {}): Promise<Hooks> {
  return createInterbaseGoalPlugin(
    { directory: input.directory },
    {
      ...options,
      accessPolicy: options.accessPolicy ?? interbaseRuntimeContext.accessPolicy,
      store: options.store ?? createMainDbGoalStore(),
      telemetry: options.telemetry ?? emitGoalTelemetry,
    },
  ) as Promise<Hooks>
}
