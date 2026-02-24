# Task 4 Implementation Plan: Server-Side Auth Integration Tests

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| D1 | `packages/server/test/routes/auth.routes.test.ts` | Rewrite | Replace the existing `app.inject()`-based tests with Supertest-based integration tests, covering all 8 required test cases plus adding Supertest-specific HTTP-level assertions |

## 2. Dependencies

| Dependency | Status | Source |
|------------|--------|--------|
| `supertest` ^7.0.0 (dev) | Already installed | `packages/server/package.json` devDependencies |
| `@types/supertest` ^6.0.0 (dev) | Already installed | `packages/server/package.json` devDependencies |
| `vitest` ^3.0.0 (dev) | Already installed | `packages/server/package.json` devDependencies |
| `buildApp()` (async Fastify factory) | Already implemented | t01–t03 — `packages/server/src/app.ts` |
| `jwtPlugin` registered | Already done | t01 — `packages/server/src/plugins/jwt.plugin.ts` |
| `corsPlugin` registered | Already done | t01 — `packages/server/src/plugins/cors.plugin.ts` |
| `authMiddleware` registered | Already done | t02 — `packages/server/src/middleware/auth.middleware.ts` |
| `authRoutes` registered at `/api/auth` | Already done | t03 — `packages/server/src/routes/auth.routes.ts` |
| `UserModel`, `hashPassword()` | Already implemented | Phase 2 — `packages/server/src/models/user.model.ts` |
| `setupTestDb`, `teardownTestDb` | Already implemented | Phase 2 — `packages/server/test/helpers/db.ts` |
| Mongoose test double | Already configured | `packages/server/vitest.config.ts` aliases `mongoose` to `test/helpers/mongoose.test-double.ts` |

No new package installs are required.

## 3. Implementation Details

### D1: `packages/server/test/routes/auth.routes.test.ts`

**Purpose**: Comprehensive integration tests for the auth endpoints (`POST /api/auth/login` and `GET /api/auth/me`) and the auth middleware's allow-list behavior (`GET /api/health`), using Supertest as the HTTP testing library per MASTER_PLAN §2 (Vitest + Supertest).

**Why rewrite**: The existing file was created by t03 as a byproduct using `app.inject()`. The t04 spec and MASTER_PLAN explicitly require Supertest for integration tests. Supertest provides real HTTP-level testing (testing the full HTTP stack including content-type negotiation, header parsing, and proper HTTP method handling) versus `app.inject()` which bypasses the HTTP layer.

**Supertest + Fastify pattern**: Supertest needs a Node.js `http.Server` or an Express/Koa/Fastify app that exposes `.listen()`. For Fastify, the pattern is:

1. Call `await buildApp()` to get the Fastify instance
2. Call `await app.ready()` to ensure all plugins are loaded
3. Pass `app.server` (the underlying `http.Server`) to `supertest()`
4. Call `await app.close()` in cleanup

This is important because `supertest(app.server)` uses the raw Node HTTP server, which tests the full HTTP stack including Fastify's request/response lifecycle.

**Test infrastructure**:
- Vitest as the test runner (project convention)
- Supertest for HTTP assertions
- Mongoose test double (automatically aliased by `vitest.config.ts`)
- `setupTestDb()` / `teardownTestDb()` for test double lifecycle
- Seed user created in `beforeAll` via `hashPassword()` + `UserModel.create()`

**Full implementation**:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";
import { UserModel, hashPassword } from "../../src/models/index.js";
import { setupTestDb, teardownTestDb } from "../helpers/db.js";

