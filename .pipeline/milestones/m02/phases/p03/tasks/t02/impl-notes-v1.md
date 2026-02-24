Implemented Task 2 exactly per the locked plan by replacing the `POST /:boardId/tasks` stub in [task.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/task.routes.ts:164) with full logic:

- Validates `boardId` (`400 "Invalid board ID"`)
- Validates body via `isValidCreateTaskBody` (`400 "Title is required"`)
- Loads board (`404 "Board not found"`)
- Verifies ownership via project lookup (`404 "Board not found"`)
- Validates optional `status` against board column names (`400 "Invalid status: does not match any column"`)
- Resolves default `status` from first column by position
- Resolves default `priority` to `"medium"`
- Computes `position` with `TaskModel.countDocuments({ board, status })`
- Creates task with resolved/default values and returns `201 { data: task }`

Verification commands from plan all passed:

1. `cd packages/server && npx tsc --noEmit`
2. `cd packages/server && npm test` (146 tests passed)
3. `npm run build --workspace=packages/server`