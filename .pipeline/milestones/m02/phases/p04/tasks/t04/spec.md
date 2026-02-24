# Task 4: Comment integration tests

## Objective

Write comprehensive integration tests for all comment endpoints, covering success paths, validation errors, 404 cases, and auth checks.

## Deliverables

- New file `packages/server/test/routes/comment.routes.test.ts` following the established test pattern used by existing test files (e.g., `task.routes.test.ts`, `project.routes.test.ts`).

## Implementation Details

- **Test framework**: Vitest with supertest or Fastify's `.inject()` method
- **Lifecycle hooks**:
  - `beforeAll` — call `setupTestDb()`, build the Fastify app via `buildApp()`, seed admin user, get auth token
  - `beforeEach` — call `clearCollections()` to ensure test isolation, re-seed necessary data (user, project, board, task)
  - `afterAll` — call `teardownTestDb()`
- **Helper functions**: `seedAdminUser()`, `getAuthToken()`, `httpRequest()` (wrapping inject or supertest), `createProject()`, `createTask()` — follow the patterns in existing test files
- **Test cases (13 minimum)**:
  1. `POST /api/tasks/:taskId/comments` — creates comment with correct shape (`_id`, `body`, `task`, `author`, `createdAt`, `updatedAt`), sets `author` from JWT, returns 201
  2. `POST /api/tasks/:taskId/comments` — returns 400 when `body` is missing
  3. `POST /api/tasks/:taskId/comments` — returns 400 when `body` is empty string
  4. `POST /api/tasks/:taskId/comments` — returns 404 for non-existent task ID (valid ObjectId format)
  5. `POST /api/tasks/:taskId/comments` — returns 400 for invalid task ID format
  6. `GET /api/tasks/:taskId/comments` — returns comments sorted by `createdAt` ascending with populated author (`name`, `email`, no `passwordHash`)
  7. `GET /api/tasks/:taskId/comments` — returns empty array when task has no comments
  8. `GET /api/tasks/:taskId/comments` — returns 404 for non-existent task
  9. `PUT /api/comments/:id` — updates comment body, returns 200 with updated comment
  10. `PUT /api/comments/:id` — returns 400 when body is missing or empty
  11. `PUT /api/comments/:id` — returns 404 for non-existent comment
  12. `DELETE /api/comments/:id` — deletes comment, returns 200, comment no longer exists in DB
  13. `DELETE /api/comments/:id` — returns 404 for non-existent comment
  14. Auth: returns 401 when no token provided (test at least one endpoint)

## Files

| File | Action |
|------|--------|
| `packages/server/test/routes/comment.routes.test.ts` | Create |

## Dependencies

- **Task 1** (comment route handlers) and **Task 3** (route registration) must be completed so the endpoints are accessible
- Existing test helpers: `setupTestDb`, `teardownTestDb`, `clearCollections` from `packages/server/test/helpers/db.ts`
- Existing models and `buildApp` factory

## Verification

1. All comment tests pass when run via `npx vitest run test/routes/comment.routes.test.ts` from `packages/server`
2. Tests properly isolate — running them in any order produces the same results
3. No existing tests are broken