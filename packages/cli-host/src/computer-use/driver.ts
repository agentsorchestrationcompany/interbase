import type { ComputerUsePolicyConfig } from "@interbase/computer-use-policy"
import {
  PROTOCOL_MAJOR,
  assertTrustedDriver,
  permissionStateFromMissing,
  type DriverStatus,
  type ActionRequest,
  type ActionResult,
  type ObserveRequest,
  type Observation,
  validateActionRequest,
  validateObservation,
  validateObserveRequest,
} from "@interbase/computer-use-protocol"
import { observeMockComputer } from "@/computer-use/mock-host"

export type ComputerUseDriver = {
  status(): DriverStatus | Promise<DriverStatus>
  observe(request: ObserveRequest, config: ComputerUsePolicyConfig | undefined): Observation | Promise<Observation>
  act(request: ActionRequest): ActionResult | Promise<ActionResult>
  readArtifact?(id: string): Uint8Array | Promise<Uint8Array>
}

export type MockDriverOptions = {
  available?: boolean
  crashed?: boolean
  protocolMajor?: number
  trusted?: boolean
  missingPermissions?: DriverStatus["missingPermissions"]
  observation?: Observation
}

export function createMockDriver(options: MockDriverOptions = {}): ComputerUseDriver {
  const status: DriverStatus = {
    available: options.available ?? true,
    crashed: options.crashed ?? false,
    health: {
      protocolMajor: options.protocolMajor ?? PROTOCOL_MAJOR,
      driver: "mock",
      version: "0.1.0",
      capabilities: ["status", "observe", "act"],
    },
    authenticity: options.trusted === false ? { trusted: false, reason: "signature_invalid" } : { trusted: true, reason: "mock_driver" },
    permissionState: permissionStateFromMissing(options.missingPermissions ?? []),
    missingPermissions: options.missingPermissions ?? [],
  }

  return {
    status: () => status,
    observe: async (request, config) => {
      assertTrustedDriver(status)
      validateObserveRequest(request)
      if (options.observation) return validateObservation(options.observation)
      return validateObservation(observeMockComputer(request, config))
    },
    act: async (request) => {
      assertTrustedDriver(status)
      validateActionRequest(request)
      return {
        id: request.id,
        status: "performed",
        app: request.app,
        windowId: request.windowId,
        warnings: ["mock action; no native OS event was emitted"],
      }
    },
  }
}
