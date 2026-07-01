import {
  ComputerUseProtocolError,
  assertTrustedDriver,
  validateActionRequest,
  validateArtifactReadRequest,
  validateArtifactReadResult,
  validateDriverHealth,
  validateObservation,
  validateObserveRequest,
  type ActionRequest,
  type ActionResult,
  type ArtifactReadResult,
  type DriverHealth,
  type DriverMethod,
  type DriverStatus,
  type Observation,
  type ObserveRequest,
} from "@interbase/computer-use-protocol"
import type { ComputerUsePolicyConfig } from "@interbase/computer-use-policy"
import { createHelperTransport, type HelperTransport } from "@/computer-use/helper-transport"

export type HelperRpcConnection = {
  request: (line: string) => string | Promise<string>
  close?: () => void | Promise<void>
}

export type HelperRpcClient = ReturnType<typeof createHelperRpcClient>

export function createHelperRpcClient(input: {
  connection: HelperRpcConnection
  transport?: HelperTransport
  nextId?: () => string
  deadlineMs?: number
}) {
  const transport = input.transport ?? createHelperTransport()
  const nextId = input.nextId ?? defaultId

  return {
    async health() {
      return request(input.connection, transport, nextId(), "health", {}, input.deadlineMs, validateDriverHealth)
    },
    async status() {
      return request(input.connection, transport, nextId(), "status", {}, input.deadlineMs, validateStatus)
    },
    async observe(observeRequest: ObserveRequest, config: ComputerUsePolicyConfig | undefined): Promise<Observation> {
      validateObserveRequest(observeRequest)
      return request(input.connection, transport, nextId(), "observe", { request: observeRequest, config }, input.deadlineMs, validateObservation)
    },
    async act(actionRequest: ActionRequest): Promise<ActionResult> {
      validateActionRequest(actionRequest)
      return request(input.connection, transport, nextId(), "act", actionRequest, input.deadlineMs, validateActionResult)
    },
    async artifact(id: string): Promise<Uint8Array> {
      const artifactRequest = validateArtifactReadRequest({ id })
      const result = await request<ArtifactReadResult>(input.connection, transport, nextId(), "artifact", artifactRequest, input.deadlineMs, validateArtifactReadResult)
      return Uint8Array.from(Buffer.from(result.dataBase64, "base64"))
    },
    async cancel(id: string) {
      if (!id) throw new ComputerUseProtocolError("invalid_request", "Cancel requires request id")
      return request(input.connection, transport, nextId(), "cancel", { id }, input.deadlineMs, validateBooleanResult)
    },
    async shutdown() {
      return request(input.connection, transport, nextId(), "shutdown", {}, input.deadlineMs, validateBooleanResult)
    },
    close: () => input.connection.close?.(),
  }
}

async function request<T>(connection: HelperRpcConnection, transport: HelperTransport, id: string, method: DriverMethod, params: unknown, deadlineMs: number | undefined, validate: (value: T) => T): Promise<T> {
  const outgoing = transport.send(id, method, params, deadlineMs)
  const incoming = await connection.request(outgoing)
  const received = transport.receive(incoming)
  if (!received.matched) throw new ComputerUseProtocolError("unmatched_response", "Helper response id did not match an active request")
  if (received.response.error) throw new ComputerUseProtocolError(received.response.error.code, received.response.error.message)
  return validate(received.response.result as T)
}

function validateStatus(status: DriverStatus) {
  if (typeof status.available !== "boolean" || typeof status.crashed !== "boolean") {
    throw new ComputerUseProtocolError("invalid_status", "Driver status requires availability and crash flags")
  }
  if (!status.permissionState || !["granted", "missing", "unknown"].includes(status.permissionState.accessibility) || !["granted", "missing", "unknown"].includes(status.permissionState.screenRecording)) {
    throw new ComputerUseProtocolError("invalid_status", "Driver status requires typed OS permission state")
  }
  if (!Array.isArray(status.missingPermissions)) throw new ComputerUseProtocolError("invalid_status", "Driver status requires missingPermissions array")
  if (status.health) validateDriverHealth(status.health)
  if (status.available && !status.crashed && status.authenticity.trusted && status.health) assertTrustedDriver(status)
  return status
}

function validateActionResult(result: ActionResult) {
  if (!result.id || (result.status !== "performed" && result.status !== "denied") || !result.app?.name || !Array.isArray(result.warnings)) {
    throw new ComputerUseProtocolError("invalid_action_result", "Action result is missing required fields")
  }
  return result
}

function validateBooleanResult(result: boolean) {
  if (typeof result !== "boolean") throw new ComputerUseProtocolError("invalid_response", "Helper control response must be boolean")
  return result
}

function defaultId() {
  return `helper_${Date.now().toString(36)}`
}
