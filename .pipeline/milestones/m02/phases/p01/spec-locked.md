Now I have comprehensive knowledge of the codebase. Let me produce the phase specification.

# Phase 1: Projects API — Specification

## Goal

Deliver fully functional CRUD endpoints for the Project resource at `/api/projects`, including business logic that automatically creates a Board with four default columns (`"To Do"`, `"In Progress"`, `"In Review"`, `"Done"`) when a project is created, and cascade-deletes all associated resources (board, tasks, comments, labels) when a project is deleted — verified by integration tests covering every endpoint, error case, and data integrity constraint.

## Design Decisions

### 1. Route file structure

Create `packages/server/src/routes/project.routes.ts` exporting a `FastifyPluginAsync`, matching the pattern established by `auth.routes.ts`. Register it in `app.ts` with `{ prefix: "/api/projects" }`.

**Rationale**: Follows the existing one-file-per-resource convention and keeps the route prefix centralized in `app.ts`.

### 2. Request validation via type guards

Each mutating endpoint will use an inline type-guard function (e.g., `isValidCreateProjectRequest`) that validates `request.body` before processing. Invalid payloads return `400 { error: "..." }`.

**Rationale**: Mirrors the pattern in `auth.routes.ts`. Avoids adding a schema validation library — keeping the dependency footprint minimal for now.

### 3. Board auto-creation on project create

The `POST /api/projects` handler will create the Project document first, then create a Board document referencing `project._id` with the four `DEFAULT_COLUMNS` from `@taskboard/shared`. Both operations happen in sequence within the handler. If Board creation fails, the handler deletes the just-created project and returns 500.

**Rationale**: MongoDB standalone does not support multi-document transactions, so we use a compensating action (delete project on board-creation failure) to avoid orphaned projects.

### 4. Cascade delete ordering

`DELETE /api/projects/:id` deletes resources in this order: Comments (via task IDs), Tasks, Labels, Board, Project. Each `deleteMany` runs in sequence.

**Rationale**: Deleting dependents before parents avoids dangling references. Comments reference tasks, tasks reference boards/projects, labels reference projects — so this order respects the dependency graph.

### 5. Ownership scoping

All endpoints filter by `owner: request.user.id` to ensure a user can only access their own projects. `GET /:id`, `PUT /:id`, and `DELETE /:id` return 404 (not 403) when the project doesn't exist or isn't owned by the user.

**Rationale**: Single-user MVP still benefits from ownership checks for correctness. Returning 404 instead of 403 prevents information leakage about other users' resources.

### 6. Response shapes

| Endpoint | Success Status | Response |
|----------|---------------|----------|
| `GET /api/projects` | 200 | `{ data: Project[] }` |
| `POST /api/projects` | 201 | `{ data: Project }` |
| `GET /api/projects/:id` | 200 | `{ data: Project }` |
| `PUT /api/projects/:id` | 200 | `{ data: Project }` |
| `DELETE /api/projects/:id` | 200 | `{ data: { message: "Project deleted" } }` |

Error responses use `{ error: string }` with status 400, 401, or 404.

### 7. Integration test approach

Tests live in `packages/server/test/routes/project.routes.test.ts` and follow the pattern from `auth.routes.test.ts`: `setupTestDb`/`teardownTestDb` in `beforeAll`/`afterAll`, `clearCollections` + seed data in `beforeEach`, and the `httpRequest` helper for HTTP calls. A shared helper function will authenticate and return a valid JWT token for protected-route tests.

## Tasks

### Task 1: Create project route handler file with route registration

**Deliverables**:
- Create `packages/server/src/routes/project.routes.ts` exporting `projectRoutes: FastifyPluginAsync`
- Add the `POST /api/projects` handler:
  - Validate body has `name` (string, non-empty); `description` is optional (string, defaults to `""`)
  - Create a `ProjectModel` document with `{ name, description, owner: request.user.id }`
  - Create a `BoardModel` document with `{ project: project._id, columns: DEFAULT_COLUMNS.map((name, i) => ({ name, position: i })) }`
  - If board creation fails, delete the project and return `500 { error: "Failed to create project" }`
  - Return `201 { data: project.toJSON() }`
- Add the `GET /api/projects` handler:
  - Query `ProjectModel.find({ owner: request.user.id }).sort({ createdAt: -1 })`
  - Return `200 { data: projects }`
- Register `projectRoutes` in `app.ts` with prefix `/api/projects`
- Verify the server compiles and the health endpoint still works

### Task 2: Implement GET, PUT single-project endpoints

**Deliverables**:
- Add `GET /:id` handler:
  - Parse `request.params.id`; return 400 if not a valid ObjectId
  - Query `ProjectModel.findOne({ _id: id, owner: request.user.id })`
  - Return 404 if not found, 200 `{ data: project }` otherwise
- Add `PUT /:id` handler:
  - Parse `request.params.id`; return 400 if not a valid ObjectId
  - Validate body: at least one of `name` (non-empty string) or `description` (string) must be provided
  - Use `findOneAndUpdate({ _id: id, owner: request.user.id }, updates, { new: true })`
  - Return 404 if not found, 200 `{ data: updatedProject }` otherwise

