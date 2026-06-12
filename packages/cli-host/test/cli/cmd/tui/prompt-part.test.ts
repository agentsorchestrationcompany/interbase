import { describe, expect, test } from "bun:test"
import { TextareaRenderable } from "@opentui/core"
import { EventEmitter } from "node:events"
import type { PromptInfo } from "../../../../src/cli/cmd/tui/component/prompt/history"
import {
  assign,
  buildVirtualTokenInsertion,
  reconcileVirtualParts,
  strip,
} from "../../../../src/cli/cmd/tui/component/prompt/part"

function testRenderContext() {
  return Object.assign(new EventEmitter(), {
    width: 80,
    height: 24,
    frameId: 0,
    selectionBg: undefined,
    selectionFg: undefined,
    addToHitGrid() {},
    pushHitGridScissorRect() {},
    popHitGridScissorRect() {},
    clearHitGridScissorRects() {},
    requestRender() {},
    setCursorPosition() {},
    setCursorStyle() {},
    setCursorColor() {},
    setMousePointer() {},
    widthMethod: "wcwidth" as const,
    capabilities: null,
    requestLive() {},
    dropLive() {},
    hasSelection: false,
    getSelection: () => null,
    requestSelectionUpdate() {},
    currentFocusedRenderable: null,
    currentFocusedEditor: null,
    focusRenderable() {},
    blurRenderable() {},
    registerLifecyclePass() {},
    unregisterLifecyclePass() {},
    getLifecyclePasses: () => new Set(),
    keyInput: {},
    _internalKeyInput: {},
    clearSelection() {},
    startSelection() {},
    updateSelection() {},
  })
}

function textareaWithVirtualPaste(text: string) {
  const textarea = new TextareaRenderable(testRenderContext() as any, { id: "test", width: 80, height: 5 })
  const virtualText = "[Pasted ~3 lines]"
  const typeId = textarea.extmarks.registerType("prompt-part")
  textarea.setText(text)
  textarea.extmarks.create({ start: 0, end: virtualText.length, virtual: true, typeId })
  textarea.cursorOffset = textarea.plainText.length
  return textarea
}

describe("prompt part", () => {
  test("strip removes persisted ids from reused file parts", () => {
    const part = {
      id: "prt_old",
      sessionID: "ses_old",
      messageID: "msg_old",
      type: "file" as const,
      mime: "image/png",
      filename: "tiny.png",
      url: "data:image/png;base64,abc",
    }

    expect(strip(part)).toEqual({
      type: "file",
      mime: "image/png",
      filename: "tiny.png",
      url: "data:image/png;base64,abc",
    })
  })

  test("assign overwrites stale runtime ids", () => {
    const part = {
      id: "prt_old",
      sessionID: "ses_old",
      messageID: "msg_old",
      type: "file" as const,
      mime: "image/png",
      filename: "tiny.png",
      url: "data:image/png;base64,abc",
    } as PromptInfo["parts"][number]

    const next = assign(part)

    expect(next.id).not.toBe("prt_old")
    expect(next.id.startsWith("prt_")).toBe(true)
    expect(next).toMatchObject({
      type: "file",
      mime: "image/png",
      filename: "tiny.png",
      url: "data:image/png;base64,abc",
    })
  })

  test("reconcileVirtualParts removes a damaged pasted text placeholder", () => {
    const part = {
      type: "text" as const,
      text: "first line\nsecond line\nthird line",
      source: {
        text: {
          start: 0,
          end: 17,
          value: "[Pasted ~3 lines]",
        },
      },
    }

    expect(reconcileVirtualParts([part], "[Pasted ~3 ")).toEqual([])
  })

  test("reconcileVirtualParts keeps an intact pasted text placeholder", () => {
    const part = {
      type: "text" as const,
      text: "first line\nsecond line\nthird line",
      source: {
        text: {
          start: 6,
          end: 23,
          value: "[Pasted ~3 lines]",
        },
      },
    }

    expect(reconcileVirtualParts([part], "start [Pasted ~3 lines] end")).toEqual([part])
  })

  test("ctrl backspace deletes a whole virtual pasted text placeholder", () => {
    for (const text of ["[Pasted ~3 lines]", "[Pasted ~3 lines] "]) {
      const textarea = textareaWithVirtualPaste(text)

      const handled = textarea.handleKeyPress({
        name: "backspace",
        ctrl: true,
        meta: false,
        shift: false,
        super: false,
        hyper: false,
      } as any)

      expect(handled).toBe(true)
      expect(textarea.plainText).toBe("")
      expect(textarea.cursorOffset).toBe(0)
      expect(textarea.extmarks.getAll()).toEqual([])
    }
  })

  test("buildVirtualTokenInsertion pads virtual placeholders away from adjacent text", () => {
    expect(buildVirtualTokenInsertion({ prompt: "foo", cursorOffset: 3, virtualText: "[Pasted ~4 lines]" })).toEqual({
      textToInsert: " [Pasted ~4 lines] ",
      extmarkStart: 4,
      extmarkEnd: 21,
    })
    expect(buildVirtualTokenInsertion({ prompt: "foo bar", cursorOffset: 3, virtualText: "[Pasted ~4 lines]" })).toEqual({
      textToInsert: " [Pasted ~4 lines]",
      extmarkStart: 4,
      extmarkEnd: 21,
    })
  })

  test("cursor navigation lands after the preceding character for spaced virtual placeholders", () => {
    const textarea = new TextareaRenderable(testRenderContext() as any, { id: "test", width: 80, height: 5 })
    const virtualText = "[Pasted ~4 lines]"
    const typeId = textarea.extmarks.registerType("prompt-part")
    const insertion = buildVirtualTokenInsertion({ prompt: "foo", cursorOffset: 3, virtualText })

    textarea.setText("foo" + insertion.textToInsert)
    textarea.extmarks.create({
      start: insertion.extmarkStart,
      end: insertion.extmarkEnd,
      virtual: true,
      typeId,
    })
    textarea.cursorOffset = textarea.plainText.length

    textarea.handleKeyPress({ name: "left", ctrl: false, meta: false, shift: false, super: false, hyper: false } as any)
    textarea.handleKeyPress({ name: "left", ctrl: false, meta: false, shift: false, super: false, hyper: false } as any)

    expect(textarea.cursorOffset).toBe(3)
  })
})
