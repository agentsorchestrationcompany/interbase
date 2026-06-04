import type { TuiPluginApi, TuiSlotContext, TuiSlotMap, TuiSlotProps } from "@interbase/plugin/tui"
import { createSlot, createSolidSlotRegistry, type JSX, type SolidPlugin } from "@opentui/solid"
import { isRecord } from "@/util/record"

type RuntimeSlotMap = TuiSlotMap<Record<string, object>>

type Slot = <Name extends string>(props: TuiSlotProps<Name>) => JSX.Element | null
export type HostSlotPlugin<Slots extends Record<string, object> = {}> = SolidPlugin<TuiSlotMap<Slots>, TuiSlotContext>

export type HostPluginApi = TuiPluginApi
export type HostSlots = {
  has: (name: string) => boolean
  refresh: () => void
  register: {
    (plugin: HostSlotPlugin): () => void
    <Slots extends Record<string, object>>(plugin: HostSlotPlugin<Slots>): () => void
  }
}

function empty<Name extends string>(_props: TuiSlotProps<Name>) {
  return null
}

let view: Slot = empty

export const Slot: Slot = (props) => view(props)

function normalizeSlotOutput(value: unknown, context?: Readonly<TuiSlotContext>) {
  if (typeof value === "string" || typeof value === "number")
    return <text fg={context?.theme.current.text}>{String(value)}</text>
  return value as JSX.Element | null
}

type RuntimeSlotRenderer = (context: Readonly<TuiSlotContext>, props: object) => unknown
type RegisteredSlotPlugin = {
  plugin: HostSlotPlugin
  order: number
  slots: HostSlotPlugin["slots"]
}

function normalizeHostSlotPlugin(plugin: HostSlotPlugin): HostSlotPlugin {
  return {
    ...plugin,
    slots: wrapHostSlotRenderers(plugin.slots),
  }
}

function wrapHostSlotRenderers(slots: HostSlotPlugin["slots"]): HostSlotPlugin["slots"] {
  return Object.fromEntries(
    Object.entries(slots).map(([name, render]) => [
      name,
      typeof render === "function"
        ? (context: Readonly<TuiSlotContext>, props: object) =>
            normalizeSlotOutput((render as RuntimeSlotRenderer)(context, props), context)
        : render,
    ]),
  ) as HostSlotPlugin["slots"]
}

function isHostSlotPlugin(value: unknown): value is HostSlotPlugin<Record<string, object>> {
  if (!isRecord(value)) return false
  if (typeof value.id !== "string") return false
  if (!isRecord(value.slots)) return false
  return true
}

export function setupSlots(api: HostPluginApi): HostSlots {
  const reg = createSolidSlotRegistry<RuntimeSlotMap, TuiSlotContext>(
    api.renderer,
    {
      theme: api.theme,
    },
    {
      onPluginError(event) {
        console.error("[tui.slot] plugin error", {
          plugin: event.pluginId,
          slot: event.slot,
          phase: event.phase,
          source: event.source,
          message: event.error.message,
        })
      },
    },
  )
  const registered = new Map<string, RegisteredSlotPlugin>()
  const refreshOffsets = [0, 0.000_001] as const
  let refreshOffsetIndex = 0

  const slot = createSlot<RuntimeSlotMap, TuiSlotContext>(reg)
  view = (props) => normalizeSlotOutput(slot(props))
  return {
    has(name) {
      return Array.from(registered.values()).some((entry) => name in entry.slots)
    },
    refresh() {
      refreshOffsetIndex = refreshOffsetIndex === 0 ? 1 : 0
      for (const [id, entry] of registered) {
        entry.plugin.slots = wrapHostSlotRenderers(entry.slots)
        reg.updateOrder(id, entry.order + refreshOffsets[refreshOffsetIndex])
      }
    },
    register(plugin: HostSlotPlugin) {
      if (!isHostSlotPlugin(plugin)) return () => {}
      const normalized = normalizeHostSlotPlugin(plugin)
      registered.set(plugin.id, { plugin: normalized, order: plugin.order ?? 0, slots: normalized.slots })
      const unregister = reg.register(normalized)
      return () => {
        registered.delete(plugin.id)
        unregister()
      }
    },
  }
}
