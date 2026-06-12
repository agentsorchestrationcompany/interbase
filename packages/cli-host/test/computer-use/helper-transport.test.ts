import { describe, expect, test } from "bun:test"
import { PROTOCOL_MAJOR, encodeEnvelope } from "@interbase/computer-use-protocol"
import { createHelperTransport } from "@/computer-use/helper-transport"

describe("computer-use helper transport", () => {
  test("sends request envelopes and matches responses", () => {
    const transport = createHelperTransport()
    expect(transport.send("req_1", "status", {}, 10)).toContain('"method":"status"')
    expect(transport.pendingIds()).toEqual(["req_1"])
    const line = encodeEnvelope({ id: "req_1", method: "response", protocolMajor: PROTOCOL_MAJOR, payload: { id: "req_1", result: { ok: true } } })
    expect(transport.receive(line)).toEqual({ matched: true, response: { id: "req_1", result: { ok: true } } })
    expect(transport.pendingIds()).toEqual([])
  })

  test("returns unmatched responses for unknown request ids", () => {
    const transport = createHelperTransport()
    const line = encodeEnvelope({ id: "missing", method: "response", protocolMajor: PROTOCOL_MAJOR, payload: { id: "missing", result: true } })
    expect(transport.receive(line)).toEqual({ matched: false, response: { id: "missing", result: true } })
  })

  test("counts malformed frames and disallows helper events", () => {
    const transport = createHelperTransport()
    expect(() => transport.receive("not-json\n")).toThrow("valid JSON")
    expect(transport.protocolErrors()).toBe(1)
    expect(() =>
      transport.receive(encodeEnvelope({ id: "evt_1", method: "status", protocolMajor: PROTOCOL_MAJOR, payload: { id: "evt_1", result: true } })),
    ).toThrow("events are not allowed")
    expect(transport.protocolErrors()).toBe(2)
    expect(() =>
      transport.receive(encodeEnvelope({ id: "bad", method: "response", protocolMajor: PROTOCOL_MAJOR, payload: { id: "bad" } })),
    ).toThrow("requires result or error")
    expect(transport.protocolErrors()).toBe(2)
  })

  test("times out and cancels pending requests", () => {
    const transport = createHelperTransport()
    transport.send("req_1", "act", {})
    expect(transport.timeout("missing")).toBe(false)
    expect(transport.cancel("missing")).toBeUndefined()
    const cancel = transport.cancel("req_1")
    expect(cancel).toContain('"method":"cancel"')
    expect(transport.pendingIds()).toEqual(["req_1", "cancel:req_1"])
    expect(transport.timeout("req_1")).toBe(true)
    expect(transport.pendingIds()).toEqual(["cancel:req_1"])
  })

  test("tracks helper crash recovery metadata", () => {
    const transport = createHelperTransport()
    expect(transport.recoveryState()).toEqual({ crashes: 0, disabled: false })
    expect(transport.canRestart(0)).toBe(true)
    expect(transport.recordCrash(1_000, { maxCrashes: 1, baseBackoffMs: 100 })).toMatchObject({ crashes: 1, restartAfterMs: 1_100 })
    expect(transport.canRestart(1_099)).toBe(false)
    expect(transport.recordStarted().restartAfterMs).toBeUndefined()
    expect(transport.recordCrash(1_050, { maxCrashes: 1, baseBackoffMs: 100 })).toMatchObject({ disabled: true, reason: "crash_loop" })
    expect(transport.canRestart(10_000)).toBe(false)
  })
})
