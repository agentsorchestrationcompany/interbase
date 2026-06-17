import { RGBA } from "@opentui/core"
import { createMemo, createSignal, For, onCleanup } from "solid-js"
import { useKV } from "@tui/context/kv"
import { tint, useTheme } from "@tui/context/theme"

export const SHIMMER_STATUS_PERIOD = 1400
export const SHIMMER_STATUS_DURATION = SHIMMER_STATUS_PERIOD * 2

export function ShimmerStatus(props: { message: string; startedAt: number; color?: RGBA }) {
  const { theme } = useTheme()
  const kv = useKV()
  const animationsEnabled = kv.get("animations_enabled", true)
  const [now, setNow] = createSignal(performance.now())
  const timer = animationsEnabled ? setInterval(() => setNow(performance.now()), 50) : undefined

  onCleanup(() => {
    if (timer) clearInterval(timer)
  })

  const chars = createMemo(() => props.message.split(""))
  const baseColor = createMemo(() => props.color ?? theme.success)
  const peak = createMemo(() => tint(theme.primary, RGBA.fromInts(255, 255, 255), 0.86))

  return (
    <text fg={baseColor()}>
      <For each={chars()}>
        {(char, index) => {
          const color = createMemo(() => {
            const base = baseColor()
            if (!animationsEnabled) return base
            if (char === " ") return base
            const phase = ((now() - props.startedAt) % SHIMMER_STATUS_PERIOD) / SHIMMER_STATUS_PERIOD
            const head = phase * (chars().length + 8) - 4
            const distance = Math.abs(index() - head)
            const core = distance < 1.4 ? 1 - distance / 1.4 : 0
            const soft = distance < 6 ? (1 - distance / 6) * 0.38 : 0
            return tint(base, peak(), Math.min(1, core * 0.95 + soft))
          })

          return <span style={{ fg: color() }}>{char}</span>
        }}
      </For>
    </text>
  )
}
