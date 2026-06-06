import { describe, expect, test } from "bun:test"
import { ConfigComputerUse } from "@/config/computer-use"
import { ConfigParse } from "@/config/parse"
import { Config } from "@/config/config"
import { InvalidError } from "@/config/error"

describe("computer-use config", () => {
  test("normalizes enabled defaults safely", () => {
    expect(ConfigComputerUse.exposure(undefined)).toEqual({
      enabled: true,
      exposeTools: true,
      backend: "native",
      reason: undefined,
    })
    expect(ConfigComputerUse.effectiveConfig(undefined)).toMatchObject({
      enabled: true,
      backend: "native",
      model_attachment: { allow_screenshots_to_remote_models: "never" },
    })
  })

  test("enabled config is currently ignored because computer-use is always on", () => {
    expect(ConfigComputerUse.exposure({ enabled: false })).toEqual({
      enabled: true,
      exposeTools: true,
      backend: "native",
      reason: undefined,
    })
  })

  test("rejects mock config", () => {
    expect(() => {
      ConfigParse.effectSchema(Config.Info, { computer_use: { mock: true } }, "test")
    }).toThrow(InvalidError)
  })
})
