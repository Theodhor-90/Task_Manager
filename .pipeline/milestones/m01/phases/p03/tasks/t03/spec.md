## Objective

Implement the login endpoint (`POST /api/auth/login`) and the verification endpoint (`GET /api/auth/me`) as a Fastify route plugin.

## Deliverables

### New Files

- **`packages/server/src/routes/auth.routes.ts`** — Exports a Fastify plugin that registers:
  - **`POST /api/auth/login`**:
    - Accepts `{ email: string, password: string }` (validated per `LoginRequest` from shared types)
    - Looks up user by email (case-insensitive, handled by model's `lowercase: true`)
    - Calls `verifyPassword(password, user.passwordHash)` from `user.model.ts`
    - On success: signs a JWT with payload `{ id: user._id, email: user.email, name: user.name }` and returns `{ data: { token, user: { id, email, name } } }` with status 200
    - On failure (wrong password or user not found): returns `{ error: "Invalid credentials" }` with status 401
    - Rejects empty/missing email or password with `{ error: "Email and password are required" }` and status 400
  - **`GET /api/auth/me`**:
    - Protected by auth middleware (not in allow-list)
    - Returns `{ data: { id, email, name } }` from `request.user`

### Modified Files

- **`packages/server/src/app.ts`** — Register auth routes under `/api/auth` prefix.

## Key Implementation Details

- Login endpoint conforms to `LoginRequest` / `LoginResponse` types from `@taskboard/shared`.
- Uses existing `verifyPassword()` utility from Phase 2 — no new crypto logic.
- JWT payload contains `{ id, email, name }` — no sensitive data (no passwordHash).
- `GET /api/auth/me` returns the authenticated user's public profile, useful for client-side token validation on app mount.
- Response envelope follows MASTER_PLAN §3.2: `{ data: T }` for success, `{ error: string }` for failure.

## Dependencies

- **t01 (JWT and CORS Fastify Plugins)** — `app.jwt.sign()` must be available for generating tokens.
- **t02 (Auth Middleware)** — `request.user` must be populated for the `/me` endpoint.
- Phase 2 provides `UserModel`, `verifyPassword()`, and `hashPassword()`.

## Verification Criteria

1. `POST /api/auth/login` with `admin@taskboard.local` / `admin123` returns 200 with `{ data: { token, user: { id, email, name } } }`.
2. `POST /api/auth/login` with wrong password returns 401 with `{ error: "Invalid credentials" }`.
3. `POST /api/auth/login` with non-existent email returns 401 with `{ error: "Invalid credentials" }`.
4. `POST /api/auth/login` with missing fields returns 400 with `{ error: "Email and password are required" }`.
5. `GET /api/auth/me` with valid token returns 200 with `{ data: { id, email, name } }`.
6. `GET /api/auth/me` without token returns 401.