/** @jsxImportSource @opentui/solid */
import { BoxRenderable, TextareaRenderable } from "@opentui/core"
import { test, expect } from "bun:test"
import { Global } from "@interbase/core/global"
import { testRender } from "@opentui/solid"
import { EventEmitter } from "node:events"
import { createSignal, onMount } from "solid-js"
import { ArgsProvider } from "../../../src/cli/cmd/tui/context/args"
import { EditorContextProvider } from "../../../src/cli/cmd/tui/context/editor"
import { ExitProvider } from "../../../src/cli/cmd/tui/context/exit"
import { KVProvider } from "../../../src/cli/cmd/tui/context/kv"
import { ProjectProvider } from "../../../src/cli/cmd/tui/context/project"
import { SDKProvider, type EventSource } from "../../../src/cli/cmd/tui/context/sdk"
import { SyncProvider } from "../../../src/cli/cmd/tui/context/sync"
import { ThemeProvider } from "../../../src/cli/cmd/tui/context/theme"
import { TuiConfigProvider } from "../../../src/cli/cmd/tui/context/tui-config"
import { KeybindProvider } from "../../../src/cli/cmd/tui/context/keybind"
import { CommandProvider } from "../../../src/cli/cmd/tui/component/dialog-command"
import { DialogProvider } from "../../../src/cli/cmd/tui/ui/dialog"
import { FrecencyProvider } from "../../../src/cli/cmd/tui/component/prompt/frecency"
import { type AutocompleteRef, Autocomplete } from "../../../src/cli/cmd/tui/component/prompt/autocomplete"
import type { PromptInfo } from "../../../src/cli/cmd/tui/component/prompt/history"

const worktree = "/tmp/interbase"
const directory = `${worktree}/packages/interbase`

function testRenderContext() {
  return Object.assign(new EventEmitter(), {
    width: 80,
    height: 24,
    frameId: 0,
    selectionBg: undefined,
    selectionFg: undefined,
    addToHitGrid() {},
    pushHitGridScissorRect() {},
    popHitGridScissorRect() {},
    clearHitGridScissorRects() {},
    requestRender() {},
    setCursorPosition() {},
    setCursorStyle() {},
    setCursorColor() {},
    setMousePointer() {},
    widthMethod: "wcwidth" as const,
    capabilities: null,
    requestLive() {},
    dropLive() {},
    hasSelection: false,
    getSelection: () => null,
    requestSelectionUpdate() {},
    currentFocusedRenderable: null,
    currentFocusedEditor: null,
    focusRenderable() {},
    blurRenderable() {},
    registerLifecyclePass() {},
    unregisterLifecyclePass() {},
    getLifecyclePasses: () => new Set(),
    keyInput: {},
    _internalKeyInput: {},
    clearSelection() {},
    startSelection() {},
    updateSelection() {},
  })
}

function eventSource(): EventSource {
  return {
    subscribe: async () => () => {},
  }
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  })
}

function createFetch() {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input))

    switch (url.pathname) {
      case "/agent":
      case "/command":
      case "/formatter":
      case "/lsp":
        return json([])
      case "/config":
      case "/experimental/resource":
      case "/mcp":
      case "/provider/auth":
      case "/session/status":
        return json({})
      case "/config/providers":
        return json({ providers: {}, default: {} })
      case "/experimental/console":
        return json({ consoleManagedProviders: [], switchableOrgCount: 0 })
      case "/path":
        return json({ home: "", state: Global.Path.state, config: "", worktree, directory })
      case "/project/current":
        return json({ id: "proj_test" })
      case "/provider":
        return json({ all: [], default: {}, connected: [] })
      case "/session":
        return json([])
      case "/vcs":
        return json({ branch: "main" })
    }

    throw new Error(`unexpected request: ${url.pathname}`)
  }) as typeof globalThis.fetch
}

async function wait(fn: () => boolean, timeout = 2000) {
  const start = Date.now()
  while (!fn()) {
    if (Date.now() - start > timeout) throw new Error("timed out waiting for condition")
    await Bun.sleep(10)
  }
}

test("rendered autocomplete preserves a leading slash command typed before existing text", async () => {
  const kvPath = `${Global.Path.state}/kv.json`
  const frecencyPath = `${Global.Path.state}/frecency.jsonl`
  await Bun.write(kvPath, "{}")
  await Bun.write(frecencyPath, "")

  const input = new TextareaRenderable(testRenderContext() as any, { id: "test", width: 80, height: 5 })
  const anchor = { x: 0, y: 0, width: 80, parent: { x: 0, y: 0 } } as BoxRenderable
  const fetch = createFetch()
  const systemTheme = {
    available: false,
    current: () => undefined,
    observe: () => undefined,
  }

  let autocomplete!: AutocompleteRef
  let promptState: PromptInfo = { input: "", parts: [] }
  let setValue!: (value: string) => void
  let mounted = false

  const app = await testRender(() => {
    const [value, nextValue] = createSignal("")
    setValue = nextValue

    const Probe = () => {
      onMount(() => {
        mounted = true
      })

      return (
        <Autocomplete
          sessionID="ses_test"
          ref={(ref) => {
            if (ref) autocomplete = ref
          }}
          anchor={() => anchor}
          input={() => input}
          setPrompt={(cb) => {
            cb(promptState)
          }}
          setExtmark={() => {}}
          value={value()}
          fileStyleId={0}
          agentStyleId={0}
          promptPartTypeId={() => 0}
        />
      )
    }

    return (
      <TuiConfigProvider config={{ keybinds: {}, theme: "interbase" }}>
        <ArgsProvider>
          <SDKProvider url="http://test" directory={directory} fetch={fetch} events={eventSource()}>
            <ProjectProvider>
              <KVProvider>
                <ExitProvider>
                  <SyncProvider>
                    <ThemeProvider mode="dark" systemTheme={systemTheme}>
                      <KeybindProvider>
                        <DialogProvider>
                          <CommandProvider>
                            <EditorContextProvider>
                              <FrecencyProvider>
                                <Probe />
                              </FrecencyProvider>
                            </EditorContextProvider>
                          </CommandProvider>
                        </DialogProvider>
                      </KeybindProvider>
                    </ThemeProvider>
                  </SyncProvider>
                </ExitProvider>
              </KVProvider>
            </ProjectProvider>
          </SDKProvider>
        </ArgsProvider>
      </TuiConfigProvider>
    )
  })

  try {
    await wait(() => mounted && Boolean(autocomplete))

    input.setText("existing text")
    input.cursorOffset = 0

    autocomplete.onKeyDown({ name: "/", ctrl: false, meta: false, shift: false } as never)
    expect(autocomplete.visible).toBe("/")

    input.setText("/review existing text")
    input.cursorOffset = "/review ".length
    promptState.input = input.plainText
    setValue(input.plainText)
    autocomplete.onInput(input.plainText)

    expect(autocomplete.visible).toBe(false)
    expect(input.plainText).toBe("/review existing text")
    expect(promptState.input).toBe("/review existing text")
  } finally {
    app.renderer.destroy()
    await Bun.file(kvPath)
      .delete()
      .catch(() => {})
    await Bun.file(frecencyPath)
      .delete()
      .catch(() => {})
  }
})
