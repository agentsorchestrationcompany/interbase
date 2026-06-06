import {
  ComputerUseProtocolError,
  decodeEnvelope,
  encodeEnvelope,
  makeDriverRequest,
  validateDriverResponse,
  type DriverMethod,
  type DriverResponse,
} from "@interbase/computer-use-protocol"
import {
  canRestartHelper,
  initialHelperCrashRecoveryState,
  recordHelperCrash,
  recordHelperStarted,
  type HelperCrashRecoveryOptions,
  type HelperCrashRecoveryState,
} from "@/computer-use/crash-recovery"

export type HelperTransport = ReturnType<typeof createHelperTransport>

export function createHelperTransport() {
  const pending = new Map<string, { method: DriverMethod; deadlineMs?: number }>()
  let protocolErrors = 0
  let recovery = initialHelperCrashRecoveryState()

  return {
    send(id: string, method: DriverMethod, params: unknown, deadlineMs?: number) {
      const envelope = makeDriverRequest({ id, method, params, deadlineMs })
      pending.set(id, { method, deadlineMs })
      return encodeEnvelope(envelope)
    },
    receive(line: string) {
      let decoded
      try {
        decoded = decodeEnvelope(line)
      } catch (error) {
        protocolErrors++
        throw error
      }
      if (decoded.method !== "response") {
        protocolErrors++
        throw new ComputerUseProtocolError("helper_event_disallowed", "Helper-initiated events are not allowed")
      }
      const response = validateDriverResponse(decoded.payload as DriverResponse)
      if (!pending.has(response.id)) return { matched: false as const, response }
      pending.delete(response.id)
      return { matched: true as const, response }
    },
    timeout(id: string) {
      if (!pending.delete(id)) return false
      return true
    },
    cancel(id: string) {
      if (!pending.has(id)) return undefined
      return this.send(`cancel:${id}`, "cancel", { id })
    },
    pendingIds() {
      return [...pending.keys()]
    },
    protocolErrors() {
      return protocolErrors
    },
    recordCrash(nowMs: number, options?: Partial<HelperCrashRecoveryOptions>) {
      recovery = recordHelperCrash(recovery, nowMs, options)
      return recovery
    },
    recordStarted() {
      recovery = recordHelperStarted(recovery)
      return recovery
    },
    canRestart(nowMs: number) {
      return canRestartHelper(recovery, nowMs)
    },
    recoveryState(): HelperCrashRecoveryState {
      return { ...recovery }
    },
  }
}
