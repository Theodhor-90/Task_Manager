## Objective

Create the login page with form validation and error handling, a placeholder dashboard showing the authenticated user's name, a board page placeholder extracted from App.tsx, and wire up routing with auth guards.

## Deliverables

### New Files

- **`packages/client/src/pages/login-page.tsx`** — Full login page:
  - Form with email and password `<input>` fields, submit button
  - Calls `login()` from auth context on submit
  - Displays error message on failed login (from API error response)
  - Disables submit button and shows loading state during request
  - On success, redirects to `/` (dashboard)
  - If already authenticated, redirects to `/` immediately
  - Styled with Tailwind CSS — centered card layout, clean form styling

- **`packages/client/src/pages/dashboard-page.tsx`** — Placeholder dashboard:
  - Displays welcome message with user's name from auth context (e.g., "Welcome, Admin")
  - Logout button that calls `logout()` from auth context
  - Styled with Tailwind CSS

- **`packages/client/src/pages/board-page.tsx`** — Move existing placeholder board page to its own file (keeps current content)

### Modified Files

- **`packages/client/src/App.tsx`** — Updated to:
  - Import pages from `pages/` directory
  - Wrap with `AuthProvider` around the router
  - Configure routes: `/login` as public, all other routes nested under `<ProtectedRoute />`
  - Route structure: `/login` → `LoginPage`, `/` → `DashboardPage`, `/projects/:id/board` → `BoardPage`

## Key Implementation Details

- Login page uses `useAuth()` hook for `login()` and `isAuthenticated`.
- Dashboard page uses `useAuth()` hook for `user` and `logout()`.
- All pages follow MASTER_PLAN naming convention: kebab-case files, PascalCase components.
- Tailwind CSS is already configured from Phase 1 — no additional setup needed.
- `react-router-dom` v6 patterns: `<Routes>`, `<Route>`, `<Navigate>`, `<Outlet>`.

## Dependencies

- **t05 (Client API Utility)** — API functions used by auth context.
- **t06 (Auth Context and Route Guards)** — `AuthProvider`, `useAuth()`, and `ProtectedRoute` must exist.

## Verification Criteria

1. Login page renders at `/login` and is accessible without authentication.
2. Submitting valid credentials redirects to the dashboard.
3. Submitting invalid credentials shows an error message.
4. Submit button is disabled during login request.
5. Dashboard renders at `/` and displays "Welcome, {name}".
6. Logout button clears auth state and redirects to `/login`.
7. Board page renders at `/projects/:id/board` and requires authentication.
8. Navigating to `/` while unauthenticated redirects to `/login`.
9. Already authenticated users visiting `/login` are redirected to `/`.