#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import path from "node:path"
const defaultRoot = path.resolve(new URL("../..", import.meta.url).pathname)

const allowedTopLevelPaths = new Set([
  ".DS_Store",
  ".env.example",
  ".git",
  ".editorconfig",
  ".github",
  ".gitignore",
  "eslint.config.mjs",
  ".prettierignore",
  "AGENTS.md",
  "artifacts",
  "assets",
  "bun.lock",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "docs",
  "LICENSE",
  "node_modules",
  "NOTICE",
  "OPEN_SOURCE_READINESS_REPORT.md",
  "package.json",
  "packages",
  "patches",
  "README.md",
  "REMOTE_RUNTIME_PLAN_AUDIT.md",
  "script",
  "SECURITY.md",
  "TELEMETRY.md",
  "test",
  "tsconfig.json",
  "vitest.config.ts",
])

const allowedPublicPackages = new Set([
  "cli",
  "cli-aliases-plugin",
  "cli-agent-backends",
  "cli-computer-use-plugin",
  "cli-compat",
  "cli-goal-plugin",
  "cli-host",
  "cli-keychain",
  "cli-local-state",
  "cli-model-switching",
  "cli-overlay",
  "cli-provider-catalog-plugin",
  "cli-runtime-context",
  "cli-session-turns",
  "cli-telemetry",
  "core",
  "computer-use-policy",
  "computer-use-protocol",
  "computer-use-testkit",
  "remote-runtime-adapters",
  "remote-runtime-entitlements",
  "remote-runtime-host",
  "plugin",
  "remote-runtime-contracts",
  "runtime-protocol",
  "script",
  "sdk",
])

const remoteRuntimePackageAllowedDependencies = new Map([
  ["remote-runtime-contracts", new Set(["@interbase/runtime-protocol"])],
  ["remote-runtime-entitlements", new Set(["@interbase/remote-runtime-contracts"])],
  ["remote-runtime-adapters", new Set(["@interbase/remote-runtime-contracts", "@interbase/remote-runtime-host"])],
  [
    "remote-runtime-host",
    new Set([
      "@interbase/remote-runtime-contracts",
      "@interbase/remote-runtime-entitlements",
      "@interbase/runtime-protocol",
    ]),
  ],
])

const deploymentText = [
  "npm publish",
  "pnpm publish",
  "bun publish",
  "yarn npm publish",
  "gh release create",
  "gh release upload",
  "gh workflow run",
  "actions/create-github-app-token",
  "git remote set-url",
  "x-access-token",
  "git push",
  "wrangler deploy",
  "firebase deploy",
  "netlify deploy",
  "vercel deploy",
  "fly deploy",
  "docker push",
  "kubectl apply",
  "helm upgrade",
  "aws cloudformation deploy",
  "posthog.com",
  "POSTHOG_KEY",
  "terraform apply",
  "sst deploy",
  "bun sst deploy",
  "--publish always",
]

const ignoredDirectories = new Set([".git", ".turbo", "artifacts", "coverage", "dist", "node_modules"])

