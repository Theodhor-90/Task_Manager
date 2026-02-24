Now I have all the context needed. Let me produce the implementation plan.

# Task 5 Implementation Plan: Column Reorder Endpoint

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/board.routes.ts` | Modify | Add `PUT /:boardId/columns/reorder` handler to the `columnRoutes` plugin, registered BEFORE the `/:columnId` routes |
| 2 | `packages/server/test/routes/board.routes.test.ts` | Modify | Add integration tests for `PUT /api/boards/:boardId/columns/reorder` |

## 2. Dependencies

- **Tasks t01–t04 complete**: `board.routes.ts` exists with `boardRoutes` and `columnRoutes` (containing `POST /:boardId/columns`, `PUT /:boardId/columns/:columnId`, `DELETE /:boardId/columns/:columnId`); `isValidObjectId` helper exists; test file exists with `createProject`, `getColumnId`, `httpRequest`, `normalizeId`, lifecycle hooks, and all test infrastructure
- **`app.ts` already registers `columnRoutes`** under `/api/boards` prefix — no changes needed to `app.ts`
- **Existing models**: `BoardModel` (from `board.model.ts`) with `columns: Types.DocumentArray<ColumnDocument>`, `ProjectModel` (from `project.model.ts`)
- **Auth middleware**: Globally registered in `app.ts` — all non-public routes require JWT
- **MongoDB**: Running locally on `mongodb://localhost:27017`

## 3. Implementation Details

### 3.1 `packages/server/src/routes/board.routes.ts` (Modify)

**Changes**:
1. Add a new inline type guard function `isValidReorderBody` for validating the request body
2. Add a `PUT /:boardId/columns/reorder` route inside the existing `columnRoutes` plugin — **CRITICAL**: this route must be registered BEFORE the `PUT /:boardId/columns/:columnId` route to prevent Fastify from matching "reorder" as a `columnId` parameter

**New validation helper** (placed after the existing `isValidCreateColumnBody` function, around line 59):

```typescript
function isValidReorderBody(
  body: unknown,
): body is { columnIds: string[] } {
  if (!body || typeof body !== "object") {
    return false;
  }

  const { columnIds } = body as Record<string, unknown>;

  if (!Array.isArray(columnIds)) {
    return false;
  }

  if (columnIds.length === 0) {
    return false;
  }

  for (const id of columnIds) {
    if (typeof id !== "string") {
      return false;
    }
  }

  return true;
}
```

**Route: `PUT /:boardId/columns/reorder`**

Handler logic:
1. Extract `boardId` from `request.params as { boardId: string }`
2. Validate `boardId` with `isValidObjectId()` — return `400 { error: "Invalid board ID" }` if invalid
3. Validate request body with `isValidReorderBody()` — return `400 { error: "columnIds must be a non-empty array of strings" }` if invalid
4. Fetch board: `BoardModel.findOne({ _id: boardId })` — return `404 { error: "Board not found" }` if null
5. Verify ownership: `ProjectModel.findOne({ _id: board.project, owner: request.user.id })` — return `404 { error: "Board not found" }` if null (same 404 to avoid leaking board existence, consistent with t02–t04 pattern)
6. Validate that `columnIds` matches the existing columns exactly:
   - Check `columnIds.length === board.columns.length` — return `400 { error: "columnIds must include every column exactly once" }` if different
   - Check for duplicates: `new Set(columnIds).size !== columnIds.length` — return `400 { error: "columnIds must include every column exactly once" }` if duplicates exist
   - Check every ID in `columnIds` maps to an existing column in `board.columns` — return `400 { error: "columnIds must include every column exactly once" }` if any ID is not found
7. Update each column's `position` based on its index in the `columnIds` array:
   - For each `columnId` at index `i` in the `columnIds` array, find the matching column in `board.columns` and set `position = i`
8. Save the board via `board.save()` (using the same TypeScript cast pattern from t02–t04)
9. Serialize the board via `toJSON()` and sort columns by position before returning
10. Return `200 { data: board }` — the full board object with columns in the new order

**Code to add inside the `columnRoutes` async function — BEFORE the existing `app.put("/:boardId/columns/:columnId", ...)` block (currently at line 138):**

