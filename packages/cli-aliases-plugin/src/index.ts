import {
  createSyncJsonStateStore,
  stateFilePathFromAbsolute,
  type JsonStateSchema,
  type JsonValue,
  type RuntimeAccessPolicyInput,
  type StateFilePath,
  type SyncJsonStateStore,
} from "@interbase/cli-local-state"
import path from "node:path"
import type { TuiCommand, TuiDialogSelectOption, TuiPlugin, TuiPluginApi, TuiPluginModule } from "@interbase/plugin/tui"

export const ALIASES_TUI_PLUGIN_ID = "interbase-aliases-tui"
export const ALIASES_COMMAND = "aliases"
export const MAX_PROMPT_ALIAS_CHARS = 80
export const MAX_PROMPT_ALIAS_PROMPT_CHARS = 20_000

export enum PromptAliasTelemetryEvent {
  Created = "created",
  Deleted = "deleted",
}

export type PromptAliasTelemetryPayload = {
  event: PromptAliasTelemetryEvent
}

export type StoredPromptAlias = {
  alias: string
  prompt: string
  updatedAt: number
}

export type PromptAliasesSnapshot = {
  version: 1
  aliases: StoredPromptAlias[]
}

export interface PromptAliasesStore {
  load(): PromptAliasesSnapshot
  save(snapshot: PromptAliasesSnapshot): void
}

export type PromptAliasesManagerOptions = {
  now?: () => number
  store: PromptAliasesStore
}

export type PromptAliasesTuiPluginOptions = {
  aliasesStore?: PromptAliasesStore
  now?: () => number
  stateDirectory?: string
  telemetry?: (payload: PromptAliasTelemetryPayload) => void
}

export type PromptAliasesTuiPluginModule = TuiPluginModule & { id: typeof ALIASES_TUI_PLUGIN_ID }

type AliasDialogSelection = {
  alias: string | null
}

type AliasAction = "back" | "delete" | "set" | "update"

type AliasActionSelection = {
  action: AliasAction
}

export class JsonFilePromptAliasesStore implements PromptAliasesStore {
  private readonly stateStore: SyncJsonStateStore<PromptAliasesSnapshot>

  constructor(filePath: string) {
    this.stateStore = createPromptAliasesStateStore(filePath)
  }

  load(): PromptAliasesSnapshot {
    return this.stateStore.read()
  }

  save(snapshot: PromptAliasesSnapshot): void {
    this.stateStore.write(snapshot)
  }
}

export class MemoryPromptAliasesStore implements PromptAliasesStore {
  private snapshot: PromptAliasesSnapshot

  constructor(snapshot: PromptAliasesSnapshot = emptyPromptAliasesSnapshot()) {
    this.snapshot = structuredClone(snapshot)
  }

  load(): PromptAliasesSnapshot {
    return structuredClone(this.snapshot)
  }

  save(snapshot: PromptAliasesSnapshot): void {
    this.snapshot = structuredClone(snapshot)
  }
}

export class PromptAliasesManager {
  private readonly now: () => number
  private readonly store: PromptAliasesStore

  constructor(options: PromptAliasesManagerOptions) {
    this.now = options.now ?? Date.now
    this.store = options.store
  }

  list(): StoredPromptAlias[] {
    return normalizePromptAliasesSnapshot(this.store.load()).aliases
  }

  get(alias: string): StoredPromptAlias | null {
    const normalized = normalizePromptAlias(alias)
    if (!normalized) return null
    return normalizePromptAliasesSnapshot(this.store.load()).aliases.find((entry) => entry.alias === normalized) ?? null
  }

  set(alias: string, prompt: string): StoredPromptAlias {
    const normalizedAlias = normalizePromptAlias(alias)
    assertValidPromptAlias(normalizedAlias)
    const normalizedPrompt = normalizePromptAliasPrompt(prompt)
    assertValidPromptAliasPrompt(normalizedPrompt)
    const entry: StoredPromptAlias = {
      alias: normalizedAlias,
      prompt: normalizedPrompt,
      updatedAt: Math.trunc(this.now() / 1000),
    }
    const snapshot = normalizePromptAliasesSnapshot(this.store.load())
    this.store.save({
      version: 1,
      aliases: sortPromptAliases([...snapshot.aliases.filter((item) => item.alias !== normalizedAlias), entry]),
    })
    return entry
  }

  delete(alias: string): boolean {
    const normalized = normalizePromptAlias(alias)
    const snapshot = normalizePromptAliasesSnapshot(this.store.load())
    const next = snapshot.aliases.filter((entry) => entry.alias !== normalized)
    if (next.length === snapshot.aliases.length) return false
    this.store.save({ version: 1, aliases: next })
    return true
  }

  resolve(inputText: string): StoredPromptAlias | null {
    return this.get(inputText.trim())
  }
}

