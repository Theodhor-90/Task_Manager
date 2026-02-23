## Milestone 4: Frontend — Kanban Board

### Goal

Implement the core kanban board experience with drag-and-drop, task management, comments, and labels. This is the culminating milestone that delivers the primary user experience: a fully interactive kanban board with draggable task cards, column management, a task detail panel with markdown preview, comments, label management, and filtering.

### Phases

1. **Board & Columns** — Board view component that fetches board data and renders columns. Column headers with task count. Add column, rename column, delete column (with guard), and reorder columns via drag-and-drop.
2. **Task Cards & Drag-and-Drop** — Task card component displaying title, priority badge, label color dots, and due date. Drag-and-drop tasks between columns and within columns using @dnd-kit. Optimistic UI updates with rollback on API failure. Quick-add task form at the bottom of each column.
3. **Task Detail Panel** — Side panel that opens when clicking a task card. Edit title, markdown description (textarea with live preview), priority, due date. Delete task with confirmation. Close panel to return to board.
4. **Comments & Labels UI** — Comments section within task detail panel (list + add form). Label management: create labels with name and color, attach/detach labels from tasks. Filter bar above the board to filter tasks by label, priority, and due date.

### Exit Criteria

1. Board renders columns and tasks from the API
2. Drag-and-drop moves tasks between columns and reorders within columns
3. Column management (add, rename, delete, reorder) works correctly
4. Task detail panel opens, displays all fields, and saves edits
5. Comments can be added, edited, and deleted
6. Labels can be created, assigned to tasks, and used to filter the board
7. All interactions persist to the server via API calls