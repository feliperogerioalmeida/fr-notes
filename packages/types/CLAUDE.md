# Types Package Conventions

- No build step — points directly to `.ts` source
- Only `interface` and `type` declarations — NEVER include runtime code
- Shared types between apps (e.g., `ApiResponse<T>`)
- Barrel export in `index.ts`
