import { spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { createHelperBundleDiscovery, type HelperDiscoveryHost, type HelperSignatureMetadata } from "@/computer-use/helper-discovery"

export type HelperDiscoverySystem = {
  exists(path: string): boolean
  readText(path: string): string | undefined
  readBytes(path: string): Uint8Array | undefined
  execFile(command: string, args: string[]): string
}

export function createNodeHelperBundleDiscovery(system: HelperDiscoverySystem = nodeSystem()) {
  return createHelperBundleDiscovery(createNodeHelperDiscoveryHost(system))
}

export function createNodeHelperDiscoveryHost(system: HelperDiscoverySystem = nodeSystem()): HelperDiscoveryHost {
  return {
    exists: (path) => system.exists(path),
    readText: (path) => system.readText(path),
    readBytes: (path) => system.readBytes(path),
    signature: (path) => codesignMetadata(path, system),
  }
}

function nodeSystem(): HelperDiscoverySystem {
  return {
    exists: (path) => existsSync(path),
    readText: (path) => readTextFile(path),
    readBytes: (path) => readByteFile(path),
    execFile: (command, args) => {
      const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
      if (result.status !== 0) throw new Error(result.stderr || result.stdout || `command failed: ${command}`)
      return `${result.stdout}${result.stderr}`
    },
  }
}

function readTextFile(path: string) {
  try {
    return readFileSync(path, "utf8")
  } catch {
    return undefined
  }
}

function readByteFile(path: string) {
  try {
    return readFileSync(path)
  } catch {
    return undefined
  }
}

function codesignMetadata(path: string, system: HelperDiscoverySystem): HelperSignatureMetadata {
  const signatureValid = codesignValid(path, system)
  const details = codesignDetails(path, system)
  return { signatureValid, teamId: teamIdentifier(details) }
}

function teamIdentifier(details: string) {
  const value = details.match(/^TeamIdentifier=(.+)$/m)?.[1]
  return value && value !== "not set" ? value : undefined
}

function codesignValid(path: string, system: HelperDiscoverySystem) {
  try {
    system.execFile("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", path])
    return true
  } catch {
    return false
  }
}

function codesignDetails(path: string, system: HelperDiscoverySystem) {
  try {
    return system.execFile("/usr/bin/codesign", ["-dv", "--verbose=4", path])
  } catch {
    return ""
  }
}
