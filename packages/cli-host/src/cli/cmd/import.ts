import type { Session as SDKSession, Message, Part } from "@interbase/sdk/v2"
import { Session } from "@/session/session"
import { MessageV2 } from "../../session/message-v2"
import { effectCmd } from "../effect-cmd"
import { Database } from "@/storage/db"
import { SessionTable, MessageTable, PartTable } from "../../session/session.sql"
import { InstanceRef } from "@/effect/instance-ref"
import { EOL } from "os"
import { Filesystem } from "@/util/filesystem"
import { Effect, Schema } from "effect"
import { CliTelemetryEvent } from "@interbase/cli-telemetry"
import { emitCliBehaviorTelemetry } from "@/cli/telemetry"

const decodeMessageInfo = Schema.decodeUnknownSync(MessageV2.Info)
const decodePart = Schema.decodeUnknownSync(MessageV2.Part)

/** Discriminated union returned by the legacy session export API payload. */
export type ShareData =
  | { type: "session"; data: SDKSession }
  | { type: "message"; data: Message }
  | { type: "part"; data: Part }
  | { type: "session_diff"; data: unknown }
  | { type: "model"; data: unknown }

export function transformShareData(shareData: ShareData[]): {
  info: SDKSession
  messages: Array<{ info: Message; parts: Part[] }>
} | null {
  const sessionItem = shareData.find((d) => d.type === "session")
  if (!sessionItem) return null

  const messageMap = new Map<string, Message>()
  const partMap = new Map<string, Part[]>()

  for (const item of shareData) {
    if (item.type === "message") {
      messageMap.set(item.data.id, item.data)
    } else if (item.type === "part") {
      if (!partMap.has(item.data.messageID)) {
        partMap.set(item.data.messageID, [])
      }
      partMap.get(item.data.messageID)!.push(item.data)
    }
  }

  if (messageMap.size === 0) return null

  return {
    info: sessionItem.data,
    messages: Array.from(messageMap.values()).map((msg) => ({
      info: msg,
      parts: partMap.get(msg.id) ?? [],
    })),
  }
}

type ExportData = { info: SDKSession; messages: Array<{ info: Message; parts: Part[] }> }

export const ImportCommand = effectCmd({
  command: "import <file>",
  describe: "import session data from a JSON file",
  builder: (yargs) =>
    yargs.positional("file", {
      describe: "path to a JSON export file",
      type: "string",
      demandOption: true,
    }),
  handler: Effect.fn("Cli.import")(function* (args) {
    const ctx = yield* InstanceRef
    if (!ctx) return yield* Effect.die("InstanceRef not provided")
    return yield* runImport(args.file, ctx.project.id)
  }),
})

const runImport = Effect.fn("Cli.import.body")(function* (file: string, projectID: string) {
  let exportData: ExportData | undefined

  if (file.startsWith("http://") || file.startsWith("https://")) {
    process.stdout.write("Importing from share URLs is no longer supported")
    process.stdout.write(EOL)
    return
  }

  exportData = yield* Effect.promise(() =>
    Filesystem.readJson<NonNullable<typeof exportData>>(file).catch(() => undefined),
  )
  if (!exportData) {
    process.stdout.write(`File not found: ${file}`)
    process.stdout.write(EOL)
    return
  }

  if (!exportData) {
    process.stdout.write(`Failed to read session data`)
    process.stdout.write(EOL)
    return
  }

  const info = Schema.decodeUnknownSync(Session.Info)({
    ...exportData.info,
    projectID,
  }) as Session.Info
  const row = Session.toRow(info)
  Database.use((db) =>
    db
      .insert(SessionTable)
      .values(row)
      .onConflictDoUpdate({ target: SessionTable.id, set: { project_id: row.project_id } })
      .run(),
  )

  for (const msg of exportData.messages) {
    const msgInfo = decodeMessageInfo(msg.info) as MessageV2.Info
    const { id, sessionID: _, ...msgData } = msgInfo
    Database.use((db) =>
      db
        .insert(MessageTable)
        .values({
          id,
          session_id: row.id,
          time_created: msgInfo.time?.created ?? Date.now(),
          data: msgData,
        })
        .onConflictDoNothing()
        .run(),
    )

    for (const part of msg.parts) {
      const partInfo = decodePart(part) as MessageV2.Part
      const { id: partId, sessionID: _s, messageID, ...partData } = partInfo
      Database.use((db) =>
        db
          .insert(PartTable)
          .values({
            id: partId,
            message_id: messageID,
            session_id: row.id,
            data: partData,
          })
          .onConflictDoNothing()
          .run(),
      )
    }
  }

  process.stdout.write(`Imported session: ${exportData.info.id}`)
  process.stdout.write(EOL)
  emitCliBehaviorTelemetry(CliTelemetryEvent.SessionImported)
})
