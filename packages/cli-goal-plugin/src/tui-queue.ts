import type { ThreadGoalStatus } from "../../runtime-protocol/src/index.js"

export type GoalCommandTurnState = {
  goalStatus?: ThreadGoalStatus | null
}

export function goalCommandBypassesPromptQueue(input: { command?: string; arguments?: string }): boolean {
  return input.command === "goal" && isImmediateGoalControl(input.arguments)
}

export function goalCommandInterruptsTurn(
  input: { command?: string; arguments?: string },
  state: GoalCommandTurnState = {},
): boolean {
  if (input.command !== "goal") return false
  const control = input.arguments?.trim()
  if (control === "pause") return true
  return control === "clear" && state.goalStatus === "active"
}

function isImmediateGoalControl(argumentsText?: string): boolean {
  const control = argumentsText?.trim()
  return control === "pause" || control === "clear"
}