```typescript
app.put("/:boardId/columns/reorder", async (request, reply) => {
  const { boardId } = request.params as { boardId: string };

  if (!isValidObjectId(boardId)) {
    return reply.code(400).send({ error: "Invalid board ID" });
  }

  if (!isValidReorderBody(request.body)) {
    return reply.code(400).send({ error: "columnIds must be a non-empty array of strings" });
  }

  const { columnIds } = request.body;
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

  if (columnIds.length !== columns.length) {
    return reply.code(400).send({ error: "columnIds must include every column exactly once" });
  }

  const uniqueIds = new Set(columnIds);
  if (uniqueIds.size !== columnIds.length) {
    return reply.code(400).send({ error: "columnIds must include every column exactly once" });
  }

  const columnMap = new Map<string, typeof columns[number]>();
  for (const col of columns) {
    columnMap.set(String(col._id), col);
  }

  for (const id of columnIds) {
    if (!columnMap.has(id)) {
      return reply.code(400).send({ error: "columnIds must include every column exactly once" });
    }
  }

  for (let i = 0; i < columnIds.length; i++) {
    const col = columnMap.get(columnIds[i])!;
    col.position = i;
  }

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

  const boardWithToJson = board as unknown as Partial<{ toJSON(): Record<string, unknown> }>;
  const boardJson = typeof boardWithToJson.toJSON === "function"
    ? boardWithToJson.toJSON()
    : (board as unknown as Record<string, unknown>);
  const sortedColumns = boardJson.columns as Array<{ position: number }>;
  sortedColumns.sort((a, b) => a.position - b.position);

  return reply.code(200).send({ data: boardJson });
});
```

**Route registration order within `columnRoutes` (after modification)**:

The current order of routes in `columnRoutes` is:
1. `POST /:boardId/columns` (line 62)
2. `PUT /:boardId/columns/:columnId` (line 138)
3. `DELETE /:boardId/columns/:columnId` (line 213)

After modification, the order must be:
1. `POST /:boardId/columns` (existing, unchanged)
2. **`PUT /:boardId/columns/reorder` (NEW — inserted here)**
3. `PUT /:boardId/columns/:columnId` (existing, unchanged)
4. `DELETE /:boardId/columns/:columnId` (existing, unchanged)

This ensures Fastify matches the literal `/reorder` path before trying the `/:columnId` parameterized path.

**No changes to imports**: `ProjectModel`, `BoardModel`, and `TaskModel` are already imported. `TaskModel` is not needed for this route but is already in the import for the delete handler.

**No changes to `app.ts`**: `columnRoutes` is already registered under `/api/boards` prefix.

### 3.2 `packages/server/test/routes/board.routes.test.ts` (Modify)

**Changes**: Add a new `describe("PUT /api/boards/:boardId/columns/reorder", ...)` block inside the existing `describe("board routes", ...)` block, after the existing `DELETE /api/boards/:boardId/columns/:columnId` test group (currently ending at line 864).

**Helper function needed**: A helper to get all column IDs from a board in current order. This can be implemented inline or as a shared helper. Since several tests need the full set of column IDs, a helper is worthwhile:

```typescript
async function getColumnIds(projectId: string): Promise<string[]> {
  const response = await httpRequest({
    method: "get",
    path: `/api/projects/${projectId}/board`,
    expectedStatus: 200,
    headers: { authorization: `Bearer ${token}` },
  });
  const body = response.body as {
    data: { columns: Array<{ _id: unknown }> };
  };

  return body.data.columns.map((col) => normalizeId(col._id));
}
```

This helper is placed inside the `describe("board routes", ...)` block alongside `createProject` and `getColumnId`.

**Tests to add**:

1. **"reorders columns and updates all positions correctly"**
   - Create a project (auto-creates board with 4 default columns: "To Do" pos 0, "In Progress" pos 1, "In Review" pos 2, "Done" pos 3)
   - Get all column IDs via `getColumnIds(projectId)` → `[todoId, inProgressId, inReviewId, doneId]`
   - Reverse the order: `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds: [doneId, inReviewId, inProgressId, todoId] }` → expect 200
   - Assert `body.data` contains columns
   - Assert `body.data.columns` has length 4
   - Assert column names in order: `["Done", "In Review", "In Progress", "To Do"]`
   - Assert column positions in order: `[0, 1, 2, 3]`

2. **"persists reorder in subsequent board fetch"**
   - Create a project, get all column IDs
   - Reverse the order via reorder endpoint → expect 200
   - `GET /api/projects/:projectId/board` → expect 200
   - Assert column names in order: `["Done", "In Review", "In Progress", "To Do"]`
   - Assert column positions in order: `[0, 1, 2, 3]`

