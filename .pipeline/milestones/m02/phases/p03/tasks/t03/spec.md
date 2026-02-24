# Task 3: Implement task list endpoint with filtering and sorting

## Objective

Implement `GET /api/boards/:boardId/tasks` with support for query parameter filtering by status, priority, and label, and sorting by createdAt, dueDate, or position.

## Deliverables

### Handler: `GET /:boardId/tasks` in `boardTaskRoutes` plugin

Implementation in `packages/server/src/routes/task.routes.ts`:

1. **Validate** `boardId` is a valid ObjectId (400 if not)
2. **Look up the board** (404 if not found)
3. **Verify project ownership** (same pattern as other endpoints)
4. **Build Mongoose filter object**:
   - Base filter: `{ board: boardId }`
   - If `status` query param present: add `{ status: queryStatus }`
   - If `priority` query param present: add `{ priority: queryPriority }`
   - If `label` query param present: add `{ labels: labelId }` (Mongoose matches array contains)
5. **Build sort object**:
   - `sort` query param — allowed values: `createdAt`, `dueDate`, `position`; default: `"position"`
   - `order` query param — `"asc"` maps to `1`, `"desc"` maps to `-1`; default: `"asc"`
   - Result: `{ [sortField]: sortDirection }`
6. **Execute query**: `TaskModel.find(filter).sort(sortObj)`
7. **Return `200`** with `{ data: tasks }`

### Error responses

- `400` — invalid boardId
- `404` — board not found
- `401` — missing/invalid auth

## Key Constraints

- Labels are NOT populated on the list endpoint (keep response lean)
- Default sort is by `position` ascending (natural column order)
- The `label` filter uses the label's ObjectId and matches against the `labels` array field
- Empty results return `{ data: [] }`, not 404

## Dependencies

- **Task 1** — route file and registration
- **Task 2** — task creation must work for testing purposes (tasks need to exist to list them)
- Existing models: `BoardModel`, `TaskModel`, `ProjectModel`

## Verification

1. Returns all tasks for a board when no filters applied
2. Filters by `status` returns only tasks in that column
3. Filters by `priority` returns only tasks with that priority
4. Filters by `label` returns only tasks containing that label ID
5. Sorting by `createdAt` ascending and descending works correctly
6. Sorting by `dueDate` ascending and descending works correctly
7. Combining filter + sort produces correct results
8. Empty board returns `{ data: [] }`
9. Non-existent board returns 404