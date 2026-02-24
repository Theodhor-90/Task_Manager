Implemented Task t02 exactly in the planned files:

- Added `POST /:boardId/columns` in [board.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/board.routes.ts:61), including:
  - `boardId` ObjectId validation
  - request body type guard `isValidCreateColumnBody`
  - board existence + owner verification through project lookup
  - append behavior with next `position`
  - `201 { data: newColumn }` response
- Registered column routes in [app.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/app.ts:7) under `/api/boards`.
- Added the full `POST /api/boards/:boardId/columns` integration test block (8 tests) in [board.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/board.routes.test.ts:250).

No new dependencies were required by the locked plan.

Verification run results (all passing):

1. `cd packages/server && npx vitest run test/routes/board.routes.test.ts`
2. `cd packages/server && npx vitest run`
3. `cd packages/server && npx tsc --noEmit`