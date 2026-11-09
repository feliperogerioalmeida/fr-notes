# Service Conventions

- Services contain business logic — the core of the application
- Services throw errors extending `AppError` on failure — NEVER catch their own errors
- Routes (controllers) are responsible for catching and handling service errors
- Services receive and return DTOs (interfaces defined in `src/domain/`)
- Services call repositories for database access — NEVER use Drizzle directly
- One file per domain (e.g., `user.ts`, `order.ts`)
