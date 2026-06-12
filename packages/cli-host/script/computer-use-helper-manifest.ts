#!/usr/bin/env bun

import { writeFileSync } from "node:fs"
import { buildHelperReleaseManifest } from "../src/computer-use/helper-authenticity"
import { createNodeHelperBundleDiscovery } from "../src/computer-use/helper-discovery-node"
import { DEFAULT_HELPER_PATH } from "../src/computer-use/helper-manifest"

const args = process.argv.slice(2)
const helperPath = valueAfter("--helper", args) ?? DEFAULT_HELPER_PATH
const out = valueAfter("--out", args)
const minVersion = valueAfter("--min-version", args)
const maxVersionExclusive = valueAfter("--max-version-exclusive", args)

const discovery = createNodeHelperBundleDiscovery()
const candidate = discovery.candidate(helperPath)
if (!candidate) {
  console.error(`Unable to discover computer-use helper metadata at ${helperPath}`)
  process.exit(1)
}

const result = buildHelperReleaseManifest({ candidate, minVersion, maxVersionExclusive })
if (!result.ok) {
  console.error(`Computer-use helper is missing release manifest evidence: ${result.missing.join(", ")}`)
  process.exit(1)
}

const json = `${JSON.stringify(result.manifest, null, 2)}\n`
if (out) {
  writeFileSync(out, json)
} else {
  process.stdout.write(json)
}

function valueAfter(flag: string, values: string[]) {
  const prefixed = values.find((value) => value.startsWith(`${flag}=`))
  if (prefixed) return prefixed.slice(flag.length + 1)
  const index = values.indexOf(flag)
  return index === -1 ? undefined : values[index + 1]
}
