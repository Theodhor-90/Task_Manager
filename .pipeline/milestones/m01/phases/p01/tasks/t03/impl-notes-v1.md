Implemented `t03` exactly per the locked plan by creating the full server scaffold under `packages/server`:

- Created `packages/server/package.json` with the specified scripts, runtime deps (`fastify`, `@fastify/jwt`, `@fastify/cors`), and dev deps (`vitest`, `supertest`, `tsx`, `@types/supertest`)
- Created `packages/server/tsconfig.json` extending `../../tsconfig.base.json`
- Created `packages/server/src/config.ts`, `packages/server/src/app.ts`, `packages/server/src/server.ts`
- Created directory stubs with `.gitkeep`:
  - `packages/server/src/models/.gitkeep`
  - `packages/server/src/routes/.gitkeep`
  - `packages/server/src/middleware/.gitkeep`
  - `packages/server/src/plugins/.gitkeep`
- Created `packages/server/vitest.config.ts`
- Installed dependencies via `npm install` (updated `package-lock.json`)
- Built server package (`npm run build -w @taskboard/server`) and produced `packages/server/dist/*`

Verification run results:

- Passed: `npm install`
- Passed: `npm run build -w @taskboard/server`
- Passed: `npx tsc -p packages/server/tsconfig.json --noEmit`
- Passed: dist file existence checks
- Passed: `npm ls @taskboard/server`
- Passed: `.gitkeep` stub existence checks
- Passed: scripted content assertions for `package.json`, `config.ts`, `app.ts`, `vitest.config.ts`
- Startup check caveat:
  - `timeout` command from plan is unavailable in this environment
  - Equivalent startup attempts (`tsx` and `node dist/server.js`) are blocked by sandbox socket permissions (`EPERM` on listen), so live bind verification could not complete here