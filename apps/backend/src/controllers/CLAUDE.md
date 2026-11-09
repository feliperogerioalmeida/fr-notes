# Controller Conventions

- Controllers are async Fastify plugins:
  ```typescript
  export const xyzRoutes = async (fastify: FastifyInstance) => { ... }
  ```
- Registered in the app via `app.register()`
- Routes use `fastify.withTypeProvider<ZodTypeProvider>().route({ ... })`
- Define Zod schemas for `body`, `response`, `params`, `querystring` as needed
- Add `tags` for Swagger documentation
- Authenticated routes: `preHandler: [authenticate]` and `security: [{ bearerAuth: [] }]` in schema
- Controllers do NOT contain business logic — delegate to services
- Routes are responsible for catching errors from services and returning proper HTTP responses
- Services throw errors — routes handle them
