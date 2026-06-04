import { describe, expect, test } from "bun:test"
import { Effect, Layer, Stream } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import { Installation } from "../../src/installation"
import { InstallationChannel } from "@interbase/core/installation/version"
import { PackageManagerUninstallArgs, PackageManagerUninstallCommands } from "../../src/cli/cmd/uninstall"
import { InterbaseOverlay } from "@interbase/overlay"

const encoder = new TextEncoder()

function mockHttpClient(handler: (request: HttpClientRequest.HttpClientRequest) => Response) {
  const client = HttpClient.make((request) => Effect.succeed(HttpClientResponse.fromWeb(request, handler(request))))
  return Layer.succeed(HttpClient.HttpClient, client)
}

function mockSpawner(handler: (cmd: string, args: readonly string[]) => string = () => "") {
  const spawner = ChildProcessSpawner.make((command) => {
    const std = ChildProcess.isStandardCommand(command) ? command : undefined
    const output = handler(std?.command ?? "", std?.args ?? [])
    return Effect.succeed(
      ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(0),
        exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
        isRunning: Effect.succeed(false),
        kill: () => Effect.void,
        stdin: { [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") } as any,
        stdout: output ? Stream.make(encoder.encode(output)) : Stream.empty,
        stderr: Stream.empty,
        all: Stream.empty,
        getInputFd: () => ({ [Symbol.for("effect/Sink/TypeId")]: Symbol.for("effect/Sink/TypeId") }) as any,
        getOutputFd: () => Stream.empty,
        unref: Effect.succeed(Effect.void),
      }),
    )
  })
  return Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner)
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}

function testLayer(
  httpHandler: (request: HttpClientRequest.HttpClientRequest) => Response,
  spawnHandler?: (cmd: string, args: readonly string[]) => string,
) {
  return Installation.layer.pipe(Layer.provide(mockHttpClient(httpHandler)), Layer.provide(mockSpawner(spawnHandler)))
}

describe("installation", () => {
  describe("latest", () => {
    test("reads release version from GitHub releases", async () => {
      const layer = testLayer(() => jsonResponse({ tag_name: "v1.2.3" }))

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("unknown")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.2.3")
    })

    test("strips v prefix from GitHub release tag", async () => {
      const layer = testLayer(() => jsonResponse({ tag_name: "v4.0.0-beta.1" }))

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("unknown")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("4.0.0-beta.1")
    })

    test("reads npm versions via registry", async () => {
      const calls: string[] = []
      const layer = testLayer((request) => {
        calls.push(request.url)
        return jsonResponse({ version: "1.5.0" })
      })

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("npm")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.5.0")
      expect(calls).toContain(`https://registry.npmjs.org/interbase/${InstallationChannel}`)
    })

    test("reads bun versions via registry", async () => {
      const calls: string[] = []
      const layer = testLayer((request) => {
        calls.push(request.url)
        return jsonResponse({ version: "1.6.0" })
      })

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("bun")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.6.0")
      expect(calls).toContain(`https://registry.npmjs.org/interbase/${InstallationChannel}`)
    })

    test("reads pnpm versions via registry", async () => {
      const calls: string[] = []
      const layer = testLayer((request) => {
        calls.push(request.url)
        return jsonResponse({ version: "1.7.0" })
      })

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("pnpm")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("1.7.0")
      expect(calls).toContain(`https://registry.npmjs.org/interbase/${InstallationChannel}`)
    })

    test("reads scoop manifest versions", async () => {
      const layer = testLayer(() => jsonResponse({ version: "2.3.4" }))

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("scoop")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("2.3.4")
    })

    test("reads chocolatey feed versions", async () => {
      const layer = testLayer(() => jsonResponse({ d: { results: [{ Version: "3.4.5" }] } }))

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("choco")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("3.4.5")
    })

    test("reads brew formulae API versions", async () => {
      const layer = testLayer(
        () => jsonResponse({ versions: { stable: "2.0.0" } }),
        (cmd, args) => {
          // getBrewFormula: return core formula (no tap)
          if (
            cmd === "brew" &&
            args.includes("--formula") &&
            args.includes("agentsorchestrationcompany/homebrew-tap/interbase")
          )
            return ""
          if (cmd === "brew" && args.includes("--formula") && args.includes("interbase")) return "interbase"
          return ""
        },
      )

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("brew")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("2.0.0")
    })

    test("reads brew tap info JSON via CLI", async () => {
      const brewInfoJson = JSON.stringify({
        formulae: [{ versions: { stable: "2.1.0" } }],
      })
      const layer = testLayer(
        () => jsonResponse({}), // HTTP not used for tap formula
        (cmd, args) => {
          if (
            cmd === "brew" &&
            args.includes("agentsorchestrationcompany/homebrew-tap/interbase") &&
            args.includes("--formula")
          )
            return "interbase"
          if (cmd === "brew" && args.includes("--json=v2")) return brewInfoJson
          return ""
        },
      )

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("brew")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("2.1.0")
    })

    test("uses the public CLI release repository for unknown installs", async () => {
      const calls: string[] = []
      const layer = testLayer((request) => {
        calls.push(request.url)
        return jsonResponse({ tag_name: "v5.6.7" })
      })

      const result = await Effect.runPromise(
        Installation.Service.use((svc) => svc.latest("unknown")).pipe(Effect.provide(layer)),
      )
      expect(result).toBe("5.6.7")
      expect(calls).toContain("https://api.github.com/repos/agentsorchestrationcompany/interbase/releases/latest")
    })
  })

  test("publishes uninstall commands for the public CLI package identity", () => {
    expect(Installation.NpmPackageName).toBe(InterbaseOverlay.release.npmPackage)
    expect(Installation.NpmRegistryPackagePath).toBe("interbase")
    expect(Installation.GitHubReleaseRepository).toBe(InterbaseOverlay.release.githubRepository)
    expect(Installation.HomebrewTapRepository).toBe(InterbaseOverlay.release.homebrewTap)
    expect(PackageManagerUninstallCommands.npm).toBe("npm uninstall -g interbase")
    expect(PackageManagerUninstallCommands.pnpm).toBe("pnpm uninstall -g interbase")
    expect(PackageManagerUninstallCommands.bun).toBe("bun remove -g interbase")
    expect(PackageManagerUninstallCommands.yarn).toBe("yarn global remove interbase")
    expect(PackageManagerUninstallArgs.npm).toEqual(["npm", "uninstall", "-g", "interbase"])
    expect(PackageManagerUninstallArgs.pnpm).toEqual(["pnpm", "uninstall", "-g", "interbase"])
    expect(PackageManagerUninstallArgs.bun).toEqual(["bun", "remove", "-g", "interbase"])
    expect(PackageManagerUninstallArgs.yarn).toEqual(["yarn", "global", "remove", "interbase"])
  })
})
