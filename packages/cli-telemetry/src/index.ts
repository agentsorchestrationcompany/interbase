import { createHash, randomBytes } from "node:crypto"
import { execFileSync } from "node:child_process"
import { readFile } from "node:fs/promises"
import { createJsonStateStore, type JsonValue, type RuntimeAccessPolicyInput, type StateFilePath } from "@interbase/cli-local-state"
import { stateFilePath, type CliRuntimePaths } from "@interbase/cli-runtime-context"
import { z } from "zod"

const telemetryRequestVersion = 1
const telemetryStateVersion = 1
const telemetryTimeoutMs = 1_000
const hardwareIdentityTimeoutMs = 500
const digestPattern = /^[a-f0-9]{64}$/

/* v8 ignore start -- enum declarations are contract constants, not runtime behavior. */
export enum CliTelemetryEvent {
  AliasCreated = "alias_created",
  AliasDeleted = "alias_deleted",
  AliasExpanded = "alias_expanded",
  AnalyticsDisabled = "analytics_disabled",
  AnalyticsEnabled = "analytics_enabled",
  AnalyticsStatusViewed = "analytics_status_viewed",
  DoctorRun = "doctor_run",
  GoalBlocked = "goal_blocked",
  GoalBudgetLimited = "goal_budget_limited",
  GoalCleared = "goal_cleared",
  GoalContinuationStarted = "goal_continuation_started",
  GoalCompleted = "goal_completed",
  GoalCreated = "goal_created",
  GoalEdited = "goal_edited",
  GoalPaused = "goal_paused",
  GoalReplaced = "goal_replaced",
  GoalReplacementCancelled = "goal_replacement_cancelled",
  GoalResumePromptShown = "goal_resume_prompt_shown",
  GoalResumed = "goal_resumed",
  GoalUsageLimited = "goal_usage_limited",
  ModelPickerOpened = "model_picker_opened",
  ModelSelected = "model_selected",
  PromptSubmitted = "prompt_submitted",
  ProviderAuthCompleted = "provider_auth_completed",
  ProviderAuthFailed = "provider_auth_failed",
  ProviderAuthStarted = "provider_auth_started",
  RemoteRuntimeConnected = "remote_runtime_connected",
  ReviewRequested = "review_requested",
  SessionCompacted = "session_compacted",
  SessionCreated = "session_created",
  SessionError = "session_error",
  SessionExported = "session_exported",
  SessionForked = "session_forked",
  SessionImported = "session_imported",
  SessionInterrupted = "session_interrupted",
  SessionNewRequested = "session_new_requested",
  SessionPickerOpened = "session_picker_opened",
  SessionResumed = "session_resumed",
  Started = "started",
  ThemeChanged = "theme_changed",
  ThemePickerOpened = "theme_picker_opened",
  ToolCalled = "tool_called",
  UpgradeCompleted = "upgrade_completed",
  UpgradeStarted = "upgrade_started",
}

export enum CliTelemetryEntrypoint {
  Tui = "tui",
  Server = "server",
  Command = "command",
}

export enum CliTelemetryIdentitySource {
  HardwareMachine = "hardware_machine",
  GeneratedInstallation = "generated_installation",
}

export enum CliAnalyticsPreference {
  Enabled = "enabled",
  Disabled = "disabled",
}

export enum CliAnalyticsPreferenceSource {
  Default = "default",
  DoNotTrackEnvironment = "do_not_track_environment",
  InterbaseEnvironment = "interbase_environment",
  Persisted = "persisted",
}
/* v8 ignore stop */

/* v8 ignore start -- schema construction is declarative contract scaffolding. */
export const CliTelemetryEventPropertiesSchema = z.object({
  cliEntrypoint: z.enum([
    CliTelemetryEntrypoint.Tui,
    CliTelemetryEntrypoint.Server,
    CliTelemetryEntrypoint.Command,
  ]),
  goalDurationSeconds: z.number().int().nonnegative().optional(),
  goalStatus: z.enum(["active", "paused", "complete", "blocked", "budgetLimited", "usageLimited"]).optional(),
  goalTokenBudget: z.number().int().positive().nullable().optional(),
  goalTokensUsed: z.number().int().nonnegative().optional(),
  reviewTargetType: z.enum(["branch", "uncommitted", "sha"]).optional(),
}).strict()

