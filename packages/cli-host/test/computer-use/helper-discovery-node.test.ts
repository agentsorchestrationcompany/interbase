import { describe, expect, test } from "bun:test"
import { createNodeHelperBundleDiscovery, createNodeHelperDiscoveryHost, type HelperDiscoverySystem } from "@/computer-use/helper-discovery-node"

const appPath = "native/macos/InterbaseComputerUseHelper.app"
const executablePath = `${appPath}/Contents/MacOS/InterbaseComputerUseHelper`
const plist = `
<plist><dict>
  <key>CFBundleIdentifier</key><string>ai.interbase.computer-use-helper</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>InterbaseComputerUseProtocolMajor</key><integer>0</integer>
</dict></plist>`

function system(overrides: Partial<HelperDiscoverySystem> = {}): HelperDiscoverySystem {
  return {
    exists: (path) => path === appPath,
    readText: (path) => (path.endsWith("Info.plist") ? plist : undefined),
    readBytes: (path) => (path === executablePath ? new Uint8Array([1, 2, 3]) : undefined),
    execFile: (_command, args) => {
      if (args.includes("--verify")) return "valid on disk\nsatisfies its Designated Requirement\n"
      return "Executable=InterbaseComputerUseHelper\nTeamIdentifier=TEAMID\n"
    },
    ...overrides,
  }
}

describe("computer-use node helper discovery host", () => {
  test("discovers app bundles through injected filesystem and codesign system", () => {
    expect(createNodeHelperBundleDiscovery(system()).candidate(appPath)).toMatchObject({
      path: appPath,
      protocolMajor: 0,
      version: "0.1.0",
      signatureValid: true,
      teamId: "TEAMID",
      bundleId: "ai.interbase.computer-use-helper",
    })
  })

  test("reports invalid signatures and preserves missing team identifiers", () => {
    const host = createNodeHelperDiscoveryHost(
      system({
        execFile: (_command, args) => {
          if (args.includes("--verify")) throw new Error("invalid signature")
          return "Executable=InterbaseComputerUseHelper\n"
        },
      }),
    )
    expect(host.signature(appPath)).toEqual({ signatureValid: false, teamId: undefined })
  })

  test("uses missing signature details when codesign metadata is unavailable", () => {
    const host = createNodeHelperDiscoveryHost(
      system({
        execFile: (_command, args) => {
          if (args.includes("--verify")) return "valid"
          throw new Error("metadata unavailable")
        },
      }),
    )
    expect(host.signature(appPath)).toEqual({ signatureValid: true, teamId: undefined })
  })

  test("treats ad-hoc team identifiers as missing release evidence", () => {
    const host = createNodeHelperDiscoveryHost(
      system({
        execFile: (_command, args) => {
          if (args.includes("--verify")) return "valid"
          return "Executable=InterbaseComputerUseHelper\nTeamIdentifier=not set\n"
        },
      }),
    )
    expect(host.signature(appPath)).toEqual({ signatureValid: true, teamId: undefined })
  })

  test("returns undefined file reads from host when the injected system cannot read", () => {
    const host = createNodeHelperDiscoveryHost(system({ readText: () => undefined, readBytes: () => undefined }))
    expect(host.readText(`${appPath}/Contents/Info.plist`)).toBeUndefined()
    expect(host.readBytes(executablePath)).toBeUndefined()
    expect(host.exists(appPath)).toBe(true)
  })

  test("default node host returns undefined for unreadable files", () => {
    const host = createNodeHelperDiscoveryHost()
    expect(host.readText("/definitely/missing/Info.plist")).toBeUndefined()
    expect(host.readBytes("/definitely/missing/InterbaseComputerUseHelper")).toBeUndefined()
  })
})
