import assert from "node:assert/strict"
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import {
  cliReleaseContract,
  packageReleaseArtifacts,
  parseArgs,
  releaseDownloadUrl,
  repoRoot,
  renderHomebrewFormula,
  renderNpmWrapperPackageJson,
  validatePreparedReleaseArtifacts,
} from "../release-core.mjs"

function tempRoot() {
  return mkdtempSync(path.join(tmpdir(), "interbase-release-core-"))
}

function writeTarget(distRoot, name, os, arch) {
  const targetRoot = path.join(distRoot, name)
  const binRoot = path.join(targetRoot, "bin")
  mkdirSync(binRoot, { recursive: true })
  writeFileSync(path.join(targetRoot, "package.json"), `${JSON.stringify({ os: [os], cpu: [arch] })}\n`, "utf8")
  const binPath = path.join(binRoot, cliReleaseContract.binaryName)
  writeFileSync(binPath, "#!/usr/bin/env sh\nexit 0\n", "utf8")
  chmodSync(binPath, 0o755)
}

function writeCanonicalTargets(distRoot) {
  writeTarget(distRoot, "interbase-darwin-arm64", "darwin", "arm64")
  writeTarget(distRoot, "interbase-darwin-x64", "darwin", "x64")
  writeTarget(distRoot, "interbase-linux-arm64", "linux", "arm64")
  writeTarget(distRoot, "interbase-linux-x64", "linux", "x64")
  writeTarget(distRoot, "interbase-linux-x64-musl", "linux", "x64")
  writeTarget(distRoot, "interbase-windows-x64", "win32", "x64")
}

function packageDryRunFiles(packageRoot) {
  if (path.basename(packageRoot) === "npm") {
    return ["package.json", "bin/interbase.cjs", "postinstall.mjs", "LICENSE", "NOTICE", "README.md"]
  }
  return ["package.json", "bin/interbase", "LICENSE", "NOTICE"]
}

function validateArtifacts(outputRoot, options = {}) {
  return validatePreparedReleaseArtifacts(outputRoot, {
    listArchiveEntriesFn: () => [cliReleaseContract.binaryName, "LICENSE", "NOTICE"],
    archiveEntryModesFn: () => [
      { entry: cliReleaseContract.binaryName, mode: "-rwxr-xr-x" },
      { entry: "LICENSE", mode: "-rw-r--r--" },
      { entry: "NOTICE", mode: "-rw-r--r--" },
    ],
    packageDryRunFilesFn: packageDryRunFiles,
    validateInstallMatrixFn: () => ({ bun: "skipped", npm: "skipped", pnpm: "skipped", yarn: "skipped" }),
    ...options,
  })
}

void test("parseArgs handles split and inline option values", () => {
  assert.deepEqual(parseArgs(["--version", "1.2.3", "--json", "--channel=latest"]), {
    version: "1.2.3",
    json: true,
    channel: "latest",
  })
})

void test("render helpers use public release authority", () => {
  assert.equal(
    releaseDownloadUrl("1.2.3", "interbase-darwin-arm64.zip"),
    "https://github.com/agentsorchestrationcompany/interbase/releases/download/v1.2.3/interbase-darwin-arm64.zip",
  )
  const wrapper = renderNpmWrapperPackageJson("1.2.3", [
    { name: "interbase-darwin-arm64" },
    { name: "interbase-linux-x64" },
  ])
  assert.equal(wrapper.name, "interbase")
  assert.equal(wrapper.bin.interbase, "./bin/interbase.cjs")
  assert.equal(wrapper.description, "Public Interbase CLI wrapper package.")
  assert.deepEqual(wrapper.optionalDependencies, {
    "interbase-darwin-arm64": "1.2.3",
    "interbase-linux-x64": "1.2.3",
  })
})

void test("renderHomebrewFormula requires all canonical archive entries", () => {
  assert.throws(
    () => renderHomebrewFormula({ version: "1.2.3", contract: cliReleaseContract, archives: [] }),
    /missing one or more required platform archives/,
  )
})

