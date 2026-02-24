# Task 6 Implementation Plan: Write integration tests for all task endpoints

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/helpers/mongoose.test-double.ts` | Modify | Extend the in-memory test double to support `.populate()` on `findOne`, `$ne` operator in `matches`, and `$gte` operator in `matches` — all required by the task route handlers |
| 2 | `packages/server/test/routes/task.routes.test.ts` | Create | Comprehensive integration tests for all six task endpoints following the established test conventions |

## 2. Dependencies

- **Tasks 1–5 (all completed)** — All six task endpoint handlers are implemented in `packages/server/src/routes/task.routes.ts`
- **Phase 1 & 2 complete** — Project and board/column APIs needed for test setup (creating projects auto-creates boards with default columns)
- **Existing test infrastructure**:
  - `setupTestDb`, `clearCollections`, `teardownTestDb` from `test/helpers/db.ts`
  - Mongoose test double at `test/helpers/mongoose.test-double.ts`
  - `buildApp` from `src/app.ts`
  - `UserModel`, `hashPassword` from `src/models/index.js`
  - `LabelModel`, `CommentModel`, `TaskModel` for direct data setup
- **Models**: `LabelModel` for creating labels (label CRUD API not yet available in Phase 3, so labels are created directly via model)

## 3. Implementation Details

### 3.1 Mongoose Test Double Extensions (`test/helpers/mongoose.test-double.ts`)

The current test double lacks three features required by the task routes:

#### 3.1.1 `$ne` operator in `matches` function

The move endpoint uses `{ _id: { $ne: id } }` to exclude the moving task from source column queries. Add `$ne` handling in the `matches` function alongside the existing `$in` handler.

**Location**: Inside the `matches` function (lines 89-106), in the operator-checking `if` block.

**Logic**: After the existing `$in` check:
```typescript
if ("$ne" in operators) {
  const docVal = normalizeForCompare(doc[key]);
  const neVal = normalizeForCompare(operators.$ne);
  return docVal !== neVal;
}
```

#### 3.1.2 `$gte` operator in `matches` function

The move endpoint uses `{ position: { $gte: clampedPosition } }` to find tasks at or after a position. Add `$gte` handling.

**Location**: Same operator-checking block in `matches`.

**Logic**: After `$ne`:
```typescript
if ("$gte" in operators) {
  const docVal = doc[key];
  const gteVal = operators.$gte;
  if (typeof docVal === "number" && typeof gteVal === "number") {
    return docVal >= gteVal;
  }
  return false;
}
```

#### 3.1.3 `.populate()` chain method on `findOne`

The `GET /api/tasks/:id` handler chains `.findOne({ _id: id }).populate("labels")`. The current `findOne` returns a plain Promise, with no `.populate()` method.

**Approach**: Change `findOne` to return a thenable query object (like `find` already does) that has a `.populate()` method.

**Location**: Replace the `findOne` method in the `model` function (lines 315-317).

**New implementation**:
```typescript
findOne(filter: Record<string, unknown> = {}) {
  const found = getCollectionDocs(name).find((doc) => matches(doc, filter));
  let result = found ?? null;
  const query = {
    populate(field: string) {
      if (result && field && Array.isArray(result[field])) {
        const refDocs = result[field] as unknown[];
        const fieldDef = schema.definition[field];
        let refModelName: string | null = null;

        if (Array.isArray(fieldDef)) {
          const itemDef = fieldDef[0];
          if (itemDef && typeof itemDef === "object" && itemDef.ref) {
            refModelName = itemDef.ref;
          }
        } else if (fieldDef && typeof fieldDef === "object" && fieldDef.ref) {
          refModelName = fieldDef.ref;
        }

        if (refModelName) {
          const refCollection = getCollectionDocs(refModelName);
          const populated = refDocs.map((refId) => {
            const refIdStr = normalizeForCompare(refId);
            const refDoc = refCollection.find(
              (doc) => normalizeForCompare(doc._id) === refIdStr
            );
            return refDoc ?? refId;
          });
          result = { ...result, [field]: populated };
        }
      }
      return this;
    },
    then(
      onfulfilled?: (value: Record<string, unknown> | null) => unknown,
      onrejected?: (reason: unknown) => unknown
    ) {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    },
  };
  return query;
},
```

This makes `findOne` return a thenable with a `.populate()` method. When `.populate("labels")` is called, it looks up the `labels` field in the schema to find the `ref` model name, then resolves each ObjectId in the array against that collection. The result is a copy of the document with `labels` replaced by full label objects.

### 3.2 Test File (`packages/server/test/routes/task.routes.test.ts`)

#### 3.2.1 Imports and Setup

Follow the exact pattern from `board.routes.test.ts` and `project.routes.test.ts`:

```typescript
import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import {
  UserModel,
  hashPassword,
  TaskModel,
  CommentModel,
  LabelModel,
} from "../../src/models/index.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/db.js";
```

#### 3.2.2 Shared Infrastructure

Copy the exact same patterns from existing test files:

- `type HttpMethod = "get" | "post" | "put" | "delete";`
- `normalizeId(value: unknown): string` — same implementation as in `board.routes.test.ts:11-26`
- `canBindTcpPort(): Promise<boolean>` — same implementation as in `board.routes.test.ts:28-37`
- `let app: FastifyInstance`, `let useSupertest = true`, `let token = ""`
- `seedAdminUser()` — same as `board.routes.test.ts:44-51`
- `getAuthToken()` — same as `board.routes.test.ts:53-65`
- `httpRequest(options)` — same as `board.routes.test.ts:67-102`

#### 3.2.3 Helper Functions

**`createProject(name: string): Promise<{ projectId: string; boardId: string }>`**

Same as `board.routes.test.ts:104-131` — creates a project via API, fetches the board, returns both IDs.

**`createTask(boardId: string, body: Record<string, unknown>): Promise<Record<string, unknown>>`**

```typescript
async function createTask(
  boardId: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await httpRequest({
    method: "post",
    path: `/api/boards/${boardId}/tasks`,
    expectedStatus: 201,
    payload: body,
    headers: { authorization: `Bearer ${token}` },
  });
  const responseBody = response.body as { data: Record<string, unknown> };
  return responseBody.data;
}
```

**`getTasks(boardId: string, query?: string): Promise<Record<string, unknown>[]>`**

```typescript
async function getTasks(
  boardId: string,
  query?: string,
): Promise<Record<string, unknown>[]> {
  const path = query
    ? `/api/boards/${boardId}/tasks?${query}`
    : `/api/boards/${boardId}/tasks`;
  const response = await httpRequest({
    method: "get",
    path,
    expectedStatus: 200,
    headers: { authorization: `Bearer ${token}` },
  });
  const responseBody = response.body as { data: Record<string, unknown>[] };
  return responseBody.data;
}
```

#### 3.2.4 Lifecycle Hooks

```typescript
beforeAll(async () => {
  await setupTestDb();
  app = await buildApp();
  await app.ready();
  useSupertest = await canBindTcpPort();
});

