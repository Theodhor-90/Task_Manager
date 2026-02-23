Good — confirmed: neither the server nor the client `package.json` lists `@taskboard/shared` as a dependency yet. Now I have everything I need to write the plan.

---

# Implementation Plan — t05: Cross-package imports and build verification

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/server/package.json` | Modify | Add `@taskboard/shared` as a workspace dependency |
| 2 | `packages/client/package.json` | Modify | Add `@taskboard/shared` as a workspace dependency |
| 3 | `packages/server/src/app.ts` | Modify | Add smoke-test import of a type and a constant from `@taskboard/shared` |
| 4 | `packages/client/src/App.tsx` | Modify | Add smoke-test import of a type and a constant from `@taskboard/shared` |
| 5 | `packages/server/vitest.config.ts` | Modify | Remove `globals: true` (deferred fix from t03 plan) |

---

## 2. Dependencies

### Prerequisites

- **t01** (Root workspace configuration) — completed
- **t02** (Shared package scaffold) — completed. `@taskboard/shared` is built with `dist/` output.
- **t03** (Server package scaffold) — completed. Fastify server scaffold in place.
- **t04** (Client package scaffold) — completed. Vite/React client scaffold in place.

### External

- **Node.js** >= 18
- **npm** >= 9 (workspaces support)

### Current State

All three packages exist, compile, and have built output in `dist/`. Workspace symlinks exist at `node_modules/@taskboard/*`. However:

1. **No cross-package imports exist** — neither server nor client imports anything from `@taskboard/shared`.
2. **No explicit `@taskboard/shared` dependency** in server or client `package.json` — npm workspaces still resolves via symlinks, but the dependency relationship is undocumented and `npm ls` won't show it.
3. **Server `vitest.config.ts` still has `globals: true`** — the t03 plan called for removing it, but impl notes suggest it wasn't done.

---

## 3. Implementation Details

### 3.1 `packages/server/package.json` — Add shared dependency

Add `@taskboard/shared` to the server's `dependencies`:

```json
"dependencies": {
  "@fastify/cors": "^10.0.0",
  "@fastify/jwt": "^9.0.0",
  "@taskboard/shared": "*",
  "fastify": "^5.0.0"
}
```

**Key decisions:**

- **Version `"*"`** — standard for monorepo workspace dependencies. npm workspaces resolves this to the local package via symlink. A semver range like `"^0.1.0"` would also work but `"*"` is simpler and conventional for workspace-internal packages.
- **Listed in `dependencies` (not `devDependencies`)** — the server imports runtime values (`PRIORITIES`, `DEFAULT_COLUMNS`) from shared, not just types. Even though the current smoke test only uses a constant at module scope, future tasks will use shared types and constants throughout the server codebase.

### 3.2 `packages/client/package.json` — Add shared dependency

Add `@taskboard/shared` to the client's `dependencies`:

```json
"dependencies": {
  "@remix-run/router": "https://registry.npmjs.org/@remix-run/router/-/router-1.8.0.tgz",
  "@taskboard/shared": "*",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "react-router": "https://registry.npmjs.org/react-router/-/react-router-6.15.0.tgz",
  "react-router-dom": "https://registry.npmjs.org/react-router-dom/-/react-router-dom-6.15.0.tgz"
}
```

**Key decisions:**

- Same rationale as server — `"*"` for workspace dependency, listed in `dependencies` because the client will use shared types and constants at runtime in later tasks.

### 3.3 `packages/server/src/app.ts` — Add cross-package import

The current file:

```typescript
import Fastify from "fastify";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  return app;
}
```

Modified file:

```typescript
import Fastify from "fastify";
import type { Task } from "@taskboard/shared";
import { DEFAULT_COLUMNS } from "@taskboard/shared";

export function buildApp() {
  const app = Fastify({
    logger: true,
  });

  app.get("/api/health", async () => {
    return { status: "ok", defaultColumns: DEFAULT_COLUMNS };
  });

  return app;
}
```

**Key decisions:**

- **`import type { Task }`** — demonstrates that TypeScript type imports resolve from `@taskboard/shared`. Uses `import type` as required by `verbatimModuleSyntax: true` in `tsconfig.base.json`. The `Task` type is chosen because it's the most central entity in the app.
- **`import { DEFAULT_COLUMNS }`** — demonstrates that runtime value imports resolve. This is a real constant (array of column names) that will be used later when creating default boards.
- **Health check endpoint** — `GET /api/health` returns the `DEFAULT_COLUMNS` constant, proving the import resolves at both compile time and runtime. This also serves as a useful health endpoint for the dev server verification in deliverable validation. A health endpoint is a natural place to surface shared constants without introducing domain logic.
- **`Task` type import is unused at runtime** — this is intentional. It only needs to compile (proving type resolution works). The `import type` syntax ensures it's erased at runtime, so no "unused import" runtime warnings occur. TypeScript's `verbatimModuleSyntax` handles this correctly.
- **Import uses `.js`-less specifier** — `@taskboard/shared` resolves via the package's `exports` field in `package.json`, not file-relative resolution. The `exports` map points to `./dist/index.js` which provides both the runtime value and type declarations.

### 3.4 `packages/client/src/App.tsx` — Add cross-package import

The current file has route placeholders. Add imports from `@taskboard/shared`:

```typescript
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { Priority } from "@taskboard/shared";
import { PRIORITIES } from "@taskboard/shared";

function LoginPage() {
  return <h1>Login</h1>;
}

function DashboardPage() {
  return <h1>Dashboard</h1>;
}

function BoardPage() {
  return (
    <div>
      <h1>Board</h1>
      <p>Priority levels: {PRIORITIES.join(", ")}</p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects/:id/board" element={<BoardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Key decisions:**

- **`import type { Priority }`** — proves type resolution works from the client. Uses `import type` to be explicit about type-only usage. `Priority` is chosen because it's a simple union type that complements the `PRIORITIES` constant.
- **`import { PRIORITIES }`** — proves runtime value resolution works. Renders the priorities in the `BoardPage` placeholder, making it visually verifiable in the browser.
- **Rendering `PRIORITIES.join(", ")`** — this renders "low, medium, high, urgent" on the Board page, providing visual confirmation that the import resolved correctly at both compile time and Vite bundling time.
- **Client tsconfig compatibility** — the client uses `moduleResolution: "bundler"` which resolves `@taskboard/shared` via the package's `exports` field. The `module: "ESNext"` and `verbatimModuleSyntax: false` settings mean the client can use either `import type` or regular `import` for types; we use `import type` for consistency with the server convention.

### 3.5 `packages/server/vitest.config.ts` — Remove `globals: true`

The t03 plan specified removing `globals: true` so test files must explicitly import from `vitest`. The current file:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    passWithNoTests: true,
  },
});
```

Modified file:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
  },
});
```

**Key decisions:**

- **Remove `globals: true`** — the t03 plan decided that explicit `import { describe, it, expect } from "vitest"` in test files is cleaner than injecting globals. With `globals: true`, TypeScript also needs tsconfig changes to recognize the global types, adding unnecessary complexity. Since there are no test files yet, this change has zero impact on existing code.
- **Keep `passWithNoTests: true`** — without this, `vitest run` fails when there are no test files, which breaks `npm run test` from the root.

---

## 4. Contracts

### Health Check Endpoint

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/api/health` |
| Auth | None required |
| Response | `{ "status": "ok", "defaultColumns": ["To Do", "In Progress", "In Review", "Done"] }` |

This endpoint is a verification tool, not part of the master plan's API spec. It proves the server imports and uses `@taskboard/shared` constants at runtime. It may be kept or removed in later tasks; its presence does not conflict with any planned endpoints.

### Cross-Package Import Resolution Paths

| Consumer | Import Statement | Resolution Chain |
|----------|-----------------|-----------------|
| Server | `import { DEFAULT_COLUMNS } from "@taskboard/shared"` | `package.json` `exports` → `./dist/index.js` → `./dist/constants/index.js` |
| Server | `import type { Task } from "@taskboard/shared"` | `package.json` `exports.types` → `./dist/index.d.ts` → `./dist/types/index.d.ts` |
| Client | `import { PRIORITIES } from "@taskboard/shared"` | Vite `bundler` resolution → `package.json` `exports` → `./dist/index.js` → `./dist/constants/index.js` |
| Client | `import type { Priority } from "@taskboard/shared"` | TypeScript `bundler` resolution → `package.json` `exports.types` → `./dist/index.d.ts` → `./dist/types/index.d.ts` |

---

## 5. Test Plan

This task is a verification and wiring task — there is no new business logic to unit-test. Verification is structural and functional.

| # | Check | Method | Expected Result |
|---|-------|--------|-----------------|
| 1 | `npm install` succeeds from root | Run command | Exit code 0, no errors |
| 2 | `npm ls @taskboard/shared` shows both server and client as consumers | Run command | Listed under both `@taskboard/server` and `@taskboard/client` |
| 3 | `@taskboard/shared` compiles without errors | `npm run build -w @taskboard/shared` | Exit code 0 |
| 4 | `@taskboard/server` compiles without errors | `npm run build -w @taskboard/server` | Exit code 0 |
| 5 | `@taskboard/client` type-checks and builds without errors | `npm run build -w @taskboard/client` | Exit code 0 |
| 6 | Full `npm run build` compiles all packages | Run from root | Exit code 0 |
| 7 | Server starts and health endpoint returns shared constant | Start server, `GET /api/health` | `{ status: "ok", defaultColumns: ["To Do", ...] }` |
| 8 | `npm run dev` starts both server and client concurrently | Run from root | Both processes start (server on 3001, client on 5173) |
| 9 | Server `vitest.config.ts` no longer has `globals: true` | Read file | `globals` key absent |
| 10 | `npm run test` succeeds from root | Run command | Exit code 0 (vitest passes with no tests) |
| 11 | Server `app.ts` imports both a type and a constant from `@taskboard/shared` | Read file | `import type { Task }` and `import { DEFAULT_COLUMNS }` present |
| 12 | Client `App.tsx` imports both a type and a constant from `@taskboard/shared` | Read file | `import type { Priority }` and `import { PRIORITIES }` present |

---

## 6. Implementation Order

1. **Modify `packages/server/package.json`** — add `"@taskboard/shared": "*"` to `dependencies`
2. **Modify `packages/client/package.json`** — add `"@taskboard/shared": "*"` to `dependencies`
3. **Run `npm install`** — re-link workspace dependencies so `@taskboard/shared` appears in the dependency trees of server and client
4. **Rebuild `@taskboard/shared`** — ensure `dist/` is up-to-date before consumers import from it
5. **Modify `packages/server/src/app.ts`** — add `@taskboard/shared` imports and health endpoint
6. **Modify `packages/server/vitest.config.ts`** — remove `globals: true`
7. **Modify `packages/client/src/App.tsx`** — add `@taskboard/shared` imports and render constant
8. **Build all packages** — `npm run build` from root to verify everything compiles
9. **Run tests** — `npm run test` from root to verify test runner still works
10. **Verify dev server** — `npm run dev` briefly to confirm both processes start concurrently
11. **Verify health endpoint** — `curl http://localhost:3001/api/health` to confirm runtime resolution
12. **Run verification commands** (Section 7)

---

## 7. Verification Commands

All commands are ESM-compatible (project uses `"type": "module"`).

```bash
# 1. Install workspace dependencies (links @taskboard/shared in server and client)
npm install

# 2. Verify @taskboard/shared is listed as a dependency of both consumers
npm ls @taskboard/shared

# 3. Build shared package first (consumers import from dist/)
npm run build -w @taskboard/shared

# 4. Build server package (verifies cross-package type and value imports compile)
npm run build -w @taskboard/server

# 5. Build client package (verifies cross-package imports resolve via bundler)
npm run build -w @taskboard/client

# 6. Full build from root (verifies all packages build together)
npm run build

# 7. Run tests from root (vitest passes with no tests, passWithNoTests: true)
npm run test

# 8. Verify server app.ts has shared imports
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/src/app.ts', 'utf8');
  console.assert(src.includes('from \"@taskboard/shared\"'), 'Missing @taskboard/shared import in server');
  console.assert(src.includes('import type'), 'Missing type import in server');
  console.assert(src.includes('DEFAULT_COLUMNS'), 'Missing DEFAULT_COLUMNS import in server');
  console.assert(src.includes('/api/health'), 'Missing health endpoint');
  console.log('OK: server app.ts has shared imports');
"

# 9. Verify client App.tsx has shared imports
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/client/src/App.tsx', 'utf8');
  console.assert(src.includes('from \"@taskboard/shared\"'), 'Missing @taskboard/shared import in client');
  console.assert(src.includes('PRIORITIES'), 'Missing PRIORITIES import in client');
  console.assert(src.includes('import type'), 'Missing type import in client');
  console.log('OK: client App.tsx has shared imports');
"

# 10. Verify vitest config no longer has globals: true
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/server/vitest.config.ts', 'utf8');
  console.assert(!src.includes('globals: true'), 'globals: true should be removed');
  console.assert(src.includes('passWithNoTests: true'), 'passWithNoTests should remain');
  console.log('OK: vitest.config.ts verified');
"

# 11. Verify server health endpoint returns shared constant at runtime
# Start server in background, test health endpoint, then kill server
npm run build -w @taskboard/shared && npm run build -w @taskboard/server
node packages/server/dist/server.js &
SERVER_PID=$!
sleep 2
curl -s http://localhost:3001/api/health | node --input-type=module -e "
  let data = '';
  process.stdin.on('data', c => data += c);
  process.stdin.on('end', () => {
    const json = JSON.parse(data);
    console.assert(json.status === 'ok', 'Health status should be ok');
    console.assert(Array.isArray(json.defaultColumns), 'defaultColumns should be array');
    console.assert(json.defaultColumns.length === 4, 'Should have 4 default columns');
    console.assert(json.defaultColumns[0] === 'To Do', 'First column should be To Do');
    console.log('OK: health endpoint returns shared constant');
  });
"
kill $SERVER_PID 2>/dev/null

# 12. Verify npm run dev starts both processes (timeout after 8 seconds)
timeout 8 npm run dev 2>&1 | head -30 || true
# Expected: output showing both server and client starting
```

All commands should exit with code 0 and produce no errors (except the timeout in step 12, which is expected).

---

## Appendix: Known Issues

| # | Issue | Impact | Resolution |
|---|-------|--------|------------|
| 1 | Client `react-router-dom` uses tarball URLs | Non-standard dependency format; works in current sandbox | Normalize to semver ranges when network install is available (per t04 impl-notes-v2) |
| 2 | Client `tsconfig.json` extends `tsconfig.base.json` but overrides most options | The t04 plan called for a standalone tsconfig, but implementation chose to extend and override. Both approaches work. | No action needed — the `extends` + overrides approach is functionally equivalent |
| 3 | `npm run dev` may fail with `EPERM` in sandboxed environments | Network bind restrictions in the execution sandbox | Not a code issue — works in normal environments |