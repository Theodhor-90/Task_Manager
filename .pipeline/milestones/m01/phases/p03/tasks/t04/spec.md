## Objective

Write comprehensive integration tests for the authentication endpoints and middleware using Supertest against `buildApp()`.

## Deliverables

### New Files

- **`packages/server/test/routes/auth.routes.test.ts`** — Integration tests covering 8 test cases:
  1. **Login — valid credentials**: POST `/api/auth/login` with `admin@taskboard.local` / `admin123` returns 200, response has `data.token` (non-empty string) and `data.user` with correct `id`, `email`, `name`
  2. **Login — wrong password**: returns 401 with `{ error: "Invalid credentials" }`
  3. **Login — non-existent email**: returns 401 with `{ error: "Invalid credentials" }`
  4. **Login — missing fields**: returns 400 with `{ error: "Email and password are required" }`
  5. **Me — no token**: GET `/api/auth/me` returns 401
  6. **Me — invalid token**: GET `/api/auth/me` with `Authorization: Bearer garbage` returns 401
  7. **Me — valid token**: GET `/api/auth/me` with token from login response returns 200 with `{ data: { id, email, name } }`
  8. **Health — no auth required**: GET `/api/health` returns 200 without any token

## Key Implementation Details

- Tests use the existing `setupTestDb`, `teardownTestDb`, and `clearCollections` helpers from `test/helpers/db.ts`.
- Before tests run, seed a test user using `hashPassword()` and `UserModel.create()`.
- Tests are self-contained — they set up and tear down their own data.
- Use `supertest` (already installed) against the Fastify app from `buildApp()`.
- Use Vitest as the test runner (project convention).

## Dependencies

- **t01 (JWT and CORS Fastify Plugins)** — Plugins must be registered in the app.
- **t02 (Auth Middleware)** — Middleware must be active for auth enforcement tests.
- **t03 (Auth Routes)** — Login and me endpoints must be implemented.
- Phase 2 provides `hashPassword()`, `UserModel`, and test helpers.

## Verification Criteria

1. All 8 test cases pass when run with `npx vitest run` from the server package.
2. Tests properly clean up after themselves (no data leakage between test files).
3. No pre-existing tests are broken.