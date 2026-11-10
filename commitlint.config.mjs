export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "auth",
        "backend",
        "core",
        "desktop",
        "frontend",
        "infra",
        "mobile",
        "types",
        "ui",
        "utils",
        "repo",
      ],
    ],
    "scope-empty": [2, "never"],
    "body-max-line-length": [0, "always"],
  },
};