3. **"returns 400 when columnIds is missing"**
   - Create a project
   - `PUT /api/boards/:boardId/columns/reorder` with `{}` and auth header → expect 400
   - Assert `body.error` is `"columnIds must be a non-empty array of strings"`

4. **"returns 400 when columnIds is not an array"**
   - Create a project
   - `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds: "not-an-array" }` and auth header → expect 400
   - Assert `body.error` is `"columnIds must be a non-empty array of strings"`

5. **"returns 400 when columnIds contains extra IDs"**
   - Create a project, get all column IDs
   - `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds: [...allColumnIds, "aaaaaaaaaaaaaaaaaaaaaaaa"] }` → expect 400
   - Assert `body.error` is `"columnIds must include every column exactly once"`

6. **"returns 400 when columnIds is missing IDs"**
   - Create a project, get all column IDs
   - `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds: [allColumnIds[0], allColumnIds[1]] }` (only 2 of 4) → expect 400
   - Assert `body.error` is `"columnIds must include every column exactly once"`

7. **"returns 400 when columnIds contains duplicate IDs"**
   - Create a project, get all column IDs
   - `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds: [allColumnIds[0], allColumnIds[0], allColumnIds[1], allColumnIds[2]] }` (duplicate first, missing last) → expect 400
   - Assert `body.error` is `"columnIds must include every column exactly once"`

8. **"returns 400 when columnIds contains IDs not on the board"**
   - Create a project, get all column IDs
   - Replace one ID with a fabricated valid ObjectId: `{ columnIds: [allColumnIds[0], allColumnIds[1], allColumnIds[2], "aaaaaaaaaaaaaaaaaaaaaaaa"] }` → expect 400
   - Assert `body.error` is `"columnIds must include every column exactly once"`

9. **"returns 404 for non-existent boardId"**
   - `PUT /api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/reorder` with `{ columnIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"] }` and auth header → expect 404
   - Assert `body.error` is `"Board not found"`

10. **"returns 400 for invalid boardId format"**
    - `PUT /api/boards/not-a-valid-id/columns/reorder` with `{ columnIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"] }` and auth header → expect 400
    - Assert `body.error` is `"Invalid board ID"`

11. **"returns 401 without auth token"**
    - `PUT /api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/reorder` with `{ columnIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"] }` and no auth header → expect 401
    - Assert `body.error` is `"Unauthorized"`

12. **"reorder is idempotent with same order"**
    - Create a project, get all column IDs (already in default order)
    - `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds: allColumnIds }` (same order) → expect 200
    - Assert column names remain: `["To Do", "In Progress", "In Review", "Done"]`
    - Assert column positions remain: `[0, 1, 2, 3]`

## 4. Contracts

### Request: `PUT /api/boards/:boardId/columns/reorder`

**Path parameters**:
- `boardId` — valid MongoDB ObjectId string (24-char hex)

**Headers**:
- `Authorization: Bearer <jwt_token>` (required)

**Request body**:
```json
{
  "columnIds": [
    "64a1b2c3d4e5f6a7b8c9d001",
    "64a1b2c3d4e5f6a7b8c9d002",
    "64a1b2c3d4e5f6a7b8c9d003",
    "64a1b2c3d4e5f6a7b8c9d004"
  ]
}
```

The `columnIds` array must contain exactly the same set of column IDs that exist on the board. The order of the array defines the new position values: `columnIds[0]` → position 0, `columnIds[1]` → position 1, etc.

### Response: Success (200)

```json
{
  "data": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "project": "64a1b2c3d4e5f6a7b8c9d0e2",
    "columns": [
      { "_id": "64a...", "name": "Done", "position": 0 },
      { "_id": "64a...", "name": "In Review", "position": 1 },
      { "_id": "64a...", "name": "In Progress", "position": 2 },
      { "_id": "64a...", "name": "To Do", "position": 3 }
    ],
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z",
    "__v": 1
  }
}
```

### Response: Invalid/missing columnIds (400)

```json
{ "error": "columnIds must be a non-empty array of strings" }
```

### Response: Mismatched column IDs (400)

```json
{ "error": "columnIds must include every column exactly once" }
```

### Response: Invalid boardId format (400)

```json
{ "error": "Invalid board ID" }
```

### Response: Board not found (404)

```json
{ "error": "Board not found" }
```

### Response: Unauthorized (401)

```json
{ "error": "Unauthorized" }
```

