# Milestone 4 — Frontend: Kanban Board

## Goal

Deliver the core kanban board experience — the primary UI of TaskBoard — where users view their project as a set of columns, manage columns (add, rename, delete, reorder), create and organize tasks via drag-and-drop, open a task detail panel to edit all fields with live markdown preview, add and manage comments, create and assign labels, and filter the board by label, priority, and due date. All interactions persist to the server through the existing REST API built in Milestone 2.

---

## Scope

### In Scope

- API client functions for boards, columns, tasks, comments, and labels
- Board view component that fetches and renders the project's board with columns and tasks
- Column management UI: add, rename, delete (with guard against non-empty columns), and reorder via drag-and-drop
- Task card component showing title, priority badge, label color dots, and due date
- Drag-and-drop for tasks between columns and within columns using `@dnd-kit/core` + `@dnd-kit/sortable`
- Optimistic UI updates with rollback on API failure
- Quick-add task form inline at the bottom of each column
- Task detail side panel with editable title, markdown description (textarea with live preview via `react-markdown`), priority selector, due date picker, and delete with confirmation
- Comments section within task detail panel: chronological list, add form, edit, and delete
- Label management: create labels with name and color picker, attach/detach labels from tasks via the detail panel
- Filter bar above the board to filter displayed tasks by label, priority, and due date
- Replace the current BoardPage placeholder with the fully functional board

### Out of Scope

- Multi-user collaboration, real-time sync, or WebSocket updates
- Offline support or service workers
- Keyboard shortcuts for board navigation
- Bulk task operations (multi-select, bulk move, bulk delete)
- Task search (full-text search across title/description)
- Board-level settings or templates
- Any backend/API changes — the API is complete from Milestone 2

---

## Phases

### Phase 1: Board & Columns

Build the foundational board view and column management UI.

- Add API client functions for fetching board data (`GET /api/projects/:projectId/board`) and column operations (add, rename, delete, reorder)
- Add API client functions for fetching tasks (`GET /api/boards/:boardId/tasks`)
- Create a `BoardView` component that fetches the board and its tasks, then renders columns
- Create a `Column` component with a header displaying the column name and task count
- Implement column management: add column via a button/form, rename column inline or via popover, delete column with a guard that prevents deletion when tasks exist in the column
- Implement column reorder via drag-and-drop using `@dnd-kit`
- Wire the `BoardPage` to render `BoardView` instead of the current placeholder

### Phase 2: Task Cards & Drag-and-Drop

Build interactive task cards with full drag-and-drop support.

- Add API client functions for task CRUD (`POST`, `PUT`, `DELETE`) and task move (`PUT /api/tasks/:id/move`)
- Create a `TaskCard` component displaying title, priority badge (color-coded), label color dots, and due date
- Integrate `@dnd-kit/core` and `@dnd-kit/sortable` for dragging tasks between columns (updates status) and reordering within a column (updates position)
- Implement optimistic UI updates: apply the move/reorder immediately on drop, fire the API call, and revert to the previous state if the API call fails
- Create an `AddTaskForm` component rendered inline at the bottom of each column — a minimal form where typing a title and pressing Enter creates a task in that column

### Phase 3: Task Detail Panel

Build the side panel for viewing and editing all task fields.

- Add API client function for fetching a single task (`GET /api/tasks/:id`)
- Create a `TaskDetailPanel` component that slides in from the right when a task card is clicked
- Editable title field (inline editing)
- Markdown description editing: a textarea for input with a live preview toggle/tab rendered via `react-markdown`
- `PrioritySelector` dropdown for setting low / medium / high / urgent
- `DueDatePicker` using a native date input for setting or clearing the due date
- Delete task button with a `ConfirmDialog` prompt
- Panel closes on an explicit close action (button or clicking outside), returning focus to the board
- All edits save to the API via `PUT /api/tasks/:id` and reflect immediately on the board

### Phase 4: Comments & Labels UI

Add comments, label management, and board filtering to complete the milestone.

