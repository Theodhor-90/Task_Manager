Now I have all the context I need. Let me produce the implementation plan.

# Task 1 Implementation Plan: JWT and CORS Fastify Plugins

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| D1 | `packages/server/src/plugins/jwt.plugin.ts` | Create | Registers `@fastify/jwt` with the app's JWT secret and 24h expiry |
| D2 | `packages/server/src/plugins/cors.plugin.ts` | Create | Registers `@fastify/cors` with configurable origin and credentials |
| D3 | `packages/server/src/config.ts` | Modify | Add `corsOrigin` field to `Config` interface |
| D4 | `packages/server/src/app.ts` | Modify | Import and register both plugins in `buildApp()` |
| D5 | `packages/server/test/app.test.ts` | Modify | Add tests verifying plugin registration |

## 2. Dependencies

| Dependency | Status | Source |
|------------|--------|--------|
| `@fastify/jwt` ^9.0.0 | Already installed | `packages/server/package.json` |
| `@fastify/cors` ^10.0.0 | Already installed | `packages/server/package.json` |
| `config.jwtSecret` | Already exists | `packages/server/src/config.ts` |
| Phase 1 (monorepo, TypeScript, Vite) | Complete | m01/p01 |
| Phase 2 (database, models, seed) | Complete | m01/p02 |

No new package installs required.

## 3. Implementation Details

### D1: `packages/server/src/plugins/jwt.plugin.ts`

**Purpose**: Wrap `@fastify/jwt` registration into a Fastify plugin so it can be cleanly registered in `buildApp()`.

**Exports**: `jwtPlugin` — a Fastify plugin function (`FastifyPluginAsync`).

**Implementation**:

```typescript
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { config } from "../config.js";

export const jwtPlugin = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
    sign: {
      expiresIn: "24h",
    },
  });
});
```

**Key decisions**:
- Uses `fastify-plugin` (`fp`) to ensure the JWT decorator (`app.jwt`) is exposed to the enclosing scope (not encapsulated). Without `fp`, the `app.jwt` object would only be available within the plugin's own scope and not accessible to routes or middleware registered at the app level.
- Token expiry `24h` is set as a default sign option per MASTER_PLAN §3.3.
- Secret sourced from `config.jwtSecret` (reads `JWT_SECRET` env var, defaults to `dev-jwt-secret-change-in-production`).

**Check**: Is `fastify-plugin` installed? Need to verify.

### D2: `packages/server/src/plugins/cors.plugin.ts`

**Purpose**: Wrap `@fastify/cors` registration into a Fastify plugin.

**Exports**: `corsPlugin` — a Fastify plugin function (`FastifyPluginAsync`).

**Implementation**:

```typescript
import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";
import { config } from "../config.js";

export const corsPlugin = fp(async (app) => {
  await app.register(fastifyCors, {
    origin: config.corsOrigin,
    credentials: true,
  });
});
```

**Key decisions**:
- `origin` defaults to `http://localhost:5173` (Vite dev server), configurable via `CORS_ORIGIN` env var.
- `credentials: true` enables `Access-Control-Allow-Credentials` header, required for sending cookies/auth headers cross-origin.
- Wrapped with `fp` for the same encapsulation reason as the JWT plugin.

### D3: `packages/server/src/config.ts`

**Purpose**: Add `corsOrigin` to the config interface so the CORS plugin can read it.

**Changes**: Add one field to `Config` interface and one line to the `config` object.

**Before**:
```typescript
export interface Config {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
}

export const config: Config = {
  port: Number(process.env["PORT"]) || 3001,
  mongodbUri: process.env["MONGODB_URI"] ?? "mongodb://localhost:27017/taskboard",
  jwtSecret: process.env["JWT_SECRET"] ?? "dev-jwt-secret-change-in-production",
};
```

**After**:
```typescript
export interface Config {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  corsOrigin: string;
}

export const config: Config = {
  port: Number(process.env["PORT"]) || 3001,
  mongodbUri: process.env["MONGODB_URI"] ?? "mongodb://localhost:27017/taskboard",
  jwtSecret: process.env["JWT_SECRET"] ?? "dev-jwt-secret-change-in-production",
  corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
};
```

### D4: `packages/server/src/app.ts`

**Purpose**: Register both plugins in the app factory so they are available to all routes and middleware.

**Changes**: Import and register `jwtPlugin` and `corsPlugin`. Remove unused `Task` type import.

**After**:
```typescript
import Fastify from "fastify";
import { DEFAULT_COLUMNS } from "@taskboard/shared";
import { jwtPlugin } from "./plugins/jwt.plugin.js";
import { corsPlugin } from "./plugins/cors.plugin.js";

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

**Critical change**: `buildApp()` becomes `async` because `app.register()` with `await` requires it. This is necessary for Fastify v5's plugin system. All call sites that use `buildApp()` must be updated to `await buildApp()`.

**Cascading changes from async `buildApp()`**:
- `packages/server/src/server.ts`: Change `const app = buildApp()` to `const app = await buildApp()`.
- `packages/server/test/app.test.ts`: Change `const app = buildApp()` to `const app = await buildApp()` in each test.

Also remove the unused `import type { Task }` from the current `app.ts` (it was unused in the original code).

### D5: `packages/server/test/app.test.ts`

**Purpose**: Verify plugins are properly registered after `buildApp()`.

**Changes**: Update existing tests to `await buildApp()` and add new tests for JWT and CORS functionality.

**New tests to add**:

```typescript
describe("plugins", () => {
  it("registers the JWT plugin (app.jwt is available)", async () => {
    const app = await buildApp();
    expect(app.jwt).toBeDefined();
    expect(typeof app.jwt.sign).toBe("function");
    expect(typeof app.jwt.verify).toBe("function");
    await app.close();
  });

  it("app.jwt.sign() produces a valid token string", async () => {
    const app = await buildApp();
    const token = app.jwt.sign({ test: true });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
    await app.close();
  });

  it("CORS headers are present on responses", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: {
        origin: "http://localhost:5173",
      },
    });
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    await app.close();
  });

  it("CORS rejects disallowed origins", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: {
        origin: "http://evil.example.com",
      },
    });
    expect(response.headers["access-control-allow-origin"]).not.toBe("http://evil.example.com");
    await app.close();
  });
});
```

## 4. Contracts

### JWT Plugin Contract

After `jwtPlugin` registration:
- `app.jwt.sign(payload: object, options?: Partial<SignOptions>): string` — Signs a payload and returns a JWT string. Default `expiresIn` is `24h`.
- `app.jwt.verify<T>(token: string): T` — Verifies and decodes a JWT string.
- `request.jwtVerify<T>(): Promise<T>` — Extracts token from `Authorization: Bearer <token>` header, verifies, and sets `request.user`.

### CORS Plugin Contract

After `corsPlugin` registration:
- Responses to requests with `Origin: http://localhost:5173` include:
  - `Access-Control-Allow-Origin: http://localhost:5173`
  - `Access-Control-Allow-Credentials: true`
