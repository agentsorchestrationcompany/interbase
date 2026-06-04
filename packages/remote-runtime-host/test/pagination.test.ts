import assert from "node:assert/strict"
import { test } from "bun:test"
import type {
  RemoteRuntimeActiveChatMetadataProjection,
  RemoteRuntimeChatMessageProjection,
} from "@interbase/remote-runtime-contracts"
import {
  createRemoteRuntimeActiveChatPage,
  createRemoteRuntimeChatMessagesPage,
  applyRemoteRuntimeMirroredStatus,
  applyRemoteRuntimeMirroredStatuses,
  applyRemoteRuntimeMirroredSessionEvent,
  decodeRemoteRuntimeActiveChatCursor,
  decodeRemoteRuntimeChatMessageCursor,
  encodeRemoteRuntimeActiveChatCursor,
  encodeRemoteRuntimeChatMessageCursor,
  remoteRuntimeActiveChatSummary,
  remoteRuntimeDirectoryDisplayName,
  remoteRuntimeMirroredSessionStatus,
  remoteRuntimeReattachDelayMs,
  redactRemoteRuntimeDiagnosticString,
} from "../src/index.js"

function chat(sessionId: string, updatedAt: string): RemoteRuntimeActiveChatMetadataProjection {
  return {
    agent: null,
    createdAt: "2026-05-14T00:00:00.000Z",
    messageCount: 1,
    model: null,
    path: null,
    projectId: "proj_1",
    providerId: null,
    providerName: null,
    sessionId,
    status: "idle",
    title: `Chat ${sessionId}`,
    updatedAt,
  }
}

function message(messageId: string): RemoteRuntimeChatMessageProjection {
  return {
    createdAt: "2026-05-14T00:00:00.000Z",
    agent: null,
    completedAt: null,
    errorMessage: null,
    errorName: null,
    finishReason: null,
    id: messageId,
    model: null,
    parentId: null,
    parts: [],
    role: "assistant",
    sessionId: "ses_1",
  }
}

test("active chat pagination encodes seen-session cursor authority", () => {
  const chats = [
    chat("ses_1", "2026-05-14T00:03:00.000Z"),
    chat("ses_2", "2026-05-14T00:02:00.000Z"),
    chat("ses_3", "2026-05-14T00:01:00.000Z"),
  ]
  const first = createRemoteRuntimeActiveChatPage(chats, { limit: 1 })
  const second = createRemoteRuntimeActiveChatPage(chats, { cursor: first.pageInfo.olderCursor, limit: 1 })
  const encoded = encodeRemoteRuntimeActiveChatCursor(chats[1], 4, ["seen_1"])
  const decoded = decodeRemoteRuntimeActiveChatCursor(encoded)
  const legacyDecoded = decodeRemoteRuntimeActiveChatCursor(
    Buffer.from(
      JSON.stringify({ sessionId: "ses_legacy", snapshotId: "snap_1", updatedAt: "2026-05-14T00:00:00.000Z" }),
    ).toString("base64url"),
  )

  assert.deepEqual(
    first.activeChats.map((item) => item.sessionId),
    ["ses_1"],
  )
  assert.deepEqual(first.pageInfo, {
    hasNewer: false,
    hasOlder: true,
    newerCursor: null,
    olderCursor: first.pageInfo.olderCursor,
  })
  assert.deepEqual(
    second.activeChats.map((item) => item.sessionId),
    ["ses_2"],
  )
  assert.equal(second.pageInfo.hasNewer, true)
  assert.equal(second.pageInfo.hasOlder, true)
  assert.deepEqual(decoded, {
    offset: 4,
    seenSessionIds: ["seen_1"],
    sessionId: "ses_2",
    updatedAt: "2026-05-14T00:02:00.000Z",
  })
  assert.deepEqual(legacyDecoded, {
    seenSessionIds: ["ses_legacy"],
    sessionId: "ses_legacy",
    snapshotId: "snap_1",
    updatedAt: "2026-05-14T00:00:00.000Z",
  })
  assert.throws(() => decodeRemoteRuntimeActiveChatCursor("not*base64"), /Active chat cursor is not valid/)
  assert.throws(
    () =>
      decodeRemoteRuntimeActiveChatCursor(Buffer.from(JSON.stringify({ sessionId: "ses_1" })).toString("base64url")),
    /Active chat cursor is not valid/,
  )
})

