## Phase 2: Database & Models

### Goal

Connect to MongoDB via Mongoose and implement all seven data models (User, Project, Board, Column, Task, Comment, Label) with proper schemas, validation, indexes, and relationships. Create a seed script that inserts a default admin user on first server start when no users exist.

### Deliverables

1. **`packages/server/src/db.ts`** — MongoDB connection function using Mongoose, configurable via `MONGODB_URI` environment variable, with connection error handling and logging
2. **Mongoose models** in `packages/server/src/models/`:
   - `user.model.ts` — email (unique, required, lowercase, trimmed), passwordHash (required), name (required), timestamps. Pre-save hook or utility to hash passwords with bcrypt (use `bcryptjs` pure-JS fallback if native build issues arise).
   - `project.model.ts` — name (required, trimmed), description (optional), owner (ObjectId ref → User), timestamps
   - `board.model.ts` — project (ObjectId ref → Project, unique index for 1:1), columns as embedded subdocument array (each with `_id`, `name`, `position`), timestamps
   - `task.model.ts` — title (required), description (optional), status (required, string matching column name), priority (enum: `low`/`medium`/`high`/`urgent`, default `medium`), position (number, default 0), dueDate (optional Date), labels (ObjectId[] ref → Label), board (ObjectId ref → Board, indexed), project (ObjectId ref → Project, indexed), timestamps
   - `comment.model.ts` — body (required), task (ObjectId ref → Task, indexed), author (ObjectId ref → User), timestamps
   - `label.model.ts` — name (required), color (required, hex string), project (ObjectId ref → Project, indexed), timestamps
3. **`packages/server/src/seed.ts`** — function that checks if any users exist; if not, creates the default user `{ email: "admin@taskboard.local", password: "admin123", name: "Admin" }` with a bcrypt-hashed password. Called during server startup.
4. **Model tests** in `packages/server/test/` verifying:
   - Each model can create, read, update, and delete a document
   - Required field validation rejects missing fields
   - Unique constraints are enforced (e.g., duplicate email)
   - The seed function creates a user only when no users exist (idempotent)

### Technical Decisions & Constraints

- All entity interfaces come from `packages/shared/src/types/` (defined in Phase 1)
- Indexes on frequently queried fields: `User.email` (unique), `Board.project` (unique), `Task.board`, `Task.project`, `Label.project`, `Comment.task`
- Column is an embedded subdocument within Board (not a separate collection)
- Default columns on board creation: `["To Do", "In Progress", "In Review", "Done"]`
- Use a separate test database (e.g., `taskboard_test`) for model tests; each test file sets up and tears down its own data
- Password hashing with bcrypt; prefer `bcryptjs` (pure JavaScript) if native `bcrypt` build fails
- Database field naming: camelCase (Mongoose handles `_id`)

### Dependencies

- **Phase 1 (Monorepo & Dev Environment)** must be complete — the server package scaffold, shared types, Vitest config, and build tooling must be in place
- Requires a running MongoDB instance accessible locally (or via Docker)

### Phase Completion Gate

Phase is complete when: all seven Mongoose models compile and can perform basic CRUD operations as verified by passing tests, required field validation and unique constraints are enforced, the seed script creates the admin user on first run and is idempotent on subsequent runs, and `npm run test` passes all model tests with zero failures.