import { describe, expect, test } from "bun:test"
import { observeMockComputer } from "@/computer-use/mock-host"

describe("computer-use mock host", () => {
  test("minimizes screenshots and AX tree data on request", () => {
    const observation = observeMockComputer({ includeScreenshot: false, includeAXTree: false }, { enabled: true })
    expect(observation.screenshot).toBeUndefined()
    expect(observation.elements).toEqual([])
    expect(observation.redaction.axTextAvailableToModel).toBe("none")
  })

  test("bounds returned AX nodes by maxNodeCount", () => {
    expect(observeMockComputer({ maxNodeCount: 1 }, { enabled: true }).elements).toHaveLength(1)
    expect(observeMockComputer({ maxNodeCount: 0 }, { enabled: true }).elements).toHaveLength(0)
    expect(observeMockComputer({ maxNodeCount: -1 }, { enabled: true }).elements).toHaveLength(0)
    expect(observeMockComputer({ maxNodeCount: 1.5 }, { enabled: true }).elements).toHaveLength(0)
    expect(observeMockComputer({}, { enabled: true }).elements).toHaveLength(3)
  })

  test("bounds returned AX nodes by maxTreeDepth", () => {
    expect(observeMockComputer({ maxTreeDepth: 1 }, { enabled: true }).elements.map((element) => element.label ?? element.text)).toEqual(["Search"])
    expect(observeMockComputer({ maxTreeDepth: 2 }, { enabled: true }).elements).toHaveLength(2)
    expect(observeMockComputer({ maxTreeDepth: 0 }, { enabled: true }).elements).toHaveLength(0)
    expect(observeMockComputer({ maxTreeDepth: -1 }, { enabled: true }).elements).toHaveLength(0)
    expect(observeMockComputer({ maxTreeDepth: 1.5 }, { enabled: true }).elements).toHaveLength(0)
  })
})
