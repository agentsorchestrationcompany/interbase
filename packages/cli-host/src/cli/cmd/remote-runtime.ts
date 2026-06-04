import {
  createLocalDirectRemoteRuntimeAdapter,
  createRemoteRuntimeAdapterRegistry,
} from "@interbase/remote-runtime-adapters"
import { currentRemoteRuntimeAcceptedVersions } from "@interbase/remote-runtime-contracts"
import {
  composeRemoteRuntimeHost,
  defaultRemoteRuntimeFeatureConfig,
  type RemoteRuntimeHostComposition,
} from "@interbase/remote-runtime-host"
import { activeFeatureCommandTree } from "@/feature/assembly"
import type { CliCommandModule } from "@/cli/command-registry"
import { cmd } from "./cmd"

export type RemoteRuntimeStatusPayload = {
  readonly enabled: boolean
  readonly mode: "disabled" | "localDirect" | "custom"
  readonly adapterId: string | null
  readonly entitlementProviderId: string
}

export function createPublicRemoteRuntimeHostComposition(): RemoteRuntimeHostComposition {
  return composeRemoteRuntimeHost({
    config: defaultRemoteRuntimeFeatureConfig(),
    adapters: createRemoteRuntimeAdapterRegistry([
      createLocalDirectRemoteRuntimeAdapter({
        baseHttpUrl: "http://127.0.0.1:0",
        acceptedContractVersions: currentRemoteRuntimeAcceptedVersions(),
        runtimeInstallationId: "local-direct-runtime",
      }),
    ]),
  })
}

export function remoteRuntimeStatusPayload(
  composition = createPublicRemoteRuntimeHostComposition(),
): RemoteRuntimeStatusPayload {
  return {
    enabled: composition.selection.enabled,
    mode: composition.selection.mode,
    adapterId: composition.selection.adapterId ?? null,
    entitlementProviderId: composition.selection.entitlementProviderId,
  }
}

export function createRemoteRuntimeCommand(commandTree?: readonly CliCommandModule[]) {
  const commands = commandTree ?? activeFeatureCommandTree("remote")
  return cmd({
    command: "remote",
    aliases: "mobile",
    describe: "Manage remote runtime connectivity",
    builder: (yargs) => {
      let next = yargs.command(
        "status",
        "Show remote runtime capability status",
        (command) => command,
        () => {
          console.log(JSON.stringify(remoteRuntimeStatusPayload(), null, 2))
        },
      )
      for (const command of commands) {
        next = next.command(command as never)
      }
      return next.demandCommand(1).strict()
    },
    handler() {
      return
    },
  })
}

export const RemoteRuntimeCommand = createRemoteRuntimeCommand()
