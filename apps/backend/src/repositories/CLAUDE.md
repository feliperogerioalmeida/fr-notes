# Repository Conventions

- Repositories are the ONLY layer that talks to the database via Drizzle ORM
- NEVER contain business logic — only data access (queries, inserts, updates, deletes)
- Receive and return DTOs (interfaces defined in `src/domain/`)
- One file per domain (e.g., `user.ts`, `order.ts`)
