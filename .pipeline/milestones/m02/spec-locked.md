# Milestone 2: Core API — Specification

## Goal

Implement the complete REST API for TaskBoard, delivering full CRUD endpoints for projects, boards, columns, tasks, comments, and labels — with all business logic (cascade deletes, auto-created boards, task move/reorder, query filtering) — backed by comprehensive integration tests that verify every endpoint, edge case, and data integrity constraint defined in the master plan.

## Scope

### In Scope

- All API endpoints listed in master plan Section 5 (5.2 through 5.7)
- Route handlers registered in `packages/server/src/routes/` and wired into `app.ts`
- Request validation for all endpoints
- Business logic: project-creates-board, cascade deletes, column deletion guard, task move with position reindexing, label cleanup on delete
- Integration tests for every endpoint in `packages/server/test/routes/`
- Consistent response envelope (`{ data: T }` / `{ error: string }`) and HTTP status codes per Section 3.2

### Out of Scope

- Frontend UI changes (covered in Milestones 3 and 4)
- Changes to existing auth routes or middleware
- Changes to existing Mongoose models or shared types
- Pagination, rate limiting, or performance optimization
- WebSocket or real-time push
- File uploads or attachments
- New database indexes beyond what the existing models define (unless needed for query filters)

## Phases

### Phase 1: Projects API

Implement CRUD endpoints for the Project resource:

- `GET /api/projects` — list all projects owned by the authenticated user
- `POST /api/projects` — create a project (name required, description optional); automatically create a Board with default columns (`["To Do", "In Progress", "In Review", "Done"]`) in a single transaction-like operation
- `GET /api/projects/:id` — get a project by ID (verify ownership)
- `PUT /api/projects/:id` — update project name and/or description
- `DELETE /api/projects/:id` — delete a project and cascade to its board, all tasks on that board, all comments on those tasks, and all labels scoped to the project

Register routes in `app.ts` under the `/api/projects` prefix. Write integration tests covering:
- Successful CRUD operations with correct response shapes
- 400 on missing required fields (name)
- 404 on non-existent project ID
- 401 on missing/invalid auth token
- Cascade delete verification (board, tasks, comments, labels all removed)
- Auto-created board has exactly 4 default columns in correct order

### Phase 2: Boards & Columns API

Implement endpoints for board retrieval and column management:

- `GET /api/projects/:projectId/board` — fetch the board for a project, including its columns array sorted by position
- `POST /api/boards/:boardId/columns` — add a new column (name required, position set to end)
- `PUT /api/boards/:boardId/columns/:columnId` — rename a column
- `DELETE /api/boards/:boardId/columns/:columnId` — delete a column; reject with 400 if any tasks have a status matching this column's name
- `PUT /api/boards/:boardId/columns/reorder` — accept an ordered array of column IDs and update all position values accordingly

Register routes in `app.ts`. Write integration tests covering:
- Board fetch returns columns sorted by position
- Add column appends at correct position
- Rename column updates name only
- Delete column succeeds when empty, fails with 400 when tasks exist in it
- Reorder updates all column positions correctly
- 404 on non-existent board or column
- 400 on invalid/missing payload fields

### Phase 3: Tasks API

Implement full CRUD and move/filter endpoints for tasks:

- `GET /api/boards/:boardId/tasks` — list tasks for a board; support query parameters: `status`, `priority`, `label` (filter by label ID), `sort` (field name: `createdAt` or `dueDate`), `order` (`asc` or `desc`, default `asc`)
- `POST /api/boards/:boardId/tasks` — create a task (title required; status defaults to first column name; priority defaults to `"medium"`; position set to end of target column)
- `GET /api/tasks/:id` — get a task by ID with populated label references
- `PUT /api/tasks/:id` — update any task fields (title, description, priority, dueDate, labels)
- `DELETE /api/tasks/:id` — delete a task and cascade to its comments; reindex positions of remaining tasks in the same column
- `PUT /api/tasks/:id/move` — move a task to a new column (status) and/or reorder within a column (position); reindex positions in both source and destination columns as needed

