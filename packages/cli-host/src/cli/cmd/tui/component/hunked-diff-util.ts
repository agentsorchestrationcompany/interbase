export function splitDiffHunks(diff: string): string[] {
  if (!diff) return []

  const chunks: string[] = []
  const header: string[] = []
  let hunk: string[] | undefined
  let sawHunk = false

  function pushHunk() {
    if (!hunk) return
    chunks.push([...header, ...hunk].join("\n"))
    hunk = undefined
  }

  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) {
      pushHunk()
      header.length = 0
      header.push(line)
      continue
    }

    if (/^@@\s/.test(line)) {
      pushHunk()
      sawHunk = true
      hunk = [line]
      continue
    }

    if (hunk) {
      hunk.push(line)
    } else {
      header.push(line)
    }
  }

  pushHunk()
  return sawHunk ? chunks : [diff]
}

export function isCreatedDiffHunk(diff: string): boolean {
  const hunkHeader = diff.split("\n").find((line) => /^@@\s/.test(line))
  if (!hunkHeader) return false

  return /^@@\s+-0(?:,0)?\s+\+\d+(?:,\d+)?\s+@@/.test(hunkHeader)
}
