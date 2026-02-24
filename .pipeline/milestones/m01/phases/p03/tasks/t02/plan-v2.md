Now I have the full picture. Let me write the revised plan that addresses all 5 feedback points.

# Task 2 Implementation Plan: Auth Middleware

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| D1 | `packages/server/src/middleware/auth.middleware.ts` | Create | Global `onRequest` hook enforcing JWT auth on all `/api/*` routes except allow-listed ones; includes `FastifyJWT` type augmentation |
| D2 | `packages/server/src/app.ts` | Modify | Register the auth middleware plugin after JWT and CORS plugins, before route definitions |
| D3 | `packages/server/test/app.test.ts` | Modify | Add 5 new tests for auth middleware behavior |

## 2. Dependencies

| Dependency | Status | Source |
|------------|--------|--------|
| `fastify-plugin` ^5.0.0 | Already installed | `packages/server/package.json` (installed in t01) |
| `@fastify/jwt` ^9.0.0 | Already installed | `packages/server/package.json` |
| `jwtPlugin` registered in `buildApp()` | Already done | t01 — `packages/server/src/app.ts` line 11 |
| `corsPlugin` registered in `buildApp()` | Already done | t01 — `packages/server/src/app.ts` line 12 |
| `app.jwt.sign()` / `request.jwtVerify()` | Available | Provided by `@fastify/jwt` after `jwtPlugin` registration |

No new package installs are required.

## 3. Implementation Details

### D1: `packages/server/src/middleware/auth.middleware.ts`

**Purpose**: A `fastify-plugin`-wrapped plugin that registers a global `onRequest` hook. The hook enforces JWT authentication on all routes except an explicit allow-list. It also includes the `@fastify/jwt` module augmentation so `request.user` is typed throughout the app.

**Registration pattern**: Uses `fastify-plugin` (`fp`) wrapping a plugin function that calls `app.addHook('onRequest', ...)`. This is the same pattern used by `jwtPlugin` and `corsPlugin` in t01. The `fp` wrapper ensures the hook is not encapsulated — it applies to all routes registered at the app level, including routes registered after the middleware.

**Full implementation**:

```typescript
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

// Module augmentation for @fastify/jwt so request.user is typed throughout the app.
// This tells @fastify/jwt what shape the decoded JWT payload has.
// After jwtVerify() succeeds, request.user will have this type.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      name: string;
    };
  }
}

// Allow-list: routes that do not require authentication.
// Matching checks both HTTP method and URL path (exact match after stripping query strings).
const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/api/auth/login" },
  { method: "GET", path: "/api/health" },
];

function isPublicRoute(method: string, url: string): boolean {
  const path = url.split("?")[0];
  return PUBLIC_ROUTES.some(
    (route) => route.method === method && route.path === path,
  );
}

export const authMiddleware = fp(async (app) => {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (isPublicRoute(request.method, request.url)) {
        return;
      }

      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );
});
```

**Key decisions**:

- **Allow-list as `Array<{ method, path }>`**: Simple array of objects with `method` and `path` fields. The `isPublicRoute` function iterates the array and checks both fields for an exact match. The array is small (2 entries) so linear search is fine.
- **Query string stripping via `url.split("?")[0]`**: Fastify's `request.url` includes query strings (e.g., `/api/health?foo=bar`). We strip them with `split("?")[0]` before comparing to the allow-list. This is simpler and sufficient compared to `new URL()` which requires a base URL.
- **`fastify-plugin` wrapper**: The plugin is wrapped with `fp()` so the `onRequest` hook is not encapsulated. Without `fp`, the hook would only apply to routes registered within the plugin's own scope, not to routes registered at the app level or by other plugins. This matches the pattern used by `jwtPlugin` and `corsPlugin`.
- **`declare module "@fastify/jwt"`**: The type augmentation lives in this file because it directly relates to how the middleware uses `request.user`. By declaring the `FastifyJWT.user` interface here, all downstream route handlers get typed access to `request.user.id`, `request.user.email`, and `request.user.name` without additional casting.
- **Error response format**: Returns `{ error: "Unauthorized" }` with status 401, consistent with the project's response envelope convention (MASTER_PLAN §3.2).
- **Catch-all `try/catch`**: The `catch` block does not inspect the error type — any failure from `jwtVerify()` (missing token, malformed token, expired token, tampered signature) results in the same 401 response. This is intentional: we don't want to leak information about why authentication failed.

### D2: `packages/server/src/app.ts`

