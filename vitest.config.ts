import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

function project(name: string, rootRelativePath: string, include: string[]) {
  return {
    extends: true,
    root: fileURLToPath(new URL(`./${rootRelativePath}/`, import.meta.url)),
    test: {
      include,
      name,
    },
  }
}

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text"],
    },
    environment: "node",
    pool: "forks",
    projects: [
      project("cli-goal-plugin", "packages/cli-goal-plugin", ["test/**/*.test.ts"]),
      project("cli-telemetry", "packages/cli-telemetry", ["test/**/*.test.ts"]),
      project("cli-model-switching", "packages/cli-model-switching", ["test/**/*.test.ts"]),
      project("runtime-protocol", "packages/runtime-protocol", ["test/**/*.test.ts"]),
    ],
  },
})
