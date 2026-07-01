import type { ModelLocality } from "@interbase/cli-computer-use-plugin/host"

export function classifyComputerUseModel(input: { providerID?: string; modelID?: string }): ModelLocality {
  const provider = input.providerID?.toLowerCase() ?? ""
  const model = input.modelID?.toLowerCase() ?? ""
  if (provider.includes("ollama") || provider.includes("lmstudio") || provider.includes("local")) return "local"
  if (model.includes("ollama") || model.includes("lmstudio") || model.startsWith("local/")) return "local"
  return "remote"
}

export * as ComputerUseModelLocality from "./model-locality"
