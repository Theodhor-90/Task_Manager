## Phase 1: Monorepo & Dev Environment

### Goal

Scaffold the entire project from scratch by initializing an npm workspaces monorepo with three packages (shared, server, client), configuring TypeScript strict mode across all packages via a shared `tsconfig.base.json`, and setting up build and dev scripts so that a single `npm run dev` starts both the Fastify server and the Vite client concurrently.

### Deliverables

1. **Root `package.json`** with `workspaces: ["packages/*"]` and orchestration scripts:
   - `dev` — runs server and client concurrently (use `concurrently` package with `--kill-others-on-fail`)
   - `build` — builds all packages
   - `test` — runs tests across all packages
2. **`tsconfig.base.json`** at root with shared compiler options (strict mode, ES modules, path aliases)
3. **`packages/shared/`** — TypeScript types and constants package:
   - `src/types/` — entity interfaces (`User`, `Project`, `Board`, `Column`, `Task`, `Comment`, `Label`) and API contract types (request/response shapes for login)
   - `src/constants/` — shared constants: priority enum values (`low`, `medium`, `high`, `urgent`), default column names (`To Do`, `In Progress`, `In Review`, `Done`)
   - `package.json` with build script and correct `main`/`types` exports
4. **`packages/server/`** — Fastify server package:
   - `src/app.ts` — Fastify app factory function
   - `src/server.ts` — entry point that calls the factory and listens on a configurable port
   - `src/config.ts` — reads environment variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`) with sensible defaults
   - Directory stubs: `src/models/`, `src/routes/`, `src/middleware/`, `src/plugins/`
   - `package.json` with `dev` (tsx watch) and `build` scripts
   - Vitest config for the server package
5. **`packages/client/`** — React SPA package:
   - Vite + React + TypeScript scaffold
   - `tailwind.config.js` and PostCSS configuration
   - `src/main.tsx`, `src/App.tsx` with React Router
   - `package.json` with `dev` (vite) and `build` (vite build) scripts
6. **Verification**: `npm install` from root succeeds, `npm run dev` starts both server and client, TypeScript compiles cleanly across all packages, cross-package imports from `shared` resolve correctly in both `server` and `client`

### Technical Decisions & Constraints

- **TypeScript strict mode** everywhere, ES modules (import/export, no require)
- **File naming**: kebab-case for files, PascalCase for components, camelCase for functions/variables
- **Concurrently** package for running dev servers with `--kill-others-on-fail` for clean shutdown
- **Vite** for client dev and build; **tsx** for server dev with watch mode
- **Vitest** as test runner for server and shared packages
- The `shared` package must be resolvable from both `server` and `client` via npm workspaces — verify cross-package imports immediately after scaffolding
- Distinct ports for server and client configured in `config.ts` and `vite.config.ts`

### Dependencies

- No prior phases — this is the first phase of the first milestone
- Requires Node.js >= 18 and npm >= 9 with workspaces support

### Phase Completion Gate

Phase is complete when: `npm install` succeeds from root, `npm run dev` starts both server and client concurrently at their respective ports, `npm run build` compiles all three packages without type errors under strict mode, and cross-package imports from `shared` resolve in both `server` and `client`.