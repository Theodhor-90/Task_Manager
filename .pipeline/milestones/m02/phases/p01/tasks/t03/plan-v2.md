# Task 3 Implementation Plan — Implement DELETE with cascade logic

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/helpers/mongoose.test-double.ts` | **Modify** | Add `$in` operator support to `matches()` and add `deleteOne` method to model objects |
| 2 | `packages/server/src/routes/project.routes.ts` | **Modify** | Add `DELETE /:id` handler with full cascade delete logic |
| 3 | `packages/server/test/routes/project.routes.test.ts` | **Modify** | Add integration tests for the DELETE endpoint |

## 2. Dependencies

- **t01 (completed)**: `project.routes.ts` exists with `POST /` and `GET /` handlers; registered in `app.ts` at `/api/projects`; test file exists with scaffold and helpers
- **t02 (completed)**: `GET /:id` and `PUT /:id` handlers are in place; `findOneAndUpdate` added to test-double

### Mongoose test-double gaps

The DELETE handler requires two capabilities the test-double does not currently support:

1. **`$in` operator in `matches()`**: The cascade delete needs `CommentModel.deleteMany({ task: { $in: taskIds } })` to delete all comments belonging to any task in the project. The current `matches()` function does strict equality comparison and does not understand MongoDB query operators like `$in`.

2. **`deleteOne` method**: The cascade delete needs `BoardModel.deleteOne({ _id: board._id })` and `ProjectModel.deleteOne({ _id: id })` to delete single documents. The test-double only has `deleteMany` — it does not have `deleteOne`.

Both gaps must be filled before the route handler can be tested.

## 3. Implementation Details

### 3.1 Mongoose test-double — Add `$in` support to `matches()`

**File**: `packages/server/test/helpers/mongoose.test-double.ts`

**Current code** (lines 89–93):
```typescript
function matches(doc: Record<string, unknown>, filter: Record<string, unknown> = {}): boolean {
  return Object.entries(filter).every(([key, value]) => {
    return normalizeForCompare(doc[key]) === normalizeForCompare(value);
  });
}
```

**New code**:
```typescript
function matches(doc: Record<string, unknown>, filter: Record<string, unknown> = {}): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      !(value instanceof ObjectId)
    ) {
      const operators = value as Record<string, unknown>;
      if ("$in" in operators) {
        const list = operators.$in as unknown[];
        const docVal = normalizeForCompare(doc[key]);
        return list.some((item) => normalizeForCompare(item) === docVal);
      }
    }
    return normalizeForCompare(doc[key]) === normalizeForCompare(value);
  });
}
```

**What changed**: Before doing the strict equality check, the function checks whether the filter value is a plain object (not an array, not an ObjectId) containing the `$in` key. If so, it normalizes the document field value and checks if it matches any element in the `$in` array using the same `normalizeForCompare` logic. This handles ObjectId-to-string comparison correctly since `normalizeForCompare` already converts ObjectId instances to their string representation.

**Why `$in` specifically**: The cascade delete calls `CommentModel.deleteMany({ task: { $in: taskIds } })` where `taskIds` is an array of ObjectIds retrieved from `TaskModel.find(...)`. The `$in` operator is the standard MongoDB way to match a field against multiple values. No other query operators are needed for this task.

### 3.2 Mongoose test-double — Add `deleteOne` method

**File**: `packages/server/test/helpers/mongoose.test-double.ts`

**Add inside the `model()` function's return object**, after the `deleteMany` method (line 378):

```typescript
async deleteOne(filter: Record<string, unknown> = {}): Promise<{ deletedCount: number }> {
  const docs = getCollectionDocs(name);
  const index = docs.findIndex((doc) => matches(doc, filter));
  if (index === -1) {
    return { deletedCount: 0 };
  }
  docs.splice(index, 1);
  setCollectionDocs(name, docs);
  return { deletedCount: 1 };
},
```

**Behavior**: Finds the first matching document and removes it. Returns `{ deletedCount: 1 }` on success, `{ deletedCount: 0 }` if no match. This mirrors the real Mongoose `deleteOne()` API — it deletes at most one document.

### 3.3 Route handler — `DELETE /:id`

**File**: `packages/server/src/routes/project.routes.ts`

**New imports**: Add `TaskModel`, `CommentModel`, and `LabelModel` to the existing import from `../models/index.js`:

```typescript
import { BoardModel, ProjectModel, TaskModel, CommentModel, LabelModel } from "../models/index.js";
```

**Add type alias for models that need `deleteOne` and `find().select()`**: The existing code already has a `FindProjectsModel` type alias for `find().sort()`. The DELETE handler needs to call methods that TypeScript doesn't know about on the Mongoose model types (since the test-double augments them). Rather than creating multiple separate type aliases, define types inline at each call site using the same cast-through-`unknown` pattern already used in the `PUT /:id` handler.

**Handler code** (add after the existing `PUT /:id` handler, before the closing `};`):

```typescript
app.delete("/:id", async (request, reply) => {
  const { id } = request.params as { id: string };

  if (!isValidObjectId(id)) {
    return reply.code(400).send({ error: "Invalid project ID" });
  }

  // Verify project exists and is owned by user
  const project = await ProjectModel.findOne({
    _id: id,
    owner: request.user.id,
  });

  if (!project) {
    return reply.code(404).send({ error: "Project not found" });
  }

  // Find the board for this project
  const board = await BoardModel.findOne({ project: id });

  if (board) {
    // Find all task IDs on this board
    const tasks = await (TaskModel as unknown as FindProjectsModel)
      .find({ board: board._id })
      .sort({ createdAt: 1 });

    const taskIds = tasks.map((task: Record<string, unknown>) => task._id);

    // Cascade delete in dependency order: Comments → Tasks → Labels → Board
    if (taskIds.length > 0) {
      await CommentModel.deleteMany({ task: { $in: taskIds } } as Record<string, unknown>);
    }
    await TaskModel.deleteMany({ board: board._id } as Record<string, unknown>);
    await LabelModel.deleteMany({ project: id } as Record<string, unknown>);
    await (BoardModel as unknown as { deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }> })
      .deleteOne({ _id: board._id });
  } else {
    // No board, but still clean up labels that might reference this project
    await LabelModel.deleteMany({ project: id } as Record<string, unknown>);
  }

  // Delete the project itself
  await (ProjectModel as unknown as { deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }> })
    .deleteOne({ _id: id });

  return reply.code(200).send({ data: { message: "Project deleted" } });
});
```

**Key logic notes**:

1. **ObjectId validation and ownership check**: Same pattern as `GET /:id` and `PUT /:id` — validate the ID format, then `findOne` with both `_id` and `owner` filter. Return 400 for invalid format, 404 if not found.

2. **Cascade delete order**: Comments → Tasks → Labels → Board → Project. This respects the reference dependency graph: comments reference tasks, tasks reference boards, labels reference projects. Deleting dependents before parents avoids dangling references.

3. **Task ID collection**: We call `TaskModel.find({ board: board._id }).sort({ createdAt: 1 })` to get all tasks, then extract their `_id` values into `taskIds`. The `.sort()` is required because the test-double's `find()` returns a chainable query that must be "thenabled" — the `.sort()` call satisfies the chain. The sort direction doesn't matter for deletion; we just need the list.

4. **`$in` usage**: `CommentModel.deleteMany({ task: { $in: taskIds } })` deletes all comments whose `task` field matches any ID in the array. This is the standard MongoDB pattern for batch deletion by foreign key.

5. **Guard on empty taskIds**: If there are no tasks, we skip the comment deletion entirely (no need to issue a `$in` query with an empty array).

6. **Board-less project**: If the board doesn't exist (unlikely but possible if a previous board creation failed), we still clean up labels and delete the project.

7. **Using `deleteOne` vs `deleteMany`**: Board and Project are deleted with `deleteOne` since there's exactly one of each. Tasks and comments use `deleteMany` since there can be many.

8. **`FindProjectsModel` reuse**: The existing `FindProjectsModel` type alias (defined at the top of the file for `find().sort()`) is reused for `TaskModel.find()`. This works because the type only requires `find` returning an object with `.sort()` that returns a promise — which is exactly what we need.

9. **Response shape**: Returns `200 { data: { message: "Project deleted" } }` matching the phase spec's defined response shape (Section 6, row for DELETE).

## 4. Contract

### `DELETE /api/projects/:id`

**Request**: No body. Auth header required. `:id` is a MongoDB ObjectId string.

**Success Response** (200):
```json
{
  "data": {
    "message": "Project deleted"
  }
}
```

**Side Effects** (cascade delete):
- Board associated with the project is deleted
- All tasks on that board are deleted
- All comments on those tasks are deleted
- All labels scoped to the project are deleted

**Error Responses**:
- `400 { "error": "Invalid project ID" }` — `:id` is not a valid ObjectId format
- `401 { "error": "Unauthorized" }` — no/invalid JWT (handled by auth middleware)
- `404 { "error": "Project not found" }` — project doesn't exist or isn't owned by user

## 5. Test Plan

### Test file

`packages/server/test/routes/project.routes.test.ts` — **modify** (add a new `describe("DELETE /api/projects/:id", ...)` block after the existing `PUT` describe block)

### Additional test imports

The test file currently imports `BoardModel`, `UserModel`, and `hashPassword`. The cascade-delete verification tests need additional model imports:

```typescript
import { BoardModel, UserModel, hashPassword, TaskModel, CommentModel, LabelModel, ProjectModel } from "../../src/models/index.js";
```

### Helper for creating a project in tests

Several tests need to create a project first, then reference its `_id`. Use the existing pattern from the t02 tests: call `httpRequest` with `POST /api/projects` and extract `body.data._id` using `normalizeId()`. No new helper function needed.

### Tests

#### Describe: `DELETE /api/projects/:id`

**Test 1: deletes a project and returns success message**
- Create a project via `POST /api/projects` with `{ name: "Delete Me" }`
- Extract `projectId` from the response using `normalizeId()`
- Send `DELETE /api/projects/:id` with auth header
- Expect: 200
- Assert: `body.data.message === "Project deleted"`
- Verify the project is gone: `GET /api/projects/:id` returns 404

Setup: Only needs the standard `beforeEach` (seed user + get token).

**Test 2: cascade deletes board, tasks, comments, and labels**
- Create a project via `POST /api/projects` with `{ name: "Cascade Test" }`
- Extract `projectId` from response
- Look up the auto-created board: `BoardModel.findOne({ project: projectId })`, extract `boardId` using `normalizeId(board._id)`
- Get the seeded user's `_id`: `UserModel.findOne({ email: "admin@taskboard.local" })`, extract `userId` using `normalizeId(user._id)`
- Directly create a task: `TaskModel.create({ title: "Task 1", status: "To Do", board: boardId, project: projectId })`, extract `taskId` using `normalizeId(task._id)`
- Directly create a comment: `CommentModel.create({ body: "A comment", task: taskId, author: userId })`
- Directly create a label: `LabelModel.create({ name: "Bug", color: "#ef4444", project: projectId })`
- Send `DELETE /api/projects/:id` with auth header
- Expect: 200
- Verify cascade — assert each collection is empty for the relevant foreign keys:
  - `await ProjectModel.findOne({ _id: projectId })` returns `null`
  - `await BoardModel.findOne({ project: projectId })` returns `null`
  - `await TaskModel.countDocuments({ board: boardId })` returns `0`
  - `await CommentModel.countDocuments({ task: taskId })` returns `0`
  - `await LabelModel.countDocuments({ project: projectId })` returns `0`

Setup: Needs model imports for `TaskModel`, `CommentModel`, `LabelModel`, and `ProjectModel`.

**Test 3: deletes a project with no tasks/comments/labels (only board)**
- Create a project via `POST /api/projects` (this auto-creates a board with default columns)
- Extract `projectId`
- Do NOT create any tasks, comments, or labels
- Send `DELETE /api/projects/:id` with auth header
- Expect: 200
- Assert: `body.data.message === "Project deleted"`
- Verify: board is gone: `BoardModel.findOne({ project: projectId })` returns `null`

This test verifies the handler works gracefully when there are no tasks/comments/labels to cascade through.

**Test 4: returns 404 for non-existent project ID**
- Use a valid but non-existent ObjectId: `"aaaaaaaaaaaaaaaaaaaaaaaa"`
- Send `DELETE /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` with auth header
- Expect: 404
- Assert: `body.error === "Project not found"`

**Test 5: returns 400 for invalid ObjectId format**
- Send `DELETE /api/projects/not-a-valid-id` with auth header
- Expect: 400
- Assert: `body.error === "Invalid project ID"`

**Test 6: returns 401 without auth token**
- Send `DELETE /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` without auth header
- Expect: 401
- Assert: `body.error === "Unauthorized"`

## 6. Implementation Order

1. **Extend mongoose test-double — `$in` operator support in `matches()`**
   - Modify the `matches()` function in `packages/server/test/helpers/mongoose.test-double.ts` to detect `{ $in: [...] }` filter values and check if the document field matches any element in the array.

2. **Extend mongoose test-double — `deleteOne` method**
   - Add `deleteOne` to the model object returned by the `model()` function in the same file. Place it after the existing `deleteMany` method.

3. **Add DELETE handler to `project.routes.ts`**
   - Add `TaskModel`, `CommentModel`, `LabelModel` to the import line.
   - Add `app.delete("/:id", ...)` handler after the existing `PUT /:id` handler.
   - Implement the cascade delete sequence: verify ownership → find board → collect task IDs → delete comments → delete tasks → delete labels → delete board → delete project.

4. **Add integration tests to `project.routes.test.ts`**
   - Add `TaskModel`, `CommentModel`, `LabelModel`, `ProjectModel` to the import line.
   - Add `describe("DELETE /api/projects/:id", ...)` block with all 6 tests.

5. **Run tests and verify**
   - Compile the server package.
   - Run all server tests to verify new tests pass and existing tests still pass.

## 7. Verification Commands

```bash
# 1. Compile the server package
cd packages/server && npm run build

# 2. Run all server tests
cd packages/server && npm test

# 3. Run only the project routes test file
cd packages/server && npx vitest run test/routes/project.routes.test.ts

# 4. Run existing tests to verify no regressions
cd packages/server && npx vitest run test/routes/auth.routes.test.ts
cd packages/server && npx vitest run test/app.test.ts
```