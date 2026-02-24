## Objective

Create the integration test file for project routes and implement all happy-path tests covering successful CRUD operations and board auto-creation.

## Deliverables

### 1. Create `packages/server/test/routes/project.routes.test.ts`

Set up the test scaffold following the pattern in `auth.routes.test.ts`:
- Import from `vitest`: `describe`, `it`, `expect`, `beforeAll`, `afterAll`, `beforeEach`
- Import `supertest` as `request`
- Import `buildApp` from `../../src/app.js`
- Import models: `UserModel`, `ProjectModel`, `BoardModel`, `hashPassword` from `../../src/models/index.js`
- Import `setupTestDb`, `teardownTestDb`, `clearCollections` from `../helpers/db.js`
- Implement `httpRequest` helper supporting methods: `get`, `post`, `put`, `delete` — same pattern as auth tests but with extended `HttpMethod` type
- Implement `seedAdminUser` helper that creates the admin user and returns nothing
- Implement `getAuthToken` helper that logs in via `POST /api/auth/login` and returns the JWT token string
- `beforeAll`: `setupTestDb()`, `buildApp()`, `app.ready()`, determine `useSupertest`
- `beforeEach`: `clearCollections()`, `seedAdminUser()`
- `afterAll`: `app.close()`, `teardownTestDb()`

### 2. Happy-path tests

- **`POST /api/projects` with valid payload**: Send `{ name: "Test Project", description: "A test" }` with auth token → expect 201, response body `{ data: { name, description, owner, _id, createdAt, updatedAt } }`
- **`POST /api/projects` auto-creates board**: After creating a project, query `BoardModel.findOne({ project: projectId })` → verify board exists with 4 columns in correct order (`To Do` at position 0, `In Progress` at 1, `In Review` at 2, `Done` at 3)
- **`GET /api/projects` returns all projects**: Create 2-3 projects, then GET → expect 200 with all projects, sorted by `createdAt` descending
- **`GET /api/projects/:id` returns single project**: Create a project, then GET by its ID → expect 200 with correct project data
- **`PUT /api/projects/:id` updates project**: Create a project, then PUT with `{ name: "Updated Name" }` → expect 200, returned project has updated name
- **`DELETE /api/projects/:id` deletes project**: Create a project, then DELETE → expect 200 with `{ data: { message: "Project deleted" } }`, verify project no longer in database

## Key Constraints

- Follow the `httpRequest` pattern from `auth.routes.test.ts` exactly — supports both supertest and `app.inject` fallback
- All protected routes need `Authorization: Bearer <token>` header
- Each test should be independent — `beforeEach` clears all collections
- Use `BoardModel` directly to verify board auto-creation (not just API responses)

## Files

| File | Action |
|------|--------|
| `packages/server/test/routes/project.routes.test.ts` | **Create** |

## Dependencies

- **t01, t02, t03**: All route handlers must be implemented

## Verification

1. All happy-path tests pass when run via `npx vitest run test/routes/project.routes.test.ts` from the server package
2. No test pollution — each test is isolated via `beforeEach` cleanup
3. Tests correctly use auth tokens for all protected endpoints