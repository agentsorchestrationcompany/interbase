import { describe, expect, test } from "bun:test"
import { createSessionTurnCoordinator, type SessionTurnMessage } from "../src/index.js"

interface Input {
  content: string
  sessionId: string
}

interface Message extends SessionTurnMessage {
  content: string
  role: "assistant" | "user"
  sessionId: string
}

describe("session turn coordinator", () => {
  test("runs idle prompts immediately and resolves with a stable queue item id", async () => {
    const calls: string[] = []
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (input) => input.sessionId,
      now: () => 1,
      runPrompt: async (input) => {
        calls.push(input.content)
        return assistant(input, "a1")
      },
    })

    await expect(coordinator.submit(input("first"))).resolves.toEqual({
      message: assistant(input("first"), "a1"),
      queued: false,
      queueItemId: "s1:1:1",
    })
    expect(calls).toEqual(["first"])
    expect(coordinator.pending("s1")).toEqual([])
  })

  test("uses Date.now for queue item ids when no clock is injected", async () => {
    const originalNow = Date.now
    Date.now = () => 123
    try {
      const coordinator = createSessionTurnCoordinator<Input, Message>({
        getSessionId: (value) => value.sessionId,
        runPrompt: async (value) => assistant(value, "a1"),
      })
      await expect(coordinator.submit(input("first"))).resolves.toMatchObject({
        queueItemId: "s1:123:1",
      })
    } finally {
      Date.now = originalNow
    }
  })

  test("serializes concurrent prompts through FIFO instead of sharing the first result", async () => {
    const releaseFirst = deferred<void>()
    const calls: string[] = []
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (input) => input.sessionId,
      now: () => 2,
      runPrompt: async (input) => {
        calls.push(input.content)
        if (input.content === "first") await releaseFirst.promise
        return assistant(input, `a-${input.content}`)
      },
    })

    const first = coordinator.submit(input("first"))
    const second = coordinator.submit(input("second"))
    expect(coordinator.pending("s1")).toEqual(["s1:2:2"])
    releaseFirst.resolve()

    await expect(first).resolves.toMatchObject({ message: { content: "first", id: "a-first" }, queued: false })
    await expect(second).resolves.toMatchObject({ message: { content: "second", id: "a-second" }, queued: false })
    expect(calls).toEqual(["first", "second"])
  })

  test("uses active-turn steering when the adapter accepts it", async () => {
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (input) => input.sessionId,
      runPrompt: async (input) => assistant(input, "prompt"),
      steerActiveTurn: async (input) => (input.content === "steer" ? assistant(input, "steered") : null),
    })

    await expect(coordinator.submit(input("steer"))).resolves.toMatchObject({
      message: { id: "steered" },
    })
    await expect(coordinator.submit(input("next"))).resolves.toMatchObject({
      message: { id: "prompt" },
    })
  })

  test("keeps later queued prompts after an earlier run fails", async () => {
    const releaseFirst = deferred<void>()
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      runPrompt: async (value) => {
        if (value.content === "first") {
          await releaseFirst.promise
          throw new Error("boom")
        }
        return assistant(value, "ok")
      },
    })

    const first = coordinator.submit(input("first"))
    const second = coordinator.submit(input("second"))
    releaseFirst.resolve()

    await expect(first).rejects.toThrow("boom")
    await expect(second).resolves.toMatchObject({ message: { id: "ok" } })
  })

  test("returns immediate user ack and starts loop when persist-only support exists", async () => {
    const loops: string[] = []
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      persistPromptOnly: async (value) => user(value, `u-${value.content}`),
      readMessages: async () => [assistant(input("first"), "a1")],
      runLoop: async (sessionId) => {
        loops.push(sessionId)
        return assistant(input("loop"), "a1")
      },
      runPrompt: async (value) => assistant(value, "unused"),
    })

    await expect(coordinator.submit(input("first"))).resolves.toMatchObject({
      message: { id: "u-first", role: "user" },
      queued: true,
    })
    await waitFor(() => expect(loops).toEqual(["s1"]))
  })

  test("runs full prompt while idle when busy detection is available", async () => {
    const calls: string[] = []
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      isSessionBusy: async () => false,
      persistPromptOnly: async (value) => user(value, `u-${value.content}`),
      runLoop: async () => assistant(input("loop"), "loop"),
      runPrompt: async (value) => {
        calls.push(value.content)
        return assistant(value, `a-${value.content}`)
      },
    })

    await expect(coordinator.submit(input("first"))).resolves.toMatchObject({
      message: { id: "a-first", role: "assistant" },
      queued: false,
    })
    expect(calls).toEqual(["first"])
    expect(coordinator.pending("s1")).toEqual([])
  })

  test("persists and drains when busy detection reports an active session", async () => {
    const persisted: string[] = []
    const loops: string[] = []
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      isSessionBusy: async () => true,
      persistPromptOnly: async (value) => {
        persisted.push(value.content)
        return user(value, `u-${value.content}`)
      },
      runLoop: async (sessionId) => {
        loops.push(sessionId)
        return assistant(input("loop"), "a-loop")
      },
      runPrompt: async (value) => assistant(value, "unused"),
    })

    await expect(coordinator.submit(input("queued"))).resolves.toMatchObject({
      message: { id: "u-queued", role: "user" },
      queued: true,
    })
    expect(persisted).toEqual(["queued"])
    await waitFor(() => expect(loops).toEqual(["s1"]))
  })

  test("waits for the host to become idle before draining persisted prompts", async () => {
    const order: string[] = []
    const idle = deferred<void>()
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      isSessionBusy: async () => true,
      persistPromptOnly: async (value) => {
        order.push(`persist:${value.content}`)
        return user(value, `u-${value.content}`)
      },
      waitUntilIdle: async () => {
        order.push("wait")
        await idle.promise
      },
      runLoop: async () => {
        order.push("loop")
        return assistant(input("loop"), "a-loop")
      },
      runPrompt: async (value) => assistant(value, "unused"),
    })

    await coordinator.submit(input("queued"))
    await waitFor(() => expect(order).toEqual(["persist:queued", "wait"]))
    idle.resolve()
    await waitFor(() => expect(order).toEqual(["persist:queued", "wait", "loop"]))
  })

  test("drains prompts queued while an idle full prompt is still running", async () => {
    const started = deferred<void>()
    const releasePrompt = deferred<Message>()
    const loops: string[] = []
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      isSessionBusy: async () => false,
      persistPromptOnly: async (value) => user(value, `u-${value.content}`),
      runLoop: async (sessionId) => {
        loops.push(sessionId)
        return assistant(input("loop"), "a-loop")
      },
      runPrompt: async () => {
        started.resolve()
        return releasePrompt.promise
      },
    })

    const first = coordinator.submit(input("first"))
    await started.promise
    await expect(coordinator.submit(input("second"))).resolves.toMatchObject({
      message: { id: "u-second", role: "user" },
      queued: true,
    })
    expect(loops).toEqual([])

    releasePrompt.resolve(assistant(input("first"), "a-first"))
    await expect(first).resolves.toMatchObject({ message: { id: "a-first" } })
    await waitFor(() => expect(loops).toEqual(["s1"]))
  })

  test("supports nested message id and role accessors for stale-stop detection", async () => {
    type NestedMessage = SessionTurnMessage & {
      content: string
      info: { id: string; role: "assistant" | "user" }
      sessionId: string
    }

    let loops = 0
    const nestedInput = input("first")
    const nested = (role: "assistant" | "user", id: string): NestedMessage => ({
      content: role,
      id: "",
      info: { id, role },
      sessionId: "s1",
    })
    const coordinator = createSessionTurnCoordinator<Input, NestedMessage>({
      getSessionId: (value) => value.sessionId,
      getMessageId: (message) => message.info.id,
      getMessageRole: (message) => message.info.role,
      persistPromptOnly: async () => nested("user", "u1"),
      readMessages: async () =>
        loops === 1
          ? [nested("assistant", "a1"), nested("user", "u2")]
          : [nested("assistant", "a1"), nested("user", "u2"), nested("assistant", "a2")],
      runLoop: async () => {
        loops += 1
        return nested("assistant", loops === 1 ? "a1" : "a2")
      },
      runPrompt: async () => nested("assistant", "unused"),
    })

    await coordinator.submit(nestedInput)
    await waitFor(() => expect(loops).toBe(2))
  })

  test("continues persisted-loop draining when stale-stop detection sees unanswered user input", async () => {
    let loops = 0
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      persistPromptOnly: async (value) => user(value, "u1"),
      readMessages: async () =>
        loops === 1
          ? [assistant(input("first"), "a1"), user(input("later"), "u2")]
          : [assistant(input("first"), "a1"), user(input("later"), "u2"), assistant(input("later"), "a2")],
      runLoop: async () => {
        loops += 1
        return assistant(input("loop"), loops === 1 ? "a1" : "a2")
      },
      runPrompt: async (value) => assistant(value, "unused"),
    })

    await coordinator.submit(input("first"))
    await waitFor(() => expect(loops).toBe(2))
  })

  test("queues additional persisted prompts while a persisted drain is already running", async () => {
    const releaseLoop = deferred<Message>()
    let loops = 0
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      now: () => 3,
      persistPromptOnly: async (value) => user(value, `u-${value.content}`),
      runLoop: async () => {
        loops += 1
        if (loops === 1) return await releaseLoop.promise
        return assistant(input("second"), "a2")
      },
      runPrompt: async (value) => assistant(value, "unused"),
    })

    await coordinator.submit(input("first"))
    await coordinator.submit(input("second"))
    expect(coordinator.pending("s1")).toEqual(["s1:3:2"])
    releaseLoop.resolve(assistant(input("first"), "a1"))
    await waitFor(() => expect(loops).toBe(2))
    expect(coordinator.pending("s1")).toEqual([])
  })

  test("keeps unstarted persisted prompts queued when loop draining fails", async () => {
    const releaseLoop = deferred<Message>()
    let loops = 0
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      now: () => 4,
      persistPromptOnly: async (value) => user(value, `u-${value.content}`),
      runLoop: async () => {
        loops += 1
        if (loops === 1) return await releaseLoop.promise
        throw new Error("loop failed")
      },
      runPrompt: async (value) => assistant(value, "unused"),
    })

    await coordinator.submit(input("first"))
    await coordinator.submit(input("second"))
    releaseLoop.reject(new Error("loop failed"))
    await waitFor(() => expect(coordinator.pending("s1")).toEqual(["s1:4:2"]))
  })

  test("ignores stale checks for non-assistant or missing messages", async () => {
    let loops = 0
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      persistPromptOnly: async (value) => user(value, "u1"),
      readMessages: async () => [user(input("first"), "u1")],
      runLoop: async () => {
        loops += 1
        return user(input("loop"), "u1")
      },
      runPrompt: async (value) => assistant(value, "unused"),
    })

    await coordinator.submit(input("first"))
    await waitFor(() => expect(loops).toBe(1))
  })

  test("stops stale checks when the returned assistant is not in the message list", async () => {
    let loops = 0
    const coordinator = createSessionTurnCoordinator<Input, Message>({
      getSessionId: (value) => value.sessionId,
      persistPromptOnly: async (value) => user(value, "u1"),
      readMessages: async () => [assistant(input("other"), "a-other"), user(input("later"), "u2")],
      runLoop: async () => {
        loops += 1
        return assistant(input("loop"), "a-missing")
      },
      runPrompt: async (value) => assistant(value, "unused"),
    })

    await coordinator.submit(input("first"))
    await waitFor(() => expect(loops).toBe(1))
  })
})

function input(content: string): Input {
  return { content, sessionId: "s1" }
}

function assistant(input: Input, id: string): Message {
  return { content: input.content, id, role: "assistant", sessionId: input.sessionId }
}

function user(input: Input, id: string): Message {
  return { content: input.content, id, role: "user", sessionId: input.sessionId }
}

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined
  let reject: (reason?: unknown) => void = () => undefined
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, reject, resolve }
}

async function waitFor(assertion: () => void) {
  let lastError: unknown
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      assertion()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }
  throw lastError
}
