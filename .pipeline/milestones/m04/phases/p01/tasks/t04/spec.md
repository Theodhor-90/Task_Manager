## Objective

Create the `Column` component that renders a single kanban column with its header, task count, inline rename, delete functionality, and drag handle for reordering.

## Deliverables

- New file `packages/client/src/components/column.tsx`
- Column header with:
  - Column name displayed as an **inline-editable text field** (double-click to edit, Enter to save, Escape to cancel)
  - Task count badge next to the column name
  - Drag handle icon (grip/dots icon) for column reordering via `@dnd-kit`
  - Delete button (trash icon) that triggers `ConfirmDialog`; on confirm calls `removeColumn`; on API error displays `ErrorMessage`
- Scrollable container for children (task card stubs / future TaskCard components)
- Props: `column: Column`, `tasks: Task[]`, `onRename`, `onDelete`, plus `children` or render prop for task cards

## Files to Create

| File | Action |
|------|--------|
| `packages/client/src/components/column.tsx` | Created |

## Implementation Details

- Styled with Tailwind CSS: vertical card layout with rounded corners, subtle background (e.g., `bg-gray-100`), min-width for kanban column feel, vertical scrolling for tasks
- The drag handle should use `@dnd-kit/sortable`'s `useSortable` hook — the handle element gets the `listeners` and `attributes` while the whole column gets the `setNodeRef` and `transform`/`transition` styles
- Inline rename: on double-click, the column name text switches to an `<input>`, focused automatically; Enter saves (calls `onRename`), Escape cancels and restores original text
- Delete button triggers the existing `ConfirmDialog` component from the shared components; the confirmation message should warn about deleting the column
- Error from delete (e.g., column has tasks) should be displayed using the existing `ErrorMessage` component or a toast-style notification
- The component uses existing reusable UI components: `ConfirmDialog`, `ErrorMessage`

## Dependencies

- **Task 1** — `@dnd-kit/sortable` must be installed
- **Task 3** — `BoardContext` must exist (though the Column component receives data via props, not directly from context)
- Existing components: `ConfirmDialog`, `ErrorMessage` from `packages/client/src/components/`

## Verification

1. Column renders the column name and task count
2. Double-clicking the column name enters edit mode; Enter saves, Escape cancels
3. Drag handle is present and wired to `@dnd-kit/sortable` hooks
4. Delete button shows `ConfirmDialog`; confirming calls `onDelete`
5. Scrollable area renders children (task stubs)
6. Styling matches kanban column look with Tailwind classes