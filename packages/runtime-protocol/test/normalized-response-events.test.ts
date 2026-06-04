import assert from "node:assert/strict"
import test from "node:test"
import {
  applyNormalizedResponseTransition,
  isNormalizedResponseEvent,
  normalizedResponseEventSchemaVersion,
  normalizedResponseEventTypeValues,
  providerCapabilityKeyValues,
  shouldIgnoreUnknownNormalizedResponseEvent,
  validateNormalizedResponseTransition,
  type NormalizedResponseEvent,
  type NormalizedResponseEventEnvelope,
  type NormalizedResponseLifecycleState,
} from "../src/index.js"

function envelope(
  eventType: NormalizedResponseEvent["eventType"],
  overrides: Partial<NormalizedResponseEventEnvelope> = {},
): NormalizedResponseEventEnvelope {
  return {
    attempt: 1,
    causationId: null,
    correlationId: "corr_1",
    dedupeKey: `dedupe:${eventType}:${overrides.itemId ?? "none"}:${overrides.responseId ?? "none"}`,
    eventId: `evt_${eventType.replaceAll(".", "_")}`,
    eventType,
    itemId: null,
    model: "gpt-5.4",
    originResponseId: null,
    providerId: "codex",
    providerMetadataRef: null,
    responseId: null,
    runId: "run_1",
    schemaVersion: normalizedResponseEventSchemaVersion,
    sequence: 1,
    sessionId: "ses_1",
    timestamp: "2026-04-24T00:00:00.000Z",
    ...overrides,
  }
}

function typedEnvelope<TEventType extends NormalizedResponseEvent["eventType"]>(
  eventType: TEventType,
  overrides: Partial<NormalizedResponseEventEnvelope> = {},
): NormalizedResponseEventEnvelope & { eventType: TEventType } {
  return envelope(eventType, overrides) as NormalizedResponseEventEnvelope & { eventType: TEventType }
}

function eventForType(eventType: NormalizedResponseEvent["eventType"]): NormalizedResponseEvent {
  switch (eventType) {
    case "run.started":
      return {
        ...typedEnvelope(eventType),
        payload: {
          capabilitySnapshot: {},
          inputSummaryRef: null,
          runKind: "interactive_foreground",
          supersedesRunId: null,
        },
      }
    case "response.started":
      return {
        ...typedEnvelope(eventType, { responseId: "resp_1" }),
        payload: {
          providerRequestRef: null,
          responseMode: "streaming",
          resumedFromResponseId: null,
        },
      }
    case "response.output_text.delta":
      return {
        ...typedEnvelope(eventType, { itemId: "txt_1", responseId: "resp_1" }),
        payload: {
          contentType: "text/markdown",
          deltaIndex: 0,
          presentation: "durable_candidate",
          text: "hello",
        },
      }
    case "response.output_text.completed":
      return {
        ...typedEnvelope(eventType, { itemId: "txt_1", responseId: "resp_1" }),
        payload: {
          contentType: "text/markdown",
          text: "hello",
        },
      }
    case "response.reasoning.delta":
      return {
        ...typedEnvelope(eventType, { itemId: "rsn_1", responseId: "resp_1" }),
        payload: { deltaIndex: 0, text: "thinking" },
      }
    case "response.reasoning.completed":
      return {
        ...typedEnvelope(eventType, { itemId: "rsn_1", responseId: "resp_1" }),
        payload: { text: "thinking" },
      }
    case "response.output_structured.completed":
      return {
        ...typedEnvelope(eventType, { itemId: "json_1", responseId: "resp_1" }),
        payload: { contentType: "application/json", output: { ok: true } },
      }
    case "tool.requested":
      return {
        ...typedEnvelope(eventType, { itemId: "tool_1", originResponseId: "resp_1" }),
        payload: { inputRef: null, server: "filesystem", tool: "read_file", toolKind: "mcp_tool_call" },
      }
    case "tool.updated":
      return {
        ...typedEnvelope(eventType, { itemId: "tool_1", originResponseId: "resp_1" }),
        payload: { detail: "reading", outputRef: null },
      }
    case "tool.completed":
    case "tool.failed":
    case "tool.cancelled":
      return {
        ...typedEnvelope(eventType, { itemId: "tool_1", originResponseId: "resp_1" }),
        payload: { failure: null, outputRef: null },
      }
    case "provider.session.updated":
      return {
        ...typedEnvelope(eventType),
        payload: { continuationId: "thr_1", continuationKind: "conversation", reason: "thread started" },
      }
    case "provider.usage.reported":
      return {
        ...typedEnvelope(eventType),
        payload: { usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } },
      }
    case "provider.metadata.attached":
      return {
        ...typedEnvelope(eventType),
        payload: { classification: "public", metadataRef: "meta_1" },
      }
    case "response.completed":
      return {
        ...typedEnvelope(eventType, { responseId: "resp_1" }),
        payload: { finishReason: "stop" },
      }
    case "response.failed":
      return {
        ...typedEnvelope(eventType, { responseId: "resp_1" }),
        payload: {
          failure: {
            class: "transport",
            message: "Provider transport failed.",
            recoverable: true,
            retryable: true,
          },
        },
      }
    case "response.cancelled":
      return {
        ...typedEnvelope(eventType, { responseId: "resp_1" }),
        payload: { reason: "user_cancelled" },
      }
    case "run.completed":
      return {
        ...typedEnvelope(eventType),
        payload: { durableMessageIds: ["msg_1"] },
      }
    case "run.failed":
      return {
        ...typedEnvelope(eventType),
        payload: {
          failure: {
            class: "provider_internal",
            message: "Provider failed.",
            recoverable: true,
            retryable: false,
          },
        },
      }
    case "run.cancelled":
      return {
        ...typedEnvelope(eventType),
        payload: { reason: "superseded_by_new_run" },
      }
  }
}

