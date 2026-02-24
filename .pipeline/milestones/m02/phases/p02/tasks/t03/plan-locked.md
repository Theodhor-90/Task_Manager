Now I have all the context needed. Let me produce the implementation plan.

# Task 3 Implementation Plan: Column Rename Endpoint

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/board.routes.ts` | Modify | Add `PUT /:boardId/columns/:columnId` handler to the `columnRoutes` plugin |
| 2 | `packages/server/test/routes/board.routes.test.ts` | Modify | Add integration tests for `PUT /api/boards/:boardId/columns/:columnId` |

## 2. Dependencies

- **Tasks t01 and t02 complete**: `board.routes.ts` exists with `boardRoutes` and `columnRoutes` (containing `POST /:boardId/columns`); `isValidObjectId` and `isValidCreateColumnBody` helpers exist; test file exists with `createProject` helper, `httpRequest`, lifecycle hooks, and all test infrastructure
- **`app.ts` already registers `columnRoutes`** under `/api/boards` prefix — no changes needed to `app.ts`
- **Existing models**: `BoardModel` (from `board.model.ts`) with `columns: Types.DocumentArray<ColumnDocument>`, `ProjectModel` (from `project.model.ts`), `TaskModel` (from `task.model.ts`)
- **Auth middleware**: Globally registered in `app.ts` — all non-public routes require JWT
- **MongoDB**: Running locally on `mongodb://localhost:27017`

## 3. Implementation Details

### 3.1 `packages/server/src/routes/board.routes.ts` (Modify)

**Changes**: Add a `PUT /:boardId/columns/:columnId` route inside the existing `columnRoutes` plugin, after the existing `POST /:boardId/columns` route.

**No new helper functions needed**: The existing `isValidCreateColumnBody` validates `{ name: string }` which is the same body shape required for rename. The existing `isValidObjectId` handles ObjectId validation for both `boardId` and `columnId`.

**Route: `PUT /:boardId/columns/:columnId`**

Handler logic:
1. Extract `boardId` and `columnId` from `request.params as { boardId: string; columnId: string }`
2. Validate `boardId` with `isValidObjectId()` — return `400 { error: "Invalid board ID" }` if invalid
3. Validate `columnId` with `isValidObjectId()` — return `400 { error: "Invalid column ID" }` if invalid
4. Validate request body with `isValidCreateColumnBody()` — return `400 { error: "Column name is required" }` if invalid
5. Fetch board: `BoardModel.findOne({ _id: boardId })` — return `404 { error: "Board not found" }` if null
6. Verify ownership: `ProjectModel.findOne({ _id: board.project, owner: request.user.id })` — return `404 { error: "Board not found" }` if null (same 404 to avoid leaking board existence, consistent with t02 pattern)
7. Find the column subdocument within `board.columns` by matching `_id` against `columnId`:
   - Use `board.columns` cast as an array, then `.find()` to locate the column whose `_id` (normalized via `String()`) matches `columnId`
   - Return `404 { error: "Column not found" }` if no match
8. Update the column's `name` field to `request.body.name` (do NOT update task statuses — this is a deliberate design decision per the phase spec)
9. Save the board via `board.save()` (using the same TypeScript cast pattern from t02)
10. Serialize the updated column using `toJSON()` if available (same pattern as t02)
11. Return `200 { data: updatedColumn }`

**Code to add inside the `columnRoutes` async function, after the existing `app.post(...)` block:**

```typescript
app.put("/:boardId/columns/:columnId", async (request, reply) => {
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

  if (!isValidCreateColumnBody(request.body)) {
    return reply.code(400).send({ error: "Column name is required" });
  }

  const { name } = request.body;
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
    toJSON?: () => Record<string, unknown>;
  }>;

  const column = columns.find(
    (col) => String(col._id) === columnId,
  );

  if (!column) {
    return reply.code(404).send({ error: "Column not found" });
  }

  column.name = name;

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

  const columnWithToJson = column as unknown as Partial<{
    toJSON(): Record<string, unknown>;
  }>;
  const columnData =
    typeof columnWithToJson.toJSON === "function"
      ? columnWithToJson.toJSON()
      : column;

  return reply.code(200).send({ data: columnData });
});
```

**Placement**: This new route is added inside the `columnRoutes` export, after the existing `app.post("/:boardId/columns", ...)` handler. Since both the POST and PUT routes share the same `/:boardId/columns` prefix but the PUT has the additional `/:columnId` segment, there is no conflict.

