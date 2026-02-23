Implemented fixes for all review issues and re-ran verification.

**What I changed**
1. Fixed broken package entrypoint by adding `packages/server/src/index.ts:1`:
- Re-exports `buildApp`
- Re-exports `config`
- Re-exports `Config` type  
This makes `package.json` `exports`/`main`/`types` (`dist/index.*`) valid at runtime after build.

2. Fixed failing test command for scaffold phase by updating `packages/server/vitest.config.ts:7`:
- Added `passWithNoTests: true` so `npm run test -w @taskboard/server` exits successfully when no tests exist yet.

**Verification run**
- `npm install` ✅
- `npm run build -w @taskboard/server` ✅
- `npx tsc -p packages/server/tsconfig.json --noEmit` ✅
- `npm run test -w @taskboard/server` ✅ (now exits code 0 with no tests)
- `npm ls @taskboard/server` ✅
- Dist outputs verified, including `packages/server/dist/index.js` and `packages/server/dist/index.d.ts` ✅
- Directory stubs and config/package/app/vitest checks ✅
- Runtime import check: `import('@taskboard/server')` ✅ (`buildApp,config` exported)

**Sandbox limitation**
- Server listen probe via `tsx` is blocked here by sandbox `EPERM` on socket/pipe creation, so bind/listen can’t be fully validated in this environment.