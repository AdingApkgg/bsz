// ESLint flat config — narrowly scoped to Solid-specific reactivity rules
// (Biome handles general JS/TS/format lint).

import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/typescript";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      ".output/",
      ".vinxi/",
      ".solid/",
      "dist/",
      "build/",
      "src/components/ui/**",
      "*.cjs",
      "*.config.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.ts", "app.config.ts"],
    ...solid,
    languageOptions: {
      ...solid.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      ...solid.rules,
      // Biome already handles these
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "off",
      "no-empty": "off",
      "no-undef": "off",
    },
  },
);
