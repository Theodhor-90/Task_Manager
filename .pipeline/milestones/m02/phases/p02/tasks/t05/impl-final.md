Implemented the locked plan for task `t05` exactly, with no extra features.

- Added `isValidReorderBody` and the new `PUT /:boardId/columns/reorder` handler in [board.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/board.routes.ts:61), registered before `/:columnId` routes as required ([route start](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/board.routes.ts:164)).
- Added `getColumnIds` helper in tests at [board.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/board.routes.test.ts:150).
- Added full reorder endpoint integration coverage (12 tests) in [board.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/board.routes.test.ts:880).

Verification commands run and passing:

1. `cd packages/server && npx vitest run test/routes/board.routes.test.ts` (passed, 46 tests)
2. `cd packages/server && npx vitest run` (passed, 146 tests)
3. `cd packages/server && npx tsc --noEmit` (passed)

No new dependencies were needed by the plan.