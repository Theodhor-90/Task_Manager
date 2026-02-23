Vitest is installed as a devDependency in `@taskboard/server` but gets hoisted to the root `node_modules`. The shared package doesn't list vitest as a dependency and has no test script. Now I have all the context needed to write the plan.

---

# Implementation Plan — t06: Test infrastructure verification

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/shared/vitest.config.ts` | Create | Vitest configuration for the shared package |
| 2 | `packages/shared/package.json` | Modify | Add `vitest` devDependency and `test` script |
| 3 | `packages/shared/src/__tests__/constants.test.ts` | Create | Trivial test validating `PRIORITIES` and `DEFAULT_COLUMNS` constants |
| 4 | `packages/server/test/app.test.ts` | Create | Trivial test validating the Fastify app factory and config module |

---

## 2. Dependencies

### Prerequisites

- **t01** (Root workspace configuration) — completed. Root `package.json` with workspaces, `test` script via `run-workspaces.mjs`.
- **t02** (Shared package scaffold) — completed. `@taskboard/shared` with types and constants.
- **t03** (Server package scaffold) — completed. `@taskboard/server` with `buildApp()`, `config`, and vitest config.
- **t05** (Cross-package imports and build verification) — completed. Cross-package imports work, `@taskboard/shared` is a dependency of server.

### Current State

- **Server package**: Has `vitest` `^3.0.0` as devDependency, `vitest.config.ts` with `environment: "node"` and `passWithNoTests: true`, `test` script `"vitest run"`. No test files exist.
- **Shared package**: No vitest dependency, no vitest config, no test script. No test files exist.
- **Client package**: No test infrastructure (out of scope for this task — the spec only mentions shared and server).
- **Root `test` script**: Runs `node ./scripts/run-workspaces.mjs test` which executes `npm run test --workspaces --if-present`. Since the shared package has no `test` script, it gets skipped.
- **Vitest binary**: Hoisted to root `node_modules/.bin/vitest` from the server's devDependency.

### External

- **Node.js** >= 18
- **npm** >= 9

---

## 3. Implementation Details

### 3.1 `packages/shared/vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

**Key decisions:**

- **Mirrors the server's vitest config** — same structure and `environment: "node"` setting for consistency across the monorepo.
- **No `passWithNoTests: true`** — unlike the server scaffold (which needed this to pass when there were zero test files), this task is creating the test file alongside the config. The test file will exist by the time `vitest run` executes.
- **No `globals: true`** — consistent with the server config (t03/t05 explicitly removed this). Test files will use explicit `import { describe, it, expect } from "vitest"`.

### 3.2 `packages/shared/package.json` — Add vitest and test script

Add `vitest` as a devDependency and a `test` script:

```json
{
  "name": "@taskboard/shared",
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
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

**Changes:**

- **Added `"test": "vitest run"`** — matches the server's test script. `vitest run` executes tests in non-watch mode (suitable for CI and the root `npm run test` command).
- **Added `"devDependencies": { "vitest": "^3.0.0" }`** — same version as the server. Although vitest is currently hoisted from the server's devDependency, explicitly declaring it in shared's package.json is correct practice: the package should declare its own dependencies rather than relying on hoisting behavior, which is not guaranteed.

### 3.3 `packages/shared/src/__tests__/constants.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { PRIORITIES, DEFAULT_COLUMNS } from "../constants/index.js";

describe("PRIORITIES", () => {
  it("has exactly 4 priority levels", () => {
    expect(PRIORITIES).toHaveLength(4);
  });

  it("contains the expected values in order", () => {
    expect(PRIORITIES).toEqual(["low", "medium", "high", "urgent"]);
  });

  it("is readonly", () => {
    expect(Object.isFrozen(PRIORITIES)).toBe(true);
  });
});

describe("DEFAULT_COLUMNS", () => {
  it("has exactly 4 default columns", () => {
    expect(DEFAULT_COLUMNS).toHaveLength(4);
  });

  it("contains the expected values in order", () => {
    expect(DEFAULT_COLUMNS).toEqual([
      "To Do",
      "In Progress",
      "In Review",
      "Done",
    ]);
  });

  it("is readonly", () => {
    expect(Object.isFrozen(DEFAULT_COLUMNS)).toBe(true);
  });
});
```

**Key decisions:**

- **Imports directly from source `../constants/index.js`** — tests run against TypeScript source via vitest's built-in TS transform, not compiled `dist/` output. This is standard vitest behavior and avoids requiring a build step before testing.
- **`.js` extension on import** — required by the `verbatimModuleSyntax: true` and `module: "Node16"` settings inherited from `tsconfig.base.json`. Vitest resolves `.js` imports to `.ts` source files.
- **Explicit `import { describe, it, expect } from "vitest"`** — no globals, consistent with the project convention.
- **Tests validate both length and exact values** — ensures the constants match the master plan's data model (Section 4.4 for columns, Section 4.5 for priorities).
- **`Object.isFrozen` test** — validates the `as const` + `readonly` contract. Arrays declared with `as const` at the top level are frozen by the runtime.
- **File location `src/__tests__/`** — the task spec suggests `packages/shared/src/__tests__/constants.test.ts` as one option. Co-locating tests under `src/__tests__/` follows the vitest convention and keeps tests close to source. The `__tests__` directory name is a widely recognized convention.
- **6 tests total** — three per constant. Trivial but meaningful: they verify the exact shape that downstream packages depend on.

### 3.4 `packages/server/test/app.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";
import { config } from "../src/config.js";

