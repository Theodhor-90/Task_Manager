Implemented the locked-plan code changes in the expected server source path:

- Created [packages/server/src/db.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/db.ts) with:
  - `connectDb()` using `mongoose.connect(config.mongodbUri)` with log + rethrow on failure
  - `disconnectDb()` using `mongoose.disconnect()` with log
- Created/updated [packages/server/src/index.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/index.ts) to export:
  - `buildApp`, `config`, `Config`, `connectDb`, `disconnectDb`

Verification commands were executed as requested, but they did not pass due missing prerequisites in this branch:

1. `npm install mongoose -w @taskboard/server`  
   - Failed: no workspace `@taskboard/server` exists.
2. `npm run build -w @taskboard/server`  
   - Failed: same missing workspace.
3. `cd packages/server && npx tsx -e "import { connectDb, disconnectDb } ..."`  
   - Blocked by sandbox IPC permission error (`listen EPERM` on tsx pipe).
4. `cd packages/server && npx tsx -e "... await connectDb(); await disconnectDb(); ..."`  
   - Failed due top-level await in CJS eval mode.
5. `npm run test -w @taskboard/server`  
   - Failed: same missing workspace.

Additional blocker: the referenced spec files do not exist at the provided paths (`.pipeline/milestones/m01/phases/p02/tasks/t01/spec.md` and `.pipeline/milestones/m01/phases/p02/spec-locked.md`), and Phase 1 scaffold files assumed by the plan (e.g. `packages/server/package.json`, `packages/server/src/config.ts`) are missing in this branch.