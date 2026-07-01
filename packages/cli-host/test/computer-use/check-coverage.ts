import { readFileSync } from "node:fs"
import path from "node:path"

const lcov = readFileSync("coverage/lcov.info", "utf8")
const covered = new Set([
  path.join(process.cwd(), "src/computer-use/approval-store.ts"),
  path.join(process.cwd(), "src/computer-use/artifact.ts"),
  path.join(process.cwd(), "src/computer-use/audit.ts"),
  path.join(process.cwd(), "src/computer-use/crash-recovery.ts"),
  path.join(process.cwd(), "src/computer-use/desktop-availability.ts"),
  path.join(process.cwd(), "src/computer-use/driver.ts"),
  path.join(process.cwd(), "src/computer-use/helper-authenticity.ts"),
  path.join(process.cwd(), "src/computer-use/helper-discovery.ts"),
  path.join(process.cwd(), "src/computer-use/helper-discovery-node.ts"),
  path.join(process.cwd(), "src/computer-use/helper-driver.ts"),
  path.join(process.cwd(), "src/computer-use/helper-launch.ts"),
  path.join(process.cwd(), "src/computer-use/helper-manifest.ts"),
  path.join(process.cwd(), "src/computer-use/helper-rpc-client.ts"),
  path.join(process.cwd(), "src/computer-use/helper-stdio-connection.ts"),
  path.join(process.cwd(), "src/computer-use/helper-supervisor.ts"),
  path.join(process.cwd(), "src/computer-use/helper-transport.ts"),
  path.join(process.cwd(), "src/computer-use/host.ts"),
  path.join(process.cwd(), "src/computer-use/modal.ts"),
  path.join(process.cwd(), "src/computer-use/model-locality.ts"),
  path.join(process.cwd(), "src/computer-use/mock-host.ts"),
  path.join(process.cwd(), "src/computer-use/native-helper-driver.ts"),
  path.join(process.cwd(), "src/computer-use/permission-prompt.ts"),
  path.join(process.cwd(), "src/computer-use/permission.ts"),
  path.join(process.cwd(), "src/computer-use/persistence.ts"),
  path.join(process.cwd(), "src/computer-use/provider-adapter.ts"),
  path.join(process.cwd(), "src/computer-use/session.ts"),
  path.join(process.cwd(), "src/computer-use/tool-act.ts"),
  path.join(process.cwd(), "src/computer-use/tool-observe.ts"),
  path.join(process.cwd(), "src/computer-use/tool-wait-for.ts"),
])
const totals = { linesFound: 0, linesHit: 0, functionsFound: 0, functionsHit: 0, branchesFound: 0, branchesHit: 0 }
let include = false

for (const line of lcov.split("\n")) {
  const [key, raw] = line.split(":")
  if (key === "SF") include = raw !== undefined && covered.has(raw)
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
