# Claude Command: Issue

This command fetches a Linear issue and creates documentation files for it.

## Usage

```
/issue <ISSUE-ID>
```

Example: `/issue KAV-42`

## What This Command Does

1. Runs `pnpm linear:issue <ISSUE-ID>` to fetch the issue from Linear.
2. Creates `issues/<ISSUE-ID>.md` with the issue content.
3. Creates `task.md` with a structured prompt to complete the issue.

## IMPORTANT CONSTRAINTS

- This command ONLY fetches the issue and writes files. It MUST NOT execute any other actions.
- Do NOT start implementing the issue.
- Do NOT modify any source code.
- Do NOT create branches, commits, or PRs.
- Do NOT run tests, linters, or any other tooling.

## Step 1: Fetch the Issue

Run the following command:

```bash
pnpm linear:issue <ISSUE-ID>
```

This returns a JSON object with: `id`, `title`, `description`, `status`, `priority`, `assignee`, `labels`, `url`.

## Step 2: Create the Issue File

Create the file `issues/<ISSUE-ID>.md` (e.g., `issues/KAV-42.md`) with the following structure:

```markdown
# <ID>: <Title>

## Description

<full issue description in markdown>
```

## Step 3: Create the Task File

Create `task.md` with a direct, actionable implementation prompt.

**IMPORTANT — Adapt to project standards:** The issue description may contain code snippets, tool suggestions, or patterns that do NOT match the project's actual stack, conventions, or CLAUDE.md rules. When writing the task file you MUST:

- Use `CLAUDE.md` as the source of truth for coding standards.
- If the issue mentions tools, libraries, or patterns that conflict with the project stack, translate the _intent_ to the correct tool/pattern.
- If the issue contains code examples, treat them as _pseudocode/intent_ — rewrite using the project's actual conventions.
- Never blindly copy code or tool choices from the issue description into the task.
- **Explore the existing codebase** before writing the task. Check existing schemas, routes, middleware, and patterns already in place. The task must build on what already exists, not duplicate or contradict it.

The task file must be **direct and specific** — not vague descriptions, but concrete instructions of what to create. Include exact routes, schemas/models, and middleware when applicable.

Use the following format:

```markdown
# Task: <ID> — <Title>

## Objective

<1-3 sentences: what this issue achieves>

## What to Implement

<Be specific and direct. For each item, describe exactly what to create/modify.
Include concrete details: route paths, table/column names, field types, enum values, middleware names, etc.
Follow the existing project patterns discovered during codebase exploration.>

### Database / Schema

<List exact tables, columns, enums, and relations to create or modify.
Follow the ORM and naming conventions already used in the project.>

### Routes / Endpoints

<List exact endpoints with method, path, request body, response, and auth requirements.
Follow the router patterns already used in the project.>

### Middleware / Hooks

<List middleware or hooks to create, with their exact behavior.>

### Seed / Migrations

<Any seed data or migration steps needed.>

(Omit any section above that does not apply to this issue.)

## Acceptance Criteria

- [ ] ...
- [ ] ...

## Notes

<Only if there are deviations from the issue or important caveats. Otherwise omit.>
```

## Step 4: Confirm Completion

After creating both files, output:

```
Created:
  - issues/<ISSUE-ID>.md
  - task.md

Ready to implement. Run the task with: read task.md and implement it.
```

Then STOP. Do not proceed with implementation.
