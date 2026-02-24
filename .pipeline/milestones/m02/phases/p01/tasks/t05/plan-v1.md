Now I have a thorough understanding of the existing codebase. Let me analyze the task spec against what's already in the test file to produce the plan.

The t05 spec requires these tests:

**Validation errors (400)**:
1. `POST /api/projects` with missing `name` → 400 — EXISTS (line 206)
2. `POST /api/projects` with empty-string `name` → 400 — EXISTS (line 219)
3. `PUT /api/projects/:id` with no valid update fields → 400 — EXISTS (line 535)
4. `GET /api/projects/:id` with malformed ObjectId → 400 — EXISTS (line 386)

**Not found (404)**:
5. `GET /api/projects/:id` with valid but non-existent ObjectId → 404 — EXISTS (line 374)
6. `PUT /api/projects/:id` with non-existent ObjectId → 404 — EXISTS (line 509)
7. `DELETE /api/projects/:id` with non-existent ObjectId → 404 — EXISTS (line 728)

**Unauthorized (401)**:
8. `GET /api/projects` without auth token → 401 — EXISTS (line 337)
9. `POST /api/projects` without auth token → 401 — EXISTS (line 245)
10. `GET /api/projects/:id` without auth token → 401 — EXISTS (line 398)
11. `PUT /api/projects/:id` without auth token → 401 — EXISTS (line 598)
12. `DELETE /api/projects/:id` without auth token → 401 — EXISTS (line 752)

**Cascade delete verification**:
13. Full cascade delete test — EXISTS (line 644)

Every single test required by the t05 spec is already present in the file. This is a verify-only task, same as t04 was. Let me produce the plan.

