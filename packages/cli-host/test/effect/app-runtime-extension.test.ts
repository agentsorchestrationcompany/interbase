import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const canonicalExtensionImport = "@/cli/cli-extensions"

describe("app runtime extension seam", () => {
  test("public cli extensions expose a feature-bundle seam", async () => {
    const extensions = await import("../../src/cli/cli-extensions")

    expect(extensions.CLI_EXTENSION_FEATURE_BUNDLES).toEqual([])
  })

  test("assembled builds replace feature-bundle exports through the canonical seam", () => {
    const source = readFileSync(new URL("../../script/build.ts", import.meta.url), "utf8")

    expect(source).toContain("CLI_EXTENSION_FEATURE_BUNDLES")
    expect(source).toContain("@\\/cli\\/cli-extensions")
    expect(source).not.toContain("\\.\\/cli-extensions|")
  })

  test("host code imports the extension seam through the canonical public module", async () => {
    const files = await Array.fromAsync(
      new Bun.Glob("src/**/*.ts").scan({ cwd: new URL("../..", import.meta.url).pathname }),
    )
    const violations: string[] = []

    for (const file of files) {
      const source = await Bun.file(new URL(`../../${file}`, import.meta.url)).text()
      if (!source.includes("cli-extensions")) continue
      const imports = source.matchAll(/from\s+["']([^"']*cli-extensions)["']/g)
      for (const match of imports) {
        if (match[1] !== canonicalExtensionImport) violations.push(`${file}: ${match[0]}`)
      }
    }

    expect(violations).toEqual([])
  }, 15000)

  test("legacy extension exports are fully removed from host source", async () => {
    const files = await Array.fromAsync(
      new Bun.Glob("src/**/*.ts").scan({ cwd: new URL("../..", import.meta.url).pathname }),
    )
    const violations: string[] = []

    for (const file of files) {
      const source = await Bun.file(new URL(`../../${file}`, import.meta.url)).text()
      if (!source.includes("CLI_EXTENSION_COMMANDS") && !source.includes("CLI_EXTENSION_APP_LAYER")) continue
      violations.push(file)
    }

    expect(violations).toEqual([])
  }, 15000)

  test("app runtime merges resolved feature layers after public defaults", () => {
    const source = readFileSync(new URL("../../src/effect/app-runtime.ts", import.meta.url), "utf8")
    const accountIndex = source.indexOf("createAccountLayer(")
    const extensionIndex = source.lastIndexOf("extensionLayer,")

    expect(accountIndex).toBeGreaterThan(-1)
    expect(extensionIndex).toBeGreaterThan(accountIndex)
  })
})
