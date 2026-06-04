import type { RuntimeEvent } from "./events.js"
import type { RuntimeThreadRef } from "./thread.js"

export interface RuntimeThreadEventEnvelope<TEvent extends RuntimeEvent = RuntimeEvent> {
  attachmentId?: string | null
  event: TEvent
  sequence: number
  threadRef: RuntimeThreadRef
  timestamp: string
}

export interface WaitForThreadEventsResponse {
  events: RuntimeThreadEventEnvelope[]
  nextSequence: number
}
