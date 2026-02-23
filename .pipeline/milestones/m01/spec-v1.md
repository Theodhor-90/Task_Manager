It seems file write permissions haven't been granted yet. Let me output the complete specification directly so you can review it:

---

# Milestone 1: Foundation — Detailed Specification

## Goal

Establish the monorepo structure, database layer, and authentication that form the base for the entire TaskBoard application. This milestone delivers a fully scaffolded npm workspace with three packages (shared, server, client), TypeScript compilation across all packages, a MongoDB connection with all seven Mongoose data models, a seed script for first-run user creation, and a working JWT-based login flow spanning both server and client — producing a running application skeleton that Milestone 2 (Core API) builds directly on top of.

---

## Scope

### In Scope

- npm workspaces monorepo with `packages/shared`, `packages/server`, `packages/client`
- Root-level `package.json` with workspace configuration and orchestration scripts (`dev`, `build`, `test`)
- Shared `tsconfig.base.json` and per-package `tsconfig.json` files with TypeScript strict mode
- Vite configuration for the client package
- Fastify app factory (`app.ts`), entry point (`server.ts`), and environment config (`config.ts`)
- MongoDB connection module (`db.ts`) with configurable URI (supporting separate dev and test databases)
- Mongoose schemas and models for all seven entities: User, Project, Board, Column (embedded), Task, Comment, Label
- Indexes on frequently queried fields (e.g., `User.email` unique, `Board.project` unique, `Task.board`, `Task.project`, `Label.project`)
- Seed script (`seed.ts`) that creates the default admin user on first server start when no users exist
- `POST /api/auth/login` endpoint returning a JWT token and user object
- Fastify JWT plugin registration and auth middleware that validates bearer tokens on protected routes
- Client-side React app entry point, React Router setup with `/login` and `/` routes
- API client utility that attaches `Authorization: Bearer <token>` headers
- Auth context (React Context) that manages login state, persists the token in `localStorage`, and provides login/logout functions
- Login page with email + password form that authenticates against the server
- Route guard that redirects unauthenticated users to `/login`
- Placeholder dashboard page (renders after successful login to prove auth flow works)
- Tailwind CSS configuration for the client package
- Vitest configuration for server and shared packages
- Basic model-level tests proving CRUD operations compile and execute

### Out of Scope

- REST API endpoints beyond `POST /api/auth/login` (covered in Milestone 2)
- Integration tests for resource endpoints (covered in Milestone 2)
- Any frontend UI beyond the login page and a placeholder dashboard (covered in Milestones 3–4)
- Drag-and-drop functionality
- Markdown rendering
- Multi-user or team features
- Deployment, CI/CD, or Docker configuration

---

## Phases

### Phase 1: Monorepo & Dev Environment

Scaffold the project from scratch. Initialize the root `package.json` with npm workspaces pointing to `packages/*`. Create the three package directories (`shared`, `server`, `client`) each with their own `package.json` and `tsconfig.json` extending a shared `tsconfig.base.json`. Configure TypeScript strict mode across all packages.

**Deliverables:**

1. Root `package.json` with `workspaces: ["packages/*"]` and scripts:
   - `dev` — runs server and client concurrently
   - `build` — builds all packages
   - `test` — runs tests across all packages
2. `tsconfig.base.json` at root with shared compiler options (strict mode, ES modules, path aliases)
3. `packages/shared/` — TypeScript types and constants package
   - `src/types/` — entity interfaces (`User`, `Project`, `Board`, `Column`, `Task`, `Comment`, `Label`) and API contract types (request/response shapes for login)
   - `src/constants/` — shared constants: priority enum values (`low`, `medium`, `high`, `urgent`), default column names (`To Do`, `In Progress`, `In Review`, `Done`)
   - `package.json` with build script and correct `main`/`types` exports
