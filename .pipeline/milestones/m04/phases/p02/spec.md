## Goal

Build interactive task cards that display key task information at a glance and implement full drag-and-drop support for moving tasks between columns (changing status) and reordering within columns (changing position), with optimistic UI updates and rollback on API failure. Also add a quick-add form for creating tasks inline at the bottom of each column.

## Deliverables

- API client functions for task CRUD (`POST /api/boards/:boardId/tasks`, `PUT /api/tasks/:id`, `DELETE /api/tasks/:id`) and task move (`PUT /api/tasks/:id/move`)
- `TaskCard` component displaying title, priority badge (color-coded), label color dots, and due date
- Full drag-and-drop integration using `@dnd-kit/core` and `@dnd-kit/sortable` for dragging tasks between columns (updates status) and reordering within a column (updates position)
- Optimistic UI updates: apply the move/reorder immediately on drop, fire the API call, and revert to the previous state if the API call fails
- `AddTaskForm` component rendered inline at the bottom of each column — a minimal form where typing a title and pressing Enter creates a task in that column

## Technical Decisions & Constraints

- The move API expects `{ "status": "Column Name", "position": number }` as the request body
- Optimistic update rollback requires snapshotting full board state before each drag operation; on failure, restore the snapshot and optionally re-fetch
- Must carefully configure `@dnd-kit` sensors and collision detection to handle both column reorder (from Phase 1) and task reorder/cross-column transfer without conflicts — consider separate drag contexts or distinct drag handle strategies
- Risk: if local state drifts from server during concurrent quick-adds while a move is pending, rollback may produce inconsistent view — snapshot approach mitigates this
- Risk: state management complexity — board view involves deeply nested, frequently mutating state (board → columns → tasks); consider keeping board state in a dedicated context or reducer, memoize components
- Priority badges should be color-coded (low/medium/high/urgent)
- No backend/API changes are in scope

## Dependencies

- Phase 1 (Board & Columns) must be complete: `BoardView`, `Column` components, board data fetching, and `@dnd-kit` setup for columns must be in place