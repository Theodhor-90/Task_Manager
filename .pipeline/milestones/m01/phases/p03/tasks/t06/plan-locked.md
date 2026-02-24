Now I have all the context I need. Let me also check the `react-router-dom` version more carefully to understand which APIs are available (v6.15.0).

# Task 6 Implementation Plan: Auth Context and Route Guards

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| D1 | `packages/client/src/context/auth-context.tsx` | Create | React context providing auth state (`user`, `token`, `isLoading`, `isAuthenticated`), `login()`, and `logout()` functions; `useAuth()` hook |
| D2 | `packages/client/src/components/protected-route.tsx` | Create | Route guard component that renders `<Outlet />` when authenticated, shows loading indicator during token validation, and redirects to `/login` when not authenticated |
| D3 | `packages/client/src/App.tsx` | Modify | Wrap routes with `AuthProvider`, nest protected routes under `<ProtectedRoute />`, keep `/login` as public route |

## 2. Dependencies

| Dependency | Status | Source |
|------------|--------|--------|
| `react-router-dom` 6.15.0 | Already installed | `packages/client/package.json` — provides `Navigate`, `Outlet`, `useNavigate` |
| `react` ^19.0.0 | Already installed | `packages/client/package.json` — provides `createContext`, `useContext`, `useState`, `useEffect`, `useCallback` |
| `login()` function from `api/auth.ts` | Already implemented | t05 — `packages/client/src/api/auth.ts` line 4 |
| `getMe()` function from `api/auth.ts` | Already implemented | t05 — `packages/client/src/api/auth.ts` line 11 |
| `TOKEN_KEY` constant from `api/client.ts` | Already implemented | t05 — `packages/client/src/api/client.ts` line 6 — value is `"taskboard_token"` |
| `LoginResponse` type from `@taskboard/shared` | Already defined | `packages/shared/src/types/index.ts` lines 72–81 |

No new package installs are required.

## 3. Implementation Details

### D1: `packages/client/src/context/auth-context.tsx`

**Purpose**: A React context that manages the entire auth lifecycle — token validation on mount, login, logout — and exposes the current auth state to all child components. This is the single source of truth for whether the user is authenticated.

**Exports**:
- `AuthProvider` — React component that wraps children with the auth context
- `useAuth()` — custom hook that returns the auth context value; throws if used outside `AuthProvider`

**Full implementation**:

