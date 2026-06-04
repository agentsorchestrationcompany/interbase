import { cliRuntimeEnvFromProcessEnv, parseCliRuntimeEnvironment } from "@interbase/cli-runtime-context"

export const interbaseRuntimeContext = parseCliRuntimeEnvironment(cliRuntimeEnvFromProcessEnv(process.env))

export function currentInterbaseRuntimeContext() {
  return parseCliRuntimeEnvironment(cliRuntimeEnvFromProcessEnv(process.env))
}
