import { describe, expect, test } from "bun:test"
import {
  allowAllRemoteRuntimeEntitlementProvider,
  denialCodeForCheckpoint,
  disabledRemoteRuntimeEntitlementProvider,
  type RemoteRuntimeEntitlementCheckpoint,
} from "../src/index.js"

const scope = { environment: "oss", mode: "localDirect" } as const

describe("remote runtime entitlements", () => {
  test("allow-all provider allows every checkpoint", async () => {
    await expect(allowAllRemoteRuntimeEntitlementProvider.isAllowed("command", scope)).resolves.toEqual({
      allowed: true,
    })
    await expect(allowAllRemoteRuntimeEntitlementProvider.isAllowed("runtimeUse", scope)).resolves.toEqual({
      allowed: true,
    })
  })

  test("disabled provider denies using checkpoint-specific codes", async () => {
    const provider = disabledRemoteRuntimeEntitlementProvider("not available")
    const checkpoints: RemoteRuntimeEntitlementCheckpoint[] = ["command", "pairing", "attachment", "runtimeUse"]
    const decisions = await Promise.all(checkpoints.map((checkpoint) => provider.isAllowed(checkpoint, scope)))
    expect(decisions).toEqual([
      { allowed: false, code: "REMOTE_RUNTIME_DISABLED", message: "not available" },
      { allowed: false, code: "PAIRING_NOT_ALLOWED", message: "not available" },
      { allowed: false, code: "ATTACHMENT_NOT_ALLOWED", message: "not available" },
      { allowed: false, code: "RUNTIME_USE_NOT_ALLOWED", message: "not available" },
    ])
  })

  test("maps each checkpoint to a stable denial code", () => {
    expect(denialCodeForCheckpoint("command")).toBe("REMOTE_RUNTIME_DISABLED")
    expect(denialCodeForCheckpoint("pairing")).toBe("PAIRING_NOT_ALLOWED")
    expect(denialCodeForCheckpoint("attachment")).toBe("ATTACHMENT_NOT_ALLOWED")
    expect(denialCodeForCheckpoint("runtimeUse")).toBe("RUNTIME_USE_NOT_ALLOWED")
  })
})
