Now I have all the information I need. Let me produce the implementation plan.

# Task 5: Label Integration Tests — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/routes/label.routes.test.ts` | Create | Integration tests for all four label endpoints |

## 2. Dependencies

- **Task 2** (`label.routes.ts`) — provides the route handlers under test
- **Task 3** (`app.ts` modifications) — registers the routes so endpoints are accessible
- **Test helpers**: `setupTestDb`, `teardownTestDb`, `clearCollections` from `../helpers/db.ts`
- **Models**: `UserModel`, `hashPassword`, `LabelModel`, `TaskModel` from `../../src/models/index.js`
- **App factory**: `buildApp` from `../../src/app.js`
- **External packages**: `vitest`, `supertest` (already installed)
- **MongoDB**: Running locally on `mongodb://localhost:27017` with `taskboard_test` database

## 3. Implementation Details

### 3.1 File: `packages/server/test/routes/label.routes.test.ts`

#### Imports

```typescript
import { createServer } from "node:net";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import {
  UserModel,
  hashPassword,
  LabelModel,
  TaskModel,
} from "../../src/models/index.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/db.js";
```

**Notes:**
- `LabelModel` is imported for direct database verification (e.g., checking label no longer exists after deletion, counting documents).
- `TaskModel` is imported for direct database verification of the label cleanup test (checking tasks no longer contain a deleted label ID in their `labels` array).
- No need to import `BoardModel`, `ProjectModel`, or `CommentModel` — project/board/task setup is done entirely through API calls via `httpRequest`, `createProject`, and `createTask` helpers.

#### Top-Level Utility Functions (outside `describe` block)

These are identical across all test files in the codebase:

**`type HttpMethod`**: `"get" | "post" | "put" | "delete"`

**`normalizeId(value: unknown): string`**: Handles both plain string IDs and `{ value: string }` ObjectId representations. Exact implementation from `task.routes.test.ts:17-32`.

```typescript
function normalizeId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "value" in value &&
    typeof (value as { value?: unknown }).value === "string"
  ) {
    return (value as { value: string }).value;
  }

  return String(value);
}
```

**`canBindTcpPort(): Promise<boolean>`**: Creates a TCP server to check if port binding is available, determining whether to use supertest or Fastify inject. Exact implementation from `task.routes.test.ts:34-43`.

```typescript
async function canBindTcpPort(): Promise<boolean> {
  return await new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.listen(0, "127.0.0.1", () => {
      server.close(() => resolve(true));
    });
  });
}
```

#### Describe Block: `"label routes"`

##### Closure Variables

```typescript
let app: FastifyInstance;
let useSupertest = true;
let token = "";
```

##### Helper Functions (inside `describe` block)

**`seedAdminUser(): Promise<void>`**
- Creates admin user with `email: "admin@taskboard.local"`, `name: "Admin"`, `passwordHash` from `hashPassword("admin123")`
- Identical to `task.routes.test.ts:50-57`

**`getAuthToken(): Promise<string>`**
- POSTs to `/api/auth/login` with admin credentials
- Returns `body.data.token`
- Identical to `task.routes.test.ts:59-71`

**`httpRequest(options: {...}): Promise<{ body: unknown }>`**
- Supports both supertest and Fastify inject modes
- Parameters: `method`, `path`, `expectedStatus`, optional `payload`, optional `headers`
- Identical to `task.routes.test.ts:73-108`

**`createProject(name: string): Promise<{ projectId: string; boardId: string }>`**
- Creates a project via POST `/api/projects`, then fetches its board via GET `/api/projects/:projectId/board`
- Returns `{ projectId, boardId }`
- Identical to `task.routes.test.ts:110-137`

**`createTask(boardId: string, body: Record<string, unknown>): Promise<Record<string, unknown>>`**
- Creates a task via POST `/api/boards/:boardId/tasks`
- Returns `responseBody.data`
- Identical to `task.routes.test.ts:139-152`

**`createLabel(projectId: string, name: string, color: string): Promise<Record<string, unknown>>`** — NEW helper specific to this test file
- POSTs to `/api/projects/:projectId/labels` with `{ name, color }` payload and auth header
- Returns `responseBody.data` (the created label object)
- Implementation:
  ```typescript
  async function createLabel(
    projectId: string,
    name: string,
    color: string,
  ): Promise<Record<string, unknown>> {
    const response = await httpRequest({
      method: "post",
      path: `/api/projects/${projectId}/labels`,
      expectedStatus: 201,
      payload: { name, color },
      headers: { authorization: `Bearer ${token}` },
    });
    const responseBody = response.body as { data: Record<string, unknown> };
    return responseBody.data;
  }
  ```

