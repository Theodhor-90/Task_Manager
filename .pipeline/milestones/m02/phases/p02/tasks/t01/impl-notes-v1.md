Implemented Task 1 from the locked plan exactly.

**Changes made**
1. Added board routes file: [board.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/board.routes.ts)
- Implemented `GET /:projectId/board` in `boardRoutes`
- Added `isValidObjectId` helper pattern matching `project.routes.ts`
- Added `columnRoutes` stub export for future tasks

2. Updated app route registration: [app.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/app.ts)
- Imported `boardRoutes`
- Registered under `/api/projects` after `projectRoutes`

3. Added integration tests: [board.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/board.routes.test.ts)
- Added the 6 planned tests for `GET /api/projects/:projectId/board`
- Reused the same test infrastructure patterns as `project.routes.test.ts`

**Verification run**
1. `cd packages/server && npx vitest run test/routes/board.routes.test.ts` passed (6/6)
2. `cd packages/server && npx vitest run` passed (all tests, 106/106)
3. `cd packages/server && npx tsc --noEmit` passed
4. `cd packages/server && npm run dev` build succeeded, Mongo connected/seeded, but process could not bind port in this sandbox (`EPERM` on `0.0.0.0:3001`) so live startup could not complete in this environment.