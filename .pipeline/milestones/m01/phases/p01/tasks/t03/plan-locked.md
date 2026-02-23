Now I have all the context needed. Here is the complete implementation plan:

---

# Implementation Plan — t03: Server package scaffold

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/package.json` | Create | Package manifest with name, scripts, runtime and dev dependencies |
| 2 | `packages/server/tsconfig.json` | Create | TypeScript config extending `../../tsconfig.base.json` |
| 3 | `packages/server/src/app.ts` | Create | Fastify app factory function |
| 4 | `packages/server/src/server.ts` | Create | Entry point — calls app factory and listens on configured port |
| 5 | `packages/server/src/config.ts` | Create | Reads env vars (`PORT`, `MONGODB_URI`, `JWT_SECRET`) with dev defaults |
| 6 | `packages/server/src/models/.gitkeep` | Create | Empty directory stub for future Mongoose models |
| 7 | `packages/server/src/routes/.gitkeep` | Create | Empty directory stub for future route handlers |
| 8 | `packages/server/src/middleware/.gitkeep` | Create | Empty directory stub for future middleware |
| 9 | `packages/server/src/plugins/.gitkeep` | Create | Empty directory stub for future Fastify plugins |
| 10 | `packages/server/vitest.config.ts` | Create | Vitest configuration for the server package |

---

## 2. Dependencies

### Prerequisites

- **t01** (Root workspace configuration) — completed. Provides:
  - Root `package.json` with `"workspaces": ["packages/*"]` and `"type": "module"`
  - `tsconfig.base.json` with `strict: true`, `module: "Node16"`, `target: "ES2022"`, `verbatimModuleSyntax: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`
  - TypeScript `^5.7.0` in root devDependencies

- **t02** (Shared package scaffold) — completed. Provides:
  - `@taskboard/shared` package with entity types, API contract types, `PRIORITIES`, `DEFAULT_COLUMNS`
  - Server will import from `@taskboard/shared` in later tasks; not used directly in this scaffold

### Runtime Dependencies (to install in server package)

| Package | Version | Purpose |
|---------|---------|---------|
| `fastify` | `^5.0.0` | HTTP framework |
| `@fastify/jwt` | `^9.0.0` | JWT auth plugin |
| `@fastify/cors` | `^10.0.0` | CORS plugin |

### Dev Dependencies (to install in server package)

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | `^3.0.0` | Test runner |
| `supertest` | `^7.0.0` | HTTP assertions for integration tests |
| `tsx` | `^4.0.0` | TypeScript execution with watch mode for dev |
| `@types/supertest` | `^6.0.0` | TypeScript types for supertest |

### External

- **Node.js** >= 18
- **npm** >= 9 (workspaces support)
- MongoDB is **not** required for this task — the scaffold does not connect to a database

---

## 3. Implementation Details

### 3.1 `packages/server/package.json`

```json
{
  "name": "@taskboard/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@fastify/cors": "^10.0.0",
    "@fastify/jwt": "^9.0.0",
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "@types/supertest": "^6.0.0",
    "supertest": "^7.0.0",
    "tsx": "^4.0.0",
    "vitest": "^3.0.0"
  }
}
```

**Key decisions:**

- **`"type": "module"`** — matches root config, required for ESM.
- **`exports` field** — follows the same pattern as `@taskboard/shared` for consistency. Provides both `import` and `types` conditions for Node.js subpath exports.
- **`main` + `types`** — fallback for tools that don't support the `exports` field.
- **`"private": true`** — not published to npm; consumed only within the monorepo.
- **`dev` uses `tsx watch src/server.ts`** — `tsx` provides fast TypeScript execution with file watching for hot-reload. Watches `src/server.ts` as the entry point; changes to any imported file trigger a restart.
- **`build` uses `tsc`** directly — the base `tsconfig.json` configures all necessary compiler options. Emits `.js`, `.d.ts`, and `.d.ts.map` files to `dist/`.
- **`start`** — runs the compiled output directly with Node for production.
- **`test` uses `vitest run`** — single-run mode (not watch), suitable for CI and scripted invocation via `npm run test`.
- **No `@taskboard/shared` dependency listed** — npm workspaces automatically resolves sibling packages via the root `"workspaces": ["packages/*"]` field. The server can import from `@taskboard/shared` without an explicit dependency declaration. (If needed for explicitness in a later task, `"@taskboard/shared": "*"` can be added.)

### 3.2 `packages/server/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

