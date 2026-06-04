declare global {
  const INTERBASE_VERSION: string
  const INTERBASE_CHANNEL: string
}

export const InstallationVersion = typeof INTERBASE_VERSION === "string" ? INTERBASE_VERSION : "local"
export const InstallationChannel = typeof INTERBASE_CHANNEL === "string" ? INTERBASE_CHANNEL : "local"
export const InstallationLocal = InstallationChannel === "local"
