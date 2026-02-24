Now I have complete understanding of the codebase. Let me produce the phase specification.

# Phase 3: Authentication — Specification

## Goal

Implement the complete JWT-based authentication system spanning server and client. This phase delivers two Fastify plugins (JWT and CORS), auth middleware that protects all non-login API routes, a login endpoint (`POST /api/auth/login`) and a verification endpoint (`GET /api/auth/me`), a client-side API utility with automatic token injection, an auth context with login/logout state management, a login page with form validation and error handling, protected route guards, and a placeholder dashboard confirming end-to-end auth flow — all backed by integration tests.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| JWT storage | `localStorage` | Simplest approach for single-user MVP; no CSRF concerns with bearer tokens. Acceptable tradeoff for local-only deployment. |
| Token expiry | 24 hours | Per MASTER_PLAN §3.3. Long enough for daily use, short enough to limit stale tokens. |
| JWT secret source | `config.jwtSecret` from `JWT_SECRET` env var with dev fallback | Already defined in `packages/server/src/config.ts` — reuse existing config. |
| Verification endpoint | `GET /api/auth/me` | Provides a concrete protected route for testing auth middleware without depending on resource endpoints that don't exist yet. Also used by the client to validate stored tokens on app mount. |
| Auth middleware scope | Applied globally to `/api/*` routes, with an explicit allow-list for unauthenticated routes (`POST /api/auth/login`, `GET /api/health`) | Secure-by-default: new routes are automatically protected. |
| CORS origin | `http://localhost:5173` (Vite default) configurable via `CORS_ORIGIN` env var | Allows client-server communication during development. |
| Password validation | Delegates to existing `verifyPassword()` in `user.model.ts` | Already implemented with bcryptjs in Phase 2 — no new crypto logic needed. |
| Response envelope | `{ data: T }` for success, `{ error: string }` for failure | Per MASTER_PLAN §3.2 and existing shared types (`ApiSuccessResponse`, `ApiErrorResponse`). |
| Global 401 handling | Client API utility intercepts 401 responses, clears auth state, redirects to `/login` | Ensures expired/invalid tokens don't leave the user in a broken state. |
| Client page structure | Extract pages into `pages/` directory, contexts into `context/` | Follows MASTER_PLAN §3.1 directory structure. Placeholder pages currently inline in `App.tsx` will be moved to dedicated files. |

## Tasks

### Task 1: JWT and CORS Fastify Plugins

**Deliverables:**
- `packages/server/src/plugins/jwt.plugin.ts` — Registers `@fastify/jwt` on the Fastify instance using `config.jwtSecret` from the existing config module. Configures token expiry to `24h`. Exports the plugin registration function.
- `packages/server/src/plugins/cors.plugin.ts` — Registers `@fastify/cors` allowing origin from `CORS_ORIGIN` env var (default: `http://localhost:5173`), with credentials support enabled.
- Update `packages/server/src/app.ts` — Import and register both plugins in `buildApp()`.

**Contracts:**
- After plugin registration, `app.jwt.sign(payload)` and `request.jwtVerify()` are available on the Fastify instance/request.
- CORS headers are present on all responses to allowed origins.

---

### Task 2: Auth Middleware

**Deliverables:**
- `packages/server/src/middleware/auth.middleware.ts` — Exports an `onRequest` hook function that:
  1. Skips authentication for allow-listed routes: `POST /api/auth/login` and `GET /api/health`
  2. Reads the `Authorization` header, extracts the bearer token
  3. Calls `request.jwtVerify()` to validate the token
  4. Attaches the decoded user payload (`{ id, email, name }`) to the request object (via Fastify request decorator)
  5. Returns `401 { error: "Unauthorized" }` if the token is missing, malformed, or invalid
- Update `packages/server/src/app.ts` — Register the auth middleware as a global `onRequest` hook after plugin registration.
- Add Fastify type augmentation so `request.user` is typed as `{ id: string; email: string; name: string }`.

**Contracts:**
- All routes under `/api/*` except the allow-listed paths require a valid `Authorization: Bearer <token>` header.
- After middleware runs, `request.user` contains `{ id, email, name }` for use by downstream route handlers.

