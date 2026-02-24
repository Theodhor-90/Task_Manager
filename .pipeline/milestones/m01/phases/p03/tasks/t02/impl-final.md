Implemented Task 2 exactly per the locked plan.

### What I changed
- Created auth middleware plugin at [auth.middleware.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/middleware/auth.middleware.ts:1):
  - Added `@fastify/jwt` type augmentation for `request.user` (`id/email/name`)
  - Added allow-list for `POST /api/auth/login` and `GET /api/health`
  - Added global `onRequest` hook with `request.jwtVerify()` and `401 { error: "Unauthorized" }` on failure
- Updated app registration order in [app.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/app.ts:1):
  - Imported `authMiddleware`
  - Registered it after `jwtPlugin` and `corsPlugin`, before routes
- Added 5 middleware tests in [app.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/app.test.ts:92):
  - allow-listed health access without token
  - reject missing token
  - reject invalid token
  - accept valid token and verify `request.user`
  - reject tampered token

### Dependencies
- No new dependencies were required or installed (matches locked plan).

### Verification run
- `npm run test -w packages/server` passed (`8` test files, `61` tests)
- `npx tsc --noEmit -p packages/server/tsconfig.json` passed (exit code `0`)