The `.pipeline` directory has write restrictions (same issue the sibling tasks encountered). Here is the complete revised plan:

---

# Implementation Plan — t04: Client package scaffold (v2)

## 1. Deliverables

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | `packages/client/package.json` | Create | Package manifest with name, scripts, runtime and dev dependencies |
| 2 | `packages/client/tsconfig.json` | Create | TypeScript config for Vite/React — standalone, does not extend `../../tsconfig.base.json` (see §3.2 for rationale) |
| 3 | `packages/client/vite.config.ts` | Create | Vite config with React plugin, `/api` proxy to server, dev port 5173 |
| 4 | `packages/client/tailwind.config.js` | Create | Tailwind CSS content globs for the client package |
| 5 | `packages/client/postcss.config.js` | Create | PostCSS config loading Tailwind and Autoprefixer plugins |
| 6 | `packages/client/index.html` | Create | Vite entry HTML with root div and script module entry |
| 7 | `packages/client/src/main.tsx` | Create | React entry point — renders `<App />` into root div |
| 8 | `packages/client/src/App.tsx` | Create | Root component with React Router — placeholder routes for `/login`, `/`, `/projects/:id/board` |
| 9 | `packages/client/src/index.css` | Create | Tailwind CSS directives (`@tailwind base/components/utilities`) |

---

## 2. Dependencies

### Prerequisites

- **t01** (Root workspace configuration) — completed. Provides:
  - Root `package.json` with `"workspaces": ["packages/*"]` and `"type": "module"`
  - `tsconfig.base.json` with `strict: true`, `module: "Node16"`, `target: "ES2022"`, `verbatimModuleSyntax: true`
  - TypeScript `^5.7.0` in root devDependencies

- **t02** (Shared package scaffold) — completed. Provides:
  - `@taskboard/shared` package with entity types, API contract types, constants
  - Client will import from `@taskboard/shared` in later tasks; not used directly in this scaffold

- **t03** (Server package scaffold) — completed. Provides:
  - `@taskboard/server` running on port 3001 — the Vite proxy target

### Runtime Dependencies (to install in client package)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | `^19.0.0` | UI library |
| `react-dom` | `^19.0.0` | React DOM renderer |
| `react-router-dom` | `^7.0.0` | Client-side routing |

### Dev Dependencies (to install in client package)

| Package | Version | Purpose |
|---------|---------|---------|
| `vite` | `^6.0.0` | Build tool and dev server |
| `@vitejs/plugin-react` | `^4.0.0` | Vite React plugin (JSX transform, HMR) |
| `tailwindcss` | `^3.4.0` | Utility-first CSS framework |
| `postcss` | `^8.0.0` | CSS processor (required by Tailwind) |
| `autoprefixer` | `^10.0.0` | Vendor prefix automation |
| `@types/react` | `^19.0.0` | TypeScript types for React |
| `@types/react-dom` | `^19.0.0` | TypeScript types for React DOM |

### External

- **Node.js** >= 18
- **npm** >= 9 (workspaces support)

**Note on Tailwind CSS version:** Using Tailwind v3, not v4. Tailwind v4 (released Jan 2025) replaces PostCSS plugin + config file with a new Vite plugin and CSS-based configuration. The master plan specifies `tailwindcss` + `postcss` + `autoprefixer` as separate dependencies with a `tailwind.config.js` file, which is the v3 pattern. Using v3 avoids introducing a different configuration paradigm that doesn't match the master plan's architecture section.

---

## 3. Implementation Details

### 3.1 `packages/client/package.json`

```json
{
  "name": "@taskboard/client",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.4.0",
    "vite": "^6.0.0"
  }
}
```

**Key decisions:**

