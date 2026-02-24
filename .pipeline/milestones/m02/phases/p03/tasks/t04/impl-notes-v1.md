Implemented Task 4 exactly per the locked plan in [task.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/task.routes.ts):

- Replaced `GET /api/tasks/:id` stub with:
  - ObjectId validation (`400 "Invalid task ID"`)
  - Task lookup + `.populate("labels")`
  - Board + project ownership checks (returns `404 "Task not found"` on not found/unauthorized)
  - `200 { data: task }`

- Replaced `PUT /api/tasks/:id` stub with:
  - ObjectId + body validation (`isValidUpdateTaskBody`)
  - Task lookup and ownership checks
  - Partial update builder for `title`, `description`, `priority`, `dueDate`, `labels`
  - `findOneAndUpdate(..., { new: true })`
  - `200 { data: updatedTask }`

- Replaced `DELETE /api/tasks/:id` stub with:
  - ObjectId validation
  - Task lookup and ownership checks
  - Cascade delete comments (`CommentModel.deleteMany({ task: id })`)
  - Task delete
  - Reindex remaining tasks in same `board` + `status` to contiguous 0-based positions
  - `200 { data: { message: "Task deleted" } }`

- Left `PUT /:id/move` unchanged (still stub), as required.

Dependencies:
- No new dependencies were listed in the locked plan, so none were installed.

Verification run (all pass):
1. `cd packages/server && npx tsc --noEmit`
2. `cd packages/server && npm test` (146 tests passed)
3. `npm run build --workspace=packages/server`