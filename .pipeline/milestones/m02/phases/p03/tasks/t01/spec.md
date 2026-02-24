# Task 1: Create task route file with validation helpers and route registration

## Objective

Scaffold the task route file with validation utilities and register it in the Fastify app — establishing the foundation for all subsequent task endpoint implementations.

## Deliverables

### 1. New file: `packages/server/src/routes/task.routes.ts`

- **`isValidObjectId()`** utility function — same pattern used in existing route files (e.g., `board.routes.ts`)
- **`isValidCreateTaskBody(body)`** type guard:
  - `title` — required, must be a non-empty string
  - `description` — optional, string
  - `priority` — optional, must be one of `PRIORITIES` from `@taskboard/shared` if provided
  - `dueDate` — optional, valid date string
  - `labels` — optional, array of strings (ObjectId references)
  - `status` — optional, non-empty string
- **`isValidUpdateTaskBody(body)`** type guard:
  - At least one of `title`, `description`, `priority`, `dueDate`, `labels` must be present
  - Each field validated with correct type if present
  - `priority` must be one of `PRIORITIES` if provided
- **`isValidMoveTaskBody(body)`** type guard:
  - `position` — required, must be a non-negative integer
  - `status` — optional, non-empty string
- **Two exported Fastify plugins** (empty handlers, stubs only):
  - `boardTaskRoutes` — will be mounted at `/api/boards` (handles `GET /:boardId/tasks` and `POST /:boardId/tasks`)
  - `taskRoutes` — will be mounted at `/api/tasks` (handles `GET /:id`, `PUT /:id`, `DELETE /:id`, `PUT /:id/move`)

### 2. Modified file: `packages/server/src/app.ts`

- Import `boardTaskRoutes` and `taskRoutes` from `./routes/task.routes.ts`
- Register `boardTaskRoutes` with prefix `/api/boards`
- Register `taskRoutes` with prefix `/api/tasks`

## Key Constraints

- Follow existing route file patterns (see `board.routes.ts` for reference structure)
- Use `PRIORITIES` constant from `@taskboard/shared` for priority validation
- Stub handlers should return 501 or simply be empty plugin registrations — they will be filled in Tasks 2–5
- TypeScript strict mode; named exports only

## Dependencies

- None within this phase (this is the first task)
- Requires existing `@taskboard/shared` types and constants
- Requires existing `app.ts` plugin registration pattern

## Verification

1. `packages/server/src/routes/task.routes.ts` exists and compiles without errors
2. `packages/server/src/app.ts` imports and registers both plugins
3. The server starts successfully with `npm run dev` from the server package
4. Validation helpers correctly accept valid input and reject invalid input (verifiable via unit-level manual checks or future integration tests)