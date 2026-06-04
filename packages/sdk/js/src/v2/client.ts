export * from "./gen/types.gen.js"

import { createClient } from "./gen/client/client.gen.js"
import { type Config } from "./gen/client/types.gen.js"
import { OpencodeClient } from "./gen/sdk.gen.js"
export { type Config as OpencodeClientConfig, OpencodeClient }

function pick(value: string | null, fallback?: string, encode?: (value: string) => string) {
  if (!value) return
  if (!fallback) return value
  if (value === fallback) return fallback
  if (encode && value === encode(fallback)) return fallback
  return value
}

function rewrite(request: Request, values: { directory?: string }) {
  if (request.method !== "GET" && request.method !== "HEAD") return request

  const url = new URL(request.url)
  let changed = false

  for (const [name, key] of [["x-interbase-directory", "directory"]] as const) {
    const value = pick(request.headers.get(name), values.directory, encodeURIComponent)
    if (!value) continue
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value)
    }
    changed = true
  }

  if (!changed) return request

  const next = new Request(url, request)
  next.headers.delete("x-interbase-directory")
  return next
}

export function createOpencodeClient(config?: Config & { directory?: string }) {
  if (!config?.fetch) {
    const customFetch: any = (req: any) => {
      // @ts-ignore
      req.timeout = false
      return fetch(req)
    }
    config = {
      ...config,
      fetch: customFetch,
    }
  }

  if (config?.directory) {
    config.headers = {
      ...config.headers,
      "x-interbase-directory": encodeURIComponent(config.directory),
    }
  }

  const client = createClient(config)
  client.interceptors.request.use((request) =>
    rewrite(request, {
      directory: config?.directory,
    }),
  )
  client.interceptors.response.use((response) => {
    const contentType = response.headers.get("content-type")
    if (contentType === "text/html")
      throw new Error("Request is not supported by this version of OpenCode Server (Server responded with text/html)")

    return response
  })
  // The generated client falls back to throwing a literal `{}` when the server
  // responds with an empty / unparseable error body, which surfaces as a bare
  // `{}` in TUI / CLI error output. Wrap ONLY that case in a real Error so
  // downstream formatters get a useful message — but pass through any parsed
  // JSON error body unchanged so existing consumers can still inspect fields.
  client.interceptors.error.use((error, response, request) => {
    const isEmpty =
      error === undefined ||
      error === null ||
      error === "" ||
      (typeof error === "object" && !(error instanceof Error) && Object.keys(error).length === 0)
    if (!isEmpty) return error
    const method = request?.method ?? "?"
    const url = request?.url ?? "?"
    if (!response) return new Error(`interbase server ${method} ${url}: network error (no response)`)
    const status = response.status
    const statusText = response.statusText ? " " + response.statusText : ""
    return new Error(`interbase server ${method} ${url} → ${status}${statusText}: (empty response body)`)
  })
  return new OpencodeClient({ client })
}
