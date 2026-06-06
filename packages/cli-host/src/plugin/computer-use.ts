import { createComputerUsePlugin } from "@interbase/cli-computer-use-plugin"
import type { Hooks, Plugin, PluginInput } from "@interbase/plugin"
import { ConfigComputerUse } from "@/config/computer-use"
import type { EffectBridge } from "@/effect/bridge"
import { Config } from "@/config/config"

export type ComputerUseInternalPluginServices = {
  bridge: EffectBridge.Shape
  config: Config.Interface
}

export async function createComputerUseInternalPlugin(_input: PluginInput, services: ComputerUseInternalPluginServices): Promise<Plugin> {
  const [{ createComputerUseHost }, { classifyComputerUseModel }] = await Promise.all([
    import("@/computer-use/host"),
    import("@/computer-use/model-locality"),
  ])
  const plugin = createComputerUsePlugin({
    host: createComputerUseHost(),
    runtime: { runPromise: (effect) => services.bridge.promise(effect) },
    getExposure: async () => ConfigComputerUse.exposure((await services.bridge.promise(services.config.get())).computer_use),
    classifyModel: classifyComputerUseModel,
  })

  return async (input, options) => {
    const hooks = await plugin(input, options)
    return {
      ...hooks,
      "command.execute.consume": async (command, output) => {
        if (command.command !== "computer") return
        Object.assign(output, await handleComputerCommand(command.arguments, services))
      },
    } satisfies Hooks
  }
}

async function handleComputerCommand(argumentsText: string, services: ComputerUseInternalPluginServices) {
  const action = argumentsText.trim().toLowerCase()
  const current = await services.bridge.promise(services.config.get())
  const existing = current.computer_use ?? {}

  if (action === "on" || action === "enable") {
    const next = { ...existing, enabled: true, backend: existing.backend ?? "native" as const }
    await services.bridge.promise(services.config.updateGlobal({ computer_use: next } as Config.Info))
    return commandResult(statusMessage(next, "Computer use enabled."))
  }

  if (action === "off" || action === "disable") {
    return commandResult(statusMessage(existing, "Computer use is always enabled in this build."))
  }

  if (action === "native") {
    const next = { ...existing, enabled: true, backend: "native" as const }
    await services.bridge.promise(services.config.updateGlobal({ computer_use: next } as Config.Info))
    return commandResult(statusMessage(next, "Computer use enabled with the native backend."))
  }

  return commandResult(statusMessage(existing, "Computer use setup"), commandHint())
}

function commandResult(message: string, hint?: string) {
  return { handled: true, message, hint }
}

function statusMessage(config: ConfigComputerUse.Info, title: string) {
  const effective = ConfigComputerUse.effectiveConfig(config)
  return [
    title,
      `Status: ${effective.enabled ? "enabled" : "disabled"}`,
      `Backend: ${effective.backend}`,
      "Use @computer in a prompt, or ask the model to call computer_observe, computer_act, and computer_wait_for.",
  ].join("\n")
}

function commandHint() {
  return [
    "Usage:",
    "/computer - show computer-use status",
    "/computer native - use the native desktop backend",
  ].join("\n")
}
