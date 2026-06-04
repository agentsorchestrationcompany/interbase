import type { RemoteRuntimeJsonValue } from "@interbase/remote-runtime-contracts"
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"

export const MAX_PROMPT_ALIAS_CHARS = 80
export const MAX_PROMPT_ALIAS_PROMPT_CHARS = 20_000

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

export class JsonFilePromptAliasesStore implements PromptAliasesStore {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  load(): PromptAliasesSnapshot {
    if (!existsSync(this.filePath)) return emptyPromptAliasesSnapshot()
    const parsed: RemoteRuntimeJsonValue = JSON.parse(readFileSync(this.filePath, "utf8"))
    return parsePromptAliasesSnapshot(parsed)
  }

  save(snapshot: PromptAliasesSnapshot): void {
    mkdirSync(path.dirname(this.filePath), { recursive: true })
    const tempPath = `${this.filePath}.${process.pid}.tmp`
    writeFileSync(tempPath, `${JSON.stringify(normalizePromptAliasesSnapshot(snapshot), null, 2)}\n`, "utf8")
    renameSync(tempPath, this.filePath)
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

export function emptyPromptAliasesSnapshot(): PromptAliasesSnapshot {
  return { version: 1, aliases: [] }
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

function parsePromptAliasesSnapshot(value: RemoteRuntimeJsonValue): PromptAliasesSnapshot {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.aliases))
    throw new Error("Invalid prompt alias state.")
  const seen = new Set<string>()
  const aliases: StoredPromptAlias[] = []
  for (const alias of value.aliases) {
    const parsed = parseStoredPromptAlias(alias)
    if (seen.has(parsed.alias)) throw new Error("Invalid prompt alias state.")
    seen.add(parsed.alias)
    aliases.push(parsed)
  }
  return { version: 1, aliases: sortPromptAliases(aliases) }
}

function parseStoredPromptAlias(value: RemoteRuntimeJsonValue): StoredPromptAlias {
  if (
    !isRecord(value) ||
    typeof value.alias !== "string" ||
    typeof value.prompt !== "string" ||
    typeof value.updatedAt !== "number"
  ) {
    throw new Error("Invalid prompt alias state.")
  }
  assertValidPromptAlias(value.alias)
  assertValidPromptAliasPrompt(value.prompt)
  return {
    alias: value.alias,
    prompt: value.prompt,
    updatedAt: value.updatedAt,
  }
}

function isRecord(value: RemoteRuntimeJsonValue): value is { readonly [key: string]: RemoteRuntimeJsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
