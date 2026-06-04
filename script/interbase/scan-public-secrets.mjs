#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { findPublicSecretMatches } from "./secret-patterns.mjs"

const root = path.resolve(new URL("../..", import.meta.url).pathname)

const ignoredDirectories = new Set([".git", ".turbo", "coverage", "dist", "node_modules"])

const ignoredFiles = new Set(["bun.lock", "package-lock.json", "packages/cli-host/src/provider/models-snapshot.js"])

const textExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".nix",
  ".patch",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
])

const extensionlessTextFiles = new Set([
  ".editorconfig",
  ".gitignore",
  ".prettierignore",
  "CODEOWNERS",
  "LICENSE",
  "NOTICE",
  "TEAM_MEMBERS",
  "hooks",
])

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/")
}

function isTextFile(file) {
  return textExtensions.has(path.extname(file)) || extensionlessTextFiles.has(path.basename(file))
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue
      files.push(...(await walk(path.join(directory, entry.name))))
      continue
    }
    if (entry.isFile()) files.push(path.join(directory, entry.name))
  }
  return files
}

const failures = []

for (const file of await walk(root)) {
  const rel = relative(file)
  if (ignoredFiles.has(rel)) continue
  if (!isTextFile(file)) continue
  const text = await readFile(file, "utf8")
  for (const label of findPublicSecretMatches(text)) failures.push(`${rel}: possible ${label}`)
}

if (failures.length > 0) {
  console.error("Public secret scan failed:")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log("Public secret scan passed.")