beforeEach(async () => {
  await clearCollections();
  await seedAdminUser();
  token = await getAuthToken();
});

afterAll(async () => {
  await app.close();
  await teardownTestDb();
});
```

#### 3.2.5 Test Suites

**Suite 1: `describe("POST /api/boards/:boardId/tasks")`**

| # | Test | Setup | Action | Assertions |
|---|------|-------|--------|------------|
| 1 | Creates a task with title only, verifying defaults | `createProject("Task Defaults")` | POST `/:boardId/tasks` with `{ title: "My Task" }` | Status 201; `data.title === "My Task"`, `data.status === "To Do"`, `data.priority === "medium"`, `data.position === 0`, `data.board` equals boardId, `data.project` equals projectId, `data._id` defined, `data.createdAt` defined, `data.updatedAt` defined |
| 2 | Creates a task with all fields | `createProject`, create a label via `LabelModel.create({ name: "Bug", color: "#ef4444", project: projectId })` | POST with `{ title: "Full Task", description: "desc", priority: "high", dueDate: "2026-03-15", labels: [labelId], status: "In Progress" }` | Status 201; all fields match input; `data.position === 0` (first task in "In Progress") |
| 3 | Second task in same column gets position 1 | `createProject`, create first task `{ title: "Task 1" }` | POST `{ title: "Task 2" }` | Status 201; `data.position === 1` |
| 4 | Task in different column gets position 0 | `createProject`, create task in "To Do" | POST `{ title: "Other", status: "In Progress" }` | Status 201; `data.position === 0`, `data.status === "In Progress"` |
| 5 | Returns 400 when title is missing | `createProject` | POST `{ description: "no title" }` | Status 400; `error` contains "Title is required" |
| 6 | Returns 400 when title is empty string | `createProject` | POST `{ title: "" }` | Status 400 |
| 7 | Returns 400 when status doesn't match any column name | `createProject` | POST `{ title: "X", status: "Nonexistent" }` | Status 400; error contains "Invalid status" |
| 8 | Returns 404 for non-existent board ID | None | POST to `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/tasks` with `{ title: "X" }` | Status 404; `error === "Board not found"` |
| 9 | Returns 400 for invalid board ID format | None | POST to `/api/boards/not-valid/tasks` | Status 400; `error === "Invalid board ID"` |
| 10 | Returns 401 without auth token | None | POST without authorization header | Status 401; `error === "Unauthorized"` |

**Suite 2: `describe("GET /api/boards/:boardId/tasks")`**

| # | Test | Setup | Action | Assertions |
|---|------|-------|--------|------------|
| 1 | Returns all tasks for a board | `createProject`, create 3 tasks | GET `/:boardId/tasks` | Status 200; `data` has length 3 |
| 2 | Returns tasks sorted by position ascending by default | `createProject`, create 3 tasks in same column | GET `/:boardId/tasks` | `data[0].position === 0`, `data[1].position === 1`, `data[2].position === 2` |
| 3 | Filters by status | `createProject`, create task in "To Do" and task with `status: "In Progress"` | GET `?status=To+Do` | `data` has length 1; `data[0].status === "To Do"` |
| 4 | Filters by priority | `createProject`, create task with `priority: "high"` and task with `priority: "low"` | GET `?priority=high` | `data` has length 1; `data[0].priority === "high"` |
| 5 | Filters by label | `createProject`, create label via `LabelModel.create()`, create task with `labels: [labelId]` and task without labels | GET `?label=<labelId>` | `data` has length 1; labels array contains the label ID |
| 6 | Sorts by createdAt ascending | `createProject`, create tasks with delay between them | GET `?sort=createdAt&order=asc` | First task has earlier createdAt than second |
| 7 | Sorts by createdAt descending | Same setup | GET `?sort=createdAt&order=desc` | First task has later createdAt than second |
| 8 | Sorts by dueDate ascending | `createProject`, create task with dueDate "2026-04-01" and task with dueDate "2026-03-01" | GET `?sort=dueDate&order=asc` | Task with "2026-03-01" comes first |
| 9 | Sorts by dueDate descending | Same setup | GET `?sort=dueDate&order=desc` | Task with "2026-04-01" comes first |
| 10 | Combines filter and sort | `createProject`, create tasks with varying status and createdAt | GET `?status=To+Do&sort=createdAt&order=desc` | Only "To Do" tasks, sorted descending by createdAt |
| 11 | Returns empty array for board with no tasks | `createProject` | GET `/:boardId/tasks` | Status 200; `data === []` |
| 12 | Returns 404 for non-existent board | None | GET `/api/boards/aaaaaaaaaaaaaaaaaaaaaaaa/tasks` | Status 404; `error === "Board not found"` |
| 13 | Returns 400 for invalid board ID format | None | GET `/api/boards/not-valid/tasks` | Status 400; `error === "Invalid board ID"` |
| 14 | Returns 401 without auth token | None | GET without authorization header | Status 401; `error === "Unauthorized"` |

**Suite 3: `describe("GET /api/tasks/:id")`**

| # | Test | Setup | Action | Assertions |
|---|------|-------|--------|------------|
| 1 | Returns task with populated labels | `createProject`, create label via `LabelModel.create()`, create task with `labels: [labelId]` | GET `/api/tasks/:taskId` | Status 200; `data.labels[0]` is an object with `name`, `color`, `project` (not just an ID string) |
| 2 | Returns task with empty labels array | `createProject`, create task with no labels | GET `/api/tasks/:taskId` | Status 200; `data.labels` is empty array `[]` |
| 3 | Returns 404 for non-existent task ID | None | GET `/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa` | Status 404; `error === "Task not found"` |
| 4 | Returns 400 for invalid ObjectId format | None | GET `/api/tasks/not-valid` | Status 400; `error === "Invalid task ID"` |
| 5 | Returns 401 without auth token | None | GET without authorization header | Status 401; `error === "Unauthorized"` |

**Suite 4: `describe("PUT /api/tasks/:id")`**

| # | Test | Setup | Action | Assertions |
|---|------|-------|--------|------------|
| 1 | Updates title | `createProject`, create task | PUT with `{ title: "Updated" }` | Status 200; `data.title === "Updated"` |
| 2 | Updates description | Create task | PUT with `{ description: "New desc" }` | Status 200; `data.description === "New desc"` |
| 3 | Updates priority | Create task | PUT with `{ priority: "high" }` | Status 200; `data.priority === "high"` |
| 4 | Updates dueDate | Create task | PUT with `{ dueDate: "2026-04-01" }` | Status 200; `data.dueDate` contains "2026-04-01" |
| 5 | Clears dueDate with null | Create task with dueDate | PUT with `{ dueDate: null }` | Status 200; `data.dueDate === null` |
| 6 | Updates labels array | `createProject`, create label, create task | PUT with `{ labels: [labelId] }` | Status 200; `data.labels` includes label ID |
| 7 | Updates multiple fields at once | Create task | PUT with `{ title: "New", priority: "low" }` | Status 200; both fields updated |
| 8 | Returns 400 when no valid fields provided | Create task | PUT with `{}` | Status 400; error contains "At least one valid field" |
| 9 | Returns 400 for invalid priority | Create task | PUT with `{ priority: "critical" }` | Status 400 |
| 10 | Returns 400 for empty title | Create task | PUT with `{ title: "" }` | Status 400 |
| 11 | Returns 404 for non-existent task | None | PUT `/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa` with `{ title: "X" }` | Status 404; `error === "Task not found"` |
| 12 | Returns 400 for invalid ObjectId format | None | PUT `/api/tasks/not-valid` with `{ title: "X" }` | Status 400; `error === "Invalid task ID"` |
| 13 | Returns 401 without auth token | None | PUT without authorization header | Status 401; `error === "Unauthorized"` |

**Suite 5: `describe("DELETE /api/tasks/:id")`**

| # | Test | Setup | Action | Assertions |
|---|------|-------|--------|------------|
| 1 | Deletes task and returns success message | `createProject`, create task | DELETE `/api/tasks/:taskId` | Status 200; `data.message === "Task deleted"` |
| 2 | Cascade deletes associated comments | `createProject`, create task, create comment via `CommentModel.create()` referencing the task | DELETE task | Status 200; verify `CommentModel.countDocuments({ task: taskId })` returns 0 |
| 3 | Reindexes positions of remaining tasks | `createProject`, create 3 tasks in "To Do" (positions 0, 1, 2) | DELETE the middle task (position 1) | Status 200; fetch remaining tasks sorted by position -> positions are 0 and 1 (contiguous) |
| 4 | Delete first task reindexes correctly | Create 3 tasks | DELETE task at position 0 | Remaining tasks have positions 0 and 1 |
| 5 | Delete last task leaves others unchanged | Create 3 tasks | DELETE task at position 2 | Remaining tasks still have positions 0 and 1 |
| 6 | Delete only task in column | Create single task | DELETE it | Column is empty; `data.message === "Task deleted"` |
| 7 | Returns 404 for non-existent task | None | DELETE `/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa` | Status 404; `error === "Task not found"` |
| 8 | Returns 400 for invalid ObjectId format | None | DELETE `/api/tasks/not-valid` | Status 400; `error === "Invalid task ID"` |
| 9 | Returns 401 without auth token | None | DELETE without authorization header | Status 401; `error === "Unauthorized"` |

**Suite 6: `describe("PUT /api/tasks/:id/move")`**

| # | Test | Setup | Action | Assertions |
|---|------|-------|--------|------------|
| 1 | Moves task to a different column | `createProject`, create task in "To Do" | PUT `/:id/move` with `{ position: 0, status: "In Progress" }` | Status 200; `data.status === "In Progress"`, `data.position === 0` |
| 2 | Reindexes source column after move out | Create 3 tasks in "To Do" (positions 0, 1, 2), move task at position 1 to "In Progress" | Fetch tasks in "To Do" | Two remaining tasks have positions 0 and 1 |
| 3 | Reindexes destination column after move in | Create 2 tasks in "In Progress" (positions 0, 1), move task from "To Do" to "In Progress" at position 0 | Fetch tasks in "In Progress" | Three tasks with positions 0 (moved), 1, 2 |
| 4 | Reorders within the same column | Create 3 tasks in "To Do" (positions 0, 1, 2), move task at position 0 to position 2 | PUT `/:id/move` with `{ position: 2 }` | Status 200; `data.position === 2`. Fetch all "To Do" tasks: all three have positions 0, 1, 2 |
| 5 | Moves to position 0 (beginning of column) | Create 2 tasks in "In Progress", move task from "To Do" to "In Progress" at position 0 | PUT with `{ position: 0, status: "In Progress" }` | `data.position === 0`; other tasks shifted to 1 and 2 |
| 6 | Moves to end of destination column | Create 2 tasks in "In Progress" (positions 0, 1) | Move task from "To Do" to "In Progress" at position 2 | `data.position === 2` |
| 7 | Clamps position to valid range | Create 1 task in "In Progress", move from "To Do" to "In Progress" at position 999 | PUT with `{ position: 999, status: "In Progress" }` | `data.position === 1` (clamped to count) |
| 8 | Move to empty column | `createProject`, create task in "To Do" | Move to "Done" at position 0 | `data.status === "Done"`, `data.position === 0` |
| 9 | Returns 400 for invalid status | Create task | PUT with `{ position: 0, status: "Nonexistent" }` | Status 400; error contains "Invalid status" |
| 10 | Returns 400 for missing position | Create task | PUT with `{ status: "In Progress" }` | Status 400; error contains "Position is required" |
| 11 | Returns 400 for negative position | Create task | PUT with `{ position: -1 }` | Status 400 |
| 12 | Returns 400 for non-integer position | Create task | PUT with `{ position: 1.5 }` | Status 400 |
| 13 | Returns 404 for non-existent task | None | PUT `/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/move` with `{ position: 0 }` | Status 404; `error === "Task not found"` |
| 14 | Returns 400 for invalid ObjectId format | None | PUT `/api/tasks/not-valid/move` with `{ position: 0 }` | Status 400; `error === "Invalid task ID"` |
| 15 | Returns 401 without auth token | None | PUT without authorization header | Status 401; `error === "Unauthorized"` |

## 4. Contracts

### Test Data Shapes

**Create task response** (from POST):
```json
{
  "data": {
    "_id": "<ObjectId>",
    "title": "string",
    "description": "string",
    "status": "string",
    "priority": "string",
    "position": 0,
    "dueDate": "string|null",
    "labels": ["<ObjectId>"],
    "board": "<ObjectId>",
    "project": "<ObjectId>",
    "createdAt": "ISO string",
    "updatedAt": "ISO string"
  }
}
```

**Get task response** (from GET /:id — labels populated):
```json
{
  "data": {
    "_id": "<ObjectId>",
    "title": "string",
    "labels": [
      {
        "_id": "<ObjectId>",
        "name": "Bug",
        "color": "#ef4444",
        "project": "<ObjectId>",
        "createdAt": "ISO string",
        "updatedAt": "ISO string"
      }
    ]
  }
}
```

**Delete task response**:
```json
{
  "data": {
    "message": "Task deleted"
  }
}
```

**Error response**:
```json
{
  "error": "string"
}
```

### Helper return shapes

- `createProject(name)` -> `{ projectId: string, boardId: string }`
- `createTask(boardId, body)` -> `Record<string, unknown>` (the `data` object from the response)
- `getTasks(boardId, query?)` -> `Record<string, unknown>[]` (the `data` array from the response)

## 5. Test Plan

The complete test plan is described in Section 3.2.5 with 6 test suites totaling approximately 66 individual test cases.

### Test Setup Per Suite

- **POST tests**: Each test calls `createProject` to get a fresh board, then exercises the POST endpoint
- **GET list tests**: Each test creates a project and tasks via the API helpers, then exercises filtering/sorting
- **GET single tests**: Create project + task, then fetch by ID; label test creates label via `LabelModel.create()` directly
- **PUT tests**: Create project + task, then update fields
- **DELETE tests**: Create project + tasks (and optionally comments via `CommentModel.create()`), then delete and verify side effects
- **MOVE tests**: Create project + multiple tasks across columns, then move and verify positions in both columns

### Isolation

- `clearCollections()` runs in `beforeEach`, wiping all collections between tests
- Each test creates its own project/board/tasks — no shared state between tests
- The admin user is re-seeded and a fresh token obtained before each test

### Label Tests

Since the Labels API (Phase 4) is not yet implemented, labels are created directly via `LabelModel.create({ name: "Bug", color: "#ef4444", project: projectId })`. The label's `_id` is then used in task creation bodies and for filter queries.

### Position Verification

For move and delete tests, after the operation, fetch ALL tasks for the board (optionally filtered by status) using the GET list endpoint, sort them by position, and verify contiguous 0-based positions.

### Comment Cascade Verification

After deleting a task with comments, use `CommentModel.countDocuments({ task: taskId })` directly to verify all comments were removed.

## 6. Implementation Order

1. **Extend `mongoose.test-double.ts`**
   - Add `$ne` operator support in the `matches` function
   - Add `$gte` operator support in the `matches` function
   - Convert `findOne` to return a thenable query object with `.populate()` method
   - Verify the changes don't break existing test files by running the existing test suite

2. **Create `task.routes.test.ts`**
   - Write imports, shared infrastructure (normalizeId, canBindTcpPort, httpRequest)
   - Write helper functions (createProject, createTask, getTasks)
   - Write lifecycle hooks (beforeAll, beforeEach, afterAll)
   - **Write Suite 1**: POST /api/boards/:boardId/tasks (10 tests)
   - **Write Suite 2**: GET /api/boards/:boardId/tasks (14 tests)
   - **Write Suite 3**: GET /api/tasks/:id (5 tests)
   - **Write Suite 4**: PUT /api/tasks/:id (13 tests)
   - **Write Suite 5**: DELETE /api/tasks/:id (9 tests)
   - **Write Suite 6**: PUT /api/tasks/:id/move (15 tests)

3. **Run full test suite** to verify all tests pass and no regressions in existing tests

## 7. Verification Commands

```bash
# 1. TypeScript compilation check
cd packages/server && npx tsc --noEmit

# 2. Run ALL tests (existing + new) to verify no regressions
cd packages/server && npm test

# 3. Run only the new task routes test file
cd packages/server && npx vitest run test/routes/task.routes.test.ts

# 4. Run existing tests to confirm no regressions from test-double changes
cd packages/server && npx vitest run test/routes/project.routes.test.ts
cd packages/server && npx vitest run test/routes/board.routes.test.ts

# 5. Full build check
npm run build --workspace=packages/server
```