import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { providerCapabilityKeyValues, providerUnsupportedReasonCodeValues } from "../src/index.js"

const publicSourceFiles = [
  "src/events.ts",
  "src/index.ts",
  "src/provider.ts",
  "src/session.ts",
  "src/thread.ts",
  "src/websocket.ts",
] as const

test("public runtime protocol source does not expose private contracts", async () => {
  const forbiddenPatterns = [
    /\bRuntimeTask[A-Za-z0-9_]*/u,
    /\bTaskRuntimeContext\b/u,
    /\bSessionTaskEvent\b/u,
    /\btaskBinding\b/u,
    /\borchestration:\s*RuntimeSessionOrchestrationState/u,
    /\btasks\.orchestrationHooks\b/u,
    /\btask_orchestration_not_supported\b/u,
    /task-intent/u,
    /\bRuntimeMobile[A-Za-z0-9_]*/u,
    /\bruntimeMobile[A-Za-z0-9_]*/u,
    /\bdirectory\.list\b/u,
    /\bdirectory\.select\b/u,
    /\bchat\.start\b/u,
    /\bsession\.messages\b/u,
  ]

  for (const sourceFile of publicSourceFiles) {
    const source = await readFile(new URL(`../${sourceFile}`, import.meta.url), "utf8")
    for (const forbiddenPattern of forbiddenPatterns) {
      assert.equal(forbiddenPattern.test(source), false, `${sourceFile} must not match ${forbiddenPattern}`)
    }
  }
})

test("public provider capability vocabularies exclude task-only literals", () => {
  assert.equal(providerCapabilityKeyValues.includes("tasks.orchestrationHooks" as never), false)
  assert.equal(providerUnsupportedReasonCodeValues.includes("task_orchestration_not_supported" as never), false)
})
