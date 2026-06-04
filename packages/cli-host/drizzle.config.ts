import { defineConfig } from "drizzle-kit"
import os from "node:os"
import path from "node:path"

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/**/*.sql.ts",
  out: "./migration",
  dbCredentials: {
    url: process.env.INTERBASE_DB ?? path.join(os.homedir(), ".local", "share", "interbase", "interbase.db"),
  },
})
