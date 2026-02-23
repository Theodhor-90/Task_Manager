The plan file can't be written to the `.pipeline` directory due to permissions. Here is the complete revised plan:

---

# Implementation Plan — t03: Server package scaffold

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/package.json` | Modify | Add `@taskboard/shared` as explicit workspace dependency |
| 2 | `packages/server/tsconfig.json` | Verify | TypeScript config extending `../../tsconfig.base.json` — already correct |
| 3 | `packages/server/src/app.ts` | Verify | Fastify app factory function — already correct |
| 4 | `packages/server/src/server.ts` | Verify | Entry point — already correct |
| 5 | `packages/server/src/config.ts` | Verify | Reads env vars with dev defaults — already correct |
| 6 | `packages/server/src/models/.gitkeep` | Verify | Empty directory stub — already exists |
| 7 | `packages/server/src/routes/.gitkeep` | Verify | Empty directory stub — already exists |
| 8 | `packages/server/src/middleware/.gitkeep` | Verify | Empty directory stub — already exists |
| 9 | `packages/server/src/plugins/.gitkeep` | Verify | Empty directory stub — already exists |
| 10 | `packages/server/vitest.config.ts` | Modify | Drop `globals: true`, use explicit vitest imports in tests instead |

**Note:** All files were created in a prior implementation attempt based on plan-v1. This plan focuses on the corrections identified in feedback-v1, plus verification that all existing files are correct.

---

## 2. Dependencies

### Prerequisites

- **t01** (Root workspace configuration) — completed. Provides:
  - Root `package.json` with `"workspaces": ["packages/*"]` and `"type": "module"`
  - `tsconfig.base.json` with `strict: true`, `module: "Node16"`, `target: "ES2022"`, `verbatimModuleSyntax: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`
  - `tsconfig.base.json` also has `paths: { "@taskboard/*": ["packages/*/src"] }` for IDE/TS resolution of workspace packages
  - TypeScript `^5.7.0` in root devDependencies

- **t02** (Shared package scaffold) — completed. Provides:
  - `@taskboard/shared` package with entity types, API contract types, `PRIORITIES`, `DEFAULT_COLUMNS`
  - Server will import from `@taskboard/shared` in later tasks (not used in this scaffold directly, but the dependency must be declared now)

### Runtime Dependencies (in server package)

| Package | Version | Purpose |
|---------|---------|---------|
| `fastify` | `^5.0.0` | HTTP framework |
| `@fastify/jwt` | `^9.0.0` | JWT auth plugin |
| `@fastify/cors` | `^10.0.0` | CORS plugin |
| `@taskboard/shared` | `*` | Shared types and constants (workspace dependency) |

### Dev Dependencies (in server package)

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | `^3.0.0` | Test runner |
| `supertest` | `^7.0.0` | HTTP assertions for integration tests |
| `tsx` | `^4.0.0` | TypeScript execution with watch mode for dev |
| `@types/supertest` | `^6.0.0` | TypeScript types for supertest (supertest v7.2.2 does not ship its own types) |

### External

- **Node.js** >= 18
- **npm** >= 9 (workspaces support)
- MongoDB is **not** required for this task — the scaffold does not connect to a database

---

## 3. Implementation Details

### 3.1 `packages/server/package.json`

**Current state:** Exists with all required fields. Missing explicit `@taskboard/shared` dependency.

**Change:** Add `"@taskboard/shared": "*"` to `dependencies`.

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
    "@taskboard/shared": "*",
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

- **`"@taskboard/shared": "*"`** — Declares an explicit workspace dependency. While npm workspaces automatically symlinks all workspace packages into `node_modules/@taskboard/`, declaring the dependency explicitly is correct practice because: (1) it documents the dependency relationship in the package graph, (2) it ensures `npm ls` reports the relationship accurately, (3) it guarantees resolution even if the workspace configuration changes, and (4) TypeScript's `Node16` module resolution requires the package to be discoverable in `node_modules`. The `*` version spec means "any version," which npm resolves to the local workspace package.
- **`"type": "module"`** — matches root config, required for ESM.
- **`exports` field** — follows the same pattern as `@taskboard/shared` for consistency. Provides both `import` and `types` conditions.
- **`"private": true`** — not published to npm; consumed only within the monorepo.
- **`dev` uses `tsx watch src/server.ts`** — `tsx` provides fast TypeScript execution with file watching for hot-reload.
- **`build` uses `tsc`** directly — inherits all compiler options from `tsconfig.base.json`.
- **`start`** — runs the compiled output directly with Node for production.
- **`test` uses `vitest run`** — single-run mode (not watch), suitable for CI.
- **`@types/supertest` is required** — verified that supertest v7.2.2 does NOT ship its own TypeScript types (`package.json` has no `types` or `typings` field). The `@types/supertest@^6.0.0` package from DefinitelyTyped is the correct types source and is compatible with supertest v7.

### 3.2 `packages/server/tsconfig.json`

**Current state:** Exists and correct. No changes needed.

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
- **Inherits from `../../tsconfig.base.json`** — gets `strict: true`, `module: "Node16"`, `target: "ES2022"`, `verbatimModuleSyntax: true`, `declaration: true`, `declarationMap: true`, `sourceMap: true`, `esModuleInterop: true`.
- **`outDir: "./dist"`** — compiled output to `dist/`, which is gitignored.
- **`rootDir: "./src"`** — ensures `dist/` mirrors the `src/` directory structure.
- **`include: ["src"]`** — only compile source files; excludes `vitest.config.ts` and test files.

### 3.3 `packages/server/src/config.ts`

**Current state:** Exists and correct. No changes needed.

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

- **Named export `config`** — follows the project convention of named exports only.
- **`Config` interface exported** — allows type-safe usage throughout the server.
- **`PORT` defaults to `3001`** — per the task spec.
- **`MONGODB_URI` defaults to `mongodb://localhost:27017/taskboard`** — sensible local development default.
- **`JWT_SECRET` defaults to `dev-jwt-secret-change-in-production`** — clearly-marked development placeholder.
- **Bracket notation for `process.env`** — avoids potential issues with TypeScript's strict index access checks.
- **No dotenv** — env vars read directly from `process.env`. The task spec doesn't mention dotenv.