---

### Task 3: Auth Routes (Login + Me)

**Deliverables:**
- `packages/server/src/routes/auth.routes.ts` — Exports a Fastify plugin that registers:
  - `POST /api/auth/login`:
    - Accepts `{ email: string, password: string }` (validated per `LoginRequest` from shared types)
    - Looks up user by email (case-insensitive, handled by model's `lowercase: true`)
    - Calls `verifyPassword(password, user.passwordHash)` from `user.model.ts`
    - On success: signs a JWT with payload `{ id: user._id, email: user.email, name: user.name }` and returns `{ data: { token, user: { id, email, name } } }` with status 200
    - On failure (wrong password or user not found): returns `{ error: "Invalid credentials" }` with status 401
    - Rejects empty/missing email or password with `{ error: "Email and password are required" }` and status 400
  - `GET /api/auth/me`:
    - Protected by auth middleware (not in allow-list)
    - Returns `{ data: { id, email, name } }` from `request.user`
- Update `packages/server/src/app.ts` — Register auth routes under `/api/auth` prefix.

**Contracts:**
- Login endpoint conforms to `LoginRequest` / `LoginResponse` types from `@taskboard/shared`.
- `GET /api/auth/me` returns the authenticated user's public profile (no passwordHash).

---

### Task 4: Server-Side Auth Integration Tests

**Deliverables:**
- `packages/server/test/routes/auth.routes.test.ts` — Integration tests using Supertest against `buildApp()`:
  1. **Login — valid credentials**: POST `/api/auth/login` with `admin@taskboard.local` / `admin123` returns 200, response has `data.token` (non-empty string) and `data.user` with correct `id`, `email`, `name`
  2. **Login — wrong password**: returns 401 with `{ error: "Invalid credentials" }`
  3. **Login — non-existent email**: returns 401 with `{ error: "Invalid credentials" }`
  4. **Login — missing fields**: returns 400 with `{ error: "Email and password are required" }`
  5. **Me — no token**: GET `/api/auth/me` returns 401
  6. **Me — invalid token**: GET `/api/auth/me` with `Authorization: Bearer garbage` returns 401
  7. **Me — valid token**: GET `/api/auth/me` with token from login response returns 200 with `{ data: { id, email, name } }`
  8. **Health — no auth required**: GET `/api/health` returns 200 without any token
- Tests use the existing `setupTestDb`, `teardownTestDb`, and `clearCollections` helpers from `test/helpers/db.ts`.
- Before tests run, seed a test user using `hashPassword` and `UserModel.create()`.

**Contracts:**
- All 8 test cases pass. Tests are self-contained — they set up and tear down their own data.

---

### Task 5: Client API Utility

**Deliverables:**
- `packages/client/src/api/client.ts` — Exports:
  - `API_BASE_URL` constant: `http://localhost:3001` (or from `import.meta.env.VITE_API_URL`)
  - `apiClient` object or set of functions providing:
    - `get<T>(path: string): Promise<T>` — GET request with auth header
    - `post<T>(path: string, body: unknown): Promise<T>` — POST request with auth header
    - `put<T>(path: string, body: unknown): Promise<T>` — PUT request with auth header
    - `del<T>(path: string): Promise<T>` — DELETE request with auth header
  - Each method reads the JWT from `localStorage` (key: `taskboard_token`), sets `Authorization: Bearer <token>` header if present, sets `Content-Type: application/json`
  - On non-2xx responses: throws an error with the `error` field from the response body (or a generic message)
  - On 401 responses specifically: clears `taskboard_token` from `localStorage` and redirects to `/login` via `window.location.href`
- `packages/client/src/api/auth.ts` — Exports:
  - `login(email: string, password: string): Promise<LoginResponse>` — calls `POST /api/auth/login`
  - `getMe(): Promise<ApiSuccessResponse<{ id: string; email: string; name: string }>>` — calls `GET /api/auth/me`

**Contracts:**
- All API calls go through the shared client, ensuring consistent auth header injection and error handling.
- Token key in localStorage is `taskboard_token` (used consistently across API client and auth context).

---

### Task 6: Auth Context and Route Guards

**Deliverables:**
- `packages/client/src/context/auth-context.tsx` — Exports:
  - `AuthProvider` component — wraps children, manages auth state:
    - State: `user: { id, email, name } | null`, `token: string | null`, `isLoading: boolean`
    - On mount: checks `localStorage` for `taskboard_token`; if present, calls `GET /api/auth/me` to validate and populate user state; if validation fails, clears token
    - `login(email, password)`: calls the login API, stores token in `localStorage`, sets user state
    - `logout()`: clears token from `localStorage`, sets user to null, navigates to `/login`
    - `isAuthenticated`: derived boolean (`user !== null && token !== null`)
  - `useAuth()` hook — returns the auth context value; throws if used outside `AuthProvider`
- `packages/client/src/components/protected-route.tsx` — Exports:
  - `ProtectedRoute` component — checks `isAuthenticated` from auth context:
    - If loading (token validation in progress): renders a loading indicator
    - If authenticated: renders `<Outlet />`
    - If not authenticated: redirects to `/login` via `<Navigate to="/login" />`

**Contracts:**
- `AuthProvider` wraps the entire app in `main.tsx` (inside `BrowserRouter`).
- All routes except `/login` are nested under `<ProtectedRoute />`.

---

### Task 7: Login Page and Placeholder Dashboard

**Deliverables:**
- `packages/client/src/pages/login-page.tsx` — Full login page:
  - Form with email and password `<input>` fields, submit button
  - Calls `login()` from auth context on submit
  - Displays error message on failed login (from API error response)
  - Disables submit button and shows loading state during request
  - On success, redirects to `/` (dashboard)
  - If already authenticated, redirects to `/` immediately
  - Styled with Tailwind CSS — centered card layout, clean form styling
- `packages/client/src/pages/dashboard-page.tsx` — Placeholder dashboard:
  - Displays welcome message with user's name from auth context (e.g., "Welcome, Admin")
  - Logout button that calls `logout()` from auth context
  - Styled with Tailwind CSS
- `packages/client/src/pages/board-page.tsx` — Move existing placeholder board page to its own file (keeps current content)
- Update `packages/client/src/App.tsx`:
  - Import pages from `pages/` directory
  - Wrap `AuthProvider` around router
  - Configure routes: `/login` as public, all other routes nested under `<ProtectedRoute />`

**Contracts:**
- Login page renders at `/login` and is accessible without authentication.
- Dashboard renders at `/` and requires authentication.
- Board page renders at `/projects/:id/board` and requires authentication.
- Logout returns user to the login page and clears all auth state.

---

### Task 8: End-to-End Smoke Verification and Cleanup

**Deliverables:**
- Verify the full auth flow works end-to-end:
  1. Server starts, seed user exists
  2. Client navigates to `/` → redirected to `/login`
  3. Login with `admin@taskboard.local` / `admin123` → redirected to dashboard
  4. Dashboard shows "Welcome, Admin" and logout button
  5. Refresh page → token persists, dashboard still renders
  6. Logout → redirected to `/login`, localStorage cleared
  7. Navigate to `/` while logged out → redirected to `/login`
- Run all existing tests (models, seed, app) — confirm no regressions
- Run auth integration tests — confirm all pass
- Remove the unused `import type { Task }` and `import { DEFAULT_COLUMNS }` from `app.ts` if they are no longer needed after route restructuring
- Confirm `npm run dev` starts both server and client concurrently with no errors

## Exit Criteria

| # | Criterion | Validates |
|---|-----------|-----------|
| 1 | `POST /api/auth/login` with valid credentials returns 200 with `{ data: { token, user } }` | Login endpoint works |
| 2 | `POST /api/auth/login` with invalid credentials returns 401 with `{ error: "Invalid credentials" }` | Login rejects bad credentials |
| 3 | `POST /api/auth/login` with missing fields returns 400 with `{ error: "Email and password are required" }` | Input validation works |
| 4 | `GET /api/auth/me` without token returns 401 | Auth middleware blocks unauthenticated access |
| 5 | `GET /api/auth/me` with valid token returns 200 with user data | Auth middleware passes valid tokens |
| 6 | `GET /api/health` responds 200 without any token | Health endpoint is not protected |
| 7 | All 8 server integration tests in `auth.routes.test.ts` pass with zero failures | Server auth fully tested |
| 8 | Client login page authenticates against the server and stores token in `localStorage` | Client auth flow works |
| 9 | Unauthenticated access to `/` or `/projects/:id/board` redirects to `/login` | Route guards work |
| 10 | Placeholder dashboard renders user's name and logout button after successful login | End-to-end flow confirmed |
| 11 | Logout clears token from `localStorage` and redirects to `/login` | Logout works correctly |
| 12 | `npm run dev` starts server and client concurrently with no errors | No regressions |
| 13 | All pre-existing tests (models, seed, app) still pass | No regressions in Phase 1/2 work |

## Dependencies

### Prior Phases

| Dependency | Source | What It Provides |
|------------|--------|-----------------|
| Phase 1 (Monorepo & Dev Environment) | m01/p01 | npm workspaces, TypeScript config, Vite + React + Tailwind client scaffold, React Router, concurrent dev script |
| Phase 2 (Database & Models) | m01/p02 | `UserModel` with email/passwordHash/name fields, `hashPassword()` and `verifyPassword()` utilities (bcryptjs), `seedDefaultUser()` function, MongoDB connection via `connectDb()`/`disconnectDb()`, test helpers (`setupTestDb`, `teardownTestDb`, `clearCollections`) |

### Pre-Installed Packages (no new installs needed)

| Package | Location | Version |
|---------|----------|---------|
| `@fastify/jwt` | `packages/server` | ^9.0.0 |
| `@fastify/cors` | `packages/server` | ^10.0.0 |
| `bcryptjs` | `packages/server` | ^2.4.3 |
| `supertest` | `packages/server` (dev) | ^7.0.0 |
| `react-router-dom` | `packages/client` | 6.15.0 |

### Environment Variables

| Variable | Default | Used By |
|----------|---------|---------|
| `JWT_SECRET` | `dev-jwt-secret-change-in-production` | `config.ts` → JWT plugin |
| `MONGODB_URI` | `mongodb://localhost:27017/taskboard` | `config.ts` → MongoDB connection |
| `PORT` | `3001` | `config.ts` → Server listen port |
| `CORS_ORIGIN` | `http://localhost:5173` | CORS plugin (new) |
| `VITE_API_URL` | `http://localhost:3001` | Client API utility (new) |

### Runtime Prerequisites

- Node.js 18+
- MongoDB running on `localhost:27017`

## Artifacts

### New Files

| File | Description |
|------|-------------|
| `packages/server/src/plugins/jwt.plugin.ts` | Fastify JWT plugin registration |
| `packages/server/src/plugins/cors.plugin.ts` | Fastify CORS plugin registration |
| `packages/server/src/middleware/auth.middleware.ts` | JWT auth middleware with route allow-list |
| `packages/server/src/routes/auth.routes.ts` | Login and me route handlers |
| `packages/server/test/routes/auth.routes.test.ts` | Integration tests for auth endpoints |
| `packages/client/src/api/client.ts` | HTTP client with token injection and 401 handling |
| `packages/client/src/api/auth.ts` | Auth-specific API functions (login, getMe) |
| `packages/client/src/context/auth-context.tsx` | Auth state provider and useAuth hook |
| `packages/client/src/components/protected-route.tsx` | Route guard component |
| `packages/client/src/pages/login-page.tsx` | Login form page |
| `packages/client/src/pages/dashboard-page.tsx` | Placeholder authenticated dashboard |
| `packages/client/src/pages/board-page.tsx` | Board page (extracted from App.tsx) |

### Modified Files

| File | Changes |
|------|---------|
| `packages/server/src/app.ts` | Register JWT plugin, CORS plugin, auth middleware, auth routes |
| `packages/client/src/App.tsx` | Wrap with AuthProvider, add ProtectedRoute, import pages from `pages/` directory |
| `packages/client/src/main.tsx` | No changes expected (AuthProvider goes inside App.tsx around router) |