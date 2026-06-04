import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"

test("remote runtime manager public methods use intent-specific selector resolvers", () => {
  const source = readFileSync(path.join(import.meta.dir, "../src/remote-runtime-manager.ts"), "utf8")
  const publicApiStart = source.indexOf("  return {\n    attachLocalRemoteRuntimeWebSocket,")
  expect(publicApiStart).toBeGreaterThan(-1)
  const publicApiSource = source.slice(publicApiStart)

  expect(publicApiSource).not.toContain("selectEntries(")
})
