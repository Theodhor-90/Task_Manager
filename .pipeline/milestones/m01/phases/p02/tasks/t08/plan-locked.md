Now I have all the context I need. Let me write the plan.

# Task t08: Model Integration Tests — Implementation Plan

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/test/helpers/db.ts` | **Create** | Test database setup/teardown utilities: connect, disconnect, and clear collections |
| 2 | `packages/server/test/models/user.model.test.ts` | **Create** | Tests for User model: CRUD, required fields, unique email, lowercase/trim, password hashing/verification |
| 3 | `packages/server/test/models/project.model.test.ts` | **Create** | Tests for Project model: CRUD, required fields, name trimming, description default |
| 4 | `packages/server/test/models/board.model.test.ts` | **Create** | Tests for Board model: CRUD, required fields, unique project constraint, embedded column subdocuments |
| 5 | `packages/server/test/models/task.model.test.ts` | **Create** | Tests for Task model: CRUD, required fields, priority enum/default, position default, indexes |
| 6 | `packages/server/test/models/comment.model.test.ts` | **Create** | Tests for Comment model: CRUD, required fields, task index |
| 7 | `packages/server/test/models/label.model.test.ts` | **Create** | Tests for Label model: CRUD, required fields, project index |
| 8 | `packages/server/test/models/seed.test.ts` | **Create** | Tests for seed script: creates user when empty, idempotent when users exist, correct seed data |

## 2. Dependencies

### Prerequisites
- **t01–t07 must be complete** — all models (`user.model.ts`, `project.model.ts`, `board.model.ts`, `task.model.ts`, `comment.model.ts`, `label.model.ts`), the barrel file (`models/index.ts`), `db.ts`, and `seed.ts` must exist
- A running MongoDB instance accessible at `mongodb://localhost:27017` (the test helper will use database `taskboard_test`)

### Packages Already Installed
- `vitest` (devDependency) — test runner
- `mongoose` (dependency) — used by test helpers and model tests
- `bcryptjs` (dependency) — used indirectly via `hashPassword`/`verifyPassword`
- No new packages need to be installed

### Existing Code Used
- `connectDb` / `disconnectDb` from `packages/server/src/db.ts` — NOT used directly; the test helper connects to a separate test database to avoid polluting the dev database
- All models from `packages/server/src/models/index.ts`
- `hashPassword`, `verifyPassword` from `packages/server/src/models/index.ts`
- `seedDefaultUser` from `packages/server/src/seed.ts`
- `config` from `packages/server/src/config.ts` — read-only, to derive the test database URI

### Vitest Configuration
The existing `vitest.config.ts` does NOT need modification. It already has `environment: "node"` and `passWithNoTests: true`. The test files will be discovered automatically by Vitest's default file resolution (`test/**/*.test.ts`).

## 3. Implementation Details

### `packages/server/test/helpers/db.ts`

**Purpose**: Provides test database lifecycle utilities. Connects to a separate `taskboard_test` database (NOT the dev `taskboard` database) and provides functions to clear all collections between tests for isolation.

**Exports**:
- `setupTestDb(): Promise<void>` — connects Mongoose to the test database
- `teardownTestDb(): Promise<void>` — drops the test database and disconnects Mongoose
- `clearCollections(): Promise<void>` — deletes all documents from every collection in the test database

**Implementation**:

```typescript
import mongoose from "mongoose";

const TEST_DB_URI = "mongodb://localhost:27017/taskboard_test";

export async function setupTestDb(): Promise<void> {
  await mongoose.connect(TEST_DB_URI);
}

export async function teardownTestDb(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export async function clearCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
```

