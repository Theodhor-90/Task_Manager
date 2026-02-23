## Phase 3: Authentication

### Goal

Implement the complete JWT-based authentication flow spanning both server and client: a login endpoint that validates credentials and returns a JWT, a `GET /api/auth/me` endpoint that serves as the concrete verification target for auth middleware, auth middleware that protects all non-auth API routes, and a client-side auth context with login page, route guards, and a placeholder dashboard proving the flow works end-to-end.

### Deliverables

1. **Fastify plugins** in `packages/server/src/plugins/`:
   - `jwt.plugin.ts` — registers `@fastify/jwt` with secret from config (`JWT_SECRET` env var)
   - `cors.plugin.ts` — registers `@fastify/cors` allowing the client origin
2. **`packages/server/src/middleware/auth.middleware.ts`** — `onRequest` hook that verifies the JWT bearer token from the `Authorization` header and attaches the decoded user to the request. Returns 401 if token is missing or invalid.
3. **`packages/server/src/routes/auth.routes.ts`**:
   - `POST /api/auth/login` — accepts `{ email, password }`, validates credentials against the User model using bcrypt compare, returns `{ data: { token, user: { id, email, name } } }` on success, `{ error: "Invalid credentials" }` with 401 on failure
   - `GET /api/auth/me` — protected endpoint that returns the current authenticated user's info. Serves as the concrete target for verifying auth middleware works.
4. **Route registration**: auth routes (login) registered as unprotected; auth middleware applied to all other `/api/*` routes including `GET /api/auth/me`
5. **Auth tests** in `packages/server/test/`:
   - Login with correct credentials returns 200 and a valid JWT
   - Login with wrong password returns 401
   - Login with non-existent email returns 401
   - `GET /api/auth/me` without token returns 401
   - `GET /api/auth/me` with valid token returns 200 and user data
6. **Client-side auth** in `packages/client/src/`:
   - `api/client.ts` — fetch wrapper that reads the token from `localStorage` and attaches it as a bearer header; handles 401 responses by clearing state and redirecting to login
   - `context/auth-context.tsx` — React context providing `{ user, token, login, logout, isAuthenticated }`. On mount, checks `localStorage` for an existing token. `login()` calls the API, stores the token, and sets user state. `logout()` clears token and state.
   - `pages/login-page.tsx` — form with email and password fields, calls `login()` from auth context on submit, displays error messages on failure, redirects to `/` on success
   - `pages/dashboard-page.tsx` — placeholder page that renders the user's name and a logout button to confirm the auth flow works end-to-end
   - `App.tsx` — React Router configuration with a `ProtectedRoute` wrapper that redirects to `/login` if not authenticated

### Technical Decisions & Constraints

- JWT tokens have 24-hour expiry
- Token stored in `localStorage` on the client
- Response envelope: `{ data: T }` for success, `{ error: string }` for failure
- `GET /api/auth/me` was added per reviewer feedback as the concrete verification target for auth middleware (instead of relying on not-yet-built resource endpoints)
- The client API utility must handle 401 responses globally by clearing auth state and redirecting to `/login`
- The login page is the only unprotected client route; all others require authentication
- Tailwind CSS is used for styling the login page and placeholder dashboard

### Dependencies

- **Phase 1 (Monorepo & Dev Environment)** — client scaffold, React Router, Vite config, Tailwind CSS setup
- **Phase 2 (Database & Models)** — User model with password hashing, seed script creating the default admin user, MongoDB connection

### Phase Completion Gate

Phase is complete when: `POST /api/auth/login` returns a valid JWT for correct credentials and 401 for invalid credentials, `GET /api/auth/me` returns 401 without a token and 200 with user data when a valid token is provided, the client login page authenticates and stores the token in `localStorage`, unauthenticated access to protected routes redirects to `/login`, the placeholder dashboard renders after successful login confirming the end-to-end flow, and all auth tests pass with zero failures.