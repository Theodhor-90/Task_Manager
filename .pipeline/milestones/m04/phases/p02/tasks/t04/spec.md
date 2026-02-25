## Objective

Refactor `BoardView` to support both column reorder and task drag-and-drop in a unified `DndContext`, replacing placeholder task divs with `TaskCard` components in sortable containers, and adding a `DragOverlay` for visual feedback.

## Deliverables

- Refactor `BoardView` to use a **unified `DndContext`** that handles both column and task dragging:
  - Add `data: { type: "column" }` to column sortable items
  - Add a `SortableContext` per column (vertical list strategy) wrapping task cards
  - Each task card wrapped in a sortable wrapper with `data: { type: "task", task }`
  - `onDragStart`: snapshot `tasks` state; track active drag type (column vs. task)
  - `onDragOver`: if dragging a task over a different column, optimistically move the task in local state (via `setTasks`) to provide smooth animation
  - `onDragEnd`: if column drag → existing column reorder logic; if task drag → call `moveTask` from context with computed status and position
- Replace the current placeholder task `<div>` elements with `TaskCard` components wrapped in sortable containers
- Render `AddTaskForm` (from t05) at the bottom of each column, below the sortable task list
- Add a `DragOverlay` from @dnd-kit showing a floating task card while dragging
- Modify `Column` component as needed to accept sortable task children and the `AddTaskForm`

## Key Implementation Details

- The unified `DndContext` approach (replacing the separate column-only context from Phase 1) uses `active.data.current.type` to discriminate between column and task drags in all handlers
- Cross-column task transfer: use `onDragOver` to detect when a task hovers over a different column's droppable area, temporarily move the task in local state for smooth animation
- Position calculation: the `position` value sent to the API is the target index in the destination column's sorted task list
- Sensors and collision detection must work correctly for both column and task drag operations

## Files

| File | Action |
|------|--------|
| `packages/client/src/components/board-view.tsx` | **Modify** |
| `packages/client/src/components/column.tsx` | **Modify** |
| `packages/client/src/components/__tests__/board-view.test.tsx` | **Modify** |

## Dependencies

- **t02** (Board Context extensions) — needs `moveTask` and `setTasks` from context
- **t03** (TaskCard component) — needs `TaskCard` for rendering
- **t05** (AddTaskForm) — renders `AddTaskForm` at column bottom (can stub initially if t05 isn't complete)

## Verification Criteria

1. Task cards render inside columns using `TaskCard` component (not placeholder divs)
2. Dragging a task to a different column updates its `status` and calls the move API
3. Dragging a task within the same column reorders it and calls the move API with new `position`
4. Column drag-and-drop continues to work correctly (no regressions from Phase 1)
5. `DragOverlay` shows a floating card while a task is being dragged
6. `onDragOver` provides smooth visual feedback when hovering across columns
7. `onDragStart` snapshots task state; failed API calls trigger rollback
8. `AddTaskForm` renders at the bottom of each column
9. Updated tests pass