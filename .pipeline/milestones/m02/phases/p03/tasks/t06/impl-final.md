Implemented exactly per the locked plan.

### Changes made
- Updated the Mongoose test double in [mongoose.test-double.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/helpers/mongoose.test-double.ts):
  - Added `$ne` support in `matches`.
  - Added `$gte` support in `matches`.
  - Added scalar-vs-array containment matching (so `{ labels: "<id>" }` matches array fields).
  - Reworked `findOne` to return a thenable query object with `.populate(field)` support.

- Created full task integration tests in [task.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/task.routes.test.ts):
  - 6 suites covering all task endpoints:
    - `POST /api/boards/:boardId/tasks`
    - `GET /api/boards/:boardId/tasks`
    - `GET /api/tasks/:id`
    - `PUT /api/tasks/:id`
    - `DELETE /api/tasks/:id`
    - `PUT /api/tasks/:id/move`
  - Includes success paths, validation/auth/error paths, sorting/filtering, move/reindex behavior, and comment cascade delete checks.
  - Includes timestamp delay handling for `createdAt` sort tests.

### Verification run (all passed)
- `cd packages/server && npx tsc --noEmit`
- `cd packages/server && npm test`
- `cd packages/server && npx vitest run test/routes/task.routes.test.ts`
- `cd packages/server && npx vitest run test/routes/project.routes.test.ts`
- `cd packages/server && npx vitest run test/routes/board.routes.test.ts`
- `npm run build --workspace=packages/server`