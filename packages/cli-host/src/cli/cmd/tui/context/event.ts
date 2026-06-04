import type { Event, GlobalEvent } from "@interbase/sdk/v2"
import { useProject } from "./project"
import { useSDK } from "./sdk"

export function useEvent() {
  const project = useProject()
  const sdk = useSDK()

  function subscribe(handler: (event: Event) => void) {
    return sdk.event.on("event", (event) => {
      if (
        shouldDeliverProjectEvent(event, {
          directory: project.instance.directory(),
          project: project.project(),
        })
      ) {
        const payload = toEvent(event.payload)
        if (!payload) return
        handler(payload)
      }
    })
  }

  function on<T extends Event["type"]>(type: T, handler: (event: Extract<Event, { type: T }>) => void) {
    return subscribe((event) => {
      if (event.type !== type) return
      handler(event as Extract<Event, { type: T }>)
    })
  }

  return {
    subscribe,
    on,
  }
}

function toEvent(payload: GlobalEvent["payload"]): Event | undefined {
  if (payload.type !== "sync") return payload

  const syncPayload = payload as { data?: unknown; event?: unknown; id?: string; name?: string }
  if (isEvent(syncPayload.event)) return syncPayload.event

  if (typeof syncPayload.name === "string" && "data" in syncPayload) {
    return {
      id: syncPayload.id ?? "",
      type: syncPayload.name.replace(/\.\d+$/, ""),
      properties: syncPayload.data,
    } as Event
  }
}

function isEvent(value: unknown): value is Event {
  return typeof value === "object" && value !== null && "type" in value && "properties" in value
}

export function shouldDeliverProjectEvent(
  event: Pick<GlobalEvent, "directory" | "project">,
  target: { directory: string; project?: string },
) {
  if (event.directory === "global") return true
  return event.directory === target.directory
}