**Purpose**: Register the auth middleware in `buildApp()` so it applies globally to all routes.

**Current state** (after t01):

```typescript
import Fastify from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { jwtPlugin } from "./plugins/jwt.plugin.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(jwtPlugin);
  await app.register(corsPlugin);

  app.get("/api/health", async () => {
    return { status: "ok", defaultColumns: DEFAULT_COLUMNS };
  });

  return app;
}
```

**Changes**: Add one import and one `await app.register()` call. The auth middleware must be registered **after** `jwtPlugin` (because it depends on `request.jwtVerify()`) and **after** `corsPlugin` (so CORS preflight responses aren't blocked by auth), but **before** route definitions (so the `onRequest` hook applies to all routes).

**After**:

```typescript
import Fastify from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { jwtPlugin } from "./plugins/jwt.plugin.js";
import { authMiddleware } from "./middleware/auth.middleware.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(jwtPlugin);
  await app.register(corsPlugin);
  await app.register(authMiddleware);

  app.get("/api/health", async () => {
    return { status: "ok", defaultColumns: DEFAULT_COLUMNS };
  });

  return app;
}
```

**Registration order rationale**:
1. `jwtPlugin` — decorates `app.jwt` and enables `request.jwtVerify()`
2. `corsPlugin` — adds CORS response headers
3. `authMiddleware` — adds `onRequest` hook that calls `request.jwtVerify()` (depends on step 1)
4. Routes — defined after all plugins/hooks are registered

### D3: `packages/server/test/app.test.ts`

**Purpose**: Verify that the auth middleware correctly protects routes, allows public routes, and populates `request.user`.

**Handling the T4 circular dependency**: Test T4 ("protected route passes with valid token, `request.user` is populated") needs a protected route that returns `request.user`. But `/api/auth/me` is task 3 and doesn't exist yet. **Solution**: Register a temporary test-only route inside the test using `app.get()` after `buildApp()`. This route is only available within that test's app instance and has no impact on production code.

**New test describe block to add** (appended after the existing `describe("config", ...)` block):

```typescript
describe("auth middleware", () => {
  it("allows access to health endpoint without token (allow-listed)", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("rejects requests to protected routes without a token", async () => {
    const app = await buildApp();
    // Use a non-existent protected route — middleware runs before route matching
    const response = await app.inject({
      method: "GET",
      url: "/api/protected-resource",
    });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
    await app.close();
  });

  it("rejects requests with an invalid token", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/protected-resource",
      headers: {
        authorization: "Bearer invalid.token.garbage",
      },
    });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
    await app.close();
  });

  it("allows access with a valid token and populates request.user", async () => {
    const app = await buildApp();

    // Register a temporary test-only route that exposes request.user.
    // This avoids depending on /api/auth/me (task 3).
    app.get("/api/test-user", async (request) => {
      return { data: request.user };
    });

    const payload = { id: "user123", email: "test@test.com", name: "Test" };
    const token = app.jwt.sign(payload);

    const response = await app.inject({
      method: "GET",
      url: "/api/test-user",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data.id).toBe("user123");
    expect(body.data.email).toBe("test@test.com");
    expect(body.data.name).toBe("Test");
    await app.close();
  });

  it("rejects requests with a tampered token", async () => {
    const app = await buildApp();

    const token = app.jwt.sign({ id: "user123", email: "a@b.com", name: "A" });
    // Tamper with the token by modifying its last character
    const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");

    const response = await app.inject({
      method: "GET",
      url: "/api/protected-resource",
      headers: {
        authorization: `Bearer ${tampered}`,
      },
    });
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
    await app.close();
  });
});
```

**Notes on test design**:

- **T1 (health without token)**: Confirms the allow-list correctly skips auth for `GET /api/health`. This test technically overlaps with the existing health endpoint test, but it explicitly validates the middleware's allow-list behavior after the middleware is registered.
- **T2 (missing token)**: Sends a request with no `Authorization` header to a protected URL. The middleware's `request.jwtVerify()` throws because there's no token, and the catch block returns 401. The route `/api/protected-resource` doesn't need to actually exist — the `onRequest` hook fires before route matching.
- **T3 (invalid token)**: Sends a malformed JWT string. `jwtVerify()` throws because it can't decode/verify the token.
- **T4 (valid token + request.user)**: Registers a temporary route `GET /api/test-user` that returns `request.user` as `{ data: request.user }`. This route is registered after `buildApp()` on the same app instance, so it inherits the global `onRequest` hook. A valid token is signed with `app.jwt.sign()`, sent in the `Authorization` header, and the test verifies the response contains the decoded payload fields. **This avoids depending on `/api/auth/me`** which is task 3.
- **T5 (tampered token)**: Takes a valid token and modifies its last character. `jwtVerify()` throws because the signature no longer matches.
- **All 7 existing tests remain unchanged**: The existing health endpoint test (`describe("buildApp")`) sends requests to `GET /api/health`, which is allow-listed. The JWT/CORS plugin tests don't make HTTP requests to protected routes. The config test doesn't make any HTTP requests.

## 4. Contracts

### Auth Middleware Contract

After `authMiddleware` registration:

- **Protected by default**: Any `onRequest` to a `/api/*` URL not in the allow-list requires a valid `Authorization: Bearer <token>` header. Missing, malformed, expired, or tampered tokens result in `401 { error: "Unauthorized" }`.
- **Allow-list**: `POST /api/auth/login` and `GET /api/health` are accessible without authentication. Matching is exact on both HTTP method and URL path (query strings are stripped before comparison).
- **`request.user` population**: After successful `jwtVerify()`, `request.user` contains `{ id: string, email: string, name: string }` — the decoded JWT payload. Downstream route handlers can access these fields with full TypeScript type safety via the `FastifyJWT` module augmentation.
- **No silent fallthrough**: If `jwtVerify()` throws for any reason, the reply is immediately sent with 401. The request does not proceed to the route handler.

### Type Augmentation Contract

The `declare module "@fastify/jwt"` block in `auth.middleware.ts` ensures:

```typescript
// In any route handler:
request.user.id    // string
request.user.email // string
request.user.name  // string
```

This is the standard `@fastify/jwt` pattern — the library reads the `FastifyJWT.user` interface to type `request.user` after `jwtVerify()`.

## 5. Test Plan

### Test Specifications

| # | Test Name | Setup | Action | Expected Result |
|---|-----------|-------|--------|-----------------|
| T1 | Health endpoint accessible without token | `await buildApp()` | `GET /api/health` with no auth header | 200 response |
| T2 | Protected route rejects missing token | `await buildApp()` | `GET /api/protected-resource` with no auth header | 401 `{ error: "Unauthorized" }` |
| T3 | Protected route rejects invalid token | `await buildApp()` | `GET /api/protected-resource` with `Authorization: Bearer invalid.token.garbage` | 401 `{ error: "Unauthorized" }` |
| T4 | Protected route passes with valid token, `request.user` populated | `await buildApp()`, register temp route `GET /api/test-user` that returns `{ data: request.user }` | Sign token with `app.jwt.sign({ id, email, name })`, send `GET /api/test-user` with bearer token | 200 with `{ data: { id, email, name } }` matching the signed payload |
| T5 | Protected route rejects tampered token | `await buildApp()` | Sign valid token, flip last character, send `GET /api/protected-resource` | 401 `{ error: "Unauthorized" }` |

### Impact on Existing Tests

All 7 existing tests continue to pass without modification:

- `describe("buildApp")` — 2 tests: Both hit `GET /api/health` which is allow-listed.
- `describe("plugins")` — 4 tests: JWT tests call `app.jwt.sign()` / `app.jwt.verify()` directly (no HTTP request to a protected route). CORS tests hit `GET /api/health` which is allow-listed.
- `describe("config")` — 1 test: Checks `config` object values, no HTTP requests.

## 6. Implementation Order

1. **Create `packages/server/src/middleware/auth.middleware.ts`** — Write the full file: module augmentation, allow-list, `isPublicRoute` function, and `fp`-wrapped plugin with `onRequest` hook. No external dependencies beyond what's already installed.

2. **Modify `packages/server/src/app.ts`** — Add `import { authMiddleware } from "./middleware/auth.middleware.js"` and `await app.register(authMiddleware)` after the CORS plugin registration and before the health route definition.

3. **Modify `packages/server/test/app.test.ts`** — Add the `describe("auth middleware", ...)` block with 5 tests (T1–T5) after the existing `describe("config", ...)` block.

4. **Run verification commands** — Ensure all tests pass (existing + new).

## 7. Verification Commands

```bash
# 1. Run all server tests (7 existing + 5 new = 12 total)
npm run test -w packages/server

# 2. Verify TypeScript compilation
npx tsc --noEmit -p packages/server/tsconfig.json
```