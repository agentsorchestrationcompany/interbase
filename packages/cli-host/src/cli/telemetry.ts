import {
  CliTelemetryEntrypoint,
  CliTelemetryEvent,
  type CliTelemetryEventPropertiesInput,
  emitCliTelemetryEvent,
} from "@interbase/cli-telemetry"
import * as Log from "@interbase/core/util/log"
import { interbaseRuntimeContext } from "@/interbase-runtime-context"
import { errorMessage } from "@/util/error"
import { GlobalBus } from "@/bus/global"

let busHooksInstalled = false
let telemetryFlushHookInstalled = false
let telemetryExitFlushStarted = false
const pendingTelemetryEvents = new Set<Promise<boolean>>()

function trackPendingTelemetryEvent(promise: Promise<boolean>, event: CliTelemetryEvent) {
  pendingTelemetryEvents.add(promise)
  promise
    .catch((error) => {
      Log.Default.debug("analytics.cli.event_skipped", { error: errorMessage(error), event })
      return false
    })
    .finally(() => {
      pendingTelemetryEvents.delete(promise)
    })
}

export async function flushPendingCliTelemetryEvents() {
  const pending = [...pendingTelemetryEvents]
  if (pending.length === 0) return
  await Promise.allSettled(pending)
}

export function installCliTelemetryFlushHook() {
  if (telemetryFlushHookInstalled) return
  telemetryFlushHookInstalled = true
  process.on("beforeExit", async () => {
    if (telemetryExitFlushStarted) return
    telemetryExitFlushStarted = true
    await flushPendingCliTelemetryEvents()
  })
}

export function emitCliBehaviorTelemetry(
  event: CliTelemetryEvent,
  entrypoint: CliTelemetryEntrypoint = CliTelemetryEntrypoint.Command,
  properties?: CliTelemetryEventPropertiesInput,
) {
  trackPendingTelemetryEvent(emitCliTelemetryEvent({
    accessPolicy: interbaseRuntimeContext.accessPolicy,
    apiBaseUrl: process.env.INTERBASE_API_URL?.trim() || "https://api.interbase.ai",
    entrypoint,
    environment: {
      DO_NOT_TRACK: process.env.DO_NOT_TRACK,
      INTERBASE_TELEMETRY_DISABLED: process.env.INTERBASE_TELEMETRY_DISABLED,
    },
    event,
    paths: interbaseRuntimeContext.paths,
    properties,
  }), event)
}

export function installCliTelemetryBusHooks() {
  if (busHooksInstalled) return
  busHooksInstalled = true
  GlobalBus.on("event", (event) => {
    if (event.payload?.type === "session.error") emitCliBehaviorTelemetry(CliTelemetryEvent.SessionError)
  })
}