### 3.2 `packages/server/test/routes/board.routes.test.ts` (Modify)

**Changes**: Add a new `describe("PUT /api/boards/:boardId/columns/:columnId", ...)` block inside the existing `describe("board routes", ...)` block, after the existing `POST /api/boards/:boardId/columns` test group.

**Helper needed for task creation** (for the "no status cascade" test): A `createTask` helper function that creates a task directly via the `TaskModel` to set up task data for the ownership-doesn't-cascade test. Since the Tasks API is not yet implemented (it's Phase 3), we must use the model directly.

Add a model import at the top of the test file:
```typescript
import { UserModel, hashPassword, TaskModel } from "../../src/models/index.js";
```
(Update the existing import to include `TaskModel`.)

**Tests to add**:

1. **"renames a column successfully"**
   - Create a project (auto-creates board with 4 default columns)
   - Get the board to find the first column's `_id` (name: "To Do")
   - `PUT /api/boards/:boardId/columns/:columnId` with `{ name: "Backlog" }` and auth header → expect 200
   - Assert `body.data.name` is `"Backlog"`
   - Assert `body.data.position` is `0` (unchanged)
   - Assert `body.data._id` is defined
   - Verify via `GET /api/projects/:projectId/board` — assert first column name is `"Backlog"` and all other columns are unchanged

2. **"returns 400 when name is missing"**
   - Create a project, get board and a column ID
   - `PUT /api/boards/:boardId/columns/:columnId` with `{}` and auth header → expect 400
   - Assert `body.error` is `"Column name is required"`

3. **"returns 400 when name is empty string"**
   - Create a project, get board and a column ID
   - `PUT /api/boards/:boardId/columns/:columnId` with `{ name: "" }` and auth header → expect 400
   - Assert `body.error` is `"Column name is required"`

4. **"returns 400 when name is whitespace only"**
   - Create a project, get board and a column ID
   - `PUT /api/boards/:boardId/columns/:columnId` with `{ name: "   " }` and auth header → expect 400
   - Assert `body.error` is `"Column name is required"`

5. **"returns 404 for non-existent boardId"**
   - `PUT /api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with `{ name: "Test" }` and auth header → expect 404
   - Assert `body.error` is `"Board not found"`

6. **"returns 404 for non-existent columnId"**
   - Create a project (gets a valid board)
   - `PUT /api/boards/:boardId/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with `{ name: "Test" }` and auth header → expect 404
   - Assert `body.error` is `"Column not found"`

7. **"returns 400 for invalid boardId format"**
   - `PUT /api/boards/not-a-valid-id/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with `{ name: "Test" }` and auth header → expect 400
   - Assert `body.error` is `"Invalid board ID"`

8. **"returns 400 for invalid columnId format"**
   - Create a project
   - `PUT /api/boards/:boardId/columns/not-a-valid-id` with `{ name: "Test" }` and auth header → expect 400
   - Assert `body.error` is `"Invalid column ID"`

9. **"returns 401 without auth token"**
   - `PUT /api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with `{ name: "Test" }` and no auth header → expect 401
   - Assert `body.error` is `"Unauthorized"`

10. **"does not update task statuses when column is renamed"**
    - Create a project (auto-creates board with default columns including "To Do")
    - Get the board to find the "To Do" column's `_id`
    - Create a task directly via `TaskModel.create()` with `{ title: "Test Task", status: "To Do", board: boardId, project: projectId }` — the task's status matches the column name
    - Rename the "To Do" column to "Backlog" via `PUT /api/boards/:boardId/columns/:columnId` with `{ name: "Backlog" }` → expect 200
    - Query the task via `TaskModel.findOne({ title: "Test Task" })` and assert `task.status` is still `"To Do"` (NOT "Backlog")

**Helper function for getting a column ID** (used in multiple tests): Rather than a separate helper, each test that needs a column ID will fetch the board via `GET /api/projects/:projectId/board` and extract the column `_id` from the response. This is already done in the `createProject` helper pattern. To avoid duplication, a small inline approach will be used:

```typescript
async function getColumnId(
  projectId: string,
  columnIndex: number,
): Promise<string> {
  const response = await httpRequest({
    method: "get",
    path: `/api/projects/${projectId}/board`,
    expectedStatus: 200,
    headers: { authorization: `Bearer ${token}` },
  });
  const body = response.body as {
    data: { columns: Array<{ _id: unknown }> };
  };
  return normalizeId(body.data.columns[columnIndex]._id);
}
```

