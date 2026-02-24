## Phase Goal

Implement full CRUD endpoints for the Project resource, including business logic for automatic board creation on project creation and cascade deletion of all associated resources (board, tasks, comments, labels) on project deletion.

## Deliverables

- `GET /api/projects` — list all projects owned by the authenticated user
- `POST /api/projects` — create a project (name required, description optional); automatically create a Board with default columns (`["To Do", "In Progress", "In Review", "Done"]`) in a single transaction-like operation
- `GET /api/projects/:id` — get a project by ID (verify ownership)
- `PUT /api/projects/:id` — update project name and/or description
- `DELETE /api/projects/:id` — delete a project and cascade to its board, all tasks on that board, all comments on those tasks, and all labels scoped to the project
- Route registration in `app.ts` under the `/api/projects` prefix
- Integration tests in `packages/server/test/routes/` covering:
  - Successful CRUD operations with correct response shapes
  - 400 on missing required fields (name)
  - 404 on non-existent project ID
  - 401 on missing/invalid auth token
  - Cascade delete verification (board, tasks, comments, labels all removed)
  - Auto-created board has exactly 4 default columns in correct order

## Technical Decisions & Constraints

- All responses must use the consistent envelope: `{ data: T }` for success, `{ error: string }` for failure
- HTTP status codes: 200 (ok), 201 (created), 400 (bad request), 401 (unauthorized), 404 (not found)
- Cascade delete order must be carefully sequenced: comments first, then tasks, then board/labels, then project (MongoDB lacks multi-collection transactions in standalone mode)
- Request validation is required for all endpoints
- Routes are registered in `packages/server/src/routes/` and wired into `app.ts`
- All routes except login require JWT bearer token via existing auth middleware

## Dependencies

- Milestone 1 must be complete: monorepo structure, all Mongoose models (User, Project, Board, Column, Task, Comment, Label), database connection, JWT authentication, auth middleware, seed user, test infrastructure (helpers, db setup/teardown), and Fastify app factory
- MongoDB running locally on `mongodb://localhost:27017`
- Existing packages: `@fastify/jwt`, `@fastify/cors`, `mongoose`, `bcryptjs`, `vitest`, `supertest`, and `@taskboard/shared`