### 3.4 `packages/server/src/app.ts`

**Current state:** Exists and correct. No changes needed.

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

- **App factory pattern** — `buildApp()` creates and returns a Fastify instance without calling `listen()`. Enables testing via `app.inject()` without a running server.
- **`logger: true`** — enables Fastify's built-in Pino logger for structured JSON logging.
- **No plugins registered yet** — JWT, CORS, routes, and database plugins will be added in later phases.
- **Named export `buildApp`** — follows project conventions.
- **`import Fastify from "fastify"` is the correct import form** — Verified by successful compilation with `verbatimModuleSyntax: true`. Fastify 5.7.4's type declaration (`fastify.d.ts`) declares both `export { fastify as default }` (named default) and `export = fastify` (CJS) within the `fastify` namespace. With `module: "Node16"` and `esModuleInterop: true` in the base tsconfig, TypeScript correctly resolves the default import. This was confirmed by running `npx tsc -p packages/server/tsconfig.json --noEmit` with zero errors.

### 3.5 `packages/server/src/server.ts`

**Current state:** Exists and correct. No changes needed.

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

- **Top-level `await`** — supported in ES modules with `target: "ES2022"` and `module: "Node16"`.
- **`.js` extensions in imports** — required by `Node16` module resolution with `verbatimModuleSyntax: true`.
- **`host: "0.0.0.0"`** — listens on all interfaces, works in Docker and other environments.
- **Error handling** — wraps `listen()` in try/catch, logs error and exits with code 1.

### 3.6 Directory Stubs

**Current state:** All four exist. No changes needed.

| Directory | `.gitkeep` Present | Purpose |
|-----------|--------------------|---------|
| `packages/server/src/models/` | Yes | Future Mongoose models (Phase 2) |
| `packages/server/src/routes/` | Yes | Future route handlers (Phase 2/3) |
| `packages/server/src/middleware/` | Yes | Future auth middleware (Phase 3) |
| `packages/server/src/plugins/` | Yes | Future Fastify plugins (Phase 3) |

### 3.7 `packages/server/vitest.config.ts`

**Current state:** Exists. Needs modification — drop `globals: true`.

**Change:** Remove `globals: true` to avoid a TypeScript types gap.

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

**Key decisions:**

