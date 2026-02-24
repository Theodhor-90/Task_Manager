Now I have everything needed. Let me write the implementation plan.

# Task 4 Implementation Plan: Implement get, update, and delete task endpoints

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/task.routes.ts` | Modify | Replace the three stub handlers in `taskRoutes` (`GET /:id`, `PUT /:id`, `DELETE /:id`) with full implementations |

## 2. Dependencies

- **Task 1 (completed)** — `task.routes.ts` exists with validation helpers (`isValidObjectId`, `isValidUpdateTaskBody`) and both plugins registered in `app.ts`
- **Task 2 (completed)** — `POST /:boardId/tasks` is implemented, so tasks can be created for testing
- **Task 3 (completed)** — `GET /:boardId/tasks` is implemented for verifying list behavior after delete
- **Existing infrastructure**:
  - `TaskModel` — `findOne`, `findOneAndUpdate`, `findByIdAndDelete` (via type-cast patterns)
  - `BoardModel` — `findOne({ _id: boardId })` to resolve board for ownership check
  - `ProjectModel` — `findOne({ _id, owner })` for ownership verification
  - `CommentModel` — `deleteMany({ task: id })` for cascade delete
  - `isValidObjectId()` — already defined at line 6–10
  - `isValidUpdateTaskBody()` — already defined at lines 73–134
  - Auth middleware attaches `request.user.id` from JWT
  - `LabelModel` is referenced via Mongoose `ref: "Label"` on TaskDocument's `labels` field for `.populate()`

## 3. Implementation Details

### 3.1 `GET /:id` handler in `taskRoutes`

Replace the current stub at lines 274–276 of `task.routes.ts`:

```typescript
app.get("/:id", async (_request, reply) => {
  return reply.code(501).send({ error: "Not implemented" });
});
```

With the full handler `app.get("/:id", async (request, reply) => { ... })`:

**Step-by-step logic:**

1. **Extract `id`** from route params:
   ```typescript
   const { id } = request.params as { id: string };
   ```

2. **Validate `id`** is a valid ObjectId:
   ```typescript
   if (!isValidObjectId(id)) {
     return reply.code(400).send({ error: "Invalid task ID" });
   }
   ```

3. **Look up the task** with labels populated:
   ```typescript
   const task = await (TaskModel as unknown as {
     findOne(filter: Record<string, unknown>): {
       populate(field: string): Promise<Record<string, unknown> | null>;
     };
   }).findOne({ _id: id }).populate("labels");
   ```

   This uses Mongoose's `.populate("labels")` to resolve the `labels` ObjectId array into full label documents (name, color, project, etc.). The `labels` field on the Task schema has `ref: "Label"` which enables this.

4. **Check if task exists**:
   ```typescript
   if (!task) {
     return reply.code(404).send({ error: "Task not found" });
   }
   ```

5. **Verify project ownership** — look up the board, then check project owner:
   ```typescript
   const board = await BoardModel.findOne({ _id: task.board });
   if (!board) {
     return reply.code(404).send({ error: "Task not found" });
   }

   const project = await ProjectModel.findOne({
     _id: board.project,
     owner: request.user.id,
   });
   if (!project) {
     return reply.code(404).send({ error: "Task not found" });
   }
   ```

   Note: Returns `"Task not found"` (not `"Board not found"`) for ownership failures since the entry point is a task ID — consistent with hiding existence from unauthorized users.

6. **Return 200**:
   ```typescript
   return reply.code(200).send({ data: task });
   ```

### 3.2 `PUT /:id` handler in `taskRoutes`

Replace the current stub at lines 282–284 of `task.routes.ts`:

```typescript
app.put("/:id", async (_request, reply) => {
  return reply.code(501).send({ error: "Not implemented" });
});
```

With the full handler `app.put("/:id", async (request, reply) => { ... })`:

**Step-by-step logic:**

1. **Extract `id`** from route params:
   ```typescript
   const { id } = request.params as { id: string };
   ```

2. **Validate `id`** is a valid ObjectId:
   ```typescript
   if (!isValidObjectId(id)) {
     return reply.code(400).send({ error: "Invalid task ID" });
   }
   ```

3. **Validate request body** via `isValidUpdateTaskBody()`:
   ```typescript
   if (!isValidUpdateTaskBody(request.body)) {
     return reply.code(400).send({ error: "At least one valid field is required" });
   }
   ```

4. **Look up the task** (to verify it exists and get board reference for ownership):
   ```typescript
   const task = await TaskModel.findOne({ _id: id });
   if (!task) {
     return reply.code(404).send({ error: "Task not found" });
   }
   ```

5. **Verify project ownership** via board:
   ```typescript
   const board = await BoardModel.findOne({ _id: task.board });
   if (!board) {
     return reply.code(404).send({ error: "Task not found" });
   }

   const project = await ProjectModel.findOne({
     _id: board.project,
     owner: request.user.id,
   });
   if (!project) {
     return reply.code(404).send({ error: "Task not found" });
   }
   ```

6. **Build update object** — only include fields present in the validated body:
   ```typescript
   const { title, description, priority, dueDate, labels } = request.body;
   const updates: Record<string, unknown> = {};
   if (title !== undefined) updates.title = title;
   if (description !== undefined) updates.description = description;
   if (priority !== undefined) updates.priority = priority;
   if (dueDate !== undefined) updates.dueDate = dueDate;
   if (labels !== undefined) updates.labels = labels;
   ```

   Note: `dueDate` can be `null` (to clear it) or a string — both are valid per `isValidUpdateTaskBody`. `status` and `position` are NOT updatable here — those go through the move endpoint.

7. **Apply update** using `findOneAndUpdate` with `{ new: true }`:
   ```typescript
   const updatedTask = await (TaskModel as unknown as {
     findOneAndUpdate(
       filter: Record<string, unknown>,
       update: Record<string, unknown>,
       options: Record<string, unknown>,
     ): Promise<Record<string, unknown> | null>;
   }).findOneAndUpdate(
     { _id: id },
     updates,
     { new: true },
   );
   ```

   This follows the exact same type-casting pattern used in `project.routes.ts:148-158`.

8. **Return 200**:
   ```typescript
   return reply.code(200).send({ data: updatedTask });
   ```

### 3.3 `DELETE /:id` handler in `taskRoutes`

Replace the current stub at lines 286–288 of `task.routes.ts`:

```typescript
app.delete("/:id", async (_request, reply) => {
  return reply.code(501).send({ error: "Not implemented" });
});
```

With the full handler `app.delete("/:id", async (request, reply) => { ... })`:

**Step-by-step logic:**

1. **Extract `id`** from route params:
   ```typescript
   const { id } = request.params as { id: string };
   ```

2. **Validate `id`** is a valid ObjectId:
   ```typescript
   if (!isValidObjectId(id)) {
     return reply.code(400).send({ error: "Invalid task ID" });
   }
   ```

3. **Look up the task** (save `board` and `status` for reindexing):
   ```typescript
   const task = await TaskModel.findOne({ _id: id });
   if (!task) {
     return reply.code(404).send({ error: "Task not found" });
   }
   ```

4. **Verify project ownership** via board:
   ```typescript
   const board = await BoardModel.findOne({ _id: task.board });
   if (!board) {
     return reply.code(404).send({ error: "Task not found" });
   }

   const project = await ProjectModel.findOne({
     _id: board.project,
     owner: request.user.id,
   });
   if (!project) {
     return reply.code(404).send({ error: "Task not found" });
   }
   ```

5. **Save references for reindexing** before deleting:
   ```typescript
   const taskBoard = task.board;
   const taskStatus = task.status;
   ```

6. **Cascade delete comments** for this task:
   ```typescript
   await CommentModel.deleteMany({ task: id } as Record<string, unknown>);
   ```

   This follows the same pattern as `project.routes.ts:193`.

7. **Delete the task**:
   ```typescript
   await TaskModel.deleteOne({ _id: id } as Record<string, unknown>);
   ```

   Using `deleteOne` matches the established pattern in `project.routes.ts:203-204`.

8. **Reindex positions** of remaining tasks in the same column:
   ```typescript
   const remainingTasks = await (TaskModel as unknown as {
     find(filter: Record<string, unknown>): {
       sort(sortObj: Record<string, number>): Promise<Array<{ _id: unknown; position: number; save?: () => Promise<void> }>>;
     };
   }).find({ board: taskBoard, status: taskStatus }).sort({ position: 1 });

   for (let i = 0; i < remainingTasks.length; i++) {
     if (remainingTasks[i].position !== i) {
       await (TaskModel as unknown as {
         findOneAndUpdate(
           filter: Record<string, unknown>,
           update: Record<string, unknown>,
           options: Record<string, unknown>,
         ): Promise<Record<string, unknown> | null>;
       }).findOneAndUpdate(
         { _id: remainingTasks[i]._id },
         { position: i },
         { new: true },
       );
     }
   }
   ```

   This queries all remaining tasks with the same `board` and `status`, sorts by current `position`, then updates each task's position to its array index (0-based contiguous). The `if` check avoids unnecessary writes for tasks already at the correct position.

9. **Return 200**:
   ```typescript
   return reply.code(200).send({ data: { message: "Task deleted" } });
   ```

### 3.4 Type-casting patterns summary

All type casts follow established codebase conventions:

| Operation | Cast Pattern | Reference |
|-----------|-------------|-----------|
| `TaskModel.findOne().populate()` | Chain cast with `findOne` returning `{ populate(): Promise }` | New — no existing `.populate()` usage in routes, but follows Mongoose API |
| `TaskModel.findOneAndUpdate()` | Same 3-param cast as `project.routes.ts:148-158` | `project.routes.ts:148-158` |
| `TaskModel.deleteOne()` | Same cast as `ProjectModel.deleteOne()` in `project.routes.ts:203-204` | `project.routes.ts:203-204` |
| `CommentModel.deleteMany()` | `as Record<string, unknown>` on filter | `project.routes.ts:193` |
| `TaskModel.find().sort()` | Same chain cast as `task.routes.ts:203-207` (GET list handler) | `task.routes.ts:203-207` |

### 3.5 Error messages

| Endpoint | Condition | Status | Error message |
|----------|-----------|--------|---------------|
| All three | Invalid task ID format | 400 | `"Invalid task ID"` |
| All three | Task not found | 404 | `"Task not found"` |
| All three | Board not found (from task's board ref) | 404 | `"Task not found"` |
| All three | Project ownership fails | 404 | `"Task not found"` |
| PUT | Invalid/empty body | 400 | `"At least one valid field is required"` |
| All three | No auth token | 401 | `"Unauthorized"` (handled by auth middleware) |

## 4. Contracts

### GET /api/tasks/:id

**Request**: `GET /api/tasks/:id` with `Authorization: Bearer <token>`

**Response (200)** — Task with populated labels:
```json
{
  "data": {
    "_id": "aaaaaaaaaaaaaaaaaaaaaa01",
    "title": "Fix login bug",
    "description": "Details here",
    "status": "To Do",
    "priority": "high",
    "position": 0,
    "dueDate": "2026-03-15T00:00:00.000Z",
    "labels": [
      {
        "_id": "bbbbbbbbbbbbbbbbbbbbbb01",
        "name": "Bug",
        "color": "#ef4444",
        "project": "cccccccccccccccccccccc01",
        "createdAt": "2026-02-24T10:00:00.000Z",
        "updatedAt": "2026-02-24T10:00:00.000Z"
      }
    ],
    "board": "dddddddddddddddddddddd01",
    "project": "cccccccccccccccccccccc01",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z"
  }
}
```

**Error responses**:
| Condition | Status | Response |
|-----------|--------|----------|
| Invalid ObjectId | 400 | `{ "error": "Invalid task ID" }` |
| Task not found | 404 | `{ "error": "Task not found" }` |
| No auth token | 401 | `{ "error": "Unauthorized" }` |

### PUT /api/tasks/:id

**Request**: `PUT /api/tasks/:id` with `Authorization: Bearer <token>`

**Body** (JSON) — at least one field required:
```json
{
  "title": "Updated title",
  "description": "New description",
  "priority": "low",
  "dueDate": "2026-04-01",
  "labels": ["bbbbbbbbbbbbbbbbbbbbbb01"]
}
```

Allowed fields: `title`, `description`, `priority`, `dueDate`, `labels`. Not allowed: `status`, `position` (use move endpoint).

**Response (200)**:
```json
{
  "data": {
    "_id": "aaaaaaaaaaaaaaaaaaaaaa01",
    "title": "Updated title",
    "description": "New description",
    "status": "To Do",
    "priority": "low",
    "position": 0,
    "dueDate": "2026-04-01T00:00:00.000Z",
    "labels": ["bbbbbbbbbbbbbbbbbbbbbb01"],
    "board": "dddddddddddddddddddddd01",
    "project": "cccccccccccccccccccccc01",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:30:00.000Z"
  }
}
```

Note: The PUT response returns labels as ObjectIds (not populated), which is consistent with the spec that says "GET populates labels; PUT does NOT need to populate labels in the response."

**`dueDate` special values:**
- `"2026-04-01"` → sets the date
- `null` → clears the due date

**Error responses**:
| Condition | Status | Response |
|-----------|--------|----------|
| Invalid ObjectId | 400 | `{ "error": "Invalid task ID" }` |
| Empty body / no valid fields | 400 | `{ "error": "At least one valid field is required" }` |
| Invalid priority value | 400 | `{ "error": "At least one valid field is required" }` (caught by validator) |
| Empty title | 400 | `{ "error": "At least one valid field is required" }` (caught by validator) |
| Task not found | 404 | `{ "error": "Task not found" }` |
| No auth token | 401 | `{ "error": "Unauthorized" }` |

### DELETE /api/tasks/:id

**Request**: `DELETE /api/tasks/:id` with `Authorization: Bearer <token>`

**Response (200)**:
```json
{
  "data": {
    "message": "Task deleted"
  }
}
```

**Side effects**:
1. All comments referencing this task are deleted
2. Remaining tasks in the same column (same `board` + `status`) have their positions reindexed to be contiguous 0-based

**Error responses**:
| Condition | Status | Response |
|-----------|--------|----------|
| Invalid ObjectId | 400 | `{ "error": "Invalid task ID" }` |
| Task not found | 404 | `{ "error": "Task not found" }` |
| No auth token | 401 | `{ "error": "Unauthorized" }` |

## 5. Test Plan

No new test file is created for this task — comprehensive integration tests are in Task 6. However, the following behaviors should be verifiable:

### GET /api/tasks/:id

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Get task with labels assigned | 200; labels are full objects (name, color, project) not just IDs |
| 2 | Get task with no labels | 200; labels is empty array `[]` |
| 3 | Non-existent task ID | 404; `"Task not found"` |
| 4 | Invalid ObjectId format | 400; `"Invalid task ID"` |
| 5 | No auth token | 401; `"Unauthorized"` |

### PUT /api/tasks/:id

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Update title only | 200; title changed, other fields unchanged |
| 2 | Update description | 200; description changed |
| 3 | Update priority | 200; priority changed to valid value |
| 4 | Update dueDate to a date string | 200; dueDate set |
| 5 | Update dueDate to null (clear it) | 200; dueDate cleared to null |
| 6 | Update labels array | 200; labels replaced with new array |
| 7 | Update multiple fields at once | 200; all specified fields changed |
| 8 | Empty body `{}` | 400; `"At least one valid field is required"` |
| 9 | Invalid priority `"critical"` | 400 |
| 10 | Empty title `""` | 400 |
| 11 | Non-existent task ID | 404; `"Task not found"` |
| 12 | Invalid ObjectId format | 400; `"Invalid task ID"` |
| 13 | No auth token | 401; `"Unauthorized"` |

### DELETE /api/tasks/:id

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Delete task with no comments | 200; task removed from database |
| 2 | Delete task with comments | 200; task AND all comments removed |
| 3 | Position reindexing: delete middle task from column with 3 tasks | Remaining 2 tasks have positions 0 and 1 |
| 4 | Position reindexing: delete first task (position 0) | Remaining tasks reindexed starting from 0 |
| 5 | Position reindexing: delete last task | No change to other task positions |
| 6 | Delete only task in column | Column is empty, no reindexing needed |
| 7 | Non-existent task ID | 404; `"Task not found"` |
| 8 | Invalid ObjectId format | 400; `"Invalid task ID"` |
| 9 | No auth token | 401; `"Unauthorized"` |

## 6. Implementation Order

1. **Read current `task.routes.ts`** to confirm the exact stub locations for all three handlers
2. **Implement `GET /:id`** — replace stub with:
   - Task ID extraction and validation
   - Task lookup with `.populate("labels")`
   - Board lookup and project ownership verification
   - Return 200 with populated task
3. **Implement `PUT /:id`** — replace stub with:
   - Task ID extraction and validation
   - Body validation via `isValidUpdateTaskBody()`
   - Task lookup
   - Board lookup and project ownership verification
   - Build updates object from validated fields
   - `findOneAndUpdate` with `{ new: true }`
   - Return 200 with updated task
4. **Implement `DELETE /:id`** — replace stub with:
   - Task ID extraction and validation
   - Task lookup (save board/status for reindexing)
   - Board lookup and project ownership verification
   - `CommentModel.deleteMany({ task: id })`
   - `TaskModel.deleteOne({ _id: id })`
   - Query remaining tasks in same column sorted by position
   - Update each to contiguous 0-based position
   - Return 200 with `{ message: "Task deleted" }`
5. **Verify** TypeScript compilation and existing tests still pass

## 7. Verification Commands

```bash
# 1. TypeScript compilation check
cd packages/server && npx tsc --noEmit

# 2. Run existing tests to confirm no regressions
cd packages/server && npm test

# 3. Full build check
npm run build --workspace=packages/server
```