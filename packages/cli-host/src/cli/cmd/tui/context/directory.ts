import { createMemo } from "solid-js"
import { useProject } from "./project"
import { useSync } from "./sync"
import { interbaseRuntimeContext } from "@/interbase-runtime-context"

export function useDirectory() {
  const project = useProject()
  const sync = useSync()
  return createMemo(() => {
    const directory = project.instance.path().directory || process.cwd()
    const result = directory.replace(interbaseRuntimeContext.paths.home, "~")
    if (sync.data.vcs?.branch) return result + ":" + sync.data.vcs.branch
    return result
  })
}
