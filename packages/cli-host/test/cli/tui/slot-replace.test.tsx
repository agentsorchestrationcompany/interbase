/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { createSlot, createSolidSlotRegistry, testRender, useRenderer } from "@opentui/solid"
import { onMount } from "solid-js"
import { setupSlots, Slot as RuntimeSlot } from "../../../src/cli/cmd/tui/plugin/slots"

type Slots = {
  prompt: {}
}

test("replace slot mounts plugin content once", async () => {
  let mounts = 0

  const Probe = () => {
    onMount(() => {
      mounts += 1
    })

    return <box />
  }

  const App = () => {
    const renderer = useRenderer()
    const reg = createSolidSlotRegistry<Slots>(renderer, {})
    const Slot = createSlot(reg)

    reg.register({
      id: "plugin",
      slots: {
        prompt() {
          return <Probe />
        },
      },
    })

    return (
      <box>
        <Slot name="prompt" mode="replace">
          <box />
        </Slot>
      </box>
    )
  }

  await testRender(() => <App />)

  expect(mounts).toBe(1)
})

test("host slot refresh rerenders registered slot content", async () => {
  let refresh = () => {}
  let renders = 0

  const App = () => {
    const slots = setupSlots({ renderer: useRenderer(), theme: {} } as never)
    refresh = slots.refresh
    slots.register({
      id: "plugin",
      slots: {
        prompt_status() {
          renders += 1
          return <box />
        },
      },
    })

    return <RuntimeSlot name="prompt_status" />
  }

  await testRender(() => <App />)
  expect(renders).toBe(1)
  refresh()
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(renders).toBe(2)
})
