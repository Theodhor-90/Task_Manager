Now I have all the context I need. Here is the comprehensive phase specification:

# Phase 4: Comments & Labels API — Specification

## Goal

Implement full CRUD endpoints for comments on tasks and labels scoped to projects, including chronological comment listing with author population, label creation with name and hex color, and the cleanup logic that removes a deleted label's ObjectId from the `labels` array of all tasks that reference it — completing the final set of REST API endpoints defined in the master plan.

## Design Decisions

### 1. Route file organization

Comments and labels are implemented in two separate route files (`comment.routes.ts` and `label.routes.ts`) following the existing pattern of one file per resource. Each file exports one or two `FastifyPluginAsync` plugins depending on URL prefix needs:

- **`comment.routes.ts`** exports `taskCommentRoutes` (prefix `/api/tasks`) for `GET/POST /:taskId/comments` and `commentRoutes` (prefix `/api/comments`) for `PUT/DELETE /:id`.
- **`label.routes.ts`** exports `projectLabelRoutes` (prefix `/api/projects`) for `GET/POST /:projectId/labels` and `labelRoutes` (prefix `/api/labels`) for `PUT/DELETE /:id`.

This mirrors how `task.routes.ts` exports both `boardTaskRoutes` and `taskRoutes` for different prefixes.

### 2. Authorization model

- **Comments**: Authorization follows the task → board → project → owner chain already established in task routes. The comment author is set automatically from `request.user.id` (JWT). Any authenticated project owner can edit or delete any comment on their project's tasks (single-user app, no need for author-only restrictions).
- **Labels**: Authorization checks that the authenticated user owns the project the label belongs to, matching the project routes pattern.

### 3. Label deletion cleanup

When a label is deleted, a single `TaskModel.updateMany({ labels: labelId }, { $pull: { labels: labelId } })` operation removes the label reference from all tasks. This is done before the label document itself is deleted.

### 4. Comment author population

`GET /api/tasks/:taskId/comments` populates the `author` field with `name` and `email` (excluding `passwordHash`) to provide display-ready data. This uses Mongoose `.populate("author", "name email")`.

### 5. Validation approach

Manual type-guard functions (`isValidCreateCommentBody`, `isValidCreateLabelBody`, `isValidUpdateLabelBody`) consistent with the pattern used in all existing route files. No schema validation library.

### 6. Response envelope

All responses use the existing envelope convention: `{ data: T }` for success, `{ error: string }` for errors, with standard HTTP status codes (200, 201, 400, 401, 404).

## Tasks

### Task 1: Comment route handlers

**Deliverables:**
- New file `packages/server/src/routes/comment.routes.ts` exporting two plugins:
  - `taskCommentRoutes: FastifyPluginAsync` — handles routes under `/api/tasks/:taskId/comments`:
    - `GET /:taskId/comments` — list comments for a task, sorted by `createdAt` ascending, with author populated (`name`, `email`)
    - `POST /:taskId/comments` — create a comment (`body` required, `author` set from JWT, `task` set from URL param)
  - `commentRoutes: FastifyPluginAsync` — handles routes under `/api/comments`:
    - `PUT /:id` — update comment `body` field (required, non-empty string)
    - `DELETE /:id` — delete a comment
- Validation functions: `isValidObjectId`, `isValidCreateCommentBody`, `isValidUpdateCommentBody`
- Authorization: verify task exists → board exists → project owner matches `request.user.id`
- For `PUT/DELETE /api/comments/:id`: look up comment → find task → verify ownership chain

### Task 2: Label route handlers

**Deliverables:**
- New file `packages/server/src/routes/label.routes.ts` exporting two plugins:
  - `projectLabelRoutes: FastifyPluginAsync` — handles routes under `/api/projects/:projectId/labels`:
    - `GET /:projectId/labels` — list labels for a project, sorted by `createdAt` ascending
    - `POST /:projectId/labels` — create a label (`name` and `color` required, `project` set from URL param)
  - `labelRoutes: FastifyPluginAsync` — handles routes under `/api/labels`:
    - `PUT /:id` — update label `name` and/or `color`
    - `DELETE /:id` — remove label ID from all tasks via `$pull`, then delete the label document
- Validation functions: `isValidObjectId`, `isValidCreateLabelBody`, `isValidUpdateLabelBody`
- Authorization: verify project owner matches `request.user.id`
- For `PUT/DELETE /api/labels/:id`: look up label → find project → verify ownership

### Task 3: Register routes in app.ts

**Deliverables:**
- Import `taskCommentRoutes` and `commentRoutes` from `./routes/comment.routes.js`
- Import `projectLabelRoutes` and `labelRoutes` from `./routes/label.routes.js`
- Register in `app.ts`:
  - `await app.register(taskCommentRoutes, { prefix: "/api/tasks" })`
  - `await app.register(commentRoutes, { prefix: "/api/comments" })`
  - `await app.register(projectLabelRoutes, { prefix: "/api/projects" })`
  - `await app.register(labelRoutes, { prefix: "/api/labels" })`

### Task 4: Comment integration tests

