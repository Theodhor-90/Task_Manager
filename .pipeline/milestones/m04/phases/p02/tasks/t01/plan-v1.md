Now I have all the information I need. Here is the implementation plan:

# Task 1 Implementation Plan — API Client Functions for Tasks

## 1. Deliverables

| File | Action | Purpose |
|------|--------|---------|
| `packages/client/src/api/tasks.ts` | **Create** | API client module for task CRUD and move operations |

---

## 2. Dependencies

- **Phase 1 complete** — specifically `packages/client/src/api/client.ts` exists and exports `apiClient` with `get`, `post`, `put`, and `del` methods
- **Shared types** — `Task`, `Priority`, and `ApiSuccessResponse` are exported from `@taskboard/shared` (verified in `packages/shared/src/types/index.ts`)
- **Server API** — Task endpoints are implemented per Milestone 2 (not needed for this file to compile, but needed for runtime)

No npm packages to install. No other tasks in this phase are prerequisites.

---

## 3. Implementation Details

### File: `packages/client/src/api/tasks.ts`

**Purpose**: Provide typed API client functions for all task-related HTTP operations. This is the data layer that subsequent phase tasks (board context, drag-and-drop, add-task form) will depend on.

**Exports**: Four named functions — `createTask`, `updateTask`, `deleteTask`, `moveTask`.

**Pattern to follow**: Exactly matches the structure in `packages/client/src/api/boards.ts`:
- Import types from `@taskboard/shared`
- Import `apiClient` from `./client`
- Each function is a standalone `async function` with explicit return type
- Functions delegate to `apiClient.get/post/put/del` with a generic type parameter
- Request body objects are passed directly (apiClient handles JSON serialization)

#### 3.1 `createTask`

```typescript
export async function createTask(
  boardId: string,
  input: CreateTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.post<ApiSuccessResponse<Task>>(
    `/api/boards/${boardId}/tasks`,
    input,
  );
}
```

- **Endpoint**: `POST /api/boards/:boardId/tasks`
- **Input interface** (defined locally in the file):
  ```typescript
  export interface CreateTaskInput {
    title: string;
    status?: string;
    priority?: Priority;
    description?: string;
    dueDate?: string;
    labels?: string[];
  }
  ```
- **Returns**: `ApiSuccessResponse<Task>` — the created task wrapped in `{ data: Task }`

#### 3.2 `updateTask`

```typescript
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.put<ApiSuccessResponse<Task>>(
    `/api/tasks/${taskId}`,
    input,
  );
}
```

- **Endpoint**: `PUT /api/tasks/:taskId`
- **Input interface** (defined locally):
  ```typescript
  export interface UpdateTaskInput {
    title?: string;
    description?: string;
    priority?: Priority;
    dueDate?: string | null;
    labels?: string[];
  }
  ```
- **Note**: `dueDate` accepts `null` to clear the due date (distinct from `undefined` which omits the field)
- **Returns**: `ApiSuccessResponse<Task>` — the updated task

#### 3.3 `deleteTask`

```typescript
export async function deleteTask(
  taskId: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(
    `/api/tasks/${taskId}`,
  );
}
```

- **Endpoint**: `DELETE /api/tasks/:taskId`
- **No request body** — uses `apiClient.del` which takes no body parameter
- **Returns**: `ApiSuccessResponse<{ message: string }>` — matches the pattern in `deleteColumn` from `boards.ts`

#### 3.4 `moveTask`

```typescript
export async function moveTask(
  taskId: string,
  body: MoveTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.put<ApiSuccessResponse<Task>>(
    `/api/tasks/${taskId}/move`,
    body,
  );
}
```

- **Endpoint**: `PUT /api/tasks/:taskId/move`
- **Input interface** (defined locally):
  ```typescript
  export interface MoveTaskInput {
    status?: string;
    position: number;
  }
  ```
- **Returns**: `ApiSuccessResponse<Task>` — the moved task with updated status and position

---

## 4. Contracts

### Input/Output Shapes

#### `createTask(boardId, input)` → `{ data: Task }`

**Request example**:
```json
POST /api/boards/507f1f77bcf86cd799439011/tasks
{
  "title": "Implement login page",
  "status": "To Do",
  "priority": "high"
}
```

