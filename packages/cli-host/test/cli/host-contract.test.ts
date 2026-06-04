import { expect, test } from "bun:test"
import hostContract from "../../src/host-contract.json"

test("host contract exposes the foundation assembly seam version", () => {
  expect(hostContract.hostContractVersion).toBe(1)
  expect(hostContract.implementationRoot).toBe("packages/cli-host")
  expect(hostContract.extensionSeams).toEqual([
    "server-built-ins",
    "tui-built-ins",
    "config-transforms",
    "themes",
    "keybind-defaults",
  ])
})
