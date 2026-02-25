## Goal

Complete the milestone by adding comments within the task detail panel, label management (create, edit, delete, assign/unassign), and a filter bar above the board to filter tasks by label, priority, and due date. This phase delivers the final interactive layer of the kanban board experience.

## Deliverables

- API client functions for comments (`GET /api/tasks/:taskId/comments`, `POST /api/tasks/:taskId/comments`, `PUT /api/comments/:id`, `DELETE /api/comments/:id`)
- API client functions for labels (`GET /api/projects/:projectId/labels`, `POST /api/projects/:projectId/labels`, `PUT /api/labels/:id`, `DELETE /api/labels/:id`)
- `CommentList` component inside the task detail panel showing comments in chronological order with author and timestamp
- `CommentForm` component (textarea + submit) for adding new comments
- Inline edit and delete on existing comments
- `LabelPicker` component: displays project labels as colored chips, allows attaching/detaching labels from the current task
- Label management UI (accessible from the label picker or board header) for creating labels with a name and hex color, editing, and deleting labels
- Filter bar above the board with controls to filter tasks by label, priority, and due date range
- Filters apply client-side over already-fetched task data (or re-fetch with query parameters) to show/hide task cards on the board

## Technical Decisions & Constraints

- Labels are scoped per-project (`project` field on Label model) — the label picker should fetch labels for the current project
- Deleting a label removes it from all tasks server-side — the UI should reflect this immediately
- Label attach/detach is done via `PUT /api/tasks/:id` updating the `labels` array on the task
- Risk: when filters hide some tasks, drag-and-drop position indices may not align with the full (unfiltered) task list, leading to incorrect position values sent to the API — mitigate by calculating positions against the full task list (not the filtered view) or disabling reordering while filters are active
- Comments display author name and timestamp — the author comes from the JWT user context
- The query filters API supports `?status=...&priority=...&label=labelId&sort=createdAt&order=desc`
- No backend/API changes are in scope

## Dependencies

- Phase 3 (Task Detail Panel) must be complete: the `TaskDetailPanel` must be in place as comments and label picker are rendered within it
- Phase 1 (Board & Columns) must be complete: the board view is needed for the filter bar
- Phase 2 (Task Cards & Drag-and-Drop) must be complete: task cards must already display label color dots (placeholder until real label data is wired)