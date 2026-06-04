export type SessionTurnId = string

export interface SessionTurnMessage {
  id: string
  role?: string
  sessionId?: string
}

export interface SessionTurnSubmitResult<Message> {
  message: Message
  queued: boolean
  queueItemId: string
}

export interface SessionTurnCoordinatorDeps<Input, Message> {
  getSessionId(input: Input): string
  getMessageId?: (message: Message) => string | undefined
  getMessageRole?: (message: Message) => string | undefined
  isSessionBusy?: (sessionId: string) => Promise<boolean>
  runPrompt(input: Input): Promise<Message>
  now?: () => number
  persistPromptOnly?: (input: Input) => Promise<Message>
  readMessages?: (sessionId: string) => Promise<readonly Message[]>
  runLoop?: (sessionId: string) => Promise<Message>
  steerActiveTurn?: (input: Input) => Promise<Message | null>
  waitUntilIdle?: (sessionId: string) => Promise<void>
}

interface QueueItem<Input, Message> {
  input: Input
  id: SessionTurnId
  reject(error: unknown): void
  resolve(result: SessionTurnSubmitResult<Message>): void
}

interface SessionState<Input, Message> {
  draining: boolean
  persisted: SessionTurnId[]
  queue: QueueItem<Input, Message>[]
}

export function createSessionTurnCoordinator<Input, Message extends Partial<SessionTurnMessage>>(
  deps: SessionTurnCoordinatorDeps<Input, Message>,
) {
  const states = new Map<string, SessionState<Input, Message>>()
  let sequence = 0

  function stateFor(sessionId: string) {
    const existing = states.get(sessionId)
    if (existing) return existing
    const next = { draining: false, persisted: [], queue: [] } satisfies SessionState<Input, Message>
    states.set(sessionId, next)
    return next
  }

  function nextQueueItemId(sessionId: string) {
    sequence += 1
    return `${sessionId}:${deps.now?.() ?? Date.now()}:${sequence}`
  }

  function cleanup(sessionId: string, state: SessionState<Input, Message>) {
    if (state.persisted.length === 0 && state.queue.length === 0) states.delete(sessionId)
  }

  function messageId(message: Message) {
    return deps.getMessageId?.(message) ?? message.id
  }

  function messageRole(message: Message) {
    return deps.getMessageRole?.(message) ?? message.role
  }

  async function hasNewerUserMessage(sessionId: string, message: Message) {
    const id = messageId(message)
    if (!deps.readMessages || !id || messageRole(message) !== "assistant") return false
    const messages = await deps.readMessages(sessionId)
    const assistantIndex = messages.findIndex((candidate) => messageId(candidate) === id)
    if (assistantIndex < 0) return false
    return messages.slice(assistantIndex + 1).some((candidate) => messageRole(candidate) === "user")
  }

  async function runQueuedItem(item: QueueItem<Input, Message>) {
    try {
      const steered = await deps.steerActiveTurn?.(item.input)
      const message = steered ?? (await deps.runPrompt(item.input))
      item.resolve({ message, queueItemId: item.id, queued: false })
    } catch (error) {
      item.reject(error)
    }
  }

  async function drainQueuedPrompts(sessionId: string, state: SessionState<Input, Message>) {
    if (state.draining) return
    state.draining = true
    try {
      while (state.queue.length > 0) {
        await runQueuedItem(state.queue.shift() as QueueItem<Input, Message>)
      }
    } finally {
      state.draining = false
      cleanup(sessionId, state)
    }
  }

  async function drainPersistedPrompts(
    sessionId: string,
    state: SessionState<Input, Message>,
    runLoop: (sessionId: string) => Promise<Message>,
  ) {
    if (state.draining) return
    state.draining = true
    try {
      try {
        while (state.persisted.shift()) {
          await deps.waitUntilIdle?.(sessionId)
          let message = await runLoop(sessionId)
          while (await hasNewerUserMessage(sessionId, message)) {
            message = await runLoop(sessionId)
          }
        }
      } catch {
        // The user message was already accepted. Keep any unstarted persisted
        // signals queued so a later submission can retry draining the session.
      }
    } finally {
      state.draining = false
      cleanup(sessionId, state)
    }
  }

  async function submit(input: Input): Promise<SessionTurnSubmitResult<Message>> {
    const sessionId = deps.getSessionId(input)
    const state = stateFor(sessionId)
    const queueItemId = nextQueueItemId(sessionId)

    const runLoop = deps.runLoop
    if (deps.persistPromptOnly && runLoop) {
      if (deps.isSessionBusy) {
        const isBusy = state.draining || (await deps.isSessionBusy(sessionId))
        if (!isBusy) {
          state.draining = true
          try {
            const steered = await deps.steerActiveTurn?.(input)
            const message = steered ?? (await deps.runPrompt(input))
            return { message, queueItemId, queued: false }
          } finally {
            state.draining = false
            if (state.persisted.length > 0) void drainPersistedPrompts(sessionId, state, runLoop)
            else cleanup(sessionId, state)
          }
        }
      }
      const message = await deps.persistPromptOnly(input)
      state.persisted.push(queueItemId)
      void drainPersistedPrompts(sessionId, state, runLoop)
      return { message, queueItemId, queued: state.draining }
    }

    return await new Promise<SessionTurnSubmitResult<Message>>((resolve, reject) => {
      const wasBusy = state.draining || state.queue.length > 0
      state.queue.push({ input, id: queueItemId, reject, resolve })
      void drainQueuedPrompts(sessionId, state)
      if (wasBusy) return
    })
  }

  function pending(sessionId: string) {
    const state = states.get(sessionId)
    return [...(state?.queue.map((item) => item.id) ?? []), ...(state?.persisted ?? [])]
  }

  return {
    pending,
    submit,
  }
}
