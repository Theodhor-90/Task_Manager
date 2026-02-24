Now I have all the context needed. Let me produce the implementation plan.

# Task 4 Implementation Plan: Column Delete Endpoint with Task Guard

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/board.routes.ts` | Modify | Add `DELETE /:boardId/columns/:columnId` handler to the `columnRoutes` plugin |
| 2 | `packages/server/test/routes/board.routes.test.ts` | Modify | Add integration tests for `DELETE /api/boards/:boardId/columns/:columnId` |

## 2. Dependencies

- **Tasks t01–t03 complete**: `board.routes.ts` exists with `boardRoutes` and `columnRoutes` (containing `POST /:boardId/columns` and `PUT /:boardId/columns/:columnId`); `isValidObjectId` helper exists; test file exists with `createProject`, `getColumnId`, `httpRequest`, `normalizeId`, lifecycle hooks, and all test infrastructure
- **`app.ts` already registers `columnRoutes`** under `/api/boards` prefix — no changes needed to `app.ts`
- **Existing models**: `BoardModel` (from `board.model.ts`) with `columns: Types.DocumentArray<ColumnDocument>`, `ProjectModel` (from `project.model.ts`), `TaskModel` (from `task.model.ts`) — `TaskModel` is already imported in `board.routes.ts` test file but **not** yet imported in the route file itself
- **Auth middleware**: Globally registered in `app.ts` — all non-public routes require JWT
- **MongoDB**: Running locally on `mongodb://localhost:27017`

## 3. Implementation Details

### 3.1 `packages/server/src/routes/board.routes.ts` (Modify)

**Changes**:
1. Add `TaskModel` to the import from `../models/index.js` (line 3)
2. Add a `DELETE /:boardId/columns/:columnId` route inside the existing `columnRoutes` plugin, after the existing `PUT /:boardId/columns/:columnId` route

**Import change** (line 3):
```typescript
import { ProjectModel, BoardModel, TaskModel } from "../models/index.js";
```

**Route: `DELETE /:boardId/columns/:columnId`**

Handler logic:
1. Extract `boardId` and `columnId` from `request.params as { boardId: string; columnId: string }`
2. Validate `boardId` with `isValidObjectId()` — return `400 { error: "Invalid board ID" }` if invalid
3. Validate `columnId` with `isValidObjectId()` — return `400 { error: "Invalid column ID" }` if invalid
4. Fetch board: `BoardModel.findOne({ _id: boardId })` — return `404 { error: "Board not found" }` if null
5. Verify ownership: `ProjectModel.findOne({ _id: board.project, owner: request.user.id })` — return `404 { error: "Board not found" }` if null (same 404 to avoid leaking board existence, consistent with t02/t03 pattern)
6. Find the column subdocument within `board.columns` by matching `_id` against `columnId` — return `404 { error: "Column not found" }` if no match
7. Query `TaskModel.countDocuments({ board: boardId, status: column.name })` to check if any tasks reference this column by status string
8. If count > 0, return `400 { error: "Cannot delete column that contains tasks" }`
9. Filter the column out of `board.columns` — use `board.columns` cast as an array and filter by `_id` not matching `columnId`
10. Reindex remaining column positions: iterate through remaining columns and assign position = index (0-based contiguous)
11. Save the board via `board.save()` (using the same TypeScript cast pattern from t02/t03)
12. Return `200 { data: { message: "Column deleted" } }`

**Code to add inside the `columnRoutes` async function, after the existing `app.put(...)` block:**