**Key decisions**:
- **Hardcoded `taskboard_test` URI**: Uses a dedicated test database (`taskboard_test`) to guarantee complete isolation from the dev database (`taskboard`). No environment variable override is needed — this is the test-only database and should never be the same as the dev database
- **`dropDatabase()` in teardown**: Drops the entire test database on teardown (in `afterAll`) to clean up indexes and any other artifacts. This is more thorough than `deleteMany` and ensures a clean slate for the next test run
- **`clearCollections()` uses `deleteMany`**: Between individual tests (in `beforeEach`), documents are deleted but indexes and collection structures remain. This is faster than dropping/recreating the database between every test
- **Does NOT import or use `connectDb`/`disconnectDb`** from `db.ts`: Those functions read from `config.mongodbUri` which defaults to the dev database. The test helper connects directly using Mongoose to the hardcoded test URI, ensuring the dev database is never touched
- **No `console.log` statements**: Test helpers should be silent; Vitest's own output provides sufficient feedback

### `packages/server/test/models/user.model.test.ts`

**Purpose**: Tests for the User model schema validation, unique constraints, and password utility functions.

**Imports**:
- `describe`, `it`, `expect`, `beforeAll`, `afterAll`, `beforeEach` from `vitest`
- `UserModel`, `hashPassword`, `verifyPassword` from `../../src/models/index.js`
- `setupTestDb`, `teardownTestDb`, `clearCollections` from `../helpers/db.js`
- `mongoose` from `mongoose` (for ObjectId generation in tests)

**Lifecycle hooks**:
- `beforeAll`: calls `setupTestDb()`
- `afterAll`: calls `teardownTestDb()`
- `beforeEach`: calls `clearCollections()`

**Test cases** (within `describe("User model")`):

1. **`it("creates a user with valid fields")`**
   - Create a user with `{ email: "test@example.com", passwordHash: "hashed", name: "Test" }`
   - Assert: document is saved, has `_id`, `createdAt`, `updatedAt` are set

2. **`it("rejects duplicate email")`**
   - Create a user with `email: "dupe@example.com"`
   - Attempt to create a second user with the same email
   - Assert: second create throws (MongoDB duplicate key error, code 11000)

3. **`it("rejects missing email")`**
   - Create a user without `email` field
   - Assert: validation error thrown

4. **`it("rejects missing passwordHash")`**
   - Create a user without `passwordHash` field
   - Assert: validation error thrown

5. **`it("rejects missing name")`**
   - Create a user without `name` field
   - Assert: validation error thrown

6. **`it("stores email as lowercase and trimmed")`**
   - Create a user with `email: "  ADMIN@Example.COM  "`
   - Assert: saved `email` is `"admin@example.com"`

7. **`it("hashPassword produces a valid bcrypt hash")`** (within `describe("password utilities")`)
   - Call `hashPassword("mypassword")`
   - Assert: result is a string starting with `"$2"` (bcrypt prefix) and has length > 50

8. **`it("verifyPassword returns true for correct password")`**
   - Hash `"mypassword"` then verify with the same plaintext
   - Assert: `verifyPassword` returns `true`

9. **`it("verifyPassword returns false for wrong password")`**
   - Hash `"mypassword"` then verify with `"wrongpassword"`
   - Assert: `verifyPassword` returns `false`

### `packages/server/test/models/project.model.test.ts`

**Purpose**: Tests for the Project model schema validation and field transforms.

**Imports**: Same pattern as user tests, but imports `ProjectModel` and `mongoose` (for generating owner ObjectId).

**Lifecycle hooks**: Same as user tests.

**Test cases** (within `describe("Project model")`):

1. **`it("creates a project with valid fields")`**
   - Create with `{ name: "Test Project", description: "A project", owner: new mongoose.Types.ObjectId().toString() }`
   - Assert: document is saved, has `_id`, `createdAt`, `updatedAt`

2. **`it("creates a project with only required fields")`**
   - Create with `{ name: "Minimal", owner: new mongoose.Types.ObjectId().toString() }`
   - Assert: `description` defaults to `""`

3. **`it("rejects missing name")`**
   - Attempt create without `name`
   - Assert: validation error

4. **`it("rejects missing owner")`**
   - Attempt create without `owner`
   - Assert: validation error

