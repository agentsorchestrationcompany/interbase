import { describe, expect, test } from "bun:test"
import {
  shouldRenderSessionPrompt,
  shouldShowSessionPrompt,
} from "../../../src/cli/cmd/tui/routes/session/prompt-visibility"

describe("session prompt visibility", () => {
  test("keeps the prompt mounted while a question overlay is active", () => {
    expect(shouldRenderSessionPrompt({ hasParentSession: false })).toBe(true)
    expect(
      shouldShowSessionPrompt({
        hasParentSession: false,
        permissionCount: 0,
        questionCount: 1,
      }),
    ).toBe(false)
  })

  test("hides and unmounts the prompt for subagent sessions", () => {
    expect(shouldRenderSessionPrompt({ hasParentSession: true })).toBe(false)
    expect(
      shouldShowSessionPrompt({
        hasParentSession: true,
        permissionCount: 0,
        questionCount: 0,
      }),
    ).toBe(false)
  })

  test("shows the prompt only when no overlays are active", () => {
    expect(
      shouldShowSessionPrompt({
        hasParentSession: false,
        permissionCount: 0,
        questionCount: 0,
      }),
    ).toBe(true)
    expect(
      shouldShowSessionPrompt({
        hasParentSession: false,
        permissionCount: 1,
        questionCount: 0,
      }),
    ).toBe(false)
  })
})
