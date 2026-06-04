import { readFileSync } from "node:fs"

const coverage = readFileSync(new URL("../coverage/lcov.info", import.meta.url), "utf8")
const records = new Map<string, string>()
for (const entry of coverage.split("end_of_record")) {
  const source = entry
    .split("\n")
    .find((line) => line.startsWith("SF:"))
    ?.slice(3)
  if (source) records.set(source, entry)
}

for (const source of ["src/index.ts", "src/remote-runtime-protocol.ts"]) {
  assertCompleteCoverage(source, records.get(source))
}

function assertCompleteCoverage(source: string, record: string | undefined): void {
  if (!record) throw new Error(`Missing coverage record for ${source}`)

  const functionsFound = metric(record, "FNF")
  const functionsHit = metric(record, "FNH")
  const linesFound = metric(record, "LF")
  const linesHit = metric(record, "LH")

  if (functionsFound !== functionsHit || linesFound !== linesHit) {
    throw new Error(
      `Mobile contracts coverage must stay at 100% for ${source}. Functions ${functionsHit}/${functionsFound}, lines ${linesHit}/${linesFound}.`,
    )
  }
}

function metric(record: string, key: string): number {
  const line = record.split("\n").find((entry) => entry.startsWith(`${key}:`))
  if (!line) throw new Error(`Missing ${key} coverage metric`)
  const value = Number(line.slice(key.length + 1))
  if (!Number.isInteger(value)) throw new Error(`Invalid ${key} coverage metric: ${line}`)
  return value
}
