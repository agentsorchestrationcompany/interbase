import { Context, Effect, Layer, Option } from "effect"
import type { AccountOrgs, ActiveOrg } from "./types"
import {
  type AccountError,
  AccountID,
  AccountServiceError,
  AccessToken,
  Info,
  Org,
  OrgID,
  Login,
  type PollResult,
  type PollSuccess,
} from "./schema"

function unavailable(message: string) {
  return new AccountServiceError({ message })
}

export interface Interface {
  readonly active: () => Effect.Effect<Option.Option<Info>, AccountError>
  readonly activeOrg: () => Effect.Effect<Option.Option<ActiveOrg>, AccountError>
  readonly list: () => Effect.Effect<Info[], AccountError>
  readonly orgsByAccount: () => Effect.Effect<readonly AccountOrgs[], AccountError>
  readonly remove: (accountID: AccountID) => Effect.Effect<void, AccountError>
  readonly use: (accountID: AccountID, orgID: Option.Option<OrgID>) => Effect.Effect<void, AccountError>
  readonly orgs: (accountID: AccountID) => Effect.Effect<readonly Org[], AccountError>
  readonly layers: (
    accountID: AccountID,
    orgID: OrgID,
  ) => Effect.Effect<readonly { id: string; name: string }[], AccountError>
  readonly config: (
    accountID: AccountID,
    orgID: OrgID,
  ) => Effect.Effect<Option.Option<Record<string, unknown>>, AccountError>
  readonly signupStart: (input: {
    server: string
    email: string
    invitationToken: string
  }) => Effect.Effect<{ expiresAt: string; resendAvailableAt: string }, AccountError>
  readonly signupVerify: (input: {
    server: string
    email: string
    invitationToken: string
    name: string
    otp: string
    password: string
  }) => Effect.Effect<PollSuccess, AccountError>
  readonly token: (accountID: AccountID) => Effect.Effect<Option.Option<AccessToken>, AccountError>
  readonly login: (url: string) => Effect.Effect<Login, AccountError>
  readonly poll: (input: Login) => Effect.Effect<PollResult, AccountError>
}

export class Service extends Context.Service<Service, Interface>()("@interbase/ProviderAccountAuthority") {}

export const layer: Layer.Layer<Service> = Layer.effect(
  Service,
  Effect.succeed(
    Service.of({
      active: () => Effect.succeed(Option.none()),
      activeOrg: () => Effect.succeed(Option.none()),
      list: () => Effect.succeed([]),
      orgsByAccount: () => Effect.succeed([]),
      remove: () => Effect.void,
      use: () => Effect.void,
      orgs: () => Effect.succeed([]),
      layers: () => Effect.succeed([]),
      config: () => Effect.succeed(Option.none()),
      signupStart: () => Effect.fail(unavailable("This Interbase CLI build does not include provider account signup.")),
      signupVerify: () =>
        Effect.fail(unavailable("This Interbase CLI build does not include provider account signup.")),
      token: () => Effect.succeed(Option.none()),
      login: () => Effect.fail(unavailable("This Interbase CLI build does not include provider account login.")),
      poll: () => Effect.fail(unavailable("This Interbase CLI build does not include provider account login.")),
    }),
  ),
)

export const defaultLayer = layer

export * as ProviderAccountAuthority from "./authority"
