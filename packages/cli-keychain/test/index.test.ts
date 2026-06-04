import { describe, expect, test } from "bun:test"
import {
  createInterbaseCliKeychain,
  deleteInterbaseCliToken,
  INTERBASE_CLI_KEYCHAIN_SERVICE_NAME,
  readInterbaseCliToken,
  type KeychainExecFile,
} from "../src/index"

describe("Interbase CLI keychain", () => {
  test("skips keychain commands on non-macOS platforms", async () => {
    const calls: string[] = []
    const keychain = createInterbaseCliKeychain({
      platform: "linux",
      execFile: async (file) => {
        calls.push(file)
        return { stdout: "secret" }
      },
    })

    expect(await keychain.readInterbaseCliToken("https://api.example.com")).toBeNull()
    await keychain.writeInterbaseCliToken("https://api.example.com", "token")
    await keychain.deleteInterbaseCliToken("https://api.example.com")
    expect(calls).toEqual([])
  })

  test("reads trimmed macOS keychain tokens and converts empty or failed reads to null", async () => {
    const outputs = [" token-value \n", "  "]
    const calls: { file: string; args: readonly string[] }[] = []
    const execFile: KeychainExecFile = async (file, args) => {
      calls.push({ file, args })
      const stdout = outputs.shift()
      if (stdout === undefined) throw new Error("missing")
      return { stdout }
    }
    const keychain = createInterbaseCliKeychain({ platform: "darwin", execFile })

    expect(await keychain.readInterbaseCliToken("https://api.example.com")).toBe("token-value")
    expect(await keychain.readInterbaseCliToken("https://api.example.com")).toBeNull()
    expect(await keychain.readInterbaseCliToken("https://api.example.com")).toBeNull()
    expect(calls).toEqual([
      {
        file: "security",
        args: [
          "find-generic-password",
          "-s",
          INTERBASE_CLI_KEYCHAIN_SERVICE_NAME,
          "-a",
          "https://api.example.com",
          "-w",
        ],
      },
      {
        file: "security",
        args: [
          "find-generic-password",
          "-s",
          INTERBASE_CLI_KEYCHAIN_SERVICE_NAME,
          "-a",
          "https://api.example.com",
          "-w",
        ],
      },
      {
        file: "security",
        args: [
          "find-generic-password",
          "-s",
          INTERBASE_CLI_KEYCHAIN_SERVICE_NAME,
          "-a",
          "https://api.example.com",
          "-w",
        ],
      },
    ])
  })

  test("writes and deletes macOS keychain tokens through explicit service authority", async () => {
    const calls: { file: string; args: readonly string[] }[] = []
    const keychain = createInterbaseCliKeychain({
      platform: "darwin",
      execFile: async (file, args) => {
        calls.push({ file, args })
        return { stdout: "" }
      },
    })

    await keychain.writeInterbaseCliToken("https://api.example.com", "token-value")
    await keychain.deleteInterbaseCliToken("https://api.example.com")

    expect(calls).toEqual([
      {
        file: "security",
        args: [
          "add-generic-password",
          "-U",
          "-s",
          INTERBASE_CLI_KEYCHAIN_SERVICE_NAME,
          "-a",
          "https://api.example.com",
          "-w",
          "token-value",
        ],
      },
      {
        file: "security",
        args: ["delete-generic-password", "-s", INTERBASE_CLI_KEYCHAIN_SERVICE_NAME, "-a", "https://api.example.com"],
      },
    ])
  })

  test("ignores macOS delete failures", async () => {
    const keychain = createInterbaseCliKeychain({
      platform: "darwin",
      execFile: async () => {
        throw new Error("delete failed")
      },
    })

    await expect(keychain.deleteInterbaseCliToken("https://api.example.com")).resolves.toBeUndefined()
  })

  test("system keychain exports use the same package API", () => {
    expect(typeof readInterbaseCliToken).toBe("function")
    expect(typeof deleteInterbaseCliToken).toBe("function")
  })
})
