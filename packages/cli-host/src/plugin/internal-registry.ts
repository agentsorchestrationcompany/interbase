import type { Plugin as PluginInstance } from "@interbase/plugin"
import { isRequiredPlugin } from "@interbase/overlay"
import { AzureAuthPlugin } from "./azure"
import { CloudflareAIGatewayAuthPlugin, CloudflareWorkersAuthPlugin } from "./cloudflare"
import { CodexAuthPlugin } from "./codex"
import { CopilotAuthPlugin } from "./github-copilot/copilot"
import { gitlabAuthPlugin as GitlabAuthPlugin } from "opencode-gitlab-auth"
import { providerCatalogServerPlugin as InterbaseProviderCatalogPlugin } from "@interbase/plugin-provider-catalog"
import { interbaseGoalPlugin as InterbaseGoalPlugin } from "./interbase-goal"

export type InternalPluginRegistration = {
  readonly id: string
  readonly plugin: PluginInstance
  readonly required: boolean
  readonly source: "overlay" | "upstream"
}

export const INTERNAL_PLUGIN_REGISTRY: readonly InternalPluginRegistration[] = [
  { id: "codex-auth", plugin: CodexAuthPlugin, required: true, source: "upstream" },
  { id: "github-copilot-auth", plugin: CopilotAuthPlugin, required: true, source: "upstream" },
  { id: "gitlab-auth", plugin: GitlabAuthPlugin as unknown as PluginInstance, required: true, source: "upstream" },
  { id: "cloudflare-workers-auth", plugin: CloudflareWorkersAuthPlugin, required: true, source: "upstream" },
  { id: "cloudflare-ai-gateway-auth", plugin: CloudflareAIGatewayAuthPlugin, required: true, source: "upstream" },
  { id: "azure-auth", plugin: AzureAuthPlugin, required: true, source: "upstream" },
  {
    id: "interbase-provider-catalog",
    plugin: InterbaseProviderCatalogPlugin as PluginInstance,
    required: isRequiredPlugin("interbase-provider-catalog"),
    source: "overlay",
  },
  {
    id: "interbase-goal",
    plugin: InterbaseGoalPlugin as PluginInstance,
    required: isRequiredPlugin("interbase-goal"),
    source: "overlay",
  },
]

export function requiredInternalPlugins() {
  return INTERNAL_PLUGIN_REGISTRY.filter((registration) => registration.required)
}
