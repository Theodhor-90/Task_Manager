Now let me compare the task spec requirements against what already exists in the test file. Let me check coverage systematically.

The task spec requires tests for:

**GET /api/projects/:projectId/board:**
- Returns board with columns sorted by position (200) - line 183 ✓
- Returns 404 for non-existent project ID - line 212 ✓
- Returns 400 for invalid projectId format - line 224 ✓
- Returns 401 without auth token - line 236 ✓

**POST /api/boards/:boardId/columns:**
- Adds a column at the end with correct position (201) - line 282 ✓
- Returns 400 when name is missing - line 315 ✓
- Returns 400 when name is empty string - line 330 ✓
- Returns 404 for non-existent board - line 360 ✓
- Returns 401 without auth token - line 386 ✓
- New column appears in subsequent board fetch - verified inside test at line 300 ✓

**PUT /api/boards/:boardId/columns/:columnId:**
- Renames a column successfully (200) - line 441 ✓
- Returns 400 when name is missing or empty - lines 478, 494 ✓
- Returns 404 for non-existent board - line 526 ✓
- Returns 404 for non-existent column - line 539 ✓
- Returns 401 without auth token - line 582 ✓
- Task statuses are NOT updated when column is renamed - line 594 ✓

**DELETE /api/boards/:boardId/columns/:columnId:**
- Deletes a column with no tasks (200) - line 620 ✓
- Returns 400 when tasks exist with matching status - line 653 ✓
- Reindexes remaining column positions after delete - line 687 ✓
- Returns 404 for non-existent board - line 717 ✓
- Returns 404 for non-existent column - line 729 ✓
- Returns 401 without auth token - line 769 ✓

**PUT /api/boards/:boardId/columns/reorder:**
- Reorders columns and updates all positions correctly (200) - line 881 ✓
- Returns 400 for missing columnIds - line 938 ✓
- Returns 400 for non-array columnIds - line 953 ✓
- Returns 400 when columnIds don't match existing columns - lines 968, 984, 1000, 1016 ✓
- Returns 404 for non-existent board - line 1032 ✓
- Returns 401 without auth token - line 1058 ✓
- Positions persist correctly in subsequent board fetch - line 907 ✓

All required tests exist and pass. The task is essentially already complete — the test file was built incrementally during tasks t01-t05. Now I need to produce the implementation plan as the task requests.

# Task 6 Implementation Plan: Integration Tests for All Board and Column Endpoints

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/routes/board.routes.test.ts` | Verify (already exists) | Integration tests for all board retrieval and column CRUD endpoints |

**Note**: This file was already created and populated incrementally during tasks t01–t05. All 46 tests exist and pass. The deliverable for this task is to **verify completeness** against the phase spec's required test coverage and confirm there are no gaps or regressions.

## 2. Dependencies

- **Tasks t01–t05 complete**: All board and column endpoints are implemented in `packages/server/src/routes/board.routes.ts`; all routes registered in `packages/server/src/app.ts`; test file exists at `packages/server/test/routes/board.routes.test.ts` with 46 passing tests
- **Phase 1 (Projects API) complete**: `POST /api/projects` auto-creates a Board with 4 default columns — board/column tests depend on this
- **Existing models**: `UserModel`, `hashPassword`, `TaskModel` (imported in test file from `../../src/models/index.js`)
- **Test helpers**: `setupTestDb`, `teardownTestDb`, `clearCollections` (from `../helpers/db.js`)
- **MongoDB**: Running locally on `mongodb://localhost:27017`

## 3. Implementation Details

### 3.1 Current State of `packages/server/test/routes/board.routes.test.ts`

The test file already exists (1095 lines) with complete test infrastructure and all required test suites. Here is the complete inventory:

**Test infrastructure (lines 1–180):**
- Imports: `createServer`, vitest functions, `supertest`, `FastifyInstance`, `buildApp`, `UserModel`, `hashPassword`, `TaskModel`, `setupTestDb`, `teardownTestDb`, `clearCollections`
- `HttpMethod` type alias
- `normalizeId(value: unknown): string` — normalizes ObjectId values for comparison
- `canBindTcpPort(): Promise<boolean>` — checks if supertest can bind a TCP port
- `seedAdminUser(): Promise<void>` — creates the test admin user
- `getAuthToken(): Promise<string>` — logs in and returns JWT token
- `httpRequest(options): Promise<{ body: unknown }>` — dual-mode HTTP helper (supertest or Fastify inject)
- `createProject(name: string): Promise<{ projectId: string; boardId: string }>` — creates a project via API and fetches the auto-created board ID
- `getColumnId(projectId: string, columnIndex: number): Promise<string>` — fetches a specific column's ID by index
- `getColumnIds(projectId: string): Promise<string[]>` — fetches all column IDs in current order
- Lifecycle hooks: `beforeAll` (setupTestDb, buildApp, app.ready, canBindTcpPort), `beforeEach` (clearCollections, seedAdminUser, getAuthToken), `afterAll` (app.close, teardownTestDb)

