Implemented the locked plan exactly for Task 1.

### Changes made
- Created [task.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/task.routes.ts) with:
  - `isValidObjectId`
  - `isValidCreateTaskBody`
  - `isValidUpdateTaskBody`
  - `isValidMoveTaskBody`
  - `boardTaskRoutes` plugin stubs:
    - `GET /:boardId/tasks` -> `501`
    - `POST /:boardId/tasks` -> `501`
  - `taskRoutes` plugin stubs:
    - `GET /:id` -> `501`
    - `PUT /:id/move` -> `501`
    - `PUT /:id` -> `501`
    - `DELETE /:id` -> `501`
- Updated [app.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/app.ts):
  - Imported `boardTaskRoutes`, `taskRoutes`
  - Registered:
    - `boardTaskRoutes` at `/api/boards`
    - `taskRoutes` at `/api/tasks`

### Verification run
- `cd packages/server && npx tsc --noEmit` passed.
- `npm run build --workspace=packages/server` passed.
- `cd packages/server && npm test` passed (`11` files, `146` tests).
- Startup check command from plan (`npx tsx src/server.ts`) failed in this environment due source ESM import resolution (`src/server.ts` imports `.js` path).
- Dist startup check also cannot fully run here due sandbox port binding restriction (`listen EPERM` on `0.0.0.0:3001`).

No dependencies were added (none specified in plan).