export const CliTelemetryAnonymousIdentitySchema = z.object({
  digest: z.string().regex(digestPattern),
  source: z.enum([CliTelemetryIdentitySource.HardwareMachine, CliTelemetryIdentitySource.GeneratedInstallation]),
}).strict()

export const CliTelemetryEventRequestSchema = z.object({
  anonymousIdentity: CliTelemetryAnonymousIdentitySchema.optional(),
  properties: CliTelemetryEventPropertiesSchema,
  event: z.enum([
    CliTelemetryEvent.AliasCreated,
    CliTelemetryEvent.AliasDeleted,
    CliTelemetryEvent.AliasExpanded,
    CliTelemetryEvent.AnalyticsDisabled,
    CliTelemetryEvent.AnalyticsEnabled,
    CliTelemetryEvent.AnalyticsStatusViewed,
    CliTelemetryEvent.DoctorRun,
    CliTelemetryEvent.GoalBlocked,
    CliTelemetryEvent.GoalBudgetLimited,
    CliTelemetryEvent.GoalCleared,
    CliTelemetryEvent.GoalContinuationStarted,
    CliTelemetryEvent.GoalCompleted,
    CliTelemetryEvent.GoalCreated,
    CliTelemetryEvent.GoalEdited,
    CliTelemetryEvent.GoalPaused,
    CliTelemetryEvent.GoalReplaced,
    CliTelemetryEvent.GoalReplacementCancelled,
    CliTelemetryEvent.GoalResumePromptShown,
    CliTelemetryEvent.GoalResumed,
    CliTelemetryEvent.GoalUsageLimited,
    CliTelemetryEvent.ModelPickerOpened,
    CliTelemetryEvent.ModelSelected,
    CliTelemetryEvent.PromptSubmitted,
    CliTelemetryEvent.ProviderAuthCompleted,
    CliTelemetryEvent.ProviderAuthFailed,
    CliTelemetryEvent.ProviderAuthStarted,
    CliTelemetryEvent.RemoteRuntimeConnected,
    CliTelemetryEvent.ReviewRequested,
    CliTelemetryEvent.SessionCompacted,
    CliTelemetryEvent.SessionCreated,
    CliTelemetryEvent.SessionError,
    CliTelemetryEvent.SessionExported,
    CliTelemetryEvent.SessionForked,
    CliTelemetryEvent.SessionImported,
    CliTelemetryEvent.SessionInterrupted,
    CliTelemetryEvent.SessionNewRequested,
    CliTelemetryEvent.SessionPickerOpened,
    CliTelemetryEvent.SessionResumed,
    CliTelemetryEvent.Started,
    CliTelemetryEvent.ThemeChanged,
    CliTelemetryEvent.ThemePickerOpened,
    CliTelemetryEvent.ToolCalled,
    CliTelemetryEvent.UpgradeCompleted,
    CliTelemetryEvent.UpgradeStarted,
  ]),
  version: z.literal(telemetryRequestVersion),
}).strict()

export type CliTelemetryEventRequest = z.infer<typeof CliTelemetryEventRequestSchema>
export type CliTelemetryAnonymousIdentity = z.infer<typeof CliTelemetryAnonymousIdentitySchema>
export type CliTelemetryEventProperties = z.infer<typeof CliTelemetryEventPropertiesSchema>
export type CliTelemetryEventPropertiesInput = Omit<CliTelemetryEventProperties, "cliEntrypoint">

const CliTelemetryStateSchema = z.object({
  generatedInstallationId: z.string().min(1).optional(),
  preference: z.enum([CliAnalyticsPreference.Enabled, CliAnalyticsPreference.Disabled]).optional(),
  updatedAt: z.string().datetime().optional(),
  version: z.literal(telemetryStateVersion),
}).strict()
/* v8 ignore stop */

type CliTelemetryState = z.infer<typeof CliTelemetryStateSchema>