Register routes in `app.ts`. Write integration tests covering:
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

### Phase 4: Comments & Labels API

Implement CRUD for comments and labels, plus label-task attachment:

- `GET /api/tasks/:taskId/comments` — list comments for a task, sorted by `createdAt` ascending
- `POST /api/tasks/:taskId/comments` — create a comment (body required, author set from JWT user)
- `PUT /api/comments/:id` — edit a comment body
- `DELETE /api/comments/:id` — delete a comment
- `GET /api/projects/:projectId/labels` — list labels for a project
- `POST /api/projects/:projectId/labels` — create a label (name and color required)
- `PUT /api/labels/:id` — update label name and/or color
- `DELETE /api/labels/:id` — delete a label and remove its ID from the `labels` array of all tasks that reference it

Labels are attached/detached from tasks via `PUT /api/tasks/:id` (updating the `labels` array), which is already covered in Phase 3. This phase implements the label CRUD and cleanup logic.

Register routes in `app.ts`. Write integration tests covering:
- Comment CRUD with correct response shapes and author population
- Comments sorted chronologically
- 400 on missing body for comment creation
- 404 on non-existent task or comment
- Label CRUD with correct response shapes
- 400 on missing name or color for label creation
- Label delete removes references from all associated tasks
- 404 on non-existent label

## Exit Criteria

1. All 24 endpoints from master plan Sections 5.2–5.7 are implemented and return correct response envelopes (`{ data: T }` for success, `{ error: string }` for errors) with appropriate HTTP status codes (200, 201, 400, 401, 404)
2. All integration tests pass when run via `npm test` from the server package
3. Creating a project automatically creates a board with the four default columns in correct order
4. Deleting a project cascades completely: board, tasks, comments, and labels are all removed from the database
5. `PUT /api/tasks/:id/move` correctly updates status and reindexes positions in both source and destination columns
6. Query filters on `GET /api/boards/:boardId/tasks` return correct subsets when filtering by status, priority, and label
7. Sorting by `createdAt` and `dueDate` returns tasks in the requested order
8. Deleting a column is blocked with 400 when tasks exist with that column's status
9. Deleting a label removes its ObjectId from the `labels` array of all tasks that reference it
10. Deleting a task cascades to its comments and reindexes remaining task positions in the column

## Dependencies

- **Milestone 1 complete**: Monorepo structure, all Mongoose models, database connection, JWT authentication, auth middleware, seed user, test infrastructure (helpers, db setup/teardown), and Fastify app factory must all be in place
- **MongoDB**: Running locally on `mongodb://localhost:27017` for both development (`taskboard`) and test (`taskboard_test`) databases
- **Existing packages**: `@fastify/jwt`, `@fastify/cors`, `mongoose`, `bcryptjs`, `vitest`, `supertest`, and `@taskboard/shared` are already installed

## Risks

1. **Position reindexing complexity**: Task move/reorder logic must handle concurrent-like edge cases (e.g., moving to the same column, moving to position 0, moving to end). Careful unit-level thought is needed to avoid off-by-one errors in position recalculation.
2. **Cascade delete reliability**: Deleting a project triggers removal across four collections (Board, Task, Comment, Label). If any step fails mid-cascade, the database could be left in an inconsistent state. Since MongoDB lacks multi-collection transactions in standalone mode, the delete order must be carefully sequenced (comments first, then tasks, then board/labels, then project).
3. **Column–status coupling**: Tasks reference columns by name string (status field), not by ObjectId. Renaming a column must not orphan existing tasks — this needs to be addressed either by updating all task statuses on rename, or by documenting that rename does not cascade (and testing accordingly).
4. **Test isolation**: Integration tests share a single test database. Tests must rigorously clear all collections between runs to avoid cross-test contamination, especially given cascade delete tests that touch multiple collections.