## Task: Client package scaffold

### Objective

Scaffold the `packages/client/` React SPA package with Vite, React, TypeScript, Tailwind CSS, React Router, and proxy configuration pointing to the server.

### Deliverables

1. **`packages/client/package.json`** with:
   - Package name (e.g., `@taskboard/client`)
   - `dev` script (vite dev server)
   - `build` script (vite build)
   - Dependencies: `react`, `react-dom`, `react-router-dom`
   - Dev dependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, TypeScript types for React

2. **`packages/client/tsconfig.json`** extending `tsconfig.base.json`

3. **`packages/client/vite.config.ts`** with:
   - React plugin
   - Proxy configuration routing `/api` requests to the server (e.g., `http://localhost:3001`)
   - Distinct dev server port (e.g., 5173)

4. **`packages/client/tailwind.config.js`** and PostCSS configuration

5. **`packages/client/index.html`** — Vite entry HTML

6. **`packages/client/src/main.tsx`** — React entry point

7. **`packages/client/src/App.tsx`** — Root component with React Router setup:
   - Placeholder routes for `/login`, `/` (dashboard), `/projects/:id/board`

### Files to Create

- `packages/client/package.json`
- `packages/client/tsconfig.json`
- `packages/client/vite.config.ts`
- `packages/client/tailwind.config.js`
- `packages/client/postcss.config.js` (or `.cjs`)
- `packages/client/index.html`
- `packages/client/src/main.tsx`
- `packages/client/src/App.tsx`
- `packages/client/src/index.css` (with Tailwind directives)

### Constraints

- TypeScript strict mode, ES modules
- Functional components with hooks (no class components)
- File naming: kebab-case for files, PascalCase for components
- Named exports preferred
- Vite proxy must forward `/api` to server port so client and server work together in dev
- Tailwind CSS utility-first approach, minimal custom CSS

### Dependencies

- **t01** (Root workspace configuration) — requires root `package.json` and `tsconfig.base.json`
- **t02** (Shared package scaffold) — client will import types/constants from `@taskboard/shared`

### Verification Criteria

1. `packages/client/` compiles without TypeScript errors under strict mode
2. Running the client dev script starts Vite and serves the React app
3. React Router renders placeholder content for all defined routes
4. Tailwind CSS is correctly configured and utility classes work
5. Vite proxy configuration is set up for `/api` forwarding to server