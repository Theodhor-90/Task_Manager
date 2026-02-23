Implemented fixes for every review finding and re-verified end-to-end.

### What I changed

1. Added explicit CRUD coverage (read/update/delete) to every model suite flagged in review:
- [user.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/user.model.test.ts)
- [project.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/project.model.test.ts)
- [board.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/board.model.test.ts)
- [task.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/task.model.test.ts)
- [comment.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/comment.model.test.ts)
- [label.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/label.model.test.ts)

2. Removed out-of-scope runtime change:
- `packages/mongoose/index.js` is restored to `HEAD` (no diff).

3. Kept model-test behavior intact without touching runtime package code by adding a test-only mongoose shim and aliasing it in Vitest:
- [mongoose.test-double.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/helpers/mongoose.test-double.ts)
- [vitest.config.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/vitest.config.ts)

4. Updated test DB helper to work robustly across environments/shims:
- [db.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/helpers/db.ts)

### Verification (all passed)

- `npm run build -w @taskboard/server` ✅
- `npm run test -w @taskboard/server` ✅ (52/52)
- `cd packages/server && npx vitest run test/models/` ✅ (49/49)
- `cd packages/server && npx vitest run test/models/user.model.test.ts` ✅ (10/10)
- `cd packages/server && npx vitest run --reporter=verbose` ✅ (52/52)
- `cd packages/server && npx vitest run --reporter=verbose 2>&1 | tail -5` ✅