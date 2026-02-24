## Phase Goal

Implement CRUD endpoints for comments on tasks and labels scoped to projects, including the cleanup logic that removes a deleted label's ID from all tasks that reference it.

## Deliverables

- `GET /api/tasks/:taskId/comments` — list comments for a task, sorted by `createdAt` ascending
- `POST /api/tasks/:taskId/comments` — create a comment (body required, author set from JWT user)
- `PUT /api/comments/:id` — edit a comment body
- `DELETE /api/comments/:id` — delete a comment
- `GET /api/projects/:projectId/labels` — list labels for a project
- `POST /api/projects/:projectId/labels` — create a label (name and color required)
- `PUT /api/labels/:id` — update label name and/or color
- `DELETE /api/labels/:id` — delete a label and remove its ID from the `labels` array of all tasks that reference it
- Route registration in `app.ts`
- Integration tests in `packages/server/test/routes/` covering:
  - Comment CRUD with correct response shapes and author population
  - Comments sorted chronologically
  - 400 on missing body for comment creation
  - 404 on non-existent task or comment
  - Label CRUD with correct response shapes
  - 400 on missing name or color for label creation
  - Label delete removes references from all associated tasks
  - 404 on non-existent label

## Technical Decisions & Constraints

- Labels are attached/detached from tasks via `PUT /api/tasks/:id` (updating the `labels` array), which is already implemented in Phase 3. This phase implements only the label CRUD and the cleanup logic on label deletion
- Comment author is set automatically from the JWT user (not provided in the request body)
- Label `color` is a hex color string (e.g., `"#ef4444"`)
- Labels are scoped per-project (each label has a `project` reference)
- On label deletion, must use a bulk update operation to pull the label ID from all tasks' `labels` arrays
- Consistent response envelope (`{ data: T }` / `{ error: string }`) and standard HTTP status codes
- All routes require JWT bearer token via existing auth middleware

## Dependencies

- **Phase 1 (Projects API)**: needed to create projects for label scoping and test setup
- **Phase 3 (Tasks API)**: needed to create tasks for comment association and to verify label-task reference cleanup on label deletion
- All Milestone 1 infrastructure (models, auth, test helpers)