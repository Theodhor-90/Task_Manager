It seems I don't have write permission to that path. Could you grant permission so I can save the plan to `.pipeline/milestones/m04/phases/p01/tasks/t05/plan.md`? 

Alternatively, the full implementation plan is already complete in my response above. Here's a summary of what it covers:

**Deliverables**: 2 files — `board-view.tsx` (component) and `board-view.test.tsx` (19 unit tests)

**Key design**:
- `BoardView` is a prop-less component that reads everything from `useBoard()` context
- Uses `DndContext` + `SortableContext` with `horizontalListSortingStrategy` for column drag-and-drop
- `PointerSensor` with `distance: 8` activation constraint + `KeyboardSensor` for accessibility
- `handleDragEnd` uses `arrayMove` to compute new column order, then calls `reorderColumns`
- Task grouping: filters `tasks` by `task.status === column.name`, sorts by `position`
- "Add Column" UI: togglable inline form with Enter/Escape keyboard support
- Loading → `LoadingSpinner`, Error → `ErrorMessage`, Null board → `null`

**19 tests** covering: loading/error/null states, column rendering, task counts, task grouping, position sorting, add column form (Enter, click Add, Escape, Cancel, empty input, close on success), DndContext/SortableContext presence, and drag-end reorder logic (success, same item, null over).