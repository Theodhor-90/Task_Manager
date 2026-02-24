# Task 5 Implementation Plan: Implement task move endpoint

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/task.routes.ts` | Modify | Replace the `PUT /:id/move` stub handler in `taskRoutes` with a full implementation supporting both cross-column moves and within-column reorders |

## 2. Dependencies

- **Task 1 (completed)** — `task.routes.ts` exists with `isValidMoveTaskBody()` validator (lines 136–157) and both plugins registered in `app.ts`
- **Task 2 (completed)** — `POST /:boardId/tasks` is implemented, so tasks can be created for testing move operations
- **Task 4 (completed)** — `DELETE /:id` handler contains the reindex pattern (lines 404–426) that this task will reuse for source column reindexing
- **Existing infrastructure**:
  - `TaskModel` — `findOne`, `find().sort()`, `findOneAndUpdate`, `countDocuments`
  - `BoardModel` — `findOne({ _id })` to look up board and validate column names
  - `ProjectModel` — `findOne({ _id, owner })` for ownership verification
  - `isValidObjectId()` — defined at line 6–10
  - `isValidMoveTaskBody()` — defined at lines 136–157, validates `position` is a non-negative integer and `status` is an optional non-empty string
  - Auth middleware attaches `request.user.id` from JWT

## 3. Implementation Details

### 3.1 `PUT /:id/move` handler in `taskRoutes`

Replace the current stub at lines 309–311 of `task.routes.ts`:

```typescript
app.put("/:id/move", async (_request, reply) => {
  return reply.code(501).send({ error: "Not implemented" });
});
```

With the full handler `app.put("/:id/move", async (request, reply) => { ... })`:

**Step-by-step logic:**

#### Step 1: Extract and validate task ID

```typescript
const { id } = request.params as { id: string };

if (!isValidObjectId(id)) {
  return reply.code(400).send({ error: "Invalid task ID" });
}
```

#### Step 2: Validate request body

```typescript
if (!isValidMoveTaskBody(request.body)) {
  return reply.code(400).send({ error: "Position is required and must be a non-negative integer" });
}

const { position, status } = request.body;
```

#### Step 3: Look up the task

```typescript
const task = await TaskModel.findOne({ _id: id });

if (!task) {
  return reply.code(404).send({ error: "Task not found" });
}
```

`task` is a Mongoose document with fields: `_id`, `board`, `status`, `position`, and others.

#### Step 4: Verify project ownership via board

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

Returns `"Task not found"` (not `"Board not found"`) since the entry point is a task ID — consistent with the GET/PUT/DELETE handlers in the same plugin.

#### Step 5: Validate target status against board column names

```typescript
const columns = board.columns as unknown as Array<{
  _id: unknown;
  name: string;
  position: number;
}>;
const columnNames = columns.map((col) => col.name);

const sourceStatus = task.status as string;
const targetStatus = status ?? sourceStatus;

if (!columnNames.includes(targetStatus)) {
  return reply.code(400).send({ error: "Invalid status: does not match any column" });
}
```

If `status` is omitted from the request body, `targetStatus` defaults to the task's current status (within-column reorder). If `status` is provided but doesn't match any board column name, return 400.

#### Step 6: Determine move type and execute

The algorithm uses the "remove-then-insert" approach for both cross-column and within-column moves. This is the simpler alternative mentioned in the task spec, and it avoids complex conditional shifting logic.

```typescript
const isCrossColumnMove = targetStatus !== sourceStatus;
```

**Phase A: Remove the task from its source column**

Query all tasks in the source column *except* the task being moved, sorted by position. Reindex them to contiguous 0-based positions:

```typescript
const sourceTasks = await (TaskModel as unknown as {
  find(filter: Record<string, unknown>): {
    sort(sortObj: Record<string, number>): Promise<Array<{ _id: unknown; position: number }>>;
  };
}).find({ board: task.board, status: sourceStatus, _id: { $ne: id } }).sort({ position: 1 });

