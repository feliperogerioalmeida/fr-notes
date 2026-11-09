import { config } from "dotenv";
import path from "path";
import { defineConfig } from "vitest/config";

config({ path: ".env.test" });

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    passWithNoTests: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "json-summary", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "drizzle/",
        "**/*.test.ts",
        "**/*.config.*",
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