## 5. Test Plan

### Test Setup

- **Database**: MongoDB at `mongodb://localhost:27017/taskboard_test`
- **Lifecycle**: Already established in `board.routes.test.ts` from Tasks t01–t04:
  - `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, detect supertest availability
  - `beforeEach`: `clearCollections()`, `seedAdminUser()`, `getAuthToken()`
  - `afterAll`: `app.close()`, `teardownTestDb()`
- **HTTP client**: Dual-mode `httpRequest` helper (supertest if TCP binding works, Fastify inject otherwise)
- **Data setup**: Projects created via `createProject()` helper which returns `{ projectId, boardId }`; column IDs retrieved via new `getColumnIds()` helper (returns all IDs in order)

### Test Specifications

| # | Test Name | Setup | Action | Assertions |
|---|-----------|-------|--------|------------|
| 1 | reorders columns and updates all positions correctly | `createProject("Reorder Test")`, get all column IDs | PUT `/api/boards/:boardId/columns/reorder` with reversed `columnIds` | 200; columns length 4; names = ["Done", "In Review", "In Progress", "To Do"]; positions = [0,1,2,3] |
| 2 | persists reorder in subsequent board fetch | `createProject("Persist Test")`, get all column IDs, reverse via reorder | GET `/api/projects/:projectId/board` | 200; names = ["Done", "In Review", "In Progress", "To Do"]; positions = [0,1,2,3] |
| 3 | returns 400 when columnIds is missing | `createProject("Missing Field")` | PUT `/api/boards/:boardId/columns/reorder` with `{}` | 400; error = "columnIds must be a non-empty array of strings" |
| 4 | returns 400 when columnIds is not an array | `createProject("Not Array")` | PUT `/api/boards/:boardId/columns/reorder` with `{ columnIds: "not-an-array" }` | 400; error = "columnIds must be a non-empty array of strings" |
| 5 | returns 400 when columnIds contains extra IDs | `createProject("Extra IDs")`, get all column IDs | PUT with `[...allIds, "aaaaaaaaaaaaaaaaaaaaaaaa"]` | 400; error = "columnIds must include every column exactly once" |
| 6 | returns 400 when columnIds is missing IDs | `createProject("Missing IDs")`, get all column IDs | PUT with only first 2 IDs | 400; error = "columnIds must include every column exactly once" |
| 7 | returns 400 when columnIds contains duplicate IDs | `createProject("Dup IDs")`, get all column IDs | PUT with `[id[0], id[0], id[1], id[2]]` | 400; error = "columnIds must include every column exactly once" |
| 8 | returns 400 when columnIds contains IDs not on the board | `createProject("Bad IDs")`, get all column IDs | PUT with one ID replaced by `"aaaaaaaaaaaaaaaaaaaaaaaa"` | 400; error = "columnIds must include every column exactly once" |
| 9 | returns 404 for non-existent boardId | None | PUT `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/reorder` with `{ columnIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"] }` | 404; error = "Board not found" |
| 10 | returns 400 for invalid boardId format | None | PUT `/api/boards/not-a-valid-id/columns/reorder` with `{ columnIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"] }` | 400; error = "Invalid board ID" |
| 11 | returns 401 without auth token | None | PUT `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/columns/reorder` with `{ columnIds: ["aaaaaaaaaaaaaaaaaaaaaaaa"] }`, no auth | 401; error = "Unauthorized" |
| 12 | reorder is idempotent with same order | `createProject("Idempotent")`, get all column IDs | PUT with same order as current | 200; names = ["To Do", "In Progress", "In Review", "Done"]; positions = [0,1,2,3] |

## 6. Implementation Order

1. **Modify `packages/server/src/routes/board.routes.ts`**
   - Add `isValidReorderBody` validation helper after `isValidCreateColumnBody`
   - Add `PUT /:boardId/columns/reorder` handler inside the `columnRoutes` plugin, **before** the existing `PUT /:boardId/columns/:columnId` handler (critical for route matching)
   - Reuse existing `isValidObjectId` helper and ownership verification pattern
   - Follow the same board save and toJSON serialization patterns from t02–t04
2. **Modify `packages/server/test/routes/board.routes.test.ts`**
   - Add `getColumnIds` helper function inside the `describe("board routes", ...)` block
   - Add `describe("PUT /api/boards/:boardId/columns/reorder", ...)` test group after the existing DELETE test group
   - Implement all 12 test cases
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