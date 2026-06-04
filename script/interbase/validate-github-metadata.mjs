#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, "..", "..")

export const requiredGithubLabels = [
  "public-cli",
  "needs-triage",
  "security-advisory-required",
  "outside-public-contract",
  "upstream-candidate",
]

export const requiredCodeownerPaths = [
  "/.github/ISSUE_TEMPLATE/",
  "/.github/pull_request_template.md",
  "/.github/labels.yml",
  "/.github/actions/",
]

function read(root, relativePath) {
  const filePath = path.join(root, relativePath)
  if (!existsSync(filePath)) throw new Error(`Missing GitHub metadata file: ${relativePath}`)
  return readFileSync(filePath, "utf8")
}

function has(root, relativePath) {
  return existsSync(path.join(root, relativePath))
}

function labelNames(labelsText) {
  return labelsText
    .split("\n")
    .map((line) =>
      line
        .match(/^\s*-\s+name:\s*(?<name>.+?)\s*$/)
        ?.groups?.name?.replaceAll('"', "")
        .replaceAll("'", ""),
    )
    .filter(Boolean)
}

function templateLabels(templateText) {
  const labels = []
  for (const match of templateText.matchAll(/^labels:\s*\[(?<labels>[^\]]*)\]\s*$/gm)) {
    labels.push(
      ...match.groups.labels
        .split(",")
        .map((label) => label.trim().replaceAll('"', "").replaceAll("'", ""))
        .filter(Boolean),
    )
  }
  return labels
}

export function collectGithubMetadataFailures(root = repoRoot) {
  const failures = []
  const issueTemplateRoot = path.join(root, ".github", "ISSUE_TEMPLATE")
  const hasLabels = has(root, ".github/labels.yml")
  const hasIssueTemplates = existsSync(issueTemplateRoot)
  const hasPullRequestTemplate = has(root, ".github/pull_request_template.md")
  const hasCodeowners = has(root, ".github/CODEOWNERS")

  let labels = null
  if (hasLabels) {
    labels = new Set(labelNames(read(root, ".github/labels.yml")))
    for (const label of requiredGithubLabels) {
      if (!labels.has(label)) failures.push(`.github/labels.yml is missing required label: ${label}`)
    }
  }

  if (hasIssueTemplates) {
    if (!labels) failures.push(".github/ISSUE_TEMPLATE requires .github/labels.yml")
    for (const entry of readdirSync(issueTemplateRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".yml")) continue
      const relativePath = path.join(".github", "ISSUE_TEMPLATE", entry.name)
      const templateText = read(root, relativePath)
      if (labels) {
        for (const label of templateLabels(templateText)) {
          if (!labels.has(label)) failures.push(`${relativePath} references undeclared label: ${label}`)
        }
      }
    }

    for (const template of ["bug-report.yml", "feature-request.yml", "question.yml"]) {
      const relativePath = path.join(".github", "ISSUE_TEMPLATE", template)
      if (!has(root, relativePath)) continue
      const text = read(root, relativePath)
      if (!text.includes("Public CLI boundary"))
        failures.push(`${relativePath} must include a public boundary confirmation`)
    }
  }

  if (hasPullRequestTemplate) {
    const pullRequestTemplate = read(root, ".github/pull_request_template.md")
    for (const requiredText of [
      "Public Boundary Checklist",
      "does not add live publish",
      "Security-sensitive reports",
    ]) {
      if (!pullRequestTemplate.includes(requiredText))
        failures.push(`pull request template must include: ${requiredText}`)
    }
  }

  if (hasCodeowners) {
    const codeowners = read(root, ".github/CODEOWNERS")
    for (const requiredPath of requiredCodeownerPaths) {
      if (!codeowners.includes(requiredPath)) failures.push(`CODEOWNERS must cover ${requiredPath}`)
    }
  }

  return failures
}

export function assertGithubMetadata(root = repoRoot) {
  const failures = collectGithubMetadataFailures(root)
  if (failures.length > 0) throw new Error(failures.join("\n"))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = collectGithubMetadataFailures()
  if (failures.length > 0) {
    for (const failure of failures) console.error(failure)
    process.exit(1)
  }

  console.log("GitHub metadata validation passed.")
}
