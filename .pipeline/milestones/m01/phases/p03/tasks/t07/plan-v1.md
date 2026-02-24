Now I have all the context needed. Let me also verify the `login()` function in `api/auth.ts` — I noticed it uses `apiClient.post()` instead of raw `fetch`, which means a 401 from wrong credentials would trigger the 401 interceptor. I need to understand the implications for the login page error handling.

Looking at the code: `api/auth.ts` line 8 calls `apiClient.post<LoginResponse>("/api/auth/login", { email, password })`. The `apiClient` 401 interceptor (lines 26-29 of `client.ts`) clears the token and redirects to `/login`. For a login attempt with wrong credentials, the server returns 401, which triggers: (1) `localStorage.removeItem(TOKEN_KEY)` — a no-op since there's no token yet, (2) `window.location.href = "/login"` — user is already on `/login`, so this is a page reload, (3) `throw new Error("Unauthorized")` — the error message is generic "Unauthorized" not the server's "Invalid credentials".

This means the login page will catch `Error("Unauthorized")` rather than the specific "Invalid credentials" message. The login page should display this error message to the user. This is a known limitation from the t05 implementation that I should account for in the login page design.

Now I have everything I need to produce the plan.

# Task 7 Implementation Plan: Login Page and Placeholder Dashboard

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| D1 | `packages/client/src/pages/login-page.tsx` | Create | Full login page with email/password form, error display, loading state, submit handling, and redirect-if-authenticated logic |
| D2 | `packages/client/src/pages/dashboard-page.tsx` | Create | Placeholder dashboard showing "Welcome, {name}" and a logout button |
| D3 | `packages/client/src/pages/board-page.tsx` | Create | Board page placeholder extracted from `App.tsx` (preserves current content) |
| D4 | `packages/client/src/App.tsx` | Modify | Import pages from `pages/` directory, remove inline page component definitions |

## 2. Dependencies

| Dependency | Status | Source |
|------------|--------|--------|
| `react-router-dom` 6.15.0 | Already installed | `packages/client/package.json` — provides `useNavigate`, `Navigate` |
| `react` ^19.0.0 | Already installed | `packages/client/package.json` — provides `useState`, `useEffect`, `FormEvent` |
| `tailwindcss` ^3.4.0 | Already installed | `packages/client/package.json` devDependencies |
| `@taskboard/shared` (`PRIORITIES`) | Already available | `packages/shared/src/constants/index.ts` |
| `AuthProvider` + `useAuth()` hook | Already implemented | t06 — `packages/client/src/context/auth-context.tsx` |
| `ProtectedRoute` component | Already implemented | t06 — `packages/client/src/components/protected-route.tsx` |
| `login()` function from auth context | Already implemented | t06 — `AuthProvider` wraps `apiLogin()` from `api/auth.ts` |
| `logout()` function from auth context | Already implemented | t06 — `AuthProvider` clears token and navigates to `/login` |
| `BrowserRouter` wrapping `AuthProvider` | Already configured | t06 — `packages/client/src/App.tsx` lines 25–26 |
| Tailwind CSS base styles | Already configured | `packages/client/src/index.css` — includes `@tailwind base/components/utilities` |

No new package installs are required.

## 3. Implementation Details

### D1: `packages/client/src/pages/login-page.tsx`

**Purpose**: A full-featured login page that renders a centered card with an email/password form. Handles form submission, loading states, error display, and redirects.

**Exports**: `LoginPage` — a React functional component.

**Full implementation**:

