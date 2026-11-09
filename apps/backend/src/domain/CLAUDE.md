# Domain Conventions

- Domain interfaces only (not DB schemas, not HTTP types)
- Fastify module augmentation lives in `fastify.d.ts`
- Types inferred with `$Infer` from Better Auth — never manually define auth types
- DTOs (Data Transfer Objects) live here as interfaces for service/repository inputs and outputs
- Name pattern: `CreateUserInput`, `CreateUserOutput`, `ListOrdersInput`, etc.
