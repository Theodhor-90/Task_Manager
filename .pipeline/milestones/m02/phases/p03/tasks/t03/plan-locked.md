Now I have complete understanding of all the codebase patterns and the existing implementation. Let me produce the implementation plan.

# Task 3 Implementation Plan: Implement task list endpoint with filtering and sorting

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/src/routes/task.routes.ts` | Modify | Replace the `GET /:boardId/tasks` stub handler in `boardTaskRoutes` with full implementation supporting query filtering and sorting |

## 2. Dependencies

- **Task 1 (completed)** — `task.routes.ts` exists with validation helpers and both plugins registered in `app.ts`
- **Task 2 (completed)** — `POST /:boardId/tasks` is implemented, so tasks can be created for testing the list endpoint
- **Existing infrastructure**:
  - `BoardModel` — `findOne({ _id: boardId })` to look up board
  - `ProjectModel` — `findOne({ _id, owner })` for ownership verification
  - `TaskModel` — `find(filter).sort(sortObj)` for querying tasks
  - `isValidObjectId()` — already defined in the file at line 6–10
  - Auth middleware attaches `request.user.id` from JWT

## 3. Implementation Details

### 3.1 `GET /:boardId/tasks` handler in `boardTaskRoutes`

Replace the current stub at lines 160–162 of `task.routes.ts`:

```typescript
app.get("/:boardId/tasks", async (_request, reply) => {
  return reply.code(501).send({ error: "Not implemented" });
});
```

With the full handler `app.get("/:boardId/tasks", async (request, reply) => { ... })`:

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

3. **Look up the board**:
   ```typescript
   const board = await BoardModel.findOne({ _id: boardId });
   if (!board) {
     return reply.code(404).send({ error: "Board not found" });
   }
   ```

4. **Verify project ownership** — same pattern as task creation handler and `board.routes.ts`:
   ```typescript
   const project = await ProjectModel.findOne({
     _id: board.project,
     owner: request.user.id,
   });
   if (!project) {
     return reply.code(404).send({ error: "Board not found" });
   }
   ```

5. **Extract query parameters**:
   ```typescript
   const query = request.query as Record<string, string | undefined>;
   const { status, priority, label, sort, order } = query;
   ```

6. **Build Mongoose filter object**:
   ```typescript
   const filter: Record<string, unknown> = { board: boardId };

   if (status !== undefined) {
     filter.status = status;
   }

   if (priority !== undefined) {
     filter.priority = priority;
   }

   if (label !== undefined) {
     filter.labels = label;
   }
   ```

   Notes:
   - The base filter always includes `{ board: boardId }` to scope to this board
   - `status` is added as an exact string match (e.g., `"To Do"`)
   - `priority` is added as an exact string match (e.g., `"high"`)
   - `label` is a single label ObjectId; assigning it to `filter.labels` uses Mongoose's built-in array `$in`-like behavior where matching a scalar against an array field finds documents where the array contains that value

7. **Build sort object**:
   ```typescript
   const allowedSortFields = ["createdAt", "dueDate", "position"];
   const sortField = sort !== undefined && allowedSortFields.includes(sort) ? sort : "position";
   const sortDirection = order === "desc" ? -1 : 1;
   const sortObj: Record<string, number> = { [sortField]: sortDirection };
   ```

   Notes:
   - Default sort field is `"position"` (natural column order)
   - Default sort direction is ascending (`1`)
   - Only `"createdAt"`, `"dueDate"`, and `"position"` are allowed sort fields; any other value falls back to `"position"`
   - `order` parameter: `"desc"` → `-1`, anything else (including `"asc"` or undefined) → `1`

8. **Execute query**:
   ```typescript
   const tasks = await (TaskModel as unknown as {
     find(filter: Record<string, unknown>): {
       sort(sortObj: Record<string, number>): Promise<unknown[]>;
     };
   }).find(filter).sort(sortObj);
   ```

   This follows the same type-casting pattern used in `project.routes.ts:106-108` where `FindProjectsModel` type is used for `.find().sort()` chaining.

9. **Return 200**:
   ```typescript
   return reply.code(200).send({ data: tasks });
   ```

**Full type casting notes:**
- `board.project` is used directly as the denormalized project reference (same as task creation)
- `TaskModel.find().sort()` uses the same chain-casting pattern as `project.routes.ts:106-108`
- Query parameters are typed as `Record<string, string | undefined>` since Fastify provides query params as strings

### 3.2 Error messages

Following the established pattern from other routes:

| Condition | Status | Error message |
|-----------|--------|---------------|
| Invalid boardId format | 400 | `"Invalid board ID"` |
| Board not found | 404 | `"Board not found"` |
| Project ownership fails | 404 | `"Board not found"` (same as other handlers — don't reveal existence) |
| No auth token | 401 | `"Unauthorized"` (handled by auth middleware) |

Note: Invalid or unrecognized filter values (e.g., `priority=invalid`) are NOT treated as errors. They simply produce an empty result set, which is standard REST behavior. The endpoint returns `{ data: [] }` rather than a 400 error.

## 4. Contracts

### Request

**URL**: `GET /api/boards/:boardId/tasks`

**Headers**: `Authorization: Bearer <jwt-token>`

**Query Parameters** (all optional):

| Param | Type | Description | Example |
|-------|------|-------------|---------|
| `status` | string | Filter by column name | `?status=To+Do` |
| `priority` | string | Filter by priority level | `?priority=high` |
| `label` | string | Filter by label ObjectId (matches if task's labels array contains it) | `?label=aaaaaaaaaaaaaaaaaaaaaaaa` |
| `sort` | string | Sort field; allowed: `createdAt`, `dueDate`, `position` | `?sort=createdAt` |
| `order` | string | Sort direction; `asc` or `desc` | `?order=desc` |

### Response (200) — Tasks found

```json
{
  "data": [
    {
      "_id": "bbbbbbbbbbbbbbbbbbbbbbbb",
      "title": "Fix login bug",
      "description": "Details here",
      "status": "To Do",
      "priority": "high",
      "position": 0,
      "dueDate": "2026-03-15T00:00:00.000Z",
      "labels": ["aaaaaaaaaaaaaaaaaaaaaaaa"],
      "board": "cccccccccccccccccccccccc",
      "project": "dddddddddddddddddddddddd",
      "createdAt": "2026-02-24T10:00:00.000Z",
      "updatedAt": "2026-02-24T10:00:00.000Z"
    }
  ]
}
```

### Response (200) — Empty results

```json
{
  "data": []
}
```

Note: Labels are **NOT** populated (returned as ObjectId strings, not full label objects). This keeps the list response lean per design decision #6 in the phase spec.

### Default sort behavior

| Query | Effective sort |
|-------|---------------|
| (no sort params) | `{ position: 1 }` (ascending by position) |
| `?sort=createdAt` | `{ createdAt: 1 }` (ascending) |
| `?sort=dueDate&order=desc` | `{ dueDate: -1 }` (descending) |
| `?sort=invalid` | `{ position: 1 }` (fallback to default) |

### Error responses

| Condition | Status | Response |
|-----------|--------|----------|
| Invalid boardId format | 400 | `{ "error": "Invalid board ID" }` |
| Non-existent boardId | 404 | `{ "error": "Board not found" }` |
| No auth token | 401 | `{ "error": "Unauthorized" }` |

## 5. Test Plan

No new test file is created for this task — comprehensive integration tests are in Task 6. However, the following behaviors should be verifiable:

| # | Scenario | Expected |
|---|----------|----------|
| 1 | List all tasks for a board (no filters) | 200; returns all tasks sorted by position ascending |
| 2 | Filter by `status=To+Do` | 200; returns only tasks with status "To Do" |
| 3 | Filter by `priority=high` | 200; returns only tasks with priority "high" |
| 4 | Filter by `label=<labelId>` | 200; returns only tasks whose labels array contains the ID |
| 5 | Sort by `createdAt` ascending (default) | 200; tasks sorted by createdAt ASC |
| 6 | Sort by `createdAt` descending | 200; tasks sorted by createdAt DESC |
| 7 | Sort by `dueDate` ascending | 200; tasks sorted by dueDate ASC |
| 8 | Sort by `dueDate` descending | 200; tasks sorted by dueDate DESC |
| 9 | Combine filter and sort (`status=To+Do&sort=createdAt&order=desc`) | 200; filtered and sorted correctly |
| 10 | Empty board (no tasks) | 200; `{ data: [] }` |
| 11 | Non-existent boardId | 404; `"Board not found"` |
| 12 | Invalid boardId format | 400; `"Invalid board ID"` |
| 13 | No auth token | 401; `"Unauthorized"` |

## 6. Implementation Order

1. **Read current `task.routes.ts`** to confirm the exact stub location (line 160–162 in `boardTaskRoutes`)
2. **Replace** the `GET /:boardId/tasks` stub handler with the full implementation:
   - Add boardId extraction and validation
   - Add board lookup
   - Add project ownership verification
   - Add query parameter extraction
   - Add filter object construction (board, status, priority, label)
   - Add sort object construction (field + direction with defaults)
   - Add `TaskModel.find(filter).sort(sortObj)` query execution
   - Return 200 with `{ data: tasks }`
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