export function createPromptAliasesStateStore(
  filePath: string | StateFilePath,
  accessPolicy: RuntimeAccessPolicyInput = { kind: "production" },
): SyncJsonStateStore<PromptAliasesSnapshot> {
  return createSyncJsonStateStore<PromptAliasesSnapshot>({
    accessPolicy,
    concurrency: "multiProcess",
    defaultValue: emptyPromptAliasesSnapshot,
    kind: "prompt alias state",
    path: typeof filePath === "string" ? stateFilePathFromAbsolute(filePath) : filePath,
    recoverability: "failClosed",
    schema: promptAliasesSnapshotSchema,
    version: 1,
  })
}

export const promptAliasesTuiPlugin = (options: PromptAliasesTuiPluginOptions = {}): TuiPlugin => {
  const stateDirectory = options.stateDirectory ?? path.join(process.cwd(), ".interbase")
  const aliases = new PromptAliasesManager({
    store: options.aliasesStore ?? new JsonFilePromptAliasesStore(path.join(stateDirectory, "prompt-aliases.json")),
    now: options.now,
  })
  return async (api: TuiPluginApi) => {
    api.command.register(() => [
      createPromptAliasesManageCommand({
        open: () => showPromptAliasesDialog(api, aliases, options.telemetry),
      }),
    ])
  }
}

export function createPromptAliasesTuiPlugin(
  options: PromptAliasesTuiPluginOptions = {},
): PromptAliasesTuiPluginModule {
  return {
    id: ALIASES_TUI_PLUGIN_ID,
    tui: promptAliasesTuiPlugin(options),
  }
}

export function createPromptAliasesManageCommand(input: { open: () => void }): TuiCommand {
  return {
    title: "Manage aliases",
    value: "aliases.manage",
    description: "Set, update, or delete local prompt aliases",
    category: "Aliases",
    slash: { name: ALIASES_COMMAND },
    onSelect: input.open,
  }
}

export function showPromptAliasesDialog(
  api: TuiPluginApi,
  manager: PromptAliasesManager,
  telemetry?: (payload: PromptAliasTelemetryPayload) => void,
): void {
  const aliases = manager.list()
  const options: TuiDialogSelectOption<AliasDialogSelection>[] = [
    {
      title: "Add alias",
      value: { alias: null },
      description: "Create a new prompt alias",
      onSelect: () => showPromptAliasNameDialog(api, manager, telemetry),
    },
    ...aliases.map((entry) => ({
      title: entry.alias,
      value: { alias: entry.alias },
      description: promptAliasPromptPreview(entry.prompt),
      onSelect: () => showPromptAliasActionsDialog(api, manager, entry.alias, telemetry),
    })),
  ]
  api.ui.dialog.replace(() =>
    api.ui.DialogSelect<AliasDialogSelection>({
      title: "Aliases",
      options,
      skipFilter: true,
      hideSearch: true,
    }),
  )
}

export function showPromptAliasActionsDialog(
  api: TuiPluginApi,
  manager: PromptAliasesManager,
  alias: string,
  telemetry?: (payload: PromptAliasTelemetryPayload) => void,
): void {
  const options: TuiDialogSelectOption<AliasActionSelection>[] = [
    {
      title: "Update alias",
      value: { action: "update" },
      description: "Replace this alias prompt",
      onSelect: () => showPromptAliasPromptDialog(api, manager, alias, telemetry),
    },
    {
      title: "Delete alias",
      value: { action: "delete" },
      description: "Remove this prompt alias",
      onSelect: () => {
        manager.delete(alias)
        telemetry?.({ event: PromptAliasTelemetryEvent.Deleted })
        api.ui.toast({ message: `Alias ${alias} deleted`, variant: "success", duration: 2000 })
        showPromptAliasesDialog(api, manager, telemetry)
      },
    },
    {
      title: "Back",
      value: { action: "back" },
      description: "Return to aliases",
      onSelect: () => showPromptAliasesDialog(api, manager, telemetry),
    },
  ]
  api.ui.dialog.replace(() =>
    api.ui.DialogSelect<AliasActionSelection>({
      title: `Alias ${alias}`,
      options,
      skipFilter: true,
      hideSearch: true,
    }),
  )
}

export function showPromptAliasNameDialog(
  api: TuiPluginApi,
  manager: PromptAliasesManager,
  telemetry?: (payload: PromptAliasTelemetryPayload) => void,
): void {
  api.ui.dialog.replace(() =>
    api.ui.DialogPrompt({
      title: "Alias",
      placeholder: "Enter alias",
      onConfirm: (value) => {
        const validationError = promptAliasValidationError(value)
        if (validationError) {
          api.ui.toast({ message: validationError, variant: "error", duration: 2500 })
          return
        }
        showPromptAliasPromptDialog(api, manager, normalizePromptAlias(value), telemetry)
      },
    }),
  )
}

