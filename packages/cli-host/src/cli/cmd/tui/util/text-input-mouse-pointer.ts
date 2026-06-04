import { useRenderer } from "@opentui/solid"

export function useTextInputMousePointer() {
  const renderer = useRenderer()

  return {
    cursorStyle: { cursor: "text" as const },
    onMouseOver: () => renderer.setMousePointer("text"),
    onMouseOut: () => renderer.setMousePointer("default"),
  }
}
