# Backend Conventions

## Stack

- Fastify v5 with `ZodTypeProvider`
- Auth: Better Auth + Drizzle adapter (plugins: openAPI, bearer, twoFactor, haveIBeenPwned)
- DB: Drizzle ORM + node-postgres, schemas organized per domain
- NodeNext module resolution
- Zod v4 — import via `zod/v4`

## Architecture Layers

- **Routes (Controllers)** — handle HTTP, validate input with Zod, catch errors from services and return proper responses
- **Services** — contain business logic, throw errors (extending `AppError`) on failure, NEVER catch their own errors
- **Repositories** — the ONLY layer that talks to the database via Drizzle ORM, NEVER contain business logic
- **DTOs** — interfaces for inputs and outputs of services/repositories, defined in `src/domain/`
- **Errors** — ALL custom errors MUST extend `AppError`, NEVER throw raw `Error`

## Dates

- ALL dates MUST be stored in UTC in the database
- Use `timestamptz` (`timestamp with time zone`) for all date columns — NEVER use plain `timestamp`
- Use dayjs with UTC plugin for date manipulation on the backend

## Patterns

- Env vars centralized in `src/config/env.ts` — never use `process.env` directly
- Errors: custom classes extending `AppError`, standardized `ApiResponse` shape
- Controllers = Fastify plugins, middleware = preHandlers
- Every request MUST be validated with Zod schemas

## Route Pattern

```typescript
fastify.withTypeProvider<ZodTypeProvider>().route({
  method: "POST",
  url: "/example",
  schema: { body: ExampleSchema, response: { 200: ResponseSchema } },
  handler: async (request, reply) => { ... }
})
```

## Tests

- Vitest with globals enabled
- Coverage provider: v8