**Response example**:
```json
{
  "data": {
    "_id": "507f1f77bcf86cd799439022",
    "title": "Implement login page",
    "status": "To Do",
    "priority": "high",
    "position": 0,
    "labels": [],
    "board": "507f1f77bcf86cd799439011",
    "project": "507f1f77bcf86cd799439000",
    "createdAt": "2026-02-25T10:00:00.000Z",
    "updatedAt": "2026-02-25T10:00:00.000Z"
  }
}
```

#### `updateTask(taskId, input)` → `{ data: Task }`

**Request example**:
```json
PUT /api/tasks/507f1f77bcf86cd799439022
{
  "title": "Implement login page v2",
  "priority": "urgent",
  "dueDate": "2026-03-01T00:00:00.000Z"
}
```

#### `deleteTask(taskId)` → `{ data: { message: string } }`

**Request example**:
```
DELETE /api/tasks/507f1f77bcf86cd799439022
```

**Response example**:
```json
{
  "data": {
    "message": "Task deleted"
  }
}
```

#### `moveTask(taskId, body)` → `{ data: Task }`

**Request example**:
```json
PUT /api/tasks/507f1f77bcf86cd799439022/move
{
  "status": "In Progress",
  "position": 2
}
```

---

## 5. Test Plan

No unit test file is required for this task. The task spec's verification criteria focus on:
1. Correct TypeScript signatures (verified by compilation)
2. Correct HTTP method and endpoint per function (verified by inspection and by integration when used in Task 2+)
3. Correct request body shapes (verified by TypeScript types and compilation)

This matches the pattern in the existing codebase — `packages/client/src/api/boards.ts` has no dedicated unit test file either. The API functions are tested indirectly through the board-context tests that mock them.

If a standalone test were desired, it would mock `apiClient` and verify each function calls the right method/path/body. However, the task spec does not call for a test file, and the existing codebase pattern omits them for API client modules.

---

## 6. Implementation Order

This task has a single deliverable, implemented in one step:

1. **Create `packages/client/src/api/tasks.ts`**
   - Add imports: `Task`, `Priority`, `ApiSuccessResponse` from `@taskboard/shared`; `apiClient` from `./client`
   - Define and export `CreateTaskInput`, `UpdateTaskInput`, and `MoveTaskInput` interfaces
   - Implement and export `createTask`, `updateTask`, `deleteTask`, and `moveTask` functions
   - Ensure all functions follow the exact same structure as those in `boards.ts`

---

## 7. Verification Commands

```bash
# 1. TypeScript compilation — must succeed with no errors
npm run build -w packages/client

# 2. Verify the file exports all four functions (quick grep check)
grep -n "export async function" packages/client/src/api/tasks.ts

# Expected output (4 lines):
#   createTask
#   updateTask
#   deleteTask
#   moveTask

# 3. Run existing client tests to verify no regressions
npm run test -w packages/client

# 4. Verify the file is importable by checking TypeScript resolves it
npx tsc --noEmit -p packages/client/tsconfig.json
```

---

## Complete File Content

The final `packages/client/src/api/tasks.ts` should contain exactly:

```typescript
import type { ApiSuccessResponse, Priority, Task } from "@taskboard/shared";
import { apiClient } from "./client";

export interface CreateTaskInput {
  title: string;
  status?: string;
  priority?: Priority;
  description?: string;
  dueDate?: string;
  labels?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string | null;
  labels?: string[];
}

export interface MoveTaskInput {
  status?: string;
  position: number;
}

export async function createTask(
  boardId: string,
  input: CreateTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.post<ApiSuccessResponse<Task>>(
    `/api/boards/${boardId}/tasks`,
    input,
  );
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.put<ApiSuccessResponse<Task>>(
    `/api/tasks/${taskId}`,
    input,
  );
}

export async function deleteTask(
  taskId: string,
): Promise<ApiSuccessResponse<{ message: string }>> {
  return apiClient.del<ApiSuccessResponse<{ message: string }>>(
    `/api/tasks/${taskId}`,
  );
}

export async function moveTask(
  taskId: string,
  body: MoveTaskInput,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.put<ApiSuccessResponse<Task>>(
    `/api/tasks/${taskId}/move`,
    body,
  );
}
```