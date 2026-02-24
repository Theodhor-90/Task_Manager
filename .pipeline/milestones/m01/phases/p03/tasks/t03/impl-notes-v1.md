Implemented `t03` per the locked plan.

### Changes made
- Created auth routes plugin: [auth.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/auth.routes.ts)
  - `POST /login`:
    - validates `email` + `password`
    - finds user by email
    - verifies password via `verifyPassword`
    - returns `401 { error: "Invalid credentials" }` on auth failure
    - returns `400 { error: "Email and password are required" }` on missing fields
    - signs JWT with `{ id, email, name }`
    - returns `{ data: { token, user: { id, email, name } } }`
  - `GET /me`:
    - returns `{ data: { id, email, name } }` from `request.user`
- Updated app registration: [app.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/app.ts)
  - imported `authRoutes`
  - registered with `await app.register(authRoutes, { prefix: "/api/auth" })`
- Added integration tests: [auth.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/auth.routes.test.ts)
  - all 8 required cases implemented.

### Dependency install
- No new dependencies installed (as planned).

### Verification run
- `npm run test -w packages/server` ✅ passed (`9` files, `69` tests).
- `npx tsc --noEmit -p packages/server/tsconfig.json` ✅ passed.
- `npm run dev` / manual `curl` checks ❌ blocked by sandbox port restrictions:
  - `EPERM` on `127.0.0.1:5173` (client)
  - `EPERM` on `0.0.0.0:3001` (server)

I fixed one TypeScript issue during verification by adding a minimal local cast for `user._id` in the auth route so strict compile succeeds without changing broader model typings.