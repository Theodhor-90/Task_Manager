# Task 2: Implement task creation endpoint

## Objective

Implement `POST /api/boards/:boardId/tasks` so that tasks can be created on a board with sensible defaults and full validation.

## Deliverables

### Handler: `POST /:boardId/tasks` in `boardTaskRoutes` plugin

Implementation in `packages/server/src/routes/task.routes.ts`:

1. **Validate** `boardId` is a valid ObjectId (400 if not)
2. **Validate** request body via `isValidCreateTaskBody()` (400 if invalid)
3. **Look up the board** via `BoardModel.findById(boardId)` (404 if not found)
4. **Verify project ownership** — find the project by board's `project` ref and check `owner === request.user.id` (401/404 as appropriate)
5. **Resolve `status`**:
   - If provided in body, validate it matches one of the board's column names (400 if not)
   - If not provided, default to the name of the column with `position === 0` (the first column, typically "To Do")
6. **Set `priority`** to provided value or default to `"medium"`
7. **Compute `position`** — count existing tasks with the same `board` and `status` (this appends the new task to the end of the column)
8. **Set `project`** from the board's `project` reference (denormalized field)
9. **Create the task** via `TaskModel.create({ title, description, status, priority, position, dueDate, labels, board: boardId, project })`
10. **Return `201`** with `{ data: task }`

### Error responses

- `400` — missing title, invalid boardId, invalid status (not a column name), invalid body fields
- `401` — missing/invalid auth token
- `404` — board not found

## Key Constraints

- Status is validated against the board's actual column names, NOT hardcoded strings
- Default status uses column position 0, not a hardcoded "To Do" string
- Position is always appended (count of existing tasks in the target column)
- The `project` field is denormalized from the board document

## Dependencies

- **Task 1** — route file and validation helpers must exist; plugins must be registered in `app.ts`
- Existing models: `BoardModel`, `TaskModel`, `ProjectModel`
- Auth middleware must be in place

## Verification

1. Creating a task with only `title` sets status to first column name, priority to "medium", position to 0
2. Creating a second task in the same column sets position to 1
3. Creating a task in a different column sets position to 0 in that column
4. Creating a task with all optional fields stores them correctly
5. Providing an invalid status returns 400
6. Missing title returns 400
7. Non-existent boardId returns 404
8. Missing auth token returns 401