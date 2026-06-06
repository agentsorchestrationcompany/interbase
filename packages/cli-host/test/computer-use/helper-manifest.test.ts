import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR } from "@interbase/computer-use-protocol"
import { defaultDevelopmentHelperManifest, loadHelperManifest, parseHelperManifest } from "@/computer-use/helper-manifest"

describe("computer-use helper manifest", () => {
  test("builds an unsigned development manifest without release identity metadata", () => {
    expect(defaultDevelopmentHelperManifest("/tmp/helper.app")).toEqual({
      expectedPath: "/tmp/helper.app",
      protocolMajor: PROTOCOL_MAJOR,
      minVersion: "0.1.0",
      maxVersionExclusive: "1.0.0",
    })
  })

  test("loads a pinned manifest from an external path", () => {
    const text = JSON.stringify({
      expectedPath: "/Applications/Helper.app",
      protocolMajor: PROTOCOL_MAJOR,
      minVersion: "0.1.0",
      checksum: "abc123",
      teamId: "TEAMID",
      bundleId: "com.example.helper",
    })
    expect(loadHelperManifest({
      env: { INTERBASE_COMPUTER_USE_HELPER_MANIFEST_PATH: "/private/helper-manifest.json" },
      exists: () => true,
      readFile: () => text,
    })).toEqual({
      expectedPath: "/Applications/Helper.app",
      protocolMajor: PROTOCOL_MAJOR,
      minVersion: "0.1.0",
      checksum: "abc123",
      teamId: "TEAMID",
      bundleId: "com.example.helper",
    })
  })

  test("validates manifest shape", () => {
    expect(() => parseHelperManifest(JSON.stringify({ protocolMajor: PROTOCOL_MAJOR, minVersion: "0.1.0" }))).toThrow("expectedPath")
    expect(() => loadHelperManifest({ env: { INTERBASE_COMPUTER_USE_HELPER_MANIFEST_PATH: "/missing.json" }, exists: () => false })).toThrow("not found")
  })
})