- **`"type": "module"`** — matches root config and all sibling packages.
- **`"private": true`** — not published to npm; consumed only within the monorepo.
- **`dev` uses `vite`** — starts the Vite dev server with HMR. Vite automatically picks up `vite.config.ts`.
- **`build` uses `tsc --noEmit && vite build`** — type-checks first with standard `tsc --noEmit`, then builds with Vite. This is the correct approach because `tsc -b` (build mode) is designed for composite projects with project references and **ignores the `noEmit` flag** — it would either error or emit unexpected `.js` files into the source tree. Since this client package uses `noEmit: true` in its tsconfig (Vite handles transpilation via esbuild), standard `tsc --noEmit` is the correct command for type-checking only.
- **`preview`** — serves the built `dist/` folder locally for pre-deployment verification.
- **No `test` script** — the task spec doesn't mention testing infrastructure for the client. Vitest/React Testing Library will be added in a later task when client tests are needed.
- **No `exports`/`main`/`types` fields** — unlike `@taskboard/shared` and `@taskboard/server`, the client package is not imported by other packages. It's a standalone SPA entry point.
- **React 19** — the master plan says "React 18+". React 19 is the current stable version and is backwards-compatible.
- **react-router-dom `^7.0.0`** — React Router v7 is the current stable version, fully supports React 19.

### 3.2 `packages/client/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "resolveJsonModule": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**Key decisions:**

- **Spec deviation: does NOT extend `../../tsconfig.base.json`** — The task spec deliverable #2 says "extending `tsconfig.base.json`." This plan intentionally deviates because the base config is incompatible with a Vite/React project. The incompatibilities are:
  - `module: "Node16"` requires `.js` extensions on all imports — Vite resolves imports without extensions.
  - `verbatimModuleSyntax: true` requires `import type` syntax and forbids certain default import patterns — many React ecosystem packages (react-router-dom, etc.) rely on default imports that don't have explicit `type` markers.
  - `declaration: true` + `declarationMap: true` are for library packages that emit `.d.ts` files — the client SPA doesn't emit declarations.
  - `sourceMap: true` conflicts with Vite's own source map handling.

  The base config was designed for Node.js library packages (`@taskboard/shared`, `@taskboard/server`). The client SPA is a fundamentally different build target (bundled by Vite/esbuild, not compiled by `tsc`). A standalone tsconfig that carries forward the *compatible* options from the base (`target`, `strict`, `esModuleInterop`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `isolatedModules`, `resolveJsonModule`) maintains the project's strict-mode convention while being correct for a Vite project.

- **`module: "ESNext"` + `moduleResolution: "bundler"`** — the Vite-recommended settings. `bundler` resolution allows extensionless imports, path aliases, and is designed for build tools like Vite/esbuild/Webpack.
- **`jsx: "react-jsx"`** — uses the automatic JSX runtime (React 17+). No need to `import React from "react"` in every file.
- **`noEmit: true`** — TypeScript is used only for type checking. Vite handles transpilation via esbuild. `tsc --noEmit` in the build script type-checks without emitting.
- **`strict: true`** — matches the project-wide convention from the master plan (Section 8.1).
- **`include: ["src"]`** — only type-check source files, not config files in the root.

### 3.3 `packages/client/vite.config.ts`

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

**Key decisions:**

- **`react()` plugin** — provides JSX transform via esbuild and React Fast Refresh HMR.
- **`server.port: 5173`** — Vite's default dev port. Explicit for clarity and to avoid confusion with the server's port 3001.
- **Proxy `/api` → `http://localhost:3001`** — all requests to `/api/*` from the client dev server are forwarded to the Fastify server. This avoids CORS issues during development and mirrors the production setup where both are served from the same origin (or a reverse proxy).
- **`changeOrigin: true`** — rewrites the `Host` header to match the target. Required for the proxy to work correctly when the server checks the host.
- **No `build` configuration** — defaults are fine: output to `dist/`, uses `index.html` as entry.
- **No explicit `root` needed** — Vite defaults `root` to the current working directory. When invoked via `npm run dev -w @taskboard/client`, npm sets cwd to `packages/client/`, so Vite correctly finds `index.html` there.

### 3.4 `packages/client/tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Key decisions:**

