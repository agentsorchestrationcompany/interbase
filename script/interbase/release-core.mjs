import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { findPublicSecretMatches } from "./secret-patterns.mjs"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))

export const repoRoot = path.resolve(scriptDirectory, "..", "..")
export const wrapperPackageDirectory = path.join(repoRoot, "packages", "cli")
export const cliPackageDirectory = path.join(repoRoot, "packages", "cli-host")
export const overlayManifestPath = path.join(repoRoot, "packages", "cli-overlay", "src", "manifest.json")
export const artifactRoot = path.join(repoRoot, "artifacts", "cli")
export const releaseManifestPath = path.join(artifactRoot, "release-manifest.json")
export const homebrewFormulaPath = path.join(artifactRoot, "homebrew", "interbase.rb")

const supportedArchiveOs = new Set(["darwin", "linux"])
const requiredLegalFiles = ["LICENSE", "NOTICE"]

export function loadOverlayManifest(filePath = overlayManifestPath) {
  return JSON.parse(readFileSync(filePath, "utf8"))
}

export function releaseContractFromOverlayManifest(manifest) {
  return Object.freeze({
    packageName: manifest.release.npmPackage,
    binaryName: manifest.brand.binaryName,
    releaseRepository: manifest.release.githubRepository,
    tapRepository: manifest.release.homebrewTap,
    wrapperRoot: manifest.release.wrapperRoot,
    implementationRoot: manifest.release.implementationRoot,
  })
}

export const cliReleaseContract = releaseContractFromOverlayManifest(loadOverlayManifest())

export function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    if (!current.startsWith("--")) continue
    const [rawKey, inlineValue] = current.slice(2).split("=", 2)
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue
      continue
    }
    const next = argv[index + 1]
    if (!next || next.startsWith("--")) {
      args[rawKey] = true
      continue
    }
    args[rawKey] = next
    index += 1
  }
  return args
}

export function ensureVersion(version) {
  if (!isSemverVersion(version)) {
    throw new Error("Expected --version <semver>.")
  }
  return version
}

function isSemverVersion(value) {
  return typeof value === "string" && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value)
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? "inherit",
    encoding: options.encoding ?? "utf8",
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}`)
  return result
}

export function runQuiet(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: "pipe",
    encoding: "utf8",
  })
}

export function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex")
}

export function releaseDownloadUrl(version, fileName, releaseRepository = cliReleaseContract.releaseRepository) {
  return `https://github.com/${releaseRepository}/releases/download/v${version}/${fileName}`
}

export function archiveFormatForOs(os) {
  return os === "linux" ? "tar.gz" : "zip"
}

export function archiveFileName(target) {
  return `${target.name}.${archiveFormatForOs(target.os)}`
}

export function isCanonicalReleaseTarget(targetName, os) {
  if (!supportedArchiveOs.has(os)) return false
  return !targetName.includes("-baseline") && !targetName.includes("-musl")
}

export function renderHomebrewFormula(manifest, options = {}) {
  const releaseRepository = options.releaseRepository ?? manifest.contract.releaseRepository
  const homepage = `https://github.com/${releaseRepository}`
  const lookup = new Map(manifest.archives.map((entry) => [`${entry.os}:${entry.arch}`, entry]))
  const macIntel = lookup.get("darwin:x64")
  const macArm = lookup.get("darwin:arm64")
  const linuxIntel = lookup.get("linux:x64")
  const linuxArm = lookup.get("linux:arm64")

  if (!macIntel || !macArm || !linuxIntel || !linuxArm) {
    throw new Error("Release manifest is missing one or more required platform archives.")
  }

  return [
    "# typed: false",
    "# frozen_string_literal: true",
    "",
    "class Interbase < Formula",
    '  desc "Interbase CLI"',
    `  homepage "${homepage}"`,
    `  version "${manifest.version}"`,
    '  depends_on "ripgrep"',
    "",
    "  on_macos do",
    "    if Hardware::CPU.intel?",
    `      url "${macIntel.url}"`,
    `      sha256 "${macIntel.sha256}"`,
    "    end",
    "",
    "    if Hardware::CPU.arm?",
    `      url "${macArm.url}"`,
    `      sha256 "${macArm.sha256}"`,
    "    end",
    "  end",
    "",
    "  on_linux do",
    "    if Hardware::CPU.intel? and Hardware::CPU.is_64_bit?",
    `      url "${linuxIntel.url}"`,
    `      sha256 "${linuxIntel.sha256}"`,
    "    end",
    "",
    "    if Hardware::CPU.arm? and Hardware::CPU.is_64_bit?",
    `      url "${linuxArm.url}"`,
    `      sha256 "${linuxArm.sha256}"`,
    "    end",
    "  end",
    "",
    "  def install",
    `    bin.install "${manifest.contract.binaryName}"`,
    "  end",
    "end",
    "",
  ].join("\n")
}

