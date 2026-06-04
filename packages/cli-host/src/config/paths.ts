export * as ConfigPaths from "./paths"

import path from "path"
import { Flag } from "@interbase/core/flag/flag"
import { unique } from "remeda"
import * as Effect from "effect/Effect"
import { AppFileSystem } from "@interbase/core/filesystem"
import { currentInterbaseRuntimeContext } from "@/interbase-runtime-context"

export const files = Effect.fn("ConfigPaths.projectFiles")(function* (
  name: string,
  directory: string,
  worktree?: string,
) {
  const afs = yield* AppFileSystem.Service
  return (yield* afs.up({
    targets: [`${name}.jsonc`, `${name}.json`],
    start: directory,
    stop: worktree,
  })).toReversed()
})

export const directories = Effect.fn("ConfigPaths.directories")(function* (directory: string, worktree?: string) {
  const afs = yield* AppFileSystem.Service
  const runtimeContext = currentInterbaseRuntimeContext()
  return unique([
    runtimeContext.paths.config,
    ...(!Flag.INTERBASE_DISABLE_PROJECT_CONFIG
      ? yield* afs.up({
          targets: [".interbase"],
          start: directory,
          stop: worktree,
        })
      : []),
    ...(yield* afs.up({
      targets: [".interbase"],
      start: runtimeContext.paths.home,
      stop: runtimeContext.paths.home,
    })),
  ])
})

export function fileInDirectory(dir: string, name: string) {
  return [path.join(dir, `${name}.json`), path.join(dir, `${name}.jsonc`)]
}