describe("buildApp", () => {
  it("returns a Fastify instance", async () => {
    const app = buildApp();
    expect(app).toBeDefined();
    expect(typeof app.listen).toBe("function");
    expect(typeof app.close).toBe("function");
    await app.close();
  });

  it("registers the health endpoint", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.defaultColumns).toEqual([
      "To Do",
      "In Progress",
      "In Review",
      "Done",
    ]);
    await app.close();
  });
});

describe("config", () => {
  it("has expected default values", () => {
    expect(config.port).toBe(3001);
    expect(config.mongodbUri).toBe("mongodb://localhost:27017/taskboard");
    expect(typeof config.jwtSecret).toBe("string");
    expect(config.jwtSecret.length).toBeGreaterThan(0);
  });
});
```

**Key decisions:**

- **File location `test/app.test.ts`** — the task spec suggests `packages/server/test/app.test.ts` as one option. The master plan's architecture (Section 3.1) shows `test/` as a top-level directory under the server package. The vitest config in the server doesn't restrict test file locations, so vitest's default glob (`**/*.test.ts`) will discover files in both `test/` and `src/`.
- **Imports from `../src/app.js` and `../src/config.js`** — tests import from TypeScript source via vitest's transform. The `.js` extension is required by `verbatimModuleSyntax: true`.
- **`app.inject()`** — uses Fastify's built-in lightweight testing method. No need for `supertest` or starting a real HTTP server. `inject()` simulates an HTTP request internally without binding to a port. This is the recommended Fastify testing approach.
- **`await app.close()`** — cleans up the Fastify instance after each test to prevent resource leaks.
- **Health endpoint test** — validates the `/api/health` endpoint added in t05, which returns `DEFAULT_COLUMNS` from `@taskboard/shared`. This test proves: (1) the app factory works, (2) routes are registered, (3) cross-package imports resolve at runtime.
- **Config defaults test** — validates that `config` exports sensible defaults when no environment variables are set. Tests exact values for `port` and `mongodbUri` (which are deterministic), and only tests that `jwtSecret` is a non-empty string (the exact value is an implementation detail).
- **3 tests total** — trivial but covers the key deliverables of the server scaffold (app factory, route registration, config module).

---

## 4. Contracts

Not applicable — test files have no exports or public API. They are consumed by the vitest test runner.

### Test Discovery

| Package | Vitest Config | Test File Pattern | Test Files |
|---------|--------------|-------------------|------------|
| `@taskboard/shared` | `packages/shared/vitest.config.ts` | `**/*.test.ts` (default) | `src/__tests__/constants.test.ts` |
| `@taskboard/server` | `packages/server/vitest.config.ts` | `**/*.test.ts` (default) | `test/app.test.ts` |
| `@taskboard/client` | None | N/A | None (out of scope) |

### Root Test Execution Chain

```
npm run test (root)
  → node ./scripts/run-workspaces.mjs test
    → npm run test --workspaces --if-present
      → @taskboard/shared: vitest run  → discovers src/__tests__/constants.test.ts
      → @taskboard/server: vitest run  → discovers test/app.test.ts
      → @taskboard/client: skipped (no test script)
```

---

## 5. Test Plan

This task's deliverables *are* tests. The verification is that the tests themselves pass.

| # | Check | Method | Expected Result |
|---|-------|--------|-----------------|
| 1 | Shared package tests pass | `npm run test -w @taskboard/shared` | 6 tests pass, 0 failures |
| 2 | Server package tests pass | `npm run test -w @taskboard/server` | 3 tests pass, 0 failures |
| 3 | Root test command runs both packages | `npm run test` | 9 total tests pass across 2 packages |
| 4 | Vitest config is discoverable in shared | `vitest.config.ts` exists and is valid | vitest uses it when running shared tests |
| 5 | Vitest config exists in server | Already present from t03 | Unchanged, still valid |
| 6 | Shared `package.json` has `test` script | Read file | `"test": "vitest run"` |
| 7 | Shared `package.json` has `vitest` devDependency | Read file | `"vitest": "^3.0.0"` |
| 8 | No test failures or errors in output | Run `npm run test` | Exit code 0, clean output |

---

## 6. Implementation Order

1. **Modify `packages/shared/package.json`** — add `vitest` devDependency and `test` script. This must come first so `npm install` picks up the new dependency.
2. **Create `packages/shared/vitest.config.ts`** — vitest configuration for shared package. Must exist before running tests.
3. **Create `packages/shared/src/__tests__/constants.test.ts`** — the shared package test file.
4. **Create `packages/server/test/app.test.ts`** — the server package test file.
5. **Run `npm install`** — install the newly added `vitest` devDependency in the shared package.
6. **Run `npm run test -w @taskboard/shared`** — verify shared tests pass in isolation.
7. **Run `npm run test -w @taskboard/server`** — verify server tests pass in isolation.
8. **Run `npm run test`** — verify the root test command discovers and runs tests in both packages.
9. **Run verification commands** (Section 7).

---

## 7. Verification Commands

All commands are ESM-compatible (project uses `"type": "module"`).

```bash
# 1. Install dependencies (picks up vitest in shared package)
npm install

# 2. Run shared package tests in isolation
npm run test -w @taskboard/shared

# 3. Run server package tests in isolation
npm run test -w @taskboard/server

# 4. Run all tests from root (should run both shared and server tests)
npm run test

# 5. Verify shared package.json has test script and vitest dependency
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const p = JSON.parse(readFileSync('./packages/shared/package.json', 'utf8'));
  console.assert(p.scripts.test === 'vitest run', 'test script mismatch');
  console.assert(p.devDependencies.vitest === '^3.0.0', 'vitest version mismatch');
  console.log('OK: shared package.json has test infrastructure');
"

# 6. Verify shared vitest config exists and is valid
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/shared/vitest.config.ts', 'utf8');
  console.assert(src.includes('defineConfig'), 'defineConfig missing');
  console.assert(src.includes('environment'), 'environment setting missing');
  console.log('OK: shared vitest.config.ts verified');
"

# 7. Verify test files exist
node --input-type=module -e "
  import { existsSync } from 'fs';
  console.assert(existsSync('./packages/shared/src/__tests__/constants.test.ts'), 'shared test file missing');
  console.assert(existsSync('./packages/server/test/app.test.ts'), 'server test file missing');
  console.log('OK: test files exist');
"

# 8. Verify shared test file imports from vitest (no globals)
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/shared/src/__tests__/constants.test.ts', 'utf8');
  console.assert(src.includes('import { describe, it, expect } from \"vitest\"'), 'Missing explicit vitest imports');
  console.assert(src.includes('PRIORITIES'), 'Missing PRIORITIES test');
  console.assert(src.includes('DEFAULT_COLUMNS'), 'Missing DEFAULT_COLUMNS test');
  console.log('OK: shared test file verified');
"

# 9. Verify server test file imports from vitest (no globals)
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/test/app.test.ts', 'utf8');
  console.assert(src.includes('import { describe, it, expect } from \"vitest\"'), 'Missing explicit vitest imports');
  console.assert(src.includes('buildApp'), 'Missing buildApp test');
  console.assert(src.includes('config'), 'Missing config test');
  console.log('OK: server test file verified');
"

# 10. Verify server vitest config still has correct settings (unchanged from t05)
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/vitest.config.ts', 'utf8');
  console.assert(!src.includes('globals: true'), 'globals: true should not be present');
  console.assert(src.includes('passWithNoTests: true'), 'passWithNoTests should remain');
  console.log('OK: server vitest.config.ts unchanged');
"
```

All commands should exit with code 0 and produce no errors.

---

## Appendix: Tiebreaker Decisions

| # | Issue | Decision | Rationale |
|---|-------|----------|-----------|
| 1 | Test file location for shared: `src/__tests__/` vs `test/` | **`src/__tests__/constants.test.ts`** | Task spec lists this as the first option. Co-locating under `src/` keeps tests near the source they validate. Vitest's default glob discovers `__tests__` directories. |
| 2 | Test file location for server: `test/` vs `src/__tests__/` | **`test/app.test.ts`** | Task spec lists this as the first option. The master plan architecture (Section 3.1) shows `test/` as a top-level dir under server. Integration tests in later milestones will go in `test/routes/`. |
| 3 | Should shared vitest config have `passWithNoTests`? | **No** | The test file is being created alongside the config, so there will always be tests to run. `passWithNoTests` was only needed in the server scaffold phase (t03) when no tests existed yet. |
| 4 | Should vitest be added as a root devDependency instead? | **No** — add to shared's `devDependencies` | Each package should declare its own test runner dependency. The server already does this. Matching the pattern keeps the monorepo consistent. |
| 5 | `Object.isFrozen` test — will `as const` arrays pass? | **Yes** | `as const` with `readonly` type assertion at the top-level module scope creates frozen arrays in the V8 runtime. Vitest runs in Node.js which uses V8. |
| 6 | Shared tsconfig `include` only covers `src/` — will `__tests__` inside `src/` be discovered? | **Yes** | The `include: ["src"]` glob in `packages/shared/tsconfig.json` covers all files under `src/`, including `src/__tests__/`. Vitest also handles its own TypeScript transformation independent of tsconfig `include`. |