- **`export default`** — ES module syntax matching `"type": "module"`.
- **`.js` file extension** — Tailwind v3 config is a plain JavaScript file, not TypeScript. The `@type` JSDoc annotation provides IntelliSense.
- **Content globs** — scans `index.html` and all source files for Tailwind class names. Ensures unused classes are purged in production builds.
- **Empty `theme.extend`** — no custom theme overrides yet.
- **No plugins** — no Tailwind plugins needed for the scaffold.

### 3.5 `packages/client/postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Key decisions:**

- **ES module syntax** — matches `"type": "module"`.
- **Object syntax for plugins** — PostCSS supports both array and object syntax. Object syntax is more concise and is the Tailwind-recommended format.
- **`tailwindcss` + `autoprefixer`** — the two PostCSS plugins required by Tailwind v3.

### 3.6 `packages/client/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskBoard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 3.7 `packages/client/src/main.tsx`

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

### 3.8 `packages/client/src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route } from "react-router-dom";

function LoginPage() {
  return <h1>Login</h1>;
}

function DashboardPage() {
  return <h1>Dashboard</h1>;
}

function BoardPage() {
  return <h1>Board</h1>;
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

### 3.9 `packages/client/src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 4. Contracts

### Vite Dev Server

| Property | Value |
|----------|-------|
| URL | `http://localhost:5173` |
| Proxy | `/api/*` → `http://localhost:3001` |
| HMR | Enabled (React Fast Refresh) |

### Route Structure

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | `LoginPage` | Placeholder — renders `<h1>Login</h1>` |
| `/` | `DashboardPage` | Placeholder — renders `<h1>Dashboard</h1>` |
| `/projects/:id/board` | `BoardPage` | Placeholder — renders `<h1>Board</h1>` |

### CSS Processing Pipeline

```
src/index.css → PostCSS (tailwindcss + autoprefixer) → browser
```

---

## 5. Test Plan

This task creates a scaffold — there is no runtime logic to unit-test. Verification is structural and functional.

| # | Check | Method | Expected Result |
|---|-------|--------|-----------------|
| 1 | Package compiles without TS errors | `npx tsc --noEmit -p packages/client/tsconfig.json` | Exit code 0, no errors |
| 2 | `package.json` has correct name | Read file | `"@taskboard/client"` |
| 3 | `package.json` has `dev` script | Read file | `"vite"` |
| 4 | `package.json` has `build` script | Read file | `"tsc --noEmit && vite build"` |
| 5 | `package.json` lists `react` as dependency | Read file | Present |
| 6 | `package.json` lists `react-dom` as dependency | Read file | Present |
| 7 | `package.json` lists `react-router-dom` as dependency | Read file | Present |
| 8 | `package.json` lists `vite` as dev dependency | Read file | Present |
| 9 | `package.json` lists `tailwindcss` as dev dependency | Read file | Present |
| 10 | `tsconfig.json` has `jsx: "react-jsx"` | Read file | Present |
| 11 | `tsconfig.json` has `module: "ESNext"` | Read file | Present |
| 12 | `tsconfig.json` has `moduleResolution: "bundler"` | Read file | Present |
| 13 | `tsconfig.json` has `noEmit: true` | Read file | Present |
| 14 | `tsconfig.json` does NOT extend `../../tsconfig.base.json` | Read file | No `extends` field present |
| 15 | `vite.config.ts` has React plugin | Read file | `react()` in plugins array |
| 16 | `vite.config.ts` has `/api` proxy to port 3001 | Read file | Proxy config present |
| 17 | `tailwind.config.js` has content globs | Read file | `./src/**/*.{js,ts,jsx,tsx}` |
| 18 | `postcss.config.js` has tailwindcss plugin | Read file | Present |
| 19 | `index.html` has root div and module script | Read file | `<div id="root">` and `<script type="module">` |
| 20 | `main.tsx` creates React root and renders App | Read file | `createRoot` and `<App />` |
| 21 | `App.tsx` has all 3 routes | Read file | `/login`, `/`, `/projects/:id/board` |
| 22 | `index.css` has Tailwind directives | Read file | `@tailwind base`, `@tailwind components`, `@tailwind utilities` |
| 23 | `npm install` succeeds from root | Run command | Exit code 0 |
| 24 | `npm run build -w @taskboard/client` succeeds | Run command | Exit code 0, `dist/` populated |
| 25 | Vite dev server starts | Run `npm run dev -w @taskboard/client` briefly | Starts on port 5173 |
| 26 | npm workspace resolves package | `npm ls @taskboard/client` | Package listed, no errors |

---

## 6. Implementation Order

1. **Create `packages/client/package.json`** — establishes the package identity so npm workspaces can discover it
2. **Create `packages/client/tsconfig.json`** — configures TypeScript for Vite/React before writing `.tsx` files
3. **Create `packages/client/vite.config.ts`** — Vite configuration with React plugin and proxy
4. **Create `packages/client/tailwind.config.js`** — Tailwind CSS content configuration
5. **Create `packages/client/postcss.config.js`** — PostCSS plugin chain
6. **Create `packages/client/index.html`** — Vite HTML entry point
7. **Create `packages/client/src/index.css`** — Tailwind CSS directives
8. **Create `packages/client/src/App.tsx`** — Root component with router (created before `main.tsx` because `main.tsx` imports it)
9. **Create `packages/client/src/main.tsx`** — React entry point (imports `App.tsx` and `index.css`)
10. **Run `npm install`** — install all dependencies and link the new workspace package
11. **Run `npm run build -w @taskboard/client`** — type-check and build, verify `dist/` output
12. **Verify dev server starts** — run the Vite dev server briefly to confirm it starts on port 5173
13. **Run verification commands** (Section 7)

---

## 7. Verification Commands

All commands are ESM-compatible (project uses `"type": "module"`).

```bash
# 1. Install workspace dependencies (links @taskboard/client)
npm install

# 2. Type-check and build the client package (produces dist/)
npm run build -w @taskboard/client

# 3. Verify dist output exists
ls packages/client/dist/index.html packages/client/dist/assets/

# 4. Verify package is resolvable within the monorepo
npm ls @taskboard/client

# 5. Verify package.json has correct scripts and dependencies
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const p = JSON.parse(readFileSync('./packages/client/package.json', 'utf8'));
  console.assert(p.name === '@taskboard/client', 'name mismatch');
  console.assert(p.type === 'module', 'type mismatch');
  console.assert(p.scripts.dev === 'vite', 'dev script mismatch');
  console.assert(p.scripts.build === 'tsc --noEmit && vite build', 'build script mismatch');
  console.assert(p.dependencies.react, 'react missing');
  console.assert(p.dependencies['react-dom'], 'react-dom missing');
  console.assert(p.dependencies['react-router-dom'], 'react-router-dom missing');
  console.assert(p.devDependencies.vite, 'vite missing');
  console.assert(p.devDependencies['@vitejs/plugin-react'], '@vitejs/plugin-react missing');
  console.assert(p.devDependencies.tailwindcss, 'tailwindcss missing');
  console.assert(p.devDependencies.postcss, 'postcss missing');
  console.assert(p.devDependencies.autoprefixer, 'autoprefixer missing');
  console.assert(p.devDependencies['@types/react'], '@types/react missing');
  console.assert(p.devDependencies['@types/react-dom'], '@types/react-dom missing');
  console.log('OK: package.json verified');
"

# 6. Verify tsconfig.json has Vite-compatible settings (standalone, no extends)
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const t = JSON.parse(readFileSync('./packages/client/tsconfig.json', 'utf8'));
  console.assert(!t.extends, 'tsconfig should NOT extend base (Vite incompatible)');
  console.assert(t.compilerOptions.jsx === 'react-jsx', 'jsx mismatch');
  console.assert(t.compilerOptions.module === 'ESNext', 'module mismatch');
  console.assert(t.compilerOptions.moduleResolution === 'bundler', 'moduleResolution mismatch');
  console.assert(t.compilerOptions.strict === true, 'strict not enabled');
  console.assert(t.compilerOptions.noEmit === true, 'noEmit not set');
  console.log('OK: tsconfig.json verified');
"

# 7. Verify vite.config.ts has proxy and React plugin
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/client/vite.config.ts', 'utf8');
  console.assert(src.includes('react()'), 'React plugin missing');
  console.assert(src.includes('/api'), 'API proxy missing');
  console.assert(src.includes('3001'), 'Server port missing in proxy');
  console.assert(src.includes('5173'), 'Dev port missing');
  console.log('OK: vite.config.ts verified');
"

# 8. Verify Tailwind config has content globs
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/client/tailwind.config.js', 'utf8');
  console.assert(src.includes('./src/**/*.{js,ts,jsx,tsx}'), 'Content glob missing');
  console.assert(src.includes('./index.html'), 'index.html content glob missing');
  console.log('OK: tailwind.config.js verified');
"

# 9. Verify PostCSS config has plugins
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/client/postcss.config.js', 'utf8');
  console.assert(src.includes('tailwindcss'), 'tailwindcss plugin missing');
  console.assert(src.includes('autoprefixer'), 'autoprefixer plugin missing');
  console.log('OK: postcss.config.js verified');
"

# 10. Verify index.html has root div and module script
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const html = readFileSync('./packages/client/index.html', 'utf8');
  console.assert(html.includes('id=\"root\"'), 'Root div missing');
  console.assert(html.includes('type=\"module\"'), 'Module script missing');
  console.assert(html.includes('/src/main.tsx'), 'Main entry missing');
  console.log('OK: index.html verified');
"

# 11. Verify App.tsx has all 3 routes
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const src = readFileSync('./packages/client/src/App.tsx', 'utf8');
  console.assert(src.includes('/login'), 'Login route missing');
  console.assert(src.includes('path=\"/\"'), 'Dashboard route missing');
  console.assert(src.includes('/projects/:id/board'), 'Board route missing');
  console.assert(src.includes('export function App'), 'Named App export missing');
  console.log('OK: App.tsx verified');
"

# 12. Verify index.css has Tailwind directives
node --input-type=module -e "
  import { readFileSync } from 'fs';
  const css = readFileSync('./packages/client/src/index.css', 'utf8');
  console.assert(css.includes('@tailwind base'), 'Tailwind base missing');
  console.assert(css.includes('@tailwind components'), 'Tailwind components missing');
  console.assert(css.includes('@tailwind utilities'), 'Tailwind utilities missing');
  console.log('OK: index.css verified');
"

# 13. Verify Vite dev server starts (timeout after 5 seconds)
# Uses npm workspace flag so Vite runs with cwd=packages/client/ and finds index.html
timeout 5 npm run dev -w @taskboard/client 2>&1 || true
# Expected: output containing "Local:" and "5173" before timeout kills it
```

All commands should exit with code 0 and produce no errors (except the timeout in step 13, which is expected).

---

## Appendix: Changes from v1

| # | Feedback Point | What Changed |
|---|---------------|--------------|
| 1 | `tsc -b` incompatible with `noEmit: true` | Build script changed from `"tsc -b && vite build"` to `"tsc --noEmit && vite build"`. Updated §3.1 rationale to explain why `tsc -b` is wrong here (it ignores `noEmit`, requires `composite: true`). Updated test plan row #4 and verification command #5 to match new build script. |
| 2 | Verification command #13 runs Vite from repo root, can't find `index.html` | Changed from `timeout 5 npx vite --config packages/client/vite.config.ts` to `timeout 5 npm run dev -w @taskboard/client`. The `-w` flag sets cwd to `packages/client/`, so Vite finds `index.html` correctly. Updated §3.3 to note why no explicit `root` config is needed. |
| 3 | Not extending `tsconfig.base.json` is a spec deviation — should be acknowledged | Added explicit "Spec deviation" callout at the top of §3.2 rationale, acknowledging that deliverable #2 says "extending `tsconfig.base.json`" and explaining why this plan intentionally deviates. Added test plan row #14 to verify the tsconfig does NOT have an `extends` field. Added verification assertion in command #6. |