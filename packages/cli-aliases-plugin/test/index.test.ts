import { describe, expect, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import {
  ALIASES_TUI_PLUGIN_ID,
  JsonFilePromptAliasesStore,
  MAX_PROMPT_ALIAS_CHARS,
  MAX_PROMPT_ALIAS_PROMPT_CHARS,
  MemoryPromptAliasesStore,
  PromptAliasTelemetryEvent,
  PromptAliasesManager,
  assertValidPromptAlias,
  assertValidPromptAliasPrompt,
  createPromptAliasesManageCommand,
  createPromptAliasesStateStore,
  createPromptAliasesTuiPlugin,
  emptyPromptAliasesSnapshot,
  normalizePromptAlias,
  promptAliasPromptPreview,
  promptAliasPromptValidationError,
  promptAliasValidationError,
  promptAliasesTuiPlugin,
  resolvePromptAlias,
  showPromptAliasActionsDialog,
  showPromptAliasNameDialog,
  showPromptAliasesDialog,
} from "../src/index.js"
import type {
  TuiCommand,
  TuiDialogPromptProps,
  TuiDialogSelectOption,
  TuiDialogSelectProps,
  TuiPluginApi,
  TuiPluginMeta,
  TuiToast,
} from "@interbase/plugin/tui"

type TestDialogValue =
  | {
      action: "back" | "delete" | "set" | "update"
    }
  | {
      alias: string | null
    }

type CapturedSelect = {
  title: string
  options: TuiDialogSelectOption<TestDialogValue>[]
  skipFilter?: boolean
}

type TestTuiApi = {
  api: TuiPluginApi
  commandRegistrations: TuiCommand[][]
  prompts: TuiDialogPromptProps[]
  selects: CapturedSelect[]
  toasts: TuiToast[]
}

const pluginMeta: TuiPluginMeta = {
  fingerprint: "test",
  first_time: 0,
  id: "test",
  last_time: 0,
  load_count: 1,
  source: "internal",
  spec: "internal:test",
  state: "same",
  target: "test",
  time_changed: 0,
}

function createTestTuiApi(): TestTuiApi {
  const commandRegistrations: TuiCommand[][] = []
  const prompts: TuiDialogPromptProps[] = []
  const selects: CapturedSelect[] = []
  const toasts: TuiToast[] = []
  const api: TuiPluginApi = {
    app: { version: "test" },
    client: undefined as never,
    command: {
      register(callback: () => TuiCommand[]) {
        commandRegistrations.push(callback())
        return () => {}
      },
      show() {},
      trigger(_value: string) {},
    },
    event: {
      on() {
        return () => {}
      },
    },
    keybind: {
      create() {
        return {
          all: {},
          get() {
            return ""
          },
          match() {
            return false
          },
          print() {
            return ""
          },
        }
      },
      match() {
        return false
      },
      print() {
        return ""
      },
    },
    kv: {
      get<Value>(_key: string, fallback?: Value): Value {
        return fallback as Value
      },
      ready: true,
      set() {},
    },
    lifecycle: {
      onDispose() {
        return () => {}
      },
      signal: new AbortController().signal,
    },
    plugins: {
      activate() {
        return Promise.resolve(false)
      },
      add() {
        return Promise.resolve(false)
      },
      deactivate() {
        return Promise.resolve(false)
      },
      install() {
        return Promise.resolve({ ok: false, message: "not implemented" })
      },
      list() {
        return []
      },
    },
    renderer: undefined as never,
    route: {
      current: { name: "home" },
      navigate() {},
      register() {
        return () => {}
      },
    },
    slots: {
      refresh() {},
      register() {
        return "test"
      },
    },
    state: {
      config: undefined as never,
      lsp() {
        return []
      },
      mcp() {
        return []
      },
      part() {
        return []
      },
      path: {
        config: "",
        directory: "",
        state: "",
        worktree: "",
      },
      provider: [],
      ready: true,
      session: {
        count() {
          return 0
        },
        diff() {
          return []
        },
        messages() {
          return []
        },
        permission() {
          return []
        },
        question() {
          return []
        },
        status() {
          return undefined
        },
        todo() {
          return []
        },
      },
      vcs: undefined,
    },
    theme: undefined as never,
    tuiConfig: undefined as never,
    ui: {
      Dialog() {
        return undefined as never
      },
      DialogAlert() {
        return undefined as never
      },
      DialogConfirm() {
        return undefined as never
      },
      DialogSelect<Value>(props: TuiDialogSelectProps<Value>) {
        selects.push({
          title: props.title,
          options: props.options.map((option) => option as TuiDialogSelectOption<TestDialogValue>),
          skipFilter: props.skipFilter,
        })
        return undefined as never
      },
      DialogPrompt(props: TuiDialogPromptProps) {
        prompts.push(props)
        return undefined as never
      },
      Prompt() {
        return undefined as never
      },
      Slot() {
        return undefined
      },
      dialog: {
        clear() {},
        depth: 0,
        open: false,
        replace(render: Parameters<TuiPluginApi["ui"]["dialog"]["replace"]>[0]) {
          render()
        },
        setSize(_size: "medium" | "large" | "xlarge") {},
        size: "medium" as const,
      },
      toast(input: TuiToast) {
        toasts.push(input)
      },
      openProviderDialog() {},
    },
  }
  return { api, commandRegistrations, prompts, selects, toasts }
}

function latestSelect(testApi: TestTuiApi): CapturedSelect {
  const select = testApi.selects[testApi.selects.length - 1]
  if (!select) throw new Error("expected a captured select dialog")
  return select
}

function latestPrompt(testApi: TestTuiApi): TuiDialogPromptProps {
  const prompt = testApi.prompts[testApi.prompts.length - 1]
  if (!prompt) throw new Error("expected a captured prompt dialog")
  return prompt
}

function selectOption(select: CapturedSelect, title: string): void {
  const option = select.options.find((entry) => entry.title === title)
  if (!option) throw new Error(`expected option ${title}`)
  option.onSelect?.()
}

describe("Interbase prompt aliases", () => {
  test("stores, resolves, updates, and deletes exact prompt aliases", () => {
    const store = new MemoryPromptAliasesStore()
    const manager = new PromptAliasesManager({ store, now: () => 1_000 })

    expect(normalizePromptAlias("  ship  ")).toBe("ship")
    expect(promptAliasValidationError("")).toBe("Alias cannot be empty.")
    expect(promptAliasValidationError("ship it")).toBe("Alias cannot contain spaces.")
    expect(promptAliasValidationError("/ship")).toBe("Alias cannot start with /.")
    expect(promptAliasValidationError("x".repeat(MAX_PROMPT_ALIAS_CHARS + 1))).toBe(
      `Alias must be ${MAX_PROMPT_ALIAS_CHARS} characters or fewer.`,
    )
    expect(promptAliasValidationError("ship")).toBeNull()
    expect(() => assertValidPromptAlias("ship it")).toThrow("Alias cannot contain spaces.")

    expect(promptAliasPromptValidationError("")).toBe("Alias prompt cannot be empty.")
    expect(promptAliasPromptValidationError("x".repeat(MAX_PROMPT_ALIAS_PROMPT_CHARS + 1))).toBe(
      `Alias prompt must be ${MAX_PROMPT_ALIAS_PROMPT_CHARS} characters or fewer.`,
    )
    expect(promptAliasPromptValidationError("Ship it")).toBeNull()
    expect(() => assertValidPromptAliasPrompt("")).toThrow("Alias prompt cannot be empty.")
    expect(promptAliasPromptPreview("Ship\n\n  the worktree with tests")).toBe("Ship the worktree with tests")

    manager.set("ship", " Ship the current diff ")
    manager.set("fix", "Fix the failing tests")
    expect(manager.list().map((entry) => entry.alias)).toEqual(["fix", "ship"])
    expect(manager.get(" ship ")).toEqual({ alias: "ship", prompt: "Ship the current diff", updatedAt: 1 })
    expect(manager.resolve(" ship ")?.prompt).toBe("Ship the current diff")
    expect(manager.resolve("please ship")).toBeNull()
    expect(manager.resolve("ship now")).toBeNull()

    manager.set("ship", "Updated prompt")
    expect(manager.get("ship")?.prompt).toBe("Updated prompt")
    expect(manager.delete(" ship ")).toBe(true)
    expect(manager.delete("ship")).toBe(false)
    expect(manager.get("ship")).toBeNull()
  })

  test("persists prompt alias state through the local JSON state store", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "interbase-aliases-"))
    const file = path.join(dir, "prompt-aliases.json")
    const manager = new PromptAliasesManager({ store: new JsonFilePromptAliasesStore(file), now: () => 2_000 })

    manager.set("review", "Review the staged changes")

    const raw = await readFile(file, "utf8")
    expect(raw).toContain('"version": 1')
    expect(raw).toContain("Review the staged changes")
    expect(resolvePromptAlias({ inputText: " review ", stateDirectory: dir })).toEqual({
      alias: "review",
      prompt: "Review the staged changes",
      updatedAt: 2,
    })
    expect(resolvePromptAlias({ inputText: "please review", stateDirectory: dir })).toBeNull()
  })

  test("declares TUI command and adapters for managing aliases", async () => {
    let aliasesOpened = false
    const aliasesManage = createPromptAliasesManageCommand({
      open: () => {
        aliasesOpened = true
      },
    })
    expect(aliasesManage).toMatchObject({
      title: "Manage aliases",
      value: "aliases.manage",
      slash: { name: "aliases" },
    })
    aliasesManage.onSelect?.()
    expect(aliasesOpened).toBe(true)

    const testApi = createTestTuiApi()
    const aliasesStore = new MemoryPromptAliasesStore()
    await promptAliasesTuiPlugin({ aliasesStore })(testApi.api, undefined, pluginMeta)
    expect(testApi.commandRegistrations).toHaveLength(1)
    expect(testApi.commandRegistrations[0]?.map((command) => command.value)).toEqual(["aliases.manage"])

    const manage = testApi.commandRegistrations[0]?.find((command) => command.value === "aliases.manage")
    manage?.onSelect?.()
    expect(latestSelect(testApi).title).toBe("Aliases")

    const module = createPromptAliasesTuiPlugin({ aliasesStore })
    expect(module.id).toBe(ALIASES_TUI_PLUGIN_ID)
    const moduleApi = createTestTuiApi()
    await module.tui(moduleApi.api, undefined, pluginMeta)
    expect(moduleApi.commandRegistrations[0]?.map((command) => command.value)).toEqual(["aliases.manage"])

    expect(createPromptAliasesTuiPlugin().id).toBe(ALIASES_TUI_PLUGIN_ID)

    const defaultTuiApi = createTestTuiApi()
    await promptAliasesTuiPlugin({ stateDirectory: mkdtempSync(path.join(os.tmpdir(), "interbase-aliases-plugin-")) })(
      defaultTuiApi.api,
      undefined,
      pluginMeta,
    )
    expect(defaultTuiApi.commandRegistrations[0]?.map((command) => command.value)).toEqual(["aliases.manage"])
  })

  test("drives TUI dialog flow for prompt aliases", () => {
    const manager = new PromptAliasesManager({ store: new MemoryPromptAliasesStore(), now: () => 5_000 })
    manager.set("review", "Review the current branch")
    const testApi = createTestTuiApi()
    const telemetry: PromptAliasTelemetryEvent[] = []
    const emitTelemetry = (payload: { event: PromptAliasTelemetryEvent }) => telemetry.push(payload.event)

    showPromptAliasesDialog(testApi.api, manager, emitTelemetry)
    const aliases = latestSelect(testApi)
    expect(aliases).toMatchObject({ title: "Aliases", skipFilter: true })
    expect(aliases.options.map((option) => option.title)).toEqual(["Add alias", "review"])

    selectOption(aliases, "review")
    expect(latestSelect(testApi).title).toBe("Alias review")

    showPromptAliasesDialog(testApi.api, manager, emitTelemetry)
    const refreshedAliases = latestSelect(testApi)

    selectOption(refreshedAliases, "Add alias")
    const namePrompt = latestPrompt(testApi)
    expect(namePrompt).toMatchObject({ title: "Alias", placeholder: "Enter alias" })
    namePrompt.onConfirm?.("bad alias")
    expect(testApi.toasts[testApi.toasts.length - 1]).toMatchObject({
      message: "Alias cannot contain spaces.",
      variant: "error",
    })

    namePrompt.onConfirm?.(" ship ")
    const promptDialog = latestPrompt(testApi)
    expect(promptDialog).toMatchObject({ title: "Alias ship", placeholder: "Enter prompt", value: "" })
    promptDialog.onConfirm?.(" ")
    expect(testApi.toasts[testApi.toasts.length - 1]).toMatchObject({
      message: "Alias prompt cannot be empty.",
      variant: "error",
    })
    promptDialog.onConfirm?.(" Ship the current diff ")
    expect(manager.get("ship")).toEqual({ alias: "ship", prompt: "Ship the current diff", updatedAt: 5 })
    expect(testApi.toasts[testApi.toasts.length - 1]).toMatchObject({ message: "Alias ship saved", variant: "success" })
    expect(telemetry).toEqual([PromptAliasTelemetryEvent.Created])

    showPromptAliasActionsDialog(testApi.api, manager, "review", emitTelemetry)
    const actions = latestSelect(testApi)
    expect(actions.options.map((option) => option.title)).toEqual(["Update alias", "Delete alias", "Back"])
    selectOption(actions, "Back")
    expect(latestSelect(testApi).title).toBe("Aliases")

    showPromptAliasActionsDialog(testApi.api, manager, "review", emitTelemetry)
    selectOption(latestSelect(testApi), "Update alias")
    const updatePrompt = latestPrompt(testApi)
    expect(updatePrompt).toMatchObject({ title: "Alias review", value: "Review the current branch" })
    updatePrompt.onConfirm?.("Review tests")
    expect(manager.get("review")?.prompt).toBe("Review tests")
    expect(telemetry).toEqual([PromptAliasTelemetryEvent.Created])

    showPromptAliasActionsDialog(testApi.api, manager, "review", emitTelemetry)
    selectOption(latestSelect(testApi), "Delete alias")
    expect(manager.get("review")).toBeNull()
    expect(testApi.toasts[testApi.toasts.length - 1]).toMatchObject({
      message: "Alias review deleted",
      variant: "success",
    })
    expect(telemetry).toEqual([PromptAliasTelemetryEvent.Created, PromptAliasTelemetryEvent.Deleted])

    showPromptAliasNameDialog(testApi.api, manager)
    expect(latestPrompt(testApi).title).toBe("Alias")
  })

  test("fails closed on malformed persisted alias state", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "interbase-aliases-invalid-"))
    const file = path.join(dir, "prompt-aliases.json")
    const store = createPromptAliasesStateStore(file)

    await Bun.write(file, JSON.stringify({ version: 1, aliases: {} }))
    expect(() => store.read()).toThrow()

    await Bun.write(
      file,
      JSON.stringify({ version: 1, aliases: [{ alias: "bad alias", prompt: "Bad", updatedAt: 1 }] }),
    )
    expect(() => store.read()).toThrow()

    await Bun.write(file, JSON.stringify({ version: 1, aliases: [{ alias: "ship", prompt: "", updatedAt: 1 }] }))
    expect(() => store.read()).toThrow()

    await Bun.write(
      file,
      JSON.stringify({
        version: 1,
        aliases: [
          { alias: "ship", prompt: "First", updatedAt: 1 },
          { alias: "ship", prompt: "Second", updatedAt: 2 },
        ],
      }),
    )
    expect(() => store.read()).toThrow()
  })

  test("normalizes duplicate in-memory snapshots without recovering from string shape", () => {
    const manager = new PromptAliasesManager({
      store: new MemoryPromptAliasesStore({
        version: 1,
        aliases: [
          { alias: "ship", prompt: "First authority", updatedAt: 1 },
          { alias: "ship", prompt: "Ignored duplicate", updatedAt: 2 },
          { alias: "fix", prompt: "Earlier alias", updatedAt: 3 },
        ],
      }),
    })

    expect(manager.list().map((alias) => alias.prompt)).toEqual(["Earlier alias", "First authority"])
  })

  test("provides an empty default snapshot", () => {
    expect(emptyPromptAliasesSnapshot()).toEqual({ version: 1, aliases: [] })
  })
})