### Task 3: Implement DELETE with cascade logic

**Deliverables**:
- Add `DELETE /:id` handler:
  - Parse `request.params.id`; return 400 if not a valid ObjectId
  - Find project by `{ _id: id, owner: request.user.id }`; return 404 if not found
  - Find the board: `BoardModel.findOne({ project: id })`
  - If board exists:
    - Find all task IDs: `TaskModel.find({ board: board._id }).select("_id")`
    - Delete all comments on those tasks: `CommentModel.deleteMany({ task: { $in: taskIds } })`
    - Delete all tasks: `TaskModel.deleteMany({ board: board._id })`
    - Delete all labels: `LabelModel.deleteMany({ project: id })`
    - Delete the board: `BoardModel.deleteOne({ _id: board._id })`
  - Delete the project: `ProjectModel.deleteOne({ _id: id })`
  - Return `200 { data: { message: "Project deleted" } }`

### Task 4: Integration tests — CRUD operations (happy paths)

**Deliverables**:
- Create `packages/server/test/routes/project.routes.test.ts`
- Set up test scaffold: `setupTestDb`, `teardownTestDb`, `clearCollections`, `buildApp`, auth token helper
- Test: `POST /api/projects` with valid name and description returns 201, response matches `{ data: { name, description, owner, _id, createdAt, updatedAt } }`
- Test: `POST /api/projects` auto-creates a board; verify `BoardModel.findOne({ project })` exists with 4 columns in correct order (`To Do`, `In Progress`, `In Review`, `Done`) and positions 0–3
- Test: `GET /api/projects` returns all created projects sorted by createdAt descending
- Test: `GET /api/projects/:id` returns a single project with correct fields
- Test: `PUT /api/projects/:id` updates name and description, returns updated document
- Test: `DELETE /api/projects/:id` returns success message, project no longer in database

### Task 5: Integration tests — error cases and cascade delete verification

**Deliverables**:
- Test: `POST /api/projects` with missing name returns 400
- Test: `POST /api/projects` with empty-string name returns 400
- Test: `GET /api/projects/:id` with non-existent ID returns 404
- Test: `GET /api/projects/:id` with invalid ObjectId format returns 400
- Test: `PUT /api/projects/:id` with non-existent ID returns 404
- Test: `PUT /api/projects/:id` with no valid update fields returns 400
- Test: `DELETE /api/projects/:id` with non-existent ID returns 404
- Test: All endpoints return 401 when no auth token is provided
- Test: Cascade delete verification — create a project, then create tasks, comments, and labels associated with it; delete the project; verify that the board, all tasks, all comments, and all labels are removed from their respective collections

## Exit Criteria

1. `POST /api/projects` creates a project and returns 201 with the project document in `{ data: Project }` format
2. `POST /api/projects` automatically creates a Board with exactly four columns (`"To Do"`, `"In Progress"`, `"In Review"`, `"Done"`) at positions 0–3
3. `GET /api/projects` returns all projects owned by the authenticated user, sorted by `createdAt` descending
4. `GET /api/projects/:id` returns the project if owned by the user, 404 otherwise
5. `PUT /api/projects/:id` updates name and/or description and returns the updated project
6. `DELETE /api/projects/:id` removes the project and cascades to its board, all tasks on that board, all comments on those tasks, and all labels scoped to the project — verified by checking each collection is empty after delete
7. All endpoints return `400` for invalid/missing required fields and `404` for non-existent resources
8. All endpoints return `401` when no valid JWT is provided
9. All responses use the envelope format: `{ data: T }` for success, `{ error: string }` for errors
10. All integration tests pass via `npm test` from the server package

## Dependencies

- **Milestone 1 complete**: Monorepo structure, all Mongoose models (`UserModel`, `ProjectModel`, `BoardModel`, `TaskModel`, `CommentModel`, `LabelModel`), database connection (`db.ts`), JWT authentication (`jwt.plugin.ts`), auth middleware (`auth.middleware.ts`), seed user (`seed.ts`), and Fastify app factory (`app.ts`)
- **Shared package**: `@taskboard/shared` exports `DEFAULT_COLUMNS`, `PRIORITIES`, and all TypeScript interfaces (`Project`, `Board`, `Column`, etc.)
- **Test infrastructure**: `setupTestDb`, `teardownTestDb`, `clearCollections` helpers in `packages/server/test/helpers/db.ts`; Mongoose test double in `packages/server/test/helpers/mongoose.test-double.ts`; Vitest config with Mongoose alias
- **MongoDB**: Running locally on `mongodb://localhost:27017` (dev: `taskboard`, test: `taskboard_test`)

## Artifacts

| Artifact | Action | Description |
|----------|--------|-------------|
| `packages/server/src/routes/project.routes.ts` | **Create** | Route handlers for all five Project endpoints |
| `packages/server/src/app.ts` | **Modify** | Register `projectRoutes` with prefix `/api/projects` |
| `packages/server/test/routes/project.routes.test.ts` | **Create** | Integration tests covering all endpoints, error cases, and cascade delete |