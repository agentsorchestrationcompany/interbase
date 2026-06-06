import { describe, expect, test } from "bun:test"
import {
  canRestartHelper,
  initialHelperCrashRecoveryState,
  recordHelperCrash,
  recordHelperStarted,
} from "@/computer-use/crash-recovery"

describe("computer-use helper crash recovery", () => {
  test("starts in restartable state", () => {
    const state = initialHelperCrashRecoveryState()
    expect(state).toEqual({ crashes: 0, disabled: false })
    expect(canRestartHelper(state, 0)).toBe(true)
  })

  test("applies exponential restart backoff within the crash window", () => {
    let state = initialHelperCrashRecoveryState()
    state = recordHelperCrash(state, 1_000, { baseBackoffMs: 100, maxBackoffMs: 1_000, crashWindowMs: 10_000 })
    expect(state).toMatchObject({ crashes: 1, lastCrashAtMs: 1_000, restartAfterMs: 1_100, disabled: false })
    expect(canRestartHelper(state, 1_099)).toBe(false)
    expect(canRestartHelper(state, 1_100)).toBe(true)

    state = recordHelperStarted(state)
    expect(state.restartAfterMs).toBeUndefined()
    state = recordHelperCrash(state, 1_500, { baseBackoffMs: 100, maxBackoffMs: 1_000, crashWindowMs: 10_000 })
    expect(state).toMatchObject({ crashes: 2, restartAfterMs: 1_700 })
  })

  test("resets crash count outside the crash window and clamps backoff", () => {
    let state = recordHelperCrash(initialHelperCrashRecoveryState(), 1_000, { baseBackoffMs: 600, maxBackoffMs: 1_000, crashWindowMs: 100 })
    state = recordHelperCrash(state, 1_050, { baseBackoffMs: 600, maxBackoffMs: 1_000, crashWindowMs: 100 })
    expect(state.restartAfterMs).toBe(2_050)
    state = recordHelperCrash(state, 2_000, { baseBackoffMs: 600, maxBackoffMs: 1_000, crashWindowMs: 100 })
    expect(state).toMatchObject({ crashes: 1, restartAfterMs: 2_600 })
  })

  test("disables restart after crash loops and preserves disabled state", () => {
    let state = initialHelperCrashRecoveryState()
    state = recordHelperCrash(state, 1, { maxCrashes: 1 })
    state = recordHelperCrash(state, 2, { maxCrashes: 1 })
    expect(state).toEqual({ crashes: 2, lastCrashAtMs: 2, disabled: true, reason: "crash_loop" })
    expect(canRestartHelper(state, 10_000)).toBe(false)
    expect(recordHelperCrash(state, 3)).toBe(state)
    expect(recordHelperStarted(state)).toBe(state)
  })

  test("normalizes invalid options", () => {
    const state = recordHelperCrash(initialHelperCrashRecoveryState(), 1_000, {
      maxCrashes: 0,
      baseBackoffMs: -1,
      maxBackoffMs: Number.NaN,
      crashWindowMs: 1.5,
    })
    expect(state).toMatchObject({ crashes: 1, restartAfterMs: 1_250, disabled: false })
  })
})
