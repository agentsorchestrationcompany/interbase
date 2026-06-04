#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { findPublicSecretMatches } from "./secret-patterns.mjs"
import { deferredGeneratedArtifactFailure } from "./public-artifact-policy.mjs"

const root = path.resolve(new URL("../..", import.meta.url).pathname)
const packagesDirectory = path.join(root, "packages")
const cliPackage = path.join(packagesDirectory, "cli")
const overlayManifestPath = path.join(packagesDirectory, "cli-overlay", "src", "manifest.json")

const requiredPackageFiles = ["package.json", "LICENSE", "NOTICE", "README.md", "bin/interbase.cjs", "postinstall.mjs"]

const disallowedPackagePathPrefixes = ["coverage/", "test/"]

const disallowedCliPackagePathPrefixes = [".github/", "dist/", "node_modules/", "script/", "scripts/", "src/", "test/"]

const textExtensions = new Set([".cjs", ".js", ".json", ".md", ".mjs", ".sh", ".ts", ".tsx", ".txt", ".yaml", ".yml"])

const extensionlessTextFiles = new Set(["CODEOWNERS", "LICENSE", "NOTICE", "README"])

async function exists(target) {
  return stat(target).then(
    () => true,
    () => false,
  )
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue
      files.push(...(await walk(path.join(directory, entry.name))))
      continue
    }
    if (entry.isFile()) files.push(path.join(directory, entry.name))
  }
  return files
}

function packageFilesFromDryRun(packageRoot) {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: packageRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.status !== 0) {
    throw new Error(`npm pack --dry-run failed: ${(result.stderr || result.stdout).trim()}`)
  }
  const parsed = JSON.parse(result.stdout)
  if (!Array.isArray(parsed) || parsed.length !== 1 || !Array.isArray(parsed[0].files)) {
    throw new Error("npm pack --dry-run returned an unexpected shape")
  }
  return parsed[0].files.map((entry) => entry.path)
}

function visitManifestTargets(value, visitor) {
  if (typeof value === "string") {
    visitor(value)
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) visitManifestTargets(item, visitor)
    return
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) visitManifestTargets(item, visitor)
  }
}

function manifestEntrypointTargets(manifest) {
  const targets = []
  for (const field of ["main", "module", "types", "exports", "imports", "bin"]) {
    visitManifestTargets(manifest[field], (target) => targets.push({ field, target }))
  }
  return targets
}

function isTextFile(file) {
  return textExtensions.has(path.extname(file)) || extensionlessTextFiles.has(path.basename(file))
}

function packageRelativeEntrypoint(target) {
  const normalizedTarget = target.replaceAll("\\", "/")
  if (!normalizedTarget.startsWith("./") || normalizedTarget.includes("*")) return null
  return normalizedTarget.slice(2)
}

function runtimeDependencyEntries(manifest) {
  return ["dependencies", "peerDependencies", "optionalDependencies"].flatMap((section) =>
    Object.entries(manifest[section] ?? {}).map(([name, spec]) => ({ name, section, spec })),
  )
}

const failures = []
const packageEntries = await readdir(packagesDirectory, { withFileTypes: true })
const packageRoots = []
for (const entry of packageEntries) {
  if (!entry.isDirectory()) continue
  const packageRoot = path.join(packagesDirectory, entry.name)
  if (await exists(path.join(packageRoot, "package.json"))) packageRoots.push(packageRoot)
}

const packageFiles = packageFilesFromDryRun(cliPackage)
const packageFileSet = new Set(packageFiles)
const overlayManifest = JSON.parse(await readFile(overlayManifestPath, "utf8"))
const cliManifest = JSON.parse(await readFile(path.join(cliPackage, "package.json"), "utf8"))

if (cliManifest.name !== overlayManifest.release.npmPackage) {
  failures.push(
    `packages/cli/package.json: name ${cliManifest.name} must match overlay release npm package ${overlayManifest.release.npmPackage}`,
  )
}

if (!cliManifest.bin || cliManifest.bin[overlayManifest.brand.binaryName] !== "./bin/interbase.cjs") {
  failures.push(`packages/cli/package.json: bin must expose ${overlayManifest.brand.binaryName} as ./bin/interbase.cjs`)
}

for (const requiredFile of requiredPackageFiles) {
  if (!packageFileSet.has(requiredFile)) failures.push(`npm package is missing required file: ${requiredFile}`)
}

