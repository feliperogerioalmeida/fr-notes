import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/build/**",
      "**/dist/**",
      "**/next-env.d.ts",
      "**/.expo/**",
      "**/expo-env.d.ts",
      "apps/mobile/src/api/endpoints/**",
      "apps/mobile/src/api/model/**",
    ],
  },

  // Base configuration for all files
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },

  // Apply recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React/Next.js specific configuration for frontend app
  {
    files: ["apps/frontend/**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        React: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // React Native specific configuration for mobile app
  {
    files: ["apps/mobile/**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // Expo config files are CommonJS by contract
  {
    files: ["apps/mobile/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Node.js specific configuration for backend
  {
    files: ["apps/backend/**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Prettier must be last to override other formatting rules
  eslintConfigPrettier,
];
