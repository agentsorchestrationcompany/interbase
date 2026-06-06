export type HelperManifest = {
  expectedPath: string
  protocolMajor: number
  minVersion: string
  maxVersionExclusive?: string
  checksum?: string
  teamId?: string
  bundleId?: string
}

export type HelperCandidate = {
  path: string
  protocolMajor: number
  version: string
  checksum?: string
  signatureValid?: boolean
  teamId?: string
  bundleId?: string
}

export type HelperAuthenticityResult =
  | { trusted: true; reason: "verified" | "untrusted_driver_allowed"; warnings: string[] }
  | { trusted: false; reason: "path_mismatch" | "protocol_mismatch" | "version_out_of_range" | "checksum_mismatch" | "signature_invalid" | "team_id_mismatch" | "bundle_id_mismatch"; warnings: string[] }

export type HelperReleaseManifestResult =
  | { ok: true; manifest: HelperManifest }
  | { ok: false; missing: Array<"checksum" | "signature" | "teamId" | "bundleId"> }

export function verifyHelperAuthenticity(input: {
  manifest: HelperManifest
  candidate: HelperCandidate
  allowUntrustedDriver?: boolean
}): HelperAuthenticityResult {
  const warnings: string[] = []
  if (input.allowUntrustedDriver) {
    return { trusted: true, reason: "untrusted_driver_allowed", warnings: ["untrusted helper driver allowed by explicit development override"] }
  }
  if (input.candidate.path !== input.manifest.expectedPath) return denied("path_mismatch", warnings)
  if (input.candidate.protocolMajor !== input.manifest.protocolMajor) return denied("protocol_mismatch", warnings)
  if (compareVersions(input.candidate.version, input.manifest.minVersion) < 0) return denied("version_out_of_range", warnings)
  if (input.manifest.maxVersionExclusive && compareVersions(input.candidate.version, input.manifest.maxVersionExclusive) >= 0) {
    return denied("version_out_of_range", warnings)
  }
  if (input.manifest.checksum && input.candidate.checksum !== input.manifest.checksum) return denied("checksum_mismatch", warnings)
  if (input.candidate.signatureValid === false) return denied("signature_invalid", warnings)
  if (input.manifest.teamId && input.candidate.teamId !== input.manifest.teamId) return denied("team_id_mismatch", warnings)
  if (input.manifest.bundleId && input.candidate.bundleId !== input.manifest.bundleId) return denied("bundle_id_mismatch", warnings)
  if (!input.manifest.checksum) warnings.push("helper checksum unavailable; relying on signature metadata")
  if (input.candidate.signatureValid === undefined) warnings.push("helper signature status unavailable")
  return { trusted: true, reason: "verified", warnings }
}

export function buildHelperReleaseManifest(input: {
  candidate: HelperCandidate
  minVersion?: string
  maxVersionExclusive?: string
}): HelperReleaseManifestResult {
  const missing: Array<"checksum" | "signature" | "teamId" | "bundleId"> = []
  if (!input.candidate.checksum) missing.push("checksum")
  if (input.candidate.signatureValid !== true) missing.push("signature")
  if (!input.candidate.teamId) missing.push("teamId")
  if (!input.candidate.bundleId) missing.push("bundleId")
  if (missing.length > 0) return { ok: false, missing }
  return {
    ok: true,
    manifest: {
      expectedPath: input.candidate.path,
      protocolMajor: input.candidate.protocolMajor,
      minVersion: input.minVersion ?? input.candidate.version,
      maxVersionExclusive: input.maxVersionExclusive,
      checksum: input.candidate.checksum,
      teamId: input.candidate.teamId,
      bundleId: input.candidate.bundleId,
    },
  }
}

function denied(reason: Exclude<HelperAuthenticityResult, { trusted: true }>["reason"], warnings: string[]): HelperAuthenticityResult {
  return { trusted: false, reason, warnings }
}

function compareVersions(left: string, right: string) {
  const l = versionParts(left)
  const r = versionParts(right)
  for (let i = 0; i < Math.max(l.length, r.length); i++) {
    const diff = (l[i] ?? 0) - (r[i] ?? 0)
    if (diff !== 0) return diff > 0 ? 1 : -1
  }
  return 0
}

function versionParts(version: string) {
  return version.split(".").map((part) => {
    const parsed = Number.parseInt(part, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
}