export function renderNpmWrapperPackageJson(version, nativePackages, options = {}) {
  const baseManifest =
    options.baseManifest ?? JSON.parse(readFileSync(path.join(wrapperPackageDirectory, "package.json"), "utf8"))
  return {
    ...baseManifest,
    version,
    optionalDependencies: Object.fromEntries(nativePackages.map((target) => [target.name, version])),
  }
}

export function renderNpmNativePackageJson(target, version) {
  return {
    name: target.name,
    version,
    license: "MIT",
    os: [target.os],
    cpu: [target.arch],
    files: [`bin/${cliReleaseContract.binaryName}`, "LICENSE", "NOTICE"],
  }
}

export function discoverBuiltTargets(distDir = path.join(cliPackageDirectory, "dist")) {
  return readdirSync(distDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${cliReleaseContract.binaryName}-`))
    .map((entry) => {
      const targetDir = path.join(distDir, entry.name)
      const pkg = JSON.parse(readFileSync(path.join(targetDir, "package.json"), "utf8"))
      const os = pkg.os?.[0]
      const arch = pkg.cpu?.[0]
      if (!os || !arch) throw new Error(`Missing os/cpu metadata for ${entry.name}.`)
      if (!isCanonicalReleaseTarget(entry.name, os)) return null
      const binPath = path.join(targetDir, "bin", cliReleaseContract.binaryName)
      if (!existsSync(binPath)) throw new Error(`Missing built binary for ${entry.name} at ${binPath}.`)
      return { arch, binPath, name: entry.name, os, targetDir }
    })
    .filter(Boolean)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function createManifest(version, archives, options = {}) {
  return {
    schemaVersion: 1,
    version,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    contract: {
      ...cliReleaseContract,
      releaseRepository: options.releaseRepository ?? cliReleaseContract.releaseRepository,
      tapRepository: options.tapRepository ?? cliReleaseContract.tapRepository,
    },
    legalFiles: options.legalFiles,
    archives,
  }
}

function legalFileEntries(root, files = requiredLegalFiles) {
  return files.map((file) => ({
    path: file,
    sha256: sha256File(path.join(root, file)),
  }))
}

export function listArchiveEntries(archive, options = {}) {
  const runQuietFn = options.runQuietFn ?? runQuiet
  const command = archive.os === "linux" ? "tar" : "unzip"
  const args = archive.os === "linux" ? ["-tzf", archive.archivePath] : ["-Z1", archive.archivePath]
  const result = runQuietFn(command, args)
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status ?? 1}: ${String(result.stderr || result.stdout).trim()}`,
    )
  }
  return result.stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseArchiveModes(output) {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/)
      if (parts.length < 2) return null
      return { mode: parts[0], entry: parts.at(-1) }
    })
    .filter(Boolean)
}

export function archiveEntryModes(archive, options = {}) {
  const runQuietFn = options.runQuietFn ?? runQuiet
  if (archive.os === "linux") {
    const result = runQuietFn("tar", ["-tvzf", archive.archivePath])
    if (result.error) throw result.error
    if (result.status !== 0)
      throw new Error(
        `tar -tvzf ${archive.archivePath} failed with exit code ${result.status ?? 1}: ${String(result.stderr || result.stdout).trim()}`,
      )
    return parseArchiveModes(result.stdout)
  }
  const result = runQuietFn("zipinfo", ["-l", archive.archivePath])
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(
      `zipinfo -l ${archive.archivePath} failed with exit code ${result.status ?? 1}: ${String(result.stderr || result.stdout).trim()}`,
    )
  return parseArchiveModes(result.stdout)
}

export function packageDryRunFiles(packageRoot, options = {}) {
  const runQuietFn = options.runQuietFn ?? runQuiet
  const result = runQuietFn("npm", ["pack", "--dry-run", "--json"], { cwd: packageRoot })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`npm pack --dry-run failed for ${packageRoot}: ${(result.stderr || result.stdout).trim()}`)
  }
  let parsed
  try {
    parsed = JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(`npm pack --dry-run returned invalid JSON for ${packageRoot}: ${error.message}`, { cause: error })
  }
  if (!Array.isArray(parsed) || parsed.length !== 1 || !Array.isArray(parsed[0].files)) {
    throw new Error(`npm pack --dry-run returned an unexpected shape for ${packageRoot}`)
  }
  return parsed[0].files.map((entry) => entry.path.replaceAll("\\", "/")).sort()
}