**Test suites:**

#### `GET /api/projects/:projectId/board` (6 tests, lines 182–279)
1. ✅ returns board with columns sorted by position
2. ✅ returns 404 for non-existent project
3. ✅ returns 400 for invalid projectId format
4. ✅ returns 401 without auth token
5. ✅ board contains correct project reference
6. ✅ board has timestamps

#### `POST /api/boards/:boardId/columns` (8 tests, lines 281–438)
1. ✅ adds a column at the end with correct position (also verifies column appears in subsequent board fetch)
2. ✅ returns 400 when name is missing
3. ✅ returns 400 when name is empty string
4. ✅ returns 400 when name is whitespace only
5. ✅ returns 404 for non-existent boardId
6. ✅ returns 400 for invalid boardId format
7. ✅ returns 401 without auth token
8. ✅ can add multiple columns sequentially

#### `PUT /api/boards/:boardId/columns/:columnId` (10 tests, lines 440–617)
1. ✅ renames a column successfully (also verifies rename persists in board fetch)
2. ✅ returns 400 when name is missing
3. ✅ returns 400 when name is empty string
4. ✅ returns 400 when name is whitespace only
5. ✅ returns 404 for non-existent boardId
6. ✅ returns 404 for non-existent columnId
7. ✅ returns 400 for invalid boardId format
8. ✅ returns 400 for invalid columnId format
9. ✅ returns 401 without auth token
10. ✅ does not update task statuses when column is renamed

#### `DELETE /api/boards/:boardId/columns/:columnId` (10 tests, lines 619–878)
1. ✅ deletes a column with no tasks (verifies column count and reindexed positions)
2. ✅ returns 400 when tasks exist with matching status (verifies column is not deleted)
3. ✅ reindexes remaining column positions after delete
4. ✅ returns 404 for non-existent boardId
5. ✅ returns 404 for non-existent columnId
6. ✅ returns 400 for invalid boardId format
7. ✅ returns 400 for invalid columnId format
8. ✅ returns 401 without auth token
9. ✅ allows deleting column after tasks are moved away
10. ✅ can delete multiple columns sequentially

#### `PUT /api/boards/:boardId/columns/reorder` (12 tests, lines 880–1093)
1. ✅ reorders columns and updates all positions correctly
2. ✅ persists reorder in subsequent board fetch
3. ✅ returns 400 when columnIds is missing
4. ✅ returns 400 when columnIds is not an array
5. ✅ returns 400 when columnIds contains extra IDs
6. ✅ returns 400 when columnIds is missing IDs
7. ✅ returns 400 when columnIds contains duplicate IDs
8. ✅ returns 400 when columnIds contains IDs not on the board
9. ✅ returns 404 for non-existent boardId
10. ✅ returns 400 for invalid boardId format
11. ✅ returns 401 without auth token
12. ✅ reorder is idempotent with same order

### 3.2 Coverage Gap Analysis

Comparing the existing 46 tests against the task spec requirements:

