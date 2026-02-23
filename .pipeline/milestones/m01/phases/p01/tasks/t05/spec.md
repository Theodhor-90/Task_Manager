## Task: Cross-package imports and build verification

### Objective

Validate that the monorepo is correctly wired: `npm install` works from root, all packages build cleanly, `npm run dev` starts both server and client concurrently, and cross-package imports from `@taskboard/shared` resolve correctly in both server and client.

### Deliverables

1. **`npm install` validation** — Run from root; all workspace dependencies install correctly without errors

2. **`npm run build` validation** — All three packages (shared, server, client) compile without TypeScript errors under strict mode

3. **`npm run dev` validation** — Both server and client start concurrently:
   - Fastify server starts and listens on its configured port (e.g., 3001)
   - Vite client dev server starts on its port (e.g., 5173)
   - `concurrently` orchestrates both with `--kill-others-on-fail`

4. **Cross-package import smoke tests** — Add actual import statements in both server and client that import types and constants from `@taskboard/shared`:
   - Server: import an entity type and a constant from shared, use them (e.g., in `app.ts` or a test file)
   - Client: import an entity type and a constant from shared, use them (e.g., in `App.tsx` or a utility file)
   - These imports must compile and resolve at both build time and runtime

### Files to Modify

- Potentially `packages/server/src/app.ts` or a test file (add shared imports)
- Potentially `packages/client/src/App.tsx` or a utility file (add shared imports)
- Any `package.json` or `tsconfig.json` adjustments needed to fix resolution issues

### Constraints

- Do not introduce new features; this task is purely verification and wiring fixes
- All imports must use the workspace package name (e.g., `@taskboard/shared`), not relative paths across packages
- If any issues are found, fix them in the relevant package configuration

### Dependencies

- **t01** (Root workspace configuration)
- **t02** (Shared package scaffold)
- **t03** (Server package scaffold)
- **t04** (Client package scaffold)

### Verification Criteria

1. `npm install` succeeds from root with no errors
2. `npm run build` compiles all packages without type errors under strict mode
3. `npm run dev` starts both server and client concurrently; server responds on its port, client serves on its port
4. Cross-package imports from `@taskboard/shared` resolve in both server and client at compile time
5. Server health check endpoint (if present) or Fastify startup log confirms server is running
6. Client serves the React application in the browser