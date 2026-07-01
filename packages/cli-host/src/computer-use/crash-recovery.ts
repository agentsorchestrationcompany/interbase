export type HelperCrashRecoveryState = {
  crashes: number
  lastCrashAtMs?: number
  restartAfterMs?: number
  disabled: boolean
  reason?: "crash_loop"
}

export type HelperCrashRecoveryOptions = {
  maxCrashes: number
  baseBackoffMs: number
  maxBackoffMs: number
  crashWindowMs: number
}

export const DEFAULT_HELPER_CRASH_RECOVERY_OPTIONS: HelperCrashRecoveryOptions = {
  maxCrashes: 3,
  baseBackoffMs: 250,
  maxBackoffMs: 5_000,
  crashWindowMs: 60_000,
}

export function initialHelperCrashRecoveryState(): HelperCrashRecoveryState {
  return { crashes: 0, disabled: false }
}

export function recordHelperCrash(
  state: HelperCrashRecoveryState,
  nowMs: number,
  options: Partial<HelperCrashRecoveryOptions> = {},
): HelperCrashRecoveryState {
  const normalized = normalizeOptions(options)
  if (state.disabled) return state
  const crashes = state.lastCrashAtMs !== undefined && nowMs - state.lastCrashAtMs <= normalized.crashWindowMs ? state.crashes + 1 : 1
  if (crashes > normalized.maxCrashes) {
    return { crashes, lastCrashAtMs: nowMs, disabled: true, reason: "crash_loop" }
  }
  return {
    crashes,
    lastCrashAtMs: nowMs,
    restartAfterMs: nowMs + backoffMs(crashes, normalized),
    disabled: false,
  }
}

export function canRestartHelper(state: HelperCrashRecoveryState, nowMs: number) {
  return !state.disabled && (state.restartAfterMs === undefined || nowMs >= state.restartAfterMs)
}

export function recordHelperStarted(state: HelperCrashRecoveryState): HelperCrashRecoveryState {
  if (state.disabled) return state
  return { crashes: state.crashes, lastCrashAtMs: state.lastCrashAtMs, disabled: false }
}

function normalizeOptions(options: Partial<HelperCrashRecoveryOptions>): HelperCrashRecoveryOptions {
  return {
    maxCrashes: positiveInteger(options.maxCrashes, DEFAULT_HELPER_CRASH_RECOVERY_OPTIONS.maxCrashes),
    baseBackoffMs: positiveInteger(options.baseBackoffMs, DEFAULT_HELPER_CRASH_RECOVERY_OPTIONS.baseBackoffMs),
    maxBackoffMs: positiveInteger(options.maxBackoffMs, DEFAULT_HELPER_CRASH_RECOVERY_OPTIONS.maxBackoffMs),
    crashWindowMs: positiveInteger(options.crashWindowMs, DEFAULT_HELPER_CRASH_RECOVERY_OPTIONS.crashWindowMs),
  }
}

function backoffMs(crashes: number, options: HelperCrashRecoveryOptions) {
  return Math.min(options.maxBackoffMs, options.baseBackoffMs * 2 ** Math.max(0, crashes - 1))
}

function positiveInteger(value: number | undefined, fallback: number) {
  return Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback
}
