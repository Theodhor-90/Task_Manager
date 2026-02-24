Now I have complete understanding of the codebase patterns. Let me produce the phase specification.

# Phase 3: Tasks API — Specification

## Goal

Deliver the complete Tasks API with six endpoints covering full CRUD, a dedicated move/reorder operation, and query filtering/sorting — enabling task creation with sensible defaults, task updates across all fields, column-aware move with position reindexing in both source and destination columns, cascade delete to comments, and filtered/sorted listing — all backed by comprehensive integration tests that verify every endpoint, edge case, and position integrity constraint.

## Design Decisions

### 1. Position reindexing strategy

When a task is deleted or moved out of a column, remaining tasks in that column are reindexed with contiguous 0-based positions (sorted by their current position). When a task is moved into a column, existing tasks at or after the target position are shifted up by one. This guarantees gapless positions and deterministic ordering.

**Rationale**: Gapless contiguous positions are simpler to reason about than sparse numbering, and the single-user context means no concurrent writes need consideration. Reindexing the full column (not just adjacent tasks) eliminates the risk of accumulated position drift.

### 2. Move endpoint handles both cross-column and within-column moves

`PUT /api/tasks/:id/move` accepts `{ status?: string, position: number }`. If `status` is omitted or matches the current status, it is a within-column reorder. If `status` differs, the task is removed from the source column and inserted at the target position in the destination column. Both columns are reindexed.

**Rationale**: A single endpoint simplifies the client (drag-and-drop produces one call regardless of direction). The status field is optional to support pure reorder without requiring the client to re-send the current column name.

### 3. Default values on task creation

When creating a task, `status` defaults to the first column name on the board (position 0, typically "To Do"), `priority` defaults to `"medium"`, and `position` is set to one past the current maximum position in the target column (appending to the end).

**Rationale**: The master plan specifies these defaults. Defaulting status to the first column (by position) rather than a hardcoded string respects boards where columns have been reordered or renamed.

### 4. Status validated against board columns

On task creation and on move, the provided `status` value is validated against the board's current column names. If it doesn't match any column, a 400 error is returned.

**Rationale**: Since `status` is the coupling between tasks and columns (by name, not ObjectId), accepting an arbitrary string would create orphaned tasks that appear in no column on the board.

### 5. Query filtering approach

`GET /api/boards/:boardId/tasks` builds a Mongoose filter object from query parameters (`status`, `priority`, `label`). The `label` parameter filters for tasks whose `labels` array contains the given label ID. Sorting uses `sort` (field name) and `order` (asc/desc) query parameters applied via Mongoose `.sort()`.

**Rationale**: Server-side filtering keeps the API consistent and avoids returning unbounded result sets. The filter-by-label uses Mongoose's `$in` operator on the array field, which is efficient with the existing index on `board`.

### 6. Label population on single-task GET

`GET /api/tasks/:id` returns the task with its `labels` array populated (full label objects instead of bare ObjectIds). The list endpoint (`GET /api/boards/:boardId/tasks`) does **not** populate labels to keep the response lean.

**Rationale**: The detail view needs label display data; the board view can use label IDs and resolve them client-side from a separately-fetched project labels list.

### 7. Route file organization

All task routes are defined in a single file `packages/server/src/routes/task.routes.ts`, exported as two Fastify plugins: `boardTaskRoutes` (mounted at `/api/boards` for board-scoped endpoints) and `taskRoutes` (mounted at `/api/tasks` for task-ID-scoped endpoints).

**Rationale**: Follows the established pattern where `board.routes.ts` exports both `boardRoutes` and `columnRoutes` with different prefixes.

### 8. Ownership verification

All task operations verify that the authenticated user owns the project associated with the board/task. This is done by looking up the board, then checking `ProjectModel.findOne({ _id: board.project, owner: request.user.id })`.

**Rationale**: Consistent with the ownership check pattern used in project and board/column routes.

## Tasks

### Task 1: Create task route file with validation helpers and route registration

**Deliverables:**
- New file `packages/server/src/routes/task.routes.ts` with:
  - `isValidObjectId()` utility (same pattern as other route files)
  - Type guard `isValidCreateTaskBody()` — validates `title` is a non-empty string; `description`, `priority`, `dueDate`, `labels`, `status` are optional with correct types; `priority` must be one of `PRIORITIES` if provided
  - Type guard `isValidUpdateTaskBody()` — validates at least one updatable field is present (`title`, `description`, `priority`, `dueDate`, `labels`) with correct types
  - Type guard `isValidMoveTaskBody()` — validates `position` is a non-negative integer; `status` is an optional non-empty string
  - Two exported Fastify plugins: `boardTaskRoutes` and `taskRoutes` (empty handlers, to be filled in subsequent tasks)
