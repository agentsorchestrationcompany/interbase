import { describe, expect, test } from "bun:test"
import { classifyComputerUseModel } from "@/computer-use/model-locality"

describe("computer-use model locality", () => {
  test("classifies known local providers and models as local", () => {
    expect(classifyComputerUseModel({ providerID: "ollama", modelID: "llama3" })).toBe("local")
    expect(classifyComputerUseModel({ providerID: "custom", modelID: "local/model" })).toBe("local")
    expect(classifyComputerUseModel({ providerID: "lmstudio", modelID: "qwen" })).toBe("local")
  })

  test("defaults unknown and hosted models to remote", () => {
    expect(classifyComputerUseModel({})).toBe("remote")
    expect(classifyComputerUseModel({ providerID: "openai", modelID: "gpt-5" })).toBe("remote")
  })
})
