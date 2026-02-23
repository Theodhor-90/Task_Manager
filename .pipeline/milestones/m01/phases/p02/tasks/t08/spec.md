## Task: Model Integration Tests

### Objective
Create a comprehensive test suite for all models and the seed script, using a separate test database with proper setup/teardown.

### Deliverables
- **Create** `packages/server/test/helpers/db.ts` — test database setup and teardown utilities
- **Create** `packages/server/test/models/user.model.test.ts`
- **Create** `packages/server/test/models/project.model.test.ts`
- **Create** `packages/server/test/models/board.model.test.ts`
- **Create** `packages/server/test/models/task.model.test.ts`
- **Create** `packages/server/test/models/comment.model.test.ts`
- **Create** `packages/server/test/models/label.model.test.ts`
- **Create** `packages/server/test/models/seed.test.ts`
- **Modify** `packages/server/vitest.config.ts` if needed for test database configuration

### Implementation Details

**Test helpers** (`test/helpers/db.ts`):
- Use a separate test database (e.g., `taskboard_test` — configurable via `MONGODB_URI` env or a hardcoded test URI)
- Export `setupTestDb()` — connects to the test database before tests
- Export `teardownTestDb()` — drops the test database and disconnects after tests
- Export `clearCollections()` — clears all collections between tests for isolation
- Each test file should use `beforeAll`/`afterAll` for DB connection and `beforeEach`/`afterEach` for data cleanup

**Test coverage for each model**:
1. **User model tests**:
   - Create a user with valid fields — succeeds
   - Create user with duplicate email — rejected (unique constraint)
   - Create user with missing required fields (email, passwordHash, name) — rejected
   - Email is stored lowercase and trimmed
   - `hashPassword` produces a valid bcrypt hash
   - `verifyPassword` returns true for correct password, false for wrong password

2. **Project model tests**:
   - Create a project with valid fields — succeeds
   - Missing required `name` — rejected
   - Missing required `owner` — rejected
   - Name is trimmed on save

3. **Board model tests**:
   - Create a board with columns linked to a project — succeeds
   - Duplicate board for same project — rejected (unique constraint on `project`)
   - Columns are embedded subdocuments with `_id`, `name`, `position`

4. **Task model tests**:
   - Create a task with all fields — succeeds
   - Missing required `title` — rejected
   - Priority defaults to `'medium'`
   - Invalid priority value — rejected
   - Position defaults to 0

5. **Comment model tests**:
   - Create a comment with valid fields — succeeds
   - Missing required `body` — rejected
   - Missing required `task` — rejected

6. **Label model tests**:
   - Create a label with valid fields — succeeds
   - Missing required `name`, `color`, or `project` — rejected

7. **Seed script tests**:
   - Running seed when no users exist creates the admin user
   - Running seed when users already exist does nothing (idempotent)
   - The created user has correct email, name, and a valid password hash

### Dependencies
- **t01–t07**: All models, seed script, and DB connection module must be implemented
- Requires a running MongoDB instance for the test database
- Uses Vitest (`describe`, `it`, `expect`, `beforeAll`, `afterAll`, `beforeEach`)

### Verification Criteria
- `npm run test` (or `npx vitest`) in `packages/server` passes all model tests with zero failures
- Each model has CRUD coverage (create, read, update, delete)
- Required field validation is tested for every model
- Unique constraints are tested (User.email, Board.project)
- Seed idempotency is verified
- Test database is used (not the development database)
- Tests clean up after themselves (no data leakage between tests)