```typescript
import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          TaskBoard
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Key decisions**:

- **Redirect-if-authenticated check**: The component checks `isAuthenticated` at the top. If the user is already logged in (e.g., navigating back to `/login` after authentication), it renders `<Navigate to="/" replace />` to redirect to the dashboard immediately. This satisfies verification criterion #9: "Already authenticated users visiting `/login` are redirected to `/`."

- **`isLoading` guard before `isAuthenticated` check**: The `AuthProvider` starts with `isLoading: true` while it validates the stored token via `getMe()`. Without this guard, the login page would briefly render the form, then the `isAuthenticated` check would trigger a redirect once validation completes. The loading screen prevents the form flash. The order matters: `isLoading` is checked first, then `isAuthenticated`.

- **`handleSubmit` error handling**: The `login()` function from `useAuth()` calls `apiLogin()` from `api/auth.ts`, which currently uses `apiClient.post()`. When the server returns 401 for wrong credentials, the `apiClient`'s 401 interceptor fires: it clears the token (no-op — no token exists yet), sets `window.location.href = "/login"` (reloads the current page), and throws `Error("Unauthorized")`. The `catch` block captures this error and displays it via `setError()`. The error message will be `"Unauthorized"` rather than the server's `"Invalid credentials"`. For the MVP this is acceptable — the user sees an error and knows the login failed.

  **Note**: If the `api/auth.ts` `login()` function is later refactored to use `fetch` directly (bypassing the 401 interceptor, as the t05 plan originally recommended), the error message would be `"Invalid credentials"` from the server. The login page's error handling already supports this — `err.message` would contain whatever the thrown `Error`'s message is.

- **`isSubmitting` state for button**: A separate `isSubmitting` boolean controls the button's disabled state and text. This is distinct from `isLoading` (which tracks token validation on mount). During submission: the button shows "Signing in..." and is disabled (via `disabled` attribute and `disabled:opacity-50 disabled:cursor-not-allowed` Tailwind classes). This satisfies verification criterion #4: "Submit button is disabled during login request."

- **Form validation via HTML attributes**: `required` on both inputs provides browser-native validation. `type="email"` on the email input enforces basic email format validation. This avoids custom validation code — the browser prevents form submission if fields are empty or email is malformed. No JavaScript validation needed for the MVP.

- **`autoComplete` attributes**: `autoComplete="email"` and `autoComplete="current-password"` enable browser autofill and password managers. This follows HTML best practices and improves UX.

- **`navigate("/")` after successful login**: After `login()` resolves (token stored, user state set, `isAuthenticated` becomes `true`), the component calls `navigate("/")` to redirect to the dashboard. This is a React Router client-side navigation (not a full page reload). The `ProtectedRoute` at `/` will see `isAuthenticated === true` and render the `DashboardPage`.

- **Tailwind styling**: Centered card layout (`flex min-h-screen items-center justify-center`), white card with shadow (`bg-white rounded-lg shadow-md p-8`), standard form styling (borders, focus rings, spacing). Matches the spec requirement: "Styled with Tailwind CSS — centered card layout, clean form styling." The design is minimal and professional — no custom colors or complex layouts.

- **`handleSubmit` defined inside the component (not `useCallback`)**: Since `handleSubmit` is only used as the form's `onSubmit` prop and the form element doesn't get memoized, wrapping it in `useCallback` provides no benefit. Keeping it as a plain function is simpler.

### D2: `packages/client/src/pages/dashboard-page.tsx`

**Purpose**: A placeholder dashboard page that confirms end-to-end authentication works by displaying the authenticated user's name and providing a logout button.

**Exports**: `DashboardPage` — a React functional component.

**Full implementation**:

```typescript
import { useAuth } from "../context/auth-context";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">TaskBoard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={logout}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome, {user?.name}
        </h2>
      </main>
    </div>
  );
}
```

**Key decisions**:

- **`user?.name` with optional chaining**: Although the `ProtectedRoute` guarantees `isAuthenticated === true` (meaning `user !== null`) before this component renders, TypeScript doesn't know about this runtime guarantee. The `user` type is `AuthUser | null`, so optional chaining prevents a type error. The `?.` is a type-safety measure, not a behavioral one — at runtime, `user` is always defined on this page.

- **Welcome message**: Displays `"Welcome, {user?.name}"` (e.g., "Welcome, Admin"). This satisfies verification criterion #5: "Dashboard renders at `/` and displays 'Welcome, {name}'."

- **Logout button**: Calls `logout()` from `useAuth()`. The `logout()` function (from `auth-context.tsx` line 65–69) clears `localStorage`, sets `token` and `user` to `null`, and calls `navigate("/login")`. This satisfies verification criterion #6: "Logout button clears auth state and redirects to `/login`."

- **Header with app name and user info**: A minimal header bar with the app name on the left, user name and logout button on the right. This provides context (who's logged in) and action (logout). The header uses `bg-white shadow-sm` for visual separation from the main content area.

- **Placeholder content**: The main area only shows the welcome message. This is explicitly a placeholder — the real dashboard with project list will be built in Milestone 3, Phase 2 ("Project Dashboard"). The minimal content is intentional per the spec: "Placeholder dashboard: Displays welcome message with user's name from auth context, Logout button."

### D3: `packages/client/src/pages/board-page.tsx`

**Purpose**: Extract the existing inline `BoardPage` component from `App.tsx` into its own file. Preserves the current placeholder content.

**Exports**: `BoardPage` — a React functional component.

**Full implementation**:

```typescript
import { PRIORITIES } from "@taskboard/shared";

