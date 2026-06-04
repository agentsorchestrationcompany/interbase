import { $ } from "bun"
import semver from "semver"
import path from "path"
import overlayManifest from "../../cli-overlay/src/manifest.json" with { type: "json" }

const rootPkgPath = path.resolve(import.meta.dir, "../../../package.json")
const rootPkg = await Bun.file(rootPkgPath).json()
const expectedBunVersion = rootPkg.packageManager?.split("@")[1]

if (!expectedBunVersion) {
  throw new Error("packageManager field not found in root package.json")
}

// relax version requirement
const expectedBunVersionRange = `^${expectedBunVersion}`

if (!semver.satisfies(process.versions.bun, expectedBunVersionRange)) {
  throw new Error(`This script requires bun@${expectedBunVersionRange}, but you are using bun@${process.versions.bun}`)
}

const env = {
  INTERBASE_CHANNEL: process.env["INTERBASE_CHANNEL"],
  INTERBASE_BUMP: process.env["INTERBASE_BUMP"],
  INTERBASE_VERSION: process.env["INTERBASE_VERSION"],
  INTERBASE_RELEASE: process.env["INTERBASE_RELEASE"],
}
const npmRegistryPackagePath = encodeURIComponent(overlayManifest.release.npmPackage)
const CHANNEL = await (async () => {
  if (env.INTERBASE_CHANNEL) return env.INTERBASE_CHANNEL
  if (env.INTERBASE_BUMP) return "latest"
  if (env.INTERBASE_VERSION && !env.INTERBASE_VERSION.startsWith("0.0.0-")) return "latest"
  return await $`git branch --show-current`
    .text()
    .then((x) => x.trim() || "local")
    .catch(() => "local")
})()
const IS_PREVIEW = CHANNEL !== "latest"

const VERSION = await (async () => {
  if (env.INTERBASE_VERSION) return env.INTERBASE_VERSION
  if (IS_PREVIEW) return `0.0.0-${CHANNEL}-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`
  const version = await fetch(`https://registry.npmjs.org/${npmRegistryPackagePath}/latest`)
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText)
      return res.json()
    })
    .then((data: { version: string }) => data.version)
  const [major, minor, patch] = version.split(".").map((x: string) => Number(x) || 0)
  const t = env.INTERBASE_BUMP?.toLowerCase()
  if (t === "major") return `${major + 1}.0.0`
  if (t === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
})()

const team = ["rehatkathuria"]

export const Script = {
  get channel() {
    return CHANNEL
  },
  get version() {
    return VERSION
  },
  get preview() {
    return IS_PREVIEW
  },
  get release(): boolean {
    return !!env.INTERBASE_RELEASE
  },
  get team() {
    return team
  },
}
console.log(`interbase script`, JSON.stringify(Script, null, 2))