- **Dropped `globals: true`** — With `globals: true`, `describe`, `it`, `expect` etc. are available at runtime without imports, but TypeScript won't know about these globals unless the tsconfig includes `"types": ["vitest/globals"]`. The server tsconfig only includes `src/` (not test files), and adding a separate `tsconfig.test.json` or modifying the main tsconfig for test globals adds complexity for no real benefit. Instead, test files written in later tasks will use explicit imports: `import { describe, it, expect } from "vitest"`. This is simpler, self-documenting, and works out of the box with TypeScript strict mode — no extra configuration needed.
- **`environment: "node"`** — explicitly sets the test environment to Node.js (not jsdom). Server tests run in Node.
- **Minimal configuration** — only the essentials. Test file discovery uses Vitest's default glob patterns (`**/*.{test,spec}.{ts,tsx,js,jsx}`).
- **`defineConfig` from `vitest/config`** — provides type-safe configuration.

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
import { describe, it, expect } from "vitest";

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
| 9 | `package.json` lists `@taskboard/shared` as dependency | Read file | `"*"` |
| 10 | `package.json` lists `vitest` as dev dependency | Read file | Present |
| 11 | `package.json` lists `tsx` as dev dependency | Read file | Present |
| 12 | `package.json` lists `supertest` as dev dependency | Read file | Present |
| 13 | `package.json` lists `@types/supertest` as dev dependency | Read file | Present |
| 14 | `tsconfig.json` extends base config | Read file | `"../../tsconfig.base.json"` |
| 15 | `app.ts` exports `buildApp` function | Read file | Named export present |
| 16 | `app.ts` uses `import Fastify from "fastify"` | Read file | Default import present |
| 17 | `server.ts` imports and uses `buildApp` and `config` | Read file | Both imports present |
| 18 | `config.ts` exports `config` with port, mongodbUri, jwtSecret | Read file | All three fields present |
| 19 | `config.ts` defaults port to 3001 | Read file | `3001` literal present |
| 20 | Directory stubs exist | Check filesystem | `models/`, `routes/`, `middleware/`, `plugins/` all contain `.gitkeep` |
| 21 | `vitest.config.ts` exists and does NOT have `globals: true` | Read file | `defineConfig` with `environment: "node"`, no `globals` |
| 22 | `npm install` succeeds from root | Run command | Exit code 0 |
| 23 | `npm run build -w @taskboard/server` succeeds | Run command | Exit code 0, `dist/` populated |
| 24 | Server starts and listens on port 3001 | Run `tsx packages/server/src/server.ts` briefly | Log line showing Fastify listening on port 3001 |
| 25 | npm workspace resolves package | `npm ls @taskboard/server` | Package listed, no errors |
| 26 | `@taskboard/shared` is listed as dependency of `@taskboard/server` | `npm ls @taskboard/shared` | Shows under `@taskboard/server` |

**Known limitation:** The root `npm run dev` script uses `concurrently --kill-others-on-fail` to run both `@taskboard/server` and `@taskboard/client` dev scripts simultaneously. Since `packages/client/` does not exist yet, `npm run dev` from root will fail. This is expected and will be resolved when the client package is scaffolded in a later task. For this task, use `npm run dev -w @taskboard/server` directly to verify the server starts correctly.

---

## 6. Implementation Order

1. **Modify `packages/server/package.json`** — add `"@taskboard/shared": "*"` to `dependencies`
2. **Modify `packages/server/vitest.config.ts`** — remove `globals: true`
3. **Verify all other files** — confirm `tsconfig.json`, `app.ts`, `server.ts`, `config.ts`, and directory stubs are correct (they are, per current state inspection)
4. **Run `npm install`** — re-link workspace packages with the new explicit `@taskboard/shared` dependency
5. **Run `npm run build -w @taskboard/server`** — compile and verify `dist/` output
6. **Verify server starts** — run the server briefly with `npx tsx packages/server/src/server.ts` to confirm Fastify listens on port 3001
7. **Run verification commands** (Section 7)

---

## 7. Verification Commands

All commands are ESM-compatible (project uses `"type": "module"`).

