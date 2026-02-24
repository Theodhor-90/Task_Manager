Now I have a thorough understanding of the project. Let me produce the milestone specification.

# Milestone 3: Frontend — Shell & Projects

## Goal

Deliver the foundational frontend application: a polished layout with sidebar navigation, fully integrated React Router setup, a production-ready API client with JWT auth headers and error handling, a login page with form validation, persistent auth state management with route guards, and a complete project dashboard where the user can create, edit, delete, and navigate to projects — connecting all frontend interactions to the Core API built in Milestone 2.

## Scope

### Included

- Application shell layout with sidebar and main content area
- React Router configuration with protected routes and login redirect
- API client utility wrapping `fetch` with JWT `Authorization` header injection and consistent error handling
- Login page with email/password form, validation, error display, and redirect on success
- Auth context providing login state, token persistence (localStorage), and logout
- Route guard that redirects unauthenticated users to `/login`
- Project dashboard page listing all projects fetched from `GET /api/projects`
- Create project flow (modal with name and description fields) calling `POST /api/projects`
- Edit project flow (inline or modal) calling `PUT /api/projects/:id`
- Delete project flow with confirmation dialog calling `DELETE /api/projects/:id`
- Navigation from project card/row to `/projects/:id/board`
- Sidebar displaying project list with active-project highlighting
- Header component with page title, user display name, and logout button
- Reusable shared components: Modal, ConfirmDialog, LoadingSpinner, ErrorMessage
- Tailwind CSS styling consistent with a clean, professional kanban-tool aesthetic

### Out of Scope

- Kanban board view (Milestone 4)
- Task cards, drag-and-drop, task detail panel (Milestone 4)
- Comments and labels UI (Milestone 4)
- Filter bar and sorting controls (Milestone 4)
- Multi-user support, teams, or sharing
- Responsive/mobile layout optimization
- End-to-end testing (Cypress, Playwright)
- Deployment, CI/CD, or production builds

## Phases

### Phase 1: App Shell & Auth UI

Build the structural skeleton of the frontend and complete the authentication flow.

**Deliverables:**

- **AppLayout component** — persistent sidebar on the left, header bar at the top, scrollable main content area on the right. The sidebar and header render on all authenticated pages.
- **Sidebar component** — displays a list of projects (initially empty/loading), a "Create Project" button, and highlights the currently active project. Links each project to `/projects/:id/board`.
- **Header component** — shows the current page title, the logged-in user's display name, and a logout button.
- **React Router configuration** — routes for `/login`, `/` (dashboard), and `/projects/:id/board` (placeholder). All routes except `/login` are wrapped in a `ProtectedRoute` that checks auth state and redirects to `/login` if no valid token exists.
- **API client module** — a `fetch`-based HTTP utility that automatically attaches the JWT `Authorization: Bearer <token>` header to every request, parses JSON responses, and throws typed errors on non-2xx status codes. Handles 401 responses by clearing auth state and redirecting to login.
- **Auth context** — React context + provider managing `user`, `token`, and `isAuthenticated` state. Persists token to `localStorage`, restores on page load, and exposes `login()` and `logout()` functions.
- **Login page** — form with email and password fields, a submit button, inline validation (required fields), and an error message area for failed login attempts. On success, stores the token via auth context and redirects to `/`.
- **Logout** — clears token from localStorage, resets auth context, and redirects to `/login`.

### Phase 2: Project Dashboard

Build the project management UI on the dashboard page, connecting to all project API endpoints.

**Deliverables:**

- **Project list view** — fetches projects from `GET /api/projects` on mount and displays them as cards or rows showing project name, description (truncated), and creation date. Shows a loading spinner while fetching and an empty-state message when no projects exist.
- **Create project modal** — triggered by a "New Project" button. Modal contains a form with name (required) and description (optional) fields. Submits to `POST /api/projects`. On success, closes the modal and adds the new project to the list without a full refetch.
- **Edit project** — opens a modal (or inline editing) pre-filled with the project's current name and description. Submits to `PUT /api/projects/:id`. Updates the project in the list on success.
- **Delete project with confirmation** — clicking delete opens a `ConfirmDialog` warning that all tasks, comments, and labels within the project will be permanently deleted. On confirmation, calls `DELETE /api/projects/:id` and removes the project from the list.
- **Project navigation** — clicking a project card navigates to `/projects/:id/board`. The sidebar project list also links to this route.
- **Shared UI components** — `Modal` (overlay with close button, click-outside-to-dismiss), `ConfirmDialog` (extends Modal with confirm/cancel buttons and a warning message), `LoadingSpinner` (centered spinner for async states), `ErrorMessage` (styled error banner that accepts a message string).

## Exit Criteria

1. The login page renders a form, authenticates against `POST /api/auth/login`, stores the JWT, and redirects to the dashboard on success.
2. Invalid credentials display an error message on the login page without redirecting.
3. Unauthenticated users accessing any route other than `/login` are redirected to `/login`.
4. After login, the app shell renders with a sidebar, header (showing user name and logout button), and main content area.
5. Logging out clears the token, resets auth state, and redirects to `/login`.
6. The dashboard fetches and displays all projects from the API, including a loading state while fetching.
7. A user can create a new project via a modal form with name (required) and description (optional), and the project appears in the list after creation.
8. A user can edit an existing project's name and description, and the changes are reflected in the list after saving.
9. A user can delete a project after confirming in a dialog, and the project is removed from the list.
10. Clicking a project navigates to `/projects/:id/board`.
11. The sidebar lists all projects and highlights the active project when on a board route.
12. All API interactions use the shared API client with JWT headers, and 401 responses trigger automatic logout.

## Dependencies

- **Milestone 1 (Foundation)** — monorepo structure, database models, seed user, authentication endpoint, dev environment (`npm run dev` starts both server and client).
- **Milestone 2 (Core API)** — all project CRUD endpoints (`GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id`) must be implemented and returning correct responses.
- **MongoDB** — a running MongoDB instance accessible to the server during development.
- **Existing client scaffolding** — React 19, Vite, Tailwind CSS, React Router 6, and the `@taskboard/shared` types package are already configured and available.

## Risks

1. **API contract mismatches** — the frontend may make assumptions about response shapes that differ from what the server actually returns. Mitigate by using the shared types from `@taskboard/shared` and testing against the running server early.
2. **Auth token expiry handling** — the JWT has a 24-hour expiry. If the token expires mid-session, API calls will start returning 401s. The API client must handle this gracefully by redirecting to login rather than showing cryptic errors.
3. **React Router version quirks** — the project uses React Router 6.15.0, which has specific patterns for loaders, route guards, and navigation. Incorrect usage could lead to redirect loops or broken navigation.
4. **Vite proxy configuration** — the dev server proxies `/api` requests to the Fastify server on port 3001. Misconfiguration or server downtime will cause all API calls to fail silently or with opaque network errors.
5. **State synchronization** — the sidebar project list and dashboard project list must stay in sync when projects are created, edited, or deleted. Without a shared data-fetching strategy, stale data could appear in one while the other is updated.