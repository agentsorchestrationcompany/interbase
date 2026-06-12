import { createHash } from "node:crypto"
import type { HelperCandidate, HelperManifest } from "@/computer-use/helper-authenticity"
import type { HelperLaunchDiscovery } from "@/computer-use/helper-launch"

export type HelperSignatureMetadata = {
  signatureValid?: boolean
  teamId?: string
}

export type HelperDiscoveryHost = {
  exists(path: string): boolean
  readText(path: string): string | undefined
  readBytes(path: string): Uint8Array | undefined
  signature(path: string): HelperSignatureMetadata | undefined
}

export function createHelperBundleDiscovery(host: HelperDiscoveryHost): HelperLaunchDiscovery {
  return {
    exists: (path) => host.exists(path),
    candidate: (path) => discoverHelperCandidate(path, host),
  }
}

export function discoverHelperCandidate(path: string, host: HelperDiscoveryHost): HelperCandidate | undefined {
  if (!host.exists(path)) return undefined
  if (path.endsWith(".app")) return discoverAppCandidate(path, host)
  return discoverBinaryCandidate(path, host)
}

export function helperExecutablePath(path: string) {
  if (!path.endsWith(".app")) return path
  const name = path.split("/").pop()?.replace(/\.app$/, "") || "InterbaseComputerUseHelper"
  return `${path}/Contents/MacOS/${name}`
}

function discoverAppCandidate(path: string, host: HelperDiscoveryHost): HelperCandidate | undefined {
  const info = host.readText(`${path}/Contents/Info.plist`)
  const executablePath = helperExecutablePath(path)
  const bytes = host.readBytes(executablePath)
  if (!info || !bytes) return undefined
  const protocolMajor = numberPlistValue(info, "InterbaseComputerUseProtocolMajor")
  const version = stringPlistValue(info, "CFBundleShortVersionString")
  if (protocolMajor === undefined || !version) return undefined
  const signature = host.signature(path) ?? {}
  return {
    path,
    protocolMajor,
    version,
    checksum: sha256(bytes),
    signatureValid: signature.signatureValid,
    teamId: signature.teamId,
    bundleId: stringPlistValue(info, "CFBundleIdentifier"),
  }
}

function discoverBinaryCandidate(path: string, host: HelperDiscoveryHost): HelperCandidate | undefined {
  const bytes = host.readBytes(path)
  if (!bytes) return undefined
  const metadata = host.readText(`${path}.json`)
  if (!metadata) return undefined
  const parsed = parseBinaryMetadata(metadata)
  if (!parsed) return undefined
  const signature = host.signature(path) ?? {}
  return { path, checksum: sha256(bytes), signatureValid: signature.signatureValid, teamId: signature.teamId, ...parsed }
}

function parseBinaryMetadata(input: string): Pick<HelperCandidate, "protocolMajor" | "version" | "bundleId"> | undefined {
  try {
    const parsed = JSON.parse(input) as Partial<Pick<HelperCandidate, "protocolMajor" | "version" | "bundleId">>
    if (typeof parsed.protocolMajor !== "number" || typeof parsed.version !== "string") return undefined
    return { protocolMajor: parsed.protocolMajor, version: parsed.version, bundleId: parsed.bundleId }
  } catch {
    return undefined
  }
}

function stringPlistValue(plist: string, key: string) {
  return plist.match(new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<string>([^<]+)</string>`))?.[1]
}

function numberPlistValue(plist: string, key: string) {
  const value = plist.match(new RegExp(`<key>${escapeRegExp(key)}</key>\\s*<integer>([0-9]+)</integer>`))?.[1]
  return value === undefined ? undefined : Number(value)
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex")
}

function escapeRegExp(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
