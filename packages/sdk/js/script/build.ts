#!/usr/bin/env bun
import { fileURLToPath } from "url"

const dir = fileURLToPath(new URL("..", import.meta.url))
process.chdir(dir)

import { $ } from "bun"
import path from "path"

import { createClient } from "@hey-api/openapi-ts"

const openapiSource = process.env.INTERBASE_SDK_OPENAPI === "hono" ? "hono" : "httpapi"
const interbase = path.resolve(dir, "../../cli-host")

// `bun dev generate` now derives the spec from the Effect HttpApi contract by
// default; pass `--hono` to fall back to the legacy Hono spec for parity diffs.
if (openapiSource === "httpapi") {
  await $`bun dev generate > ${dir}/openapi.json`.cwd(interbase)
} else {
  await $`bun dev generate --hono > ${dir}/openapi.json`.cwd(interbase)
}

await createClient({
  input: "./openapi.json",
  output: {
    path: "./src/v2/gen",
    tsConfigPath: path.join(dir, "tsconfig.json"),
    clean: true,
  },
  plugins: [
    {
      name: "@hey-api/typescript",
      exportFromIndex: false,
    },
    {
      name: "@hey-api/sdk",
      instance: "OpencodeClient",
      exportFromIndex: false,
      auth: false,
      paramsStructure: "flat",
    },
    {
      name: "@hey-api/client-fetch",
      exportFromIndex: false,
      baseUrl: "http://localhost:4096",
    },
  ],
})

await $`bun prettier --write src/gen`
await $`bun prettier --write src/v2`
await $`rm -rf dist`
await $`bun tsc`
await $`rm openapi.json`
