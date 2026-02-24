I now have all the context I need. Let me write the plan.

# Task 3 Implementation Plan: Auth Routes (Login + Me)

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| D1 | `packages/server/src/routes/auth.routes.ts` | Create | Fastify plugin registering `POST /api/auth/login` and `GET /api/auth/me` route handlers |
| D2 | `packages/server/src/app.ts` | Modify | Import and register auth routes plugin |
| D3 | `packages/server/test/routes/auth.routes.test.ts` | Create | Integration tests for both auth endpoints (8 test cases) |

## 2. Dependencies

| Dependency | Status | Source |
|------------|--------|--------|
| `@fastify/jwt` ^9.0.0 | Already installed | `packages/server/package.json` |
| `fastify-plugin` ^5.0.0 | Already installed | `packages/server/package.json` |
| `bcryptjs` ^2.4.3 | Already installed | `packages/server/package.json` |
| `mongoose` ^8.19.1 | Already installed | `packages/server/package.json` |
| `supertest` ^7.0.0 (dev) | Already installed | `packages/server/package.json` |
| `jwtPlugin` registered in `buildApp()` | Already done | t01 — `packages/server/src/app.ts` line 12 |
| `authMiddleware` registered in `buildApp()` | Already done | t02 — `packages/server/src/app.ts` line 14 |
| `UserModel`, `verifyPassword()` | Already implemented | Phase 2 — `packages/server/src/models/user.model.ts` |
| `LoginRequest`, `LoginResponse` types | Already defined | `packages/shared/src/types/index.ts` lines 67–81 |
| `FastifyJWT.user` type augmentation | Already done | t02 — `packages/server/src/middleware/auth.middleware.ts` lines 4–12 |
| Test DB helpers (`setupTestDb`, `teardownTestDb`, `clearCollections`) | Already implemented | Phase 2 — `packages/server/test/helpers/db.ts` |

No new package installs are required.

## 3. Implementation Details

### D1: `packages/server/src/routes/auth.routes.ts`

**Purpose**: A Fastify route plugin that registers two endpoints under the `/api/auth` prefix (prefix applied at registration site in `app.ts`).

**Exports**: `authRoutes` — a `FastifyPluginAsync` function (not wrapped with `fp`, since route plugins should use Fastify's default encapsulation — routes don't need to leak decorators to the parent scope).

**Full implementation**:

```typescript
import type { FastifyPluginAsync } from "fastify";
import { UserModel, verifyPassword } from "../models/index.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    const { email, password } = request.body as { email?: string; password?: string };

    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password are required" });
    }

    const user = await UserModel.findOne({ email });

    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.passwordHash);

    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    });

    return {
      data: {
        token,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      },
    };
  });

  app.get("/me", async (request) => {
    return {
      data: {
        id: request.user.id,
        email: request.user.email,
        name: request.user.name,
      },
    };
  });
};
```

**Key decisions**:

- **No `fastify-plugin` wrapper**: Unlike the JWT/CORS/auth middleware plugins (which use `fp` to break encapsulation so their decorators/hooks apply globally), route plugins benefit from Fastify's default encapsulation. Routes don't add decorators that need to leak upward. This is the standard Fastify pattern for route files.
- **Route paths are `/login` and `/me` (not `/api/auth/login`)**: The `/api/auth` prefix is applied at the registration site in `app.ts` via `{ prefix: "/api/auth" }`. This keeps route files unaware of their mount point and follows Fastify conventions.
- **`request.body` cast to `{ email?: string; password?: string }`**: Fastify v5 types `request.body` as `unknown` by default. The cast is minimal and we immediately validate presence of both fields. Both fields are typed as optional to handle the case where they are missing from the request body.
- **User lookup via `UserModel.findOne({ email })`**: The `email` field has `lowercase: true` in the Mongoose schema (line 18 of `user.model.ts`), so lookups are case-insensitive — input `"Admin@TaskBoard.local"` matches stored `"admin@taskboard.local"`. No additional lowercasing needed in the route.
- **Same error message for wrong password and non-existent user**: Both return `{ error: "Invalid credentials" }` with 401. This prevents user enumeration attacks.
- **JWT payload `{ id, email, name }`**: Matches the `FastifyJWT.user` type augmentation from t02 (`auth.middleware.ts` lines 4–12). The `id` field is `user._id.toString()` — Mongoose ObjectIds need explicit string conversion.
- **`GET /me` reads from `request.user`**: The auth middleware (t02) runs before this handler. It calls `request.jwtVerify()`, which decodes the JWT and populates `request.user` with the payload `{ id, email, name }`. The `/me` route simply wraps this in the `{ data: T }` response envelope. No database query needed — the user info comes from the token.
- **`POST /login` is allow-listed in the auth middleware**: The `PUBLIC_ROUTES` array in `auth.middleware.ts` line 15 includes `{ method: "POST", path: "/api/auth/login" }`. So the auth middleware skips JWT verification for login requests.
- **`GET /me` is NOT allow-listed**: It's protected by the auth middleware. Requests without a valid token get 401 before reaching this handler.

