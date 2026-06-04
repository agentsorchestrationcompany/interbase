import { describe, expect } from "bun:test"
import { Effect, Layer, Option } from "effect"
import { readFileSync } from "node:fs"

import { Account, AccountID, OrgID } from "../../src/account/account"
import { ProviderAccountAuthority } from "../../src/account/authority"
import { testEffect } from "../lib/effect"

const it = testEffect(Account.defaultLayer)
const delegated = testEffect(
  Account.layer.pipe(
    Layer.provide(
      Layer.succeed(
        ProviderAccountAuthority.Service,
        ProviderAccountAuthority.Service.of({
          active: () =>
            Effect.succeed(
              Option.some({
                active_org_id: null,
                email: "user@example.com",
                id: AccountID.make("acct_1"),
                url: "https://api.example.test",
              }),
            ),
          activeOrg: () => Effect.succeed(Option.none()),
          list: () => Effect.succeed([]),
          orgsByAccount: () => Effect.succeed([]),
          remove: () => Effect.void,
          use: () => Effect.void,
          orgs: () => Effect.succeed([]),
          layers: () => Effect.succeed([]),
          config: () => Effect.succeed(Option.none()),
          signupStart: () => Effect.die("unused"),
          signupVerify: () => Effect.die("unused"),
          token: () => Effect.succeed(Option.none()),
          login: () => Effect.die("unused"),
          poll: () => Effect.die("unused"),
        }),
      ),
    ),
  ),
)

describe("public account service seam", () => {
  it.live("returns empty local account state", () =>
    Effect.gen(function* () {
      const service = yield* Account.Service

      expect(Option.isNone(yield* service.active())).toBe(true)
      expect(Option.isNone(yield* service.activeOrg())).toBe(true)
      expect(yield* service.list()).toEqual([])
      expect(yield* service.orgsByAccount()).toEqual([])
      expect(yield* service.orgs(AccountID.make("acct_1"))).toEqual([])
      expect(yield* service.layers(AccountID.make("acct_1"), OrgID.make("org_1"))).toEqual([])
      expect(Option.isNone(yield* service.config(AccountID.make("acct_1"), OrgID.make("org_1")))).toBe(true)
      expect(Option.isNone(yield* service.token(AccountID.make("acct_1")))).toBe(true)
    }),
  )

  it.live("fails provider account workflows with unavailable errors", () =>
    Effect.gen(function* () {
      const service = yield* Account.Service

      yield* Effect.flip(service.login("https://one.example.com")).pipe(
        Effect.map((error) => expect(error.message).toContain("does not include provider account login")),
      )
      yield* Effect.flip(
        service.signupStart({
          server: "https://one.example.com",
          email: "user@example.com",
          invitationToken: "invite_1",
        }),
      ).pipe(Effect.map((error) => expect(error.message).toContain("does not include provider account signup")))
    }),
  )

  it.live("keeps provider account API clients out of the public seam", () =>
    Effect.sync(() => {
      const source = readFileSync(new URL("../../src/account/account.ts", import.meta.url), "utf8")

      expect(source).not.toContain("/api/cli/")
      expect(source).not.toContain("/auth/device/token")
      expect(source).not.toContain("/api/config")
      expect(source).not.toContain("api.interbase.ai")
      expect(source).not.toContain("refresh_token")
    }),
  )

  delegated.live("delegates account lookups through the provider account authority seam", () =>
    Effect.gen(function* () {
      const service = yield* Account.Service
      const active = yield* service.active()

      expect(Option.isSome(active)).toBe(true)
      expect(Option.isSome(active) && active.value.id).toBe(AccountID.make("acct_1"))
    }),
  )
})
