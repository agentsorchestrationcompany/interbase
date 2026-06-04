#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const root = path.resolve(new URL("../..", import.meta.url).pathname)
const packagesRoot = path.join(root, "packages")
const wrapperRoot = path.join(packagesRoot, "cli")
const hostRoot = path.join(packagesRoot, "cli-host")

const failures = []
const names = new Map()

function dependencyEntries(manifest) {
  return ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].flatMap((section) =>
    Object.entries(manifest[section] ?? {}).map(([name, spec]) => ({ name, section, spec })),
  )
}

for (const entry of await readdir(packagesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const packageRoot = path.join(packagesRoot, entry.name)
  const manifestPath = path.join(packageRoot, "package.json")
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"))
    const relativePath = path.relative(root, packageRoot).replaceAll(path.sep, "/")
    const seenAt = names.get(manifest.name)
    if (seenAt)
      failures.push(
        `${relativePath}/package.json: duplicate workspace package name ${manifest.name} already used by ${seenAt}`,
      )
    else names.set(manifest.name, relativePath)

    if (relativePath === "packages/cli") {
      if (manifest.name !== "interbase") failures.push("packages/cli/package.json: name must be interbase")
      if (manifest.private === true) failures.push("packages/cli/package.json: publishable wrapper must not be private")
    }

    if (relativePath === "packages/cli-host") {
      if (manifest.name !== "@interbase/cli-host")
        failures.push("packages/cli-host/package.json: name must be @interbase/cli-host")
      if (manifest.private === true) failures.push("packages/cli-host/package.json: source host must be publishable")
      if (manifest.public !== true) failures.push("packages/cli-host/package.json: source host must declare public: true")
    }

    if (relativePath !== "packages/cli" && manifest.name === "interbase") {
      failures.push(`${relativePath}/package.json: only packages/cli may expose interbase`)
    }

    if (relativePath !== "packages/cli-host" && manifest.name === "@interbase/cli-host") {
      failures.push(`${relativePath}/package.json: only packages/cli-host may expose @interbase/cli-host`)
    }

    for (const dependency of dependencyEntries(manifest)) {
      if (dependency.name !== "interbase") continue
      failures.push(
        `${relativePath}/package.json: ${dependency.section}.interbase must not be used as a host implementation dependency`,
      )
    }
  } catch {
    continue
  }
}

for (const required of [wrapperRoot, hostRoot]) {
  const relativePath = path.relative(root, required).replaceAll(path.sep, "/")
  try {
    await readFile(path.join(required, "package.json"), "utf8")
  } catch {
    failures.push(`${relativePath}/package.json: required package manifest is missing`)
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"))
  process.exit(1)
}

console.log("Package identity validated.")
