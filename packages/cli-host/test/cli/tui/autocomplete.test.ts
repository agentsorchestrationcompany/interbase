import { describe, expect, test } from "bun:test"
import {
  matchesExactSlashArgumentAlias,
  slashAutocompleteInsertionText,
} from "../../../src/cli/cmd/tui/component/prompt/autocomplete"

describe("prompt slash autocomplete", () => {
  test("falls back to inserting slash command text for commands without a UI handler", () => {
    expect(slashAutocompleteInsertionText({ display: "/goal  " }, "/")).toBe("/goal ")
  })

  test("does not replace commands that provide a UI handler", () => {
    expect(slashAutocompleteInsertionText({ display: "/status", onSelect: () => {} }, "/")).toBeNull()
  })

  test("trims padded slash command display text", () => {
    expect(slashAutocompleteInsertionText({ display: "/goal       " }, "/")).toBe("/goal ")
  })

  test("does not insert non-slash options", () => {
    expect(slashAutocompleteInsertionText({ display: "@build" }, "@")).toBeNull()
    expect(slashAutocompleteInsertionText({ display: "goal" }, "/")).toBeNull()
  })

  test("detects exact fixed-argument slash aliases", () => {
    expect(
      matchesExactSlashArgumentAlias("/p1", [
        {
          argumentAliases: [{ display: "/p1", arguments: "1" }],
        },
      ]),
    ).toBe(true)
    expect(
      matchesExactSlashArgumentAlias("/p10", [
        {
          argumentAliases: [{ display: "/p1", arguments: "1" }],
        },
      ]),
    ).toBe(false)
  })
})
