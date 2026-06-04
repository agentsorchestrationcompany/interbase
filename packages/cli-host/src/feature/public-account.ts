import { ProviderAccountAuthority } from "@/account/authority"
import type { FeatureBundle } from "./bundle"

export const PUBLIC_ACCOUNT_FEATURE_BUNDLE = {
  id: "public-account-authority",
  kind: "public",
  authoritySeams: ["provider-account-authority"],
  disabledCompatibility: [
    "active-none",
    "active-org-none",
    "list-empty",
    "token-none",
    "provider-login-unavailable",
    "provider-signup-unavailable",
  ],
  seamLayers: [{ seam: "provider-account-authority", layer: ProviderAccountAuthority.defaultLayer }],
} satisfies FeatureBundle

export * as PublicAccountFeature from "./public-account"
