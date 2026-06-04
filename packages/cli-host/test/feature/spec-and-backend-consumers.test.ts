import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

function source(path: string) {
  return readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8")
}

function externalSource(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

describe("feature assembly spec and backend consumers", () => {
  test("generate command uses the bundle-aware server openapi seam", () => {
    const text = source("cli/cmd/generate.ts")

    expect(text).toContain("Server.openapi()")
    expect(text).toContain("Server.openapiHono()")
  })

  test("sdk build consumes generated OpenAPI through the CLI generate seam", () => {
    const text = externalSource("../../../sdk/js/script/build.ts")

    expect(text).toContain("bun dev generate")
    expect(text).toContain("--hono")
  })

  test("backend bridge keeps workspace route registration behind shared feature ownership", () => {
    const text = source("server/routes/instance/index.ts")

    expect(text).toContain("Flag.INTERBASE_EXPERIMENTAL_HTTPAPI")
    expect(text).toContain('activeFeatureOwnsRouteGroup("workspace", bundles)')
  })

  test("server backend selection remains separate from feature assembly ownership", () => {
    const text = source("server/backend.ts")

    expect(text).toContain("Flag.INTERBASE_EXPERIMENTAL_HTTPAPI")
  })
})
