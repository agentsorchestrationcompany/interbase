import js from "@eslint/js"
import unicorn from "eslint-plugin-unicorn"
import globals from "globals"
import tseslint from "typescript-eslint"

const jsFiles = ["**/*.{js,mjs,cjs}"]
const tsFiles = ["**/*.{ts,tsx,mts,cts}"]
const sharedIgnores = [
  "artifacts/**",
  "coverage/**",
  "dist/**",
  "node_modules/**",
  "packages/cli-host/bin/**",
  "packages/cli-host/specs/**",
]

export default [
  {
    ignores: sharedIgnores,
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    ...js.configs.recommended,
    files: jsFiles,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      unicorn,
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-unused-vars": "off",
      "no-useless-escape": "off",
      "unicorn/no-new-array": "error",
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: tsFiles,
    ignores: sharedIgnores,
    languageOptions: {
      ...config.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      ...config.plugins,
      unicorn,
    },
    rules: {
      ...config.rules,
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "no-constant-condition": ["error", { checkLoops: false }],
      "prefer-const": "off",
      "unicorn/no-new-array": "error",
    },
  })),
]
