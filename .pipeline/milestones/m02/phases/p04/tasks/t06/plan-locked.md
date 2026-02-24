Confirmed: `comment.routes.test.ts` does not exist, and the User model has `name` and `email` fields. Now I have everything to produce the revised plan.

# Task 6: Verify all tests pass and endpoints work end-to-end — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/helpers/mongoose.test-double.ts` | Modify | Add `populate()` to `find()` query chain and add `updateMany()` with `$pull` support |
| 2 | `packages/server/test/routes/comment.routes.test.ts` | Create | Comment endpoint integration tests (missing — Task 4 did not produce the file) |

## 2. Dependencies

- **Tasks 1–5** are marked as completed in the pipeline state
- **Existing files**: `comment.routes.ts`, `label.routes.ts`, and `app.ts` (with route registrations) are all present and correct
- **Missing file**: `comment.routes.test.ts` does not exist despite Task 4 being marked completed — it must be created as part of this verification task
- **Test double gaps**: The mongoose test double (`test/helpers/mongoose.test-double.ts`) is missing two capabilities needed by the new routes:
  1. `populate()` on the `find()` query chain — required by `GET /api/tasks/:taskId/comments` which calls `.find().sort().populate("author", "name email")`
  2. `updateMany()` on the model — required by `DELETE /api/labels/:id` which calls `TaskModel.updateMany({ labels: id }, { $pull: { labels: id } })`

## 3. Implementation Details

### 3.1 File: `packages/server/test/helpers/mongoose.test-double.ts`

#### Change 1: Add `populate()` to `find()` query chain

**Current state of the `find()` method (lines 400–439):** The `find()` method creates a query object with an `_results` property initialized eagerly on line 401:

```typescript
find(filter: Record<string, unknown> = {}) {
  const results = getCollectionDocs(name).filter((doc) => matches(doc, filter));
  const query = {
    _results: results,    // <-- populated immediately with filtered docs
    sort(sortObj: ...) {
      // sorts this._results in place, returns this
    },
    select() { return this; },
    lean() { return this; },
    then(onfulfilled?, onrejected?) {
      return Promise.resolve(this._results).then(onfulfilled, onrejected);
    },
  };
  return query;
}
```

**Data flow for `populate()`:** When the route calls `.find({ task: taskId }).sort({ createdAt: 1 }).populate("author", "name email")`, the chain executes as:
1. `find()` runs first — sets `_results` to all documents matching `{ task: taskId }`
2. `sort()` runs — sorts `_results` in place by `createdAt` ascending, returns `this`
3. `populate()` runs — iterates over `_results`, replaces each document's `author` ObjectId with the resolved User document (filtered to only `_id`, `name`, `email`), returns `this`
4. `then()` resolves — returns `Promise.resolve(this._results)`

Therefore, `populate()` has guaranteed access to the fully filtered and sorted `_results` array via `this._results`. No initialization changes are needed.

**Implementation — insert the `populate` method after `lean()` (line 433) and before `then()` (line 435):**

```typescript
populate(field: string, selectStr?: string) {
  const fieldDef = schema.definition[field];
  let refModelName: string | null = null;

  if (fieldDef && typeof fieldDef === "object" && !Array.isArray(fieldDef) && fieldDef.ref) {
    refModelName = fieldDef.ref;
  }

  if (refModelName) {
    const refCollection = getCollectionDocs(refModelName);
    const selectedFields = selectStr ? selectStr.split(" ") : null;

    this._results = this._results.map((doc: Record<string, unknown>) => {
      const refId = doc[field];
      if (refId === undefined || refId === null) return doc;

      const refIdStr = normalizeForCompare(refId);
      const refDoc = refCollection.find(
        (d: Record<string, unknown>) => normalizeForCompare(d._id) === refIdStr,
      );

      if (!refDoc) return doc;

      let populatedValue: Record<string, unknown>;
      if (selectedFields) {
        populatedValue = { _id: refDoc._id };
        for (const f of selectedFields) {
          if (f in refDoc) {
            populatedValue[f] = refDoc[f];
          }
        }
      } else {
        populatedValue = { ...refDoc };
      }

      return { ...doc, [field]: populatedValue };
    });
  }

  return this;
},
```

**How this resolves the `author` population for comments:**
- The Comment schema defines `author: { type: Schema.Types.ObjectId, ref: "User", required: true }`. In the test double, this means `schema.definition["author"]` is `{ type: ..., ref: "User", required: true }`.
- `fieldDef.ref` resolves to `"User"`, so `refModelName = "User"`.
- `getCollectionDocs("User")` retrieves all User documents in the test double's in-memory store.
- `selectStr` is `"name email"`, so `selectedFields = ["name", "email"]`.
- For each comment document, the `author` ObjectId is looked up in the User collection. The matched User document is filtered to only `{ _id, name, email }` — excluding `passwordHash` as desired.
- The document is returned with `author` replaced by the populated object.

