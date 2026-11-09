# Start Task

This command sets up your local environment for working on a ClickUp task.

## Usage

```
/start-task US-42
```

## Arguments

- `$ARGUMENTS` — The user story ID (e.g., `APP-13`, `APP-42`)

## What This Command Does

1. **Search ClickUp**: Use the `clickup_search` MCP tool to find the task containing `$ARGUMENTS` in its title within the CertiDoc space (Workspace ID: `, Space ID: `).
2. **Extract task info**:
   - **Task ID**: The internal ClickUp task ID (e.g., `86a1b2c3d`)
   - **Title**: The full task title (e.g., `APP-28: Criação CRUD de usuarios`)
   - **Description**: The task description/content
   - **Tags**: The tags assigned to the task
3. **Determine branch type from tags**:
   - Tag `feature` → `feature/`
   - Tag `bug` → `fix/`
   - Tag `hotfix` → `hotfix/`
   - Tag `style` → `style/`
   - If no matching tag is found, ask the user which type to use.
4. **Create the branch** with the format: `<type>/CU-<clickup-task-id>/<us-id-slug>`
   - The ClickUp task ID must always be prefixed with `CU-` (e.g., `CU-86a1b2c3d`).
   - The slug is the US ID + title translated to English, lowercased, spaces replaced with hyphens, special characters removed.
   - Example: `feature/CU-86a1b2c3d/app-28-criacao-crud-de-usuarios`
5. **Create `Task.md`** at the project root with the task details:

   ```markdown
   # <Task Title>

   **ClickUp ID**: CU-<task-id>
   **Link**: <clickup-url>
   **Priority**: <priority>
   **Tags**: <tags>

   ## Description

   <task description content>
   ```

6. **Update ClickUp task**:
   - Set the task status to **"In Progress"** using `clickup_update_task`.
   - If the task has **no assignees**, use `clickup_get_workspace_members` to find the current user and assign them to the task.
7. **Checkout** to the new branch.
8. Confirm to the user that everything is set up and show the branch name.

## Important Notes

- The `Task.md` file is in `.gitignore` — do NOT commit it.
- The branch name slug must be in **English**. If the ClickUp title is in Portuguese, translate it.
- Always use the **full tag name** for the branch type prefix (e.g., `feature/`, not `feat/`).
- If the task is not found in ClickUp, inform the user and do not create anything.
- If multiple tasks match, list them and ask the user to pick one.
