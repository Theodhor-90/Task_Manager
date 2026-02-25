Perfect! All 23 tests pass. Let me create a summary of what was implemented:

## Implementation Summary

I have successfully implemented Task 2 according to the locked plan. Here's what was done:

### 1. Modified `packages/client/src/context/board-context.tsx`

**Added imports:**
- `Dispatch` and `SetStateAction` types from React
- `apiCreateTask` and `apiMoveTask` from `../api/tasks`

**Extended `BoardContextValue` interface with three new methods:**
- `createTask(columnName: string, title: string): Promise<Task>` - Creates a task in a specific column
- `moveTask(taskId: string, status: string, position: number): Promise<void>` - Moves a task with optimistic updates and rollback
- `setTasks: Dispatch<SetStateAction<Task[]>>` - Exposes the tasks state setter for drag handlers

**Implemented `createTask` callback:**
- Guards on board being loaded
- Calls API with board ID and task data (`{ title, status: columnName }`)
- Appends returned task to local state on success
- Returns the created task

**Implemented `moveTask` callback:**
- Guards on board being loaded
- Snapshots current tasks array for rollback
- Applies optimistic update immediately:
  - Removes task from current position
  - Reindexes source column to fill gap
  - Shifts destination column tasks to make room
  - Inserts task with new status and clamped position
- Calls API with `moveTask(taskId, { status, position })`
- On failure: restores snapshot and sets error state

**Exposed `setTasks` in context value** for BoardView to use during drag operations

### 2. Modified `packages/client/src/context/__tests__/board-context.test.tsx`

**Added test setup:**
- Mock for `../../api/tasks` module
- Typed mock references for `apiCreateTask` and `apiMoveTask`
- Added `multiTasks` test data array with 3 tasks across columns
- Updated `TestConsumer` to display task statuses for assertions

**Added 9 new test cases:**
1. ✅ `createTask` calls API and appends task to state
2. ✅ `createTask` throws when board not loaded
3. ✅ `createTask` does not modify state on API failure
4. ✅ `moveTask` optimistically updates task status and position (cross-column)
5. ✅ `moveTask` reverts on API failure and sets error
6. ✅ `moveTask` throws when board not loaded
7. ✅ `moveTask` handles same-column reorder
8. ✅ `setTasks` is exposed and can update tasks directly

### Verification Results

✅ **TypeScript compilation:** No errors  
✅ **All tests pass:** 23/23 tests in board-context.test.tsx  
✅ **Full test suite:** 195 tests passing across 16 test files  
✅ **All methods exposed:** `createTask`, `moveTask`, and `setTasks` verified in interface

The implementation follows the locked plan exactly, including the optimistic update pattern with snapshot rollback that matches the existing `reorderColumns` implementation.