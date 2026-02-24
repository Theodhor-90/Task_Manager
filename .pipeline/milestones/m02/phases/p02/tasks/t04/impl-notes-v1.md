Implemented exactly per the locked plan.

### What I changed
- Added `TaskModel` import and implemented `DELETE /:boardId/columns/:columnId` in [board.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/board.routes.ts):
  - Validates `boardId` and `columnId`
  - Verifies board exists and is owned by authenticated user
  - Verifies column exists
  - Guards deletion with `TaskModel.countDocuments({ board: boardId, status: column.name })`
  - Returns `400` with `Cannot delete column that contains tasks` when blocked
  - Deletes column, reindexes positions to contiguous `0..n-1`, saves board
  - Returns `200` with `{ data: { message: "Column deleted" } }`

- Added the full DELETE endpoint test suite (10 tests) in [board.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/board.routes.test.ts):
  - success case
  - task-guard failure
  - reindexing verification
  - invalid/non-existent board/column cases
  - unauthorized case
  - delete-after-moving-task case
  - sequential multi-delete case

### Verification run
- `cd packages/server && npx vitest run test/routes/board.routes.test.ts` passed (`34/34`)
- `cd packages/server && npx vitest run` passed (`134/134`)
- `cd packages/server && npx tsc --noEmit` passed

No dependency installation was required by the plan.