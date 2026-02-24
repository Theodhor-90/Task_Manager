Now I have complete context. Let me write the plan.

# Task 5 Implementation Plan: Client API Utility

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| D1 | `packages/client/src/api/client.ts` | Create | Generic HTTP client wrapping `fetch` with JWT token injection, JSON handling, error parsing, and 401 interception |
| D2 | `packages/client/src/api/auth.ts` | Create | Auth-specific API functions (`login`, `getMe`) that use the generic client |

## 2. Dependencies

| Dependency | Status | Source |
|------------|--------|--------|
| `@taskboard/shared` types (`LoginRequest`, `LoginResponse`, `ApiSuccessResponse`) | Already defined | `packages/shared/src/types/index.ts` lines 67–93 |
| Native `fetch` API | Built-in | Available in all modern browsers and Vite dev server |
| Vite dev proxy (`/api` → `localhost:3001`) | Already configured | `packages/client/vite.config.ts` lines 8–13 |
| `POST /api/auth/login` endpoint | Already implemented | t03 — `packages/server/src/routes/auth.routes.ts` |
| `GET /api/auth/me` endpoint | Already implemented | t03 — `packages/server/src/routes/auth.routes.ts` |
| `localStorage` API | Built-in | Browser standard |

No new package installs are required.

## 3. Implementation Details

### D1: `packages/client/src/api/client.ts`

**Purpose**: A generic HTTP client that wraps the native `fetch` API. All API calls in the application go through this client, ensuring consistent behavior: JWT token injection, JSON serialization, error handling, and 401 interception.

**Exports**:
- `API_BASE_URL` — constant string, the base URL for all API calls
- `TOKEN_KEY` — constant string `"taskboard_token"`, the localStorage key for the JWT
- `apiClient` — object with `get`, `post`, `put`, `del` methods

**Full implementation**:

```typescript
import type { ApiErrorResponse } from "@taskboard/shared";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const TOKEN_KEY = "taskboard_token";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: "GET" });
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  del<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};
```

**Key decisions**:

- **`API_BASE_URL` from `import.meta.env.VITE_API_URL`**: Vite exposes env vars prefixed with `VITE_` on `import.meta.env`. The default is `http://localhost:3001` — the server's default port from `config.ts`. However, during development with `npm run dev`, the Vite proxy at `/api` (configured in `vite.config.ts` lines 8–13) forwards `/api/*` requests to `localhost:3001`. When the proxy is active, the base URL could be empty string instead. We use the full URL as the default for production builds and for cases where the proxy isn't available. The `VITE_API_URL` env var allows overriding in any environment.

- **`TOKEN_KEY = "taskboard_token"`**: A named constant exported so the auth context (task 6) uses the same key. Per the phase spec: "Token key in localStorage is `taskboard_token` — must be consistent across API client and auth context."

- **Private `request<T>()` function**: A single internal function handles all HTTP methods. This avoids duplicating the token injection, error handling, and 401 interception logic across `get`, `post`, `put`, `del`. The generic type parameter `T` flows through to the caller, providing typed responses.

