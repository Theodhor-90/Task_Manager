# Task 4: Implement get, update, and delete task endpoints

## Objective

Implement `GET /api/tasks/:id`, `PUT /api/tasks/:id`, and `DELETE /api/tasks/:id` — covering single-task retrieval with label population, field updates, and cascade delete with position reindexing.

## Deliverables

### Handler 1: `GET /:id` in `taskRoutes` plugin

1. **Validate** task ID is a valid ObjectId (400 if not)
2. **Look up the task** via `TaskModel.findById(id)` (404 if not found)
3. **Verify project ownership** — look up the board, then check project owner
4. **Populate `labels`** — call `.populate('labels')` to return full label documents instead of bare ObjectIds
5. **Return `200`** with `{ data: task }`

### Handler 2: `PUT /:id` in `taskRoutes` plugin

1. **Validate** task ID and request body via `isValidUpdateTaskBody()` (400 if invalid)
2. **Look up the task** (404 if not found)
3. **Verify project ownership**
4. **Apply updates** using `TaskModel.findOneAndUpdate({ _id: id }, updateFields, { new: true })` — only include fields present in the body (`title`, `description`, `priority`, `dueDate`, `labels`)
5. **Return `200`** with `{ data: updatedTask }`

### Handler 3: `DELETE /:id` in `taskRoutes` plugin

1. **Validate** task ID (400 if invalid)
2. **Look up the task** (404 if not found), save its `board` and `status` for reindexing
3. **Verify project ownership**
4. **Cascade delete comments**: `CommentModel.deleteMany({ task: id })`
5. **Delete the task**: `TaskModel.findByIdAndDelete(id)`
6. **Reindex positions** in the same column:
   - Query all remaining tasks with the same `board` and `status`, sorted by `position`
   - Update each task's position to its array index (0-based contiguous)
7. **Return `200`** with `{ data: { message: "Task deleted" } }`

### Error responses (all three endpoints)

- `400` — invalid ObjectId, invalid body (PUT)
- `401` — missing/invalid auth
- `404` — task not found

## Key Constraints

- `GET /:id` populates `labels`; `PUT /:id` does NOT need to populate labels in the response
- `PUT /:id` does NOT allow updating `status` or `position` directly — those are managed via the move endpoint
- `DELETE /:id` must cascade to comments BEFORE deleting the task
- Position reindexing after delete must result in contiguous 0-based positions with no gaps

## Dependencies

- **Task 1** — route file and registration
- **Task 2** — task creation (for setting up test data)
- Existing models: `TaskModel`, `CommentModel`, `BoardModel`, `ProjectModel`, `LabelModel`

## Verification

1. `GET` returns task with fully populated label objects (not just IDs)
2. `GET` returns 404 for non-existent task, 400 for invalid ObjectId
3. `PUT` updates individual fields (title, description, priority, dueDate, labels)
4. `PUT` returns 400 when no valid updatable fields provided
5. `PUT` returns 404 for non-existent task
6. `DELETE` removes the task and all its comments from the database
7. After `DELETE`, remaining tasks in the column have contiguous 0-based positions
8. `DELETE` returns 404 for non-existent task