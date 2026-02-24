31 tests, not 29. The feedback says 29 but it's actually 31. Regardless, the feedback's core points are still valid. Now let me understand the task spec precisely and map existing tests to deliverables.

The task spec (t04) deliverables are:
1. `POST /api/projects` with valid payload → 201, response matches shape
2. `POST /api/projects` auto-creates board with 4 columns
3. `GET /api/projects` returns all projects sorted by createdAt descending
4. `GET /api/projects/:id` returns single project with correct fields
5. `PUT /api/projects/:id` updates name and description, returns updated doc
6. `DELETE /api/projects/:id` returns success message, project no longer in DB

Now I have everything I need to write the revised plan. The plan needs to:
1. Commit to a definitive approach (verify-and-confirm, since the file already exists with all needed tests)
2. Map each spec deliverable to specific existing tests by line number
3. Remove the over-engineered board query fallback discussion
4. Have a concrete implementation order, not vague "verify and adjust"
5. Clearly distinguish spec-required tests from supplementary tests

# Task 4 Implementation Plan — Integration tests: CRUD operations (happy paths)

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/routes/project.routes.test.ts` | **No changes needed** | Verify the existing file satisfies all spec requirements |

## 2. Current State

The test file already exists at `packages/server/test/routes/project.routes.test.ts` with 31 passing tests. Tasks t01–t03 each added tests incrementally as they implemented route handlers. This task's role is to verify that all 6 spec-required happy-path tests are present and correctly structured, then confirm by running the test suite.

**Decision**: This is a **verify-only** task. The existing file already contains all required tests. No code changes are needed.

## 3. Dependencies

- **t01 (completed)**: `POST /` and `GET /` route handlers implemented and registered in `app.ts`; initial tests written
- **t02 (completed)**: `GET /:id` and `PUT /:id` route handlers implemented; tests added
- **t03 (completed)**: `DELETE /:id` handler with cascade logic implemented; tests added
- **Mongoose test-double**: Extended by t01–t03 with `find()`, `findOneAndUpdate()`, `deleteOne()`, and `$in` operator support
- **Existing infrastructure** (from Milestone 1): `buildApp`, all models, `setupTestDb`/`teardownTestDb`/`clearCollections`, Vitest config with Mongoose alias

## 4. Spec Deliverable → Existing Test Mapping

The task spec defines 6 required happy-path deliverables. Each maps to one or more existing tests in the file:

### Deliverable 1: `POST /api/projects` with valid payload returns 201 with correct shape

**Existing test** (line 131): `"creates a project with name and description"`
- Sends `POST /api/projects` with `{ name: "Test Project", description: "A description" }` and auth header
- Asserts: 201 status, `body.data.name`, `body.data.description`, `body.data.owner`, `body.data._id`, `body.data.createdAt`, `body.data.updatedAt` all present and correct
- **Verdict**: Fully satisfies the deliverable. All 6 response fields (`name`, `description`, `owner`, `_id`, `createdAt`, `updatedAt`) are explicitly asserted.

### Deliverable 2: `POST /api/projects` auto-creates board with 4 default columns

**Existing test** (line 167): `"auto-creates a board with 4 default columns"`
- Creates a project via `POST /api/projects`, extracts project ID
- Queries `BoardModel.findOne({ project: ... })` directly to verify the board exists
- Asserts: board is not null, `board.columns` has length 4, column names are `["To Do", "In Progress", "In Review", "Done"]` in order, column positions are `[0, 1, 2, 3]`
- **Verdict**: Fully satisfies the deliverable. Column names and positions are verified in correct order.

### Deliverable 3: `GET /api/projects` returns all projects sorted by createdAt descending

**Existing tests** (lines 272 and 304):
- `"returns all projects owned by the user"` (line 272) — creates 2 projects, GETs, asserts length 2 and both names present
- `"returns projects sorted by createdAt descending"` (line 304) — creates "First", waits 5ms, creates "Second", GETs, asserts `data[0].name === "Second"` and `data[1].name === "First"`
- **Verdict**: Fully satisfies the deliverable. Both list retrieval and sort order are verified.

### Deliverable 4: `GET /api/projects/:id` returns single project with correct fields

**Existing test** (line 349): `"returns a project by ID"`
- Creates a project with `{ name: "Get Test", description: "desc" }`, extracts project ID
- GETs `/api/projects/:id`, asserts: 200 status, `body.data.name === "Get Test"`, `body.data.description === "desc"`, `body.data._id` matches created ID, `body.data.owner` is defined
- **Verdict**: Fully satisfies the deliverable.

### Deliverable 5: `PUT /api/projects/:id` updates name and description, returns updated document

**Existing tests** (lines 411, 435, 459):
- `"updates project name"` (line 411) — creates project, PUTs `{ name: "Updated" }`, asserts name changed and ID preserved
- `"updates project description"` (line 435) — creates project, PUTs `{ description: "new" }`, asserts description changed and name unchanged
- `"updates both name and description"` (line 459) — creates project, PUTs both fields, asserts both updated
- **Verdict**: Fully satisfies the deliverable. Name-only, description-only, and both-together update scenarios are all covered.

### Deliverable 6: `DELETE /api/projects/:id` returns success message, project no longer in database

**Existing test** (line 612): `"deletes a project and returns success message"`
- Creates a project, DELETEs it, asserts: 200 status, `body.data.message === "Project deleted"`
- Verifies project is gone by GETting `/api/projects/:id` and asserting 404
- **Verdict**: Fully satisfies the deliverable.

## 5. Supplementary Tests (already present, not spec-required)

The remaining 22 tests were added during t01–t03 as error-case coverage. They go beyond this task's 6 spec deliverables but overlap with t05's scope (error cases and cascade delete verification). They are already present and passing — no action needed from this task.

| Category | Tests | Lines |
|----------|-------|-------|
| POST validation errors | missing name, empty name, whitespace name, 401 | 206, 219, 232, 245 |
| POST with only name (defaults) | description defaults to "" | 151 |
| GET list edge cases | empty array, 401 | 258, 337 |
| GET single errors | 404 non-existent, 400 invalid ID, 401 | 374, 386, 398 |
| PUT errors | extraneous fields, 404, 400 invalid ID, 400 empty body, 400 empty name, 400 whitespace name, 401 | 483, 509, 522, 535, 558, 578, 598 |
| DELETE cascade & errors | cascade deletes all, board-only project, 404, 400 invalid ID, 401 | 644, 703, 728, 740, 752 |

## 6. Test Scaffold Verification

The existing scaffold matches the spec requirements:

| Requirement | Status | Location |
|-------------|--------|----------|
| `setupTestDb` / `teardownTestDb` in `beforeAll` / `afterAll` | Present | Lines 112–117, 125–128 |
| `clearCollections` + seed data in `beforeEach` | Present | Lines 119–123 |
| `httpRequest` helper supporting `get`, `post`, `put`, `delete` | Present | Lines 75–110, type on line 17 |
| Auth token obtained via `POST /api/auth/login` | Present | Lines 61–73 |
| `normalizeId` helper for ObjectId handling | Present | Lines 19–34 |
| `canBindTcpPort` for supertest/inject detection | Present | Lines 36–45 |
| Model imports for direct DB queries | Present | Lines 6–14 |

## 7. Implementation Order

1. **Run the full test suite** — Execute `cd packages/server && npx vitest run test/routes/project.routes.test.ts` to confirm all 31 tests pass in the current state.

2. **Run all server tests** — Execute `cd packages/server && npm test` to verify no regressions across all test files (`auth.routes.test.ts`, `app.test.ts`, model tests).

3. **Verify TypeScript compiles** — Execute `cd packages/server && npm run build` to confirm no type errors.

4. **Mark task complete** — All 6 spec deliverables are satisfied by existing tests. No code changes required.

## 8. Verification Commands

```bash
# 1. Run project routes tests — all 31 should pass
cd packages/server && npx vitest run test/routes/project.routes.test.ts

# 2. Run all server tests — verify no regressions
cd packages/server && npm test

# 3. Verify TypeScript compiles
cd packages/server && npm run build
```