# Task 5 Implementation Plan — Integration tests: error cases and cascade delete verification

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/routes/project.routes.test.ts` | **No changes needed** | Verify the existing file satisfies all spec requirements |

## 2. Current State

The test file already exists at `packages/server/test/routes/project.routes.test.ts` with 31 passing tests. Tasks t01–t03 each added error-case tests and the cascade delete verification test alongside the happy-path tests as they implemented the route handlers. Task t04 verified the happy-path subset. This task's role is to verify that all 13 spec-required error-case and cascade-delete tests are present and correctly structured, then confirm by running the test suite.

**Decision**: This is a **verify-only** task. The existing file already contains all required tests. No code changes are needed.

## 3. Dependencies

- **t01 (completed)**: `POST /` and `GET /` handlers implemented; initial tests including 400s and 401s written
- **t02 (completed)**: `GET /:id` and `PUT /:id` handlers implemented; error-case tests (400, 404, 401) added
- **t03 (completed)**: `DELETE /:id` handler with cascade logic implemented; cascade delete verification test and DELETE error-case tests added
- **t04 (completed)**: Happy-path tests verified as present and passing
- **Mongoose test-double**: Extended by t01–t03 with `find()`, `findOneAndUpdate()`, `deleteOne()`, and `$in` operator support — all already in place for the cascade delete verification test

## 4. Spec Deliverable → Existing Test Mapping

The task spec defines 13 required tests across 4 categories. Each maps to a specific existing test in the file:

### Category 1: Validation Errors (400)

**Spec requirement**: `POST /api/projects` with missing `name` field → expect 400

**Existing test** (line 206): `"returns 400 when name is missing"`
- Sends `POST /api/projects` with `{ description: "no name" }` and auth header
- Asserts: 400 status, `body.error` contains `"Project name"`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `POST /api/projects` with empty-string `name` → expect 400

**Existing test** (line 219): `"returns 400 when name is empty string"`
- Sends `POST /api/projects` with `{ name: "" }` and auth header
- Asserts: 400 status, `body.error` contains `"Project name"`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `PUT /api/projects/:id` with no valid update fields (empty body or `{}`) → expect 400

**Existing test** (line 535): `"returns 400 when no valid update fields provided"`
- Creates a project, then sends `PUT /api/projects/:id` with `{}` and auth header
- Asserts: 400 status, `body.error` contains `"Name or description"`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `GET /api/projects/:id` with malformed ObjectId (e.g., `"not-an-id"`) → expect 400

**Existing test** (line 386): `"returns 400 for invalid ObjectId format"`
- Sends `GET /api/projects/not-a-valid-id` with auth header
- Asserts: 400 status, `body.error === "Invalid project ID"`
- **Verdict**: Fully satisfies the requirement.

### Category 2: Not Found (404)

**Spec requirement**: `GET /api/projects/:id` with a valid but non-existent ObjectId → expect 404

**Existing test** (line 374): `"returns 404 for non-existent project ID"`
- Sends `GET /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` with auth header
- Asserts: 404 status, `body.error === "Project not found"`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `PUT /api/projects/:id` with non-existent ObjectId → expect 404

**Existing test** (line 509): `"returns 404 for non-existent project ID"`
- Sends `PUT /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` with `{ name: "Test" }` and auth header
- Asserts: 404 status, `body.error === "Project not found"`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `DELETE /api/projects/:id` with non-existent ObjectId → expect 404

**Existing test** (line 728): `"returns 404 for non-existent project ID"`
- Sends `DELETE /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` with auth header
- Asserts: 404 status, `body.error === "Project not found"`
- **Verdict**: Fully satisfies the requirement.

### Category 3: Unauthorized (401)

**Spec requirement**: `GET /api/projects` without auth token → expect 401

**Existing test** (line 337): `"returns 401 without auth token"`
- Sends `GET /api/projects` without auth header
- Asserts: `response.body` equals `{ error: "Unauthorized" }`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `POST /api/projects` without auth token → expect 401

**Existing test** (line 245): `"returns 401 without auth token"`
- Sends `POST /api/projects` with `{ name: "Test" }` but no auth header
- Asserts: `response.body` equals `{ error: "Unauthorized" }`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `GET /api/projects/:id` without auth token → expect 401

**Existing test** (line 398): `"returns 401 without auth token"`
- Sends `GET /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` without auth header
- Asserts: `body.error === "Unauthorized"`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `PUT /api/projects/:id` without auth token → expect 401

**Existing test** (line 598): `"returns 401 without auth token"`
- Sends `PUT /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` with `{ name: "Test" }` but no auth header
- Asserts: `body.error === "Unauthorized"`
- **Verdict**: Fully satisfies the requirement.

---

**Spec requirement**: `DELETE /api/projects/:id` without auth token → expect 401

**Existing test** (line 752): `"returns 401 without auth token"`
- Sends `DELETE /api/projects/aaaaaaaaaaaaaaaaaaaaaaaa` without auth header
- Asserts: `body.error === "Unauthorized"`
- **Verdict**: Fully satisfies the requirement.

### Category 4: Cascade Delete Verification

**Spec requirement**: Create project → create tasks, comments, labels → delete project → verify all collections empty

**Existing test** (line 644): `"cascade deletes board, tasks, comments, and labels"`
- Creates a project via `POST /api/projects` (auto-creates board)
- Looks up the board via `BoardModel.findOne({ project: projectId })`
- Looks up the user via `UserModel.findOne({ email: "admin@taskboard.local" })`
- Creates a task via `TaskModel.create({ title: "Task 1", status: "To Do", board: boardId, project: projectId })`
- Creates a comment via `CommentModel.create({ body: "A comment", task: taskId, author: userId })`
- Creates a label via `LabelModel.create({ name: "Bug", color: "#ef4444", project: projectId })`
- Calls `DELETE /api/projects/:id`
- Verifies all 5 collections are cleaned:
  - `ProjectModel.findOne({ _id: projectId })` returns `null`
  - `BoardModel.findOne({ project: projectId })` returns `null`
  - `TaskModel.countDocuments({ board: boardId })` returns `0`
  - `CommentModel.countDocuments({ task: taskId })` returns `0`
  - `LabelModel.countDocuments({ project: projectId })` returns `0`
- **Verdict**: Fully satisfies the requirement. Uses direct model creates (not API calls) as the spec requires, since task/comment/label endpoints don't exist yet.

## 5. Supplementary Tests (already present, beyond spec)

The file contains 18 additional tests beyond the 13 spec-required ones. These were added during t01–t03 as extra coverage and were verified by t04 as happy-path tests:

| Category | Count | Examples |
|----------|-------|---------|
| POST happy paths | 3 | creates with name+description, creates with only name, auto-creates board |
| POST extra validation | 1 | whitespace-only name returns 400 |
| GET list happy paths | 3 | empty array, all owned projects, sorted by createdAt desc |
| GET single happy path | 1 | returns project by ID |
| PUT happy paths | 4 | updates name, updates description, updates both, ignores extraneous fields |
| PUT extra validation | 2 | empty-string name returns 400, whitespace name returns 400 |
| DELETE happy paths | 2 | deletes and returns message, deletes board-only project |
| DELETE extra validation | 2 | invalid ObjectId returns 400, invalid ObjectId on GET/PUT returns 400 |

All 31 tests are already present and passing. No additions or modifications needed.

## 6. Test Scaffold Verification

The existing scaffold matches all spec constraints:

| Constraint | Status | Location |
|------------|--------|----------|
| Imports `TaskModel`, `CommentModel`, `LabelModel` from `../../src/models/index.js` | Present | Lines 10–13 |
| Imports `ProjectModel` for cascade verification | Present | Line 13 |
| `setupTestDb` / `teardownTestDb` in lifecycle hooks | Present | Lines 112–117, 125–128 |
| `clearCollections` in `beforeEach` for test isolation | Present | Line 120 |
| Cascade test creates data via Mongoose models (not API calls) | Present | Lines 663–681 |
| Uses `normalizeId` for ObjectId handling | Present | Lines 19–34 |
| Auth token obtained via `POST /api/auth/login` in `beforeEach` | Present | Lines 61–73, 119–123 |

## 7. Implementation Order

1. **Run the project routes tests** — Execute `cd packages/server && npx vitest run test/routes/project.routes.test.ts` to confirm all 31 tests pass in the current state.

2. **Run all server tests** — Execute `cd packages/server && npm test` to verify no regressions across all test files (`auth.routes.test.ts`, `app.test.ts`, model tests).

3. **Verify TypeScript compiles** — Execute `cd packages/server && npm run build` to confirm no type errors.

4. **Mark task complete** — All 13 spec deliverables are satisfied by existing tests. No code changes required.

## 8. Verification Commands

```bash
# 1. Run project routes tests — all 31 should pass
cd packages/server && npx vitest run test/routes/project.routes.test.ts

# 2. Run all server tests — verify no regressions
cd packages/server && npm test

# 3. Verify TypeScript compiles
cd packages/server && npm run build
```