for (const packageRoot of packageRoots) {
  const packageName = path.relative(root, packageRoot).replaceAll(path.sep, "/")
  const manifestPath = path.join(packageRoot, "package.json")
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
  if (packageRoot !== cliPackage && manifest.publishConfig?.access !== "public") continue
  for (const { name, section, spec } of runtimeDependencyEntries(manifest)) {
    if (typeof spec !== "string") {
      failures.push(`${packageName}/package.json: ${section}.${name} dependency spec must be a string`)
      continue
    }
    if (spec.startsWith("workspace:") || spec.startsWith("catalog:")) {
      failures.push(
        `${packageName}/package.json: ${section}.${name} must use a package-consumer-ready version, not ${spec}`,
      )
    }
  }
  const dryRunFiles = packageRoot === cliPackage ? packageFiles : packageFilesFromDryRun(packageRoot)
  const dryRunFileSet = new Set(dryRunFiles.map((file) => file.replaceAll("\\", "/")))
  for (const { field, target } of manifestEntrypointTargets(manifest)) {
    const normalizedTarget = target.replaceAll("\\", "/")
    if (normalizedTarget.startsWith("/"))
      failures.push(`${packageName}/package.json: ${field} target ${target} must not be absolute`)
    if (normalizedTarget.startsWith("../") || normalizedTarget.includes("/../"))
      failures.push(`${packageName}/package.json: ${field} target ${target} must stay inside the package`)
    if (
      normalizedTarget.startsWith("./") &&
      !normalizedTarget.includes("*") &&
      !(await exists(path.join(packageRoot, normalizedTarget)))
    ) {
      failures.push(`${packageName}/package.json: ${field} target ${target} does not exist`)
    }
    const packageEntrypoint = packageRelativeEntrypoint(target)
    if (packageEntrypoint && !dryRunFileSet.has(packageEntrypoint)) {
      failures.push(`${packageName}/package.json: ${field} target ${target} is missing from npm pack dry-run files`)
    }
  }
  for (const file of dryRunFiles) {
    const normalized = file.replaceAll("\\", "/")
    const artifactPath = `${packageName}/${normalized}`
    const disallowedPackagePrefix = disallowedPackagePathPrefixes.find((prefix) => normalized.startsWith(prefix))
    if (disallowedPackagePrefix)
      failures.push(`${artifactPath}: disallowed package path prefix ${disallowedPackagePrefix}`)
    if (packageRoot === cliPackage) {
      const disallowedPrefix = disallowedCliPackagePathPrefixes.find((prefix) => normalized.startsWith(prefix))
      if (disallowedPrefix) failures.push(`${artifactPath}: disallowed package path prefix ${disallowedPrefix}`)
    }
    const deferredGeneratedArtifact = deferredGeneratedArtifactFailure(artifactPath, normalized)
    if (deferredGeneratedArtifact) failures.push(deferredGeneratedArtifact)
    if (!isTextFile(file)) continue
    const sourcePath = path.join(packageRoot, file)
    if (!(await exists(sourcePath))) continue
    const text = await readFile(sourcePath, "utf8")
    const secretMatches = findPublicSecretMatches(text)
    if (secretMatches.length > 0)
      failures.push(`${artifactPath}: possible secret in packaged file: ${secretMatches.join(", ")}`)
  }
}

for (const file of await walk(path.join(cliPackage, "bin"))) {
  const rel = path.relative(cliPackage, file).replaceAll(path.sep, "/")
  if (!packageFileSet.has(rel)) continue
  if (!isTextFile(file)) continue
  const text = await readFile(file, "utf8")
  const secretMatches = findPublicSecretMatches(text)
  if (secretMatches.length > 0) failures.push(`${rel}: possible secret in packaged file: ${secretMatches.join(", ")}`)
}

const distDir = path.join(cliPackage, "dist")
if (await exists(distDir)) {
  const distEntries = await readdir(distDir, { withFileTypes: true })
  const builtBinaries = distEntries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("interbase-"))
    .map((entry) => ({
      name: entry.name,
      path: path.join(distDir, entry.name, "bin", entry.name.includes("windows") ? "interbase.exe" : "interbase"),
    }))
  for (const builtBinary of builtBinaries) {
    if (!(await exists(builtBinary.path))) {
      failures.push(`built binary is missing: ${builtBinary.path}`)
      continue
    }
    const currentPlatformName = process.platform === "win32" ? "windows" : process.platform
    const isCurrentPlatform = builtBinary.name === `interbase-${currentPlatformName}-${process.arch}`
    if (!isCurrentPlatform) continue
    const version = spawnSync(builtBinary.path, ["--version"], { encoding: "utf8" })
    if (version.status !== 0) {
      const smokeFailure = version.stderr || version.stdout || version.error?.message || "unknown error"
      failures.push(`built binary smoke test failed: ${smokeFailure.trim()}`)
    }
  }
  for (const file of await walk(distDir)) {
    const rel = path.relative(cliPackage, file).replaceAll(path.sep, "/")
    const deferredGeneratedArtifact = deferredGeneratedArtifactFailure(rel, rel)
    if (deferredGeneratedArtifact) failures.push(deferredGeneratedArtifact)
    if (!isTextFile(file)) continue
    const text = await readFile(file, "utf8")
    const secretMatches = findPublicSecretMatches(text)
    if (secretMatches.length > 0) failures.push(`${rel}: possible secret in built output: ${secretMatches.join(", ")}`)
  }
}

if (failures.length > 0) {
  console.error("Public artifact validation failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("Public artifact validation passed.")
