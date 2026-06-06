import {
  ComputerUseProtocolError,
  type ActionRequest,
  type ActionResult,
  type DriverStatus,
  type Observation,
  type ObserveRequest,
  validateActionRequest,
  validateObservation,
  validateObserveRequest,
} from "@interbase/computer-use-protocol"
import type { ComputerUsePolicyConfig } from "@interbase/computer-use-policy"
import { createHelperSupervisor, type HelperSupervisorHost } from "@/computer-use/helper-supervisor"
import type { ComputerUseDriver } from "@/computer-use/driver"

export type HelperDriverClient = {
  observe: (request: ObserveRequest, config: ComputerUsePolicyConfig | undefined) => Observation | Promise<Observation>
  act: (request: ActionRequest) => ActionResult | Promise<ActionResult>
  artifact?: (id: string) => Uint8Array | Promise<Uint8Array>
}

export function createHelperProcessDriver(input: {
  host: HelperSupervisorHost
  client: HelperDriverClient
  nowMs?: () => number
  cleanupAfterCrash?: (reason: string, atMs: number) => void
}): ComputerUseDriver {
  const nowMs = input.nowMs ?? Date.now
  const supervisor = createHelperSupervisor({
    ...input.host,
    cleanupStaleState: () => {
      input.host.cleanupStaleState?.()
      input.cleanupAfterCrash?.("helper_crashed", nowMs())
    },
  })
  return {
    status: () => input.host.status(),
    observe: async (request, config) => {
      validateObserveRequest(request)
      const required = request.includeScreenshot === false ? ["accessibility" as const] : ["accessibility" as const, "screenRecording" as const]
      const ready = await supervisor.ensureReady("observe", nowMs(), required)
      if (!ready.allowed) throw new ComputerUseProtocolError(ready.reason, `computer-use helper is not ready: ${ready.reason}`)
      return validateObservation(await input.client.observe(request, config))
    },
    act: async (request) => {
      validateActionRequest(request)
      const ready = await supervisor.ensureReady("act", nowMs(), ["accessibility"])
      if (!ready.allowed) throw new ComputerUseProtocolError(ready.reason, `computer-use helper action is not ready: ${ready.reason}`)
      return input.client.act(request)
    },
    readArtifact: input.client.artifact
      ? async (id) => {
          const ready = await supervisor.ensureReady("observe", nowMs(), ["screenRecording"])
          if (!ready.allowed) throw new ComputerUseProtocolError(ready.reason, `computer-use helper artifact read is not ready: ${ready.reason}`)
          return input.client.artifact!(id)
        }
      : undefined,
  }
}