| Spec Requirement | Status | Existing Test |
|---|---|---|
| **GET board**: returns columns sorted by position | ✅ Covered | Test #1 in GET suite |
| **GET board**: 404 for non-existent project | ✅ Covered | Test #2 in GET suite |
| **GET board**: 400 for invalid projectId | ✅ Covered | Test #3 in GET suite |
| **GET board**: 401 without auth | ✅ Covered | Test #4 in GET suite |
| **POST column**: adds at end with correct position | ✅ Covered | Test #1 in POST suite |
| **POST column**: 400 when name missing | ✅ Covered | Test #2 in POST suite |
| **POST column**: 400 when name empty | ✅ Covered | Test #3 in POST suite |
| **POST column**: 404 for non-existent board | ✅ Covered | Test #5 in POST suite |
| **POST column**: 401 without auth | ✅ Covered | Test #7 in POST suite |
| **POST column**: appears in subsequent fetch | ✅ Covered | Verified within test #1 |
| **PUT column**: renames successfully | ✅ Covered | Test #1 in PUT suite |
| **PUT column**: 400 when name missing/empty | ✅ Covered | Tests #2-4 in PUT suite |
| **PUT column**: 404 for non-existent board | ✅ Covered | Test #5 in PUT suite |
| **PUT column**: 404 for non-existent column | ✅ Covered | Test #6 in PUT suite |
| **PUT column**: 401 without auth | ✅ Covered | Test #9 in PUT suite |
| **PUT column**: task statuses NOT updated on rename | ✅ Covered | Test #10 in PUT suite |
| **DELETE column**: deletes with no tasks | ✅ Covered | Test #1 in DELETE suite |
| **DELETE column**: 400 when tasks exist | ✅ Covered | Test #2 in DELETE suite |
| **DELETE column**: reindexes positions | ✅ Covered | Test #3 in DELETE suite |
| **DELETE column**: 404 for non-existent board | ✅ Covered | Test #4 in DELETE suite |
| **DELETE column**: 404 for non-existent column | ✅ Covered | Test #5 in DELETE suite |
| **DELETE column**: 401 without auth | ✅ Covered | Test #8 in DELETE suite |
| **Reorder**: updates all positions correctly | ✅ Covered | Test #1 in reorder suite |
| **Reorder**: 400 for missing columnIds | ✅ Covered | Test #3 in reorder suite |
| **Reorder**: 400 for non-array columnIds | ✅ Covered | Test #4 in reorder suite |
| **Reorder**: 400 for mismatched IDs (extra/missing/duplicate) | ✅ Covered | Tests #5-8 in reorder suite |
| **Reorder**: 404 for non-existent board | ✅ Covered | Test #9 in reorder suite |
| **Reorder**: 401 without auth | ✅ Covered | Test #11 in reorder suite |
| **Reorder**: persists in subsequent fetch | ✅ Covered | Test #2 in reorder suite |

**Result**: Zero coverage gaps. All 28 required test scenarios from the spec are covered, plus 18 additional edge case tests.

### 3.3 No Code Changes Required

The file is complete as-is. No modifications are needed to either the test file or any source files.

## 4. Contracts

All contracts are already validated by the existing 46 tests. See the completed sibling task plans (t01–t05) for detailed contract specifications for each endpoint.

## 5. Test Plan

### Test Setup (already implemented)

- **Database**: MongoDB at `mongodb://localhost:27017/taskboard_test`
- **Lifecycle**:
  - `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, detect supertest availability
  - `beforeEach`: `clearCollections()`, `seedAdminUser()`, `getAuthToken()`
  - `afterAll`: `app.close()`, `teardownTestDb()`
- **HTTP client**: Dual-mode `httpRequest` helper (supertest if TCP binding works, Fastify inject otherwise)
- **Data setup**: `createProject()` returns `{ projectId, boardId }`; `getColumnId()` and `getColumnIds()` helpers for column ID retrieval

### Test Results (current state)

| Suite | Tests | Status |
|---|---|---|
| GET /api/projects/:projectId/board | 6 | All passing |
| POST /api/boards/:boardId/columns | 8 | All passing |
| PUT /api/boards/:boardId/columns/:columnId | 10 | All passing |
| DELETE /api/boards/:boardId/columns/:columnId | 10 | All passing |
| PUT /api/boards/:boardId/columns/reorder | 12 | All passing |
| **Total** | **46** | **All passing** |

### Regression Status

All 146 tests across 11 test files pass (including `project.routes.test.ts` and `auth.routes.test.ts`). TypeScript compilation succeeds with `--noEmit`.

## 6. Implementation Order

1. **Verify existing test file completeness** — compare all test cases against spec requirements (done — zero gaps found)
2. **Run board route tests** — confirm all 46 tests pass
3. **Run full test suite** — confirm no regressions across all 11 test files (146 tests)
4. **Verify TypeScript compilation** — confirm `npx tsc --noEmit` succeeds

## 7. Verification Commands

```bash
# Run board route tests only
cd packages/server && npx vitest run test/routes/board.routes.test.ts

# Run all server tests (ensure no regressions)
cd packages/server && npx vitest run

# Verify TypeScript compilation
cd packages/server && npx tsc --noEmit
```