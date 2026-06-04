import type { MiddlewareHandler } from "hono"
import { WithInstance } from "@/project/with-instance"
import { AppFileSystem } from "@interbase/core/filesystem"

function decode(input: string): string {
  try {
    return decodeURIComponent(input)
  } catch {
    return input
  }
}

export function InstanceMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const raw = c.req.query("directory") || c.req.header("x-interbase-directory") || process.cwd()
    const directory = AppFileSystem.resolve(decode(raw))

    return WithInstance.provide({
      directory,
      async fn() {
        return next()
      },
    })
  }
}
