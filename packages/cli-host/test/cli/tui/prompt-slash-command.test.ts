import { describe, expect, test } from "bun:test"
import {
  parsePromptSlashCommandInput,
  resolvePromptSlashCommand,
  resolvePromptSlashCommandAction,
} from "../../../src/cli/cmd/tui/component/prompt/slash-command"

describe("prompt slash command routing", () => {
  test("parses first-line slash commands and preserves multiline arguments", () => {
    expect(parsePromptSlashCommandInput("/goal resume")).toEqual({ command: "goal", arguments: "resume" })
    expect(parsePromptSlashCommandInput("/goal first\nsecond line")).toEqual({
      command: "goal",
      arguments: "first\nsecond line",
    })
    expect(parsePromptSlashCommandInput("regular message")).toBeNull()
  })

  test("routes server slash commands", () => {
    expect(
      resolvePromptSlashCommand({
        inputText: "/compact now",
        serverCommands: [{ name: "compact" }],
        tuiSlashCommands: [],
      }),
    ).toEqual({ command: "compact", arguments: "now" })
  })

  test("routes text-only TUI slash commands such as goal", () => {
    expect(
      resolvePromptSlashCommand({
        inputText: "/goal resume",
        serverCommands: [],
        tuiSlashCommands: [{ display: "/goal" }],
      }),
    ).toEqual({ command: "goal", arguments: "resume" })
  })

  test("routes structured TUI slash aliases with fixed arguments", () => {
    expect(
      resolvePromptSlashCommand({
        inputText: "/demo1",
        serverCommands: [],
        tuiSlashCommands: [{ display: "/demo", argumentAliases: [{ display: "/demo1", arguments: "1" }] }],
      }),
    ).toEqual({ command: "demo", arguments: "1" })
  })

  test("does not route TUI slash commands that have UI handlers", () => {
    expect(
      resolvePromptSlashCommand({
        inputText: "/status",
        serverCommands: [],
        tuiSlashCommands: [{ display: "/status", onSelect: () => {} }],
      }),
    ).toBeNull()
  })

  test("resolves exact TUI slash command actions", () => {
    let selected = false
    const action = resolvePromptSlashCommandAction({
      inputText: "/aliases",
      tuiSlashCommands: [
        {
          display: "/aliases",
          aliases: ["/alias"],
          onSelect: () => {
            selected = true
          },
        },
      ],
    })

    expect(action).toBeTypeOf("function")
    action?.()
    expect(selected).toBe(true)
  })

  test("resolves TUI slash command actions with trailing whitespace", () => {
    let selected = false
    const action = resolvePromptSlashCommandAction({
      inputText: "/review ",
      tuiSlashCommands: [
        {
          display: "/review",
          onSelect: () => {
            selected = true
          },
        },
      ],
    })

    expect(action).toBeTypeOf("function")
    action?.()
    expect(selected).toBe(true)
  })

  test("does not route whitespace-only TUI action commands to same-named server commands", () => {
    expect(
      resolvePromptSlashCommand({
        inputText: "/review ",
        serverCommands: [{ name: "review" }],
        tuiSlashCommands: [{ display: "/review", onSelect: () => {} }],
      }),
    ).toBeNull()
  })

  test("does not resolve TUI slash command actions with arguments", () => {
    expect(
      resolvePromptSlashCommandAction({
        inputText: "/aliases extra",
        tuiSlashCommands: [{ display: "/aliases", onSelect: () => {} }],
      }),
    ).toBeNull()
  })
})