function writeWrapperFiles(npmRoot) {
  for (const relativePath of [
    `bin/${cliReleaseContract.binaryName}.cjs`,
    "postinstall.mjs",
    "LICENSE",
    "NOTICE",
    "README.md",
  ]) {
    const source = path.join(wrapperPackageDirectory, relativePath)
    const target = path.join(npmRoot, relativePath)
    mkdirSync(path.dirname(target), { recursive: true })
    copyFileSync(source, target)
  }
}

function writeNativePackage(target, version, npmRoot) {
  const targetRoot = path.join(npmRoot, target.name)
  const targetBinRoot = path.join(targetRoot, "bin")
  mkdirSync(targetBinRoot, { recursive: true })
  copyFileSync(target.binPath, path.join(targetBinRoot, cliReleaseContract.binaryName))
  copyFileSync(path.join(wrapperPackageDirectory, "LICENSE"), path.join(targetRoot, "LICENSE"))
  copyFileSync(path.join(wrapperPackageDirectory, "NOTICE"), path.join(targetRoot, "NOTICE"))
  writeFileSync(
    path.join(targetRoot, "package.json"),
    `${JSON.stringify(renderNpmNativePackageJson(target, version), null, 2)}\n`,
    "utf8",
  )
}

function writeArchiveLegalFiles(target, archiveRoot) {
  copyFileSync(target.binPath, path.join(archiveRoot, cliReleaseContract.binaryName))
  copyFileSync(path.join(wrapperPackageDirectory, "LICENSE"), path.join(archiveRoot, "LICENSE"))
  copyFileSync(path.join(wrapperPackageDirectory, "NOTICE"), path.join(archiveRoot, "NOTICE"))
}

export function packageReleaseArtifacts(version, options = {}) {
  const releaseRepository = options.releaseRepository ?? cliReleaseContract.releaseRepository
  const tapRepository = options.tapRepository ?? cliReleaseContract.tapRepository
  const distDir = options.distDir ?? path.join(cliPackageDirectory, "dist")
  const outputRoot = options.outputRoot ?? artifactRoot
  const runFn = options.runFn ?? run
  const renderFormula = options.renderFormula ?? renderHomebrewFormula
  const hashFile = options.hashFile ?? sha256File

  rmSync(outputRoot, { force: true, recursive: true })
  mkdirSync(outputRoot, { recursive: true })
  mkdirSync(path.join(outputRoot, "homebrew"), { recursive: true })
  const targets = discoverBuiltTargets(distDir)
  const archives = targets.map((target) => {
    const fileName = archiveFileName(target)
    const archivePath = path.join(outputRoot, fileName)
    const archiveRoot = path.join(outputRoot, ".staging", target.name)
    mkdirSync(archiveRoot, { recursive: true })
    writeArchiveLegalFiles(target, archiveRoot)
    if (target.os === "linux") {
      runFn("tar", ["-czf", archivePath, cliReleaseContract.binaryName, "LICENSE", "NOTICE"], { cwd: archiveRoot })
    } else {
      runFn("zip", ["-q", archivePath, cliReleaseContract.binaryName, "LICENSE", "NOTICE"], { cwd: archiveRoot })
    }
    return {
      os: target.os,
      arch: target.arch,
      nativePackageName: target.name,
      fileName,
      archivePath,
      sha256: hashFile(archivePath),
      url: releaseDownloadUrl(version, fileName, releaseRepository),
    }
  })

  const npmRoot = path.join(outputRoot, "npm")
  mkdirSync(npmRoot, { recursive: true })
  writeFileSync(
    path.join(npmRoot, "package.json"),
    `${JSON.stringify(renderNpmWrapperPackageJson(version, targets), null, 2)}\n`,
    "utf8",
  )
  writeWrapperFiles(npmRoot)
  for (const target of targets) writeNativePackage(target, version, npmRoot)
  const manifest = createManifest(version, archives, {
    releaseRepository,
    tapRepository,
    legalFiles: {
      sourceRepo: legalFileEntries(repoRoot),
      wrapper: legalFileEntries(npmRoot),
      nativePackages: targets.map((target) => ({
        name: target.name,
        files: legalFileEntries(path.join(npmRoot, target.name)),
      })),
      archives: targets.map((target) => ({
        fileName: archiveFileName(target),
        nativePackageName: target.name,
        files: legalFileEntries(path.join(outputRoot, ".staging", target.name)),
      })),
    },
  })
  writeFileSync(path.join(outputRoot, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8")
  writeFileSync(path.join(outputRoot, "homebrew", "interbase.rb"), `${renderFormula(manifest)}\n`, "utf8")
  return manifest
}

function assertFile(filePath, label) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) throw new Error(`Missing ${label}: ${filePath}`)
}

function parseJsonFile(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"))
  } catch (error) {
    throw new Error(`${label}: invalid JSON: ${error.message}`, { cause: error })
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label}: expected object`)
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label}: expected non-empty string`)
}

function assertArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label}: expected array`)
}

function assertLegalFileHashEntries(entries, root, label) {
  assertArray(entries, label)
  for (const requiredFile of requiredLegalFiles) {
    const entry = entries.find((candidate) => candidate?.path === requiredFile)
    if (!entry) throw new Error(`${label}: missing ${requiredFile}`)
    if (typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256))
      throw new Error(`${label}: ${requiredFile} sha256 must be a lowercase hex SHA-256 digest`)
    const filePath = path.join(root, requiredFile)
    assertFile(filePath, `${label} ${requiredFile}`)
    if (sha256File(filePath) !== entry.sha256)
      throw new Error(`${label}: ${requiredFile} sha256 does not match file contents`)
  }
}

function assertArtifactChildPath(filePath, outputRoot, label) {
  assertString(filePath, label)
  const resolved = path.resolve(filePath)
  const resolvedRoot = path.resolve(outputRoot)
  const rel = path.relative(resolvedRoot, resolved)
  if (rel.startsWith("..") || path.isAbsolute(rel)) throw new Error(`${label}: must stay under prepared artifact root`)
}

function assertNoUnresolvedRuntimeSpecs(manifest, label) {
  for (const section of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, spec] of Object.entries(manifest[section] ?? {})) {
      if (typeof spec !== "string") throw new Error(`${label}: ${section}.${name} dependency spec must be a string`)
      if (spec.startsWith("workspace:") || spec.startsWith("catalog:")) {
        throw new Error(`${label}: ${section}.${name} must use a package-consumer-ready version, not ${spec}`)
      }
    }
  }
}

function assertNoTextArtifactSecrets(file, label) {
  const matches = findPublicSecretMatches(readFileSync(file, "utf8"))
  if (matches.length > 0) throw new Error(`${label}: possible secret: ${matches.join(", ")}`)
}

function assertPackageDryRunFiles(packageRoot, expectedFiles, label, packageDryRunFilesFn) {
  const expected = expectedFiles.map((file) => `${file}`)
  const actual = packageDryRunFilesFn(packageRoot).map((file) => `${file}`)
  for (const file of actual) {
    if (!expected.includes(file)) throw new Error(`${label}: npm pack dry-run included unexpected file ${file}`)
  }
  for (const file of expected) {
    if (!actual.includes(file)) throw new Error(`${label}: npm pack dry-run is missing ${file}`)
  }
}

function assertJsonEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${label} does not match wrapper source authority`)
}

function packageTarball(packageRoot, tarballRoot, runQuietFn = runQuiet) {
  mkdirSync(tarballRoot, { recursive: true })
  const result = runQuietFn("npm", ["pack", "--json", "--pack-destination", tarballRoot], { cwd: packageRoot })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`npm pack failed for ${packageRoot}: ${(result.stderr || result.stdout).trim()}`)
  let parsed
  try {
    parsed = JSON.parse(result.stdout)
  } catch (error) {
    throw new Error(`npm pack returned invalid JSON for ${packageRoot}: ${error.message}`, { cause: error })
  }
  if (!Array.isArray(parsed) || parsed.length !== 1 || typeof parsed[0].filename !== "string") {
    throw new Error(`npm pack returned an unexpected shape for ${packageRoot}`)
  }
  const tarballPath = path.join(tarballRoot, parsed[0].filename)
  assertFile(tarballPath, `${packageRoot} tarball`)
  return tarballPath
}

function availablePackageManager(name, runQuietFn = runQuiet) {
  const result = runQuietFn("which", [name])
  return result.status === 0
}

function currentCanonicalNativePackage(manifest) {
  if (!supportedArchiveOs.has(process.platform)) return null
  if (process.arch !== "arm64" && process.arch !== "x64") return null
  const hit = manifest.archives.find((archive) => archive.os === process.platform && archive.arch === process.arch)
  return hit ? hit.nativePackageName : null
}

function writeInstallProject(projectRoot) {
  mkdirSync(projectRoot, { recursive: true })
  writeFileSync(path.join(projectRoot, "package.json"), '{"name":"interbase-install-matrix","private":true}\n', "utf8")
}

function runInstalledBinary(projectRoot, version, env = process.env) {
  const binaryPath = path.join(projectRoot, "node_modules", ".bin", cliReleaseContract.binaryName)
  assertFile(binaryPath, "installed wrapper binary")
  const result = runQuiet(binaryPath, ["--version"], { cwd: projectRoot, env })
  if (result.error) throw result.error
  if (result.status !== 0)
    throw new Error(`installed interbase --version failed: ${(result.stderr || result.stdout).trim()}`)
  if ((result.stdout || "").trim() !== version)
    throw new Error(`installed interbase --version mismatch: expected ${version}, got ${(result.stdout || "").trim()}`)
}

