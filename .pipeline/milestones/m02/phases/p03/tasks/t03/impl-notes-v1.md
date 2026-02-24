Implemented Task 3 exactly per the locked plan by replacing the list endpoint stub in [task.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/task.routes.ts:160).

What was added in `GET /:boardId/tasks`:
- `boardId` ObjectId validation (`400` on invalid ID)
- Board lookup (`404` if missing)
- Project ownership verification (`404` if unauthorized for board’s project)
- Query parsing for `status`, `priority`, `label`, `sort`, `order`
- Filter building with base `{ board: boardId }` plus optional filters
- Sort building with allowed fields `createdAt|dueDate|position`, default `position`, and order mapping (`desc -> -1`, otherwise `1`)
- Task query execution via `TaskModel.find(filter).sort(sortObj)`
- `200` response with `{ data: tasks }`

Verification commands run and passed:
- `cd packages/server && npx tsc --noEmit`
- `cd packages/server && npm test` (`11` test files, `146` tests passed)
- `npm run build --workspace=packages/server`