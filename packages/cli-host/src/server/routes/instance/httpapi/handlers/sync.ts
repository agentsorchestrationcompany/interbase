import { Database } from "@/storage/db"
import { SyncEvent } from "@/sync"
import { EventTable } from "@/sync/event.sql"
import { asc } from "drizzle-orm"
import { and } from "drizzle-orm"
import { eq } from "drizzle-orm"
import { lte } from "drizzle-orm"
import { not } from "drizzle-orm"
import { or } from "drizzle-orm"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"
import { HistoryPayload, ReplayPayload } from "../groups/sync"
import * as Log from "@interbase/core/util/log"

const log = Log.create({ service: "server.sync" })

export const syncHandlers = HttpApiBuilder.group(InstanceHttpApi, "sync", (handlers) =>
  Effect.gen(function* () {
    const sync = yield* SyncEvent.Service

    const replay = Effect.fn("SyncHttpApi.replay")(function* (ctx: { payload: typeof ReplayPayload.Type }) {
      const events: SyncEvent.SerializedEvent[] = ctx.payload.events.map((event) => ({
        id: event.id,
        aggregateID: event.aggregateID,
        seq: event.seq,
        type: event.type,
        data: { ...event.data },
      }))
      const source = events[0].aggregateID
      log.info("sync replay requested", {
        sessionID: source,
        events: events.length,
        first: events[0]?.seq,
        last: events.at(-1)?.seq,
        directory: ctx.payload.directory,
      })
      yield* sync.replayAll(events)
      log.info("sync replay complete", {
        sessionID: source,
        events: events.length,
        first: events[0]?.seq,
        last: events.at(-1)?.seq,
      })
      return { sessionID: source }
    })

    const history = Effect.fn("SyncHttpApi.history")(function* (ctx: { payload: typeof HistoryPayload.Type }) {
      const exclude = Object.entries(ctx.payload)
      return Database.use((db) =>
        db
          .select()
          .from(EventTable)
          .where(
            exclude.length > 0
              ? not(or(...exclude.map(([id, seq]) => and(eq(EventTable.aggregate_id, id), lte(EventTable.seq, seq))))!)
              : undefined,
          )
          .orderBy(asc(EventTable.seq))
          .all(),
      )
    })

    return handlers.handle("replay", replay).handle("history", history)
  }),
)