### D2: `packages/server/src/app.ts`

**Purpose**: Register the auth routes plugin so the login and me endpoints become available.

**Current state** (after t01 and t02):

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

**Changes**: Add one import and one `await app.register()` call with `{ prefix: "/api/auth" }`. The auth routes should be registered after the middleware plugins (so the `onRequest` hook and `app.jwt` are available) and alongside other routes.

**After**:

```typescript
import Fastify from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { corsPlugin } from "./plugins/cors.plugin.js";
import { jwtPlugin } from "./plugins/jwt.plugin.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { authRoutes } from "./routes/auth.routes.js";

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

  await app.register(authRoutes, { prefix: "/api/auth" });

  return app;
}
```

**Registration order rationale**:
1. `jwtPlugin` — decorates `app.jwt` and enables `request.jwtVerify()`
2. `corsPlugin` — adds CORS response headers
3. `authMiddleware` — adds global `onRequest` hook calling `request.jwtVerify()` (depends on step 1)
4. Health route — inline, allow-listed by auth middleware
5. `authRoutes` — `POST /login` is allow-listed, `GET /me` is protected by auth middleware (depends on steps 1 and 3)

The auth routes are registered with `{ prefix: "/api/auth" }` so the plugin-local paths `/login` and `/me` become `/api/auth/login` and `/api/auth/me` in the app.

### D3: `packages/server/test/routes/auth.routes.test.ts`

**Purpose**: Integration tests for the login and me endpoints, using a real MongoDB test database with a seeded user.

