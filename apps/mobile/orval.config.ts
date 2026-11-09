import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: "./swagger.json",
    output: {
      mode: "tags-split",
      target: "src/api/endpoints",
      schemas: "src/api/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "src/api/mutator.ts",
          name: "apiFetch",
        },
      },
    },
  },
});
