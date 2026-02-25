## Goal

Build a side panel that opens when clicking a task card, allowing users to view and edit all task fields including title, markdown description with live preview, priority, due date, and to delete tasks with confirmation. All edits must persist to the server and reflect immediately on the board.

## Deliverables

- API client function for fetching a single task (`GET /api/tasks/:id`) with populated labels
- `TaskDetailPanel` component that slides in from the right when a task card is clicked
- Editable title field with inline editing
- Markdown description editing: a textarea for input with a live preview toggle/tab rendered via `react-markdown`
- `PrioritySelector` dropdown for setting low / medium / high / urgent
- `DueDatePicker` using a native date input for setting or clearing the due date
- Delete task button with a `ConfirmDialog` prompt
- Panel close behavior: closes on an explicit close action (button or clicking outside), returning focus to the board
- All edits save to the API via `PUT /api/tasks/:id` and reflect immediately on the board

## Technical Decisions & Constraints

- Use `react-markdown` for rendering markdown preview (already specified in master plan tech stack; must be installed in the client package)
- Risk: live preview of markdown on every keystroke could cause lag for long descriptions — mitigate by debouncing the preview rendering or using a toggle between edit and preview modes rather than side-by-side live preview
- The detail panel should use the existing `ConfirmDialog` component (listed as a shared component in the master plan) for delete confirmation
- Task updates via `PUT /api/tasks/:id` should update the board state so changes are visible without re-fetching the entire board
- No backend/API changes are in scope

## Dependencies

- Phase 2 (Task Cards & Drag-and-Drop) must be complete: `TaskCard` components must be rendered on the board and clickable to trigger the detail panel
- `react-markdown` must be installed in the client package