This helper is placed inside the `describe("board routes", ...)` block alongside `createProject`.

## 4. Contracts

### Request: `PUT /api/boards/:boardId/columns/:columnId`

**Path parameters**:
- `boardId` — valid MongoDB ObjectId string (24-char hex)
- `columnId` — valid MongoDB ObjectId string (24-char hex)

**Headers**:
- `Authorization: Bearer <jwt_token>` (required)

**Request body**:
```json
{ "name": "Backlog" }
```

### Response: Success (200)

```json
{
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "name": "Backlog",
    "position": 0
  }
}
```

### Response: Invalid/missing name (400)

```json
{ "error": "Column name is required" }
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
- **Lifecycle**: Already established in `board.routes.test.ts` from Tasks t01/t02:
  - `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, detect supertest availability
  - `beforeEach`: `clearCollections()`, `seedAdminUser()`, `getAuthToken()`
  - `afterAll`: `app.close()`, `teardownTestDb()`
- **HTTP client**: Dual-mode `httpRequest` helper (supertest if TCP binding works, Fastify inject otherwise)
- **Data setup**: Projects created via `createProject()` helper which returns `{ projectId, boardId }`; column IDs retrieved via `getColumnId()` helper
- **Task creation for no-cascade test**: Direct `TaskModel.create()` since Tasks API doesn't exist yet

### Test Specifications

| # | Test Name | Setup | Action | Assertions |
|---|-----------|-------|--------|------------|
| 1 | renames a column successfully | `createProject("Rename Test")`, get column 0 ID | PUT `/api/boards/:boardId/columns/:columnId` with `{ name: "Backlog" }` | 200; data.name = "Backlog"; data.position = 0; data._id defined; GET board shows first column named "Backlog", other columns unchanged |
| 2 | returns 400 when name is missing | `createProject("Missing Name")`, get column 0 ID | PUT `/api/boards/:boardId/columns/:columnId` with `{}` | 400; error = "Column name is required" |
| 3 | returns 400 when name is empty string | `createProject("Empty Name")`, get column 0 ID | PUT `/api/boards/:boardId/columns/:columnId` with `{ name: "" }` | 400; error = "Column name is required" |
| 4 | returns 400 when name is whitespace only | `createProject("WS Name")`, get column 0 ID | PUT `/api/boards/:boardId/columns/:columnId` with `{ name: "   " }` | 400; error = "Column name is required" |
| 5 | returns 404 for non-existent boardId | None | PUT `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with `{ name: "Test" }` | 404; error = "Board not found" |
| 6 | returns 404 for non-existent columnId | `createProject("No Column")` | PUT `/api/boards/:boardId/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with `{ name: "Test" }` | 404; error = "Column not found" |
| 7 | returns 400 for invalid boardId format | None | PUT `/api/boards/not-a-valid-id/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with `{ name: "Test" }` | 400; error = "Invalid board ID" |
| 8 | returns 400 for invalid columnId format | `createProject("Invalid Col")` | PUT `/api/boards/:boardId/columns/not-a-valid-id` with `{ name: "Test" }` | 400; error = "Invalid column ID" |
| 9 | returns 401 without auth token | None | PUT `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/bbbbbbbbbbbbbbbbbbbbbbbb` with `{ name: "Test" }`, no auth | 401; error = "Unauthorized" |
| 10 | does not update task statuses when column is renamed | `createProject("No Cascade")`, get "To Do" column ID, create task via `TaskModel.create()` with status "To Do" | PUT column name to "Backlog" | 200; column renamed; TaskModel.findOne shows task.status still = "To Do" |

## 6. Implementation Order

1. **Modify `packages/server/src/routes/board.routes.ts`**
   - Add `PUT /:boardId/columns/:columnId` handler inside the existing `columnRoutes` plugin
   - Reuse existing `isValidObjectId` and `isValidCreateColumnBody` helpers
   - Follow the same ownership verification, save, and serialization patterns from the `POST` handler
2. **Modify `packages/server/test/routes/board.routes.test.ts`**
   - Update import to include `TaskModel`
   - Add `getColumnId` helper function
   - Add `describe("PUT /api/boards/:boardId/columns/:columnId", ...)` test group with all 10 tests
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