# Task 3: Extend Board Context with `updateTask` and `removeTask`

## Objective
Add `updateTask` and `removeTask` methods to the Board Context so that the task detail panel can persist edits and deletions through the API while keeping the board's local state in sync.

## Deliverables
- `updateTask(taskId: string, updates: UpdateTaskInput): Promise<Task>` added to `BoardContextValue`:
  - Calls `api/tasks.updateTask(taskId, updates)` (existing API function)
  - On success, patches the matching task in the `tasks` state array with the returned updated task
  - Returns the updated task
- `removeTask(taskId: string): Promise<void>` added to `BoardContextValue`:
  - Calls `api/tasks.deleteTask(taskId)` (existing API function)
  - On success, removes the task from the `tasks` state array
- Updated unit tests in `packages/client/src/context/__tests__/board-context.test.tsx` covering both new methods

## Files to Modify
| File | Action |
|------|--------|
| `packages/client/src/context/board-context.tsx` | Modify — add `updateTask` and `removeTask` methods to context value |
| `packages/client/src/context/__tests__/board-context.test.tsx` | Modify — add tests for new methods |

## Implementation Details
- `updateTask` should call the existing `api/tasks.updateTask` function, then update the tasks array in state by replacing the task with the matching `_id`
- `removeTask` should call the existing `api/tasks.deleteTask` function, then filter out the task with the matching `_id` from the tasks array
- Both methods should be memoized (wrapped in `useCallback`) to maintain stable references
- Follow the same patterns used by existing context methods like `createTask` and `moveTask`
- Tests should mock API calls and verify that state updates correctly (task is patched/removed in the tasks array)

## Dependencies
- None within this phase (depends on existing `BoardContext` and API functions from Phase 2)

## Verification
1. `updateTask` and `removeTask` are available from `useBoardContext()` hook
2. Calling `updateTask(id, { title: 'New Title' })` makes the API call and updates the task in local state
3. Calling `removeTask(id)` makes the API call and removes the task from local state
4. Unit tests pass: `npm run test -w packages/client`
5. TypeScript compiles without errors