export function showPromptAliasPromptDialog(
  api: TuiPluginApi,
  manager: PromptAliasesManager,
  alias: string,
  telemetry?: (payload: PromptAliasTelemetryPayload) => void,
): void {
  const entry = manager.get(alias)
  api.ui.dialog.replace(() =>
    api.ui.DialogPrompt({
      title: `Alias ${alias}`,
      placeholder: "Enter prompt",
      value: entry?.prompt ?? "",
      onConfirm: (value) => {
        const validationError = promptAliasPromptValidationError(value)
        if (validationError) {
          api.ui.toast({ message: validationError, variant: "error", duration: 2500 })
          return
        }
        const created = manager.get(alias) === null
        manager.set(alias, value)
        if (created) telemetry?.({ event: PromptAliasTelemetryEvent.Created })
        api.ui.toast({ message: `Alias ${alias} saved`, variant: "success", duration: 2000 })
        showPromptAliasesDialog(api, manager, telemetry)
      },
    }),
  )
}

export function emptyPromptAliasesSnapshot(): PromptAliasesSnapshot {
  return { version: 1, aliases: [] }
}

export function normalizePromptAliasPrompt(prompt: string): string {
  return prompt.trim()
}

export function promptAliasPromptValidationError(prompt: string): string | null {
  const normalized = normalizePromptAliasPrompt(prompt)
  if (!normalized) return "Alias prompt cannot be empty."
  if (normalized.length > MAX_PROMPT_ALIAS_PROMPT_CHARS)
    return `Alias prompt must be ${MAX_PROMPT_ALIAS_PROMPT_CHARS} characters or fewer.`
  return null
}

export function assertValidPromptAliasPrompt(prompt: string): void {
  const validationError = promptAliasPromptValidationError(prompt)
  if (validationError) throw new Error(validationError)
}

export function promptAliasPromptPreview(prompt: string): string {
  return prompt.trim().split(/\s+/).filter(Boolean).join(" ")
}

export function normalizePromptAlias(alias: string): string {
  return alias.trim()
}

export function promptAliasValidationError(alias: string): string | null {
  const normalized = normalizePromptAlias(alias)
  if (!normalized) return "Alias cannot be empty."
  if (normalized.length > MAX_PROMPT_ALIAS_CHARS) return `Alias must be ${MAX_PROMPT_ALIAS_CHARS} characters or fewer.`
  if (/\s/.test(normalized)) return "Alias cannot contain spaces."
  if (normalized.startsWith("/")) return "Alias cannot start with /."
  return null
}

export function assertValidPromptAlias(alias: string): void {
  const validationError = promptAliasValidationError(alias)
  if (validationError) throw new Error(validationError)
}

export function resolvePromptAlias(input: { inputText: string; stateDirectory: string }): StoredPromptAlias | null {
  return new PromptAliasesManager({
    store: new JsonFilePromptAliasesStore(path.join(input.stateDirectory, "prompt-aliases.json")),
  }).resolve(input.inputText)
}

function normalizePromptAliasesSnapshot(snapshot: PromptAliasesSnapshot): PromptAliasesSnapshot {
  const seen = new Set<string>()
  const aliases: StoredPromptAlias[] = []
  for (const entry of snapshot.aliases) {
    if (seen.has(entry.alias)) continue
    seen.add(entry.alias)
    aliases.push(entry)
  }
  return { version: 1, aliases: sortPromptAliases(aliases) }
}

function sortPromptAliases(aliases: StoredPromptAlias[]): StoredPromptAlias[] {
  return [...aliases].sort((left, right) => left.alias.localeCompare(right.alias))
}

const promptAliasesSnapshotSchema: JsonStateSchema<PromptAliasesSnapshot> = {
  parse(value) {
    if (!isJsonObject(value) || value.version !== 1 || !Array.isArray(value.aliases)) throw new Error("invalid schema")
    const seen = new Set<string>()
    const aliases: StoredPromptAlias[] = []
    for (const alias of value.aliases) {
      const parsed = parseStoredPromptAlias(alias)
      if (seen.has(parsed.alias)) throw new Error("invalid schema")
      seen.add(parsed.alias)
      aliases.push(parsed)
    }
    return { version: 1, aliases: sortPromptAliases(aliases) }
  },
}

function parseStoredPromptAlias(value: JsonValue): StoredPromptAlias {
  if (
    !isJsonObject(value) ||
    typeof value.alias !== "string" ||
    typeof value.prompt !== "string" ||
    typeof value.updatedAt !== "number"
  ) {
    throw new Error("invalid schema")
  }
  assertValidPromptAlias(value.alias)
  assertValidPromptAliasPrompt(value.prompt)
  return {
    alias: value.alias,
    prompt: value.prompt,
    updatedAt: value.updatedAt,
  }
}

function isJsonObject(value: JsonValue): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