5. **`it("trims the name")`**
   - Create with `name: "  Spaced Name  "`
   - Assert: saved `name` is `"Spaced Name"`

### `packages/server/test/models/board.model.test.ts`

**Purpose**: Tests for the Board model unique project constraint and embedded column subdocuments.

**Imports**: Same pattern, imports `BoardModel`, `mongoose`.

**Lifecycle hooks**: Same as user tests.

**Test cases** (within `describe("Board model")`):

1. **`it("creates a board with columns linked to a project")`**
   - Create with `{ project: new mongoose.Types.ObjectId(), columns: [{ name: "To Do", position: 0 }, { name: "Done", position: 1 }] }`
   - Assert: document saved, `columns.length === 2`, each column has `_id`, `name`, `position`

2. **`it("rejects duplicate board for same project")`**
   - Create a board with a specific `project` ObjectId
   - Attempt to create a second board with the same `project`
   - Assert: duplicate key error (code 11000)

3. **`it("rejects missing project")`**
   - Attempt create without `project`
   - Assert: validation error

4. **`it("columns have auto-generated _id")`**
   - Create a board with one column `{ name: "Test", position: 0 }`
   - Assert: `board.columns[0]._id` is defined and is a valid ObjectId

5. **`it("rejects column without name")`**
   - Create a board with column `{ position: 0 }` (missing name)
   - Assert: validation error

6. **`it("rejects column without position")`**
   - Create a board with column `{ name: "Test" }` (missing position)
   - Assert: validation error

### `packages/server/test/models/task.model.test.ts`

**Purpose**: Tests for the Task model required fields, enum validation, defaults, and indexes.

**Imports**: Same pattern, imports `TaskModel`, `mongoose`, `PRIORITIES` from `@taskboard/shared`.

**Lifecycle hooks**: Same as user tests.

**Helper**: Create a local helper to generate valid task data with default required fields, to reduce boilerplate:

```typescript
function validTaskData(overrides: Record<string, unknown> = {}) {
  return {
    title: "Test Task",
    status: "To Do",
    board: new mongoose.Types.ObjectId(),
    project: new mongoose.Types.ObjectId(),
    ...overrides,
  };
}
```

**Test cases** (within `describe("Task model")`):

1. **`it("creates a task with all fields")`**
   - Create with full data including `title`, `description`, `status`, `priority: "high"`, `position: 2`, `dueDate: new Date()`, `labels: [new mongoose.Types.ObjectId()]`, `board`, `project`
   - Assert: all fields saved correctly

2. **`it("creates a task with only required fields and applies defaults")`**
   - Create with `validTaskData()` (only required fields)
   - Assert: `priority === "medium"`, `position === 0`, `description === ""`, `dueDate === null`, `labels` is empty array

3. **`it("rejects missing title")`**
   - Create with `validTaskData({ title: undefined })`
   - Assert: validation error

4. **`it("rejects missing status")`**
   - Create with `validTaskData({ status: undefined })`
   - Assert: validation error

5. **`it("rejects missing board")`**
   - Create with `validTaskData({ board: undefined })`
   - Assert: validation error

6. **`it("rejects missing project")`**
   - Create with `validTaskData({ project: undefined })`
   - Assert: validation error

7. **`it("rejects invalid priority value")`**
   - Create with `validTaskData({ priority: "critical" })`
   - Assert: validation error

8. **`it("accepts all valid priority values")`**
   - Loop over `PRIORITIES` (`["low", "medium", "high", "urgent"]`)
   - For each, create a task with that priority
   - Assert: each creates successfully

9. **`it("has index on board field")`**
   - Read `TaskModel.schema.path("board").options.index`
   - Assert: equals `true`

10. **`it("has index on project field")`**
    - Read `TaskModel.schema.path("project").options.index`
    - Assert: equals `true`

### `packages/server/test/models/comment.model.test.ts`

**Purpose**: Tests for the Comment model required fields and task index.

