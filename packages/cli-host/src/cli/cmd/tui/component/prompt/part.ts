import { PartID } from "@/session/schema"
import type { PromptInfo } from "./history"

type Item = PromptInfo["parts"][number]

function virtualSource(part: Item): { start: number; end: number; value: string } | undefined {
  if (part.type === "file" && part.source?.text) return part.source.text
  if (part.type === "agent" && part.source) return part.source
  if (part.type === "text" && part.source?.text) return part.source.text
}

export function strip(part: Item & { id: string; messageID: string; sessionID: string }): Item {
  const { id: _id, messageID: _messageID, sessionID: _sessionID, ...rest } = part
  return rest
}

export function assign(part: Item): Item & { id: PartID } {
  return {
    ...part,
    id: PartID.ascending(),
  }
}

export function buildVirtualTokenInsertion(input: { prompt: string; cursorOffset: number; virtualText: string }) {
  const charBefore = input.cursorOffset > 0 ? input.prompt.at(input.cursorOffset - 1) : undefined
  const charAfter = input.prompt.at(input.cursorOffset)
  const prefix = charBefore && !/\s/.test(charBefore) ? " " : ""
  const suffix = charAfter === undefined || !/\s/.test(charAfter) ? " " : ""
  const extmarkStart = input.cursorOffset + prefix.length
  const extmarkEnd = extmarkStart + input.virtualText.length

  return {
    textToInsert: prefix + input.virtualText + suffix,
    extmarkStart,
    extmarkEnd,
  }
}

export function reconcileVirtualParts(parts: Item[], input: string): Item[] {
  return parts.filter((part) => {
    const source = virtualSource(part)
    if (!source) return true
    return input.slice(source.start, source.end) === source.value
  })
}
