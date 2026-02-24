Now I have all the context needed to produce a comprehensive phase specification. Here is the document:

# Phase 2: Boards & Columns API — Specification

## Goal

Implement the board retrieval endpoint and full CRUD for column management — including adding, renaming, deleting (with a task-existence guard), and reordering columns — with integration tests that verify every endpoint, edge case, and data integrity constraint, following the route handler patterns, validation conventions, and test infrastructure established in Phase 1.

## Design Decisions

### 1. Route file structure

Board and column routes will be implemented in a single route file `packages/server/src/routes/board.routes.ts`, registered in `app.ts` under two prefixes:
- `/api/projects` — for the board-fetch-by-project endpoint (`GET /api/projects/:projectId/board`)
- `/api/boards` — for column CRUD endpoints

Since Fastify allows registering the same plugin multiple times with different prefixes, and the board fetch route lives under the projects path while column routes live under the boards path, the file will export two separate `FastifyPluginAsync` functions: `boardRoutes` (for project-scoped board retrieval) and `columnRoutes` (for board-scoped column operations).

### 2. Column deletion guard checks tasks by status string

The `DELETE /api/boards/:boardId/columns/:columnId` endpoint must check whether any tasks have a `status` field matching the column's `name`. This uses a query against the Task collection: `TaskModel.countDocuments({ board: boardId, status: column.name })`. If count > 0, return 400 with an error message explaining that tasks must be moved first.

### 3. Column rename does NOT cascade to task statuses

Renaming a column updates only the column's `name` field in the Board subdocument. It does **not** update the `status` field of existing tasks. This is a deliberate decision aligned with the milestone spec's risk note: "Renaming a column must be tested to understand whether it orphans existing tasks." The rename-cascade behavior will be documented and tested — tests will verify that tasks retain their original status after a column rename. This keeps Phase 2 simple; a future enhancement could add status migration.

### 4. Reorder endpoint accepts a complete ordered array of column IDs

The `PUT /api/boards/:boardId/columns/reorder` endpoint accepts `{ "columnIds": ["id1", "id2", ...] }` per the master plan. Validation requires:
- The array must contain exactly the same set of column IDs that exist on the board (no missing, no extra, no duplicates)
- Each ID must match an existing column subdocument
- Position values are assigned 0-based based on array index order

### 5. Board ownership verification via project lookup

Board endpoints must verify the authenticated user owns the associated project. For `GET /api/projects/:projectId/board`, the project ownership is verified directly. For column endpoints under `/api/boards/:boardId`, the board is fetched, then the associated project is looked up to verify ownership. This prevents unauthorized access to boards/columns.

### 6. Validation and response patterns follow Phase 1 conventions

- Inline type guard functions for request body validation (e.g., `isValidCreateColumnBody`)
- `mongoose.Types.ObjectId.isValid()` for ID parameter validation
- Response envelope: `{ data: T }` for success, `{ error: string }` for errors
- HTTP status codes: 200 (success), 201 (created), 400 (bad request/validation), 401 (unauthorized), 404 (not found)
- TypeScript type assertions consistent with Phase 1 patterns (cast through `unknown`)

## Tasks

### Task 1: Board retrieval endpoint and route registration

**Deliverables:**
- New file `packages/server/src/routes/board.routes.ts` containing the board retrieval route plugin
- `GET /api/projects/:projectId/board` handler that:
  - Validates `:projectId` is a valid ObjectId
  - Verifies the project exists and is owned by the authenticated user
  - Fetches the board with `BoardModel.findOne({ project: projectId })`
  - Returns columns sorted by `position` (ascending)
  - Returns `{ data: board }` with 200, or 404 if project/board not found
- Route registered in `app.ts` — the board retrieval route is nested within the existing `/api/projects` prefix (registered as a sub-plugin or via a separate registration)

### Task 2: Column add endpoint

**Deliverables:**
- `POST /api/boards/:boardId/columns` handler that:
  - Validates `:boardId` is a valid ObjectId
  - Validates request body has a `name` field (non-empty string)
  - Fetches the board and verifies ownership via the associated project
  - Calculates position as `board.columns.length` (append to end)
  - Pushes the new column subdocument to `board.columns`
  - Saves the board and returns `{ data: newColumn }` with 201
  - Returns 400 for invalid/missing name, 404 for non-existent board
- Route added to the column routes plugin in `board.routes.ts`
- Column routes registered in `app.ts` under `/api/boards` prefix

### Task 3: Column rename endpoint

**Deliverables:**
- `PUT /api/boards/:boardId/columns/:columnId` handler that:
  - Validates both `:boardId` and `:columnId` are valid ObjectIds
  - Validates request body has a `name` field (non-empty string)
  - Fetches the board and verifies ownership
  - Finds the column subdocument by `_id` within `board.columns`
  - Updates the column's `name` only (does not touch task statuses)
  - Saves the board and returns `{ data: updatedColumn }` with 200
  - Returns 400 for invalid/missing name, 404 for non-existent board or column
- Route added to column routes plugin in `board.routes.ts`

### Task 4: Column delete endpoint with task guard

