import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR } from "@interbase/computer-use-protocol"
import { buildHelperReleaseManifest, verifyHelperAuthenticity, type HelperCandidate, type HelperManifest } from "@/computer-use/helper-authenticity"

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

describe("computer-use helper authenticity", () => {
  test("trusts a candidate that matches the manifest", () => {
    expect(verifyHelperAuthenticity({ manifest, candidate })).toEqual({ trusted: true, reason: "verified", warnings: [] })
  })

  test("allows explicit untrusted-driver development override", () => {
    expect(
      verifyHelperAuthenticity({
        manifest,
        candidate: { ...candidate, path: "/tmp/dev-helper" },
        allowUntrustedDriver: true,
      }),
    ).toEqual({
      trusted: true,
      reason: "untrusted_driver_allowed",
      warnings: ["untrusted helper driver allowed by explicit development override"],
    })
  })

  test("rejects identity and version mismatches", () => {
    expect(verifyHelperAuthenticity({ manifest, candidate: { ...candidate, path: "/tmp/dev-helper" } })).toMatchObject({ trusted: false, reason: "path_mismatch" })
    expect(verifyHelperAuthenticity({ manifest, candidate: { ...candidate, protocolMajor: manifest.protocolMajor + 1 } })).toMatchObject({
      trusted: false,
      reason: "protocol_mismatch",
    })
    expect(verifyHelperAuthenticity({ manifest, candidate: { ...candidate, version: "0.0.9" } })).toMatchObject({ trusted: false, reason: "version_out_of_range" })
    expect(verifyHelperAuthenticity({ manifest, candidate: { ...candidate, version: "1.0.0" } })).toMatchObject({ trusted: false, reason: "version_out_of_range" })
    expect(verifyHelperAuthenticity({ manifest, candidate: { ...candidate, checksum: "wrong" } })).toMatchObject({ trusted: false, reason: "checksum_mismatch" })
    expect(verifyHelperAuthenticity({ manifest, candidate: { ...candidate, signatureValid: false } })).toMatchObject({ trusted: false, reason: "signature_invalid" })
    expect(verifyHelperAuthenticity({ manifest, candidate: { ...candidate, teamId: "WRONG" } })).toMatchObject({ trusted: false, reason: "team_id_mismatch" })
    expect(verifyHelperAuthenticity({ manifest, candidate: { ...candidate, bundleId: "wrong.bundle" } })).toMatchObject({ trusted: false, reason: "bundle_id_mismatch" })
  })

  test("warns when checksum or signature status is unavailable", () => {
    const result = verifyHelperAuthenticity({
      manifest: { ...manifest, checksum: undefined },
      candidate: { ...candidate, checksum: undefined, signatureValid: undefined },
    })
    expect(result).toEqual({
      trusted: true,
      reason: "verified",
      warnings: ["helper checksum unavailable; relying on signature metadata", "helper signature status unavailable"],
    })
  })

  test("compares versions with missing or non-numeric parts", () => {
    expect(verifyHelperAuthenticity({ manifest: { ...manifest, minVersion: "0.1" }, candidate: { ...candidate, version: "0.1.0" } })).toMatchObject({
      trusted: true,
    })
    expect(verifyHelperAuthenticity({ manifest: { ...manifest, minVersion: "0.1.alpha" }, candidate: { ...candidate, version: "0.1.0" } })).toMatchObject({
      trusted: true,
    })
  })

  test("builds a pinned release manifest from a signed candidate", () => {
    expect(buildHelperReleaseManifest({ candidate, minVersion: "0.1.0", maxVersionExclusive: "1.0.0" })).toEqual({
      ok: true,
      manifest: {
        expectedPath: candidate.path,
        protocolMajor: candidate.protocolMajor,
        minVersion: "0.1.0",
        maxVersionExclusive: "1.0.0",
        checksum: candidate.checksum,
        teamId: candidate.teamId,
        bundleId: candidate.bundleId,
      },
    })
    expect(buildHelperReleaseManifest({ candidate })).toMatchObject({ ok: true, manifest: { minVersion: candidate.version, maxVersionExclusive: undefined } })
  })

  test("reports missing release manifest evidence", () => {
    expect(buildHelperReleaseManifest({ candidate: { ...candidate, checksum: undefined, signatureValid: undefined, teamId: undefined, bundleId: undefined } })).toEqual({
      ok: false,
      missing: ["checksum", "signature", "teamId", "bundleId"],
    })
    expect(buildHelperReleaseManifest({ candidate: { ...candidate, signatureValid: false } })).toEqual({ ok: false, missing: ["signature"] })
  })
})
