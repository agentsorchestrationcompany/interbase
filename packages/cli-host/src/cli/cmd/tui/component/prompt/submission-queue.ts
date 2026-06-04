import { Locale } from "@/util/locale"

type QueueStatus = { type: string }

type QueueableSubmission = {
  type: "prompt" | "command" | "shell"
  displayText?: string
  request: Record<string, unknown>
  history: {
    input: string
  }
}

export function shouldQueueSubmission(input: {
  hasSession: boolean
  pendingStart: boolean
  status: QueueStatus
  bypassQueue?: boolean
}) {
  return !input.bypassQueue && input.hasSession && (input.pendingStart || input.status.type !== "idle")
}

export function canDrainQueuedSubmission(input: {
  disabled?: boolean
  pendingStart: boolean
  queueLength: number
  status: QueueStatus
}) {
  return input.queueLength > 0 && !input.pendingStart && !input.disabled && input.status.type === "idle"
}

export function statusClearsPendingStart(status: QueueStatus) {
  return status.type !== "idle"
}

export function requestForSubmission<T extends QueueableSubmission>(
  submission: T,
  input: {
    messageID: () => unknown
    queued: boolean
  },
) {
  if (!input.queued || submission.type === "shell") return submission.request
  return {
    ...submission.request,
    messageID: input.messageID(),
  }
}

export function queuedSubmissionPreviewText(input: { maxWidth: number; minWidth?: number; text: string }) {
  const trimmed = input.text.trim()
  if (!trimmed) return
  return Locale.truncateMiddle(trimmed, Math.max(input.minWidth ?? 24, input.maxWidth))
}

export function queuedSubmissionPreviewTextForSubmission(input: {
  maxWidth: number
  minWidth?: number
  submission: QueueableSubmission
}) {
  return queuedSubmissionPreviewText({
    maxWidth: input.maxWidth,
    minWidth: input.minWidth,
    text: input.submission.displayText ?? input.submission.history.input,
  })
}