- Preflight `OPTIONS` requests from the allowed origin respond with proper CORS headers.
- Requests from disallowed origins do not receive an `Access-Control-Allow-Origin` matching their origin.

### Config Contract

```typescript
// Input: environment variables
JWT_SECRET="some-secret"       // optional, defaults to "dev-jwt-secret-change-in-production"
CORS_ORIGIN="http://localhost:5173"  // optional, defaults to "http://localhost:5173"

// Output: config object
config.jwtSecret  // string
config.corsOrigin // string
```

## 5. Test Plan

### Test Setup

- Tests use `buildApp()` (now async) and `app.inject()` for HTTP testing (Fastify's built-in test mechanism — no Supertest needed for these tests).
- No database connection needed — plugin tests don't touch MongoDB.
- Each test creates its own app instance and closes it afterward.

### Test Specifications

| # | Test Name | Setup | Action | Expected Result |
|---|-----------|-------|--------|-----------------|
| T1 | JWT plugin decorator available | `await buildApp()` | Check `app.jwt` | `app.jwt` is defined, `app.jwt.sign` and `app.jwt.verify` are functions |
| T2 | JWT sign produces valid token | `await buildApp()` | `app.jwt.sign({ test: true })` | Returns a string with 3 dot-separated parts (header.payload.signature) |
| T3 | CORS headers for allowed origin | `await buildApp()` | `GET /api/health` with `Origin: http://localhost:5173` | Response has `access-control-allow-origin: http://localhost:5173` and `access-control-allow-credentials: true` |
| T4 | CORS rejects disallowed origin | `await buildApp()` | `GET /api/health` with `Origin: http://evil.example.com` | Response does NOT have `access-control-allow-origin: http://evil.example.com` |
| T5 | Health endpoint still works (regression) | `await buildApp()` | `GET /api/health` | Returns 200 with `{ status: "ok", defaultColumns: [...] }` |
| T6 | Config has corsOrigin default | None | Check `config.corsOrigin` | `"http://localhost:5173"` |

### Existing Tests to Update

The existing tests in `app.test.ts` need `buildApp()` calls changed from sync to async:
- "returns a Fastify instance" — add `await`
- "registers the health endpoint" — add `await`

## 6. Implementation Order

1. **Check `fastify-plugin` dependency** — Verify `fastify-plugin` is installed in `packages/server`. If not, install it (`npm install fastify-plugin -w packages/server`). This is the only potential new dependency — it's a standard Fastify utility for breaking plugin encapsulation.

2. **Modify `packages/server/src/config.ts`** — Add `corsOrigin` field. This has no downstream breakage since it only adds a new field.

3. **Create `packages/server/src/plugins/jwt.plugin.ts`** — Implement the JWT plugin wrapper.

4. **Create `packages/server/src/plugins/cors.plugin.ts`** — Implement the CORS plugin wrapper.

5. **Modify `packages/server/src/app.ts`** — Make `buildApp()` async, register both plugins, remove unused `Task` import.

6. **Modify `packages/server/src/server.ts`** — Update `const app = buildApp()` to `const app = await buildApp()`.

7. **Modify `packages/server/test/app.test.ts`** — Update existing tests for async `buildApp()`, add plugin verification tests (T1–T6).

8. **Run verification commands** — Ensure all tests pass and dev server starts cleanly.

## 7. Verification Commands

```bash
# 1. Run all server tests (existing + new)
npm run test -w packages/server

# 2. Verify TypeScript compilation
npx tsc --noEmit -p packages/server/tsconfig.json

# 3. Start the dev server and verify it boots without errors
npm run dev
# Then verify in another terminal:
curl http://localhost:3001/api/health
# Expected: {"status":"ok","defaultColumns":["To Do","In Progress","In Review","Done"]}

# 4. Verify CORS headers
curl -v -H "Origin: http://localhost:5173" http://localhost:3001/api/health 2>&1 | grep -i "access-control"
# Expected: access-control-allow-origin: http://localhost:5173
# Expected: access-control-allow-credentials: true
```

## 8. Pre-Implementation Check

Before starting implementation, verify whether `fastify-plugin` is already installed:

```bash
npm ls fastify-plugin -w packages/server
```

If not installed, run:

```bash
npm install fastify-plugin -w packages/server
```

This is a standard Fastify ecosystem utility (not an additional dependency in the meaningful sense — it's the canonical way to write Fastify plugins that need to share decorators across scope boundaries).