##### Lifecycle Hooks

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

Identical to all existing test files.

##### Test Cases

###### `describe("POST /api/projects/:projectId/labels")`

**Test 1: `"creates label with correct shape"`**
- Setup: `createProject("Label Create")` → extract `projectId`
- Action: `createLabel(projectId, "Bug", "#ef4444")`
- Assertions:
  - `expect(label._id).toBeDefined()`
  - `expect(label.name).toBe("Bug")`
  - `expect(label.color).toBe("#ef4444")`
  - `expect(normalizeId(label.project)).toBe(projectId)`
  - `expect(label.createdAt).toBeDefined()`
  - `expect(label.updatedAt).toBeDefined()`

**Test 2: `"returns 400 when name is missing"`**
- Setup: `createProject("Label Missing Name")` → extract `projectId`
- Action: `httpRequest({ method: "post", path: /api/projects/${projectId}/labels, expectedStatus: 400, payload: { color: "#ef4444" }, headers: auth })`
- Assertions:
  - `const body = response.body as { error: string }`
  - `expect(body.error).toBe("Label name and color are required")`

**Test 3: `"returns 400 when color is missing"`**
- Setup: `createProject("Label Missing Color")` → extract `projectId`
- Action: `httpRequest({ method: "post", path: ..., expectedStatus: 400, payload: { name: "Bug" }, headers: auth })`
- Assertions:
  - `const body = response.body as { error: string }`
  - `expect(body.error).toBe("Label name and color are required")`

**Test 4: `"returns 400 when name is empty string"`**
- Setup: `createProject("Label Empty Name")` → extract `projectId`
- Action: `httpRequest({ method: "post", path: ..., expectedStatus: 400, payload: { name: "", color: "#ef4444" }, headers: auth })`
- Assertions:
  - `const body = response.body as { error: string }`
  - `expect(body.error).toBe("Label name and color are required")`

**Test 5: `"returns 404 for non-existent project ID"`**
- No project setup needed
- Action: `httpRequest({ method: "post", path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/labels", expectedStatus: 404, payload: { name: "Bug", color: "#ef4444" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Project not found")`

**Test 6: `"returns 400 for invalid project ID format"`**
- Action: `httpRequest({ method: "post", path: "/api/projects/not-valid/labels", expectedStatus: 400, payload: { name: "Bug", color: "#ef4444" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Invalid project ID")`

**Test 7: `"returns 401 without auth token"`**
- Action: `httpRequest({ method: "post", path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/labels", expectedStatus: 401, payload: { name: "Bug", color: "#ef4444" } })` (no `headers`)
- Assertions:
  - `expect(body.error).toBe("Unauthorized")`

###### `describe("GET /api/projects/:projectId/labels")`

**Test 8: `"returns labels sorted by createdAt ascending"`**
- Setup: `createProject("Label List Sorted")` → extract `projectId` → create 3 labels with `createLabel` (add `await new Promise(resolve => setTimeout(resolve, 10))` between creations to ensure distinct `createdAt` timestamps)
  - `createLabel(projectId, "First", "#111111")`
  - `await new Promise(resolve => setTimeout(resolve, 10))`
  - `createLabel(projectId, "Second", "#222222")`
  - `await new Promise(resolve => setTimeout(resolve, 10))`
  - `createLabel(projectId, "Third", "#333333")`
- Action: `httpRequest({ method: "get", path: /api/projects/${projectId}/labels, expectedStatus: 200, headers: auth })`
- Assertions on `body.data` (typed as `Array<Record<string, unknown>>`):
  - `expect(labels).toHaveLength(3)`
  - `expect(labels[0].name).toBe("First")` (first created should be first)
  - `expect(labels[1].name).toBe("Second")`
  - `expect(labels[2].name).toBe("Third")`

**Test 9: `"returns empty array when project has no labels"`**
- Setup: `createProject("Label List Empty")` → extract `projectId`
- Action: `httpRequest({ method: "get", path: /api/projects/${projectId}/labels, expectedStatus: 200, headers: auth })`
- Assertions:
  - `const body = response.body as { data: unknown[] }`
  - `expect(body.data).toEqual([])`

**Test 10: `"returns 404 for non-existent project"`**
- Action: `httpRequest({ method: "get", path: "/api/projects/aaaaaaaaaaaaaaaaaaaaaaaa/labels", expectedStatus: 404, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Project not found")`

