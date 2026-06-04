import { describe, expect, test } from "bun:test"
import { isCreatedDiffHunk, splitDiffHunks } from "../../../src/cli/cmd/tui/component/hunked-diff-util"

const MULTI_HUNK_DIFF = `--- a/example.ts
+++ b/example.ts
@@ -1,3 +1,3 @@
 a
-b
+B
 c
@@ -5,3 +5,3 @@
 e
-f
+F
 g`

const MULTI_FILE_DIFF = `diff --git a/one.ts b/one.ts
--- a/one.ts
+++ b/one.ts
@@ -1 +1 @@
-one
+ONE
diff --git a/two.ts b/two.ts
--- a/two.ts
+++ b/two.ts
@@ -1 +1 @@
-two
+TWO`

describe("splitDiffHunks", () => {
  test("splits each hunk into its own renderable diff input", () => {
    const hunks = splitDiffHunks(MULTI_HUNK_DIFF)

    expect(hunks).toHaveLength(2)
    expect(hunks[0]).toContain("--- a/example.ts\n+++ b/example.ts\n@@ -1,3 +1,3 @@")
    expect(hunks[0]).not.toContain("@@ -5,3 +5,3 @@")
    expect(hunks[1]).toContain("--- a/example.ts\n+++ b/example.ts\n@@ -5,3 +5,3 @@")
  })

  test("preserves per-file headers when splitting multi-file diffs", () => {
    const hunks = splitDiffHunks(MULTI_FILE_DIFF)

    expect(hunks).toHaveLength(2)
    expect(hunks[0]).toContain("diff --git a/one.ts b/one.ts")
    expect(hunks[0]).toContain("-one")
    expect(hunks[1]).toContain("diff --git a/two.ts b/two.ts")
    expect(hunks[1]).toContain("-two")
  })

  test("leaves non-hunk diffs untouched", () => {
    const diff = "Binary files a/image.png and b/image.png differ"

    expect(splitDiffHunks(diff)).toEqual([diff])
  })
})

describe("isCreatedDiffHunk", () => {
  test("detects created file hunks", () => {
    const diff = `--- /path/example.ts
+++ /path/example.ts
@@ -0,0 +1,2 @@
+one
+two`

    expect(isCreatedDiffHunk(diff)).toBe(true)
  })

  test("does not treat edits with only additions as created hunks", () => {
    const diff = `--- /path/example.ts
+++ /path/example.ts
@@ -1,1 +1,2 @@
 one
+two`

    expect(isCreatedDiffHunk(diff)).toBe(false)
  })
})
