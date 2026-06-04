import assert from "node:assert/strict"
import test from "node:test"

import { deferredGeneratedArtifactFailure, deferredGeneratedArtifactSurface } from "../public-artifact-policy.mjs"

void test("deferred generated artifact policy ignores source implementation files", () => {
  assert.equal(deferredGeneratedArtifactSurface("src/cli/completion/index.ts"), null)
  assert.equal(deferredGeneratedArtifactSurface("src/docs/manpage-renderer.ts"), null)
})

void test("deferred generated artifact policy detects packaged shell completions", () => {
  assert.equal(deferredGeneratedArtifactSurface("completions/interbase.bash"), "shell completions")
  assert.equal(
    deferredGeneratedArtifactSurface("dist/interbase-darwin-arm64/share/zsh/site-functions/_interbase"),
    "shell completions",
  )
})

void test("deferred generated artifact policy detects packaged manpages", () => {
  assert.equal(deferredGeneratedArtifactSurface("share/man/man1/interbase.1"), "manpages")
  assert.equal(deferredGeneratedArtifactSurface("dist/interbase-darwin-arm64/man1/interbase.1"), "manpages")
})

void test("deferred generated artifact policy detects source maps and debug symbols", () => {
  assert.equal(deferredGeneratedArtifactSurface("dist/interbase-darwin-arm64/bin/interbase.map"), "source maps")
  assert.equal(deferredGeneratedArtifactSurface("dist/interbase-darwin-arm64/bin/interbase.pdb"), "debug symbols")
  assert.equal(deferredGeneratedArtifactSurface("dist/interbase-darwin-arm64/bin/interbase.dSYM"), "debug symbols")
})

void test("deferred generated artifact policy detects generated openapi and shell integrations", () => {
  assert.equal(deferredGeneratedArtifactSurface("sdk/openapi.json"), "generated OpenAPI")
  assert.equal(deferredGeneratedArtifactSurface("share/shell/interbase.sh"), "shell integrations")
})

void test("deferred generated artifact policy explains how to intentionally add the surface", () => {
  assert.match(
    deferredGeneratedArtifactFailure("packages/cli-host/share/man/man1/interbase.1", "share/man/man1/interbase.1") ??
      "",
    /document the generated surface in repository release notes or policy files/,
  )
})
