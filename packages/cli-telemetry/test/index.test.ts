import { mkdtemp, readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "vitest"
import { parseCliRuntimeEnvironment, stateFilePath } from "@interbase/cli-runtime-context"
import {
  buildCliTelemetryRequest,
  abortCliTelemetryRequest,
  CliAnalyticsPreference,
  CliAnalyticsPreferenceSource,
  CliTelemetryEntrypoint,
  CliTelemetryEvent,
  CliTelemetryEventRequestSchema,
  CliTelemetryIdentitySource,
  cliAnalyticsPreferenceStatusText,
  createCliTelemetryStateStore,
  defaultCliTelemetryState,
  emitCliStartupTelemetry,
  readCliAnalyticsPreference,
  persistedCliAnalyticsPreference,
  parseCliTelemetryState,
  resolveCliAnalyticsPreference,
  resolveHardwareMachineId,
  resolveCliTelemetryAnonymousIdentity,
  runCliAnalyticsOff,
  runCliAnalyticsOn,
  runCliAnalyticsStatus,
  sendCliTelemetryEvent,
  setCliAnalyticsPreference,
  sha256Hex,
  telemetryStateFilePath,
} from "../src/index.js"

async function runtime() {
  const root = await mkdtemp(path.join(os.tmpdir(), "interbase-telemetry-"))
  return parseCliRuntimeEnvironment({
    HOME: path.join(root, "home"),
    INTERBASE_TEST_SANDBOX_ROOT: root,
    XDG_CACHE_HOME: path.join(root, "cache"),
    XDG_CONFIG_HOME: path.join(root, "config"),
    XDG_DATA_HOME: path.join(root, "data"),
    XDG_STATE_HOME: path.join(root, "state"),
  })
}

describe("cli telemetry", () => {
  test("parses versioned startup requests with strict digest validation", () => {
    const digest = "a".repeat(64)
    const request = buildCliTelemetryRequest({
      anonymousIdentity: { digest, source: CliTelemetryIdentitySource.GeneratedInstallation },
      event: CliTelemetryEvent.Started,
      entrypoint: CliTelemetryEntrypoint.Command,
    })
    expect(CliTelemetryEventRequestSchema.parse(request)).toEqual(request)
    expect(() => CliTelemetryEventRequestSchema.parse({ ...request, version: 2 })).toThrow()
    expect(() => CliTelemetryEventRequestSchema.parse({ ...request, anonymousIdentity: { ...request.anonymousIdentity, digest: "A".repeat(64) } })).toThrow()
    expect(sha256Hex("test")).toMatch(/^[a-f0-9]{64}$/)
  })

  test("parses strict event properties for goal lifecycle telemetry", () => {
    const request = buildCliTelemetryRequest({
      anonymousIdentity: { digest: "c".repeat(64), source: CliTelemetryIdentitySource.HardwareMachine },
      event: CliTelemetryEvent.GoalCompleted,
      entrypoint: CliTelemetryEntrypoint.Command,
      properties: {
        goalDurationSeconds: 123,
        goalStatus: "complete",
        goalTokenBudget: 10_000,
        goalTokensUsed: 9_876,
      },
    })
    expect(CliTelemetryEventRequestSchema.parse(request)).toEqual(request)
    expect(request.properties).toEqual({
      cliEntrypoint: CliTelemetryEntrypoint.Command,
      goalDurationSeconds: 123,
      goalStatus: "complete",
      goalTokenBudget: 10_000,
      goalTokensUsed: 9_876,
    })
    expect(() => CliTelemetryEventRequestSchema.parse({
      ...request,
      properties: { ...request.properties, goalDurationSeconds: -1 },
    })).toThrow()
    expect(() => CliTelemetryEventRequestSchema.parse({
      ...request,
      properties: { ...request.properties, objective: "do not accept user content" },
    })).toThrow()
  })

  test("parses safe categorical review telemetry properties", () => {
    const request = buildCliTelemetryRequest({
      anonymousIdentity: { digest: "d".repeat(64), source: CliTelemetryIdentitySource.HardwareMachine },
      event: CliTelemetryEvent.ReviewRequested,
      entrypoint: CliTelemetryEntrypoint.Command,
      properties: { reviewTargetType: "sha" },
    })
    expect(CliTelemetryEventRequestSchema.parse(request)).toEqual(request)
    expect(() => CliTelemetryEventRequestSchema.parse({
      ...request,
      properties: { ...request.properties, reviewTarget: "main" },
    })).toThrow()
  })

  test("resolves telemetry state file path from runtime paths", async () => {
    const ctx = await runtime()
    expect(telemetryStateFilePath(ctx.paths)).toContain("analytics-preferences.json")
    expect(defaultCliTelemetryState()).toEqual({ version: 1 })
    expect(parseCliTelemetryState({ version: 1 })).toEqual({ version: 1 })
  })

  test("resolves preference precedence from exact opt-out values", () => {
    expect(resolveCliAnalyticsPreference({ environment: { INTERBASE_TELEMETRY_DISABLED: "1" } })).toMatchObject({ enabled: false, source: CliAnalyticsPreferenceSource.InterbaseEnvironment })
    expect(resolveCliAnalyticsPreference({ environment: { DO_NOT_TRACK: "1" } })).toMatchObject({ enabled: false, source: CliAnalyticsPreferenceSource.DoNotTrackEnvironment })
    expect(resolveCliAnalyticsPreference({ environment: { INTERBASE_TELEMETRY_DISABLED: "true" }, persistedPreference: CliAnalyticsPreference.Enabled })).toMatchObject({ enabled: true, source: CliAnalyticsPreferenceSource.Persisted })
  })

  test("persists analytics preference in global state", async () => {
    const ctx = await runtime()
    const file = stateFilePath(ctx.paths, "analytics-preferences.json")
    await setCliAnalyticsPreference({ accessPolicy: ctx.accessPolicy, path: file, preference: CliAnalyticsPreference.Disabled })
    await expect(readCliAnalyticsPreference({ accessPolicy: ctx.accessPolicy, environment: {}, path: file })).resolves.toMatchObject({ enabled: false, source: CliAnalyticsPreferenceSource.Persisted })
    await expect(persistedCliAnalyticsPreference({ accessPolicy: ctx.accessPolicy, path: file })).resolves.toBe(CliAnalyticsPreference.Disabled)
    await expect(readFile(file, "utf8")).resolves.toContain('"preference": "disabled"')
  })

  test("round trips telemetry state through the schema-backed store", async () => {
    const ctx = await runtime()
    const file = stateFilePath(ctx.paths, "analytics-preferences.json")
    const store = createCliTelemetryStateStore({ accessPolicy: ctx.accessPolicy, path: file })
    await store.write({ version: 1, preference: CliAnalyticsPreference.Enabled })
    await expect(store.read()).resolves.toMatchObject({ preference: CliAnalyticsPreference.Enabled })
  })

  test("falls back to generated installation digest without exposing raw id", async () => {
    const ctx = await runtime()
    const file = stateFilePath(ctx.paths, "analytics-preferences.json")
    const identity = await resolveCliTelemetryAnonymousIdentity({ accessPolicy: ctx.accessPolicy, path: file, platform: "freebsd" })
    expect(identity.source).toBe(CliTelemetryIdentitySource.GeneratedInstallation)
    expect(identity.digest).toMatch(/^[a-f0-9]{64}$/)
    const content = await readFile(file, "utf8")
    expect(content).not.toContain(identity.digest)
  })

  test("resolves hardware machine ids from explicit platform authorities", async () => {
    await expect(resolveHardwareMachineId("linux", {
      readTextFile: async (filePath) => filePath === "/etc/machine-id" ? "\n" : " linux-machine \n",
    })).resolves.toBe("linux-machine")
    await expect(resolveHardwareMachineId("darwin", {
      runCommand: async () => '    "IOPlatformUUID" = "darwin-machine"',
    })).resolves.toBe("darwin-machine")
    await expect(resolveHardwareMachineId("win32", {
      runCommand: async () => "MachineGuid    REG_SZ    windows-machine\r\n",
    })).resolves.toBe("windows-machine")
    await expect(resolveHardwareMachineId("darwin", { runCommand: async () => "missing" })).resolves.toBeNull()
    await expect(resolveHardwareMachineId("win32", { runCommand: async () => "missing" })).resolves.toBeNull()
    await expect(resolveHardwareMachineId("linux", { readTextFile: async () => { throw new Error("missing") } })).resolves.toBeNull()
    const defaultLinuxIdentity = await resolveHardwareMachineId("linux")
    expect(typeof defaultLinuxIdentity === "string" || defaultLinuxIdentity === null).toBe(true)
    const defaultDarwinIdentity = await resolveHardwareMachineId("darwin")
    expect(typeof defaultDarwinIdentity === "string" || defaultDarwinIdentity === null).toBe(true)
    await expect(resolveHardwareMachineId("win32")).resolves.toBeNull()
  })

  test("uses hardware identity digest when hardware source is available", async () => {
    const ctx = await runtime()
    const file = stateFilePath(ctx.paths, "analytics-preferences.json")
    const identity = await resolveCliTelemetryAnonymousIdentity({
      accessPolicy: ctx.accessPolicy,
      hardwareIdentityServices: { readTextFile: async () => "hardware-1" },
      path: file,
      platform: "linux",
    })
    expect(identity.source).toBe(CliTelemetryIdentitySource.HardwareMachine)
    expect(identity.digest).toMatch(/^[a-f0-9]{64}$/)
    await expect(resolveCliTelemetryAnonymousIdentity({
      accessPolicy: ctx.accessPolicy,
      hardwareIdentityServices: { runCommand: async () => "missing" },
      path: stateFilePath(ctx.paths, "analytics-preferences-default.json"),
      platform: "darwin",
    })).resolves.toMatchObject({ source: CliTelemetryIdentitySource.GeneratedInstallation })
  })

  test("renders and runs analytics preference commands without identity access", async () => {
    const ctx = await runtime()
    const file = stateFilePath(ctx.paths, "analytics-preferences.json")
    const output: string[] = []
    await runCliAnalyticsStatus({ accessPolicy: ctx.accessPolicy, environment: {}, path: file, write: (text) => output.push(text) })
    expect(output.at(-1)).toContain("Analytics: enabled (default)")
    await runCliAnalyticsOff({ accessPolicy: ctx.accessPolicy, path: file, write: (text) => output.push(text) })
    expect(output.at(-1)).toContain("Analytics disabled")
    await runCliAnalyticsStatus({ accessPolicy: ctx.accessPolicy, environment: {}, path: file, write: (text) => output.push(text) })
    expect(output.at(-1)).toContain("Analytics: disabled by global preference")
    await runCliAnalyticsOn({ accessPolicy: ctx.accessPolicy, environment: { DO_NOT_TRACK: "1" }, path: file, write: (text) => output.push(text) })
    expect(output.at(-1)).toContain("Analytics: disabled by DO_NOT_TRACK")
    await runCliAnalyticsOn({ accessPolicy: ctx.accessPolicy, environment: {}, path: file, write: (text) => output.push(text) })
    expect(output.at(-1)).toContain("Analytics: enabled (global preference)")
    expect(cliAnalyticsPreferenceStatusText(resolveCliAnalyticsPreference({ environment: { INTERBASE_TELEMETRY_DISABLED: "1" } }))).toContain("INTERBASE_TELEMETRY_DISABLED")
  })

  test("sends telemetry requests with timeout cleanup", async () => {
    const request = buildCliTelemetryRequest({
      anonymousIdentity: { digest: "b".repeat(64), source: CliTelemetryIdentitySource.GeneratedInstallation },
      event: CliTelemetryEvent.Started,
      entrypoint: CliTelemetryEntrypoint.Server,
    })
    const urls: string[] = []
    await expect(sendCliTelemetryEvent({
      apiBaseUrl: "https://api.interbase.test/base",
      authorizationBearerToken: "token_1",
      fetch: async (input, init) => {
        urls.push(String(input))
        expect((init?.headers as { Authorization?: string }).Authorization).toBe("Bearer token_1")
        expect(init?.method).toBe("POST")
        return new Response(null, { status: 204 })
      },
      request,
    })).resolves.toBe(true)
    expect(urls).toEqual(["https://api.interbase.test/api/cli/analytics/events"])
    await expect(sendCliTelemetryEvent({
      apiBaseUrl: "https://api.interbase.test",
      fetch: async () => new Response(null, { status: 500 }),
      request,
    })).resolves.toBe(false)
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(null, { status: 204 })
    try {
      await expect(sendCliTelemetryEvent({ apiBaseUrl: "https://api.interbase.test", request })).resolves.toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
    const controller = new AbortController()
    abortCliTelemetryRequest(controller)
    expect(controller.signal.aborted).toBe(true)
  })

  test("does not emit or resolve identity when disabled", async () => {
    const ctx = await runtime()
    const calls: string[] = []
    const emitted = await emitCliStartupTelemetry({
      accessPolicy: ctx.accessPolicy,
      apiBaseUrl: "https://api.interbase.test",
      entrypoint: CliTelemetryEntrypoint.Command,
      environment: { INTERBASE_TELEMETRY_DISABLED: "1" },
      fetch: async () => {
        calls.push("fetch")
        return new Response(null, { status: 204 })
      },
      paths: ctx.paths,
      platform: "freebsd",
    })
    expect(emitted).toBe(false)
    expect(calls).toEqual([])
  })

  test("emits startup telemetry when enabled and swallows delivery failures", async () => {
    const ctx = await runtime()
    const requests: string[] = []
    await expect(emitCliStartupTelemetry({
      accessPolicy: ctx.accessPolicy,
      apiBaseUrl: "https://api.interbase.test",
      entrypoint: CliTelemetryEntrypoint.Command,
      environment: {},
      fetch: async (_input, init) => {
        requests.push(String(init?.body))
        return new Response(null, { status: 204 })
      },
      paths: ctx.paths,
      platform: "freebsd",
    })).resolves.toBe(true)
    expect(requests[0]).toContain('"event":"started"')
    await expect(emitCliStartupTelemetry({
      accessPolicy: ctx.accessPolicy,
      apiBaseUrl: "https://api.interbase.test",
      entrypoint: CliTelemetryEntrypoint.Command,
      environment: {},
      fetch: async () => { throw new Error("offline") },
      paths: ctx.paths,
      platform: "freebsd",
    })).resolves.toBe(false)
  })
})
