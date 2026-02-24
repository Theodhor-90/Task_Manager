## Objective

Create a React auth context that manages login state (user, token, loading) and a route guard component that protects authenticated routes.

## Deliverables

### New Files

- **`packages/client/src/context/auth-context.tsx`** — Exports:
  - **`AuthProvider`** component — wraps children, manages auth state:
    - State: `user: { id, email, name } | null`, `token: string | null`, `isLoading: boolean`
    - On mount: checks `localStorage` for `taskboard_token`; if present, calls `GET /api/auth/me` to validate and populate user state; if validation fails, clears token
    - `login(email, password)`: calls the login API, stores token in `localStorage`, sets user state
    - `logout()`: clears token from `localStorage`, sets user to null, navigates to `/login`
    - `isAuthenticated`: derived boolean (`user !== null && token !== null`)
  - **`useAuth()`** hook — returns the auth context value; throws if used outside `AuthProvider`

- **`packages/client/src/components/protected-route.tsx`** — Exports:
  - **`ProtectedRoute`** component — checks `isAuthenticated` from auth context:
    - If loading (token validation in progress): renders a loading indicator
    - If authenticated: renders `<Outlet />`
    - If not authenticated: redirects to `/login` via `<Navigate to="/login" />`

## Key Implementation Details

- `AuthProvider` wraps the entire app inside `App.tsx` (inside `BrowserRouter`).
- All routes except `/login` are nested under `<ProtectedRoute />`.
- Token key in localStorage is `taskboard_token` — must be consistent with the API client (t05).
- Uses `react-router-dom` (v6.15.0, already installed) for `Navigate`, `Outlet`, and navigation.
- The `useAuth()` hook should provide clear error messaging if used outside `AuthProvider`.
- On mount validation via `GET /api/auth/me` ensures stale tokens are caught immediately.

## Dependencies

- **t05 (Client API Utility)** — `login()` and `getMe()` functions from `api/auth.ts` are used by the auth context.

## Verification Criteria

1. `AuthProvider` initializes with `isLoading: true`, validates token on mount, then sets `isLoading: false`.
2. `login()` stores token, sets user state, and `isAuthenticated` becomes `true`.
3. `logout()` clears token, sets user to null, `isAuthenticated` becomes `false`, and navigates to `/login`.
4. `ProtectedRoute` renders children when authenticated.
5. `ProtectedRoute` redirects to `/login` when not authenticated.
6. `ProtectedRoute` shows loading indicator while token validation is in progress.