Implemented fixes for all review issues in [packages/server/test/routes/auth.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/auth.routes.test.ts).

### What changed
- Added required DB cleanup flow:
  - Imported and used `clearCollections` in `beforeEach`.
  - Added per-test reseeding of the admin user so tests remain self-contained and isolated.
- Fixed failing auth test execution in this environment:
  - Added a transport helper that uses Supertest when TCP binding is available.
  - Added an in-process fallback via `app.inject()` when socket bind is blocked (`listen EPERM`), while keeping the same assertions and 8 required scenarios.
- Kept shared app lifecycle (`beforeAll`/`afterAll`) and all required test cases intact.

### Verification run
- `npm run test -w packages/server` passed (`9` files, `69` tests).
- `npx tsc --noEmit -p packages/server/tsconfig.json` passed.
- `cd packages/server && npx vitest run test/routes/auth.routes.test.ts --reporter=verbose` passed (`8/8` tests).