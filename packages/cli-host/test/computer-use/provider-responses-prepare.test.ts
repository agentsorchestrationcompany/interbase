import { describe, expect, test } from "bun:test"
import { prepareResponsesTools } from "@/provider/sdk/copilot/responses/openai-responses-prepare-tools"

describe("Responses computer-use provider tools", () => {
  test("maps provider computer-use tools to native Responses computer_use_preview", () => {
    const result = prepareResponsesTools({
      strictJsonSchema: false,
      tools: [
        {
          type: "provider",
          id: "openai.computer_use",
          name: "computer_use",
          args: { displayWidth: 1280, displayHeight: 720, environment: "browser" },
        },
      ],
    })

    expect(result.toolWarnings).toEqual([])
    expect(result.tools).toEqual([
      { type: "computer_use_preview", display_width: 1280, display_height: 720, environment: "browser" },
    ])
  })
})
