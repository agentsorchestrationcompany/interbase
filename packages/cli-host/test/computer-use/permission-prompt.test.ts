import { describe, expect, test } from "bun:test"
import { formatComputerUsePermissionPrompt } from "@/computer-use/permission-prompt"

const app = { name: "Mock Browser", bundleId: "ai.interbase.mock-browser" }

describe("computer-use permission prompt", () => {
  test("formats allow prompt metadata for user approval UI", () => {
    expect(
      formatComputerUsePermissionPrompt({
        app,
        signingIdentity: "Example Signing Identity",
        windowTitle: "Example",
        requestedAction: "click",
        requestedScopes: ["click"],
        risk: { level: "medium", reasons: ["pointer action can change UI state"], requiredScopes: ["click"] },
        duration: "session",
        attachment: { screenshot: "confirm", axText: "redacted_summary", reasons: ["user confirmation required"] },
      }),
    ).toEqual({
      app: { name: "Mock Browser", bundleId: "ai.interbase.mock-browser", signingIdentity: "Example Signing Identity" },
      windowTitle: "Example",
      requestedAction: "click",
      requestedScopes: ["click"],
      riskReasons: ["pointer action can change UI state"],
      duration: "session",
      modelAttachment: {
        screenshot: "confirm",
        axText: "redacted_summary",
        screenshotPreviewAllowed: true,
        reasons: ["user confirmation required"],
      },
      options: ["allow_once", "allow_session", "always_allow", "deny"],
      block: undefined,
    })
  })

  test("formats non-overridable denylist blocks", () => {
    expect(
      formatComputerUsePermissionPrompt({
        app: { name: "Keychain Access" },
        requestedAction: "observe",
        requestedScopes: ["observe"],
        attachment: { screenshot: "deny", axText: "deny", reasons: ["app denied by computer-use policy"] },
        blockReason: "app denied by computer-use policy",
      }),
    ).toEqual({
      app: { name: "Keychain Access", bundleId: undefined, signingIdentity: undefined },
      windowTitle: undefined,
      requestedAction: "observe",
      requestedScopes: ["observe"],
      riskReasons: [],
      duration: "once",
      modelAttachment: {
        screenshot: "deny",
        axText: "deny",
        screenshotPreviewAllowed: false,
        reasons: ["app denied by computer-use policy"],
      },
      options: ["deny"],
      block: { overridable: false, reason: "app denied by computer-use policy" },
    })
  })

  test("derives signing identity from app signing metadata", () => {
    expect(
      formatComputerUsePermissionPrompt({
        app: { name: "Signed App", signing: { signingIdentifier: "ai.interbase.signed", teamId: "TEAMID", codeSignatureValid: true } },
        requestedAction: "observe",
        requestedScopes: ["observe"],
        attachment: { screenshot: "deny", axText: "deny", reasons: [] },
      }).app.signingIdentity,
    ).toBe("ai.interbase.signed / TEAMID")

    expect(
      formatComputerUsePermissionPrompt({
        app: { name: "Unsigned App", signing: { codeSignatureValid: false } },
        requestedAction: "observe",
        requestedScopes: ["observe"],
        attachment: { screenshot: "deny", axText: "deny", reasons: [] },
      }).app.signingIdentity,
    ).toBe("invalid signature")
  })
})
