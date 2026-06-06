import { describe, expect, test } from "bun:test"
import { actionPermissionPattern, appPermissionPattern, computerUsePermission, observePermissionPattern } from "@/computer-use/permission"

describe("computer-use permissions", () => {
  test("builds stable permission keys", () => {
    expect(computerUsePermission("observe")).toBe("computer.observe")
    expect(computerUsePermission("fileDialog")).toBe("computer.fileDialog")
    expect(computerUsePermission("model_attachment")).toBe("computer.model_attachment")
  })

  test("builds app and action patterns", () => {
    expect(appPermissionPattern({ name: "Mock", bundleId: "bundle", path: "/App" })).toBe("bundle")
    expect(appPermissionPattern({ name: "Mock", path: "/App" })).toBe("/App")
    expect(appPermissionPattern({ name: "Mock" })).toBe("Mock")
    expect(actionPermissionPattern({ app: { name: "Mock", bundleId: "bundle" }, windowId: "win", action: "click" })).toBe("bundle:win:click")
    expect(actionPermissionPattern({ app: { name: "Mock" }, windowId: "active", action: "click" })).toBe("Mock:window:click")
    expect(actionPermissionPattern({ app: { name: "Mock" }, windowId: "current", action: "click" })).toBe("Mock:window:click")
    expect(actionPermissionPattern({ app: { name: "Mock" }, windowId: "", action: "click" })).toBe("Mock:window:click")
    expect(actionPermissionPattern({ app: { name: "Mock" }, action: "type" })).toBe("Mock:window:type")
  })

  test("builds observe target patterns", () => {
    expect(observePermissionPattern({})).toBe("frontmost:window")
    expect(observePermissionPattern({ target: { app: { name: "App" } } })).toBe("App:window")
    expect(observePermissionPattern({ target: { app: { path: "/App" }, windowId: "win" } })).toBe("/App:win")
    expect(observePermissionPattern({ target: { app: { bundleId: "bundle" }, windowId: "win" } })).toBe("bundle:win")
    expect(observePermissionPattern({ target: { app: { name: "current", bundleId: "", path: "" }, windowId: "active" } })).toBe("frontmost:window")
    expect(observePermissionPattern({ target: { windowId: "current" } })).toBe("frontmost:window")
  })
})
