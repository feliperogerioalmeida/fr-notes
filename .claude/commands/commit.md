# Claude Command: Commit

This command helps you create well-formatted commits with conventional commit messages for your monorepo.

## Usage

```
/commit
/commit --no-verify
```

## What This Command Does

1.  Unless `--no-verify` is specified, runs pre-commit checks:
    - `pnpm lint` to ensure code quality
    - If checks fail, ask if the user wants to proceed or fix issues first.
2.  Checks staged files with `git status`.
3.  If no files are staged, automatically stage all modified and new files with `git add .`.
4.  **Dynamically determines the commit scope** by analyzing staged file paths:

    ### Scope Detection Rules
    - **Scan the `apps/` directory**: Every direct subdirectory under `apps/` is a valid scope (e.g., `apps/admin` → `admin`, `apps/dashboard` → `dashboard`, `apps/api` → `api`). Do NOT hardcode app names — always discover them from the filesystem.
    - **Scan the `packages/` directory**: Every direct subdirectory under `packages/` is a valid scope (e.g., `packages/ui` → `ui`, `packages/types` → `types`, `packages/config` → `config`).
    - **Root scope**: Files outside `apps/` and `packages/` (e.g., `package.json`, `turbo.json`, `.github/`, `README.md`) use the scope `repo`.
    - **Mixed scopes**: If staged changes span multiple scopes, **strongly recommend splitting** into separate scoped commits. Help the user stage and commit each scope individually.

    To discover valid scopes, run:

    ```bash
    ls -d apps/*/ packages/*/ 2>/dev/null | xargs -I {} basename {}
    ```

5.  Performs `git diff --staged` to understand the changes.
6.  Analyzes the diff for multiple distinct logical changes within a single scope.
7.  If multiple distinct changes are detected, suggests breaking into smaller atomic commits.
8.  Creates a commit message using: **`<type>(<scope>): <description>`**
9.  All commit messages **must be written in English**.
10. **Never** include Claude Code metadata in commits — strip any `🤖 Generated with Claude Code`, `Co-Authored-By: Claude <noreply@anthropic.com>`, or similar tags.

## Commit Message Format

```
<type>(<scope>): <description>

- <detail 1>
- <detail 2>
- <detail N>
```

The first line is the subject. After a blank line, add a body with bullet points describing what was done.

### Types

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation only changes                              |
| `style`    | Formatting, missing semicolons, etc (no logic)          |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or correcting tests                              |
| `chore`    | Build process, tooling, dependencies, CI, etc           |

### Rules

- **Present tense, imperative mood**: "add feature" not "added feature"
- **First line under 72 characters**
- **No emojis**
- **Lowercase description** (no capital letter after the colon)
- **No period** at the end of the description

## Splitting Criteria

Split commits when staged changes include:

1. **Different scopes** — changes across multiple `apps/` or `packages/` directories. Always commit these separately.
2. **Different concerns** — unrelated modifications within the same scope.
3. **Different types** — mixing `feat`, `fix`, `refactor`, etc.
4. **Large diffs** — changes that are clearer when broken down logically.

When splitting:

- Help the user selectively stage files with `git add <path>`.
- Commit each group separately with the appropriate scoped message.
- Repeat until all changes are committed.

## Workflow

```
1. Run lint (unless --no-verify)
2. Check git status
3. If nothing staged → git add .
4. Discover scopes from apps/ and packages/ directories
5. Map each staged file to its scope
6. If multiple scopes → recommend split, help stage per scope
7. For each scope group:
   a. git diff --staged (for that scope)
   b. Analyze: single or multiple logical changes?
   c. If multiple logical changes → recommend further split
   d. Generate commit message with subject and bullet point body
   e. Execute: git commit -m "<subject>" -m "<bullet points body>" --no-verify
8. Confirm success
```

## Examples

Good commit messages:

```
feat(backend): add user authentication endpoint

- Create auth controller with login and register routes
- Add JWT token generation in auth service
- Add password hashing utility
```

```
fix(dashboard): resolve memory leak in chart rendering

- Dispose chart instance on component unmount
- Clear interval timers in useEffect cleanup
```

```
refactor(backend): simplify error handling in middleware

- Replace nested try/catch with early returns
- Extract validation logic to dedicated service
```

Example of split workflow:

```
Detected changes in: apps/api, packages/types, root files

Recommended commits:
  1. feat(types): add new payment type definitions
  2. feat(api): implement payment processing endpoint
  3. chore(repo): update dependencies in root package.json
```

## Command Options

- `--no-verify`: Skip pre-commit checks (lint)

## Important Notes

- Pre-commit checks (`pnpm lint`) run by default to ensure code quality.
- Scope discovery is **always dynamic** — never assume which apps or packages exist.
- Always review the diff before generating the commit message to ensure accuracy.
- **Never** include Claude Code metadata (`🤖 Generated with Claude Code`, `Co-Authored-By: Claude <noreply@anthropic.com>`) in any commit message or commit body.
- When in doubt about scope or type, ask the user before committing.
