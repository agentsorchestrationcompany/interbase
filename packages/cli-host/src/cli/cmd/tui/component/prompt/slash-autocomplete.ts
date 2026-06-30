import type { AutocompleteOption, AutocompleteRef } from "./autocomplete"

export function matchesExactSlashArgumentAlias(
  inputText: string,
  options: Pick<AutocompleteOption, "argumentAliases">[],
) {
  const trimmed = inputText.trim()
  return options.some((option) => option.argumentAliases?.some((alias) => alias.display.trim() === trimmed))
}

export function slashAutocompleteInsertionText(
  selected: Pick<AutocompleteOption, "display" | "onSelect">,
  visible: AutocompleteRef["visible"],
) {
  if (selected.onSelect) return null
  if (visible !== "/" || !selected.display.startsWith("/")) return null
  return selected.display.trimEnd() + " "
}

export function shouldTrimLeadingSlashAutocomplete(input: {
  text: string
  cursorOffset: number
  visible: AutocompleteRef["visible"]
  preserveInput?: boolean
}) {
  return (
    !input.preserveInput &&
    input.visible === "/" &&
    input.cursorOffset === input.text.length &&
    !input.text.endsWith(" ") &&
    input.text.startsWith("/")
  )
}
