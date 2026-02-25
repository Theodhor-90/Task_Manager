# Task 8: FilterBar Component

## Objective

Build a filter bar rendered above the board columns, with controls for filtering tasks by label, priority, and due date range.

## Deliverables

1. **New file: `packages/client/src/components/filter-bar.tsx`** — `FilterBar` component:
   - Renders a horizontal bar with the following controls:
     - **Label filter**: a multi-select dropdown showing project labels (from `useBoard().labels`) as colored chips. Selecting labels filters to tasks that have at least one of the selected labels.
     - **Priority filter**: a multi-select with checkboxes for `low`, `medium`, `high`, `urgent`. Filters to tasks matching any selected priority.
     - **Due date filter**: two date inputs (from / to) that filter to tasks whose `dueDate` falls within the range. Either bound can be left empty for open-ended ranges.
     - A "Clear filters" button that resets all filters.
   - Exposes filter state via an `onFilterChange` callback prop that emits the current filter values.
   - Renders a count badge or summary (e.g., "Showing 5 of 12 tasks") when filters are active.

## Implementation Details

- Filter state shape: `{ labels: string[]; priorities: Priority[]; dueDateFrom: string | null; dueDateTo: string | null }`.
- The component is a controlled or semi-controlled UI — it manages its own internal state and notifies the parent via `onFilterChange`.
- Use `Priority` type from `@taskboard/shared`.
- Labels from `useBoard().labels` are used to populate the label filter dropdown.

## Dependencies

- **Task 4 (Labels in BoardContext)** — `labels` must be available via `useBoard()` for the label filter dropdown.
- `Priority` type from `@taskboard/shared`.

## Verification

- FilterBar renders with label, priority, and due date filter controls.
- Each filter control can be set and cleared independently.
- "Clear filters" resets all filters.
- Count badge shows when filters are active.
- `onFilterChange` is called with current filter values when any filter changes.
- TypeScript compilation passes with no errors.