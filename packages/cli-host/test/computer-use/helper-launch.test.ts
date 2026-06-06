import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR } from "@interbase/computer-use-protocol"
import { type HelperCandidate, type HelperManifest } from "@/computer-use/helper-authenticity"
import { buildHelperLaunchCommand, buildHelperStatusMenuLaunchCommand, type HelperLaunchDiscovery } from "@/computer-use/helper-launch"

const manifest: HelperManifest = {
  expectedPath: "native/macos/ExampleComputerUseHelper.app",
  protocolMajor: PROTOCOL_MAJOR,
  minVersion: "0.1.0",
  maxVersionExclusive: "1.0.0",
  checksum: "abc123",
  teamId: "TEAMID",
  bundleId: "com.example.computer-use-helper",
}

const candidate: HelperCandidate = {
  path: manifest.expectedPath,
  protocolMajor: manifest.protocolMajor,
  version: "0.1.2",
  checksum: manifest.checksum,
  signatureValid: true,
  teamId: manifest.teamId,
  bundleId: manifest.bundleId,
}

function discovery(input: { exists?: boolean; candidate?: HelperCandidate }): HelperLaunchDiscovery {
  return {
    exists: () => input.exists ?? true,
    candidate: () => input.candidate,
  }
}

describe("computer-use helper launch", () => {
  test("builds persistent LaunchServices RPC command for verified app bundle helper", () => {
    const result = buildHelperLaunchCommand({ manifest, discovery: discovery({ candidate }) })
    expect(result).toEqual({
      allowed: true,
      reason: "verified",
      command: {
        command: "/usr/bin/open",
        args: [],
        env: { INTERBASE_COMPUTER_USE_PROTOCOL_MAJOR: String(manifest.protocolMajor) },
        warnings: [],
        appPath: manifest.expectedPath,
        launchMethod: "launchServicesPersistentFileRpc",
      },
    })
    if (!result.allowed) throw new Error("expected verified helper")
    expect(buildHelperStatusMenuLaunchCommand(result.command)).toEqual({
      command: "/usr/bin/open",
      args: ["-g", manifest.expectedPath, "--args", "--status-menu"],
      env: { INTERBASE_COMPUTER_USE_PROTOCOL_MAJOR: String(manifest.protocolMajor) },
    })
  })

  test("builds stdio launch command for direct binary helpers", () => {
    const directManifest = { ...manifest, expectedPath: "native/macos/interbase-computer-use-helper" }
    const directCandidate = { ...candidate, path: directManifest.expectedPath }
    expect(buildHelperLaunchCommand({ manifest: directManifest, discovery: discovery({ candidate: directCandidate }) })).toMatchObject({
      allowed: true,
      command: { command: "native/macos/interbase-computer-use-helper", args: ["--stdio"] },
    })
    const result = buildHelperLaunchCommand({ manifest: directManifest, discovery: discovery({ candidate: directCandidate }) })
    if (!result.allowed) throw new Error("expected verified helper")
    expect(buildHelperStatusMenuLaunchCommand(result.command)).toBeUndefined()
  })

  test("denies missing helper paths or missing candidate metadata", () => {
    expect(buildHelperLaunchCommand({ manifest, discovery: discovery({ exists: false, candidate }) })).toEqual({ allowed: false, reason: "helper_not_found" })
    expect(buildHelperLaunchCommand({ manifest, discovery: discovery({ candidate: undefined }) })).toEqual({ allowed: false, reason: "helper_not_found" })
  })

  test("refuses authenticity mismatches before launch", () => {
    expect(buildHelperLaunchCommand({ manifest, helperPath: "/tmp/dev-helper", discovery: discovery({ candidate: { ...candidate, path: "/tmp/dev-helper" } }) })).toEqual({
      allowed: false,
      reason: "path_mismatch",
    })
    expect(buildHelperLaunchCommand({ manifest, discovery: discovery({ candidate: { ...candidate, protocolMajor: manifest.protocolMajor + 1 } }) })).toEqual({
      allowed: false,
      reason: "protocol_mismatch",
    })
    expect(buildHelperLaunchCommand({ manifest, discovery: discovery({ candidate: { ...candidate, version: "9.0.0" } }) })).toEqual({
      allowed: false,
      reason: "version_out_of_range",
    })
    expect(buildHelperLaunchCommand({ manifest, discovery: discovery({ candidate: { ...candidate, checksum: "wrong" } }) })).toEqual({
      allowed: false,
      reason: "checksum_mismatch",
    })
    expect(buildHelperLaunchCommand({ manifest, discovery: discovery({ candidate: { ...candidate, signatureValid: false } }) })).toEqual({
      allowed: false,
      reason: "signature_invalid",
    })
    expect(buildHelperLaunchCommand({ manifest, discovery: discovery({ candidate: { ...candidate, teamId: "WRONG" } }) })).toEqual({
      allowed: false,
      reason: "team_id_mismatch",
    })
    expect(buildHelperLaunchCommand({ manifest, discovery: discovery({ candidate: { ...candidate, bundleId: "wrong" } }) })).toEqual({
      allowed: false,
      reason: "bundle_id_mismatch",
    })
  })

  test("allows explicit untrusted helper override for local development", () => {
    expect(
      buildHelperLaunchCommand({
        manifest,
        helperPath: "/tmp/dev-helper",
        env: { INTERBASE_COMPUTER_USE_ALLOW_UNTRUSTED_DRIVER: "1" },
        discovery: discovery({ candidate: { ...candidate, path: "/tmp/dev-helper", signatureValid: undefined } }),
      }),
    ).toEqual({
      allowed: true,
      reason: "untrusted_driver_allowed",
      command: {
        command: "/tmp/dev-helper",
        args: ["--stdio"],
        env: { INTERBASE_COMPUTER_USE_PROTOCOL_MAJOR: String(manifest.protocolMajor) },
        warnings: ["untrusted helper driver allowed by explicit development override"],
      },
    })
  })

  test("handles app bundles without pinned signature metadata", () => {
    const unnamedManifest = { ...manifest, expectedPath: "native/macos/.app", checksum: undefined, teamId: undefined, bundleId: undefined }
    const unnamedCandidate = { ...candidate, path: unnamedManifest.expectedPath, checksum: undefined, signatureValid: undefined, teamId: undefined, bundleId: undefined }
    expect(buildHelperLaunchCommand({ manifest: unnamedManifest, discovery: discovery({ candidate: unnamedCandidate }) })).toMatchObject({
      allowed: true,
      command: { command: "/usr/bin/open", args: [], appPath: "native/macos/.app", launchMethod: "launchServicesPersistentFileRpc" },
    })
  })
})
