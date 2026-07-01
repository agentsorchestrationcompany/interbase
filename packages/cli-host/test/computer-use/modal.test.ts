import { describe, expect, test } from "bun:test"
import { detectModalState } from "@/computer-use/modal"
import { makeSanitizedMockObservation } from "@interbase/computer-use-testkit"

describe("computer-use modal detection", () => {
  test("allows observations without modal indicators", () => {
    expect(detectModalState({ observation: makeSanitizedMockObservation({ enabled: true }), expectedWindowId: "win-main" })).toEqual({
      blocked: false,
      reason: "none",
      modalElementIds: [],
    })
  })

  test("blocks when the expected window changed", () => {
    expect(detectModalState({ observation: makeSanitizedMockObservation({ enabled: true }), expectedWindowId: "other" })).toEqual({
      blocked: true,
      reason: "target_window_changed",
      modalElementIds: [],
    })
  })

  test("detects modal element roles case-insensitively", () => {
    const observation = makeSanitizedMockObservation(
      { enabled: true },
      { elements: [{ id: "modal_1", role: "Dialog", label: "Confirm" }] },
    )
    expect(detectModalState({ observation })).toEqual({ blocked: true, reason: "modal_element_detected", modalElementIds: ["modal_1"] })
  })

  test("detects modal warnings when no modal element is exposed", () => {
    const observation = makeSanitizedMockObservation({ enabled: true }, { warnings: ["system dialog may be covering target window"] })
    expect(detectModalState({ observation })).toEqual({ blocked: true, reason: "modal_warning_detected", modalElementIds: [] })
  })
})