**Imports**: Same pattern, imports `CommentModel`, `mongoose`.

**Lifecycle hooks**: Same as user tests.

**Test cases** (within `describe("Comment model")`):

1. **`it("creates a comment with valid fields")`**
   - Create with `{ body: "A comment", task: new mongoose.Types.ObjectId(), author: new mongoose.Types.ObjectId() }`
   - Assert: document saved, has `_id`, `createdAt`, `updatedAt`

2. **`it("rejects missing body")`**
   - Attempt create without `body`
   - Assert: validation error

3. **`it("rejects missing task")`**
   - Attempt create without `task`
   - Assert: validation error

4. **`it("rejects missing author")`**
   - Attempt create without `author`
   - Assert: validation error

5. **`it("has index on task field")`**
   - Read `CommentModel.schema.path("task").options.index`
   - Assert: equals `true`

### `packages/server/test/models/label.model.test.ts`

**Purpose**: Tests for the Label model required fields and project index.

**Imports**: Same pattern, imports `LabelModel`, `mongoose`.

**Lifecycle hooks**: Same as user tests.

**Test cases** (within `describe("Label model")`):

1. **`it("creates a label with valid fields")`**
   - Create with `{ name: "Bug", color: "#ef4444", project: new mongoose.Types.ObjectId() }`
   - Assert: document saved, has `_id`, `createdAt`, `updatedAt`

2. **`it("rejects missing name")`**
   - Attempt create without `name`
   - Assert: validation error

3. **`it("rejects missing color")`**
   - Attempt create without `color`
   - Assert: validation error

4. **`it("rejects missing project")`**
   - Attempt create without `project`
   - Assert: validation error

5. **`it("has index on project field")`**
   - Read `LabelModel.schema.path("project").options.index`
   - Assert: equals `true`

### `packages/server/test/models/seed.test.ts`

**Purpose**: Tests for the `seedDefaultUser` function's idempotency and correctness.

**Imports**:
- `describe`, `it`, `expect`, `beforeAll`, `afterAll`, `beforeEach` from `vitest`
- `UserModel`, `verifyPassword` from `../../src/models/index.js`
- `seedDefaultUser` from `../../src/seed.js`
- `setupTestDb`, `teardownTestDb`, `clearCollections` from `../helpers/db.js`

**Lifecycle hooks**: Same as other tests.

**Test cases** (within `describe("seedDefaultUser")`):

1. **`it("creates admin user when no users exist")`**
   - Ensure the users collection is empty (`clearCollections` in `beforeEach`)
   - Call `seedDefaultUser()`
   - Assert: `UserModel.countDocuments()` returns 1
   - Fetch the user: `UserModel.findOne({ email: "admin@taskboard.local" })`
   - Assert: user exists, `name === "Admin"`, `passwordHash` is a non-empty string

2. **`it("does not create duplicate when users already exist")`**
   - Call `seedDefaultUser()` (creates the admin user)
   - Call `seedDefaultUser()` again
   - Assert: `UserModel.countDocuments()` still returns 1

3. **`it("created user has a valid password hash")`**
   - Call `seedDefaultUser()`
   - Fetch the user
   - Call `verifyPassword("admin123", user.passwordHash)`
   - Assert: returns `true`
   - Call `verifyPassword("wrongpassword", user.passwordHash)`
   - Assert: returns `false`

## 4. Contracts

### Test Database Helper

| Function | Input | Output | Side Effects |
|----------|-------|--------|-------------|
| `setupTestDb()` | None | `Promise<void>` | Opens Mongoose connection to `mongodb://localhost:27017/taskboard_test` |
| `teardownTestDb()` | None | `Promise<void>` | Drops `taskboard_test` database and closes Mongoose connection |
| `clearCollections()` | None | `Promise<void>` | Deletes all documents from all collections in the current database |

### Test Lifecycle Pattern (used in all test files)

```typescript
beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearCollections();
});
```

### Test Assertion Patterns

