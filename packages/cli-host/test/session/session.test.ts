import { describe, expect, test } from "bun:test"
import path from "path"
import { Session as SessionNs } from "@/session/session"
import { Bus } from "../../src/bus"
import * as Log from "@interbase/core/util/log"
import { Instance } from "../../src/project/instance"
import { WithInstance } from "../../src/project/with-instance"
import { MessageV2 } from "../../src/session/message-v2"
import { MessageID, PartID, type SessionID } from "../../src/session/schema"
import { ModelID, ProviderID } from "../../src/provider/schema"
import { AppRuntime } from "../../src/effect/app-runtime"
import { tmpdir } from "../fixture/fixture"
import { SessionMessageTable } from "../../src/session/session.sql"
import * as Database from "../../src/storage/db"

const projectRoot = path.join(__dirname, "../..")
void Log.init({ print: false })

function create(input?: SessionNs.CreateInput) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.create(input)))
}

function get(id: SessionID) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.get(id)))
}

function remove(id: SessionID) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.remove(id)))
}

function setModel(input: Parameters<SessionNs.Interface["setModel"]>[0]) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.setModel(input)))
}

function messages(input: Parameters<SessionNs.Interface["messages"]>[0]) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.messages(input)))
}

function updateMessage<T extends MessageV2.Info>(msg: T) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.updateMessage(msg)))
}

function updatePart<T extends MessageV2.Part>(part: T) {
  return AppRuntime.runPromise(SessionNs.Service.use((svc) => svc.updatePart(part)))
}

describe("session.created event", () => {
  test("should emit session.created event when session is created", async () => {
    await WithInstance.provide({
      directory: projectRoot,
      fn: async () => {
        let eventReceived = false
        let receivedInfo: SessionNs.Info | undefined

        const unsub = Bus.subscribe(SessionNs.Event.Created, (event) => {
          eventReceived = true
          receivedInfo = event.properties.info as SessionNs.Info
        })

        const info = await create({})
        await new Promise((resolve) => setTimeout(resolve, 100))
        unsub()

        expect(eventReceived).toBe(true)
        expect(receivedInfo).toBeDefined()
        expect(receivedInfo?.id).toBe(info.id)
        expect(receivedInfo?.projectID).toBe(info.projectID)
        expect(receivedInfo?.directory).toBe(info.directory)
        expect(receivedInfo?.path).toBe(info.path)
        expect(receivedInfo?.title).toBe(info.title)

        await remove(info.id)
      },
    })
  })

  test("session.created event should be emitted before session.updated", async () => {
    await WithInstance.provide({
      directory: projectRoot,
      fn: async () => {
        const events: string[] = []

        const unsubCreated = Bus.subscribe(SessionNs.Event.Created, () => {
          events.push("created")
        })

        const unsubUpdated = Bus.subscribe(SessionNs.Event.Updated, () => {
          events.push("updated")
        })

        const info = await create({})
        await new Promise((resolve) => setTimeout(resolve, 100))
        unsubCreated()
        unsubUpdated()

        expect(events).toContain("created")
        expect(events).toContain("updated")
        expect(events.indexOf("created")).toBeLessThan(events.indexOf("updated"))

        await remove(info.id)
      },
    })
  })
})

