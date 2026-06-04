import assert from "node:assert/strict"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import test from "node:test"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))

test("dependency license review script inventories patched dependencies and direct runtime deps", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "interbase-license-review-"))
  try {
    mkdirSync(path.join(root, "packages", "example"), { recursive: true })
    mkdirSync(path.join(root, "patches"), { recursive: true })
    mkdirSync(path.join(root, "node_modules", "left-pad"), { recursive: true })
    mkdirSync(path.join(root, "node_modules", "@scope", "pkg"), { recursive: true })
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ patchedDependencies: { "left-pad@1.3.0": "patches/left-pad.patch" } }),
      "utf8",
    )
    writeFileSync(
      path.join(root, "packages", "example", "package.json"),
      JSON.stringify({ dependencies: { "left-pad": "1.3.0", "@scope/pkg": "2.0.0" } }),
      "utf8",
    )
    writeFileSync(path.join(root, "patches", "left-pad.patch"), "patch content\n", "utf8")
    writeFileSync(
      path.join(root, "node_modules", "left-pad", "package.json"),
      JSON.stringify({ version: "1.3.0", license: "MIT", repository: { url: "https://example.com/left-pad.git" } }),
      "utf8",
    )
    writeFileSync(
      path.join(root, "node_modules", "@scope", "pkg", "package.json"),
      JSON.stringify({ version: "2.0.0", license: "Apache-2.0" }),
      "utf8",
    )

    const scriptPath = path.join(scriptDirectory, "..", "review-dependency-licenses.mjs")
    const source = readFileSync(scriptPath, "utf8").replaceAll(
      'const root = path.resolve(new URL("../..", import.meta.url).pathname)',
      `const root = ${JSON.stringify(root)}`,
    )
    const tempScript = path.join(root, "review.mjs")
    writeFileSync(tempScript, source, "utf8")
    const { spawnSync } = await import("node:child_process")
    const result = spawnSync(process.execPath, [tempScript], { encoding: "utf8" })
    assert.equal(result.status, 0)
    const report = readFileSync(
      path.join(root, "artifacts", "cli", "license-review", "dependency-license-review.md"),
      "utf8",
    )
    assert.match(report, /left-pad/)
    assert.match(report, /Apache-2.0/)
    assert.match(report, /patches\/left-pad\.patch/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