**Deliverables:**
- `DELETE /api/boards/:boardId/columns/:columnId` handler that:
  - Validates both `:boardId` and `:columnId` are valid ObjectIds
  - Fetches the board and verifies ownership
  - Finds the column subdocument by `_id`
  - Checks `TaskModel.countDocuments({ board: boardId, status: column.name })`
  - If tasks exist, returns 400 with `{ error: "Cannot delete column that contains tasks" }`
  - If no tasks, removes the column subdocument from `board.columns`
  - Reindexes remaining column positions (0-based contiguous)
  - Saves the board and returns `{ data: { message: "Column deleted" } }` with 200
  - Returns 404 for non-existent board or column
- Route added to column routes plugin in `board.routes.ts`

### Task 5: Column reorder endpoint

**Deliverables:**
- `PUT /api/boards/:boardId/columns/reorder` handler that:
  - Validates `:boardId` is a valid ObjectId
  - Validates request body has a `columnIds` array of strings
  - Fetches the board and verifies ownership
  - Validates that `columnIds` contains exactly the same IDs as the existing columns (no missing, no extra, no duplicates)
  - Updates each column's `position` to match its index in the `columnIds` array
  - Saves the board and returns `{ data: board }` with 200 (board with reordered columns)
  - Returns 400 for invalid payload or mismatched column IDs, 404 for non-existent board
- Route added to column routes plugin in `board.routes.ts`
- **Note:** This route must be registered before `/:columnId` routes to avoid Fastify treating "reorder" as a column ID parameter

### Task 6: Integration tests for all board and column endpoints

**Deliverables:**
- New file `packages/server/test/routes/board.routes.test.ts` following the exact test patterns from `project.routes.test.ts`:
  - Same `httpRequest` helper, `seedAdminUser`, `getAuthToken`, `normalizeId`, `canBindTcpPort` utilities
  - `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`
  - `beforeEach`: `clearCollections()`, `seedAdminUser()`, get token
  - `afterAll`: `app.close()`, `teardownTestDb()`
  - Helper function to create a project (and its auto-created board) for use in tests

- Test coverage for `GET /api/projects/:projectId/board`:
  - Returns board with columns sorted by position
  - Returns 404 for non-existent project
  - Returns 400 for invalid projectId format
  - Returns 401 without auth token

- Test coverage for `POST /api/boards/:boardId/columns`:
  - Adds a column at the end (position = existing column count)
  - Returns 400 when name is missing or empty
  - Returns 404 for non-existent board
  - Returns 401 without auth token
  - Verifies the new column appears in subsequent board fetch

- Test coverage for `PUT /api/boards/:boardId/columns/:columnId`:
  - Renames a column successfully
  - Returns 400 when name is missing or empty
  - Returns 404 for non-existent board or column
  - Returns 401 without auth token
  - Verifies task statuses are NOT updated when column is renamed

- Test coverage for `DELETE /api/boards/:boardId/columns/:columnId`:
  - Deletes a column with no tasks (succeeds)
  - Returns 400 when tasks exist with matching status
  - Reindexes remaining column positions after delete
  - Returns 404 for non-existent board or column
  - Returns 401 without auth token

- Test coverage for `PUT /api/boards/:boardId/columns/reorder`:
  - Reorders columns and updates all positions correctly
  - Returns 400 for missing/invalid columnIds array
  - Returns 400 when columnIds don't match existing columns (extra, missing, or duplicate IDs)
  - Returns 404 for non-existent board
  - Returns 401 without auth token
  - Verifies positions persist correctly in subsequent board fetch

## Exit Criteria

1. `GET /api/projects/:projectId/board` returns the board with columns sorted by ascending position, wrapped in `{ data: board }`
2. `POST /api/boards/:boardId/columns` creates a new column appended at the end with correct position value and returns 201
3. `PUT /api/boards/:boardId/columns/:columnId` renames a column without affecting task statuses and returns 200
4. `DELETE /api/boards/:boardId/columns/:columnId` removes an empty column, reindexes remaining positions, and returns 200
5. `DELETE /api/boards/:boardId/columns/:columnId` returns 400 when tasks exist with a status matching the column's name
6. `PUT /api/boards/:boardId/columns/reorder` accepts an ordered array of column IDs and updates all position values to match array indices
7. All endpoints return 401 without a valid JWT bearer token
8. All endpoints return 404 for non-existent board or column IDs
9. All endpoints return 400 for invalid ObjectId formats and missing/invalid request bodies
10. All integration tests in `packages/server/test/routes/board.routes.test.ts` pass when run via `npm test` from the server package
11. No regressions — existing project route tests continue to pass

## Dependencies

- **Phase 1 (Projects API)** must be complete: project creation auto-creates a board with default columns, which all board/column tests depend on
- **Milestone 1 infrastructure**: Mongoose models (`BoardModel`, `TaskModel`, `ProjectModel`), JWT auth middleware, `buildApp()` factory, shared types and constants (`DEFAULT_COLUMNS`), test helpers (`setupTestDb`, `teardownTestDb`, `clearCollections`), and `UserModel` with `hashPassword`
- **MongoDB** running locally on `mongodb://localhost:27017` for both development and test databases

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/server/src/routes/board.routes.ts` | Create | Board retrieval and column CRUD route handlers |
| `packages/server/src/app.ts` | Modify | Register board and column route plugins with appropriate prefixes |
| `packages/server/test/routes/board.routes.test.ts` | Create | Integration tests for all board and column endpoints |