```typescript
app.delete("/:boardId/columns/:columnId", async (request, reply) => {
  const { boardId, columnId } = request.params as {
    boardId: string;
    columnId: string;
  };

  if (!isValidObjectId(boardId)) {
    return reply.code(400).send({ error: "Invalid board ID" });
  }

  if (!isValidObjectId(columnId)) {
    return reply.code(400).send({ error: "Invalid column ID" });
  }

  const board = await BoardModel.findOne({ _id: boardId });

  if (!board) {
    return reply.code(404).send({ error: "Board not found" });
  }

  const project = await ProjectModel.findOne({
    _id: board.project,
    owner: request.user.id,
  });

  if (!project) {
    return reply.code(404).send({ error: "Board not found" });
  }

  const columns = board.columns as unknown as Array<{
    _id: unknown;
    name: string;
    position: number;
  }>;
  const column = columns.find(
    (col) => String(col._id) === columnId,
  );

  if (!column) {
    return reply.code(404).send({ error: "Column not found" });
  }

  const taskCount = await (TaskModel as unknown as {
    countDocuments(filter: Record<string, unknown>): Promise<number>;
  }).countDocuments({ board: boardId, status: column.name });

  if (taskCount > 0) {
    return reply.code(400).send({ error: "Cannot delete column that contains tasks" });
  }

  const remaining = columns.filter(
    (col) => String(col._id) !== columnId,
  );
  remaining.forEach((col, index) => {
    col.position = index;
  });

  (board as unknown as { columns: typeof remaining }).columns = remaining;

  const boardWithSave = board as unknown as {
    save?: () => Promise<void>;
    columns: unknown;
  };

  if (typeof boardWithSave.save === "function") {
    await boardWithSave.save();
  } else {
    await (BoardModel as unknown as {
      findOneAndUpdate(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
      ): Promise<Record<string, unknown> | null>;
    }).findOneAndUpdate(
      { _id: boardId },
      { columns: boardWithSave.columns as Record<string, unknown>[] },
    );
  }

  return reply.code(200).send({ data: { message: "Column deleted" } });
});
```

**Key design decisions**:
- The task guard checks tasks by `status` string matching the column's `name`, not by column ObjectId — this is consistent with the phase spec's design decision #2
- After removing a column, remaining columns get contiguous positions (0, 1, 2, ...) to avoid gaps
- The column is removed by filtering the array and reassigning to `board.columns`, then saving — this ensures Mongoose tracks the change

**Note on column removal approach**: Mongoose DocumentArrays support `.pull()` or `.splice()`, but given the existing codebase pattern of casting `board.columns` as a plain array, the safest approach is to filter and reassign. After filtering, we explicitly reindex positions and save.

### 3.2 `packages/server/test/routes/board.routes.test.ts` (Modify)

**Changes**: Add a new `describe("DELETE /api/boards/:boardId/columns/:columnId", ...)` block inside the existing `describe("board routes", ...)` block, after the existing `PUT /api/boards/:boardId/columns/:columnId` test group.

**No new imports needed**: `TaskModel` is already imported (line 6) from Task t03's "does not update task statuses" test. The `createProject`, `getColumnId`, `httpRequest`, `normalizeId` helpers all already exist.

**Tests to add**:

1. **"deletes a column with no tasks"**
   - Create a project (auto-creates board with 4 default columns: "To Do", "In Progress", "In Review", "Done")
   - Get the column ID for index 2 ("In Review")
   - `DELETE /api/boards/:boardId/columns/:columnId` with auth header → expect 200
   - Assert `body.data.message` is `"Column deleted"`
   - Verify via `GET /api/projects/:projectId/board`:
     - Assert columns length is 3
     - Assert column names are `["To Do", "In Progress", "Done"]`
     - Assert column positions are `[0, 1, 2]` (reindexed, contiguous)

2. **"returns 400 when tasks exist with matching status"**
   - Create a project, get the "To Do" column ID (index 0)
   - Create a task via `TaskModel.create({ title: "Blocking Task", status: "To Do", board: boardId, project: projectId })`
   - `DELETE /api/boards/:boardId/columns/:columnId` with auth header → expect 400
   - Assert `body.error` is `"Cannot delete column that contains tasks"`
   - Verify via `GET /api/projects/:projectId/board` — assert columns length is still 4 (column was not deleted)

