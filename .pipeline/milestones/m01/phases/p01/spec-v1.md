The phase specification is ready to be written to `.pipeline/milestones/m01/phases/p01/spec.md`. It needs write permission to save the file. Here's a summary of what the spec contains:

**Phase 1: Monorepo & Dev Environment** — 6 ordered tasks:

1. **Root workspace configuration** — `package.json` with workspaces, `tsconfig.base.json` with strict mode, `.gitignore`, root dev deps
2. **Shared package scaffold** — Entity interfaces (all 7 models), API contract types (`LoginRequest`/`LoginResponse`/`ApiError`), shared constants (`PRIORITIES`, `DEFAULT_COLUMNS`), barrel exports
3. **Server package scaffold** — Fastify app factory, entry point, config module (port/mongo/jwt), Vitest config, empty directory stubs for models/routes/middleware/plugins
4. **Client package scaffold** — Vite + React + TypeScript + Tailwind CSS + React Router with proxy config, placeholder routes
5. **Cross-package imports and build verification** — Validate `npm install`, `npm run build`, `npm run dev`, smoke-test imports from `@taskboard/shared` in both server and client
6. **Test infrastructure verification** — Trivial tests in shared and server packages, confirm `npm run test` works across the monorepo

**9 exit criteria** covering workspace install, strict-mode build, concurrent dev servers, cross-package imports, health check, React app serving, test execution, type exports, and constant exports.

**Dependencies**: Node.js >= 18, npm >= 9. No MongoDB needed yet.

Could you grant write permission so I can save the file?