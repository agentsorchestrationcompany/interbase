import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import {
  collectGithubMetadataFailures,
  requiredCodeownerPaths,
  requiredGithubLabels,
} from "../validate-github-metadata.mjs"

function tempRoot() {
  return mkdtempSync(path.join(tmpdir(), "interbase-github-metadata-"))
}

function writeFile(root, relativePath, content) {
  const filePath = path.join(root, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, content, "utf8")
}

function validLabels(extraLabels = []) {
  return [...requiredGithubLabels, ...extraLabels]
    .map((label) => `- name: ${label}\n  color: "ededed"\n  description: ${label}\n`)
    .join("")
}

function writeTemplate(root, name, labels, body = "Public CLI boundary") {
  writeFile(
    root,
    path.join(".github", "ISSUE_TEMPLATE", name),
    `name: ${name}\nlabels: [${labels.join(", ")}]\nbody:\n  - type: markdown\n    attributes:\n      value: ${body}\n`,
  )
}

function writeValidMetadata(root) {
  writeFile(root, ".github/labels.yml", validLabels())
  writeTemplate(root, "bug-report.yml", ["public-cli", "needs-triage"])
  writeTemplate(root, "feature-request.yml", ["needs-triage"])
  writeTemplate(root, "question.yml", ["needs-triage"])
  writeFile(
    root,
    ".github/pull_request_template.md",
    "## Public Boundary Checklist\n- This does not add live publish behavior.\n- Security-sensitive reports stay private.\n",
  )
  writeFile(root, ".github/CODEOWNERS", requiredCodeownerPaths.map((entry) => `${entry} @example/team\n`).join(""))
}

void test("GitHub metadata validation accepts aligned public support metadata", () => {
  const root = tempRoot()
  try {
    writeValidMetadata(root)
    assert.deepEqual(collectGithubMetadataFailures(root), [])
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("GitHub metadata validation accepts repositories without optional GitHub metadata files", () => {
  const root = tempRoot()
  try {
    assert.deepEqual(collectGithubMetadataFailures(root), [])
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("GitHub metadata validation rejects missing required labels", () => {
  const root = tempRoot()
  try {
    writeValidMetadata(root)
    writeFile(root, ".github/labels.yml", validLabels().replace("- name: outside-public-contract\n", ""))
    assert.match(collectGithubMetadataFailures(root).join("\n"), /missing required label: outside-public-contract/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("GitHub metadata validation rejects undeclared issue-template labels", () => {
  const root = tempRoot()
  try {
    writeValidMetadata(root)
    writeTemplate(root, "bug-report.yml", ["public-cli", "missing-label"])
    assert.match(
      collectGithubMetadataFailures(root).join("\n"),
      /bug-report\.yml references undeclared label: missing-label/,
    )
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("GitHub metadata validation rejects issue templates without labels metadata", () => {
  const root = tempRoot()
  try {
    writeTemplate(root, "bug-report.yml", ["public-cli", "needs-triage"])
    assert.match(
      collectGithubMetadataFailures(root).join("\n"),
      /\.github\/ISSUE_TEMPLATE requires \.github\/labels\.yml/,
    )
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("GitHub metadata validation rejects issue templates without public-boundary confirmation", () => {
  const root = tempRoot()
  try {
    writeValidMetadata(root)
    writeTemplate(root, "question.yml", ["needs-triage"], "Ask a question")
    assert.match(
      collectGithubMetadataFailures(root).join("\n"),
      /question\.yml must include a public boundary confirmation/,
    )
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

void test("GitHub metadata validation rejects missing CODEOWNERS coverage", () => {
  const root = tempRoot()
  try {
    writeValidMetadata(root)
    writeFile(
      root,
      ".github/CODEOWNERS",
      requiredCodeownerPaths
        .filter((entry) => entry !== "/.github/actions/")
        .map((entry) => `${entry} @example/team\n`)
        .join(""),
    )
    assert.match(collectGithubMetadataFailures(root).join("\n"), /CODEOWNERS must cover \/\.github\/actions\//)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