**Test 11: `"returns 400 for invalid project ID format"`**
- Action: `httpRequest({ method: "get", path: "/api/projects/not-valid/labels", expectedStatus: 400, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Invalid project ID")`

###### `describe("PUT /api/labels/:id")`

**Test 12: `"updates label name"`**
- Setup: `createProject("Label Update Name")` → `createLabel(projectId, "Bug", "#ef4444")` → extract `labelId` via `normalizeId(label._id)`
- Action: `httpRequest({ method: "put", path: /api/labels/${labelId}, expectedStatus: 200, payload: { name: "Feature" }, headers: auth })`
- Assertions:
  - `const body = response.body as { data: { name: string; color: string } }`
  - `expect(body.data.name).toBe("Feature")`
  - `expect(body.data.color).toBe("#ef4444")` — color unchanged

**Test 13: `"updates label color"`**
- Setup: `createProject("Label Update Color")` → `createLabel(projectId, "Bug", "#ef4444")` → extract `labelId`
- Action: `httpRequest({ method: "put", path: /api/labels/${labelId}, expectedStatus: 200, payload: { color: "#22c55e" }, headers: auth })`
- Assertions:
  - `const body = response.body as { data: { name: string; color: string } }`
  - `expect(body.data.color).toBe("#22c55e")`
  - `expect(body.data.name).toBe("Bug")` — name unchanged

**Test 14: `"updates both name and color"`**
- Setup: `createProject("Label Update Both")` → `createLabel(projectId, "Bug", "#ef4444")` → extract `labelId`
- Action: `httpRequest({ method: "put", path: /api/labels/${labelId}, expectedStatus: 200, payload: { name: "Feature", color: "#22c55e" }, headers: auth })`
- Assertions:
  - `expect(body.data.name).toBe("Feature")`
  - `expect(body.data.color).toBe("#22c55e")`

**Test 15: `"returns 400 when no valid fields provided"`**
- Setup: `createProject("Label Update Empty")` → `createLabel(projectId, "Bug", "#ef4444")` → extract `labelId`
- Action: `httpRequest({ method: "put", path: /api/labels/${labelId}, expectedStatus: 400, payload: {}, headers: auth })`
- Assertions:
  - `const body = response.body as { error: string }`
  - `expect(body.error).toBe("At least one valid field is required")`

**Test 16: `"returns 400 when name is empty string"`**
- Setup: `createProject("Label Update Empty Name")` → `createLabel(projectId, "Bug", "#ef4444")` → extract `labelId`
- Action: `httpRequest({ method: "put", path: /api/labels/${labelId}, expectedStatus: 400, payload: { name: "" }, headers: auth })`
- Assertions:
  - `const body = response.body as { error: string }`
  - `expect(body.error).toBe("At least one valid field is required")`

**Test 17: `"returns 404 for non-existent label"`**
- Action: `httpRequest({ method: "put", path: "/api/labels/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 404, payload: { name: "X" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Label not found")`

**Test 18: `"returns 400 for invalid label ID format"`**
- Action: `httpRequest({ method: "put", path: "/api/labels/not-valid", expectedStatus: 400, payload: { name: "X" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Invalid label ID")`

###### `describe("DELETE /api/labels/:id")`

**Test 19: `"deletes label and returns success message"`**
- Setup: `createProject("Label Delete")` → `createLabel(projectId, "Bug", "#ef4444")` → extract `labelId`
- Action: `httpRequest({ method: "delete", path: /api/labels/${labelId}, expectedStatus: 200, headers: auth })`
- Assertions:
  - `const body = response.body as { data: { message: string } }`
  - `expect(body.data.message).toBe("Label deleted")`
  - Database verification: `const count = await LabelModel.countDocuments({ _id: labelId }); expect(count).toBe(0);`

**Test 20: `"removes label reference from all tasks that had it"`** — CRITICAL TEST
- Setup:
  1. `createProject("Label Delete Cleanup")` → extract `projectId`, `boardId`
  2. `createLabel(projectId, "Bug", "#ef4444")` → extract `labelId`
  3. Create two tasks: `task1 = await createTask(boardId, { title: "Task 1" })`, `task2 = await createTask(boardId, { title: "Task 2" })`
  4. Attach the label to both tasks via PUT `/api/tasks/:id`:
     - `await httpRequest({ method: "put", path: /api/tasks/${normalizeId(task1._id)}, expectedStatus: 200, payload: { labels: [labelId] }, headers: auth })`
     - `await httpRequest({ method: "put", path: /api/tasks/${normalizeId(task2._id)}, expectedStatus: 200, payload: { labels: [labelId] }, headers: auth })`
  5. Verify labels were attached (optional but makes test more readable):
     - Fetch task1 and confirm labels array contains the labelId
