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

export function reconcileVirtualParts(parts: Item[], input: string): Item[] {
  return parts.filter((part) => {
    const source = virtualSource(part)
    if (!source) return true
    return input.slice(source.start, source.end) === source.value
  })
}
