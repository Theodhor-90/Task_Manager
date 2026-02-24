## Objective

Write comprehensive integration tests for all board retrieval and column CRUD endpoints, following the exact test patterns established in Phase 1's `project.routes.test.ts`.

## Deliverables

### New file: `packages/server/test/routes/board.routes.test.ts`

Create an integration test file using the same infrastructure as `project.routes.test.ts`:

**Test setup (follow existing patterns exactly):**
- Import `httpRequest` helper, `setupTestDb`, `teardownTestDb`, `clearCollections`, `seedAdminUser`, `getAuthToken`, `normalizeId`, `canBindTcpPort` from test helpers
- `beforeAll`: call `setupTestDb()`, `buildApp()`, `app.ready()`
- `beforeEach`: call `clearCollections()`, `seedAdminUser()`, get auth token
- `afterAll`: call `app.close()`, `teardownTestDb()`
- Helper function to create a project (via `POST /api/projects`) and extract the auto-created board ID for use in column tests

**Test suites:**

### GET /api/projects/:projectId/board
- Returns board with columns sorted by position (200)
- Returns 404 for non-existent project ID
- Returns 400 for invalid projectId format
- Returns 401 without auth token

### POST /api/boards/:boardId/columns
- Adds a column at the end with correct position (201)
- Returns 400 when name is missing
- Returns 400 when name is empty string
- Returns 404 for non-existent board
- Returns 401 without auth token
- New column appears in subsequent board fetch

### PUT /api/boards/:boardId/columns/:columnId
- Renames a column successfully (200)
- Returns 400 when name is missing or empty
- Returns 404 for non-existent board
- Returns 404 for non-existent column
- Returns 401 without auth token
- **Task statuses are NOT updated when column is renamed** (create a task with status matching old column name, rename column, verify task status unchanged)

### DELETE /api/boards/:boardId/columns/:columnId
- Deletes a column with no tasks (200)
- Returns 400 when tasks exist with matching status
- Reindexes remaining column positions after delete (positions are contiguous 0-based)
- Returns 404 for non-existent board
- Returns 404 for non-existent column
- Returns 401 without auth token

### PUT /api/boards/:boardId/columns/reorder
- Reorders columns and updates all positions correctly (200)
- Returns 400 for missing columnIds
- Returns 400 for non-array columnIds
- Returns 400 when columnIds don't match existing columns (extra, missing, or duplicate IDs)
- Returns 404 for non-existent board
- Returns 401 without auth token
- Positions persist correctly in subsequent board fetch

## Implementation Constraints

- Follow the **exact** test patterns from `project.routes.test.ts` — same helper usage, same assertion style, same setup/teardown
- Use `httpRequest` helper for all HTTP calls (not raw supertest)
- Use `normalizeId` for ID comparisons where applicable
- For tests that need tasks (delete guard, rename no-cascade), create tasks directly via `TaskModel.create()` since Task routes may not exist yet
- Each test should be independent — `beforeEach` clears all collections

## Dependencies

- Tasks t01–t05 must be complete — all board and column endpoints are implemented
- Phase 1 test infrastructure: `setupTestDb`, `teardownTestDb`, `clearCollections`, `seedAdminUser`, `getAuthToken`, `httpRequest`, `normalizeId`, `canBindTcpPort` helpers
- Existing models: `TaskModel` (for creating test tasks in guard/cascade tests)

## Verification

1. All tests pass when run via `npm test` from the server package
2. No regressions — existing `project.routes.test.ts` and `auth.routes.test.ts` tests continue to pass
3. Test coverage includes all happy paths, error cases (400, 401, 404), and business logic (task guard, position reindexing, no-cascade rename)
4. Tests are isolated — each test can run independently