import { Context, Effect, Layer, Option } from "effect"
import { ProviderAccountAuthority } from "./authority"

import {
  type AccountError,
  AccountID,
  AccountServiceError,
  AccountTransportError,
  AccessToken,
  RefreshToken,
  CodeVerifier,
  Info,
  Org,
  OrgID,
  Login,
  LoginState,
  PollSuccess,
  PollPending,
  PollSlow,
  PollExpired,
  PollDenied,
  PollError,
  type PollResult,
} from "./schema"
import type { AccountOrgs, ActiveOrg } from "./types"

export {
  AccountID,
  type AccountError,
  AccountServiceError,
  AccountTransportError,
  AccessToken,
  RefreshToken,
  CodeVerifier,
  Info,
  Org,
  OrgID,
  Login,
  LoginState,
  PollSuccess,
  PollPending,
  PollSlow,
  PollExpired,
  PollDenied,
  PollError,
  PollResult,
} from "./schema"

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

export class Service extends Context.Service<Service, Interface>()("@interbase/Account") {}

export const layer: Layer.Layer<Service, never, ProviderAccountAuthority.Service> = Layer.effect(
  Service,
  Effect.gen(function* () {
    const authority = yield* ProviderAccountAuthority.Service
    return Service.of(authority)
  }),
)

export function createAccountLayer(
  authorityLayer: Layer.Layer<ProviderAccountAuthority.Service> = ProviderAccountAuthority.defaultLayer,
) {
  return layer.pipe(Layer.provide(authorityLayer)) as Layer.Layer<Service>
}

export const defaultLayer = createAccountLayer()

export * as Account from "./account"
