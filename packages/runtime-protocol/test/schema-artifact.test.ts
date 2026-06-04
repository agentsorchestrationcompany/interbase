import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import {
  runtimeErrorCodeValues,
  runtimeWebSocketClientMethodValues,
  runtimeWebSocketEventTypeValues,
  runtimeProviderInfoFields,
  runtimeProviderListResponseFields,
  runtimeProviderModelInfoFields,
  runtimeWebSocketProviderModelCommandTypeValues,
  runtimeWebSocketResponsePayloadKindValues,
  runtimeWebSocketResponseSchemas,
  runtimeWebSocketMetadataResponseShapes,
  runtimeWebSocketProtocolVersion,
  runtimeWebSocketServerMessageTypeValues,
  supportedRuntimeWebSocketProtocolVersions,
} from "../src/index.js"

test("runtime websocket schema artifact matches the TypeScript authority", async () => {
  const artifact = JSON.parse(
    await readFile(new URL("../schema/runtime-websocket.schema.json", import.meta.url), "utf8"),
  )

  assert.deepEqual(artifact, {
    clientMethods: [...runtimeWebSocketClientMethodValues],
    contractFields: {
      runtimeThreadEventEnvelope: ["attachmentId", "event", "sequence", "threadRef", "timestamp"],
      runtimeThreadRef: ["providerId", "threadId"],
      runtimeProviderInfo: ["id", "models", "name"],
      runtimeProviderListResponse: ["all", "connected", "default"],
      runtimeProviderModelInfo: ["id", "name", "status"],
      runtimeWebSocketAgentAvailability: [
        "agentId",
        "available",
        "capabilities",
        "displayName",
        "models",
        "unavailableReason",
      ],
      runtimeWebSocketAgentCapabilitySet: [
        "approvals",
        "attachments",
        "conversationHistoryReadable",
        "images",
        "modelSelection",
        "nativeExecution",
        "resume",
        "sessionContinuation",
        "streaming",
        "toolUse",
      ],
      runtimeWebSocketAgentListResponse: ["agents"],
      runtimeWebSocketAgentModelOption: [
        "available",
        "displayName",
        "id",
        "providerId",
        "providerName",
        "unavailableReason",
      ],
      runtimeWebSocketProviderThreadResumePayload: ["afterSequence", "clientId", "threadRef"],
      runtimeWebSocketProviderThreadSubscriptionPayload: ["afterSequence", "threadRef"],
      runtimeWebSocketReplayUnavailablePayload: ["afterSequence", "reason", "recoverable", "subscription"],
    },
    errorCodes: [...runtimeErrorCodeValues],
    eventTypes: [...runtimeWebSocketEventTypeValues],
    protocolVersion: runtimeWebSocketProtocolVersion,
    supportedProtocolVersions: [...supportedRuntimeWebSocketProtocolVersions],
    runtimeProviderInfoFields: [...runtimeProviderInfoFields],
    runtimeProviderListResponseFields: [...runtimeProviderListResponseFields],
    runtimeProviderModelInfoFields: [...runtimeProviderModelInfoFields],
    providerModelCommandTypes: [...runtimeWebSocketProviderModelCommandTypeValues],
    metadataResponseShapes: runtimeWebSocketMetadataResponseShapes,
    responsePayloadKinds: [...runtimeWebSocketResponsePayloadKindValues],
    responseSchemas: runtimeWebSocketResponseSchemas,
    serverMessageTypes: [...runtimeWebSocketServerMessageTypeValues],
    replaySubscriptionTarget: "providerThreadRef",
    subscriptionTargets: ["sessionCompatibility", "providerThreadRef"],
  })
})

test("runtime websocket schema artifact is published", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"))

  assert.equal(packageJson.files.includes("schema"), true)
  assert.equal(packageJson.exports["./schema/runtime-websocket.schema.json"], "./schema/runtime-websocket.schema.json")
})
