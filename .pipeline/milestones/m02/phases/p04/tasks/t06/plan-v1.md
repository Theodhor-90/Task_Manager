Now I have everything I need. Let me produce the implementation plan.

# Task 6: Verify all tests pass and endpoints work end-to-end — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/helpers/mongoose.test-double.ts` | Modify | Add `populate()` to `find()` query chain and add `updateMany()` with `$pull` support to model |
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

The `find()` method (currently lines 400-438) returns a query object with `sort()`, `select()`, `lean()`, and `then()`. The `populate()` method must be added to the chain to support `comment.routes.ts:72-81`.

The `populate()` on the `find` chain should work similarly to how `findOne`'s `populate` works (lines 337-364), but applied to an array of results rather than a single result. It needs to:
1. Accept `field: string` and optional `select: string` parameters
2. For each result document, resolve the `field` reference by looking up the referenced model's collection
3. If `select` is provided (e.g., `"name email"`), filter the populated document to only include `_id` plus the selected fields
4. Return `this` for method chaining

Implementation for `populate` on the `find()` chain's query object:

```typescript
populate(field: string, selectStr?: string) {
  // Look up the schema definition for the field
  const fieldDef = schema.definition[field];
  let refModelName: string | null = null;

  if (fieldDef && typeof fieldDef === "object" && !Array.isArray(fieldDef) && fieldDef.ref) {
    refModelName = fieldDef.ref;
  }

  if (refModelName) {
    const refCollection = getCollectionDocs(refModelName);
    const selectedFields = selectStr ? selectStr.split(" ") : null;

    this._results = this._results.map((doc) => {
      const refId = doc[field];
      if (refId === undefined || refId === null) return doc;

      const refIdStr = normalizeForCompare(refId);
      const refDoc = refCollection.find(
        (d) => normalizeForCompare(d._id) === refIdStr,
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

This is inserted into the existing `find()` query chain object, after `lean()` and before `then()`.

#### Change 2: Add `updateMany()` to model with `$pull` support

The model object (returned by the `model()` function) currently lacks `updateMany`. The `DELETE /api/labels/:id` route calls `TaskModel.updateMany({ labels: id }, { $pull: { labels: id } })`. This needs to:

1. Find all documents matching the filter
2. Apply the `$pull` operator: for each matching document, remove the specified value from the specified array field
3. Also support `$set` for forward compatibility (though not strictly needed now)
4. Return `{ modifiedCount, matchedCount }`

Implementation:

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

    // Handle $pull operator
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

    // Handle $set operator
    if (update.$set && typeof update.$set === "object") {
      const setOps = update.$set as Record<string, unknown>;
      for (const [key, value] of Object.entries(setOps)) {
        doc[key] = value;
        modified = true;
      }
    }

    // Handle plain field updates (no $ prefix)
    for (const [key, value] of Object.entries(update)) {
      if (!key.startsWith("$")) {
        doc[key] = value;
        modified = true;
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

This is inserted into the model object returned by the `model()` function, after `deleteOne`.

### 3.2 File: `packages/server/test/routes/comment.routes.test.ts`

This file is **entirely missing** and must be created. It follows the exact same pattern as all other test files in the codebase (`label.routes.test.ts`, `task.routes.test.ts`, etc.).

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

Identical boilerplate from all other test files:
- `type HttpMethod = "get" | "post" | "put" | "delete"`
- `normalizeId(value: unknown): string` — same implementation as `label.routes.test.ts:16-31`
- `canBindTcpPort(): Promise<boolean>` — same implementation as `label.routes.test.ts:33-42`

#### Describe Block: `"comment routes"`

##### Closure Variables and Helper Functions

Identical to other test files:
- `let app: FastifyInstance`, `let useSupertest = true`, `let token = ""`
- `seedAdminUser()` — same as `label.routes.test.ts:49-56`
- `getAuthToken()` — same as `label.routes.test.ts:58-70`
- `httpRequest(options)` — same as `label.routes.test.ts:72-107`
- `createProject(name)` — same as `label.routes.test.ts:109-136`
- `createTask(boardId, body)` — same as `label.routes.test.ts:138-151`

**New helper specific to this file:**
- `createComment(taskId: string, commentBody: string): Promise<Record<string, unknown>>` — POSTs to `/api/tasks/${taskId}/comments` with `{ body: commentBody }` and auth header, returns `responseBody.data`

##### Lifecycle Hooks

Identical to all other test files:
- `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, `canBindTcpPort()`
- `beforeEach`: `clearCollections()`, `seedAdminUser()`, `getAuthToken()`
- `afterAll`: `app.close()`, `teardownTestDb()`

##### Test Cases (19 tests)

