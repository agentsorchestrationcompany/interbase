import HomeFooter from "../feature-plugins/home/footer"
import HomeTips from "../feature-plugins/home/tips"
import SidebarContext from "../feature-plugins/sidebar/context"
import SidebarMcp from "../feature-plugins/sidebar/mcp"
import SidebarLsp from "../feature-plugins/sidebar/lsp"
import SidebarTodo from "../feature-plugins/sidebar/todo"
import SidebarFiles from "../feature-plugins/sidebar/files"
import SidebarFooter from "../feature-plugins/sidebar/footer"
import PluginManager from "../feature-plugins/system/plugins"
import SessionV2Debug from "../feature-plugins/system/session-v2"
import type { TuiPlugin, TuiPluginModule } from "@interbase/plugin/tui"
import { interbaseRuntimeContext } from "@/interbase-runtime-context"
import { createMainDbGoalStore } from "@/session/goal-store"
import { emitGoalTelemetry } from "@/plugin/interbase-goal"
import { CliTelemetryEvent } from "@interbase/cli-telemetry"
import { emitCliBehaviorTelemetry } from "@/cli/telemetry"

const aliasTelemetryEvent = {
  created: CliTelemetryEvent.AliasCreated,
  deleted: CliTelemetryEvent.AliasDeleted,
} as const

export type InternalTuiPlugin = TuiPluginModule & {
  id: string
  tui: TuiPlugin
}

export type InternalTuiPluginRegistration = {
  id: string
  load: () => Promise<InternalTuiPlugin>
}

export const INTERNAL_TUI_PLUGINS: InternalTuiPluginRegistration[] = [
  { id: HomeFooter.id, load: async () => HomeFooter },
  { id: HomeTips.id, load: async () => HomeTips },
  {
    id: "internal:provider-catalog",
    load: async () => (await import("@interbase/plugin-provider-catalog")).createProviderCatalogTuiPlugin(),
  },
  {
    id: "interbase-goal-tui",
    load: async () =>
      (await import("@interbase/cli-goal-plugin")).createGoalTuiPlugin({
        store: createMainDbGoalStore(),
        telemetry: emitGoalTelemetry,
      }) as unknown as InternalTuiPlugin,
  },
  {
    id: "interbase-aliases-tui",
    load: async () =>
      (await import("@interbase/cli-aliases-plugin")).createPromptAliasesTuiPlugin({
        stateDirectory: interbaseRuntimeContext.paths.state,
        telemetry: (payload) => emitCliBehaviorTelemetry(aliasTelemetryEvent[payload.event]),
      }),
  },
  { id: SidebarContext.id, load: async () => SidebarContext },
  { id: SidebarMcp.id, load: async () => SidebarMcp },
  { id: SidebarLsp.id, load: async () => SidebarLsp },
  { id: SidebarTodo.id, load: async () => SidebarTodo },
  { id: SidebarFiles.id, load: async () => SidebarFiles },
  { id: SidebarFooter.id, load: async () => SidebarFooter },
  { id: PluginManager.id, load: async () => PluginManager },
  { id: SessionV2Debug.id, load: async () => SessionV2Debug },
]