test("active chat mirrored status projection preserves identity unless status differs", () => {
  const active = chat("ses_1", "2026-05-14T00:03:00.000Z")
  const same = applyRemoteRuntimeMirroredStatus(active, "idle")
  const changed = applyRemoteRuntimeMirroredStatus(active, "running")
  const list = applyRemoteRuntimeMirroredStatuses(
    [active, chat("ses_2", "2026-05-14T00:02:00.000Z")],
    new Map([["ses_2", "error"]]),
  )

  assert.equal(same, active)
  assert.notEqual(changed, active)
  assert.equal(changed.status, "running")
  assert.deepEqual(
    list.map((item) => item.status),
    ["idle", "error"],
  )
  assert.equal(remoteRuntimeActiveChatSummary(null), "<none>")
  assert.equal(
    remoteRuntimeActiveChatSummary({ ...active, agent: null, messageCount: null }),
    "sessionId=ses_1 status=idle agent=<none> messageCount=0 title=Chat ses_1",
  )
  assert.equal(
    remoteRuntimeActiveChatSummary({ ...active, agent: "build", messageCount: 4 }),
    "sessionId=ses_1 status=idle agent=build messageCount=4 title=Chat ses_1",
  )
  assert.equal(remoteRuntimeDirectoryDisplayName("/Users/rk/project"), "project")
  assert.equal(remoteRuntimeDirectoryDisplayName("C:\\Users\\rk\\project"), "project")
  assert.equal(remoteRuntimeDirectoryDisplayName("/"), "/")
  assert.equal(redactRemoteRuntimeDiagnosticString("Bearer abc123"), "Bearer [REDACTED]")
  assert.equal(redactRemoteRuntimeDiagnosticString('{"privateKey":"secret"}'), '{"privateKey":"[REDACTED]"}')
  assert.equal(redactRemoteRuntimeDiagnosticString("signature: sig_1"), "signature: [REDACTED]")
  const privateKeyHeader = "-----BEGIN " + "PRIVATE KEY-----"
  assert.equal(
    redactRemoteRuntimeDiagnosticString(`${privateKeyHeader}\nsecret\n-----END PRIVATE KEY-----`),
    "[REDACTED_PRIVATE_KEY]",
  )
  assert.equal(
    remoteRuntimeReattachDelayMs(-1, () => -1),
    1000,
  )
  assert.equal(
    remoteRuntimeReattachDelayMs(2, () => 0.5),
    4400,
  )
  assert.equal(
    remoteRuntimeReattachDelayMs(10, () => 1),
    30000,
  )
})

test("mirrored session status events update projection status authority", () => {
  const statuses = new Map<string, "idle" | "running" | "error" | "closed" | "interrupted">()
  const busy = { properties: { sessionID: "ses_1", status: { type: "busy" } }, type: "session.status" } as const
  const retry = { properties: { sessionID: "ses_2", status: { type: "retry" } }, type: "session.status" } as const
  const idle = { properties: { sessionID: "ses_1", status: { type: "idle" } }, type: "session.status" } as const

  applyRemoteRuntimeMirroredSessionEvent(statuses, busy)
  applyRemoteRuntimeMirroredSessionEvent(statuses, retry)
  applyRemoteRuntimeMirroredSessionEvent(statuses, idle)
  applyRemoteRuntimeMirroredSessionEvent(statuses, { properties: { sessionID: "ses_2" }, type: "session.deleted" })

  assert.deepEqual(remoteRuntimeMirroredSessionStatus(busy), { sessionId: "ses_1", status: "running" })
  assert.deepEqual(
    remoteRuntimeMirroredSessionStatus({
      properties: { sessionID: "ses_3", status: { type: "paused" } },
      type: "session.status",
    }),
    null,
  )
  assert.deepEqual(
    remoteRuntimeMirroredSessionStatus({ properties: { sessionID: "ses_3" }, type: "session.status" }),
    null,
  )
  assert.deepEqual(remoteRuntimeMirroredSessionStatus({ properties: {}, type: "session.status" }), null)
  assert.deepEqual(remoteRuntimeMirroredSessionStatus({ properties: { sessionID: "ses_3" }, type: "other" }), null)
  assert.deepEqual([...statuses.entries()], [["ses_1", "idle"]])
})

test("chat message pagination walks backward with cursor authority", () => {
  const messages = [message("msg_1"), message("msg_2"), message("msg_3")]
  const first = createRemoteRuntimeChatMessagesPage("ses_1", messages, { limit: 2, sessionId: "ses_1" })
  const second = createRemoteRuntimeChatMessagesPage("ses_1", messages, {
    cursor: first.pageInfo.olderCursor,
    limit: 2,
    sessionId: "ses_1",
  })
  const encoded = encodeRemoteRuntimeChatMessageCursor({ endExclusive: 3, pageSize: 2, sessionId: "ses_1" })

  assert.deepEqual(
    first.messages.map((item) => item.id),
    ["msg_2", "msg_3"],
  )
  assert.deepEqual(first.pageInfo, {
    hasNewer: false,
    hasOlder: true,
    newerCursor: null,
    olderCursor: first.pageInfo.olderCursor,
  })
  assert.deepEqual(
    second.messages.map((item) => item.id),
    ["msg_1"],
  )
  assert.equal(second.pageInfo.hasNewer, true)
  assert.equal(second.pageInfo.hasOlder, false)
  assert.deepEqual(decodeRemoteRuntimeChatMessageCursor(encoded), { endExclusive: 3, pageSize: 2, sessionId: "ses_1" })
  assert.throws(
    () => createRemoteRuntimeChatMessagesPage("ses_other", messages, { cursor: encoded, sessionId: "ses_other" }),
    /does not match/,
  )
  assert.throws(() => decodeRemoteRuntimeChatMessageCursor("not*base64"), /Chat message cursor is not valid/)
  assert.throws(
    () =>
      decodeRemoteRuntimeChatMessageCursor(Buffer.from(JSON.stringify({ sessionId: "ses_1" })).toString("base64url")),
    /Chat message cursor is not valid/,
  )
})