**Deliverables:**
- New file `packages/server/test/routes/comment.routes.test.ts` following the established test pattern (supertest with fastify.inject fallback, `beforeAll`/`beforeEach`/`afterAll` lifecycle, `clearCollections` between tests)
- Helper functions: `seedAdminUser`, `getAuthToken`, `httpRequest`, `createProject`, `createTask`
- Test cases:
  - `POST /api/tasks/:taskId/comments` — creates comment with correct shape, sets author from JWT, returns 201
  - `POST /api/tasks/:taskId/comments` — returns 400 when `body` is missing or empty
  - `POST /api/tasks/:taskId/comments` — returns 404 for non-existent task ID
  - `POST /api/tasks/:taskId/comments` — returns 400 for invalid task ID format
  - `GET /api/tasks/:taskId/comments` — returns comments sorted by `createdAt` ascending with populated author
  - `GET /api/tasks/:taskId/comments` — returns empty array when task has no comments
  - `GET /api/tasks/:taskId/comments` — returns 404 for non-existent task
  - `PUT /api/comments/:id` — updates comment body, returns 200
  - `PUT /api/comments/:id` — returns 400 when body is missing or empty
  - `PUT /api/comments/:id` — returns 404 for non-existent comment
  - `DELETE /api/comments/:id` — deletes comment, returns 200
  - `DELETE /api/comments/:id` — returns 404 for non-existent comment
  - Auth: returns 401 when no token provided (at least one endpoint)

### Task 5: Label integration tests

**Deliverables:**
- New file `packages/server/test/routes/label.routes.test.ts` following the same test pattern
- Helper functions: `seedAdminUser`, `getAuthToken`, `httpRequest`, `createProject`, `createTask`
- Test cases:
  - `POST /api/projects/:projectId/labels` — creates label with correct shape, returns 201
  - `POST /api/projects/:projectId/labels` — returns 400 when `name` is missing
  - `POST /api/projects/:projectId/labels` — returns 400 when `color` is missing
  - `POST /api/projects/:projectId/labels` — returns 404 for non-existent project
  - `GET /api/projects/:projectId/labels` — returns labels sorted by `createdAt` ascending
  - `GET /api/projects/:projectId/labels` — returns empty array when project has no labels
  - `GET /api/projects/:projectId/labels` — returns 404 for non-existent project
  - `PUT /api/labels/:id` — updates label name and/or color, returns 200
  - `PUT /api/labels/:id` — returns 400 when no valid fields provided
  - `PUT /api/labels/:id` — returns 404 for non-existent label
  - `DELETE /api/labels/:id` — deletes label, returns 200
  - `DELETE /api/labels/:id` — removes label reference from all tasks that had it
  - `DELETE /api/labels/:id` — returns 404 for non-existent label
  - Auth: returns 401 when no token provided (at least one endpoint)

### Task 6: Verify all tests pass and endpoints work end-to-end

**Deliverables:**
- Run `npm test` from the server package — all existing and new tests pass
- Verify no regressions in project, board, column, or task tests
- Verify TypeScript compiles without errors (`npx tsc --noEmit`)

## Exit Criteria

1. `GET /api/tasks/:taskId/comments` returns comments sorted by `createdAt` ascending with author `name` and `email` populated
2. `POST /api/tasks/:taskId/comments` creates a comment with `body` from request and `author` from JWT; returns 201
3. `PUT /api/comments/:id` updates the comment body; returns 200
4. `DELETE /api/comments/:id` removes the comment; returns 200
5. `GET /api/projects/:projectId/labels` returns labels sorted by `createdAt` ascending
6. `POST /api/projects/:projectId/labels` creates a label with `name`, `color`, and `project`; returns 201
7. `PUT /api/labels/:id` updates label `name` and/or `color`; returns 200
8. `DELETE /api/labels/:id` removes the label's ObjectId from the `labels` array of all tasks that reference it, then deletes the label; returns 200
9. All eight endpoints return 401 without a valid JWT token
10. All eight endpoints return 404 for non-existent resource IDs
11. Create endpoints return 400 for missing required fields (`body` for comments; `name` or `color` for labels)
12. All integration tests pass (`npm test` from `packages/server`)
13. All existing tests continue to pass (no regressions)
14. TypeScript compiles without errors

## Dependencies

- **Phase 1 (Projects API)** — needed to create projects for label scoping and for the authorization ownership chain
- **Phase 2 (Boards & Columns API)** — needed to fetch boards as part of the comment authorization chain (task → board → project → owner)
- **Phase 3 (Tasks API)** — needed to create tasks for comment association, and to verify label cleanup on deletion (tasks already support `labels` array via `PUT /api/tasks/:id`)
- **Milestone 1 infrastructure** — Mongoose models (`CommentModel`, `LabelModel`, `TaskModel`), JWT auth middleware, test helpers (`setupTestDb`, `teardownTestDb`, `clearCollections`), and `buildApp` factory

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/server/src/routes/comment.routes.ts` | Create | Comment CRUD route handlers |
| `packages/server/src/routes/label.routes.ts` | Create | Label CRUD route handlers |
| `packages/server/src/app.ts` | Modify | Register comment and label route plugins |
| `packages/server/test/routes/comment.routes.test.ts` | Create | Comment endpoint integration tests |
| `packages/server/test/routes/label.routes.test.ts` | Create | Label endpoint integration tests |