void test("packageReleaseArtifacts writes verifiable local artifacts without publishing", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)

    const commands = []
    const manifest = packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        commands.push({ command, args, cwd: options.cwd })
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    assert.equal(manifest.version, "1.2.3")
    assert.equal(manifest.contract.releaseRepository, "agentsorchestrationcompany/interbase")
    assert.equal(manifest.legalFiles.sourceRepo.find((entry) => entry.path === "LICENSE")?.sha256.length, 64)
    assert.deepEqual(
      manifest.archives.map((archive) => `${archive.os}:${archive.arch}`),
      ["darwin:arm64", "darwin:x64", "linux:arm64", "linux:x64"],
    )
    assert.deepEqual(
      manifest.archives.map((archive) => archive.nativePackageName),
      ["interbase-darwin-arm64", "interbase-darwin-x64", "interbase-linux-arm64", "interbase-linux-x64"],
    )
    assert.deepEqual(
      commands.map((entry) => entry.command),
      ["zip", "zip", "tar", "tar"],
    )
    assert.equal(validateArtifacts(outputRoot).version, "1.2.3")
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects archives with unexpected entries", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    assert.throws(
      () =>
        validateArtifacts(outputRoot, {
          listArchiveEntriesFn: () => [cliReleaseContract.binaryName, "LICENSE", "NOTICE", "extra.txt"],
        }),
      /archive included unexpected entry extra.txt/,
    )
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects non-executable archive binaries", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    assert.throws(
      () =>
        validateArtifacts(outputRoot, {
          archiveEntryModesFn: () => [{ entry: cliReleaseContract.binaryName, mode: "-rw-r--r--" }],
        }),
      /is not executable in archive mode listing/,
    )
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects wrapper native package drift", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    const wrapperManifestFile = path.join(outputRoot, "npm", "package.json")
    const wrapperManifest = JSON.parse(readFileSync(wrapperManifestFile, "utf8"))
    delete wrapperManifest.optionalDependencies["interbase-linux-x64"]
    writeFileSync(wrapperManifestFile, `${JSON.stringify(wrapperManifest, null, 2)}\n`, "utf8")

    assert.throws(() => validateArtifacts(outputRoot), /npm wrapper optional dependency must match release version/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects dropped wrapper-owned metadata", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    const wrapperManifestFile = path.join(outputRoot, "npm", "package.json")
    const wrapperManifest = JSON.parse(readFileSync(wrapperManifestFile, "utf8"))
    delete wrapperManifest.repository
    writeFileSync(wrapperManifestFile, `${JSON.stringify(wrapperManifest, null, 2)}\n`, "utf8")

    assert.throws(() => validateArtifacts(outputRoot), /npm wrapper repository does not match wrapper source authority/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects malformed release manifest", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    const manifestFile = path.join(outputRoot, "release-manifest.json")
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"))
    manifest.version = "not-semver"
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

    assert.throws(() => validateArtifacts(outputRoot), /release manifest version must be semver/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects mismatched legal file hashes", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    const manifestFile = path.join(outputRoot, "release-manifest.json")
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"))
    manifest.legalFiles.wrapper[0].sha256 = "0000000000000000000000000000000000000000000000000000000000000000"
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

    assert.throws(
      () => validateArtifacts(outputRoot),
      /release manifest wrapper legal files: LICENSE sha256 does not match file contents/,
    )
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects archive paths outside artifact root", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    const manifestFile = path.join(outputRoot, "release-manifest.json")
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"))
    manifest.archives[0].archivePath = path.join(root, "outside.zip")
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8")

    assert.throws(() => validateArtifacts(outputRoot), /archive path: must stay under prepared artifact root/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects unexpected npm package dry-run files", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    assert.throws(
      () =>
        validateArtifacts(outputRoot, {
          packageDryRunFilesFn: () => [
            "package.json",
            "bin/interbase.cjs",
            "postinstall.mjs",
            "LICENSE",
            "private.txt",
          ],
        }),
      /npm pack dry-run included unexpected file private.txt/,
    )
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("validatePreparedReleaseArtifacts rejects native binaries without execute mode", () => {
  const root = tempRoot()
  try {
    const distRoot = path.join(root, "dist")
    const outputRoot = path.join(root, "artifacts")
    mkdirSync(distRoot, { recursive: true })
    writeCanonicalTargets(distRoot)
    packageReleaseArtifacts("1.2.3", {
      distDir: distRoot,
      outputRoot,
      runFn(command, args, options) {
        writeFileSync(args[1], `${command}:${options.cwd}\n`, "utf8")
      },
    })

    const nativeBinary = path.join(outputRoot, "npm", "interbase-darwin-arm64", "bin", "interbase")
    chmodSync(nativeBinary, 0o644)

    assert.throws(() => validateArtifacts(outputRoot), /binary must preserve executable mode bits/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
