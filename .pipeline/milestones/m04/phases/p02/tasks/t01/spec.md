## Objective

Create the API client module for task CRUD and move operations, establishing the data layer that all subsequent tasks in this phase depend on.

## Deliverables

- New file `packages/client/src/api/tasks.ts` with four exported functions:
  - `createTask(boardId: string, input: { title: string; status?: string; priority?: Priority; description?: string; dueDate?: string; labels?: string[] }): Promise<ApiSuccessResponse<Task>>`
  - `updateTask(taskId: string, input: { title?: string; description?: string; priority?: Priority; dueDate?: string | null; labels?: string[] }): Promise<ApiSuccessResponse<Task>>`
  - `deleteTask(taskId: string): Promise<ApiSuccessResponse<{ message: string }>>`
  - `moveTask(taskId: string, body: { status?: string; position: number }): Promise<ApiSuccessResponse<Task>>`

## Key Implementation Details

- Each function uses the existing `apiClient` from `api/client.ts` (already set up with JWT auth headers)
- API endpoints:
  - `POST /api/boards/:boardId/tasks` for create
  - `PUT /api/tasks/:taskId` for update
  - `DELETE /api/tasks/:taskId` for delete
  - `PUT /api/tasks/:taskId/move` for move
- Type imports (`Task`, `Priority`, `ApiSuccessResponse`) come from `@taskboard/shared`
- Follow the same patterns used in `api/boards.ts` for board/column operations (established in Phase 1)

## Files

| File | Action |
|------|--------|
| `packages/client/src/api/tasks.ts` | **Create** |

## Dependencies

- None (first task in this phase). Depends on Phase 1 being complete (specifically `api/client.ts` and shared types).

## Verification Criteria

1. File exports all four functions with correct TypeScript signatures
2. Each function calls the correct HTTP method and endpoint via `apiClient`
3. Request bodies match the API contracts defined in the master plan (Section 5.5)
4. TypeScript compiles without errors (`npm run build -w packages/client`)
5. Functions are importable from other client modules