## Objective

Create a global `onRequest` hook that enforces JWT authentication on all `/api/*` routes except an explicit allow-list, and attaches the decoded user payload to the request object.

## Deliverables

### New Files

- **`packages/server/src/middleware/auth.middleware.ts`** — Exports an `onRequest` hook function that:
  1. Skips authentication for allow-listed routes: `POST /api/auth/login` and `GET /api/health`
  2. Reads the `Authorization` header, extracts the bearer token
  3. Calls `request.jwtVerify()` to validate the token
  4. Attaches the decoded user payload (`{ id, email, name }`) to the request object (via Fastify request decorator)
  5. Returns `401 { error: "Unauthorized" }` if the token is missing, malformed, or invalid
- Add Fastify type augmentation so `request.user` is typed as `{ id: string; email: string; name: string }`.

### Modified Files

- **`packages/server/src/app.ts`** — Register the auth middleware as a global `onRequest` hook after plugin registration.

## Key Implementation Details

- The middleware is secure-by-default: new routes added later are automatically protected without any changes.
- Allow-list matching should check both the HTTP method and the URL path.
- The type augmentation for `request.user` enables downstream route handlers to access user info with full TypeScript support.
- Response envelope follows the project convention: `{ error: "Unauthorized" }` for 401 responses.

## Dependencies

- **t01 (JWT and CORS Fastify Plugins)** — `request.jwtVerify()` must be available from the JWT plugin.

## Verification Criteria

1. A request to any `/api/*` route (other than allow-listed) without a token receives a `401` response with `{ error: "Unauthorized" }`.
2. A request with `Authorization: Bearer <valid-token>` passes through and `request.user` contains `{ id, email, name }`.
3. A request with an invalid/expired token receives `401`.
4. `GET /api/health` responds `200` without any token.
5. `POST /api/auth/login` is accessible without a token.
6. All pre-existing tests still pass.