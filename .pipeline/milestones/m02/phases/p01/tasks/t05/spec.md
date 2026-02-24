## Objective

Add error-case tests and cascade delete verification tests to the existing `project.routes.test.ts` file, covering all validation failures, 404s, 401s, and full cascade delete data integrity.

## Deliverables

### 1. Add error-case tests to `packages/server/test/routes/project.routes.test.ts`

**Validation errors (400)**:
- `POST /api/projects` with missing `name` field → expect 400 with `{ error: "..." }`
- `POST /api/projects` with empty-string `name` (`{ name: "" }`) → expect 400
- `PUT /api/projects/:id` with no valid update fields (empty body or `{}`) → expect 400
- `GET /api/projects/:id` with malformed ObjectId (e.g., `"not-an-id"`) → expect 400

**Not found (404)**:
- `GET /api/projects/:id` with a valid but non-existent ObjectId → expect 404
- `PUT /api/projects/:id` with non-existent ObjectId → expect 404
- `DELETE /api/projects/:id` with non-existent ObjectId → expect 404

**Unauthorized (401)**:
- `GET /api/projects` without auth token → expect 401 `{ error: "Unauthorized" }`
- `POST /api/projects` without auth token → expect 401
- `GET /api/projects/:id` without auth token → expect 401
- `PUT /api/projects/:id` without auth token → expect 401
- `DELETE /api/projects/:id` without auth token → expect 401

### 2. Cascade delete verification test

- Create a project (which auto-creates a board)
- Create tasks associated with the board (directly via `TaskModel.create` with `board` and `project` references, and `status` set to a valid column name)
- Create comments on those tasks (via `CommentModel.create` with `task` and `author` references)
- Create labels scoped to the project (via `LabelModel.create` with `project` reference)
- Call `DELETE /api/projects/:id`
- Verify all collections are empty for the related resources:
  - `ProjectModel.findById(projectId)` returns null
  - `BoardModel.findOne({ project: projectId })` returns null
  - `TaskModel.find({ project: projectId })` returns empty array
  - `CommentModel.find({ task: { $in: taskIds } })` returns empty array
  - `LabelModel.find({ project: projectId })` returns empty array

## Key Constraints

- Import additional models as needed: `TaskModel`, `CommentModel`, `LabelModel` from `../../src/models/index.js`
- For cascade delete test, create test data directly via Mongoose models (not API calls) — this isolates the test from task/comment/label endpoint implementation which doesn't exist yet
- Use a valid but non-existent ObjectId for 404 tests: `new mongoose.Types.ObjectId()` or `"000000000000000000000000"`

## Files

| File | Action |
|------|--------|
| `packages/server/test/routes/project.routes.test.ts` | **Modify** (add error and cascade tests) |

## Dependencies

- **t04**: Test file scaffold and happy-path tests must exist

## Verification

1. All error-case tests pass
2. Cascade delete test passes — all associated resources verified as removed
3. All existing happy-path tests still pass
4. Full test suite for project routes passes: `npx vitest run test/routes/project.routes.test.ts`
5. All tests across the server package pass: `npm test` from the server package