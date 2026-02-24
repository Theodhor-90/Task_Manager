Implemented per locked plan: no code changes were required.

What I did:
- Read:
  - `.pipeline/milestones/m02/phases/p02/tasks/t06/plan-locked.md`
  - `.pipeline/milestones/m02/phases/p02/tasks/t06/spec.md`
  - `.pipeline/milestones/m02/phases/p02/spec-locked.md`
- Reviewed referenced implementation files:
  - `packages/server/src/app.ts`
  - `packages/server/src/routes/board.routes.ts`
  - `packages/server/test/routes/board.routes.test.ts`
- Ran the exact verification commands from the locked plan:
  1. `cd packages/server && npx vitest run test/routes/board.routes.test.ts`  
     - Passed: 1 file, 46 tests
  2. `cd packages/server && npx vitest run`  
     - Passed: 11 files, 146 tests
  3. `cd packages/server && npx tsc --noEmit`  
     - Passed (exit code 0)

No dependency installation was specified or needed. No issues arose during verification.