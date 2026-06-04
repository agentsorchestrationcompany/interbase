import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@interbase/plugin/tui"
import { createMemo, Show } from "solid-js"
import { providerSidebarCopy } from "@interbase/plugin-provider-catalog"

const id = "internal:sidebar-footer"

function View(props: { api: TuiPluginApi }) {
  const theme = () => props.api.theme.current
  const copy = providerSidebarCopy()
  const has = createMemo(() =>
    props.api.state.provider.some(
      (item) => item.id !== "interbase" || Object.values(item.models).some((model) => model.cost?.input !== 0),
    ),
  )
  const done = createMemo(() => props.api.kv.get("dismissed_getting_started", false))
  const show = createMemo(() => !has() && !done())

  return (
    <box gap={1}>
      <Show when={show()}>
        <box
          backgroundColor={theme().backgroundElement}
          paddingTop={1}
          paddingBottom={1}
          paddingLeft={2}
          paddingRight={2}
          flexDirection="row"
          gap={1}
        >
          <text flexShrink={0} fg={theme().text}>
            ⬖
          </text>
          <box flexGrow={1} gap={1}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={theme().text}>
                <b>Getting started</b>
              </text>
              <text fg={theme().textMuted} onMouseDown={() => props.api.kv.set("dismissed_getting_started", true)}>
                ✕
              </text>
            </box>
            <text fg={theme().textMuted}>{copy.freeModels}</text>
            <text fg={theme().textMuted}>{copy.connect}</text>
            <box flexDirection="row" gap={1} justifyContent="space-between">
              <text fg={theme().text}>{copy.commandTitle}</text>
              <text fg={theme().textMuted}>{copy.slashCommand}</text>
            </box>
          </box>
        </box>
      </Show>
      <text fg={theme().textMuted}>
        <span style={{ fg: theme().success }}>•</span> <b>Interbase</b> <span>{props.api.app.version}</span>
      </text>
    </box>
  )
}

const tui: TuiPlugin = async (api) => {
  api.slots.register({
    order: 100,
    slots: {
      sidebar_footer() {
        return <View api={api} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = {
  id,
  tui,
}

export default plugin
