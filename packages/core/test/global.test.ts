import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Global } from "@interbase/core/global"

describe("global paths", () => {
  test("tmp path is under the system temp directory", () => {
    expect(String(Global.Path.tmp)).toBe(path.join(process.env.INTERBASE_TEST_SANDBOX_ROOT ?? "", "tmp"))
    expect(Global.make().tmp).toBe(Global.Path.tmp)
  })

  test("tmp path is created on module load", async () => {
    expect((await fs.stat(Global.Path.tmp)).isDirectory()).toBe(true)
  })
})
