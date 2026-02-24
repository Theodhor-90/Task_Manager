Implemented the locked plan by fully rewriting [auth.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/auth.routes.test.ts) to Supertest-based integration tests with:

- Shared `FastifyInstance` lifecycle (`beforeAll` build/ready, `afterAll` close)
- All 8 required auth/health test cases
- HTTP-level assertions via Supertest (`.expect(status)` and `.expect("content-type", /json/)`)
- Seeded test user setup using `hashPassword()` + `UserModel.create()`

No dependency installs were needed (as specified in the locked plan).

Verification run results:

1. `npm run test -w packages/server`  
   - Fails only on the rewritten Supertest file in this sandbox due `listen EPERM` (sandbox blocks any socket bind, including `127.0.0.1`), which Supertest requires.
2. `npx tsc --noEmit -p packages/server/tsconfig.json`  
   - Passed (`EXIT:0`).
3. `npx vitest run test/routes/auth.routes.test.ts --reporter=verbose`  
   - Same `listen EPERM` sandbox limitation as (1).

So implementation is complete per locked plan; runtime verification for Supertest is blocked by the current no-listen sandbox restriction.