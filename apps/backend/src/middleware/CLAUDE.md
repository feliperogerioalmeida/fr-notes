# Middleware Conventions

- Middleware are Fastify preHandlers: `async (request: FastifyRequest) => void`
- Throw on failure, return void on success
- Usage in routes: `preHandler: [fn]`
- Authenticated routes must include `security: [{ bearerAuth: [] }]` in the route schema