**Test infrastructure**:
- Uses `setupTestDb()`, `teardownTestDb()`, and `clearCollections()` from `test/helpers/db.ts` for MongoDB lifecycle management.
- Seeds a test user in `beforeAll` using `hashPassword()` and `UserModel.create()` (same pattern as `seed.ts`).
- Uses `buildApp()` and `app.inject()` for HTTP testing (Fastify's built-in test mechanism). No need for Supertest — `app.inject()` is sufficient and already used in the existing test file.
- Each test creates its own app instance to ensure isolation. The database is seeded once and shared across tests (read-only for most tests).

**Full implementation**:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../src/app.js";
import { UserModel, hashPassword } from "../../src/models/index.js";
import { setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("auth routes", () => {
  beforeAll(async () => {
    await setupTestDb();
    const passwordHash = await hashPassword("admin123");
    await UserModel.create({
      email: "admin@taskboard.local",
      name: "Admin",
      passwordHash,
    });
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe("POST /api/auth/login", () => {
    it("returns token and user for valid credentials", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "admin@taskboard.local",
          password: "admin123",
        },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.token).toBeDefined();
      expect(typeof body.data.token).toBe("string");
      expect(body.data.token.split(".")).toHaveLength(3);
      expect(body.data.user.email).toBe("admin@taskboard.local");
      expect(body.data.user.name).toBe("Admin");
      expect(body.data.user.id).toBeDefined();
      expect(body.data.user).not.toHaveProperty("passwordHash");
      await app.close();
    });

    it("returns 401 for wrong password", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "admin@taskboard.local",
          password: "wrongpassword",
        },
      });
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: "Invalid credentials" });
      await app.close();
    });

    it("returns 401 for non-existent email", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "nobody@example.com",
          password: "admin123",
        },
      });
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: "Invalid credentials" });
      await app.close();
    });

    it("returns 400 for missing fields", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({
        error: "Email and password are required",
      });
      await app.close();
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 without token", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
      });
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
      await app.close();
    });

    it("returns 401 with invalid token", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: {
          authorization: "Bearer garbage",
        },
      });
      expect(response.statusCode).toBe(401);
      expect(JSON.parse(response.body)).toEqual({ error: "Unauthorized" });
      await app.close();
    });

    it("returns user data with valid token", async () => {
      const app = await buildApp();

      // Login first to get a valid token
      const loginResponse = await app.inject({
        method: "POST",
        url: "/api/auth/login",
        payload: {
          email: "admin@taskboard.local",
          password: "admin123",
        },
      });
      const { data } = JSON.parse(loginResponse.body);

      const response = await app.inject({
        method: "GET",
        url: "/api/auth/me",
        headers: {
          authorization: `Bearer ${data.token}`,
        },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.id).toBe(data.user.id);
      expect(body.data.email).toBe("admin@taskboard.local");
      expect(body.data.name).toBe("Admin");
      expect(body.data).not.toHaveProperty("passwordHash");
      await app.close();
    });

    it("health endpoint remains accessible without token", async () => {
      const app = await buildApp();
      const response = await app.inject({
        method: "GET",
        url: "/api/health",
      });
      expect(response.statusCode).toBe(200);
      await app.close();
    });
  });
});
```

**Key decisions**:

- **`app.inject()` instead of Supertest**: The existing test file (`test/app.test.ts`) uses `app.inject()` throughout. Supertest is installed but not used — sticking with `app.inject()` for consistency. Fastify's `inject()` doesn't open a network port, making tests faster and simpler.
- **Database seeding in `beforeAll`**: A single test user is created before all tests run. The login tests read this user, the me tests login first then call `/me`. No test modifies the user record, so a single seed is sufficient.
- **`teardownTestDb()` in `afterAll`**: Drops the test database and disconnects Mongoose. This ensures no leftover data between test file runs.
- **Login-then-me pattern for T7**: Test T7 ("me with valid token") first calls `POST /api/auth/login` to get a real token, then uses that token for `GET /api/auth/me`. This tests the full round-trip: login generates a token containing the user's actual MongoDB `_id`, and `/me` decodes it back. This is more realistic than using `app.jwt.sign()` with a hardcoded payload.
- **T8 (health endpoint) included for regression**: Confirms the health endpoint still works without authentication after auth routes are registered. This is a regression test — it validates that adding auth routes didn't break the allow-list.
- **`app.close()` after every test**: Prevents resource leaks. Each test creates and tears down its own Fastify instance.
- **No `content-type` header needed for `app.inject()` with `payload`**: Fastify's `inject()` automatically serializes `payload` objects as JSON and sets the content-type header.

## 4. Contracts

### Login Endpoint Contract

**`POST /api/auth/login`** (allow-listed — no authentication required)

Request:
```json
{
  "email": "admin@taskboard.local",
  "password": "admin123"
}
```

Success response (200):
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "admin@taskboard.local",
      "name": "Admin"
    }
  }
}
```

Missing fields response (400):
```json
{
  "error": "Email and password are required"
}
```

Invalid credentials response (401):
```json
{
  "error": "Invalid credentials"
}
```

### Me Endpoint Contract

**`GET /api/auth/me`** (protected — requires valid JWT)

Request headers:
```
Authorization: Bearer <token>
```

Success response (200):
```json
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "admin@taskboard.local",
    "name": "Admin"
  }
}
```

Unauthorized response (401) — handled by auth middleware, not the route:
```json
{
  "error": "Unauthorized"
}
```

### Conformance to Shared Types

- The login response shape matches `LoginResponse` from `@taskboard/shared` (`{ data: { token: string, user: { id, email, name } } }`).
- The login request body matches `LoginRequest` from `@taskboard/shared` (`{ email: string, password: string }`).
- Both endpoints follow the `{ data: T }` / `{ error: string }` envelope convention per MASTER_PLAN §3.2 and `ApiSuccessResponse<T>` / `ApiErrorResponse` from shared types.

## 5. Test Plan

### Test Setup

- Tests require MongoDB running on `localhost:27017` (the `setupTestDb()` helper connects to `mongodb://localhost:27017/taskboard_test`).
- A test user is seeded in `beforeAll` with email `admin@taskboard.local`, password `admin123`, name `Admin`.
- Each test creates a fresh Fastify app via `await buildApp()` and closes it afterward.
- Fastify's `app.inject()` is used for HTTP testing (no network port opened).

### Test Specifications