#### Change 2: Add `updateMany()` to model

**Insert after the `deleteOne` method (line 457), before the closing `};` of the model return object (line 458):**

```typescript
async updateMany(
  filter: Record<string, unknown> = {},
  update: Record<string, unknown> = {},
): Promise<{ modifiedCount: number; matchedCount: number }> {
  const docs = getCollectionDocs(name);
  let matchedCount = 0;
  let modifiedCount = 0;

  for (const doc of docs) {
    if (!matches(doc, filter)) continue;
    matchedCount++;
    let modified = false;

    if (update.$pull && typeof update.$pull === "object") {
      const pullOps = update.$pull as Record<string, unknown>;
      for (const [pullField, pullValue] of Object.entries(pullOps)) {
        if (Array.isArray(doc[pullField])) {
          const arr = doc[pullField] as unknown[];
          const pullValStr = normalizeForCompare(pullValue);
          const newArr = arr.filter(
            (item) => normalizeForCompare(item) !== pullValStr,
          );
          if (newArr.length !== arr.length) {
            doc[pullField] = newArr;
            modified = true;
          }
        }
      }
    }

    if (modified) {
      modifiedCount++;
      if (schema?.options?.timestamps) {
        doc.updatedAt = new Date();
      }
    }
  }

  setCollectionDocs(name, docs);
  return { modifiedCount, matchedCount };
},
```

**Why only `$pull` is implemented:** The only call to `updateMany` in the codebase is `TaskModel.updateMany({ labels: id }, { $pull: { labels: id } })` in `label.routes.ts:185-188`. No other operator (`$set`, plain field updates) is needed. Adding unrequested operators would violate the task scope.

### 3.2 File: `packages/server/test/routes/comment.routes.test.ts`

This file is **entirely missing** and must be created. It follows the exact same pattern as `label.routes.test.ts` (the most recently created test file).

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

#### Top-Level Utility Functions

Identical boilerplate from `label.routes.test.ts`:

