## Task: Server package scaffold

### Objective

Scaffold the `packages/server/` Fastify server package with the app factory, entry point, config module, Vitest configuration, and empty directory stubs for future models, routes, middleware, and plugins.

### Deliverables

1. **`packages/server/package.json`** with:
   - Package name (e.g., `@taskboard/server`)
   - `dev` script using `tsx watch` for hot-reload development
   - `build` script
   - Dependencies: `fastify`, `@fastify/jwt`, `@fastify/cors`
   - Dev dependencies: `vitest`, `supertest`, `tsx`, `@types/supertest`

2. **`packages/server/tsconfig.json`** extending `tsconfig.base.json`

3. **`packages/server/src/app.ts`** — Fastify app factory function:
   - Creates and configures a Fastify instance
   - Returns the app (for testing and for the entry point to use)

4. **`packages/server/src/server.ts`** — Entry point:
   - Calls the app factory
   - Listens on a configurable port from config

5. **`packages/server/src/config.ts`** — Environment configuration:
   - Reads `PORT` (default: 3001), `MONGODB_URI`, `JWT_SECRET` from environment variables
   - Provides sensible defaults for local development

6. **Directory stubs** (empty directories with `.gitkeep` or minimal index files):
   - `packages/server/src/models/`
   - `packages/server/src/routes/`
   - `packages/server/src/middleware/`
   - `packages/server/src/plugins/`

7. **Vitest config** for the server package (`packages/server/vitest.config.ts` or equivalent)

### Files to Create

- `packages/server/package.json`
- `packages/server/tsconfig.json`
- `packages/server/src/app.ts`
- `packages/server/src/server.ts`
- `packages/server/src/config.ts`
- `packages/server/src/models/.gitkeep`
- `packages/server/src/routes/.gitkeep`
- `packages/server/src/middleware/.gitkeep`
- `packages/server/src/plugins/.gitkeep`
- `packages/server/vitest.config.ts`

### Constraints

- TypeScript strict mode, ES modules
- Server port configurable via `PORT` env var, default 3001
- The app factory must be separated from the listen call (enables testing without starting the server)
- File naming: kebab-case
- Named exports only

### Dependencies

- **t01** (Root workspace configuration) — requires root `package.json` and `tsconfig.base.json`
- **t02** (Shared package scaffold) — server will import types/constants from `@taskboard/shared`

### Verification Criteria

1. `packages/server/` compiles without TypeScript errors under strict mode
2. Running the server dev script starts Fastify and listens on the configured port
3. `src/config.ts` correctly reads environment variables with fallback defaults
4. App factory in `src/app.ts` returns a valid Fastify instance
5. Vitest configuration is present and loadable
6. All directory stubs exist