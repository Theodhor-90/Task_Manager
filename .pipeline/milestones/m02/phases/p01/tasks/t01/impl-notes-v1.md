Implemented the locked plan end-to-end.

### What I changed

- Created project routes in [project.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/project.routes.ts#L1):
  - `POST /api/projects` with request validation, project creation, default board creation from `DEFAULT_COLUMNS`, rollback on board-create failure, and `201 { data: project }`
  - `GET /api/projects` with owner scoping and `createdAt` descending sort
- Registered routes in [app.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/app.ts#L7) at `/api/projects`
- Extended mongoose test-double in [mongoose.test-double.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/helpers/mongoose.test-double.ts#L68):
  - Added `find(...).sort(...).select().lean()` chain support with awaitable query
  - Added compare normalization for serialized ObjectId-like values
- Added integration tests in [project.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/project.routes.test.ts#L1):
  - 11 tests for `POST /api/projects` and `GET /api/projects` (success + validation + auth + sort + board auto-create)
- Fixed one existing flaky auth middleware test so verification passes reliably:
  - Updated tampered-token construction in [app.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/app.test.ts#L153)

### Verification run

Executed all required commands from the locked plan:

1. `cd packages/server && npm run build` ✅
2. `cd packages/server && npm test` ✅ (80/80 tests passing)
3. `cd packages/server && npx vitest run test/routes/project.routes.test.ts` ✅ (11/11)
4. `cd packages/server && npx vitest run test/routes/auth.routes.test.ts` ✅ (8/8)
5. `cd packages/server && npx vitest run test/app.test.ts` ✅ (12/12)
6. Health smoke test command ✅  
   - Output: `200 { status: 'ok', defaultColumns: [ 'To Do', 'In Progress', 'In Review', 'Done' ] }`