# Task 6: Write integration tests

## Objective

Create comprehensive integration tests for all six task endpoints, following established test conventions, verifying every endpoint's success and error paths, position integrity, cascade behavior, filtering, and sorting.

## Deliverables

### New file: `packages/server/test/routes/task.routes.test.ts`

#### Setup/Teardown

- Use existing test helpers: `setupTestDb`, `clearCollections`, `teardownTestDb`, `seedAdminUser`
- Use `supertest` or `app.inject` pattern consistent with existing test files (e.g., `project.routes.test.ts`, `board.routes.test.ts`)
- **Helper functions**:
  - `createProject()` — creates a project via API (which auto-creates a board), returns project and board IDs
  - `createTask(boardId, body)` — creates a task via API, returns the task
  - `getAuthToken()` — returns a valid JWT for the seed admin user

#### Test Suites

**1. POST /api/boards/:boardId/tasks**
- Creates a task with title only → defaults: status = "To Do", priority = "medium", position = 0
- Creates a task with all fields (title, description, priority, dueDate, labels, status)
- Second task in same column → position = 1
- Task in different column → position = 0
- Returns 400 when title is missing
- Returns 400 when status doesn't match any column name
- Returns 404 for non-existent board ID
- Returns 401 without auth token

**2. GET /api/boards/:boardId/tasks**
- Returns all tasks for a board
- Filters by status
- Filters by priority
- Filters by label
- Sorts by createdAt ascending and descending
- Sorts by dueDate ascending and descending
- Combines filter and sort
- Returns empty array for board with no tasks
- Returns 404 for non-existent board

**3. GET /api/tasks/:id**
- Returns task with populated labels (full label objects, not just IDs)
- Returns 404 for non-existent task ID
- Returns 400 for invalid ObjectId format

**4. PUT /api/tasks/:id**
- Updates title
- Updates description
- Updates priority
- Updates dueDate
- Updates labels array
- Returns 400 when no valid fields provided
- Returns 404 for non-existent task

**5. DELETE /api/tasks/:id**
- Deletes task and returns success message `{ data: { message: "Task deleted" } }`
- Cascade deletes associated comments
- Reindexes positions of remaining tasks in the column (contiguous 0-based)
- Returns 404 for non-existent task

**6. PUT /api/tasks/:id/move**
- Moves task to a different column → status and position updated
- Reindexes source column after move out (contiguous 0-based)
- Reindexes destination column after move in
- Reorders within the same column
- Moves to position 0 (beginning of column)
- Moves to end of destination column
- Clamps position to valid range (position beyond end)
- Returns 400 for invalid status (non-existent column name)
- Returns 400 for missing position
- Returns 404 for non-existent task

## Key Constraints

- Follow established test conventions from existing test files (reference `project.routes.test.ts` and `board.routes.test.ts` for patterns)
- Each test should be independent — use `clearCollections` between tests or create fresh data per test
- Verify response shapes match the `{ data: T }` / `{ error: string }` envelope
- Position verification tests should check ALL tasks in the column, not just the moved/deleted one
- Label population tests require creating labels first (via the Labels API from Phase 4 prerequisites or direct model insertion)
- For label filter tests, create labels via `LabelModel.create()` directly if the Labels API isn't available yet

## Dependencies

- **Tasks 1–5** — all task endpoints must be implemented
- **Phase 1 & 2 complete** — project and board/column APIs needed for test setup
- Existing test infrastructure: `setupTestDb`, `clearCollections`, `teardownTestDb`, `seedAdminUser`
- Existing models for direct data setup: `LabelModel`, `CommentModel`

## Verification

1. All tests pass when run via `npm test` from the server package
2. Test file covers all six endpoints with both success and error cases
3. No test contamination — tests pass in any order
4. All response shapes verified against the documented API envelope format