4. `packages/server/` — Fastify server package
   - `src/app.ts` — Fastify app factory function
   - `src/server.ts` — entry point that calls the factory and listens on a configurable port
   - `src/config.ts` — reads environment variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`) with sensible defaults
   - Directory stubs: `src/models/`, `src/routes/`, `src/middleware/`, `src/plugins/`
   - `package.json` with `dev` (tsx watch) and `build` scripts
   - Vitest config for the server package
5. `packages/client/` — React SPA package
   - Vite + React + TypeScript scaffold
   - `tailwind.config.js` and PostCSS configuration
   - `src/main.tsx`, `src/App.tsx` with React Router
   - `package.json` with `dev` (vite) and `build` (vite build) scripts
6. Verify: `npm install` from root succeeds, `npm run dev` starts both server and client, TypeScript compiles cleanly across all packages

### Phase 2: Database & Models

Connect to MongoDB and implement all data models with proper schemas, validation, indexes, and the seed script.

**Deliverables:**

1. `packages/server/src/db.ts` — MongoDB connection function using Mongoose, configurable via `MONGODB_URI` environment variable, with connection error handling and logging
2. Mongoose models in `packages/server/src/models/`:
   - `user.model.ts` — email (unique, required, lowercase, trimmed), passwordHash (required), name (required), timestamps. Pre-save hook or utility to hash passwords with bcrypt.
   - `project.model.ts` — name (required, trimmed), description (optional), owner (ObjectId ref → User), timestamps
   - `board.model.ts` — project (ObjectId ref → Project, unique index for 1:1), columns as embedded subdocument array (each with `_id`, `name`, `position`), timestamps
   - `task.model.ts` — title (required), description (optional), status (required, string matching column name), priority (enum: `low`/`medium`/`high`/`urgent`, default `medium`), position (number, default 0), dueDate (optional Date), labels (ObjectId[] ref → Label), board (ObjectId ref → Board, indexed), project (ObjectId ref → Project, indexed), timestamps
   - `comment.model.ts` — body (required), task (ObjectId ref → Task, indexed), author (ObjectId ref → User), timestamps
   - `label.model.ts` — name (required), color (required, hex string), project (ObjectId ref → Project, indexed), timestamps
3. `packages/server/src/seed.ts` — function that checks if any users exist; if not, creates the default user `{ email: "admin@taskboard.local", password: "admin123", name: "Admin" }` with a bcrypt-hashed password. Called during server startup.
4. Basic model tests in `packages/server/test/` that verify:
   - Each model can create, read, update, and delete a document
   - Required field validation rejects missing fields
   - Unique constraints are enforced (e.g., duplicate email)
   - The seed function creates a user only when no users exist

### Phase 3: Authentication

Implement the server-side login endpoint, JWT middleware, and client-side auth flow.

**Deliverables:**

1. Fastify plugins in `packages/server/src/plugins/`:
   - `jwt.plugin.ts` — registers `@fastify/jwt` with secret from config
   - `cors.plugin.ts` — registers `@fastify/cors` allowing the client origin
2. `packages/server/src/middleware/auth.middleware.ts` — `onRequest` hook that verifies the JWT bearer token from the `Authorization` header and attaches the decoded user to the request. Returns 401 if token is missing or invalid.
3. `packages/server/src/routes/auth.routes.ts`:
   - `POST /api/auth/login` — accepts `{ email, password }`, validates credentials against the User model using bcrypt compare, returns `{ data: { token, user: { id, email, name } } }` on success, `{ error: "Invalid credentials" }` with 401 on failure
4. Register auth routes (unprotected) and apply auth middleware to all other `/api/*` routes
5. Auth tests:
   - Login with correct credentials returns 200 and a valid JWT
   - Login with wrong password returns 401
   - Login with non-existent email returns 401
   - Protected route without token returns 401
   - Protected route with valid token succeeds
6. Client-side auth in `packages/client/src/`:
   - `api/client.ts` — fetch wrapper that reads the token from `localStorage` and attaches it as a bearer header; handles 401 responses by clearing state and redirecting to login
   - `context/auth-context.tsx` — React context providing `{ user, token, login, logout, isAuthenticated }`. On mount, checks `localStorage` for an existing token. `login()` calls the API, stores the token, and sets user state. `logout()` clears token and state.
   - `pages/login-page.tsx` — form with email and password fields, calls `login()` from auth context on submit, displays error messages on failure, redirects to `/` on success
   - `pages/dashboard-page.tsx` — placeholder page that renders the user's name and a logout button to confirm the auth flow works end-to-end
   - `App.tsx` — React Router configuration with a `ProtectedRoute` wrapper that redirects to `/login` if not authenticated

---

## Exit Criteria

1. **Workspace installation**: Running `npm install` from the repository root installs dependencies for all three packages without errors
2. **Concurrent dev server**: Running `npm run dev` from the root starts both the Fastify server and the Vite dev server concurrently, with both accessible at their respective ports
3. **TypeScript compilation**: Running `npm run build` compiles all three packages without type errors under strict mode
4. **Model CRUD**: All seven Mongoose models (User, Project, Board, Column, Task, Comment, Label) can perform create, read, update, and delete operations as verified by passing tests
5. **Seed user**: On first server start with an empty database, the seed script creates the admin user (`admin@taskboard.local`); on subsequent starts with an existing user, it does not create a duplicate
6. **Login endpoint**: `POST /api/auth/login` with valid credentials returns a 200 response containing a JWT and user object; invalid credentials return 401 with an error message
7. **Auth middleware**: Requests to protected routes without a valid `Authorization: Bearer <token>` header receive a 401 response; requests with a valid token are processed normally
8. **Client login flow**: The login page submits credentials to the server, receives and stores a JWT in `localStorage`, and redirects to the dashboard
9. **Route protection**: Navigating to `/` (or any protected route) without a stored token redirects the user to `/login`
10. **All tests pass**: Running `npm run test` from the root executes all model tests and auth tests with zero failures

---

## Dependencies

- **Node.js** >= 18 installed locally
- **MongoDB** instance accessible (local install or Docker container) for both development and test databases
- **npm** >= 9 with workspaces support
- No prior milestones — this is the first milestone

---

## Risks

1. **MongoDB availability**: The development and test environments require a running MongoDB instance. If MongoDB is not installed or not running, no model tests or auth tests can execute. **Mitigation**: Document the required MongoDB setup in a project README; consider noting Docker as a quick-start option.
2. **Package resolution across workspaces**: The `shared` package must be resolvable from both `server` and `client` via npm workspaces. Misconfigured `main`/`types` fields or TypeScript path mappings can cause confusing import errors. **Mitigation**: Verify cross-package imports immediately after scaffolding in Phase 1 before building on top of them.
3. **Bcrypt native dependency**: `bcrypt` requires native compilation and can fail on some systems. **Mitigation**: Use `bcryptjs` (pure JavaScript) if native build issues arise; the API is identical.
4. **JWT secret management**: A hardcoded or weak JWT secret in development is acceptable for the MVP, but forgetting to make it configurable could create issues when environments diverge. **Mitigation**: Read `JWT_SECRET` from environment variables in `config.ts` with a default fallback for development only.
5. **Concurrent dev script reliability**: Running server and client concurrently can have issues with port conflicts or process cleanup. **Mitigation**: Use the `concurrently` package with `--kill-others-on-fail` to ensure clean shutdown behavior, and configure distinct ports in `config.ts` and `vite.config.ts`.

---

The spec is ready to be written to `.pipeline/milestones/m01/spec.md` — please grant write permission so I can save it, or copy it from above.