- Action: `httpRequest({ method: "delete", path: /api/labels/${labelId}, expectedStatus: 200, headers: auth })`
- Assertions:
  - `expect(body.data.message).toBe("Label deleted")`
  - Database verification on task1: 
    ```typescript
    const updatedTask1 = await TaskModel.findOne({ _id: normalizeId(task1._id) });
    const task1Labels = (updatedTask1 as unknown as { labels: unknown[] }).labels.map(normalizeId);
    expect(task1Labels).not.toContain(labelId);
    ```
  - Database verification on task2:
    ```typescript
    const updatedTask2 = await TaskModel.findOne({ _id: normalizeId(task2._id) });
    const task2Labels = (updatedTask2 as unknown as { labels: unknown[] }).labels.map(normalizeId);
    expect(task2Labels).not.toContain(labelId);
    ```

**Test 21: `"returns 404 for non-existent label"`**
- Action: `httpRequest({ method: "delete", path: "/api/labels/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 404, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Label not found")`

**Test 22: `"returns 400 for invalid label ID format"`**
- Action: `httpRequest({ method: "delete", path: "/api/labels/not-valid", expectedStatus: 400, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Invalid label ID")`

**Test 23: `"returns 401 without auth token"`**
- Action: `httpRequest({ method: "delete", path: "/api/labels/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 401 })`
- Assertions:
  - `expect(body.error).toBe("Unauthorized")`

## 4. Contracts

This task does not introduce new API contracts — it tests the existing contracts defined by the label route handlers (Task 2). The exact request/response shapes being tested are:

**POST /api/projects/:projectId/labels**
```
Request:  { "name": "Bug", "color": "#ef4444" }
Success:  201 { "data": { "_id": "...", "name": "Bug", "color": "#ef4444", "project": "...", "createdAt": "...", "updatedAt": "..." } }
Error:    400 { "error": "Label name and color are required" }
Error:    400 { "error": "Invalid project ID" }
Error:    404 { "error": "Project not found" }
Error:    401 { "error": "Unauthorized" }
```

**GET /api/projects/:projectId/labels**
```
Success:  200 { "data": [ { "_id": "...", "name": "Bug", "color": "#ef4444", "project": "...", "createdAt": "...", "updatedAt": "..." } ] }
Error:    400 { "error": "Invalid project ID" }
Error:    404 { "error": "Project not found" }
```

**PUT /api/labels/:id**
```
Request:  { "name": "Feature", "color": "#22c55e" }
Success:  200 { "data": { "_id": "...", "name": "Feature", "color": "#22c55e", "project": "...", "createdAt": "...", "updatedAt": "..." } }
Error:    400 { "error": "At least one valid field is required" }
Error:    400 { "error": "Invalid label ID" }
Error:    404 { "error": "Label not found" }
```

**DELETE /api/labels/:id**
```
Success:  200 { "data": { "message": "Label deleted" } }
Error:    400 { "error": "Invalid label ID" }
Error:    404 { "error": "Label not found" }
Error:    401 { "error": "Unauthorized" }
```

## 5. Test Plan

### Test Matrix (23 test cases)

| # | Endpoint | Test Case | Expected |
|---|----------|-----------|----------|
| 1 | POST /api/projects/:projectId/labels | Creates label with correct shape | 201 |
| 2 | POST /api/projects/:projectId/labels | Name missing | 400 |
| 3 | POST /api/projects/:projectId/labels | Color missing | 400 |
| 4 | POST /api/projects/:projectId/labels | Name empty string | 400 |
| 5 | POST /api/projects/:projectId/labels | Non-existent project ID (valid ObjectId) | 404 |
| 6 | POST /api/projects/:projectId/labels | Invalid project ID format | 400 |
| 7 | POST /api/projects/:projectId/labels | No auth token | 401 |
| 8 | GET /api/projects/:projectId/labels | Returns sorted labels by createdAt ascending | 200 |
| 9 | GET /api/projects/:projectId/labels | Empty array when no labels | 200 |
| 10 | GET /api/projects/:projectId/labels | Non-existent project ID | 404 |
| 11 | GET /api/projects/:projectId/labels | Invalid project ID format | 400 |
| 12 | PUT /api/labels/:id | Updates name only | 200 |
| 13 | PUT /api/labels/:id | Updates color only | 200 |
| 14 | PUT /api/labels/:id | Updates both name and color | 200 |
| 15 | PUT /api/labels/:id | No valid fields (empty object) | 400 |
| 16 | PUT /api/labels/:id | Name empty string | 400 |
| 17 | PUT /api/labels/:id | Non-existent label ID | 404 |
| 18 | PUT /api/labels/:id | Invalid label ID format | 400 |
| 19 | DELETE /api/labels/:id | Deletes label, verified in DB | 200 |
| 20 | DELETE /api/labels/:id | Removes label reference from all tasks (critical cleanup test) | 200 |
| 21 | DELETE /api/labels/:id | Non-existent label ID | 404 |
| 22 | DELETE /api/labels/:id | Invalid label ID format | 400 |
| 23 | DELETE /api/labels/:id | No auth token | 401 |