- Add API client functions for comments (`GET`, `POST`, `PUT`, `DELETE`) and labels (`GET`, `POST`, `PUT`, `DELETE`)
- Create a `CommentList` component inside the task detail panel showing comments in chronological order with author and timestamp
- Create a `CommentForm` component (textarea + submit) for adding new comments
- Enable inline edit and delete on existing comments
- Create a `LabelPicker` component: displays project labels as colored chips, allows attaching/detaching labels from the current task
- Create a label management UI (accessible from the label picker or board header) for creating labels with a name and hex color, editing, and deleting labels
- Create a filter bar above the board with controls to filter tasks by label, priority, and due date range
- Filters apply client-side over the already-fetched task data (or re-fetch with query parameters) to show/hide task cards on the board

---

## Exit Criteria

1. Board view renders all columns and their tasks fetched from the API when navigating to `/projects/:id/board`
2. Columns can be added, renamed, deleted (blocked when tasks exist), and reordered via drag-and-drop — all changes persist to the server
3. Task cards display title, priority badge, label color dots, and due date
4. Tasks can be dragged between columns (changing status) and reordered within a column (changing position) — moves persist to the server
5. Optimistic updates apply immediately on drag-drop; the UI reverts if the API call fails
6. Quick-add form at the bottom of each column creates a new task in that column
7. Clicking a task card opens a detail side panel displaying all task fields
8. Task title, description, priority, and due date can be edited in the detail panel and changes persist to the server
9. Markdown description renders with live preview via `react-markdown`
10. Tasks can be deleted from the detail panel with a confirmation dialog
11. Comments can be added, edited, and deleted within the task detail panel
12. Labels can be created with a name and color, edited, deleted, and assigned to / removed from tasks
13. Filter bar filters the visible tasks on the board by label, priority, and due date
14. All interactions that modify data persist to the server through the existing REST API
15. No regressions in existing functionality — login, dashboard, and project CRUD continue to work

---

## Dependencies

1. **Milestone 1 (Foundation)** — Monorepo structure, database models, authentication, and dev environment must be complete
2. **Milestone 2 (Core API)** — All REST API endpoints for boards, columns, tasks, comments, and labels must be implemented and passing integration tests
3. **Milestone 3 (Frontend Shell & Projects)** — App shell, routing, auth context, API client base, sidebar, header, dashboard, project CRUD UI, and the placeholder `BoardPage` route must be in place
4. **npm packages** — `@dnd-kit/core`, `@dnd-kit/sortable`, and `react-markdown` must be installed in the client package (listed in the master plan tech stack)

---

## Risks

1. **Drag-and-drop complexity** — `@dnd-kit` supports both sortable lists and cross-container transfers, but combining column reorder with task reorder in the same view requires careful sensor configuration and collision detection to avoid conflicts. Mitigation: implement column drag-and-drop and task drag-and-drop as separate drag contexts or with distinct drag handle strategies.
2. **Optimistic update rollback** — Rolling back a failed move requires restoring the exact prior column and position state. If the local state drifts from the server (e.g., concurrent quick-adds during a pending move), the rollback may produce an inconsistent view. Mitigation: snapshot full board state before each drag operation; on failure, restore the snapshot and optionally re-fetch.
3. **State management complexity** — The board view involves deeply nested, frequently mutating state (board → columns → tasks, plus comments and labels). Prop drilling or naive context usage may cause excessive re-renders. Mitigation: keep board state in a dedicated context or reducer; memoize components; profile rendering if performance issues arise.
4. **Markdown preview performance** — Live preview of markdown on every keystroke could cause lag for long descriptions. Mitigation: debounce the preview rendering or use a toggle between edit and preview modes rather than side-by-side live preview.
5. **Filter interaction with drag-and-drop** — When filters hide some tasks, drag-and-drop position indices may not align with the full (unfiltered) task list, leading to incorrect position values sent to the API. Mitigation: calculate positions against the full task list, not the filtered view, or disable reordering while filters are active.