## Objective

Create a dedicated React context for board state management following the established `ProjectsContext` pattern. This context will be the single source of truth for board data throughout Phases 1–4.

## Deliverables

- New file `packages/client/src/context/board-context.tsx` exporting `BoardProvider` and `useBoard` hook
- **State shape**: `board: Board | null`, `tasks: Task[]`, `isLoading: boolean`, `error: string | null`
- **Methods**:
  - `loadBoard(projectId: string)` — fetches board via API, then fetches tasks for that board; sets all state
  - `addColumn(name: string)` — calls API `addColumn`, appends new column to `board.columns` in state
  - `renameColumn(columnId: string, name: string)` — calls API `renameColumn`, updates column name in state
  - `removeColumn(columnId: string)` — calls API `deleteColumn`, removes column from state; re-throws on error so the UI can display it
  - `reorderColumns(columnIds: string[])` — applies optimistic update (reorders columns in state immediately), calls API `reorderColumns`; reverts state on API failure
- `BoardProvider` wraps the board page subtree; reads `projectId` from route params or accepts it as a prop
- Unit tests in `packages/client/src/context/__tests__/board-context.test.tsx`

## Files to Create

| File | Action |
|------|--------|
| `packages/client/src/context/board-context.tsx` | Created |
| `packages/client/src/context/__tests__/board-context.test.tsx` | Created |

## Implementation Details

- Follow the pattern established by `packages/client/src/context/projects-context.tsx`
- Use `useReducer` or `useState` for state management
- Import API functions from `packages/client/src/api/boards.ts` (Task 2)
- For `reorderColumns`, snapshot the current column order before the optimistic update; if the API call fails, restore the snapshot and set an error
- The `removeColumn` method should re-throw errors so the calling component can display the server's error message (e.g., "Cannot delete column that contains tasks")

## Dependencies

- **Task 2** must be complete — the API client functions are imported by this context

## Verification

1. `BoardProvider` and `useBoard` are exported from `board-context.tsx`
2. `useBoard()` provides `board`, `tasks`, `isLoading`, `error` state and all mutation methods
3. `loadBoard` fetches board and tasks from the API and populates state
4. `addColumn`, `renameColumn`, `removeColumn` call the correct API functions and update state
5. `reorderColumns` applies optimistic update and reverts on failure
6. Unit tests pass, covering state transitions for each method