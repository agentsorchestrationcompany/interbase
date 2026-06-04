import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { validatePublicBoundary } from "../validate-public-boundary.mjs"

function tempRoot() {
  return mkdtempSync(path.join(tmpdir(), "interbase-public-boundary-"))
}

function write(filePath, content) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, content, "utf8")
}

function writeManifest(root, packageName, manifest) {
  write(path.join(root, "packages", packageName, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`)
}

function writeSource(root, packageName, content = "export const ok = true\n") {
  write(path.join(root, "packages", packageName, "src", "index.ts"), content)
}

function basePublicRepo(root) {
  write(path.join(root, "package.json"), '{"private":true}\n')
  writeManifest(root, "remote-runtime-contracts", {
    name: "@interbase/remote-runtime-contracts",
    dependencies: { "@interbase/runtime-protocol": "workspace:*" },
  })
  writeSource(
    root,
    "remote-runtime-contracts",
    'import type { ThreadGoal } from "@interbase/runtime-protocol"\nexport const ok = true\n',
  )
  writeManifest(root, "remote-runtime-entitlements", {
    name: "@interbase/remote-runtime-entitlements",
    dependencies: { "@interbase/remote-runtime-contracts": "workspace:*" },
  })
  writeSource(
    root,
    "remote-runtime-entitlements",
    'import type { RemoteRuntimeMode } from "@interbase/remote-runtime-contracts"\nexport const ok = true\n',
  )
  writeManifest(root, "remote-runtime-adapters", {
    name: "@interbase/remote-runtime-adapters",
    dependencies: { "@interbase/remote-runtime-contracts": "workspace:*" },
  })
  writeSource(root, "remote-runtime-adapters", 'import "@interbase/remote-runtime-contracts"\nexport const ok = true\n')
  writeManifest(root, "remote-runtime-host", {
    name: "@interbase/remote-runtime-host",
    dependencies: {
      "@interbase/remote-runtime-contracts": "workspace:*",
      "@interbase/remote-runtime-entitlements": "workspace:*",
      "@interbase/runtime-protocol": "workspace:*",
    },
  })
  writeSource(
    root,
    "remote-runtime-host",
    'import "@interbase/remote-runtime-contracts"\nimport "@interbase/remote-runtime-entitlements"\nimport "@interbase/runtime-protocol"\nexport const ok = true\n',
  )
  writeManifest(root, "runtime-protocol", { name: "@interbase/runtime-protocol" })
  writeSource(root, "runtime-protocol")
}

test("public boundary accepts the intended remote runtime package dependency direction", async () => {
  const root = tempRoot()
  try {
    basePublicRepo(root)
    assert.deepEqual(await validatePublicBoundary(root), [])
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test("public boundary rejects remote runtime contracts depending on runtime host", async () => {
  const root = tempRoot()
  try {
    basePublicRepo(root)
    writeManifest(root, "remote-runtime-contracts", {
      name: "@interbase/remote-runtime-contracts",
      dependencies: { "@interbase/remote-runtime-host": "workspace:*" },
    })
    assert.deepEqual(await validatePublicBoundary(root), [
      "packages/remote-runtime-contracts/package.json: dependencies.@interbase/remote-runtime-host violates public remote runtime package dependency direction",
    ])
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test("public boundary rejects remote runtime entitlements depending on adapters", async () => {
  const root = tempRoot()
  try {
    basePublicRepo(root)
    writeManifest(root, "remote-runtime-entitlements", {
      name: "@interbase/remote-runtime-entitlements",
      dependencies: {
        "@interbase/remote-runtime-adapters": "workspace:*",
        "@interbase/remote-runtime-contracts": "workspace:*",
      },
    })
    assert.deepEqual(await validatePublicBoundary(root), [
      "packages/remote-runtime-entitlements/package.json: dependencies.@interbase/remote-runtime-adapters violates public remote runtime package dependency direction",
    ])
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})

test("public boundary rejects remote runtime source imports that violate dependency direction", async () => {
  const root = tempRoot()
  try {
    basePublicRepo(root)
    writeSource(root, "remote-runtime-contracts", 'import "@interbase/remote-runtime-host"\nexport const nope = true\n')
    assert.deepEqual(await validatePublicBoundary(root), [
      "packages/remote-runtime-contracts/src/index.ts: imports @interbase/remote-runtime-host which violates public remote runtime source dependency direction",
    ])
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
})
