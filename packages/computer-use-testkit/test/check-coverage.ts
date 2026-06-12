import { readFileSync } from "node:fs"

const lcov = readFileSync("coverage/lcov.info", "utf8")
const totals = { linesFound: 0, linesHit: 0, functionsFound: 0, functionsHit: 0, branchesFound: 0, branchesHit: 0 }
let include = false

for (const line of lcov.split("\n")) {
  const [key, raw] = line.split(":")
  if (key === "SF") include = raw?.startsWith(`${process.cwd()}/src/`) ?? false
  if (!include) continue
  const value = Number(raw)
  if (key === "LF") totals.linesFound += value
  if (key === "LH") totals.linesHit += value
  if (key === "FNF") totals.functionsFound += value
  if (key === "FNH") totals.functionsHit += value
  if (key === "BRF") totals.branchesFound += value
  if (key === "BRH") totals.branchesHit += value
}

const failures = [
  { name: "lines", hit: totals.linesHit, found: totals.linesFound },
  { name: "functions", hit: totals.functionsHit, found: totals.functionsFound },
  { name: "branches", hit: totals.branchesHit, found: totals.branchesFound },
].filter(({ hit, found }) => found > 0 && hit !== found)

if (failures.length > 0) {
  throw new Error(failures.map(({ name, hit, found }) => `${name}: ${hit}/${found}`).join(", "))
}
