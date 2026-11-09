# Config Conventions

- `fetchEnv(key)` throws if the env var does not exist — use it for all env access
- Each variable is an individual named export
- NEVER use `process.env` directly outside this file
- `ENVIRONMENT` object provides `IS_PRODUCTION`, `IS_DEVELOPMENT`, `IS_TESTING` flags