```typescript
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, getMe } from "../api/auth";
import { TOKEN_KEY } from "../api/client";

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    getMe()
      .then((response) => {
        setUser(response.data);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await apiLogin(email, password);
      localStorage.setItem(TOKEN_KEY, response.data.token);
      setToken(response.data.token);
      setUser(response.data.user);
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const isAuthenticated = user !== null && token !== null;

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, isAuthenticated, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

**Key decisions**:

- **`AuthUser` interface**: Defines `{ id: string, email: string, name: string }` — the public user fields without `passwordHash`, `_id`, `createdAt`, or `updatedAt`. This matches the shape returned by both `POST /api/auth/login` (`response.data.user`) and `GET /api/auth/me` (`response.data`).

- **`token` state initialized from `localStorage`**: On first render, the token is read from `localStorage.getItem(TOKEN_KEY)`. This avoids an unnecessary re-render — if a token exists, the `useEffect` immediately kicks off `getMe()` validation. If no token exists, `isLoading` is set to `false` synchronously in the effect.

- **`isLoading` starts as `true`**: The auth context enters a loading state on mount. This prevents the `ProtectedRoute` from flashing a redirect to `/login` before the token validation completes. Once `getMe()` resolves or rejects (or if no token exists), `isLoading` is set to `false`.

- **`useEffect` with `[token]` dependency**: The effect runs whenever `token` changes. On initial mount, if a token exists, it calls `getMe()` to validate it. If validation fails (401 or network error), the token is cleared and the user is set to `null`. The `getMe()` function uses `apiClient.get()` which reads the token from `localStorage` directly (set during initialization or after login), so the token is available for the request.

  **Important nuance about the `[token]` dependency**: When `login()` is called, it sets the token via `setToken(response.data.token)`, which triggers this `useEffect`. However, this is harmless — `getMe()` will succeed (the token was just obtained), and `setUser()` will set the same user data that `login()` already set. The effect is idempotent. An alternative would be to track a `needsValidation` flag, but the extra complexity isn't warranted for the MVP.

- **`login()` function**: Calls `apiLogin()` from `api/auth.ts`, then stores the token in `localStorage` and updates both `token` and `user` state. The function is `async` and propagates errors — the login page can `catch` the error and display it to the user. The `apiLogin()` function currently uses `apiClient.post()`, which means a 401 from the server (wrong credentials) will trigger the `apiClient`'s 401 interceptor (clears token, redirects to `/login`). Since the user is already on `/login`, the redirect is a no-op and the `throw new Error("Unauthorized")` propagates to the login page's catch handler. This works correctly but the error message will be `"Unauthorized"` rather than `"Invalid credentials"`. If the login page needs the specific server error message, the `login()` function in `api/auth.ts` should be updated to use `fetch` directly (as the t05 plan originally intended). However, for this task, we work with the existing `api/auth.ts` implementation as-is.

- **`logout()` function**: Clears the token from `localStorage`, sets both `token` and `user` to `null`, and navigates to `/login` via `useNavigate()`. The `navigate()` call is a React Router navigation (client-side), not a full page reload — this preserves the SPA experience. The `apiClient`'s 401 interceptor uses `window.location.href = "/login"` (hard redirect) for unexpected 401s, while `logout()` uses `navigate("/login")` for intentional logout. Both end up at `/login` but through different mechanisms.

- **`useNavigate()` used inside `AuthProvider`**: This requires `AuthProvider` to be rendered inside a `BrowserRouter`. The phase spec confirms: "AuthProvider wraps the entire app in `App.tsx` (inside `BrowserRouter`)." Since `App.tsx` currently wraps everything in `<BrowserRouter>`, the `AuthProvider` will go inside `<BrowserRouter>` but outside `<Routes>`.

- **`isAuthenticated` as derived value**: Computed as `user !== null && token !== null` on every render. Not stored as state — it's derived from `user` and `token`. This prevents state synchronization bugs where `isAuthenticated` could get out of sync with the actual user/token values.

- **Context value `null` as sentinel**: The `AuthContext` is created with `null` as default value. The `useAuth()` hook checks for `null` and throws a descriptive error if used outside `AuthProvider`. This is the standard React context pattern for contexts that require a provider.

- **`useCallback` for `login` and `logout`**: Wrapping these in `useCallback` prevents unnecessary re-renders of consuming components. `login` has no dependencies (it only uses `apiLogin` which is a module-level import and state setters which are stable). `logout` depends on `navigate` (stable across renders in React Router v6, but included for correctness).

### D2: `packages/client/src/components/protected-route.tsx`

**Purpose**: A route guard component that sits in the React Router route tree and gates access to child routes based on authentication state.

**Exports**: `ProtectedRoute` — a React component.

**Full implementation**:

```typescript
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
```

**Key decisions**:

- **Three-state rendering**: The component handles three states:
  1. `isLoading === true`: Token validation in progress. Renders a centered "Loading..." text. This prevents the flash-of-login-page problem — without the loading state, the user would see the login page briefly before being redirected to the dashboard after token validation succeeds.
  2. `isAuthenticated === false && isLoading === false`: No valid token. Redirects to `/login` via `<Navigate>`.
  3. `isAuthenticated === true`: Valid token and user data. Renders `<Outlet />` which renders the matched child route.

- **`<Navigate to="/login" replace />`**: The `replace` prop replaces the current history entry instead of pushing a new one. This prevents the user from pressing "back" to return to a protected route they don't have access to — the browser back button will go to the page before the protected route, not back to the redirect.

- **`<Outlet />`**: React Router v6's `<Outlet />` renders the child routes defined under this route in the route tree. This is the standard pattern for layout routes — `ProtectedRoute` acts as a layout that either renders children or redirects.

- **Loading indicator uses Tailwind CSS**: A minimal loading indicator — centered text "Loading..." with gray color. This matches the project's styling approach (Tailwind CSS utility classes). The loading state is typically brief (one API call to `/api/auth/me`), so a simple text indicator is sufficient for the MVP. No spinner component needed.

- **No `useEffect` or `useNavigate`**: The component is purely declarative — it reads auth state and returns JSX. The navigation is handled by React Router's `<Navigate>` component, not by imperative `navigate()` calls. This is simpler and more predictable.

### D3: `packages/client/src/App.tsx`

**Purpose**: Wire up `AuthProvider` and `ProtectedRoute` into the existing route structure.

**Current state**:

```typescript
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { Priority } from "@taskboard/shared";
import { PRIORITIES } from "@taskboard/shared";

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
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects/:id/board" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Changes**:
1. Import `AuthProvider` from `./context/auth-context`
2. Import `ProtectedRoute` from `./components/protected-route`
3. Wrap `<Routes>` with `<AuthProvider>` (inside `<BrowserRouter>`, as `AuthProvider` uses `useNavigate()`)
4. Nest `/` and `/projects/:id/board` routes under a `<Route element={<ProtectedRoute />}>` parent
5. Keep `/login` route outside the `ProtectedRoute` wrapper (it's public)
6. Keep the inline placeholder page components for now — they will be extracted to `pages/` files in task 7

**After**:

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

**Key decisions**:

- **`AuthProvider` inside `BrowserRouter`**: Required because `AuthProvider` uses `useNavigate()` for the `logout()` function. `useNavigate()` must be called inside a Router context. The `AuthProvider` wraps `<Routes>` so the entire route tree has access to the auth context.

- **`<Route element={<ProtectedRoute />}>` without a `path`**: A pathless route in React Router v6 acts as a layout route — it renders for all child route matches. The `ProtectedRoute` component renders `<Outlet />` on success, which renders the matched child route (`/` or `/projects/:id/board`). This is the standard React Router v6 pattern for route guards.

- **`/login` route is outside `ProtectedRoute`**: The login page must be accessible without authentication. It's a sibling of the `ProtectedRoute` layout route, not a child.

- **Inline page components preserved**: The placeholder `LoginPage`, `DashboardPage`, and `BoardPage` components remain inline in `App.tsx`. Task 7 will extract them to dedicated files in `pages/`. This task only adds the auth context and route guard — it doesn't restructure the page components.

- **`import type { Priority }` removed**: The current `App.tsx` imports `Priority` as a type import but never uses it (only `PRIORITIES` is used in `BoardPage`). The `type` import is dead code. Removing it cleans up the file without any functional impact.

## 4. Contracts

### AuthProvider Contract

```typescript
import { AuthProvider, useAuth } from "./context/auth-context";

// In App.tsx:
<BrowserRouter>
  <AuthProvider>
    {/* children can call useAuth() */}
  </AuthProvider>
</BrowserRouter>

// In any child component:
const { user, token, isLoading, isAuthenticated, login, logout } = useAuth();

// State types:
user: { id: string, email: string, name: string } | null
token: string | null
isLoading: boolean       // true during initial token validation
isAuthenticated: boolean // derived: user !== null && token !== null

// Login — throws on failure (caller must catch)
await login("admin@taskboard.local", "admin123");
// Success: token stored in localStorage, user/token state updated
// Failure: Error thrown with message from API

// Logout — synchronous, no errors
logout();
// Clears localStorage, resets state, navigates to /login
```

### ProtectedRoute Contract

```typescript
import { ProtectedRoute } from "./components/protected-route";

// In route tree:
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<DashboardPage />} />
    {/* All child routes require authentication */}
  </Route>
</Routes>

// Behavior:
// isLoading=true  → renders "Loading..." centered on screen
// isAuthenticated=false → <Navigate to="/login" replace />
// isAuthenticated=true  → <Outlet /> (renders matched child route)
```

### localStorage Contract

| Key | Value | Set By | Read By | Cleared By |
|-----|-------|--------|---------|------------|
| `taskboard_token` | JWT string | `AuthProvider.login()` | `apiClient` (on every request), `AuthProvider` (on mount for initial state) | `AuthProvider.logout()`, `apiClient` (on 401) |

### Auth State Lifecycle

```
1. App mounts
2. AuthProvider initializes:
   - token = localStorage.getItem("taskboard_token")
   - isLoading = true
3. If token exists:
   - Calls getMe() to validate
   - Success: setUser(response.data), isLoading=false
   - Failure: clear token/user, isLoading=false
4. If no token:
   - isLoading = false immediately
5. ProtectedRoute renders:
   - isLoading=true → "Loading..."
   - isAuthenticated=false → Navigate to /login
   - isAuthenticated=true → Outlet (child route)
6. User logs in:
   - login() calls API, stores token, sets user
   - isAuthenticated becomes true
   - ProtectedRoute renders Outlet
7. User logs out:
   - logout() clears token/user, navigates to /login
   - isAuthenticated becomes false
```

## 5. Test Plan

The task spec does not list a test file as a deliverable. The phase spec does not include client-side unit tests for the auth context or route guard in any task's deliverables. The verification is behavioral and will be validated in task 7 (login page integration) and task 8 (end-to-end smoke verification).

### Verification Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| V1 | `AuthProvider` initializes with `isLoading: true`, validates token on mount, then sets `isLoading: false` | Task 8: Open app with no token → loading briefly shown → redirect to `/login`. Open app with valid token → loading briefly shown → dashboard renders. |
| V2 | `login()` stores token, sets user state, and `isAuthenticated` becomes `true` | Task 7: Login page calls `login()`, on success user is redirected to dashboard. Token is in `localStorage`. |
| V3 | `logout()` clears token, sets user to null, `isAuthenticated` becomes `false`, and navigates to `/login` | Task 7: Dashboard logout button calls `logout()`, user is redirected to `/login`, token cleared from `localStorage`. |
| V4 | `ProtectedRoute` renders children when authenticated | Task 8: After login, navigating to `/` or `/projects/:id/board` renders the page content. |
| V5 | `ProtectedRoute` redirects to `/login` when not authenticated | Task 8: Without a token, navigating to `/` redirects to `/login`. |
| V6 | `ProtectedRoute` shows loading indicator while token validation is in progress | Task 8: With a token in `localStorage`, reload the page — "Loading..." appears briefly before content. |

### TypeScript Compilation Check

```bash
npx tsc --noEmit -p packages/client/tsconfig.json
```

This verifies:
- `useNavigate()`, `Navigate`, `Outlet` are correctly typed from `react-router-dom`
- `useAuth()` return type matches `AuthContextValue`
- `login()` and `getMe()` return types from `api/auth.ts` are used correctly
- `TOKEN_KEY` is imported correctly from `api/client.ts`
- No type errors in the new files

## 6. Implementation Order

1. **Create `packages/client/src/context/auth-context.tsx`** — Write the full `AuthProvider` component and `useAuth()` hook. This file depends on `api/auth.ts` (for `login` and `getMe` functions) and `api/client.ts` (for `TOKEN_KEY`), both of which already exist from t05.

2. **Create `packages/client/src/components/protected-route.tsx`** — Write the `ProtectedRoute` component. This file depends on `context/auth-context.tsx` (for `useAuth()`) which was created in step 1.

3. **Modify `packages/client/src/App.tsx`** — Import `AuthProvider` and `ProtectedRoute`, wrap routes with `AuthProvider`, nest protected routes under `<Route element={<ProtectedRoute />}>`. Remove unused `Priority` type import.

4. **Run verification commands** — Ensure TypeScript compilation passes and the build succeeds.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compilation (no type errors in new files)
npx tsc --noEmit -p packages/client/tsconfig.json

# 2. Verify the client build succeeds
npm run build -w packages/client

# 3. Verify the files were created correctly
ls -la packages/client/src/context/
# Expected: auth-context.tsx
ls -la packages/client/src/components/
# Expected: protected-route.tsx

# 4. Runtime verification (requires server running with MongoDB + seed user)
# Start both: npm run dev
# Open http://localhost:5173/ in browser
# Expected: Redirected to /login (no token in localStorage)
# Open DevTools console:
#   localStorage.setItem("taskboard_token", "garbage")
# Refresh page
# Expected: "Loading..." briefly, then redirected to /login (invalid token cleared)
```