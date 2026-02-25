# Task 9: Filter Integration and Drag-and-Drop Guard

## Objective

Wire the `FilterBar` into `BoardView`, apply filters to the rendered task list, and disable intra-column reordering when filters are active to prevent position index mismatches.

## Deliverables

1. **Modified file: `packages/client/src/components/board-view.tsx`**:
   - Add filter state: `{ labels: string[]; priorities: Priority[]; dueDateFrom: string | null; dueDateTo: string | null }`.
   - Render `FilterBar` above the column container.
   - Derive a `filteredTasks` list by applying active filters to the full `tasks` array from `BoardContext`:
     - Label filter: task must have at least one of the selected label IDs (OR logic within label filter).
     - Priority filter: task's priority must match one of the selected priorities (OR logic).
     - Due date filter: task's `dueDate` must fall within the from/to range (inclusive); open-ended if either bound is null.
     - Filters combine with AND logic across filter types.
   - Each column renders only tasks that pass all active filters.
   - **Drag-and-drop guard** when any filter is active:
     - Disable `SortableContext` for tasks within columns (disable intra-column reorder) by setting the `disabled` prop on sortable items or removing drag listeners from `SortableTaskItem`.
     - Cross-column task drags (changing status) remain allowed — the move uses the task's current position and lets the server reindex.
     - Display a subtle visual indicator (e.g., a small note or dimmed drag handles) so the user understands reordering is disabled while filtering.
   - When all filters are cleared, full drag-and-drop functionality is restored.
   - "Add Column" UI and column reordering remain unaffected by task filters.

## Implementation Details

- A `useFilteredTasks` hook or inline state in `BoardView` can manage the filter logic (per design decision #7 — filter state is a UI concern, not stored in BoardContext).
- The filter derivation should be memoized (e.g., `useMemo`) to avoid recalculating on every render.
- To check if any filter is active: `labels.length > 0 || priorities.length > 0 || dueDateFrom !== null || dueDateTo !== null`.

## Dependencies

- **Task 8 (FilterBar Component)** — the `FilterBar` component must be available.
- **Task 4 (Labels in BoardContext)** — labels must be in context for filter matching.
- Existing `BoardView` at `packages/client/src/components/board-view.tsx` with `@dnd-kit` drag-and-drop setup.
- Existing `BoardContext` providing `tasks`.

## Verification

- FilterBar appears above the board columns.
- Applying a label filter hides tasks without matching labels.
- Applying a priority filter hides tasks without matching priorities.
- Applying a due date filter hides tasks outside the date range.
- Combining filters works with AND logic across types.
- Clearing all filters restores the full board.
- Intra-column task reordering is disabled when any filter is active.
- Cross-column moves still work when filters are active.
- A visual cue indicates reordering is disabled.
- Column management (add, rename, delete, reorder) is unaffected by filters.
- TypeScript compilation passes with no errors.