| # | Test Name | Describe Block | Setup | Action | Expected Result |
|---|-----------|---------------|-------|--------|-----------------|
| T1 | Returns token and user for valid credentials | `POST /api/auth/login` | Seeded user exists | `POST /api/auth/login` with `{ email: "admin@taskboard.local", password: "admin123" }` | 200; body has `data.token` (3-part JWT string), `data.user.email` = `"admin@taskboard.local"`, `data.user.name` = `"Admin"`, `data.user.id` defined, no `passwordHash` field |
| T2 | Returns 401 for wrong password | `POST /api/auth/login` | Seeded user exists | `POST /api/auth/login` with `{ email: "admin@taskboard.local", password: "wrongpassword" }` | 401; body = `{ error: "Invalid credentials" }` |
| T3 | Returns 401 for non-existent email | `POST /api/auth/login` | Seeded user exists | `POST /api/auth/login` with `{ email: "nobody@example.com", password: "admin123" }` | 401; body = `{ error: "Invalid credentials" }` |
| T4 | Returns 400 for missing fields | `POST /api/auth/login` | Seeded user exists | `POST /api/auth/login` with `{}` | 400; body = `{ error: "Email and password are required" }` |
| T5 | Returns 401 without token | `GET /api/auth/me` | None | `GET /api/auth/me` with no auth header | 401; body = `{ error: "Unauthorized" }` |
| T6 | Returns 401 with invalid token | `GET /api/auth/me` | None | `GET /api/auth/me` with `Authorization: Bearer garbage` | 401; body = `{ error: "Unauthorized" }` |
| T7 | Returns user data with valid token | `GET /api/auth/me` | Seeded user exists | Login first via `POST /api/auth/login`, then `GET /api/auth/me` with returned token | 200; body has `data.id` matching login response's `data.user.id`, `data.email` = `"admin@taskboard.local"`, `data.name` = `"Admin"`, no `passwordHash` |
| T8 | Health endpoint accessible without token | `GET /api/auth/me` | None | `GET /api/health` with no auth header | 200 |

### Impact on Existing Tests

All 17 existing tests in `test/app.test.ts` (2 `buildApp` + 4 `plugins` + 1 `config` + 5 `auth middleware` + 5 from earlier phases) continue to pass without modification:
- `buildApp` tests hit `GET /api/health` (allow-listed)
- `plugins` tests either call `app.jwt` directly or hit `GET /api/health`
- `config` test checks the `config` object, no HTTP requests
- `auth middleware` tests use allow-listed routes or provide valid/invalid tokens

The new `test/routes/auth.routes.test.ts` file runs independently and manages its own database lifecycle.

## 6. Implementation Order

1. **Create `packages/server/src/routes/auth.routes.ts`** — Write the full route plugin with both endpoints. This file depends on `UserModel`, `verifyPassword` (from Phase 2 models), and `app.jwt.sign()` (from t01 JWT plugin). The `request.user` type comes from the `FastifyJWT` augmentation in t02's `auth.middleware.ts`.

2. **Modify `packages/server/src/app.ts`** — Add `import { authRoutes } from "./routes/auth.routes.js"` and `await app.register(authRoutes, { prefix: "/api/auth" })` after the health route definition. This is a 2-line change.

3. **Create `packages/server/test/routes/auth.routes.test.ts`** — Write the full integration test file with 8 test cases. This requires the `test/routes/` directory to exist (currently only has `.gitkeep`).

4. **Run verification commands** — Ensure all tests pass (existing + new).

## 7. Verification Commands

```bash
# 1. Run all server tests (existing app.test.ts + new auth.routes.test.ts)
npm run test -w packages/server

# 2. Verify TypeScript compilation
npx tsc --noEmit -p packages/server/tsconfig.json

# 3. Start the dev server with MongoDB and verify login works
# (requires MongoDB running)
npm run dev
# In another terminal:
# Login:
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskboard.local","password":"admin123"}' | jq .
# Expected: {"data":{"token":"eyJ...","user":{"id":"...","email":"admin@taskboard.local","name":"Admin"}}}

# Me (replace <token> with the token from login response):
curl -s http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>" | jq .
# Expected: {"data":{"id":"...","email":"admin@taskboard.local","name":"Admin"}}

# Me without token:
curl -s http://localhost:3001/api/auth/me | jq .
# Expected: {"error":"Unauthorized"}

# Health (still public):
curl -s http://localhost:3001/api/health | jq .
# Expected: {"status":"ok","defaultColumns":["To Do","In Progress","In Review","Done"]}
```