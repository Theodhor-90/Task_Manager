## Objective

Create a client-side HTTP utility that wraps `fetch` with automatic JWT token injection, consistent error handling, and 401 interception for all API calls.

## Deliverables

### New Files

- **`packages/client/src/api/client.ts`** — Exports:
  - `API_BASE_URL` constant: `http://localhost:3001` (or from `import.meta.env.VITE_API_URL`)
  - `apiClient` object or set of functions providing:
    - `get<T>(path: string): Promise<T>` — GET request with auth header
    - `post<T>(path: string, body: unknown): Promise<T>` — POST request with auth header
    - `put<T>(path: string, body: unknown): Promise<T>` — PUT request with auth header
    - `del<T>(path: string): Promise<T>` — DELETE request with auth header
  - Each method reads the JWT from `localStorage` (key: `taskboard_token`), sets `Authorization: Bearer <token>` header if present, sets `Content-Type: application/json`
  - On non-2xx responses: throws an error with the `error` field from the response body (or a generic message)
  - On 401 responses specifically: clears `taskboard_token` from `localStorage` and redirects to `/login` via `window.location.href`

- **`packages/client/src/api/auth.ts`** — Exports:
  - `login(email: string, password: string): Promise<LoginResponse>` — calls `POST /api/auth/login`
  - `getMe(): Promise<ApiSuccessResponse<{ id: string; email: string; name: string }>>` — calls `GET /api/auth/me`

## Key Implementation Details

- Token key in localStorage is `taskboard_token` — must be consistent across API client and auth context.
- All API calls go through the shared client, ensuring consistent auth header injection and error handling.
- The 401 interceptor provides global logout behavior: if the server rejects a token (expired or invalid), the user is immediately redirected to login.
- Uses native `fetch` API — no additional HTTP library needed.
- Types from `@taskboard/shared` (`LoginResponse`, `ApiSuccessResponse`, `ApiErrorResponse`) should be used where applicable.

## Dependencies

- None within this phase (client-side code, no dependency on other tasks).
- Server must be running for runtime testing, but the code itself is independent.

## Verification Criteria

1. `apiClient.get('/api/auth/me')` includes `Authorization: Bearer <token>` header when token exists in localStorage.
2. `apiClient.post('/api/auth/login', { email, password })` sends correct JSON body and returns parsed response.
3. A 401 response from any API call clears localStorage and redirects to `/login`.
4. A non-2xx response (other than 401) throws an error with the server's error message.
5. `login()` and `getMe()` functions correctly call the API client and return typed responses.