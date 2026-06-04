import { afterEach, describe, expect, test } from "bun:test"
import { resource } from "@interbase/core/effect/observability"

const otelResourceAttributes = process.env.OTEL_RESOURCE_ATTRIBUTES
const interbaseClient = process.env.INTERBASE_CLIENT

afterEach(() => {
  if (otelResourceAttributes === undefined) delete process.env.OTEL_RESOURCE_ATTRIBUTES
  else process.env.OTEL_RESOURCE_ATTRIBUTES = otelResourceAttributes

  if (interbaseClient === undefined) delete process.env.INTERBASE_CLIENT
  else process.env.INTERBASE_CLIENT = interbaseClient
})

describe("resource", () => {
  test("parses and decodes OTEL resource attributes", () => {
    process.env.OTEL_RESOURCE_ATTRIBUTES =
      "service.namespace=interbase,team=platform%2Cobservability,label=hello%3Dworld,key%2Fname=value%20here"

    expect(resource().attributes).toMatchObject({
      "service.namespace": "interbase",
      team: "platform,observability",
      label: "hello=world",
      "key/name": "value here",
    })
  })

  test("drops OTEL resource attributes when any entry is invalid", () => {
    process.env.OTEL_RESOURCE_ATTRIBUTES = "service.namespace=interbase,broken"

    expect(resource().attributes["service.namespace"]).toBeUndefined()
    expect(resource().attributes["interbase.client"]).toBeDefined()
  })

  test("keeps built-in attributes when env values conflict", () => {
    process.env.INTERBASE_CLIENT = "cli"
    process.env.OTEL_RESOURCE_ATTRIBUTES =
      "interbase.client=web,service.instance.id=override,service.namespace=interbase"

    expect(resource().attributes).toMatchObject({
      "interbase.client": "cli",
      "service.namespace": "interbase",
    })
    expect(resource().attributes["service.instance.id"]).not.toBe("override")
  })
})