**Validation rejection** (for required fields and enum constraints):
```typescript
await expect(ModelName.create({ /* invalid data */ })).rejects.toThrow();
```

**Duplicate key rejection** (for unique constraints):
```typescript
try {
  await ModelName.create({ /* duplicate data */ });
  expect.fail("Should have thrown duplicate key error");
} catch (err: any) {
  expect(err.code).toBe(11000);
}
```

**Index verification** (for indexed fields):
```typescript
expect(ModelName.schema.path("fieldName").options.index).toBe(true);
```

## 5. Test Plan

### Test Setup
- Each test file connects to `mongodb://localhost:27017/taskboard_test` via the shared `setupTestDb()` helper
- Collections are cleared before each test (`beforeEach`) for complete isolation
- The test database is dropped on teardown (`afterAll`) to leave no artifacts

### Test Database Isolation
- The test database (`taskboard_test`) is completely separate from the dev database (`taskboard`)
- Tests never import `connectDb`/`disconnectDb` from `db.ts` — they use the test helper exclusively
- No data leakage between tests: `clearCollections()` in `beforeEach` ensures each test starts with an empty database

### Per-Test Specification Summary

| Test File | # Tests | Coverage |
|-----------|---------|----------|
| `user.model.test.ts` | 9 | Create, unique email (11000), 3 required fields, lowercase+trim, hashPassword, verifyPassword (correct), verifyPassword (wrong) |
| `project.model.test.ts` | 5 | Create with all fields, create with defaults, missing name, missing owner, name trimming |
| `board.model.test.ts` | 6 | Create with columns, duplicate project (11000), missing project, column auto-_id, column missing name, column missing position |
| `task.model.test.ts` | 10 | Create all fields, create with defaults, 4 missing required fields, invalid priority, all valid priorities, board index, project index |
| `comment.model.test.ts` | 5 | Create, missing body, missing task, missing author, task index |
| `label.model.test.ts` | 5 | Create, missing name, missing color, missing project, project index |
| `seed.test.ts` | 3 | Seed creates user, seed idempotent, password hash valid |
| **Total** | **43** | |

## 6. Implementation Order

1. **Create `packages/server/test/helpers/db.ts`** — Test database utilities (must exist before any model test file)
2. **Create `packages/server/test/models/user.model.test.ts`** — User model tests (no model dependencies)
3. **Create `packages/server/test/models/project.model.test.ts`** — Project model tests (no model dependencies beyond User for owner refs, but tests use raw ObjectIds)
4. **Create `packages/server/test/models/board.model.test.ts`** — Board model tests
5. **Create `packages/server/test/models/task.model.test.ts`** — Task model tests
6. **Create `packages/server/test/models/comment.model.test.ts`** — Comment model tests
7. **Create `packages/server/test/models/label.model.test.ts`** — Label model tests
8. **Create `packages/server/test/models/seed.test.ts`** — Seed script tests
9. **Run all tests** — Verify all 43 tests pass with zero failures

Note: The `vitest.config.ts` does NOT need modification. It already has `environment: "node"` and `passWithNoTests: true`, and Vitest's default test file discovery pattern (`**/*.test.ts`) will find all test files in `test/models/`.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compiles cleanly (test files use .ts and are run by vitest/tsx, not tsc, but ensure source still compiles)
npm run build -w @taskboard/server

# 2. Run all server tests (includes both existing app.test.ts and new model tests)
npm run test -w @taskboard/server

# 3. Run only the model tests (for targeted debugging if needed)
cd packages/server && npx vitest run test/models/

# 4. Run a specific test file (for debugging individual failures)
cd packages/server && npx vitest run test/models/user.model.test.ts

# 5. Run tests with verbose output to see all test names
cd packages/server && npx vitest run --reporter=verbose

# 6. Verify test count matches expectation (43 model/seed tests + 3 existing app tests = 46 total)
cd packages/server && npx vitest run --reporter=verbose 2>&1 | tail -5
```