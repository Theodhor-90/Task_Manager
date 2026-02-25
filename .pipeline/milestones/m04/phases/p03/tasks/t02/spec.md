# Task 2: `fetchTask` API Client Function

## Objective
Add a `fetchTask` function to the client-side API layer that fetches a single task by ID from the server, enabling the task detail panel to load full task data.

## Deliverables
- A `fetchTask` function in `packages/client/src/api/tasks.ts`
- Signature: `fetchTask(taskId: string): Promise<ApiSuccessResponse<Task>>`
- Calls `GET /api/tasks/:taskId` using the existing `apiClient` from `api/client.ts`
- Type imports from `@taskboard/shared`

## Files to Modify
| File | Action |
|------|--------|
| `packages/client/src/api/tasks.ts` | Modify — add `fetchTask` function |

## Implementation Details
- Follow the same pattern as existing API client functions in `api/tasks.ts` (e.g., `createTask`, `updateTask`, `deleteTask`, `moveTask`)
- Use the shared `apiClient` instance which handles auth headers and base URL
- The `GET /api/tasks/:id` endpoint returns the task with populated labels (full label objects with name and color, not just IDs)
- Use the existing `Task` type and `ApiSuccessResponse` wrapper type

## Dependencies
- None within this phase (existing API client infrastructure from Phase 2 is prerequisite)

## Verification
1. `fetchTask` is exported from `packages/client/src/api/tasks.ts`
2. Calling `fetchTask(someTaskId)` makes a GET request to `/api/tasks/:taskId`
3. The function returns the response data matching `ApiSuccessResponse<Task>`
4. TypeScript compiles without errors