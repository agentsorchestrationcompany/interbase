import fs from "fs/promises"
import os from "os"
import path from "path"
import { afterAll } from "bun:test"

const dir = path.join(os.tmpdir(), "interbase-core-test-data-" + process.pid)
const home = path.join(dir, "home")

process.env["HOME"] = home
process.env["INTERBASE_TEST_HOME"] = home
process.env["INTERBASE_TEST_SANDBOX_ROOT"] = dir
process.env["XDG_DATA_HOME"] = path.join(dir, "share")
process.env["XDG_CACHE_HOME"] = path.join(dir, "cache")
process.env["XDG_CONFIG_HOME"] = path.join(dir, "config")
process.env["XDG_STATE_HOME"] = path.join(dir, "state")
process.env["INTERBASE_DB"] = ":memory:"

await fs.mkdir(home, { recursive: true })

afterAll(async () => {
  await fs.rm(dir, { force: true, recursive: true })
})