3. **"reindexes remaining column positions after delete"**
   - Create a project (4 default columns at positions 0, 1, 2, 3)
   - Get the column ID for index 1 ("In Progress")
   - `DELETE /api/boards/:boardId/columns/:columnId` with auth header → expect 200
   - Verify via `GET /api/projects/:projectId/board`:
     - Assert columns length is 3
     - Assert column names are `["To Do", "In Review", "Done"]`
     - Assert column positions are `[0, 1, 2]` (not `[0, 2, 3]`)

4. **"returns 404 for non-existent boardId"**
   - `DELETE /api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with auth header → expect 404
   - Assert `body.error` is `"Board not found"`

5. **"returns 404 for non-existent columnId"**
   - Create a project (gets a valid board)
   - `DELETE /api/boards/:boardId/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with auth header → expect 404
   - Assert `body.error` is `"Column not found"`

6. **"returns 400 for invalid boardId format"**
   - `DELETE /api/boards/not-a-valid-id/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with auth header → expect 400
   - Assert `body.error` is `"Invalid board ID"`

7. **"returns 400 for invalid columnId format"**
   - Create a project
   - `DELETE /api/boards/:boardId/columns/not-a-valid-id` with auth header → expect 400
   - Assert `body.error` is `"Invalid column ID"`

8. **"returns 401 without auth token"**
   - `DELETE /api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with no auth header → expect 401
   - Assert `body.error` is `"Unauthorized"`

9. **"allows deleting column after tasks are moved away"**
   - Create a project, get the "To Do" column ID (index 0)
   - Create a task via `TaskModel.create({ title: "Movable Task", status: "To Do", board: boardId, project: projectId })`
   - Attempt delete → expect 400 (tasks block deletion)
   - Update the task's status to "In Progress" via `TaskModel.findOneAndUpdate({ title: "Movable Task" }, { status: "In Progress" })`
   - Attempt delete again → expect 200 (no tasks remain with status "To Do")
   - Verify via `GET /api/projects/:projectId/board` — assert columns length is 3 and "To Do" is gone

10. **"can delete multiple columns sequentially"**
    - Create a project (4 default columns)
    - Get the column ID for "In Review" (index 2), delete it → expect 200
    - Verify 3 columns remain with positions `[0, 1, 2]`
    - Get the column ID for "Done" (now at index 2 after reindex), delete it → expect 200
    - Verify 2 columns remain: `["To Do", "In Progress"]` with positions `[0, 1]`

## 4. Contracts

### Request: `DELETE /api/boards/:boardId/columns/:columnId`

**Path parameters**:
- `boardId` — valid MongoDB ObjectId string (24-char hex)
- `columnId` — valid MongoDB ObjectId string (24-char hex)

**Headers**:
- `Authorization: Bearer <jwt_token>` (required)

**Request body**: None

### Response: Success (200)

```json
{
  "data": {
    "message": "Column deleted"
  }
}
```

### Response: Tasks exist in column (400)

```json
{ "error": "Cannot delete column that contains tasks" }
```

### Response: Invalid boardId format (400)

```json
{ "error": "Invalid board ID" }
```

### Response: Invalid columnId format (400)

```json
{ "error": "Invalid column ID" }
```

### Response: Board not found (404)

```json
{ "error": "Board not found" }
```

### Response: Column not found (404)

```json
{ "error": "Column not found" }
```

### Response: Unauthorized (401)

```json
{ "error": "Unauthorized" }
```

## 5. Test Plan

### Test Setup