```typescript
type HttpMethod = "get" | "post" | "put" | "delete";

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

#### Describe Block: `"comment routes"`

##### Closure Variables

```typescript
let app: FastifyInstance;
let useSupertest = true;
let token = "";
```

##### Helper Functions (inside `describe` block)

All identical to `label.routes.test.ts:49-151`:

- `seedAdminUser()` — creates admin user with `email: "admin@taskboard.local"`, `name: "Admin"`, `passwordHash` from `hashPassword("admin123")`
- `getAuthToken()` — POSTs to `/api/auth/login` with admin credentials, returns `body.data.token`
- `httpRequest(options)` — supports both supertest and Fastify inject modes with `method`, `path`, `expectedStatus`, optional `payload`, optional `headers`
- `createProject(name)` — creates a project via POST `/api/projects`, fetches its board via GET `/api/projects/:projectId/board`, returns `{ projectId, boardId }`
- `createTask(boardId, body)` — creates a task via POST `/api/boards/:boardId/tasks`, returns `responseBody.data`

**New helper specific to this file:**

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

This helper:
- Takes `taskId` (string) and `commentBody` (string) as parameters
- POSTs to `/api/tasks/${taskId}/comments` with `{ body: commentBody }` payload and auth header
- Expects 201 response
- Returns `responseBody.data` — the created comment object

##### Lifecycle Hooks

Identical to `label.routes.test.ts:169-185`:

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

##### Test Cases (19 tests)

All error message strings below have been verified against `comment.routes.ts`:

**`describe("POST /api/tasks/:taskId/comments")`** — 6 tests:

1. **`"creates comment with correct shape and sets author from JWT"`**
   - Setup: `createProject("Comment Create")` → `createTask(boardId, { title: "Task" })` → extract `taskId` via `normalizeId(task._id)` → `createComment(taskId, "This is a comment")`
   - Assertions: `comment._id` is defined, `comment.body` is `"This is a comment"`, `normalizeId(comment.task)` equals `taskId`, `comment.author` is defined, `comment.createdAt` is defined, `comment.updatedAt` is defined

2. **`"returns 400 when body is missing"`**
   - Setup: `createProject("Comment Missing Body")` → `createTask(boardId, { title: "Task" })` → extract `taskId`
   - Action: `httpRequest({ method: "post", path: "/api/tasks/${taskId}/comments", expectedStatus: 400, payload: {}, headers: auth })`
   - Assertion: `body.error` is `"Comment body is required"` *(verified: `comment.routes.ts:94`)*

3. **`"returns 400 when body is empty string"`**
   - Setup: same as test 2
   - Action: `httpRequest({ ..., payload: { body: "" }, ... })`
   - Assertion: `body.error` is `"Comment body is required"` *(verified: `comment.routes.ts:94`)*

4. **`"returns 404 for non-existent task ID"`**
   - Action: `httpRequest({ method: "post", path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments", expectedStatus: 404, payload: { body: "test" }, headers: auth })`
   - Assertion: `body.error` is `"Task not found"` *(verified: `comment.routes.ts:100`)*

5. **`"returns 400 for invalid task ID format"`**
   - Action: `httpRequest({ method: "post", path: "/api/tasks/not-valid/comments", expectedStatus: 400, payload: { body: "test" }, headers: auth })`
   - Assertion: `body.error` is `"Invalid task ID"` *(verified: `comment.routes.ts:48`)*

6. **`"returns 401 without auth token"`**
   - Action: `httpRequest({ method: "post", path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments", expectedStatus: 401, payload: { body: "test" } })` (no `headers`)
   - Assertion: `body.error` is `"Unauthorized"`

**`describe("GET /api/tasks/:taskId/comments")`** — 4 tests:

7. **`"returns comments sorted by createdAt ascending with populated author"`**
   - Setup: `createProject("Comment List Sorted")` → `createTask(boardId, { title: "Task" })` → extract `taskId` → create 3 comments with 10ms delays between:
     ```
     createComment(taskId, "First")
     await new Promise(resolve => setTimeout(resolve, 10))
     createComment(taskId, "Second")
     await new Promise(resolve => setTimeout(resolve, 10))
     createComment(taskId, "Third")
     ```
   - Action: `httpRequest({ method: "get", path: "/api/tasks/${taskId}/comments", expectedStatus: 200, headers: auth })`
   - Assertions:
     - `comments` has length 3
     - `comments[0].body` is `"First"`, `comments[1].body` is `"Second"`, `comments[2].body` is `"Third"`
     - `comments[0].author` is an object with `name: "Admin"` and `email: "admin@taskboard.local"`
     - `(comments[0].author as Record<string, unknown>).passwordHash` is `undefined` — ensures passwordHash is NOT included in the populated author

8. **`"returns empty array when task has no comments"`**
   - Setup: `createProject("Comment List Empty")` → `createTask(boardId, { title: "Task" })` → extract `taskId`
   - Action: `httpRequest({ method: "get", path: "/api/tasks/${taskId}/comments", expectedStatus: 200, headers: auth })`
   - Assertion: `body.data` equals `[]`

9. **`"returns 404 for non-existent task"`**
   - Action: `httpRequest({ method: "get", path: "/api/tasks/aaaaaaaaaaaaaaaaaaaaaaaa/comments", expectedStatus: 404, headers: auth })`
   - Assertion: `body.error` is `"Task not found"` *(verified: `comment.routes.ts:54`)*

10. **`"returns 400 for invalid task ID format"`**
    - Action: `httpRequest({ method: "get", path: "/api/tasks/not-valid/comments", expectedStatus: 400, headers: auth })`
    - Assertion: `body.error` is `"Invalid task ID"` *(verified: `comment.routes.ts:48`)*

**`describe("PUT /api/comments/:id")`** — 5 tests:

11. **`"updates comment body"`**
    - Setup: `createProject("Comment Update")` → `createTask(boardId, { title: "Task" })` → `createComment(taskId, "Original body")` → extract `commentId` via `normalizeId(comment._id)`
    - Action: `httpRequest({ method: "put", path: "/api/comments/${commentId}", expectedStatus: 200, payload: { body: "Updated body" }, headers: auth })`
    - Assertion: `body.data.body` is `"Updated body"`

12. **`"returns 400 when body is missing"`**
    - Setup: same as test 11
    - Action: `httpRequest({ ..., payload: {}, ... })`
    - Assertion: `body.error` is `"Comment body is required"` *(verified: `comment.routes.ts:137`)*

13. **`"returns 400 when body is empty string"`**
    - Setup: same as test 11
    - Action: `httpRequest({ ..., payload: { body: "" }, ... })`
    - Assertion: `body.error` is `"Comment body is required"` *(verified: `comment.routes.ts:137`)*

14. **`"returns 404 for non-existent comment"`**
    - Action: `httpRequest({ method: "put", path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 404, payload: { body: "test" }, headers: auth })`
    - Assertion: `body.error` is `"Comment not found"` *(verified: `comment.routes.ts:143`)*

15. **`"returns 400 for invalid comment ID format"`**
    - Action: `httpRequest({ method: "put", path: "/api/comments/not-valid", expectedStatus: 400, payload: { body: "test" }, headers: auth })`
    - Assertion: `body.error` is `"Invalid comment ID"` *(verified: `comment.routes.ts:133`)*

**`describe("DELETE /api/comments/:id")`** — 4 tests:

16. **`"deletes comment and returns success message"`**
    - Setup: `createProject("Comment Delete")` → `createTask(boardId, { title: "Task" })` → `createComment(taskId, "To delete")` → extract `commentId` via `normalizeId(comment._id)`
    - Action: `httpRequest({ method: "delete", path: "/api/comments/${commentId}", expectedStatus: 200, headers: auth })`
    - Assertions:
      - `body.data.message` is `"Comment deleted"` *(verified: `comment.routes.ts:220`)*
      - Database verification: `const count = await CommentModel.countDocuments({ _id: commentId }); expect(count).toBe(0);`

17. **`"returns 404 for non-existent comment"`**
    - Action: `httpRequest({ method: "delete", path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 404, headers: auth })`
    - Assertion: `body.error` is `"Comment not found"` *(verified: `comment.routes.ts:192`)*

18. **`"returns 400 for invalid comment ID format"`**
    - Action: `httpRequest({ method: "delete", path: "/api/comments/not-valid", expectedStatus: 400, headers: auth })`
    - Assertion: `body.error` is `"Invalid comment ID"` *(verified: `comment.routes.ts:186`)*

19. **`"returns 401 without auth token"`**
    - Action: `httpRequest({ method: "delete", path: "/api/comments/aaaaaaaaaaaaaaaaaaaaaaaa", expectedStatus: 401 })` (no `headers`)
    - Assertion: `body.error` is `"Unauthorized"`

## 4. Contracts

This task does not introduce new API contracts. It verifies the existing contracts from Tasks 1–5. The complete set of endpoints verified:

| Method | Full Path | Expected Status Codes |
|--------|-----------|----------------------|
| POST | `/api/tasks/:taskId/comments` | 201, 400, 401, 404 |
| GET | `/api/tasks/:taskId/comments` | 200, 400, 404 |
| PUT | `/api/comments/:id` | 200, 400, 404 |
| DELETE | `/api/comments/:id` | 200, 400, 401, 404 |
| POST | `/api/projects/:projectId/labels` | 201, 400, 401, 404 |
| GET | `/api/projects/:projectId/labels` | 200, 400, 404 |
| PUT | `/api/labels/:id` | 200, 400, 404 |
| DELETE | `/api/labels/:id` | 200, 400, 401, 404 |

## 5. Test Plan

### Pre-existing Issues to Fix

Before tests can pass, two gaps in the mongoose test double must be resolved:

1. **`populate()` missing on `find()` chain**: `comment.routes.ts:81` calls `.find().sort().populate("author", "name email")`. The test double's `find()` query chain (lines 400–438) has `sort()`, `select()`, `lean()`, and `then()` but **no** `populate()` method. Without this fix, `GET /api/tasks/:taskId/comments` will throw `TypeError: ....populate is not a function`.

2. **`updateMany()` missing on model**: `label.routes.ts:185` calls `TaskModel.updateMany(...)` with `$pull`. The test double model doesn't implement `updateMany`. Without this fix, `DELETE /api/labels/:id` will throw `TypeError: ....updateMany is not a function`, causing the label delete cleanup test to fail.

### Test Verification Matrix

**All existing test files must continue to pass (no regressions):**
- `test/routes/auth.routes.test.ts`
- `test/routes/project.routes.test.ts`
- `test/routes/board.routes.test.ts`
- `test/routes/task.routes.test.ts`
- `test/routes/label.routes.test.ts` (23 tests)

**New test file must pass:**
- `test/routes/comment.routes.test.ts` (19 tests)

**TypeScript compilation must succeed with zero errors.**

### Phase Exit Criteria Verification

| # | Criterion | Verified By |
|---|-----------|-------------|
| 1 | Comment GET returns sorted comments with populated author | Comment test #7 |
| 2 | Comment POST creates with body from request and author from JWT | Comment test #1 |
| 3 | Comment PUT updates body | Comment test #11 |
| 4 | Comment DELETE removes comment | Comment test #16 |
| 5 | Label GET returns sorted labels | Label test #8 (existing) |
| 6 | Label POST creates with name, color, project | Label test #1 (existing) |
| 7 | Label PUT updates name and/or color | Label tests #12-14 (existing) |
| 8 | Label DELETE removes from tasks and deletes | Label tests #19-20 (existing) |
| 9 | All endpoints return 401 without JWT | Comment tests #6, #19; Label tests #7, #23 |
| 10 | All endpoints return 404 for non-existent IDs | Comment tests #4, #9, #14, #17; Label tests #5, #10, #17, #21 |
| 11 | Create endpoints return 400 for missing fields | Comment tests #2-3; Label tests #2-4 |
| 12 | All integration tests pass | Full test suite run |
| 13 | No regressions | Full test suite run |
| 14 | TypeScript compiles | `npx tsc --noEmit` |

## 6. Implementation Order

1. **Fix test double — `populate()` on `find()` chain**: Modify `packages/server/test/helpers/mongoose.test-double.ts` to add `populate(field, selectStr?)` method to the query object returned by `find()`, inserting it between `lean()` (line 433) and `then()` (line 435). The method reads from `this._results` (which is already populated by `find()`'s filter on line 401 and potentially sorted by `sort()`) and writes the populated results back to `this._results`.

2. **Fix test double — `updateMany()` on model**: Add `updateMany(filter, update)` method to the model object in `mongoose.test-double.ts`, inserting it after `deleteOne` (line 457). Only implement `$pull` operator support — no `$set` or plain field updates.

3. **Create `comment.routes.test.ts`**: Write the missing comment integration test file with all 19 test cases, following the established test pattern (boilerplate helpers duplicated from `label.routes.test.ts`).

4. **Run TypeScript compilation**: `cd packages/server && npx tsc --noEmit` — verify no type errors across all files.

5. **Run full test suite**: `cd packages/server && npx vitest run` — verify all tests pass with zero failures.

6. **Investigate and fix any failures**: If any tests fail, debug the root cause and fix in the appropriate file (test double, route handler, or test file).

## 7. Verification Commands

```bash
# Step 1: TypeScript compilation check
cd packages/server && npx tsc --noEmit

# Step 2: Run full test suite
cd packages/server && npx vitest run

# Step 3: Run only comment tests (targeted check)
cd packages/server && npx vitest run test/routes/comment.routes.test.ts

# Step 4: Run only label tests (verify no regressions from test double changes)
cd packages/server && npx vitest run test/routes/label.routes.test.ts

# Step 5: Run all existing tests to verify no regressions
cd packages/server && npx vitest run test/routes/auth.routes.test.ts test/routes/project.routes.test.ts test/routes/board.routes.test.ts test/routes/task.routes.test.ts
```

## 8. Key Findings from Codebase Inspection

### Missing File
- `packages/server/test/routes/comment.routes.test.ts` **does not exist**, despite Task 4 being marked as "completed" in the pipeline state. Confirmed via `Glob` search — no files found.

### Test Double Gaps
- **`find().populate()`**: The `find()` query chain (lines 400–438) has `_results` (line 403), `sort()` (line 404), `select()` (line 429), `lean()` (line 432), and `then()` (line 435) but **no** `populate()` method. The `findOne()` query has `populate()` (lines 337–364), but `find()` does not. The `_results` property is initialized eagerly on line 401 as `getCollectionDocs(name).filter(...)` and is available to all chained methods via `this._results`.
- **`updateMany()` with `$pull`**: The model object lacks `updateMany()`. The `$pull` operator is not handled anywhere in the test double (only `$set`, `$in`, `$ne`, `$gte` are supported in `matches()` and `findOneAndUpdate()`).

### Verified Error Message Strings
All error messages in the test expectations have been cross-referenced against `comment.routes.ts`:
- `"Invalid task ID"` — `comment.routes.ts:48, 90`
- `"Comment body is required"` — `comment.routes.ts:94, 137`
- `"Task not found"` — `comment.routes.ts:54, 60, 69, 100, 106, 115`
- `"Invalid comment ID"` — `comment.routes.ts:133, 186`
- `"Comment not found"` — `comment.routes.ts:143, 149, 155, 164, 192, 198, 204, 213`
- `"Comment deleted"` — `comment.routes.ts:220`

### Route Handlers (Verified Correct)
- `packages/server/src/routes/comment.routes.ts` — all 4 endpoints implemented correctly
- `packages/server/src/routes/label.routes.ts` — all 4 endpoints implemented correctly
- `packages/server/src/app.ts` — all 10 route plugins correctly registered with appropriate prefixes