- **`Content-Type: application/json` on all requests**: Set by default on every request. This is safe for GET/DELETE (servers ignore the header when there's no body) and required for POST/PUT. The alternative — only setting it when `body` is present — adds complexity for no benefit, since the server doesn't reject requests with an unused Content-Type header.

- **Token injection only when present**: `localStorage.getItem(TOKEN_KEY)` returns `null` when no token is stored. The `Authorization` header is only added when a token exists. This allows unauthenticated requests (like `POST /api/auth/login`) to go through without a token.

- **401 interception — clear token and redirect**: On a 401 response, the client clears the stored token (it's invalid or expired) and redirects to `/login` via `window.location.href = "/login"`. This is a hard redirect (full page reload), not a React Router navigation. This is intentional: a 401 means the app's auth state is invalid, so a clean restart via full reload ensures no stale state persists in React components or context. The `throw new Error("Unauthorized")` after the redirect ensures the calling code doesn't try to process the response.

- **Non-2xx error handling**: For non-401 errors, the client attempts to parse the response body as JSON to extract the `error` field (per the `{ error: string }` envelope from MASTER_PLAN §3.2). If JSON parsing fails (e.g., the server returned HTML), a generic error message with the status code is used. The error is thrown as a standard `Error` object so callers can catch it with a standard try/catch.

- **`response.json()` return type**: Cast to `Promise<T>` because `response.json()` returns `Promise<any>`. The generic `T` provides type safety at the call site without requiring runtime validation (acceptable for an MVP where the server and client are co-developed).

- **`apiClient` as an object with methods**: Rather than exporting four standalone functions, the methods are grouped on a single `apiClient` object. This provides a clean namespace (`apiClient.get(...)`) and matches the phase spec's language ("apiClient object or set of functions").

- **No `login`-specific 401 bypass**: The `POST /api/auth/login` endpoint returns 401 for invalid credentials, which would trigger the 401 interceptor (clearing token + redirecting). However, this is actually fine for the login endpoint: (1) there's no token to clear when logging in, so `localStorage.removeItem` is a no-op, and (2) `window.location.href = "/login"` redirects to the page the user is already on, which is harmless. The `throw new Error("Unauthorized")` prevents the caller from receiving a success response, which is the correct behavior. The auth API wrapper in D2 will NOT use the generic `apiClient` for the login call — it will use `fetch` directly to avoid the 401 interceptor. This gives the login page control over how to display the "Invalid credentials" error to the user, rather than triggering a redirect.

  **Correction**: Re-reading the spec more carefully, the spec says "Each method reads the JWT from localStorage... sets Authorization: Bearer <token> header if present" and "On 401 responses specifically: clears taskboard_token from localStorage and redirects to /login via window.location.href". The `auth.ts` wrapper functions are specified to use the `apiClient`. But for `login()`, the 401 response contains `{ error: "Invalid credentials" }` which should be shown to the user, not trigger a redirect. There are two approaches:

  1. Have `login()` call `fetch` directly (bypassing the interceptor)
  2. Have `login()` use `apiClient.post()` and accept the redirect behavior

  Approach 1 is better because it lets the login page display the specific error message. The spec says `login()` "calls `POST /api/auth/login`" — it doesn't require using `apiClient` internally. The `getMe()` function should use `apiClient` since it's a normal authenticated call.

### D2: `packages/client/src/api/auth.ts`

**Purpose**: Auth-specific API functions that provide a typed interface for the login and me endpoints.

**Exports**:
- `login(email: string, password: string): Promise<LoginResponse>` — calls `POST /api/auth/login`
- `getMe(): Promise<ApiSuccessResponse<{ id: string; email: string; name: string }>>` — calls `GET /api/auth/me`

**Full implementation**:

```typescript
import type { LoginResponse, ApiSuccessResponse } from "@taskboard/shared";
import { API_BASE_URL, apiClient } from "./client.js";

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Login failed");
  }

  return response.json() as Promise<LoginResponse>;
}

export async function getMe(): Promise<
  ApiSuccessResponse<{ id: string; email: string; name: string }>
> {
  return apiClient.get("/api/auth/me");
}
```

**Key decisions**:

- **`login()` uses `fetch` directly, not `apiClient`**: The login endpoint returns 401 with `{ error: "Invalid credentials" }` for wrong passwords. If `login()` used `apiClient.post()`, the 401 interceptor would clear the token and redirect to `/login` — but the user is already on `/login` and expects to see the error message. By using `fetch` directly, the login page can catch the thrown error and display it in the form. The `login()` function does NOT inject a token (there's no token yet when logging in) and does NOT trigger the 401 redirect.

- **`getMe()` uses `apiClient.get()`**: This is a normal authenticated request. If the token is invalid/expired, the 401 interceptor correctly clears the token and redirects to login. This is the desired behavior for `getMe()` — it's called on app mount to validate the stored token (task 6), and if validation fails, redirecting to login is correct.

- **Return types match shared types**: `login()` returns `LoginResponse` (`{ data: { token, user: { id, email, name } } }`). `getMe()` returns `ApiSuccessResponse<{ id, email, name }>` (`{ data: { id, email, name } }`). These types are imported from `@taskboard/shared`, ensuring the client and server agree on the response shape.

- **Error handling in `login()`**: On non-2xx responses, `login()` tries to parse the response body to extract the `error` field. This covers both 400 (`"Email and password are required"`) and 401 (`"Invalid credentials"`) responses from the server. If JSON parsing fails, a generic `"Login failed"` message is used. The error is thrown as a standard `Error` so the login page's try/catch can display `error.message`.

- **No explicit `LoginRequest` usage**: The `login()` function takes `email` and `password` as separate string parameters rather than a `LoginRequest` object. This is a more ergonomic API for the caller (`login("admin@taskboard.local", "admin123")` vs `login({ email: "admin@taskboard.local", password: "admin123" })`). Internally, `JSON.stringify({ email, password })` produces the same JSON body that matches the `LoginRequest` shape.

## 4. Contracts

### API Client Contract

```typescript
import { apiClient, API_BASE_URL, TOKEN_KEY } from "./api/client";

// Constants
API_BASE_URL  // "http://localhost:3001" (or from VITE_API_URL env var)
TOKEN_KEY     // "taskboard_token"

// Methods — all return parsed JSON, throw Error on failure
apiClient.get<T>(path: string): Promise<T>
apiClient.post<T>(path: string, body: unknown): Promise<T>
apiClient.put<T>(path: string, body: unknown): Promise<T>
apiClient.del<T>(path: string): Promise<T>
```

**Token injection**: If `localStorage.getItem("taskboard_token")` returns a non-null value, the `Authorization: Bearer <token>` header is added to every request.

**401 interception**: On a 401 response, `taskboard_token` is removed from localStorage, `window.location.href` is set to `"/login"`, and an `Error("Unauthorized")` is thrown.

**Error handling**: On any non-2xx, non-401 response, an `Error` is thrown with the `error` field from the response body (or a generic message if the body isn't parseable JSON).

### Auth API Contract

```typescript
import { login, getMe } from "./api/auth";

// Login — does NOT use apiClient (no 401 redirect)
const response = await login("admin@taskboard.local", "admin123");
// Success: { data: { token: "eyJ...", user: { id: "...", email: "...", name: "..." } } }
// Failure: throws Error("Invalid credentials") or Error("Email and password are required")

// Get current user — uses apiClient (has 401 redirect)
const me = await getMe();
// Success: { data: { id: "...", email: "...", name: "..." } }
// 401: clears token, redirects to /login, throws Error("Unauthorized")
```

### Conformance to Shared Types

| Function | Return Type | Shared Type |
|----------|-------------|-------------|
| `login()` | `Promise<LoginResponse>` | `LoginResponse` from `@taskboard/shared` — `{ data: { token: string, user: { id: string, email: string, name: string } } }` |
| `getMe()` | `Promise<ApiSuccessResponse<{ id: string; email: string; name: string }>>` | `ApiSuccessResponse<T>` from `@taskboard/shared` — `{ data: T }` |

### localStorage Contract

| Key | Value | Set By | Read By | Cleared By |
|-----|-------|--------|---------|------------|
| `taskboard_token` | JWT string | Auth context (task 6, after `login()` returns) | `apiClient` (on every request) | `apiClient` (on 401), auth context (on logout) |

## 5. Test Plan

The task spec states: "Dependencies: None within this phase (client-side code, no dependency on other tasks). Server must be running for runtime testing, but the code itself is independent." and "Verification Criteria" lists 5 behavioral checks.

Since the task spec does not list a test file as a deliverable and the phase spec does not include client-side unit tests for the API utility in any task's deliverables (task 4 covers server-side auth integration tests; task 8 covers end-to-end smoke verification), no test file is created. The verification is done through the criteria below, which will be validated at runtime in task 8 (end-to-end smoke verification) and by the auth context (task 6) and login page (task 7) which consume these functions.

### Verification Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| V1 | `apiClient.get('/api/auth/me')` includes `Authorization: Bearer <token>` header when token exists in localStorage | Manually: set `localStorage.setItem("taskboard_token", "test")`, call `apiClient.get('/api/auth/me')`, inspect network request in browser DevTools |
| V2 | `apiClient.post('/api/auth/login', { email, password })` sends correct JSON body and returns parsed response | Manually: start server with seed user, call via browser console, verify response matches `LoginResponse` shape |
| V3 | A 401 response from any API call clears localStorage and redirects to `/login` | Manually: set a garbage token in localStorage, call `apiClient.get('/api/auth/me')`, verify token is cleared and page redirects to `/login` |
| V4 | A non-2xx response (other than 401) throws an error with the server's error message | Manually: call `login("admin@taskboard.local", "wrongpassword")`, catch the error, verify `error.message` is `"Invalid credentials"` |
| V5 | `login()` and `getMe()` functions correctly call the API and return typed responses | TypeScript compilation (`tsc --noEmit`) verifies type correctness. Runtime verification in task 6 (auth context) and task 7 (login page) |

### TypeScript Compilation Check

```bash
npx tsc --noEmit -p packages/client/tsconfig.json
```

This verifies:
- `@taskboard/shared` types are correctly imported and used
- `import.meta.env.VITE_API_URL` is valid in a Vite/TypeScript context
- Return types of `login()` and `getMe()` match the declared types
- No type errors in the API client or auth functions

## 6. Implementation Order

1. **Create `packages/client/src/api/` directory** — The `api/` directory doesn't exist yet. Both files will be created inside it.

2. **Create `packages/client/src/api/client.ts`** — Write the generic HTTP client with `API_BASE_URL`, `TOKEN_KEY`, the private `request<T>()` function, and the `apiClient` object. This file has no dependencies on other new files.

3. **Create `packages/client/src/api/auth.ts`** — Write the `login()` and `getMe()` functions. This file depends on `client.ts` for `API_BASE_URL` and `apiClient`, and on `@taskboard/shared` for types.

4. **Run verification commands** — Ensure TypeScript compilation passes.

## 7. Verification Commands

```bash
# 1. Verify TypeScript compilation (no type errors in new files)
npx tsc --noEmit -p packages/client/tsconfig.json

# 2. Verify the client build succeeds
npm run build -w packages/client

# 3. Verify the files were created correctly
ls -la packages/client/src/api/
# Expected: client.ts, auth.ts

# 4. Runtime verification (requires server running with MongoDB)
# Start server: npm run dev
# Open browser to http://localhost:5173
# Open DevTools console and run:
#   import { login } from '/src/api/auth.ts'
#   const res = await login('admin@taskboard.local', 'admin123')
#   console.log(res)
# Expected: { data: { token: "eyJ...", user: { id: "...", email: "admin@taskboard.local", name: "Admin" } } }
```