- Updated `packages/server/src/app.ts` to import and register both plugins (`boardTaskRoutes` at `/api/boards`, `taskRoutes` at `/api/tasks`)

### Task 2: Implement task creation endpoint

**Deliverables:**
- `POST /api/boards/:boardId/tasks` handler in `boardTaskRoutes`:
  - Validate `boardId` is a valid ObjectId
  - Validate request body via `isValidCreateTaskBody()`
  - Look up the board, verify project ownership
  - Resolve `status`: use provided value or default to the name of the column with position 0; validate that the status matches an existing column name
  - Set `priority` to provided value or `"medium"`
  - Compute `position` as the count of existing tasks with the same `board` and `status` (appends to end)
  - Set `project` from the board's `project` reference
  - Create the task via `TaskModel.create()`
  - Return `201` with `{ data: task }`
  - Return `400` for missing title, invalid board ID, or invalid status
  - Return `404` for non-existent board

### Task 3: Implement task list endpoint with filtering and sorting

**Deliverables:**
- `GET /api/boards/:boardId/tasks` handler in `boardTaskRoutes`:
  - Validate `boardId` and verify project ownership
  - Build Mongoose filter: `{ board: boardId }` plus optional `status`, `priority`, and `label` (as `{ labels: labelId }`) from query parameters
  - Build sort object from `sort` (default `"position"`) and `order` (`"asc"` = 1, `"desc"` = -1, default `"asc"`) query parameters; allowed sort fields: `createdAt`, `dueDate`, `position`
  - Execute query and return `200` with `{ data: tasks }`
  - Return `404` for non-existent board

### Task 4: Implement get, update, and delete task endpoints

**Deliverables:**
- `GET /api/tasks/:id` handler in `taskRoutes`:
  - Validate task ID, look up task, verify project ownership via board
  - Populate `labels` field with full label documents
  - Return `200` with `{ data: task }`
  - Return `404` for non-existent task

- `PUT /api/tasks/:id` handler in `taskRoutes`:
  - Validate task ID and request body via `isValidUpdateTaskBody()`
  - Look up task, verify project ownership via board
  - Apply updates using `findOneAndUpdate` with `{ new: true }`
  - Return `200` with `{ data: updatedTask }`
  - Return `400` for invalid body, `404` for non-existent task

- `DELETE /api/tasks/:id` handler in `taskRoutes`:
  - Validate task ID, look up task, verify project ownership via board
  - Delete all comments referencing this task (`CommentModel.deleteMany({ task: id })`)
  - Delete the task
  - Reindex positions of remaining tasks in the same column: query all tasks with the same `board` and `status`, sort by `position`, and update each to have contiguous 0-based positions
  - Return `200` with `{ data: { message: "Task deleted" } }`
  - Return `404` for non-existent task

### Task 5: Implement task move endpoint

**Deliverables:**
- `PUT /api/tasks/:id/move` handler in `taskRoutes`:
  - Validate task ID and request body via `isValidMoveTaskBody()`
  - Look up task, verify project ownership via board
  - Look up the board to validate that the target `status` (if provided) matches an existing column name
  - Determine if this is a cross-column move or within-column reorder
  - **Cross-column move**:
    1. Remove task from source column: delete it from the position list, reindex remaining tasks in source column (contiguous 0-based)
    2. Insert into destination column: shift tasks at `position >= target` up by one, set task's `status` and `position`
    3. Save task
  - **Within-column reorder**:
    1. Remove task from its current position conceptually
    2. Insert at the new position: shift other tasks as needed, update task's `position`
    3. Save task
  - Clamp target position to valid range: `0` to `columnTaskCount` (inclusive, allowing append)
  - Return `200` with `{ data: updatedTask }`
  - Return `400` for invalid status (not a column name) or invalid body
  - Return `404` for non-existent task

### Task 6: Write integration tests

**Deliverables:**
- New file `packages/server/test/routes/task.routes.test.ts` following the established test conventions:
  - Standard setup/teardown (setupTestDb, clearCollections, teardownTestDb, seedAdminUser)
  - `httpRequest` helper (supertest with app.inject fallback)
  - Helper to create a project (which auto-creates board with default columns) and extract board ID
  - Helper to create a task on a board

