import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR, encodeEnvelope, type DriverHealth, type DriverStatus, type IpcEnvelope, type Observation } from "@interbase/computer-use-protocol"
import { createHelperRpcClient, type HelperRpcConnection } from "@/computer-use/helper-rpc-client"
import { makeSanitizedMockObservation } from "@interbase/computer-use-testkit"

const health: DriverHealth = { protocolMajor: PROTOCOL_MAJOR, driver: "mock", version: "0.1.0", capabilities: ["status", "observe", "act"] }
const status: DriverStatus = {
  available: true,
  crashed: false,
  health,
  authenticity: { trusted: true, reason: "mock_driver" },
  permissionState: { accessibility: "granted", screenRecording: "granted" },
  missingPermissions: [],
}

function connection(handler: (envelope: IpcEnvelope) => { id?: string; result?: unknown; error?: { code: string; message: string } }): HelperRpcConnection {
  return {
    request: (line) => {
      const envelope = JSON.parse(line) as IpcEnvelope
      const response = handler(envelope)
      return encodeEnvelope({ id: response.id ?? envelope.id, method: "response", protocolMajor: PROTOCOL_MAJOR, payload: response.error ? { id: response.id ?? envelope.id, error: response.error } : { id: response.id ?? envelope.id, result: response.result } })
    },
  }
}

describe("computer-use helper RPC client", () => {
  test("calls helper endpoints through newline-framed transport", async () => {
    const calls: Array<{ id: string; method: string; params: unknown; deadlineMs?: number }> = []
    const client = createHelperRpcClient({
      nextId: (() => {
        let id = 0
        return () => `req_${++id}`
      })(),
      deadlineMs: 250,
      connection: connection((envelope) => {
        const payload = envelope.payload as { id: string; method: string; params: unknown; deadlineMs?: number }
        calls.push({ id: payload.id, method: payload.method, params: payload.params, deadlineMs: payload.deadlineMs })
        if (payload.method === "health") return { result: health }
        if (payload.method === "status") return { result: status }
        if (payload.method === "observe") return { result: makeSanitizedMockObservation({ enabled: true }) }
        if (payload.method === "act") return { result: { id: "act_1", status: "performed", app: { name: "Mock" }, warnings: [] } }
        if (payload.method === "artifact") return { result: { id: "artifact_1", mimeType: "image/png", dataBase64: "AQID" } }
        return { result: true }
      }),
    })
    expect(await client.health()).toEqual(health)
    expect(await client.status()).toEqual(status)
    expect(await client.observe({ includeScreenshot: false }, { enabled: true })).toMatchObject({ id: "obs_mock_001" })
    expect(await client.act({ id: "act_1", observationId: "obs_1", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).toEqual({
      id: "act_1",
      status: "performed",
      app: { name: "Mock" },
      warnings: [],
    })
    expect([...(await client.artifact("artifact_1"))]).toEqual([1, 2, 3])
    expect(await client.cancel("req_1")).toBe(true)
    expect(await client.shutdown()).toBe(true)
    expect(calls.map((call) => [call.id, call.method, call.deadlineMs])).toEqual([
      ["req_1", "health", 250],
      ["req_2", "status", 250],
      ["req_3", "observe", 250],
      ["req_4", "act", 250],
      ["req_5", "artifact", 250],
      ["req_6", "cancel", 250],
      ["req_7", "shutdown", 250],
    ])
    expect(calls[2]?.params).toEqual({ request: { includeScreenshot: false }, config: { enabled: true } })
  })

  test("uses generated ids and surfaces helper errors", async () => {
    const realNow = Date.now
    Date.now = () => 123456
    try {
      const ids: string[] = []
      const client = createHelperRpcClient({
        connection: connection((envelope) => {
          const payload = envelope.payload as { id: string }
          ids.push(payload.id)
          return { error: { code: "helper_failed", message: "helper failed" } }
        }),
      })
      await expect(client.health()).rejects.toThrow("helper failed")
      expect(ids).toEqual(["helper_2n9c"])
    } finally {
      Date.now = realNow
    }
  })

  test("rejects unmatched responses and invalid local requests", async () => {
    const unmatched = createHelperRpcClient({ connection: connection(() => ({ id: "other", result: health })) })
    await expect(unmatched.health()).rejects.toThrow("did not match")
    const client = createHelperRpcClient({ connection: connection(() => ({ result: true })) })
    await expect(client.observe({ target: { app: {} } }, { enabled: true })).rejects.toThrow("app requires")
    await expect(client.act({ id: "", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).rejects.toThrow("id")
    await expect(client.artifact("")).rejects.toThrow("Artifact read request")
    await expect(client.cancel("")).rejects.toThrow("Cancel requires")
  })

  test("validates malformed helper status output", async () => {
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { ...status, available: "yes" } })) }).status()).rejects.toThrow("availability")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { ...status, permissionState: { accessibility: "bad", screenRecording: "granted" } } })) }).status()).rejects.toThrow("permission")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { ...status, missingPermissions: undefined } })) }).status()).rejects.toThrow("missingPermissions")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { ...status, health: { ...health, protocolMajor: 999 } } })) }).status()).rejects.toThrow("not supported")
    expect(await createHelperRpcClient({ connection: connection(() => ({ result: { ...status, available: false } })) }).status()).toMatchObject({ available: false })
  })

  test("validates malformed helper observe, action, and control outputs", async () => {
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { ...makeSanitizedMockObservation({ enabled: true }), id: "" } })) }).observe({}, { enabled: true })).rejects.toThrow("Observation requires id")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { id: "", status: "performed", app: { name: "Mock" }, warnings: [] } })) }).act({ id: "act", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).rejects.toThrow("Action result")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { id: "act", status: "pending", app: { name: "Mock" }, warnings: [] } })) }).act({ id: "act", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).rejects.toThrow("Action result")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { id: "act", status: "performed", app: { name: "" }, warnings: [] } })) }).act({ id: "act", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).rejects.toThrow("Action result")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { id: "act", status: "performed", app: { name: "Mock" }, warnings: undefined } })) }).act({ id: "act", observationId: "obs", app: { name: "Mock" }, action: { type: "keyChord", keys: ["Tab"] } })).rejects.toThrow("Action result")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: { id: "artifact", mimeType: "image/png", dataBase64: "bad" } })) }).artifact("artifact")).rejects.toThrow("base64")
    await expect(createHelperRpcClient({ connection: connection(() => ({ result: "yes" })) }).shutdown()).rejects.toThrow("must be boolean")
  })

  test("closes the underlying connection when supported", async () => {
    let closed = false
    const client = createHelperRpcClient({
      connection: {
        request: () => response("req", true),
        close: () => {
          closed = true
        },
      },
    })
    await client.close()
    expect(closed).toBe(true)
  })
})

function response(id: string, result: unknown) {
  return encodeEnvelope({ id, method: "response", protocolMajor: PROTOCOL_MAJOR, payload: { id, result } })
}
