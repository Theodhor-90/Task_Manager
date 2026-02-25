It seems the write permission is being blocked. Could you please grant write permission for the `.pipeline/` directory? I have the complete plan ready to write to `.pipeline/milestones/m04/phases/p04/tasks/t09/plan.md`.

The plan covers:

**2 deliverables:**
1. `packages/client/src/components/board-view.tsx` (modified) — adds filter state, renders FilterBar, derives filtered tasks with `useMemo`, disables intra-column reordering via `SortableContext disabled={{ droppable: true }}` + handleDragEnd guard, shows visual indicator
2. `packages/client/src/components/__tests__/board-view.test.tsx` (modified) — 14 new tests covering filter integration, all filter types, AND logic, drag-and-drop guard, visual indicator, and column management unaffected

**Key design decisions:**
- Uses `disabled: { droppable: true }` (not `disabled: true`) on task SortableContext so tasks remain draggable for cross-column moves but can't be reordered within columns
- Belt-and-suspenders guard in `handleDragEnd` to skip same-column reorders when filters active
- Column task count badge shows unfiltered count
- Tasks without `dueDate` are excluded when any date filter is active
- Filter derivation is memoized with `useMemo`