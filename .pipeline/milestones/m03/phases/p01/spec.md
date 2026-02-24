## Phase 1: App Shell & Auth UI

### Goal

Build the structural skeleton of the frontend application and complete the full authentication flow — delivering the persistent layout (sidebar, header, main content area), React Router configuration with protected routes, a JWT-aware API client utility, auth context with login state persistence, a login page with form validation and error handling, and logout functionality. This phase establishes the foundation that all subsequent frontend work builds upon.

### Deliverables

1. **AppLayout component** — persistent sidebar on the left, header bar at the top, scrollable main content area on the right. Renders on all authenticated pages.
2. **Sidebar component** — displays a list of projects (initially empty/loading), a "Create Project" button, and highlights the currently active project. Links each project to `/projects/:id/board`.
3. **Header component** — shows the current page title, the logged-in user's display name, and a logout button.
4. **React Router configuration** — routes for `/login`, `/` (dashboard), and `/projects/:id/board` (placeholder). All routes except `/login` are wrapped in a `ProtectedRoute` that checks auth state and redirects to `/login` if no valid token exists.
5. **API client module** — a `fetch`-based HTTP utility that automatically attaches the JWT `Authorization: Bearer <token>` header to every request, parses JSON responses, and throws typed errors on non-2xx status codes. Handles 401 responses by clearing auth state and redirecting to login.
6. **Auth context** — React context + provider managing `user`, `token`, and `isAuthenticated` state. Persists token to `localStorage`, restores on page load, and exposes `login()` and `logout()` functions.
7. **Login page** — form with email and password fields, a submit button, inline validation (required fields), and an error message area for failed login attempts. On success, stores the token via auth context and redirects to `/`.
8. **Logout** — clears token from localStorage, resets auth context, and redirects to `/login`.

### Technical Decisions & Constraints

- **Tech stack**: React 19, Vite, Tailwind CSS, React Router 6.15.0, and the `@taskboard/shared` types package are already configured.
- **API client**: Must use `fetch`-based wrapper (not axios). Must inject `Authorization: Bearer <token>` on all requests. Must handle 401 by clearing auth and redirecting to `/login`.
- **Auth flow**: JWT token stored in `localStorage`. 24-hour expiry. Login via `POST /api/auth/login` which returns `{ data: { token, user: { id, email, name } } }`.
- **Response envelope**: API returns `{ data: T }` for success, `{ error: string }` for failure.
- **Styling**: Tailwind CSS utility-first approach, clean professional kanban-tool aesthetic.
- **Code conventions**: TypeScript strict mode, ES modules, functional components with hooks, async/await, named exports, kebab-case files, PascalCase components.
- **Monorepo structure**: Client code lives in `packages/client/src/`. Shared types in `packages/shared/`.
- **Vite proxy**: Dev server proxies `/api` requests to the Fastify server on port 3001.

### Dependencies

- **Milestone 1 (Foundation)** — monorepo structure, database models, seed user (`admin@taskboard.local` / `admin123`), authentication endpoint, dev environment (`npm run dev` starts both server and client).
- **Milestone 2 (Core API)** — the `POST /api/auth/login` endpoint must be functional. Project endpoints are needed by the Sidebar but can show empty/loading state initially.
- **MongoDB** — a running MongoDB instance accessible to the server during development.

### Exit Criteria (Phase-specific)

- Login page renders a form, authenticates against `POST /api/auth/login`, stores the JWT, and redirects to dashboard on success.
- Invalid credentials display an error message on the login page without redirecting.
- Unauthenticated users accessing any route other than `/login` are redirected to `/login`.
- After login, the app shell renders with sidebar, header (showing user name and logout button), and main content area.
- Logging out clears the token, resets auth state, and redirects to `/login`.
- All API interactions use the shared API client with JWT headers, and 401 responses trigger automatic logout.