## Objective

Create the `BoardView` component that fetches and displays the project board, renders columns with task stubs, supports column reordering via drag-and-drop, and provides an "Add Column" UI.

## Deliverables

- New file `packages/client/src/components/board-view.tsx`
- Consumes `useBoard()` context to read `board`, `tasks`, `isLoading`, `error`
- Loading state: shows `LoadingSpinner` while board is loading
- Error state: shows `ErrorMessage` when an error occurs
- Renders columns in a **horizontal flex/scroll container**
- Groups tasks by `status` field (matching column `name`) and passes them to each `Column` component
- Wraps columns in `@dnd-kit` `DndContext` + `SortableContext` for column reordering:
  - Each column is a sortable item identified by `column._id`
  - On `onDragEnd`, computes the new column order and calls `reorderColumns` from context
- "Add Column" button at the end of the column row that shows a small inline form (text input + confirm button) and calls `addColumn` from context
- Task stubs inside each column render as simple `<div>` elements showing only the task title (placeholder for Phase 2's `TaskCard`)

## Files to Create

| File | Action |
|------|--------|
| `packages/client/src/components/board-view.tsx` | Created |

## Implementation Details

- Use `@dnd-kit/core`'s `DndContext` with `closestCenter` collision detection
- Use `@dnd-kit/sortable`'s `SortableContext` with `horizontalListSortingStrategy` (columns are horizontal)
- Each `Column` should be wrapped with sortable functionality — the `Column` component (Task 4) already integrates `useSortable`
- Task grouping: create a mapping from column name → tasks filtered by `task.status === column.name`, sorted by `task.position`
- The "Add Column" form should be a togglable inline input — click the button to show input, type name, press Enter or click to confirm, Escape to cancel
- Use existing shared components: `LoadingSpinner`, `ErrorMessage`
- Tailwind styling: horizontal overflow-x-auto container, gap between columns, padding

## Dependencies

- **Task 3** — `BoardContext` must be complete (this component consumes it)
- **Task 4** — `Column` component must be complete (rendered inside BoardView)
- Existing components: `LoadingSpinner`, `ErrorMessage`

## Verification

1. `BoardView` renders `LoadingSpinner` during loading and `ErrorMessage` on error
2. Columns render horizontally with correct names and task counts
3. Tasks appear as title-only stubs inside their respective columns (grouped by status)
4. Columns can be reordered by dragging the drag handle — new order persists to the server via `reorderColumns`
5. "Add Column" button shows inline form; submitting creates a new column that appears on the board
6. The board scrolls horizontally when there are many columns