export function BoardPage() {
  return (
    <div>
      <h1>Board</h1>
      <p>Priority levels: {PRIORITIES.join(", ")}</p>
    </div>
  );
}
```

**Key decisions**:

- **Exact content preservation**: The component body is identical to the inline `BoardPage` in `App.tsx` lines 14–21. No changes to structure, styling, or content. The only difference is the `import` for `PRIORITIES` which now lives in this file instead of `App.tsx`.

- **`PRIORITIES` import stays with `BoardPage`**: The `PRIORITIES` constant is only used by the board page, not by any other component in `App.tsx`. Moving the import here keeps the dependency co-located with its consumer.

### D4: `packages/client/src/App.tsx`

**Purpose**: Simplify `App.tsx` by importing page components from `pages/` directory instead of defining them inline.

**Current state** (after t06):

```typescript
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PRIORITIES } from "@taskboard/shared";
import { AuthProvider } from "./context/auth-context";
import { ProtectedRoute } from "./components/protected-route";

function LoginPage() {
  return <h1>Login</h1>;
}

function DashboardPage() {
  return <h1>Dashboard</h1>;
}

function BoardPage() {
  return (
    <div>
      <h1>Board</h1>
      <p>Priority levels: {PRIORITIES.join(", ")}</p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects/:id/board" element={<BoardPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**After**:

```typescript
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/auth-context";
import { ProtectedRoute } from "./components/protected-route";
import { LoginPage } from "./pages/login-page";
import { DashboardPage } from "./pages/dashboard-page";
import { BoardPage } from "./pages/board-page";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects/:id/board" element={<BoardPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**Changes**:

1. **Remove inline `LoginPage`, `DashboardPage`, `BoardPage` function definitions** — lines 6–21 are deleted.
2. **Remove `import { PRIORITIES } from "@taskboard/shared"`** — no longer used in `App.tsx` (moved to `board-page.tsx`).
3. **Add three imports** for page components from `./pages/` directory.
4. **Route structure unchanged** — `<BrowserRouter>`, `<AuthProvider>`, `<Routes>`, `<ProtectedRoute>` wrapper, and all route paths remain exactly as they are. No structural changes to the routing.

## 4. Contracts

### LoginPage Contract

- **Renders at `/login`**: Accessible without authentication (outside `ProtectedRoute` wrapper).
- **Already-authenticated redirect**: If `isAuthenticated === true`, renders `<Navigate to="/" replace />`.
- **Loading state**: If `isLoading === true` (token validation in progress), renders "Loading..." centered on screen.
- **Form behavior**:
  - Two controlled inputs: email (`type="email"`, `required`) and password (`type="password"`, `required`).
  - Submit calls `login(email, password)` from `useAuth()`.
  - During submission: button shows "Signing in..." and is `disabled`.
  - On success: `navigate("/")` redirects to dashboard.
  - On failure: error message displayed in a red banner above the form. Error text is from `err.message` (either `"Unauthorized"` from the 401 interceptor or a more specific message if `api/auth.ts` is later refactored).

### DashboardPage Contract

- **Renders at `/`**: Protected by `ProtectedRoute` — requires authentication.
- **User display**: Shows `"Welcome, {user.name}"` in the main content area and `user.name` in the header.
- **Logout**: Button calls `logout()` from `useAuth()`. Clears token from `localStorage`, resets user state, navigates to `/login`.

### BoardPage Contract

- **Renders at `/projects/:id/board`**: Protected by `ProtectedRoute` — requires authentication.
- **Content**: Placeholder text showing priority levels from `@taskboard/shared`. Identical to the current inline version.

### Route Structure Contract

```
/login            → LoginPage (public)
/                 → ProtectedRoute → DashboardPage (protected)
/projects/:id/board → ProtectedRoute → BoardPage (protected)
```

## 5. Test Plan

The task spec does not list a test file as a deliverable. The phase spec's task 8 ("End-to-End Smoke Verification") covers behavioral verification of the login page and dashboard. No unit tests or integration tests are required for this task.

### Verification Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| V1 | Login page renders at `/login` and is accessible without authentication | Start app, navigate to `/login` — form renders without redirect |
| V2 | Submitting valid credentials redirects to the dashboard | Enter `admin@taskboard.local` / `admin123`, click "Sign in" — redirected to `/` showing "Welcome, Admin" |
| V3 | Submitting invalid credentials shows an error message | Enter wrong password, click "Sign in" — red error banner appears with error message |
| V4 | Submit button is disabled during login request | Click "Sign in" — button text changes to "Signing in..." and button is disabled (grayed out, not clickable) |
| V5 | Dashboard renders at `/` and displays "Welcome, {name}" | After login, dashboard shows "Welcome, Admin" |
| V6 | Logout button clears auth state and redirects to `/login` | Click "Logout" on dashboard — redirected to `/login`, `localStorage.getItem("taskboard_token")` returns `null` |
| V7 | Board page renders at `/projects/:id/board` and requires authentication | After login, navigate to `/projects/123/board` — board page renders. Without login, same URL redirects to `/login` |
| V8 | Navigating to `/` while unauthenticated redirects to `/login` | Clear localStorage, navigate to `/` — redirected to `/login` |
| V9 | Already authenticated users visiting `/login` are redirected to `/` | After login, navigate to `/login` — redirected to `/` |

### TypeScript Compilation Check

```bash
npx tsc --noEmit -p packages/client/tsconfig.json
```

This verifies:
- `useAuth()` return type is correctly destructured in all page components
- `useNavigate()` and `Navigate` are correctly used from `react-router-dom`
- `PRIORITIES` import works in the extracted `BoardPage`
- `FormEvent` type is correctly used for form submission handler
- No type errors in any of the new or modified files

## 6. Implementation Order

1. **Create `packages/client/src/pages/` directory** — The directory doesn't exist yet. All three page files will be created inside it.

2. **Create `packages/client/src/pages/board-page.tsx`** — Extract the board page placeholder. This file has no dependencies on other new files — it only imports `PRIORITIES` from `@taskboard/shared`.

3. **Create `packages/client/src/pages/dashboard-page.tsx`** — Write the placeholder dashboard with welcome message and logout button. This file depends on `context/auth-context.tsx` (already exists from t06).

4. **Create `packages/client/src/pages/login-page.tsx`** — Write the full login page with form, error handling, loading state, and redirect logic. This file depends on `context/auth-context.tsx` (already exists from t06).

5. **Modify `packages/client/src/App.tsx`** — Remove the three inline page component definitions, remove the `PRIORITIES` import, add three imports from `./pages/`. The route structure stays the same.

6. **Run verification commands** — Ensure TypeScript compilation passes and the client build succeeds.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compilation (no type errors in new/modified files)
npx tsc --noEmit -p packages/client/tsconfig.json

# 2. Verify the client build succeeds (includes TypeScript check + Vite build)
npm run build -w packages/client

# 3. Verify the page files were created
ls -la packages/client/src/pages/
# Expected: login-page.tsx, dashboard-page.tsx, board-page.tsx

# 4. Runtime verification (requires server running with MongoDB + seed user)
# Start both: npm run dev
# Open http://localhost:5173/ in browser
# Expected: Redirected to /login (no token in localStorage)
# Enter admin@taskboard.local / admin123, click "Sign in"
# Expected: Redirected to / showing "Welcome, Admin" and "Logout" button
# Click "Logout"
# Expected: Redirected to /login, token cleared from localStorage
# Enter wrong password, click "Sign in"
# Expected: Error message displayed in red banner
# After login, navigate to /login
# Expected: Redirected to / (already authenticated)
# After login, navigate to /projects/123/board
# Expected: Board page renders with priority levels text

# 5. Run all existing server tests to confirm no regressions
npm run test -w packages/server
```