function assertMissingNativeMessage(projectRoot) {
  const binaryPath = path.join(projectRoot, "node_modules", ".bin", cliReleaseContract.binaryName)
  assertFile(binaryPath, "installed wrapper binary")
  const result = runQuiet(binaryPath, ["--version"], { cwd: projectRoot })
  if (result.error) throw result.error
  if (result.status === 0) throw new Error("wrapper binary unexpectedly succeeded without a native package")
  if (!/failed to install the right version of the interbase CLI/i.test(result.stderr || "")) {
    throw new Error(`missing-native error text drifted: ${(result.stderr || result.stdout).trim()}`)
  }
}

function assertWrapperDeepImportBlocked(projectRoot) {
  const result = runQuiet(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'import("interbase/src/index").then(() => { process.exit(17) }).catch((error) => { console.log(error.code || error.message) })',
    ],
    { cwd: projectRoot },
  )
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`deep-import probe failed: ${(result.stderr || result.stdout).trim()}`)
  if (
    !/ERR_PACKAGE_PATH_NOT_EXPORTED|ERR_MODULE_NOT_FOUND|Cannot find module|Package subpath/i.test(result.stdout || "")
  ) {
    throw new Error(`wrapper deep import unexpectedly resolved: ${(result.stdout || result.stderr).trim()}`)
  }
}

function validateLocalInstallMatrix(outputRoot, manifest) {
  const currentNativePackage = currentCanonicalNativePackage(manifest)
  if (!currentNativePackage) return { bun: "skipped", npm: "skipped", pnpm: "skipped", yarn: "skipped" }

  const tarballRoot = path.join(outputRoot, "install-matrix", "tarballs")
  const wrapperTarball = packageTarball(path.join(outputRoot, "npm"), tarballRoot)
  const nativeTarballs = Object.fromEntries(
    manifest.archives.map((archive) => [
      archive.nativePackageName,
      packageTarball(path.join(outputRoot, "npm", archive.nativePackageName), tarballRoot),
    ]),
  )

  const results = { npm: "skipped", bun: "skipped", pnpm: "skipped", yarn: "skipped" }

  if (availablePackageManager("npm")) {
    const npmRoot = path.join(outputRoot, "install-matrix", "npm")
    const npmProject = path.join(npmRoot, "project")
    rmSync(npmRoot, { force: true, recursive: true })
    writeInstallProject(npmProject)
    run("npm", ["install", wrapperTarball, nativeTarballs[currentNativePackage]], { cwd: npmProject })
    assertFile(
      path.join(npmProject, "node_modules", currentNativePackage, "bin", cliReleaseContract.binaryName),
      "npm installed native binary",
    )
    runInstalledBinary(npmProject, manifest.version)
    assertWrapperDeepImportBlocked(npmProject)

    const npmMissingProject = path.join(npmRoot, "missing-native")
    writeInstallProject(npmMissingProject)
    run("npm", ["install", wrapperTarball], { cwd: npmMissingProject })
    rmSync(path.join(npmMissingProject, "node_modules", currentNativePackage), { force: true, recursive: true })
    assertMissingNativeMessage(npmMissingProject)
    results.npm = "validated"
  }

  if (availablePackageManager("bun")) {
    const bunRoot = path.join(outputRoot, "install-matrix", "bun")
    const bunProject = path.join(bunRoot, "project")
    rmSync(bunRoot, { force: true, recursive: true })
    writeInstallProject(bunProject)
    run("bun", ["add", wrapperTarball, nativeTarballs[currentNativePackage]], { cwd: bunProject })
    runInstalledBinary(bunProject, manifest.version)

    const bunMissingProject = path.join(bunRoot, "missing-native")
    writeInstallProject(bunMissingProject)
    run("bun", ["add", wrapperTarball], { cwd: bunMissingProject })
    assertMissingNativeMessage(bunMissingProject)
    results.bun = "validated"
  }

  return results
}