- **Test suites covering:**
  - **POST /api/boards/:boardId/tasks**:
    - Creates a task with title only, verifying defaults (status = "To Do", priority = "medium", position = 0)
    - Creates a task with all fields (title, description, priority, dueDate, labels, status)
    - Second task in same column gets position 1
    - Task in different column gets position 0
    - Returns 400 when title is missing
    - Returns 400 when status doesn't match any column name
    - Returns 404 for non-existent board ID
    - Returns 401 without auth token
  - **GET /api/boards/:boardId/tasks**:
    - Returns all tasks for a board
    - Filters by status
    - Filters by priority
    - Filters by label
    - Sorts by createdAt ascending and descending
    - Sorts by dueDate ascending and descending
    - Combines filter and sort
    - Returns empty array for board with no tasks
    - Returns 404 for non-existent board
  - **GET /api/tasks/:id**:
    - Returns task with populated labels
    - Returns 404 for non-existent task ID
    - Returns 400 for invalid ObjectId
  - **PUT /api/tasks/:id**:
    - Updates title
    - Updates description
    - Updates priority
    - Updates dueDate
    - Updates labels array
    - Returns 400 when no valid fields provided
    - Returns 404 for non-existent task
  - **DELETE /api/tasks/:id**:
    - Deletes task and returns success message
    - Cascade deletes associated comments
    - Reindexes positions of remaining tasks in the column
    - Returns 404 for non-existent task
  - **PUT /api/tasks/:id/move**:
    - Moves task to a different column, verifying status and position update
    - Reindexes source column after move out
    - Reindexes destination column after move in
    - Reorders within the same column
    - Moves to position 0 (beginning)
    - Moves to end of destination column
    - Clamps position to valid range
    - Returns 400 for invalid status (non-existent column name)
    - Returns 400 for missing position
    - Returns 404 for non-existent task

## Exit Criteria

1. `POST /api/boards/:boardId/tasks` creates a task with correct defaults (`status` = first column name, `priority` = `"medium"`, `position` = end of column) and returns `201` with `{ data: task }`
2. `GET /api/boards/:boardId/tasks` returns all tasks for a board and correctly filters by `status`, `priority`, and `label` query parameters
3. `GET /api/boards/:boardId/tasks` correctly sorts results by `createdAt` and `dueDate` in both ascending and descending order
4. `GET /api/tasks/:id` returns a single task with its `labels` array populated with full label documents
5. `PUT /api/tasks/:id` updates any combination of `title`, `description`, `priority`, `dueDate`, and `labels` and returns the updated task
6. `DELETE /api/tasks/:id` removes the task, cascade-deletes all associated comments, and reindexes positions of remaining tasks in the same column to be contiguous and 0-based
7. `PUT /api/tasks/:id/move` moves a task to a different column (updating `status` and `position`) and reindexes positions in both source and destination columns
8. `PUT /api/tasks/:id/move` reorders a task within the same column and updates positions correctly
9. All endpoints return `400` for invalid input, `401` for missing/invalid auth, and `404` for non-existent resources, with `{ error: string }` response envelope
10. All integration tests in `packages/server/test/routes/task.routes.test.ts` pass when run via `npm test` from the server package
11. Routes are registered in `app.ts` and accessible at the documented paths

## Dependencies

- **Phase 1 (Projects API)** — complete: project CRUD and auto-board-creation are needed to set up test fixtures and to resolve board→project ownership
- **Phase 2 (Boards & Columns API)** — complete: board/column retrieval is needed to validate task status against column names, and column routes must exist at their registered paths
- **Milestone 1 infrastructure** — Mongoose models (`Task`, `Comment`, `Label`, `Board`, `Project`), database connection, JWT auth middleware, seed user, shared types (`Priority`, `PRIORITIES`, `DEFAULT_COLUMNS`), and test helpers (`setupTestDb`, `clearCollections`, `teardownTestDb`) must all be in place

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/server/src/routes/task.routes.ts` | Create | Task route handlers with validation helpers, two exported Fastify plugins |
| `packages/server/src/app.ts` | Modify | Register `boardTaskRoutes` at `/api/boards` and `taskRoutes` at `/api/tasks` |
| `packages/server/test/routes/task.routes.test.ts` | Create | Integration tests for all six task endpoints |