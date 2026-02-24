Now I have a complete picture of the existing codebase. The key insight is that much of Phase 1's deliverables (API client, auth context, login page, protected routes, basic routing) already exist from Milestone 1. Phase 1 of Milestone 3 needs to build the **app shell layout** (Sidebar, Header, AppLayout) and **refine** the existing auth integration — not create it from scratch.

Let me produce the detailed phase specification.

# Phase 1: App Shell & Auth UI

## Goal

Deliver the persistent application shell — a sidebar with project navigation, a header bar with user info and logout, and a scrollable main content area — on top of the existing authentication foundation, so that all subsequent Milestone 3 and 4 work has a consistent layout frame and the auth flow is production-ready with proper UX feedback, loading states, and error handling.

## Design Decisions

### 1. Build on Existing Auth Infrastructure, Don't Rebuild

The codebase already has a working `AuthContext`, `ProtectedRoute`, `apiClient`, `login()` API function, and `LoginPage`. Rather than rewriting these, this phase enhances them: improving the login page's visual design and form UX (loading spinner on submit, disabled state), ensuring the auth context handles edge cases (expired tokens, network errors), and verifying the full auth lifecycle works end-to-end.

**Rationale**: Avoids throwaway work and ensures the existing test surface remains valid.

### 2. AppLayout as a Route-Level Wrapper

`AppLayout` will be a layout route component rendered via React Router's nested routing (`<Outlet />`). The `/login` route sits outside this layout; all authenticated routes render inside it. This avoids prop-drilling layout concerns and keeps the router config clean.

**Rationale**: React Router 6 layout routes are the idiomatic pattern for persistent UI shells.

### 3. Sidebar Fetches Projects Independently

The `Sidebar` component will fetch the project list via `GET /api/projects` using its own data-fetching hook. It will expose a refresh mechanism (callback or context) so that the dashboard can trigger a sidebar re-fetch when projects are created, edited, or deleted. This will be implemented via a lightweight `ProjectsContext` (or a shared hook with cache) to avoid duplicate fetches between the sidebar and the dashboard page.

**Rationale**: The sidebar is persistent across all authenticated pages, so it needs its own data lifecycle independent of any specific page. A shared context prevents the sidebar and dashboard from making redundant API calls for the same project list.

### 4. Shared UI Components Are Minimal and Purpose-Built

`Modal`, `ConfirmDialog`, `LoadingSpinner`, and `ErrorMessage` are built as thin Tailwind-styled components with no external UI library dependencies. They support the immediate needs of this milestone (project CRUD, confirmation flows) without over-engineering for hypothetical future use.

**Rationale**: The Master Plan specifies Tailwind CSS with minimal custom CSS. Adding a component library would contradict this and bloat the bundle.

### 5. File Organization Follows Existing Conventions

New components go in `packages/client/src/components/` using kebab-case filenames (e.g., `app-layout.tsx`, `sidebar.tsx`, `header.tsx`). Shared UI primitives go in `packages/client/src/components/ui/` to distinguish them from feature components. Hooks go in `packages/client/src/hooks/`. This mirrors the existing structure and the Master Plan's naming conventions.

**Rationale**: Consistency with what's already in the codebase.

## Tasks

### Task 1: Shared UI Components

Create the reusable UI primitives that the rest of this phase (and Phase 2) depend on.

**Deliverables:**
- `packages/client/src/components/ui/loading-spinner.tsx` — A centered spinner component accepting an optional `size` prop (`sm | md | lg`). Uses Tailwind's `animate-spin` on an SVG circle.
- `packages/client/src/components/ui/error-message.tsx` — A styled error banner accepting a `message: string` prop and an optional `onDismiss` callback. Red background, white text, dismiss button.
- `packages/client/src/components/ui/modal.tsx` — An overlay modal with a white content card, close button (X), click-outside-to-dismiss, and Escape key to close. Accepts `isOpen: boolean`, `onClose: () => void`, `title?: string`, and `children: ReactNode`.
- `packages/client/src/components/ui/confirm-dialog.tsx` — Extends `Modal` with a warning message, a "Cancel" button, and a destructive "Confirm" button (red). Accepts `message: string`, `confirmLabel?: string`, `onConfirm: () => void`, `onCancel: () => void`, and `isOpen: boolean`.

### Task 2: Header Component

Create the top header bar for the authenticated layout.

**Deliverables:**
- `packages/client/src/components/header.tsx` — Renders a fixed-height header bar with: the current page title on the left (accepted as a prop or derived from route), the logged-in user's display name, and a "Logout" button on the right. Logout calls `auth.logout()` from `useAuth()`. Styled with Tailwind (white background, bottom border, horizontal padding).

### Task 3: Sidebar Component

Create the sidebar navigation panel.

**Deliverables:**
- `packages/client/src/components/sidebar.tsx` — A fixed-width left sidebar containing: the app logo/title ("TaskBoard") at the top, a "New Project" button (triggers a callback prop `onCreateProject`), a scrollable list of project names as `NavLink` elements linking to `/projects/:id/board`, and active-project highlighting (bold text or accent background when the route matches). Shows a `LoadingSpinner` while projects are loading and an empty-state message ("No projects yet") when the list is empty.
- The sidebar accepts `projects`, `isLoading`, and `onCreateProject` as props. Data fetching is not done inside the sidebar — it receives data from its parent.

### Task 4: Projects Context

Create a shared context for project data that can be consumed by both the sidebar and the dashboard.