### Test Setup

- **beforeAll**: Connect to test DB, build Fastify app, check port binding
- **beforeEach**: Clear all collections, seed admin user, get auth token
- **afterAll**: Close app, teardown test DB

### Test Isolation

- `clearCollections()` runs before every test, ensuring complete isolation
- Each test creates its own project/board/task/label data from scratch
- No shared state between tests beyond the app instance and DB connection

## 6. Implementation Order

1. Create `packages/server/test/routes/label.routes.test.ts`:
   - Write imports
   - Write top-level utility functions (`HttpMethod`, `normalizeId`, `canBindTcpPort`)
   - Write outer `describe("label routes")` with closure variables
   - Write helper functions (`seedAdminUser`, `getAuthToken`, `httpRequest`, `createProject`, `createTask`, `createLabel`)
   - Write lifecycle hooks (`beforeAll`, `beforeEach`, `afterAll`)
   - Write `describe("POST /api/projects/:projectId/labels")` with tests 1–7
   - Write `describe("GET /api/projects/:projectId/labels")` with tests 8–11
   - Write `describe("PUT /api/labels/:id")` with tests 12–18
   - Write `describe("DELETE /api/labels/:id")` with tests 19–23

## 7. Verification Commands

```bash
# Run only label tests
cd packages/server && npx vitest run test/routes/label.routes.test.ts

# Run all tests to verify no regressions
cd packages/server && npx vitest run

# Verify TypeScript compiles
cd packages/server && npx tsc --noEmit
```

## 8. Key Patterns to Follow (from existing test files)

- **Boilerplate duplication**: Every test file duplicates `HttpMethod`, `normalizeId`, `canBindTcpPort`, `seedAdminUser`, `getAuthToken`, `httpRequest`, and lifecycle hooks. This is the established pattern — do NOT extract shared utilities.
- **Supertest/inject dual mode**: `httpRequest` supports both modes. `useSupertest` is determined once in `beforeAll` by `canBindTcpPort()`.
- **`normalizeId` usage**: Always use `normalizeId()` when extracting `_id` from response bodies, as MongoDB ObjectIds may serialize differently in supertest vs inject modes.
- **Error message assertion**: Use `expect(body.error).toBe("exact message")` for specific error messages.
- **Fake valid ObjectId**: `"aaaaaaaaaaaaaaaaaaaaaaaa"` (24 `a` characters) for non-existent resource tests.
- **Invalid ObjectId**: `"not-valid"` for invalid format tests.
- **Auth header**: `{ authorization: \`Bearer ${token}\` }` — lowercase `authorization` key.
- **DB verification**: Direct model access (e.g., `LabelModel.countDocuments()`, `TaskModel.findOne()`) for verifying side effects that aren't visible in the HTTP response (e.g., confirming deletion, confirming label removal from tasks).
- **Timing for sort tests**: `await new Promise(resolve => setTimeout(resolve, 10))` between document creations to ensure distinct `createdAt` timestamps (same as `task.routes.test.ts:404`).
- **Response body type assertions**: Always cast `response.body` to the expected type before accessing fields: `const body = response.body as { data: { ... } }`.
- **Project names**: Use unique descriptive strings per test (e.g., `"Label Create"`, `"Label List Sorted"`) to aid debugging if tests fail.
- **Label attachment via API**: Use `PUT /api/tasks/:id` with `{ labels: [labelId] }` payload to attach labels to tasks — this is the API-level approach that mirrors real usage, rather than using direct model creation. This is important for the critical cleanup test (Test 20).
- **Delete response pattern**: `{ data: { message: "Label deleted" } }` — consistent with `task.routes.ts`, `board.routes.ts`, and `project.routes.ts`.