describe("session model switching", () => {
  test("setModel persists through model-switched session history", async () => {
    await WithInstance.provide({
      directory: projectRoot,
      fn: async () => {
        const info = await create({})
        let receivedModel: typeof info.model | undefined
        const unsub = Bus.subscribe(SessionNs.Event.Updated, (event) => {
          if (event.properties.sessionID === info.id) receivedModel = event.properties.info.model
        })

        await setModel({
          sessionID: info.id,
          model: {
            id: ModelID.make("gpt-5.4"),
            providerID: ProviderID.make("openai"),
            variant: "high",
          },
        })

        const updated = await get(info.id)
        const history = await messages({ sessionID: info.id })
        const rows = Database.use((db) =>
          db.select().from(SessionMessageTable).where(Database.eq(SessionMessageTable.session_id, info.id)).all(),
        )
        expect(updated.model?.id).toBe(ModelID.make("gpt-5.4"))
        expect(updated.model?.providerID).toBe(ProviderID.make("openai"))
        expect(updated.model?.variant).toBe("high")
        expect(rows).toHaveLength(1)
        expect(rows[0]?.type).toBe("model-switched")
        const projectedModelSwitch = {
          metadata: undefined,
          model: { id: "gpt-5.4", providerID: "openai", variant: "high" },
          time: { created: rows[0]?.time_created },
        }
        expect(rows[0]?.data).toEqual(projectedModelSwitch)
        expect(history).toHaveLength(1)
        expect(history[0]?.info).toMatchObject({
          role: "user",
          model: { providerID: "openai", modelID: "gpt-5.4", variant: "high" },
        })
        expect(history[0]?.parts).toMatchObject([
          {
            type: "text",
            synthetic: true,
            ignored: true,
            text: "Switched model to openai/gpt-5.4/high",
            metadata: {
              kind: "interbase_model_switch",
              model: "openai/gpt-5.4/high",
            },
          },
        ])

        await setModel({
          sessionID: info.id,
          model: {
            id: ModelID.make("gpt-5.4"),
            providerID: ProviderID.make("openai"),
            variant: "medium",
          },
        })

        const collapsedHistory = await messages({ sessionID: info.id })
        expect(collapsedHistory).toHaveLength(1)
        expect(collapsedHistory[0]?.parts[0]).toMatchObject({
          type: "text",
          synthetic: true,
          ignored: true,
          text: "Switched model to openai/gpt-5.4/medium",
          metadata: {
            kind: "interbase_model_switch",
            model: "openai/gpt-5.4/medium",
          },
        })
        expect(receivedModel?.id).toBe(ModelID.make("gpt-5.4"))
        expect(receivedModel?.providerID).toBe(ProviderID.make("openai"))
        expect(receivedModel?.variant).toBe("medium")

        unsub()
        await remove(info.id)
      },
    })
  })
})

describe("step-finish token propagation via Bus event", () => {
  test(
    "non-zero tokens propagate through PartUpdated event",
    async () => {
      await WithInstance.provide({
        directory: projectRoot,
        fn: async () => {
          const info = await create({})

          const messageID = MessageID.ascending()
          await updateMessage({
            id: messageID,
            sessionID: info.id,
            role: "user",
            time: { created: Date.now() },
            agent: "user",
            model: { providerID: "test", modelID: "test" },
            tools: {},
            mode: "",
          } as unknown as MessageV2.Info)

          // Bus subscribers receive readonly Schema.Type payloads; `MessageV2.Part`
          // is the mutable domain type. Cast bridges the two — safe because the
          // test only reads the value afterwards.
          let received: MessageV2.Part | undefined
          const unsub = Bus.subscribe(MessageV2.Event.PartUpdated, (event) => {
            received = event.properties.part as MessageV2.Part
          })

          const tokens = {
            total: 1500,
            input: 500,
            output: 800,
            reasoning: 200,
            cache: { read: 100, write: 50 },
          }

          const partInput = {
            id: PartID.ascending(),
            messageID,
            sessionID: info.id,
            type: "step-finish" as const,
            reason: "stop",
            cost: 0.005,
            tokens,
          }

          await updatePart(partInput)
          await new Promise((resolve) => setTimeout(resolve, 100))

          expect(received).toBeDefined()
          expect(received!.type).toBe("step-finish")
          const finish = received as MessageV2.StepFinishPart
          expect(finish.tokens.input).toBe(500)
          expect(finish.tokens.output).toBe(800)
          expect(finish.tokens.reasoning).toBe(200)
          expect(finish.tokens.total).toBe(1500)
          expect(finish.tokens.cache.read).toBe(100)
          expect(finish.tokens.cache.write).toBe(50)
          expect(finish.cost).toBe(0.005)
          expect(received).not.toBe(partInput)

          unsub()
          await remove(info.id)
        },
      })
    },
    { timeout: 30000 },
  )
})

describe("Session", () => {
  test("remove works without an instance", async () => {
    await using tmp = await tmpdir({ git: true })

    const info = await WithInstance.provide({
      directory: tmp.path,
      fn: () => create({ title: "remove-without-instance" }),
    })

    await expect(async () => {
      await remove(info.id)
    }).not.toThrow()

    let missing = false
    await get(info.id).catch(() => {
      missing = true
    })

    expect(missing).toBe(true)
  })
})
