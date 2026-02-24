## Phase Goal

Implement the board retrieval endpoint and full CRUD for column management, including column reordering and a deletion guard that prevents removing columns that still contain tasks.

## Deliverables

- `GET /api/projects/:projectId/board` — fetch the board for a project, including its columns array sorted by position
- `POST /api/boards/:boardId/columns` — add a new column (name required, position set to end)
- `PUT /api/boards/:boardId/columns/:columnId` — rename a column
- `DELETE /api/boards/:boardId/columns/:columnId` — delete a column; reject with 400 if any tasks have a status matching this column's name
- `PUT /api/boards/:boardId/columns/reorder` — accept an ordered array of column IDs and update all position values accordingly
- Route registration in `app.ts`
- Integration tests in `packages/server/test/routes/` covering:
  - Board fetch returns columns sorted by position
  - Add column appends at correct position
  - Rename column updates name only
  - Delete column succeeds when empty, fails with 400 when tasks exist in it
  - Reorder updates all column positions correctly
  - 404 on non-existent board or column
  - 400 on invalid/missing payload fields

## Technical Decisions & Constraints

- Columns are embedded subdocuments within the Board document (not a separate collection)
- The reorder endpoint accepts `{ "columnIds": ["id1", "id2", "id3", "id4"] }` and updates position values accordingly
- Column deletion guard: must check if any tasks have a `status` field matching the column's name before allowing deletion
- Column–status coupling: tasks reference columns by name string (status field), not by ObjectId. Renaming a column must be tested to understand whether it orphans existing tasks or whether task statuses should be updated on rename
- Consistent response envelope (`{ data: T }` / `{ error: string }`) and standard HTTP status codes
- All routes require JWT bearer token via existing auth middleware

## Dependencies

- **Phase 1 (Projects API)** must be complete: project and board creation logic is implemented there, and board/column tests depend on being able to create projects with auto-created boards
- All Milestone 1 infrastructure (models, auth, test helpers)