**`describe("POST /api/tasks/:taskId/comments")`** — 6 tests:
1. `"creates comment with correct shape and sets author from JWT"` — creates project → task → comment, asserts `_id`, `body`, `task`, `author`, `createdAt`, `updatedAt` are all defined and correct
2. `"returns 400 when body is missing"` — sends `{}` payload, expects `{ error: "Comment body is required" }`
3. `"returns 400 when body is empty string"` — sends `{ body: "" }`, expects `{ error: "Comment body is required" }`
4. `"returns 404 for non-existent task ID"` — sends to `aaaaaaaaaaaaaaaaaaaaaaaa`, expects `{ error: "Task not found" }`
5. `"returns 400 for invalid task ID format"` — sends to `not-valid`, expects `{ error: "Invalid task ID" }`
6. `"returns 401 without auth token"` — no auth header, expects `{ error: "Unauthorized" }`

**`describe("GET /api/tasks/:taskId/comments")`** — 4 tests:
7. `"returns comments sorted by createdAt ascending with populated author"` — creates 3 comments with 10ms delays, asserts order and that `author` is populated object with `name`, `email`, and no `passwordHash`
8. `"returns empty array when task has no comments"` — expects `{ data: [] }`
9. `"returns 404 for non-existent task"` — expects `{ error: "Task not found" }`
10. `"returns 400 for invalid task ID format"` — expects `{ error: "Invalid task ID" }`

**`describe("PUT /api/comments/:id")`** — 5 tests:
11. `"updates comment body"` — asserts `body.data.body === "Updated body"`
12. `"returns 400 when body is missing"` — expects `{ error: "Comment body is required" }`
13. `"returns 400 when body is empty string"` — expects `{ error: "Comment body is required" }`
14. `"returns 404 for non-existent comment"` — expects `{ error: "Comment not found" }`
15. `"returns 400 for invalid comment ID format"` — expects `{ error: "Invalid comment ID" }`

**`describe("DELETE /api/comments/:id")`** — 4 tests:
16. `"deletes comment and returns success message"` — asserts `{ data: { message: "Comment deleted" } }` and verifies via `CommentModel.countDocuments`
17. `"returns 404 for non-existent comment"` — expects `{ error: "Comment not found" }`
18. `"returns 400 for invalid comment ID format"` — expects `{ error: "Invalid comment ID" }`
19. `"returns 401 without auth token"` — expects `{ error: "Unauthorized" }`

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

1. **`populate()` missing on `find()` chain**: `comment.routes.ts:72-81` calls `.find().sort().populate("author", "name email")`. The test double's `find()` query chain doesn't have `populate()`. Without this fix, `GET /api/tasks/:taskId/comments` will throw a `TypeError: ....populate is not a function` error.

2. **`updateMany()` missing on model**: `label.routes.ts:180-188` calls `TaskModel.updateMany(...)` with `$pull`. The test double model doesn't implement `updateMany`. Without this fix, `DELETE /api/labels/:id` will throw a `TypeError: ....updateMany is not a function` error, causing the label delete tests (specifically the "removes label reference from all tasks" test) to fail.

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

### Test Setup

- **beforeAll**: Connect to test DB, build Fastify app, check port binding
- **beforeEach**: Clear all collections, seed admin user, get auth token
- **afterAll**: Close app, teardown test DB

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

1. **Fix test double — `populate()` on `find()` chain**: Modify `packages/server/test/helpers/mongoose.test-double.ts` to add `populate(field, select?)` method to the query object returned by `find()`. This resolves the `GET /api/tasks/:taskId/comments` crash.

2. **Fix test double — `updateMany()` on model**: Add `updateMany(filter, update)` method to the model object in `mongoose.test-double.ts` with `$pull` operator support. This resolves the `DELETE /api/labels/:id` crash and ensures the label cleanup test actually exercises the `$pull` logic.

3. **Create `comment.routes.test.ts`**: Write the missing comment integration test file with all 19 test cases, following the established test pattern (boilerplate helpers duplicated from other test files).

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
- `packages/server/test/routes/comment.routes.test.ts` **does not exist**, despite Task 4 being marked as "completed" in the pipeline state. This file must be created as part of this verification task.

### Test Double Gaps
- **`find().populate()`**: The mongoose test double's `find()` query chain (lines 400-438 of `mongoose.test-double.ts`) has `sort()`, `select()`, `lean()`, and `then()` but **no** `populate()` method. The `findOne()` query has `populate()` (lines 337-364), but `find()` does not. The comment list endpoint (`GET /api/tasks/:taskId/comments`) calls `.find().sort().populate("author", "name email")`, which would throw `TypeError`.
- **`updateMany()` with `$pull`**: The model object lacks `updateMany()`. The label delete route (`DELETE /api/labels/:id`) calls `TaskModel.updateMany({ labels: id }, { $pull: { labels: id } })`. Without this, the label cleanup logic cannot execute. The `$pull` operator is also not handled anywhere in the test double (only `$set`, `$in`, `$ne`, `$gte` are supported).

### Route Handlers (Verified Correct)
- `packages/server/src/routes/comment.routes.ts` — all 4 endpoints implemented correctly
- `packages/server/src/routes/label.routes.ts` — all 4 endpoints implemented correctly
- `packages/server/src/app.ts` — all 10 route plugins correctly registered with appropriate prefixes