function applyChecked(state: NormalizedResponseLifecycleState, event: NormalizedResponseEvent) {
  const result = validateNormalizedResponseTransition(state, event)
  assert.deepEqual(result, { ok: true })
  return applyNormalizedResponseTransition(state, event)
}

test("normalized response protocol serializes every public event kind", () => {
  assert.equal(normalizedResponseEventTypeValues.length, 21)

  for (const eventType of normalizedResponseEventTypeValues) {
    const event = eventForType(eventType)
    const serialized = JSON.parse(JSON.stringify(event))
    assert.equal(serialized.eventType, eventType)
    assert.equal(serialized.schemaVersion, 1)
    assert.equal(isNormalizedResponseEvent(serialized), true)
  }
})

test("normalized response protocol tolerates unknown optional fields and ignores unknown events", () => {
  const event = {
    ...eventForType("run.started"),
    futureField: "ignored",
  }

  assert.equal(isNormalizedResponseEvent(event), true)
  assert.equal(shouldIgnoreUnknownNormalizedResponseEvent(event), false)
  assert.equal(
    shouldIgnoreUnknownNormalizedResponseEvent({
      eventType: "response.future",
      schemaVersion: 1,
    }),
    true,
  )
})

test("normalized response capability keys are explicit and streaming remains transport detail", () => {
  assert.equal(providerCapabilityKeyValues.includes("conversation.responseEvents"), true)
  assert.equal(providerCapabilityKeyValues.includes("conversation.nonStreamingText"), true)
  assert.equal(providerCapabilityKeyValues.includes("conversation.streamingText"), true)
  assert.equal(providerCapabilityKeyValues.includes("conversation.toolCallEvents"), true)
  assert.equal(providerCapabilityKeyValues.includes("conversation.reasoningEvents"), true)
  assert.equal(providerCapabilityKeyValues.includes("conversation.usageEvents"), true)
  assert.equal(providerCapabilityKeyValues.includes("conversation.structuredOutput"), true)
  assert.equal(providerCapabilityKeyValues.includes("conversation.sessionContinuation"), true)
})

test("normalized response state machine accepts valid text and run lifecycle", () => {
  let state: NormalizedResponseLifecycleState = {}
  state = applyChecked(state, eventForType("run.started"))
  state = applyChecked(state, eventForType("response.started"))
  state = applyChecked(state, eventForType("response.output_text.delta"))
  state = applyChecked(state, eventForType("response.output_text.completed"))
  state = applyChecked(state, eventForType("response.completed"))
  state = applyChecked(state, eventForType("run.completed"))

  assert.equal(state.run, "completed")
  assert.equal(state.responses?.resp_1, "completed")
  assert.equal(state.textItems?.txt_1, "completed")
})

test("normalized response state machine rejects invalid transitions", () => {
  let state: NormalizedResponseLifecycleState = {}
  const delta = eventForType("response.output_text.delta")
  assert.deepEqual(validateNormalizedResponseTransition(state, delta), {
    message: "Text delta requires a started response.",
    ok: false,
  })

  state = applyChecked(state, eventForType("run.started"))
  state = applyChecked(state, eventForType("response.started"))
  state = applyChecked(state, eventForType("response.output_text.completed"))
  assert.deepEqual(validateNormalizedResponseTransition(state, delta), {
    message: "Text item txt_1 is terminal.",
    ok: false,
  })

  state = applyChecked(state, eventForType("response.completed"))
  assert.deepEqual(validateNormalizedResponseTransition(state, eventForType("response.reasoning.delta")), {
    message: "Reasoning delta requires a started response.",
    ok: false,
  })
})

test("normalized response state machine enforces tool terminal lifecycle", () => {
  let state: NormalizedResponseLifecycleState = {}
  state = applyChecked(state, eventForType("run.started"))
  assert.deepEqual(validateNormalizedResponseTransition(state, eventForType("tool.updated")), {
    message: "Tool update requires a requested tool item.",
    ok: false,
  })

  state = applyChecked(state, eventForType("tool.requested"))
  state = applyChecked(state, eventForType("tool.updated"))
  state = applyChecked(state, eventForType("tool.completed"))

  assert.deepEqual(validateNormalizedResponseTransition(state, eventForType("tool.updated")), {
    message: "Tool update requires a requested tool item.",
    ok: false,
  })
})