for (let i = 0; i < sourceTasks.length; i++) {
  if (sourceTasks[i].position !== i) {
    await (TaskModel as unknown as {
      findOneAndUpdate(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<Record<string, unknown> | null>;
    }).findOneAndUpdate(
      { _id: sourceTasks[i]._id },
      { position: i },
      { new: true },
    );
  }
}
```

This uses the same `find().sort()` and `findOneAndUpdate` type-casting patterns established in the DELETE handler at lines 404–426. The key difference is the `{ _id: { $ne: id } }` filter to exclude the task being moved.

**Phase B: Determine the destination column's task count and clamp position**

For a cross-column move, the destination column count is the total number of tasks in that column (the moved task is not there yet). For a within-column move, the destination count is `sourceTasks.length` (the source column without the moved task, since source = destination).

```typescript
let destinationCount: number;

if (isCrossColumnMove) {
  destinationCount = await (TaskModel as unknown as {
    countDocuments(filter: Record<string, unknown>): Promise<number>;
  }).countDocuments({ board: task.board, status: targetStatus });
} else {
  destinationCount = sourceTasks.length;
}

const clampedPosition = Math.min(position, destinationCount);
```

Clamping: The target position is clamped to `[0, destinationCount]` inclusive. Position 0 is the beginning; `destinationCount` is the append position (one past the last existing task). The `isValidMoveTaskBody` validator already guarantees `position >= 0`, so only the upper bound needs clamping here.

**Phase C: Shift tasks in the destination column to make room**

For a cross-column move, shift all tasks in the destination column that have `position >= clampedPosition` up by 1. For a within-column move, shift tasks in the (already-reindexed) source column at `position >= clampedPosition` up by 1:

```typescript
if (isCrossColumnMove) {
  const destTasks = await (TaskModel as unknown as {
    find(filter: Record<string, unknown>): {
      sort(sortObj: Record<string, number>): Promise<Array<{ _id: unknown; position: number }>>;
    };
  }).find({ board: task.board, status: targetStatus, position: { $gte: clampedPosition } }).sort({ position: 1 });

  for (const destTask of destTasks) {
    await (TaskModel as unknown as {
      findOneAndUpdate(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<Record<string, unknown> | null>;
    }).findOneAndUpdate(
      { _id: destTask._id },
      { position: destTask.position + 1 },
      { new: true },
    );
  }
} else {
  for (let i = sourceTasks.length - 1; i >= clampedPosition; i--) {
    await (TaskModel as unknown as {
      findOneAndUpdate(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options: Record<string, unknown>,
      ): Promise<Record<string, unknown> | null>;
    }).findOneAndUpdate(
      { _id: sourceTasks[i]._id },
      { position: i + 1 },
      { new: true },
    );
  }
}
```

For the within-column case, we iterate from the end down to `clampedPosition` to avoid position collisions during the shift. The `sourceTasks` array is already reindexed (from Phase A), so positions are contiguous 0-based.

**Phase D: Update the moved task's status and position**

```typescript
const updatedTask = await (TaskModel as unknown as {
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null>;
}).findOneAndUpdate(
  { _id: id },
  { status: targetStatus, position: clampedPosition },
  { new: true },
);

return reply.code(200).send({ data: updatedTask });
```

### 3.2 Algorithm Summary

The move algorithm is a four-phase "remove-then-insert" process:

1. **Remove**: Exclude the moved task from its source column and reindex the remaining tasks to contiguous 0-based positions
2. **Count**: Determine how many tasks are in the destination column (excluding the moved task) and clamp the target position to `[0, count]`
3. **Shift**: In the destination column, shift tasks at `position >= clampedPosition` up by 1 to create a gap
4. **Insert**: Update the moved task with the target `status` and `clampedPosition`

For within-column reorders (source = destination), Phase A reindexes the column without the task, Phase B counts the reindexed array, Phase C shifts within that same array, and Phase D places the task at its new position.

For cross-column moves, Phase A reindexes the source column (task is gone), Phase B counts the destination column, Phase C shifts tasks in the destination to make room, and Phase D places the task in the destination with the new status.

### 3.3 Type-casting patterns

All type casts follow the exact patterns already established in `task.routes.ts`:

| Operation | Cast Pattern | Existing Reference |
|-----------|-------------|-----------|
| `TaskModel.find().sort()` | Chain cast with `find` returning `{ sort(): Promise<Array<...>> }` | `task.routes.ts:404-410` (DELETE handler) |
| `TaskModel.findOneAndUpdate()` | 3-param cast `(filter, update, options): Promise<...>` | `task.routes.ts:414-419` (DELETE handler), `task.routes.ts:353-358` (PUT handler) |
| `TaskModel.countDocuments()` | Cast to `{ countDocuments(filter): Promise<number> }` | `task.routes.ts:253-255` (POST handler) |
| `board.columns` | Cast to `Array<{ _id: unknown; name: string; position: number }>` | `task.routes.ts:239-243` (POST handler) |

### 3.4 Error messages

| Condition | Status | Error message |
|-----------|--------|---------------|
| Invalid task ID format | 400 | `"Invalid task ID"` |
| Invalid body (missing/bad position) | 400 | `"Position is required and must be a non-negative integer"` |
| Task not found | 404 | `"Task not found"` |
| Board not found (from task's board ref) | 404 | `"Task not found"` |
| Project ownership fails | 404 | `"Task not found"` |
| Status doesn't match any column name | 400 | `"Invalid status: does not match any column"` |
| No auth token | 401 | `"Unauthorized"` (handled by auth middleware) |

## 4. Contracts

### Request

**URL**: `PUT /api/tasks/:id/move`

**Headers**: `Authorization: Bearer <jwt-token>`

**Body** (JSON):
```json
{
  "position": 2,
  "status": "In Progress"
}
```

- `position` — required, non-negative integer. The desired 0-based position in the target column. Clamped to `[0, destinationCount]` if out of range.
- `status` — optional string. The target column name. If omitted, defaults to the task's current status (within-column reorder). If provided, must match a board column name.

### Response (200)

```json
{
  "data": {
    "_id": "aaaaaaaaaaaaaaaaaaaaaa01",
    "title": "Fix login bug",
    "description": "Details here",
    "status": "In Progress",
    "priority": "high",
    "position": 2,
    "dueDate": "2026-03-15T00:00:00.000Z",
    "labels": ["bbbbbbbbbbbbbbbbbbbbbb01"],
    "board": "cccccccccccccccccccccc01",
    "project": "dddddddddddddddddddddd01",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:30:00.000Z"
  }
}
```

Note: Labels are returned as ObjectId strings (not populated), consistent with the PUT update endpoint.

### Error responses

| Condition | Status | Response |
|-----------|--------|----------|
| Invalid ObjectId format | 400 | `{ "error": "Invalid task ID" }` |
| Missing/invalid body | 400 | `{ "error": "Position is required and must be a non-negative integer" }` |
| Invalid status (not a column) | 400 | `{ "error": "Invalid status: does not match any column" }` |
| Task not found | 404 | `{ "error": "Task not found" }` |
| No auth token | 401 | `{ "error": "Unauthorized" }` |

### Examples

**Cross-column move**: Move task from "To Do" (position 1) to "In Progress" (position 0):
- Request: `{ "position": 0, "status": "In Progress" }`
- Source column "To Do": remaining tasks reindexed to 0-based contiguous
- Destination column "In Progress": existing tasks shifted right by 1, moved task placed at position 0
- Response: task with `status: "In Progress"`, `position: 0`

**Within-column reorder**: Move task from position 0 to position 2 in "To Do":
- Request: `{ "position": 2 }` (no `status` field)
- Task removed from position 0, remaining reindexed: positions become 0, 1, ... (n-2)
- Gap created at position 2 by shifting tasks at position >= 2 up by 1
- Task placed at position 2
- Response: task with `status: "To Do"`, `position: 2`

**Position clamping**: Move to position 999 in a column with 3 tasks:
- Clamped to position 3 (append to end)
- No shifting needed since `clampedPosition === destinationCount`
- Response: task with `position: 3`

## 5. Test Plan

No new test file is created for this task — comprehensive integration tests are in Task 6. However, the following behaviors should be verifiable:

### Cross-column move scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Move task from "To Do" to "In Progress" at position 0 | 200; status = "In Progress", position = 0 |
| 2 | Source column reindexed after move out | Remaining tasks in "To Do" have contiguous 0-based positions |
| 3 | Destination column positions correct after move in | Existing tasks shifted right, moved task at target position |
| 4 | Move to end of destination column | Task gets position = destinationCount |
| 5 | Move to empty destination column | Task gets position 0 |

### Within-column reorder scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 6 | Reorder task to position 0 (beginning) | 200; task at position 0, others shifted |
| 7 | Reorder task to end of column | 200; task at last position |
| 8 | Reorder task to same position (no-op move) | 200; positions unchanged |

### Position clamping scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 9 | Position exceeds column size | Position clamped to column task count |
| 10 | Position 0 in any column | Task placed at beginning |

### Error scenarios

| # | Scenario | Expected |
|---|----------|----------|
| 11 | Invalid task ID format | 400; `"Invalid task ID"` |
| 12 | Missing position in body | 400; `"Position is required and must be a non-negative integer"` |
| 13 | Negative position | 400 (caught by validator) |
| 14 | Non-integer position (e.g., 1.5) | 400 (caught by validator) |
| 15 | Status not matching any column | 400; `"Invalid status: does not match any column"` |
| 16 | Non-existent task ID | 404; `"Task not found"` |
| 17 | No auth token | 401; `"Unauthorized"` |

## 6. Implementation Order

1. **Read current `task.routes.ts`** to confirm the exact stub location at lines 309–311
2. **Replace** the `PUT /:id/move` stub handler with the full implementation:
   - Extract and validate task ID (`isValidObjectId`)
   - Validate request body (`isValidMoveTaskBody`)
   - Look up task (404 if not found)
   - Look up board and verify project ownership (404 if unauthorized)
   - Extract column names from board, resolve target status (default to current)
   - Validate target status against column names (400 if invalid)
   - Determine if cross-column or within-column move
   - Phase A: Remove task from source column — query all other tasks in source, reindex to 0-based
   - Phase B: Count destination column tasks, clamp position
   - Phase C: Shift destination column tasks at `position >= clampedPosition` up by 1
   - Phase D: Update moved task with `findOneAndUpdate({ status, position }, { new: true })`
   - Return 200 with `{ data: updatedTask }`
3. **Verify** TypeScript compilation and existing tests still pass

## 7. Verification Commands

```bash
# 1. TypeScript compilation check
cd packages/server && npx tsc --noEmit

# 2. Run existing tests to confirm no regressions
cd packages/server && npm test

# 3. Full build check
npm run build --workspace=packages/server
```