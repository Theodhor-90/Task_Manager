## Phase Goal

Implement full CRUD for tasks including all fields (title, markdown description, priority, status, position, dueDate, labels), a dedicated move endpoint for changing task column and/or reordering within a column with position reindexing, and query filtering/sorting capabilities.

## Deliverables

- `GET /api/boards/:boardId/tasks` — list tasks for a board; support query parameters: `status`, `priority`, `label` (filter by label ID), `sort` (field name: `createdAt` or `dueDate`), `order` (`asc` or `desc`, default `asc`)
- `POST /api/boards/:boardId/tasks` — create a task (title required; status defaults to first column name; priority defaults to `"medium"`; position set to end of target column)
- `GET /api/tasks/:id` — get a task by ID with populated label references
- `PUT /api/tasks/:id` — update any task fields (title, description, priority, dueDate, labels)
- `DELETE /api/tasks/:id` — delete a task and cascade to its comments; reindex positions of remaining tasks in the same column
- `PUT /api/tasks/:id/move` — move a task to a new column (status) and/or reorder within a column (position); reindex positions in both source and destination columns as needed
- Route registration in `app.ts`
- Integration tests in `packages/server/test/routes/` covering:
  - CRUD operations with correct response shapes
  - Task creation sets correct defaults (status, priority, position)
  - Move between columns updates status and reindexes both columns
  - Move within a column reorders correctly
  - Query filters return correct subsets (by status, priority, label)
  - Sort by createdAt and dueDate in both directions
  - Cascade delete removes comments
  - Position reindexing on delete
  - 400 on missing title
  - 404 on non-existent task or board
  - Label population on GET single task

## Technical Decisions & Constraints

- **Position reindexing complexity**: Task move/reorder logic must handle edge cases such as moving to the same column, moving to position 0, moving to end. Careful thought is needed to avoid off-by-one errors in position recalculation
- Tasks reference columns by name string (`status` field), not by ObjectId
- The `labels` field on a task is an array of ObjectId references to the Label collection; GET single task should populate these
- The `project` field on a task is denormalized for queries (stored alongside the `board` reference)
- Consistent response envelope and standard HTTP status codes
- All routes require JWT bearer token via existing auth middleware

## Dependencies

- **Phase 1 (Projects API)**: needed to create projects and boards for test setup
- **Phase 2 (Boards & Columns API)**: needed to verify column-related behavior (status mapping to column names)
- All Milestone 1 infrastructure (models, auth, test helpers)