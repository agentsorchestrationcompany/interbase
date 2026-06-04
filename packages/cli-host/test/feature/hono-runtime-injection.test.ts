import { describe, expect, test } from "bun:test"
import { ControlPlaneRoutes } from "../../src/server/routes/control"
import { GlobalRoutes } from "../../src/server/routes/global"
import { createQuestionRoutes } from "../../src/server/routes/instance/question"

function runtime<A>(value: A) {
  return {
    runSync() {
      throw new Error("unused")
    },
    runPromise(effect: unknown) {
      void effect
      return Promise.resolve(value as never)
    },
    runPromiseExit() {
      throw new Error("unused")
    },
    runFork() {
      throw new Error("unused")
    },
    runCallback() {
      throw new Error("unused")
    },
    dispose() {
      return Promise.resolve(undefined)
    },
  }
}

describe("Hono runtime injection", () => {
  test("question routes can be constructed with an injected runtime object", async () => {
    const route = createQuestionRoutes(runtime([]))

    const response = await route.request("http://localhost/")
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
  })

  test("control-plane routes can be constructed with an injected runtime object", async () => {
    const route = ControlPlaneRoutes(runtime(undefined))

    const response = await route.request("http://localhost/auth/openai", {
      method: "DELETE",
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toBe(true)
  })

  test("global routes can be constructed with an injected runtime object", async () => {
    const route = GlobalRoutes(undefined, runtime({ hello: "world" }))

    const response = await route.request("http://localhost/config")
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ hello: "world" })
  })
})
