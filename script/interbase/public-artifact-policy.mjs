const deferredGeneratedSurfaceRules = [
  {
    prefixes: ["openapi/", "sdk/openapi", "generated/openapi"],
    surface: "generated OpenAPI",
  },
  {
    prefixes: [
      "completion/",
      "completions/",
      "shell-completions/",
      "share/bash-completion/",
      "share/fish/vendor_completions.d/",
      "share/zsh/site-functions/",
    ],
    surface: "shell completions",
  },
  {
    prefixes: ["man/", "man1/", "share/man/"],
    surface: "manpages",
  },
  {
    prefixes: ["shell-integration/", "shell-integrations/", "share/shell/", "share/shell-integration/"],
    surface: "shell integrations",
  },
]

const deferredGeneratedSuffixRules = [
  {
    suffixes: [".map"],
    surface: "source maps",
  },
  {
    suffixes: [".dSYM", ".pdb", ".dbg"],
    surface: "debug symbols",
  },
]

function normalizedArtifactPath(filePath) {
  return filePath.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "")
}

function includesPathPrefix(filePath, prefix) {
  return `/${filePath}`.includes(`/${prefix}`)
}

export function deferredGeneratedArtifactSurface(filePath) {
  const normalized = normalizedArtifactPath(filePath)
  if (normalized.startsWith("src/")) return null

  for (const rule of deferredGeneratedSurfaceRules) {
    if (rule.prefixes.some((prefix) => includesPathPrefix(normalized, prefix))) return rule.surface
  }
  for (const rule of deferredGeneratedSuffixRules) {
    if (rule.suffixes.some((suffix) => normalized.endsWith(suffix))) return rule.surface
  }
  return null
}

export function deferredGeneratedArtifactFailure(artifactPath, filePath) {
  const surface = deferredGeneratedArtifactSurface(filePath)
  if (!surface) return null
  return `${artifactPath}: ${surface} are deferred for v1; document the generated surface in repository release notes or policy files, then extend artifact validation before packaging`
}