export function defaultCliTelemetryState(): CliTelemetryState {
  return { version: telemetryStateVersion }
}

export function parseCliTelemetryState(value: JsonValue): CliTelemetryState {
  return CliTelemetryStateSchema.parse(value)
}

export type CliTelemetryEnvironment = {
  readonly DO_NOT_TRACK?: string
  readonly INTERBASE_TELEMETRY_DISABLED?: string
}

export type CliAnalyticsPreferenceResolution = {
  readonly enabled: boolean
  readonly preference: CliAnalyticsPreference
  readonly source: CliAnalyticsPreferenceSource
}

export type CliTelemetryStateStoreInput = {
  readonly accessPolicy: RuntimeAccessPolicyInput
  readonly path: StateFilePath
}

export type CliTelemetryClientInput = {
  readonly apiBaseUrl: string
  readonly authorizationBearerToken?: string
  readonly fetch?: typeof fetch
  readonly request: CliTelemetryEventRequest
  readonly timeoutMs?: number
}

export type CliTelemetryEmitStartupInput = {
  readonly accessPolicy: RuntimeAccessPolicyInput
  readonly apiBaseUrl: string
  readonly authorizationBearerToken?: string
  readonly entrypoint: CliTelemetryEntrypoint
  readonly environment: CliTelemetryEnvironment
  readonly fetch?: typeof fetch
  readonly paths: CliRuntimePaths
  readonly platform?: NodeJS.Platform
  readonly timeoutMs?: number
}

export type CliTelemetryEmitEventInput = Omit<CliTelemetryEmitStartupInput, "entrypoint"> & {
  readonly event: CliTelemetryEvent
  readonly entrypoint: CliTelemetryEntrypoint
  readonly properties?: CliTelemetryEventPropertiesInput
}

export type CliTelemetryHardwareIdentityServices = {
  readonly readTextFile?: (filePath: string) => Promise<string>
  readonly runCommand?: (command: string, args: readonly string[]) => Promise<string>
}

export function telemetryStateFilePath(paths: CliRuntimePaths) {
  return stateFilePath(paths, "analytics-preferences.json")
}

export function createCliTelemetryStateStore(input: CliTelemetryStateStoreInput) {
  return createJsonStateStore<CliTelemetryState>({
    accessPolicy: input.accessPolicy,
    concurrency: "multiProcess",
    defaultValue: defaultCliTelemetryState,
    kind: "cli-telemetry",
    path: input.path,
    recoverability: "quarantineAndDefault",
    schema: {
      parse: parseCliTelemetryState,
    },
    version: telemetryStateVersion,
  })
}

export function resolveCliAnalyticsPreference(input: {
  readonly environment: CliTelemetryEnvironment
  readonly persistedPreference?: CliAnalyticsPreference
}): CliAnalyticsPreferenceResolution {
  if (input.environment.INTERBASE_TELEMETRY_DISABLED === "1") {
    return {
      enabled: false,
      preference: CliAnalyticsPreference.Disabled,
      source: CliAnalyticsPreferenceSource.InterbaseEnvironment,
    }
  }
  if (input.environment.DO_NOT_TRACK === "1") {
    return {
      enabled: false,
      preference: CliAnalyticsPreference.Disabled,
      source: CliAnalyticsPreferenceSource.DoNotTrackEnvironment,
    }
  }
  if (input.persistedPreference === CliAnalyticsPreference.Disabled) {
    return {
      enabled: false,
      preference: CliAnalyticsPreference.Disabled,
      source: CliAnalyticsPreferenceSource.Persisted,
    }
  }
  if (input.persistedPreference === CliAnalyticsPreference.Enabled) {
    return {
      enabled: true,
      preference: CliAnalyticsPreference.Enabled,
      source: CliAnalyticsPreferenceSource.Persisted,
    }
  }
  return {
    enabled: true,
    preference: CliAnalyticsPreference.Enabled,
    source: CliAnalyticsPreferenceSource.Default,
  }
}

