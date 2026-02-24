Changes made:
- Added updated implementation notes at [impl-notes-v2.md](/Users/theodhor/Desktop/Portfolio/Task_Manager/.pipeline/milestones/m01/phases/p03/tasks/t08/impl-notes-v2.md) documenting a full re-run and issue-by-issue status.

Verification re-run results:
- `npm run test -w packages/server`: passed (`9` files, `69` tests).
- `npx tsc --noEmit -p packages/server/tsconfig.json`: passed.
- `npx tsc --noEmit -p packages/client/tsconfig.json`: passed.
- `npm run build -w packages/client`: passed.
- `npm run dev`: failed with `listen EPERM ... 127.0.0.1:5173`.
- `npm run dev -w @taskboard/server`: failed with `listen EPERM ... 0.0.0.0:3001`.
- Direct socket bind probe (`net.createServer().listen(...)`) also returns `EPERM` in this sandbox.

What this means for review issues:
- I addressed the feedback by re-running required checks and recording concrete evidence.
- The remaining gaps (manual browser E2E + live curl against running dev server + dev start criterion) are still blocked by sandbox-level port binding restrictions, not code behavior.