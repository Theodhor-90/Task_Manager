Now I have complete understanding of the codebase. Let me write the implementation plan.

# Task 2 Implementation Plan: Implement task creation endpoint

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/task.routes.ts` | Modify | Replace the `POST /:boardId/tasks` stub handler in `boardTaskRoutes` with a full implementation |

## 2. Dependencies

- **Task 1 (completed)** — `task.routes.ts` exists with validation helpers (`isValidObjectId`, `isValidCreateTaskBody`) and both plugins are registered in `app.ts`
- **Existing infrastructure**:
  - `BoardModel` — `findOne({ _id: boardId })` to look up board and its columns
  - `ProjectModel` — `findOne({ _id, owner })` for ownership verification
  - `TaskModel` — `countDocuments({ board, status })` for position computation, `create()` for task creation
  - Auth middleware attaches `request.user.id` from JWT

## 3. Implementation Details

### 3.1 `POST /:boardId/tasks` handler in `boardTaskRoutes`

Replace the current stub at line 164–166 of `task.routes.ts`:

```typescript
app.post("/:boardId/tasks", async (_request, reply) => {
  return reply.code(501).send({ error: "Not implemented" });
});
```

With the full handler `app.post("/:boardId/tasks", async (request, reply) => { ... })`:

**Step-by-step logic:**

1. **Extract `boardId`** from route params:
   ```typescript
   const { boardId } = request.params as { boardId: string };
   ```

2. **Validate `boardId`** is a valid ObjectId:
   ```typescript
   if (!isValidObjectId(boardId)) {
     return reply.code(400).send({ error: "Invalid board ID" });
   }
   ```

3. **Validate request body** via `isValidCreateTaskBody()`:
   ```typescript
   if (!isValidCreateTaskBody(request.body)) {
     return reply.code(400).send({ error: "Title is required" });
   }
   ```

4. **Look up the board**:
   ```typescript
   const board = await BoardModel.findOne({ _id: boardId });
   if (!board) {
     return reply.code(404).send({ error: "Board not found" });
   }
   ```

5. **Verify project ownership** — follow the same pattern as `board.routes.ts` (column handlers):
   ```typescript
   const project = await ProjectModel.findOne({
     _id: board.project,
     owner: request.user.id,
   });
   if (!project) {
     return reply.code(404).send({ error: "Board not found" });
   }
   ```

6. **Extract fields from validated body**:
   ```typescript
   const { title, description, priority, dueDate, labels, status } = request.body;
   ```

7. **Resolve `status`** — access the board's columns array, find the first column (position 0) as default, and validate the provided status matches a column name:
   ```typescript
   const columns = board.columns as unknown as Array<{
     _id: unknown;
     name: string;
     position: number;
   }>;
   ```

   If `status` is provided:
   ```typescript
   const columnNames = columns.map((col) => col.name);
   if (status !== undefined) {
     if (!columnNames.includes(status)) {
       return reply.code(400).send({ error: "Invalid status: does not match any column" });
     }
   }
   ```

   Resolve final status:
   ```typescript
   const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
   const resolvedStatus = status ?? sortedColumns[0].name;
   ```

8. **Set `priority`** default:
   ```typescript
   const resolvedPriority = priority ?? "medium";
   ```

9. **Compute `position`** — count existing tasks with the same board and status:
   ```typescript
   const position = await (TaskModel as unknown as {
     countDocuments(filter: Record<string, unknown>): Promise<number>;
   }).countDocuments({ board: boardId, status: resolvedStatus });
   ```

   This follows the same type-casting pattern seen in `board.routes.ts:369-371` for `countDocuments`.

10. **Create the task**:
    ```typescript
    const task = await TaskModel.create({
      title,
      description,
      status: resolvedStatus,
      priority: resolvedPriority,
      position,
      dueDate: dueDate ?? null,
      labels: labels ?? [],
      board: boardId,
      project: board.project,
    } as Record<string, unknown>);
    ```

11. **Return 201**:
    ```typescript
    return reply.code(201).send({ data: task });
    ```

**Full type casting notes:**
- `board.columns` needs the same casting pattern used throughout `board.routes.ts` for accessing column properties
- `board.project` is used directly as the denormalized project reference
- `TaskModel.countDocuments` uses the same type-cast pattern as `board.routes.ts:369-371`
- `TaskModel.create` uses `as Record<string, unknown>` for the input to satisfy type constraints, matching the pattern in `project.routes.ts:88-91`

### 3.2 Error messages

Following the established pattern from `board.routes.ts` and `project.routes.ts`:

| Condition | Status | Error message |
|-----------|--------|---------------|
| Invalid boardId format | 400 | `"Invalid board ID"` |
| Invalid/missing body (no title) | 400 | `"Title is required"` |
| Board not found | 404 | `"Board not found"` |
| Project ownership fails | 404 | `"Board not found"` (same as column routes — don't reveal existence) |
| Status doesn't match any column | 400 | `"Invalid status: does not match any column"` |

## 4. Contracts

### Request

**URL**: `POST /api/boards/:boardId/tasks`

**Headers**: `Authorization: Bearer <jwt-token>`

**Body** (JSON):
```json
{
  "title": "Fix login bug",
  "description": "Users can't log in with email containing +",
  "priority": "high",
  "dueDate": "2026-03-15",
  "labels": ["aaaaaaaaaaaaaaaaaaaaaaaa"],
  "status": "In Progress"
}
```

Only `title` is required. All other fields are optional.

### Response (201)

```json
{
  "data": {
    "_id": "bbbbbbbbbbbbbbbbbbbbbbbb",
    "title": "Fix login bug",
    "description": "Users can't log in with email containing +",
    "status": "In Progress",
    "priority": "high",
    "position": 0,
    "dueDate": "2026-03-15T00:00:00.000Z",
    "labels": ["aaaaaaaaaaaaaaaaaaaaaaaa"],
    "board": "cccccccccccccccccccccccc",
    "project": "dddddddddddddddddddddddd",
    "createdAt": "2026-02-24T10:00:00.000Z",
    "updatedAt": "2026-02-24T10:00:00.000Z"
  }
}
```

### Default values

| Field | Default |
|-------|---------|
| `status` | Name of the column with `position === 0` (typically `"To Do"`) |
| `priority` | `"medium"` |
| `position` | Count of existing tasks with same `board` and `status` (append to end) |
| `description` | `""` (Mongoose schema default) |
| `dueDate` | `null` (Mongoose schema default) |
| `labels` | `[]` (Mongoose schema default) |

### Error responses

| Input | Status | Error |
|-------|--------|-------|
| Missing title | 400 | `"Title is required"` |
| Empty title `""` | 400 | `"Title is required"` |
| Invalid priority `"critical"` | 400 | `"Title is required"` (caught by `isValidCreateTaskBody`) |
| Invalid boardId format | 400 | `"Invalid board ID"` |
| Non-existent boardId | 404 | `"Board not found"` |
| Status `"Nonexistent Column"` | 400 | `"Invalid status: does not match any column"` |
| No auth token | 401 | `"Unauthorized"` |

## 5. Test Plan

No new test file is created for this task — tests are in Task 6. However, the following behaviors should be verifiable:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Create task with title only | 201; status = "To Do", priority = "medium", position = 0 |
| 2 | Create task with all fields | 201; all fields stored correctly |
| 3 | Second task in same column | position = 1 |
| 4 | Task in different column | position = 0 in that column |
| 5 | Custom status matching existing column | Task stored with that status |
| 6 | Missing title | 400 |
| 7 | Empty title | 400 |
| 8 | Invalid priority | 400 |
| 9 | Status not matching any column | 400 |
| 10 | Non-existent boardId | 404 |
| 11 | Invalid boardId format | 400 |
| 12 | No auth token | 401 |

## 6. Implementation Order

1. **Read current `task.routes.ts`** to confirm the exact stub location and surrounding code
2. **Replace** the `POST /:boardId/tasks` stub handler with the full implementation:
   - Add boardId extraction and validation
   - Add body validation using existing `isValidCreateTaskBody()`
   - Add board lookup
   - Add project ownership verification
   - Add status resolution (validate against column names, default to first column)
   - Add priority default
   - Add position computation via `countDocuments`
   - Add `TaskModel.create()` call
   - Return 201 with task data
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