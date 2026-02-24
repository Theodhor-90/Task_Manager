Implemented fixes for all review issues.

- Updated login input validation in [auth.routes.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/src/routes/auth.routes.ts:1):
1. Added `LoginRequest`-aligned type guard `isValidLoginRequest(body: unknown)`.
2. Prevented unsafe destructuring from `request.body` when body is missing.
3. Enforced `email` and `password` are non-empty strings before auth logic.
4. Kept required error behavior: `400 { error: "Email and password are required" }`.

- Expanded validation coverage in [auth.routes.test.ts](/Users/theodhor/Desktop/Portfolio/Task_Manager/packages/server/test/routes/auth.routes.test.ts:74):
1. `POST /api/auth/login` with `{}` -> `400`.
2. `POST /api/auth/login` with no body -> `400` (prevents prior 500 case).
3. `POST /api/auth/login` with non-string credentials -> `400`.

Verification run results:
1. `npm run test -w packages/server` passed (`9` files, `69` tests).
2. `npx tsc --noEmit -p packages/server/tsconfig.json` passed.
3. `npm run dev` could not be fully verified in this sandbox (port bind `EPERM` on `127.0.0.1:5173` from client dev server).
4. `npm run dev -w @taskboard/server` also blocked here (port bind `EPERM` on `0.0.0.0:3001`).

So code/test/typecheck fixes are complete and aligned with the locked plan; only live curl verification is environment-blocked by sandbox networking limits.