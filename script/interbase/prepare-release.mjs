#!/usr/bin/env node

import { prepareCliRelease } from "./release-core.mjs"

const manifest = prepareCliRelease(process.argv.slice(2))
console.log(`Prepared local CLI release artifacts for ${manifest.version} at artifacts/cli.`)
console.log(
  "Deployment is reserved for the end user. The prepared changes are ready; you can run the operator-owned publication command when you decide to deploy.",
)