**Deliverables:**
- `packages/client/src/api/projects.ts` — API functions: `fetchProjects()` → `GET /api/projects`, `createProject(data)` → `POST /api/projects`, `updateProject(id, data)` → `PUT /api/projects/:id`, `deleteProject(id)` → `DELETE /api/projects/:id`. All use the existing `apiClient`.
- `packages/client/src/context/projects-context.tsx` — React context + provider that: fetches the project list on mount (when authenticated), exposes `projects`, `isLoading`, `error`, and mutation functions (`addProject`, `updateProject`, `removeProject`) that update both the server and local state. Mutation functions call the API and then update the local array (optimistic remove for delete, append for create, in-place update for edit).

### Task 5: AppLayout and Router Integration

Wire the shell together as a React Router layout route.

**Deliverables:**
- `packages/client/src/components/app-layout.tsx` — A layout component that renders `Header` at the top, `Sidebar` on the left (passing project data from `ProjectsContext`), and `<Outlet />` as the main content area on the right. Uses CSS Grid or Flexbox for the layout. The sidebar has a fixed width (~256px / `w-64`), the main content area fills the remaining space and scrolls independently.
- Update `packages/client/src/App.tsx` — Restructure routes so that `/login` is a standalone route and all authenticated routes (`/`, `/projects/:id/board`) are nested inside an `AppLayout` layout route wrapped with `ProtectedRoute` and `ProjectsProvider`. The `ProtectedRoute` check happens before `AppLayout` renders.

### Task 6: Login Page Polish

Enhance the existing login page with production-ready UX.

**Deliverables:**
- Update `packages/client/src/pages/login-page.tsx` — Improve the visual design: centered card layout on a light gray background, TaskBoard branding/title above the form, properly styled email and password inputs with labels, a submit button with loading state (spinner + disabled while authenticating), and an `ErrorMessage` component for displaying login failures. Ensure the form handles Enter key submission. Ensure redirect-to-dashboard-if-already-authenticated works correctly.

### Task 7: Dashboard Page Skeleton

Update the dashboard page to work within the new layout and prepare for Phase 2's project list.

**Deliverables:**
- Update `packages/client/src/pages/dashboard-page.tsx` — Remove the standalone logout button (now in Header). Add a page title ("Projects" or "Dashboard"). Render a placeholder area where the project list will be built in Phase 2. Show a "New Project" button that will be connected in Phase 2. The page should look intentional — a proper empty state or a minimal project grid layout — not a bare placeholder.

### Task 8: Board Page Placeholder

Ensure the board page works within the layout and shows a meaningful placeholder.

**Deliverables:**
- Update `packages/client/src/pages/board-page.tsx` — Remove the PRIORITIES debug display. Show the project name (fetched via route param) in a heading and a "Board coming in Milestone 4" placeholder message. Ensure the sidebar highlights the correct project when this page is active.

## Exit Criteria

1. Navigating to any authenticated route (`/`, `/projects/:id/board`) without a token redirects to `/login`.
2. The login page renders a centered, styled form with email and password fields, submits to `POST /api/auth/login`, displays a spinner during authentication, shows an error message on failure, and redirects to `/` on success.
3. After login, the app shell renders with a fixed sidebar on the left (~256px), a header bar at the top (showing the user's name and a working logout button), and a scrollable main content area.
4. The sidebar displays "TaskBoard" branding, a "New Project" button, and a list of projects fetched from the API (or an empty-state message if none exist).
5. When on a `/projects/:id/board` route, the corresponding project in the sidebar is visually highlighted.
6. Clicking "Logout" clears the token, resets auth state, and redirects to `/login`.
7. A 401 response from any API call clears auth state and redirects to `/login`.
8. `Modal`, `ConfirmDialog`, `LoadingSpinner`, and `ErrorMessage` components exist and are importable.
9. The dashboard page renders inside the layout with a page heading and placeholder content for the project list.
10. The board page renders inside the layout with the project name and a placeholder message.
11. All new components use TypeScript strict mode, named exports, and Tailwind CSS for styling.

## Dependencies

- **Milestone 1 (Complete)** — Monorepo structure, dev environment, database models, seed user, `POST /api/auth/login` endpoint.
- **Milestone 2 (Complete)** — All REST API endpoints for projects, boards, columns, tasks, comments, and labels.
- **Existing Client Code** — React 19, Vite, Tailwind CSS 3.4, React Router 6.15.0, `@taskboard/shared` types, working `apiClient`, `AuthContext`, `ProtectedRoute`, and `LoginPage`.
- **Runtime** — MongoDB instance and Fastify server running on port 3001 during development.

## Artifacts

| Artifact | Action |
|----------|--------|
| `packages/client/src/components/ui/loading-spinner.tsx` | Create |
| `packages/client/src/components/ui/error-message.tsx` | Create |
| `packages/client/src/components/ui/modal.tsx` | Create |
| `packages/client/src/components/ui/confirm-dialog.tsx` | Create |
| `packages/client/src/components/header.tsx` | Create |
| `packages/client/src/components/sidebar.tsx` | Create |
| `packages/client/src/components/app-layout.tsx` | Create |
| `packages/client/src/api/projects.ts` | Create |
| `packages/client/src/context/projects-context.tsx` | Create |
| `packages/client/src/App.tsx` | Modify |
| `packages/client/src/pages/login-page.tsx` | Modify |
| `packages/client/src/pages/dashboard-page.tsx` | Modify |
| `packages/client/src/pages/board-page.tsx` | Modify |