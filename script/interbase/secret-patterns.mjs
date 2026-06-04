export const publicSecretPatterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, "private key block"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key id"],
  [/\bASIA[0-9A-Z]{16}\b/, "AWS temporary access key id"],
  [/\bghp_[A-Za-z0-9_]{30,}\b/, "GitHub personal access token"],
  [/\bgithub_pat_[A-Za-z0-9_]{50,}\b/, "GitHub fine-grained token"],
  [/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/, "Slack token"],
  [/\bsk-[A-Za-z0-9]{32,}\b/, "provider secret key"],
  [/(?:api|access|secret|auth)[_-]?key\s*[:=]\s*["'][A-Za-z0-9_./+=-]{24,}["']/i, "inline secret assignment"],
  [/(?:token|password)\s*[:=]\s*["'][A-Za-z0-9_./+=-]{24,}["']/i, "inline credential assignment"],
]

export function findPublicSecretMatches(text) {
  return publicSecretPatterns.filter(([pattern]) => pattern.test(text)).map(([, label]) => label)
}
