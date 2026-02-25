Now I have all the context needed. Let me produce the implementation plan.

# Task 2: Board & Task API Client Functions — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/src/api/boards.ts` | Created | API client module for board, column, and task-listing endpoints |

## 2. Dependencies

- **Task 1 complete** — `@dnd-kit/core` and `@dnd-kit/sortable` are installed (this task does not use them, but the phase dependency chain requires t01 to be done)
- **Existing files**:
  - `packages/client/src/api/client.ts` — provides `apiClient` with `get`, `post`, `put`, `del` methods and automatic JWT Bearer token injection
  - `@taskboard/shared` — provides `Board`, `Column`, `Task`, `ApiSuccessResponse` types

## 3. Implementation Details

### 3.1 `packages/client/src/api/boards.ts`

**Purpose**: Centralize all HTTP calls to board, column, and task-listing endpoints. Follows the same pattern established by `auth.ts` and `projects.ts` — import `apiClient`, call the appropriate method, type the response with `ApiSuccessResponse<T>`.

**Exports**: 6 named async functions.

**Imports**:

```typescript
import type { ApiSuccessResponse, Board, Column, Task } from "@taskboard/shared";
import { apiClient } from "./client";
```

**Function signatures and implementations**:

#### `fetchBoard`

```typescript
export async function fetchBoard(
  projectId: string,
): Promise<ApiSuccessResponse<Board>> {
  return apiClient.get<ApiSuccessResponse<Board>>(
    `/api/projects/${projectId}/board`,
  );
}
```

- Calls `GET /api/projects/:projectId/board`
- Returns `{ data: Board }` where `Board` contains `_id`, `project`, `columns[]`, `createdAt`, `updatedAt`
- Columns within the board are sorted by `position` ascending (server-side)

#### `fetchBoardTasks`

```typescript
export async function fetchBoardTasks(
  boardId: string,
): Promise<ApiSuccessResponse<Task[]>> {
  return apiClient.get<ApiSuccessResponse<Task[]>>(
    `/api/boards/${boardId}/tasks`,
  );
}
```

