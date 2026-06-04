import { describe, expect, test } from "bun:test"
import { findCommand, InterbaseOverlay, requiredCommands, requiredPlugins } from "../src"

describe("interbase overlay manifest", () => {
  test("points release metadata at public infrastructure", () => {
    expect(InterbaseOverlay.release.githubRepository).toBe("agentsorchestrationcompany/interbase")
    expect(InterbaseOverlay.release.npmPackage).toBe("interbase")
    expect(InterbaseOverlay.release.wrapperRoot).toBe("packages/cli")
    expect(InterbaseOverlay.release.implementationRoot).toBe("packages/cli-host")
  })

  test("keeps required public commands and plugins discoverable", () => {
    expect(requiredCommands("top-level").map((command) => command.name)).toEqual(["doctor"])
    expect(findCommand("login")).toBeUndefined()
    expect(findCommand("connect")?.name).toBe("provider")
    expect(requiredPlugins("server").map((plugin) => plugin.id)).toContain("interbase-provider-catalog")
  })
})