export function validatePreparedReleaseArtifacts(outputRoot = artifactRoot, options = {}) {
  const listEntries = options.listArchiveEntriesFn ?? listArchiveEntries
  const entryModes = options.archiveEntryModesFn ?? archiveEntryModes
  const packageFiles = options.packageDryRunFilesFn ?? packageDryRunFiles
  const validateInstallMatrixFn = options.validateInstallMatrixFn ?? validateLocalInstallMatrix
  const manifestFile = path.join(outputRoot, "release-manifest.json")
  assertFile(manifestFile, "release manifest")
  assertNoTextArtifactSecrets(manifestFile, "release manifest")
  const manifest = parseJsonFile(manifestFile, "release manifest")
  assertObject(manifest, "release manifest")
  assertString(manifest.version, "release manifest version")
  if (!isSemverVersion(manifest.version)) throw new Error("release manifest version must be semver")
  assertString(manifest.generatedAt, "release manifest generatedAt")
  if (Number.isNaN(Date.parse(manifest.generatedAt)))
    throw new Error("release manifest generatedAt must be an ISO-compatible timestamp")
  if (manifest.schemaVersion !== 1) throw new Error("release manifest schemaVersion must be 1")
  assertObject(manifest.contract, "release manifest contract")
  assertString(manifest.contract.packageName, "release manifest package name")
  assertString(manifest.contract.binaryName, "release manifest binary name")
  assertString(manifest.contract.releaseRepository, "release manifest repository")
  assertString(manifest.contract.tapRepository, "release manifest tap repository")
  assertString(manifest.contract.wrapperRoot, "release manifest wrapper root")
  assertString(manifest.contract.implementationRoot, "release manifest implementation root")
  if (manifest.contract.packageName !== cliReleaseContract.packageName)
    throw new Error("Release manifest package name does not match overlay authority")
  if (manifest.contract.binaryName !== cliReleaseContract.binaryName)
    throw new Error("Release manifest binary name does not match overlay authority")
  if (manifest.contract.releaseRepository !== cliReleaseContract.releaseRepository)
    throw new Error("Release manifest repository does not match overlay authority")
  if (manifest.contract.tapRepository !== cliReleaseContract.tapRepository)
    throw new Error("Release manifest tap repository does not match overlay authority")
  if (manifest.contract.wrapperRoot !== cliReleaseContract.wrapperRoot)
    throw new Error("Release manifest wrapper root does not match overlay authority")
  if (manifest.contract.implementationRoot !== cliReleaseContract.implementationRoot)
    throw new Error("Release manifest implementation root does not match overlay authority")
  assertObject(manifest.legalFiles, "release manifest legalFiles")
  assertLegalFileHashEntries(manifest.legalFiles.sourceRepo, repoRoot, "release manifest sourceRepo legal files")
  assertArray(manifest.archives, "release manifest archives")

  const requiredTargets = new Set(["darwin:arm64", "darwin:x64", "linux:arm64", "linux:x64"])
  const seenTargets = new Set()
  for (const archive of manifest.archives) {
    assertObject(archive, "release manifest archive")
    assertString(archive.os, "release manifest archive os")
    assertString(archive.arch, "release manifest archive arch")
    assertString(archive.nativePackageName, "release manifest archive native package name")
    assertString(archive.fileName, "release manifest archive file name")
    assertString(archive.archivePath, "release manifest archive path")
    assertString(archive.sha256, "release manifest archive sha256")
    assertString(archive.url, "release manifest archive URL")
    if (!/^[a-f0-9]{64}$/.test(archive.sha256))
      throw new Error(`${archive.fileName}: sha256 must be a lowercase hex SHA-256 digest`)
    assertArtifactChildPath(archive.archivePath, outputRoot, `${archive.fileName}: archive path`)
    if (path.basename(archive.archivePath) !== archive.fileName)
      throw new Error(`${archive.fileName}: archive path basename must match fileName`)
    const targetKey = `${archive.os}:${archive.arch}`
    if (!requiredTargets.has(targetKey)) throw new Error(`${archive.fileName}: unexpected release target ${targetKey}`)
    if (seenTargets.has(targetKey)) throw new Error(`${archive.fileName}: duplicate release target ${targetKey}`)
    seenTargets.add(targetKey)
    requiredTargets.delete(targetKey)
    assertFile(archive.archivePath, `${archive.os}/${archive.arch} release archive`)
    if (sha256File(archive.archivePath) !== archive.sha256)
      throw new Error(`${archive.fileName}: sha256 does not match manifest`)
    const archiveEntries = listEntries(archive)
    const expectedArchiveEntries = [cliReleaseContract.binaryName, "LICENSE", "NOTICE"]
    for (const entry of expectedArchiveEntries) {
      if (!archiveEntries.includes(entry)) throw new Error(`${archive.fileName}: archive is missing ${entry}`)
    }
    for (const entry of archiveEntries) {
      if (!expectedArchiveEntries.includes(entry))
        throw new Error(`${archive.fileName}: archive included unexpected entry ${entry}`)
    }
    const archiveModes = entryModes(archive)
    const binaryMode = archiveModes.find((entry) => entry.entry === cliReleaseContract.binaryName)?.mode
    if (!binaryMode)
      throw new Error(`${archive.fileName}: archive mode listing is missing ${cliReleaseContract.binaryName}`)
    if (!/x/.test(binaryMode))
      throw new Error(
        `${archive.fileName}: ${cliReleaseContract.binaryName} is not executable in archive mode listing (${binaryMode})`,
      )
    if (archive.url !== releaseDownloadUrl(manifest.version, archive.fileName))
      throw new Error(`${archive.fileName}: release URL must use public release repository`)
  }
  if (requiredTargets.size > 0)
    throw new Error(`Release manifest is missing canonical targets: ${Array.from(requiredTargets).join(", ")}`)

  const formulaFile = path.join(outputRoot, "homebrew", "interbase.rb")
  assertFile(formulaFile, "Homebrew formula preview")
  assertNoTextArtifactSecrets(formulaFile, "Homebrew formula preview")
  if (readFileSync(formulaFile, "utf8") !== `${renderHomebrewFormula(manifest)}\n`)
    throw new Error("Homebrew formula preview does not match rendered release manifest")
  const npmRoot = path.join(outputRoot, "npm")
  assertLegalFileHashEntries(manifest.legalFiles.wrapper, npmRoot, "release manifest wrapper legal files")
  const wrapperManifestFile = path.join(npmRoot, "package.json")
  assertFile(wrapperManifestFile, "npm wrapper package metadata")
  assertNoTextArtifactSecrets(wrapperManifestFile, "npm wrapper package metadata")
  const wrapperLauncherFile = path.join(npmRoot, "bin", `${cliReleaseContract.binaryName}.cjs`)
  assertFile(wrapperLauncherFile, "npm wrapper launcher")
  assertNoTextArtifactSecrets(wrapperLauncherFile, "npm wrapper launcher")
  const postinstallFile = path.join(npmRoot, "postinstall.mjs")
  assertFile(postinstallFile, "npm wrapper postinstall")
  assertNoTextArtifactSecrets(postinstallFile, "npm wrapper postinstall")
  const wrapperLicenseFile = path.join(npmRoot, "LICENSE")
  assertFile(wrapperLicenseFile, "npm wrapper license")
  assertNoTextArtifactSecrets(wrapperLicenseFile, "npm wrapper license")
  const wrapperNoticeFile = path.join(npmRoot, "NOTICE")
  assertFile(wrapperNoticeFile, "npm wrapper notice")
  const wrapperReadmeFile = path.join(npmRoot, "README.md")
  assertFile(wrapperReadmeFile, "npm wrapper readme")
  assertPackageDryRunFiles(
    npmRoot,
    ["package.json", `bin/${cliReleaseContract.binaryName}.cjs`, "postinstall.mjs", "LICENSE", "NOTICE", "README.md"],
    "npm wrapper package",
    packageFiles,
  )
  const wrapperManifest = parseJsonFile(wrapperManifestFile, "npm wrapper package metadata")
  const wrapperSourceManifest = parseJsonFile(
    path.join(wrapperPackageDirectory, "package.json"),
    "wrapper source package metadata",
  )
  assertObject(wrapperManifest, "npm wrapper package metadata")
  if (wrapperManifest.name !== cliReleaseContract.packageName)
    throw new Error("npm wrapper package name does not match overlay authority")
  if (wrapperManifest.version !== manifest.version)
    throw new Error("npm wrapper package version does not match release manifest")
  if (wrapperManifest.bin?.[cliReleaseContract.binaryName] !== `./bin/${cliReleaseContract.binaryName}.cjs`) {
    throw new Error("npm wrapper bin does not point at the launcher")
  }
  if (wrapperManifest.description !== wrapperSourceManifest.description)
    throw new Error("npm wrapper description does not match wrapper source authority")
  assertJsonEqual(wrapperManifest.repository, wrapperSourceManifest.repository, "npm wrapper repository")
  if (wrapperManifest.homepage !== wrapperSourceManifest.homepage)
    throw new Error("npm wrapper homepage does not match wrapper source authority")
  assertJsonEqual(wrapperManifest.bugs, wrapperSourceManifest.bugs, "npm wrapper bugs")
  assertJsonEqual(wrapperManifest.engines, wrapperSourceManifest.engines, "npm wrapper engines")
  if (wrapperManifest.license !== wrapperSourceManifest.license)
    throw new Error("npm wrapper license does not match wrapper source authority")
  assertJsonEqual(wrapperManifest.files, wrapperSourceManifest.files, "npm wrapper files")
  assertJsonEqual(wrapperManifest.publishConfig, wrapperSourceManifest.publishConfig, "npm wrapper publishConfig")
  assertJsonEqual(wrapperManifest.keywords, wrapperSourceManifest.keywords, "npm wrapper keywords")
  assertNoUnresolvedRuntimeSpecs(wrapperManifest, "npm wrapper package")
  if (
    wrapperManifest.optionalDependencies &&
    (typeof wrapperManifest.optionalDependencies !== "object" || Array.isArray(wrapperManifest.optionalDependencies))
  ) {
    throw new Error("npm wrapper package optionalDependencies must be an object")
  }
  const expectedNativePackageNames = manifest.archives.map((archive) => `${archive.nativePackageName}`)
  const wrapperNativeDependencies = wrapperManifest.optionalDependencies ?? {}
  const actualNativePackageNames = Object.keys(wrapperNativeDependencies)
  for (const nativePackageName of expectedNativePackageNames) {
    if (wrapperNativeDependencies[nativePackageName] !== manifest.version) {
      throw new Error(`${nativePackageName}: npm wrapper optional dependency must match release version`)
    }
  }
  for (const nativePackageName of actualNativePackageNames) {
    if (!expectedNativePackageNames.includes(nativePackageName))
      throw new Error(`${nativePackageName}: unexpected npm wrapper optional dependency`)
  }
  for (const archive of manifest.archives) {
    const nativePackageName = archive.nativePackageName
    const targetRoot = path.join(npmRoot, nativePackageName)
    const nativeLegalEntry = manifest.legalFiles.nativePackages.find((entry) => entry?.name === nativePackageName)
    if (!nativeLegalEntry)
      throw new Error(`${nativePackageName}: release manifest is missing native package legal file hashes`)
    assertLegalFileHashEntries(nativeLegalEntry.files, targetRoot, `${nativePackageName} legal files`)
    const nativeManifestFile = path.join(targetRoot, "package.json")
    assertFile(nativeManifestFile, `${nativePackageName} package metadata`)
    assertNoTextArtifactSecrets(nativeManifestFile, `${nativePackageName} package metadata`)
    assertFile(path.join(targetRoot, "bin", cliReleaseContract.binaryName), `${nativePackageName} binary`)
    if ((statSync(path.join(targetRoot, "bin", cliReleaseContract.binaryName)).mode & 0o111) === 0) {
      throw new Error(`${nativePackageName}: binary must preserve executable mode bits`)
    }
    assertFile(path.join(targetRoot, "LICENSE"), `${nativePackageName} license`)
    assertFile(path.join(targetRoot, "NOTICE"), `${nativePackageName} notice`)
    assertPackageDryRunFiles(
      targetRoot,
      ["package.json", `bin/${cliReleaseContract.binaryName}`, "LICENSE", "NOTICE"],
      `${nativePackageName} package`,
      packageFiles,
    )
    const nativeManifest = parseJsonFile(nativeManifestFile, `${nativePackageName} package metadata`)
    assertObject(nativeManifest, `${nativePackageName} package metadata`)
    if (nativeManifest.name !== nativePackageName)
      throw new Error(`${nativePackageName}: package metadata name mismatch`)
    if (nativeManifest.version !== manifest.version)
      throw new Error(`${nativePackageName}: package metadata version mismatch`)
    if (nativeManifest.os?.length !== 1 || nativeManifest.os[0] !== archive.os)
      throw new Error(`${nativePackageName}: package metadata os mismatch`)
    if (nativeManifest.cpu?.length !== 1 || nativeManifest.cpu[0] !== archive.arch)
      throw new Error(`${nativePackageName}: package metadata cpu mismatch`)
    if (nativeManifest.files?.join(",") !== [`bin/${cliReleaseContract.binaryName}`, "LICENSE", "NOTICE"].join(",")) {
      throw new Error(`${nativePackageName}: package metadata files must include the CLI binary and legal files`)
    }
    assertNoUnresolvedRuntimeSpecs(nativeManifest, `${nativePackageName} package`)
  }
  for (const archive of manifest.archives) {
    const archiveLegalEntry = manifest.legalFiles.archives.find((entry) => entry?.fileName === archive.fileName)
    if (!archiveLegalEntry)
      throw new Error(`${archive.fileName}: release manifest is missing archive legal file hashes`)
    assertLegalFileHashEntries(
      archiveLegalEntry.files,
      path.join(outputRoot, ".staging", archive.nativePackageName),
      `${archive.fileName} legal files`,
    )
  }
  manifest.installMatrix = validateInstallMatrixFn(outputRoot, manifest)
  return manifest
}

export function prepareCliRelease(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv)
  const version = ensureVersion(args.version)
  const runFn = options.runFn ?? run
  const packageArtifacts = options.packageReleaseArtifactsFn ?? packageReleaseArtifacts
  const validateArtifacts = options.validatePreparedReleaseArtifactsFn ?? validatePreparedReleaseArtifacts
  const env = {
    ...process.env,
    INTERBASE_VERSION: version,
    INTERBASE_CHANNEL: process.env.INTERBASE_CHANNEL ?? "latest",
  }
  runFn("bun", ["run", "build", "--skip-embed-web-ui"], { cwd: cliPackageDirectory, env })
  const manifest = packageArtifacts(version)
  validateArtifacts()
  return manifest
}
