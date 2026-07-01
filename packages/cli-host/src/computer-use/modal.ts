import type { Observation } from "@interbase/computer-use-protocol"

export type ModalState =
  | { blocked: false; reason: "none"; modalElementIds: [] }
  | { blocked: true; reason: "target_window_changed" | "modal_element_detected" | "modal_warning_detected"; modalElementIds: string[] }

const MODAL_ROLES = new Set(["alert", "dialog", "sheet", "modal"])

export function detectModalState(input: { observation: Observation; expectedWindowId?: string }): ModalState {
  if (input.expectedWindowId !== undefined && input.observation.window?.id !== input.expectedWindowId) {
    return { blocked: true, reason: "target_window_changed", modalElementIds: [] }
  }
  const modalElementIds = input.observation.elements.filter((element) => MODAL_ROLES.has(element.role.toLowerCase())).map((element) => element.id)
  if (modalElementIds.length > 0) return { blocked: true, reason: "modal_element_detected", modalElementIds }
  if (input.observation.warnings.some((warning) => /modal|dialog|sheet|alert/i.test(warning))) {
    return { blocked: true, reason: "modal_warning_detected", modalElementIds: [] }
  }
  return { blocked: false, reason: "none", modalElementIds: [] }
}