- **Database**: MongoDB at `mongodb://localhost:27017/taskboard_test`
- **Lifecycle**: Already established in `board.routes.test.ts` from Tasks t01–t03:
  - `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, detect supertest availability
  - `beforeEach`: `clearCollections()`, `seedAdminUser()`, `getAuthToken()`
  - `afterAll`: `app.close()`, `teardownTestDb()`
- **HTTP client**: Dual-mode `httpRequest` helper (supertest if TCP binding works, Fastify inject otherwise)
- **Data setup**: Projects created via `createProject()` helper which returns `{ projectId, boardId }`; column IDs retrieved via `getColumnId()` helper
- **Task creation for guard tests**: Direct `TaskModel.create()` since Tasks API doesn't exist yet (same pattern as t03's "does not update task statuses" test)

### Test Specifications

| # | Test Name | Setup | Action | Assertions |
|---|-----------|-------|--------|------------|
| 1 | deletes a column with no tasks | `createProject("Delete Test")`, get column 2 ID ("In Review") | DELETE `/api/boards/:boardId/columns/:columnId` | 200; data.message = "Column deleted"; GET board shows 3 columns: ["To Do", "In Progress", "Done"] with positions [0, 1, 2] |
| 2 | returns 400 when tasks exist with matching status | `createProject("Task Guard")`, get column 0 ID, create task with status "To Do" | DELETE `/api/boards/:boardId/columns/:columnId` | 400; error = "Cannot delete column that contains tasks"; GET board still shows 4 columns |
| 3 | reindexes remaining column positions after delete | `createProject("Reindex Test")`, get column 1 ID ("In Progress") | DELETE `/api/boards/:boardId/columns/:columnId` | 200; GET board shows 3 columns: ["To Do", "In Review", "Done"] with positions [0, 1, 2] |
| 4 | returns 404 for non-existent boardId | None | DELETE `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/bbbbbbbbbbbbbbbbbbbbbbbb` | 404; error = "Board not found" |
| 5 | returns 404 for non-existent columnId | `createProject("No Column")` | DELETE `/api/boards/:boardId/columns/bbbbbbbbbbbbbbbbbbbbbbbb` | 404; error = "Column not found" |
| 6 | returns 400 for invalid boardId format | None | DELETE `/api/boards/not-a-valid-id/columns/bbbbbbbbbbbbbbbbbbbbbbbb` | 400; error = "Invalid board ID" |
| 7 | returns 400 for invalid columnId format | `createProject("Invalid Col")` | DELETE `/api/boards/:boardId/columns/not-a-valid-id` | 400; error = "Invalid column ID" |
| 8 | returns 401 without auth token | None | DELETE `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/bbbbbbbbbbbbbbbbbbbbbbbb`, no auth | 401; error = "Unauthorized" |
| 9 | allows deleting column after tasks are moved away | `createProject("Move Away")`, get column 0 ID, create task with status "To Do" | DELETE (expect 400), update task status to "In Progress", DELETE again (expect 200) | First: 400; After move: 200; GET board shows 3 columns without "To Do" |
| 10 | can delete multiple columns sequentially | `createProject("Multi Delete")` | DELETE "In Review" (index 2), then DELETE "Done" (new index 2 after reindex) | Both 200; Final board has 2 columns: ["To Do", "In Progress"] with positions [0, 1] |

## 6. Implementation Order

1. **Modify `packages/server/src/routes/board.routes.ts`**
   - Update import to include `TaskModel` from `../models/index.js`
   - Add `DELETE /:boardId/columns/:columnId` handler inside the existing `columnRoutes` plugin, after the `PUT` handler
   - Reuse existing `isValidObjectId` helper
   - Follow the same ownership verification, column lookup, save, and TypeScript cast patterns from the `PUT` handler
   - Add task guard check via `TaskModel.countDocuments()`
   - Add column removal logic with position reindexing
2. **Modify `packages/server/test/routes/board.routes.test.ts`**
   - Add `describe("DELETE /api/boards/:boardId/columns/:columnId", ...)` test group after the existing `PUT` test group
   - Implement all 10 test cases
3. **Run tests and verify**

## 7. Verification Commands

```bash
# Run board route tests only
cd packages/server && npx vitest run test/routes/board.routes.test.ts

# Run all server tests (ensure no regressions in project routes)
cd packages/server && npx vitest run

# Verify TypeScript compilation
cd packages/server && npx tsc --noEmit
```