I now have all the information needed to produce the implementation plan. Here is the complete plan:

# Task 4: Comment Integration Tests — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/routes/comment.routes.test.ts` | Create | Integration tests for all four comment endpoints |

## 2. Dependencies

- **Task 1** (`comment.routes.ts`) — provides the route handlers under test
- **Task 3** (`app.ts` modifications) — registers the routes so endpoints are accessible
- **Test helpers**: `setupTestDb`, `teardownTestDb`, `clearCollections` from `../helpers/db.ts`
- **Models**: `UserModel`, `hashPassword`, `CommentModel` from `../../src/models/index.js`
- **App factory**: `buildApp` from `../../src/app.js`
- **External packages**: `vitest`, `supertest` (already installed)
- **MongoDB**: Running locally on `mongodb://localhost:27017` with `taskboard_test` database

## 3. Implementation Details

### 3.1 File: `packages/server/test/routes/comment.routes.test.ts`

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
  CommentModel,
} from "../../src/models/index.js";
import { setupTestDb, teardownTestDb, clearCollections } from "../helpers/db.js";
```

**Notes:**
- `CommentModel` is imported for direct database verification (e.g., checking comment no longer exists after deletion, counting documents).
- No need to import `TaskModel`, `BoardModel`, `ProjectModel`, or `LabelModel` — comment creation and task/project setup is done entirely through API calls via `httpRequest`, `createProject`, and `createTask` helpers.

#### Top-Level Utility Functions (outside `describe` block)

These are identical across all test files in the codebase:

**`type HttpMethod`**: `"get" | "post" | "put" | "delete"`

**`normalizeId(value: unknown): string`**: Handles both plain string IDs and `{ value: string }` ObjectId representations. Exact implementation from `task.routes.test.ts:17-32`.

**`canBindTcpPort(): Promise<boolean>`**: Creates a TCP server to check if port binding is available, determining whether to use supertest or Fastify inject. Exact implementation from `task.routes.test.ts:34-43`.

#### Describe Block: `"comment routes"`

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

**`createComment(taskId: string, body: string): Promise<Record<string, unknown>>`** — NEW helper specific to this test file
- POSTs to `/api/tasks/:taskId/comments` with `{ body }` payload and auth header
- Returns `responseBody.data` (the created comment object)
- Implementation:
  ```typescript
  async function createComment(
    taskId: string,
    commentBody: string,
  ): Promise<Record<string, unknown>> {
    const response = await httpRequest({
      method: "post",
      path: `/api/tasks/${taskId}/comments`,
      expectedStatus: 201,
      payload: { body: commentBody },
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

###### `describe("POST /api/tasks/:taskId/comments")`

**Test 1: `"creates comment with correct shape and sets author from JWT"`**
- Setup: `createProject("Comment Create")` → `createTask(boardId, { title: "Task" })` → extract `taskId` via `normalizeId(task._id)`
- Action: `createComment(taskId, "This is a comment")`
- Assertions:
  - `expect(comment._id).toBeDefined()`
  - `expect(comment.body).toBe("This is a comment")`
  - `expect(normalizeId(comment.task)).toBe(taskId)`
  - `expect(comment.author).toBeDefined()`
  - `expect(comment.createdAt).toBeDefined()`
  - `expect(comment.updatedAt).toBeDefined()`

**Test 2: `"returns 400 when body is missing"`**
- Setup: `createProject("Comment Missing Body")` → `createTask(boardId, { title: "Task" })` → extract `taskId`
- Action: `httpRequest({ method: "post", path: /api/tasks/${taskId}/comments, expectedStatus: 400, payload: {}, headers: auth })`
- Assertions:
  - `const body = response.body as { error: string }`
  - `expect(body.error).toBe("Comment body is required")`

**Test 3: `"returns 400 when body is empty string"`**
- Setup: same as Test 2
- Action: `httpRequest({ method: "post", path: ..., expectedStatus: 400, payload: { body: "" }, headers: auth })`
- Assertions:
  - `const body = response.body as { error: string }`
  - `expect(body.error).toBe("Comment body is required")`

**Test 4: `"returns 404 for non-existent task ID"`**
- No project/task setup needed
- Action: `httpRequest({ method: "post", path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments", expectedStatus: 404, payload: { body: "test" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Task not found")`

**Test 5: `"returns 400 for invalid task ID format"`**
- Action: `httpRequest({ method: "post", path: "/api/tasks/not-valid/comments", expectedStatus: 400, payload: { body: "test" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Invalid task ID")`

**Test 6: `"returns 401 without auth token"`**
- Action: `httpRequest({ method: "post", path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments", expectedStatus: 401, payload: { body: "test" } })` (no `headers`)
- Assertions:
  - `expect(body.error).toBe("Unauthorized")`

###### `describe("GET /api/tasks/:taskId/comments")`

**Test 7: `"returns comments sorted by createdAt ascending with populated author"`**
- Setup: `createProject("Comment List Sorted")` → `createTask(boardId, { title: "Task" })` → extract `taskId` → create 3 comments with `createComment` (add `await new Promise(resolve => setTimeout(resolve, 10))` between creations to ensure distinct `createdAt` timestamps)
- Action: `httpRequest({ method: "get", path: /api/tasks/${taskId}/comments, expectedStatus: 200, headers: auth })`
- Assertions on `body.data` (typed as `Array<Record<string, unknown>>`):
  - `expect(comments).toHaveLength(3)`
  - `expect(comments[0].body).toBe("First")` (first created should be first)
  - `expect(comments[1].body).toBe("Second")`
  - `expect(comments[2].body).toBe("Third")`
  - Verify author population on `comments[0].author`:
    - Type assert as `{ _id: unknown; name: string; email: string }`
    - `expect(author.name).toBe("Admin")`
    - `expect(author.email).toBe("admin@taskboard.local")`
    - `expect((author as Record<string, unknown>).passwordHash).toBeUndefined()` — ensures passwordHash is NOT included in the populated author

**Test 8: `"returns empty array when task has no comments"`**
- Setup: `createProject("Comment List Empty")` → `createTask(boardId, { title: "Task" })` → extract `taskId`
- Action: `httpRequest({ method: "get", path: /api/tasks/${taskId}/comments, expectedStatus: 200, headers: auth })`
- Assertions:
  - `const body = response.body as { data: unknown[] }`
  - `expect(body.data).toEqual([])`

**Test 9: `"returns 404 for non-existent task"`**
- Action: `httpRequest({ method: "get", path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments", expectedStatus: 404, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Task not found")`

**Test 10: `"returns 400 for invalid task ID format"`**
- Action: `httpRequest({ method: "get", path: "/api/tasks/not-valid/comments", expectedStatus: 400, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Invalid task ID")`

###### `describe("PUT /api/comments/:id")`

**Test 11: `"updates comment body"`**
- Setup: `createProject("Comment Update")` → `createTask(boardId, { title: "Task" })` → `createComment(taskId, "Original body")` → extract `commentId` via `normalizeId(comment._id)`
- Action: `httpRequest({ method: "put", path: /api/comments/${commentId}, expectedStatus: 200, payload: { body: "Updated body" }, headers: auth })`
- Assertions:
  - `const body = response.body as { data: { body: string } }`
  - `expect(body.data.body).toBe("Updated body")`

**Test 12: `"returns 400 when body is missing"`**
- Setup: same as Test 11
- Action: `httpRequest({ method: "put", path: /api/comments/${commentId}, expectedStatus: 400, payload: {}, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Comment body is required")`

**Test 13: `"returns 400 when body is empty string"`**
- Setup: same as Test 11
- Action: `httpRequest({ method: "put", path: /api/comments/${commentId}, expectedStatus: 400, payload: { body: "" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Comment body is required")`

**Test 14: `"returns 404 for non-existent comment"`**
- Action: `httpRequest({ method: "put", path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 404, payload: { body: "test" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Comment not found")`

**Test 15: `"returns 400 for invalid comment ID format"`**
- Action: `httpRequest({ method: "put", path: "/api/comments/not-valid", expectedStatus: 400, payload: { body: "test" }, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Invalid comment ID")`

###### `describe("DELETE /api/comments/:id")`

**Test 16: `"deletes comment and returns success message"`**
- Setup: `createProject("Comment Delete")` → `createTask(boardId, { title: "Task" })` → `createComment(taskId, "To delete")` → extract `commentId`
- Action: `httpRequest({ method: "delete", path: /api/comments/${commentId}, expectedStatus: 200, headers: auth })`
- Assertions:
  - `const body = response.body as { data: { message: string } }`
  - `expect(body.data.message).toBe("Comment deleted")`
  - Database verification: `const count = await CommentModel.countDocuments({ _id: commentId }); expect(count).toBe(0);`

**Test 17: `"returns 404 for non-existent comment"`**
- Action: `httpRequest({ method: "delete", path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 404, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Comment not found")`

**Test 18: `"returns 400 for invalid comment ID format"`**
- Action: `httpRequest({ method: "delete", path: "/api/comments/not-valid", expectedStatus: 400, headers: auth })`
- Assertions:
  - `expect(body.error).toBe("Invalid comment ID")`

**Test 19: `"returns 401 without auth token"`**
- Action: `httpRequest({ method: "delete", path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 401 })`
- Assertions:
  - `expect(body.error).toBe("Unauthorized")`

## 4. Contracts

This task does not introduce new API contracts — it tests the existing contracts defined by the comment route handlers (Task 1). The exact request/response shapes being tested are:

**POST /api/tasks/:taskId/comments**
```
Request:  { "body": "Comment text" }
Success:  201 { "data": { "_id": "...", "body": "Comment text", "task": "...", "author": "...", "createdAt": "...", "updatedAt": "..." } }
Error:    400 { "error": "Comment body is required" }
Error:    400 { "error": "Invalid task ID" }
Error:    404 { "error": "Task not found" }
Error:    401 { "error": "Unauthorized" }
```

**GET /api/tasks/:taskId/comments**
```
Success:  200 { "data": [ { "_id": "...", "body": "...", "task": "...", "author": { "_id": "...", "name": "Admin", "email": "admin@taskboard.local" }, "createdAt": "...", "updatedAt": "..." } ] }
Error:    400 { "error": "Invalid task ID" }
Error:    404 { "error": "Task not found" }
```

**PUT /api/comments/:id**
```
Request:  { "body": "Updated text" }
Success:  200 { "data": { "_id": "...", "body": "Updated text", "task": "...", "author": "...", "createdAt": "...", "updatedAt": "..." } }
Error:    400 { "error": "Comment body is required" }
Error:    400 { "error": "Invalid comment ID" }
Error:    404 { "error": "Comment not found" }
```

**DELETE /api/comments/:id**
```
Success:  200 { "data": { "message": "Comment deleted" } }
Error:    400 { "error": "Invalid comment ID" }
Error:    404 { "error": "Comment not found" }
Error:    401 { "error": "Unauthorized" }
```

## 5. Test Plan

### Test Matrix (19 test cases)

| # | Endpoint | Test Case | Expected |
|---|----------|-----------|----------|
| 1 | POST /api/tasks/:taskId/comments | Creates comment with correct shape, author from JWT | 201 |
| 2 | POST /api/tasks/:taskId/comments | Body missing | 400 |
| 3 | POST /api/tasks/:taskId/comments | Body empty string | 400 |
| 4 | POST /api/tasks/:taskId/comments | Non-existent task ID (valid ObjectId) | 404 |
| 5 | POST /api/tasks/:taskId/comments | Invalid task ID format | 400 |
| 6 | POST /api/tasks/:taskId/comments | No auth token | 401 |
| 7 | GET /api/tasks/:taskId/comments | Returns sorted comments with populated author (no passwordHash) | 200 |
| 8 | GET /api/tasks/:taskId/comments | Empty array when no comments | 200 |
| 9 | GET /api/tasks/:taskId/comments | Non-existent task ID | 404 |
| 10 | GET /api/tasks/:taskId/comments | Invalid task ID format | 400 |
| 11 | PUT /api/comments/:id | Updates body | 200 |
| 12 | PUT /api/comments/:id | Body missing | 400 |
| 13 | PUT /api/comments/:id | Body empty string | 400 |
| 14 | PUT /api/comments/:id | Non-existent comment ID | 404 |
| 15 | PUT /api/comments/:id | Invalid comment ID format | 400 |
| 16 | DELETE /api/comments/:id | Deletes comment, verified in DB | 200 |
| 17 | DELETE /api/comments/:id | Non-existent comment ID | 404 |
| 18 | DELETE /api/comments/:id | Invalid comment ID format | 400 |
| 19 | DELETE /api/comments/:id | No auth token | 401 |

### Test Setup

- **beforeAll**: Connect to test DB, build Fastify app, check port binding
- **beforeEach**: Clear all collections, seed admin user, get auth token
- **afterAll**: Close app, teardown test DB

### Test Isolation

- `clearCollections()` runs before every test, ensuring complete isolation
- Each test creates its own project/board/task/comment data from scratch
- No shared state between tests beyond the app instance and DB connection

## 6. Implementation Order

1. Create `packages/server/test/routes/comment.routes.test.ts`:
   - Write imports
   - Write top-level utility functions (`HttpMethod`, `normalizeId`, `canBindTcpPort`)
   - Write outer `describe("comment routes")` with closure variables
   - Write helper functions (`seedAdminUser`, `getAuthToken`, `httpRequest`, `createProject`, `createTask`, `createComment`)
   - Write lifecycle hooks (`beforeAll`, `beforeEach`, `afterAll`)
   - Write `describe("POST /api/tasks/:taskId/comments")` with tests 1–6
   - Write `describe("GET /api/tasks/:taskId/comments")` with tests 7–10
   - Write `describe("PUT /api/comments/:id")` with tests 11–15
   - Write `describe("DELETE /api/comments/:id")` with tests 16–19

## 7. Verification Commands

```bash
# Run only comment tests
cd packages/server && npx vitest run test/routes/comment.routes.test.ts

# Run all tests to verify no regressions
cd packages/server && npx vitest run

# Verify TypeScript compiles
cd packages/server && npx tsc --noEmit
```

## 8. Key Patterns to Follow (from existing test files)

- **Boilerplate duplication**: Every test file duplicates `HttpMethod`, `normalizeId`, `canBindTcpPort`, `seedAdminUser`, `getAuthToken`, `httpRequest`, and lifecycle hooks. This is the established pattern — do NOT extract shared utilities.
- **Supertest/inject dual mode**: `httpRequest` supports both modes. `useSupertest` is determined once in `beforeAll` by `canBindTcpPort()`.
- **`normalizeId` usage**: Always use `normalizeId()` when extracting `_id` from response bodies, as MongoDB ObjectIds may serialize differently in supertest vs inject modes.
- **Error message assertion**: Use `expect(body.error).toBe("exact message")` for specific error messages. Use `expect(body.error).toContain("partial")` only when the route may include variable content.
- **Fake valid ObjectId**: `"aaaaaaaaaaaaaaaaaaaaaaaa"` (24 `a` characters) for non-existent resource tests.
- **Invalid ObjectId**: `"not-valid"` for invalid format tests.
- **Auth header**: `{ authorization: \`Bearer ${token}\` }` — lowercase `authorization` key.
- **DB verification**: Direct model access (e.g., `CommentModel.countDocuments()`) for verifying side effects that aren't visible in the HTTP response (e.g., confirming deletion).
- **Timing for sort tests**: `await new Promise(resolve => setTimeout(resolve, 10))` between document creations to ensure distinct `createdAt` timestamps (see `task.routes.test.ts:404`).
- **Response body type assertions**: Always cast `response.body` to the expected type before accessing fields: `const body = response.body as { data: { ... } }`.
- **Project names**: Use unique descriptive strings per test (e.g., `"Comment Create"`, `"Comment List Sorted"`) to aid debugging if tests fail.