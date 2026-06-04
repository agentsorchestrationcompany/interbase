export type ServerCommandRef = {
  name: string
}

export type TuiSlashCommandRef = {
  display: string
  aliases?: string[]
  argumentAliases?: { display: string; arguments: string }[]
  onSelect?: () => void
}

export type PromptSlashCommand = {
  command: string
  arguments: string
}

export function parsePromptSlashCommandInput(inputText: string): PromptSlashCommand | null {
  if (!inputText.startsWith("/")) return null
  const firstLineEnd = inputText.indexOf("\n")
  const firstLine = firstLineEnd === -1 ? inputText : inputText.slice(0, firstLineEnd)
  const [commandToken, ...firstLineArgs] = firstLine.split(" ")
  const command = commandToken.slice(1)
  if (!command) return null
  const restOfInput = firstLineEnd === -1 ? "" : inputText.slice(firstLineEnd + 1)
  const args = firstLineArgs.join(" ") + (restOfInput ? "\n" + restOfInput : "")
  return { command, arguments: args }
}

export function resolvePromptSlashCommand(input: {
  inputText: string
  serverCommands: readonly ServerCommandRef[]
  tuiSlashCommands: readonly TuiSlashCommandRef[]
}): PromptSlashCommand | null {
  const parsed = parsePromptSlashCommandInput(input.inputText)
  if (!parsed) return null

  for (const option of input.tuiSlashCommands) {
    if (!option.onSelect) continue
    if (!parsed.arguments.trim() && matchesTuiSlashCommand(parsed.command, option)) return null
  }

  if (input.serverCommands.some((command) => command.name === parsed.command)) return parsed

  for (const option of input.tuiSlashCommands) {
    if (option.onSelect) continue
    const canonical = normalizeSlashName(option.display)
    if (!canonical) continue
    const aliases = option.aliases?.map(normalizeSlashName).filter((alias): alias is string => Boolean(alias)) ?? []
    if (parsed.command === canonical || aliases.includes(parsed.command)) {
      return { ...parsed, command: canonical }
    }
    const argumentAlias = option.argumentAliases?.find((alias) => normalizeSlashName(alias.display) === parsed.command)
    if (argumentAlias) {
      return {
        command: canonical,
        arguments: [argumentAlias.arguments, parsed.arguments].filter(Boolean).join(" "),
      }
    }
  }

  return null
}

export function resolvePromptSlashCommandAction(input: {
  inputText: string
  tuiSlashCommands: readonly TuiSlashCommandRef[]
}): (() => void) | null {
  const parsed = parsePromptSlashCommandInput(input.inputText)
  if (!parsed || parsed.arguments.trim()) return null

  for (const option of input.tuiSlashCommands) {
    if (!option.onSelect) continue
    if (matchesTuiSlashCommand(parsed.command, option)) return option.onSelect
  }

  return null
}

function matchesTuiSlashCommand(command: string, option: TuiSlashCommandRef): boolean {
  const canonical = normalizeSlashName(option.display)
  if (!canonical) return false
  const aliases = option.aliases?.map(normalizeSlashName).filter((alias): alias is string => Boolean(alias)) ?? []
  return command === canonical || aliases.includes(command)
}

function normalizeSlashName(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed.startsWith("/")) return null
  const name = trimmed.slice(1)
  return name.length > 0 ? name : null
}
