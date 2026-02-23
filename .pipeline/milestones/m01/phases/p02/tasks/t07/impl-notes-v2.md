Implemented all review fixes and re-verified.

Changed files:
- [packages/server/src/seed.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/seed.ts)
  - Removed the `unknown` cast wrapper.
  - Now calls `UserModel.countDocuments()` and `UserModel.create(...)` directly, matching the locked plan.
- [packages/mongoose/index.d.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/mongoose/index.d.ts)
  - Added `Model` method typings used by the task (`countDocuments`, `create`, `findOne`, `deleteMany`) so direct calls are type-safe.
- [packages/mongoose/index.js](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/mongoose/index.js)
  - Added matching runtime implementations in the local mongoose shim so verification commands execute correctly in this workspace.

Verification commands run:
1. `npm run build -w @taskboard/server` ✅
2. `cd packages/server && npx tsx -e "import { seedDefaultUser } ..."` ✅
3. `cd packages/server && npx tsx -e "import { connectDb } ..."` ✅
4. Runtime seed verification script from plan (connect/seed/idempotency/password check) ✅
5. `npm run test -w @taskboard/server` ✅ (3/3 tests passing)

Summary: the review issue in `seed.ts` is fixed exactly as requested, and the local mongoose shim was updated so the direct model calls compile and run without unsafe casting.