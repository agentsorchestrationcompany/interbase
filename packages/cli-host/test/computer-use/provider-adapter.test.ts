import { describe, expect, test } from "bun:test"
import {
  providerComputerUseToolCall,
  providerComputerUseToolInputEnd,
  providerComputerUseToolInputStart,
  providerComputerUseToolName,
  providerComputerUseToolResult,
  providerComputerUsePreviewTool,
} from "@/computer-use/provider-adapter"

describe("provider computer-use adapter", () => {
  test("builds provider-compatible computer call parts", () => {
    const item = { id: "cu_1", status: "in_progress" }
    expect(providerComputerUseToolName).toBe("computer_use")
    expect(providerComputerUseToolInputStart(item)).toEqual({ type: "tool-input-start", id: "cu_1", toolName: "computer_use" })
    expect(providerComputerUseToolInputEnd(item)).toEqual({ type: "tool-input-end", id: "cu_1" })
    expect(providerComputerUseToolCall(item)).toEqual({ type: "tool-call", toolCallId: "cu_1", toolName: "computer_use", input: "", providerExecuted: true })
    expect(providerComputerUseToolResult(item)).toEqual({
      type: "tool-result",
      toolCallId: "cu_1",
      toolName: "computer_use",
      result: { type: "computer_use_tool_result", status: "in_progress" },
    })
  })

  test("defaults missing provider status to completed", () => {
    expect(providerComputerUseToolResult({ id: "cu_2" }).result.status).toBe("completed")
  })

  test("builds provider-native computer-use preview tool definitions", () => {
    expect(providerComputerUsePreviewTool()).toEqual({
      type: "computer_use_preview",
      display_width: undefined,
      display_height: undefined,
      environment: undefined,
    })
    expect(providerComputerUsePreviewTool({ displayWidth: 1280, displayHeight: 720, environment: "browser" })).toEqual({
      type: "computer_use_preview",
      display_width: 1280,
      display_height: 720,
      environment: "browser",
    })
  })
})
