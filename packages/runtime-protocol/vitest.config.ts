import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "node:test",
        replacement: fileURLToPath(new URL("./test/vitest-node-test.ts", import.meta.url)),
      },
    ],
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text"],
    },
    environment: "node",
    pool: "forks",
  },
})