export async function readCliAnalyticsPreference(input: CliTelemetryStateStoreInput & {
  readonly environment: CliTelemetryEnvironment
}) {
  const state = await createCliTelemetryStateStore(input).read()
  return resolveCliAnalyticsPreference({
    environment: input.environment,
    persistedPreference: state.preference,
  })
}

export async function setCliAnalyticsPreference(input: CliTelemetryStateStoreInput & {
  readonly preference: CliAnalyticsPreference
}) {
  await createCliTelemetryStateStore(input).update((state) => ({
    ...state,
    preference: input.preference,
    updatedAt: new Date().toISOString(),
  }))
}

export async function persistedCliAnalyticsPreference(input: CliTelemetryStateStoreInput) {
  return (await createCliTelemetryStateStore(input).read()).preference
}

export function cliAnalyticsPreferenceStatusText(resolution: CliAnalyticsPreferenceResolution) {
  if (resolution.enabled) {
    const source = resolution.source === CliAnalyticsPreferenceSource.Default ? "default" : "global preference"
    return [
      `Analytics: enabled (${source})`,
      "",
      "Interbase sends a startup analytics event to understand CLI usage.",
      "For anonymous usage, Interbase uses a hashed device identifier where available.",
      "It does not collect prompts, file paths, repo names, hostnames, emails, auth tokens, raw device IDs, or goal objectives.",
      "",
      "Disable with: interbase analytics off",
    ].join("\n")
  }
  if (resolution.source === CliAnalyticsPreferenceSource.InterbaseEnvironment) {
    return "Analytics: disabled by INTERBASE_TELEMETRY_DISABLED\nUnset that environment variable to allow analytics."
  }
  if (resolution.source === CliAnalyticsPreferenceSource.DoNotTrackEnvironment) {
    return "Analytics: disabled by DO_NOT_TRACK\nUnset that environment variable to allow analytics."
  }
  return "Analytics: disabled by global preference\nEnable with: interbase analytics on"
}

export async function runCliAnalyticsStatus(input: CliTelemetryStateStoreInput & {
  readonly environment: CliTelemetryEnvironment
  readonly write: (text: string) => void
}) {
  input.write(cliAnalyticsPreferenceStatusText(await readCliAnalyticsPreference(input)))
}

export async function runCliAnalyticsOff(input: CliTelemetryStateStoreInput & {
  readonly write: (text: string) => void
}) {
  await setCliAnalyticsPreference({
    accessPolicy: input.accessPolicy,
    path: input.path,
    preference: CliAnalyticsPreference.Disabled,
  })
  input.write("Analytics disabled. Interbase will not send CLI startup telemetry.")
}

export async function runCliAnalyticsOn(input: CliTelemetryStateStoreInput & {
  readonly environment: CliTelemetryEnvironment
  readonly write: (text: string) => void
}) {
  await setCliAnalyticsPreference({
    accessPolicy: input.accessPolicy,
    path: input.path,
    preference: CliAnalyticsPreference.Enabled,
  })
  input.write(cliAnalyticsPreferenceStatusText(await readCliAnalyticsPreference(input)))
}

export function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function buildCliTelemetryRequest(input: {
  readonly anonymousIdentity: CliTelemetryAnonymousIdentity
  readonly event: CliTelemetryEvent
  readonly entrypoint: CliTelemetryEntrypoint
  readonly properties?: CliTelemetryEventPropertiesInput
}): CliTelemetryEventRequest {
  return CliTelemetryEventRequestSchema.parse({
    anonymousIdentity: input.anonymousIdentity,
    properties: {
      cliEntrypoint: input.entrypoint,
      ...input.properties,
    },
    event: input.event,
    version: telemetryRequestVersion,
  })
}

export function abortCliTelemetryRequest(controller: AbortController) {
  controller.abort()
}

