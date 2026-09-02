import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".claude/**",
      ".jetro/**",
      ".kilo/**",
      "awesome-codex-skills/**",
      "cc-thinking-skills/**",
      "cpanel-deploy-ready/**",
      // Vendored third-party projects with their own configs/deps
      "deer-flow/**",
      "airflow/**",
      "projects/**",
      "data/**",
      "graphify-out/**",
      ".agents/**",
      ".cursor/**",
      ".trae/**",
      ".vscode/**",
      ".netlify/**",
      ".tmp/**",
      ".history-memo/**",
      ".github/**",
      // Deno type-check cache and edge-function vendored deps
      "supabase/functions/vendor/**",
      "supabase/functions/node_modules/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
