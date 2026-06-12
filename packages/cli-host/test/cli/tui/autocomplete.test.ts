import { describe, expect, test } from "bun:test"
import {
  matchesExactSlashArgumentAlias,
  slashAutocompleteInsertionText,
  shouldTrimLeadingSlashAutocomplete,
} from "../../../src/cli/cmd/tui/component/prompt/slash-autocomplete"

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

  test("does not trim a slash command inserted before existing text", () => {
    expect(
      shouldTrimLeadingSlashAutocomplete({
        text: "/goal hello",
        cursorOffset: "/goal ".length,
        visible: "/",
      }),
    ).toBe(false)
  })

  test("trims a leading slash command when it is the active token at end of input", () => {
    expect(
      shouldTrimLeadingSlashAutocomplete({
        text: "/goal",
        cursorOffset: "/goal".length,
        visible: "/",
      }),
    ).toBe(true)
  })

  test("does not trim when preserveInput is requested or the command is incomplete", () => {
    expect(
      shouldTrimLeadingSlashAutocomplete({
        text: "/goal",
        cursorOffset: "/goal".length,
        visible: "/",
        preserveInput: true,
      }),
    ).toBe(false)
    expect(
      shouldTrimLeadingSlashAutocomplete({
        text: "/goal ",
        cursorOffset: "/goal ".length,
        visible: "/",
      }),
    ).toBe(false)
    expect(
      shouldTrimLeadingSlashAutocomplete({
        text: "goal",
        cursorOffset: "goal".length,
        visible: "/",
      }),
    ).toBe(false)
    expect(
      shouldTrimLeadingSlashAutocomplete({
        text: "/goal",
        cursorOffset: "/goal".length,
        visible: false,
      }),
    ).toBe(false)
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
