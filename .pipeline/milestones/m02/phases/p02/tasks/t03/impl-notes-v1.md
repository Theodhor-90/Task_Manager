Implemented Task 3 exactly per the locked plan.

### Changes made
1. Added `PUT /:boardId/columns/:columnId` in [board.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/board.routes.ts:138) with:
- `boardId`/`columnId` ObjectId validation (`400`)
- body name validation via existing `isValidCreateColumnBody` (`400`)
- board + ownership checks (`404 "Board not found"`)
- column lookup by `_id` (`404 "Column not found"`)
- rename of `column.name` only (no task status cascade)
- save + response `{ data: updatedColumn }` (`200`)

2. Updated tests in [board.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/board.routes.test.ts:6):
- Imported `TaskModel`
- Added `getColumnId` helper at [line 133](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/board.routes.test.ts:133)
- Added full `PUT /api/boards/:boardId/columns/:columnId` test suite at [line 426](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/board.routes.test.ts:426), including all 10 planned cases (success, validation errors, invalid IDs, not founds, unauthorized, and no status cascade)

### Verification run
- `cd packages/server && npx vitest run test/routes/board.routes.test.ts` ✅ (24 tests passed)
- `cd packages/server && npx vitest run` ✅ (124 tests passed)
- `cd packages/server && npx tsc --noEmit` ✅

No additional dependencies were required by the plan.