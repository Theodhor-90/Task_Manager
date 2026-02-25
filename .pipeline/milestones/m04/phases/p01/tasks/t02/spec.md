## Objective

Create the API client module for board, column, and task-listing endpoints, following the established pattern from existing API modules (`auth.ts`, `projects.ts`).

## Deliverables

- New file `packages/client/src/api/boards.ts` exporting the following functions:
  - `fetchBoard(projectId: string): Promise<Board>` — calls `GET /api/projects/:projectId/board`, unwraps `{ data }` envelope
  - `fetchBoardTasks(boardId: string): Promise<Task[]>` — calls `GET /api/boards/:boardId/tasks`, unwraps `{ data }` envelope
  - `addColumn(boardId: string, name: string): Promise<Column>` — calls `POST /api/boards/:boardId/columns` with `{ name }`
  - `renameColumn(boardId: string, columnId: string, name: string): Promise<Column>` — calls `PUT /api/boards/:boardId/columns/:columnId` with `{ name }`
  - `deleteColumn(boardId: string, columnId: string): Promise<void>` — calls `DELETE /api/boards/:boardId/columns/:columnId`
  - `reorderColumns(boardId: string, columnIds: string[]): Promise<Board>` — calls `PUT /api/boards/:boardId/columns/reorder` with `{ columnIds }`

## Files to Create

| File | Action |
|------|--------|
| `packages/client/src/api/boards.ts` | Created |

## Implementation Details

- All functions must use the existing `apiClient` from `client.ts` which automatically injects the `Authorization: Bearer <token>` header
- Types (`Board`, `Column`, `Task`) should be imported from `@taskboard/shared`
- Follow the same pattern as `packages/client/src/api/projects.ts` and `packages/client/src/api/auth.ts` for error handling and response unwrapping
- The API response envelope format is `{ data: T }` for success, `{ error: string }` for failure

## Dependencies

- **Task 1** must be complete (dependencies installed), though this task does not directly use `@dnd-kit`
- Existing files: `packages/client/src/api/client.ts` (API client base), shared types from `@taskboard/shared`

## Verification

1. File `packages/client/src/api/boards.ts` exists and exports all 6 functions
2. Each function calls the correct HTTP method and endpoint path
3. Each function unwraps the `{ data }` response envelope
4. Types are properly imported from `@taskboard/shared`
5. The client compiles without TypeScript errors