const textExtensions = new Set([
  ".cjs",
  ".js",
  ".json",
  ".lock",
  ".md",
  ".mjs",
  ".nix",
  ".patch",
  ".sh",
  ".toml",
  ".txt",
  ".ts",
  ".tsx",
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

function relative(root, file) {
  return path.relative(root, file).replaceAll(path.sep, "/")
}

async function exists(target) {
  return stat(target).then(
    () => true,
    () => false,
  )
}

function gitUntrackedTopLevelPaths(root) {
  try {
    const output = execFileSync(
      "git",
      ["-C", root, "ls-files", "--others", "--exclude-standard", "--directory", "--no-empty-directory"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
    return new Set(
      output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/\/$/u, ""))
        .map((line) => line.split(/[\\/]/u, 1)[0])
        .filter(Boolean),
    )
  } catch {
    return new Set()
  }
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

function isTextFile(file) {
  return textExtensions.has(path.extname(file)) || extensionlessTextFiles.has(path.basename(file))
}

function interbaseImportPackages(text) {
  const matches = text.matchAll(/(?:from\s*["']|import\s*(?:\(\s*)?["'])(@interbase\/[^"')]+)["']/gu)
  return [
    ...new Set(
      [...matches]
        .map((match) => match[1])
        .filter((specifier) => typeof specifier === "string")
        .map((specifier) => specifier.split("/").slice(0, 2).join("/")),
    ),
  ]
}

async function collectPackageManifests(root) {
  const manifests = []
  for (const file of await walk(root)) {
    if (path.basename(file) !== "package.json") continue
    const rel = relative(root, file)
    const manifest = JSON.parse(await readFile(file, "utf8"))
    manifests.push({ file: rel, manifest })
  }
  return manifests
}

export function dependencyEntries(manifest) {
  return ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"].flatMap((section) =>
    Object.entries(manifest[section] ?? {}).map(([name, spec]) => ({ name, section, spec })),
  )
}

export async function validatePublicBoundary(root = defaultRoot) {
  const failures = []
  const untrackedTopLevelPaths = gitUntrackedTopLevelPaths(root)
  const packageManifests = await collectPackageManifests(root)
  const publicWorkspacePackages = new Set(
    packageManifests.map(({ manifest }) => manifest.name).filter((name) => typeof name === "string" && name.length > 0),
  )

  for (const { file, manifest } of packageManifests) {
    const packageName = path.basename(path.dirname(file))
    for (const { name, section, spec } of dependencyEntries(manifest)) {
      if (typeof spec !== "string") {
        failures.push(`${file}: ${section}.${name} dependency spec must be a string`)
        continue
      }
      if (spec.startsWith("workspace:") && !publicWorkspacePackages.has(name)) {
        failures.push(`${file}: ${section}.${name} references unresolved public workspace package ${spec}`)
      }
      if (spec.startsWith("file:") || spec.startsWith("link:") || spec.startsWith("portal:")) {
        failures.push(`${file}: ${section}.${name} uses private/local dependency spec ${spec}`)
      }
      const allowedRemoteRuntimeDependencies = remoteRuntimePackageAllowedDependencies.get(packageName)
      if (
        allowedRemoteRuntimeDependencies &&
        name.startsWith("@interbase/") &&
        !allowedRemoteRuntimeDependencies.has(name)
      ) {
        failures.push(`${file}: ${section}.${name} violates public remote runtime package dependency direction`)
      }
    }
  }

  for (const file of await walk(root)) {
    const rel = relative(root, file)
    const segments = rel.split("/")
    if (segments.length < 4 || segments[0] !== "packages" || segments[2] !== "src") continue
    const packageName = segments[1]
    const allowedRemoteRuntimeDependencies = remoteRuntimePackageAllowedDependencies.get(packageName)
    if (!allowedRemoteRuntimeDependencies) continue
    const text = await readFile(file, "utf8")
    const selfPackageName = `@interbase/${packageName}`
    const allowedSourceImports = new Set([selfPackageName, ...allowedRemoteRuntimeDependencies])
    for (const importedPackage of interbaseImportPackages(text)) {
      if (!allowedSourceImports.has(importedPackage)) {
        failures.push(
          `${rel}: imports ${importedPackage} which violates public remote runtime source dependency direction`,
        )
      }
    }
  }

  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (untrackedTopLevelPaths.has(entry.name)) continue
    if (!allowedTopLevelPaths.has(entry.name)) {
      failures.push(`${entry.name}: unexpected top-level path in public repository`)
    }
  }

  for (const entry of await readdir(path.join(root, "packages"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (!(await exists(path.join(root, "packages", entry.name, "package.json")))) continue
    if (!allowedPublicPackages.has(entry.name)) {
      failures.push(`packages/${entry.name}: unexpected package in public repository`)
    }
  }

  for (const file of await walk(root)) {
    const rel = relative(root, file)
    if (!isTextFile(file)) continue
    const text = await readFile(file, "utf8")
    if (
      rel !== "script/interbase/validate-public-boundary.mjs" &&
      (rel.startsWith(".github/") ||
        rel.startsWith("script/") ||
        rel.startsWith("patches/") ||
        rel.endsWith("package.json"))
    ) {
      const deploymentMatches = deploymentText.filter((term) => text.includes(term))
      if (deploymentMatches.length > 0) {
        failures.push(`${rel}: live deployment/publication command is not allowed: ${deploymentMatches.join(", ")}`)
      }
    }
  }

  return failures
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const failures = await validatePublicBoundary()
  if (failures.length > 0) {
    console.error("Public boundary validation failed:")
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log("Public boundary validation passed.")
}
