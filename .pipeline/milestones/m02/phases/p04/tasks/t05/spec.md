# Task 5: Label integration tests

## Objective

Write comprehensive integration tests for all label endpoints, including the critical label deletion cleanup test that verifies label references are removed from tasks.

## Deliverables

- New file `packages/server/test/routes/label.routes.test.ts` following the same test pattern as other route test files.

## Implementation Details

- **Test framework**: Vitest with supertest or Fastify's `.inject()` method
- **Lifecycle hooks**: Same pattern as comment tests — `setupTestDb`, `clearCollections`, `teardownTestDb`
- **Helper functions**: `seedAdminUser()`, `getAuthToken()`, `httpRequest()`, `createProject()`, `createTask()` — follow patterns in existing test files
- **Test cases (14 minimum)**:
  1. `POST /api/projects/:projectId/labels` — creates label with correct shape (`_id`, `name`, `color`, `project`, `createdAt`), returns 201
  2. `POST /api/projects/:projectId/labels` — returns 400 when `name` is missing
  3. `POST /api/projects/:projectId/labels` — returns 400 when `color` is missing
  4. `POST /api/projects/:projectId/labels` — returns 404 for non-existent project (valid ObjectId format)
  5. `GET /api/projects/:projectId/labels` — returns labels sorted by `createdAt` ascending
  6. `GET /api/projects/:projectId/labels` — returns empty array when project has no labels
  7. `GET /api/projects/:projectId/labels` — returns 404 for non-existent project
  8. `PUT /api/labels/:id` — updates label name and/or color, returns 200
  9. `PUT /api/labels/:id` — returns 400 when no valid fields provided
  10. `PUT /api/labels/:id` — returns 404 for non-existent label
  11. `DELETE /api/labels/:id` — deletes label, returns 200, label no longer exists in DB
  12. `DELETE /api/labels/:id` — **critical test**: removes label reference from all tasks that had it. Steps: create label, create two tasks with that label in their `labels` array (via `PUT /api/tasks/:id`), delete the label, verify both tasks no longer have the label ID in their `labels` array.
  13. `DELETE /api/labels/:id` — returns 404 for non-existent label
  14. Auth: returns 401 when no token provided (test at least one endpoint)

## Files

| File | Action |
|------|--------|
| `packages/server/test/routes/label.routes.test.ts` | Create |

## Dependencies

- **Task 2** (label route handlers) and **Task 3** (route registration) must be completed so the endpoints are accessible
- **Task 3 dependency on Tasks API** (Phase 3): The label cleanup test (case 12) relies on `PUT /api/tasks/:id` to attach labels to tasks, which was implemented in Phase 3
- Existing test helpers and models

## Verification

1. All label tests pass when run via `npx vitest run test/routes/label.routes.test.ts` from `packages/server`
2. The label deletion cleanup test specifically confirms that `TaskModel` documents no longer contain the deleted label's ObjectId
3. Tests properly isolate
4. No existing tests are broken