- Calls `GET /api/boards/:boardId/tasks`
- Returns `{ data: Task[] }` — all tasks for the board, sorted by `position` ascending (server default)
- Does not apply query filters in this phase (filters are Phase 4's responsibility)

#### `addColumn`

```typescript
export async function addColumn(
  boardId: string,
  name: string,
): Promise<ApiSuccessResponse<Column>> {
  return apiClient.post<ApiSuccessResponse<Column>>(
    `/api/boards/${boardId}/columns`,
    { name },
  );
}
```

- Calls `POST /api/boards/:boardId/columns` with `{ name }`
- Returns `{ data: Column }` where the new column has `_id`, `name`, and `position` (auto-assigned as the last position)

#### `renameColumn`

```typescript
export async function renameColumn(
  boardId: string,
  columnId: string,
  name: string,
): Promise<ApiSuccessResponse<Column>> {
  return apiClient.put<ApiSuccessResponse<Column>>(
    `/api/boards/${boardId}/columns/${columnId}`,
    { name },
  );
}
```

- Calls `PUT /api/boards/:boardId/columns/:columnId` with `{ name }`
- Returns `{ data: Column }` with the updated name and unchanged position

#### `deleteColumn`

```typescript
export async function deleteColumn(
  boardId: string,
  columnId: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(
    `/api/boards/${boardId}/columns/${columnId}`,
  );
}
```

- Calls `DELETE /api/boards/:boardId/columns/:columnId`
- Returns `{ data: { message: "Column deleted" } }` on success
- Server returns HTTP 400 with `{ error: "Cannot delete column that contains tasks" }` when tasks exist — `apiClient` throws an `Error` with that message (handled by `client.ts` line 32–35)

#### `reorderColumns`

```typescript
export async function reorderColumns(
  boardId: string,
  columnIds: string[],
): Promise<ApiSuccessResponse<Board>> {
  return apiClient.put<ApiSuccessResponse<Board>>(
    `/api/boards/${boardId}/columns/reorder`,
    { columnIds },
  );
}
```

- Calls `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds }`
- `columnIds` must include all column IDs in the desired order
- Returns `{ data: Board }` with the full updated board (columns re-positioned)

**Pattern notes**:
- Following `projects.ts`, all functions return the full `ApiSuccessResponse<T>` envelope (the caller unwraps `.data`). This is consistent with how `ProjectsContext` consumes the API (`response.data`).
- No input type interfaces are needed — the parameters are simple primitives (`string`, `string[]`). This matches the existing pattern where `auth.ts` uses inline parameters rather than defining interfaces for simple shapes.
- Error handling is delegated to `apiClient` — non-2xx responses throw an `Error` with the server's error message. The context layer (Task 3) will catch and handle these.

## 4. Contracts

### Input/Output per function

| Function | Parameters | HTTP Call | Response Type |
|----------|-----------|-----------|--------------|
| `fetchBoard` | `projectId: string` | `GET /api/projects/:projectId/board` | `ApiSuccessResponse<Board>` |
| `fetchBoardTasks` | `boardId: string` | `GET /api/boards/:boardId/tasks` | `ApiSuccessResponse<Task[]>` |
| `addColumn` | `boardId: string, name: string` | `POST /api/boards/:boardId/columns` | `ApiSuccessResponse<Column>` |
| `renameColumn` | `boardId: string, columnId: string, name: string` | `PUT /api/boards/:boardId/columns/:columnId` | `ApiSuccessResponse<Column>` |
| `deleteColumn` | `boardId: string, columnId: string` | `DELETE /api/boards/:boardId/columns/:columnId` | `ApiSuccessResponse<{ message: string }>` |
| `reorderColumns` | `boardId: string, columnIds: string[]` | `PUT /api/boards/:boardId/columns/reorder` | `ApiSuccessResponse<Board>` |

### Example: `fetchBoard` response shape

```json
{
  "data": {
    "_id": "board1",
    "project": "proj1",
    "columns": [
      { "_id": "col1", "name": "To Do", "position": 0 },
      { "_id": "col2", "name": "In Progress", "position": 1 },
      { "_id": "col3", "name": "In Review", "position": 2 },
      { "_id": "col4", "name": "Done", "position": 3 }
    ],
    "createdAt": "2025-01-15T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z"
  }
}
```

### Example: `fetchBoardTasks` response shape

```json
{
  "data": [
    {
      "_id": "task1",
      "title": "Implement login",
      "description": "## Requirements\n- Email field\n- Password field",
      "status": "To Do",
      "priority": "high",
      "position": 0,
      "dueDate": "2025-02-01T00:00:00.000Z",
      "labels": ["label1"],
      "board": "board1",
      "project": "proj1",
      "createdAt": "2025-01-15T00:00:00.000Z",
      "updatedAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

### Example: `addColumn` response shape

```json
{
  "data": {
    "_id": "col5",
    "name": "QA",
    "position": 4
  }
}
```

## 5. Test Plan

The task spec states verification should confirm the file exists, exports all 6 functions, calls the correct endpoints, unwraps the `{ data }` envelope, and types are properly imported. Since the existing API modules (`auth.ts`, `projects.ts`) do not have unit tests (they are thin wrappers over `apiClient`), and the task spec lists verification items rather than a test file, we follow the same pattern: **no unit test file is created for this task**. Verification is performed via the checks and commands below.

### 5.1 Verification Checks

| # | Check | Expected Result |
|---|-------|----------------|
| 1 | File exists at `packages/client/src/api/boards.ts` | File present |
| 2 | Exports `fetchBoard` function | Named export with correct signature |
| 3 | Exports `fetchBoardTasks` function | Named export with correct signature |
| 4 | Exports `addColumn` function | Named export with correct signature |
| 5 | Exports `renameColumn` function | Named export with correct signature |
| 6 | Exports `deleteColumn` function | Named export with correct signature |
| 7 | Exports `reorderColumns` function | Named export with correct signature |
| 8 | Each function calls `apiClient.get`, `.post`, `.put`, or `.del` with the correct path | Paths match the API endpoints from Section 4 |
| 9 | `addColumn` sends `{ name }` as the request body | Body matches server expectation |
| 10 | `renameColumn` sends `{ name }` as the request body | Body matches server expectation |
| 11 | `reorderColumns` sends `{ columnIds }` as the request body | Body matches server expectation |
| 12 | Types `Board`, `Column`, `Task`, `ApiSuccessResponse` are imported from `@taskboard/shared` | Type-only imports present |
| 13 | `apiClient` is imported from `./client` | Import present |
| 14 | TypeScript compilation passes | `npx tsc --noEmit` in `packages/client` exits with code 0 |
| 15 | Existing client tests still pass | `npm run test --workspace=@taskboard/client` exits with all tests passing |

## 6. Implementation Order

1. **Create** `packages/client/src/api/boards.ts` with all 6 functions as specified in Section 3.1
2. **Verify TypeScript compilation** — `npx tsc --noEmit` from `packages/client`
3. **Verify existing tests pass** — `npm run test --workspace=@taskboard/client`
4. **Verify exports** — confirm all 6 functions are exported by inspecting the file

## 7. Verification Commands

```bash
# 1. Verify the file exists
ls packages/client/src/api/boards.ts

# 2. Verify all 6 functions are exported
grep -E "^export async function" packages/client/src/api/boards.ts

# 3. Verify correct endpoint paths
grep -E "/api/(projects|boards)" packages/client/src/api/boards.ts

# 4. Verify types are imported from @taskboard/shared
grep "@taskboard/shared" packages/client/src/api/boards.ts

# 5. Verify apiClient import
grep "./client" packages/client/src/api/boards.ts

# 6. TypeScript compilation
cd packages/client && npx tsc --noEmit && cd ../..

# 7. Existing tests still pass
npm run test --workspace=@taskboard/client
```