#!/usr/bin/env node

import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

const root = path.resolve(new URL("../..", import.meta.url).pathname)
const packagesRoot = path.join(root, "packages")
const outputRoot = path.join(root, "artifacts", "cli", "license-review")
const outputPath = path.join(outputRoot, "dependency-license-review.md")

function parseJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"))
  } catch (error) {
    throw new Error(`${label}: invalid JSON: ${error.message}`, { cause: error })
  }
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex")
}

function packageManifestPaths() {
  return [
    path.join(root, "package.json"),
    ...readdirSync(packagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(packagesRoot, entry.name, "package.json"))
      .filter((filePath) => existsSync(filePath)),
  ]
}

function externalDependencyEntries(manifest) {
  return ["dependencies", "optionalDependencies", "peerDependencies"]
    .flatMap((section) => Object.entries(manifest[section] ?? {}).map(([name, spec]) => ({ name, section, spec })))
    .filter(
      (entry) =>
        typeof entry.spec === "string" && !entry.spec.startsWith("workspace:") && !entry.spec.startsWith("catalog:"),
    )
}

function installedPackageMetadata(name, searchRoots = [root]) {
  for (const searchRoot of searchRoots) {
    let current = searchRoot
    for (;;) {
      const packageJsonPath = path.join(current, "node_modules", ...name.split("/"), "package.json")
      if (existsSync(packageJsonPath)) {
        const manifest = parseJson(packageJsonPath, `${name} installed package.json`)
        return {
          name,
          installed: true,
          version: typeof manifest.version === "string" ? manifest.version : null,
          license: typeof manifest.license === "string" ? manifest.license : null,
          repository: typeof manifest.repository?.url === "string" ? manifest.repository.url : null,
          packageJsonPath,
        }
      }
      if (path.resolve(current) === path.resolve(root)) break
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }
  }
  return {
    name,
    installed: false,
    version: null,
    license: null,
    repository: null,
    packageJsonPath: null,
  }
}

function packageNameFromPatchedSpec(spec) {
  if (spec.startsWith("@")) {
    const secondAt = spec.indexOf("@", 1)
    return secondAt === -1 ? spec : spec.slice(0, secondAt)
  }
  const firstAt = spec.indexOf("@")
  return firstAt === -1 ? spec : spec.slice(0, firstAt)
}

function patchedDependencyEntries(rootManifest, searchRoots) {
  return Object.entries(rootManifest.patchedDependencies ?? {}).map(([name, patchFile]) => {
    const patchPath = path.join(root, patchFile)
    const metadata = installedPackageMetadata(packageNameFromPatchedSpec(name), searchRoots)
    return {
      packageSpec: name,
      patchFile,
      patchExists: existsSync(patchPath),
      patchSha256: existsSync(patchPath) ? sha256(patchPath) : null,
      installedVersion: metadata.version,
      installedLicense: metadata.license,
    }
  })
}

function normalizeRepositoryUrl(value) {
  if (!value || typeof value !== "string") return ""
  return value.replace(/^git\+/, "").replace(/\.git$/, "")
}

function renderReport(report) {
  return [
    "# Dependency License Review",
    "",
    "This report is generated locally from the current public checkout. It supports manual operator review while SBOM generation remains deferred for v1.",
    "",
    `Generated at: ${report.generatedAt}`,
    "",
    `Checked manifests: ${report.manifestPaths.length}`,
    `Unique external runtime dependencies: ${report.dependencies.length}`,
    `Patched dependencies: ${report.patchedDependencies.length}`,
    "",
    "## Review Notes",
    "",
    "- Review missing or unknown licenses before publication.",
    "- Review every patched dependency against its patch file hash and retained upstream license.",
    "- SBOM generation is deferred for v1 unless the release/operator owner requires it.",
    "- Generated provider snapshots, themes, and release artifacts still require operator review before publication.",
    "",
    "## Direct External Runtime Dependencies",
    "",
    "| Package | Version | License | Repository | Declared by |",
    "| --- | --- | --- | --- | --- |",
    ...report.dependencies.map(
      (entry) =>
        `| ${entry.name} | ${entry.version ?? "missing"} | ${entry.license ?? "unknown"} | ${normalizeRepositoryUrl(entry.repository) || ""} | ${entry.declaredBy.join(", ")} |`,
    ),
    "",
    "## Patched Dependencies",
    "",
    "| Package spec | Installed version | License | Patch file | Patch SHA-256 |",
    "| --- | --- | --- | --- | --- |",
    ...report.patchedDependencies.map(
      (entry) =>
        `| ${entry.packageSpec} | ${entry.installedVersion ?? "missing"} | ${entry.installedLicense ?? "unknown"} | ${entry.patchFile} | ${entry.patchSha256 ?? "missing"} |`,
    ),
    "",
  ].join("\n")
}

function collectReport() {
  const rootManifest = parseJson(path.join(root, "package.json"), "root package.json")
  const manifests = packageManifestPaths().map((filePath) => ({
    filePath,
    packageRoot: path.dirname(filePath),
    relativePath: path.relative(root, filePath).replaceAll(path.sep, "/"),
    manifest: parseJson(filePath, path.relative(root, filePath)),
  }))
  const dependencyMap = new Map()

  for (const entry of manifests) {
    for (const dependency of externalDependencyEntries(entry.manifest)) {
      const current = dependencyMap.get(dependency.name)
      if (current) {
        current.declaredBy.add(`${entry.relativePath}:${dependency.section}`)
        if (!current.installed) {
          const metadata = installedPackageMetadata(dependency.name, [entry.packageRoot, root])
          if (metadata.installed) {
            current.installed = true
            current.version = metadata.version
            current.license = metadata.license
            current.repository = metadata.repository
          }
        }
        continue
      }
      const metadata = installedPackageMetadata(dependency.name, [entry.packageRoot, root])
      dependencyMap.set(dependency.name, {
        name: dependency.name,
        installed: metadata.installed,
        version: metadata.version,
        license: metadata.license,
        repository: metadata.repository,
        declaredBy: new Set([`${entry.relativePath}:${dependency.section}`]),
      })
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    manifestPaths: manifests.map((entry) => entry.relativePath),
    dependencies: Array.from(dependencyMap.values())
      .map((entry) => ({ ...entry, declaredBy: Array.from(entry.declaredBy).sort() }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    patchedDependencies: patchedDependencyEntries(
      rootManifest,
      manifests.map((entry) => entry.packageRoot),
    ).sort((left, right) => left.packageSpec.localeCompare(right.packageSpec)),
  }
}

const report = collectReport()
mkdirSync(outputRoot, { recursive: true })
writeFileSync(outputPath, `${renderReport(report)}\n`, "utf8")
console.log(`Wrote dependency license review to ${path.relative(root, outputPath)}.`)
