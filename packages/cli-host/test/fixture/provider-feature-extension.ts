import { createProviderRemoteRuntimeFeatureBundle } from "../../src/feature/provider-remote-runtime"

export const extensionInvocation = {
  called: false,
}

export const CLI_EXTENSION_FEATURE_BUNDLES = [
  createProviderRemoteRuntimeFeatureBundle({
    remoteCommandTree: [
      {
        command: "setup",
        describe: "hosted setup",
        handler() {
          extensionInvocation.called = true
        },
      },
    ],
  }),
]
