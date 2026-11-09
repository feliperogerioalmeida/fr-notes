# Database Conventions

- All tables live in a single `schema.ts` (no `schemas/` folder)
- `drizzle.config.ts` and `db/index.ts` point at `./src/db/schema.ts`
- Group each domain's tables together within the file, `relations()` right after them
- Pattern: `pgTable()` with indexes in 3rd argument, `relations()` defined after tables
- Foreign keys: `.references(() => table.id, { onDelete: "cascade" })`
- Column types: `text` for PKs, `timestamp('...', { withTimezone: true })` (`timestamptz`) for dates, `boolean` for flags
- ALL dates MUST be stored in UTC — NEVER store local time
- NEVER use `pgEnum` — use `text` with Zod validation instead
