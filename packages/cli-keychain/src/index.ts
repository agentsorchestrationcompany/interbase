import { execFile as execFileCallback } from "node:child_process"
import { promisify } from "node:util"

export type KeychainExecFile = (file: string, args: readonly string[]) => Promise<{ stdout: string }>

export type InterbaseCliKeychainDependencies = {
  platform: NodeJS.Platform
  execFile: KeychainExecFile
}

export const INTERBASE_CLI_KEYCHAIN_SERVICE_NAME = "interbase-cli"

export function createInterbaseCliKeychain(deps: InterbaseCliKeychainDependencies) {
  return {
    async readInterbaseCliToken(apiBaseUrl: string) {
      if (deps.platform !== "darwin") {
        return null
      }

      try {
        const result = await deps.execFile("security", [
          "find-generic-password",
          "-s",
          INTERBASE_CLI_KEYCHAIN_SERVICE_NAME,
          "-a",
          apiBaseUrl,
          "-w",
        ])
        const token = result.stdout.trim()
        return token.length > 0 ? token : null
      } catch {
        return null
      }
    },

    async writeInterbaseCliToken(apiBaseUrl: string, token: string) {
      if (deps.platform !== "darwin") {
        return
      }

      await deps.execFile("security", [
        "add-generic-password",
        "-U",
        "-s",
        INTERBASE_CLI_KEYCHAIN_SERVICE_NAME,
        "-a",
        apiBaseUrl,
        "-w",
        token,
      ])
    },

    async deleteInterbaseCliToken(apiBaseUrl: string) {
      if (deps.platform !== "darwin") {
        return
      }

      try {
        await deps.execFile("security", [
          "delete-generic-password",
          "-s",
          INTERBASE_CLI_KEYCHAIN_SERVICE_NAME,
          "-a",
          apiBaseUrl,
        ])
      } catch {
        return
      }
    },
  }
}

const execFile = promisify(execFileCallback) as KeychainExecFile

const systemKeychain = createInterbaseCliKeychain({
  platform: process.platform,
  execFile,
})

export const readInterbaseCliToken = systemKeychain.readInterbaseCliToken
export const writeInterbaseCliToken = systemKeychain.writeInterbaseCliToken
export const deleteInterbaseCliToken = systemKeychain.deleteInterbaseCliToken
