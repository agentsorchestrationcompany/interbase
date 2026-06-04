import { Effect } from "effect"
import { Server } from "../../server/server"
import { effectCmd } from "../effect-cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "@interbase/core/flag/flag"

export const ServeCommand = effectCmd({
  command: "serve",
  builder: (yargs) => withNetworkOptions(yargs),
  describe: false,
  // Server loads instances per-request via x-interbase-directory header — no
  // need for an ambient project InstanceContext at startup.
  instance: false,
  handler: Effect.fn("Cli.serve")(function* (args) {
    if (!Flag.INTERBASE_SERVER_PASSWORD) {
      console.log("Warning: INTERBASE_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = yield* Effect.promise(() => resolveNetworkOptions(args))
    const server = yield* Effect.promise(() => Server.listen(opts))
    console.log(`interbase server listening on http://${server.hostname}:${server.port}`)

    yield* Effect.never
  }),
})
