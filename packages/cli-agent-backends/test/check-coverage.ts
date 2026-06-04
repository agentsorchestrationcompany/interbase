import { readFileSync } from "node:fs"

const expectedSources = [
  "src/backend.ts",
  "src/claude-adapter.ts",
  "src/codex-adapter.ts",
  "src/errors.ts",
  "src/index.ts",
  "src/interbase-runtime-adapter.ts",
  "src/normalization.ts",
  "src/registry.ts",
  "src/routing-metadata.ts",
  "src/types.ts",
]

const coverage = readFileSync(new URL("../coverage/lcov.info", import.meta.url), "utf8")
const records = new Map(
  coverage
    .split("end_of_record")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => [sourceFile(entry), entry] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[0])),
)

for (const source of expectedSources) {
  const record = records.get(source)
  if (!record) throw new Error(`Missing coverage record for ${source}`)

  const linesFound = metric(record, "LF")
  const linesHit = metric(record, "LH")

  if (linesFound !== linesHit) {
    throw new Error(`CLI agent backend line coverage must stay at 100% for ${source}. Lines ${linesHit}/${linesFound}.`)
  }
}

function sourceFile(record: string): string | null {
  const line = record.split("\n").find((entry) => entry.startsWith("SF:"))
  return line ? line.slice(3) : null
}

function metric(record: string, key: string): number {
  const line = record.split("\n").find((entry) => entry.startsWith(`${key}:`))
  if (!line) throw new Error(`Missing ${key} coverage metric`)
  const value = Number(line.slice(key.length + 1))
  if (!Number.isInteger(value)) throw new Error(`Invalid ${key} coverage metric: ${line}`)
  return value
}
