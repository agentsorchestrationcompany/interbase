#!/usr/bin/env node

import { validatePreparedReleaseArtifacts } from "./release-core.mjs"

const manifest = validatePreparedReleaseArtifacts()
console.log(`Local CLI release artifacts validated for ${manifest.version}.`)
