import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR } from "@interbase/computer-use-protocol"
import { buildHelperLaunchCommand } from "@/computer-use/helper-launch"
import { createHelperBundleDiscovery, discoverHelperCandidate, helperExecutablePath, type HelperDiscoveryHost } from "@/computer-use/helper-discovery"
import type { HelperManifest } from "@/computer-use/helper-authenticity"

const appPath = "native/macos/ExampleComputerUseHelper.app"
const manifest: HelperManifest = {
  expectedPath: appPath,
  protocolMajor: PROTOCOL_MAJOR,
  minVersion: "0.1.0",
  maxVersionExclusive: "1.0.0",
  checksum: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
  teamId: "TEAMID",
  bundleId: "com.example.computer-use-helper",
}
const binaryPath = `${appPath}/Contents/MacOS/ExampleComputerUseHelper`
const infoPlist = `
<plist><dict>
  <key>CFBundleIdentifier</key><string>com.example.computer-use-helper</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>InterbaseComputerUseProtocolMajor</key><integer>0</integer>
</dict></plist>`

function host(overrides: Partial<HelperDiscoveryHost> = {}): HelperDiscoveryHost {
  const files = new Map<string, string | Uint8Array>([
    [appPath, "dir"],
    [`${appPath}/Contents/Info.plist`, infoPlist],
    [binaryPath, new Uint8Array([1, 2, 3])],
    ["native/macos/direct-helper", new Uint8Array([4, 5, 6])],
    ["native/macos/direct-helper.json", JSON.stringify({ protocolMajor: 0, version: "0.1.0", bundleId: "com.example.computer-use-helper" })],
  ])
  return {
    exists: (path) => files.has(path),
    readText: (path) => {
      const value = files.get(path)
      return typeof value === "string" ? value : undefined
    },
    readBytes: (path) => {
      const value = files.get(path)
      return value instanceof Uint8Array ? value : undefined
    },
    signature: () => ({ signatureValid: true, teamId: "TEAMID" }),
    ...overrides,
  }
}

describe("computer-use helper discovery", () => {
  test("discovers app bundle candidates from plist, checksum, and signature metadata", () => {
    const candidate = discoverHelperCandidate(appPath, host())
    expect(candidate).toMatchObject({
      path: appPath,
      protocolMajor: 0,
      version: "0.1.0",
      bundleId: "com.example.computer-use-helper",
      signatureValid: true,
      teamId: "TEAMID",
      checksum: "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
    })
    expect(helperExecutablePath(appPath)).toBe(binaryPath)
    expect(helperExecutablePath("native/macos/direct-helper")).toBe("native/macos/direct-helper")
  })

  test("discovers direct binary candidates with adjacent metadata", () => {
    expect(discoverHelperCandidate("native/macos/direct-helper", host())).toMatchObject({
      path: "native/macos/direct-helper",
      protocolMajor: 0,
      version: "0.1.0",
      bundleId: "com.example.computer-use-helper",
      checksum: "787c798e39a5bc1910355bae6d0cd87a36b2e10fd0202a83e3bb6b005da83472",
    })
  })

  test("returns undefined for missing or incomplete metadata", () => {
    expect(discoverHelperCandidate("missing.app", host())).toBeUndefined()
    expect(discoverHelperCandidate(appPath, host({ readText: () => undefined }))).toBeUndefined()
    expect(discoverHelperCandidate(appPath, host({ readBytes: () => undefined }))).toBeUndefined()
    expect(discoverHelperCandidate(appPath, host({ readText: () => "<plist></plist>" }))).toBeUndefined()
    expect(discoverHelperCandidate("native/macos/direct-helper", host({ readText: () => undefined }))).toBeUndefined()
    expect(discoverHelperCandidate("native/macos/direct-helper", host({ readText: () => "not-json" }))).toBeUndefined()
    expect(discoverHelperCandidate("native/macos/direct-helper", host({ readText: () => JSON.stringify({ protocolMajor: "0", version: "0.1.0" }) }))).toBeUndefined()
  })

  test("integrates with launch command authenticity checks", () => {
    const discovery = createHelperBundleDiscovery(host())
    expect(buildHelperLaunchCommand({ manifest, discovery })).toMatchObject({
      allowed: true,
      reason: "verified",
      command: { command: "/usr/bin/open", args: [], appPath, launchMethod: "launchServicesPersistentFileRpc" },
    })
    expect(buildHelperLaunchCommand({ manifest, discovery: createHelperBundleDiscovery(host({ signature: () => ({ signatureValid: false, teamId: "TEAMID" }) })) })).toEqual({
      allowed: false,
      reason: "signature_invalid",
    })
  })

  test("preserves unavailable signature metadata as authenticity warning", () => {
    const discovery = createHelperBundleDiscovery(host({ signature: () => undefined }))
    expect(buildHelperLaunchCommand({ manifest: { ...manifest, checksum: undefined, teamId: undefined }, discovery })).toMatchObject({
      allowed: true,
      command: { warnings: ["helper checksum unavailable; relying on signature metadata", "helper signature status unavailable"] },
    })
  })
})
