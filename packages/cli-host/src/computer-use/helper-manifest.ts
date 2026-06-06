import { existsSync, readFileSync } from "node:fs"
import { PROTOCOL_MAJOR } from "@interbase/computer-use-protocol"
import type { HelperManifest } from "@/computer-use/helper-authenticity"

export const DEFAULT_HELPER_PATH = "native/macos/InterbaseComputerUseHelper.app"

export function defaultDevelopmentHelperManifest(helperPath = DEFAULT_HELPER_PATH): HelperManifest {
  return {
    expectedPath: helperPath,
    protocolMajor: PROTOCOL_MAJOR,
    minVersion: "0.1.0",
    maxVersionExclusive: "1.0.0",
  }
}

export function loadHelperManifest(input: {
  env?: Record<string, string | undefined>
  helperPath?: string
  readFile?: (path: string) => string
  exists?: (path: string) => boolean
} = {}): HelperManifest {
  const env = input.env ?? process.env
  const manifestPath = env.INTERBASE_COMPUTER_USE_HELPER_MANIFEST_PATH
  if (!manifestPath) return defaultDevelopmentHelperManifest(input.helperPath ?? env.INTERBASE_COMPUTER_USE_HELPER_PATH)

  const exists = input.exists ?? existsSync
  if (!exists(manifestPath)) throw new Error(`Computer-use helper manifest not found: ${manifestPath}`)

  const readFile = input.readFile ?? ((path) => readFileSync(path, "utf8"))
  return parseHelperManifest(readFile(manifestPath), manifestPath)
}

export function parseHelperManifest(text: string, source = "computer-use helper manifest"): HelperManifest {
  const value = JSON.parse(text) as Partial<HelperManifest>
  if (typeof value.expectedPath !== "string" || value.expectedPath.length === 0) throw new Error(`${source}: expectedPath is required`)
  if (typeof value.protocolMajor !== "number" || !Number.isInteger(value.protocolMajor)) throw new Error(`${source}: protocolMajor must be an integer`)
  if (typeof value.minVersion !== "string" || value.minVersion.length === 0) throw new Error(`${source}: minVersion is required`)
  if (value.maxVersionExclusive !== undefined && typeof value.maxVersionExclusive !== "string") throw new Error(`${source}: maxVersionExclusive must be a string`)
  if (value.checksum !== undefined && typeof value.checksum !== "string") throw new Error(`${source}: checksum must be a string`)
  if (value.teamId !== undefined && typeof value.teamId !== "string") throw new Error(`${source}: teamId must be a string`)
  if (value.bundleId !== undefined && typeof value.bundleId !== "string") throw new Error(`${source}: bundleId must be a string`)
  return {
    expectedPath: value.expectedPath,
    protocolMajor: value.protocolMajor,
    minVersion: value.minVersion,
    maxVersionExclusive: value.maxVersionExclusive,
    checksum: value.checksum,
    teamId: value.teamId,
    bundleId: value.bundleId,
  }
}
