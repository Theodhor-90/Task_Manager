## Objective

Extend the existing `BoardContext` with `createTask` and `moveTask` methods plus a `setTasks` dispatcher, enabling task creation and optimistic drag-and-drop state management.

## Deliverables

- Add `createTask(columnName: string, title: string): Promise<Task>` to `BoardContextValue`:
  - Calls `api/tasks.createTask` with `boardId` and `{ title, status: columnName }`
  - On success, appends the returned task to the `tasks` state array
  - Returns the created task
- Add `moveTask(taskId: string, status: string, position: number): Promise<void>` to `BoardContextValue`:
  - Snapshots the current `tasks` array before modification
  - Optimistically updates the task's `status` and `position` in state and reindexes affected columns
  - Calls `api/tasks.moveTask`
  - On failure, restores the snapshot and sets `error` state
- Expose a `setTasks` dispatcher so `BoardView` can perform intermediate optimistic reordering during `onDragOver` events
- Unit tests for the new context methods (mock API calls, verify optimistic update and rollback behavior)

## Key Implementation Details

- The existing `BoardContext` (from Phase 1) already has `board`, `tasks`, `loadBoard`, and column management methods
- Optimistic rollback pattern: snapshot → apply → API call → restore on failure (same pattern as `reorderColumns`)
- Position calculation: the position value sent to the API is the target index in the destination column's sorted task list

## Files

| File | Action |
|------|--------|
| `packages/client/src/context/board-context.tsx` | **Modify** |
| `packages/client/src/context/__tests__/board-context.test.tsx` | **Modify** |

## Dependencies

- **t01** (API Client Functions for Tasks) — needs `createTask` and `moveTask` API functions

## Verification Criteria

1. `BoardContextValue` interface includes `createTask`, `moveTask`, and `setTasks`
2. `createTask` calls the API, appends the task to state, and returns it
3. `moveTask` optimistically updates state, calls the API, and rolls back on failure
4. `setTasks` is exposed and usable by `BoardView`
5. Unit tests pass covering: successful create, successful move, move rollback on API failure
6. TypeScript compiles without errors