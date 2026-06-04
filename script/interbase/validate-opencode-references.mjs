#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { createHash } from "node:crypto"

const root = path.resolve(new URL("../..", import.meta.url).pathname)
const allowlistPath = path.join(root, "script", "interbase", "opencode-reference-allowlist.json")
const allowedCategories = new Set([
  "legal_attribution",
  "upstream_provenance",
  "upstream_sync",
  "schema_url",
  "dependency_name",
  "package_metadata",
  "test_fixture",
  "source_header",
  "generated_artifact",
  "upstream_compatibility",
  "prompt_text",
  "theme_asset",
  "acp_documentation",
  "provider_name",
  "stale_branding_blocked",
])
const excludedDirectories = new Set([".git", "artifacts", "coverage", "dist", "node_modules", "ts-dist"])
const textExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".md",
  ".mjs",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
])
const extensionlessTextFiles = new Set(["AGENTS.md", "CODEOWNERS", "LICENSE", "NOTICE", "README"])
const referencePattern = /\bOpenCode[A-Za-z0-9_]*\b|\bopencode[A-Za-z0-9._/-]*\b|packages\/opencode/g

function parseJson(filePath, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"))
  } catch (error) {
    throw new Error(`${label}: invalid JSON: ${error.message}`, { cause: error })
  }
}

function validateAllowlist(entries) {
  const failures = []
  if (!Array.isArray(entries)) return ["allowlist: expected array"]
  for (const [index, entry] of entries.entries()) {
    const prefix = `allowlist[${index}]`
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      failures.push(`${prefix}: expected object`)
      continue
    }
    for (const field of ["path", "pattern", "category", "reason", "owner", "retirementRule"]) {
      if (typeof entry[field] !== "string" || entry[field].length === 0)
        failures.push(`${prefix}.${field}: required non-empty string`)
    }
    if (typeof entry.reviewRequired !== "boolean") failures.push(`${prefix}.reviewRequired: required boolean`)
    if (!allowedCategories.has(entry.category))
      failures.push(`${prefix}.category: unsupported category ${entry.category}`)
    try {
      new RegExp(entry.path)
    } catch (error) {
      failures.push(`${prefix}.path: invalid regex: ${error.message}`)
    }
    try {
      new RegExp(entry.pattern)
    } catch (error) {
      failures.push(`${prefix}.pattern: invalid regex: ${error.message}`)
    }
  }
  return failures
}

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath)) || extensionlessTextFiles.has(path.basename(filePath))
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") && entry.name !== ".github") return []
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) return []
      return walk(fullPath)
    }
    if (!entry.isFile()) return []
    if (!isTextFile(fullPath)) return []
    return [fullPath]
  })
}

function compileAllowlist(entries) {
  return entries.map((entry) => ({
    ...entry,
    pathRegex: new RegExp(entry.path),
    patternRegex: new RegExp(entry.pattern),
  }))
}

function isAllowlisted(allowlist, relativePath, line) {
  return allowlist.some((entry) => entry.pathRegex.test(relativePath) && entry.patternRegex.test(line))
}

export function validateOpenCodeReferences(targetRoot = root) {
  const failures = []
  const allowlistEntries = parseJson(
    path.join(targetRoot, "script", "interbase", "opencode-reference-allowlist.json"),
    "allowlist",
  )
  failures.push(...validateAllowlist(allowlistEntries))
  if (failures.length > 0) return failures
  const allowlist = compileAllowlist(allowlistEntries)
  for (const filePath of walk(targetRoot)) {
    const relativePath = path.relative(targetRoot, filePath).replaceAll(path.sep, "/")
    const text = readFileSync(filePath, "utf8")
    const lines = text.split(/\r?\n/)
    for (const [index, line] of lines.entries()) {
      referencePattern.lastIndex = 0
      if (!referencePattern.test(line)) continue
      if (isAllowlisted(allowlist, relativePath, line)) continue
      failures.push(`${relativePath}:${index + 1}: unallowlisted OpenCode reference: ${line.trim()}`)
    }
  }
  return failures
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const failures = validateOpenCodeReferences()
  if (failures.length > 0) {
    console.error(failures.join("\n"))
    process.exit(1)
  }
  console.log("OpenCode reference validation passed.")
}