**Key decisions:**

- **Identical structure to `packages/shared/tsconfig.json`** — follows the established pattern.
- **Inherits from `../../tsconfig.base.json`** — gets `strict: true`, `module: "Node16"`, `target: "ES2022"`, `verbatimModuleSyntax: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`.
- **`outDir: "./dist"`** — compiled output to `dist/`, which is gitignored.
- **`rootDir: "./src"`** — ensures `dist/` mirrors the `src/` directory structure (no nested `src/` folder inside `dist/`).
- **`include: ["src"]`** — only compile source files; excludes `vitest.config.ts`, `test/` files, and other non-source files from the compilation.

### 3.3 `packages/server/src/config.ts`

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

**Key decisions:**

- **Named export `config`** — follows the project convention of named exports only (no default exports).
- **`Config` interface exported** — allows type-safe usage of configuration throughout the server and in tests.
- **`PORT` defaults to `3001`** — per the task spec. Uses `Number()` conversion with `|| 3001` fallback (handles `NaN` from invalid strings).
- **`MONGODB_URI` defaults to `mongodb://localhost:27017/taskboard`** — sensible local development default. The master plan specifies MongoDB as the database; this URI will be used when the database layer is added in Phase 2.
- **`JWT_SECRET` defaults to `dev-jwt-secret-change-in-production`** — a clearly-marked development placeholder. Production deployments must override this via environment variable. The string makes it obvious it's not a real secret.
- **Bracket notation for `process.env`** — `process.env["PORT"]` instead of `process.env.PORT`. Both work, but bracket notation avoids potential issues with TypeScript's strict index access checks on the `NodeJS.ProcessEnv` type.
- **No dotenv** — environment variables are read directly from `process.env`. The `.env` file loading can be added in a later task if needed. The task spec doesn't mention dotenv.

### 3.4 `packages/server/src/app.ts`

```typescript
import Fastify from "fastify";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  return app;
}
```

**Key decisions:**

- **App factory pattern** — `buildApp()` creates and returns a Fastify instance without calling `listen()`. This is the standard Fastify pattern that enables testing (inject requests without a running server) and separation of concerns (the entry point decides when to listen).
- **`logger: true`** — enables Fastify's built-in Pino logger. This provides structured JSON logging out of the box. Can be configured further in later tasks.
- **No plugins registered yet** — the task spec says to create the app factory that "creates and configures a Fastify instance." JWT, CORS, routes, and database plugins will be added in later phases. Registering them now would require configuration that doesn't exist yet and would create untestable code paths.
- **Named export `buildApp`** — follows project conventions. The name `buildApp` is descriptive and distinguishes it from the Fastify instance itself.
- **`import Fastify from "fastify"`** — Fastify 5 exports a default export. With `verbatimModuleSyntax: true` in the base tsconfig, this is the correct import form. Fastify's types define the default export correctly for ESM.

### 3.5 `packages/server/src/server.ts`

