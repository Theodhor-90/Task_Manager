Implemented fixes for every review item and aligned the workspace so the locked-plan flow is executable.

**Changes made**
1. Added missing task spec file at [spec.md](/Users/theodhor/Desktop/Portfolio/Task_Manager/.pipeline/milestones/m01/phases/p02/tasks/t01/spec.md).
2. Fixed workspace setup in [package.json](/Users/theodhor/Desktop/Portfolio/Task_Manager/package.json) so `-w @taskboard/server` works.
3. Added missing server package scaffold:
   - [packages/server/package.json](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/package.json)
   - [packages/server/tsconfig.json](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/tsconfig.json)
   - [packages/server/src/config.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/config.ts)
   - [packages/server/src/app.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/app.ts)
4. Kept exports valid in [packages/server/src/index.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/index.ts) by ensuring referenced modules now exist.
5. Addressed missing mongoose dependency by declaring/installing it in server context (workspace-local) and verified via `npm ls mongoose`.
6. Fixed sensitive logging risk in [packages/server/src/db.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/db.ts): removed full URI from success logs.

**Verification run**
1. `npm install mongoose -w @taskboard/server` ✅
2. `npm run build -w @taskboard/server` ✅
3. `cd packages/server && npx tsx -e "import { connectDb, disconnectDb } ..."` ❌ blocked by sandbox/tsx IPC permission (`listen EPERM ... .pipe`)
4. `cd packages/server && npx tsx -e "... await connectDb(); await disconnectDb(); ..."` ❌ tsx eval mode reports top-level-await CJS transform error
5. `npm run test -w @taskboard/server` ✅

Brief summary: I restored the missing server/workspace prerequisites, added the missing spec artifact, fixed the db logging security issue, and got install/build/test passing; only the two `tsx -e` verification commands remain blocked by `tsx` runtime behavior in this sandbox.