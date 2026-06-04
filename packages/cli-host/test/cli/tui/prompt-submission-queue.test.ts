import { describe, expect, test } from "bun:test"
import {
  canDrainQueuedSubmission,
  queuedSubmissionPreviewText,
  queuedSubmissionPreviewTextForSubmission,
  requestForSubmission,
  shouldQueueSubmission,
  statusClearsPendingStart,
} from "../../../src/cli/cmd/tui/component/prompt/submission-queue"

describe("prompt submission queue", () => {
  test("queues only existing session submissions while busy or pending start", () => {
    expect(shouldQueueSubmission({ hasSession: false, pendingStart: false, status: { type: "busy" } })).toBe(false)
    expect(shouldQueueSubmission({ hasSession: true, pendingStart: false, status: { type: "idle" } })).toBe(false)
    expect(shouldQueueSubmission({ hasSession: true, pendingStart: false, status: { type: "busy" } })).toBe(true)
    expect(shouldQueueSubmission({ hasSession: true, pendingStart: true, status: { type: "idle" } })).toBe(true)
    expect(
      shouldQueueSubmission({ hasSession: true, pendingStart: false, status: { type: "busy" }, bypassQueue: true }),
    ).toBe(false)
  })

  test("drains exactly when idle with queued work and no pending start", () => {
    expect(canDrainQueuedSubmission({ pendingStart: false, queueLength: 1, status: { type: "idle" } })).toBe(true)
    expect(
      canDrainQueuedSubmission({ disabled: true, pendingStart: false, queueLength: 1, status: { type: "idle" } }),
    ).toBe(false)
    expect(canDrainQueuedSubmission({ pendingStart: true, queueLength: 1, status: { type: "idle" } })).toBe(false)
    expect(canDrainQueuedSubmission({ pendingStart: false, queueLength: 0, status: { type: "idle" } })).toBe(false)
    expect(canDrainQueuedSubmission({ pendingStart: false, queueLength: 1, status: { type: "busy" } })).toBe(false)
  })

  test("non-idle status clears the pending-start guard", () => {
    expect(statusClearsPendingStart({ type: "busy" })).toBe(true)
    expect(statusClearsPendingStart({ type: "retry" })).toBe(true)
    expect(statusClearsPendingStart({ type: "idle" })).toBe(false)
  })

  test("queued prompt and command requests receive fresh message ids at send time", () => {
    const prompt = { type: "prompt" as const, request: { messageID: "old", value: 1 }, history: { input: "p" } }
    const command = { type: "command" as const, request: { messageID: "old", value: 2 }, history: { input: "c" } }

    expect(requestForSubmission(prompt, { queued: true, messageID: () => "new-prompt" })).toEqual({
      messageID: "new-prompt",
      value: 1,
    })
    expect(requestForSubmission(command, { queued: true, messageID: () => "new-command" })).toEqual({
      messageID: "new-command",
      value: 2,
    })
    expect(requestForSubmission(prompt, { queued: false, messageID: () => "unused" })).toBe(prompt.request)
  })

  test("queued shell requests do not receive message ids", () => {
    const shell = { type: "shell" as const, request: { command: "pwd" }, history: { input: "!pwd" } }
    expect(requestForSubmission(shell, { queued: true, messageID: () => "unused" })).toBe(shell.request)
  })

  test("preview trims blank text and truncates visible queued text", () => {
    expect(queuedSubmissionPreviewText({ text: "   ", maxWidth: 80 })).toBeUndefined()
    expect(queuedSubmissionPreviewText({ text: "  short  ", maxWidth: 80 })).toBe("short")
    expect(queuedSubmissionPreviewText({ text: "abcdefghijklmnopqrstuvwxyz", maxWidth: 10, minWidth: 4 })).toBe(
      "abcde…wxyz",
    )
  })

  test("preview uses expanded alias display text when present", () => {
    expect(
      queuedSubmissionPreviewTextForSubmission({
        maxWidth: 80,
        submission: {
          type: "command",
          displayText: "Review the staged changes",
          request: { command: "review" },
          history: { input: "review" },
        },
      }),
    ).toBe("Review the staged changes")
  })
})
