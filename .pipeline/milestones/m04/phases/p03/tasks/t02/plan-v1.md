Now I have all the context I need. Let me produce the implementation plan.

# Task 2 Plan — `fetchTask` API Client Function

## 1. Deliverables

| # | File / Artifact | Action | Purpose |
|---|----------------|--------|---------|
| 1 | `packages/client/src/api/tasks.ts` | **Modify** | Add `fetchTask` function that calls `GET /api/tasks/:taskId` |

---

## 2. Dependencies

- **Sibling task**: Task 1 (Install `react-markdown`) — completed; no code overlap with this task.
- **Existing infrastructure**:
  - `packages/client/src/api/client.ts` — provides `apiClient.get<T>(path)` for authenticated GET requests
  - `@taskboard/shared` — provides `Task` and `ApiSuccessResponse<T>` types
- **Server endpoint**: `GET /api/tasks/:id` — implemented in Milestone 2, returns `{ data: Task }` with populated `labels` field

---

## 3. Implementation Details

### 3.1 `fetchTask` function in `packages/client/src/api/tasks.ts`

**Purpose**: Fetch a single task by ID from the server. This function will be consumed by the `TaskDetailPanel` component (Task 4) to load full task data when the panel opens.

**Signature**:
```typescript
export async function fetchTask(
  taskId: string,
): Promise<ApiSuccessResponse<Task>>
```

**Implementation**: Follow the exact same pattern as the existing `fetchBoard` function in `api/boards.ts`:

```typescript
export async function fetchTask(
  taskId: string,
): Promise<ApiSuccessResponse<Task>> {
  return apiClient.get<ApiSuccessResponse<Task>>(`/api/tasks/${taskId}`);
}
```

**Placement**: Add the function after the existing `import` statements and interface declarations, before or after any of the existing exported functions. The most logical position is at the top of the function exports (before `createTask`), since "fetch/read" operations conventionally come before "create/update/delete" operations — matching the CRUD ordering pattern seen in `api/boards.ts` (where `fetchBoard` and `fetchBoardTasks` precede `addColumn`, `renameColumn`, etc.).

**What NOT to do**:
- Do **not** modify existing imports — `Task` and `ApiSuccessResponse` are already imported from `@taskboard/shared`, and `apiClient` is already imported from `./client`.
- Do **not** add any new types or interfaces — the existing `Task` type is sufficient.
- Do **not** add error handling beyond what `apiClient.get` already provides (the `request()` function in `client.ts` handles 401 redirects and non-ok responses).
- Do **not** add query parameters or request body — `GET /api/tasks/:id` takes no additional parameters.

---

## 4. Contracts

### Input
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | `string` | Yes | The MongoDB ObjectId string of the task to fetch |

### Output
```typescript
Promise<ApiSuccessResponse<Task>>
// Resolves to:
{
  data: {
    _id: string;
    title: string;
    description?: string;
    status: string;
    priority: "low" | "medium" | "high" | "urgent";
    position: number;
    dueDate?: string;
    labels: string[];       // populated label IDs (full objects from server, but typed as string[] in shared types)
    board: string;
    project: string;
    createdAt: string;
    updatedAt: string;
  }
}
```

### Error Cases
- **401 Unauthorized**: Handled by `apiClient` — clears token, redirects to `/login`
- **404 Not Found**: `apiClient` throws `Error` with server message (e.g., "Task not found")
- **Network error**: `fetch` throws, propagated to caller

### Usage Example (by Task 4's `TaskDetailPanel`)
```typescript
import { fetchTask } from "../api/tasks";

const response = await fetchTask(taskId);
const task = response.data;
```

---

## 5. Test Plan

No dedicated test file is required for this task. The function is a single-line delegation to `apiClient.get` with no branching logic. The existing API client functions (`createTask`, `updateTask`, `deleteTask`, `moveTask`) in `tasks.ts` do not have dedicated unit tests either — they are tested implicitly through integration tests and context/component tests that mock the API module.

**Verification is operational**:

| # | Verification | Method | Expected Result |
|---|-------------|--------|-----------------|
| 1 | Function exists and is exported | `grep "export async function fetchTask" packages/client/src/api/tasks.ts` | Match found |
| 2 | Correct HTTP method and path | Code review | Uses `apiClient.get` with path `/api/tasks/${taskId}` |
| 3 | Return type matches contract | TypeScript compilation | `npm run build -w packages/client` exits with code 0 |
| 4 | No regressions | Run existing tests | `npm run test -w packages/client` — all 231 tests pass |
| 5 | Import works from consumer code | Will be validated in Task 4 when `TaskDetailPanel` imports `fetchTask` | N/A for this task |

---

## 6. Implementation Order

1. **Step 1**: Open `packages/client/src/api/tasks.ts`
2. **Step 2**: Add the `fetchTask` function after the interface declarations and before the existing `createTask` function (approximately at line 25)
3. **Step 3**: Verify TypeScript compiles: `npm run build -w packages/client`
4. **Step 4**: Verify existing tests pass: `npm run test -w packages/client`

---

## 7. Verification Commands

```bash
# 1. Verify the function is exported
grep "export async function fetchTask" packages/client/src/api/tasks.ts

# 2. Verify TypeScript compiles
npm run build -w packages/client

# 3. Verify existing tests still pass
npm run test -w packages/client
```

All three commands should succeed (grep finds a match, build and test exit with code 0).