```bash
# 1. Install workspace dependencies (re-links @taskboard/shared as explicit dep)
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

# 6. Verify @taskboard/shared is listed as a dependency
npm ls @taskboard/shared

# 7. Verify directory stubs exist
ls packages/server/src/models/.gitkeep \
   packages/server/src/routes/.gitkeep \
   packages/server/src/middleware/.gitkeep \
   packages/server/src/plugins/.gitkeep

# 8. Verify package.json has correct scripts, dependencies, and @taskboard/shared
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
  console.assert(p.dependencies['@taskboard/shared'] === '*', '@taskboard/shared missing or wrong version');
  console.assert(p.devDependencies.vitest, 'vitest missing');
  console.assert(p.devDependencies.tsx, 'tsx missing');
  console.assert(p.devDependencies.supertest, 'supertest missing');
  console.assert(p.devDependencies['@types/supertest'], '@types/supertest missing');
  console.log('OK: package.json verified');
"

# 9. Verify config defaults
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/src/config.ts', 'utf8');
  console.assert(src.includes('3001'), 'Default port 3001 missing');
  console.assert(src.includes('mongodb://localhost:27017/taskboard'), 'Default MongoDB URI missing');
  console.assert(src.includes('JWT_SECRET'), 'JWT_SECRET env var missing');
  console.log('OK: config.ts verified');
"

# 10. Verify app factory exports buildApp with correct Fastify import
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/src/app.ts', 'utf8');
  console.assert(src.includes('export function buildApp'), 'buildApp export missing');
  console.assert(src.includes('import Fastify from \"fastify\"'), 'Fastify default import missing');
  console.log('OK: app.ts verified');
"

# 11. Verify vitest.config.ts does NOT have globals: true
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/vitest.config.ts', 'utf8');
  console.assert(src.includes('defineConfig'), 'defineConfig missing');
  console.assert(src.includes('node'), 'node environment missing');
  console.assert(!src.includes('globals'), 'globals should not be present');
  console.log('OK: vitest.config.ts verified');
"

# 12. Verify server starts and listens (timeout after 3 seconds)
# Use workspace-scoped dev script, NOT root npm run dev (see Known Limitation)
timeout 3 npx tsx packages/server/src/server.ts 2>&1 || true
# Expected: log line containing "listening" and "3001" before timeout kills it
```

All commands should exit with code 0 and produce no errors (except the timeout in step 12, which is expected).

**Known limitation — root `npm run dev` will fail:** The root `package.json` has `"dev": "concurrently --kill-others-on-fail \"npm run dev -w @taskboard/server\" \"npm run dev -w @taskboard/client\""`. Since `packages/client/` does not exist yet, this command fails because `npm run dev -w @taskboard/client` errors out and `--kill-others-on-fail` terminates the server too. Use `npm run dev -w @taskboard/server` directly to verify the server dev script. The root `dev` command will work once the client package is scaffolded in a later task.

---

## Changes from v1

| # | Feedback Point | Resolution |
|---|----------------|------------|
| 1 | `import Fastify from "fastify"` may be incompatible with `verbatimModuleSyntax: true` | **Verified compatible.** Ran `npx tsc -p packages/server/tsconfig.json --noEmit` with zero errors. Fastify 5.7.4's type declarations provide both `export { fastify as default }` and `export = fastify`. With `module: "Node16"` and `esModuleInterop: true` in the base tsconfig, TypeScript correctly resolves the default import. Section 3.4 documents the exact mechanism and verification evidence. |
| 2 | Missing `@taskboard/shared` as explicit dependency | **Fixed.** Added `"@taskboard/shared": "*"` to `dependencies` in `package.json`. Section 3.1 documents why this is necessary. Verification commands (step 6, 8) check for its presence. |
| 3 | Root `dev` script will fail without `packages/client/` | **Documented.** Added "Known limitation" notes in Section 5 (Test Plan) and Section 7 (Verification Commands) explaining the issue and the workaround (`npm run dev -w @taskboard/server`). |
| 4 | `supertest` v7 / `@types/supertest` v6 version mismatch risk | **Verified compatible.** Checked installed `supertest@7.2.2` — it has no `types` or `typings` field, confirming it does NOT ship its own TypeScript types. `@types/supertest@^6.0.0` is required and correct. Section 3.1 documents this. |
| 5 | `globals: true` in vitest.config.ts without TypeScript types | **Fixed.** Removed `globals: true` from vitest.config.ts. Test files will use explicit imports (`import { describe, it, expect } from "vitest"`), which works out of the box with TypeScript strict mode. Section 3.7 documents the rationale. |