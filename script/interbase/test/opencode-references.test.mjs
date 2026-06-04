import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { validateOpenCodeReferences } from "../validate-opencode-references.mjs"

function tempRoot() {
  return mkdtempSync(path.join(tmpdir(), "interbase-opencode-references-"))
}

function write(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, content, "utf8")
}

function baseFiles(root) {
  const license =
    "MIT License\n\nCopyright (c) 2025-2026 Agents Orchestration Company\n\nPortions copyright (c) 2025 opencode\n"
  write(path.join(root, "LICENSE"), license)
}

function baseAllowlistEntries() {
  return [
    {
      path: "^LICENSE$",
      pattern: "opencode",
      category: "legal_attribution",
      reason: "license",
      owner: "owner",
      reviewRequired: true,
      retirementRule: "later",
    },
    {
      path: "^script/interbase/opencode-reference-allowlist\\.json$",
      pattern: "OpenCode|opencode|packages/cli-host",
      category: "upstream_provenance",
      reason: "allowlist",
      owner: "owner",
      reviewRequired: true,
      retirementRule: "later",
    },
  ]
}

test("validator allows allowlisted attribution, schema URLs, dependency names, generated artifacts, and test fixtures", () => {
  const root = tempRoot()
  try {
    baseFiles(root)
    write(
      path.join(root, "script", "interbase", "opencode-reference-allowlist.json"),
      `${JSON.stringify(
        [
          ...baseAllowlistEntries(),
          {
            path: "^README\\.md$",
            pattern: "OpenCode-derived",
            category: "legal_attribution",
            reason: "doc",
            owner: "owner",
            reviewRequired: true,
            retirementRule: "later",
          },
          {
            path: "^packages/cli-host/src/theme\\.json$",
            pattern: "https://opencode\\.ai/theme\\.json",
            category: "schema_url",
            reason: "schema",
            owner: "owner",
            reviewRequired: true,
            retirementRule: "later",
          },
          {
            path: "^packages/cli-host/package\\.json$",
            pattern: "opencode-gitlab-auth",
            category: "dependency_name",
            reason: "dependency",
            owner: "owner",
            reviewRequired: true,
            retirementRule: "later",
          },
          {
            path: "^packages/sdk/openapi\\.json$",
            pattern: "OpenCode",
            category: "generated_artifact",
            reason: "generated",
            owner: "owner",
            reviewRequired: true,
            retirementRule: "later",
          },
          {
            path: "^packages/cli-host/test/example\\.test\\.ts$",
            pattern: "packages/cli-host",
            category: "test_fixture",
            reason: "test",
            owner: "owner",
            reviewRequired: true,
            retirementRule: "later",
          },
        ],
        null,
        2,
      )}\n`,
    )
    write(path.join(root, "README.md"), "This repository contains OpenCode-derived source.\n")
    write(
      path.join(root, "packages", "cli-host", "src", "theme.json"),
      '{"$schema":"https://opencode.ai/theme.json"}\n',
    )
    write(
      path.join(root, "packages", "cli-host", "package.json"),
      '{"dependencies":{"opencode-gitlab-auth":"1.0.0"}}\n',
    )
    write(path.join(root, "packages", "sdk", "openapi.json"), '{"description":"OpenCode generated output"}\n')
    write(
      path.join(root, "packages", "cli-host", "test", "example.test.ts"),
      'expect("packages/cli-host").toBeDefined()\n',
    )

    assert.deepEqual(validateOpenCodeReferences(root), [])
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test("validator rejects stale product branding that is not allowlisted", () => {
  const root = tempRoot()
  try {
    baseFiles(root)
    write(
      path.join(root, "script", "interbase", "opencode-reference-allowlist.json"),
      `${JSON.stringify(baseAllowlistEntries(), null, 2)}\n`,
    )
    write(path.join(root, "packages", "cli", "README.md"), "Install the OpenCode CLI wrapper.\n")

    const failures = validateOpenCodeReferences(root)
    assert.equal(failures.length, 1)
    assert.match(failures[0], /packages\/cli\/README\.md:1: unallowlisted OpenCode reference/)
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