export async function resolveCliTelemetryAnonymousIdentity(input: CliTelemetryStateStoreInput & {
  readonly hardwareIdentityServices?: CliTelemetryHardwareIdentityServices
  readonly platform?: NodeJS.Platform
}): Promise<CliTelemetryAnonymousIdentity> {
  const hardwareId = await resolveHardwareMachineId(input.platform ?? process.platform, input.hardwareIdentityServices)
  if (hardwareId) {
    return {
      digest: sha256Hex(`interbase-cli:hardware-machine:v1:${hardwareId}`),
      source: CliTelemetryIdentitySource.HardwareMachine,
    }
  }
  const store = createCliTelemetryStateStore(input)
  const state = await store.update((current) => {
    if (current.generatedInstallationId) return current
    return {
      ...current,
      generatedInstallationId: randomBytes(32).toString("base64url"),
      updatedAt: new Date().toISOString(),
    }
  })
  return {
    digest: sha256Hex(`interbase-cli:generated-installation:v1:${state.generatedInstallationId}`),
    source: CliTelemetryIdentitySource.GeneratedInstallation,
  }
}

export async function sendCliTelemetryEvent(input: CliTelemetryClientInput) {
  const controller = new AbortController()
  const timeout = setTimeout(abortCliTelemetryRequest, input.timeoutMs ?? telemetryTimeoutMs, controller)
  try {
    const response = await (input.fetch ?? fetch)(new URL("/api/cli/analytics/events", input.apiBaseUrl), {
      body: JSON.stringify(input.request),
      headers: {
        ...(input.authorizationBearerToken ? { Authorization: `Bearer ${input.authorizationBearerToken}` } : {}),
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    })
    return response.ok
  } finally {
    clearTimeout(timeout)
  }
}

export async function emitCliTelemetryEvent(input: CliTelemetryEmitEventInput) {
  const statePath = telemetryStateFilePath(input.paths)
  const preference = await readCliAnalyticsPreference({
    accessPolicy: input.accessPolicy,
    environment: input.environment,
    path: statePath,
  })
  if (!preference.enabled) return false
  const anonymousIdentity = await resolveCliTelemetryAnonymousIdentity({
    accessPolicy: input.accessPolicy,
    path: statePath,
    platform: input.platform,
  })
  return await sendCliTelemetryEvent({
    apiBaseUrl: input.apiBaseUrl,
    authorizationBearerToken: input.authorizationBearerToken,
    fetch: input.fetch,
    request: buildCliTelemetryRequest({
      anonymousIdentity,
      event: input.event,
      entrypoint: input.entrypoint,
      properties: input.properties,
    }),
    timeoutMs: input.timeoutMs,
  }).catch(() => false)
}

export async function emitCliStartupTelemetry(input: CliTelemetryEmitStartupInput) {
  return await emitCliTelemetryEvent({
    ...input,
    event: CliTelemetryEvent.Started,
  })
}

export async function resolveHardwareMachineId(
  platform: NodeJS.Platform,
  services: CliTelemetryHardwareIdentityServices = {},
) {
  if (platform === "linux") return await firstNonBlankFile(["/etc/machine-id", "/var/lib/dbus/machine-id"], services)
  if (platform === "darwin") return await runHardwareIdentityCommand("/usr/sbin/ioreg", ["-rd1", "-c", "IOPlatformExpertDevice"], services).then(
    (output) => output.match(/"IOPlatformUUID"\s=\s"([^"]+)"/)?.[1]?.trim() || null,
  )
  if (platform === "win32") return await runHardwareIdentityCommand("REG", ["QUERY", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], services).then(
    (output) => output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/)?.[1]?.trim() || null,
  )
  return null
}

async function firstNonBlankFile(paths: readonly string[], services: CliTelemetryHardwareIdentityServices) {
  for (const filePath of paths) {
    const value = await (services.readTextFile?.(filePath) ?? readFile(filePath, "utf8")).then(
      (content) => content.trim(),
      () => "",
    )
    if (value) return value
  }
  return null
}

async function runHardwareIdentityCommand(
  command: string,
  args: readonly string[],
  services: CliTelemetryHardwareIdentityServices,
) {
  if (services.runCommand) return (await services.runCommand(command, args)).trim()
  try {
    return execFileSync(command, [...args], {
      encoding: "utf8",
      timeout: hardwareIdentityTimeoutMs,
    }).trim()
  } catch {
    return ""
  }
}
