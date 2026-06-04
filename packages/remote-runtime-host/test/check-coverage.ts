import { readFileSync } from "node:fs"

const coverage = readFileSync(new URL("../coverage/lcov.info", import.meta.url), "utf8")
const requiredFiles = ["src/index.ts", "src/local-remote-runtime-gateway.ts", "src/remote-runtime-manager.ts"]
const lineOnlyFiles = new Set(["src/remote-runtime-manager.ts"])

for (const file of requiredFiles) {
  const record = coverage
    .split("end_of_record")
    .find((entry) => entry.split("\n").some((line) => line === `SF:${file}`))
  if (!record) throw new Error(`Missing coverage record for ${file}`)

  const functionsFound = metric(record, "FNF")
  const functionsHit = metric(record, "FNH")
  const linesFound = metric(record, "LF")
  const linesHit = metric(record, "LH")

  const requiresFunctionCoverage = !lineOnlyFiles.has(file)
  if ((requiresFunctionCoverage && functionsFound !== functionsHit) || linesFound !== linesHit) {
    throw new Error(
      `Remote runtime host coverage must stay at 100% for ${file}. Functions ${functionsHit}/${functionsFound}, lines ${linesHit}/${linesFound}.`,
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