```typescript
import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = buildApp();

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

**Key decisions:**

- **Top-level `await`** — supported in ES modules with `target: "ES2022"` and `module: "Node16"`. No need for an async IIFE wrapper.
- **`.js` extensions in imports** — required by `Node16` module resolution with `verbatimModuleSyntax: true`. TypeScript resolves `.js` to `.ts` during compilation.
- **`host: "0.0.0.0"`** — listens on all interfaces. Without this, Fastify defaults to `127.0.0.1` which works for local dev but fails in Docker containers and other environments. This is a common best practice.
- **Error handling** — wraps `listen()` in try/catch. On failure, logs the error using Fastify's built-in logger and exits with code 1. This prevents silent startup failures.
- **Uses `config.port`** — reads from the config module, which defaults to 3001.

### 3.6 Directory Stubs

Create four empty directories with `.gitkeep` files:

| Directory | Purpose |
|-----------|---------|
| `packages/server/src/models/` | Future Mongoose model files (Phase 2) |
| `packages/server/src/routes/` | Future Fastify route handlers (Phase 2/3) |
| `packages/server/src/middleware/` | Future auth middleware (Phase 3) |
| `packages/server/src/plugins/` | Future Fastify plugins for JWT, CORS (Phase 3) |

Each `.gitkeep` file is an empty file that exists solely to ensure Git tracks the directory. The files will be removed when real source files are added.

### 3.7 `packages/server/vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
```

**Key decisions:**

- **`globals: true`** — enables `describe`, `it`, `expect` etc. without explicit imports. This is the common Vitest convention and reduces boilerplate in test files.
- **`environment: "node"`** — explicitly sets the test environment to Node.js (not jsdom, which is the default for some configs). Server tests run in Node.
- **Minimal configuration** — only the essentials. Test file discovery uses Vitest's default glob patterns (`**/*.{test,spec}.{ts,tsx,js,jsx}`), which matches the project convention of `*.test.ts` files.
- **`defineConfig` from `vitest/config`** — provides type-safe configuration with full IntelliSense.

---

## 4. Contracts

### `buildApp()` — App Factory

```typescript
import type { FastifyInstance } from "fastify";

function buildApp(): FastifyInstance;
```

**Input:** None.  
**Output:** A configured `FastifyInstance` ready to register plugins, add routes, or start listening.

**Usage in entry point:**
```typescript
const app = buildApp();
await app.listen({ port: 3001 });
```

**Usage in tests (future):**
```typescript
const app = buildApp();
const response = await app.inject({ method: "GET", url: "/api/health" });
expect(response.statusCode).toBe(200);
```

### `config` — Environment Configuration

```typescript
interface Config {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
}

const config: Config;
```

**Values with defaults:**

| Property | Env Var | Default |
|----------|---------|---------|
| `port` | `PORT` | `3001` |
| `mongodbUri` | `MONGODB_URI` | `"mongodb://localhost:27017/taskboard"` |
| `jwtSecret` | `JWT_SECRET` | `"dev-jwt-secret-change-in-production"` |

---

## 5. Test Plan

This task creates a scaffold — there is minimal runtime logic. The `buildApp()` factory and `config` module are the only testable units, but they will be tested in task **t06** (Test infrastructure verification). This task's verification is structural.

| # | Check | Method | Expected Result |
|---|-------|--------|-----------------|
| 1 | Package compiles without errors | `npx tsc -p packages/server/tsconfig.json --noEmit` | Exit code 0, no errors |
| 2 | `package.json` has correct name | Read file | `"@taskboard/server"` |
| 3 | `package.json` has `dev` script with tsx watch | Read file | `"tsx watch src/server.ts"` |
| 4 | `package.json` has `build` script | Read file | `"tsc -p tsconfig.json"` |
| 5 | `package.json` has `test` script | Read file | `"vitest run"` |
| 6 | `package.json` lists `fastify` as dependency | Read file | Present |
| 7 | `package.json` lists `@fastify/jwt` as dependency | Read file | Present |
| 8 | `package.json` lists `@fastify/cors` as dependency | Read file | Present |
| 9 | `package.json` lists `vitest` as dev dependency | Read file | Present |
| 10 | `package.json` lists `tsx` as dev dependency | Read file | Present |
| 11 | `tsconfig.json` extends base config | Read file | `"../../tsconfig.base.json"` |
| 12 | `app.ts` exports `buildApp` function | Read file | Named export present |
| 13 | `server.ts` imports and uses `buildApp` and `config` | Read file | Both imports present |
| 14 | `config.ts` exports `config` with port, mongodbUri, jwtSecret | Read file | All three fields present |
| 15 | `config.ts` defaults port to 3001 | Read file | `3001` literal present |
| 16 | Directory stubs exist | Check filesystem | `models/`, `routes/`, `middleware/`, `plugins/` all contain `.gitkeep` |
| 17 | `vitest.config.ts` exists and is valid | Read file | `defineConfig` with `environment: "node"` |
| 18 | `npm install` succeeds from root | Run command | Exit code 0 |
| 19 | `npm run build -w @taskboard/server` succeeds | Run command | Exit code 0, `dist/` populated |
| 20 | Server starts and listens | Run `tsx packages/server/src/server.ts` briefly | Log line showing Fastify listening on port 3001 |
| 21 | npm workspace resolves package | `npm ls @taskboard/server` | Package listed, no errors |

---

## 6. Implementation Order

1. **Create `packages/server/package.json`** — establishes the package identity so npm workspaces can discover it
2. **Create `packages/server/tsconfig.json`** — configures TypeScript compilation before writing `.ts` files
3. **Create `packages/server/src/config.ts`** — environment config (no dependencies on other local files)
4. **Create `packages/server/src/app.ts`** — app factory (no dependencies on other local files)
5. **Create `packages/server/src/server.ts`** — entry point (imports `app.ts` and `config.ts` from steps 3–4)
6. **Create directory stubs** — `models/`, `routes/`, `middleware/`, `plugins/` with `.gitkeep` files
7. **Create `packages/server/vitest.config.ts`** — Vitest configuration
8. **Run `npm install`** — install all dependencies and link the new workspace package
9. **Run `npm run build -w @taskboard/server`** — compile and verify `dist/` output
10. **Verify server starts** — run the server briefly to confirm Fastify listens on port 3001
11. **Run verification commands** (Section 7)

---

## 7. Verification Commands

All commands are ESM-compatible (project uses `"type": "module"`).

```bash
# 1. Install workspace dependencies (links @taskboard/server)
npm install

# 2. Compile the server package (produces dist/)
npm run build -w @taskboard/server

# 3. Verify compilation succeeds with no errors (dry run)
npx tsc -p packages/server/tsconfig.json --noEmit

# 4. Verify dist output files exist
ls packages/server/dist/app.js \
   packages/server/dist/app.d.ts \
   packages/server/dist/server.js \
   packages/server/dist/server.d.ts \
   packages/server/dist/config.js \
   packages/server/dist/config.d.ts

# 5. Verify package is resolvable within the monorepo
npm ls @taskboard/server

# 6. Verify directory stubs exist
ls packages/server/src/models/.gitkeep \
   packages/server/src/routes/.gitkeep \
   packages/server/src/middleware/.gitkeep \
   packages/server/src/plugins/.gitkeep

# 7. Verify package.json has correct scripts and dependencies
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const p = JSON.parse(readFileSync('./packages/server/package.json', 'utf8'));
  console.assert(p.name === '@taskboard/server', 'name mismatch');
  console.assert(p.type === 'module', 'type mismatch');
  console.assert(p.scripts.dev === 'tsx watch src/server.ts', 'dev script mismatch');
  console.assert(p.scripts.build === 'tsc -p tsconfig.json', 'build script mismatch');
  console.assert(p.scripts.test === 'vitest run', 'test script mismatch');
  console.assert(p.dependencies.fastify, 'fastify missing');
  console.assert(p.dependencies['@fastify/jwt'], '@fastify/jwt missing');
  console.assert(p.dependencies['@fastify/cors'], '@fastify/cors missing');
  console.assert(p.devDependencies.vitest, 'vitest missing');
  console.assert(p.devDependencies.tsx, 'tsx missing');
  console.assert(p.devDependencies.supertest, 'supertest missing');
  console.assert(p.devDependencies['@types/supertest'], '@types/supertest missing');
  console.log('OK: package.json verified');
"

# 8. Verify config defaults
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/src/config.ts', 'utf8');
  console.assert(src.includes('3001'), 'Default port 3001 missing');
  console.assert(src.includes('mongodb://localhost:27017/taskboard'), 'Default MongoDB URI missing');
  console.assert(src.includes('JWT_SECRET'), 'JWT_SECRET env var missing');
  console.log('OK: config.ts verified');
"

# 9. Verify app factory exports buildApp
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/src/app.ts', 'utf8');
  console.assert(src.includes('export function buildApp'), 'buildApp export missing');
  console.assert(src.includes('Fastify'), 'Fastify import missing');
  console.log('OK: app.ts verified');
"

# 10. Verify server starts and listens (timeout after 3 seconds)
timeout 3 npx tsx packages/server/src/server.ts 2>&1 || true
# Expected: log line containing "listening" and "3001" before timeout kills it

# 11. Verify Vitest config is loadable
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/vitest.config.ts', 'utf8');
  console.assert(src.includes('defineConfig'), 'defineConfig missing');
  console.assert(src.includes('node'), 'node environment missing');
  console.log('OK: vitest.config.ts verified');
"
```

All commands should exit with code 0 and produce no errors (except the timeout in step 10, which is expected).