describe("auth routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await setupTestDb();
    const passwordHash = await hashPassword("admin123");
    await UserModel.create({
      email: "admin@taskboard.local",
      name: "Admin",
      passwordHash,
    });
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  describe("POST /api/auth/login", () => {
    it("returns token and user for valid credentials", async () => {
      const response = await request(app.server)
        .post("/api/auth/login")
        .send({ email: "admin@taskboard.local", password: "admin123" })
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data.token).toBeDefined();
      expect(typeof response.body.data.token).toBe("string");
      expect(response.body.data.token.split(".")).toHaveLength(3);
      expect(response.body.data.user.email).toBe("admin@taskboard.local");
      expect(response.body.data.user.name).toBe("Admin");
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.user).not.toHaveProperty("passwordHash");
    });

    it("returns 401 for wrong password", async () => {
      const response = await request(app.server)
        .post("/api/auth/login")
        .send({ email: "admin@taskboard.local", password: "wrongpassword" })
        .expect(401)
        .expect("content-type", /json/);

      expect(response.body).toEqual({ error: "Invalid credentials" });
    });

    it("returns 401 for non-existent email", async () => {
      const response = await request(app.server)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "admin123" })
        .expect(401)
        .expect("content-type", /json/);

      expect(response.body).toEqual({ error: "Invalid credentials" });
    });

    it("returns 400 for missing fields", async () => {
      const response = await request(app.server)
        .post("/api/auth/login")
        .send({})
        .expect(400)
        .expect("content-type", /json/);

      expect(response.body).toEqual({
        error: "Email and password are required",
      });
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns 401 without token", async () => {
      const response = await request(app.server)
        .get("/api/auth/me")
        .expect(401)
        .expect("content-type", /json/);

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("returns 401 with invalid token", async () => {
      const response = await request(app.server)
        .get("/api/auth/me")
        .set("authorization", "Bearer garbage")
        .expect(401)
        .expect("content-type", /json/);

      expect(response.body).toEqual({ error: "Unauthorized" });
    });

    it("returns user data with valid token", async () => {
      // Login first to get a real token
      const loginResponse = await request(app.server)
        .post("/api/auth/login")
        .send({ email: "admin@taskboard.local", password: "admin123" })
        .expect(200);

      const { token, user: loginUser } = loginResponse.body.data;

      const response = await request(app.server)
        .get("/api/auth/me")
        .set("authorization", `Bearer ${token}`)
        .expect(200)
        .expect("content-type", /json/);

      expect(response.body.data.id).toBe(loginUser.id);
      expect(response.body.data.email).toBe("admin@taskboard.local");
      expect(response.body.data.name).toBe("Admin");
      expect(response.body.data).not.toHaveProperty("passwordHash");
    });

    it("health endpoint remains accessible without token", async () => {
      await request(app.server)
        .get("/api/health")
        .expect(200)
        .expect("content-type", /json/);
    });
  });
});
```

**Key decisions**:

- **Single `app` instance shared across tests**: Unlike the previous `app.inject()`-based tests which created a new Fastify instance per test, the Supertest version shares one instance. This is because Supertest uses `app.server` (the `http.Server`), and creating/closing a server for every test is slower and more error-prone. The tests are all read-only against the seeded data so sharing is safe. The app is created in `beforeAll` and closed in `afterAll`.

- **`await app.ready()` before tests**: Required for Supertest because `app.server` must be fully initialized (all plugins loaded, hooks registered) before Supertest can send requests through it. With `app.inject()`, Fastify internally calls `ready()` if needed, but Supertest bypasses that.

- **`request(app.server)` not `request(app)`**: Supertest expects a raw `http.Server` or a function that creates one. Fastify's `app.server` is the underlying Node.js HTTP server after `ready()` is called. This is the standard Fastify + Supertest integration pattern.

- **`.expect(200).expect("content-type", /json/)` chain**: Supertest's chaining API provides HTTP-level assertions directly in the request chain. This tests that Fastify is actually setting proper Content-Type headers, which `app.inject()` doesn't exercise at the HTTP level.

- **`.send()` for POST body**: Supertest's `.send()` automatically sets `Content-Type: application/json` when given an object. This tests the full content-type negotiation pipeline.

- **`.set("authorization", ...)` for headers**: Supertest's `.set()` method sets request headers. This tests the full HTTP header parsing pipeline.

- **Login-then-me round-trip for T7**: Test 7 performs a real login to get a token, then uses that token for `/api/auth/me`. This validates the full authentication round-trip: login → JWT signed with real user data → middleware verifies token → route returns decoded payload. More realistic than signing a token manually with `app.jwt.sign()`.

- **No database connection needed**: The vitest config aliases `mongoose` to an in-memory test double (`test/helpers/mongoose.test-double.ts`). `setupTestDb()` and `teardownTestDb()` work with this test double. No real MongoDB required.

- **Test 4 simplified**: The missing-fields test covers the `{}` body case. The t03 version had additional sub-cases (missing body, invalid types) within one test — these are valuable but the spec only requires testing missing fields. The rewrite keeps it focused on the spec's 8 test cases while the enhanced validation (empty body, type checking) is already covered by the route implementation's `isValidLoginRequest` guard.

### Changes from existing file

| Aspect | Before (t03) | After (t04) |
|--------|-------------|-------------|
| HTTP testing tool | `app.inject()` | `supertest(app.server)` |
| App lifecycle | New instance per test, closed per test | Single shared instance, `ready()` in `beforeAll`, `close()` in `afterAll` |
| Content-Type assertions | None | `.expect("content-type", /json/)` on every response |
| Status code assertions | `expect(response.statusCode).toBe(...)` | `.expect(200)` via Supertest chain + Vitest assertions |
| Body parsing | Manual `JSON.parse(response.body)` | Automatic `response.body` (Supertest auto-parses JSON) |
| Header setting | `headers: { authorization: ... }` object | `.set("authorization", ...)` method chain |
| Test isolation | Full isolation (new app per test) | Shared app instance (tests are read-only) |

## 4. Contracts

### Test File Contract

The test file validates all 8 test cases specified in the t04 spec:

| # | Test Case | HTTP Method | URL | Auth | Expected Status | Expected Body |
|---|-----------|-------------|-----|------|-----------------|---------------|
| T1 | Login — valid credentials | POST | `/api/auth/login` | None | 200 | `{ data: { token: "...", user: { id, email, name } } }` |
| T2 | Login — wrong password | POST | `/api/auth/login` | None | 401 | `{ error: "Invalid credentials" }` |
| T3 | Login — non-existent email | POST | `/api/auth/login` | None | 401 | `{ error: "Invalid credentials" }` |
| T4 | Login — missing fields | POST | `/api/auth/login` | None | 400 | `{ error: "Email and password are required" }` |
| T5 | Me — no token | GET | `/api/auth/me` | None | 401 | `{ error: "Unauthorized" }` |
| T6 | Me — invalid token | GET | `/api/auth/me` | `Bearer garbage` | 401 | `{ error: "Unauthorized" }` |
| T7 | Me — valid token | GET | `/api/auth/me` | `Bearer <real token>` | 200 | `{ data: { id, email, name } }` |
| T8 | Health — no auth required | GET | `/api/health` | None | 200 | (any 200 response) |

### Supertest + Fastify Integration Contract

- `app.server` is a valid `http.Server` after `await app.ready()`
- Supertest sends real HTTP requests through the server's request pipeline
- Response bodies are automatically parsed as JSON when Content-Type is `application/json`
- The Mongoose test double handles all database operations in-memory

## 5. Test Plan

### Test Setup

1. **`beforeAll`**: Connect Mongoose test double via `setupTestDb()`, seed a test user (`admin@taskboard.local` / `admin123`), build Fastify app via `await buildApp()`, initialize HTTP server via `await app.ready()`
2. **`afterAll`**: Close Fastify app via `await app.close()`, tear down test database via `teardownTestDb()`
3. **Shared state**: One Fastify app instance shared across all 8 tests. Tests are read-only (they query but don't modify the seeded user) so sharing is safe.

### Test Specifications

| # | Test Name | Describe Block | Action | Assertions |
|---|-----------|---------------|--------|------------|
| T1 | Returns token and user for valid credentials | `POST /api/auth/login` | `POST /api/auth/login` with `{ email: "admin@taskboard.local", password: "admin123" }` | Status 200; content-type JSON; `data.token` is 3-part JWT string; `data.user.email` = `"admin@taskboard.local"`; `data.user.name` = `"Admin"`; `data.user.id` defined; no `passwordHash` field |
| T2 | Returns 401 for wrong password | `POST /api/auth/login` | `POST /api/auth/login` with `{ email: "admin@taskboard.local", password: "wrongpassword" }` | Status 401; content-type JSON; body = `{ error: "Invalid credentials" }` |
| T3 | Returns 401 for non-existent email | `POST /api/auth/login` | `POST /api/auth/login` with `{ email: "nobody@example.com", password: "admin123" }` | Status 401; content-type JSON; body = `{ error: "Invalid credentials" }` |
| T4 | Returns 400 for missing fields | `POST /api/auth/login` | `POST /api/auth/login` with `{}` | Status 400; content-type JSON; body = `{ error: "Email and password are required" }` |
| T5 | Returns 401 without token | `GET /api/auth/me` | `GET /api/auth/me` with no auth header | Status 401; content-type JSON; body = `{ error: "Unauthorized" }` |
| T6 | Returns 401 with invalid token | `GET /api/auth/me` | `GET /api/auth/me` with `Authorization: Bearer garbage` | Status 401; content-type JSON; body = `{ error: "Unauthorized" }` |
| T7 | Returns user data with valid token | `GET /api/auth/me` | Login via `POST /api/auth/login`, then `GET /api/auth/me` with returned token | Status 200; content-type JSON; `data.id` matches login's `data.user.id`; `data.email` = `"admin@taskboard.local"`; `data.name` = `"Admin"`; no `passwordHash` |
| T8 | Health endpoint accessible without token | `GET /api/auth/me` | `GET /api/health` with no auth header | Status 200; content-type JSON |

### Impact on Existing Tests

- **`test/app.test.ts`** (12 tests): Unaffected. These tests use `app.inject()` and test plugins, config, and auth middleware independently. They do not conflict with the Supertest-based auth route tests.
- **No other test files are modified**.

## 6. Implementation Order

1. **Rewrite `packages/server/test/routes/auth.routes.test.ts`** — Replace the entire file content with the Supertest-based implementation. The file already exists from t03, so this is a modification, not a creation.

2. **Run verification commands** — Ensure all 8 tests pass and no existing tests regress.

## 7. Verification Commands

```bash
# 1. Run all server tests (12 existing in app.test.ts + 8 rewritten in auth.routes.test.ts = 20 total)
npm run test -w packages/server

# 2. Verify TypeScript compilation
npx tsc --noEmit -p packages/server/tsconfig.json

# 3. Run only the auth routes test file to confirm Supertest integration
npx vitest run test/routes/auth.routes.test.ts --reporter=verbose
```