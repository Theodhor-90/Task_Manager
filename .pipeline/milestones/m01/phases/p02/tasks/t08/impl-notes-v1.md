Implemented task `t08` end-to-end per the locked plan, created all requested test files, and ran all verification commands successfully.

### Added files
- [packages/server/test/helpers/db.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/helpers/db.ts)
- [packages/server/test/models/user.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/user.model.test.ts)
- [packages/server/test/models/project.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/project.model.test.ts)
- [packages/server/test/models/board.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/board.model.test.ts)
- [packages/server/test/models/task.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/task.model.test.ts)
- [packages/server/test/models/comment.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/comment.model.test.ts)
- [packages/server/test/models/label.model.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/label.model.test.ts)
- [packages/server/test/models/seed.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/models/seed.test.ts)

### Additional fix required during verification
To make the planned tests executable in this repository’s local `mongoose` workspace shim, I made a compatibility update in:
- [packages/mongoose/index.js](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/mongoose/index.js)

This added missing runtime features used by the tests (`Schema.path`, validations/defaults/transforms, unique constraint behavior, collection cleanup hooks, `dropDatabase`, and `ObjectId.isValid`).

### Verification run results
All required commands from the plan were executed and passed:
1. `npm run build -w @taskboard/server` ✅
2. `npm run test -w @taskboard/server` ✅ (46/46)
3. `cd packages/server && npx vitest run test/models/` ✅ (43/43)
4. `cd packages/server && npx vitest run test/models/user.model.test.ts` ✅ (9/9)
5. `cd packages/server && npx vitest run --reporter=verbose` ✅ (46/46)
6. `cd packages/server && npx vitest run --reporter=verbose 2>&1 | tail -5` ✅ (shows 46/46)